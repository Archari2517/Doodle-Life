import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Goal, Task, ChatMessage } from '../../types';
import { useTranslation } from '../../utils/translations';
import { sendAiChatMessage } from '../../services/geminiService';
import { Send, Sparkles, Calendar, Pencil, Trash2 } from 'lucide-react';
import aiIconImg from '../../assets/ai-icon.jpg';

interface AiChatViewProps {
  user: UserProfile;
  goals: Goal[];
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  user,
  goals,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateTab
}) => {
  const t = useTranslation(user.language);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: user.language === 'th'
        ? `สวัสดี ${user.name}! เราคือ Planda AI ผู้ช่วยส่วนตัวของคุณ\nเชื่อมโยงช่วงเวลาพลังงานพีค (${user.peakHours}) และเป้าหมาย ${goals.length} รายการของคุณแล้ว พร้อมช่วยวางแผนหรือให้คำแนะนำได้ทันที!`
        : `Hey ${user.name}! 🌿 I'm your Planda AI Coach.\nI've loaded your ${user.energyType.replace('_', ' ')} peak energy schedule (${user.peakHours}) and ${goals.length} active goals. What would you like to tackle today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text
      }));

      const res = await sendAiChatMessage(textToSend, history, user, goals, tasks);

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickAction: res.action
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 ดึงวันที่จริงจากข้อความหรือ payload
  const extractTargetDate = (msgText: string, payloadDate?: string): string => {
    // 1. ลองหา YYYY-MM-DD จากข้อความแชท
    const match = msgText.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];

    // 2. ถ้าไม่มีในข้อความ ให้ใช้ payloadDate
    if (payloadDate && /\d{4}-\d{2}-\d{2}/.test(payloadDate)) {
      return payloadDate;
    }

    // 3. Fallback เป็นวันปัจจุบัน (Local Timezone)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 🎯 เพิ่มงานลงตารางเมื่อผู้ใช้กดปุ่ม
  const handleExecuteAction = (msg: ChatMessage) => {
    if (!msg.quickAction) return;

    if (msg.quickAction.type === 'add_task' || msg.quickAction.type === 'unwind') {
      const payload = msg.quickAction.payload || {};
      
      // คำนวณวันที่จริง
      const targetDueDate = extractTargetDate(msg.text, payload.dueDate);

      const newTaskData: Partial<Task> = {
        title: payload.title || 'งานจาก AI',
        durationMinutes: payload.durationMinutes || 30,
        category: payload.category || 'STUDY',
        dueDate: targetDueDate, // บังคับส่ง YYYY-MM-DD แน่นอน
        date: targetDueDate,    // กันเหนียวกรณี App ใช้ field ชื่อ 'date' แทน 'dueDate'
        dueTime: payload.dueTime || '14:00',
        completed: false
      };

      console.log('📌กำลังส่งงานลง App:', newTaskData);

      // เรียกฟังก์ชันเพิ่มงานของ App
      onAddTask(newTaskData);
      
      // ลบปุ่มออกหลังจากกดแล้ว
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, quickAction: undefined } : m));
      
      alert(`✨ บันทึกงานลงวันที่ ${targetDueDate} สำเร็จ!`);
    } else if (msg.quickAction.type === 'edit_task') {
      const payload = msg.quickAction.payload || {};
      const targetTask = tasks.find(t => t.id === payload.taskId);

      if (!targetTask) {
        alert('⚠️ ไม่พบงานนี้แล้ว (อาจถูกลบหรือแก้ไขไปก่อนหน้านี้)');
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, quickAction: undefined } : m));
        return;
      }

      const updates = payload.updates || {};
      const updatedTask: Task = {
        ...targetTask,
        ...updates,
        // กันเหนียวกรณี App ใช้ field ชื่อ 'date' แทน 'dueDate'
        date: updates.dueDate || targetTask.date
      };

      onUpdateTask(updatedTask);

      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, quickAction: undefined } : m));

      alert(`✏️ แก้ไขงาน "${payload.taskTitle || targetTask.title}" เรียบร้อยแล้ว!`);
    } else if (msg.quickAction.type === 'delete_task') {
      const payload = msg.quickAction.payload || {};
      const targetTask = tasks.find(t => t.id === payload.taskId);

      if (!targetTask) {
        alert('⚠️ ไม่พบงานนี้แล้ว (อาจถูกลบไปก่อนหน้านี้)');
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, quickAction: undefined } : m));
        return;
      }

      const confirmed = window.confirm(`ยืนยันลบงาน "${payload.taskTitle || targetTask.title}" ใช่ไหม?`);
      if (!confirmed) return;

      onDeleteTask(payload.taskId);

      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, quickAction: undefined } : m));

      alert(`🗑️ ลบงาน "${payload.taskTitle || targetTask.title}" เรียบร้อยแล้ว!`);
    } else if (msg.quickAction.type === 'open_goal') {
      onNavigateTab('goals_flow');
    }
  };

  const quickChips = [
    { label: t.quickChipPlan, query: user.language === 'th' ? 'ช่วยจัดตารางงานวันนี้ให้เหมาะกับช่วงพลังงานของฉันหน่อย' : 'Plan my schedule today based on my peak energy window' },
    { label: t.quickChipGoal, query: user.language === 'th' ? 'แนะนำก้าวต่อไปสำหรับเป้าหมายที่กำลังทำอยู่' : 'What is the best next step for my active goals?' },
    { label: t.quickChipUnwind, query: user.language === 'th' ? 'แนะนำกิจกรรมพักผ่อนสั้นๆ 10-15 นาทีที่ช่วยรีเซ็ตสมอง' : 'Suggest a 15-minute restorative unwind activity for my break' },
    { label: t.quickChipReschedule, query: user.language === 'th' ? 'ช่วยวิเคราะห์งานที่ค้างและหาเวลาลงใหม่' : 'Analyze missed tasks and suggest slots' }
  ];

  return (
    <div className="pb-2 pt-2 px-4 max-w-md mx-auto flex flex-col h-[calc(100vh-145px)]">
      {/* Energy & Life Context Banner */}
      <div className="bg-[#E6D4F9] doodle-border doodle-shadow-sm p-3 mb-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white doodle-border-sm flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <span className="font-extrabold text-[var(--text-main)]">
              {user.energyType.replace('_', ' ').toUpperCase()}
            </span>
            <p className="text-[10px] text-gray-700 font-semibold">
              Peak: {user.peakHours} • {goals.length} Goals Active
            </p>
          </div>
        </div>

        <span className="bg-white doodle-border-sm text-[10px] font-black px-2 py-0.5 shadow-[1px_1px_0px_var(--ink-black)]">
          Gemini 3.7
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-end gap-1.5 max-w-[88%]">
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-accent doodle-border-sm flex items-center justify-center text-xs font-black shrink-0 mb-1 overflow-hidden">
                  <img src={aiIconImg} alt="Planda AI" className="w-full h-full object-cover" />
                </div>
              )}

              <div
                className={`p-3.5 doodle-border doodle-shadow-sm text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-[var(--ink-solid)] text-[var(--accent-color)] rounded-br-none'
                    : 'bg-white text-[var(--text-main)] rounded-bl-none'
                }`}
              >
                {msg.text}

                {/* ปุ่มให้ผู้ใช้กดยืนยันเอง */}
                {msg.quickAction && (
                  <button
                    onClick={() => handleExecuteAction(msg)}
                    className={`mt-3 w-full doodle-border-sm py-2 px-3 font-extrabold text-[11px] doodle-btn flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_var(--ink-black)] ${
                      msg.quickAction.type === 'delete_task'
                        ? 'bg-[#FF9F9F] hover:brightness-95 text-black'
                        : 'bg-accent hover:brightness-95 text-black'
                    }`}
                  >
                    {msg.quickAction.type === 'edit_task' ? (
                      <Pencil className="w-3.5 h-3.5" />
                    ) : msg.quickAction.type === 'delete_task' ? (
                      <Trash2 className="w-3.5 h-3.5" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5" />
                    )}
                    {msg.quickAction.label}
                  </button>
                )}
              </div>
            </div>

            <span className="text-[9px] font-bold text-gray-500 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent doodle-border-sm flex items-center justify-center text-xs font-black overflow-hidden">
              <img src={aiIconImg} alt="Planda AI" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white doodle-border-sm p-3 text-xs font-bold text-gray-700 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              Thinking with your energy context...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chips Row */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2 shrink-0">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.query)}
            className="bg-white hover:bg-[var(--accent-color)] doodle-border-sm px-2.5 py-1 text-[11px] font-extrabold shrink-0 doodle-shadow-sm doodle-btn"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 shrink-0 pt-1"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={t.typeMessage}
          disabled={isLoading}
          className="flex-1 p-3 doodle-input text-xs font-medium"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="bg-[var(--ink-solid)] text-[var(--accent-color)] px-4 doodle-border border-[var(--ink-black)] font-extrabold text-xs doodle-btn flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};