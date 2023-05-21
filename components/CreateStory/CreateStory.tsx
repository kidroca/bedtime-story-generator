'use client';
import { useCallback, useState } from 'react';
import { Story } from '@/pages/api/common';
import StoryContent from '../StoryContent';
import Wrapper from '@/components/AppShell/Wrapper';
import BlockEditor from '@/components/TextEditing/BlockEditor';

export default function CreateStory() {
  const [result, setResult] = useState<{ story: Story; id: string }>();

  const generateStory = useCallback(async (transcription: string) => {
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

    setResult(result);
  }, []);

  return (
    <section className="w-full flex flex-col items-center p-2">
      <Wrapper className="flex flex-col my-2">
        <BlockEditor
          label="Narrative"
          submitLabel="Generate"
          onSubmit={generateStory}
        />
      </Wrapper>

      {result && <h3>{result.story.title}</h3>}
      {result && <StoryContent story={result.story} id={result.id} />}
    </section>
  );
}
