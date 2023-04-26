'use client';
import {Story} from '@/pages/api/common';
import styles from '@/components/CreateStory.module.css';
import Image from 'next/image';
import {useMutation} from 'react-query';

interface StoryPreviewProps {
  story: Story;
  id: string;
}

export default function StoryPreview ({ story, id }: StoryPreviewProps) {
  const images = useMutation(
    async (storyId: string) => {
      const result: { story: Story } = await fetch('/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({storyId}),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => response.json());

      return result.story;
    });

  const finalStory = images.data || story;

  const readStory = () => {
    const utterance = new SpeechSynthesisUtterance('Приказка: ' + finalStory.title);
    utterance.lang = 'bg-BG';
    utterance.rate = 0.88;
    // utterance.pitch = 0.8;
    speechSynthesis.speak(utterance);

    finalStory.parts.forEach((part, i) => {
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
      <article className="flex flex-col gap-2 mt-2">
        <h3>{finalStory.title}</h3>
        {finalStory.parts.map((part, i: number) => (
          <section key={i}>
            <h4>{part.title}</h4>
            <div className="flex">
              <p className="flex-1">{part.content}</p>
              {part.img && <Image src={part.img} alt={part.illustration} width={720} height={720} />}
            </div>
          </section>
        ))}

        <div className="flex gap-2 self-end">
          <button
            type="button"
            disabled={images.isLoading}
            onClick={() => images.mutate(id)}>
            {images.isLoading && 'Generating Images...'}
            {images.isError && 'Failed to generate images 😢'}
            {images.isSuccess && 'Images Generated ✅'}
            {!images.isLoading && !images.isError && !images.isSuccess && 'Generate Images'}
          </button>
          <button type="button" onClick={readStory}>Read 📖</button>
          <button type="button" onClick={() => speechSynthesis.pause()}>Pause ⏸️</button>
          <button type="button" onClick={() => speechSynthesis.resume()}>Resume ▶️</button>
          <button type="button" onClick={() => speechSynthesis.cancel()}>Cancel ❌</button>
        </div>
      </article>
    </section>
  );
}
