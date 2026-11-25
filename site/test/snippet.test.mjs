// The search snippet and image alt text (Search Readiness b1, b2, b8; 25 Nov 2026 queue): every indexable
// page has a unique <title> of 30-65 characters, exactly one meta description of 120-160, and no image
// without alt words unless it is marked decorative (aria-hidden="true" or role="presentation").
// Reads the built pages in site/public (seed, home, legal and search-loop pages alike), and renders the
// home pages in all four store states, since their lines carry the launch words.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { snippetFindings, STORE_STATES } from "../content/parts.mjs";
import { homeHtml } from "../content/home.mjs";

const root = new URL("../public/", import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : []; });
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function snippetOf(html) {
  const title = dec((html.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1].trim());
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]).filter((m) => /\bname="description"/.test(m));
  const description = metas.length ? dec((metas[0].match(/\bcontent="([^"]*)"/) || [, ""])[1]) : "";
  return { title, description, count: metas.length };
}
export function altFindings(name, html) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
    .filter((m) => !/\balt="[^"]*\S[^"]*"/.test(m) && !/\baria-hidden="true"|\brole="presentation"/.test(m))
    .map((m) => `${name}: image with no alt words and not marked decorative: ${m}`);
}
// A page Google may show: has a <title>, is not noindex, is not a meta-refresh redirect.
const indexable = (html) => /<title>/.test(html) && !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html) && !/<meta\b[^>]*content="[^"]*noindex[^"]*"[^>]*name="robots"/i.test(html) && !/http-equiv="refresh"/i.test(html);

const PAGES = walk(root).map((f) => [f.slice(root.length - 1), readFileSync(f, "utf8")]).filter(([, h]) => indexable(h));

test("reads the built site (zero pages would pass everything)", () => {
  assert.ok(PAGES.length > 100, `only ${PAGES.length} indexable pages found under site/public`);
});

test("every indexable page: title 30-65, exactly one description 120-160", () => {
  const bad = [];
  for (const [name, html] of PAGES) {
    const s = snippetOf(html);
    if (s.count !== 1) bad.push(`${name}: ${s.count} meta descriptions (want exactly 1)`);
    bad.push(...snippetFindings(name, s.title, s.description));
  }
  assert.deepEqual(bad, []);
});

test("no two indexable pages share a title", () => {
  const seen = new Map(), dup = [];
  for (const [name, html] of PAGES) {
    const { title } = snippetOf(html);
    if (seen.has(title)) dup.push(`${name} and ${seen.get(title)}: ${title}`);
    seen.set(title, name);
  }
  assert.deepEqual(dup, []);
});

test("every image has alt words or is marked decorative", () => {
  assert.deepEqual(PAGES.flatMap(([name, html]) => altFindings(name, html)), []);
});

test("the home pages fit the snippet and alt rules in every store state", () => {
  const bad = [];
  for (const [state, store] of Object.entries(STORE_STATES)) for (const lang of ["en", "es"]) {
    const html = homeHtml(lang, store), s = snippetOf(html);
    bad.push(...snippetFindings(`${lang} home [${state}]`, s.title, s.description), ...altFindings(`${lang} home [${state}]`, html));
  }
  assert.deepEqual(bad, []);
});

test("the checks can fail: a long title, a short description and a bare image are caught", () => {
  assert.equal(snippetFindings("x", "t".repeat(66), "d".repeat(130)).length, 1);
  assert.equal(snippetFindings("x", "t".repeat(40), "d".repeat(119)).length, 1);
  assert.equal(altFindings("x", '<img src="/a.svg" alt="">').length, 1);
  assert.equal(altFindings("x", '<img src="/a.svg" alt="" aria-hidden="true">').length, 0);
  assert.equal(snippetOf('<title>A &amp; B</title><meta name="description" content="x">').title, "A & B");
});
