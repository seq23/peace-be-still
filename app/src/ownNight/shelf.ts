// Where Write your own night keeps things on the phone: one folder (own-nights) holding the saved nights
// (nights.json) and the recordings. The folder is kept out of iCloud and device backups before anything is
// written into it (iPhone: marked at run time by modules/backup-exclude; Android: build-time rules,
// plugins/own-night-backup.js), so "never uploaded" is true. If the mark cannot be set and read back, nothing is
// written: saving fails and says so. Pure, so the tests run it with a fake file system.
import { SAVED_NIGHTS_KEY, type NightStorage } from './saved';

export const NIGHTS_FILE = 'nights.json';

export interface ShelfFiles {
  /** Creates the folder if it is not there. */
  ensureFolder(): void;
  /** Marks the folder excluded from backups; true only when the mark was read back. */
  excludeFolder(): boolean;
  read(name: string): string | null;
  write(name: string, text: string): void;
}

export function createShelf(files: ShelfFiles) {
  /** The folder, created and marked out of backups on every use (the mark is read back each time, so a folder made
   *  again by anything else is marked again); throws, and nothing is written, when it cannot be kept out. */
  const ready = () => {
    files.ensureFolder();
    if (!files.excludeFolder()) throw new Error('BACKUP_EXCLUDE_FAILED');
  };
  const only = (key: string) => { if (key !== SAVED_NIGHTS_KEY) throw new Error(`NOT_A_NIGHTS_KEY: ${key}`); };
  const storage: NightStorage = {
    async getItem(key) { only(key); ready(); return files.read(NIGHTS_FILE); },
    async setItem(key, value) { only(key); ready(); files.write(NIGHTS_FILE, value); },
  };
  return { ready, storage };
}
