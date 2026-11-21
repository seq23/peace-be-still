// Book names for track titles, keyed by the audio manifest's book codes (the KJV VPL set: JOH, MAR, PHI).
// Stand-in until lane 2A's shared book list lands; then this file becomes a one-line re-export of it.
const BOOKS: Record<string, readonly [en: string, es: string]> = {
  GEN: ['Genesis', 'Génesis'], EXO: ['Exodus', 'Éxodo'], LEV: ['Leviticus', 'Levítico'], NUM: ['Numbers', 'Números'],
  DEU: ['Deuteronomy', 'Deuteronomio'], JOS: ['Joshua', 'Josué'], JDG: ['Judges', 'Jueces'], RUT: ['Ruth', 'Rut'],
  '1SA': ['1 Samuel', '1 Samuel'], '2SA': ['2 Samuel', '2 Samuel'], '1KI': ['1 Kings', '1 Reyes'], '2KI': ['2 Kings', '2 Reyes'],
  '1CH': ['1 Chronicles', '1 Crónicas'], '2CH': ['2 Chronicles', '2 Crónicas'], EZR: ['Ezra', 'Esdras'], NEH: ['Nehemiah', 'Nehemías'],
  EST: ['Esther', 'Ester'], JOB: ['Job', 'Job'], PSA: ['Psalm', 'Salmo'], PRO: ['Proverbs', 'Proverbios'],
  ECC: ['Ecclesiastes', 'Eclesiastés'], SOL: ['Song of Solomon', 'Cantares'], ISA: ['Isaiah', 'Isaías'], JER: ['Jeremiah', 'Jeremías'],
  LAM: ['Lamentations', 'Lamentaciones'], EZE: ['Ezekiel', 'Ezequiel'], DAN: ['Daniel', 'Daniel'], HOS: ['Hosea', 'Oseas'],
  JOE: ['Joel', 'Joel'], AMO: ['Amos', 'Amós'], OBA: ['Obadiah', 'Abdías'], JON: ['Jonah', 'Jonás'], MIC: ['Micah', 'Miqueas'],
  NAH: ['Nahum', 'Nahúm'], HAB: ['Habakkuk', 'Habacuc'], ZEP: ['Zephaniah', 'Sofonías'], HAG: ['Haggai', 'Hageo'],
  ZEC: ['Zechariah', 'Zacarías'], MAL: ['Malachi', 'Malaquías'], MAT: ['Matthew', 'Mateo'], MAR: ['Mark', 'Marcos'],
  LUK: ['Luke', 'Lucas'], JOH: ['John', 'Juan'], ACT: ['Acts', 'Hechos'], ROM: ['Romans', 'Romanos'],
  '1CO': ['1 Corinthians', '1 Corintios'], '2CO': ['2 Corinthians', '2 Corintios'], GAL: ['Galatians', 'Gálatas'],
  EPH: ['Ephesians', 'Efesios'], PHI: ['Philippians', 'Filipenses'], COL: ['Colossians', 'Colosenses'],
  '1TH': ['1 Thessalonians', '1 Tesalonicenses'], '2TH': ['2 Thessalonians', '2 Tesalonicenses'], '1TI': ['1 Timothy', '1 Timoteo'],
  '2TI': ['2 Timothy', '2 Timoteo'], TIT: ['Titus', 'Tito'], PHM: ['Philemon', 'Filemón'], HEB: ['Hebrews', 'Hebreos'],
  JAM: ['James', 'Santiago'], '1PE': ['1 Peter', '1 Pedro'], '2PE': ['2 Peter', '2 Pedro'], '1JO': ['1 John', '1 Juan'],
  '2JO': ['2 John', '2 Juan'], '3JO': ['3 John', '3 Juan'], JUD: ['Jude', 'Judas'], REV: ['Revelation', 'Apocalipsis'],
};

/** "PSA 23" → { en: "Psalm 23", es: "Salmo 23" }; null for anything that is not a known book and chapter. */
export function chapterTitles(ref: string): { en: string; es: string } | null {
  const match = /^([1-3]?[A-Z]{2,3}) ([1-9]\d{0,2})$/.exec(ref);
  const book = match ? BOOKS[match[1]] : undefined;
  return match && book ? { en: `${book[0]} ${match[2]}`, es: `${book[1]} ${match[2]}` } : null;
}
