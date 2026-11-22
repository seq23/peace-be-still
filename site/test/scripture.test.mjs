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
