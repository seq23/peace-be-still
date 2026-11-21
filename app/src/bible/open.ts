// Phones: the bundled Bible file is copied into app storage once and opened with expo-sqlite (the web preview
// opens it with open.web.ts instead).
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import versions from './data/versions.json';
import { createBible, openCurrent, type Bible, type Translation } from './core';

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

export async function openBible(translation: Translation): Promise<Bible> {
  const db = await openOnDevice(translation);
  return createBible({ all: (sql, params) => db.getAllAsync(sql, params) });
}
