import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { missedTasks, freeSlots } = req.body;
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
      Missed Tasks: ${JSON.stringify(missedTasks)}
      Available Free Time Slots: ${JSON.stringify(freeSlots)}
      Reschedule these missed tasks into available time slots. Return a JSON array with updated scheduled times.
    `;

    const result = await model.generateContent(prompt);
    return res.status(200).json(JSON.parse(result.response.text()));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}