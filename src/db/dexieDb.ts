import Dexie, { type Table } from 'dexie';
import { UserProfile, Task, Goal, Routine, JournalEntry } from '../types';
import { toLocalDateStr } from '../utils/date';
import defaultAvatarImg from '../assets/default-avatar.jpg';

export class PlandaDatabase extends Dexie {
  users!: Table<UserProfile, string>;
  tasks!: Table<Task, string>;
  goals!: Table<Goal, string>;
  routines!: Table<Routine, string>;
  journal_entries!: Table<JournalEntry, string>;

  constructor() {
    super('PlandaDatabase');
    this.version(1).stores({
      users: 'id, email',
      tasks: 'id, dueDate, completed, goalId, eisenhowerQuadrant',
      goals: 'id, timeframe, category, goalType',
      routines: 'id, scheduleType, category, active',
      journal_entries: 'id, date, mood'
    });
  }
}

export const db = new PlandaDatabase();

// Initial Default User Profile
export const DEFAULT_USER: UserProfile = {
  id: 'user_default',
  name: 'Sarah Jenkins',
  email: 'sarah.j@student.edu',
  avatarUrl: defaultAvatarImg,
  energyType: 'morning_owl',
  peakHours: '08:00 - 12:00',
  themeAccent: 'blue',
  darkMode: false,
  language: 'en',
  dailyFreeHoursTarget: 3.5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Initial Seed Data
export async function seedInitialDataIfNeeded() {
  const userCount = await db.users.count();
  if (userCount > 0) return;

  const todayStr = toLocalDateStr(new Date());
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));

  // 1. Seed User
  await db.users.add(DEFAULT_USER);

  // 2. Seed Goals
  const initialGoals: Goal[] = [
    {
      id: 'goal_1',
      title: 'Read 10 pages of book daily',
      description: 'Finish Design Systems Handbook',
      goalType: 'short_term',
      timeframe: 'daily',
      category: 'study',
      categoryIcon: '📚',
      targetDate: '2026-09-30',
      progressPercent: 70,
      currentCount: 7,
      targetCount: 10,
      unit: 'pages',
      linkedTaskCount: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal_2',
      title: 'Complete Neo-Brutalism UI Architecture',
      description: 'Ship all 8 screens and PWA offline storage',
      goalType: 'short_term',
      timeframe: 'weekly',
      category: 'work',
      categoryIcon: '💼',
      targetDate: '2026-09-15',
      progressPercent: 85,
      currentCount: 5,
      targetCount: 6,
      unit: 'tasks',
      linkedTaskCount: 4,
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal_3',
      title: '5km Morning Run 3x per week',
      description: 'Cardio endurance and mental focus',
      goalType: 'long_term',
      timeframe: 'weekly',
      category: 'fitness',
      categoryIcon: '🏃',
      targetDate: '2026-12-31',
      progressPercent: 45,
      currentCount: 2,
      targetCount: 3,
      unit: 'runs',
      linkedTaskCount: 2,
      createdAt: new Date().toISOString()
    }
  ];
  await db.goals.bulkAdd(initialGoals);

  // 3. Seed Tasks
  const initialTasks: Task[] = [
    {
      id: 'task_1',
      title: 'Design Schema',
      description: 'Draft Dexie IndexedDB tables and foreign keys',
      category: 'DATABASE',
      categoryColor: '#b0beff',
      eisenhowerQuadrant: 'now',
      dueDate: todayStr,
      dueTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      completed: false,
      isAiRescheduled: true,
      originalTime: '08:00',
      rescheduleReason: 'Moved to peak morning owl focus slot',
      goalId: 'goal_2',
      tags: ['DATABASE', 'ARCHITECTURE'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_2',
      title: 'Team Standup',
      description: 'Review weekly progress and sprint blocker',
      category: 'MEETING',
      categoryColor: '#f8def8',
      eisenhowerQuadrant: 'now',
      dueDate: todayStr,
      dueTime: '10:00',
      endTime: '10:45',
      durationMinutes: 45,
      completed: true,
      completedAt: new Date().toISOString(),
      tags: ['MEETING', 'TEAM'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_3',
      title: 'Read 5 pages of UX research',
      description: 'Cognitive load in micro-interactions',
      category: 'STUDY',
      categoryColor: '#FFE66D',
      eisenhowerQuadrant: 'plan',
      dueDate: todayStr,
      dueTime: '14:00',
      endTime: '14:30',
      durationMinutes: 30,
      completed: false,
      goalId: 'goal_1',
      tags: ['READING', 'HABIT'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_4',
      title: '20-min Lo-Fi & Stretches',
      description: 'Decompress neck and shoulders with chill beats',
      category: 'UNWIND',
      categoryColor: '#9DD9D2',
      eisenhowerQuadrant: 'chill',
      dueDate: todayStr,
      dueTime: '17:00',
      endTime: '17:20',
      durationMinutes: 20,
      completed: false,
      tags: ['RELAX', 'WELLNESS'],
      createdAt: new Date().toISOString()
    },
    // Missed tasks to show in the Missed Tasks accordion
    {
      id: 'task_missed_1',
      title: 'Calculus Problem Set #4',
      description: 'Integrals and vector space problems',
      category: 'STUDY',
      categoryColor: '#FFE66D',
      eisenhowerQuadrant: 'now',
      dueDate: yesterday,
      dueTime: '15:00',
      endTime: '16:00',
      durationMinutes: 60,
      completed: false,
      goalId: 'goal_1',
      tags: ['MATH', 'ASSIGNMENT'],
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'task_missed_2',
      title: 'Review Local Sync Script',
      description: 'Offline queue reconciliation test',
      category: 'WORK',
      categoryColor: '#FF9F9F',
      eisenhowerQuadrant: 'plan',
      dueDate: todayStr,
      dueTime: '08:00',
      endTime: '08:30',
      durationMinutes: 30,
      completed: false,
      goalId: 'goal_2',
      tags: ['DEV', 'SYNC'],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];
  await db.tasks.bulkAdd(initialTasks);

  // 4. Seed Routines
  const initialRoutines: Routine[] = [
    {
      id: 'routine_1',
      title: 'Morning Sunlight & Espresso',
      scheduleType: 'fixed',
      startTime: '07:00',
      endTime: '07:30',
      durationMinutes: 30,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      durationMode: 'indefinite',
      category: 'health',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'routine_2',
      title: 'Peak Focus Coding Block',
      scheduleType: 'fixed',
      startTime: '09:00',
      endTime: '11:30',
      durationMinutes: 150,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      durationMode: 'indefinite',
      category: 'work',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'routine_3',
      title: 'Evening Journal & Decompress',
      scheduleType: 'flex',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      durationMode: 'indefinite',
      category: 'personal',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];
  await db.routines.bulkAdd(initialRoutines);

  // 5. Seed Journal Entries
  const initialJournals: JournalEntry[] = [
    {
      id: 'journal_1',
      mood: 'feeling_good',
      content: 'Finished the design project! Treated myself to a hotpot dinner. The spicy broth was everything I needed after a busy week.',
      aiHealingMessage: 'Celebrate the small wins! You put in serious craft and earned every moment of that hotpot feast.',
      date: yesterday,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      tags: ['CELEBRATION', 'HOTPOT']
    },
    {
      id: 'journal_2',
      mood: 'tired',
      content: 'Heavy workload today, but AI auto-scheduled a rest slot for me. I spent 30 minutes in the garden listening to birds.',
      aiHealingMessage: 'Rest is not a reward for productivity—it is an essential requirement for your creative spark.',
      date: '2026-08-25',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      tags: ['REST', 'NATURE']
    }
  ];
  await db.journal_entries.bulkAdd(initialJournals);
}
