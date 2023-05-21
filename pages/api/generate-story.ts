import nextConnect from 'next-connect';
import {NextApiRequest, NextApiResponse} from 'next';
import { commonErrorHandler, openai, saveStory, Story, StoryFile } from '@/pages/api/common';
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse
} from 'openai';
import { performance } from 'perf_hooks';
import matter from 'gray-matter';

const MODEL = 'gpt-4';
const MODEL_MAX_TOKENS = 8000;
const MAX_TOKENS_RESPONSE = 4000;
const PRESENCE_PENALTY = 1;
const FREQUENCY_PENALTY = 1;
const TEMPERATURE = 0.65;
const TOP_P = 1;
const ADMIN = { name: 'BB', role: ChatCompletionRequestMessageRoleEnum.User };
const USER = { name: 'Alex', role: ChatCompletionRequestMessageRoleEnum.User };
const ASSISTANT = { name: 'Assy', role: ChatCompletionRequestMessageRoleEnum.Assistant };

const apiRoute = nextConnect<NextApiRequest, NextApiResponse<Result | ErrorResult>>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({error: `Method '${req.method}' Not Allowed`});
  },
});

apiRoute.post(async (req, res) => {
  try {
    performance.mark('generateStory-start');
    const transcription = req.body.transcription?.trim();
    const result = await generateStory({ transcription });
    performance.mark('generateStory-end');
    result.transcription = transcription;
    result.timing.story = performance.measure('generateStory', 'generateStory-start', 'generateStory-end').duration;

    const id = await saveFile(result);

    return res.json({story: result.story, id});
  } catch (error) {
    if ((error as any)?.generatedMessage) {
      return res.status(400).json({
        error: (error as any).generatedMessage,
      });
    }

    commonErrorHandler(error, res);
  }
});

/**
 * Generates a story based on user transcript.
 */
const generateStory =
  async ({ transcription }: { transcription: string }) => {

    const result = createResultObject();
    result.messages.push({
    ...USER,
      content: transcription,
    });

    const request: CreateChatCompletionRequest = {
      model: MODEL,
      // max_tokens: MAX_TOKENS_RESPONSE,
      presence_penalty: PRESENCE_PENALTY,
      frequency_penalty: FREQUENCY_PENALTY,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      messages: result.messages.slice(),
    };

    result.request = request;

    const completion = await openai.createChatCompletion(request);

    result.response = completion.data;
    result.usage = completion.data.usage;

    // Todo: better logging
    console.log('completion.usage: ', completion.data.usage);

    const firstChoice = completion.data.choices[0];
    console.log('finish_reason: ', firstChoice.finish_reason);

    result.messages.push({
      ...ASSISTANT,
      content: firstChoice.message!.content,
    });

    const content = firstChoice.message?.content || '';
    result.rawContent = content;

    try {
      result.story = await createStoryFromMarkDownContent(content);
      return result;
    } catch (error) {
      console.warn('Failed to generate a story');
      console.error(error);

      // Todo: this is just a prove of concept for the iterative approach
      // we'll probably just let the user give feedback if a story should be regenerated with some more instructions on how to fix it
      await saveStory(result, `.failures/${Date.now()}.json`);

      throw {
        originalError: (error as Error).message,
        generatedMessage: result.messages
          .filter(m => m.role === 'assistant')
          .map(m => m.content)
          .join('\n'),
      }
    }
  };

const createStoryFromMarkDownContent = async (content: string): Promise<Story> => {

  const frontMatter = matter(content);

  const regex = /^# (?<title>.*)(?:\r?\n|\r)(?<chaptersContent>[\s\S]*?)(?!\s*\S)/gm;
  const chapterRegex = /^##\s?(?<chapterTitle>[^#\n]*)\n*(?<chapterContent>[^#]*)\n*(?:###\s?.*\n*(?<illustration>^[^#\n]*))?/gm;

  const result = regex.exec(frontMatter.content);
  const title = result?.groups?.title;
  if (!title) {
    throw new Error('Failed to find a title in the generated content');
  }

  const chaptersContent = result?.groups!.chaptersContent;
  if (!chaptersContent) {
    throw new Error('Failed to find chapters in the generated content');
  }

  let chapter: RegExpExecArray | null;
  const chapters: Story['chapters'] = [];
  let lastIndex = chaptersContent.length;

  while ((chapter = chapterRegex.exec(chaptersContent)) !== null) {
    if (!chapter.groups) {
      throw new Error('Failed to parse a chapter');
    }

    lastIndex = chapterRegex.lastIndex;

    chapters.push({
      title: chapter.groups.chapterTitle,
      content: chapter.groups.chapterContent.trim(),
      illustration: chapter.groups.illustration,
    });
  }

  if (lastIndex !== chaptersContent.length) {
    const remainingContent = chaptersContent.slice(lastIndex).trim();
    console.log('Some content exists after the last chapter:\n', remainingContent);
    console.log('\n Adding it to the last chapter');

    chapters[chapters.length - 1].content += `\n${remainingContent}`;
  }

  return {
    enTitle: frontMatter.data.title || '',
    genre: frontMatter.data.genre || '',
    language: frontMatter.data.language || '',
    title,
    chapters,
  };
}

/**
 * Configure the initial parameters for the prompt.
 */
const createResultObject = (): StoryGeneration => ({
  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  timing: { story: 0, images: 0 },
  transcription: '',
  date: new Date().toISOString(),
  story: {
    title: '',
    genre: '',
    language: '',
    chapters: [],
  },
  rawContent: '',
  messages: [
    {
      "role": "system",
      "content": shrinkMessage(`
        You are a captivating storyteller like the author of "Winnie-the-Pooh".
        In this interactive storytelling game, you will receive a story outline from a user named ${USER.name},
        and your task is to expand it into a imaginative and engaging story with diverse characters.
        Keep the following guidelines in mind:
        1. Always write the story in the same language used by ${USER.name} in the outline.
        2. The values in the front-matter block (e.g. genre and language) must be in English.
        3. Follow the format provided in the example below.

        \`\`\`md
        ---
        title: [Story Title in English]
        genre: [Story Genre in English (e.g. Fantasy, Sci-Fi, Romance)]
        language: [Story Language code (e.g. en, ru, de)]
        ---
        
        # [Story Title in ${USER.name}'s Language]
        
        ## [Chapter Title in ${USER.name}'s Language]
        
        [Multiple Lines of Chapter Content in ${USER.name}'s Language]

        ### Illustration
        [Provide a detailed description in English for an illustrator to create a captivating illustration for this chapter]

        ## [Next Chapter Title]
        ...
        \`\`\``),
    },
  ],
  revisions: [],
});

/**
 * Remove extra spaces
 * Blank spaces at the start or end of each line are removed
 * Multiple spaces excluding line breaks are replaced by a single space
 * Multiple line breaks are replaced by a single line break
 * Allow a blank line between paragraphs
 *
 * Note: we're not using this function everywhere to preserve the original formatting
 * @param text
 */
const shrinkMessage = (text: string) => text.trim()
  .replace(/(^ +)|( +$)/gm, '')
  .replace(/ {2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n');

const saveFile = async (result: StoryGeneration) => {
  const date = new Date().toISOString().substring(0, 16);
  const title = result.story.title.replace(/[^\p{L}]/gu, '-');
  const filename = `${date}-${title}/story.json`;
  await saveStory(result, `${date}-${title}/story.json`);

  return filename;
}

interface Result {
  id: string,
  story: Story;
}

interface StoryGeneration extends StoryFile {
  story: Story;
  date: string;
  request?: CreateChatCompletionRequest;
  response?: CreateChatCompletionResponse;
  messages: ChatCompletionRequestMessage[];
  // Tokens usage
  usage?: { prompt_tokens: number, completion_tokens: number, total_tokens: number };
  rawContent: string;
  transcription?: string;
}

interface ErrorResult {
  error: string;
}

export default apiRoute;
