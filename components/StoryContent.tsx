'use client';
import Image from 'next/image';
import { useMutation } from 'react-query';
import { useEffect, useState } from 'react';
import { PlayIcon, PauseIcon, StopIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/CreateStory/Actions';
import Wrapper from '@/components/AppShell/Wrapper';
import { createPortal } from 'react-dom';
import EditableChapterTitle from '@/components/CreateStory/EditableChapterTitle';
import { generateImages, updateStory } from '@/utils/client';
import EditableChapterContent from '@/components/CreateStory/EditableChapterContent';
import { Story, StoryChapter } from '@/utils/stories';
import EditableChapterImage from '@/components/CreateStory/EditableChapterImage';

interface StoryPreviewProps {
  story: Story;
  id?: string;
}

export default function StoryContent({ story, id }: StoryPreviewProps) {
  const [revisions, setRevisions] = useState<Story[]>([story]);
  const images = useMutation(async (storyId: string) => {
    const revisedStory = await generateImages(storyId);
    setRevisions((current) => [...current, revisedStory]);
    return revisedStory;
  });

  useEffect(() => {
    setRevisions((current) => {
      if (current.includes(story)) {
        return current;
      }

      return [...current, story];
    });
  }, [story]);

  const latestStory = revisions[revisions.length - 1];

  const [readingState, setReadingState] = useState<'idle' | 'reading' | 'paused'>('idle');

  const readStory = () => {
    const utterance = new SpeechSynthesisUtterance('Приказка: ' + latestStory.title);
    utterance.lang = story.language;
    utterance.rate = 0.77;
    utterance.pitch = 0.88;
    speechSynthesis.speak(utterance);

    latestStory.chapters.forEach((part, i) => {
      const content = new SpeechSynthesisUtterance(part.content);
      content.lang = story.language;
      content.rate = 0.85;
      const title = new SpeechSynthesisUtterance(part.title);
      title.lang = story.language;
      title.rate = 0.8;
      utterance.pitch = 0.88;
      speechSynthesis.speak(title);
      speechSynthesis.speak(content);
    });

    setReadingState('reading');
  };

  const [h1, setH1] = useState<HTMLElement | null>(null);
  useEffect(() => setH1(document.querySelector('h1')), []);

  return (
    <section className="w-full">
      <article className="flex flex-col w-full gap-2 mt-2">
        {latestStory.chapters.map((part, i: number) => (
          <div
            key={i}
            className="[&>*]:odd:flex-row-reverse bg-yellow-100 odd:bg-orange-100 bg-opacity-50">
            <Wrapper className="flex flex-row flex-wrap justify-between">
              <EditableChapterTitle
                className="w-full"
                title={part.title}
                onUpdate={async (title) => {
                  const chapters: Array<Partial<StoryChapter>> = [];
                  chapters[i] = { title };
                  await updateStory(id!, latestStory, { chapters });
                  setRevisions((current) => {
                    const updated = [...current];
                    updated[updated.length - 1].chapters[i].title = title;
                    return updated;
                  });
                }}
              />

              <EditableChapterContent
                className="mb-2"
                content={part.content}
                onUpdate={async (content) => {
                  const chapters: Array<Partial<StoryChapter>> = [];
                  chapters[i] = { content };
                  await updateStory(id!, latestStory, { chapters });
                  setRevisions((current) => {
                    const updated = [...current];
                    updated[updated.length - 1].chapters[i].content = content;
                    return updated;
                  });
                }}
              />

              <EditableChapterImage
                img={part.img}
                illustration={part.illustration}
                className="w-1/2 mt-4"
                onUpdate={async (image) => {
                  const chapters: Array<Partial<StoryChapter>> = [];
                  chapters[i] = { ...image };
                  await updateStory(id!, latestStory, { chapters });
                  setRevisions((current) => {
                    const updated = [...current];
                    updated[updated.length - 1].chapters[i].img = image.img;
                    return updated;
                  });
                }}
              />
            </Wrapper>
          </div>
        ))}

        {h1 &&
          createPortal(
            <div className="flex self-end gap-x-2">
              {id && (
                <Button disabled={images.isLoading} onClick={() => images.mutate(id)}>
                  {images.isLoading && 'Generating Images...'}
                  {images.isError && 'Failed to generate images 😢'}
                  {images.isSuccess && 'Images Generated ✅'}
                  {!images.isLoading && !images.isError && !images.isSuccess && 'Generate Images'}
                </Button>
              )}
              {readingState === 'idle' && <Button onClick={readStory}>Read 📖</Button>}
              {readingState === 'paused' && (
                <Button
                  title="Resume"
                  onClick={() => {
                    speechSynthesis.resume();
                    setReadingState('reading');
                  }}>
                  <span className="h-5 w-5">
                    <PlayIcon />
                  </span>
                </Button>
              )}
              {readingState === 'reading' && (
                <Button
                  title="Pause"
                  onClick={() => {
                    speechSynthesis.pause();
                    setReadingState('paused');
                  }}>
                  <span className="h-5 w-5">
                    <PauseIcon />
                  </span>
                </Button>
              )}
              {readingState !== 'idle' && (
                <Button
                  title="Stop"
                  onClick={() => {
                    speechSynthesis.cancel();
                    setReadingState('idle');
                  }}>
                  <span className="h-5 w-5">
                    <StopIcon />
                  </span>
                </Button>
              )}
            </div>,
            h1
          )}
      </article>
    </section>
  );
}
