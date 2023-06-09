import {readdir, readFile} from 'fs/promises';
import StoryContent from '@/components/StoryContent';
import Providers from '@/components/Providers';
import { PageTitle } from '@/components/AppShell';
import { mergeStoryRevisions, Story } from '@/utils/stories';
import { StoryFile } from '@/pages/api/common';

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
  const json = JSON.parse(file) as StoryFile;
  return mergeStoryRevisions(json.story, json.revisions);
}

export default async function StoryPage({params}: { params: StoryParams }) {
  const folder = convertIdToFolder(params);
  const story = await getStory(folder);

  return (
    <>
      <Providers>
        <PageTitle>{story.title}</PageTitle>
        <StoryContent story={story} id={folder} />
      </Providers>
    </>
  );
}
