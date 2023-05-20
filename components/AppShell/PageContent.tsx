import {ReactNode} from 'react';
import Wrapper from '@/components/AppShell/Wrapper';

const PageContent = ({children}: { children: ReactNode }) => (
  <main>
    <Wrapper className="py-6">{children}</Wrapper>
  </main>
);

export default PageContent;
