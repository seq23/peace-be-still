// Question headings (Search Readiness b3, weekly quality sample q1; 24 Nov 2026): a content page with
// two or more H2s has at least one phrased as a question, the way the Monday sampler reads it
// (ends in "?" or "？", or opens with a question word). Every page with an FAQ block gets that from the
// frame's `faq` heading in build-seed-pages.mjs, in all four languages; this reads the built pages so a
// page frame that drops it, or a new language, fails here before the sampler finds it.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../public/", import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : []; });
// The sampler's own test (boss-os src/shared/boss/searchReadiness/page-quality-sample.mjs, QUESTION).
const QUESTION = /[?？]\s*$|^(what|how|why|when|where|who|which|is|are|can|does|do|should|will|was|were)\b/i;
const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

test("every page with an FAQ block has a question H2", () => {
  const bad = walk(root).flatMap((f) => {
    const html = readFileSync(f, "utf8");
    if (!/id="faq"/.test(html)) return [];
    const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1]));
    return h2s.length >= 2 && !h2s.some((h) => QUESTION.test(h)) ? [`${f.slice(root.length - 1)}: ${h2s.join(" / ")}`] : [];
  });
  assert.deepEqual(bad, []);
});
