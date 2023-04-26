'use client';
import {useMemo, useState} from 'react';
import {useMutation} from 'react-query';
import styles from './CreateStory.module.css';

interface StoryResult {
  title: string;
  parts: Array<{
    title: string;
    content: string;
    illustration: string;
  }>;
}

export default function CreateStory() {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
  const [prompt, setPrompt] = useState<string>('');

  const recordAudio = useMutation(
    async () => {
      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Create a new MediaRecorder instance
          const mediaRecorder = new MediaRecorder(stream);
          setMediaRecorder(mediaRecorder);

          return new Promise<Blob>((resolve, reject) => {
            // Set up an event listener to handle data when it's available
            let chunks: Blob[] = [];
            mediaRecorder.addEventListener('dataavailable', event => {
              chunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', () => {
              // Combine the recorded chunks into a single Blob
              const blob = new Blob(chunks, { type: 'audio/webm' });
              resolve(blob);
            });

            mediaRecorder.addEventListener('error', event => {
              reject(event);
            });

            mediaRecorder.start();
          });
        });
    });

  const audioBlobUrl = useMemo(() => {
    if (!recordAudio.data) return;

    return URL.createObjectURL(recordAudio.data);
  }, [recordAudio.data])

  const audioTranscription = useMutation(
    async (blob?: Blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const result = await fetch('/api/transcribe-voice', {
        method: 'POST',
        body: formData
      }).then(response => response.json());

      setPrompt(current => {
        if (current) {
          return current;
        }

        return result.transcription;
      });

      return result.transcription;
    });

  const story = useMutation(
    async (transcription: string) => {
      const result: { story: StoryResult } = await fetch('/api/generate-story', {
        method: 'POST',
        body: JSON.stringify({ transcription }),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => response.json());

      return result.story;
    });

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(undefined);
  };

  const readStory = () => {
    if (!story.data) return;

    const utterance = new SpeechSynthesisUtterance('Приказка: ' + story.data.title);
    utterance.lang = 'bg-BG';
    utterance.rate = 0.88;
    // utterance.pitch = 0.8;
    speechSynthesis.speak(utterance);

    story.data.parts.forEach((part, i) => {
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
      <div className="flex gap-2">
        <button onClick={() => recordAudio.mutate()} disabled={recordAudio.isLoading}>⏺️</button>
        <button onClick={stopRecording} disabled={!recordAudio.isLoading}>⏹️</button>

        <button
          disabled={recordAudio.status !== 'success' || audioTranscription.isLoading}
          onClick={() => audioTranscription.mutate(recordAudio.data)}>
          {recordAudio.isLoading && 'Recording in progress...'}
          {recordAudio.status !== 'success' && 'Upload unavailable'}
          {
            recordAudio.isSuccess && (
              <>
                {audioTranscription.status === 'loading' && 'Uploading...'}
                {audioTranscription.status === 'error' && 'Upload failed'}
                {audioTranscription.status === 'idle' && 'Upload Audio'}
                {audioTranscription.status === 'success' && 'Uploaded!'}
              </>
            )
          }
        </button>
      </div>

      {audioBlobUrl && (
        <section className="flex flex-row items-center gap-2">
          <h3>Check audio</h3>
          <audio controls src={audioBlobUrl} />
        </section>
      )}

      <article className="flex flex-col gap-2 w-5/6">
        <h3>Outline</h3>
        <textarea className="p-2" value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} draggable />
        <div className="flex gap-3 self-end">
          <button type="reset" onClick={() => setPrompt('')}>Reset 🧹</button>
          <button
            type="button"
            disabled={!audioTranscription.isSuccess || prompt === audioTranscription.data}
            onClick={() => setPrompt(audioTranscription.data)}>
            {audioTranscription.isSuccess && prompt === audioTranscription.data && 'Synced with audio transcription ✅'}
            {prompt !== audioTranscription.data && 'Sync with audio transcription 🔄'}
          </button>
          <button type="button" disabled={!prompt} onClick={() => story.mutate(prompt)}>
            {story.isLoading && 'Generating...'}
            {story.isError && 'Failed to generate story 😢'}
            {story.isSuccess && 'Generated ✅'}
            {!story.isLoading && !story.isError && !story.isSuccess && 'Generate Story'}
          </button>
        </div>
      </article>

      {story.isSuccess && (
        <article className="flex flex-col gap-1">
          <h3>{story.data.title}</h3>
          {story.data.parts.map((part, i: number) => (
            <section key={i}>
              <h4>{part.title}</h4>
              <p>{part.content}</p>
              <p>{part.illustration}</p>
            </section>
          ))}

          <div className="flex gap-2 self-end">
            <button type="button" onClick={readStory}>Read 📖</button>
            <button type="button" onClick={() => speechSynthesis.pause()}>Pause ⏸️</button>
            <button type="button" onClick={() => speechSynthesis.resume()}>Resume ▶️</button>
            <button type="button" onClick={() => speechSynthesis.cancel()}>Cancel ❌</button>
          </div>
        </article>
      )}
    </section>
  );
}

