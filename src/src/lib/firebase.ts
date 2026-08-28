import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc
} from 'firebase/firestore';
import { UserProfile, Task, Goal } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// --- Auth Helpers ---
export const loginWithGoogle = () => signInWithRedirect(auth, googleProvider);
export const loginAsGuest = () => signInAnonymously(auth);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const logoutUser = () => signOut(auth);

// --- Real-time Data Sync Helpers ---
export async function saveUserProfileToCloud(userId: string, profile: UserProfile) {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, profile, { merge: true });
}

export async function saveTaskToCloud(userId: string, task: Task) {
  const taskRef = doc(db, 'users', userId, 'tasks', task.id);
  await setDoc(taskRef, task, { merge: true });
}

export async function saveGoalToCloud(userId: string, goal: Goal) {
  const goalRef = doc(db, 'users', userId, 'goals', goal.id);
  await setDoc(goalRef, goal, { merge: true });
}