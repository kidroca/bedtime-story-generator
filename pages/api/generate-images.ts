import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import * as fs from 'fs/promises';
import {openai, saveFile, commonErrorHandler, Story, saveStory, readStory} from './common';
import path from 'path';

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({error: `Method '${req.method}' Not Allowed`});
  },
});

apiRoute.post(async (req, res) => {
  try {
    const storyId = req.body.storyId;
    const file = await readStory(storyId);
    await addImages(file.story, storyId);
    await saveStory(file, storyId);

    return res.json(file);
  } catch (err) {
    commonErrorHandler(err, res);
  }
});

/**
 * Generates and adds images for story chapters based on the part's illustration description.
 * Mutates the passed story object.
 * @param story
 * @param storyId
 */
const addImages = async (story: Story, storyId: string) => {
  const mark = performance.mark('addImages');

  // Todo: run sequentially to avoid rate limiting
  const tasks = story.chapters.map(async (part, i) => {
    try {
      const response = await openai.createImage({
        prompt: `${part.illustration}, children's book illustration in the style of Eric Carle`,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });

      const url = response.data.data[0].url;
      if (url) {
        console.log('fetching image from url: ', url);
        const response = await fetch(url);
        if (response.ok) {
          const ab = await response.arrayBuffer();
          const image = Buffer.from(ab);
          const storyDir = path.dirname(storyId);
          const name = part.illustration.split(' ').slice(0, 5).join('-');
          const partImageUrl = `/uploads/stories/${storyDir}/${name}-${mark.startTime}.png`;
          part.img = partImageUrl;

          await saveFile(`./public/${partImageUrl}`, image);
        } else {
          console.error(`Failed to save image from url: ${url}`);
        }
      }
    } catch (err) {
      console.error((err as Error).message);
    }
  });

  await Promise.all(tasks);

  const measure = performance.measure('addImages', mark);
  console.log('Generating and saving images took: ', `${(measure.duration / 1000).toFixed(3)}ms`);
}

export default apiRoute;
