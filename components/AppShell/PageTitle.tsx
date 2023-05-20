import {ReactNode} from 'react';
import Wrapper from './Wrapper';

interface PageTitleProps {
  children: ReactNode;
}

const PageTitle = ({ children }: PageTitleProps) => (
  <header className="bg-white shadow">
    <Wrapper className="py-6">
      <h1 className="flex justify-between text-3xl font-bold tracking-tight text-gray-900">
        {children}
      </h1>
    </Wrapper>
  </header>
);

export default PageTitle;
