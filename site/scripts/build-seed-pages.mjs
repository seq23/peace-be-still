#!/usr/bin/env node
// Builds the hand-written seed question pages (page-shape: answer first, question headings, FAQ,
// schema, dates, ending in the waitlist) from site/content/questions.mjs, plus the two
// question indexes. The search-loop engine adds its own pages to the same folder later.
// Run: node site/scripts/build-seed-pages.mjs   (then node site/scripts/build-sitemap.mjs)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PAGES } from "../content/questions.mjs";
import { waitlistHtml, headerHtml, footerHtml, BASE } from "../content/parts.mjs";

const pub = new URL("../public/", import.meta.url).pathname;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

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
        author: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/` },
        publisher: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: { "@type": "ImageObject", url: `${BASE}/icon-512.png` } },
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
  const sources = p.sources?.length ? `  <section class="qa"><h2>${es ? "Fuentes" : "Sources"}</h2><ul>${p.sources.map(([n, u]) => `<li><a href="${u}">${n}</a></li>`).join("")}</ul></section>` : "";
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="pbs:door" content="${p.door}">
<link rel="canonical" href="${url}">
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
${sections}
  <section class="qa" id="faq"><h2>${es ? "Preguntas frecuentes" : "Frequently asked questions"}</h2>
    <div class="faq">
${faq}
    </div>
  </section>
${sources}
  <p class="byline">${es ? "Por" : "By"} Peace Be Still · ${es ? "una app de Spry Labs" : "a Spry Labs app"} · ${es ? "Publicado" : "Published"} ${p.publishedText} · ${es ? "Actualizado" : "Updated"} ${p.updatedText}</p>
</main>
${waitlistHtml(p.lang, p.path, p.door)}
${footerHtml(p.lang)}
</body>
</html>
`;
}

function renderIndex(lang, list) {
  const es = lang === "es";
  const path = es ? "/es/preguntas/" : "/questions/";
  const title = es ? "Preguntas sobre la Biblia y el sueño · Peace Be Still" : "Questions about the Bible, sleep and the app · Peace Be Still";
  const desc = es ? "Respuestas claras sobre Salmos para dormir, la Biblia en español y la app Peace Be Still, que llega muy pronto." : "Plain answers about whispered scripture, Psalms for sleep, Bible apps and cancelling subscriptions, from Peace Be Still, a coming-soon app.";
  const items = list.map((p) => `    <li><span class="door-lab">${p.door === "faith" ? (es ? "Palabra de Dios" : "God's Word") : p.door === "mindset" ? (es ? "Mentalidad" : "Mindset") : (es ? "Para todos" : "For everyone")}</span><a href="${p.path}">${p.indexLabel || p.h1}</a><span class="muted">${p.indexNote || p.description}</span></li>`).join("\n");
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
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", url: `${BASE}${path}`, name: title, inLanguage: lang, isPartOf: { "@id": `${BASE}/#site` }, breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Peace Be Still", item: `${BASE}${es ? "/es/" : "/"}` }, { "@type": "ListItem", position: 2, name: es ? "Preguntas" : "Questions", item: `${BASE}${path}` }] } })}</script>
</head>
<body>
${headerHtml(lang, null)}
<main id="main" class="wrap article">
  <nav class="crumbs" aria-label="${es ? "Ruta" : "Breadcrumb"}"><a href="${es ? "/es/" : "/"}">Peace Be Still</a></nav>
  <h1>${es ? "Preguntas" : "Questions"}</h1>
  <p class="lead">${es ? "Respuestas claras, con versículos citados palabra por palabra." : "Plain answers, with every verse quoted word for word."}</p>
  <ul class="qlist">
${items}
  </ul>
</main>
${waitlistHtml(lang, path, "neutral")}
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

if (PAGES.length === 0) { console.error("NAMED STOP [NO_SEED_PAGES] content/questions.mjs holds no pages"); process.exit(1); }
for (const p of PAGES) write(p.path, render(p));
write("/questions/", renderIndex("en", PAGES.filter((p) => p.lang === "en")));
write("/es/preguntas/", renderIndex("es", PAGES.filter((p) => p.lang === "es")));
// Shared parts inside the hand-written pages, between markers.
const STATIC = [["index.html", "en", "/"], ["es/index.html", "es", "/es/"], ["about.html", "en", "/about"], ["privacy.html", "en", "/privacy"], ["terms.html", "en", "/terms"], ["es/privacidad.html", "es", "/es/privacidad"], ["es/terminos.html", "es", "/es/terminos"], ["404.html", "en", "/404"]];
let filled = 0;
for (const [f, lang, path] of STATIC) {
  const file = join(pub, f);
  let s = readFileSync(file, "utf8");
  const before = s;
  s = s.replace(/<!-- footer:start -->[\s\S]*?<!-- footer:end -->/, `<!-- footer:start -->${footerHtml(lang)}<!-- footer:end -->`);
  s = s.replace(/<!-- waitlist:start -->[\s\S]*?<!-- waitlist:end -->/, `<!-- waitlist:start -->${waitlistHtml(lang, path, "neutral")}<!-- waitlist:end -->`);
  if (!s.includes("<!-- footer:start -->")) { console.error(`NAMED STOP [NO_FOOTER_MARKER] ${f}`); process.exit(1); }
  if (s !== before) { writeFileSync(file, s); filled++; }
}
console.log(`OUTPUT build-seed-pages: ${PAGES.length} pages + 2 indexes`);
