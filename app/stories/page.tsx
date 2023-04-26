import {readdir} from 'fs/promises';
import Link from 'next/link';

async function getStoryLinks(): Promise<{ name: string; href: string }[]> {
  const dir = await readdir('./public/uploads/stories');
  return dir.map(dirName => ({
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
    </>
  );
}
