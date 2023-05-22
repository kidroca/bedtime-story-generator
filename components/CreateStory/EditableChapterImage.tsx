import { useState } from 'react';
import {
  PencilSquareIcon,
  TrashIcon,
  DocumentCheckIcon,
  LinkIcon,
} from '@heroicons/react/24/solid';
import BlockEditor from '@/components/TextEditing/BlockEditor';
import Image from 'next/image';
import InputGroup from '@/components/TextEditing/InputGroup';

interface EditableChapterImageProps {
  img?: string;
  illustration?: string;
  onUpdate: ({ img, illustration }: { img: string; illustration: string }) => Promise<void> | void;
  defaultMode?: 'preview' | 'generate' | 'url';
  className?: string;
}

export default function EditableChapterImage({
  img,
  onUpdate,
  illustration = '',
  className = '',
  defaultMode = 'preview',
}: EditableChapterImageProps) {
  const [mode, setMode] = useState(defaultMode);
  const [newIllustration, setNewIllustration] = useState(illustration);
  const [newImage, setNewImage] = useState('');

  const classes = `pt-4 ${className}`;

  return (
    <div className={`w-1/2 [&>div.flex]:hover:visible ${classes}`}>
      {Boolean(newImage || img) && (
        <Image src={newImage || img!} alt={newIllustration} width={720} height={720} />
      )}
      <div className={`flex justify-end mt-1 empty:mt-0 ${mode !== 'preview' ? '' : 'invisible'}`}>
        {mode !== 'generate' && (
          <button className="p-1" onClick={() => setMode('generate')}>
            <PencilSquareIcon className="w-7 h-7" aria-hidden={true} />
            <span className="sr-only">Generate</span>
          </button>
        )}
        {mode !== 'url' && (
          <button className="p-1" onClick={() => setMode('url')}>
            <LinkIcon className="w-7 h-7" aria-hidden={true} />
            <span className="sr-only">From URL</span>
          </button>
        )}
        {Boolean(mode !== 'preview' && newImage && img) && (
          <button className="p-1" onClick={() => setNewImage('')}>
            <TrashIcon className="w-7 h-7 text-red-500" aria-hidden={true} />
            <span className="sr-only">Reset</span>
          </button>
        )}
        {Boolean(mode !== 'preview' && newImage) && (
          <button
            className="p-1"
            onClick={async () => {
              await onUpdate({ img: newImage, illustration: newIllustration });
              setMode('preview');
            }}>
            <DocumentCheckIcon className="w-7 h-7" aria-hidden={true} />
            <span className="sr-only">Save</span>
          </button>
        )}
      </div>
      {mode === 'generate' && (
        <BlockEditor
          autoFocus
          rows={3}
          className="mt-1"
          defaultValue={newIllustration}
          onSubmit={() => {
            // Prompt to generate new image
            return Promise.resolve();
          }}
          onCancel={() => setMode('preview')}
        />
      )}
      {mode === 'url' && (
        <InputGroup
          autoFocus
          className="mt-1"
          defaultValue={newImage || img || ''}
          onSubmit={(url) => {
            setNewImage(url);
            setMode('preview');
          }}
          onCancel={() => setMode('preview')}
        />
      )}
    </div>
  );
}
