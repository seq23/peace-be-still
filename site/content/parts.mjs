// Shared page parts: header, footer and the one action (the store call to action; no waitlist).
export const BASE = "https://peacebestillapp.com";

import { readFileSync } from "node:fs";

// THE store call to action (owner 18 Nov 2026: no waitlist). Every page renders it through this one
// function, between <!-- cta:start --> and <!-- cta:end -->. Per store, from site/config/store.json:
// null -> "coming soon" text (never a date, never "available now"); a URL -> that store's official
// badge (Apple and Google marketing artwork, unaltered) linking to the listing.
export function storeConfig() {
  return JSON.parse(readFileSync(new URL("../config/store.json", import.meta.url), "utf8"));
}
// Her ruling 21 Nov 2026: privacy leads. The approved claim, read from the app's own strings so the site
// can never say more than the app (app/src/i18n; "never used to train AI", not "not kept": see
// app/app/paid/index.tsx for the source on Google's paid-tier logging).
const appStrings = (lang) => JSON.parse(readFileSync(new URL(`../../app/src/i18n/${lang}.json`, import.meta.url), "utf8"));
// The chat and price numbers every page says, read from the app's own settings (app/src/gates for the
// daily message counts, app/src/config/products.json for the prices), so no page types a number.
export function facts() {
  const gates = readFileSync(new URL("../../app/src/gates/index.ts", import.meta.url), "utf8");
  const num = (name) => Number(gates.match(new RegExp(`${name} = (\\d+);`))[1]);
  const products = JSON.parse(readFileSync(new URL("../../app/src/config/products.json", import.meta.url), "utf8")).products;
  return { free: num("FREE_CHAT_MESSAGES"), paid: num("PAID_CHAT_MESSAGES"), monthly: `$${products.monthly.usPrice}`, yearly: `$${products.yearly.usPrice}` };
}
// kind "bible": the God's Word claim ("unlimited Bible chat"); kind "any": the same claim with no faith
// words (the app's Mindset headline), for Mindset pages and the two-door home pages.
export function privacyClaim(lang, kind = "bible") {
  if (lang !== "en" && lang !== "es") return null; // no approved Korean wording yet
  const s = appStrings(lang);
  // Her yes 21 Nov 2026: on the site the claim always says it is the paid plan's ("With a paid plan: ...").
  const headline = s[kind === "any" ? "paid.chatHeadlineMindset" : "paid.chatHeadline"];
  const head = `${PLAN_PREFIX[lang]}: ${headline.replace(/^./, (ch) => ch.toLowerCase())}`;
  return { head, promise: s["paid.noTraining"], small: s["paid.fairUse"].replace("%{count}", facts().paid) };
}
const PLAN_PREFIX = { en: "With a paid plan", es: "Con un plan de pago" };
/** Which claim a page carries: Mindset pages and the two-door home pages say it with no faith words. */
const BOTH_DOORS = new Set(["index.html", "es/index.html"]);
export function claimKind(page = "", door = "neutral") {
  return door === "mindset" || BOTH_DOORS.has(String(page).replace(/^\/+/, "")) ? "any" : "bible";
}
/** The claim as the page lead (home hero, the Bible chat pages, the Mindset hub). */
export function claimHtml(lang, kind = "bible") {
  const c = privacyClaim(lang, kind);
  return c ? `<p class="claim">${claimBody(c)}</p>` : "";
}
const claimBody = (c) => `<b>${c.head}.</b> ${c.promise} <small>${c.small}</small>`;
/** The same claim in the store CTA box, beside the buttons. */
export function ctaClaimHtml(lang, kind = "bible") {
  const c = privacyClaim(lang, kind);
  return c ? `\n    <p class="cta-privacy">${claimBody(c)}</p>` : "";
}
// Which page sent a buyer: the page's path as a campaign name on each store link (Apple App Analytics
// reads ct, with pt = her provider token from App Store Connect once store.json has it; Google Play
// reads the referrer's utm fields).
export function sourceOf(relPath) {
  const p = String(relPath).replace(/^\/+/, "").replace(/(?:^|\/)index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "");
  return (p || "home").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}
const tagged = (url, store, kind, source) => {
  if (!source) return url;
  const sep = url.includes("?") ? "&" : "?";
  if (kind === "ios") return `${url}${sep}${store.app_store_pt ? `pt=${encodeURIComponent(store.app_store_pt)}&` : ""}ct=${source}&mt=8`;
  return `${url}${sep}referrer=${encodeURIComponent(`utm_source=peacebestillapp.com&utm_medium=site&utm_campaign=${source}`)}`;
};
const CTA = {
  en: {
    soonH: "Look for Peace Be Still in the App Store and Google Play",
    liveH: "Get Peace Be Still",
    p: "Free to download, with a free version that stays free. No ads, no trial.",
    iosSoon: "Coming soon to the App Store · search “Peace Be Still”",
    playSoon: "Coming soon to Google Play · search “Peace Be Still”",
    iosAlt: "Download on the App Store",
    playAlt: "Get it on Google Play",
  },
  es: {
    soonH: "Busca Peace Be Still en el App Store y Google Play",
    liveH: "Descarga Peace Be Still",
    p: "Gratis para descargar, con un camino gratis que siempre es gratis. Sin anuncios, sin prueba.",
    iosSoon: "Muy pronto en el App Store · busca “Peace Be Still”",
    playSoon: "Muy pronto en Google Play · busca “Peace Be Still”",
    iosAlt: "Descárgalo en el App Store",
    playAlt: "Disponible en Google Play",
  },
  // Korean pages (21 Nov 2026): the app itself is in English and Spanish, so the Korean CTA says so
  // where people decide to download.
  ko: {
    soonH: "App Store와 Google Play에서 Peace Be Still을 찾아 주세요",
    liveH: "Peace Be Still 받기",
    p: "무료로 내려받을 수 있고, 무료로 쓰는 부분은 계속 무료예요. 광고도, 자동 결제로 넘어가는 무료 체험도 없어요. 앱 화면은 지금 영어와 스페인어로 되어 있어요.",
    iosSoon: "곧 App Store에 나와요",
    playSoon: "곧 Google Play에 나와요",
    iosAlt: "App Store에서 다운로드",
    playAlt: "Google Play에서 받기",
  },
};
// The page languages the site renders: English, Spanish and (landing + question pages only) Korean.
export const LANGS = ["en", "es", "ko"];
export const langOf = (html) => {
  const l = (String(html).match(/<html lang="(\w+)"/) || [])[1];
  return LANGS.includes(l) ? l : "en";
};
/** The App Store link for a page (its path under site/public): the page's custom product page when
 *  store.json custom_pages lists it (an exact path first, then the page's door, then the longest folder
 *  prefix), otherwise the default product page. The ct= tag is added on top by tagged(). */
export function appStoreHref(store, page = "", door = "neutral") {
  if (!store.app_store_url) return null;
  const path = String(page).replace(/^\/+/, "").replace(/(?:^|\/)index\.html$/, (m) => (m.startsWith("/") ? "/" : ""));
  const pages = store.custom_pages || [];
  const exact = pages.find((c) => [...(c.paths || []), ...(c.waiting_on_pr85 || [])].includes(path));
  const byDoor = exact ? null : pages.find((c) => (c.doors || []).includes(door));
  const prefix = exact || byDoor ? null : pages.flatMap((c) => (c.prefixes || []).map((pre) => ({ pre, c }))).filter((x) => path.startsWith(x.pre)).sort((x, y) => y.pre.length - x.pre.length)[0]?.c;
  const hit = exact || byDoor || prefix;
  return hit ? `${store.app_store_url}${store.app_store_url.includes("?") ? "&" : "?"}ppid=${hit.ppid}` : store.app_store_url;
}

export function storeCtaHtml(lang, store = storeConfig(), source = "", page = "", door = "neutral") {
  const t = CTA[LANGS.includes(lang) ? lang : "en"];
  const ios = store.app_store_url
    ? `<a class="store-badge" href="${tagged(appStoreHref(store, page, door), store, "ios", source)}"><img src="/brand/stores/app-store-en.svg" alt="${t.iosAlt}" width="120" height="40"></a>`
    : `<span class="store-soon">${t.iosSoon}</span>`;
  const play = store.play_url
    ? `<a class="store-badge" href="${tagged(store.play_url, store, "play", source)}"><img src="/brand/stores/google-play-${lang === "es" ? "es" : "en"}.png" alt="${t.playAlt}" width="135" height="52"></a>`
    : `<span class="store-soon">${t.playSoon}</span>`;
  const h = store.app_store_url || store.play_url ? t.liveH : t.soonH;
  return `<!-- cta:start --><section class="wrap" id="get-the-app" aria-labelledby="cta-h">
  <div class="card cta-card">
    <h2 id="cta-h">${h}</h2>
    <p>${t.p}</p>${ctaClaimHtml(lang, claimKind(page, door))}
    <ul class="stores">
      <li>${ios}</li>
      <li>${play}</li>
    </ul>
  </div>
</section><!-- cta:end -->`;
}

export function headerHtml(lang, altPath) {
  if (lang === "ko") return `<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="wrap site-head">
  <a class="brand" href="/ko/" aria-label="Peace Be Still, 한국어 첫 페이지">
    <picture>
      <source srcset="/brand/pbs-wordmark-dark.svg" media="(prefers-color-scheme: dark)">
      <img src="/brand/pbs-wordmark-light.svg" alt="Peace Be Still" width="225" height="36">
    </picture>
  </a>
  <a class="lang" href="${altPath || "/"}" hreflang="en" lang="en">English ›</a>
</header>`;
  const es = lang === "es";
  const alt = altPath || (es ? "/" : "/es/");
  return `<a class="skip" href="#main">${es ? "Ir al contenido" : "Skip to the page"}</a>
<header class="wrap site-head">
  <a class="brand" href="${es ? "/es/" : "/"}" aria-label="${es ? "Peace Be Still, inicio" : "Peace Be Still, home"}">
    <picture>
      <source srcset="/brand/pbs-wordmark-dark.svg" media="(prefers-color-scheme: dark)">
      <img src="/brand/pbs-wordmark-light.svg" alt="Peace Be Still" width="225" height="36">
    </picture>
  </a>
  <a class="lang" href="${alt}" hreflang="${es ? "en" : "es"}" lang="${es ? "en" : "es"}">${es ? "English ›" : "Español ›"}</a>
</header>`;
}

// A page's "updated" date (ISO "2026-11-21", or the old "18 Nov 2026" text) as each language writes it.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function updatedText(updated, lang) {
  let y, m, d;
  const iso = String(updated).match(/^(\d{4})-(\d\d)-(\d\d)$/);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else { const t = String(updated).match(/^(\d{1,2}) (\w{3}) (\d{4})$/); if (!t || !MONTHS.includes(t[2])) throw new Error(`NAMED STOP [BAD_UPDATED_DATE] ${updated}`); [y, m, d] = [+t[3], MONTHS.indexOf(t[2]) + 1, +t[1]]; }
  if (lang === "ko") return `${y}년 ${m}월 ${d}일`;
  const txt = `${d} ${MONTHS[m - 1]} ${y}`;
  return lang === "es" ? txt.replace(/ (\w{3}) /, (x, mo) => ` ${mo.toLowerCase()} `) : txt;
}

// updated: the page's own updated date (default: the static pages' 18 Nov 2026).
// door "mindset": the two faith landing links are left out; door "faith": the Mindset hub link is left
// out (the doors never link each other). Every other page links the Mindset hub.
export function footerHtml(lang, updated = "18 Nov 2026", door = "neutral") {
  // Korean pages link the English legal pages, marked as English: no machine-translated legal text
  // (owner ruling 6 Nov 2026, the KeepMyProof precedent).
  if (lang === "ko") return `<footer class="site-foot">
  <div class="wrap">
    <span>Peace Be Still · Spry Labs가 만든 앱 · ${updatedText(updated, "ko")} 업데이트</span>
    <nav aria-label="바닥글">
      <a href="/ko/">새벽기도</a>
      <a href="/about" hreflang="en">소개 (영문)</a>
      <a href="/privacy" hreflang="en">개인정보 처리방침 (영문)</a>
      <a href="/terms" hreflang="en">이용약관 (영문)</a>
      <a href="/support" hreflang="en">도움말 (영문)</a>
      <a href="/" hreflang="en" lang="en">English</a>
    </nav>
  </div>
</footer>`;
  const es = lang === "es";
  const upd = es ? ` · Actualizado el ${updatedText(updated, "es")}` : ` · Updated ${updatedText(updated, "en")}`;
  return es
    ? `<footer class="site-foot">
  <div class="wrap">
    <span>Peace Be Still · una app de Spry Labs${upd}</span>
    <nav aria-label="Pie de página">
      <a href="/es/preguntas/">Preguntas</a>
${door === "faith" ? "" : `      <a href="/es/mentalidad/">Mentalidad</a>
`}      <a href="/about">Acerca de</a>
      <a href="/es/privacidad">Privacidad</a>
      <a href="/es/terminos">Términos</a>
      <a href="/es/aviso">Aviso</a>
      <a href="/es/soporte">Ayuda</a>
${door === "mindset" ? "" : `      <a href="/ko/" hreflang="ko" lang="ko">한국어</a>
`}      <a href="/" hreflang="en" lang="en">English</a>
    </nav>
  </div>
</footer>`
    : `<footer class="site-foot">
  <div class="wrap">
    <span>Peace Be Still · a Spry Labs app${upd}</span>
    <nav aria-label="Footer">
      <a href="/questions/">Questions</a>
${door === "faith" ? "" : `      <a href="/mindset/">Mindset</a>
`}      <a href="/about">About</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/disclaimer">Disclaimer</a>
      <a href="/support">Support</a>
${door === "mindset" ? "" : `      <a href="/prayer-points/">Prayer points &amp; vigils</a>
      <a href="/ko/" hreflang="ko" lang="ko">한국어 · 새벽기도</a>
`}      <a href="/es/" hreflang="es" lang="es">Español</a>
    </nav>
  </div>
</footer>`;
}
