import { Button } from '@/components/CreateStory/Actions';
import { CheckIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { useForm } from 'react-hook-form';

interface InputGroupProps {
  onSubmit: (text: string) => Promise<void>;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  id?: string;
}

let nextId = 1;

export default function InputGroup({
  label,
  placeholder = 'Write something...',
  defaultValue = '',
  maxLength = 280,
  id = `input-group-${nextId++}`,
}: InputGroupProps) {
  const form = useForm({
    defaultValues: { text: defaultValue },
  });

  return (
    <>
      <label htmlFor={id} className="block mb-2 text-lg font-semibold">
        {label}
      </label>
      <div className="flex mb-2">
        <input
          type="text"
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`rounded-none rounded-l-lg bg-gray-50 border text-gray-900 focus:ring-blue-500 focus:border-blue-500 block 
            flex-1 min-w-0 w-full text-sm border-gray-300 p-2.5 dark:bg-gray-700 dark:border-gray-600 
            dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
        />
        <InputGroupButton
          icon={InformationCircleIcon}
          label="Info"
          className="rounded-r-none border-r !border-r-gray-400"
          onClick={() => {}}
        />
        <InputGroupButton icon={CheckIcon} label="Save" onClick={() => {}} />
      </div>
    </>
  );
}

interface InputGroupButtonProps {
  icon: typeof CheckIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const InputGroupButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  className = '',
}: InputGroupButtonProps) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-none rounded-r-md border border-gray-300 bg-gray-200 dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 ring-0 ${className}`}>
    <Icon className="h-5 w-5" aria-hidden={true} />
    <span className="sr-only">{label}</span>
  </Button>
);
