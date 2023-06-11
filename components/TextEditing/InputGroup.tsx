import { Button } from '@/components/CreateStory/Actions';
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { useForm } from 'react-hook-form';
import { extractErrorMessage } from '@/utils/errors';
import { ComponentPropsWithoutRef, PropsWithoutRef, ReactNode } from 'react';

interface InputGroupProps {
  onSubmit: (text: string) => Promise<void> | void;
  label?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  id?: string;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
}

let nextId = 1;

export default function InputGroup({
  label,
  placeholder = 'Write something...',
  defaultValue = '',
  maxLength = 280,
  id = `input-group-${nextId++}`,
  onSubmit,
  onCancel,
  className = '',
  autoFocus = false,
}: InputGroupProps) {
  const {
    handleSubmit,
    register,
    setError,
    formState: { isSubmitting, isValid, isDirty, errors, isSubmitSuccessful },
  } = useForm({
    defaultValues: { text: defaultValue },
  });

  const submit = handleSubmit(async ({ text }) =>
    Promise.resolve(onSubmit(text)).catch((error: any) => {
      setError('root.serverError', { message: extractErrorMessage(error) });
    })
  );

  const submitDisabled = !isValid || isSubmitting || !isDirty;

  return (
    <form className={`flex flex-col ${className}`} onSubmit={submit}>
      {label && (
        <label htmlFor={id} className="block my-2 text-lg font-semibold">
          {label}
        </label>
      )}
      <div className="flex mb-2">
        <input
          type="text"
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoFocus={autoFocus}
          {...register('text', { required: true, minLength: 5, maxLength })}
          className={`rounded-none rounded-l-lg ring-0 bg-gray-50 border border-r-0 text-gray-900 focus:ring-blue-500 focus:border-blue-500 block 
            flex-1 min-w-0 w-full border-gray-300 p-2.5 dark:bg-gray-700 dark:border-gray-600 
            dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
        />
        {isSubmitting && (
          <InputGroupButton
            icon={ArrowPathIcon}
            label="Saving..."
            iconClassName="animate-spin"
            disabled
          />
        )}
        {!isSubmitting && !errors.root?.serverError && (
          <InputGroupButton
            icon={CheckIcon}
            type="submit"
            label="Save"
            iconClassName={isSubmitSuccessful ? 'text-green-500' : 'text-gray-500'}
            disabled={submitDisabled}
          />
        )}
        {errors.root?.serverError && (
          <InputGroupButton
            icon={ExclamationTriangleIcon}
            label="Failed to save"
            iconClassName="text-red-500"
            disabled
          />
        )}
        {onCancel && <InputGroupButton icon={XCircleIcon} label="Cancel" onClick={onCancel} />}
      </div>
      {errors.text && (
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{errors.text.message}</p>
      )}
    </form>
  );
}

interface InputGroupButtonProps extends PropsWithoutRef<ComponentPropsWithoutRef<'button'>> {
  icon: typeof CheckIcon;
  label: string;
  onClick?: () => void;
  iconClassName?: string;
}

const InputGroupButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  className = '',
  iconClassName = '',
  ...rest
}: InputGroupButtonProps) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-none last:rounded-r-md border border-gray-300 bg-gray-200 dark:bg-gray-600 
    dark:text-gray-400 dark:border-gray-600  ring-0 ${className}`}
    {...rest}>
    <Icon className={`h-5 w-5 ${iconClassName}`} aria-hidden={true} />
    <span className="sr-only">{label}</span>
  </Button>
);
