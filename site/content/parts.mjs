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
/** The Organization's sameAs: entity.json's profiles plus each live store listing from store.json
 *  (the one place the listing URLs are written), so a store going live joins sameAs with no second copy.
 *  Read by every page's JSON-LD and by scripts/entity-watch.mjs. */
export function orgSameAs(store = storeConfig()) {
  const entity = JSON.parse(readFileSync(new URL("../../entity.json", import.meta.url), "utf8"));
  return [...new Set([...(entity.sameAs || []), store.app_store_url, store.play_url].filter(Boolean))];
}
// THE launch state in words. Every sentence on the site that says where the app can be had is a
// {{stores.<form>}} token, filled at build time by fillStores() from store.json, so `npm run store:set`
// (which rebuilds every page) is the only switch: no copy hunt when a store goes live. Forms:
// tag (after "Peace Be Still, …," or "a phone app …"), short (the brief version), line (a sentence),
// out (the answer to "Is Peace Be Still out yet?"), heroB/heroS (the home hero note), ld (JSON-LD),
// title (the English home <title> ending), eyebrow (the home hero's small name line).
// No form ever names a date (repo rule: no launch date). Plain text only: tokens also land in JSON-LD.
export const storeState = (store = storeConfig()) => (store.app_store_url && store.play_url ? "both" : store.app_store_url ? "ios" : store.play_url ? "play" : "soon");
const STORE_WORDS = {
  en: {
    soon: { tag: "coming soon to the App Store and Google Play", short: "coming soon", line: "Coming soon to the App Store and Google Play.", out: "Not yet. It is coming soon to the App Store and Google Play. There is no waitlist and no launch date to wait for.", heroB: "Coming soon to the App Store and Google Play", heroS: "No date yet. When the app is live, this page will link straight to it.", ld: "Coming soon; not yet in any app store.", title: ", Coming Soon", eyebrow: "coming soon" },
    ios: { tag: "now on the App Store and coming soon to Google Play", short: "now on the App Store", line: "Now on the App Store for iPhone. Coming soon to Google Play.", out: "Yes. It is on the App Store for iPhone: tap the App Store button on this page, or search “Peace Be Still” in the App Store. It is coming soon to Google Play. There is no waitlist.", heroB: "Now on the App Store for iPhone", heroS: "Coming soon to Google Play.", ld: "On the App Store for iPhone; coming soon to Google Play.", title: " for iPhone", eyebrow: "on the App Store" },
    play: { tag: "now on Google Play and coming soon to the App Store", short: "now on Google Play", line: "Now on Google Play for Android. Coming soon to the App Store.", out: "Yes. It is on Google Play for Android: tap the Google Play button on this page, or search “Peace Be Still” in Google Play. It is coming soon to the App Store. There is no waitlist.", heroB: "Now on Google Play for Android", heroS: "Coming soon to the App Store.", ld: "On Google Play for Android; coming soon to the App Store.", title: " for Android", eyebrow: "on Google Play" },
    both: { tag: "on the App Store and Google Play", short: "on the App Store and Google Play", line: "On the App Store and Google Play.", out: "Yes. It is on the App Store and Google Play: tap a store button on this page, or search “Peace Be Still”. There is no waitlist.", heroB: "On the App Store and Google Play", heroS: "For iPhone and Android.", ld: "On the App Store and Google Play.", title: " for iPhone and Android", eyebrow: "on the App Store and Google Play" },
  },
  es: {
    soon: { tag: "que llega muy pronto al App Store y a Google Play", short: "que llega muy pronto", line: "Llega muy pronto al App Store y a Google Play.", out: "Todavía no. Peace Be Still llega muy pronto al App Store y a Google Play. Todavía no hay fecha. Cuando la app esté disponible, esta página llevará directo a ella.", heroB: "Muy pronto en el App Store y Google Play", heroS: "Todavía no hay fecha. Cuando la app esté disponible, esta página llevará directo a ella.", ld: "Muy pronto; todavía no está en ninguna tienda de apps.", eyebrow: "muy pronto" },
    ios: { tag: "que ya está en el App Store y llega muy pronto a Google Play", short: "que ya está en el App Store", line: "Ya está en el App Store para iPhone. Llega muy pronto a Google Play.", out: "Sí. Ya está en el App Store para iPhone: toca el botón del App Store en esta página o busca “Peace Be Still” en el App Store. Llega muy pronto a Google Play. No hay lista de espera.", heroB: "Ya está en el App Store para iPhone", heroS: "Llega muy pronto a Google Play.", ld: "En el App Store para iPhone; muy pronto en Google Play.", eyebrow: "en el App Store" },
    play: { tag: "que ya está en Google Play y llega muy pronto al App Store", short: "que ya está en Google Play", line: "Ya está en Google Play para Android. Llega muy pronto al App Store.", out: "Sí. Ya está en Google Play para Android: toca el botón de Google Play en esta página o busca “Peace Be Still” en Google Play. Llega muy pronto al App Store. No hay lista de espera.", heroB: "Ya está en Google Play para Android", heroS: "Llega muy pronto al App Store.", ld: "En Google Play para Android; muy pronto en el App Store.", eyebrow: "en Google Play" },
    both: { tag: "que ya está en el App Store y en Google Play", short: "que ya está en el App Store y en Google Play", line: "Ya está en el App Store y en Google Play.", out: "Sí. Ya está en el App Store y en Google Play: toca un botón de tienda en esta página o busca “Peace Be Still”. No hay lista de espera.", heroB: "Ya está en el App Store y en Google Play", heroS: "Para iPhone y Android.", ld: "En el App Store y en Google Play.", eyebrow: "en el App Store y Google Play" },
  },
  ko: {
    soon: { line: "곧 App Store에 나와요", out: "아직이에요. 곧 나와요. 앱이 올라가면 이 페이지 아래 버튼이 바로 App Store로 연결돼요.", intro: "아직 App Store에 나오기 전이에요. 앱이 나오면 바로 아래 기능을 쓰실 수 있어요." },
    ios: { line: "지금 App Store에 있어요", out: "네. 지금 iPhone용 App Store에 있어요. 이 페이지 아래 App Store 버튼을 누르시거나 App Store에서 “Peace Be Still”을 검색해 주세요. Google Play에는 곧 나와요.", intro: "지금 iPhone용 App Store에서 받으실 수 있어요. 앱에는 아래 기능이 있어요." },
    play: { line: "지금 Google Play에 있어요", out: "아직이에요. 지금은 Android용 Google Play에 있고, App Store에는 곧 나와요.", intro: "지금 Android용 Google Play에서 받으실 수 있어요. 앱에는 아래 기능이 있어요." },
    both: { line: "App Store와 Google Play에 있어요", out: "네. App Store와 Google Play에 있어요. 이 페이지 아래 버튼을 누르시거나 “Peace Be Still”을 검색해 주세요.", intro: "App Store와 Google Play에서 받으실 수 있어요. 앱에는 아래 기능이 있어요." },
  },
  "zh-Hans": {
    soon: { line: "即将上架 App Store", out: "还不能。快了。上架以后，页面下方的按钮会直接链接到 App Store。", intro: "应用还没有在 App Store 上架。上架以后，可以用的是下面这些：" },
    ios: { line: "已在 App Store 上架", out: "可以。应用已在 iPhone 的 App Store 上架：点页面下方的 App Store 按钮，或在 App Store 搜索“Peace Be Still”。Google Play 版即将推出。", intro: "应用已在 iPhone 的 App Store 上架，可以用的是下面这些：" },
    play: { line: "已在 Google Play 上架", out: "还不能。现在可以在 Android 的 Google Play 下载，App Store 版即将推出。", intro: "应用已在 Android 的 Google Play 上架，可以用的是下面这些：" },
    both: { line: "已在 App Store 和 Google Play 上架", out: "可以。应用已在 App Store 和 Google Play 上架：点页面下方的按钮，或搜索“Peace Be Still”。", intro: "应用已在 App Store 和 Google Play 上架，可以用的是下面这些：" },
  },
};
/** The launch-state words for one language and store state (see STORE_WORDS). */
export function storeWords(lang, store = storeConfig()) {
  return STORE_WORDS[STORE_WORDS[lang] ? lang : "en"][storeState(store)];
}
/** Fills every {{stores.<form>}} token in a built page or file. A token with no words for that language
 *  is a named stop, never left on a page. */
export function fillStores(text, lang, store = storeConfig()) {
  const w = storeWords(lang, store);
  return String(text).replace(/\{\{stores\.(\w+)\}\}/g, (m, form) => {
    if (typeof w[form] !== "string") throw new Error(`NAMED STOP [NO_STORE_WORDS] ${m} has no ${lang} words`);
    return w[form];
  });
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
/** The claim as plain words, for answers and tables written in content files (never typed out by hand). */
export function claimText(lang, kind = "bible") {
  const c = privacyClaim(lang, kind);
  return `${c.head}. ${c.small} ${c.promise}`;
}
const claimBody = (c) => `<b>${c.head}.</b> <small>${c.small}</small> ${c.promise}`;
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
    iosSoon: "App Store: coming soon",
    playSoon: "Google Play: coming soon",
    iosAlt: "Download on the App Store",
    playAlt: "Get it on Google Play",
  },
  es: {
    soonH: "Busca Peace Be Still en el App Store y Google Play",
    liveH: "Descarga Peace Be Still",
    p: "Gratis para descargar, con un camino gratis que siempre es gratis. Sin anuncios, sin prueba.",
    iosSoon: "App Store: muy pronto",
    playSoon: "Google Play: muy pronto",
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
  // Chinese pages (Simplified, 22 Nov 2026): the same honest line as the Korean CTA.
  "zh-Hans": {
    soonH: "请在 App Store 和 Google Play 搜索 Peace Be Still",
    liveH: "下载 Peace Be Still",
    p: "免费下载，免费的部分一直免费。没有广告，也没有到期自动扣费的免费试用。应用界面目前是英文和西班牙文。",
    iosSoon: "即将上架 App Store",
    playSoon: "即将上架 Google Play",
    iosAlt: "在 App Store 下载",
    playAlt: "在 Google Play 下载",
  },
};
// The page languages the site renders: English, Spanish and (landing + question pages only) Korean and
// Simplified Chinese.
export const LANGS = ["en", "es", "ko", "zh-Hans"];
// Apple's official "Download on the App Store" badge in the page's language (Apple Marketing Tools,
// unaltered black badges: US-UK English, es-MX, zh-Hans (zh-cn) and ko-KR).
// [file, width at 40 px tall] (each badge's own viewBox; the localized artwork is not all the same width).
const APP_STORE_BADGE = { en: ["/brand/stores/app-store-en.svg", 120], es: ["/brand/stores/app-store-es.svg", 120], ko: ["/brand/stores/app-store-ko.svg", 130], "zh-Hans": ["/brand/stores/app-store-zh-hans.svg", 109] };
export const langOf = (html) => {
  const l = (String(html).match(/<html lang="([\w-]+)"/) || [])[1];
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

// The badges (or "coming soon" lines), one per store, shared by the CTA box and the home hero.
// liveOnly (the home hero): only the stores that are live; the hero note already names the other.
function storeListHtml(t, lang, store, source, page, door, liveOnly = false) {
  const [badge, bw] = APP_STORE_BADGE[lang] || APP_STORE_BADGE.en;
  const ios = store.app_store_url
    ? `<a class="store-badge" href="${tagged(appStoreHref(store, page, door), store, "ios", source)}"><img src="${badge}" alt="${t.iosAlt}" width="${bw}" height="40"></a>`
    : liveOnly ? "" : `<span class="store-soon">${t.iosSoon}</span>`;
  const play = store.play_url
    ? `<a class="store-badge" href="${tagged(store.play_url, store, "play", source)}"><img src="/brand/stores/google-play-${lang === "es" ? "es" : "en"}.png" alt="${t.playAlt}" width="135" height="52"></a>`
    : liveOnly ? "" : `<span class="store-soon">${t.playSoon}</span>`;
  return `<ul class="stores">
${[ios, play].filter(Boolean).map((x) => `      <li>${x}</li>`).join("\n")}
    </ul>`;
}
export function storeCtaHtml(lang, store = storeConfig(), source = "", page = "", door = "neutral") {
  const t = CTA[LANGS.includes(lang) ? lang : "en"];
  const h = store.app_store_url || store.play_url ? t.liveH : t.soonH;
  return `<!-- cta:start --><section class="wrap" id="get-the-app" aria-labelledby="cta-h">
  <div class="card cta-card">
    <h2 id="cta-h">${h}</h2>
    <p>${t.p}</p>${ctaClaimHtml(lang, claimKind(page, door))}
    ${storeListHtml(t, lang, store, source, page, door)}
  </div>
</section><!-- cta:end -->`;
}
/** The home hero note (between <!-- hero-cta:start --> and <!-- hero-cta:end -->): before launch, the
 *  "coming soon" note; once a store is live, the same note with that store's badge, so the download sits
 *  above the fold. */
export function storeHeroHtml(lang, store = storeConfig(), source = "", page = "", door = "neutral") {
  const t = CTA[LANGS.includes(lang) ? lang : "en"], w = storeWords(lang, store);
  const live = Boolean(store.app_store_url || store.play_url);
  return `<!-- hero-cta:start --><div class="soon${live ? " live" : ""}" role="note">
        <img src="/brand/pbs-mark-dark.svg" alt="" width="44" height="44">
        <p><b>${w.heroB}</b><span>${w.heroS}</span></p>${live ? `
        ${storeListHtml(t, lang, store, source, page, door, true)}` : ""}
      </div><!-- hero-cta:end -->`;
}

// The landing-only languages (a landing page and its question pages, no app screens yet): the words of
// their header and footer. Their footers link the English legal pages, marked as English: no
// machine-translated legal text (owner ruling 6 Nov 2026, the KeepMyProof precedent).
const LOCAL = {
  ko: { home: "/ko/", skip: "본문으로 건너뛰기", brand: "Peace Be Still, 한국어 첫 페이지", foot: (d) => `Peace Be Still · Spry Labs가 만든 앱 · ${d} 업데이트`, nav: "바닥글", homeName: "새벽기도",
    legal: [["/about", "소개 (영문)"], ["/privacy", "개인정보 처리방침 (영문)"], ["/terms", "이용약관 (영문)"], ["/support", "도움말 (영문)"]] },
  "zh-Hans": { home: "/zh/", skip: "跳到正文", brand: "Peace Be Still 中文首页", foot: (d) => `Peace Be Still · Spry Labs 出品的应用 · ${d}更新`, nav: "页脚", homeName: "中文首页",
    legal: [["/about", "关于我们（英文）"], ["/privacy", "隐私政策（英文）"], ["/terms", "使用条款（英文）"], ["/support", "帮助（英文）"]] },
};
export const isLocal = (lang) => Boolean(LOCAL[lang]);

export function headerHtml(lang, altPath) {
  const loc = LOCAL[lang];
  if (loc) return `<a class="skip" href="#main">${loc.skip}</a>
<header class="wrap site-head">
  <a class="brand" href="${loc.home}" aria-label="${loc.brand}">
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
  if (lang === "zh-Hans") return `${y}年${m}月${d}日`;
  const txt = `${d} ${MONTHS[m - 1]} ${y}`;
  return lang === "es" ? txt.replace(/ (\w{3}) /, (x, mo) => ` ${mo.toLowerCase()} `) : txt;
}

// updated: the page's own updated date (default: the static pages' 18 Nov 2026).
// door "mindset": the two faith landing links are left out; door "faith": the Mindset hub link is left
// out (the doors never link each other). Every other page links the Mindset hub.
export function footerHtml(lang, updated = "18 Nov 2026", door = "neutral") {
  const loc = LOCAL[lang];
  if (loc) return `<footer class="site-foot">
  <div class="wrap">
    <span>${loc.foot(updatedText(updated, lang))}</span>
    <nav aria-label="${loc.nav}">
      <a href="${loc.home}">${loc.homeName}</a>
${loc.legal.map(([h, n]) => `      <a href="${h}" hreflang="en">${n}</a>`).join("\n")}
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
      <a href="/zh/" hreflang="zh-Hans" lang="zh-Hans">中文</a>
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
      <a href="/zh/" hreflang="zh-Hans" lang="zh-Hans">中文 · 睡前祷告</a>
`}      <a href="/es/" hreflang="es" lang="es">Español</a>
    </nav>
  </div>
</footer>`;
}
