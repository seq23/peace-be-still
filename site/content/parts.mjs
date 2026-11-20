// Shared page parts: header, footer and the one action (the launch waitlist).
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
    p: "Free to download, with a free lane that stays free. No ads, no trial.",
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
};
export function storeCtaHtml(lang, store = storeConfig()) {
  const t = CTA[lang === "es" ? "es" : "en"];
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

export function footerHtml(lang, updated = "18 Nov 2026") {
  const es = lang === "es";
  const upd = es ? ` · Actualizado el ${updated.replace("Nov", "nov")}` : ` · Updated ${updated}`;
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
      <a href="/" hreflang="en" lang="en">English</a>
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
      <a href="/es/" hreflang="es" lang="es">Español</a>
    </nav>
  </div>
</footer>`;
}
