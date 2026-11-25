// The logic and its helpers (imported by tests). src/worker.js is the entry and exports only the handler.
// Peace Be Still website: static pages from ./public, plus what the files cannot do alone:
// 1) www.peacebestillapp.com -> peacebestillapp.com (301, path and query kept)
// 2) the old launch waitlist: sign-ups closed 18 Nov 2026 (POST /api/waitlist answers 410 and stores
//    nothing); the remove link (GET /waitlist/remove, POST /api/waitlist/remove) keeps working
//    (D1 database "peace-be-still", table "waitlist"; nothing is ever emailed from here)
// 3) security headers on every response
// 4) social visit counts (scorecard row pbs-social): a page view tagged utm_source=threads|instagram|facebook
//    (or ?src=, or arriving from those sites) adds 1 to a per-day, per-source count in D1 table social_visits.
//    Counts only: no cookie, no IP, no user agent is stored. GET /api/social-visits?days=28 reads the totals.
// 5) store-page visits (the same row, social_store_visits_28d): every store badge links to /api/go/app-store or
//    /api/go/google-play, which adds 1 to D1 table store_taps (day, source, store) and 302s to the listing built
//    by site/content/store-links.mjs from site/config/store.json only (Apple pt/ct/mt=8 and Play referrer= kept).
//    The source is the page the person tapped on: its own ?utm_source=/?src= tag (the same-origin Referer
//    carries it), else a Threads/Instagram/Facebook Referer, else "direct". A ct or ppid that is not ours
//    is dropped, so the target never carries anything else from the request. While a store has no URL, /api/go/
//    answers 302 to /#get-the-app and counts nothing. /api/go/ is never a page view (4). A failed count never
//    stops the 302. GET /api/social-visits answers the 28-day taps in its "store" block.
import STORE from "../config/store.json" with { type: "json" };
import CAMPAIGNS from "../config/campaigns.json" with { type: "json" };
import { storeTarget } from "../content/store-links.mjs";

export const APEX = "peacebestillapp.com";
const MAX_BODY = 2048;
// 18 Nov 2026: the Black Bible app question page became the /black-bible-app/ landing page.
export const MOVED = { "/questions/black-bible-app/": "/black-bible-app/" };

const HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};


const T = {
  en: {
    removeLine: "Changed your mind?",
    removeLink: "Remove my email ›",
    removeTitle: "Remove your email",
    removeAsk: "Press the button to take your email off the Peace Be Still launch list. It is deleted right away.",
    removeBtn: "Remove my email ›",
    removedTitle: "Your email is removed",
    removed: "If that address was on the list, it is gone now. You will not hear from us.",
    back: "← Back to Peace Be Still",
    home: "/",
  },
  es: {
    removeLine: "¿Cambiaste de idea?",
    removeLink: "Quitar mi correo ›",
    removeTitle: "Quitar tu correo",
    removeAsk: "Toca el botón para quitar tu correo de la lista de lanzamiento de Peace Be Still. Se borra en el acto.",
    removeBtn: "Quitar mi correo ›",
    removedTitle: "Tu correo fue quitado",
    removed: "Si esa dirección estaba en la lista, ya no está. No sabrás más de nosotros.",
    back: "← Volver a Peace Be Still",
    home: "/es/",
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function page(lang, title, bodyHtml, status = 200) {
  const t = T[lang];
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Peace Be Still</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"></head>
<body><header class="wrap site-head"><a class="brand" href="${t.home}" aria-label="Peace Be Still"><picture><source srcset="/brand/pbs-wordmark-dark.svg" media="(prefers-color-scheme: dark)"><img src="/brand/pbs-wordmark-light.svg" alt="Peace Be Still" width="225" height="36"></picture></a></header>
<main class="wrap doc"><h1 style="font-size:clamp(28px,5vw,38px)">${esc(title)}</h1>${bodyHtml}<p><a href="${t.home}">${t.back}</a></p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // some browsers omit Origin on same-site form posts; Sec-Fetch-Site still checked
  try {
    const h = new URL(origin).hostname;
    if (h !== APEX && h !== `www.${APEX}` && h !== "localhost" && h !== "127.0.0.1") return false;
  } catch { return false; }
  const sfs = request.headers.get("Sec-Fetch-Site");
  return !sfs || sfs === "same-origin" || sfs === "none";
}

async function readForm(request) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  return new URLSearchParams(text);
}

// Sign-ups stopped 18 Nov 2026 (owner: no waitlist). Rows already stored stay until the launch email.
export function closed(lang) {
  return page(lang, lang === "es" ? "La lista está cerrada" : "The list is closed",
    `<p class="lead">${lang === "es" ? "Ya no recogemos correos. Busca “Peace Be Still” en el App Store y Google Play." : "We no longer collect emails. Look for “Peace Be Still” in the App Store and Google Play."}</p>`, 410);
}

export function removeForm(lang, tok) {
  const t = T[lang];
  const safe = /^[a-f0-9]{48}$/.test(tok || "") ? tok : "";
  return page(lang, t.removeTitle, `<p class="lead">${t.removeAsk}</p><form class="waitlist" method="post" action="/api/waitlist/remove"><input type="hidden" name="t" value="${safe}"><input type="hidden" name="lang" value="${lang}"><button class="btn" type="submit">${t.removeBtn}</button></form>`);
}

export async function remove(request, env) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await readForm(request);
  if (!form) return new Response("Too large", { status: 413 });
  const lang = form.get("lang") === "es" ? "es" : "en";
  const tok = String(form.get("t") || "");
  if (/^[a-f0-9]{48}$/.test(tok)) await env.DB.prepare("DELETE FROM waitlist WHERE remove_token = ?").bind(tok).run();
  return page(lang, T[lang].removedTitle, `<p class="lead">${T[lang].removed}</p>`);
}

// ---- social visit counts ------------------------------------------------------------------
export const SOCIAL = ["threads", "instagram", "facebook"];
const ALIAS = { threads: "threads", th: "threads", instagram: "instagram", ig: "instagram", facebook: "facebook", fb: "facebook" };
const REF = [[/(^|\.)threads\.(net|com)$/, "threads"], [/(^|\.)instagram\.com$/, "instagram"], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"]];
// Link-preview fetchers and scripts are not visits.
const NOT_A_PERSON = /bot|crawl|spider|slurp|preview|facebookexternalhit|facebookcatalog|meta-external|embedly|curl|wget|python|httpclient|okhttp|go-http|headless|lighthouse/i;

/** The social source of a page view, or null when it is not a person opening a page from Threads, Instagram or Facebook. */
export function visitSource(request) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.hostname !== APEX || url.pathname.startsWith("/api/")) return null; // /api/go/ taps included
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith(".html")) return null; // pictures, css, fonts
  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest && dest !== "document") return null;
  if (NOT_A_PERSON.test(request.headers.get("User-Agent") || "")) return null;
  return socialOf(url, request.headers.get("Referer"));
}

/** Threads, Instagram or Facebook from a page URL's own tag (?utm_source= or ?src=), else from the
 *  referring site; null when neither says so. */
function socialOf(url, referer) {
  const tag = (url.searchParams.get("utm_source") || url.searchParams.get("src") || "").toLowerCase();
  if (tag) return ALIAS[tag] ?? null;
  let host = "";
  try { host = new URL(referer || "").hostname; } catch { return null; }
  for (const [re, src] of REF) if (re.test(host)) return src;
  return null;
}

export async function countVisit(request, env) {
  const src = visitSource(request);
  if (!src || !env.DB) return false;
  if (env.VISIT_RL) {
    const { success } = await env.VISIT_RL.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" });
    if (!success) return false;
  }
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO social_visits (day, source, n) VALUES (?, ?, 1) ON CONFLICT(day, source) DO UPDATE SET n = n + 1").bind(day, src).run();
  return true;
}

// ---- store-page visits (taps on a store badge) ---------------------------------------------
const GO_PATHS = { "/api/go/app-store": "ios", "/api/go/google-play": "play" };
export const TAP_SOURCES = [...SOCIAL, "direct"];

/** Where /api/go/<store> sends a person (store.json is bundled; tests pass their own), or null for any other path. */
export function goTarget(url, store = STORE, campaigns = CAMPAIGNS) {
  const kind = GO_PATHS[url.pathname.replace(/\/+$/, "")];
  if (!kind) return null;
  const target = storeTarget(kind, store, { ct: url.searchParams.get("ct") || "", ppid: url.searchParams.get("ppid") || "" }, campaigns);
  return { kind, target, location: target ?? `https://${APEX}/#get-the-app` };
}

/** The source of a store-badge tap, or null when it is not a person tapping a live store badge. */
export function tapSource(request, store = STORE) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.hostname !== APEX) return null;
  const go = goTarget(url, store);
  if (!go?.target) return null; // that store has no URL yet: not a store visit
  if (NOT_A_PERSON.test(request.headers.get("User-Agent") || "")) return null;
  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest && dest !== "document") return null;
  if (/prefetch|prerender/i.test(`${request.headers.get("Sec-Purpose") || ""} ${request.headers.get("Purpose") || ""}`)) return null;
  let from = null;
  try { from = new URL(request.headers.get("Referer") || ""); } catch {}
  // Our own page: its query names the channel the person arrived from. Another site: its host.
  const src = from && from.hostname === APEX ? socialOf(from, null) : socialOf(new URL(`https://${APEX}/`), from?.href ?? "");
  return { source: src ?? "direct", store: go.kind };
}

export async function countTap(request, env, store = STORE) {
  const tap = tapSource(request, store);
  if (!tap || !env.DB) return false;
  if (env.VISIT_RL) {
    const { success } = await env.VISIT_RL.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" });
    if (!success) return false;
  }
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO store_taps (day, source, store, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, source, store) DO UPDATE SET n = n + 1").bind(day, tap.source, tap.store).run();
  return true;
}

/** The 28-day store taps. Threads + Instagram + Facebook make the total (as social_visits does); direct
 *  taps are shown, never added. A failed read answers total null with the reason, never 0. */
async function readTaps(env, since) {
  try {
    const { results = [] } = await env.DB.prepare("SELECT source, SUM(n) AS n FROM store_taps WHERE day >= ? GROUP BY source").bind(since).all();
    const started = await env.DB.prepare("SELECT substr(applied_at, 1, 10) AS day FROM schema_version WHERE version = 3").first();
    const sources = Object.fromEntries(TAP_SOURCES.map((s) => [s, 0]));
    for (const r of results) if (r.source in sources) sources[r.source] = Number(r.n) || 0;
    return { total: SOCIAL.reduce((a, s) => a + sources[s], 0), sources, counting_since: started?.day ?? null };
  } catch (e) {
    return { total: null, why: `store_taps could not be read: ${String(e?.message || e).slice(0, 200)}` };
  }
}

export async function readVisits(url, env) {
  const days = Math.min(90, Math.max(1, Number.parseInt(url.searchParams.get("days") || "28", 10) || 28));
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const { results = [] } = await env.DB.prepare("SELECT source, SUM(n) AS n FROM social_visits WHERE day >= ? GROUP BY source").bind(since).all();
  const first = await env.DB.prepare("SELECT MIN(day) AS day FROM social_visits").first();
  const sources = Object.fromEntries(SOCIAL.map((s) => [s, 0]));
  for (const r of results) if (SOCIAL.includes(r.source)) sources[r.source] = Number(r.n) || 0;
  const total = SOCIAL.reduce((a, s) => a + sources[s], 0);
  const store = await readTaps(env, since);
  return new Response(JSON.stringify({ days, since, counting_since: first?.day ?? null, sources, total, store }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  if (url.hostname === `www.${APEX}`) {
    url.hostname = APEX;
    return Response.redirect(url.toString(), 301);
  }
  const p = url.pathname;
  // Pages that moved (one canonical page per search): 301 to the new home.
  const moved = MOVED[p.endsWith("/") ? p : p + "/"];
  if (moved) return Response.redirect(`https://${APEX}${moved}`, 301);
  if (p === "/api/waitlist" || p === "/api/waitlist/remove") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    return p === "/api/waitlist" ? closed(url.searchParams.get("lang") === "es" ? "es" : "en") : remove(request, env);
  }
  if (p === "/api/social-visits") {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
    return readVisits(url, env);
  }
  const go = goTarget(url);
  if (go) return new Response(null, { status: 302, headers: { Location: go.location, "Cache-Control": "no-store" } });
  if (p === "/waitlist/remove" || p === "/es/waitlist/remove") return removeForm(p.startsWith("/es/") ? "es" : "en", url.searchParams.get("t"));
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    // Counting never slows or breaks a page: it runs after the response, and a failure is only logged.
    const counting = countVisit(request, env).catch((e) => console.error(`social visit not counted: ${e.message}`));
    if (ctx?.waitUntil) ctx.waitUntil(counting);
    // The same for a store-badge tap: the 302 to the listing never waits on, or fails with, the count.
    const tapping = countTap(request, env).catch((e) => console.error(`store tap not counted: ${e.message}`));
    if (ctx?.waitUntil) ctx.waitUntil(tapping);
    const res = await route(request, env);
    if (res.status === 301 || res.status === 302) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
    if (new URL(request.url).pathname.startsWith("/fonts/")) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return out;
  },
};
