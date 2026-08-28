import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, Task, Goal, Routine, JournalEntry, ActiveTab } from '../types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  loginAsGuest, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser 
} from '../lib/firebase';
import { onAuthStateChanged, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getLocalTodayStr } from '../utils/date';

interface RescheduleProposal {
  taskId: string;
  newTime: string;
}

interface AppContextType {
  user: UserProfile;
  authUser: FirebaseUser | null;
  tasks: Task[];
  goals: Goal[];
  routines: Routine[];
  journals: JournalEntry[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOnline: boolean;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  login: () => Promise<void>;
  loginAsGuestUser: () => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  registerEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<UserProfile>) => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  rescheduleBatch: (proposals: RescheduleProposal[]) => Promise<void>;
  addGoal: (goal: Partial<Goal>) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  toggleGoalComplete: (goalId: string) => Promise<void>;
  togglePinGoal: (goalId: string) => Promise<void>;
  addJournal: (entry: Partial<JournalEntry>) => Promise<void>;
  deleteJournal: (journalId: string) => Promise<void>;
}

const DEFAULT_USER: UserProfile = {
  name: 'Doodler',
  avatarUrl: 'https://cdn.pfps.gg/pfps/5129-default-blue.png',
  language: 'th',
  energyType: 'morning_owl',
  peakHours: '08:00 - 12:00',
  darkMode: false
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getRedirectResult(auth).catch((error) => {
      console.error('Redirect Login Error:', error);
    });

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setAuthUser(fbUser);
      if (fbUser) {
        setIsSyncing(true);

        const userDocRef = doc(db, 'users', fbUser.uid);
        const unsubProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setUser(snap.data() as UserProfile);
          } else {
            const initialProfile = { 
              ...DEFAULT_USER, 
              name: fbUser.isAnonymous ? 'Guest User' : (fbUser.displayName || fbUser.email?.split('@')[0] || 'User') 
            };
            setDoc(userDocRef, initialProfile);
          }
        });

        const unsubTasks = onSnapshot(collection(db, 'users', fbUser.uid, 'tasks'), (snap) => {
          const items: Task[] = [];
          snap.forEach((d) => items.push(d.data() as Task));
          setTasks(items);
        });

        const unsubGoals = onSnapshot(collection(db, 'users', fbUser.uid, 'goals'), (snap) => {
          const items: Goal[] = [];
          snap.forEach((d) => items.push(d.data() as Goal));
          setGoals(items);
        });

        const unsubJournals = onSnapshot(collection(db, 'users', fbUser.uid, 'journals'), (snap) => {
          const items: JournalEntry[] = [];
          snap.forEach((d) => items.push(d.data() as JournalEntry));
          setJournals(items);
          setIsSyncing(false);
        });

        return () => {
          unsubProfile();
          unsubTasks();
          unsubGoals();
          unsubJournals();
        };
      } else {
        setTasks([]);
        setGoals([]);
        setJournals([]);
        setIsSyncing(false);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubAuth();
    };
  }, []);

  // Auth Handlers
  const login = async () => { await loginWithGoogle(); };
  const loginAsGuestUser = async () => { await loginAsGuest(); };
  const loginEmail = async (email: string, pass: string) => { await loginWithEmail(email, pass); };
  const registerEmail = async (email: string, pass: string) => { await registerWithEmail(email, pass); };
  const logout = async () => { await logoutUser(); };

  const syncNow = async () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  const updateUser = async (updated: Partial<UserProfile>) => {
    const newUser = { ...user, ...updated };
    setUser(newUser);
    if (authUser) {
      await setDoc(doc(db, 'users', authUser.uid), newUser, { merge: true });
    }
  };

  const addTask = async (taskData: Partial<Task>) => {
    if (!authUser) return;
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTask: Task = {
      id: taskId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      category: taskData.category || 'STUDY',
      categoryColor: taskData.categoryColor || (taskData.category === 'MEETING' ? '#ff9f9f' : taskData.category === 'DATABASE' ? '#b0beff' : '#ffe66d'),
      durationMinutes: taskData.durationMinutes || 30,
      dueDate: taskData.dueDate || getLocalTodayStr(),
      dueTime: taskData.dueTime || '10:00',
      eisenhowerQuadrant: taskData.eisenhowerQuadrant || 'now',
      goalId: taskData.goalId || null,
      completed: false,
      isAiRescheduled: taskData.isAiRescheduled || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', authUser.uid, 'tasks', taskId), newTask);
  };

  const updateTask = async (task: Task) => {
    if (!authUser) return;
    await setDoc(doc(db, 'users', authUser.uid, 'tasks', task.id), {
      ...task,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const toggleTask = async (taskId: string) => {
    if (!authUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;
    const updatedTask = { ...task, completed: newCompleted, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'users', authUser.uid, 'tasks', taskId), updatedTask, { merge: true });

    if (task.goalId) {
      const allLinkedTasks = tasks.map(t => t.id === taskId ? updatedTask : t).filter(t => t.goalId === task.goalId);
      const doneLinked = allLinkedTasks.filter(t => t.completed).length;
      const progress = Math.round((doneLinked / allLinkedTasks.length) * 100);
      const targetGoal = goals.find(g => g.id === task.goalId);
      if (targetGoal) {
        await setDoc(doc(db, 'users', authUser.uid, 'goals', task.goalId), {
          ...targetGoal,
          progressPercent: progress,
          currentCount: doneLinked
        }, { merge: true });
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!authUser) return;
    await deleteDoc(doc(db, 'users', authUser.uid, 'tasks', taskId));
  };

  const rescheduleBatch = async (proposals: RescheduleProposal[]) => {
    if (!authUser) return;
    const today = getLocalTodayStr();
    for (const p of proposals) {
      const t = tasks.find(item => item.id === p.taskId);
      if (t) {
        await setDoc(doc(db, 'users', authUser.uid, 'tasks', p.taskId), {
          ...t,
          dueDate: today,
          dueTime: p.newTime,
          isAiRescheduled: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }
  };

  const addGoal = async (goalData: Partial<Goal>) => {
    if (!authUser) return;
    const goalId = `goal_${Date.now()}`;
    const newGoal: Goal = {
      id: goalId,
      title: goalData.title || 'New Goal',
      goalType: goalData.goalType || 'short_term',
      timeframe: goalData.timeframe || 'weekly',
      category: goalData.category || 'study',
      categoryIcon: goalData.categoryIcon || '🎯',
      progressPercent: goalData.progressPercent || 0,
      targetCount: goalData.targetCount || 5,
      currentCount: 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', authUser.uid, 'goals', goalId), newGoal);
  };

  const updateGoal = async (goal: Goal) => {
    if (!authUser) return;
    await setDoc(doc(db, 'users', authUser.uid, 'goals', goal.id), goal, { merge: true });
  };

  const deleteGoal = async (goalId: string) => {
    if (!authUser) return;
    await deleteDoc(doc(db, 'users', authUser.uid, 'goals', goalId));
  };

  const toggleGoalComplete = async (goalId: string) => {
    if (!authUser) return;
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) return;
    const nowCompleted = !targetGoal.completed;
    await setDoc(
      doc(db, 'users', authUser.uid, 'goals', goalId),
      {
        completed: nowCompleted,
        completedAt: nowCompleted ? new Date().toISOString() : null,
        // เป้าหมายที่สำเร็จแล้วไม่ต้องโชว์บนหน้า Tasks อีก
        ...(nowCompleted ? { isPinned: false } : {})
      },
      { merge: true }
    );
  };

  // เลือกเป้าหมายที่จะโชว์บนหน้า Tasks (มีได้ทีละ 1 เป้าหมายเท่านั้น)
  const togglePinGoal = async (goalId: string) => {
    if (!authUser) return;
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) return;
    const nowPinned = !targetGoal.isPinned;

    const batch = writeBatch(db);
    goals.forEach((g) => {
      const shouldBePinned = g.id === goalId ? nowPinned : false;
      if (!!g.isPinned !== shouldBePinned) {
        batch.set(
          doc(db, 'users', authUser.uid, 'goals', g.id),
          { isPinned: shouldBePinned },
          { merge: true }
        );
      }
    });
    await batch.commit();
  };

  const addJournal = async (entryData: Partial<JournalEntry>) => {
    if (!authUser) return;
    const journalId = `journal_${Date.now()}`;
    const newEntry: JournalEntry = {
      id: journalId,
      mood: entryData.mood || 'feeling_good',
      content: entryData.content || '',
      aiHealingMessage: entryData.aiHealingMessage || null,
      date: entryData.date || getLocalTodayStr(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', authUser.uid, 'journals', journalId), newEntry);
  };

  const deleteJournal = async (journalId: string) => {
    if (!authUser) return;
    await deleteDoc(doc(db, 'users', authUser.uid, 'journals', journalId));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authUser,
        tasks,
        goals,
        routines,
        journals,
        activeTab,
        setActiveTab,
        isOnline,
        isSyncing,
        syncNow,
        login,
        loginAsGuestUser,
        loginEmail,
        registerEmail,
        logout,
        updateUser,
        addTask,
        updateTask,
        toggleTask,
        deleteTask,
        rescheduleBatch,
        addGoal,
        updateGoal,
        deleteGoal,
        toggleGoalComplete,
        togglePinGoal,
        addJournal,
        deleteJournal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};