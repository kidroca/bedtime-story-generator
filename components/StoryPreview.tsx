'use client';
import {Story} from '@/pages/api/common';
import styles from '@/components/CreateStory.module.css';
import Image from 'next/image';
import {useMutation} from 'react-query';
import {useEffect, useState} from 'react';

interface StoryPreviewProps {
  story: Story;
  id?: string;
}

export default function StoryPreview ({ story, id }: StoryPreviewProps) {
  const [revisions, setRevisions] = useState<Story[]>([story]);
  const images = useMutation(
    async (storyId: string) => {
      const result: { story: Story } = await fetch('/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({storyId}),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => response.json());

      setRevisions(current => [...current, result.story]);

      return result.story;
    });

  useEffect(() => {
    setRevisions(current => {
      if (current.includes(story)) {
        return current;
      }

      return [...current, story];
    });
  }, [story]);

  const latestStory = revisions[revisions.length - 1];

  const readStory = () => {
    const utterance = new SpeechSynthesisUtterance('Приказка: ' + latestStory.title);
    utterance.lang = 'bg-BG';
    utterance.rate = 0.88;
    // utterance.pitch = 0.8;
    speechSynthesis.speak(utterance);

    latestStory.chapters.forEach((part, i) => {
      const content = new SpeechSynthesisUtterance(part.content);
      content.lang = 'bg-BG';
      content.rate = 0.91;
      const title = new SpeechSynthesisUtterance(`част ${i + 1}: ${part.title}`);
      title.lang = 'bg-BG';
      title.rate = 0.88;
      // utterance.pitch = 0.8;
      speechSynthesis.speak(title);
      speechSynthesis.speak(content);
    });
  }

  return (
    <section className={styles.layout}>
      <article className="flex flex-col gap-2 mt-2 [&>*:nth-child(odd)]:flex-row-reverse">
        <h3>{latestStory.title}</h3>
        {latestStory.chapters.map((part, i: number) => (
          <section className="flex justify-between flex-row flex-wrap" key={i}>
            <h4 className="w-full">{part.title}</h4>

            <div className="basis-5/12">
              {part.content?.split(/\n+/).map((line, j) => (
                <p className="my-4" key={j}>{line}</p>
              ))}
            </div>

            {part.img &&
              <Image className="w-1/2 mt-4" src={part.img} alt={part.illustration!} width={720} height={720} />}
          </section>
        ))}

        <div className="flex gap-2 self-end">
          {id && (
            <button
              type="button"
              disabled={images.isLoading}
              onClick={() => images.mutate(id)}>
              {images.isLoading && 'Generating Images...'}
              {images.isError && 'Failed to generate images 😢'}
              {images.isSuccess && 'Images Generated ✅'}
              {!images.isLoading && !images.isError && !images.isSuccess && 'Generate Images'}
            </button>
          )}
          <button type="button" onClick={readStory}>Read 📖</button>
          <button type="button" onClick={() => speechSynthesis.pause()}>Pause ⏸️</button>
          <button type="button" onClick={() => speechSynthesis.resume()}>Resume ▶️</button>
          <button type="button" onClick={() => speechSynthesis.cancel()}>Cancel ❌</button>
        </div>
      </article>
    </section>
  );
}
