// Language links: every hreflang alternate on a built page points at a built page that lists the same
// set back (Google ignores one-way pairs), each page lists itself, and there is at most one x-default.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BASE } from "../content/parts.mjs";

const pub = new URL("../public/", import.meta.url).pathname;
const fileOf = (url) => { const p = url.slice(BASE.length).replace(/^\//, ""); return join(pub, p === "" || p.endsWith("/") ? `${p}index.html` : `${p}.html`); };
const altsOf = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]);
const key = (alts) => alts.map(([l, h]) => `${l} ${h}`).sort().join("\n");

export function hreflangIssues(pages) {
  const bad = [];
  for (const [file, html] of pages) {
    const alts = altsOf(html);
    if (!alts.length) continue;
    const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const lang = html.match(/<html lang="([^"]+)"/)?.[1];
    if (!alts.some(([l, h]) => l === lang && h === canon)) bad.push(`${file}: does not list itself (${lang} ${canon})`);
    if (alts.filter(([l]) => l === "x-default").length > 1) bad.push(`${file}: more than one x-default`);
    for (const [l, h] of alts) {
      if (l === "x-default") continue;
      const other = pages.get(fileOf(h));
      if (!other) { bad.push(`${file}: ${l} → ${h} is not a built page`); continue; }
      if (other.match(/<html lang="([^"]+)"/)?.[1] !== l) bad.push(`${file}: ${h} is not a ${l} page`);
      if (key(altsOf(other)) !== key(alts)) bad.push(`${file}: ${h} does not list the same languages back`);
    }
  }
  return bad;
}

test("a one-way or wrong-language hreflang pair is caught", () => {
  const a = '<html lang="en"><link rel="canonical" href="https://peacebestillapp.com/"><link rel="alternate" hreflang="en" href="https://peacebestillapp.com/"><link rel="alternate" hreflang="zh-Hans" href="https://peacebestillapp.com/zh/"><link rel="alternate" hreflang="x-default" href="https://peacebestillapp.com/">';
  const b = '<html lang="zh-Hans"><link rel="canonical" href="https://peacebestillapp.com/zh/"><link rel="alternate" hreflang="zh-Hans" href="https://peacebestillapp.com/zh/"><link rel="alternate" hreflang="x-default" href="https://peacebestillapp.com/">';
  const pages = new Map([[fileOf("https://peacebestillapp.com/"), a], [fileOf("https://peacebestillapp.com/zh/"), b]]);
  assert.ok(hreflangIssues(pages).some((x) => x.includes("does not list the same languages back")));
  pages.set(fileOf("https://peacebestillapp.com/zh/"), a.replace('lang="en"><link rel="canonical" href="https://peacebestillapp.com/"', 'lang="zh-Hans"><link rel="canonical" href="https://peacebestillapp.com/zh/"'));
  assert.deepEqual(hreflangIssues(pages), []);
});

test("every built page's language links are valid and reciprocal", () => {
  const pages = new Map();
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) pages.set(p, readFileSync(p, "utf8")); } })(pub);
  assert.deepEqual(hreflangIssues(pages), []);
  // The four language homes are one set.
  const home = altsOf(pages.get(join(pub, "index.html"))).map(([l]) => l).sort();
  assert.deepEqual(home, ["en", "es", "ko", "x-default", "zh-Hans"]);
  assert.ok(existsSync(join(pub, "zh/index.html")));
});
