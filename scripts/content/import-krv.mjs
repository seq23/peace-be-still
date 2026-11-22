#!/usr/bin/env node
// Imports 개역한글판 (the Korean Revised Version, 대한성서공회 번역, 1961) into the repo's verse-per-line
// store, content/bible/krv_vpl.txt.gz, the same shape as the KJV and RV1909 files.
//
// Why this text: the Korean Bible Society's own copyright table lists 개역한글판 (1961) as expired on
// 31 Dec 2011 (bskorea.or.kr subpage2_3_4_1, read 21 Nov 2026), and its one condition is integrity and
// attribution: the text unaltered, credited as 개역한글판 (대한성서공회 번역, 1961).
// Why this source: the Society's own online reader (version=HAN), so the words are the publisher's, in
// the 1961 spelling ("볼찌어다", "세례"). Two other copies were rejected on 21 Nov 2026: eBible's "kor"
// changes the punctuation, and Korean Wikisource's 개역한글판 is a modified edition ("침례" for "세례"
// 83 times, modernised spelling, words changed in JER 33 and LAM 3, Psalm 72:20 merged).
// Only verse text is kept: psalm titles, headings and footnotes (the reader's popup notes) are not.
//
// Run: node scripts/content/import-krv.mjs   (about 20 minutes: 1,189 chapters, one request at a time)
// It writes the store and content/bible/krv_source.json (verse count, sha256, the fetch date).
import { writeFileSync, readFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { CONTENT } from "./lib.mjs";

const READER = "https://www.bskorea.or.kr/bible/korbibReadpage.php?version=HAN";
const UA = "Mozilla/5.0 (peace-be-still scripture import; one request at a time)";
// Repo book code → the reader's book code.
export const KBS_BOOK = {
  GEN: "gen", EXO: "exo", LEV: "lev", NUM: "num", DEU: "deu", JOS: "jos", JDG: "jdg", RUT: "rut", "1SA": "1sa",
  "2SA": "2sa", "1KI": "1ki", "2KI": "2ki", "1CH": "1ch", "2CH": "2ch", EZR: "ezr", NEH: "neh", EST: "est", JOB: "job",
  PSA: "psa", PRO: "pro", ECC: "ecc", SOL: "sng", ISA: "isa", JER: "jer", LAM: "lam", EZE: "ezk", DAN: "dan", HOS: "hos",
  JOE: "jol", AMO: "amo", OBA: "oba", JON: "jnh", MIC: "mic", NAH: "nam", HAB: "hab", ZEP: "zep", HAG: "hag",
  ZEC: "zec", MAL: "mal", MAT: "mat", MAR: "mrk", LUK: "luk", JOH: "jhn", ACT: "act", ROM: "rom", "1CO": "1co",
  "2CO": "2co", GAL: "gal", EPH: "eph", PHI: "php", COL: "col", "1TH": "1th", "2TH": "2th", "1TI": "1ti", "2TI": "2ti",
  TIT: "tit", PHM: "phm", HEB: "heb", JAM: "jas", "1PE": "1pe", "2PE": "2pe", "1JO": "1jn", "2JO": "2jn", "3JO": "3jn",
  JUD: "jud", REV: "rev",
};

const ENT = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
// One chapter page → [[verse, text, last], ...]. Each verse is <span><span class="number">N&nbsp;…</span>…</span>;
// where 개역한글 joins verses into one sentence the reader prints "12-13": stored once, under its first
// verse (last = 13), as printed, never split by guesswork;
// footnote markers (<a class=comment>…</a>) and their popups (<div class=D2>…</div>) are removed, then
// every tag; the words are kept exactly. Pure.
export function parseChapter(html, where = "?") {
  const body = html.slice(html.indexOf('id="tdBible1"'));
  if (body.length < 20) throw new Error(`NAMED STOP [KRV_PARSE] ${where}: no reader text`);
  const out = [];
  const re = /<span class="number">(\d+)(?:-(\d+))?(?:&nbsp;)*\s*<\/span>([\s\S]*?)(?=<span(?: style="[^"]*")?><span class="number">|<\/div>\s*<\/div>|$)/g;
  for (const m of body.matchAll(re)) {
    const text = m[3]
      .replace(/<a class=comment[\s\S]*?<\/a>/g, "")
      .replace(/<div[^>]*class=D2[\s\S]*?<\/div>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z#0-9]+;/g, (e) => ENT[e] ?? e)
      .replace(/\s+/g, " ")
      .trim();
    out.push([Number(m[1]), text, Number(m[2] || m[1])]);
  }
  if (!out.length) throw new Error(`NAMED STOP [KRV_PARSE] ${where}: no verses`);
  return out;
}

async function page(book, chap) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${READER}&book=${book}&chap=${chap}`, { headers: { "user-agent": UA } });
    if (res.ok) return res.text();
    if (res.status !== 429 && res.status < 500) throw new Error(`NAMED STOP [KRV_FETCH] ${book} ${chap}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
  }
  throw new Error(`NAMED STOP [KRV_FETCH] ${book} ${chap}: gave up after 6 tries`);
}

async function main() {
  // Chapter counts from the stored KJV (the same 66 books and, chapter for chapter, the same chapters).
  const kjv = gunzipSync(readFileSync(join(CONTENT, "bible", "kjv_vpl.txt.gz"))).toString("utf8");
  const chapters = {};
  for (const m of kjv.matchAll(/^([1-4A-Z]{3}) (\d+):/gm)) chapters[m[1]] = Math.max(chapters[m[1]] || 0, +m[2]);
  const lines = [];
  const joined = [];
  for (const [code, book] of Object.entries(KBS_BOOK)) {
    for (let c = 1; c <= chapters[code]; c++) {
      for (const [v, t, last] of parseChapter(await page(book, c), `${code} ${c}`)) {
        lines.push(`${code} ${c}:${v} ${t}`);
        if (last !== v) joined.push(`${code} ${c}:${v}-${last}`);
      }
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  if (lines.length < 31000) throw new Error(`NAMED STOP [KRV_SHORT] only ${lines.length} verses`);
  const body = lines.join("\n") + "\n";
  const sha256 = createHash("sha256").update(body).digest("hex");
  writeFileSync(join(CONTENT, "bible", "krv_vpl.txt.gz"), gzipSync(Buffer.from(body), { level: 9, mtime: 0 }));
  writeFileSync(join(CONTENT, "bible", "krv_source.json"), JSON.stringify({
    name: "개역한글판", credit: "개역한글판 (대한성서공회 번역, 1961)", source: `${READER}&book=<book>&chap=<chapter>`,
    status: "Korean Bible Society: copyright term expired 2011-12-31 (bskorea.or.kr/bbs/content.php?co_id=subpage2_3_4_1, read 2026-11-21)",
    fetched: new Date().toISOString().slice(0, 10), verses: lines.length, sha256,
    joined_note: "개역한글 prints these verse pairs as one verse; stored under the first number, as printed",
    joined,
  }, null, 1) + "\n");
  console.log(`OUTPUT import-krv: ${lines.length} verses, sha256 ${sha256.slice(0, 12)}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
