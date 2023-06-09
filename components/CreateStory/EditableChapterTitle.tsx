import { useState } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/solid';
import InputGroup from '@/components/TextEditing/InputGroup';

interface EditableChapterTitleProps {
  title: string;
  onUpdate: (title: string) => Promise<void> | void;
  defaultEdit?: boolean;
  className?: string;
}

export default function EditableChapterTitle({
  title,
  onUpdate,
  className = '',
  defaultEdit = false,
}: EditableChapterTitleProps) {
  const [editMode, setEditMode] = useState(defaultEdit);

  const classes = `pt-4 ${className}`;

  if (editMode) {
    return (
      <InputGroup
        autoFocus
        className={`${classes} text-2xl`}
        defaultValue={title}
        onSubmit={async (newTitle) => {
          await onUpdate(newTitle);
          setEditMode(false);
        }}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <h4 className={`${classes} flex items-center text-3xl font-serif [&>button]:hover:visible`}>
      {title}
      <button className="ml-1 p-1 invisible" onClick={() => setEditMode(true)}>
        <PencilSquareIcon className="w-7 h-7" aria-hidden={true} />
        <span className="sr-only">Edit</span>
      </button>
    </h4>
  );
}
