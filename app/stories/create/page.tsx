import CreateStory from '@/components/CreateStory/CreateStory';
import Providers from '@/components/Providers';
import {PageContent, PageTitle} from '@/components/AppShell';

export const metadata = {
  title: 'AI Storyteller - Create Story',
};

export default function CreateStoryPage() {
  return (
    <>
      <PageTitle>AI Storyteller - Create Story</PageTitle>
      <PageContent>
        <Providers>
          <CreateStory />
        </Providers>
      </PageContent>
    </>
  )
}
