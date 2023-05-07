import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import {commonErrorHandler, openai, saveStory, Story} from '@/pages/api/common';
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse
} from 'openai';
import {MarkdownFile} from '@dimerapp/markdown';

const MODEL = 'gpt-3.5-turbo';
const MODEL_MAX_TOKENS = 8000;
const MAX_TOKENS_RESPONSE = 4000;
const PRESENCE_PENALTY = 1;
const FREQUENCY_PENALTY = 1;
const TEMPERATURE = 0.4;
const ADMIN = { name: 'BB', role: ChatCompletionRequestMessageRoleEnum.User };
const USER = { name: 'Alex', role: ChatCompletionRequestMessageRoleEnum.User };
const ASSISTANT = { name: 'Assy', role: ChatCompletionRequestMessageRoleEnum.Assistant };

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
      ...USER,
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
      ...ASSISTANT,
      content: firstChoice.message!.content,
    });

    const content = firstChoice.message?.content || '';

    try {
      iteration.story = await createStoryFromMarkDownContent(content);
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

const createStoryFromMarkDownContent = async (content: string): Promise<Story> => {
  const md = new MarkdownFile(content);
  await md.process();

  const regex = /^# (?<title>.*)(?:\r?\n|\r)(?<chaptersContent>[\s\S]*?)(?!\s*\S)/gm;
  const chapterRegex = /^##\s?(?<chapterTitle>[^#\n]*)\n*(?<chapterContent>[^#]*)\n*(?:###\s?.*\n*(?<illustration>^[^#\n]*))?/gm;

  const result = regex.exec(content);
  const title = result?.groups?.title;
  if (!title) {
    throw new Error('Failed to find a title in the generated content');
  }

  const chaptersContent = result?.groups!.chaptersContent;
  if (!chaptersContent) {
    throw new Error('Failed to find chapters in the generated content');
  }

  let chapter: RegExpExecArray | null;
  const chapters: Story['chapters'] = [];
  let lastIndex = chaptersContent.length;

  while ((chapter = chapterRegex.exec(chaptersContent)) !== null) {
    if (!chapter.groups) {
      throw new Error('Failed to parse a chapter');
    }

    lastIndex = chapterRegex.lastIndex;

    chapters.push({
      title: chapter.groups.chapterTitle,
      content: chapter.groups.chapterContent.trim(),
      illustration: chapter.groups.illustration,
    });
  }

  if (lastIndex !== chaptersContent.length) {
    const remainingContent = chaptersContent.slice(lastIndex).trim();
    console.log('Some content exists after the last chapter:\n', remainingContent);
    console.log('\n Adding it to the last chapter');

    chapters[chapters.length - 1].content += `\n${remainingContent}`;
  }

  return {
    enTitle: md.frontmatter.title,
    genre: md.frontmatter.genre,
    language: md.frontmatter.language,
    title,
    chapters,
  };
}

const tryRegenerateAfterBadJSON = async (iteration: IterationResult) => {
  console.log('Trying to generate a story again.');
  const nextMessages: ChatCompletionRequestMessage[] = [
    {
      ...ADMIN,
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
    language: '',
    chapters: [],
    html: '',
  },
  messages: [
    {
      "role": "system",
      "content": shrinkMessage(`
        You are a captivating storyteller like the author of "Winnie-the-Pooh".
        In this interactive storytelling game, you will receive a story outline from a user named ${USER.name},
        and your task is to expand it into a imaginative and engaging story with diverse characters and moral lessons.
        Keep the following guidelines in mind:
        1. Always write the story in the same language used by ${USER.name} in the outline.
        2. The values in the front-matter block (e.g. genre and language) must be in English.
        3. Follow the format provided in the example below.

        \`\`\`md
        ---
        title: [Story Title in English]
        genre: [Story Genre in English (e.g. Fantasy, Sci-Fi, Romance)]
        language: [Story Language code (e.g. en, ru, de)]
        ---
        
        # [Story Title in ${USER.name}'s Language]
        
        ## [Chapter Title in ${USER.name}'s Language]
        
        [Multiple Lines of Chapter Content in ${USER.name}'s Language]

        ### Illustration
        [Provide a detailed description in English for an illustrator to create a captivating illustration for this chapter]

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
