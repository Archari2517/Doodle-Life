import React, { useState, useEffect } from 'react';
import { UserProfile, JournalEntry, MoodType, MySpaceSubTab, Task, Goal } from '../../types';
import { useTranslation } from '../../utils/translations';
import { generateJournalHealingMessage } from '../../services/geminiService';
import { audioSynth } from '../../utils/audioSynth';
import { getLocalTodayStr, toLocalDateStr } from '../../utils/date';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  CheckCircle, 
  Play, 
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import aiIconImg from '../../assets/ai-icon.jpg';

interface MySpaceViewProps {
  user: UserProfile;
  tasks: Task[];
  goals: Goal[];
  journals: JournalEntry[];
  onAddJournal: (entry: Partial<JournalEntry>) => void;
  onDeleteJournal: (id: string) => void;
  onAddTask: (task: Partial<Task>) => void;
}

export const MySpaceView: React.FC<MySpaceViewProps> = ({
  user,
  tasks,
  goals = [],
  journals,
  onAddJournal,
  onDeleteJournal,
  onAddTask
}) => {
  const t = useTranslation(user.language);
  const [activeSubTab, setActiveSubTab] = useState<MySpaceSubTab>('overview');

  // --- Journal State ---
  const [selectedMood, setSelectedMood] = useState<MoodType>('none');
  const [diaryText, setDiaryText] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [aiHealingQuote, setAiHealingQuote] = useState(
    user.language === 'th'
      ? "หายใจเข้าลึกๆ นะ! คุณทำได้ดีมากแล้ว มาเขียนสิ่งที่อยู่ในใจกัน 🌿"
      : "Take a deep breath! You've got this. Let's write down whatever comes to mind."
  );
  const [searchJournal, setSearchJournal] = useState('');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [isRecording, setIsRecording] = useState(false);

  // --- Unwind State ---
  const [unwindFilter, setUnwindFilter] = useState<'chill' | 'micro_goal'>('chill');
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathingTimer, setBreathingTimer] = useState(60);
  const [isBreathingActive, setIsBreathingActive] = useState(false);

  // Ambient sound player state
  const [ambientSound, setAmbientSound] = useState<'rain' | 'stream' | 'binaural' | null>(null);
  const [ambientVolume, setAmbientVolume] = useState(0.18); // 🔹 ระดับเสียง Ambient (0-1)

  // Helper dates
  const daysAgoStr = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toLocalDateStr(d);
  };
  
  const currentWeekDayStrs = Array.from({ length: 7 }, (_, i) => daysAgoStr(6 - i));
  const previousWeekDayStrs = Array.from({ length: 7 }, (_, i) => daysAgoStr(13 - i));

  // Focus vs Rest Calculation
  const allTasksThisWeek = tasks.filter(t => currentWeekDayStrs.includes(t.dueDate));
  const totalFocusMinutes = allTasksThisWeek.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
  const focusHours = (totalFocusMinutes / 60).toFixed(1);
  const focusVal = Number(focusHours);
  
  const TOTAL_WEEKLY_HOURS = 168;
  const restVal = Math.max(0, TOTAL_WEEKLY_HOURS - focusVal);
  const restHours = restVal.toFixed(1);

  const focusPercent = Math.round((focusVal / TOTAL_WEEKLY_HOURS) * 100);
  const restPercent = 100 - focusPercent;

  const todayStr = getLocalTodayStr();
  const todayTasks = tasks.filter(t => t.dueDate === todayStr);
  const todayFocusMinutes = todayTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
  const dailyRestHours = Math.max(0, 24 - (todayFocusMinutes / 60)).toFixed(1);

  const MOOD_ENERGY: Record<MoodType, number> = {
    none: 0,
    high_energy: 95,
    feeling_good: 75,
    tired: 40,
    overwhelmed: 20
  };

  const MOOD_COLORS: Record<MoodType, string> = {
    none: 'transparent',
    high_energy: '#FFE66D',  
    feeling_good: '#9DD9D2', 
    tired: '#B0BEFF',        
    overwhelmed: '#FF9F9F'   
  };

  const MOOD_META: Record<MoodType, { icon: string; label: string }> = {
    none: { icon: '➖', label: t.moodNone },
    high_energy: { icon: '⚡', label: t.moodHighEnergy },
    feeling_good: { icon: '😊', label: t.moodFeelingGood },
    tired: { icon: '😫', label: t.moodTired },
    overwhelmed: { icon: '😵', label: t.moodOverwhelmed }
  };

  const handleSelectMood = (mood: MoodType) => {
    if (selectedMood === mood) {
      setSelectedMood('none');
    } else {
      setSelectedMood(mood);
      onAddJournal({
        mood: mood,
        content: '',
        date: getLocalTodayStr()
      });
      confetti({ particleCount: 25, spread: 35, origin: { y: 0.7 } });
    }
  };

  const customDaysOrder = [6, 0, 1, 2, 3, 4, 5]; 
  const customDayLabels = user.language === 'th'
    ? ['ส', 'อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ']
    : ['S', 'S', 'M', 'T', 'W', 'T', 'F'];

  const weeklyMoodBars = customDaysOrder.map((dayIndex, i) => {
    const targetDateStr = currentWeekDayStrs.find(dayStr => new Date(dayStr + 'T00:00:00').getDay() === dayIndex);
    const dayEntries = journals.filter(j => j.date === targetDateStr && j.mood !== 'none');
    
    if (dayEntries.length > 0) {
      const latestEntry = dayEntries[dayEntries.length - 1]; 
      const energy = MOOD_ENERGY[latestEntry.mood] || 50;
      const color = MOOD_COLORS[latestEntry.mood] || '#1A1A1A';
      const emoji = MOOD_META[latestEntry.mood]?.icon || '';
      return {
        label: customDayLabels[i],
        percent: energy,
        color,
        emoji,
        hasData: true
      };
    }

    return {
      label: customDayLabels[i],
      percent: 0,
      color: 'transparent',
      emoji: '',
      hasData: false
    };
  });

  const thisWeekJournals = journals.filter(j => currentWeekDayStrs.includes(j.date) && j.mood !== 'none');
  const weekTasks = tasks.filter(ts => currentWeekDayStrs.includes(ts.dueDate));
  const weekCompletedTasks = weekTasks.filter(ts => ts.completed);
  const weekCompletionRate = weekTasks.length > 0
    ? Math.round((weekCompletedTasks.length / weekTasks.length) * 100)
    : 0;

  const CATEGORY_COLORS = ['#FF4D4D', '#FFE66D', '#9DD9D2', '#B0BEFF', '#E6D4F9'];
  const categoryMinutes = weekTasks.reduce((acc, ts) => {
    const key = (ts.category || 'OTHER').toUpperCase();
    acc[key] = (acc[key] || 0) + (ts.durationMinutes || 30);
    return acc;
  }, {} as Record<string, number>);
  const totalCategoryMinutes = Object.values(categoryMinutes).reduce((a, b) => a + b, 0);
  const sortedCategories = Object.entries(categoryMinutes).sort((a, b) => b[1] - a[1]);
  const topCategories = sortedCategories.slice(0, 3);
  const otherMinutes = sortedCategories.slice(3).reduce((acc, [, m]) => acc + m, 0);
  const categoryBreakdown = [
    ...topCategories.map(([name, minutes], idx) => ({
      name,
      percent: totalCategoryMinutes ? Math.round((minutes / totalCategoryMinutes) * 100) : 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    })),
    ...(otherMinutes > 0
      ? [{ name: 'OTHER', percent: totalCategoryMinutes ? Math.round((otherMinutes / totalCategoryMinutes) * 100) : 0, color: '#FFFFFF' }]
      : [])
  ];

  const prevWeekTasks = tasks.filter(ts => previousWeekDayStrs.includes(ts.dueDate));
  const prevWeekCompleted = prevWeekTasks.filter(ts => ts.completed);
  const prevWeekCompletionRate = prevWeekTasks.length > 0
    ? Math.round((prevWeekCompleted.length / prevWeekTasks.length) * 100)
    : null;
  const completionDelta = prevWeekCompletionRate !== null ? weekCompletionRate - prevWeekCompletionRate : null;

  const aiInsightText = (() => {
    if (weekTasks.length === 0 && thisWeekJournals.length === 0) {
      return user.language === 'th'
        ? 'ยังไม่มีข้อมูลงานหรือบันทึกอารมณ์ในสัปดาห์นี้ ลองเพิ่มงานหรือเลือกอารมณ์เพื่อดูสรุปความสมดุลของคุณนะ!'
        : "No tasks or journal entries logged this week yet. Add a task or pick a mood to see your balance summary!";
    }
    const balanceLine = focusPercent > 70
      ? (user.language === 'th' ? 'สัปดาห์นี้เน้นกิจกรรมค่อนข้างหนัก ลองแบ่งเวลาว่างเพิ่มขึ้นอีกนิดนะ' : "You're leaning heavily into activity time this week — try carving out a bit more free time.")
      : (user.language === 'th' ? 'สมดุลระหว่างกิจกรรมกับเวลาว่างของคุณดูดีอยู่นะ!' : 'Your balance between activity and free time is looking solid this week!');
    const trendLine = completionDelta === null
      ? ''
      : completionDelta > 0
        ? (user.language === 'th' ? ` อัตราความสำเร็จเพิ่มขึ้น ${completionDelta}% เทียบกับสัปดาห์ที่แล้ว` : ` Your completion rate is up ${completionDelta}% compared to last week.`)
        : completionDelta < 0
          ? (user.language === 'th' ? ` อัตราความสำเร็จลดลง ${Math.abs(completionDelta)}% เทียบกับสัปดาห์ที่แล้ว` : ` Your completion rate dropped ${Math.abs(completionDelta)}% compared to last week.`)
          : (user.language === 'th' ? ' อัตราความสำเร็จเท่ากับสัปดาห์ที่แล้ว' : " Your completion rate matched last week.");
    return `${balanceLine}${trendLine}`;
  })();

  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = user.language === 'th' ? 'th-TH' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDiaryText(prev => prev + (prev ? ' ' : '') + transcript);
      };
      recognition.start();
    } catch (e) {
      console.warn(e);
      setIsRecording(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!diaryText.trim() || isSavingJournal) return;
    setIsSavingJournal(true);

    try {
      const healingMsg = await generateJournalHealingMessage(selectedMood, diaryText, user);
      setAiHealingQuote(healingMsg);

      onAddJournal({
        mood: selectedMood,
        content: diaryText.trim(),
        aiHealingMessage: healingMsg,
        date: getLocalTodayStr()
      });

      setDiaryText('');
      confetti({ particleCount: 35, spread: 45, origin: { y: 0.7 } });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingJournal(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isBreathingActive && breathingTimer > 0) {
      interval = setInterval(() => {
        setBreathingTimer(prev => prev - 1);
        const cycleSec = (60 - breathingTimer) % 12;
        if (cycleSec < 4) {
          setBreathingPhase('Inhale');
        } else if (cycleSec < 8) {
          setBreathingPhase('Hold');
        } else {
          setBreathingPhase('Exhale');
        }
      }, 1000);
    } else if (breathingTimer === 0) {
      setIsBreathingActive(false);
      audioSynth.playBreathingBell();
    }
    return () => clearInterval(interval);
  }, [isBreathingActive, breathingTimer]);

  const startBreathingSession = () => {
    setShowBreathingModal(true);
    setBreathingTimer(60);
    setIsBreathingActive(true);
    setBreathingPhase('Inhale');
    audioSynth.playBreathingBell();
  };

  const handleToggleAmbient = (type: 'rain' | 'stream' | 'binaural') => {
    if (ambientSound === type) {
      audioSynth.stopAmbientSound();
      setAmbientSound(null);
    } else {
      audioSynth.setVolume(ambientVolume);
      audioSynth.startAmbientSound(type);
      setAmbientSound(type);
    }
  };

  // 🔹 ลาก Slider เพื่อเพิ่ม-ลดความดังเสียง Ambient แบบเรียลไทม์
  const handleAmbientVolumeChange = (value: number) => {
    setAmbientVolume(value);
    audioSynth.setVolume(value);
  };

  const handleAddUnwindToCalendar = (title: string, duration: number, category = 'UNWIND') => {
    onAddTask({
      title,
      durationMinutes: duration,
      category,
      eisenhowerQuadrant: 'chill',
      dueDate: getLocalTodayStr(),
      dueTime: '18:00',
      completed: false
    });
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
    alert(user.language === 'th' ? `เพิ่ม "${title}" ลงในตารางเวลาเรียบร้อย!` : `Added "${title}" to your schedule!`);
  };

  const filteredJournals = journals.filter(j => {
    if (filterMood !== 'all' && j.mood !== filterMood) return false;
    if (searchJournal && !j.content.toLowerCase().includes(searchJournal.toLowerCase())) return false;
    return true;
  });

  // กิจกรรมแนะนำสำหรับสาย "ชิลล์ & เติมพลัง"
  const CHILL_ACTIVITIES = [
    { title: '🎧 20-min Lo-Fi & Stretches', duration: 20, color: '#9DD9D2' },
    { title: '📖 Read 5 pages of a book', duration: 15, color: '#FFFFFF' },
    { title: '🍵 Mindful Tea / Coffee Break', duration: 10, color: '#FFE66D' },
    { title: '🌱 Quick Desk Decluttering', duration: 10, color: '#E6D4F9' }
  ];

  // Logic เสนอกิจกรรมตามเป้าหมาย (ถ้าไม่มีเป้าหมาย แสดง 2 กิจกรรมที่กำหนดไว้)
  const activeGoals = goals.filter(g => !g.completed);
  const CARD_COLORS = ['#9DD9D2', '#FFE66D', '#E6D4F9', '#FF9F9F', '#B0BEFF'];

  const MICRO_GOAL_ACTIVITIES = activeGoals.length > 0 
    ? activeGoals.map((g, idx) => ({
        title: `🎯 ${g.title}: ลุยทำ Micro-step 15 นาที`,
        duration: 15,
        goalTitle: g.title,
        color: CARD_COLORS[idx % CARD_COLORS.length]
      }))
    : [
        { 
          title: '📝 ทบทวนงานประจำสัปดาห์ (1 ชม.)', 
          duration: 60, 
          goalTitle: 'เริ่มต้นตั้งเป้าหมาย', 
          color: '#9DD9D2' 
        },
        { 
          title: '🎯 วางแผนและตั้งเป้าหมายใหม่ (30 นาที)', 
          duration: 30, 
          goalTitle: 'วางแผนเป้าหมาย', 
          color: '#FFE66D' 
        }
      ];

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* Sub-Tab Navigation Pill Strip */}
      <div className="flex bg-white doodle-border-sm p-1 doodle-shadow-sm gap-1">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all doodle-btn ${
            activeSubTab === 'overview'
              ? 'bg-[var(--ink-solid)] text-white shadow-[2px_2px_0px_var(--ink-black)]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          📊 {t.tabOverview}
        </button>
        <button
          onClick={() => setActiveSubTab('journal')}
          className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all doodle-btn ${
            activeSubTab === 'journal'
              ? 'bg-[var(--ink-solid)] text-white shadow-[2px_2px_0px_var(--ink-black)]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          📝 {t.tabJournal}
        </button>
        <button
          onClick={() => setActiveSubTab('unwind')}
          className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all doodle-btn ${
            activeSubTab === 'unwind'
              ? 'bg-[var(--ink-solid)] text-white shadow-[2px_2px_0px_var(--ink-black)]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          🌿 {t.tabUnwind}
        </button>
      </div>

      {/* SUB-TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-accent p-5 doodle-border doodle-shadow relative rounded-2xl space-y-3">
            <h2 className="text-xl font-black text-[var(--text-main)] font-['Bricolage_Grotesque']">
              แนวโน้มอารมณ์สัปดาห์นี้
            </h2>

            <div className="flex items-end justify-between gap-1.5 h-36 pt-4 pb-2 px-1">
              {weeklyMoodBars.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end gap-1.5">
                  <span className="text-xs h-4 flex items-center justify-center">
                    {item.emoji}
                  </span>

                  <div className="w-full max-w-[28px] h-24 bg-white/60 doodle-border-sm rounded-full p-0.5 flex flex-col justify-end overflow-hidden relative">
                    <div
                      className="w-full rounded-full transition-all duration-500 ease-out flex items-center justify-center"
                      style={{
                        height: item.hasData ? `${Math.max(item.percent, 12)}%` : '0%',
                        backgroundColor: item.color
                      }}
                    >
                      {item.percent >= 40 && (
                        <span className="text-[9px] font-extrabold text-[var(--text-main)] opacity-80">
                          {item.percent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="font-extrabold text-xs text-[var(--text-main)]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 doodle-border doodle-shadow relative pt-8">
            <div className="absolute top-0 left-4 -mt-3.5 bg-[#FF4D4D] text-white px-3 py-0.5 doodle-border-sm border-b-0 rounded-t-md font-extrabold text-xs">
              Tasks
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent doodle-border-sm flex items-center justify-center font-bold text-xl">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-2xl font-black font-['Bricolage_Grotesque']">
                  {weekCompletedTasks.length} {t.tasksDone}
                </h3>
                <span className="text-xs font-extrabold bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full border border-black inline-block mt-1">
                  {weekCompletionRate}% {t.completionRate}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 doodle-border doodle-shadow space-y-4">
            <h3 className="text-lg font-extrabold font-['Bricolage_Grotesque']">
              {t.timeBalance}
            </h3>

            <div>
              <div className="flex justify-between text-xs font-black mb-1.5">
                <span>{user.language === 'th' ? 'เวลาว่าง' : 'Free Time'} ({restHours}h)</span>
                <span>{user.language === 'th' ? 'กิจกรรม' : 'Activity'} ({focusHours}h)</span>
              </div>
              <div className="h-7 w-full bg-gray-100 doodle-border-sm rounded-full flex overflow-hidden">
                <div
                  className="h-full bg-[#9DD9D2] flex items-center justify-center text-[11px] font-black text-black transition-all duration-300"
                  style={{ width: `${restPercent}%` }}
                >
                  {restPercent > 0 ? `${restPercent}%` : ''}
                </div>
                <div
                  className="h-full bg-[var(--ink-solid)] flex items-center justify-center text-[11px] font-black text-white transition-all duration-300"
                  style={{ width: `${focusPercent}%` }}
                >
                  {focusPercent > 0 ? `${focusPercent}%` : ''}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-black mb-1.5">
                <span>{t.categoryBreakdown}</span>
              </div>
              {categoryBreakdown.length === 0 ? (
                <div className="h-8 w-full doodle-border-sm rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 bg-gray-50">
                  {user.language === 'th' ? 'ยังไม่มีงานในสัปดาห์นี้' : 'No tasks scheduled this week yet'}
                </div>
              ) : (
                <div className="h-8 w-full doodle-border-sm rounded-full flex overflow-hidden text-[10px] font-black">
                  {categoryBreakdown.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className={`h-full flex items-center justify-center px-0.5 truncate ${
                        idx < categoryBreakdown.length - 1 ? 'border-r-2 border-black' : ''
                      } ${cat.color === '#FFE66D' || cat.color === '#9DD9D2' || cat.color === '#FFFFFF' ? 'text-black' : 'text-white'}`}
                      style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                      title={`${cat.name} (${cat.percent}%)`}
                    >
                      {cat.percent >= 12 ? `${cat.name} (${cat.percent}%)` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 doodle-border doodle-shadow relative pt-6">
            <div className="absolute -left-3 -top-3 w-10 h-10 bg-accent doodle-border-sm rounded-full flex items-center justify-center text-lg doodle-shadow-sm overflow-hidden">
              <img src={aiIconImg} alt="Planda AI" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs md:text-sm font-semibold text-gray-800 italic leading-relaxed pl-4">
              "{aiInsightText}"
            </p>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: JOURNAL */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-[var(--text-main)] font-['Bricolage_Grotesque']">
            {t.howFeeling}
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'high_energy', label: t.moodHighEnergy, icon: '⚡', color: '#FFE66D' },
              { id: 'feeling_good', label: t.moodFeelingGood, icon: '😊', color: '#9DD9D2' },
              { id: 'tired', label: t.moodTired, icon: '😫', color: '#FF9F9F' },
              { id: 'overwhelmed', label: t.moodOverwhelmed, icon: '😵', color: '#E6D4F9' }
            ].map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMood(m.id as MoodType)}
                  className={`p-3 doodle-border-sm doodle-btn flex items-center gap-2 font-bold text-xs ${
                    isSelected ? 'doodle-shadow scale-105 border-[3px]' : 'bg-white opacity-85'
                  }`}
                  style={{ backgroundColor: isSelected ? m.color : '#FFFFFF' }}
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white doodle-border doodle-shadow p-4 relative space-y-3">
            <textarea
              rows={4}
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              placeholder={t.dearDiaryPlaceholder}
              className="w-full p-2 bg-transparent text-sm font-medium border-0 focus:outline-none lined-paper resize-none"
            />

            <div className="border-t-2 border-dashed border-gray-300 pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2 rounded-full doodle-border-sm doodle-btn flex items-center justify-center ${
                  isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'
                }`}
                title="Voice Dictation"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleSaveJournal}
                disabled={!diaryText.trim() || isSavingJournal}
                className="bg-[var(--ink-solid)] text-white px-4 py-2 doodle-border border-[var(--ink-black)] rounded-xl font-bold text-xs doodle-btn flex items-center gap-1.5 shadow-[2px_2px_0px_var(--ink-black)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                {isSavingJournal ? 'Generating AI Healing...' : t.saveNote}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="flex-1 bg-[#F8DEF8] doodle-border doodle-shadow-sm p-3.5 relative rounded-2xl rounded-bl-none text-xs font-semibold leading-relaxed text-[#1A1A1A]">
              {aiHealingQuote}
            </div>
            <div className="w-8 h-8 rounded-full bg-accent doodle-border-sm flex items-center justify-center text-sm shrink-0 overflow-hidden">
              <img src={aiIconImg} alt="Planda AI" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base font-['Bricolage_Grotesque'] flex items-center gap-1.5">
                {t.pastEntries}
              </h3>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {['all', 'high_energy', 'feeling_good', 'tired', 'overwhelmed'].map((mood) => (
                <button
                  key={mood}
                  onClick={() => setFilterMood(mood)}
                  className={`px-3 py-1 doodle-border-sm text-xs font-bold shrink-0 doodle-btn ${
                    filterMood === mood ? 'bg-[var(--ink-solid)] text-white' : 'bg-white'
                  }`}
                >
                  {mood === 'all' ? t.filterAllMoods : mood.replace('_', ' ')}
                </button>
              ))}
            </div>

            {filteredJournals.length === 0 ? (
              <div className="bg-white doodle-border doodle-shadow-sm p-4 text-center text-xs text-gray-500 font-medium">
                No journal notes recorded for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJournals.map((entry) => (
                  <div key={entry.id} className="bg-white doodle-border doodle-shadow-sm p-4 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">{entry.date}</span>
                        <span className="text-[10px] font-black bg-accent px-2 py-0.5 rounded-full border border-black">
                          {entry.mood.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteJournal(entry.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {entry.content && (
                      <p className="text-xs font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {entry.content}
                      </p>
                    )}

                    {entry.aiHealingMessage && (
                      <div className="bg-[var(--paper-bg)] doodle-border-sm p-2 text-[11px] text-purple-900 font-semibold italic">
                        💡 AI: {entry.aiHealingMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: UNWIND */}
      {activeSubTab === 'unwind' && (
        <div className="space-y-4">
          <div className="bg-accent p-5 doodle-border doodle-shadow space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧘</span>
              <h2 className="text-2xl font-black font-['Bricolage_Grotesque']">
                {dailyRestHours} {user.language === 'th' ? 'ชั่วโมง' : 'Hours'}
              </h2>
            </div>
            <p className="text-xs font-extrabold text-gray-900">
              {user.language === 'th' ? 'ชั่วโมงพักผ่อนคุณภาพในวันนี้' : 'Quality Free Hours Today'}
            </p>
          </div>

          <div>
            <h3 className="text-base font-extrabold font-['Bricolage_Grotesque'] mb-2">
              {t.whatFeelLikeDoing}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setUnwindFilter('chill')}
                className={`flex-1 p-2.5 doodle-border-sm text-xs font-extrabold doodle-btn flex items-center justify-center gap-1.5 ${
                  unwindFilter === 'chill' ? 'bg-[#FF9F9F] doodle-shadow-sm' : 'bg-white'
                }`}
              >
                <span>🛋️</span> {t.chillAndRecharge}
              </button>
              <button
                onClick={() => setUnwindFilter('micro_goal')}
                className={`flex-1 p-2.5 doodle-border-sm text-xs font-extrabold doodle-btn flex items-center justify-center gap-1.5 ${
                  unwindFilter === 'micro_goal' ? 'bg-[#9DD9D2] doodle-shadow-sm' : 'bg-white'
                }`}
              >
                <span>🎯</span> {t.microGoalAction}
              </button>
            </div>
          </div>

          {/* Dynamic Content based on selected unwindFilter */}
          {unwindFilter === 'chill' ? (
            /* Mode 1: ชิลล์ & เติมพลัง */
            <div className="space-y-3">
              {CHILL_ACTIVITIES.map((act, idx) => (
                <div 
                  key={idx} 
                  className="p-5 doodle-border doodle-shadow space-y-3 relative pt-6 rounded-xl"
                  style={{ backgroundColor: act.color }}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-700">
                    กิจกรรมผ่อนคลาย
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-main)] font-['Bricolage_Grotesque'] leading-snug">
                    {act.title}
                  </h3>
                  <button
                    onClick={() => handleAddUnwindToCalendar(act.title, act.duration, 'CHILL')}
                    className="bg-[var(--ink-solid)] text-white py-2.5 px-4 doodle-border border-[var(--ink-black)] rounded-xl text-xs font-bold doodle-btn shadow-[2px_2px_0px_var(--ink-black)]"
                  >
                    + {t.addToCalendar}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Mode 2: ขยับเป้าหมายทีละนิด */
            <div className="space-y-3">
              {MICRO_GOAL_ACTIVITIES.map((act, idx) => (
                <div 
                  key={idx} 
                  className="p-5 doodle-border doodle-shadow space-y-3 relative pt-6 rounded-xl"
                  style={{ backgroundColor: act.color }}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-800">
                    <span>🎯 {act.goalTitle}</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-black">{act.duration} นาที</span>
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-main)] font-['Bricolage_Grotesque'] leading-snug">
                    {act.title}
                  </h3>
                  <button
                    onClick={() => handleAddUnwindToCalendar(act.title, act.duration, 'GOAL_STEP')}
                    className="bg-[var(--ink-solid)] text-white py-2.5 px-4 doodle-border border-[var(--ink-black)] rounded-xl text-xs font-bold doodle-btn shadow-[2px_2px_0px_var(--ink-black)]"
                  >
                    + {t.addToCalendar}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Unwind Tools */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-extrabold text-[var(--text-main)] font-['Bricolage_Grotesque']">
              {t.quickUnwindTools}
            </h3>

            <button
              onClick={startBreathingSession}
              className="w-full bg-[#E6D4F9] p-4 doodle-border doodle-shadow doodle-btn flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white doodle-border-sm flex items-center justify-center text-xl">
                  🌬️
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1A1A1A]">
                    {t.oneMinBreathing}
                  </h4>
                  <p className="text-[10px] font-semibold text-gray-700">
                    Box Breathing 4-4-4 + 528Hz Solfeggio Chime
                  </p>
                </div>
              </div>
              <Play className="w-5 h-5 text-[#1A1A1A]" />
            </button>

            <div className="bg-[#B0BEFF] p-4 doodle-border doodle-shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌧️</span>
                  <h4 className="font-extrabold text-sm text-[#1A1A1A]">
                    {t.ambientSounds}
                  </h4>
                </div>
                {ambientSound && (
                  <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full border border-black animate-pulse">
                    PLAYING
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'rain', label: 'Lofi Rain', icon: '🌧️' },
                  { id: 'stream', label: 'Stream', icon: '🌊' },
                  { id: 'binaural', label: 'Binaural', icon: '🧘' }
                ].map((sound) => {
                  const isActive = ambientSound === sound.id;
                  return (
                    <button
                      key={sound.id}
                      onClick={() => handleToggleAmbient(sound.id as any)}
                      className={`py-2 px-1 doodle-border-sm text-[11px] font-extrabold doodle-btn flex flex-col items-center gap-1 ${
                        isActive ? 'bg-[var(--ink-solid)] text-white doodle-shadow-sm' : 'bg-white text-black'
                      }`}
                    >
                      <span className="text-base">{sound.icon}</span>
                      <span>{sound.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 🔊 ปรับความดังเสียง Ambient */}
              {ambientSound && (
                <div className="flex items-center gap-2 bg-white doodle-border-sm px-3 py-2">
                  <span className="text-sm shrink-0">🔈</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={ambientVolume}
                    onChange={(e) => handleAmbientVolumeChange(Number(e.target.value))}
                    className="w-full accent-[var(--ink-black)] cursor-pointer"
                  />
                  <span className="text-sm shrink-0">🔊</span>
                  <span className="text-[10px] font-black w-8 text-right shrink-0">
                    {Math.round(ambientVolume * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1-Min Guided Breathing Modal */}
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--paper-bg)] doodle-border doodle-shadow-lg max-w-sm w-full p-6 text-center space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-lg font-['Bricolage_Grotesque']">
                1-Min Mindful Breathing
              </h3>
              <span className="text-xs font-black bg-accent px-2 py-0.5 rounded border border-black">
                {breathingTimer}s
              </span>
            </div>

            <div className="py-8 flex flex-col items-center justify-center">
              <div
                className={`w-36 h-36 rounded-full doodle-border flex flex-col items-center justify-center doodle-shadow transition-all duration-1000 ${
                  breathingPhase === 'Inhale'
                    ? 'scale-125 bg-[#FFE66D]'
                    : breathingPhase === 'Hold'
                    ? 'scale-125 bg-[#9DD9D2]'
                    : 'scale-90 bg-[#E6D4F9]'
                }`}
              >
                <span className="text-2xl font-black font-['Bricolage_Grotesque']">
                  {breathingPhase}
                </span>
                <span className="text-[10px] font-bold text-gray-700 mt-1">
                  {breathingPhase === 'Inhale' ? 'Breathe In Deeply' : breathingPhase === 'Hold' ? 'Hold Gently' : 'Release Slowly'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowBreathingModal(false);
                setIsBreathingActive(false);
              }}
              className="w-full bg-[var(--ink-solid)] text-white py-3 doodle-border border-[var(--ink-black)] rounded-xl font-bold text-xs doodle-btn"
            >
              Done & Feel Relaxed ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};