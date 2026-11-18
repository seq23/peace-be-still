// Every verse on the website equals the stored Bible (content/bible: KJV in English, Reina-Valera 1909
// in Spanish), word for word. Quotes are marked by site/content/scripture.mjs with data-ref/data-tr;
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
  for (const m of s.matchAll(/<blockquote class="verse"([^>]*)><p>([\s\S]*?)<\/p>/g)) {
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
});

test("every verse on every built page equals the stored KJV / RV1909 text", () => {
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) files.push(p); } })(pub);
  let total = 0;
  const bad = [];
  for (const f of files) { const r = checkPage(f.slice(pub.length), readFileSync(f, "utf8")); total += r.n; bad.push(...r.bad); }
  assert.deepEqual(bad, []);
  assert.ok(total >= 300, `only ${total} verses checked; the pages should carry far more`);
});
