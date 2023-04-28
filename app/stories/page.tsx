import {readdir} from 'fs/promises';
import Link from 'next/link';

interface StoryLink {
  name: string;
  href: string;
}

async function getStoryLinks(): Promise<StoryLink[]> {
  const dir = await readdir('./public/uploads/stories');
  return dir
    .filter(name => !name.startsWith('.')) // ignore hidden files
    .map(dirName => ({
    name: dirName.substring(17), // removes the ISO date prefix
    href: '/stories/' + dirName,
  }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function Stories() {
  const links = await getStoryLinks();
  return (
    <>
      <h1 className="font-bold text-3xl">Нашите приказки: </h1>
      <ul className="p-2 text-blue-700 underline">
        {links.map((link, i) => (
          <li key={link.href} className="m-1">
            <Link href={link.href} className="visited:text-blue-500">{i + 1}. {link.name}</Link>
          </li>))}
      </ul>

      <Link className="p-2 text-blue-700 underline" href="/">Назад</Link>
    </>
  );
}
