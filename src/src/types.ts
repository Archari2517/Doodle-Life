export type EnergyType = 'morning_owl' | 'afternoon_lion' | 'night_owl';
export type ThemeAccent = 'yellow' | 'coral' | 'sky' | 'mint';
export type Language = 'en' | 'th';
export type EisenhowerQuadrant = 'now' | 'plan' | 'quick' | 'chill';
export type GoalType = 'short_term' | 'long_term';
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type GoalCategory = 'study' | 'work' | 'fitness' | 'finance' | 'personal';
export type MoodType = 'high_energy' | 'feeling_good' | 'tired' | 'overwhelmed';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  energyType: EnergyType;
  peakHours: string; // e.g. "08:00 - 12:00"
  themeAccent: ThemeAccent;
  darkMode: boolean;
  language: Language;
  dailyFreeHoursTarget: number; // e.g. 3.5
  supabaseUrl?: string;
  supabaseKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string; // 'DATABASE' | 'MEETING' | 'STUDY' | 'WORK' | 'FITNESS' | 'UNWIND' | etc.
  categoryColor?: string;
  eisenhowerQuadrant: EisenhowerQuadrant;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // "09:00"
  endTime?: string; // "09:30"
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
  goalId?: string; // Connected goal
  isAiRescheduled?: boolean;
  originalTime?: string; // "10:00" if rescheduled
  rescheduleReason?: string;
  tags?: string[];
  syncedWithSupabase?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  goalType: GoalType;
  timeframe: Timeframe;
  category: GoalCategory;
  categoryIcon?: string; // '📚' | '💼' | '🏃' | '💰'
  targetDate?: string;
  progressPercent: number; // 0 - 100
  currentCount?: number;
  targetCount?: number;
  unit?: string;
  linkedTaskCount?: number;
  syncedWithSupabase?: boolean;
  createdAt: string;
  updatedAt?: string;
  completed?: boolean;
  isPinned?: boolean; // เป้าหมายที่เลือกให้แสดงบนหน้า Tasks
}

export interface Routine {
  id: string;
  title: string;
  type: 'morning' | 'evening' | 'focus' | 'rest';
  startTime: string; // "07:00"
  endTime: string; // "08:00"
  durationMinutes: number;
  days: string[]; // ["Mon", "Tue", "Wed", "Thu", "Fri"]
  active: boolean;
}

export interface JournalEntry {
  id: string;
  mood: MoodType;
  content: string;
  aiHealingMessage?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
  syncedWithSupabase?: boolean;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  quickAction?: {
    type: 'add_task' | 'reschedule' | 'unwind' | 'open_goal';
    payload?: any;
    label: string;
  };
}

export interface UnwindActivity {
  id: string;
  title: string;
  type: 'chill' | 'micro_goal';
  category: string;
  durationMinutes: number;
  icon: string;
  badgeColor: string;
  description: string;
}

export type ActiveTab = 'calendar' | 'tasks' | 'chat' | 'myspace' | 'settings' | 'goals_flow';
export type MySpaceSubTab = 'overview' | 'journal' | 'unwind';
