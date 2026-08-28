import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { message, history, context } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // แนบ Context ของผู้ใช้ (เช่น Peak Energy, Goals) เป็น System Prompt
    const systemInstruction = `You are an AI Productivity Assistant for a Doodle-style PWA. User context: ${JSON.stringify(context || {})}`;
    
    const chat = model.startChat({
      history: history || [],
      systemInstruction: systemInstruction,
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}