// The logic and its helpers (imported by tests). src/worker.js is the entry and exports only the handler.
// Peace Be Still website: static pages from ./public, plus what the files cannot do alone:
// 1) www.peacebestillapp.com -> peacebestillapp.com (301, path and query kept)
// 2) the launch waitlist: POST /api/waitlist, GET /waitlist/remove, POST /api/waitlist/remove
//    (D1 database "peace-be-still", table "waitlist"; nothing is ever emailed from here)
// 3) security headers on every response
export const APEX = "peacebestillapp.com";
export const DAILY_CEILING = 2000; // sign-ups a day before the form answers "busy, try tomorrow"
const MAX_BODY = 2048;

const HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

export const CONSENT_TEXT = {
  en: "Email me once when Peace Be Still launches. Nothing else.",
  es: "Escríbanme una sola vez cuando salga Peace Be Still. Nada más.",
};

const T = {
  en: {
    thanksTitle: "You're on the list",
    thanks: "Thank you. We will send one email to this address when Peace Be Still is in the App Store and Google Play, and then delete the list.",
    already: "This address is already on the list. The launch email will have a link to remove it.",
    removeLine: "Changed your mind?",
    removeLink: "Remove my email ›",
    removeTitle: "Remove your email",
    removeAsk: "Press the button to take your email off the Peace Be Still launch list. It is deleted right away.",
    removeBtn: "Remove my email ›",
    removedTitle: "Your email is removed",
    removed: "If that address was on the list, it is gone now. You will not hear from us.",
    errTitle: "That did not go through",
    badEmail: "Please check the email address and try again.",
    noConsent: "Please tick the box so we know you want the launch email.",
    busy: "Too many sign-ups right now. Please try again in a minute.",
    full: "The list is busy today. Please try again tomorrow.",
    back: "← Back to Peace Be Still",
    home: "/",
  },
  es: {
    thanksTitle: "Ya estás en la lista",
    thanks: "Gracias. Enviaremos un solo correo a esta dirección cuando Peace Be Still esté en el App Store y Google Play, y luego borraremos la lista.",
    already: "Esta dirección ya está en la lista. El correo del lanzamiento traerá un enlace para quitarla.",
    removeLine: "¿Cambiaste de idea?",
    removeLink: "Quitar mi correo ›",
    removeTitle: "Quitar tu correo",
    removeAsk: "Toca el botón para quitar tu correo de la lista de lanzamiento de Peace Be Still. Se borra en el acto.",
    removeBtn: "Quitar mi correo ›",
    removedTitle: "Tu correo fue quitado",
    removed: "Si esa dirección estaba en la lista, ya no está. No sabrás más de nosotros.",
    errTitle: "No se pudo enviar",
    badEmail: "Revisa el correo y vuelve a intentarlo.",
    noConsent: "Marca la casilla para saber que quieres el correo del lanzamiento.",
    busy: "Hay demasiados registros ahora. Inténtalo de nuevo en un minuto.",
    full: "La lista está ocupada hoy. Inténtalo de nuevo mañana.",
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

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

function token() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
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

export async function signup(request, env, now = new Date()) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await readForm(request);
  if (!form) return new Response("Too large", { status: 413 });
  const lang = form.get("lang") === "es" ? "es" : "en";
  const t = T[lang];
  if (form.get("website")) return page(lang, t.thanksTitle, `<p class="lead">${t.thanks}</p>`); // honeypot: look the same, store nothing

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.WAITLIST_RL) {
    const { success } = await env.WAITLIST_RL.limit({ key: `waitlist:${ip}` });
    if (!success) return page(lang, t.errTitle, `<p class="lead">${t.busy}</p>`, 429);
  }

  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return page(lang, t.errTitle, `<p class="lead">${t.badEmail}</p>`, 400);
  if (form.get("consent") !== "yes") return page(lang, t.errTitle, `<p class="lead">${t.noConsent}</p>`, 400);
  const doorIn = form.get("door");
  const door = doorIn === "gods-word" || doorIn === "mindset" ? doorIn : null;
  const pathIn = String(form.get("page") || "");
  const sourcePath = /^\/[A-Za-z0-9/_-]{0,120}$/.test(pathIn) ? pathIn : null;

  const today = now.toISOString().slice(0, 10);
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist WHERE created_at >= ?").bind(`${today}T00:00:00`).first();
  if ((row?.n ?? 0) >= DAILY_CEILING) return page(lang, t.errTitle, `<p class="lead">${t.full}</p>`, 503);

  const removeToken = token();
  const res = await env.DB.prepare(
    "INSERT INTO waitlist (email, language, door, consent, consent_text, source_path, remove_token, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING",
  ).bind(email, lang, door, CONSENT_TEXT[lang], sourcePath, removeToken, now.toISOString()).run();

  if (!res?.meta?.changes) return page(lang, t.thanksTitle, `<p class="lead">${t.already}</p>`);
  const removeUrl = `${lang === "es" ? "/es" : ""}/waitlist/remove?t=${removeToken}`;
  return page(lang, t.thanksTitle, `<p class="lead">${t.thanks}</p><p>${t.removeLine} <a href="${removeUrl}">${t.removeLink}</a></p>`);
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

async function route(request, env) {
  const url = new URL(request.url);
  if (url.hostname === `www.${APEX}`) {
    url.hostname = APEX;
    return Response.redirect(url.toString(), 301);
  }
  const p = url.pathname;
  if (p === "/api/waitlist" || p === "/api/waitlist/remove") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    return p === "/api/waitlist" ? signup(request, env) : remove(request, env);
  }
  if (p === "/waitlist/remove" || p === "/es/waitlist/remove") return removeForm(p.startsWith("/es/") ? "es" : "en", url.searchParams.get("t"));
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const res = await route(request, env);
    if (res.status === 301 || res.status === 302) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
    if (new URL(request.url).pathname.startsWith("/fonts/")) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return out;
  },
};
