// The app's Bible: one bundled SQLite file per translation, opened only when first read. How a file is opened
// is per platform: open.ts on phones (expo-sqlite, a copy in app storage), open.web.ts on the web preview.
// Rebuild the files with `python3 scripts/import-bibles.py` (from the repo root).
import { openBible } from './open';
import { type Bible, type Translation } from './core';

export * from './core';

const opened = new Map<Translation, Promise<Bible>>();

/** `await bible('KJV')` then `.verse('John', 3, 16)`, `.chapter('Salmos', 23)` or `.search('corazon')`. */
export function bible(translation: Translation): Promise<Bible> {
  let ready = opened.get(translation);
  if (!ready) {
    ready = openBible(translation);
    ready.catch(() => opened.delete(translation));
    opened.set(translation, ready);
  }
  return ready;
}
