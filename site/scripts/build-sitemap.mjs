#!/usr/bin/env node
// Writes public/sitemap.xml from every indexable page's own canonical URL (and its hreflang
// alternates), so seed pages and search-loop pages join it without a hand edit.
// Run after any page change; the search-loop caller runs it as post_build_command.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pub = new URL("../public/", import.meta.url).pathname;
const BASE = "https://peacebestillapp.com";
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d).sort()) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html") && f !== "404.html") pages.push(p);
  }
})(pub);

const urls = [];
for (const p of pages) {
  const html = readFileSync(p, "utf8");
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canon || !canon[1].startsWith(BASE)) continue;
  const mod = html.match(/"dateModified":"(\d{4}-\d\d-\d\d)"/)?.[1] || html.match(/(\d{4}-\d\d-\d\d)/)?.[1];
  const alts = [...html.matchAll(/<link rel="alternate" hreflang="([A-Za-z-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  urls.push({ loc: canon[1], mod, alts });
}
if (urls.length < 5) { console.error(`NAMED STOP [SITEMAP_TOO_SMALL] only ${urls.length} indexable pages found`); process.exit(1); }
urls.sort((a, b) => a.loc.localeCompare(b.loc));
const body = urls.map((u) => `  <url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}${u.alts.map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${h}"/>`).join("")}</url>`).join("\n");
writeFileSync(join(pub, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`);
console.log(`OUTPUT build-sitemap: ${urls.length} URLs`);
