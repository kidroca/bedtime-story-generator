export function mergeStoryRevisions(story: Story, revisions: StoryRevision[]) {
  const mergedStory: Story = JSON.parse(JSON.stringify(story));

  for (const revision of revisions) {
    for (const key in revision) {
      switch (key) {
        case 'title':
          mergedStory.title = revision.title || mergedStory.title;
          break;
        case 'enTitle':
          mergedStory.enTitle = revision.enTitle || mergedStory.enTitle;
          break;
        case 'genre':
          mergedStory.genre = revision.genre || mergedStory.genre;
          break;
        case 'language':
          mergedStory.language = revision.language || mergedStory.language;
          break;
        case 'chapters':
          if (revision.chapters) {
            for (let i = 0; i < revision.chapters.length; i++) {
              mergedStory.chapters[i] = {
                ...mergedStory.chapters[i],
                ...revision.chapters[i],
              };
            }
          }

          break;
      }
    }
  }

  return mergedStory;
}

export interface Story {
  title: string;
  enTitle?: string;
  genre: string;
  language: string;
  chapters: StoryChapter[];
}

export interface StoryRevision extends Partial<Omit<Story, 'chapters'>> {
  date: string;
  chapters?: Array<Partial<StoryChapter>>;
}

export interface StoryChapter {
  title: string;
  content: string;
  illustration?: string;
  illustrationPrompt?: string;
  img?: string;
}
