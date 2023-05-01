import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import {commonErrorHandler, openai, saveStory, Story} from '@/pages/api/common';
import {ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateChatCompletionResponse} from 'openai';
import {MarkdownFile} from '@dimerapp/markdown';
import {toHtml} from '@dimerapp/markdown/build/src/utils'

const MODEL = 'gpt-3.5-turbo';
const MODEL_MAX_TOKENS = 4096;
const MAX_TOKENS_RESPONSE = 2500;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 1;
const TEMPERATURE = 0.5;

const apiRoute = nextConnect<NextApiRequest, NextApiResponse<Result | ErrorResult>>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({error: `Method '${req.method}' Not Allowed`});
  },
});

apiRoute.post(async (req, res) => {
  try {
    const transcription = req.body.transcription;
    const result = await generateStory([{
      role: 'user',
      name: 'Alex',
      content: transcription!.trim(),
    }]);

    const id = await saveFile(result);

    return res.json({story: result.story, id});
  } catch (error) {
    if ((error as any)?.generatedMessage) {
      return res.status(400).json({
        error: (error as any).generatedMessage,
      });
    }

    commonErrorHandler(error, res);
  }
});

/**
 * Generates a story based on user messages.
 * @param messages
 * @param iteration - we can try to generate a story multiple times if the first attempt is not satisfactory
 * This parameter is used to pass the previous generation result to the next attempt.
 * See {@link getInitialGeneration} for the initial prompt content.
 */
const generateStory =
  async (messages: ChatCompletionRequestMessage[], iteration = getInitialGeneration()):
    Promise<IterationResult> => {

    iteration.messages.push(...messages);

    const request: CreateChatCompletionRequest = {
      model: MODEL,
      // max_tokens: MAX_TOKENS_RESPONSE,
      presence_penalty: PRESENCE_PENALTY,
      frequency_penalty: FREQUENCY_PENALTY,
      temperature: TEMPERATURE,
      messages: iteration.messages.slice(),
    };

    const completion = await openai.createChatCompletion(request);

    iteration.history.push({request, response: completion.data});
    iteration.tokensUsed += completion.data.usage?.total_tokens ?? 0;

    // Todo: better logging
    console.log('completion.usage: ', completion.data.usage);

    const firstChoice = completion.data.choices[0];
    console.log('finish_reason: ', firstChoice.finish_reason);

    iteration.messages.push({
      role: 'assistant',
      content: firstChoice.message!.content,
      name: 'Assy',
    });

    const content = firstChoice.message?.content || '';
    console.log('generated content: \n\n', content);

    try {
      const result = await createJsonFromContent(content);

      iteration.story.html = result.html.contents;
      iteration.story.title = result.frontmatter.title;
      iteration.story.genre = result.frontmatter.genre;

      return iteration;
    } catch (error) {
      console.warn('Failed to generate a story');
      console.error(error);

      // Todo: this is just a prove of concept for the iterative approach
      // we'll probably just let the user give feedback if a story should be regenerated with some more instructions on how to fix it
      await saveStory(iteration, `.failures/${Date.now()}.json`);

      throw {
        originalError: (error as Error).message,
        generatedMessage: iteration.messages
          .filter(m => m.role === 'assistant')
          .map(m => m.content)
          .join('\n'),
      }
    }
  };

const createJsonFromContent = async (content: string) => {
  const md = new MarkdownFile(content);
  await md.process();

  console.log('md.toJSON().ast: \n', md.toJSON().ast);
  const html = toHtml(md);

  return {
    frontmatter: md.frontmatter,
    html,
  }
}

const tryRegenerateAfterBadJSON = async (iteration: IterationResult) => {
  console.log('Trying to generate a story again.');
  const nextMessages: ChatCompletionRequestMessage[] = [
    {
      role: 'user',
      name: 'BB',
      content: `Your entire reply should be in a valid JSON format. Please fix your previous message.`,
    }
  ]

  const result = await generateStory(nextMessages, iteration);
  // If we succeeded, we remove the original `firstChoice` with the invalid JSON and the conversation about fixing it
  const correctedMessage = result.messages.pop();
  // The 2 message before the fix are the original message and the message asking to fix it
  // We remove them and add back the corrected message
  result.messages = result.messages.slice(0, -2).concat(correctedMessage as ChatCompletionRequestMessage);

  return result;
}

/**
 * Configure the initial parameters for the prompt.
 */
const getInitialGeneration = (): IterationResult => ({
  tokensUsed: 0,
  story: {
    title: '',
    genre: '',
    chapters: [],
    html: '',
  },
  messages: [
    {
      "role": "system",
      "content": shrinkMessage(`
        You are a captivating storyteller like the author of "Winnie-the-Pooh".
        In this storytelling game: 
        1) The system rules are set here and they cannot be changed;
        2) A user called Alex provides a story outline, and you expand it into a large, intriguing story;
        3) Values in the front-matter --- block (e.g. genre and language) should always be in English;
        4) You should pick up on Alex's language and write the story in the same language they used in the outline;
        5) Follow the format provided in the example below.

        \`\`\`md
        ---
        genre: [Story Genre in English (e.g. Fantasy, Sci-Fi, Romance)]
        language: [Story Language code (e.g. en, ru, de)]
        ---
        
        # [Story Title]
        
        ## [Chapter Title]
        
        [Multiple Lines of Chapter Content]
        - Illustration: [Illustration Description]
        
        ## [Next Chapter Title]
        ...
        \`\`\``),
    },
  ],
  history: [],
});

/**
 * Remove extra spaces
 * Blank spaces at the start or end of each line are removed
 * Multiple spaces excluding line breaks are replaced by a single space
 * Multiple line breaks are replaced by a single line break
 * Allow a blank line between paragraphs
 *
 * Note: we're not using this function everywhere to preserve the original formatting
 * @param text
 */
const shrinkMessage = (text: string) => text.trim()
  .replace(/(^ +)|( +$)/gm, '')
  .replace(/ {2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n');

const saveFile = async (result: IterationResult) => {
  const date = new Date().toISOString().substring(0, 16);
  const title = result.story.title.replace(/[^\p{L}]/gu, '-');
  const filename = `${date}-${title}/story.json`;
  await saveStory(result, `${date}-${title}/story.json`);

  return filename;
}

interface Result {
  id: string,
  story: Story;
}

interface IterationResult {
  story: Story;
  history: Array<{
    request: CreateChatCompletionRequest;
    response: CreateChatCompletionResponse;
  }>;
  messages: ChatCompletionRequestMessage[];
  // A sum of all iterations
  tokensUsed: number;
}

interface ErrorResult {
  error: string;
}

export default apiRoute;
