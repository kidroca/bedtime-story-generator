import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import path from 'path';
import {performance} from 'perf_hooks';
import {openai, saveFile, commonErrorHandler, Story, saveStory, readStory} from './common';

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

    performance.mark('addImages-end');
    file.timeToGenerateImages =performance.measure('addImages', 'addImages-start', 'addImages-end').duration;

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
  const startMark = performance.mark('addImages-start');

  const tasks = story.chapters.map(async (part, i) => {
    try {
      if (!part.illustration) {
        return Promise.resolve();
      }

      const prompt = part.illustration;
      const response = await openai.createImage({
        prompt,
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
          const name = part.illustration
            .trim()
            .replace(/[^\p{L}]/gu, '-')
            .replace(/-{2,}/g, '-')
            .split('-').slice(0, 5).join('-');
          const partImageUrl = `/uploads/stories/${storyDir}/${name}-${startMark.startTime}-${i}.png`;
          part.img = partImageUrl;
          part.illustrationPrompt = prompt;

          await saveFile(`./public/${partImageUrl}`, image);
        } else {
          console.error(`Failed to save image from url: ${url}`);
        }
      }
    } catch (err) {
      console.error((err as Error).message);
    }
  });

  return Promise.all(tasks);
}

export default apiRoute;
