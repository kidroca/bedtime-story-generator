
import { Story, StoryRevision } from '@/utils/stories';

export const generateStory = (transcription: string) =>
  makeRequest<{ story: Story; id: string }>('/api/generate-story', {
    body: { transcription },
    method: 'POST',
  });

export const updateStory = async (
  id: string,
  story: Story,
  updates: Omit<StoryRevision, 'date'>
) => {
  await makeRequest<{ message: string }>('/api/update', {
    body: { id, story: updates },
    method: 'PUT',
  });
  return { id, story: { ...story, ...updates } };
};
interface RequestInput extends Omit<RequestInit, 'body'> {
  body: object;
}

export const generateImages = async (storyId: string) => {
  const result: { story: Story } = await makeRequest('/api/generate-images', {
    method: 'POST',
    body: { storyId },
  });

  return result.story;
};

export const generateImage = async (prompt: string) => {
  const result: { url: string } = await makeRequest('/api/generate-image', {
    method: 'POST',
    body: { prompt },
  });

  return result.url;
}

export const textTranslate = async ({ text = '', toLanguage = '' }) => {
  const result: { result: string } = await makeRequest('/api/text-translate', {
    method: 'POST',
    body: { text, toLanguage },
  });

  return result.result;
}

async function makeRequest<ReturnValue>(url: string, { body, ...options }: RequestInput) {
  const response = await fetch(url, {
    ...options,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    if (Object.keys(json).length > 0) {
      return Promise.reject(json);
    }

    throw new Error('Request failed');
  }

  return json as ReturnValue;
}
