import React, { FormEvent, Fragment, useCallback, useMemo, useState } from 'react';
import { OptionButton } from '@/components/CreateStory/Actions';
import { useMutation } from 'react-query';
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  CodeBracketIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  StopIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { Popover, Transition } from '@headlessui/react';

interface BlockEditorProps {
  onSubmit: (text: string) => void;
  label: string;
  placeholder?: string;
  submitLabel?: string;
  defaultValue?: string;
}

export default function BlockEditor({
  label,
  placeholder = 'Write something...',
  submitLabel = 'Save',
  defaultValue,
  onSubmit,
}: BlockEditorProps) {
  const [text, setText] = useState(defaultValue ?? '');

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = (e.target as HTMLFormElement).elements.namedItem(
        'text-block'
      ) as HTMLTextAreaElement;
      onSubmit(text.value);
    },
    [onSubmit]
  );

  return (
    <form className="w-full" onSubmit={submit}>
      <label htmlFor="editor" className="text-lg font-semibold">
        {label}
      </label>
      <div className="w-full mb-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
        {/*Controls*/}
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-600">
          <div className="flex flex-wrap items-center divide-gray-200 sm:divide-x dark:divide-gray-600">
            <div className="flex items-center space-x-1 sm:pr-4">
              <EditorIconButton label="Format code" icon={CodeBracketIcon} onClick={() => {}} />
              <EditorIconButton label="Add emoji" icon={FaceSmileIcon} onClick={() => {}} />
            </div>
            <div className="flex flex-wrap items-center space-x-1 sm:px-4">
              <EditorIconButton icon={TrashIcon} label="Clear" onClick={() => setText('')} />
            </div>
            <div className="flex flex-wrap items-center space-x-1 sm:pl-4">
              <DictationControls
                applyTranscription={(transcription) => setText(transcription)}
                current={text}
              />
            </div>
          </div>
          <EditorIconButton
            label="Full screen"
            icon={ArrowsPointingOutIcon}
            onClick={() => {}}
            className="sm:ml-auto"
            data-tooltip-target="tooltip-fullscreen"
          />
          <div
            id="tooltip-fullscreen"
            role="tooltip"
            className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
            Show full screen
            <div className="tooltip-arrow" data-popper-arrow></div>
          </div>
        </div>

        {/*Text Content*/}
        <div className="px-4 py-2 bg-white rounded-b-lg dark:bg-gray-800">
          <textarea
            id="editor"
            rows={8}
            name="text-block"
            className="block w-full px-0 text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400"
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={text.length === 0 || text === defaultValue}
        className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-center text-white bg-blue-700 rounded-lg focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 hover:bg-blue-800">
        {submitLabel}
      </button>
    </form>
  );
}

interface EditorButtonProps {
  label: string;
  icon: typeof ArrowPathIcon;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const EditorIconButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  className = '',
}: EditorButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 text-gray-500 rounded cursor-pointer hover:text-gray-900 hover:bg-gray-100 
        dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600 ${className}`}>
      <Icon aria-hidden="true" className="w-5 h-5" />
      <span className="sr-only">{label}</span>
    </button>
  );
};

interface DictationControlsProps {
  applyTranscription: (transcription: string) => void;
  current: string;
}

const DictationControls = ({ applyTranscription, current }: DictationControlsProps) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();

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

    return result.transcription;
  });

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(undefined);
  };

  return (
    <>
      <Popover className="relative">
        <Popover.Button as={EditorIconButton} icon={MicrophoneIcon} label="Record Narrative" />

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1">
          <Popover.Panel className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
            <div className="w-screen max-w-sm flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
              <div className="p-4">
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
                {recordAudio.isSuccess && (
                  <OptionButton
                    name="Upload Audio"
                    icon={audioTranscription.isSuccess ? DocumentCheckIcon : DocumentArrowUpIcon}
                    disabled={audioTranscription.isLoading}
                    onClick={() => audioTranscription.mutate(recordAudio.data)}
                    description={
                      <>
                        {audioTranscription.isLoading && 'Uploading...'}
                        {audioTranscription.isError && 'Upload failed'}
                        {audioTranscription.isSuccess && 'Uploaded!'}
                      </>
                    }
                  />
                )}
                {audioBlobUrl && (
                  <OptionButton
                    name="Audio Preview"
                    icon={SpeakerWaveIcon}
                    description={<audio controls src={audioBlobUrl} />}
                  />
                )}
                {audioTranscription.isSuccess && (
                  <OptionButton
                    name="Audio Transcription"
                    icon={current === audioTranscription.data ? DocumentCheckIcon : ArrowPathIcon}
                    onClick={() => applyTranscription(audioTranscription.data)}
                    disabled={current === audioTranscription.data}
                    description={
                      <>
                        {current === audioTranscription.data && 'Synced with audio transcription'}
                        {current !== audioTranscription.data &&
                          'Sync audio transcription to text area'}
                      </>
                    }
                  />
                )}
                {audioBlobUrl && (
                  <OptionButton
                    name="Reset Audio"
                    icon={TrashIcon}
                    onClick={() => recordAudio.reset()}
                  />
                )}
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
      {recordAudio.isLoading && (
        <EditorIconButton label="Stop" icon={StopIcon} onClick={stopRecording} />
      )}
    </>
  );
};
