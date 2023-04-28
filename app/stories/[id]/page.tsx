import {readdir, readFile} from 'fs/promises';
import {Story} from '@/pages/api/common';
import StoryPreview from '@/components/StoryPreview';
import Providers from '@/components/Providers';

interface StoryParams {
  id: string;
}

export async function generateStaticParams(): Promise<StoryParams[]> {
  const dir = await readdir('./public/uploads/stories');
  return dir
    .filter(name => !name.startsWith('.'))
    .map(name => ({id: name}));
}

const convertIdToFolder = (params: StoryParams) => {
  // %3a is : used between hour and minutes, for some reason it doesn't get decoded
  return decodeURI(params.id).replace(/%3a/gi, ':');
}

async function getStory(folder: string): Promise<Story> {
  const file = await readFile(`./public/uploads/stories/${folder}/story.json`, 'utf-8');
  const json = JSON.parse(file);
  return json.story;
}

export default async function StoryPage({params}: { params: StoryParams }) {
  const folder = convertIdToFolder(params);
  const story = await getStory(folder);

  return (
    <>
      <Providers>
        <StoryPreview story={story} id={`${folder}/story.json`} />
      </Providers>
    </>
  );
}
