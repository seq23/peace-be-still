// Writes app/src/i18n/zh-Hant.json from zh-Hans.json with OpenCC (Simplified → Traditional, Taiwan
// phrases), so the two Chinese files never drift and nobody hand-edits the Traditional one.
// app/test/i18n.unit.ts fails when zh-Hant.json has a key zh-Hans.json lacks, a Simplified-only character
// (content/bible/zh_script.json is the same OpenCC table), or a value OpenCC would not produce for a pinned sample.
// Run: npm i --no-save opencc-js@1.4.2 && node scripts/i18n-hant.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const OpenCC = await import("opencc-js");
const convert = OpenCC.Converter({ from: "cn", to: "twp" });
// Names and numbers stay as written: the brand, store names, and the ASCII inside every value are untouched by OpenCC.
const hans = JSON.parse(readFileSync(`${root}app/src/i18n/zh-Hans.json`, "utf8"));
// Language names are each written in their own script ("简体中文" stays Simplified), so they are copied as is.
const KEEP = (key) => key.startsWith("language.") || key.startsWith("ownNight.language.");
const walk = (v) => (typeof v === "string" ? convert(v) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])));
const hant = Object.fromEntries(Object.entries(hans).map(([k, v]) => [k, KEEP(k) ? v : walk(v)]));
writeFileSync(`${root}app/src/i18n/zh-Hant.json`, JSON.stringify(hant, null, 2) + "\n");
console.log(`zh-Hant.json: ${Object.keys(hant).length} keys from zh-Hans.json (opencc-js cn → twp)`);
