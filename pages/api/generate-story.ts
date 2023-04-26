import {Configuration, OpenAIApi} from 'openai';
import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import {AxiosError} from 'axios';
import {writeFile} from 'fs/promises';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({error: `Method '${req.method}' Not Allowed`});
  },
});

apiRoute.post(async (req, res) => {
  try {
    const transcription = req.body.transcription;
    const story = await getStory(transcription);

    const body = {transcription, story};
    saveFile(body, story.title);

    return res.json({transcription, story});
  } catch (err) {
    const error = err as AxiosError;
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
});

const getStory = async (transcription: string) => {
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    max_tokens: 2500,
    messages: [
      {
        role: 'system',
        content: 'You are a captivating storyteller like Scheherazade.'
      },
      {
        role: 'user',
        content: `
          Let's come up with an original, creative, fun and educational story.
          The story should be broken into parts.

          Each part should have a title and content depending on the part.
          Each part should have a text description for an accompanying illustration.

          Respond in the following (JSON) manner:
          {
            "title": "story title",
            "parts": [
              {
                "title": "title for the part, like Once upon a time...",
                "content": "content for the part",
                "illustration": "illustration description, like: An illustration of ..."
              },
              ...
            ]
          }

          The story should be in Bulgarian, though illustrations should be in English.
          The narrative should be richly-detailed with a wealth of depth and complexity.
          The story is inspired by the following transcript "${transcription}".
        `,
      },
    ],
    presence_penalty: 0,
    frequency_penalty: 1,
  });

  console.log('completion.usage: ', completion.data.usage);

  const firstChoice = completion.data.choices[0];
  console.log('finish_reason: ', firstChoice.finish_reason);

  const content = firstChoice.message?.content || '';

  try {
    return JSON.parse(content);
  } catch (err) {
    console.warn('Failed parsing story to JSON, returning a single part story.');
    console.error(err);
    console.log('content: \n', content);
    const title = content.slice(0, 50) + '...';
    return {
      title,
      parts: [
        {
          title,
          content,
          illustration: title,
        }
      ]
    };
  }
}

const addImages = async (story: any) => {
  story.parts.forEach((part: any) => {
    part.illustration = part.illustration || part.title;
  });
  return story;
}

const saveFile = (body: object, title: string) => {
  const date = new Date().toISOString().substring(0, 16);
  const filename = `./public/uploads/${date}-${title}.json`;
  return writeFile(
    filename,
    JSON.stringify(body, null, 2),
    {encoding: 'utf8'})
    .catch(console.error);
}
export default apiRoute;
