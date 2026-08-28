import React, { useState } from 'react';
import { Task, UserProfile, Goal, EisenhowerQuadrant } from '../../types';
import { useTranslation } from '../../utils/translations';
import { Check, Trash2, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TasksViewProps {
  user: UserProfile;
  tasks: Task[];
  goals: Goal[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigateToGoals: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  user,
  tasks,
  goals,
  onToggleTask,
  onDeleteTask,
  onNavigateToGoals
}) => {
  const t = useTranslation(user.language);
  const [activeQuadrant, setActiveQuadrant] = useState<EisenhowerQuadrant>('now');

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

  const filteredTasks = tasks.filter((t) => t.eisenhowerQuadrant === activeQuadrant);

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
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4 font-sans text-black bg-white min-h-screen">
      {/* Target / Goals Banner */}
      <div className="bg-[#FFE54C] border-2 border-black rounded-2xl p-4 shadow-[3px_4px_0px_0px_rgba(0,0,0,1)] relative flex justify-between items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-black">
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
          className="bg-white border-2 border-black px-3.5 py-1.5 rounded-full text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
        >
          <span className="text-sm">🎯</span> Goals
        </button>
      </div>

      {/* 4 Eisenhower Quadrants */}
      <div className="grid grid-cols-2 gap-3">
        {quadrants.map((q) => {
          const count = tasks.filter(t => t.eisenhowerQuadrant === q.id && !t.completed).length;
          const isSelected = activeQuadrant === q.id;
          return (
            <button
              key={q.id}
              onClick={() => setActiveQuadrant(q.id)}
              className={`border-2 border-black rounded-2xl p-3 shadow-[3px_4px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between h-32 text-left transition-all ${
                isSelected ? 'bg-[#FFE54C]' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-lg">{q.icon}</span>
                <span className="border border-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold bg-white">
                  {count}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-xs leading-tight text-black">
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

      {/* Task List Header */}
      <div className="pt-2">
        <h3 className="font-bold text-sm text-[#1E293B]">
          {filteredTasks.length} tasks
        </h3>
      </div>

      {/* Empty State / Task Items */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border-2 border-black rounded-2xl p-8 text-center shadow-[3px_4px_0px_0px_rgba(0,0,0,1)] min-h-[170px] flex flex-col items-center justify-center space-y-3">
            <span className="text-3xl text-amber-400">✦</span>
            <p className="font-bold text-[#1E293B] text-sm leading-relaxed px-4">
              No tasks in this quadrant! Enjoy the clarity.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const linkedGoal = goals.find(g => g.id === task.goalId);
            return (
              <div
                key={task.id}
                className={`bg-white border-2 border-black rounded-2xl p-3.5 shadow-[3px_4px_0px_0px_rgba(0,0,0,1)] relative transition-all ${
                  task.completed ? 'opacity-60 bg-gray-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleCheck(task.id, task.completed)}
                    className={`w-5 h-5 rounded-md border-2 border-black shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      task.completed ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-sm font-bold leading-snug line-clamp-2 ${
                        task.completed ? 'line-through text-gray-400' : 'text-black'
                      }`}>
                        {task.title}
                      </h4>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-gray-400 hover:text-red-500 p-0.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
    </div>
  );
};