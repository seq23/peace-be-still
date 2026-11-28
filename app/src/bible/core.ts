// Scripture lookup, search, references and display, independent of the SQLite driver.
// The app opens the bundled files with expo-sqlite (index.ts); the tests use node:sqlite on the
// same files. Stored text is never changed: displayRuns only splits it for the reader.
import books from '../../../content/bible/books.json';
import type { Language } from '../i18n';

export type { Language };
export type Translation = 'KJV' | 'RV1909' | 'KRV' | 'CUVS' | 'CUVT';
export type Book = { code: string; usfm: string; aliases?: string[] } & Record<Language, string>;

/** Each screen language reads one Bible, word for word: KJV, Reina-Valera 1909, 개역한글 (1961), and the
 *  1919 和合本 in Simplified or Traditional characters (never the 1988 edition). */
export const TRANSLATION_OF: Record<Language, Translation> = { en: 'KJV', es: 'RV1909', ko: 'KRV', 'zh-Hans': 'CUVS', 'zh-Hant': 'CUVT' };
export function translationFor(language: string): Translation {
  return TRANSLATION_OF[language as Language] ?? 'KJV';
}

/** The short name shown after every reference and on every share card ("시편 23:1 · 개역한글"). */
export const TRANSLATION_NAME: Record<Translation, string> = { KJV: 'KJV', RV1909: 'RV1909', KRV: '개역한글', CUVS: '和合本', CUVT: '和合本' };

/** The credit line under Korean and Chinese verses, from content/bible/{krv,cuv}_source.json. */
export const TRANSLATION_CREDIT: Partial<Record<Translation, string>> = {
  KRV: '개역한글판 (대한성서공회 번역, 1961)',
  CUVS: '和合本（1919年版，公有领域）',
  CUVT: '和合本（1919年版，公有領域）',
};
export type Verse = { book: string; chapter: number; verse: number; text: string };
export type Reference = { book: string; chapter: number; verse?: number; endVerse?: number };
export type Run = { text: string; italic: boolean };

/** The few calls the store needs; both expo-sqlite and node:sqlite are wrapped to this. */
export interface Driver {
  all<T>(sql: string, params: (string | number)[]): Promise<T[]>;
}

export const BOOKS: readonly Book[] = books;
const byCode = new Map(BOOKS.map(book => [book.code, book]));

/** Lower case, accents removed, punctuation to spaces: the same folding FTS5 applies. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const ordinal: Record<string, string> = {
  first: '1', '1st': '1', i: '1', primera: '1', primero: '1', primer: '1',
  second: '2', '2nd': '2', ii: '2', segunda: '2', segundo: '2',
  third: '3', '3rd': '3', iii: '3', tercera: '3', tercero: '3',
};
function bookKey(name: string): string {
  const words = fold(name).split(' ');
  if (words.length > 1 && ordinal[words[0]]) words[0] = ordinal[words[0]];
  if (words.length > 2 && /^[123]$/.test(words[0]) && words[1] === 'de') words.splice(1, 1);
  return words.join(' ');
}

const names = new Map<string, string>();
for (const book of BOOKS) {
  // Korean and Chinese names too: a reference an answer writes in her Bible's names ("시편 151:2") is checked like any other.
  for (const name of [book.code, book.usfm, book.en, book.es, book.ko, book['zh-Hans'], book['zh-Hant'], ...(book.aliases ?? [])]) {
    const key = bookKey(name);
    const other = names.get(key);
    if (other && other !== book.code) throw new Error(`books.json: "${name}" names both ${other} and ${book.code}`);
    names.set(key, book.code);
  }
}

/** The file code (as stored, e.g. JOH) for an English, Spanish, Korean or Chinese name, a USFM code (JHN) or a file code. */
export function bookCode(name: string): string | null {
  return names.get(bookKey(name)) ?? null;
}

export function bookName(code: string, language: Language): string | null {
  return byCode.get(code)?.[language] ?? null;
}

/** "John 3:16", "Juan 3:16-18", "1 John 4:8", "Primera de Juan 4:8", "JHN 3:16", "Psalm 23". */
export function parseReference(text: string): Reference | null {
  const match = text.trim().match(/^(.+?)\.?\s+(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/u);
  if (!match) return null;
  const book = bookCode(match[1]);
  if (!book) return null;
  const reference: Reference = { book, chapter: Number(match[2]) };
  if (match[3]) reference.verse = Number(match[3]);
  if (match[4]) {
    reference.endVerse = Number(match[4]);
    if (reference.endVerse < reference.verse!) return null;
  }
  return reference;
}

/** A reference as a reader writes it. One psalm is "Psalm 4:8" in English (the book is Psalms); Spanish keeps
 * "Salmos 4:8", as the Reina-Valera writes it. */
export function formatReference(reference: Reference, language: Language): string {
  const name = reference.book === 'PSA' && language === 'en' ? 'Psalm' : bookName(reference.book, language) ?? reference.book;
  if (reference.verse === undefined) return `${name} ${reference.chapter}`;
  const end = reference.endVerse && reference.endVerse !== reference.verse ? `-${reference.endVerse}` : '';
  return `${name} ${reference.chapter}:${reference.verse}${end}`;
}

/** True when the KJV marks the verse as the start of a paragraph (a leading ¶). */
export function startsParagraph(text: string): boolean {
  return text.startsWith('¶');
}

/**
 * The stored text split for the reader. Square brackets mark the words the translators supplied
 * ("darkness [was] upon the face"); printed Bibles set them in italics, so the reader does too.
 * The KJV's paragraph mark is left out here; the reader starts a new paragraph (startsParagraph).
 */
export function displayRuns(text: string): Run[] {
  const runs: Run[] = [];
  for (const part of text.replace(/^¶\s*/, '').split(/(\[[^\]]*\])/)) {
    if (!part) continue;
    const italic = part.startsWith('[') && part.endsWith(']');
    runs.push({ text: italic ? part.slice(1, -1) : part, italic });
  }
  return runs;
}

/** Search words as an FTS5 query: every word must appear, the last one may be the start of a word. */
export function ftsQuery(query: string): string | null {
  const words = fold(query).split(' ').filter(Boolean).slice(0, 12);
  if (!words.length) return null;
  return words.map((word, i) => `"${word}"${i === words.length - 1 ? '*' : ''}`).join(' ');
}

const columns = 'v.book, v.chapter, v.verse, v.text';

/** What opening a bundled translation needs: the copy on the device, and the bundled file. */
export interface Installed<D> {
  /** The device copy exists. */
  exists(): boolean;
  /** Copy the bundled file over the device copy. */
  install(): Promise<void>;
  open(): Promise<D>;
  /** meta.version of an open copy, or null when it cannot be read. */
  version(db: D): Promise<string | null>;
  close(db: D): Promise<void>;
}

/** Open the device copy, replacing it first when it is missing or older than the bundled file. */
export async function openCurrent<D>(wanted: string, file: Installed<D>): Promise<D> {
  if (!file.exists()) await file.install();
  const db = await file.open();
  if ((await file.version(db)) === wanted) return db;
  await file.close(db);
  await file.install();
  const fresh = await file.open();
  const version = await file.version(fresh);
  if (version !== wanted) throw new Error(`Bible file is version ${version}, expected ${wanted}`);
  return fresh;
}

export function createBible(driver: Driver) {
  // The web build of SQLite has no FTS5 (the web preview only); there search scans the folded text.
  // The rows are read and folded once per translation, so later searches only filter memory.
  let hasFts: Promise<boolean> | undefined;
  const fts = () => (hasFts ??= driver.all('SELECT rowid FROM verses_fts LIMIT 0', []).then(() => true, () => false));
  let folded: Promise<{ verse: Verse; text: string }[]> | undefined;
  const foldedRows = () => (folded ??= driver.all<Verse>(`SELECT ${columns} FROM verses v ORDER BY v.id`, [])
    .then(rows => rows.map(verse => ({ verse, text: ` ${fold(verse.text)} ` }))));
  async function scan(query: string, limit: number): Promise<Verse[]> {
    const words = fold(query).split(' ').filter(Boolean);
    const needles = words.map((word, i) => (i === words.length - 1 ? ` ${word}` : ` ${word} `));
    const found: Verse[] = [];
    for (const row of await foldedRows()) {
      if (needles.every(needle => row.text.includes(needle))) found.push(row.verse);
      if (found.length === limit) break;
    }
    return found;
  }
  return {
    async verse(book: string, chapter: number, verse: number): Promise<Verse | null> {
      const code = bookCode(book);
      if (!code) return null;
      const rows = await driver.all<Verse>(`SELECT ${columns} FROM verses v WHERE book = ? AND chapter = ? AND verse = ?`, [code, chapter, verse]);
      return rows[0] ?? null;
    },
    /** Every verse of a chapter in order. A few RV1909 verses are empty in the source and stay empty. */
    async chapter(book: string, chapter: number): Promise<Verse[]> {
      const code = bookCode(book);
      if (!code) return [];
      return driver.all<Verse>(`SELECT ${columns} FROM verses v WHERE book = ? AND chapter = ? ORDER BY verse`, [code, chapter]);
    },
    /** The verses a reference names: one verse, a range, or a whole chapter. */
    async passage(reference: Reference): Promise<Verse[]> {
      const first = reference.verse ?? 1;
      const last = reference.endVerse ?? reference.verse ?? 999;
      return driver.all<Verse>(`SELECT ${columns} FROM verses v WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse`, [reference.book, reference.chapter, first, last]);
    },
    /** Best matches first (bm25); accents and case are ignored, so "corazon" finds "corazón". */
    async search(query: string, limit = 50): Promise<Verse[]> {
      const match = ftsQuery(query);
      if (!match) return [];
      const count = Math.max(1, Math.min(200, Math.floor(limit) || 1));
      if (!(await fts())) return scan(query, count);
      return driver.all<Verse>(
        `SELECT ${columns} FROM verses_fts f JOIN verses v ON v.id = f.rowid WHERE verses_fts MATCH ? ORDER BY bm25(verses_fts), v.id LIMIT ?`,
        [match, count],
      );
    },
  };
}
export type Bible = ReturnType<typeof createBible>;

/** "Psalm 23:1 · KJV"; a translation with a credit line names itself there once ("시편 23:1", then
 *  "개역한글판 (대한성서공회 번역, 1961)" on its own line), never twice. Every verse screen and share card cites
 *  through this, so a Korean or Chinese verse never shows without its credit. */
export function citation(reference: string, translation: Translation): string {
  const credit = TRANSLATION_CREDIT[translation];
  return credit ? `${reference}\n${credit}` : `${reference} · ${TRANSLATION_NAME[translation]}`;
}

/** Korean and Chinese letters are never spaced apart: the small-caps letter-spacing of a label is for Latin
 *  letters only ("새 벽 말 씀" reads as four words). True when any text inside has a Han or Hangul letter. */
export function hasCjk(node: unknown): boolean {
  if (typeof node === 'string') return /[\p{Script=Han}\p{Script=Hangul}]/u.test(node);
  if (Array.isArray(node)) return node.some(hasCjk);
  return false;
}
