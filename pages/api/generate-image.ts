import nextConnect from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import nanoId from 'nanoid';
import { openai, saveFile, commonErrorHandler } from './common';

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.post(async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: { message: 'Please provide the prompt' } });
    }

    const url = await generateImage(prompt);

    return res.json({ url });
  } catch (err) {
    commonErrorHandler(err, res);
  }
});

/**
 * Generates an image based on a prompt and saves it locally
 * Returns the URL of the image
 * @param prompt
 */
const generateImage = async (prompt: string) => {
  const name =
    `${prompt
      .trim()
      .replace(/[^\p{L}]/gu, '-')
      .replace(/-{2,}/g, '-')
      .toLowerCase()
      .split('-')
      .slice(0, 5)
      .join('-')}-ID-${nanoId.nanoid(8)}`;

  const aiResponse = await openai.createImage({
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
  });

  const remoteUrl = aiResponse.data.data[0].url!;
  const publicUrl = `/uploads/img/${name}.png`;
  const savePath = path.join('./public', publicUrl);

  console.log('fetching image from url: ', remoteUrl);
  const response = await fetch(remoteUrl);

  const ab = await response.arrayBuffer();
  const image = Buffer.from(ab);

  await saveFile(savePath, image);
  return publicUrl;
};

export default apiRoute;
