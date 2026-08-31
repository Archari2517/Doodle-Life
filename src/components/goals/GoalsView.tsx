import React, { useState } from 'react';
import { Goal, GoalType, Timeframe, GoalCategory, UserProfile, Task } from '../../types';
import { useTranslation } from '../../utils/translations';
import { ArrowLeft, Trash2, CheckCircle2, RotateCcw, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoalsViewProps {
  user: UserProfile;
  goals: Goal[];
  tasks: Task[];
  onAddGoal: (goal: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleGoalComplete?: (goalId: string) => void;
  onTogglePinGoal?: (goalId: string) => void;
  onBack: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  user,
  goals = [],
  tasks,
  onAddGoal,
  onDeleteGoal,
  onToggleGoalComplete,
  onTogglePinGoal,
  onBack
}) => {
  const t = useTranslation(user.language);

  // Form State
  const [goalType, setGoalType] = useState<GoalType>('short_term');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('study');

  const categories: Array<{ id: GoalCategory; icon: string; label: string; bg: string }> = [
    { id: 'study', icon: '📚', label: 'Study', bg: '#E6D4F9' },
    { id: 'work', icon: '💼', label: 'Work', bg: '#FFE66D' },
    { id: 'fitness', icon: '🏃', label: 'Fitness', bg: '#9DD9D2' },
    { id: 'finance', icon: '💰', label: 'Finance', bg: '#FF9F9F' }
  ];

  const handleGoalTypeChange = (type: GoalType) => {
    setGoalType(type);
    if (type === 'short_term') {
      setTimeframe('daily');
    } else {
      setTimeframe('monthly');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const categoryObj = categories.find(c => c.id === selectedCategory);

    onAddGoal({
      id: Date.now().toString(),
      title: description.trim(),
      goalType,
      timeframe,
      category: selectedCategory,
      categoryIcon: categoryObj?.icon || '🎯',
      progressPercent: 0,
      currentCount: 0,
      completed: false,
      targetCount: timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 5 : timeframe === 'monthly' ? 20 : 100,
      createdAt: new Date().toISOString()
    });

    setDescription('');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
  };

  const handleToggleComplete = (goal: Goal) => {
    if (!goal.completed) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onToggleGoalComplete) {
      onToggleGoalComplete(goal.id);
    }
  };

  // 🔹 แยกรายการเป้าหมายปัจจุบัน และ เป้าหมายที่สำเร็จแล้ว
  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const availableTimeframes: Timeframe[] = goalType === 'short_term'
    ? ['daily', 'weekly']
    : ['monthly', 'yearly'];

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center doodle-border-sm bg-white doodle-btn doodle-shadow-sm shrink-0"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-2xl font-black font-['Bricolage_Grotesque'] leading-tight">
          {t.goalsAndObjectives}
        </h1>
      </div>

      {/* New Goal Form */}
      <div className="relative mt-5">
        <div className="absolute -top-4 left-4 bg-accent px-4 py-1 doodle-border-sm border-b-0 rounded-t-lg rounded-b-none font-extrabold text-xs z-10 doodle-shadow-sm">
          {t.newGoal}
        </div>

        <div className="bg-white doodle-border doodle-shadow p-5 pt-7 relative z-0 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2.5">
                {t.goalType}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleGoalTypeChange('short_term')}
                  className={`p-3.5 doodle-border-sm flex flex-col items-center justify-center gap-1 font-extrabold text-xs h-20 transition-all doodle-btn ${
                    goalType === 'short_term'
                      ? 'bg-accent doodle-shadow-sm border-[3px]'
                      : 'bg-white text-gray-500 opacity-80'
                  }`}
                >
                  <span className="text-xl">⚡</span>
                  <span>{t.shortTermGoal}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoalTypeChange('long_term')}
                  className={`p-3.5 doodle-border-sm flex flex-col items-center justify-center gap-1 font-extrabold text-xs h-20 transition-all doodle-btn ${
                    goalType === 'long_term'
                      ? 'bg-accent doodle-shadow-sm border-[3px]'
                      : 'bg-white text-gray-500 opacity-80'
                  }`}
                >
                  <span className="text-xl">🎯</span>
                  <span>{t.longTermGoal}</span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2.5">
                {t.selectTimeframe}
              </h2>
              <div className="grid grid-cols-2 gap-2 py-0.5">
                {availableTimeframes.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`py-2 px-3 rounded-full doodle-border-sm font-extrabold text-xs text-center transition-all doodle-btn ${
                      timeframe === tf
                        ? 'bg-[#E6D4F9] doodle-shadow-sm border-[2.5px] text-[#1A1A1A]'
                        : 'bg-white text-gray-500'
                    }`}
                  >
                    {t[tf as keyof typeof t] || tf}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                {t.goalDescription}
              </h2>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.goalPlaceholder}
                className="w-full doodle-input p-3.5 text-sm font-medium placeholder-gray-400"
              />
            </div>

            <div>
              <div className="flex justify-between items-center px-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-13 h-13 rounded-full doodle-border-sm flex items-center justify-center text-2xl doodle-btn transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-[#E6D4F9] doodle-shadow-sm scale-110 border-[3px]'
                        : 'bg-white grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                    }`}
                    title={cat.label}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--ink-solid)] text-[var(--accent-color)] doodle-border border-[var(--ink-black)] py-3.5 rounded-xl font-black text-base flex items-center justify-center gap-2 doodle-btn shadow-[3px_3px_0px_var(--ink-black)]"
            >
              <span className="text-xl font-black">+</span> {t.addGoalBtn}
            </button>
          </form>
        </div>
      </div>

      {/* 🔹 1. หมวดเป้าหมายปัจจุบัน (ยังไม่สำเร็จ - แถบขาว ปุ่มขาว) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-extrabold font-['Bricolage_Grotesque']">
          เป้าหมายปัจจุบัน ({activeGoals.length})
        </h2>

        {activeGoals.map((goal) => (
          <div key={goal.id} className="bg-white doodle-border doodle-shadow-sm p-4 space-y-3 relative">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-accent doodle-border-sm flex items-center justify-center text-lg shrink-0">
                  {goal.categoryIcon || '🎯'}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-main)] line-clamp-1">
                    {goal.title}
                  </h3>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {t[goal.timeframe as keyof typeof t] || goal.timeframe} • {goal.goalType === 'short_term' ? t.shortTermGoal : t.longTermGoal}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onTogglePinGoal && (
                  <button
                    type="button"
                    onClick={() => onTogglePinGoal(goal.id)}
                    title={goal.isPinned ? 'เลิกแสดงในหน้า Tasks' : 'แสดงในหน้า Tasks'}
                    className={`flex items-center justify-center w-7 h-7 rounded-lg doodle-border-sm doodle-btn transition-all ${
                      goal.isPinned
                        ? 'bg-accent text-[#1A1A1A]'
                        : 'bg-white text-gray-400 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${goal.isPinned ? 'fill-current' : ''}`} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleComplete(goal)}
                  className="flex items-center gap-1 bg-white hover:bg-gray-100 text-[var(--text-main)] px-2.5 py-1 rounded-lg doodle-border-sm font-extrabold text-xs doodle-btn transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>สำเร็จ</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteGoal(goal.id)}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔹 2. หมวดเป้าหมายที่สำเร็จแล้ว (ย้ายมาอยู่นี่ + ปุ่มและแถบเปลี่ยนเป็นสีเขียว) */}
      {completedGoals.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-lg font-extrabold font-['Bricolage_Grotesque'] text-[var(--text-main)]">
            เป้าหมายที่สำเร็จแล้ว ({completedGoals.length})
          </h2>

          {completedGoals.map((goal) => (
            <div key={goal.id} className="bg-[#EAF8F6] doodle-border doodle-shadow-sm p-4 space-y-3 relative border-[#9DD9D2]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#9DD9D2] doodle-border-sm flex items-center justify-center text-lg shrink-0">
                    {goal.categoryIcon || '🎯'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-700 line-through line-clamp-1">
                      {goal.title}
                    </h3>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      {t[goal.timeframe as keyof typeof t] || goal.timeframe} • {goal.goalType === 'short_term' ? t.shortTermGoal : t.longTermGoal}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 🟢 ปุ่มสีเขียวสำหรับเป้าหมายที่สำเร็จแล้ว */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(goal)}
                    className="flex items-center gap-1 bg-[#9DD9D2] hover:bg-[#8BCBC4] text-[#1A1A1A] px-2.5 py-1 rounded-lg doodle-border-sm font-extrabold text-xs doodle-btn transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>สำเร็จแล้ว (ย้อนกลับ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteGoal(goal.id)}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};