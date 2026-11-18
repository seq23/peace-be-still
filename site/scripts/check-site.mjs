#!/usr/bin/env node
// Safety check for the public website (risk brain: trademarks, claims, privacy promise, two doors).
// Protects:
// (1) never the registered phrase "Black Bible Stories" (USPTO 98839129) or "Speak Life";
// (2) no outcome/health promises or manifesting words on any page;
// (3) mindset-practice words only on pages marked <meta name="pbs:door" content="mindset">,
//     and a faith page never links a mindset page (or the reverse);
// (4) the /privacy promise: the only form posts to our own waitlist endpoint, no email
//     addresses, no third-party scripts;
// (5) no Apple/Google store badges or store links while the app is not live.
// Exits 1 on any finding, and 1 if it read zero pages (rule 0). --self-test proves it can fail.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../public/", import.meta.url).pathname;

const banned = [
  [/black\s+bible\s+stories/i, 'registered trademark "Black Bible Stories"'],
  [/speak\s+life/i, '"Speak Life" (live trademarks)'],
  [/(?<!rel=")\bmanifest(ing|ation|s|ed)?\b/i, "manifesting words"],
  [/law of attraction|neville|abraham[- ]hicks/i, "law-of-attraction / teacher names"],
  [/\bcures?\b|insomnia|\bheals?\b|guarantee/i, "outcome or health promise"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "an email address"],
  [/<script(?![^>]*application\/ld\+json)[^>]*>/i, "a script other than JSON-LD"],
  [/apps\.apple\.com|play\.google\.com\/store|download on the app store|get it on google play/i, "a store link or badge before launch"],
];
const mindsetOnly = /law of assumption|living in the end|imagination nights/i;

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
  for (const [name, text] of files) {
    for (const [re, why] of banned) if (re.test(text)) findings.push(`${name}: ${why} (${text.match(re)[0]})`);
    for (const m of text.matchAll(/<form\b[^>]*>/gi)) {
      if (!/action="\/api\/waitlist(\/remove)?"/.test(m[0])) findings.push(`${name}: a form that does not post to the waitlist (${m[0]})`);
    }
    if (/<input\b/i.test(text) && !/<form\b/i.test(text)) findings.push(`${name}: an input outside the waitlist form`);
    const door = doorOf.get(name);
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
    ["b.html", '<meta name="pbs:door" content="mindset"><p>law of assumption</p>'],
    ["c.html", "<p>the law of assumption</p><script src=\"https://t.example/x.js\"></script>"],
  ]);
  const want = ["registered trademark", "a faith page links a mindset page", "does not post to the waitlist", "mindset-practice words on a neutral page", "a script other than JSON-LD"];
  const missing = want.filter((w) => !bad.some((f) => f.includes(w)));
  if (missing.length) { console.error(`check-site --self-test: did not catch: ${missing.join("; ")}`); process.exit(1); }
  if (bad.some((f) => f.startsWith("b.html"))) { console.error("check-site --self-test: flagged a clean mindset page"); process.exit(1); }
  console.log("OUTPUT check-site --self-test: caught all 5 planted faults");
  process.exit(0);
}

const files = readAll();
if (files.length === 0) { console.error("NAMED STOP [NO_PAGES] check-site read zero pages"); process.exit(1); }
const findings = check(files);
if (findings.length) { console.error(findings.join("\n")); console.error(`check-site: ${findings.length} finding(s) in ${files.length} files`); process.exit(1); }
console.log(`OUTPUT check-site: ${files.length} files clean`);
