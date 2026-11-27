// Shared bits for the 18 Nov 2026 search pages (blitz-top50.json). Scripture comes only from
// scripture.mjs (stored KJV / RV1909); product facts only from COMMON.md, APP_STORE.md and this site.
export { V, Q, P, F, ref, text } from "./scripture.mjs";

export const D = { published: "2026-11-18", updated: "2026-11-18", publishedText: "18 Nov 2026", updatedText: "18 Nov 2026" };
export const DES = { published: "2026-11-18", updated: "2026-11-18", publishedText: "18 nov 2026", updatedText: "18 nov 2026" };
export const CHECKED = "18 Nov 2026";
// The Mi Refugio paragraph every Spanish page uses (one copy, so the pages cannot drift).
export const MI_REFUGIO_ES = `<p>Peace Be Still es una app {{stores.tag}}. Su camino <strong>Mi Refugio · Biblia y Chat en Español</strong> trae la Reina-Valera 1909 completa para leer gratis, un chat bíblico en español y Salmos susurrados para dormir.</p>`;

export const bg = (q, label, version = "KJV") => [label, `https://www.biblegateway.com/passage/?search=${encodeURIComponent(q)}&version=${version}`];
export const RV_SRC = ["Reina-Valera 1909, eBible.org", "https://ebible.org/find/details.php?id=spaRV1909"];
export const KJV_SRC = ["King James Version, eBible.org", "https://ebible.org/find/details.php?id=eng-kjv"];

// "Our pick" box (owner 18 Nov 2026: "push our app as best"). Facts only, each one true today.
export const PICK_EN = (lead) => `<p><strong>${lead}</strong></p>
<ul>
<li>No trial and no weekly plan: $7.99 a month or $39.99 a year in the US, the price shown before you tap.</li>
<li>A free version that stays free: the whole King James Bible to read, and nearly every chapter read aloud, today's story, one chat a day of up to 5 messages, your first sleep night and then one a week, and a daily declaration.</li>
<li>No ads, ever.</li>
<li>Every verse pasted word for word from a stored King James Version (Reina-Valera 1909 in Spanish). The AI never writes a verse.</li>
<li>Hush Harbor · Black Bible Chat &amp; Stories, in a Black church voice, and Mi Refugio in Spanish, both at launch.</li>
<li>Cancel any time, from a link on the paid screen. {{stores.line}}</li>
</ul>`;
export const PICK_ES = (lead) => `<p><strong>${lead}</strong></p>
<ul>
<li>Sin prueba y sin plan semanal: $7.99 al mes o $39.99 al año en EE. UU., con el precio a la vista antes de tocar.</li>
<li>Una versión gratis que sigue gratis: la Biblia completa para leer, la historia del día, un chat al día de hasta 5 mensajes, tu primera noche para dormir y luego una por semana, y una declaración diaria.</li>
<li>Sin anuncios, nunca.</li>
<li>Cada versículo se pega palabra por palabra de la Reina-Valera 1909 guardada. La IA nunca escribe un versículo.</li>
<li>Se cancela cuando quieras, desde un enlace en la pantalla de pago. {{stores.line}}</li>
</ul>`;
