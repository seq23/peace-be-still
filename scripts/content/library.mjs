#!/usr/bin/env node
// The launch library: build JSON from content/src, run the QUALITY.md code checks, record the
// two Claude passes (pastor + cultural reader) from content/src/reviews, and set status.
//
//   node scripts/content/library.mjs build      # content/src -> content/<kind>/<lang>/*.json (scripture filled from the stored text)
//   node scripts/content/library.mjs check      # CI gate: re-check every JSON, prove it is built from src, OUTPUT line
//   node scripts/content/library.mjs --self-test # negative proof: one good and one bad item per hard check
//
// An item is `passed` only when every code check passes (notes allowed) AND both Claude passes say pass.
// Exit 3 QUALITY_GATE_EMPTY when zero items were examined (Rule 0). Exit 1 on any inconsistency.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CONTENT, verses, label, words, pauses, TRANSLATION, parseRef } from "./lib.mjs";
import { GATE_VERSION, checkStory, checkPsalmNight, checkImaginationNight, checkDeclaration, isFail } from "./rules.mjs";

const SRC = join(CONTENT, "src");
const KINDS = {
  // Stories come in three tellings (owner 18 Nov 2026): plain (everyone, English), hush-harbor (Black church voice, English), mi-refugio (Spanish).
  story: { dir: "stories", langs: ["plain", "hush-harbor", "mi-refugio"] },
  "psalm-night": { dir: "psalm-nights", langs: ["en", "es"] },
  "imagination-night": { dir: "imagination-nights", langs: ["en"] },
  declaration: { dir: "morning-word", langs: ["en", "es"] },
};
const TELLING_LANG = { plain: "en", "hush-harbor": "en", "mi-refugio": "es" };
const langOf = (kind, l) => (kind === "story" ? TELLING_LANG[l] : l);
const JOURNEY = { story: { plain: "gods-word", "hush-harbor": "hush-harbor", "mi-refugio": "mi-refugio" }, "psalm-night": { en: "psalm-nights", es: "mi-refugio" }, "imagination-night": { en: "imagination-nights" }, declaration: { en: "morning-word", es: "mi-refugio" } };
const AI_LABEL = { story: "label.ai_retold_checked", "psalm-night": "label.ai_voice_checked", "imagination-night": "label.ai_written_voice_checked", declaration: "label.ai_written_checked" };

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const srcFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".txt")).sort().map((f) => join(dir, f)) : []);

// ------------------------------------------------------------------ source parsing
// === id | title      then  key: value  lines. N:/S: lines keep their order.
export function parseItems(text) {
  const items = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || line.startsWith("#")) continue;
    const h = line.match(/^===\s*(\S+)\s*(?:\|\s*(.*))?$/);
    if (h) { cur = { id: h[1], title: (h[2] || "").trim(), fields: {}, seq: [] }; items.push(cur); continue; }
    const m = line.match(/^([a-z0-9_]+):\s?(.*)$/i);
    if (!cur || !m) throw new Error(`SRC_PARSE cannot read line: ${line.slice(0, 80)}`);
    const [, k, v] = m;
    cur.seq.push([k, v.trim()]);
    (cur.fields[k] ||= []).push(v.trim());
  }
  return items;
}
const one = (it, k, d) => (it.fields[k] ? it.fields[k][0] : d);

function passage(ref, lang) {
  const tr = TRANSLATION[lang];
  return { ref, label: label(ref, lang), translation: tr, verses: verses(ref, tr) };
}

// ------------------------------------------------------------------ reviews
// content/src/reviews/<kind>-<lang>.tsv: id(or a..b range) TAB pastor TAB pastor_note TAB cultural TAB cultural_note [TAB rewritten_note]
function loadReviews(kind, lang, ids) {
  const out = {};
  const txt = read(join(SRC, "reviews", `${KINDS[kind].dir}-${lang}.tsv`));
  for (const line of txt.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [key, pv, pn, cv, cn, rw] = line.split("\t");
    const r = { pastor: { verdict: pv, note: pn }, cultural: { verdict: cv, note: cn }, rewritten: rw || null };
    for (const v of [pv, cv]) if (!["pass", "rewrite", "never-ship"].includes(v)) throw new Error(`REVIEW_BAD_VERDICT ${key} ${v}`);
    if (key.includes("..")) {
      const [a, z] = key.split("..");
      const ia = ids.indexOf(a), iz = ids.indexOf(z);
      if (ia < 0 || iz < ia) throw new Error(`REVIEW_BAD_RANGE ${key}`);
      for (const id of ids.slice(ia, iz + 1)) out[id] = r;
    } else out[key] = r;
  }
  return out;
}

const REVIEW_DATE = "2026-11-18";
// Free-model first drafts (scripts/content/draft.mjs): which route drafted a piece and how much of it Claude changed.
const DRAFT_LOG = Object.fromEntries(read(join(SRC, "drafts", "log.tsv")).split("\n").filter((l) => l && !l.startsWith("#")).map((l) => {
  const [id, , , model, at, share, note] = l.split("\t");
  return [id, { route: "gemini-free", model, drafted_at: at, changed_share: share === "" ? null : +share, note: note || "First draft by the free model; Claude did the pastor and cultural read and edited it." }];
}));
function finalize(item, checks, review) {
  const failed = Object.entries(checks).filter(([, v]) => isFail(v));
  const final = review ? { reviewer: "claude", date: REVIEW_DATE, pastor: review.pastor, cultural: review.cultural, verdict: review.pastor.verdict === "pass" && review.cultural.verdict === "pass" ? "pass" : [review.pastor.verdict, review.cultural.verdict].includes("never-ship") ? "never-ship" : "rewrite" } : null;
  item.qa = {
    gate_version: GATE_VERSION,
    checks,
    first_reader: DRAFT_LOG[item.id] || { route: "none", note: "Drafted and read by Claude in the landing session; no free-model draft (QA_NO_FREE_MODEL not needed)." },
    final,
    rewritten: review?.rewritten || null,
    person_read: false,
  };
  item.status = failed.length ? "held" : !final ? "draft" : final.verdict === "pass" ? "passed" : final.verdict === "never-ship" ? "never-ship" : "draft";
  if (failed.length) item.qa.held_because = failed.map(([k, v]) => `${k}: ${v}`);
  return item;
}


// A verse voiced by a character carries only that character's words: the verse is cut (verbatim)
// at each speech boundary; narration goes to the narrator. Source modifiers on an S: line:
//   whole            the verse is all speech (no cut)
//   after "phrase"   speech starts after this exact phrase (instead of the first introducer)
//   until "phrase"   speech stops before this phrase; the rest of the verse is narration (another speaker)
const INTRO = {
  en: /\b(?:said|saith|say|saying|answered|spake|cried)(?: moreover)?(?: (?:the |his )?[A-Za-z-]+(?: of [A-Z][a-z]+)?)?(?: (?:unto|to|before|one to) [^,:;]{1,40})?,\s+/,
  es: /\b(?:dijo|dijeron|dice|dicen|dec[íi]a|dec[íi]an|respondi[óo]|respondieron|respond[íi]a|habl[óo]|diciendo|clam[óo]|clamaron|a[ñn]adi[óo])\b[^:.]{0,80}:\s+/,
};
const RESUME = {
  en: /[.?!:;,]\s+(?=(?:[Aa]nd|Then|But|So) (?:he|she|they|his|her|the|[A-Z][a-z]+)\b[^,]{0,40}?\b(?:said|saith|answered|came|could|cried|spake)\b)/,
  es: /[.?!:;,]\s+(?=(?:Y|y|Entonces|Mas) [^,:]{0,40}?\b(?:dijo|dijeron|respondi[óo]|respondieron|clamaron|vinieron|llegaron|pudieron)\b)/,
};
function cutVerse(text, speaker, lang, after) {
  const out = [];
  let pos = 0, first = true;
  while (pos < text.length) {
    let start;
    if (first && after) {
      const i = text.indexOf(after);
      if (i < 0) return null;
      start = i + after.length;
    } else {
      const m = text.slice(pos).match(INTRO[lang]);
      if (!m) { if (first) return [{ speaker, text }]; out.push({ speaker: "narrator", text: text.slice(pos) }); break; }
      start = pos + m.index + m[0].length;
      let again;
      while ((again = text.slice(start).match(INTRO[lang])) && again.index === 0) start += again[0].length;
      const lead = text.slice(start).match(/^(?:and )?(?:said|saying)\b[^,]*,\s+/i);
      if (lead) start += lead[0].length;
    }
    first = false;
    if (start > pos) out.push({ speaker: "narrator", text: text.slice(pos, start) });
    const r = text.slice(start).match(RESUME[lang]);
    const stop = r ? start + r.index + r[0].length : text.length;
    out.push({ speaker, text: text.slice(start, stop) });
    pos = stop;
  }
  return out;
}
export function speechSegments(vs, speaker, lang, mods, id = "") {
  return vs.flatMap(({ v, text }) => {
    if (speaker === "narrator" || mods.whole) return [{ v, speaker, text }];
    let head = text, tail = "";
    if (mods.until) {
      const i = text.indexOf(mods.until);
      if (i < 0) throw new Error(`SRC_SPLIT ${id}: until "${mods.until}" not in ${v}`);
      head = text.slice(0, i); tail = text.slice(i);
    }
    const parts = cutVerse(head, speaker, lang, mods.after);
    if (!parts) throw new Error(`SRC_SPLIT ${id}: after "${mods.after}" not in ${v}`);
    if (tail) parts.push({ speaker: "narrator", text: tail });
    return parts.map((x) => ({ v, speaker: x.speaker, text: x.text.trim() })).filter((x) => x.text);
  });
}

// ------------------------------------------------------------------ builders
function buildStory(it, telling) {
  const lang = TELLING_LANG[telling] || telling;
  const cast = (it.fields.cast?.[0] || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => { const [id, name, age, gender] = s.split("|").map((x) => x.trim()); return { id, name, age, gender }; });
  const blocks = it.seq.filter(([k]) => k === "N" || k === "S" || k === "C").map(([k, v]) => {
    if (k === "N") return { type: "retelling", speaker: "narrator", text: v };
    if (k === "C") return { type: "call_response", speaker: "narrator", text: v, pauses: [...v.matchAll(/\[PAUSE (\d+)s \| screen: "([^"]+)"\]/g)].map((m) => ({ seconds: +m[1], screen: m[2] })) };
    const m = v.match(/^(\S+ \d+:\d+(?:-\d+)?)\s*(?:@(\S+))?\s*(.*)$/);
    if (!m) throw new Error(`SRC_SCRIPTURE ${it.id}: ${v}`);
    const mods = { whole: /\bwhole\b/.test(m[3]), after: (m[3].match(/after "([^"]+)"/) || [])[1], until: (m[3].match(/until "([^"]+)"/) || [])[1] };
    const p = passage(m[1], lang), speaker = m[2] || "narrator";
    return { type: "scripture", speaker, ...p, segments: speechSegments(p.verses, speaker, lang, mods, it.id) };
  });
  const refs = one(it, "passage", "").split(";").map((s) => s.trim()).filter(Boolean);
  const spoken = blocks.map((b) => (b.type === "scripture" ? b.verses.map((v) => v.text).join(" ") : b.text.replace(/\[PAUSE[^\]]*\]/g, " "))).join(" ");
  const n = words(spoken).length;
  const quiet = blocks.filter((b) => b.pauses).reduce((a, b) => a + b.pauses.reduce((x, p) => x + p.seconds, 0), 0);
  return {
    id: it.id, kind: "story", telling, journey: JOURNEY.story[telling], door: "gods-word", lang, title: it.title,
    passage: { refs, label: refs.map((r) => label(r, lang)).join("; ") },
    shelf: one(it, "shelf", "adult"), content: { violence: one(it, "violence", "none"), sexual: one(it, "sexual", "none") },
    ai_label: AI_LABEL.story, cast, framing_names: [], blocks,
    illustration: { status: "none", file: null, qa: null },
    words: n, est_seconds: Math.round((n / 110) * 60 + quiet),
  };
}

function shared(items) {
  return Object.fromEntries(items.filter((i) => i.id.startsWith("_")).map((i) => [i.id.slice(1), (i.fields.text || []).join("\n\n")]));
}

function buildPsalmNight(it, lang, parts) {
  const main = one(it, "main", "").split(";").map((s) => s.trim()).filter(Boolean);
  const comp = one(it, "companions", "").split(";").map((s) => s.trim()).filter(Boolean);
  const para = (k) => (it.fields[k] || []).join("\n\n");
  const rest = one(it, "rest", "");
  const restText = parts[rest] ?? rest;
  if (!restText) throw new Error(`SRC_REST ${it.id}`);
  const seg = (part, text) => ({ part, speaker: "narrator", text });
  const pas = (r) => ({ part: "passage", speaker: "narrator", ...passage(r, lang) });
  const segments = [seg("welcome", para("welcome")), ...main.map(pas), seg("reflect", para("reflect1")), ...comp.map(pas), seg("reflect", para("reflect2")), ...main.map(pas), seg("rest", restText)];
  const all = segments.map((s) => (s.part === "passage" ? s.verses.map((v) => v.text).join(" ") : s.text)).join(" ");
  const nverses = segments.filter((s) => s.part === "passage").reduce((a, s) => a + s.verses.length, 0);
  const nparas = segments.filter((s) => s.part !== "passage").reduce((a, s) => a + s.text.split("\n\n").length, 0);
  const n = words(all).length;
  return {
    id: it.id, kind: "psalm-night", journey: JOURNEY["psalm-night"][lang], door: "gods-word", lang, title: it.title, main, companions: comp,
    ai_label: AI_LABEL["psalm-night"], segments, words: n, rest_part: parts[rest] ? rest : null,
    pacing: { words_per_minute: 100, quiet_between_verses_s: 1.5, quiet_between_paragraphs_s: 4 },
    est_seconds: Math.round((n / 100) * 60 + 1.5 * nverses + 4 * nparas + pauses(all)),
  };
}

function buildImaginationNight(it, lang, parts) {
  const ref = (k) => { const v = one(it, k, ""); return parts[v] ?? v; };
  const seg = (part, text) => ({ part, speaker: "narrator", text });
  const segments = [seg("settle", ref("settle")), seg("teaching", (it.fields.teaching || []).join("\n\n")), seg("scene", (it.fields.scene || []).join("\n\n")), seg("close", ref("close"))];
  const all = segments.map((s) => s.text).join("\n\n");
  const n = words(all).length;
  return {
    id: it.id, kind: "imagination-night", journey: "imagination-nights", door: "mindset", lang, title: it.title, theme: one(it, "theme", ""),
    scripture_woven: false, ai_label: AI_LABEL["imagination-night"], segments, words: n,
    shared_parts: { settle: one(it, "settle", ""), close: one(it, "close", "") },
    pacing: { words_per_minute: 100, pause_marker: "[pause N] = N seconds of quiet", quiet_between_paragraphs_s: 2 },
    est_seconds: Math.round((n / 100) * 60 + pauses(all) + 2 * all.split("\n\n").length),
  };
}

function buildDeclarations(text, lang) {
  const items = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [day, ref, decl] = line.split("|").map((s) => s.trim());
    if (!decl) throw new Error(`SRC_DECLARATION ${line.slice(0, 60)}`);
    const p = passage(ref, lang);
    const n = words(p.verses.map((v) => v.text).join(" ") + " " + decl).length;
    items.push({ id: `mw-${String(day).padStart(3, "0")}`, day: +day, speaker: "narrator", ...p, declaration: decl, words: n, est_seconds: Math.round((n / 130) * 60 + 1) });
  }
  return items;
}

// ------------------------------------------------------------------ build all
export function buildAll() {
  const out = []; // {path, json}
  const summary = {};
  const add = (kind, lang, item, checks, review) => {
    finalize(item, checks, review);
    const s = (summary[`${kind}/${lang}`] ||= { passed: 0, held: 0, draft: 0, "never-ship": 0, rewritten: 0, held_ids: [] });
    s[item.status]++;
    if (item.qa.rewritten) s.rewritten++;
    if (item.status !== "passed") s.held_ids.push(`${item.id}(${item.status}${item.qa.held_because ? ": " + item.qa.held_because[0] : ""})`);
  };
  for (const [kind, { dir, langs }] of Object.entries(KINDS)) {
    for (const lang of langs) {
      const sdir = join(SRC, dir, lang);
      if (kind === "declaration") {
        const txt = srcFiles(sdir).map(read).join("\n");
        if (!txt.trim()) continue;
        const items = buildDeclarations(txt, lang);
        const rv = loadReviews(kind, lang, items.map((i) => i.id));
        for (const d of items) add(kind, lang, d, checkDeclaration(d, lang), rv[d.id]);
        out.push({ path: join(CONTENT, dir, `${lang}.json`), json: { kind, journey: JOURNEY[kind][lang], door: "gods-word", lang, ai_label: AI_LABEL[kind], items } });
        continue;
      }
      const all = srcFiles(sdir).flatMap((f) => parseItems(read(f)));
      const parts = shared(all);
      const items = all.filter((i) => !i.id.startsWith("_"));
      const rv = loadReviews(kind, lang, items.map((i) => i.id));
      for (const it of items) {
        const item = kind === "story" ? buildStory(it, lang) : kind === "psalm-night" ? buildPsalmNight(it, langOf(kind, lang), parts) : buildImaginationNight(it, lang, parts);
        const checks = kind === "story" ? checkStory(item) : kind === "psalm-night" ? checkPsalmNight(item) : checkImaginationNight(item);
        add(kind, lang, item, checks, rv[it.id]);
        out.push({ path: join(CONTENT, dir, lang, `${it.id}.json`), json: item });
      }
    }
  }
  return { out, summary };
}

const ser = (j) => JSON.stringify(j, null, 1) + "\n";

function outputLine(summary) {
  const parts = Object.entries(summary).map(([k, s]) => `${k} ${s.passed} passed/${s.held} held/${s.draft} draft/${s["never-ship"]} never-ship/${s.rewritten} rewritten`);
  const total = Object.values(summary).reduce((a, s) => a + s.passed + s.held + s.draft + s["never-ship"], 0);
  const held = Object.values(summary).flatMap((s) => s.held_ids);
  return { total, line: `OUTPUT library: ${total} checked; ${parts.join("; ")}${held.length ? `; not passed: ${held.join(", ")}` : ""}` };
}

function listJson() {
  const files = [];
  for (const { dir, langs } of Object.values(KINDS)) {
    for (const lang of langs) {
      const d = join(CONTENT, dir, lang);
      if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith(".json")) files.push(join(d, f));
      const one = join(CONTENT, dir, `${lang}.json`);
      if (existsSync(one)) files.push(one);
    }
  }
  return files.sort();
}

function cmdBuild() {
  const { out, summary } = buildAll();
  for (const { dir, langs } of Object.values(KINDS)) for (const lang of langs) rmSync(join(CONTENT, dir, lang), { recursive: true, force: true });
  for (const { path, json } of out) { mkdirSync(join(path, ".."), { recursive: true }); writeFileSync(path, ser(json)); }
  const { total, line } = outputLine(summary);
  writeFileSync(join(CONTENT, "MANIFEST.json"), ser({ gate_version: GATE_VERSION, summary }));
  console.log(line);
  if (!total) { console.error("QUALITY_GATE_EMPTY no items in content/src"); process.exit(3); }
}

function cmdCheck() {
  const { out, summary } = buildAll();
  const { total, line } = outputLine(summary);
  const problems = [];
  const want = new Map(out.map((o) => [o.path, ser(o.json)]));
  const have = listJson();
  for (const p of have) if (!want.has(p)) problems.push(`STALE ${p} is not built from content/src`);
  for (const [p, s] of want) if (read(p) !== s) problems.push(`STALE ${p} differs from a fresh build (run: node scripts/content/library.mjs build)`);
  // An item marked passed must hold a complete qa record (S15) and both Claude passes.
  for (const { json } of out) {
    for (const it of json.items || [json]) {
      if (it.status !== "passed") continue;
      const q = it.qa;
      if (!q?.gate_version || !q.checks || !q.final || q.final.pastor?.verdict !== "pass" || q.final.cultural?.verdict !== "pass" || Object.values(q.checks).some(isFail)) problems.push(`S15 ${it.id} passed without a complete qa record`);
    }
  }
  console.log(line);
  if (!total) { console.error("QUALITY_GATE_EMPTY 0 items examined"); process.exit(3); }
  if (problems.length) { console.error(problems.slice(0, 20).join("\n")); process.exit(1); }
}

// ------------------------------------------------------------------ self-test (negative proof)
function selfTest() {
  const good = parseItems(`=== t-good | Peace, Be Still
passage: MAR 4:35-41
shelf: adult
cast: disciples|the disciples|adult|group
N: The day was done, and the lake lay wide and dark. Jesus said they should cross over to the other side.
N: A great storm of wind came up. The waves beat into the boat, and it was now full.
S: MAR 4:38 @disciples
S: MAR 4:39
C: When I say God is good, you say, all the time. God is good. [PAUSE 3s | screen: "All the time"] And all the time. [PAUSE 3s | screen: "God is good"] He was good in that boat.
N: The same voice that spoke to the sea still calls to the frightened heart.
`)[0];
  const mk = (patch) => { const s = buildStory(good, "hush-harbor"); patch(s); return checkStory(s); };
  const base = mk(() => {});
  const failing = Object.entries(base).filter(([, v]) => isFail(v)).filter(([k]) => k !== "S11_length");
  if (failing.length) throw new Error(`SELFTEST good story fails: ${JSON.stringify(failing)}`);
  const cases = [
    ["S01_word_for_word", (s) => { s.blocks[3].verses[0].text = s.blocks[3].verses[0].text.replace("Peace, be still", "Be calm"); }],
    ["S01_quoted_runs", (s) => { s.blocks[0].text += ' He said, "Let us go over unto the other side now."'; }],
    ["S01_typed_scripture", (s) => { s.blocks[0].text += " And the wind ceased, and there was a great calm."; }],
    ["S02_no_refs_in_retelling", (s) => { s.blocks[0].text += " As Mark 4:39 says."; }],
    ["S06_mindset", (s) => { s.blocks[0].text += " Align your energy."; }],
    ["S07_promises", (s) => { s.blocks[0].text += " God will heal your body tonight."; }],
    ["S05_redlines", (s) => { s.blocks[0].text += " God is telling you tonight to rest."; }],
    ["S08_voice_code", (s) => { s.blocks[0].text += " Dey was finna sink."; }],
    ["S14_never_words", (s) => { s.title = "Black  Bible\nStories"; }],
    ["S09_names", (s) => { s.cast.push({ id: "peter", name: "Pete", age: "adult", gender: "m" }); }],
    ["speakers", (s) => { s.cast.push({ id: "god", name: "God", age: "adult", gender: "m" }); }],
    ["speakers", (s) => { s.blocks[2].speaker = "nobody"; }],
    ["S10_shelf", (s) => { s.passage.refs = ["JDG 19:1-3"]; }],
    ["S10_shelf", (s) => { delete s.content.violence; }],
    ["S13_ai_label", (s) => { delete s.ai_label; }],
    ["no_invented_memories", (s) => { s.blocks[0].text += " My grandmother used to hum it."; }],
    ["call_response", (s) => { s.blocks[s.blocks.length - 1].text += " Can I get an amen?"; }],
    ["call_response", (s) => { s.blocks.pop(); }],
    ["call_response", (s) => { s.blocks[s.blocks.length - 2].pauses = []; }],
    ["call_response", (s) => { s.blocks.splice(0, 0, s.blocks[s.blocks.length - 2]); }],
    ["voice_segments", (s) => { s.blocks[2].segments = [{ v: 38, speaker: "disciples", text: s.blocks[2].verses[0].text }]; }],
    ["voice_segments", (s) => { s.blocks[2].segments[1].text += " extra"; }],
  ];
  for (const [key, patch] of cases) { const c = mk(patch); if (!isFail(c[key])) throw new Error(`SELFTEST ${key} did not fail`); }
  // Spanish rules
  const es = parseItems(`=== t-es | Calla, enmudece
passage: MAR 4:35-41
cast: discipulos|los discípulos|adult|group
N: El día terminó. Jesús dijo que cruzaran al otro lado del lago.
N: Vino un viento muy fuerte. Las olas llenaban la barca.
S: MAR 4:39
N: Alguien diga amén. La misma voz que habló al mar todavía nos llama esta noche.
`)[0];
  const ses = buildStory(es, "mi-refugio");
  const okes = checkStory(ses);
  if (isFail(okes.S12_latin_american) || isFail(okes.S12_no_english) || isFail(okes.S01_word_for_word)) throw new Error(`SELFTEST good Spanish fails ${JSON.stringify(okes)}`);
  ses.blocks[0].text += " Vosotros sabéis que vale, cogedlo.";
  if (!isFail(checkStory(ses).S12_latin_american)) throw new Error("SELFTEST vosotros not caught");
  ses.blocks[0].text += " The night was long.";
  if (!isFail(checkStory(ses).S12_no_english)) throw new Error("SELFTEST English in Spanish not caught");
  // Psalm Night plan + framing
  const pn = parseItems(`=== _c1
text: Rest now.
=== t-pn | Psalm 23
main: PSA 23:1-6
companions: PSA 4:8
welcome: Welcome. Settle in.
reflect1: A shepherd knows each one by name.
reflect2: Lie down in green places.
rest: c1
`);
  const pnight = buildPsalmNight(pn[1], "en", shared(pn));
  const pc = checkPsalmNight(pnight);
  if (isFail(pc.word_for_word) || isFail(pc.plan)) throw new Error(`SELFTEST good psalm night fails ${JSON.stringify(pc)}`);
  pnight.segments[2].text += " This psalm cures insomnia.";
  if (!isFail(checkPsalmNight(pnight).no_promises)) throw new Error("SELFTEST sleep claim not caught");
  pnight.segments.reverse();
  if (!isFail(checkPsalmNight(pnight).plan)) throw new Error("SELFTEST psalm plan not caught");
  // Imagination Night: no faith words, no Neville without the line
  const inn = parseItems(`=== _s
text: Breathe. [pause 5]
=== t-in | The Porch
settle: s
teaching: Picture the end you hope for, as if it is already done.
scene: You are on a porch at dusk.
close: s
`);
  const night = buildImaginationNight(inn[1], "en", shared(inn));
  if (isFail(checkImaginationNight(night).no_faith_links) || isFail(checkImaginationNight(night).plan)) throw new Error("SELFTEST good imagination night fails");
  night.segments[1].text += " As Neville taught, and as the Bible says.";
  const ic = checkImaginationNight(night);
  if (!isFail(ic.neville) || !isFail(ic.no_faith_links)) throw new Error("SELFTEST Neville/faith link not caught");
  night.segments[2].text += " You will be rich by spring, guaranteed.";
  if (!isFail(checkImaginationNight(night).no_promises)) throw new Error("SELFTEST promise not caught");
  // Declarations
  const [d] = buildDeclarations("1 | PSA 118:24 | This is the day. I will rejoice and be glad in it.", "en");
  if (isFail(checkDeclaration(d, "en").word_for_word)) throw new Error("SELFTEST good declaration fails");
  d.verses[0].text = "This is the day the Lord has made; let us rejoice.";
  if (!isFail(checkDeclaration(d, "en").word_for_word)) throw new Error("SELFTEST NIV wording not caught");
  // Reviews gate the status
  const st = finalize(buildStory(good, "hush-harbor"), { a: "pass" }, { pastor: { verdict: "pass" }, cultural: { verdict: "rewrite", note: "x" } });
  if (st.status === "passed") throw new Error("SELFTEST one rewrite verdict still passed");
  const st2 = finalize(buildStory(good, "hush-harbor"), { a: "fail: x" }, { pastor: { verdict: "pass" }, cultural: { verdict: "pass" } });
  if (st2.status !== "held") throw new Error("SELFTEST failing check not held");
  void parseRef; void readdirSync;
  console.log(`OUTPUT library self-test: ${cases.length + 10} negative cases caught`);
}

const cmd = process.argv[2];
if (cmd === "build") cmdBuild();
else if (cmd === "check") cmdCheck();
else if (cmd === "--self-test") selfTest();
else { console.error("usage: library.mjs build|check|--self-test"); process.exit(2); }
