#!/usr/bin/env node
// Imports the 1919 和合本 (官話和合譯本, the Chinese Union Version, "神" edition) into the repo's
// verse-per-line stores, the same shape as the KJV, RV1909 and 개역한글 files:
//   content/bible/cuv_vpl.txt.gz   Traditional, as printed in 1919 (the source's own characters)
//   content/bible/cuvs_vpl.txt.gz  Simplified, converted from it by OpenCC (t → cn) plus VARIANTS below
//   content/bible/zh_script.json   the Traditional-only characters (from OpenCC's own character tables),
//                                  which site/test/scripture.test.mjs checks the Simplified store and pages with
//   content/bible/cuv_source.json  the page revisions read, verse count, sha256 of both stores, joined verses
//
// Why this text: it was published in 1919, so any US copyright ran out by 2014 at the latest (95 years;
// USCO Circular 38B); Wikipedia lists it as public domain. Not the 1988 新标点和合本 (eBible cmn-cu89s/t),
// whose punctuation the Hong Kong Bible Society administers, and not the 和合本修订版 (© HKBS).
// Why this source: Chinese Wikisource's 聖經 (和合本), whose editors set the text to the 1919 printing's
// characters, punctuation (、．。) and dotted words ("用字亦依1919年版為準"). Its words are checked against a
// second, independent 1919 copy (the FHL 官話和合本, bible.fhl.net version=cumv) by the scripture test.
// Only verse text is kept: Wikisource's cross-reference notes ({{*|…}}) and anchors are dropped; dotted
// words ({{udots|…}}), small print ({{-|…}}: psalm titles and 細拉, as the KJV store keeps its titles) and
// {{+|…}} keep their words; {{!|字|description}} keeps the character.
// Where the 1919 text prints two or more verses as one, Wikisource leaves the earlier markers empty: the
// words are stored once, under the first number (as 개역한글's pairs are), and listed in `joined`.
//
// Run: npm i --no-save opencc-js@1.4.2 && node scripts/content/import-cuv.mjs [--pinned]
//   --pinned re-reads the revisions in cuv_source.json and stops with CUV_DRIFT if the Traditional text differs.
//   --reparse re-reads the same revisions after a change to this parser, and rewrites the stores.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { CONTENT } from "./lib.mjs";

const API = "https://zh.wikisource.org/w/api.php";
const UA = "peace-be-still scripture import (one request at a time)";
const OPENCC = "opencc-js@1.4.2";
// Repo book code → the Wikisource page under 聖經 (和合本)/.
export const WS_BOOK = {
  GEN: "創世記", EXO: "出埃及記", LEV: "利未記", NUM: "民數記", DEU: "申命記", JOS: "約書亞記", JDG: "士師記", RUT: "路得記",
  "1SA": "撒母耳記上", "2SA": "撒母耳記下", "1KI": "列王紀上", "2KI": "列王紀下", "1CH": "歷代志上", "2CH": "歷代志下",
  EZR: "以斯拉記", NEH: "尼希米記", EST: "以斯帖記", JOB: "約伯記", PSA: "詩篇", PRO: "箴言", ECC: "傳道書", SOL: "雅歌",
  ISA: "以賽亞書", JER: "耶利米書", LAM: "耶利米哀歌", EZE: "以西結書", DAN: "但以理書", HOS: "何西阿書", JOE: "約珥書",
  AMO: "阿摩司書", OBA: "俄巴底亞書", JON: "約拿書", MIC: "彌迦書", NAH: "那鴻書", HAB: "哈巴谷書", ZEP: "西番雅書",
  HAG: "哈該書", ZEC: "撒迦利亞書", MAL: "瑪拉基書", MAT: "馬太福音", MAR: "馬可福音", LUK: "路加福音", JOH: "約翰福音",
  ACT: "使徒行傳", ROM: "羅馬書", "1CO": "哥林多前書", "2CO": "哥林多後書", GAL: "加拉太書", EPH: "以弗所書", PHI: "腓立比書",
  COL: "歌羅西書", "1TH": "帖撒羅尼迦前書", "2TH": "帖撒羅尼迦後書", "1TI": "提摩太前書", "2TI": "提摩太後書", TIT: "提多書",
  PHM: "腓利門書", HEB: "希伯來書", JAM: "雅各書", "1PE": "彼得前書", "2PE": "彼得後書", "1JO": "約翰一書", "2JO": "約翰二書",
  "3JO": "約翰三書", JUD: "猶大書", REV: "啟示錄",
};

// The 1919 printing's variant characters (異體字) that OpenCC leaves alone because they are not
// Traditional/Simplified pairs, mapped to the standard Simplified character a mainland reader expects
// (通用规范汉字表). Applied to the Simplified store only; the Traditional store keeps the 1919 glyphs.
export const VARIANTS = {
  "衞": "卫", "輭": "软", "餧": "喂", "徧": "遍", "煖": "暖", "塲": "场", "咷": "啕", "毘": "毗", "躱": "躲", "餂": "舔",
  "汚": "污", "醡": "榨", "顚": "颠", "寃": "冤", "羢": "绒", "赒": "周", "燄": "焰", "犂": "犁", "稭": "秸", "窰": "窑",
  "効": "效", "繙": "翻", "朶": "朵", "籐": "藤", "罣": "挂", "餽": "馈", "愼": "慎", "畧": "略", "躭": "耽", "镕": "熔",
  "痲": "麻", "疎": "疏", "鬬": "斗", "槪": "概", "倂": "并", "蹧": "糟", "粃": "秕", "姪": "侄", "尅": "克", "搆": "构",
  "甎": "砖", "顋": "腮", "啣": "衔", "堦": "阶", "韮": "韭", "諠": "喧", "賸": "剩", "箒": "帚", "缾": "瓶", "覩": "睹",
  "勅": "敕", "荳": "豆", "櫺": "棂", "撚": "捻", "摀": "捂", "儹": "攒", "跥": "跺", "麅": "狍", "銲": "焊", "杴": "锨",
};

// One book page's wikitext → [[chapter, verse, raw text], ...] in page order. Pure.
export function parseBook(wt, where = "?") {
  const body = wt.replace(/<!--[\s\S]*?-->/g, "");
  const parts = body.split(/\{\{verse\|(\d+)\|(\d+)\}\}/);
  const out = [];
  for (let i = 1; i < parts.length; i += 3) out.push([+parts[i], +parts[i + 1], parts[i + 2].split(/\n\s*\n|\n==|\n:|\{\{gototop|\{\{footer|\{\{Pd\//)[0]]);
  if (!out.length) throw new Error(`NAMED STOP [CUV_PARSE] ${where}: no verse markers`);
  return out;
}
// One verse's wikitext → its printed words. Pure. Anything template-shaped left over is a stop, never a guess.
export function clean(t, where = "?") {
  // Innermost templates first, until none changes (a note can hold a {{!|…}} character).
  const strip = (dropNotes) => {
    let x = t, prev;
    do {
      prev = x;
      x = x
        .replace(/\{\{!\|([^|{}]*)\|[^{}]*\}\}/g, "$1")
        .replace(/\{\{(?:udots|-|\+)\|([^{}]*)\}\}/g, "$1")
        .replace(/\{\{\*\|([^{}]*)\}\}/g, dropNotes ? "" : "$1")
        .replace(/\{\{[Aa]nchor\|[^{}]*\}\}/g, "")
        .replace(/\[\[#[^\]]*\]\]/g, "");          // a link to a note ("[[#1a|〡]]", the note's number)
    } while (x !== prev);
    return x
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, "")      // ASCII whitespace only: the full-width space before 神 is the text's own
      .replace(/^　+$/, "");
  };
  // {{*|…}} is a reader's note ("或作…"), except where it is the verse itself: Wikisource sets that way
  // EXO 16:36 and the eleven verses the 1919 text prints in the margin, unpunctuated (MAT 18:11, 23:14,
  // MAR 7:16, 15:28, LUK 17:36, 23:17, JOH 5:4, ACT 8:37, 15:34, 24:7, 28:29). A verse with no words once its
  // notes are gone keeps the note's words, so the next verse is never stored under its number; an empty
  // marker (a joined verse) stays empty.
  let x = strip(true);
  if (!/\p{L}/u.test(x) && /\{\{\*\|/.test(t)) x = strip(false);
  if (/[{}[\]|=<>]/.test(x)) throw new Error(`NAMED STOP [CUV_TEMPLATE] ${where}: unparsed markup in "${x.slice(0, 40)}"`);
  if (x && !/\p{L}/u.test(x)) throw new Error(`NAMED STOP [CUV_NO_WORDS] ${where}: "${x}" has no words`);
  return x;
}
// A book's verses → stored lines; an empty marker's words come from the next marker that has words. Pure.
export function bookLines(code, rows) {
  const lines = [], joined = [];
  let pending = null;
  for (const [c, v, raw] of rows) {
    const t = clean(raw, `${code} ${c}:${v}`);
    if (!t) { if (!pending) pending = [c, v]; continue; }
    if (pending) {
      if (pending[0] !== c) throw new Error(`NAMED STOP [CUV_JOIN] ${code} ${pending[0]}:${pending[1]} is empty across a chapter break`);
      lines.push(`${code} ${c}:${pending[1]} ${t}`);
      joined.push(`${code} ${c}:${pending[1]}-${v}`);
      pending = null;
    } else lines.push(`${code} ${c}:${v} ${t}`);
  }
  if (pending) throw new Error(`NAMED STOP [CUV_JOIN] ${code} ${pending[0]}:${pending[1]} is empty at the end of the book`);
  return { lines, joined };
}

// OpenCC's character tables → the Traditional-only characters: a Traditional character whose Simplified
// form differs and which is not itself a Simplified character (乾 stays: it is both).
export function scriptChars(TS, ST) {
  const parse = (s) => new Map(s.split("|").map((e) => e.split(" ")).map(([k, ...v]) => [k, v]));
  const ts = parse(TS), st = parse(ST);
  return { tradOnly: [...ts].filter(([k, v]) => !v.includes(k) && !st.has(k)).map(([k]) => k).join("") };
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`NAMED STOP [CUV_FETCH] HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
  }
  throw new Error("NAMED STOP [CUV_FETCH] gave up after 6 tries");
}
// CUV_CACHE=<dir> keeps each revision read, so a --pinned re-run reads the disk, not the wiki.
async function page(code, revid) {
  const cache = process.env.CUV_CACHE, file = cache && revid && join(cache, `${code}-${revid}.txt`);
  if (file && existsSync(file)) return { revid, text: readFileSync(file, "utf8") };
  const got = await fetchPage(code, revid);
  if (cache) writeFileSync(join(cache, `${code}-${got.revid}.txt`), got.text);
  return got;
}
async function fetchPage(code, revid) {
  const q = revid ? { revids: String(revid) } : { titles: `聖經 (和合本)/${WS_BOOK[code]}` };
  const j = await api({ action: "query", prop: "revisions", rvprop: "ids|content", rvslots: "main", ...q });
  const p = j.query.pages[0];
  if (!p?.revisions) throw new Error(`NAMED STOP [CUV_FETCH] ${code}: no page`);
  return { revid: p.revisions[0].revid, text: p.revisions[0].slots.main.content };
}

async function main() {
  let OpenCC, TS, ST;
  try {
    OpenCC = await import("opencc-js");
    TS = (await import("opencc-js/dict/TSCharacters")).default;
    ST = (await import("opencc-js/dict/STCharacters")).default;
  } catch { throw new Error(`NAMED STOP [OPENCC_MISSING] run: npm i --no-save ${OPENCC}`); }
  const t2s = OpenCC.Converter({ from: "t", to: "cn" });
  const reparse = process.argv.includes("--reparse"), pinned = reparse || process.argv.includes("--pinned");
  const srcFile = join(CONTENT, "bible", "cuv_source.json");
  const old = pinned && existsSync(srcFile) ? JSON.parse(readFileSync(srcFile, "utf8")) : null;
  if (pinned && !old) throw new Error("NAMED STOP [CUV_NOT_PINNED] no cuv_source.json to re-read");
  const lines = [], joined = [], revids = {};
  for (const code of Object.keys(WS_BOOK)) {
    const { revid, text } = await page(code, old?.revids[code]);
    revids[code] = revid;
    const b = bookLines(code, parseBook(text, code));
    lines.push(...b.lines);
    joined.push(...b.joined);
    await new Promise((r) => setTimeout(r, 700));
  }
  if (lines.length < 31000) throw new Error(`NAMED STOP [CUV_SHORT] only ${lines.length} verses`);
  // The Wikisource page carries one later-edition reading: 她 (a character first printed in the 1920s) at LUK 1:45.
  // The 1919 text reads 他 there (FHL 官話和合本, bible.fhl.net/json/qb.php?chineses=路&chap=1&sec=45&version=cumv,
  // read 27 Nov 2026). app/test/i18n.unit.ts fails on any 她 in either store.
  const CORRECTIONS = { "LUK 1:45": ["她", "他"] };
  for (const [ref, [from, to]] of Object.entries(CORRECTIONS)) {
    const i = lines.findIndex((l) => l.startsWith(`${ref} `));
    if (i < 0 || !lines[i].includes(from)) throw new Error(`NAMED STOP [CUV_CORRECTION] ${ref} no longer reads ${from}`);
    lines[i] = lines[i].replace(from, to);
  }
  const trad = lines.join("\n") + "\n";
  const variant = new RegExp(`[${Object.keys(VARIANTS).join("")}]`, "gu");
  const simp = lines.map((l) => { const [code, cv] = l.split(" ", 2); return `${code} ${cv} ${t2s(l.slice(code.length + cv.length + 2)).replace(variant, (ch) => VARIANTS[ch])}`; }).join("\n") + "\n";
  const sha = (s) => createHash("sha256").update(s).digest("hex");
  // The source words must not move; the Simplified store is re-derived from them (a VARIANTS change is deliberate).
  if (old && !reparse && sha(trad) !== old.sha256) throw new Error("NAMED STOP [CUV_DRIFT] the pinned revisions no longer give the stored Traditional text");
  const script = scriptChars(TS, ST);
  const leftover = [...new Set([...simp].filter((ch) => script.tradOnly.includes(ch) || VARIANTS[ch]))];
  if (leftover.length) throw new Error(`NAMED STOP [CUV_SIMPLIFIED_LEFTOVER] Traditional characters left in the Simplified store: ${leftover.join("")}`);
  writeFileSync(join(CONTENT, "bible", "cuv_vpl.txt.gz"), gzipSync(Buffer.from(trad), { level: 9, mtime: 0 }));
  writeFileSync(join(CONTENT, "bible", "cuvs_vpl.txt.gz"), gzipSync(Buffer.from(simp), { level: 9, mtime: 0 }));
  writeFileSync(join(CONTENT, "bible", "zh_script.json"), JSON.stringify({ from: `${OPENCC} dict/TSCharacters + dict/STCharacters`, ...script }) + "\n");
  writeFileSync(srcFile, JSON.stringify({
    name: "和合本 (1919, 官話和合譯本, 神版)", credit: "和合本（1919年版，公有领域）",
    source: "https://zh.wikisource.org/wiki/聖經_(和合本)", second_source: "https://bible.fhl.net/json/qb.php?version=cumv (FHL 官話和合本, 上帝版)",
    status: "Published 1919; US term ended by 2014 at the latest (95 years, USCO Circular 38B); Wikipedia: public domain",
    simplified: `${OPENCC} t→cn, then the VARIANTS map in scripts/content/import-cuv.mjs`,
    fetched: new Date().toISOString().slice(0, 10), verses: lines.length, sha256: sha(trad), sha256_simplified: sha(simp),
    joined_note: "the 1919 text prints these verses as one; stored once, under the first number, as printed",
    joined, revids,
  }, null, 1) + "\n");
  console.log(`OUTPUT import-cuv: ${lines.length} verses, ${joined.length} joined, sha256 ${sha(trad).slice(0, 12)}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
