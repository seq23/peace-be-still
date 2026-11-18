// Shared page parts: header, footer and the one action (the launch waitlist).
export const BASE = "https://peacebestillapp.com";

const WL = {
  en: {
    h: "Tell me when it launches",
    p: "Leave your email and we will send one message when Peace Be Still is in the App Store and Google Play. That is the only thing your address is used for, and the list is deleted after the launch email.",
    email: "Your email",
    door: "Which door interests you? (optional)",
    gw: "God's Word",
    ms: "Mindset &amp; imagination",
    both: "Not sure yet",
    consent: "Email me once when Peace Be Still launches. Nothing else.",
    btn: "Tell me when it launches ›",
    fine: 'What we keep and how to remove it: <a href="/privacy">Privacy</a>.',
    hp: "Leave this empty",
  },
  es: {
    h: "Avísame cuando salga",
    p: "Deja tu correo y te enviaremos un solo mensaje cuando Peace Be Still esté en el App Store y Google Play. Es lo único para lo que usamos tu dirección, y la lista se borra después del correo del lanzamiento.",
    email: "Tu correo",
    door: "¿Qué puerta te interesa? (opcional)",
    gw: "La Palabra de Dios",
    ms: "Mentalidad e imaginación",
    both: "Todavía no sé",
    consent: "Escríbanme una sola vez cuando salga Peace Be Still. Nada más.",
    btn: "Avísame cuando salga ›",
    fine: 'Lo que guardamos y cómo quitarlo: <a href="/es/privacidad">Privacidad</a>.',
    hp: "Deja esto vacío",
  },
};

// door: "faith" | "mindset" -> fixed hidden value (a door page never shows the other door);
// "neutral" -> optional choice.
export function waitlistHtml(lang, path, door) {
  const t = WL[lang];
  const doorField = door === "faith"
    ? '<input type="hidden" name="door" value="gods-word">'
    : door === "mindset"
      ? '<input type="hidden" name="door" value="mindset">'
      : `<fieldset class="doors-pick"><legend>${t.door}</legend>
        <label><input type="radio" name="door" value="gods-word"> ${t.gw}</label>
        <label><input type="radio" name="door" value="mindset"> ${t.ms}</label>
        <label><input type="radio" name="door" value="" checked> ${t.both}</label>
      </fieldset>`;
  return `<section class="wrap" id="waitlist" aria-labelledby="wl-h">
  <div class="card waitlist-card">
    <h2 id="wl-h">${t.h}</h2>
    <p>${t.p}</p>
    <form class="waitlist" method="post" action="/api/waitlist">
      <label for="wl-email">${t.email}</label>
      <input id="wl-email" name="email" type="email" required autocomplete="email" inputmode="email" maxlength="254">
      ${doorField}
      <label class="tick"><input type="checkbox" name="consent" value="yes" required> <span>${t.consent}</span></label>
      <input type="hidden" name="lang" value="${lang}">
      <input type="hidden" name="page" value="${path}">
      <div class="hp" aria-hidden="true"><label>${t.hp} <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button class="btn" type="submit">${t.btn}</button>
      <p class="fine">${t.fine}</p>
    </form>
  </div>
</section>`;
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
      <a href="/es/" hreflang="es" lang="es">Español</a>
    </nav>
  </div>
</footer>`;
}
