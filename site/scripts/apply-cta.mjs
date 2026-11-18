#!/usr/bin/env node
// Puts THE store call to action (site/content/parts.mjs storeCtaHtml, read from site/config/store.json)
// on every page: replaces each <!-- cta:start -->…<!-- cta:end --> block. Run after store.json changes
// (store-watch.yml and `npm run store:set` do) and after every page build. Rule 0: exits 1 when it
// finds no page with a CTA block.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { storeCtaHtml } from "../content/parts.mjs";

const pub = new URL("../public/", import.meta.url).pathname;
export function applyCta() {
  let n = 0;
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!f.endsWith(".html")) continue;
      const s = readFileSync(p, "utf8");
      if (!s.includes("<!-- cta:start -->")) continue;
      const lang = (s.match(/<html lang="(\w+)"/) || [])[1] === "es" ? "es" : "en";
      const out = s.replace(/<!-- cta:start -->[\s\S]*?<!-- cta:end -->/g, storeCtaHtml(lang));
      if (out !== s) writeFileSync(p, out);
      n++;
    }
  })(pub);
  if (n === 0) { console.error("NAMED STOP [NO_CTA_PAGES] no page carries a store CTA block"); process.exit(1); }
  return n;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(`OUTPUT apply-cta: store CTA on ${applyCta()} pages`);
