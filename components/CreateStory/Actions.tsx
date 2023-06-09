import React, { ButtonHTMLAttributes, Fragment, ReactNode } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { BarsArrowDownIcon } from '@heroicons/react/20/solid';

interface ActionsProps {
  label: ReactNode;
  children: ReactNode;
}

export default function Actions({ label, children }: ActionsProps) {
  return (
    <Popover className="relative">
      <Popover.Button
        as={Button}
        className="inline-flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900">
        <span className="whitespace-nowrap">{label}</span>
        <BarsArrowDownIcon className="h-5 w-5" aria-hidden="true" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1">
        <Popover.Panel className="absolute z-10 right-0 mt-1 flex w-screen max-w-max translate-x-20 px-4">
          <div className="w-screen max-w-sm flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            <div className="p-4">{children}</div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

interface OptionsProps {
  name: ReactNode;
  description?: ReactNode;
  icon?: typeof BarsArrowDownIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const OptionButton = ({
  name,
  disabled,
  description,
  icon: Icon,
  onClick,
  className = '',
}: OptionsProps) => (
  <div
    className={`group items-center relative flex gap-x-6 rounded-lg p-4 hover:bg-gray-50 ${className}`}>
    {Icon && (
      <div className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
        <Icon className="h-6 w-6 text-gray-600 group-hover:text-indigo-600" aria-hidden="true" />
      </div>
    )}
    <div>
      <button onClick={onClick} className="font-semibold text-gray-900" disabled={disabled}>
        {name}
        <span className="absolute inset-0" />
      </button>
      {description && <p className="mt-1 text-gray-600">{description}</p>}
    </div>
  </div>
);

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  disabled?: boolean;
  title?: string;
  variant?: 'primary' | 'secondary';
}

export const Button = ({
  children,
  onClick,
  className,
  type = 'button',
  disabled = false,
  title,
  variant = 'secondary',
}: ButtonProps) => {
  let classes = `px-5 py-2 inline-flex items-center justify-between text-sm font-semibold 
  shadow-sm rounded-lg ring-1 disabled:opacity-60 disabled:cursor-not-allowed`;

  if (variant === 'primary') {
    classes +=
      ' text-white bg-blue-700 focus:ring-blue-200 dark:focus:ring-blue-900 hover:enabled:bg-blue-800';
  } else {
    classes += ' text-gray-900 bg-white ring-gray-300 hover:enabled:bg-gray-50';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${classes} ${className}`}>
      {children}
    </button>
  );
};

interface ButtonIconProps {
  children: ReactNode;
  className?: string;
}

export const ButtonIcon = ({ children, className = 'text-gray-400' }: ButtonIconProps) => (
  <span className={`-ml-0.5 mr-1.5 h-5 w-5 ${className}`} aria-hidden="true">
    {children}
  </span>
);
