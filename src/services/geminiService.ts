import { GoogleGenAI } from '@google/genai';
import { Task, MoodType, UserProfile, Goal } from '../types';

let clientInstance: GoogleGenAI | null = null;

function getApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return null;
}

function getGeminiClient(): GoogleGenAI | null {
  const key = getApiKey();
  if (!key) {
    console.error('⚠️ Missing VITE_GEMINI_API_KEY in .env file!');
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = new GoogleGenAI({ apiKey: key });
    } catch (e) {
      console.error('Failed to initialize GoogleGenAI client:', e);
      return null;
    }
  }
  return clientInstance;
}

export interface RescheduleProposal {
  taskId: string;
  taskTitle: string;
  originalTime: string;
  newTime: string;
  newDate: string;
  reason: string;
  eisenhowerQuadrant: 'now' | 'plan' | 'quick' | 'chill';
}

function getLocalTodayDateString(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function aiRescheduleMissedTasks(
  missedTasks: Task[],
  existingTasks: Task[],
  user: UserProfile
): Promise<RescheduleProposal[]> {
  const prompt = `
You are a smart, empathetic student & productivity assistant.
User Profile:
- Name: ${user.name}
- Chronotype / Peak Energy Hours: ${user.energyType} (${user.peakHours})
- Language: ${user.language === 'th' ? 'Thai' : 'English'}

Missed / Overdue Tasks:
${missedTasks.map((t, idx) => `${idx + 1}. [${t.id}] "${t.title}" (${t.durationMinutes} mins)`).join('\n')}

Existing Tasks Today:
${existingTasks.map(t => `- "${t.title}" at ${t.dueTime}`).join('\n')}

Reschedule missed tasks into realistic optimal future time slots.

Return JSON array:
[
  {
    "taskId": "string",
    "taskTitle": "string",
    "originalTime": "string",
    "newTime": "HH:MM",
    "newDate": "YYYY-MM-DD",
    "reason": "Rationale",
    "eisenhowerQuadrant": "now"
  }
]
`;

  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.error('Gemini API reschedule error:', err);
  }

  const todayStr = getLocalTodayDateString();
  return missedTasks.map((task, i) => ({
    taskId: task.id,
    taskTitle: task.title,
    originalTime: task.dueTime || 'Yesterday',
    newTime: `${String(11 + i * 2).padStart(2, '0')}:30`,
    newDate: todayStr,
    reason: 'จัดเวลาใหม่ให้ทำเสร็จสบายๆ',
    eisenhowerQuadrant: task.eisenhowerQuadrant || 'now'
  }));
}

export async function generateJournalHealingMessage(
  mood: MoodType,
  content: string,
  user: UserProfile
): Promise<string> {
  const prompt = `
User Journal Entry:
Mood: ${mood}
Content: "${content}"
Language: ${user.language === 'th' ? 'Thai' : 'English'}
Write 1-2 sentence comforting reflection.
`;
  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
      });
      return response.text?.trim() || 'ขอให้วันนี้เป็นวันที่ดีของคุณนะ ✨';
    }
  } catch (e) {
    console.error(e);
  }
  return 'ขอให้วันนี้เป็นวันที่ดีของคุณนะ ✨';
}

/**
 * 3. AI Conversational Assistant (Dynamic True Real-Time Dates)
 */
export async function sendAiChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  user: UserProfile,
  goals: Goal[],
  tasks: Task[]
): Promise<{ text: string; action?: { type: 'add_task' | 'reschedule' | 'unwind' | 'open_goal' | 'edit_task' | 'delete_task'; label: string; payload?: any } }> {
  
  // 🎯 1. คำนวณตารางวันย้อนหลัง/ล่วงหน้า 14 วันแบบ Real-Time จากเวลาเครื่องปัจจุบัน
  const daysTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const now = new Date();
  const dateMapList: string[] = [];
  const dateLookup: Record<string, string> = {};

  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayName = daysTh[d.getDay()];

    let relativeLabel = '';
    if (i === 0) relativeLabel = ' (วันนี้ / Today)';
    else if (i === 1) relativeLabel = ' (พรุ่งนี้ / Tomorrow)';
    else if (i === 2) relativeLabel = ' (มะรืนนี้)';

    const line = `- วัน${dayName}${relativeLabel} = "${dateStr}"`;
    dateMapList.push(line);
    dateLookup[`วัน${dayName}`] = dateStr;
    if (i === 0) dateLookup['วันนี้'] = dateStr;
    if (i === 1) dateLookup['พรุ่งนี้'] = dateStr;
  }

  // 🗂️ 2. รายการงานปัจจุบันของผู้ใช้ (พร้อม ID) เพื่อให้ AI อ้างอิงเวลาแก้ไข/ลบงาน
  const taskListForAi = tasks
    .filter(t => !t.completed)
    .map(t => `- [${t.id}] "${t.title}" | ${t.dueDate} ${t.dueTime || ''} | category: ${t.category}`)
    .join('\n') || '(ยังไม่มีงานในระบบ)';

  const systemContext = `
You are Planda AI Assistant.

CURRENT REAL-TIME DATE CALENDAR (STRICT TRUTH):
${dateMapList.join('\n')}

USER'S CURRENT TASKS (STRICT TRUTH — use these exact IDs when editing or deleting):
${taskListForAi}

RULES FOR DATE SELECTION:
1. When user requests to schedule/add a task, determine the intended day.
2. YOU MUST USE THE EXACT "YYYY-MM-DD" DATE FROM THE CALENDAR LIST ABOVE.
3. INCLUDE THE DATE STRING "YYYY-MM-DD" INSIDE YOUR "replyText" AND ALSO IN "action.payload.dueDate" (for add_task) or "action.payload.updates.dueDate" (for edit_task, only if the date is changing).
4. NEVER DEFAULT TO WEDNESDAY UNLESS THE USER EXPLICITLY ASKED FOR WEDNESDAY AND WEDNESDAY IS THE MATCHING DATE.

RULES FOR EDITING OR DELETING TASKS:
5. When the user asks to change/move/rename/reschedule a SPECIFIC existing task, find the best matching task from "USER'S CURRENT TASKS" above by title/time, use action type "edit_task", and put ONLY the fields that changed inside "action.payload.updates" (e.g. title, dueDate, dueTime, durationMinutes, category). ALWAYS include "action.payload.taskId" (the exact ID from the list) and "action.payload.taskTitle" (for display).
6. When the user asks to delete/remove/cancel a SPECIFIC existing task, use action type "delete_task" with "action.payload.taskId" and "action.payload.taskTitle".
7. If you cannot confidently match the task the user is referring to (ambiguous or not found in the list), DO NOT invent a taskId — instead ask the user to clarify in "replyText" and omit "action" entirely.
8. Never delete or edit more than one task per response — if the user wants to affect multiple tasks, handle the clearest one first and mention the rest in "replyText".

JSON OUTPUT FORMAT EXAMPLES:

Add a new task:
{
  "replyText": "จัดไปครับ! เพิ่มงานพรีเซ้นต์ในวันที่ 2026-08-29 (วันเสาร์) ให้เรียบร้อยแล้ว",
  "action": {
    "type": "add_task",
    "label": " เพิ่มลงตาราง",
    "payload": {
      "title": "พรีเซ้นต์งาน",
      "dueDate": "2026-08-29",
      "dueTime": "14:00",
      "durationMinutes": 60,
      "category": "STUDY"
    }
  }
}

Edit an existing task:
{
  "replyText": "แก้เวลางาน \\"พรีเซ้นต์งาน\\" เป็น 16:00 ให้แล้วครับ",
  "action": {
    "type": "edit_task",
    "label": "✏️ ยืนยันแก้ไขงาน",
    "payload": {
      "taskId": "abc123",
      "taskTitle": "พรีเซ้นต์งาน",
      "updates": {
        "dueTime": "16:00"
      }
    }
  }
}

Delete an existing task:
{
  "replyText": "ลบงาน \\"ประชุมทีม\\" ออกจากตารางให้แล้วครับ",
  "action": {
    "type": "delete_task",
    "label": "🗑️ ยืนยันลบงาน",
    "payload": {
      "taskId": "xyz789",
      "taskTitle": "ประชุมทีม"
    }
  }
}
`;

  try {
    const ai = getGeminiClient();
    if (ai) {
      const formattedContents = [
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: formattedContents,
        config: {
          systemInstruction: systemContext,
          responseMimeType: 'application/json'
        }
      });

      const jsonText = response.text?.trim();
      if (jsonText) {
        const parsed = JSON.parse(jsonText);

        // 🛡️ Auto Fix: ซ่อม dueDate ใน payload ให้ตรงกับวันที่ YYYY-MM-DD ใน replyText ชัวร์ 100%
        // (จำกัดเฉพาะ add_task เท่านั้น เพื่อไม่ให้ไปยุ่งกับ payload ของ edit_task/delete_task)
        if (parsed.action && parsed.action.type === 'add_task' && parsed.action.payload) {
          const dateInText = parsed.replyText?.match(/\d{4}-\d{2}-\d{2}/);
          if (dateInText) {
            parsed.action.payload.dueDate = dateInText[0];
          }
        }

        return {
          text: parsed.replyText || 'เรียบร้อยครับ!',
          action: parsed.action || undefined
        };
      }
    }
  } catch (e) {
    console.error('Gemini Chat Error:', e);
  }

  const todayStr = getLocalTodayDateString();
  return {
    text: 'บันทึกงานให้แล้วครับ!',
    action: {
      type: 'add_task',
      label: ' เพิ่มลงตาราง',
      payload: {
        title: message.replace(/เพิ่ม|สร้าง|งาน/g, '').trim() || 'Focus Work',
        dueDate: todayStr,
        dueTime: '14:00',
        durationMinutes: 60,
        category: 'STUDY'
      }
    }
  };
}