#!/usr/bin/env node
// Puts THE store call to action (site/content/parts.mjs storeCtaHtml, read from site/config/store.json)
// on every page: replaces each <!-- cta:start -->…<!-- cta:end --> block (and the home hero's
// <!-- hero-cta:start -->…<!-- hero-cta:end --> note, storeHeroHtml). Run after store.json changes
// (store-watch.yml and `npm run store:set` do) and after every page build. Rule 0: exits 1 when it
// finds no page with a CTA block. It also writes site/config/campaigns.json, every page's campaign name
// (sourceOf): the only ct values the Worker's /api/go/ redirect passes on to a store listing.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { claimHtml, claimKind, storeCtaHtml, storeHeroHtml, langOf, sourceOf, storeConfig } from "../content/parts.mjs";

export const doorOf = (html) => String(html).match(/<meta name="pbs:door" content="(\w+)"/)?.[1] || "neutral";

const pub = new URL("../public/", import.meta.url).pathname;
const CAMPAIGNS = new URL("../config/campaigns.json", import.meta.url).pathname;
export function applyCta() {
  let n = 0;
  const campaigns = new Set();
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!f.endsWith(".html")) continue;
      const s = readFileSync(p, "utf8");
      if (!s.includes("<!-- cta:start -->")) continue;
      // The privacy lead (home hero, the Bible chat pages, the Mindset hub) comes from the same strings as
      // the app; Mindset pages and the two-door home pages carry it with no faith words.
      const rel = p.slice(pub.length), door = doorOf(s);
      const out = s.replace(/<!-- claim:start -->[\s\S]*?<!-- claim:end -->/g, `<!-- claim:start -->${claimHtml(langOf(s), claimKind(rel, door))}<!-- claim:end -->`).replace(/<!-- cta:start -->[\s\S]*?<!-- cta:end -->/g, storeCtaHtml(langOf(s), storeConfig(), sourceOf(rel), rel, door))
        .replace(/<!-- hero-cta:start -->[\s\S]*?<!-- hero-cta:end -->/g, storeHeroHtml(langOf(s), storeConfig(), sourceOf(rel), rel, door));
      if (out !== s) writeFileSync(p, out);
      campaigns.add(sourceOf(rel));
      n++;
    }
  })(pub);
  if (n === 0) { console.error("NAMED STOP [NO_CTA_PAGES] no page carries a store CTA block"); process.exit(1); }
  const list = `${JSON.stringify([...campaigns].sort(), null, 1)}\n`;
  let was = "";
  try { was = readFileSync(CAMPAIGNS, "utf8"); } catch {}
  if (list !== was) writeFileSync(CAMPAIGNS, list);
  return n;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(`OUTPUT apply-cta: store CTA on ${applyCta()} pages`);
