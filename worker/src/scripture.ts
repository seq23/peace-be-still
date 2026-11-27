// Verse lookup against the Worker's copy of the one Bible source (bible_verses, loaded from
// the app's bundled .db files). Every reference a model gives is resolved here; anything that
// does not resolve is dropped, and the text shown is always the stored text.
import { formatReference, parseReference, TRANSLATION_OF, type Language, type Reference, type Translation } from './shared';

/** The screen language each Bible is read in (its book names). */
const LANGUAGE_OF = Object.fromEntries(Object.entries(TRANSLATION_OF).map(([lang, t]) => [t, lang])) as Record<Translation, Language>;

export type Scripture = { ref: string; translation: Translation; text: string; book: string; chapter: number; verse: number; endVerse?: number };

// The 2A Bible data keeps each Psalm's heading ("To the chief Musician ... A Song upon Alamoth.")
// at the front of verse 1. A heading is not the verse she is given to hold on to, so it is cut
// here (until lane 2A stores headings apart). Checked on the real data: the same 115 Psalms carry a
// heading in the KJV and the RV1909 (worker/test/platform.test.ts).
const KJV_HEADING = /^(?:To the chief Musician|\[?A\]? ?\[?(?:Psalm|Song|Prayer)\b|Maschil|Michtam|Shiggaion|David’s|David's)[^.]*?(?:\.|: And he said,) /;
const RV_HEADING = /^(?![¡¿]?[A-ZÁÉÍÓÚÑ]{2})(?!Aleluya).{2,400}?[.:] (?=[¡¿]?(?:[A-ZÁÉÍÓÚÑ]{2,}|[A-ZÁÉÍÓÚÑ] [A-ZÁÉÍÓÚÑ]{2,})(?![a-záéíóúñ]))/u;
export function psalmHeading(translation: Translation, text: string): string | null {
  const m = (translation === 'RV1909' ? RV_HEADING : KJV_HEADING).exec(text);
  return m ? m[0] : null;
}
const stripHeading = (translation: Translation, book: string, verse: number, text: string) => {
  if (book !== 'PSA' || verse !== 1) return text;
  const h = psalmHeading(translation, text);
  return h ? text.slice(h.length) : text;
};
/** One psalm is "Psalm 46:1" in English (the book is "Psalms"); Spanish keeps "Salmos 46:1". */
const shownRef = (ref: string) => ref.replace(/^Psalms (?=\d)/, 'Psalm ');

export async function lookup(db: D1Database, translation: Translation, ref: Reference): Promise<Scripture | null> {
  if (ref.verse === undefined) return null; // a whole chapter is not a citation
  const last = Math.min(ref.endVerse ?? ref.verse, ref.verse + 5);
  const { results } = await db.prepare('SELECT verse, text FROM bible_verses WHERE translation = ? AND book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse')
    .bind(translation, ref.book, ref.chapter, ref.verse, last).all<{ verse: number; text: string }>();
  if (!results.length || results[0].verse !== ref.verse || results.length !== last - ref.verse + 1) return null;
  const text = results.map(r => stripHeading(translation, ref.book, r.verse, r.text.replace(/^¶\s*/, ''))).join(' ');
  const shown: Reference = { book: ref.book, chapter: ref.chapter, verse: ref.verse, ...(last > ref.verse ? { endVerse: last } : {}) };
  return { ref: shownRef(formatReference(shown, LANGUAGE_OF[translation])), translation, text, book: ref.book, chapter: ref.chapter, verse: ref.verse, ...(last > ref.verse ? { endVerse: last } : {}) };
}

/** Every verse of one chapter (the verse-number check: a line quoted under the wrong verse of a chapter). */
export async function chapterVerses(db: D1Database, translation: Translation, book: string, chapter: number): Promise<Array<{ verse: number; text: string }>> {
  const { results } = await db.prepare('SELECT verse, text FROM bible_verses WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse').bind(translation, book, chapter).all<{ verse: number; text: string }>();
  return results;
}

export async function resolve(db: D1Database, translation: Translation, raw: string): Promise<Scripture | null> {
  const ref = parseReference(raw);
  return ref ? lookup(db, translation, ref) : null;
}

/** "God is our refuge" (Psalm 46:1) in the request's translation; the fallback's verse. */
export function refugeVerse(db: D1Database, translation: Translation) {
  return lookup(db, translation, { book: 'PSA', chapter: 46, verse: 1 });
}
