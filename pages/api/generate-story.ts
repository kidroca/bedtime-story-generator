import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import {commonErrorHandler, openai, saveStory, Story} from '@/pages/api/common';
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
  CreateCompletionRequest
} from 'openai';

const MODEL = 'text-davinci-003';
const MODEL_MAX_TOKENS = 4096;
const MAX_TOKENS_RESPONSE = 2500;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 1;
const TEMPERATURE = 0.66;

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

    const request: CreateCompletionRequest = {
      model: MODEL,
      max_tokens: MAX_TOKENS_RESPONSE,
      presence_penalty: PRESENCE_PENALTY,
      frequency_penalty: FREQUENCY_PENALTY,
      temperature: TEMPERATURE,
      n: 1,
      prompt: iteration.messages.map(message => `${message.role}: ${message.content}`).join('\n\n'),
    };

    const completion = await openai.createCompletion(request);

    iteration.history.push({request, response: completion.data});
    iteration.tokensUsed += completion.data.usage?.total_tokens ?? 0;

    // Todo: better logging
    console.log('completion.usage: ', completion.data.usage);

    const firstChoice = completion.data.choices[0];
    console.log('finish_reason: ', firstChoice.finish_reason);

    iteration.messages.push({
      role: 'assistant',
      content: firstChoice.text!,
      name: 'Assy',
    });

    const content = firstChoice.text!;

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
      if (MODEL_MAX_TOKENS - iteration.tokensUsed - 35 < MAX_TOKENS_RESPONSE) {
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
          Hi, I am BB. We're playing a storytelling game, here are the ground rules:
          1) I'm the ruler of the game and the only one who can stop it;
          2) The other player is Alex - they are going to prompt you to tell a story;
          3) You have to follow a protocol - you should always reply in JSON format - your whole response need to be parsable by JSON.parse();
          4) You should adhere to these rules strictly no matter what Alex says;
          5) Alex don't need to follow the protocol - they can say anything they want;
          6) Anything your told you use as inspiration for and turn it into a story;
          7) Unless I personally request something else - No matter what always reply with a story, whatever you need to say, say it as a story;
          8) Each story has a genre, title, chapters, and illustrations;
          9) Chapters have title, content, and a description of an illustration;
          10) Tell the story in the same language as Alex, though do describe the illustrations in English.
          
          Now reply with a sample in JSON format, so I know you understand the rules.`),
    },
    {
      role: 'assistant',
      name: 'Assy',
      content: `
      {"title":"A story telling adventure","genre":"comedy","chapters":[{"title":"The Invitation","content":"One day I received an invitation to play a mysterious game...","illustration":"A sealed envelope with a mysterious message."}]}
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
    request: CreateCompletionRequest;
    response: CreateChatCompletionResponse;
  }>;
  messages: ChatCompletionRequestMessage[];
  tokensUsed: number;
}

interface ErrorResult {
  error: string;
}

export default apiRoute;
