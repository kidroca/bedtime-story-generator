import {HTMLAttributes, ReactNode} from 'react';

interface WrapperProps extends HTMLAttributes<HTMLElement>{}

const Wrapper = ({ children, className }: WrapperProps) => (
  <section className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className || ''}`.trim()}>
    {children}
  </section>
)

export default Wrapper;
