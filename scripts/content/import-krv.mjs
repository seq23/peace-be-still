#!/usr/bin/env node
// Imports 개역한글판 (the Korean Revised Version, 대한성서공회 번역, 1961) into the repo's verse-per-line
// store, content/bible/krv_vpl.txt.gz, the same shape as the KJV and RV1909 files.
//
// Why this source: the Korean Bible Society's own copyright table lists 개역한글판 (1961) as expired on
// 31 Dec 2011 (bskorea.or.kr subpage2_3_4_1, read 21 Nov 2026), and its one condition is integrity and
// attribution: the text unaltered, credited as 개역한글판 (대한성서공회 번역, 1961). Korean Wikisource
// publishes it book by book under that name (ko.wikisource.org/wiki/개역한글판). eBible's "kor" file is
// NOT used: it is the same wording with changed punctuation ("여호와여, 아침에" for "여호와여 아침에",
// "깰지어다 !"), so it is not word for word.
//
// Each book is read at a pinned revision (content/bible/krv_source.json records title, revid and the
// sha256 of the stored file), so a rerun is reproducible and a changed wiki page cannot slip in unseen.
// Run: node scripts/content/import-krv.mjs            (fetch the latest revisions and rewrite both files)
//      node scripts/content/import-krv.mjs --pinned   (re-fetch the recorded revisions; must reproduce the hash)
import { writeFileSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { CONTENT } from "./lib.mjs";

const API = "https://ko.wikisource.org/w/api.php";
const UA = "peace-be-still-scripture-import/1.0 (word-for-word Bible store)";
export const KRV_BOOKS = [
  ["GEN", "창세기"], ["EXO", "출애굽기"], ["LEV", "레위기"], ["NUM", "민수기"], ["DEU", "신명기"], ["JOS", "여호수아"],
  ["JDG", "사사기"], ["RUT", "룻기"], ["1SA", "사무엘상"], ["2SA", "사무엘하"], ["1KI", "열왕기상"], ["2KI", "열왕기하"],
  ["1CH", "역대상"], ["2CH", "역대하"], ["EZR", "에스라"], ["NEH", "느헤미야"], ["EST", "에스더"], ["JOB", "욥기"],
  ["PSA", "시편"], ["PRO", "잠언"], ["ECC", "전도서"], ["SOL", "아가"], ["ISA", "이사야"], ["JER", "예레미야"],
  ["LAM", "예레미야애가"], ["EZE", "에스겔"], ["DAN", "다니엘"], ["HOS", "호세아"], ["JOE", "요엘"], ["AMO", "아모스"],
  ["OBA", "오바댜"], ["JON", "요나"], ["MIC", "미가"], ["NAH", "나훔"], ["HAB", "하박국"], ["ZEP", "스바냐"],
  ["HAG", "학개"], ["ZEC", "스가랴"], ["MAL", "말라기"], ["MAT", "마태복음"], ["MAR", "마가복음"], ["LUK", "누가복음"],
  ["JOH", "요한복음"], ["ACT", "사도행전"], ["ROM", "로마서"], ["1CO", "고린도전서"], ["2CO", "고린도후서"],
  ["GAL", "갈라디아서"], ["EPH", "에베소서"], ["PHI", "빌립보서"], ["COL", "골로새서"], ["1TH", "데살로니가전서"],
  ["2TH", "데살로니가후서"], ["1TI", "디모데전서"], ["2TI", "디모데후서"], ["TIT", "디도서"], ["PHM", "빌레몬서"],
  ["HEB", "히브리서"], ["JAM", "야고보서"], ["1PE", "베드로전서"], ["2PE", "베드로후서"], ["1JO", "요한1서"],
  ["2JO", "요한2서"], ["3JO", "요한3서"], ["JUD", "유다서"], ["REV", "요한계시록"],
];

// Wikitext of one book → [[chapter, verse, text], ...]. Chapters are "== N장 ==" headings; verses are
// {{절|C|}} (chapter C, verse 1), {{절|C|V}} or {{절||V}}. Only markup is removed; words are kept.
export function parseBook(wikitext, code = "?") {
  const out = [];
  let chapter = 0;
  for (const raw of wikitext.split("\n")) {
    const h = raw.match(/^==\s*(\d+)\s*장\s*==\s*$/);
    if (h) { chapter = Number(h[1]); continue; }
    const m = raw.match(/^\{\{절\|(\d*)\|(\d*)\}\}\s*(.*)$/);
    if (!m) continue;
    if (m[1]) chapter = Number(m[1]);
    const verse = m[2] ? Number(m[2]) : 1;
    if (!chapter) throw new Error(`NAMED STOP [KRV_PARSE] ${code}: a verse before any chapter`);
    out.push([chapter, verse, clean(m[3])]);
  }
  return out;
}
export function clean(s) {
  return s
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBook(title, revid) {
  const q = revid
    ? `action=query&prop=revisions&revids=${revid}&rvprop=ids|content&rvslots=main&format=json&formatversion=2`
    : `action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=ids|content&rvslots=main&format=json&formatversion=2`;
  let res;
  // Wikisource asks bots to go slowly: one request at a time, and back off on 429.
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(`${API}?${q}`, { headers: { "user-agent": UA } });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
  }
  if (!res.ok) throw new Error(`NAMED STOP [KRV_FETCH] ${title}: HTTP ${res.status}`);
  const page = (await res.json()).query?.pages?.[0];
  const rev = page?.revisions?.[0];
  if (!rev?.slots?.main?.content) throw new Error(`NAMED STOP [KRV_FETCH] ${title}: no content`);
  return { revid: rev.revid, text: rev.slots.main.content };
}

async function main() {
  const pinnedPath = join(CONTENT, "bible", "krv_source.json");
  const pinned = process.argv.includes("--pinned") ? JSON.parse(readFileSync(pinnedPath, "utf8")) : null;
  const lines = [];
  const books = [];
  for (const [code, name] of KRV_BOOKS) {
    const title = `개역한글판/${name}`;
    const { revid, text } = await fetchBook(title, pinned?.books.find((b) => b.code === code)?.revid);
    const verses = parseBook(text, code);
    if (!verses.length) throw new Error(`NAMED STOP [KRV_EMPTY] ${title} has no verses`);
    for (const [c, v, t] of verses) lines.push(`${code} ${c}:${v} ${t}`);
    books.push({ code, title, revid, verses: verses.length });
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (lines.length < 31000) throw new Error(`NAMED STOP [KRV_SHORT] only ${lines.length} verses`);
  const body = lines.join("\n") + "\n";
  const sha256 = createHash("sha256").update(body).digest("hex");
  if (pinned && pinned.sha256 !== sha256) throw new Error(`NAMED STOP [KRV_DRIFT] pinned revisions gave ${sha256}, recorded ${pinned.sha256}`);
  writeFileSync(join(CONTENT, "bible", "krv_vpl.txt.gz"), gzipSync(Buffer.from(body), { level: 9, mtime: 0 }));
  writeFileSync(pinnedPath, JSON.stringify({
    name: "개역한글판", credit: "개역한글판 (대한성서공회 번역, 1961)", source: "https://ko.wikisource.org/wiki/개역한글판",
    status: "Korean Bible Society: copyright term expired 2011-12-31 (bskorea.or.kr/bbs/content.php?co_id=subpage2_3_4_1, read 2026-11-21)",
    verses: lines.length, sha256, books,
  }, null, 1) + "\n");
  console.log(`OUTPUT import-krv: ${lines.length} verses in ${books.length} books, sha256 ${sha256.slice(0, 12)}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
