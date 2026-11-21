// The store call to action: one component, driven by site/config/store.json (owner 18 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { claimHtml, storeCtaHtml, storeConfig, langOf, sourceOf } from "../content/parts.mjs";

const IOS = "https://apps.apple.com/us/app/peace-be-still/id1234567890";
const PLAY = "https://play.google.com/store/apps/details?id=com.example.pbs";

test("null store URLs render coming-soon text, never a badge, a date or 'available now'", () => {
  const SOON = { en: [/Coming soon to the App Store · search “Peace Be Still”/, /Coming soon to Google Play · search “Peace Be Still”/], es: [/Muy pronto en el App Store/, /Muy pronto en Google Play/], ko: [/곧 App Store에 나와요/, /곧 Google Play에 나와요/] };
  for (const lang of ["en", "es", "ko"]) {
    const h = storeCtaHtml(lang, { app_store_url: null, play_url: null });
    assert.match(h, SOON[lang][0]);
    assert.match(h, SOON[lang][1]);
    assert.doesNotMatch(h, /<img|apps\.apple\.com|play\.google\.com|available now|disponible ya|20\d\d/i);
  }
});

test("each store flips on its own: a URL renders that store's badge linking to it", () => {
  const ios = storeCtaHtml("en", { app_store_url: IOS, play_url: null });
  assert.ok(ios.includes(`<a class="store-badge" href="${IOS}"><img src="/brand/stores/app-store-en.svg"`));
  assert.match(ios, /Coming soon to Google Play/);
  assert.doesNotMatch(ios, /Coming soon to the App Store/);
  const both = storeCtaHtml("es", { app_store_url: IOS, play_url: PLAY });
  assert.ok(both.includes(`href="${PLAY}"><img src="/brand/stores/google-play-es.png"`));
  assert.doesNotMatch(both, /Muy pronto/);
});

test("the Korean CTA says the app is in English and Spanish today (no Korean app is implied)", () => {
  for (const store of [{ app_store_url: null, play_url: null }, { app_store_url: IOS, play_url: PLAY }]) {
    assert.match(storeCtaHtml("ko", store), /영어와 스페인어로/);
  }
  assert.equal(langOf('<html lang="ko">'), "ko");
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
    for (const b of blocks) assert.equal(b, storeCtaHtml(lang, store, sourceOf(p.slice(pub.length))), `${p}: stale or hand-edited CTA (run node site/scripts/apply-cta.mjs)`);
    const outside = s.replace(/<!-- cta:start -->[\s\S]*?<!-- cta:end -->/g, "");
    assert.doesNotMatch(outside, /store-badge|store-soon|\/brand\/stores\/|id="waitlist"|#waitlist|action="\/api\/waitlist"/, `${p}: a CTA or waitlist outside the component`);
    if (blocks.length) withCta++;
  }
  assert.ok(pages.length > 0 && withCta >= 10, `only ${withCta} of ${pages.length} pages carry the store CTA`);
});

test("privacy leads (her ruling 21 Nov 2026): the home hero and the Bible chat pages open with the app's approved claim, and every EN/ES store CTA carries the training promise", () => {
  const pub = new URL("../public/", import.meta.url).pathname;
  for (const [f, lang] of [["index.html", "en"], ["es/index.html", "es"], ["free-bible-chat/index.html", "en"], ["es/chat-biblico-gratis/index.html", "es"]]) {
    const s = readFileSync(join(pub, f), "utf8");
    const claim = claimHtml(lang);
    assert.ok(claim.includes("never used to train AI") || claim.includes("nunca se usan para entrenar IA"), lang);
    const at = s.indexOf(claim);
    assert.ok(at > 0 && at - s.indexOf("</h1>") < 80, `${f}: the claim is not the lead under the heading`);
  }
  const store = storeConfig();
  for (const lang of ["en", "es"]) assert.match(storeCtaHtml(lang, store), /class="cta-privacy"/);
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
