import {ReactNode} from 'react';

export default function PageContent({ children }: { children: ReactNode }) {
  return <main className="py-6">{children}</main>;
}
