import {ReactNode} from 'react';
import { Inter } from 'next/font/google'
import Nav from './Nav';

interface AppShellProps {
  children: ReactNode;
}

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export default function AppShell(props: AppShellProps) {
  return (
    <html lang="en">
    <body className={inter.className}>
    <div className="min-h-full">
      <Nav />

      {props.children}
    </div>
    </body>
    </html>
  )
}
