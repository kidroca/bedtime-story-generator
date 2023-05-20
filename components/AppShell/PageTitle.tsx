import {ReactNode} from 'react';

interface PageTitleProps {
  children: ReactNode;
}

const PageTitle = ({ children }: PageTitleProps) => (
  <header className="bg-white shadow">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {children}
      </h1>
    </div>
  </header>
);

export default PageTitle;
