'use client';
import { useState } from 'react';
import { useMutation } from 'react-query';
import { Story } from '@/pages/api/common';
import StoryContent from '../StoryContent';
import Wrapper from '@/components/AppShell/Wrapper';
import BlockEditor from '@/components/TextEditing/BlockEditor';

export default function CreateStory() {
  const [finalStory, setFinalStory] = useState<Story>();

  const story = useMutation(async (transcription: string) => {
    const result: { story: Story; id: string } = await fetch('/api/generate-story', {
      method: 'POST',
      body: JSON.stringify({ transcription }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) {
        if (Object.keys(json).length > 0) {
          return Promise.reject(json);
        }

        throw new Error('Failed to generate story');
      }

      return json;
    });

    setFinalStory(result.story);

    return result;
  });

  return (
    <section className="w-full flex flex-col items-center p-2">
      <Wrapper className="flex flex-col my-2">
        <BlockEditor
          label="Narrative"
          submitLabel="Generate"
          onSubmit={(text) => story.mutate(text)}
        />
      </Wrapper>

      {story.isError && (
        <article className="flex flex-col gap-2 mt-2">
          <h3 className="text-red-500">Error</h3>
          <p>
            {(story.error as any).error?.toString() ||
              (story.error as any).message ||
              'Unknown Error'}
          </p>
        </article>
      )}

      {finalStory && <h3>{finalStory.title}</h3>}
      {finalStory && <StoryContent story={finalStory} id={story.data?.id} />}
    </section>
  );
}
