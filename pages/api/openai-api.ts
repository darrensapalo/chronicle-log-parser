// pages/api/openai-api.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type Message = {
  role: string;
  content: string;
};

type RequestData = {
  model: string;
  messages: Message[];
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { rawLogEvent, parserCode } = req.body;

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const apiURL = 'https://api.openai.com/v1/chat/completions';

  const prompt = `
  Raw log event:
  \`\`\`
  ${rawLogEvent}
  \`\`\`

  Log parser code:
  \`\`\`
  ${parserCode}
  \`\`\`
  `

  const requestData: RequestData = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: "You will be my assistant for testing Google Chronicle Logstash parsing code that I am writing. As my assistant, you will ask me for two inputs: The raw log event, and the log parser code. Once you have both inputs, you will help me understand the expected transformation into a UDM definition in JSON format and give me any suggestions or improvements to the code if necessary. You will not prompt me for any questions after you have given me the parsed output and suggestions. ",
      },
      {
        role: 'assistant',
        content: "Great! I'm ready to help you with your Google Chronicle Logstash parsing code. Please provide me with the raw log event and the log parser code. Once I have both inputs, I'll help you understand the expected transformation into a UDM definition in JSON format and offer suggestions or improvements if necessary.",
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  try {
    const response = await axios.post(apiURL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error making request:', (error as any).message);
    res.status(500).json({ message: 'Server error' });
  }
};

export default handler;
