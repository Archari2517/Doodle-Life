import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, Task, Goal, Routine, JournalEntry, ActiveTab, CalendarEvent } from '../types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  loginAsGuest, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser,
  upgradeGuestWithGoogle,
  upgradeGuestWithEmail
} from '../lib/firebase';
import { onAuthStateChanged, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getLocalTodayStr } from '../utils/date';
import { generateEventsForRange, getMonthRange, findNewlyExpiredRoutines } from '../utils/routineEngine';

interface RescheduleProposal {
  taskId: string;
  newTime: string;
}

interface AppContextType {
  user: UserProfile;
  authUser: FirebaseUser | null;
  authError: string | null;
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
  upgradeGuestGoogle: () => Promise<void>;
  upgradeGuestEmail: (email: string, pass: string) => Promise<void>;
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
  addRoutine: (routine: Partial<Routine>) => Promise<void>;
  updateRoutine: (routine: Routine) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  toggleRoutineActive: (routineId: string) => Promise<void>;
  ensureMonthEvents: (monthDate: Date) => Promise<void>;
  renewRoutine: (routineId: string, newEndDate?: string) => Promise<void>;
  acknowledgeRoutineExpiry: (routineId: string) => Promise<void>;
  addJournal: (entry: Partial<JournalEntry>) => Promise<void>;
  deleteJournal: (journalId: string) => Promise<void>;
  clearAuthError: () => void;
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
  const [authError, setAuthError] = useState<string | null>(null);
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
      // ⚠️ This used to be console-only — the user would finish the Google
      // consent screen, get redirected back, and see... nothing, with zero
      // explanation. Most commonly this is auth/unauthorized-domain (the
      // current domain isn't in Firebase Console → Authentication →
      // Settings → Authorized domains) or an in-app browser / blocked
      // third-party storage that breaks the redirect handshake.
      const code = error?.code || '';
      let message = 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      if (code === 'auth/unauthorized-domain') {
        message = 'โดเมนนี้ยังไม่ได้รับอนุญาตให้ใช้ Google Sign-In (ต้องเพิ่มใน Firebase Console > Authentication > Settings > Authorized domains)';
      } else if (code === 'auth/account-exists-with-different-credential') {
        message = 'อีเมลนี้เคยลงทะเบียนด้วยวิธีอื่นไว้แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม';
      } else if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        message = 'บัญชีนี้ถูกใช้งานแล้วในระบบ';
      } else if (code === 'auth/network-request-failed') {
        message = 'เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
      } else if (code === 'auth/web-storage-unsupported' || code === 'auth/operation-not-supported-in-this-environment') {
        message = 'เบราว์เซอร์นี้ (เช่น เปิดผ่านแอปแชท/โซเชียล) ไม่รองรับ Google Sign-In กรุณาเปิดด้วย Chrome/Safari โดยตรง';
      } else if (code) {
        message = `เข้าสู่ระบบไม่สำเร็จ: ${code}`;
      }
      setAuthError(message);
    });

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setAuthUser(fbUser);
      if (fbUser) {
        setAuthError(null);
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

        const unsubRoutines = onSnapshot(collection(db, 'users', fbUser.uid, 'routines'), (snap) => {
          const items: Routine[] = [];
          snap.forEach((d) => items.push(d.data() as Routine));
          setRoutines(items);

          // 🕒 Lifecycle Check (Cron Job แบบเบา ๆ) — รันทุกครั้งที่เปิดแอป/ข้อมูล routines อัปเดต
          // หา Routine ที่เลย endDate ไปแล้วแต่ยังไม่ถูกตั้งเป็น 'expired' แล้วย้ายเข้าหมวด Archive
          const todayStr = getLocalTodayStr();
          const newlyExpired = findNewlyExpiredRoutines(items, todayStr);
          if (newlyExpired.length > 0) {
            const expiryBatch = writeBatch(db);
            newlyExpired.forEach((r) => {
              expiryBatch.set(
                doc(db, 'users', fbUser.uid, 'routines', r.id),
                {
                  status: 'expired',
                  active: false,
                  expiredAcknowledged: false,
                  updatedAt: new Date().toISOString()
                },
                { merge: true }
              );
            });
            expiryBatch.commit().catch((err) => console.error('Failed to expire routines:', err));
          }
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
          unsubRoutines();
          unsubJournals();
        };
      } else {
        setTasks([]);
        setGoals([]);
        setRoutines([]);
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
  const upgradeGuestGoogle = async () => { await upgradeGuestWithGoogle(); };
  const upgradeGuestEmail = async (email: string, pass: string) => { await upgradeGuestWithEmail(email, pass); };
  const clearAuthError = () => setAuthError(null);

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
      // ⚠️ ใช้ ?? แทน || เพราะ '' (ไม่ระบุเวลา / Flex Task) เป็นค่าที่ถูกต้อง ไม่ควรถูกแทนที่ด้วยค่า default
      // (|| จะมองว่า '' เป็น falsy แล้วเซ็ตเป็น '10:00' ทั้งที่ผู้ใช้ตั้งใจไม่ระบุเวลา)
      dueTime: taskData.dueTime ?? '10:00',
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

  // ----------------------------------------------------
  // Routine CRUD (กิจวัตรประจำวัน / กฎการทำซ้ำ)
  // ----------------------------------------------------

  // ----------------------------------------------------
  // 🔁 Routine Generation Engine
  // ----------------------------------------------------
  // นำ CalendarEvent ที่คำนวณได้ ไป Append (เพิ่มต่อท้าย) ลงตาราง Event (tasks) เดิม
  // โดยข้าม Event ที่มี id ซ้ำกับที่มีอยู่แล้ว (id เป็น deterministic ต่อ routineId+วันที่
  // อยู่แล้ว) เพื่อไม่ให้ Event ซ้ำ และไม่ไปทับสถานะ completed ของ Event เดิมที่ผู้ใช้ทำไปแล้ว
  const appendGeneratedEvents = async (events: CalendarEvent[]) => {
    if (!authUser || events.length === 0) return;
    const existingIds = new Set(tasks.map((t) => t.id));
    const eventsToAdd = events.filter((ev) => !existingIds.has(ev.id));
    if (eventsToAdd.length === 0) return;

    const batch = writeBatch(db);
    eventsToAdd.forEach((ev) => {
      batch.set(doc(db, 'users', authUser.uid, 'tasks', ev.id), ev);
    });
    await batch.commit();
  };

  // ----------------------------------------------------
  // 🔁 Routine Generation Engine — ลบ Event ที่ผูกกับ Routine ออกจากตาราง
  // ----------------------------------------------------
  // ใช้ 2 กรณี:
  //  1) ลบ Routine ทิ้งทั้งตัว (deleteRoutine) ➔ ไม่ระบุ fromDateStr ➔ ลบ Event ทุกวัน
  //     ที่มาจาก Routine นี้ ทั้งอดีตและอนาคต เพราะถือว่า Event ทั้งหมดถูกยกเลิกไปด้วย
  //  2) ปิดใช้งาน Routine ชั่วคราว (toggleRoutineActive ➔ inactive) ➔ ระบุ fromDateStr = วันนี้
  //     ➔ ลบเฉพาะ Event ตั้งแต่วันนี้เป็นต้นไป ส่วน Event ในอดีตที่เคยทำไปแล้วยังคงไว้เป็นประวัติ
  //
  // หมายเหตุ: state `tasks` มาจาก onSnapshot ของ Firestore โดยตรง ดังนั้นแค่ setState/filter
  // ฝั่ง local ไม่พอ (ข้อมูลจะโผล่กลับมาใหม่จาก snapshot) ต้องลบ document จริงใน Firestore
  const deleteRoutineEvents = async (routineId: string, fromDateStr?: string) => {
    if (!authUser) return;
    const eventsToDelete = tasks.filter(
      (t) => t.routineId === routineId && (!fromDateStr || t.dueDate >= fromDateStr)
    );
    if (eventsToDelete.length === 0) return;

    const batch = writeBatch(db);
    eventsToDelete.forEach((ev) => {
      batch.delete(doc(db, 'users', authUser.uid, 'tasks', ev.id));
    });
    await batch.commit();
  };

  // เมื่อเปลี่ยนเดือน (หรือมี Routine ใหม่/เปลี่ยนแปลงในเดือนที่กำลังดูอยู่):
  // ดึง Routine ที่ active ทั้งหมดมาคำนวณ Event ของทั้งเดือนนั้น แล้ว Append เข้าตาราง
  const ensureMonthEvents = async (monthDate: Date) => {
    if (!authUser) return;
    const { start, end } = getMonthRange(monthDate);
    const activeRoutines = routines.filter((r) => r.active);
    const monthEvents = generateEventsForRange(activeRoutines, start, end);
    await appendGeneratedEvents(monthEvents);
  };

  const addRoutine = async (routineData: Partial<Routine>) => {
    if (!authUser) return;
    const routineId = `routine_${Date.now()}`;
    const scheduleType = routineData.scheduleType || 'fixed';
    const newRoutine: Routine = {
      id: routineId,
      title: routineData.title || 'New Routine',
      scheduleType,
      startTime: scheduleType === 'fixed' ? (routineData.startTime || '09:00') : undefined,
      endTime: scheduleType === 'fixed' ? (routineData.endTime || '10:00') : undefined,
      durationMinutes: routineData.durationMinutes,
      days: routineData.days && routineData.days.length > 0 ? routineData.days : ['Mon'],
      durationMode: routineData.durationMode || 'indefinite',
      startDate: routineData.durationMode === 'date_range' ? routineData.startDate : undefined,
      endDate: routineData.durationMode === 'date_range' ? routineData.endDate : undefined,
      category: routineData.category || 'personal',
      active: routineData.active ?? true,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', authUser.uid, 'routines', routineId), newRoutine);

    // 🆕 On Create Routine: สร้าง Event ทันทีตั้งแต่วันนี้ (Today) ➔ วันสุดท้ายของเดือนปัจจุบัน
    // แล้ว Append ต่อท้ายตาราง Event เดิมที่มีอยู่ทันที
    const todayStr = getLocalTodayStr();
    const { end: monthEndStr } = getMonthRange(new Date());
    const newEvents = generateEventsForRange([newRoutine], todayStr, monthEndStr);
    await appendGeneratedEvents(newEvents);
  };

  const updateRoutine = async (routine: Routine) => {
    if (!authUser) return;
    await setDoc(doc(db, 'users', authUser.uid, 'routines', routine.id), {
      ...routine,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const deleteRoutine = async (routineId: string) => {
    if (!authUser) return;
    // 🗑️ Event ทั้งหมดที่สร้างจาก Routine นี้ (ทั้งอดีต+อนาคต) ถือว่าถูกยกเลิกไปด้วยเมื่อ Routine
    // ต้นทางถูกลบ ➔ ลบออกจากตาราง Event ก่อน แล้วค่อยลบตัว Routine เอง
    await deleteRoutineEvents(routineId);
    await deleteDoc(doc(db, 'users', authUser.uid, 'routines', routineId));
  };

  const toggleRoutineActive = async (routineId: string) => {
    if (!authUser) return;
    const target = routines.find(r => r.id === routineId);
    if (!target) return;
    const nextActive = !target.active;

    await setDoc(
      doc(db, 'users', authUser.uid, 'routines', routineId),
      { active: nextActive, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    const todayStr = getLocalTodayStr();
    if (!nextActive) {
      // 🔕 Disable/Pause: ลบเฉพาะ Event ตั้งแต่วันนี้เป็นต้นไป ส่วน Event ในอดีตที่เคยทำไปแล้ว
      // (รวมถึงที่ completed แล้ว) ยังคงเก็บไว้เป็นประวัติเหมือนเดิม
      await deleteRoutineEvents(routineId, todayStr);
    } else {
      // 🔔 Re-enable: คำนวณ Event ใหม่ตั้งแต่วันนี้ ➔ วันสุดท้ายของเดือนปัจจุบัน แล้ว Append กลับเข้าไป
      // (ใช้ object ของ routine ที่ active: true ตรง ๆ แทนการพึ่ง state `routines` ที่อาจยังไม่ sync
      // กลับมาจาก Firestore ทันทีหลัง setDoc ด้านบน)
      const { end: monthEndStr } = getMonthRange(new Date());
      const reactivatedRoutine: Routine = { ...target, active: true };
      const newEvents = generateEventsForRange([reactivatedRoutine], todayStr, monthEndStr);
      await appendGeneratedEvents(newEvents);
    }
  };

  // 🗂️ "ตั้งต่อ" — ผู้ใช้เลือกต่ออายุ Routine ที่หมดอายุแล้วจาก Pop-up แจ้งเตือน
  // ถ้าไม่ระบุ newEndDate จะตั้งเป็น 'indefinite' (ทำต่อไปเรื่อย ๆ ไม่มีวันสิ้นสุด)
  // ถ้าระบุ newEndDate จะคงเป็น 'date_range' แต่ขยับ endDate ออกไปแทน
  const renewRoutine = async (routineId: string, newEndDate?: string) => {
    if (!authUser) return;
    const target = routines.find(r => r.id === routineId);
    if (!target) return;

    const updates: Partial<Routine> = newEndDate
      ? { durationMode: 'date_range', startDate: target.startDate || getLocalTodayStr(), endDate: newEndDate }
      : { durationMode: 'indefinite', startDate: undefined, endDate: undefined };

    await setDoc(
      doc(db, 'users', authUser.uid, 'routines', routineId),
      {
        ...updates,
        active: true,
        status: 'active',
        expiredAcknowledged: false,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  };

  // 🗂️ ผู้ใช้กด "รับทราบ" การแจ้งเตือนหมดอายุ (ไม่ลบ ไม่ต่ออายุ แค่ปิด Pop-up)
  // Routine จะยังอยู่ในหมวด Archive ต่อไป แต่จะไม่เด้ง Pop-up ซ้ำอีก
  const acknowledgeRoutineExpiry = async (routineId: string) => {
    if (!authUser) return;
    await setDoc(
      doc(db, 'users', authUser.uid, 'routines', routineId),
      { expiredAcknowledged: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  };

  const addJournal = async (entryData: Partial<JournalEntry>) => {
    if (!authUser) return;
    const journalId = `journal_${Date.now()}`;
    const newEntry: JournalEntry = {
      id: journalId,
      mood: entryData.mood || 'none',
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
        authError,
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
        upgradeGuestGoogle,
        upgradeGuestEmail,
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
        addRoutine,
        updateRoutine,
        deleteRoutine,
        toggleRoutineActive,
        ensureMonthEvents,
        renewRoutine,
        acknowledgeRoutineExpiry,
        addJournal,
        deleteJournal,
        clearAuthError
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