// Verse lookup against the Worker's copy of the one Bible source (bible_verses, loaded from
// the app's bundled .db files). Every reference a model gives is resolved here; anything that
// does not resolve is dropped, and the text shown is always the stored text.
import { formatReference, parseReference, type Reference, type Translation } from './shared';

export type Scripture = { ref: string; translation: Translation; text: string; book: string; chapter: number; verse: number; endVerse?: number };

export async function lookup(db: D1Database, translation: Translation, ref: Reference): Promise<Scripture | null> {
  if (ref.verse === undefined) return null; // a whole chapter is not a citation
  const last = Math.min(ref.endVerse ?? ref.verse, ref.verse + 5);
  const { results } = await db.prepare('SELECT verse, text FROM bible_verses WHERE translation = ? AND book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse')
    .bind(translation, ref.book, ref.chapter, ref.verse, last).all<{ verse: number; text: string }>();
  if (!results.length || results[0].verse !== ref.verse || results.length !== last - ref.verse + 1) return null;
  const text = results.map(r => r.text.replace(/^¶\s*/, '')).join(' ');
  const shown: Reference = { book: ref.book, chapter: ref.chapter, verse: ref.verse, ...(last > ref.verse ? { endVerse: last } : {}) };
  return { ref: formatReference(shown, translation === 'RV1909' ? 'es' : 'en'), translation, text, book: ref.book, chapter: ref.chapter, verse: ref.verse, ...(last > ref.verse ? { endVerse: last } : {}) };
}

export async function resolve(db: D1Database, translation: Translation, raw: string): Promise<Scripture | null> {
  const ref = parseReference(raw);
  return ref ? lookup(db, translation, ref) : null;
}

/** "God is our refuge" (Psalm 46:1) in the request's translation; the fallback's verse. */
export function refugeVerse(db: D1Database, translation: Translation) {
  return lookup(db, translation, { book: 'PSA', chapter: 46, verse: 1 });
}
