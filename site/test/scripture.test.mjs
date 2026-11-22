// Every verse on the website equals the stored Bible (content/bible: KJV in English, Reina-Valera 1909
// in Spanish, 개역한글 1961 in Korean), word for word. Quotes are marked by site/content/scripture.mjs with data-ref/data-tr;
// a verse block without a reference is a typed verse and fails.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { verses } from "../../scripts/content/lib.mjs";

const pub = new URL("../public/", import.meta.url).pathname;
const stored = (ref, tr) => verses(ref, tr).map((x) => x.text).join(" ");
const inner = (html) => html.replace(/<[^>]+>/g, "").trim();

export function checkPage(name, s) {
  const bad = [];
  let n = 0;
  for (const m of s.matchAll(/<blockquote class="verse"([^>]*)><p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const ref = m[1].match(/data-ref="([^"]+)"/)?.[1], tr = m[1].match(/data-tr="([^"]+)"/)?.[1];
    if (!ref || !tr) { bad.push(`${name}: a verse block with no stored reference (typed verse?)`); continue; }
    n++;
    if (inner(m[2]) !== stored(ref, tr)) bad.push(`${name}: ${ref} (${tr}) differs from the stored text`);
  }
  for (const m of s.matchAll(/<(q|li)\b([^>]*data-ref="([^"]+)"[^>]*data-tr="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g)) {
    n++;
    const want = stored(m[3], m[4]), got = inner(m[5]);
    const ok = /data-part="1"/.test(m[2]) ? want.includes(got) && got.length > 0 : got === want;
    if (!ok) bad.push(`${name}: ${m[3]} (${m[4]}) differs from the stored text`);
  }
  return { n, bad };
}

test("a planted wrong or typed verse is caught", () => {
  const typed = checkPage("t", '<blockquote class="verse"><p>The Lord is my shepherd.</p></blockquote>');
  assert.equal(typed.bad.length, 1);
  const wrong = checkPage("w", '<q class="v" data-ref="PSA 4:8" data-tr="KJV">I will lay me down in peace.</q><q class="v" data-ref="PSA 4:8" data-tr="KJV" data-part="1">sleep in peace</q>');
  assert.equal(wrong.bad.length, 2);
  const right = checkPage("r", '<q class="v" data-ref="PSA 4:8" data-tr="RV1909" data-part="1">En paz me acostaré</q>');
  assert.deepEqual(right.bad, []);
  // A changed 개역한글 verse is caught like any other.
  const ko = checkPage("k", '<blockquote class="verse" data-ref="PSA 4:8" data-tr="KRV"><p>내가 평안히 눕고 자기도 하리니</p><cite>시편 4:8 · 개역한글</cite></blockquote>');
  assert.equal(ko.n, 1);
  assert.equal(ko.bad.length, 1);
});

// Korean pages (owner ruling 21 Nov 2026): verses are 개역한글 only, except an English KJV verse set inside
// a lang="en" block for a bilingual family; every Korean page carries the 개역한글 credit line.
export function koreanIssues(name, s) {
  const bad = [];
  const outsideEn = s.replace(/<div lang="en">[\s\S]*?<\/div>/g, "");
  for (const m of outsideEn.matchAll(/data-tr="([^"]+)"/g)) if (m[1] !== "KRV") bad.push(`${name}: a ${m[1]} verse outside a lang="en" block`);
  if (!s.includes("개역한글판 (대한성서공회 번역, 1961)")) bad.push(`${name}: no 개역한글 credit line`);
  return bad;
}

// Read from the Korean Bible Society's own reader (bskorea.or.kr, version=HAN) on 21 Nov 2026: the
// verses the review found changed in the Wikisource copy. The store must be the publisher's words.
const KBS_FIXTURE = {
  "PSA 46:5": "하나님이 그 성중에 거하시매 성이 요동치 아니할 것이라 새벽에 하나님이 도우시리로다",
  "PSA 130:6": "파숫군이 아침을 기다림보다 내 영혼이 주를 더 기다리나니 참으로 파숫군의 아침을 기다림보다 더하도다",
  "MAR 1:4": "세례 요한이 이르러 광야에서 죄 사함을 받게 하는 회개의 세례를 전파하니",
  "JER 33:1": "예레미야가 아직 시위대 뜰에 갇혔을 때에 여호와의 말씀이 그에게 다시 임하니라 가라사대",
  "LAM 3:32": "저가 비록 근심케 하시나 그 풍부한 자비대로 긍휼히 여기실 것임이라",
  "PSA 72:20": "이새의 아들 다윗의 기도가 필하다",
  "PSA 46:10": "이르시기를 너희는 가만히 있어 내가 하나님 됨을 알찌어다 내가 열방과 세계 중에서 높임을 받으리라 하시도다",
};

test("the stored 개역한글 is the Korean Bible Society's text, word for word", () => {
  for (const [ref, text] of Object.entries(KBS_FIXTURE)) assert.equal(verses(ref, "KRV")[0].text, text, ref);
  // 개역한글 prints some verse pairs as one ("12-13"): stored once under the first number, never merged into the verse before.
  assert.ok(verses("1CH 16:12", "KRV")[0].text.startsWith("그 종 이스라엘의 후손"));
  assert.equal(verses("1CH 16:11", "KRV")[0].text, "여호와와 그 능력을 구할찌어다 그 얼굴을 항상 구할찌어다");
});

test("a Korean page quoting KJV, or without the credit line, is caught", () => {
  assert.equal(koreanIssues("k", '<q class="v" data-ref="PSA 4:8" data-tr="KJV">x</q> 개역한글판 (대한성서공회 번역, 1961)').length, 1);
  assert.equal(koreanIssues("k", '<q class="v" data-ref="PSA 4:8" data-tr="KRV">x</q>').length, 1);
  assert.deepEqual(koreanIssues("k", '<div lang="en"><q data-tr="KJV">x</q></div><q data-tr="KRV">y</q> 개역한글판 (대한성서공회 번역, 1961)'), []);
});

test("every built Korean page quotes 개역한글 and credits it", () => {
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) files.push(p); } })(join(pub, "ko"));
  assert.ok(files.length >= 8, `only ${files.length} Korean pages`);
  assert.deepEqual(files.flatMap((f) => koreanIssues(f.slice(pub.length), readFileSync(f, "utf8"))), []);
});

test("every verse on every built page equals the stored KJV / RV1909 / 개역한글 text", () => {
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) files.push(p); } })(pub);
  let total = 0;
  const bad = [];
  for (const f of files) { const r = checkPage(f.slice(pub.length), readFileSync(f, "utf8")); total += r.n; bad.push(...r.bad); }
  assert.deepEqual(bad, []);
  assert.ok(total >= 300, `only ${total} verses checked; the pages should carry far more`);
});
