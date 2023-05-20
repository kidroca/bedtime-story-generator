import {HTMLAttributes, ReactNode} from 'react';

interface WrapperProps extends HTMLAttributes<HTMLDivElement>{}

const Wrapper = ({ children, className }: WrapperProps) => (
  <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className || ''}`.trim()}>
    {children}
  </div>
)

export default Wrapper;
