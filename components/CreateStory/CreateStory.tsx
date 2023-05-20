'use client';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { Story } from '@/pages/api/common';
import StoryContent from '../StoryContent';
import Actions, { Button, ButtonIcon, OptionButton } from '@/components/CreateStory/Actions';
import {
  ArrowPathIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  MicrophoneIcon,
  MinusCircleIcon,
  StopIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/solid';
import Wrapper from '@/components/AppShell/Wrapper';

export default function CreateStory() {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
  const [prompt, setPrompt] = useState<string>('');
  const [finalStory, setFinalStory] = useState<Story>();

  const recordAudio = useMutation(async () => {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream);
      setMediaRecorder(mediaRecorder);

      return new Promise<Blob>((resolve, reject) => {
        // Set up an event listener to handle data when it's available
        let chunks: Blob[] = [];
        mediaRecorder.addEventListener('dataavailable', (event) => {
          chunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
          // Combine the recorded chunks into a single Blob
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        });

        mediaRecorder.addEventListener('error', (event) => {
          reject(event);
        });

        mediaRecorder.start();
      });
    });
  });

  const audioBlobUrl = useMemo(() => {
    if (!recordAudio.data) return;

    return URL.createObjectURL(recordAudio.data);
  }, [recordAudio.data]);

  const audioTranscription = useMutation(async (blob?: Blob) => {
    if (!blob) return;

    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const result = await fetch('/api/transcribe-voice', {
      method: 'POST',
      body: formData,
    }).then((response) => response.json());

    setPrompt((current) => {
      if (current) {
        return current;
      }

      return result.transcription;
    });

    return result.transcription;
  });

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

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(undefined);
  };

  return (
    <section className="w-full flex flex-col items-center p-2">
      <Wrapper className="flex flex-col my-2">
        <h3 className="mr-auto">Narrative</h3>

        <div className="flex flex-1 gap-x-2">
          <textarea
            className="w-full p-2"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            draggable
          />

          <div className="flex flex-col gap-2">
            <Actions
              label={
                <>
                  {recordAudio.isLoading && 'Recording in progress...'}
                  {!recordAudio.isLoading && 'Record Audio'}
                </>
              }>
              <OptionButton
                icon={MicrophoneIcon}
                name="Start Recording"
                onClick={() => recordAudio.mutate()}
                disabled={recordAudio.isLoading}
              />
              <OptionButton
                icon={StopIcon}
                name="Stop Recording"
                onClick={stopRecording}
                disabled={!recordAudio.isLoading}
              />
              <OptionButton
                name="Upload Audio"
                icon={recordAudio.isSuccess ? DocumentCheckIcon : DocumentArrowUpIcon}
                disabled={recordAudio.status !== 'success' || audioTranscription.isLoading}
                onClick={() => audioTranscription.mutate(recordAudio.data)}
                description={
                  <>
                    {recordAudio.isLoading && 'Recording in progress...'}
                    {recordAudio.status !== 'success' && 'Upload unavailable'}
                    {recordAudio.isSuccess && (
                      <>
                        {audioTranscription.status === 'loading' && 'Uploading...'}
                        {audioTranscription.status === 'error' && 'Upload failed'}
                        {audioTranscription.status === 'success' && 'Uploaded!'}
                      </>
                    )}
                  </>
                }
              />
              {audioBlobUrl && (
                <OptionButton
                  name="Audio Preview"
                  icon={SpeakerWaveIcon}
                  description={
                    <audio controls src={audioBlobUrl} />
                  }
                />
              )}
              {audioTranscription.isSuccess && (
                <OptionButton
                  name="Audio Transcription"
                  icon={prompt === audioTranscription.data ? DocumentCheckIcon : ArrowPathIcon}
                  onClick={() => setPrompt(audioTranscription.data)}
                  disabled={prompt === audioTranscription.data}
                  description={
                  <>
                    {
                      prompt === audioTranscription.data && 'Synced with audio transcription'}
                    {prompt !== audioTranscription.data && 'Sync audio transcription to text area'}
                  </>}
                />)}
            </Actions>
            <Button className="w-full" type="reset" onClick={() => setPrompt('')}>
              <ButtonIcon><MinusCircleIcon /></ButtonIcon>
              Reset
            </Button>
            <Button
              className="w-full"
              disabled={!prompt}
              onClick={() => story.mutate(prompt)}>
              {!story.isSuccess && <ButtonIcon><ArrowPathIcon /></ButtonIcon>}
              {story.isLoading && 'Generating...'}
              {story.isError && 'Failed to generate story 😢'}
              {story.isSuccess && (<><ButtonIcon><DocumentCheckIcon /></ButtonIcon>Generated</>)}
              {!story.isLoading && !story.isError && !story.isSuccess && 'Generate'}
            </Button>
          </div>
        </div>
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

      {finalStory && (<h3>{finalStory.title}</h3>)}
      {finalStory && <StoryContent story={finalStory} id={story.data?.id} />}
    </section>
  );
}
