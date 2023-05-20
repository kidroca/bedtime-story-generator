import {ReactNode} from 'react';
import Nav from './Nav';

interface AppShellProps {
  children: ReactNode
  title: ReactNode
}

export default function AppShell({title, children}: AppShellProps) {
  return (
    <html lang="en">
    <body>
    <div className="min-h-full">
      <Nav />

      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
    </body>
    </html>
  )
}
