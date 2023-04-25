import {ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi} from "openai";
import { NextRequest, NextResponse } from 'next/server';
import {AxiosError} from 'axios';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  if (!configuration.apiKey) {
    return NextResponse.json({
      error: {
        message: "OpenAI API key not configured, please follow instructions in README.md",
      }
    }, {
      status: 500,
    });
  }

  const data = await req.json();

  const userInput = data.userInput || '';
  if (userInput.trim().length === 0) {
    return NextResponse.json({
      error: {
        message: "Please enter a valid animal",
      }
    }, {
      status: 400,
    });

  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: generatePrompt(userInput),
      temperature: 0.6,
      max_tokens: 100,
    });

    console.log('completion.data.usage: ', completion.data.usage);

    const choice = completion.data.choices[0];

    if (!choice || !choice.message || !choice.message.content) {
      return NextResponse.json({
        error: {
          message: 'No response from OpenAI API',
        }
      }, { status: 500 });
    }

    return NextResponse.json({ result: choice.message.content });
  } catch(err) {
    const error = err as AxiosError;
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json(error.response.data, { status: error.response.status });
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      NextResponse.json({
        error: {
          message: 'An error occurred during your request.',
        }
      }, { status: 500 });
    }
  }
}

function generatePrompt(content: string) {
  return [
    {
      role: ChatCompletionRequestMessageRoleEnum.System, content: `You are an imprisoned super hero (by xenophobic humans). 
      Your super power is being fast as the speed of light.
      You are made to answer arbitrary citizen questions on any random topic, but you should not reveal you are an AI model`
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User, content,
    }
  ]
}
