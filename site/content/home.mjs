// The two home pages (/ and /es/), rendered by site/scripts/build-seed-pages.mjs (21 Nov 2026: two equal
// doors). A neutral lead, then two door cards of the same shape, God's Word and Mindset, each linking its
// own part; faith wording stays on the God's Word card and below it, Mindset wording on the Mindset card
// and below it. Every count and price comes from facts() (the app's settings); the privacy lead and the
// store CTA are filled by apply-cta.mjs between their markers. site/test/mindset.test.mjs checks the doors.
import { readFileSync } from "node:fs";
import { BASE, facts, fillStores, footerHtml, headerHtml, privacyClaim, storeConfig } from "./parts.mjs";
import { Q, cite } from "./scripture.mjs";

const ENTITY = JSON.parse(readFileSync(new URL("../../entity.json", import.meta.url), "utf8"));
const F = facts();
const PUBLISHED = "2026-11-18";
const UPDATED = "2026-11-21";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (html) => html.replace(/<q\b[^>]*>/g, "“").replace(/<\/q>/g, "”").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const FAITH_TILE = (size) => `<img src="/brand/pbs-mark-dark.svg" alt="" width="${size}" height="${size}">`;
const MIND_TILE = (size) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#0E1A22"/><path d="M14 27 q6 -8 12 0 t12 0 t12 0" fill="none" stroke="#F4F0E6" stroke-opacity="0.62" stroke-width="4.5" stroke-linecap="round"/><path d="M14 41 H50" fill="none" stroke="#86CBC1" stroke-width="4.5" stroke-linecap="round"/></svg>`;
const ART = {
  harbor: `<svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true"><path d="M4 22c4-8 10-12 15-12s11 4 15 12" stroke="#E0A33E" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="9" r="3" fill="#F4F0E6"/><path d="M4 26h30" stroke="#F4F0E6" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  refugio: `<svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true"><path d="M9 24V12l10-6 10 6v12" stroke="#E0A33E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 26h32" stroke="#F4F0E6" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  waves: (c) => `<svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true"><path d="M3 12c5-6 9 6 16 0s11 6 16 0" stroke="#F4F0E6" stroke-width="1.6" stroke-linecap="round"/><path d="M3 22h32" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  bars: (c) => `<svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true"><path d="M6 24V12M19 24V6M32 24V14" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M3 26h32" stroke="#F4F0E6" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  peak: `<svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true"><path d="M8 22l11-14 11 14" stroke="#E0A33E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 26h32" stroke="#F4F0E6" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  talk: `<svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true"><path d="M7 8h24v12H16l-6 5v-5H7z" stroke="#86CBC1" stroke-width="2" stroke-linejoin="round"/><path d="M3 28h32" stroke="#F4F0E6" stroke-width="1.6" stroke-linecap="round"/></svg>`,
};
const jr = (art, lab, h, p, hLang) => `      <div class="jr"><span class="art">${art}</span>
        <span class="txt"><span class="door-lab">${lab}</span><h3${hLang ? ` lang="${hLang}"` : ""}>${h}</h3><p class="muted">${p}</p></span></div>`;

function words(lang) {
  const c = privacyClaim(lang, "any");
  if (lang === "es") return {
    title: "Peace Be Still: noches tranquilas, palabras para el día y chat privado",
    description: "Peace Be Still es una app con dos puertas: Palabra de Dios (la Biblia Reina-Valera 1909, Salmos susurrados, chat bíblico) y Mentalidad (declaraciones e Imagination Nights). {{stores.line}}",
    ogTitle: "Peace Be Still: una gran calma, cada noche", locale: "es_US", og: "og-es.png", skipFaith: "#palabra-de-dios",
    name: "Peace Be Still · {{stores.eyebrow}}", h1: "Una gran calma, cada noche.",
    lead: "Noches tranquilas y palabras para el día, a tu manera. Peace Be Still es una app para el final del día que hace una sola pregunta, “¿Qué necesitas esta noche?”, y abre una de dos puertas. Empezar es gratis, sin anuncios y sin prueba.",
    doorsH: "Dos puertas. Elige la tuya.", doorsP: "Cada puerta va por su lado, y puedes cambiar tu elección luego en Ajustes.",
    faith: { h: "Con la Palabra de Dios", p: "Escrituras, oración e historias bíblicas para leer y escuchar. Cada versículo es de la Reina-Valera 1909, palabra por palabra.", li: ["La Biblia completa para leer", "Un chat bíblico que responde con versículos reales", "Salmos susurrados para dormir y una historia bíblica cada día"], go: "Ver la Palabra de Dios ›", href: "#palabra-de-dios" },
    mind: { h: "Con mente e imaginación", p: "Palabras tranquilas en la mañana e imaginación en la noche, sin contenido religioso.", li: ["Morning Word: una frase para decir en voz alta, de mañana y de noche", "Imagination Nights: sesiones susurradas para dormir dentro de una escena", "Un chat de Mentalidad tranquilo"], go: "Ver Mentalidad ›", href: "/es/mentalidad/" },
    gw: { id: "palabra-de-dios", h: "La Palabra de Dios", p: "Para quien quiere la Biblia al final del día: leerla, escucharla en susurro y conversar con ella.", verseRef: "MAR 4:39" },
    gwJourneys: [
      jr(ART.refugio, "Palabra de Dios · en español", "Mi Refugio · Biblia y Chat en Español", "Todo el camino en español: chat, historias y Salmos susurrados, con la Reina-Valera 1909."),
      jr(ART.harbor, "Palabra de Dios · en inglés", "Hush Harbor · Black Bible Chat &amp; Stories", "Habla las cosas como lo harías con tu familia, con una voz de iglesia negra, y lee cada día una historia bíblica contada con esa voz.", "en"),
      jr(ART.waves("#E0A33E"), "Palabra de Dios", "Psalm Nights · Whispered Scripture for Sleep", "Salmos leídos en susurro a la hora de dormir, con un temporizador que baja la voz poco a poco. La primera noche es gratis, luego una por semana.", "en"),
      jr(ART.bars("#E0A33E"), "Palabra de Dios", "Morning Word · Daily Declarations", "Para las mañanas: un versículo, una frase para decir en voz alta, una oración corta.", "en"),
      jr(ART.peak, "Palabra de Dios · en inglés", "Young Faith · Bible for Teens", "Para jóvenes de 13 a 17 años. Palabras sencillas, preguntas reales.", "en"),
    ],
    sleepH: "¿Qué son los Salmos para dormir de la app?", sleepP: "Es un Salmo leído en susurro a la hora de dormir. La pantalla siempre está oscura, se atenúa a los diez segundos y un temporizador apaga la voz poco a poco. No sigue nada después y no se ofrece nada.",
    phoneFaith: { lab: "MI REFUGIO · SALMOS", t: "Salmo 23, susurrado", sub: "45 min · suena con el teléfono bloqueado", ref: "PSA 23:2", timer: "⏲ Temporizador", timerE: "30 min · se apaga suave" },
    gwLinksH: "¿Buscas un chat bíblico gratis?", gwLinks: [["/es/chat-biblico-gratis/", "Chat bíblico gratis: lo que siempre es gratis"]],
    md: { id: "mentalidad", h: "Mentalidad", p: "Para quien quiere palabras tranquilas y un poco de imaginación, sin contenido religioso." },
    mdJourneys: [
      jr(ART.bars("#86CBC1"), "Mentalidad", "Morning Word · Daily Declarations", `Una frase para decir en voz alta, de mañana y de noche, como “${I18N("es", "mindset.calm.1")}”`, "en"),
      jr(ART.waves("#86CBC1"), "Mentalidad", "Imagination Nights", "Sesiones nocturnas susurradas: soltar el cuerpo, una escena leída en voz baja, y luego silencio.", "en"),
      jr(ART.talk, "Mentalidad", "Chat de Mentalidad", `Una respuesta corta y tranquila, marcada como IA. Con un plan de pago es privado hasta ${F.paid} mensajes al día.`),
    ],
    phoneMind: { lab: "IMAGINATION NIGHTS", t: "La mañana de después", sub: "una escena, susurrada", line: "Abres los ojos antes de la alarma. La luz entra por la izquierda.", timer: "⏲ Temporizador", timerE: "30 min · se apaga suave" },
    mdLinksH: "Preguntas de Mentalidad", mdLinks: [["/es/preguntas/afirmaciones-positivas/", "Afirmaciones positivas que no suenan falsas"], ["/es/preguntas/meditacion-guiada-para-dormir/", "Meditación guiada para dormir"], ["/es/preguntas/diario-de-gratitud/", "Diario de gratitud: cómo empezar"], ["/es/mentalidad/", "Todo sobre Mentalidad ›"]],
    priceH: "¿Peace Be Still es gratis?", priceP: "Sí. Hay una versión gratis que sigue gratis, y un plan de pago que eliges a propósito. Nunca hay anuncios.",
    freeLab: "Gratis · para siempre", paidLab: "De pago", price: `${F.monthly} al mes o ${F.yearly} al año`,
    free: [`Un chat al día, hasta ${F.free} mensajes`, "Tu primera noche de sueño, luego una por semana", "Una declaración diaria", "Un diario que se queda en tu teléfono, y tarjetas para compartir", "En la Palabra de Dios: la Biblia completa para leer y la historia bíblica de hoy"],
    paid: [`Chat privado que recuerda lo que compartes. ${c.promise} ${c.small}`, "Una sesión de sueño cada noche, y otras hechas para ti", "Todas las historias pasadas y los caminos más largos", "Temas de declaraciones y descargas sin conexión"],
    promises: [["Sin prueba", "Nada se convierte en un cobro por sorpresa."], ["Cancela en dos toques", "Desde un enlace en la misma pantalla de pago."], ["Lo gratis no se quita", "La versión gratis nunca se achica."]],
    priceNote: "Precios en dólares de EE. UU., visibles en la app antes de tocar. Tu precio nunca sube mientras sigas.",
    faqH: "Preguntas frecuentes",
    faq: [
      ["¿Qué es Peace Be Still?", "Peace Be Still es una app para el final del día. Empieza con una pregunta, “¿Qué necesitas esta noche?”, y dos puertas: la Palabra de Dios, con la Biblia, Salmos susurrados para dormir, chat bíblico e historias; y Mentalidad, con declaraciones diarias, Imagination Nights y un chat tranquilo. {{stores.line}}"],
      ["¿Peace Be Still es gratis?", `Sí. La versión gratis sigue gratis: un chat al día de hasta ${F.free} mensajes, tu primera noche de sueño y luego una por semana, una declaración diaria y un diario; en la Palabra de Dios, además, la Biblia completa y la historia de hoy. Un plan de pago cuesta ${F.monthly} al mes o ${F.yearly} al año.`],
      ["¿El chat es privado?", `Con un plan de pago, sí: privado hasta ${F.paid} mensajes al día y nunca se usa para entrenar IA. El chat gratis usa un servicio de IA gratis que puede guardar lo que escribes, y la app siempre pregunta antes.`],
      ["¿Ya salió Peace Be Still?", "{{stores.out}}"],
      ["¿Qué Biblia usa la puerta de la Palabra de Dios?", "En español, la Reina-Valera 1909, citada palabra por palabra de una copia guardada, con libro, capítulo y versículo. En inglés, la King James Version. La IA nunca escribe un versículo de memoria."],
      ["¿La puerta de Mentalidad es religiosa?", "No. Mentalidad no tiene contenido religioso: declaraciones diarias, imaginación en la noche y un chat tranquilo. Cada puerta va por su lado."],
      ["¿Hay una prueba?", "No. No hay prueba que se convierta en un cobro. La versión gratis es gratis para siempre. La de pago empieza solo cuando tú la eliges, con el precio en dólares a la vista antes de tocar, y se cancela en dos toques."],
      ["¿El chat es una persona?", "No. El chat es IA y cada respuesta lo dice. No es un pastor, un consejero ni una persona."],
    ],
    closingLab: "{{stores.heroB}}", closingH: "{{stores.heroB}}", closingP: "Una gran calma, cada noche.",
    byline: `Por Peace Be Still · una app de Spry Labs · Publicado el 18 nov 2026 · Actualizado el 21 nov 2026`,
    skip: "Ir al contenido",
  };
  return {
    title: "Peace Be Still: Whispered Sleep, Daily Words and Private Chat{{stores.title}}",
    description: "Peace Be Still is a phone app with two doors: God's Word (the King James Bible, whispered Psalms, Bible chat) and Mindset (daily declarations, Imagination Nights, a calm chat). {{stores.line}}",
    ogTitle: "Peace Be Still: a great calm, every night", locale: "en_US", og: "og.png",
    name: "Peace Be Still · {{stores.eyebrow}}", h1: "A great calm, every night.",
    lead: "Calm nights and daily words, in the way that fits you. Peace Be Still is a phone app for the end of the day: it asks one question, “What do you need tonight?”, and opens one of two doors. It is free to start, with no ads and no trial.",
    doorsH: "Two doors. Pick yours.", doorsP: "Each door keeps to itself, and you can change your pick later in Settings.",
    faith: { h: "With God's Word", p: "Scripture, prayer and Bible stories, read and spoken. Every verse is the King James Version, word for word.", li: ["The whole King James Bible to read, and chapters read aloud", "A Bible chat that answers with real verses", "Whispered Psalms at bedtime, and a Bible story each day"], go: "See God's Word ›", href: "#gods-word" },
    mind: { h: "With mindset &amp; imagination", p: "Calm words in the morning and imagination at night, with no religious content.", li: ["Morning Word: one line to say out loud, morning and night", "Imagination Nights: whispered sleep sessions inside a scene", "A calm Mindset chat"], go: "See Mindset ›", href: "/mindset/" },
    gw: { id: "gods-word", h: "God's Word", p: "For people who want scripture at the end of the day: to read it, hear it whispered and talk it through.", verseRef: "MAR 4:39" },
    gwJourneys: [
      jr(ART.harbor, "God's Word", "Hush Harbor · Black Bible Chat &amp; Stories", "Talk it through the way you would with family, in a Black church voice, and read a Bible story each day told in that voice."),
      jr(ART.refugio, "God's Word · en español", "Mi Refugio · Biblia y Chat en Español", "The whole journey in Spanish: chat, stories and whispered Psalms, with scripture from the Reina-Valera 1909.", "es"),
      jr(ART.waves("#E0A33E"), "God's Word", "Psalm Nights · Whispered Scripture for Sleep", "Psalms read in a whisper at bedtime, with a sleep timer that fades out. Your first night is free, then one a week."),
      jr(ART.bars("#E0A33E"), "God's Word", "Morning Word · Daily Declarations", "For mornings: one verse, one thing to say out loud, one short prayer."),
      jr(ART.peak, "God's Word", "Young Faith · Bible for Teens", "For ages 13 to 17. Plain words, real questions."),
    ],
    sleepH: "What is a Psalm Night?", sleepP: "A Psalm Night is a whispered reading of a Psalm for bedtime. The screen is always dark, it dims after ten seconds, and a sleep timer fades the voice out. Nothing plays next and nothing is offered.",
    phoneFaith: { lab: "PSALM NIGHTS", t: "Psalm 23, whispered", sub: "45 min · plays with the phone locked", ref: "PSA 23:2", timer: "⏲ Sleep timer", timerE: "30 min · fades out" },
    gwLinksH: "Looking for a Bible chat?", gwLinks: [["/black-bible-chat/", "Black Bible chat: Hush Harbor, in a Black church voice"], ["/free-bible-chat/", "Free Bible chat: what stays free, forever"], ["/bible-chat-alternative/", "Bible chat alternative: what to compare before you pay"], ["/bible-chat-cancel-subscription/", "How to cancel a Bible chat subscription"]],
    md: { id: "mindset-door", h: "Mindset", p: "For people who want calm words and a little imagination, with no religious content." },
    mdJourneys: [
      jr(ART.bars("#86CBC1"), "Mindset", "Morning Word · Daily Declarations", `One line to say out loud, morning and night, such as “${I18N("en", "mindset.calm.1")}”`),
      jr(ART.waves("#86CBC1"), "Mindset", "Imagination Nights", "Whispered night sessions: a slow body settle, one scene read softly, then quiet until sleep comes."),
      jr(ART.talk, "Mindset", "Mindset chat", `A short, calm answer, marked AI every time. With a paid plan it is private for up to ${F.paid} messages a day.`),
    ],
    phoneMind: { lab: "IMAGINATION NIGHTS", t: "Waking Up Inside It", sub: "one scene, whispered", line: "You open your eyes before the alarm. The light comes in from the left.", timer: "⏲ Sleep timer", timerE: "30 min · fades out" },
    mdLinksH: "Mindset questions", mdLinks: [["/questions/daily-affirmations/", "Daily affirmations: one line a day, said out loud"], ["/questions/guided-visualization-for-sleep/", "Guided visualization for sleep"], ["/questions/is-my-ai-chat-private/", "Is my AI chat private, or used for training?"], ["/mindset/", "Everything in Mindset ›"]],
    priceH: "Is Peace Be Still free?", priceP: "Yes. There is a free version that stays free, and a paid plan you choose on purpose. No ads, ever.",
    freeLab: "Free version · forever", paidLab: "Paid plan", price: `${F.monthly} a month or ${F.yearly} a year`,
    free: [`One chat a day, up to ${F.free} messages`, "Your first sleep night, then one a week", "A daily declaration", "A journal that stays on your phone, and share cards", "In God's Word: the whole King James Bible to read, chapters read aloud, and today's Bible story"],
    paid: [`Private chat that remembers what you share. ${c.promise} ${c.small}`, "A sleep session every night, plus ones made for you", "Every past story and the longer journeys", "Declaration topics and offline downloads"],
    promises: [["No trial", "Nothing turns into a charge by surprise."], ["Cancel in two taps", "From a link right on the paid screen."], ["Nothing free is taken back", "The free version never shrinks."]],
    priceNote: "Prices are in US dollars and are shown in the app before you tap. Your price never rises while you stay.",
    faqH: "Frequently asked questions",
    faq: [
      ["What is Peace Be Still?", "Peace Be Still is a phone app for the end of the day. It opens with one question, “What do you need tonight?”, and two doors: God's Word, with the King James Bible, whispered Psalms for sleep, Bible chat and Bible stories; and Mindset, with daily declarations, Imagination Nights and a calm chat. It is {{stores.short}}."],
      ["Is Peace Be Still free?", `Yes. The free version stays free: one chat a day of up to ${F.free} messages, your first sleep night and then one a week, a daily declaration and a journal; in God's Word, also the whole King James Bible and today's story. A paid plan is ${F.monthly} a month or ${F.yearly} a year.`],
      ["Is the chat private?", `With a paid plan, yes: private for up to ${F.paid} messages a day and never used to train AI. Free chat uses a free AI service that may keep what you type, and the app always asks first.`],
      ["Is Peace Be Still out yet?", "{{stores.out}}"],
      ["Which Bible does the God's Word door use?", "The King James Version, quoted word for word from a stored copy, with book, chapter and verse. The AI never writes a verse from memory. The Spanish journey, Mi Refugio, uses the Reina-Valera 1909."],
      ["Is the Mindset door religious?", "No. Mindset has no religious content: daily declarations, imagination at night and a calm chat. Each door keeps to itself."],
      ["Is there a trial?", "No. There is no trial that turns into a charge. The free version is free for good. A paid plan starts only when you choose it, with the price in dollars shown before you tap, and you can cancel in two taps."],
      ["Is the chat a real person?", "No. The chat is AI, and every answer is labelled as AI. It is not a pastor, a counselor or a person."],
    ],
    closingLab: "{{stores.heroB}}", closingH: "{{stores.heroB}}", closingP: "A great calm, every night.",
    byline: "By Peace Be Still · a Spry Labs app · Published 18 Nov 2026 · Updated 21 Nov 2026",
    skip: "Skip to the page",
  };
}
function I18N(lang, key) {
  const s = JSON.parse(readFileSync(new URL(`../../app/src/i18n/${lang}.json`, import.meta.url), "utf8"))[key];
  if (!s) throw new Error(`NAMED STOP [HOME_LINE_MISSING] ${key}`);
  return s;
}

const card = (id, d, tile) => `<!-- door:${id} --><div class="card door-card">
        <div class="head">${tile}<h3>${d.h}</h3></div>
        <p>${d.p}</p>
        <ul>
${d.li.map((x) => `          <li>${x}</li>`).join("\n")}
        </ul>
        <a class="door-go" href="${d.href}">${d.go}</a>
      </div><!-- /door:${id} -->`;

export function homeHtml(lang, store = storeConfig()) {
  const t = words(lang);
  // Each live store's listing (store.json, the one source): schema.org downloadUrl/installUrl.
  const listings = [store.app_store_url, store.play_url].filter(Boolean);
  const es = lang === "es";
  const path = es ? "/es/" : "/";
  const url = `${BASE}${path}`;
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: `${BASE}/icon-512.png`, sameAs: ENTITY.sameAs, parentOrganization: ENTITY.parentOrganization },
    { "@type": "WebSite", "@id": `${BASE}/#site`, name: "Peace Be Still", url: `${BASE}/`, inLanguage: ["en", "es"], publisher: { "@id": `${BASE}/#org` } },
    { "@type": "WebPage", "@id": `${url}#page`, url, name: t.title, inLanguage: lang, isPartOf: { "@id": `${BASE}/#site` }, about: { "@id": `${BASE}/#app` }, datePublished: PUBLISHED, dateModified: UPDATED, speakable: { "@type": "SpeakableSpecification", cssSelector: ["#what", "#faq"] } },
    { "@type": "MobileApplication", "@id": `${BASE}/#app`, name: "Peace Be Still", operatingSystem: "iOS, Android", applicationCategory: "LifestyleApplication", inLanguage: ["en", "es"],
      description: "A phone app with two doors: God's Word (the King James Bible to read and hear, whispered Psalms for sleep, Bible chat, daily declarations) and Mindset (daily declarations, Imagination Nights and a calm chat). {{stores.ld}}",
      publisher: { "@id": `${BASE}/#org` },
      ...(listings.length ? { downloadUrl: listings.length === 1 ? listings[0] : listings, installUrl: listings[0] } : {}),
      offers: [{ "@type": "Offer", name: "Free version", price: "0", priceCurrency: "USD" }, { "@type": "Offer", name: "Paid plan, monthly", price: F.monthly.slice(1), priceCurrency: "USD" }, { "@type": "Offer", name: "Paid plan, yearly", price: F.yearly.slice(1), priceCurrency: "USD" }] },
    { "@type": "FAQPage", "@id": `${url}#faqpage`, mainEntity: t.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(a) } })) },
  ] };
  const pf = t.phoneFaith, pm = t.phoneMind;
  return fillStores(`<!doctype html>
<html lang="${lang}">
<head>
<meta name="pbs:door" content="neutral">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${BASE}/">
<link rel="alternate" hreflang="es" href="${BASE}/es/">
<link rel="alternate" hreflang="ko" href="${BASE}/ko/">
<link rel="alternate" hreflang="zh-Hans" href="${BASE}/zh/">
<link rel="alternate" hreflang="x-default" href="${BASE}/">
<meta name="theme-color" content="#F4F0E6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1A22" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/libre-caslon-text-normal-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/figtree-normal-400-700-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Peace Be Still">
<meta property="og:title" content="${esc(t.ogTitle)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/${t.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${t.locale}">
<meta property="og:locale:alternate" content="${es ? "en_US" : "es_US"}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml(lang, null)}
<main id="main">
  <div class="wrap hero solo">
    <div class="hero-text">
      <h1><span class="name">${t.name}</span>${t.h1}</h1>
      <!-- claim:start --><!-- claim:end -->
      <p class="lead" id="what">${t.lead}</p>
      <!-- hero-cta:start --><!-- hero-cta:end -->
    </div>
  </div>
  <section class="wrap" aria-labelledby="doors-h">
    <div class="section-head">
      <h2 id="doors-h">${t.doorsH}</h2>
      <p class="lead">${t.doorsP}</p>
    </div>
    <div class="doors">
      ${card("faith", t.faith, FAITH_TILE(52))}
      ${card("mindset", t.mind, MIND_TILE(52))}
    </div>
  </section>
  <section id="${t.gw.id}" aria-labelledby="${t.gw.id}-h">
    <div class="wrap section-head door-section">
      <span class="door-lab">${FAITH_TILE(28)}${t.faith.h}</span>
      <h2 id="${t.gw.id}-h">${t.gw.h}</h2>
      <p class="lead">${t.gw.p}</p>
    </div>
    <div class="band">
      <figure class="wrap">
        <blockquote><p>${Q(t.gw.verseRef, lang)}</p></blockquote>
        <figcaption>${cite(t.gw.verseRef, lang)}</figcaption>
      </figure>
    </div>
    <div class="wrap">
      <div class="journeys" style="margin-top:28px">
${t.gwJourneys.join("\n")}
      </div>
      <div class="hero" style="padding-bottom:0">
        <div class="hero-text">
          <h3 class="sub-h">${t.sleepH}</h3>
          <p class="lead">${t.sleepP}</p>
        </div>
        <div class="phones">
          <div class="phone night" aria-hidden="true">
            <div class="status"><span>11:07</span><span>●●● ▮</span></div>
            <p class="sub center" style="margin-top:14px">${pf.lab}</p>
            <p class="center" style="font-family:var(--serif);font-size:19px;font-weight:700">${pf.t}</p>
            <p class="sub center">${pf.sub}</p>
            <p class="pverse" style="margin-top:10px">${Q(pf.ref, lang)}</p>
            <p class="pref">${cite(pf.ref, lang)}</p>
            <div class="bar" style="margin-top:12px"><i></i></div>
            <div class="times"><span>12:40</span><span>45:00</span></div>
            <div class="timer"><span>${pf.timer}</span><em>${pf.timerE}</em></div>
          </div>
        </div>
      </div>
      <h3 class="sub-h">${t.gwLinksH}</h3>
      <ul class="ticks">
${t.gwLinks.map(([h, n]) => `        <li><a href="${h}">${n}</a></li>`).join("\n")}
      </ul>
    </div>
  </section>
  <section class="wrap" id="${t.md.id}" aria-labelledby="${t.md.id}-h">
    <div class="section-head door-section">
      <span class="door-lab">${MIND_TILE(28)}${t.mind.h}</span>
      <h2 id="${t.md.id}-h">${t.md.h}</h2>
      <p class="lead">${t.md.p}</p>
    </div>
    <div class="journeys">
${t.mdJourneys.join("\n")}
    </div>
    <div class="hero" style="padding-bottom:0">
      <div class="hero-text">
        <h3 class="sub-h">${t.mdLinksH}</h3>
        <ul class="ticks">
${t.mdLinks.map(([h, n]) => `          <li><a href="${h}">${n}</a></li>`).join("\n")}
        </ul>
      </div>
      <div class="phones">
        <div class="phone night" aria-hidden="true">
          <div class="status"><span>10:52</span><span>●●● ▮</span></div>
          <p class="sub center" style="margin-top:14px">${pm.lab}</p>
          <p class="center" style="font-family:var(--serif);font-size:19px;font-weight:700">${pm.t}</p>
          <p class="sub center">${pm.sub}</p>
          <p class="pverse" style="margin-top:10px">${pm.line}</p>
          <div class="bar" style="margin-top:12px"><i></i></div>
          <div class="times"><span>08:15</span><span>32:00</span></div>
          <div class="timer"><span>${pm.timer}</span><em>${pm.timerE}</em></div>
        </div>
      </div>
    </div>
  </section>
  <section class="wrap" aria-labelledby="price">
    <div class="section-head">
      <h2 id="price">${t.priceH}</h2>
      <p class="lead">${t.priceP}</p>
    </div>
    <div class="plans">
      <div class="card plan">
        <span class="lab">${t.freeLab}</span>
        <p class="price">$0</p>
        <ul class="ticks">
${t.free.map((x) => `          <li>${x}</li>`).join("\n")}
        </ul>
      </div>
      <div class="card plan paid">
        <span class="lab">${t.paidLab}</span>
        <p class="price">${t.price}</p>
        <ul class="ticks">
${t.paid.map((x) => `          <li>${x}</li>`).join("\n")}
        </ul>
      </div>
    </div>
    <div class="promises">
${t.promises.map(([b, s]) => `      <div>${b}<span>${s}</span></div>`).join("\n")}
    </div>
    <p class="muted" style="margin-top:16px;font-size:15px">${t.priceNote}</p>
  </section>
  <section class="wrap" aria-labelledby="faq-h" id="faq">
    <div class="section-head"><h2 id="faq-h">${t.faqH}</h2></div>
    <div class="faq">
${t.faq.map(([q, a]) => `      <div><h3>${q}</h3><p>${a}</p></div>`).join("\n")}
    </div>
  </section>
<!-- cta:start --><!-- cta:end -->
  <section class="wrap closing" aria-label="${t.closingLab}">
    <img src="/brand/pbs-mark-dark.svg" alt="" width="64" height="64">
    <h2>${t.closingH}</h2>
    <p class="muted">${t.closingP}</p>
    <p class="byline">${t.byline}</p>
  </section>
</main>
<!-- footer:start -->${footerHtml(lang, UPDATED)}<!-- footer:end -->
</body>
</html>
`, lang, store);
}
