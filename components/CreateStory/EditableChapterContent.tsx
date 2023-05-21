import { useState } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/solid';
import BlockEditor from '@/components/TextEditing/BlockEditor';

interface EditableChapterContentProps {
  content: string;
  onUpdate: (title: string) => Promise<void> | void;
  defaultEdit?: boolean;
  className?: string;
}

export default function EditableChapterContent({
  content,
  onUpdate,
  className = '',
  defaultEdit = false,
}: EditableChapterContentProps) {
  const [editMode, setEditMode] = useState(defaultEdit);

  const classes = `pt-2 ${className}`;

  if (editMode) {
    return (
      <BlockEditor
        autoFocus
        defaultValue={content}
        submitLabel="Update Chapter"
        className={classes}
        onSubmit={async (newTitle) => {
          await onUpdate(newTitle);
          setEditMode(false);
        }}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <div className={`relative basis-5/12 text-lg [&>button]:hover:visible ${classes}`}>
      <button className="absolute bottom-1 right-1 p-1 invisible" onClick={() => setEditMode(true)}>
        <PencilSquareIcon className="w-7 h-7" aria-hidden={true} />
        <span className="sr-only">Edit</span>
      </button>
      {content?.split(/\n+/).map((line, j) => (
        <p className="my-4" key={j}>
          {line}
        </p>
      ))}
    </div>
  );
}
