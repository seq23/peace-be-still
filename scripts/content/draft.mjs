#!/usr/bin/env node
// FREE-MODEL FIRST DRAFTS for the launch library (owner, 18 Nov 2026: "make sure the free model is a
// good one — prefer google"). A draft is only a starting point: Claude does the pastor + cultural
// read (QUALITY.md) and fixes it in content/src; the build pastes scripture and runs every check.
//
//   node scripts/content/draft.mjs story plain 31 40     # draft core stories 31-40, plain telling
//   node scripts/content/draft.mjs share story plain     # log how much of each draft Claude changed
//
// Routes, in order (GEMINI_TEXT_MODELS): the strongest Gemini text models the free key can call
// (probed 18 Nov 2026: every pro-class model has limit 0; gemini-4-hydrogen answers; then the newest
// full flash models; never a lite model). A per-day 429 moves to the next model. Every Gemini model
// out = NAMED STOP [NO_FREE_GEMINI] (OpenRouter/Workers AI come after it, not wired here yet).
// Raw drafts land in content/src/drafts/<kind>-<telling>/<id>.txt; the log is content/src/drafts/log.tsv
// (id, kind, telling, model, drafted_at, changed_share). A model whose drafts of one kind of piece
// Claude changes by more than 30% of sentences, or that fails a hard check twice, is dropped for it
// (DROPPED below). Run inside the Boss OS vault: npm run -s vault:run -- node <this> ...
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CONTENT, verses, label, sentences } from "./lib.mjs";

export const GEMINI_TEXT_MODELS = ["gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash"];
export const DROPPED = {}; // { "story-plain": ["model-id"] } — filled from the log by dropped()
const DRAFTS = join(CONTENT, "src", "drafts");
const LOG = join(DRAFTS, "log.tsv");
const SHARE_BAR = 0.3;

export function storyRows(md) {
  // | 31 | core-031-david-jonathan | David and Jonathan | 1SA 18:1-4; 1SA 20:35-42 | evidence |
  return md.split("\n").map((l) => l.match(/^\| (\d+) \| (core-\d{3}-[a-z0-9-]+) \| ([^|]+) \| ([^|]+) \|/)).filter(Boolean)
    .map((m) => ({ n: +m[1], id: m[2], story: m[3].trim(), refs: m[4].split(";").map((s) => s.trim()).filter(Boolean) }));
}

const RULES = {
  plain: `PLAIN TELLING (everyone; default shelf). A warm, plain, modern English narrator. No church-specific address ("Church", "y'all", "amen"), no call and response, no hymns. Calm bedtime pace; short sentences (average 18 words or fewer), grade 6-8 reading level, 500-900 words of retelling plus scripture.`,
  "hush-harbor": `HUSH HARBOR TELLING (Black church voice). Preaching cadence, warm and real, plain grammar, the church mothers' and old saints' wisdom as the community's memory (never an invented narrator memory or a named grandmother). Hymns and spirituals may be named (public domain only quoted). EXACTLY ONE call and response line (C:) at the story's turn, never the last line, in this exact shape: C: When I say God is good, you say, all the time. God is good. [PAUSE 3s | screen: "All the time"] And all the time. [PAUSE 3s | screen: "God is good"] <one tie-back sentence>. Never eye-dialect (dat, dis, dem, gon'), never slang pastiche, never the word "urban", no comic-preacher tropes, no food or poverty stereotypes.`,
};

export function storyPrompt(row, telling, example) {
  const vv = row.refs.map((r) => `${label(r, "en")}:\n` + verses(r, "KJV").map((x) => `  ${r.split(" ")[0]} ${r.split(" ")[1].split(":")[0]}:${x.v}  ${x.text}`).join("\n")).join("\n");
  return `You are drafting one Bible story retelling for a faith app's sleep library. Output ONLY the story source in the exact line format of the example. A careful human editor will review it.

FORMAT (one item):
=== ${row.id} | <title>
passage: ${row.refs.join("; ")}
shelf: adult
violence: none|mild|strong
sexual: none|implied
cast: <id>|<name>|<child|teen|adult|elder>|<m|f|group>; ...   (every character who speaks in an S: line)
N: <a paragraph of retelling>
S: <BOOK CH:V>            (a KJV verse, by reference only; the app pastes the stored text)
S: <BOOK CH:V> @<cast id>  (a verse where that character speaks; add: after "exact phrase" or until "exact phrase" when the speech starts later or stops early in the verse)

HARD RULES
- ${RULES[telling]}
- Scripture appears ONLY as S: references to verses listed below. Never type or quote verse text inside N: lines. 8-14 S: lines, spread through the story.
- Words of God or Jesus are never given to a cast id: those verses are plain S: lines (the narrator reads them). Never speak as God or Jesus in the first person in N: lines; paraphrase in the third person.
- Nothing invented: no events, people or spoken lines the passage does not give. Setting and feeling are fine ("the dust was hot"). No invented narrator memories or named narrators.
- Make the passage's own point and stop. No side on what churches split over (baptism, tongues, predestination, women preaching, Sabbath, rapture, communion, eternal security).
- No promises of outcomes: no healing, money, breakthrough or sleep promised to the listener; never "God is telling you tonight". Never tell the listener she is saved or lost.
- Never these words: manifest, universe (as a power), vibration, energy, attract, align, visualize, abundance, karma, "Speak Life", "urban". Never the words Black, Bible and Stories together.
- Bible names spelled as in the KJV. Plain words, no archaic narration (the KJV verses carry the old words).
- End on the story's truth, gently.

THE APPROVED MODEL (match its voice, pacing, structure and format exactly):
${example}

THE STORY TO DRAFT: #${row.n} "${row.story}", passage ${row.refs.join("; ")}.
THE VERSES YOU MAY REFERENCE (KJV):
${vv}
`;
}

export async function gemini(prompt, temperature = 0.7) {
  const key = process.env.PBS_GEMINI_API_KEY; // the app's own free AI Studio project, never the shared key
  if (!key) throw new Error("NAMED STOP [KEY_MISSING] PBS_GEMINI_API_KEY not set; run through npm run -s vault:run -- in ~/GitHub/boss-os");
  for (const model of GEMINI_TEXT_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature } }),
        signal: AbortSignal.timeout(300_000),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
      if (r.ok) {
        const d = await r.json();
        const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
        if (text) return { model, text };
      }
      const body = r.ok ? "" : await r.text();
      if (r.status === 429 && /quotaId/.test(body) && !/FreeTier/.test(body)) throw new Error(`NAMED STOP [NOT_FREE_TIER] ${model}'s 429 names no FreeTier quota: PBS_GEMINI_API_KEY looks billed`);
      if (r.status === 429 && /PerDay/.test(body)) break;           // this model is out today: next
      if (r.status === 429) { await new Promise((s) => setTimeout(s, 40_000)); continue; }
      if (r.status === 404 || r.status === 400 || r.status === 403) break;
      await new Promise((s) => setTimeout(s, 15_000 * (attempt + 1)));
    }
  }
  throw new Error("NAMED STOP [NO_FREE_GEMINI] every free Gemini text model is out or failing today; the next run retries");
}

function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => {
    const [id, kind, telling, model, at, share, note] = l.split("\t");
    return { id, kind, telling, model, at, share: share === "" || share === undefined ? null : +share, note: note || "" };
  });
}

function writeLog(rows) {
  mkdirSync(DRAFTS, { recursive: true });
  writeFileSync(LOG, "# id\tkind\ttelling\tmodel\tdrafted_at\tchanged_share\tnote\n" + rows.map((r) => [r.id, r.kind, r.telling, r.model, r.at, r.share ?? "", r.note || ""].join("\t")).join("\n") + "\n");
}

export function dropped(rows, kind, telling) {
  const mine = rows.filter((r) => r.kind === kind && r.telling === telling && r.share !== null);
  const by = {};
  for (const r of mine) (by[r.model] ||= []).push(r);
  return Object.entries(by).filter(([, rs]) => rs.reduce((a, r) => a + r.share, 0) / rs.length > SHARE_BAR || rs.filter((r) => /hard check/.test(r.note)).length >= 2).map(([m]) => m);
}

// The share of the draft's sentences (N:/C: lines, title and cast) that Claude's final text does not keep word for word.
export function changedShare(draft, final) {
  const sents = (t) => t.split("\n").filter((l) => /^(N|C):/.test(l)).flatMap((l) => sentences(l.slice(2).trim())).map((s) => s.trim());
  const d = sents(draft), f = new Set(sents(final));
  if (!d.length) return 1;
  return Math.round((d.filter((s) => !f.has(s)).length / d.length) * 100) / 100;
}

export function itemOf(src, id) {
  const i = src.indexOf(`=== ${id} |`);
  if (i < 0) return null;
  const j = src.indexOf("\n=== ", i + 1);
  return src.slice(i, j < 0 ? undefined : j).trim();
}

function selfTest() {
  const bad = [];
  const draft = "N: One two three. Four five six.\nS: MAR 4:39\nN: Seven eight.";
  if (changedShare(draft, draft) !== 0) bad.push("unchanged draft scored as changed");
  if (changedShare(draft, "N: One two three. Something new.\nN: Seven eight.") !== 0.33) bad.push("one of three sentences changed is not 0.33");
  const rows = [{ kind: "story", telling: "plain", model: "m1", share: 0.5, note: "" }, { kind: "story", telling: "plain", model: "m1", share: 0.2, note: "" },
                { kind: "story", telling: "plain", model: "m2", share: 0.1, note: "" }, { kind: "story", telling: "plain", model: "m3", share: 0.1, note: "hard check failed" },
                { kind: "story", telling: "plain", model: "m3", share: 0.1, note: "hard check failed" }];
  const d = dropped(rows, "story", "plain").sort().join(",");
  if (d !== "m1,m3") bad.push(`dropped ${d}, expected m1 (35% changed) and m3 (two hard-check fails)`);
  if (GEMINI_TEXT_MODELS.some((m) => /lite/.test(m))) bad.push("a lite model is on the drafting ladder");
  if (storyRows("| 31 | core-031-david-jonathan | David and Jonathan | 1SA 18:1-4; 1SA 20:35-42 | x |")[0]?.refs.length !== 2) bad.push("story row refs not parsed");
  if (bad.length) { console.error("NAMED STOP [SELF_TEST_BLIND] " + bad.join("; ")); process.exit(1); }
  console.log("OUTPUT draft self-test: 5 cases caught");
}

async function main() {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === "--self-test") return selfTest();
  const log = readLog();
  if (cmd === "story") {
    const [telling, from, to] = [a[0], +a[1], +a[2]];
    const rows = storyRows(readFileSync(join(CONTENT, "stories", "STORY_LIST.md"), "utf8")).filter((r) => r.n >= from && r.n <= to);
    if (!rows.length) { console.error("NAMED STOP [NOTHING_TO_DRAFT] no story rows in that range"); process.exit(2); }
    const example = itemOf(readFileSync(join(CONTENT, "src", "stories", telling, "001-010.txt"), "utf8"), "core-001-peace-be-still");
    const out = join(DRAFTS, `story-${telling}`);
    mkdirSync(out, { recursive: true });
    const drop = new Set(dropped(log, "story", telling));
    let made = 0;
    for (const row of rows) {
      const f = join(out, `${row.id}.txt`);
      if (existsSync(f)) continue;
      const models = GEMINI_TEXT_MODELS.filter((m) => !drop.has(m));
      if (!models.length) { console.error(`NAMED STOP [ROUTES_DROPPED] every model is dropped for story-${telling}; Claude drafts these`); break; }
      GEMINI_TEXT_MODELS.splice(0, GEMINI_TEXT_MODELS.length, ...models);
      const { model, text } = await gemini(storyPrompt(row, telling, example));
      writeFileSync(f, text.replace(/^```\w*\n?|```$/gm, "").trim() + "\n");
      log.push({ id: row.id, kind: "story", telling, model, at: new Date().toISOString().slice(0, 19), share: null, note: "" });
      writeLog(log);
      made++;
      console.log(`drafted ${row.id} with ${model}`);
    }
    console.log(`OUTPUT ${made} drafts written (story ${telling} ${from}-${to})`);
    return;
  }
  if (cmd === "share") {
    const [kind, telling] = a;
    const dir = join(CONTENT, "src", "stories", telling);
    const final = readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
    let n = 0;
    for (const r of log.filter((x) => x.kind === kind && x.telling === telling)) {
      const fin = itemOf(final, r.id), dr = readFileSync(join(DRAFTS, `${kind}-${telling}`, `${r.id}.txt`), "utf8");
      if (!fin) continue;
      r.share = changedShare(dr, fin);
      n++;
      console.log(`${r.id}\t${r.model}\tchanged ${Math.round(r.share * 100)}% of sentences`);
    }
    writeLog(log);
    console.log(`OUTPUT ${n} drafts scored; dropped for ${kind}-${telling}: ${dropped(log, kind, telling).join(", ") || "none"}`);
    return;
  }
  console.error("usage: draft.mjs story <telling> <from> <to> | share story <telling>");
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(/NAMED STOP \[NO_FREE/.test(e.message) ? 0 : 9); });
