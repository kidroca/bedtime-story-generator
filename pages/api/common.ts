import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs/promises';
import { NextApiResponse } from 'next';
import { AxiosError } from 'axios';
import path from 'path';
import { Stream } from 'node:stream';
import { Story, StoryRevision } from '@/utils/stories';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(configuration);

export const commonErrorHandler = (err: unknown, res: NextApiResponse) => {
  const error = err as AxiosError;

  if (error.response) {
    console.error(error.response.status, error.response.data);
    return res.status(error.response.status).json(error.response.data);
  } else {
    console.error(`Error with OpenAI API request: ${error.message}`);
    res.status(500).json({
      error: 'An error occurred during your request.',
    });
  }
};

export const readStory = (filename: string): Promise<StoryFile> => {
  return fs
    .readFile(`${STORIES_FS_PATH}/${filename}/story.json`)
    .then((data) => JSON.parse(data.toString()));
};

export const saveStory = async (body: object, filename: string) =>
  saveFile(`${STORIES_FS_PATH}/${filename}/story.json`, JSON.stringify(body, null, 2), {
    encoding: 'utf-8',
  });

type Writable =
  | string
  | NodeJS.ArrayBufferView
  | Iterable<string | NodeJS.ArrayBufferView>
  | AsyncIterable<string | NodeJS.ArrayBufferView>
  | Stream;

export const saveFile = async (filePath: string, content: Writable, options?: any) => {
  const dir = path.dirname(filePath);
  // If the directory already exist an error would not be thrown.
  await fs.mkdir(dir, { recursive: true });
  return fs.writeFile(filePath, content, { encoding: 'binary', ...options });
};

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
export const shrinkMessage = (text: string) =>
  text
    .trim()
    .replace(/(^ +)|( +$)/gm, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

const STORIES_FS_PATH = './public/uploads/stories';

export interface StoryFile {
  story: Story;
  // Time it took to generate responses
  timing: {
    story: number;
    images: number;
  };
  revisions?: StoryRevision[];
}
