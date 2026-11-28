// Writes app/src/i18n/zh-Hant.json from zh-Hans.json with OpenCC (Simplified → Traditional, Taiwan
// phrases), so the two Chinese files never drift and nobody hand-edits the Traditional one.
// app/test/i18n.unit.ts fails when zh-Hant.json has a key zh-Hans.json lacks, a Simplified-only character
// (content/bible/zh_script.json is the same OpenCC table), or a value OpenCC would not produce for a pinned sample.
// Also writes worker/src/replies.zh-Hant.json from replies.zh-Hans.json.
// Run: npm i --no-save opencc-js@1.4.2 && node scripts/i18n-hant.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const OpenCC = await import("opencc-js");
const opencc = OpenCC.Converter({ from: "cn", to: "twp" });
// Taiwan usage OpenCC's twp table misses: 帳戶 (not 賬戶), 訂製 (not 定製), 計畫 (not 計劃), and 「」『』 for quotation marks.
const TAIWAN = [[/賬戶/g, "帳戶"], [/賬號/g, "帳號"], [/定製/g, "訂製"], [/計劃/g, "計畫"], [/“/g, "「"], [/”/g, "」"], [/‘/g, "『"], [/’/g, "』"]];
const convert = (text) => TAIWAN.reduce((out, [from, to]) => out.replace(from, to), opencc(text));
// Names and numbers stay as written: the brand, store names, and the ASCII inside every value are untouched by OpenCC.
const hans = JSON.parse(readFileSync(`${root}app/src/i18n/zh-Hans.json`, "utf8"));
// Language names are each written in their own script ("简体中文" stays Simplified), so they are copied as is.
const KEEP = (key) => key.startsWith("language.") || key.startsWith("ownNight.language.");
const walk = (v) => (typeof v === "string" ? convert(v) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])));
const hant = Object.fromEntries(Object.entries(hans).map(([k, v]) => [k, KEEP(k) ? v : walk(v)]));
writeFileSync(`${root}app/src/i18n/zh-Hant.json`, JSON.stringify(hant, null, 2) + "\n");
console.log(`zh-Hant.json: ${Object.keys(hant).length} keys from zh-Hans.json (opencc-js cn → twp)`);

// The chat Worker's fixed replies (worker/src/replies.*.json) the same way: one Simplified file, the Traditional one written from it.
const replies = JSON.parse(readFileSync(`${root}worker/src/replies.zh-Hans.json`, "utf8"));
const repliesHant = Object.fromEntries(Object.entries(replies).map(([k, v]) => [k, k === "contentLanguage" ? "Traditional Chinese" : Array.isArray(v) ? v.map(convert) : convert(v)]));
writeFileSync(`${root}worker/src/replies.zh-Hant.json`, JSON.stringify(repliesHant, null, 2) + "\n");
console.log(`replies.zh-Hant.json: ${Object.keys(repliesHant).length} keys from replies.zh-Hans.json (opencc-js cn → twp)`);
