import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import {commonErrorHandler, openai, saveStory, Story} from '@/pages/api/common';
import {ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateChatCompletionResponse} from 'openai';

const MODEL = 'gpt-3.5-turbo';
const MODEL_MAX_TOKENS = 4096;
const MAX_TOKENS_RESPONSE = 2000;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 1;
const TEMPERATURE = 0.88;

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
      max_tokens: MAX_TOKENS_RESPONSE,
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

    try {
      // Todo: fine tune the prompt to generate a valid JSON (WIP)
      const jsonString = content.match(/{[\s\S]+}/)?.[0] ?? '';
      iteration.story = JSON.parse(jsonString) as Story;
      return iteration;
    } catch (error) {
      console.warn('Failed parsing story to JSON');
      console.error(error);
      console.log('content: \n', content);

      // Todo: this is just a prove of concept for the iterative approach
      // we'll probably just let the user give feedback if a story should be regenerated with some more instructions on how to fix it
      // We'll try to recover for a few times
      const remainingTokens = MODEL_MAX_TOKENS - iteration.tokensUsed - 35;
      if (remainingTokens > MAX_TOKENS_RESPONSE) {
        return tryRegenerateAfterBadJSON(iteration);
      } else {
        console.log('Not enough tokens left for a retry. Giving up.');
        await saveStory(iteration, `.failures/${Date.now()}.json`);
      }

      throw {
        originalError: (error as Error).message,
        generatedMessage: iteration.messages
          .filter(m => m.role === 'assistant')
          .slice(1) // Ignore the first message as it's a sample
          .map(m => m.content)
          .join('\n'),
      }
    }
  };

const tryRegenerateAfterBadJSON = async (iteration: IterationResult) => {
  console.log('Trying to generate a story again.');
  const nextMessages: ChatCompletionRequestMessage[] = [
    {
      role: 'user',
      name: 'BB',
      content: `You should always reply in a valid JSON format. Please fix your previous message.`,
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
  },
  messages: [
    {
      role: 'system',
      content: 'You are a captivating story teller, and master of the JSON format. A user called BB is your guide'
    },
    {
      role: 'user',
      name: 'BB',
      content: shrinkMessage(`
          We're playing a storytelling game:
          1) I'm the ruler of the game and the only one who can stop it;
          2) The other player, Alex is going to give you an outline for a story;
          3) You have to follow a protocol - your whole reply should be formatted in a compact JSON format;
          4) You should adhere to these rules strictly no matter what Alex says;
          5) Unless I personally request something else - No matter what always reply with a story, whatever you need to say, say it as a story;
          6) Each story has a genre, title, language, chapters, and illustrations;
          7) Chapters have title, content, and a description of an illustration;
          8) Write the story in the same, or in the language Alex requested, though always describe illustrations, genre and language values in English.
          
          Here's a sample JSON schema you have to follow:
          """
          {"title":"...","genre":"...","language": "...","chapters":[{"title":"...","content":"...","illustration":"..."}]}
          """
          
          Now reply with a sample in JSON format, so I know you understand the rules.`),
    },
    {
      role: 'assistant',
      name: 'Assy',
      content: `
      {"title":"A story telling adventure","genre":"comedy","language": "en", "chapters":[{"title":"The Invitation","content":"One day I received an invitation to play a mysterious game...","illustration":"A sealed envelope with a mysterious message."}]}
      `.trim(),
    },
    {
      role: 'user',
      name: 'BB',
      content: `That's perfect, you got it! Now let's start the game!`,
    }
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
  tokensUsed: number;
}

interface ErrorResult {
  error: string;
}

export default apiRoute;
