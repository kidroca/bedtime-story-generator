'use client';
import { useCallback, useState } from 'react';
import StoryContent from '../StoryContent';
import Wrapper from '@/components/AppShell/Wrapper';
import BlockEditor from '@/components/TextEditing/BlockEditor';
import InputGroup from '@/components/TextEditing/InputGroup';
import { generateStory, updateStory } from '@/utils/client';
import { Story } from '@/utils/stories';

export default function CreateStory() {
  const [result, setResult] = useState<{ story: Story; id: string }>();

  const generateNewStory = useCallback(async (transcription: string) => {
    const result = await generateStory(transcription);
    setResult(result);
  }, []);

  const reviseStory = useCallback(
    async (title: string) => {
      const updatedStory = await updateStory(result!.id, result!.story, { title });
      // @ts-ignore
      setResult(updatedStory);
    },
    [result]
  );

  return (
    <section className="w-full flex flex-col items-center">
      <Wrapper className="flex flex-col my-2">
        <BlockEditor label="Narrative" submitLabel="Generate" onSubmit={generateNewStory} />

        {result && (
          <InputGroup label="Title" defaultValue={result.story.title} onSubmit={reviseStory} />
        )}
      </Wrapper>

      {result && <StoryContent story={result.story} id={result.id} />}
    </section>
  );
}
