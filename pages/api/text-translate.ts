import nextConnect from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  commonErrorHandler,
  openai,
  shrinkMessage,
} from '@/pages/api/common';
import { performance } from 'perf_hooks';
import logger, { enableFileLogging } from '@/utils/logger';

enableFileLogging();

const MODEL = 'gpt-3.5-turbo';
const PRESENCE_PENALTY = 2;
const FREQUENCY_PENALTY = 1;
const TEMPERATURE = 0.15;
const TOP_P = 1;

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.post(async (req, res) => {
  try {
    performance.mark('translate-start');
    const input = extractParameters(req);
    const result = await translateText(input);
    performance.mark('translate-end');
    const measure = performance.measure(
      'text-translate',
      'translate-start',
      'translate-end'
    );
    logger.info(`translating text took: ${measure.duration}ms`);

    return res.json({ result });
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
 * Generates a story based on user transcript.
 */
const translateText = async ({ text, toLanguage }: TranslationInput) => {
  const completion = await openai.createChatCompletion({
    model: MODEL,
    presence_penalty: PRESENCE_PENALTY,
    frequency_penalty: FREQUENCY_PENALTY,
    temperature: TEMPERATURE,
    top_p: TOP_P,
    messages: [
      {
        role: 'system',
        name: 'Assy',
        content:
          shrinkMessage(`You are a translation assistant. Your goal is to translate the given text into ${toLanguage}.
         Remember that you should assume the input text is written in an unknown language, so part of your task is to guess the language correctly.
         The user input will consist solely of the text that needs to be translated.
         Now, please proceed with translating the provided text.`),
      },
      {
        role: 'user',
        content: shrinkMessage(text),
        name: 'Alwin',
      },
    ],
  });

  logger.info(`translate completion.usage: ${completion.data.usage}`);

  const firstChoice = completion.data.choices[0];
  logger.info(`translate finish_reason: ${firstChoice.finish_reason}`);

  return firstChoice.message?.content || '';
};

const extractParameters = (req: NextApiRequest): TranslationInput => {
  const text: string = req.body.text?.trim();
  if (!text) {
    throw new Error('Missing `text` parameter');
  }

  const toLanguage: string = req.body.toLanguage?.trim();
  if (!toLanguage) {
    throw new Error('Missing `toLanguage` parameter');
  } else if (toLanguage.length !== 2) {
    throw new Error('`toLanguage` parameter must be a 2-letter language code');
  }

  return { text, toLanguage };
};

interface TranslationInput {
  text: string;
  toLanguage: string;
}

export default apiRoute;

logger.info('Translation route loaded');
