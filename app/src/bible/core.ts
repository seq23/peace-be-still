// Scripture lookup, search, references and display, independent of the SQLite driver.
// The app opens the bundled files with expo-sqlite (index.ts); the tests use node:sqlite on the
// same files. Stored text is never changed: displayRuns only splits it for the reader.
import books from '../../../content/bible/books.json';

export type Translation = 'KJV' | 'RV1909';
export type Language = 'en' | 'es';
export type Book = { code: string; usfm: string; en: string; es: string; aliases?: string[] };
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
  for (const name of [book.code, book.usfm, book.en, book.es, ...(book.aliases ?? [])]) {
    const key = bookKey(name);
    const other = names.get(key);
    if (other && other !== book.code) throw new Error(`books.json: "${name}" names both ${other} and ${book.code}`);
    names.set(key, book.code);
  }
}

/** The file code (as stored, e.g. JOH) for an English or Spanish name, a USFM code (JHN) or a file code. */
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

export function formatReference(reference: Reference, language: Language): string {
  const name = bookName(reference.book, language) ?? reference.book;
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

export function createBible(driver: Driver) {
  // The web build of SQLite has no FTS5 (the web preview only); there search scans the folded text.
  let hasFts: Promise<boolean> | undefined;
  const fts = () => (hasFts ??= driver.all('SELECT rowid FROM verses_fts LIMIT 0', []).then(() => true, () => false));
  async function scan(query: string, limit: number): Promise<Verse[]> {
    const words = fold(query).split(' ').filter(Boolean);
    const rows = await driver.all<Verse>(`SELECT ${columns} FROM verses v ORDER BY v.id`, []);
    const found: Verse[] = [];
    for (const row of rows) {
      const text = ` ${fold(row.text)} `;
      if (words.every((word, i) => text.includes(i === words.length - 1 ? ` ${word}` : ` ${word} `))) found.push(row);
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
