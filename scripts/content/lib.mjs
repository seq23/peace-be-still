// Shared helpers for the launch library: the stored Bibles, references, word counts.
// Scripture is never typed by a person or a model: every verse in content/ is read
// from content/bible/*.txt.gz (eBible.org KJV and Reina-Valera 1909, both public domain).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CONTENT = join(ROOT, "content");

const FILES = { KJV: "kjv_vpl.txt.gz", RV1909: "rv1909_vpl.txt.gz" };
export const TRANSLATION = { en: "KJV", es: "RV1909" };

const BOOKS = [
  ["GEN", "Genesis", "Génesis"], ["EXO", "Exodus", "Éxodo"], ["LEV", "Leviticus", "Levítico"],
  ["NUM", "Numbers", "Números"], ["DEU", "Deuteronomy", "Deuteronomio"], ["JOS", "Joshua", "Josué"],
  ["JDG", "Judges", "Jueces"], ["RUT", "Ruth", "Rut"], ["1SA", "1 Samuel", "1 Samuel"],
  ["2SA", "2 Samuel", "2 Samuel"], ["1KI", "1 Kings", "1 Reyes"], ["2KI", "2 Kings", "2 Reyes"],
  ["1CH", "1 Chronicles", "1 Crónicas"], ["2CH", "2 Chronicles", "2 Crónicas"], ["EZR", "Ezra", "Esdras"],
  ["NEH", "Nehemiah", "Nehemías"], ["EST", "Esther", "Ester"], ["JOB", "Job", "Job"],
  ["PSA", "Psalm", "Salmos"], ["PRO", "Proverbs", "Proverbios"], ["ECC", "Ecclesiastes", "Eclesiastés"],
  ["SOL", "Song of Solomon", "Cantares"], ["ISA", "Isaiah", "Isaías"], ["JER", "Jeremiah", "Jeremías"],
  ["LAM", "Lamentations", "Lamentaciones"], ["EZE", "Ezekiel", "Ezequiel"], ["DAN", "Daniel", "Daniel"],
  ["HOS", "Hosea", "Oseas"], ["JOE", "Joel", "Joel"], ["AMO", "Amos", "Amós"], ["OBA", "Obadiah", "Abdías"],
  ["JON", "Jonah", "Jonás"], ["MIC", "Micah", "Miqueas"], ["NAH", "Nahum", "Nahum"],
  ["HAB", "Habakkuk", "Habacuc"], ["ZEP", "Zephaniah", "Sofonías"], ["HAG", "Haggai", "Hageo"],
  ["ZEC", "Zechariah", "Zacarías"], ["MAL", "Malachi", "Malaquías"], ["MAT", "Matthew", "Mateo"],
  ["MAR", "Mark", "Marcos"], ["LUK", "Luke", "Lucas"], ["JOH", "John", "Juan"], ["ACT", "Acts", "Hechos"],
  ["ROM", "Romans", "Romanos"], ["1CO", "1 Corinthians", "1 Corintios"], ["2CO", "2 Corinthians", "2 Corintios"],
  ["GAL", "Galatians", "Gálatas"], ["EPH", "Ephesians", "Efesios"], ["PHI", "Philippians", "Filipenses"],
  ["COL", "Colossians", "Colosenses"], ["1TH", "1 Thessalonians", "1 Tesalonicenses"],
  ["2TH", "2 Thessalonians", "2 Tesalonicenses"], ["1TI", "1 Timothy", "1 Timoteo"], ["2TI", "2 Timothy", "2 Timoteo"],
  ["TIT", "Titus", "Tito"], ["PHM", "Philemon", "Filemón"], ["HEB", "Hebrews", "Hebreos"], ["JAM", "James", "Santiago"],
  ["1PE", "1 Peter", "1 Pedro"], ["2PE", "2 Peter", "2 Pedro"], ["1JO", "1 John", "1 Juan"], ["2JO", "2 John", "2 Juan"],
  ["3JO", "3 John", "3 Juan"], ["JUD", "Jude", "Judas"], ["REV", "Revelation", "Apocalipsis"],
];
export const BOOK = Object.fromEntries(BOOKS.map(([c, en, es]) => [c, { en, es }]));

const cache = {};
// The one display rule: KJV/RV [bracketed] words (added by the translators) are shown
// without the brackets; the pilcrow is dropped; a chapter's all-capital opening word
// (a drop-cap convention in the RV1909 file, e.g. "EN el principio") takes normal case.
export function display(raw) {
  let t = raw.replace(/¶\s*/g, "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
  t = t.replace(/^([¡¿]?)([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ]+)(?=[\s,.;:!?])/u, (m, p, a, b) =>
    (a + b === "LORD" || a + b === "GOD" ? m : p + a + b.toLowerCase()));
  return t;
}

export function bible(tr) {
  if (cache[tr]) return cache[tr];
  const txt = gunzipSync(readFileSync(join(CONTENT, "bible", FILES[tr]))).toString("utf8");
  const map = new Map();
  for (const line of txt.split("\n")) {
    const m = line.match(/^([1-4A-Z]{3}) (\d+):(\d+) (.*)$/);
    if (m) map.set(`${m[1]} ${m[2]}:${m[3]}`, display(m[4]));
  }
  if (map.size < 30000) throw new Error(`BIBLE_INCOMPLETE ${tr} has ${map.size} verses`);
  return (cache[tr] = map);
}

// "MAR 4:35-41" | "PSA 23:1" -> {book, ch, a, z}
export function parseRef(ref) {
  const m = String(ref).trim().match(/^([1-4A-Z]{3}) (\d+):(\d+)(?:-(\d+))?$/);
  if (!m || !BOOK[m[1]]) throw new Error(`BAD_REF ${ref}`);
  const a = +m[3], z = +(m[4] || m[3]);
  if (z < a) throw new Error(`BAD_REF ${ref}`);
  return { book: m[1], ch: +m[2], a, z };
}

export function verses(ref, tr) {
  const { book, ch, a, z } = parseRef(ref), b = bible(tr), out = [];
  for (let v = a; v <= z; v++) {
    const t = b.get(`${book} ${ch}:${v}`);
    if (t === undefined) throw new Error(`REF_NOT_IN_${tr} ${book} ${ch}:${v}`);
    out.push({ v, text: t });
  }
  return out;
}

export function label(ref, lang) {
  const { book, ch, a, z } = parseRef(ref);
  const name = BOOK[book][lang];
  return `${name} ${ch}:${a}${z !== a ? "-" + z : ""}`;
}

export function passageText(refs, tr) {
  return [].concat(refs).flatMap((r) => verses(r, tr).map((x) => x.text)).join(" ");
}

export const words = (t) => (String(t).replace(/\[pause \d+\]/g, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []);
export const pauses = (t) => [...String(t).matchAll(/\[pause (\d+)\]/g)].reduce((s, m) => s + +m[1], 0);
export const tokens = (t) => words(t).map((w) => w.toLowerCase().normalize("NFD").replace(/[^a-zñ\p{L}]/gu, "").replace(/\p{M}/gu, "")).filter(Boolean);

// Every 8-word run of the stored Bible, for "no scripture typed outside a scripture block".
const runs = {};
export function scriptureRuns(tr) {
  if (runs[tr]) return runs[tr];
  const set = new Set();
  for (const t of bible(tr).values()) {
    const k = tokens(t);
    for (let i = 0; i + 8 <= k.length; i++) set.add(k.slice(i, i + 8).join(" "));
  }
  return (runs[tr] = set);
}
export function scriptureHits(text, tr) {
  const k = tokens(text), set = scriptureRuns(tr), hits = [];
  for (let i = 0; i + 8 <= k.length; i++) if (set.has(k.slice(i, i + 8).join(" "))) hits.push(k.slice(i, i + 8).join(" "));
  return hits;
}

// Syllables, for reading level (heuristics, good enough for a band check).
export function sylEn(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length);
}
export function sylEs(w) {
  w = w.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  if (!w) return 0;
  // strong-strong vowel pairs and accented weak vowels split; other vowel groups are one nucleus
  const groups = w.match(/[aeiouáéíóúü]+/g) || [];
  let n = 0;
  for (const g of groups) {
    let c = 1;
    for (let i = 1; i < g.length; i++) {
      const p = g[i - 1], q = g[i];
      const strong = (x) => "aeoáéóíú".includes(x);
      if (strong(p) && strong(q)) c++;
    }
    n += c;
  }
  return Math.max(1, n);
}
export function sentences(t) {
  return String(t).replace(/\[pause \d+\]/g, " ").split(/(?<=[.!?…])\s+/).filter((s) => words(s).length > 0);
}
export function fkGrade(t) {
  const w = words(t), s = sentences(t).length || 1;
  const syl = w.reduce((a, x) => a + sylEn(x), 0);
  return 0.39 * (w.length / s) + 11.8 * (syl / (w.length || 1)) - 15.59;
}
// Fernández-Huerta (Law's corrected form): 206.84 - 60*(syllables/word) - 1.02*(words/sentence)
export function fernandezHuerta(t) {
  const w = words(t), s = sentences(t).length || 1;
  const syl = w.reduce((a, x) => a + sylEs(x), 0);
  return 206.84 - 60 * (syl / (w.length || 1)) - 1.02 * (w.length / s);
}
