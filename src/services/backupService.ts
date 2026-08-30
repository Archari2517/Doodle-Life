import { auth, db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { UserProfile, Task, Goal, Routine, JournalEntry } from '../types';

/**
 * Firebase Backup Service
 * -----------------------
 * Exports/imports the signed-in user's data straight from Cloud Firestore
 * using the same `auth`/`db` instances exported by src/lib/firebase.ts —
 * the same instances AppContext.tsx uses for real-time sync.
 *
 * Previously this service read/wrote a local Dexie (IndexedDB) database
 * that nothing else in the app ever populated, so Export always produced
 * an empty file and Import never affected the data you actually see in
 * the app. It now reads/writes users/{uid}/{tasks,goals,routines,journals}
 * in Firestore directly, so backups reflect real cloud data.
 */
type SubCollection = 'tasks' | 'goals' | 'routines' | 'journals';
const SUBCOLLECTIONS: SubCollection[] = ['tasks', 'goals', 'routines', 'journals'];

class FirebaseBackupService {
  public async exportDatabaseToJson(): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('No signed-in user — cannot export backup.');
    }

    const userDocSnap = await getDoc(doc(db, 'users', uid));
    const profile = userDocSnap.exists() ? (userDocSnap.data() as UserProfile) : null;

    const [tasksSnap, goalsSnap, routinesSnap, journalsSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'tasks')),
      getDocs(collection(db, 'users', uid, 'goals')),
      getDocs(collection(db, 'users', uid, 'routines')),
      getDocs(collection(db, 'users', uid, 'journals'))
    ]);

    const tasks: Task[] = tasksSnap.docs.map((d) => d.data() as Task);
    const goals: Goal[] = goalsSnap.docs.map((d) => d.data() as Goal);
    const routines: Routine[] = routinesSnap.docs.map((d) => d.data() as Routine);
    const journals: JournalEntry[] = journalsSnap.docs.map((d) => d.data() as JournalEntry);

    return JSON.stringify(
      {
        version: 2,
        source: 'firebase',
        exportedAt: new Date().toISOString(),
        uid,
        profile,
        tasks,
        goals,
        routines,
        journals
      },
      null,
      2
    );
  }

  public async importDatabaseFromJson(jsonString: string): Promise<boolean> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.error('Import failed: no signed-in user.');
      return false;
    }

    try {
      const data = JSON.parse(jsonString);

      const writeCollection = async (name: SubCollection, items: any[] | undefined) => {
        if (!items?.length) return;
        // Firestore batched writes are capped at 500 ops — chunk to stay safe.
        for (let i = 0; i < items.length; i += 400) {
          const chunk = items.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            if (!item?.id) return;
            batch.set(doc(db, 'users', uid, name, item.id), item, { merge: true });
          });
          await batch.commit();
        }
      };

      if (data.profile) {
        await setDoc(doc(db, 'users', uid), data.profile, { merge: true });
      }

      for (const name of SUBCOLLECTIONS) {
        await writeCollection(name, data[name]);
      }

      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const backupService = new FirebaseBackupService();
