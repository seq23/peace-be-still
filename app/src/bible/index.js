import kjv from './KJV.json' with { type: 'json' };
import rv1909 from './RV1909.json' with { type: 'json' };

const translations = { KJV: kjv, RV1909: rv1909 };

/** Book identifiers are the eBible three-character codes (e.g. GEN, PSA, JHN). */
export function getVerse(translation, book, chapter, verse) {
  return translations[translation]?.[book.toUpperCase()]?.[String(chapter)]?.[String(verse)] ?? null;
}

export function getChapter(translation, book, chapter) {
  const verses = translations[translation]?.[book.toUpperCase()]?.[String(chapter)];
  return verses ? Object.entries(verses).map(([verse, text]) => ({ book: book.toUpperCase(), chapter: Number(chapter), verse: Number(verse), text })) : [];
}

/** Case-insensitive literal search; returns references and the unmodified stored text. */
export function searchBible(translation, query, limit = 50) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle || !translations[translation] || !Number.isInteger(limit) || limit < 1) return [];
  const results = [];
  for (const [book, chapters] of Object.entries(translations[translation])) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const [verse, text] of Object.entries(verses)) {
        if (text.toLocaleLowerCase().includes(needle)) {
          results.push({ book, chapter: Number(chapter), verse: Number(verse), text });
          if (results.length === limit) return results;
        }
      }
    }
  }
  return results;
}
