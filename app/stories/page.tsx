import {readdir} from 'fs/promises';
import Link from 'next/link';
import Image from 'next/image';

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
    <main className="flex flex-col p-4 bg-white">
      <header className="flex justify-around items-center border-b">
        <h1 className="font-bold text-3xl">
          The Index
        </h1>
        <Image
          src="/midjourney-plush-with-book.png"
          alt="A fox reading a book tacking a glimps forward"
          width={120}
          height={120}
          className="opacity-60"
        />
      </header>
      <ul className="flex flex-wrap justify-between p-2 text-blue-900 underline">
        {links.map((link, i) => (
          <li key={link.href} className="w-5/12 m-1">
            <Link href={link.href} className="visited:text-blue-700">{i + 1}. {link.name}</Link>
          </li>))}
      </ul>

      <Link className="p-2 text-blue-700 underline" href="/">Назад</Link>
    </main>
  );
}
