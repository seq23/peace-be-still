// The store call to action: one component, driven by site/config/store.json (owner 18 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { appStoreHref, claimHtml, claimKind, facts, fillStores, storeCtaHtml, storeConfig, storeHeroHtml, storeWords, langOf, sourceOf } from "../content/parts.mjs";
import { homeHtml } from "../content/home.mjs";
import { check, launchFindings } from "../scripts/check-site.mjs";
import { doorOf } from "../scripts/apply-cta.mjs";

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
  assert.ok(ios.includes(`<a class="store-badge" href="${IOS}"><img src="/brand/stores/app-store-en.svg"`));
  assert.match(ios, /Google Play: coming soon/);
  assert.doesNotMatch(ios, /App Store: coming soon/);
  const both = storeCtaHtml("es", { app_store_url: IOS, play_url: PLAY });
  assert.ok(both.includes(`href="${PLAY}"><img src="/brand/stores/google-play-es.png"`));
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
  assert.match(h, /id1\?pt=123&ct=questions-hallow-app-cost&mt=8"/);
  assert.match(h, /details\?id=x&referrer=utm_source%3Dpeacebestillapp\.com%26utm_medium%3Dsite%26utm_campaign%3Dquestions-hallow-app-cost"/);
  assert.equal(sourceOf("index.html"), "home");
  assert.equal(sourceOf("es/index.html"), "es");
  assert.doesNotMatch(storeCtaHtml("en", store), /ct=|referrer=/); // a link with no page says nothing
});

test("a landing page's App Store link opens its custom product page and names the page, in one link", () => {
  const store = { app_store_url: "https://apps.apple.com/us/app/peace-be-still/id1", play_url: null, app_store_pt: "123", custom_pages: [
    { page: "grief", ppid: "g-1", paths: ["questions/bible-verses-for-grief/"] },
    { page: "mi-refugio", ppid: "m-1", paths: [], prefixes: ["es/"] },
    { page: "hush-harbor", ppid: "h-1", paths: ["questions/who-is-black-in-the-bible/"] },
  ] };
  const rel = "questions/bible-verses-for-grief/index.html";
  assert.match(storeCtaHtml("en", store, sourceOf(rel), rel), /href="https:\/\/apps\.apple\.com\/us\/app\/peace-be-still\/id1\?ppid=g-1&pt=123&ct=questions-bible-verses-for-grief&mt=8"/);
  // Exact paths only: a sibling page with the same start does not inherit the mapping.
  assert.equal(appStoreHref(store, "questions/who-is-black-in-the-bible-really/index.html"), store.app_store_url);
  assert.equal(appStoreHref(store, "questions/hallow-app-cost/index.html"), store.app_store_url);
  // A folder prefix covers the Spanish site; an exact path beats it.
  assert.equal(appStoreHref(store, "es/preguntas/salmos-para-dormir/index.html"), `${store.app_store_url}?ppid=m-1`);
  assert.equal(appStoreHref({ ...store, app_store_url: null }, rel), null);
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
    assert.ok(hero.includes(`href="${IOS}?ct=home&mt=8"><img src="/brand/stores/${badge}.svg"`), `${lang}: hero badge`);
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
