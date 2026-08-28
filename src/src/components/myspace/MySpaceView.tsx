import React, { useState, useEffect } from 'react';
import { UserProfile, JournalEntry, MoodType, MySpaceSubTab, Task, Goal } from '../../types';
import { useTranslation } from '../../utils/translations';
import { generateJournalHealingMessage } from '../../services/geminiService';
import { audioSynth } from '../../utils/audioSynth';
import { getLocalTodayStr } from '../../utils/date';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Search, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Plus, 
  Play, 
  Square, 
  Volume2, 
  Wind, 
  Bot,
  Heart,
  TrendingUp,
  Clock,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  goals,
  journals,
  onAddJournal,
  onDeleteJournal,
  onAddTask
}) => {
  const t = useTranslation(user.language);
  const [activeSubTab, setActiveSubTab] = useState<MySpaceSubTab>('overview');

  // --- Journal State ---
  const [selectedMood, setSelectedMood] = useState<MoodType>('feeling_good');
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
  const [protectRestTime, setProtectRestTime] = useState(true);
  const [unwindFilter, setUnwindFilter] = useState<'chill' | 'micro_goal'>('chill');
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathingTimer, setBreathingTimer] = useState(60);
  const [isBreathingActive, setIsBreathingActive] = useState(false);

  // Ambient sound player state
  const [ambientSound, setAmbientSound] = useState<'rain' | 'stream' | 'binaural' | null>(null);

  // Focus vs Rest Calculation
  const completedTasks = tasks.filter(t => t.completed);
  const totalFocusMinutes = completedTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
  const focusHours = (totalFocusMinutes / 60).toFixed(1);
  const restHours = (Number(user.dailyFreeHoursTarget || 3.5) * 4).toFixed(1);
  const focusPercent = Math.min(90, Math.max(20, Math.round((Number(focusHours) / (Number(focusHours) + Number(restHours) || 1)) * 100)));
  const restPercent = 100 - focusPercent;

  // Speech Recognition setup
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
      // Generate healing reflection via Gemini API
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

  // Breathing Guide Loop
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
      audioSynth.startAmbientSound(type);
      setAmbientSound(type);
    }
  };

  const handleAddUnwindToCalendar = (title: string, duration: number) => {
    onAddTask({
      title,
      durationMinutes: duration,
      category: 'UNWIND',
      eisenhowerQuadrant: 'chill',
      dueDate: getLocalTodayStr(),
      dueTime: '18:00',
      completed: false
    });
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
    alert(user.language === 'th' ? `เพิ่ม "${title}" ลงในปฏิทินแล้ว!` : `Added "${title}" to your schedule!`);
  };

  const filteredJournals = journals.filter(j => {
    if (filterMood !== 'all' && j.mood !== filterMood) return false;
    if (searchJournal && !j.content.toLowerCase().includes(searchJournal.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* Sub-Tab Navigation Pill Strip */}
      <div className="flex bg-white doodle-border-sm p-1 doodle-shadow-sm gap-1">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all doodle-btn ${
            activeSubTab === 'overview'
              ? 'bg-[#1A1A1A] text-white shadow-[2px_2px_0px_#000]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          📊 {t.tabOverview}
        </button>
        <button
          onClick={() => setActiveSubTab('journal')}
          className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all doodle-btn ${
            activeSubTab === 'journal'
              ? 'bg-[#1A1A1A] text-white shadow-[2px_2px_0px_#000]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          📝 {t.tabJournal}
        </button>
        <button
          onClick={() => setActiveSubTab('unwind')}
          className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all doodle-btn ${
            activeSubTab === 'unwind'
              ? 'bg-[#1A1A1A] text-white shadow-[2px_2px_0px_#000]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          🌿 {t.tabUnwind}
        </button>
      </div>

      {/* ========================================================
          SUB-TAB 1: OVERVIEW (Exact Neo-Brutalist Dashboard)
         ======================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Weekly Mood Trend Card */}
          <div className="bg-[#FFE66D] p-5 doodle-border doodle-shadow relative overflow-hidden">
            <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-4 font-['Bricolage_Grotesque']">
              {t.weeklyMoodTrend}
            </h2>

            {/* Weekday Mood Bars */}
            <div className="flex items-end justify-between h-20 gap-2 mb-2 px-1">
              {[
                { day: 'M', h: '45%' },
                { day: 'T', h: '65%' },
                { day: 'W', h: '90%' },
                { day: 'T', h: '55%' },
                { day: 'F', h: '80%' },
                { day: 'S', h: '95%' },
                { day: 'S', h: '75%' }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                  <div
                    className="w-full bg-[#1A1A1A] rounded-t-md doodle-border-sm border-b-0 transition-all duration-300"
                    style={{ height: item.h }}
                  />
                  <span className="text-[11px] font-black">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-2 border-t-2 border-black/20">
              <span className="text-lg">⚡</span>
              <p className="text-sm font-extrabold">{t.mostlyEnergized}</p>
            </div>
          </div>

          {/* Tasks Done Metric Card */}
          <div className="bg-white p-5 doodle-border doodle-shadow relative pt-8">
            <div className="absolute top-0 left-4 -mt-3.5 bg-[#FF4D4D] text-white px-3 py-0.5 doodle-border-sm border-b-0 rounded-t-md font-extrabold text-xs">
              Tasks
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FFE66D] doodle-border-sm flex items-center justify-center font-bold text-xl">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-2xl font-black font-['Bricolage_Grotesque']">
                  {completedTasks.length || 18} Done
                </h3>
                <span className="text-xs font-extrabold bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full border border-black inline-block mt-1">
                  95% {t.completionRate}
                </span>
              </div>
            </div>
          </div>

          {/* Time Balance Ratio Bar */}
          <div className="bg-white p-5 doodle-border doodle-shadow space-y-4">
            <h3 className="text-lg font-extrabold font-['Bricolage_Grotesque']">
              {t.timeBalance}
            </h3>

            {/* Focus vs Rest Bar */}
            <div>
              <div className="flex justify-between text-xs font-black mb-1.5">
                <span>{t.focus} ({focusHours}h)</span>
                <span>{t.rest} ({restHours}h)</span>
              </div>
              <div className="h-7 w-full bg-gray-100 doodle-border-sm rounded-full flex overflow-hidden">
                <div
                  className="h-full bg-[#1A1A1A] border-r-2 border-black flex items-center justify-center text-[11px] font-black text-white"
                  style={{ width: `${focusPercent}%` }}
                >
                  {focusPercent}%
                </div>
                <div
                  className="h-full bg-[#9DD9D2] flex items-center justify-center text-[11px] font-black text-black"
                  style={{ width: `${restPercent}%` }}
                >
                  {restPercent}%
                </div>
              </div>
            </div>

            {/* Category Breakdown Bar */}
            <div>
              <div className="flex justify-between text-xs font-black mb-1.5">
                <span>{t.categoryBreakdown}</span>
              </div>
              <div className="h-8 w-full doodle-border-sm rounded-full flex overflow-hidden text-[10px] font-black">
                <div className="h-full bg-[#FF4D4D] text-white w-[45%] border-r-2 border-black flex items-center justify-center">
                  Work (45%)
                </div>
                <div className="h-full bg-[#FFE66D] text-black w-[35%] border-r-2 border-black flex items-center justify-center">
                  Study (35%)
                </div>
                <div className="h-full bg-white text-black w-[20%] flex items-center justify-center">
                  Pers. (20%)
                </div>
              </div>
            </div>
          </div>

          {/* AI Coach Insights Card */}
          <div className="bg-white p-5 doodle-border doodle-shadow relative pt-6">
            <div className="absolute -left-3 -top-3 w-10 h-10 bg-[#FFE66D] doodle-border-sm rounded-full flex items-center justify-center text-lg doodle-shadow-sm">
              🤖
            </div>
            <p className="text-xs md:text-sm font-semibold text-gray-800 italic leading-relaxed pl-4">
              "Great work-life balance this week! Rest time increased by 15% compared to last week. Your focus windows are well aligned with your chronotype."
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: JOURNAL (Feelings, Diary & AI Healing)
         ======================================================== */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold font-['Bricolage_Grotesque']">
            {t.howFeeling}
          </h2>

          {/* Mood Selector Stickers */}
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
                  onClick={() => setSelectedMood(m.id as MoodType)}
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

          {/* Notebook Lined Paper Diary Card */}
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
                className="bg-[#1A1A1A] text-white px-4 py-2 doodle-border border-[#1A1A1A] rounded-xl font-bold text-xs doodle-btn flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFE66D]" />
                {isSavingJournal ? 'Generating AI Healing...' : t.saveNote}
              </button>
            </div>
          </div>

          {/* AI Healing Thought Bubble */}
          <div className="flex items-start gap-2.5">
            <div className="flex-1 bg-[#F8DEF8] doodle-border doodle-shadow-sm p-3.5 relative rounded-2xl rounded-bl-none text-xs font-semibold leading-relaxed text-[#1A1A1A]">
              {aiHealingQuote}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#FFE66D] doodle-border-sm flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
          </div>

          {/* Past Entries Section */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base font-['Bricolage_Grotesque'] flex items-center gap-1.5">
                {t.pastEntries}
              </h3>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {['all', 'high_energy', 'feeling_good', 'tired', 'overwhelmed'].map((mood) => (
                <button
                  key={mood}
                  onClick={() => setFilterMood(mood)}
                  className={`px-3 py-1 doodle-border-sm text-xs font-bold shrink-0 doodle-btn ${
                    filterMood === mood ? 'bg-[#1A1A1A] text-white' : 'bg-white'
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
                        <span className="text-[10px] font-black bg-[#FFE66D] px-2 py-0.5 rounded-full border border-black">
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

                    <p className="text-xs font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>

                    {entry.aiHealingMessage && (
                      <div className="bg-[#FCF9F8] doodle-border-sm p-2 text-[11px] text-purple-900 font-semibold italic">
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

      {/* ========================================================
          SUB-TAB 3: UNWIND (Free Time, Lo-Fi, Breathing & Audio)
         ======================================================== */}
      {activeSubTab === 'unwind' && (
        <div className="space-y-4">
          {/* Free Time Indicator Card */}
          <div className="bg-[#FFE66D] p-5 doodle-border doodle-shadow space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧘</span>
              <h2 className="text-2xl font-black font-['Bricolage_Grotesque']">
                14 Hours
              </h2>
            </div>
            <p className="text-xs font-extrabold text-gray-900">
              {t.freeTimeLeft}
            </p>
          </div>

          {/* Protect Rest Time Toggle */}
          <div className="bg-white p-4 doodle-border doodle-shadow flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">
              {t.protectRestTime}
            </span>
            <button
              onClick={() => setProtectRestTime(!protectRestTime)}
              className={`w-12 h-6 rounded-full doodle-border-sm p-0.5 transition-colors ${
                protectRestTime ? 'bg-[#FFE66D]' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-[#1A1A1A] transition-transform ${
                  protectRestTime ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Activities Filter */}
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

          {/* Unwind Activity Card 1 */}
          <div className="bg-[#9DD9D2] p-5 doodle-border doodle-shadow space-y-3 relative pt-6">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-800">
              {t.activity}
            </div>
            <h3 className="text-lg font-black font-['Bricolage_Grotesque'] leading-snug">
              🎧 20-min Lo-Fi & Stretches
            </h3>
            <button
              onClick={() => handleAddUnwindToCalendar('20-min Lo-Fi & Stretches', 20)}
              className="bg-[#1A1A1A] text-white py-2.5 px-4 doodle-border border-[#1A1A1A] rounded-xl text-xs font-bold doodle-btn shadow-[2px_2px_0px_#000]"
            >
              {t.addToCalendar}
            </button>
          </div>

          {/* Unwind Activity Card 2 */}
          <div className="bg-white p-5 doodle-border doodle-shadow space-y-3 relative pt-6">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">
              {t.activity}
            </div>
            <h3 className="text-lg font-black font-['Bricolage_Grotesque'] leading-snug">
              📖 Read 5 pages of a book
            </h3>
            <button
              onClick={() => handleAddUnwindToCalendar('Read 5 pages of a book', 15)}
              className="bg-[#1A1A1A] text-white py-2.5 px-4 doodle-border border-[#1A1A1A] rounded-xl text-xs font-bold doodle-btn shadow-[2px_2px_0px_#000]"
            >
              {t.addToCalendar}
            </button>
          </div>

          {/* Quick Unwind Tools Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-extrabold font-['Bricolage_Grotesque']">
              {t.quickUnwindTools}
            </h3>

            {/* 1-Min Breathing Tool Card */}
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

            {/* Ambient Sounds Player Card */}
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
                        isActive ? 'bg-[#1A1A1A] text-white doodle-shadow-sm' : 'bg-white text-black'
                      }`}
                    >
                      <span className="text-base">{sound.icon}</span>
                      <span>{sound.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Min Guided Breathing Modal */}
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FCF9F8] doodle-border doodle-shadow-lg max-w-sm w-full p-6 text-center space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-lg font-['Bricolage_Grotesque']">
                1-Min Mindful Breathing
              </h3>
              <span className="text-xs font-black bg-[#FFE66D] px-2 py-0.5 rounded border border-black">
                {breathingTimer}s
              </span>
            </div>

            {/* Visual Animated Breathing Circle */}
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
              className="w-full bg-[#1A1A1A] text-white py-3 doodle-border border-[#1A1A1A] rounded-xl font-bold text-xs doodle-btn"
            >
              Done & Feel Relaxed ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
