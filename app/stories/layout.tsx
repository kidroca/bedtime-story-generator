import {AppShell} from '@/components/AppShell';

export const metadata = {
  title: 'AI Storyteller - Stories',
};

export default function StoriesLayout({children}: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
