  import {Configuration, OpenAIApi} from "openai";
import {NextRequest, NextResponse} from 'next/server';
import type {AxiosError} from 'axios';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  const file = await getFile(req);
  console.log('file: ', file);

  try {
    const completion = await openai.createTranscription(
      // @ts-ignore
      file,
      'whisper-1',
      'The transcript is about a made up story featuring real world or made up characters.',
      'json',
      0.8,
      'bg',
    );

    console.log('completion: ', completion);

    return NextResponse.json({ result: completion.data?.text });
  } catch(err) {
    const error = err as AxiosError;
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json(error.response.data, { status: error.response.status });
    } else {
      console.error(error);
      NextResponse.json({
        error: {
          message: 'An error occurred during your request.',
        }
      }, { status: 500 });
    }
  }
}

const getFile = async (req: Request) => {
  const formData = await req.formData();
  // Note: this doesn't work
  // Couldn't get openai api to work with the file from the posted form data
  const audio = formData.get('audio') as File;
  return audio;
}
