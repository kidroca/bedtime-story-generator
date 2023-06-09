import { readdir } from 'fs/promises';
import Link from 'next/link';
import { PageContent, Wrapper, PageTitle } from '@/components/AppShell';

interface StoryLink {
  name: string;
  href: string;
}

async function getStoryLinks(): Promise<StoryLink[]> {
  const dir = await readdir('./public/uploads/stories');
  return dir
    .filter((name) => !name.startsWith('.')) // ignore hidden files
    .map((dirName) => ({
      name: dirName.substring(17), // removes the ISO date prefix
      href: '/stories/' + dirName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function Stories() {
  const links = await getStoryLinks();
  return (
    <>
      <PageTitle>Stories - The Index</PageTitle>

      <PageContent>
        <Wrapper>
          <ul className="flex flex-wrap justify-between text-blue-900 underline">
            {links.map((link, i) => (
              <li key={link.href} className="w-5/12 m-1">
                <Link href={link.href} className="visited:text-blue-700">
                  {i + 1}. {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </Wrapper>
      </PageContent>
    </>
  );
}
