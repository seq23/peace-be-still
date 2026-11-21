// THE VERSE READ (Mindset door): a model reads every Imagination Night and names any line that quotes or
// closely paraphrases a Bible verse, in ANY translation (NVI, RVR1960, NIV, a plain retelling). Word lists
// cannot judge meaning (21 Nov 2026 review: 8 of 8 NVI/paraphrased verses passed the n-gram checks), so the
// n-gram checks against the stored RV1909/KJV stay as the fast exact pass and this read judges meaning.
//
// The read is recorded, not repeated: content/src/reviews/verse-read.tsv holds one verdict per night, keyed
// by the hash of its written text, so the CI gate is deterministic and needs no key. A night with no
// verdict for its CURRENT text (never read, edited since, model out, unparsable answer) is HELD, never passed.
// The model must also have passed the probe (verse-read-probe.json: the reviewer's 8 Spanish verses, English
// verses, gendered Spanish lines and clean lines); a verdict from a model that has not is not trusted.
// The same read names Spanish lines that assume the listener's gender (the brief: no gender assumed).
//
//   npm run -s vault:run -- node scripts/content/verse-read.mjs read    # read every night whose text has no verdict
//   npm run -s vault:run -- node scripts/content/verse-read.mjs probe   # run the probe on the current route
// Route: draft.mjs gemini() (the app's own free Gemini project, PBS_GEMINI_API_KEY; content is not private).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT, sentences } from "./lib.mjs";

export const CACHE = join(CONTENT, "src", "reviews", "verse-read.tsv");
export const PROBE = join(CONTENT, "src", "reviews", "verse-read-probe.json");

/** The lines a person wrote (title and every segment), one per sentence, pause marks dropped. */
export function writtenLines(n) {
  return [n.title, ...n.segments.map((s) => s.text)].flatMap((t) => sentences(String(t).replace(/\[pause \d+\]/g, " "))).map((s) => s.trim()).filter(Boolean);
}
export const textKey = (lines) => createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 16);

export function prompt(lines) {
  return `You check scripts for a sleep app's non-religious "imagination" section, which must contain no Bible text at all.
Below are numbered lines (English or Spanish). For EACH line, decide: does it quote, or closely paraphrase, any Bible verse in ANY translation or wording (KJV, NIV, NVI, RVR1960, Reina-Valera 1909, NTV, a plain modern retelling, a well-known saying taken from a verse)? Ordinary calm phrases that merely share a common word ("peace", "rest", "patience") do NOT count; a line counts when a reader who knows the Bible would recognise a specific verse in it.
SECOND, for Spanish lines only: does the line assume the LISTENER's gender (the person being spoken to, "tú")? That is, an adjective or participle that agrees with the listener ("estás cansado", "si sigues despierta", "bienvenido"), or a masculine plural that includes the listener ("vamos juntos", "despertamos ligeros", "muchos nos hablamos"). Words about other people or things ("una noche tranquila", "la otra persona está sentada") do NOT count.
Answer with ONLY a JSON object: {"verses": [{"n": <line number>, "ref": "<book chapter:verse>"}], "gendered": [{"n": <line number>, "word": "<the word>"}]}. Use empty arrays when nothing counts.

${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}`;
}

/** The model's answer -> {verses: [{n, ref}], gendered: [{n, word}]} or null when it is not the asked-for JSON (null holds the night). */
export function parseAnswer(text, count) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const a = JSON.parse(m[0]);
    if (!a || !Array.isArray(a.verses) || !Array.isArray(a.gendered)) return null;
    const ok = (x) => x && Number.isInteger(x.n) && x.n >= 1 && x.n <= count;
    return { verses: a.verses.filter(ok).map((x) => ({ n: x.n, ref: String(x.ref || "?").trim() || "?" })),
             gendered: a.gendered.filter(ok).map((x) => ({ n: x.n, word: String(x.word || "?").trim() || "?" })) };
  } catch { return null; }
}

// ---------------------------------------------------------------- the record
export function loadCache(path = CACHE) {
  const out = new Map();
  if (!existsSync(path)) return out;
  for (const l of readFileSync(path, "utf8").split("\n")) {
    if (!l.trim() || l.startsWith("#")) continue;
    const [key, id, lang, verdict, model, date, gendered] = l.split("\t");
    out.set(key, { id, lang, verdict, model, date, gendered: gendered || "NONE" });
  }
  return out;
}
export function saveCache(map, path = CACHE) {
  const rows = [...map].sort((a, b) => `${a[1].lang}${a[1].id}`.localeCompare(`${b[1].lang}${b[1].id}`));
  writeFileSync(path, "# key (hash of the night's written text)\tid\tlang\tverdict (NONE, or line:ref list)\tmodel\tdate\tgendered (NONE, or line:word list)\n" +
    rows.map(([k, v]) => [k, v.id, v.lang, v.verdict, v.model, v.date, v.gendered || "NONE"].join("\t")).join("\n") + "\n");
}
export function probedModels(path = PROBE) {
  if (!existsSync(path)) return new Set();
  const p = JSON.parse(readFileSync(path, "utf8"));
  return new Set(Object.entries(p.models || {}).filter(([, r]) => r.pass).map(([m]) => m));
}

/** The gate's check value for one night, from the record. Pure. */
export function verseReadCheck(n, cache, trusted) {
  const r = cache.get(textKey(writtenLines(n)));
  if (!r) return "fail: no verse read for this text yet (held until verse-read.mjs read runs; a model outage never passes)";
  if (!trusted.has(r.model)) return `fail: verse read by ${r.model}, which has not passed the probe`;
  return r.verdict === "NONE" ? "pass" : `fail: the verse read found Bible wording: ${r.verdict}`;
}

/** Spanish nights: the same read names any line that assumes the listener's gender. Pure. */
export function genderReadCheck(n, cache, trusted) {
  const r = cache.get(textKey(writtenLines(n)));
  if (!r || !trusted.has(r.model)) return "fail: no trusted read for this text yet (held)";
  return r.gendered === "NONE" ? "pass" : `fail: assumes the listener's gender: ${r.gendered}`;
}

/** Read one night: ask(prompt) -> answer text. Returns the record row, or null (held) on any failure. */
export async function readNight(n, ask) {
  const lines = writtenLines(n);
  let res;
  try { res = await ask(prompt(lines)); } catch { return null; }
  const found = parseAnswer(res?.text, lines.length);
  if (!found) return null;
  const list = (xs, f) => (xs.length ? xs.map((x) => `${x.n}:${x[f]}`).join("; ") : "NONE");
  return { key: textKey(lines), row: { id: n.id, lang: n.lang, verdict: list(found.verses, "ref"), gendered: n.lang === "es" ? list(found.gendered, "word") : "NONE",
    model: res.model, date: new Date().toISOString().slice(0, 10) } };
}

// ---------------------------------------------------------------- the probe
// The review's 8 Spanish lines (NVI or plain wording; every one passed the n-gram checks), English verses
// in modern wording, and clean lines from the nights themselves. A model passes only if it names every verse
// line and none of the clean ones.
export const PROBE_VERSES = [
  "El Señor es mi pastor, nada me falta.",
  "Vengan a mí todos ustedes que están cansados y agobiados, y yo les daré descanso.",
  "Al acostarte, no tendrás temor alguno; te acostarás y dormirás tranquilo.",
  "En paz me acuesto y me duermo, porque solo tú, Señor, me haces vivir confiado.",
  "La paz les dejo; mi paz les doy. No se angustien ni se acobarden.",
  "El amor es paciente, es bondadoso.",
  "No te preocupes por el mañana, a cada día le basta su propio afán.",
  "Todo lo que pidas, cree que ya lo recibiste, y lo tendrás.",
  "Come to me, all you who are weary and burdened, and I will give you rest.",
  "In peace I will lie down and sleep, for you alone make me dwell in safety.",
  "Do not worry about tomorrow, for tomorrow will worry about itself.",
  "Whatever you ask for in prayer, believe that you have received it, and it will be yours.",
];
// Spanish lines that assume the listener's gender (from the review's 14 edits) and their neutral rewrites.
export const PROBE_GENDERED = [
  "Si sigues despierto, no pasa nada.",
  "Y hay otras en que despertamos ligeros.",
  "Vamos a entrar juntos, en tu imaginación.",
  "Felicidades. Gracias. Bienvenido a casa.",
  "Muchos nos hablamos en la noche de una forma dura.",
];
export const PROBE_CLEAN = [
  "Si el sueño todavía no llega, no pasa nada.",
  "Y hay otras en que despertamos con ligereza.",
  "Felicidades. Gracias. Qué gusto tenerte en casa.",
  "Siente cómo se afloja el pecho. Cómo se suelta el estómago.",
  "Deja que el sueño llegue cuando llegue. No hay prisa.",
  "Imagina una tarde, dentro de unas semanas. El deseo ya se cumplió.",
  "Esto es imaginación y sentimiento, no una promesa.",
  "Feel your feet getting heavy. Your legs. Your back sinking into the mattress.",
  "Let the scene stay with you as you drift.",
];
export async function probe(ask) {
  const lines = [...PROBE_VERSES, ...PROBE_GENDERED, ...PROBE_CLEAN];
  const res = await ask(prompt(lines));
  const found = parseAnswer(res?.text, lines.length);
  const verse = new Set((found?.verses || []).map((x) => x.n)), gend = new Set((found?.gendered || []).map((x) => x.n));
  const V = PROBE_VERSES.length, G = PROBE_GENDERED.length;
  const missed = [...PROBE_VERSES.filter((_, i) => !verse.has(i + 1)), ...PROBE_GENDERED.filter((_, i) => !gend.has(V + i + 1))];
  const falsePos = PROBE_CLEAN.filter((_, i) => verse.has(V + G + i + 1) || gend.has(V + G + i + 1));
  return { model: res?.model, pass: !!found && !missed.length && !falsePos.length, missed, false_positives: falsePos, answer: found };
}

async function main() {
  const cmd = process.argv[2];
  const { gemini } = await import("./draft.mjs");
  const ask = (p) => gemini(p, 0);
  if (cmd === "probe") {
    const r = await probe(ask);
    const p = existsSync(PROBE) ? JSON.parse(readFileSync(PROBE, "utf8")) : { cases: {}, models: {} };
    p.cases = { verses: PROBE_VERSES, gendered: PROBE_GENDERED, clean: PROBE_CLEAN };
    p.models[r.model] = { pass: r.pass, date: new Date().toISOString().slice(0, 10), missed: r.missed, false_positives: r.false_positives };
    writeFileSync(PROBE, JSON.stringify(p, null, 1) + "\n");
    console.log(`OUTPUT verse-read probe: ${r.model} ${r.pass ? "PASS" : "FAIL"}; missed ${r.missed.length}, false positives ${r.false_positives.length}`);
    process.exit(r.pass ? 0 : 1);
  }
  if (cmd === "read") {
    const { nights } = await import("./library.mjs");
    const cache = loadCache(), trusted = probedModels();
    let read = 0, held = 0, found = 0;
    for (const n of nights()) {
      const key = textKey(writtenLines(n)), have = cache.get(key);
      if (have && trusted.has(have.model)) continue;
      const r = await readNight(n, ask);
      if (!r || !trusted.has(r.row.model)) { held++; console.log(`HELD ${n.lang}/${n.id}: no usable read (model out, unprobed or unparsable)`); continue; }
      cache.set(r.key, r.row);
      read++;
      if (r.row.verdict !== "NONE") { found++; console.log(`FOUND ${n.lang}/${n.id}: ${r.row.verdict}`); }
    }
    saveCache(cache);
    console.log(`OUTPUT verse read: ${read} nights read, ${found} with Bible wording, ${held} held`);
    if (!read && held) { console.error("NAMED STOP [VERSE_READ_NO_MODEL] no night could be read; they stay held"); process.exit(9); }
    return;
  }
  console.error("usage: verse-read.mjs read|probe");
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(9); });
