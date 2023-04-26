import {Configuration, OpenAIApi} from "openai";
import {AxiosError} from 'axios';
import {NextApiRequest, NextApiResponse} from 'next';
import multer from 'multer';
import nextConnect from 'next-connect';
import * as fs from 'fs';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let fileId = 1;

const upload = multer({
  storage: multer.diskStorage({
    destination: './public/uploads',
    filename: (req, file, cb) => {
      cb(null, `${fileId++}.temp.${file.originalname.split('.')[1]}`);
    }
  })
});

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ExtendedRequest extends NextApiRequest {
  file: Express.Multer.File;
}

const apiRoute = nextConnect<ExtendedRequest, NextApiResponse>({
  // Handle any other HTTP method
  onNoMatch(req, res) {
    res.status(405).json({error: `Method '${req.method}' Not Allowed`});
  },
});

apiRoute.use(upload.single('audio'));

apiRoute.post(async (req, res) => {
  try {
    const transcription = await getTranscription(req.file);

    return res.json({ transcription });
  } catch (err) {
    const error = err as AxiosError;
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
});

const getTranscription = async (file: { path: string }) => {
  const transcription = await openai.createTranscription(
    // @ts-ignore
    fs.createReadStream(file.path),
    'whisper-1',
    'The transcript is about a made up story featuring real world or made up characters.',
    'json',
    0.15,
    'bg',
  );

  console.log('transcription.data: ', transcription.data);

  return transcription.data.text;
};

export default apiRoute;
