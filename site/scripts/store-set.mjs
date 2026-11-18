#!/usr/bin/env node
// The switch: npm run store:set -- --ios <App Store URL> --play <Google Play URL> (either one alone,
// "none" puts that store back to "coming soon"). Writes site/config/store.json and re-renders the
// store call to action on every page; deploy follows the normal PR + land path.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const file = new URL("../config/store.json", import.meta.url);
const args = process.argv.slice(2);
const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const ios = val("--ios"), play = val("--play");
if (ios === undefined && play === undefined) { console.error("NAMED STOP [NO_STORE_URL] pass --ios <url> and/or --play <url>"); process.exit(2); }
const ok = { ios: /^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/[\w%-]+\/id\d+$/, play: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+$/ };
const store = JSON.parse(readFileSync(file, "utf8"));
for (const [k, v, key] of [["ios", ios, "app_store_url"], ["play", play, "play_url"]]) {
  if (v === undefined) continue;
  if (v === "none") { store[key] = null; continue; }
  if (!ok[k].test(v)) { console.error(`NAMED STOP [BAD_STORE_URL] --${k} ${v} is not an official listing URL`); process.exit(2); }
  store[key] = v;
}
writeFileSync(file, JSON.stringify(store, null, 2) + "\n");
const out = execFileSync(process.execPath, [new URL("./apply-cta.mjs", import.meta.url).pathname], { encoding: "utf8" }).trim();
console.log(`OUTPUT store:set: App Store ${store.app_store_url ? "live" : "coming soon"}, Google Play ${store.play_url ? "live" : "coming soon"}; ${out.replace(/^OUTPUT /, "")}`);
