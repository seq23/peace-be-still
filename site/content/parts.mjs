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
export function storeCtaHtml(lang, store = storeConfig()) {
  const t = CTA[LANGS.includes(lang) ? lang : "en"];
  const ios = store.app_store_url
    ? `<a class="store-badge" href="${store.app_store_url}"><img src="/brand/stores/app-store-en.svg" alt="${t.iosAlt}" width="120" height="40"></a>`
    : `<span class="store-soon">${t.iosSoon}</span>`;
  const play = store.play_url
    ? `<a class="store-badge" href="${store.play_url}"><img src="/brand/stores/google-play-${lang === "es" ? "es" : "en"}.png" alt="${t.playAlt}" width="135" height="52"></a>`
    : `<span class="store-soon">${t.playSoon}</span>`;
  const h = store.app_store_url || store.play_url ? t.liveH : t.soonH;
  return `<!-- cta:start --><section class="wrap" id="get-the-app" aria-labelledby="cta-h">
  <div class="card cta-card">
    <h2 id="cta-h">${h}</h2>
    <p>${t.p}</p>
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
// door "mindset": the two faith landing links are left out (the doors never link each other).
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
      <a href="/about">Acerca de</a>
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
      <a href="/about">About</a>
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
