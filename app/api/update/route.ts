import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { readStory, saveStory, StoryFile } from '@/pages/api/common';

export async function PUT(req: NextRequest) {
  const data = await req.json();

  if (!data.id) {
    return NextResponse.json(
      { error: { message: 'Please provide the correct story ID' } },
      { status: 400 }
    );
  }

  if (!data.story) {
    return NextResponse.json({ error: { message: 'Please provide the story' } }, { status: 400 });
  }

  let file: StoryFile;
  const filePath = `./public/uploads/stories/${data.id}/story.json`;

  try {
    file = await readStory(data.id);
    file.revisions = file.revisions || [];
  } catch (err) {
    return NextResponse.json({ error: { message: 'Story not found' } }, { status: 404 });
  }

  const revision: typeof file.revisions[0] = { date: new Date().toISOString() };

  for (const key in data.story) {
    switch (key) {
      case 'title':
        revision.title = data.story.title;
        break;
      case 'enTitle':
        revision.enTitle = data.story.enTitle;
        break;
      case 'genre':
        revision.genre = data.story.genre;
        break;
      case 'language':
        revision.language = data.story.language;
        break;
      case 'chapters':
        revision.chapters = data.story.chapters;
        break;
      default:
        return NextResponse.json({ error: { message: `Invalid property: ${key}` } }, { status: 400 });
    }
  }

  try {
    file.revisions.push(revision);
    await saveStory(file, data.id);
    return NextResponse.json({ message: `Saved story revision N${file.revisions.length}}` });
  }
  catch (err) {
    return NextResponse.json({ error: { message: 'Could not save the story' } }, { status: 500 });
  }
}
