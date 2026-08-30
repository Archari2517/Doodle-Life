import React, { useState } from 'react';
import { Task, UserProfile, Goal, EisenhowerQuadrant } from '../../types';
import { useTranslation } from '../../utils/translations';
import { getLocalTodayStr } from '../../utils/date';
import { Check, Trash2, Clock, Pencil, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TasksViewProps {
  user: UserProfile;
  tasks: Task[];
  goals: Goal[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigateToGoals: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  user,
  tasks,
  goals,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateToGoals
}) => {
  const t = useTranslation(user.language);
  const [activeQuadrant, setActiveQuadrant] = useState<EisenhowerQuadrant>('now');

  // ----------------------------------------------------
  // 📅 ตัวกรองวันที่ของรายการงาน (Date Filter)
  // ----------------------------------------------------
  // 'today'  = แสดงเฉพาะงานของวันนี้ (ค่าเริ่มต้น)
  // 'all'    = แสดงงานทั้งหมด ไม่กรองตามวันที่
  // 'custom' = แสดงเฉพาะงานในช่วงวันที่ที่ผู้ใช้เลือกเอง (ดู customStartDate / customEndDate)
  type TaskDateFilterMode = 'all' | 'today' | 'custom';
  const todayStr = getLocalTodayStr();
  const [dateFilterMode, setDateFilterMode] = useState<TaskDateFilterMode>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // 🏷️ ตัวกรองหมวดหมู่งาน (Category Filter) — ค่าเริ่มต้น 'all' คือไม่กรอง
  // ตัวเลือกหมวดหมู่ที่แสดง จะดึงมาจากค่า category จริงที่มีอยู่ใน Quadrant ที่กำลังเปิดดู
  // (เพราะ Task.category เป็น string อิสระ ไม่ได้ตายตัวเป็น enum ที่แน่นอน)
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // ----------------------------------------------------
  // Edit Task Modal State
  // ----------------------------------------------------
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('09:30');
  const [editDurationHours, setEditDurationHours] = useState(0);
  const [editDurationMins, setEditDurationMins] = useState(30);
  const [editQuadrant, setEditQuadrant] = useState<EisenhowerQuadrant>('now');
  const [editGoalId, setEditGoalId] = useState<string>('');

  // 🔹 แปลงเวลา "HH:mm" <-> จำนวนนาที ใช้ผูก Start/End Time กับ Duration
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minutesToTime = (totalMinutes: number) => {
    const clamped = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    const duration = task.durationMinutes || 0;
    setEditDurationHours(Math.floor(duration / 60));
    setEditDurationMins(duration % 60);
    const start = task.dueTime || '09:00';
    setEditStartTime(start);
    setEditEndTime(task.endTime || minutesToTime(timeToMinutes(start) + duration));
    setEditQuadrant(task.eisenhowerQuadrant);
    setEditGoalId(task.goalId || '');
  };

  const closeEditModal = () => {
    setEditingTask(null);
  };

  // 🔹 เปลี่ยน Start Time -> คำนวณ End Time ใหม่โดยคง Duration เดิมไว้
  const handleEditStartTimeChange = (value: string) => {
    setEditStartTime(value);
    const durationMinutes = Number(editDurationHours) * 60 + Number(editDurationMins);
    setEditEndTime(minutesToTime(timeToMinutes(value) + durationMinutes));
  };

  // 🔹 เปลี่ยน End Time -> คำนวณ Duration ใหม่จากส่วนต่างของเวลา
  const handleEditEndTimeChange = (value: string) => {
    setEditEndTime(value);
    let diff = timeToMinutes(value) - timeToMinutes(editStartTime);
    if (diff < 0) diff += 1440;
    setEditDurationHours(Math.floor(diff / 60));
    setEditDurationMins(diff % 60);
  };

  // 🔹 เปลี่ยน Duration (ชม./นาที) -> คำนวณ End Time ใหม่
  const handleEditDurationHoursChange = (hours: number) => {
    setEditDurationHours(hours);
    const totalMinutes = hours * 60 + Number(editDurationMins);
    setEditEndTime(minutesToTime(timeToMinutes(editStartTime) + totalMinutes));
  };

  const handleEditDurationMinsChange = (mins: number) => {
    setEditDurationMins(mins);
    const totalMinutes = Number(editDurationHours) * 60 + mins;
    setEditEndTime(minutesToTime(timeToMinutes(editStartTime) + totalMinutes));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    onUpdateTask({
      ...editingTask,
      title: editTitle.trim() || editingTask.title,
      dueTime: editStartTime,
      endTime: editEndTime,
      durationMinutes: editDurationHours * 60 + editDurationMins,
      eisenhowerQuadrant: editQuadrant,
      goalId: editGoalId || undefined,
      updatedAt: new Date().toISOString()
    });

    closeEditModal();
  };

  const quadrants: Array<{
    id: EisenhowerQuadrant;
    title: string;
    sub: string;
    icon: string;
  }> = [
    {
      id: 'now',
      title: 'ด่วน & สำคัญ (ทำทันที)',
      sub: 'งานด่วนและสำคัญมาก',
      icon: '⚡'
    },
    {
      id: 'plan',
      title: 'วางแผน (มีตารางเวลา)',
      sub: 'ไม่ด่วน แต่สำคัญกับเป้าหมาย',
      icon: '🗓️'
    },
    {
      id: 'quick',
      title: 'งานไว / มอบหมาย',
      sub: 'ด่วน แต่ง่ายหรือให้คนอื่นช่วยได้',
      icon: '⚡'
    },
    {
      id: 'chill',
      title: 'ผ่อนคลาย (ไม่เร่งรีบ)',
      sub: 'งานไม่ด่วน ไม่สำคัญ พักผ่อนได้',
      icon: '🛋️'
    }
  ];

  // หมวดหมู่ที่มีอยู่จริงใน Quadrant ปัจจุบัน ใช้เป็นตัวเลือกในตัวกรองหมวดหมู่
  const categoryOptions = Array.from(
    new Set(
      tasks
        .filter((task) => task.eisenhowerQuadrant === activeQuadrant)
        .map((task) => task.category)
        .filter((c): c is string => !!c)
    )
  ).sort();

  // กันพัง: ถ้าหมวดหมู่ที่เคยเลือกไว้ไม่มีอยู่ใน Quadrant ปัจจุบันแล้ว (เช่น ถูกลบ/สลับแท็บ)
  // ให้ถือว่าไม่กรอง ('all') แทน โดยไม่ต้องพึ่ง useEffect
  const effectiveCategoryFilter = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all';

  // กันพัง: ถ้าผู้ใช้เลือกวันเริ่มต้นมาทีหลังวันสิ้นสุด ให้สลับกันเอง (Effective Range)
  const effectiveRangeStart = customStartDate <= customEndDate ? customStartDate : customEndDate;
  const effectiveRangeEnd = customStartDate <= customEndDate ? customEndDate : customStartDate;

  // กรองตาม Quadrant ที่เลือก + หมวดหมู่ + ตัวกรองวันที่ (ทั้งหมด / วันนี้ / ช่วงวันที่ระบุเอง)
  const filteredTasks = tasks.filter((task) => {
    if (task.eisenhowerQuadrant !== activeQuadrant) return false;
    if (effectiveCategoryFilter !== 'all' && task.category !== effectiveCategoryFilter) return false;
    if (dateFilterMode === 'today') return task.dueDate === todayStr;
    if (dateFilterMode === 'custom') return task.dueDate >= effectiveRangeStart && task.dueDate <= effectiveRangeEnd;
    return true; // 'all' ➔ ไม่กรองตามวันที่
  });

  // เป้าหมายที่ถูกเลือก (ปักหมุด) ให้แสดงบนหน้านี้
  const featuredGoal = goals.find((g) => g.isPinned && !g.completed);

  const handleCheck = (taskId: string, currentCompleted: boolean) => {
    onToggleTask(taskId);
    if (!currentCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 }
      });
    }
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* Target / Goals Banner */}
      <div className="bg-accent doodle-border doodle-shadow p-4 relative flex justify-between items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            เป้าหมาย
          </h2>
          {featuredGoal ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-base shrink-0">{featuredGoal.categoryIcon || '🎯'}</span>
              <p className="text-xs font-semibold text-gray-800 truncate">
                {featuredGoal.title}
              </p>
            </div>
          ) : (
            <p className="text-xs font-semibold text-gray-800 mt-1">
              ยังไม่มีเป้าหมายตอนนี้
            </p>
          )}
        </div>
        <button
          onClick={onNavigateToGoals}
          className="bg-white doodle-border-pill doodle-shadow-sm doodle-btn px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shrink-0"
        >
          <span className="text-sm">🎯</span> Goals
        </button>
      </div>

      {/* 4 Eisenhower Quadrants */}
      <div className="grid grid-cols-2 gap-3">
        {quadrants.map((q) => {
          const count = tasks.filter(t => {
            if (t.eisenhowerQuadrant !== q.id || t.completed) return false;
            // ตัวกรองหมวดหมู่ผูกกับ Quadrant ที่กำลังเปิดดูอยู่เท่านั้น จึงใช้กรองแค่กับ q.id
            // ที่ตรงกับ activeQuadrant เพื่อไม่ให้ตัวเลขของ Quadrant อื่นเพี้ยนไปตามหมวดหมู่ที่เลือก
            if (q.id === activeQuadrant && effectiveCategoryFilter !== 'all' && t.category !== effectiveCategoryFilter) return false;
            if (dateFilterMode === 'today') return t.dueDate === todayStr;
            if (dateFilterMode === 'custom') return t.dueDate >= effectiveRangeStart && t.dueDate <= effectiveRangeEnd;
            return true;
          }).length;
          const isSelected = activeQuadrant === q.id;
          return (
            <button
              key={q.id}
              onClick={() => {
                setActiveQuadrant(q.id);
                setCategoryFilter('all'); // สลับ Quadrant ➔ รีเซ็ตตัวกรองหมวดหมู่ (หมวดหมู่ผูกกับ Quadrant)
              }}
              className={`doodle-border doodle-shadow doodle-btn p-3 relative flex flex-col justify-between h-32 text-left transition-colors ${
                isSelected ? 'bg-accent' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-lg">{q.icon}</span>
                <span className="border border-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold bg-white">
                  {count}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-xs leading-tight text-[#1A1A1A]">
                  {q.title}
                </h3>
                <p className={`text-[10px] mt-1 font-medium leading-tight ${
                  isSelected ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  {q.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Task List Header + Filters (หมวดหมู่ / ทั้งหมด-วันนี้-เลือกวันที่) */}
      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold text-sm text-[#1A1A1A]">
          {filteredTasks.length} tasks
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {categoryOptions.length > 0 && (
            <select
              value={effectiveCategoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="doodle-input text-[10px] font-bold px-2 py-1"
            >
              <option value="all">{user.language === 'th' ? 'ทุกหมวดหมู่' : 'All categories'}</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <div className="flex bg-white doodle-border-pill doodle-shadow-sm p-0.5 gap-0.5 shrink-0">
            {(['today', 'all', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateFilterMode(mode)}
                className={`doodle-btn px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  dateFilterMode === mode ? 'bg-accent text-[#1A1A1A]' : 'text-gray-400'
                }`}
              >
                {mode === 'today'
                  ? (user.language === 'th' ? 'วันนี้' : 'Today')
                  : mode === 'all'
                  ? (user.language === 'th' ? 'ทั้งหมด' : 'All')
                  : (user.language === 'th' ? 'เลือกช่วงเวลา' : 'Date range')}
              </button>
            ))}
          </div>

          {dateFilterMode === 'custom' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="doodle-input text-[11px] font-bold px-2 py-1"
                aria-label={user.language === 'th' ? 'วันที่เริ่มต้น' : 'Start date'}
              />
              <span className="text-[10px] font-bold text-gray-400">
                {user.language === 'th' ? 'ถึง' : 'to'}
              </span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="doodle-input text-[11px] font-bold px-2 py-1"
                aria-label={user.language === 'th' ? 'วันที่สิ้นสุด' : 'End date'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Empty State / Task Items */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white doodle-border doodle-shadow p-8 text-center min-h-[170px] flex flex-col items-center justify-center space-y-3">
            <span className="text-3xl text-amber-400">✦</span>
            <p className="font-bold text-[#1A1A1A] text-sm leading-relaxed px-4">
              No tasks in this priority! Enjoy the clarity.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const linkedGoal = goals.find(g => g.id === task.goalId);
            return (
              <div
                key={task.id}
                className={`bg-white doodle-border doodle-shadow p-3.5 relative transition-all ${
                  task.completed ? 'opacity-60 bg-gray-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleCheck(task.id, task.completed)}
                    className={`w-5 h-5 doodle-border-sm shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      task.completed ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-sm font-bold leading-snug line-clamp-2 ${
                        task.completed ? 'line-through text-gray-400' : 'text-[#1A1A1A]'
                      }`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-gray-400 hover:text-blue-500 p-0.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="text-gray-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-dashed border-gray-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {linkedGoal && (
                          <span className="text-[10px] font-bold bg-[#E6D4F9] px-2 py-0.5 rounded-full border border-black flex items-center gap-1">
                            <span>{linkedGoal.categoryIcon}</span>
                            <span className="max-w-[90px] truncate">{linkedGoal.title}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.durationMinutes}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ✏️ Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white doodle-border doodle-shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-extrabold text-lg font-['Bricolage_Grotesque']">
                {t.editTask || 'Edit Task'}
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block mb-1 text-gray-700">{t.taskTitle}</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 doodle-border-sm bg-white focus:outline-none focus:bg-amber-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => handleEditStartTimeChange(e.target.value)}
                    className="w-full px-2 py-2 doodle-border-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => handleEditEndTimeChange(e.target.value)}
                    className="w-full px-2 py-2 doodle-border-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-gray-700">Duration</label>
                  <div className="flex gap-1 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={editDurationHours}
                        onChange={(e) => handleEditDurationHoursChange(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-2 doodle-border-sm bg-white text-center font-bold"
                      />
                      <span className="text-[10px] text-gray-500 block text-center mt-0.5">hrs</span>
                    </div>
                    <span className="font-bold">:</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={editDurationMins}
                        onChange={(e) => handleEditDurationMinsChange(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-2 doodle-border-sm bg-white text-center font-bold"
                      />
                      <span className="text-[10px] text-gray-500 block text-center mt-0.5">mins</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-gray-700">Quadrant</label>
                  <select
                    value={editQuadrant}
                    onChange={(e) => setEditQuadrant(e.target.value as EisenhowerQuadrant)}
                    className="w-full px-2 py-2 doodle-border-sm bg-white"
                  >
                    <option value="now">Do Now (Urgent & Important)</option>
                    <option value="plan">Schedule (Important)</option>
                    <option value="quick">Delegate / Quick</option>
                    <option value="chill">Don't Do / Chill</option>
                  </select>
                </div>
              </div>

              {goals.length > 0 && (
                <div>
                  <label className="block mb-1 text-gray-700">Link to Goal (Optional)</label>
                  <select
                    value={editGoalId}
                    onChange={(e) => setEditGoalId(e.target.value)}
                    className="w-full px-2 py-2 doodle-border-sm bg-white"
                  >
                    <option value="">None</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-2.5 bg-gray-100 doodle-border-sm font-bold doodle-btn"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-accent doodle-border-sm font-black doodle-btn"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
