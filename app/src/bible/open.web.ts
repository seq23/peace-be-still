// The web preview: each tab reads the bundled Bible file into its own in-memory SQLite (sql.js), so any number of
// tabs can read it at once. expo-sqlite's web build opens an OPFS access-handle pool even for an in-memory copy, and
// an OPFS sync access handle belongs to one tab at a time: a second tab could not read a single verse (21 Nov 2026).
// Phones use open.ts.
import { Asset } from 'expo-asset';
import initSqlJs, { type Database } from 'sql.js';
import versions from './data/versions.json';
import { createBible, type Bible, type Translation } from './core';

const assets: Record<Translation, number> = {
  KJV: require('./data/kjv.db'),
  RV1909: require('./data/rv1909.db'),
  KRV: require('./data/krv.db'),
  CUVS: require('./data/cuvs.db'),
  CUVT: require('./data/cuvt.db'),
};
const wasm: number = require('sql.js/dist/sql-wasm.wasm');

async function bytes(module: number, what: string): Promise<Uint8Array> {
  const response = await fetch(Asset.fromModule(module).uri);
  if (!response.ok) throw new Error(`${what}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

let engine: ReturnType<typeof initSqlJs> | null = null;
const sqlJs = () => (engine ??= bytes(wasm, 'SQLite engine').then(binary => initSqlJs({ wasmBinary: binary.buffer as ArrayBuffer }))
  .catch(error => { engine = null; throw error; }));

function all<T>(db: Database, sql: string, params: (string | number)[]): T[] {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    return rows;
  } finally {
    statement.free();
  }
}

export async function openBible(translation: Translation): Promise<Bible> {
  const [SQL, file] = await Promise.all([sqlJs(), bytes(assets[translation], `Bible file ${translation}`)]);
  const db = new SQL.Database(file);
  const [row] = all<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'version'", []);
  if (row?.value !== versions[translation]) {
    db.close();
    throw new Error(`Bible file ${translation} is not version ${versions[translation]}`);
  }
  return createBible({ all: async (sql, params) => all(db, sql, params) });
}
