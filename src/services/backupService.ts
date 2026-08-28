import { db } from '../db/dexieDb';

/**
 * Local Backup Service
 * Offline-first Dexie (IndexedDB) export/import.
 * No external/cloud connection — all data stays on-device.
 */
class LocalBackupService {
  public async exportDatabaseToJson(): Promise<string> {
    const users = await db.users.toArray();
    const tasks = await db.tasks.toArray();
    const goals = await db.goals.toArray();
    const routines = await db.routines.toArray();
    const journals = await db.journal_entries.toArray();

    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      users,
      tasks,
      goals,
      routines,
      journals
    }, null, 2);
  }

  public async importDatabaseFromJson(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (data.users?.length) await db.users.bulkPut(data.users);
      if (data.tasks?.length) await db.tasks.bulkPut(data.tasks);
      if (data.goals?.length) await db.goals.bulkPut(data.goals);
      if (data.routines?.length) await db.routines.bulkPut(data.routines);
      if (data.journals?.length) await db.journal_entries.bulkPut(data.journals);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const backupService = new LocalBackupService();
