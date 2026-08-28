// src/hooks/useFirebaseData.ts
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { UserProfile, Task, Goal } from '../types';

export function useFirebaseData() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. ตรวจสอบสถานะการ Login
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setProfile(null);
        setTasks([]);
        setGoals([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // 2. Real-time Sync Profile
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    });

    // 3. Real-time Sync Tasks
    const tasksRef = collection(db, 'users', currentUser.uid, 'tasks');
    const unsubTasks = onSnapshot(tasksRef, (snapshot) => {
      const loadedTasks: Task[] = [];
      snapshot.forEach(doc => loadedTasks.push(doc.data() as Task));
      setTasks(loadedTasks);
    });

    // 4. Real-time Sync Goals
    const goalsRef = collection(db, 'users', currentUser.uid, 'goals');
    const unsubGoals = onSnapshot(goalsRef, (snapshot) => {
      const loadedGoals: Goal[] = [];
      snapshot.forEach(doc => loadedGoals.push(doc.data() as Goal));
      setGoals(loadedGoals);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubTasks();
      unsubGoals();
    };
  }, [currentUser]);

  return { currentUser, profile, tasks, goals, loading };
}