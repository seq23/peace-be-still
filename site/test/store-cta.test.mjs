// The store call to action: one component, driven by site/config/store.json (owner 18 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { appStoreHref, claimHtml, claimKind, facts, fillStores, storeCtaHtml, storeConfig, storeHeroHtml, storeWords, langOf, sourceOf } from "../content/parts.mjs";
import { homeHtml } from "../content/home.mjs";
import { check, launchFindings } from "../scripts/check-site.mjs";
import { doorOf } from "../scripts/apply-cta.mjs";
import { goTarget } from "../src/app.js";
import { listingHref } from "../content/store-links.mjs";

// A badge's href is our own /api/go/ link; this follows it through the Worker's redirect (the same code that
// answers /api/go/ in production) to the listing a person lands on.
const hrefs = (html) => [...html.matchAll(/class="store-badge" href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const follow = (href, store) => goTarget(new URL(href, "https://peacebestillapp.com"), store).location;

const IOS = "https://apps.apple.com/us/app/peace-be-still/id1234567890";
const PLAY = "https://play.google.com/store/apps/details?id=com.example.pbs";

test("null store URLs render coming-soon text, never a badge, a date or 'available now'", () => {
  const SOON = { en: [/App Store: coming soon/, /Google Play: coming soon/], es: [/App Store: muy pronto/, /Google Play: muy pronto/], ko: [/곧 App Store에 나와요/, /곧 Google Play에 나와요/], "zh-Hans": [/即将上架 App Store/, /即将上架 Google Play/] };
  for (const lang of ["en", "es", "ko", "zh-Hans"]) {
    const h = storeCtaHtml(lang, { app_store_url: null, play_url: null });
    assert.match(h, SOON[lang][0]);
    assert.match(h, SOON[lang][1]);
    assert.doesNotMatch(h, /<img|apps\.apple\.com|play\.google\.com|available now|disponible ya|20\d\d/i);
  }
});

test("each store flips on its own: a URL renders that store's badge linking to it", () => {
  const ios = storeCtaHtml("en", { app_store_url: IOS, play_url: null });
  assert.ok(ios.includes(`<a class="store-badge" href="/api/go/app-store"><img src="/brand/stores/app-store-en.svg"`));
  assert.equal(follow("/api/go/app-store", { app_store_url: IOS, play_url: null }), IOS);
  assert.match(ios, /Google Play: coming soon/);
  assert.doesNotMatch(ios, /App Store: coming soon/);
  const both = storeCtaHtml("es", { app_store_url: IOS, play_url: PLAY });
  assert.ok(both.includes(`href="/api/go/google-play"><img src="/brand/stores/google-play-es.png"`));
  assert.equal(follow("/api/go/google-play", { app_store_url: IOS, play_url: PLAY }), PLAY);
  // A store with no URL: its /api/go/ link sends a person to the store box, never to a listing.
  assert.equal(follow("/api/go/google-play", { app_store_url: IOS, play_url: null }), "https://peacebestillapp.com/#get-the-app");
  assert.doesNotMatch(both, /muy pronto/i);
});

test("the Korean and Chinese CTAs say the app is in English and Spanish today (no Korean or Chinese app is implied)", () => {
  for (const store of [{ app_store_url: null, play_url: null }, { app_store_url: IOS, play_url: PLAY }]) {
    assert.match(storeCtaHtml("ko", store), /영어와 스페인어로/);
    assert.match(storeCtaHtml("zh-Hans", store), /应用界面目前是英文和西班牙文/);
  }
  assert.equal(langOf('<html lang="ko">'), "ko");
  assert.equal(langOf('<html lang="zh-Hans">'), "zh-Hans");
  assert.equal(langOf('<html lang="fr">'), "en");
});

test("every built page carries the CTA only from the component, up to date with store.json", () => {
  const pub = new URL("../public/", import.meta.url).pathname;
  const pages = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) pages.push(p); } })(pub);
  const store = storeConfig();
  let withCta = 0;
  for (const p of pages) {
    const s = readFileSync(p, "utf8");
    const lang = langOf(s);
    const blocks = s.match(/<!-- cta:start -->[\s\S]*?<!-- cta:end -->/g) || [];
    for (const b of blocks) assert.equal(b, storeCtaHtml(lang, store, sourceOf(p.slice(pub.length)), p.slice(pub.length), doorOf(s)), `${p}: stale or hand-edited CTA (run node site/scripts/apply-cta.mjs)`);
    for (const b of s.match(/<!-- hero-cta:start -->[\s\S]*?<!-- hero-cta:end -->/g) || []) assert.equal(b, storeHeroHtml(lang, store, sourceOf(p.slice(pub.length)), p.slice(pub.length), doorOf(s)), `${p}: stale or hand-edited hero store line`);
    const outside = s.replace(/<!-- (cta|hero-cta):start -->[\s\S]*?<!-- \1:end -->/g, "");
    assert.doesNotMatch(outside, /store-badge|store-soon|\/brand\/stores\/|id="waitlist"|#waitlist|action="\/api\/waitlist"/, `${p}: a CTA or waitlist outside the component`);
    if (blocks.length) withCta++;
  }
  assert.ok(pages.length > 0 && withCta >= 10, `only ${withCta} of ${pages.length} pages carry the store CTA`);
});

test("privacy leads (her ruling 21 Nov 2026): the home hero and the Bible chat pages open with the app's approved claim, and every EN/ES store CTA carries the training promise", () => {
  const pub = new URL("../public/", import.meta.url).pathname;
  // The two-door home pages carry the claim with no faith words (21 Nov 2026); the Bible chat pages keep "Bible chat".
  for (const [f, lang, kind, want] of [
    ["index.html", "en", "any", new RegExp(String.raw`<b>With a paid plan: unlimited chat\.<\/b> <small>Private for your first ${facts().paid} messages each day`)],
    ["es/index.html", "es", "any", new RegExp(String.raw`<b>Con un plan de pago: chat ilimitado\.<\/b> <small>Privado en los primeros ${facts().paid} mensajes de cada día`)],
    ["free-bible-chat/index.html", "en", "bible", new RegExp(String.raw`<b>With a paid plan: unlimited Bible chat\.<\/b> <small>Private for your first ${facts().paid} messages each day`)],
    ["es/chat-biblico-gratis/index.html", "es", "bible", new RegExp(String.raw`<b>Con un plan de pago: chat bíblico ilimitado\.<\/b> <small>Privado en los primeros ${facts().paid} mensajes de cada día`)],
  ]) {
    const s = readFileSync(join(pub, f), "utf8");
    assert.equal(claimKind(f, doorOf(s)), kind, f);
    const claim = claimHtml(lang, kind);
    assert.ok(claim.includes("never used to train AI") || claim.includes("nunca se usan para entrenar IA"), lang);
    // Her yes 21 Nov 2026: the lead says it is the paid plan's, on the page and in the CTA box.
    assert.match(claim, want, f);
    const at = s.indexOf(claim);
    assert.ok(at > 0 && at - s.indexOf("</h1>") < 80, `${f}: the claim is not the lead under the heading`);
  }
  const store = storeConfig();
  for (const lang of ["en", "es"]) for (const door of ["faith", "neutral", "mindset"]) assert.match(storeCtaHtml(lang, store, "", "", door), lang === "es" ? /class="cta-privacy"><b>Con un plan de pago: / : /class="cta-privacy"><b>With a paid plan: /);
  // A Mindset page's CTA box never says "Bible".
  assert.doesNotMatch(storeCtaHtml("en", store, "", "questions/daily-affirmations/index.html", "mindset"), /Bible/);
  assert.doesNotMatch(storeCtaHtml("es", store, "", "es/mentalidad/index.html", "mindset"), /bíblico/);
  assert.doesNotMatch(storeCtaHtml("ko", store), /cta-privacy/);
});

test("each page's store links name the page that sent the buyer", () => {
  const store = { app_store_url: "https://apps.apple.com/us/app/peace-be-still/id1", play_url: "https://play.google.com/store/apps/details?id=x", app_store_pt: "123" };
  const h = storeCtaHtml("en", store, sourceOf("questions/hallow-app-cost/index.html"));
  const [ios, play] = hrefs(h);
  assert.equal(ios, "/api/go/app-store?ct=questions-hallow-app-cost");
  assert.equal(play, "/api/go/google-play?ct=questions-hallow-app-cost");
  assert.equal(follow(ios, store), "https://apps.apple.com/us/app/peace-be-still/id1?pt=123&ct=questions-hallow-app-cost&mt=8");
  assert.equal(follow(play, store), "https://play.google.com/store/apps/details?id=x&referrer=utm_source%3Dpeacebestillapp.com%26utm_medium%3Dsite%26utm_campaign%3Dquestions-hallow-app-cost");
  assert.equal(sourceOf("index.html"), "home");
  assert.equal(sourceOf("es/index.html"), "es");
  assert.doesNotMatch(storeCtaHtml("en", store), /ct=|referrer=/); // a link with no page says nothing
  assert.equal(follow(hrefs(storeCtaHtml("en", store))[0], store), store.app_store_url);
});

test("a landing page's App Store link opens its custom product page and names the page, in one link", () => {
  const store = { app_store_url: "https://apps.apple.com/us/app/peace-be-still/id1", play_url: null, app_store_pt: "123", custom_pages: [
    { page: "grief", ppid: "g-1", paths: ["questions/bible-verses-for-grief/"] },
    { page: "mi-refugio", ppid: "m-1", paths: [], prefixes: ["es/"] },
    { page: "hush-harbor", ppid: "h-1", paths: ["questions/who-is-black-in-the-bible/"] },
  ] };
  const rel = "questions/bible-verses-for-grief/index.html";
  const [href] = hrefs(storeCtaHtml("en", store, sourceOf(rel), rel));
  assert.equal(href, "/api/go/app-store?ct=questions-bible-verses-for-grief&ppid=g-1");
  assert.equal(follow(href, store), "https://apps.apple.com/us/app/peace-be-still/id1?ppid=g-1&pt=123&ct=questions-bible-verses-for-grief&mt=8");
  // Exact paths only: a sibling page with the same start does not inherit the mapping.
  assert.equal(appStoreHref(store, "questions/who-is-black-in-the-bible-really/index.html"), store.app_store_url);
  assert.equal(appStoreHref(store, "questions/hallow-app-cost/index.html"), store.app_store_url);
  // A folder prefix covers the Spanish site; an exact path beats it.
  assert.equal(appStoreHref(store, "es/preguntas/salmos-para-dormir/index.html"), `${store.app_store_url}?ppid=m-1`);
  assert.equal(appStoreHref({ ...store, app_store_url: null }, rel), null);
});

test("a landing page's Google Play link opens its custom store listing, and stays off while Play has no URL", () => {
  const custom_pages = [
    { page: "grief", ppid: "g-1", play_listing: "grief", paths: ["questions/bible-verses-for-grief/"] },
    { page: "mi-refugio", ppid: "m-1", play_listing: "mi-refugio", paths: [], prefixes: ["es/"] },
  ];
  const store = { app_store_url: IOS, play_url: PLAY, custom_pages };
  const rel = "questions/bible-verses-for-grief/index.html";
  const [, play] = hrefs(storeCtaHtml("en", store, sourceOf(rel), rel));
  assert.equal(play, "/api/go/google-play?ct=questions-bible-verses-for-grief&listing=grief");
  assert.equal(follow(play, store), `${PLAY}&listing=grief&referrer=utm_source%3Dpeacebestillapp.com%26utm_medium%3Dsite%26utm_campaign%3Dquestions-bible-verses-for-grief`);
  assert.equal(listingHref("play", store, "", "es/preguntas/salmos-para-dormir/index.html"), `${PLAY}&listing=mi-refugio`);
  assert.equal(listingHref("play", store, "", "questions/hallow-app-cost/index.html"), PLAY, "an unlisted page opens the main listing");
  assert.equal(listingHref("play", { ...store, play_url: null }, "", rel), null);
});

test("every Play listing a page links is one of our custom store listings (store/google-play/custom), one per App Store page", () => {
  const { custom_pages: pages } = storeConfig();
  const dir = new URL("../../store/google-play/custom/", import.meta.url).pathname;
  for (const c of pages) {
    assert.equal(c.play_listing, c.page, `${c.page}: Play listing parameter`);
    assert.match(readFileSync(join(dir, `${c.play_listing}.md`), "utf8"), new RegExp(`^URL parameter: ${c.play_listing}$`, "m"), c.page);
  }
});

test("every custom product page mapping lands on a real page", () => {
  const pub = new URL("../public/", import.meta.url).pathname;
  const { custom_pages: pages } = storeConfig();
  assert.equal(pages.length, 8);
  let checked = 0;
  for (const c of pages) {
    assert.match(c.ppid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, c.page);
    for (const path of c.paths) { assert.ok(existsSync(join(pub, path, "index.html")), `${c.page}: ${path} is not a page`); checked++; }
    for (const pre of c.prefixes || []) { assert.ok(statSync(join(pub, pre)).isDirectory(), `${c.page}: ${pre}`); checked++; }
    const rel = c.paths[0] ? `${c.paths[0]}index.html` : null;
    if (rel) assert.match(appStoreHref({ ...storeConfig(), app_store_url: "https://apps.apple.com/app/id1" }, rel), new RegExp(`ppid=${c.ppid}$`), c.page);
  }
  assert.ok(checked >= 20, `only ${checked} mappings checked`);
});

// The launch state is ONE switch (store.json), 23 Nov 2026: every "not out yet" line reads it. Every
// content page and both home pages are rendered in all four store states (fixtures, never the live
// config) and checked by the same rule check-site runs on the built site.
const STATES = {
  soon: { app_store_url: null, play_url: null },
  ios: { app_store_url: IOS, play_url: null },
  play: { app_store_url: null, play_url: PLAY },
  both: { app_store_url: IOS, play_url: PLAY },
};

// Written apart from check-site's rule 6, so switching that rule off cannot also pass this test.
const APP_STORE_SOON = /coming soon[^.<\n]{0,30}App Store|muy pronto[^.<\n]{0,30}App Store|App Store\s*[:—-]\s*(?:coming soon|muy pronto)|곧 App Store|아직 App Store|即将[^。<\n]{0,10}App Store|还没有在 App Store/i;

test("with the App Store live, no rendered or built page pairs 'coming soon' with the App Store", async () => {
  const { PAGES } = await import("../content/questions.mjs");
  for (const state of ["ios", "both"]) {
    const store = STATES[state];
    for (const p of PAGES) assert.doesNotMatch(fillStores(JSON.stringify(p), p.lang, store), APP_STORE_SOON, `${state} ${p.path}`);
    for (const lang of ["en", "es"]) assert.doesNotMatch(homeHtml(lang, store) + storeHeroHtml(lang, store, "home", "index.html"), APP_STORE_SOON, `${state} ${lang} home`);
    for (const lang of ["en", "es", "ko", "zh-Hans"]) assert.doesNotMatch(storeCtaHtml(lang, store) + storeHeroHtml(lang, store, "home", "index.html"), APP_STORE_SOON, `${state} ${lang} CTA`);
  }
  // The pattern itself bites: the pre-launch words match it.
  for (const lang of ["en", "es", "ko", "zh-Hans"]) assert.match(fillStores("{{stores.line}} {{stores.out}}", lang, STATES.soon), APP_STORE_SOON, `${lang}: the soon words`);
  if (!storeConfig().app_store_url) return;
  const pub = new URL("../public/", import.meta.url).pathname;
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  const built = walk(pub).filter((f) => /\.(html|txt|json)$/.test(f));
  assert.ok(built.length > 100, `only ${built.length} built files`);
  for (const f of built) assert.doesNotMatch(readFileSync(f, "utf8"), APP_STORE_SOON, f.slice(pub.length));
});

test("every page's launch words are true in every store state (no App Store 'coming soon' once it is live)", async () => {
  const { PAGES } = await import("../content/questions.mjs");
  assert.ok(PAGES.length >= 100, `only ${PAGES.length} pages`);
  for (const [state, store] of Object.entries(STATES)) {
    const found = [];
    for (const p of PAGES) {
      const text = fillStores(JSON.stringify(p), p.lang, store);
      assert.doesNotMatch(text, /\{\{stores\./, `${p.path}: an unfilled launch token`);
      found.push(...launchFindings(p.path, text, store));
    }
    for (const lang of ["en", "es"]) {
      const h = homeHtml(lang, store).replace(/<!-- hero-cta:start -->[\s\S]*?<!-- hero-cta:end -->/, storeHeroHtml(lang, store, "home", "index.html"));
      found.push(...check([[`${lang}/index.html`, h]], store));
    }
    assert.deepEqual(found, [], `${state}: ${found.join("; ")}`);
  }
});

test("with the App Store live, the home hero shows its badge, the title and FAQ say iPhone, and the JSON-LD names the listing", () => {
  const store = STATES.ios;
  const en = homeHtml("en", store);
  assert.match(en, /<title>[^<]*for iPhone<\/title>/);
  assert.match(en, /"downloadUrl":"https:\/\/apps\.apple\.com\/us\/app\/peace-be-still\/id1234567890"/);
  assert.match(en, /"sameAs":\[[^\]]*id1234567890/);
  assert.match(en, /Is Peace Be Still out yet\?[\s\S]{0,200}Yes/);
  for (const [lang, badge] of [["en", "app-store-en"], ["es", "app-store-es"], ["ko", "app-store-ko"], ["zh-Hans", "app-store-zh-hans"]]) {
    const hero = storeHeroHtml(lang, store, "home", "index.html");
    assert.ok(hero.includes(`href="/api/go/app-store?ct=home"><img src="/brand/stores/${badge}.svg"`), `${lang}: hero badge`);
    assert.equal(follow("/api/go/app-store?ct=home", store), `${IOS}?ct=home&mt=8`, `${lang}: hero badge target`);
    assert.doesNotMatch(hero, /play\.google\.com/);
    assert.match(storeCtaHtml(lang, store), new RegExp(`/brand/stores/${badge}\\.svg`));
  }
  // Nothing is live: no badge, no listing in the JSON-LD, the soon words.
  const soon = homeHtml("en", STATES.soon);
  assert.doesNotMatch(soon + storeHeroHtml("en", STATES.soon), /apps\.apple\.com|downloadUrl|store-badge/);
  assert.match(soon, /<title>[^<]*Coming Soon<\/title>/);
});

test("a launch word a language lacks is a named stop, never a blank", () => {
  assert.throws(() => fillStores("{{stores.nope}}", "en", STATES.ios), /NAMED STOP \[NO_STORE_WORDS\]/);
  assert.throws(() => fillStores("{{stores.title}}", "ko", STATES.ios), /NAMED STOP \[NO_STORE_WORDS\]/);
  for (const lang of ["en", "es", "ko", "zh-Hans"]) for (const store of Object.values(STATES)) assert.ok(storeWords(lang, store).out, `${lang}: no out line`);
});

test("every live badge on every built page goes through /api/go/ to that page's exact tagged listing (EN, ES, KO, ZH)", () => {
  const pub = new URL("../public/", import.meta.url).pathname;
  const store = storeConfig();
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  let badges = 0, custom = 0;
  const langs = new Set();
  for (const f of walk(pub).filter((x) => x.endsWith(".html"))) {
    const s = readFileSync(f, "utf8"), rel = f.slice(pub.length);
    for (const href of hrefs(s)) {
      const kind = href.startsWith("/api/go/app-store") ? "ios" : href.startsWith("/api/go/google-play") ? "play" : null;
      assert.ok(kind, `${rel}: a badge that skips /api/go/ (${href})`);
      const want = listingHref(kind, store, sourceOf(rel), rel, doorOf(s));
      assert.ok(want, `${rel}: a ${kind} badge while store.json has no ${kind} URL`);
      assert.equal(follow(href, store), want, `${rel}: /api/go/ does not land on the page's own listing`);
      if (want.includes("ppid=")) custom++;
      langs.add(langOf(s));
      badges++;
    }
  }
  if (store.app_store_url) {
    assert.ok(badges >= 130, `only ${badges} live badges checked`);
    assert.ok(custom >= 20, `only ${custom} badges open a custom product page`);
    assert.deepEqual([...langs].sort(), ["en", "es", "ko", "zh-Hans"]);
  }
});

test("/api/go/ never carries anything from the request but our own campaign and custom page ids", () => {
  const store = { app_store_url: IOS, play_url: PLAY, custom_pages: [{ page: "grief", ppid: "0c89f8e1-c5b6-4355-937d-af27c07ea8e3", play_listing: "grief", paths: [] }] };
  for (const [href, want] of [
    ["/api/go/app-store?ct=home&ppid=0c89f8e1-c5b6-4355-937d-af27c07ea8e3", `${IOS}?ppid=0c89f8e1-c5b6-4355-937d-af27c07ea8e3&ct=home&mt=8`],
    ["/api/go/app-store?ppid=00000000-0000-0000-0000-000000000000&ct=home", `${IOS}?ct=home&mt=8`], // a ppid that is not ours
    ["/api/go/app-store?ct=home%26url%3Dhttps%3A%2F%2Fevil.example", IOS], // a forged ct
    ["/api/go/app-store?ct=" + "a".repeat(121), IOS], // too long
    ["/api/go/app-store?ct=not-one-of-our-pages", IOS], // well-formed, but no page of ours has that campaign
    ["/api/go/google-play?ct=spam-campaign", PLAY],
    ["/api/go/app-store?ct=%3Cscript%3E&next=https://evil.example&url=//evil.example", IOS],
    ["/api/go/google-play?ct=home&ppid=0c89f8e1-c5b6-4355-937d-af27c07ea8e3", `${PLAY}&referrer=utm_source%3Dpeacebestillapp.com%26utm_medium%3Dsite%26utm_campaign%3Dhome`], // ppid is App Store only
    ["/api/go/google-play?ct=home&listing=grief", `${PLAY}&listing=grief&referrer=utm_source%3Dpeacebestillapp.com%26utm_medium%3Dsite%26utm_campaign%3Dhome`], // our own Play listing
    ["/api/go/google-play?listing=not-ours", PLAY], // a listing that is not ours
    ["/api/go/google-play?listing=grief%26id%3Dcom.evil.app", PLAY], // a forged listing
    ["/api/go/app-store?listing=grief", IOS], // a Play listing is Play only
    ["/api/go/app-store/", IOS],
  ]) {
    const to = follow(href, store);
    assert.equal(to, want, href);
    assert.doesNotMatch(to, /evil|script|00000000/, href);
  }
  assert.equal(goTarget(new URL("https://peacebestillapp.com/api/go/https://evil.example"), store), null, "any other /api/go/ path is not a redirect");
  assert.equal(goTarget(new URL("https://peacebestillapp.com/api/go/"), store), null);
  assert.equal(goTarget(new URL("https://peacebestillapp.com/go/app-store"), store), null, "only /api/go/ redirects");
});

test("the home page's structured data names only the stores that are live (promise audit 27 Nov 2026)", async () => {
  const { homeHtml } = await import("../content/home.mjs");
  const os = (store) => JSON.stringify(homeHtml("en", { ...storeConfig(), ...store })).match(/operatingSystem\\":\\"([^\\"]*)/)[1];
  assert.equal(os({ app_store_url: "https://apps.apple.com/us/app/x/id1", play_url: null }), "iOS");
  assert.equal(os({ app_store_url: null, play_url: "https://play.google.com/store/apps/details?id=x" }), "Android");
  assert.equal(os({ app_store_url: "https://apps.apple.com/us/app/x/id1", play_url: "https://play.google.com/store/apps/details?id=x" }), "iOS, Android");
});
