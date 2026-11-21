#!/usr/bin/env node
// Builds the hand-written seed question pages (page-shape: answer first, question headings, FAQ,
// schema, dates, ending in the store call to action) from site/content/questions.mjs, plus the two
// question indexes. The search-loop engine adds its own pages to the same folder later.
// Run: node site/scripts/build-seed-pages.mjs   (then node site/scripts/build-sitemap.mjs)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PAGES } from "../content/questions.mjs";
import { storeCtaHtml, headerHtml, footerHtml, BASE } from "../content/parts.mjs";
import { applyCta } from "./apply-cta.mjs";

const pub = new URL("../public/", import.meta.url).pathname;
const ENTITY = JSON.parse(readFileSync(new URL("../../entity.json", import.meta.url), "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (html) => html.replace(/<q\b[^>]*>/g, "“").replace(/<\/q>/g, "”").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

function render(p) {
  const es = p.lang === "es";
  const url = `${BASE}${p.path}`;
  const home = es ? "/es/" : "/";
  const index = es ? "/es/preguntas/" : "/questions/";
  const indexName = es ? "Preguntas" : "Questions";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: p.h1, description: p.description, inLanguage: p.lang, url,
        datePublished: p.published, dateModified: p.updated, image: `${BASE}/${es ? "og-es.png" : "og.png"}`,
        author: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: `${BASE}/icon-512.png`, sameAs: ENTITY.sameAs, parentOrganization: ENTITY.parentOrganization },
        publisher: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: { "@type": "ImageObject", url: `${BASE}/icon-512.png` }, sameAs: ENTITY.sameAs, parentOrganization: ENTITY.parentOrganization },
        isPartOf: { "@id": `${BASE}/#site` },
        speakable: { "@type": "SpeakableSpecification", cssSelector: ["#what", "#faq"] } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Peace Be Still", item: `${BASE}${home}` },
        { "@type": "ListItem", position: 2, name: indexName, item: `${BASE}${index}` },
        { "@type": "ListItem", position: 3, name: p.h1, item: url } ] },
      { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: text(a) } })) },
    ],
  };
  const sections = p.sections.map(([h, body]) => `  <section class="qa"><h2>${h}</h2>\n${body}\n  </section>`).join("\n");
  const faq = p.faq.map(([q, a]) => `      <div><h3>${q}</h3><p>${a}</p></div>`).join("\n");
  // Another app's own store listing is linked as a sourced fact (check-site allows exactly this shape).
  const srcLink = (n, u) => /^https:\/\/apps\.apple\.com\//.test(u) ? `<a class="src" rel="nofollow noopener" href="${u}">${n}</a>` : `<a href="${u}">${n}</a>`;
  const sources = p.sources?.length ? `  <section class="qa"><h2>${es ? "Fuentes" : "Sources"}</h2><ul>${p.sources.map(([n, u]) => `<li>${srcLink(n, u)}</li>`).join("")}</ul></section>` : "";
  const related = (p.related || []).map((r) => BY_PATH.get(r));
  const relatedHtml = related.length ? `  <section class="qa related"><h2>${es ? "Sigue leyendo" : "Keep reading"}</h2><ul>${related.map((r) => `<li><a href="${r.path}">${r.indexLabel || r.h1}</a></li>`).join("")}</ul></section>` : "";
  const pick = p.pick ? `  <aside class="pick" aria-label="${es ? "Nuestra recomendación" : "Our pick"}"><span class="lab">${es ? "Nuestra recomendación" : "Our pick"}</span>${p.pick}</aside>\n  <p class="muted disclosure">${es ? "Nosotros hacemos Peace Be Still, así que toma nuestra recomendación con eso en mente; cada dato sobre otras apps enlaza a su propia ficha." : "We make Peace Be Still, so weigh our pick accordingly; every fact about other apps links to their own listing."}</p>\n` : "";
  const naNames = typeof p.notAffiliated === "string" ? p.notAffiliated : "Bible Chat";
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="pbs:door" content="${p.door}">
<link rel="canonical" href="${url}">${p.alt ? `\n<link rel="alternate" hreflang="${p.lang}" href="${url}">\n<link rel="alternate" hreflang="${es ? "en" : "es"}" href="${BASE}${p.alt}">` : ""}
<meta name="theme-color" content="#F4F0E6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1A22" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Peace Be Still">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/${es ? "og-es.png" : "og.png"}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml(p.lang, null)}
<main id="main" class="wrap article">
  <nav class="crumbs" aria-label="${es ? "Ruta" : "Breadcrumb"}"><a href="${home}">Peace Be Still</a> › <a href="${index}">${indexName}</a></nav>
  <h1>${p.h1}</h1>
  <p class="lead" id="what">${p.definition}</p>
  <section class="qa"><h2>${es ? "Respuesta rápida" : "Quick answer"}</h2><p>${p.quick}</p><p class="muted">${es ? "Para quién es esta página" : "What this page is best for"}: ${p.bestFor}</p></section>
${pick}${sections}
  <section class="qa" id="faq"><h2>${es ? "Preguntas frecuentes" : "Frequently asked questions"}</h2>
    <div class="faq">
${faq}
    </div>
  </section>
${relatedHtml}
${sources}
${p.notAffiliated ? `  <p class="muted not-affiliated">${es ? `Peace Be Still no está afiliada con ${naNames} ni con ninguna app nombrada aquí.` : `Peace Be Still is not affiliated with ${naNames} or any app named here.`} ${es ? "Los nombres se usan solo para identificar las apps." : "Names are used only to identify the apps."}</p>\n` : ""}  <p class="byline">${es ? "Por" : "By"} Peace Be Still · ${es ? "una app de Spry Labs" : "a Spry Labs app"} · ${es ? "Publicado" : "Published"} ${p.publishedText} · ${es ? "Actualizado" : "Updated"} ${p.updatedText}</p>
</main>
${storeCtaHtml(p.lang)}
${footerHtml(p.lang)}
</body>
</html>
`;
}

function renderIndex(lang, list) {
  const es = lang === "es";
  const path = es ? "/es/preguntas/" : "/questions/";
  const title = es ? "Preguntas sobre la Biblia y el sueño · Peace Be Still" : "Bible, sleep and app questions · Peace Be Still";
  const desc = es ? "Respuestas claras sobre Salmos para dormir, la Biblia en español para dormir y la app Peace Be Still, que llega muy pronto al App Store y Google Play." : "Plain answers about whispered scripture, Psalms for sleep, Bible apps and cancelling subscriptions, from Peace Be Still, a coming-soon app.";
  const groups = [...new Set(list.map((p) => p.group || (es ? "Más preguntas" : "More questions")))];
  const li = (p) => `    <li><span class="door-lab">${p.door === "faith" ? (es ? "Palabra de Dios" : "God's Word") : p.door === "mindset" ? (es ? "Mentalidad" : "Mindset") : (es ? "Para todos" : "For everyone")}</span><a href="${p.path}">${p.indexLabel || p.h1}</a><span class="muted">${p.indexNote || p.description}</span></li>`;
  const items = groups.map((g) => `  <h2 class="qgroup">${g}</h2>\n  <ul class="qlist">\n${list.filter((p) => (p.group || (es ? "Más preguntas" : "More questions")) === g).map(li).join("\n")}\n  </ul>`).join("\n");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="pbs:door" content="neutral">
<link rel="canonical" href="${BASE}${path}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Peace Be Still">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${BASE}${path}">
<meta property="og:image" content="${BASE}/${es ? "og-es.png" : "og.png"}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", url: `${BASE}${path}`, name: title, inLanguage: lang, dateModified: UPDATED, isPartOf: { "@id": `${BASE}/#site` }, publisher: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: `${BASE}/icon-512.png`, sameAs: ENTITY.sameAs, parentOrganization: ENTITY.parentOrganization }, breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Peace Be Still", item: `${BASE}${es ? "/es/" : "/"}` }, { "@type": "ListItem", position: 2, name: es ? "Preguntas" : "Questions", item: `${BASE}${path}` }] } })}</script>
</head>
<body>
${headerHtml(lang, null)}
<main id="main" class="wrap article">
  <nav class="crumbs" aria-label="${es ? "Ruta" : "Breadcrumb"}"><a href="${es ? "/es/" : "/"}">Peace Be Still</a></nav>
  <h1>${es ? "Preguntas" : "Questions"}</h1>
  <p class="lead">${es ? "Respuestas claras, con versículos citados palabra por palabra." : "Plain answers, with every verse quoted word for word."}</p>
${items}
  <p class="byline">${es ? "Por Peace Be Still · una app de Spry Labs · Actualizado el 18 nov 2026" : "By Peace Be Still · a Spry Labs app · Updated 18 Nov 2026"}</p>
</main>
${storeCtaHtml(lang)}
${footerHtml(lang)}
</body>
</html>
`;
}

function write(path, html) {
  const file = join(pub, path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const UPDATED = PAGES.map((p) => p.updated).sort().at(-1);
const BY_PATH = new Map(PAGES.map((p) => [p.path, p]));
// Internal links are checked here: every related path must be a built page, and a faith page never
// links a mindset page (or the reverse).
for (const p of PAGES) for (const r of p.related || []) {
  const t = BY_PATH.get(r);
  if (!t) { console.error(`NAMED STOP [RELATED_MISSING] ${p.path} links ${r}, which is not a page`); process.exit(1); }
  if (t.door !== "neutral" && p.door !== "neutral" && t.door !== p.door) { console.error(`NAMED STOP [DOOR_LINK] ${p.path} (${p.door}) links ${r} (${t.door})`); process.exit(1); }
}
if (PAGES.length === 0) { console.error("NAMED STOP [NO_SEED_PAGES] content/questions.mjs holds no pages"); process.exit(1); }
for (const p of PAGES) write(p.path, render(p));
write("/questions/", renderIndex("en", PAGES.filter((p) => p.lang === "en")));
write("/es/preguntas/", renderIndex("es", PAGES.filter((p) => p.lang === "es")));
// Shared parts inside the hand-written pages, between markers.
const STATIC = [["index.html", "en", "/"], ["es/index.html", "es", "/es/"], ["about.html", "en", "/about"], ["privacy.html", "en", "/privacy"], ["terms.html", "en", "/terms"], ["es/privacidad.html", "es", "/es/privacidad"], ["es/terminos.html", "es", "/es/terminos"], ["support.html", "en", "/support"], ["es/soporte.html", "es", "/es/soporte"], ["404.html", "en", "/404"]];
let filled = 0;
for (const [f, lang, path] of STATIC) {
  const file = join(pub, f);
  let s = readFileSync(file, "utf8");
  const before = s;
  s = s.replace(/<!-- footer:start -->[\s\S]*?<!-- footer:end -->/, `<!-- footer:start -->${footerHtml(lang)}<!-- footer:end -->`);
  s = s.replace(/<!-- waitlist:start -->[\s\S]*?<!-- waitlist:end -->/, storeCtaHtml(lang));
  if (!s.includes("<!-- footer:start -->")) { console.error(`NAMED STOP [NO_FOOTER_MARKER] ${f}`); process.exit(1); }
  if (s !== before) { writeFileSync(file, s); filled++; }
}
// llms.txt: the question and landing pages list, between markers, from PAGES.
{
  const f = join(pub, "llms.txt");
  const s = readFileSync(f, "utf8");
  const list = PAGES.map((p) => `- [${p.indexLabel || p.h1}](${BASE}${p.path})`).join("\n");
  const out = s.replace(/<!-- pages:start -->[\s\S]*?<!-- pages:end -->/, `<!-- pages:start -->\n${list}\n<!-- pages:end -->`);
  if (!out.includes("<!-- pages:start -->")) { console.error("NAMED STOP [NO_LLMS_MARKER] llms.txt has no pages markers"); process.exit(1); }
  writeFileSync(f, out);
}
const cta = applyCta();
console.log(`OUTPUT build-seed-pages: ${PAGES.length} pages + 2 indexes; store CTA on ${cta} pages`);
