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
// (5) store badges and store links only inside the store blocks filled from site/config/store.json (the CTA
//     <!-- cta:start -->…<!-- cta:end -->, the home hero, llms.txt's store line) or, for exactly store.json's
//     listings, the JSON-LD; or as a sourced fact link <a class="src" rel="nofollow noopener">;
//     every store badge links our own /go/app-store or /go/google-play (which counts the tap and redirects
//     to the listing; scorecard row pbs-social), never the listing itself, and /go/ links sit only in
//     the store blocks; never "available now" while store.json has no URL.
// (6) the launch state is true per store (site/config/store.json, passed in so --self-test can hold both
//     states with fixtures): a live store is never "coming soon"/"muy pronto"/"곧"/"即将上架", and once any
//     store is live no page says the app is not out yet; a store with no URL is never "now on" it.
// Exits 1 on any finding, and 1 if it read zero pages (rule 0). --self-test proves it can fail.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { storeConfig } from "../content/parts.mjs";

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
// (6) The launch claims, per store. Each live store's "not yet" words; then, once any store is live, the
// words that say the whole app is not out (a bare "coming soon" that names no store left to come).
const STORE_NAMES = { ios: "App Store", play: "Google Play" };
const notYetFor = (n) => new RegExp(`coming soon to (?:the )?${n}|${n}: coming soon|muy pronto (?:a|al|en)(?: el)? ${n}|${n}: muy pronto|곧 ${n}|${n}에 나오기 전|即将上架 ${n}|还没有在 ${n}`, "i");
const nowOnFor = (n) => new RegExp(`now on (?:the )?${n}|ya está en (?:el )?${n}|지금 (?:iPhone용 |Android용 )?${n}에(?:서)? (?:있어요|받으)|已在 (?:iPhone 的 |Android 的 )?${n}|\\bon the ${n} for`, "i");
const NOT_OUT = /(?<!(?:App Store|Google Play): )\bcoming[- ]soon\b(?! to (?:the App Store|Google Play))|(?<!(?:App Store|Google Play): )muy pronto(?! (?:a|al|en)(?: el)? (?:App Store|Google Play))|not yet in any app store|\bnot out yet\b|no launch date|when the app is live|once the app is available|cuando la app esté disponible|todavía no está en ninguna tienda|앱 출시와 함께|앱이 나오면|앱이 올라가면|上架后|上架时|上架以后|working (?:hard )?to bring this/i;
export function launchFindings(name, text, store) {
  const out = [];
  const live = { ios: Boolean(store.app_store_url), play: Boolean(store.play_url) };
  if (!live.ios && !live.play) { const m = text.match(/available now|disponible ya/i); if (m) out.push(`${name}: "available now" while no store URL is set (${m[0]})`); }
  // A store that is not live keeps its own true "coming soon" line; it is cut before the not-out check.
  let rest = text;
  for (const [k, n] of Object.entries(STORE_NAMES)) {
    if (live[k]) {
      const m = text.match(notYetFor(n));
      if (m) out.push(`${name}: says ${n} is not out yet, but store.json has its URL (${m[0]})`);
    } else {
      const m = text.match(nowOnFor(n));
      if (m) out.push(`${name}: says the app is on ${n}, but store.json has no ${n} URL (${m[0]})`);
      rest = rest.replace(new RegExp(notYetFor(n).source, "gi"), "");
    }
  }
  if (live.ios || live.play) { const m = rest.match(NOT_OUT); if (m) out.push(`${name}: says the app is not out yet, but a store is live (${m[0]})`); }
  return out;
}
const withoutUrls = (t) => t.replace(/<link rel="manifest"[^>]*>/g, "").replace(/(?:href|src)="[^"]*"/g, "").replace(/https?:\/\/[^\s"<]+/g, "");

export function check(files, storeState = storeConfig()) {
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
    // The store blocks (the CTA, the home hero, llms.txt's store line) are filled from store.json; the
    // JSON-LD may name exactly the listings store.json holds (downloadUrl, installUrl, sameAs).
    const listings = [storeState.app_store_url, storeState.play_url].filter(Boolean);
    const outside = text.replace(/<!-- (cta|hero-cta|stores):start -->[\s\S]*?<!-- \1:end -->/g, "")
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (ld) => listings.reduce((t, u) => t.split(JSON.stringify(u).slice(1, -1)).join(""), ld)).replace(/<a class="src" rel="nofollow noopener" href="https:\/\/apps\.apple\.com\/[^"]+">/g, "")
      // The legal pages' cancel link to Google Play's own subscription settings is not a store listing.
      .replace(/<a class="src" rel="nofollow noopener" href="https:\/\/play\.google\.com\/store\/account\/subscriptions">/g, "");
    const store = outside.match(/apps\.apple\.com|play\.google\.com\/store|download on the app store|get it on google play|\/brand\/stores\/|\/go\/(?:app-store|google-play)\b/i);
    if (store) findings.push(`${name}: a store link or badge outside the store CTA (${store[0]})`);
    for (const b of text.matchAll(/class="store-badge" href="([^"]*)"/g)) if (!/^\/go\/(?:app-store|google-play)(?:\?|$)/.test(b[1])) findings.push(`${name}: a store badge that skips the /go/ tap count (${b[1]})`);
    findings.push(...launchFindings(name, withoutUrls(text), storeState));
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

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain && process.argv.includes("--self-test")) {
  // Fixtures for every store state, never the live store.json (CI must hold the rules before AND after a flip).
  const SOON = { app_store_url: null, play_url: null }, IOS = { app_store_url: "https://apps.apple.com/us/app/x/id1", play_url: null };
  const PLAY = { app_store_url: null, play_url: "https://play.google.com/store/apps/details?id=x" };
  const bad = check([
    ["a.html", '<meta name="pbs:door" content="faith"><p>Black Bible Stories</p><a href="/b">x</a><form action="https://x.example">'],
    ["d.html", '<p>Available now!</p><a href="https://apps.apple.com/us/app/x/id1">get</a>'],
    ["b.html", '<meta name="pbs:door" content="mindset"><p>law of assumption: how to manifest, and the law of attraction</p><link rel="manifest" href="/site.webmanifest">'],
    ["g.html", '<meta name="pbs:door" content="faith"><p>Manifest your blessing.</p>'],
    ["h.txt", "- [Gratitude](https://peacebestillapp.com/questions/how-to-manifest/)\n- the law of attraction"],
    ["c.html", "<p>the law of assumption</p><script src=\"https://t.example/x.js\"></script>"],
    ["e.html", "<p>We guarantee sleep. Write to someone@peacebestillapp.com.</p>"],
    ["p.html", '<a class="src" rel="nofollow noopener" href="https://play.google.com/store/apps/details?id=com.peacebestillapp.mobile">get</a>'],
    ["q.html", "<p>Peace Be Still is now on the App Store for iPhone.</p>"],
  ], SOON);
  // The App Store is live, Google Play is not: every "not out yet" line that still names the App Store, or
  // the whole app, is caught; a "now on Google Play" is caught.
  const iosBad = check([
    ["l1.html", "<p>Peace Be Still, coming soon to the App Store and Google Play, has Psalm Nights.</p>"],
    ["l2.html", "<p>Peace Be Still, coming soon, has Hush Harbor.</p>"],
    ["l3.html", "<p>Peace Be Still es una app que llega muy pronto al App Store y a Google Play.</p>"],
    ["l4.html", "<p>아직 App Store에 나오기 전이에요.</p>"],
    ["l5.html", "<p>应用上架后是英文的。</p>"],
    ["l6.html", "<p>There is no launch date yet.</p>"],
    ["l7.html", "<p>Now on Google Play for Android.</p>"],
    ["l8.html", '<script type="application/ld+json">{"downloadUrl":"https://apps.apple.com/us/app/other/id9"}</script>'],
    ["l9.html", "<table><tr><td>Rating shown</td><td>Not out yet</td></tr></table>"],
    ["l10.html", '<p>Get it: <a href="/go/app-store?ct=home">App Store</a></p>'],
    ["l11.html", '<!-- cta:start --><a class="store-badge" href="https://apps.apple.com/us/app/x/id1?ct=home&mt=8"><img src="/brand/stores/app-store-en.svg"></a><!-- cta:end -->'],
  ], IOS);
  const iosWant = ["l1.html: says App Store is not out yet", "l2.html: says the app is not out yet", "l3.html: says App Store is not out yet", "l4.html: says App Store is not out yet", "l5.html: says the app is not out yet", "l6.html: says the app is not out yet", "l7.html: says the app is on Google Play", "l8.html: a store link or badge outside the store CTA", "l9.html: says the app is not out yet", "l10.html: a store link or badge outside the store CTA (/go/app-store)", "l11.html: a store badge that skips the /go/ tap count"];
  const playBad = check([["m1.html", "<p>Muy pronto en Google Play.</p>"], ["m2.html", "<p>已在 App Store 上架</p>"]], PLAY);
  const playWant = ["m1.html: says Google Play is not out yet", "m2.html: says the app is on App Store"];
  const missingStates = [...iosWant.filter((w) => !iosBad.some((f) => f.includes(w))), ...playWant.filter((w) => !playBad.some((f) => f.includes(w)))];
  if (missingStates.length) { console.error(`check-site --self-test: did not catch: ${missingStates.join("; ")}`); process.exit(1); }
  // The true lines of each state pass: the soon state's own words, and with the App Store live, Google
  // Play's own "coming soon" line, the CTA's "Google Play: coming soon" and the listing in JSON-LD.
  const statesClean = [
    ...check([["s1.html", "<p>Coming soon to the App Store and Google Play. No launch date.</p><span>App Store: coming soon</span>"]], SOON),
    ...check([["s2.html", '<p>Now on the App Store for iPhone. Coming soon to Google Play.</p><span class="store-soon">Google Play: coming soon</span><p>Ya está en el App Store para iPhone. Llega muy pronto a Google Play.</p><p>지금 App Store에 있어요. Google Play에는 곧 나와요.</p><script type="application/ld+json">{"downloadUrl":"https://apps.apple.com/us/app/x/id1"}</script><!-- cta:start --><a class="store-badge" href="/go/app-store?ct=home&amp;ppid=p-1"><img src="/brand/stores/app-store-en.svg"></a><!-- cta:end -->']], IOS),
  ];
  if (statesClean.length) { console.error(`check-site --self-test: flagged a true launch line: ${statesClean.join("; ")}`); process.exit(1); }
  const want = ["registered trademark", "a faith page links a mindset page", "a form (sign-ups are closed", "a store link or badge outside the store CTA", "available now", "mindset-practice words on a neutral page", "a script other than JSON-LD", "e.html: outcome or health promise", "e.html: an email address", "g.html: manifesting words on a faith page", "h.txt: manifesting words on a neutral page (law of attraction)", "p.html: a store link or badge outside the store CTA", "q.html: says the app is on App Store"];
  const missing = want.filter((w) => !bad.some((f) => f.includes(w)));
  if (missing.length) { console.error(`check-site --self-test: did not catch: ${missing.join("; ")}`); process.exit(1); }
  if (bad.some((f) => f.startsWith("b.html"))) { console.error("check-site --self-test: flagged a clean mindset page"); process.exit(1); }
  const cleanFiles = [["f.html", "<p>Listening does not guarantee sleep. Write to info@peacebestillapp.com.</p>"], ["i.xml", "<loc>https://peacebestillapp.com/questions/how-to-manifest/</loc>"], ["j.html", '<link rel="manifest" href="/site.webmanifest">'], ["k.html", '<a class="src" rel="nofollow noopener" href="https://play.google.com/store/account/subscriptions">cancel</a>']];
  const clean = [SOON, IOS, PLAY].flatMap((st) => check(cleanFiles, st));
  if (clean.length) { console.error(`check-site --self-test: flagged the legal contact or a negated guarantee: ${clean.join("; ")}`); process.exit(1); }
  console.log(`OUTPUT check-site --self-test: caught all ${want.length + iosWant.length + playWant.length} planted faults across 3 store states`);
  process.exit(0);
}

if (isMain) {
const files = readAll();
if (files.length === 0) { console.error("NAMED STOP [NO_PAGES] check-site read zero pages"); process.exit(1); }
const findings = check(files);
if (findings.length) { console.error(findings.join("\n")); console.error(`check-site: ${findings.length} finding(s) in ${files.length} files`); process.exit(1); }
console.log(`OUTPUT check-site: ${files.length} files clean`);
}
