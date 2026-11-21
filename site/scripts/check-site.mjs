#!/usr/bin/env node
// Safety check for the public website (risk brain: trademarks, claims, privacy promise, two doors).
// Protects:
// (1) never the registered phrase "Black Bible Stories" (USPTO 98839129) or "Speak Life";
// (2) no outcome/health promises on any page; no teacher names (Neville, Abraham-Hicks) anywhere; manifesting
//     and law-of-attraction words only on Mindset pages (the brand: never where the faith door sees), URLs
//     aside (the sitemap and llms.txt list Mindset page addresses);
// (3) mindset-practice words only on pages marked <meta name="pbs:door" content="mindset">,
//     and a faith page never links a mindset page (or the reverse);
// (4) the /privacy promise: no forms or inputs at all (sign-ups closed 18 Nov 2026), no email
//     addresses except the published contact info@peacebestillapp.com (the legal pages must name
//     one), no third-party scripts; a negated "does not guarantee" (the disclaimer) is not a promise;
// (5) store badges and store links only inside the one store CTA (<!-- cta:start -->…<!-- cta:end -->,
//     from site/config/store.json), or as a sourced fact link <a class="src" rel="nofollow noopener">;
//     never "available now" while store.json has no URL.
// Exits 1 on any finding, and 1 if it read zero pages (rule 0). --self-test proves it can fail.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../public/", import.meta.url).pathname;

const banned = [
  [/black\s+bible\s+stories/i, 'registered trademark "Black Bible Stories"'],
  [/speak\s+life/i, '"Speak Life" (live trademarks)'],
  [/neville|abraham[- ]hicks/i, "law-of-attraction teacher names"],
  [/\bcures?\b|insomnia|\bheals?\b|(?<!\bnot )guarantee/i, "outcome or health promise"],
  [/(?<![A-Z0-9._%+-])(?!info@peacebestillapp\.com\b)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "an email address"],
  [/<script(?![^>]*application\/ld\+json)[^>]*>/i, "a script other than JSON-LD"],

];
const mindsetOnly = /law of assumption|living in the end|imagination nights/i;
const manifesting = /\bmanifest(ing|ation|ations|s|ed)?\b|law of attraction/i;
const withoutUrls = (t) => t.replace(/<link rel="manifest"[^>]*>/g, "").replace(/(?:href|src)="[^"]*"/g, "").replace(/https?:\/\/[^\s"<]+/g, "");

export function check(files) {
  const findings = [];
  const doorOf = new Map();
  for (const [name, text] of files) doorOf.set(name, text.match(/<meta name="pbs:door" content="(\w+)"/)?.[1] || "neutral");
  const urlToDoor = new Map();
  for (const [name] of files) {
    if (!name.endsWith(".html")) continue;
    const url = "/" + name.replace(/index\.html$/, "").replace(/\.html$/, "");
    urlToDoor.set(url, doorOf.get(name));
  }
  let live = false;
  try { const st = JSON.parse(readFileSync(new URL("../config/store.json", import.meta.url), "utf8")); live = Boolean(st.app_store_url || st.play_url); } catch {}
  for (const [name, text] of files) {
    const outside = text.replace(/<!-- cta:start -->[\s\S]*?<!-- cta:end -->/g, "").replace(/<a class="src" rel="nofollow noopener" href="https:\/\/apps\.apple\.com\/[^"]+">/g, "");
    const store = outside.match(/apps\.apple\.com|play\.google\.com\/store|download on the app store|get it on google play|\/brand\/stores\//i);
    if (store) findings.push(`${name}: a store link or badge outside the store CTA (${store[0]})`);
    if (!live && /available now|disponible ya/i.test(text)) findings.push(`${name}: "available now" while no store URL is set`);
    for (const [re, why] of banned) if (re.test(text)) findings.push(`${name}: ${why} (${text.match(re)[0]})`);
    if (/<form\b/i.test(text)) findings.push(`${name}: a form (sign-ups are closed; the site collects nothing)`);
    if (/<input\b/i.test(text)) findings.push(`${name}: an input (the site collects nothing)`);
    const door = doorOf.get(name);
    if (door !== "mindset" && manifesting.test(withoutUrls(text))) findings.push(`${name}: manifesting words on a ${door} page (${withoutUrls(text).match(manifesting)[0]})`);
    if (name.endsWith(".html") && door !== "mindset" && mindsetOnly.test(text)) {
      // Home pages describe both doors by name; only the practice words are kept to mindset pages.
      const hit = text.match(/law of assumption|living in the end/i);
      if (hit) findings.push(`${name}: mindset-practice words on a ${door} page (${hit[0]})`);
    }
    if (door === "faith" || door === "mindset") {
      for (const h of text.matchAll(/href="(\/[^"#?]*)/g)) {
        const target = urlToDoor.get(h[1]);
        if (target && target !== "neutral" && target !== door) findings.push(`${name}: a ${door} page links a ${target} page (${h[1]})`);
      }
    }
  }
  return findings;
}

function readAll() {
  const files = [];
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(html|txt|xml)$/.test(f)) files.push([relative(root, p), readFileSync(p, "utf8")]);
    }
  })(root);
  return files;
}

if (process.argv.includes("--self-test")) {
  const bad = check([
    ["a.html", '<meta name="pbs:door" content="faith"><p>Black Bible Stories</p><a href="/b">x</a><form action="https://x.example">'],
    ["d.html", '<p>Available now!</p><a href="https://apps.apple.com/us/app/x/id1">get</a>'],
    ["b.html", '<meta name="pbs:door" content="mindset"><p>law of assumption: how to manifest, and the law of attraction</p><link rel="manifest" href="/site.webmanifest">'],
    ["g.html", '<meta name="pbs:door" content="faith"><p>Manifest your blessing.</p>'],
    ["h.txt", "- [Gratitude](https://peacebestillapp.com/questions/how-to-manifest/)\n- the law of attraction"],
    ["c.html", "<p>the law of assumption</p><script src=\"https://t.example/x.js\"></script>"],
    ["e.html", "<p>We guarantee sleep. Write to someone@peacebestillapp.com.</p>"],
  ]);
  const want = ["registered trademark", "a faith page links a mindset page", "a form (sign-ups are closed", "a store link or badge outside the store CTA", "available now", "mindset-practice words on a neutral page", "a script other than JSON-LD", "e.html: outcome or health promise", "e.html: an email address", "g.html: manifesting words on a faith page", "h.txt: manifesting words on a neutral page (law of attraction)"];
  const missing = want.filter((w) => !bad.some((f) => f.includes(w)));
  if (missing.length) { console.error(`check-site --self-test: did not catch: ${missing.join("; ")}`); process.exit(1); }
  if (bad.some((f) => f.startsWith("b.html"))) { console.error("check-site --self-test: flagged a clean mindset page"); process.exit(1); }
  const clean = check([["f.html", "<p>Listening does not guarantee sleep. Write to info@peacebestillapp.com.</p>"], ["i.xml", "<loc>https://peacebestillapp.com/questions/how-to-manifest/</loc>"], ["j.html", '<link rel="manifest" href="/site.webmanifest">']]);
  if (clean.length) { console.error(`check-site --self-test: flagged the legal contact or a negated guarantee: ${clean.join("; ")}`); process.exit(1); }
  console.log("OUTPUT check-site --self-test: caught all 11 planted faults");
  process.exit(0);
}

const files = readAll();
if (files.length === 0) { console.error("NAMED STOP [NO_PAGES] check-site read zero pages"); process.exit(1); }
const findings = check(files);
if (findings.length) { console.error(findings.join("\n")); console.error(`check-site: ${findings.length} finding(s) in ${files.length} files`); process.exit(1); }
console.log(`OUTPUT check-site: ${files.length} files clean`);
