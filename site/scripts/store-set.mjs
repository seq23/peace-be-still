#!/usr/bin/env node
// The switch: npm run store:set -- --ios <App Store URL> --play <Google Play URL> (either one alone,
// "none" puts that store back to "coming soon"). Writes site/config/store.json and rebuilds every page,
// the share pictures and the Instagram frames from it; deploy follows the normal PR + land path.
// Also: --es-legal on|off (owner's yes only) switches the es-MX store listing between the Spanish
// legal pages and the English ones marked "(en inglés)", and rewrites store/listing-es.md to match.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { esListingLegal } from "../content/legal.mjs";

const file = new URL("../config/store.json", import.meta.url);
const args = process.argv.slice(2);
const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const ios = val("--ios"), play = val("--play"), esLegal = val("--es-legal");
if (ios === undefined && play === undefined && esLegal === undefined) { console.error("NAMED STOP [NO_STORE_URL] pass --ios <url> and/or --play <url> (or --es-legal on|off)"); process.exit(2); }
if (esLegal !== undefined && !["on", "off"].includes(esLegal)) { console.error(`NAMED STOP [BAD_ES_LEGAL] --es-legal ${esLegal}: use on or off`); process.exit(2); }
const ok = { ios: /^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/[\w%-]+\/id\d+$/, play: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+$/ };
const store = JSON.parse(readFileSync(file, "utf8"));
for (const [k, v, key] of [["ios", ios, "app_store_url"], ["play", play, "play_url"]]) {
  if (v === undefined) continue;
  if (v === "none") { store[key] = null; continue; }
  if (!ok[k].test(v)) { console.error(`NAMED STOP [BAD_STORE_URL] --${k} ${v} is not an official listing URL`); process.exit(2); }
  store[key] = v;
}
if (esLegal !== undefined) {
  store.es_listing_spanish_legal = esLegal === "on";
  const listing = new URL("../../store/listing-es.md", import.meta.url);
  const want = esListingLegal(store.es_listing_spanish_legal);
  let text = readFileSync(listing, "utf8");
  for (const key of ["Privacy policy URL", "Terms of use (EULA) URL"]) text = text.replace(new RegExp(`^${key.replace(/[()]/g, "\\$&")}: .*$`, "m"), `${key}: ${want[key]}`);
  text = text.replace(/^Términos( \(en inglés\))?: .*$/m, want.body);
  writeFileSync(listing, text);
}
writeFileSync(file, JSON.stringify(store, null, 2) + "\n");
// Every word and picture that says whether the app is out reads store.json: rebuild the pages (CTA,
// home hero, titles, FAQ, JSON-LD, llms.txt), the share pictures and the Instagram frames.
const run = (script) => execFileSync(process.execPath, [new URL(script, import.meta.url).pathname], { encoding: "utf8" }).trim().split("\n").pop();
const outs = ["./build-seed-pages.mjs", "./build-sitemap.mjs", "./og-render.mjs", "../../scripts/instagram/render.mjs"].map(run);
console.log(`OUTPUT store:set: App Store ${store.app_store_url ? "live" : "coming soon"}, Google Play ${store.play_url ? "live" : "coming soon"}; es listing legal links ${store.es_listing_spanish_legal ? "Spanish" : "English"}; ${outs.map((o) => o.replace(/^OUTPUT /, "")).join("; ")}`);
