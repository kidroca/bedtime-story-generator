import { Story } from '@/pages/api/common';

export const generateStory = (transcription: string) =>
  makeRequest<{ story: Story; id: string }>('/api/generate-story', {
    body: { transcription },
    method: 'POST',
  });

export const updateStory = async (id: string, story: Story, updates: Partial<Story>) => {
  await makeRequest<{ message: string }>('/api/update', {
    body: { id, story: updates },
    method: 'PUT',
  });
  return { id, story: { ...story, ...updates } };
};
interface RequestInput extends Omit<RequestInit, 'body'> {
  body: object;
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
