#!/usr/bin/env node
// Safety check for the public website (risk brain: trademarks, claims, privacy promise).
// Protects: (1) never the registered phrase "Black Bible Stories" (USPTO 98839129) or "Speak Life";
// (2) no outcome/health or manifesting words on any page; (3) the privacy page's promise that
// the site collects nothing: no forms, inputs, email addresses or third-party scripts;
// (4) no Apple/Google store badges or store links while the app is not live.
// Exits 1 on any finding, and 1 if it read zero pages (rule 0).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../public/", import.meta.url).pathname;
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|txt|xml)$/.test(f)) files.push(p);
  }
})(root);

const banned = [
  [/black\s+bible\s+stories/i, 'registered trademark "Black Bible Stories"'],
  [/speak\s+life/i, '"Speak Life" (live trademarks)'],
  [/manifest(ing|ation|s)?\b/i, 'manifesting words'],
  [/law of (attraction|assumption)|neville/i, 'mindset-teacher words on the shared site'],
  [/\bcures?\b|insomnia|heals?\b|guarantee/i, 'outcome or health promise'],
  [/<form\b|<input\b|<textarea\b/i, 'a form (privacy page says the site collects nothing)'],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, 'an email address'],
  [/<script(?![^>]*application\/ld\+json)[^>]*>/i, 'a script other than JSON-LD'],
  [/apps\.apple\.com|play\.google\.com|download on the app store|get it on google play/i, 'a store link or badge before launch'],
];

const findings = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const [re, why] of banned) if (re.test(text)) findings.push(`${relative(root, f)}: ${why} (${text.match(re)[0]})`);
}
if (files.length === 0) { console.error("NAMED STOP [NO_PAGES] check-site read zero pages"); process.exit(1); }
if (findings.length) { console.error(findings.join("\n")); console.error(`check-site: ${findings.length} finding(s) in ${files.length} files`); process.exit(1); }
console.log(`OUTPUT check-site: ${files.length} files clean`);
