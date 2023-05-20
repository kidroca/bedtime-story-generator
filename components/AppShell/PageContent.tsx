import {ReactNode} from 'react';

const PageContent = ({children}: { children: ReactNode }) => (
  <main>
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
  </main>
);

export default PageContent;
