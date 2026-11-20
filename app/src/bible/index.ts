// The app's Bible: one bundled SQLite file per translation, opened only when first read.
// Rebuild the files with `python3 scripts/import-bibles.py` (from the repo root).
import { importDatabaseFromAssetAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import versions from './data/versions.json';
import { createBible, type Bible, type Translation } from './core';

export * from './core';

const assets: Record<Translation, number> = {
  KJV: require('./data/kjv.db'),
  RV1909: require('./data/rv1909.db'),
};

/** Copy the bundled file into place (again only when the app ships a newer one) and open it. */
async function open(translation: Translation): Promise<SQLiteDatabase> {
  const name = `${translation.toLowerCase()}.db`;
  const wanted = versions[translation];
  await importDatabaseFromAssetAsync(name, { assetId: assets[translation] });
  let db = await openDatabaseAsync(name);
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'version'").catch(() => null);
  if (row?.value !== wanted) {
    await db.closeAsync();
    await importDatabaseFromAssetAsync(name, { assetId: assets[translation], forceOverwrite: true });
    db = await openDatabaseAsync(name);
  }
  return db;
}

const opened = new Map<Translation, Promise<Bible>>();

/** `await bible('KJV')` then `.verse('John', 3, 16)`, `.chapter('Salmos', 23)` or `.search('corazon')`. */
export function bible(translation: Translation): Promise<Bible> {
  let ready = opened.get(translation);
  if (!ready) {
    ready = open(translation).then(db => createBible({ all: (sql, params) => db.getAllAsync(sql, params) }));
    ready.catch(() => opened.delete(translation));
    opened.set(translation, ready);
  }
  return ready;
}
