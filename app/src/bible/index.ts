// The app's Bible: one bundled SQLite file per translation, opened only when first read.
// Rebuild the files with `python3 scripts/import-bibles.py` (from the repo root).
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { deserializeDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import versions from './data/versions.json';
import { createBible, openCurrent, type Bible, type Translation } from './core';

export * from './core';

const assets: Record<Translation, number> = {
  KJV: require('./data/kjv.db'),
  RV1909: require('./data/rv1909.db'),
};

const version = (db: SQLiteDatabase) =>
  db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'version'").then(row => row?.value ?? null, () => null);

/** Phones: copy the bundled file into app storage once (again only when a newer one ships), then open it. */
async function openOnDevice(translation: Translation): Promise<SQLiteDatabase> {
  const folder = new Directory(Paths.document, 'bible');
  const name = `${translation.toLowerCase()}.db`;
  const target = new File(folder, name);
  return openCurrent(versions[translation], {
    exists: () => target.exists,
    async install() {
      const [asset] = await Asset.loadAsync(assets[translation]);
      folder.create({ intermediates: true, idempotent: true });
      new File(asset.localUri!).copy(target, { overwrite: true });
    },
    open: () => openDatabaseAsync(name, undefined, decodeURIComponent(new URL(folder.uri).pathname)),
    version,
    close: db => db.closeAsync(),
  });
}

/** Web preview: no app storage, so the bundled file is read into an in-memory database. */
async function openOnWeb(translation: Translation): Promise<SQLiteDatabase> {
  const response = await fetch(Asset.fromModule(assets[translation]).uri);
  if (!response.ok) throw new Error(`Bible file ${translation}: HTTP ${response.status}`);
  const db = await deserializeDatabaseAsync(new Uint8Array(await response.arrayBuffer()));
  if ((await version(db)) !== versions[translation]) throw new Error(`Bible file ${translation} is not version ${versions[translation]}`);
  return db;
}

const opened = new Map<Translation, Promise<Bible>>();

/** `await bible('KJV')` then `.verse('John', 3, 16)`, `.chapter('Salmos', 23)` or `.search('corazon')`. */
export function bible(translation: Translation): Promise<Bible> {
  let ready = opened.get(translation);
  if (!ready) {
    ready = (Platform.OS === 'web' ? openOnWeb : openOnDevice)(translation)
      .then(db => createBible({ all: (sql, params) => db.getAllAsync(sql, params) }));
    ready.catch(() => opened.delete(translation));
    opened.set(translation, ready);
  }
  return ready;
}
