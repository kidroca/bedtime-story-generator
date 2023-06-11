import nextConnect from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';
import { performance } from 'perf_hooks';
import { commonErrorHandler, readStory, saveStory } from './common';
import { Story } from '@/utils/stories';
import { generateImage } from '@/pages/api/generate-image';
import logger from '@/utils/logger';

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.post(async (req, res) => {
  try {
    const storyId = req.body.storyId;
    const file = await readStory(storyId);
    await addImages(file.story, storyId);

    performance.mark('addImages-end');
    const measure = performance.measure('addImages', 'addImages-start', 'addImages-end');
    logger.info(`addImages took ${measure.duration}ms`);

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
  performance.mark('addImages-start');

  const tasks = story.chapters.map(async (part, i) => {
    try {
      if (!part.illustration) {
        return Promise.resolve();
      }

      part.img = await generateImage(part.illustration);
      part.illustrationPrompt = part.illustration;

    } catch (err) {
      console.error((err as Error).message);
    }
  });

  return Promise.all(tasks);
}

export default apiRoute;
