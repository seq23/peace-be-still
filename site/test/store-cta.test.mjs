// The store call to action: one component, driven by site/config/store.json (owner 18 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { storeCtaHtml, storeConfig, langOf } from "../content/parts.mjs";

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
    for (const b of blocks) assert.equal(b, storeCtaHtml(lang, store), `${p}: stale or hand-edited CTA (run node site/scripts/apply-cta.mjs)`);
    const outside = s.replace(/<!-- cta:start -->[\s\S]*?<!-- cta:end -->/g, "");
    assert.doesNotMatch(outside, /store-badge|store-soon|\/brand\/stores\/|id="waitlist"|#waitlist|action="\/api\/waitlist"/, `${p}: a CTA or waitlist outside the component`);
    if (blocks.length) withCta++;
  }
  assert.ok(pages.length > 0 && withCta >= 10, `only ${withCta} of ${pages.length} pages carry the store CTA`);
});
