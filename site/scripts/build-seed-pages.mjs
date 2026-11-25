#!/usr/bin/env node
// Builds the hand-written seed question pages (page-shape: answer first, question headings, FAQ,
// schema, dates, ending in the store call to action) from site/content/questions.mjs, plus the two
// question indexes. The search-loop engine adds its own pages to the same folder later.
// Run: node site/scripts/build-seed-pages.mjs   (then node site/scripts/build-sitemap.mjs)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PAGES } from "../content/questions.mjs";
import { storeCtaHtml, headerHtml, footerHtml, isLocal, BASE, fillStores, orgSameAs, storeConfig, storeWords, INDEX_WORDS, STORE_STATES, snippetFindings } from "../content/parts.mjs";
import { applyCta } from "./apply-cta.mjs";
import { legalPages } from "../content/legal.mjs";
import { homeHtml } from "../content/home.mjs";

const pub = new URL("../public/", import.meta.url).pathname;
const ENTITY = JSON.parse(readFileSync(new URL("../../entity.json", import.meta.url), "utf8"));
const SAME_AS = orgSameAs();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (html) => html.replace(/<q\b[^>]*>/g, "“").replace(/<\/q>/g, "”").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Words the page frame uses, per page language. Korean and Chinese pages crumb to their landing (/ko/,
// /zh/), which lists every page in that language; there is no Korean or Chinese question index.
const L = {
  en: { home: "/", index: "/questions/", indexName: "Questions", crumbs: "Breadcrumb", quick: "Quick answer", best: "What this page is best for", pick: "Our pick", faq: "Frequently asked questions", more: "Keep reading", sources: "Sources", by: "By", maker: "a Spry Labs app", pub: "Published", upd: "Updated", og: "og.png" },
  es: { home: "/es/", index: "/es/preguntas/", indexName: "Preguntas", crumbs: "Ruta", quick: "Respuesta rápida", best: "Para quién es esta página", pick: "Nuestra recomendación", faq: "Preguntas frecuentes", more: "Sigue leyendo", sources: "Fuentes", by: "Por", maker: "una app de Spry Labs", pub: "Publicado", upd: "Actualizado", og: "og-es.png" },
  ko: { home: "/ko/", index: "/ko/", indexName: "새벽기도", crumbs: "현재 위치", quick: "한눈에 보기", best: "이런 분께 맞는 글이에요", pick: "추천", faq: "자주 묻는 질문", more: "함께 읽기", sources: "출처", by: "", maker: "Spry Labs가 만든 앱", pub: "처음 올린 날", upd: "수정한 날", og: "og-ko.png" },
  "zh-Hans": { home: "/zh/", index: "/zh/", indexName: "中文首页", crumbs: "当前位置", quick: "简要回答", best: "适合谁读", pick: "推荐", faq: "常见问题", more: "继续阅读", sources: "出处", by: "", maker: "Spry Labs 出品的应用", pub: "发布于", upd: "更新于", og: "og-zh.png", colon: "：" },
};

// hreflang: p.alt (the Spanish/English twin) or p.alts ([[lang, path], ...], self included), plus x-default.
function hreflangs(p, url) {
  if (p.alts) return [...p.alts.map(([l, path]) => `<link rel="alternate" hreflang="${l}" href="${BASE}${path}">`), `<link rel="alternate" hreflang="x-default" href="${BASE}${p.xDefault || p.alts.find(([l]) => l === "en")?.[1] || p.path}">`].map((x) => `\n${x}`).join("");
  if (p.alt) return `\n<link rel="alternate" hreflang="${p.lang}" href="${url}">\n<link rel="alternate" hreflang="${p.lang === "es" ? "en" : "es"}" href="${BASE}${p.alt}">`;
  return "";
}

function render(p) {
  const es = p.lang === "es";
  const t = L[p.lang] || L.en;
  const url = `${BASE}${p.path}`;
  const home = t.home;
  const index = t.index;
  const indexName = t.indexName;
  const og = p.og || t.og;
  // A door's hub (the Mindset page) crumbs straight to home; question pages go through the index.
  const crumbs = [["Peace Be Still", isLocal(p.lang) ? "/" : home], ...((isLocal(p.lang) && p.path === index) || p.hub ? [] : [[indexName, index]])];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: p.h1, description: p.description, inLanguage: p.lang, url,
        datePublished: p.published, dateModified: p.updated, image: `${BASE}/${og}`,
        author: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: `${BASE}/icon-512.png`, sameAs: SAME_AS, parentOrganization: ENTITY.parentOrganization },
        publisher: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: { "@type": "ImageObject", url: `${BASE}/icon-512.png` }, sameAs: SAME_AS, parentOrganization: ENTITY.parentOrganization },
        isPartOf: { "@id": `${BASE}/#site` },
        ...(p.audience ? { audience: { "@type": "Audience", audienceType: p.audience } } : {}),
        speakable: { "@type": "SpeakableSpecification", cssSelector: ["#what", "#faq"] } },
      { "@type": "BreadcrumbList", itemListElement: [...crumbs, [p.h1, p.path]].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${BASE}${path}` })) },
      { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: text(a) } })) },
    ],
  };
  const sections = p.sections.map(([h, body]) => `  <section class="qa"><h2>${h}</h2>\n${body}\n  </section>`).join("\n");
  const faq = p.faq.map(([q, a]) => `      <div><h3>${q}</h3><p>${a}</p></div>`).join("\n");
  // Another app's own store listing is linked as a sourced fact (check-site allows exactly this shape).
  const srcLink = (n, u) => /^https:\/\/apps\.apple\.com\//.test(u) ? `<a class="src" rel="nofollow noopener" href="${u}">${n}</a>` : `<a href="${u}">${n}</a>`;
  const sources = p.sources?.length ? `  <section class="qa"><h2>${t.sources}</h2><ul>${p.sources.map(([n, u]) => `<li>${srcLink(n, u)}</li>`).join("")}</ul></section>` : "";
  const related = (p.related || []).map((r) => BY_PATH.get(r));
  const relatedHtml = related.length ? `  <section class="qa related"><h2>${p.relatedTitle || t.more}</h2><ul>${related.map((r) => `<li><a href="${r.path}"${r.lang !== p.lang ? ` hreflang="${r.lang}"` : ""}>${r.indexLabel || r.h1}</a></li>`).join("")}</ul></section>` : "";
  const pick = p.pick ? `  <aside class="pick" aria-label="${t.pick}"><span class="lab">${t.pick}</span>${p.pick}</aside>\n  <p class="muted disclosure">${es ? "Nosotros hacemos Peace Be Still, así que toma nuestra recomendación con eso en mente; cada dato sobre otras apps enlaza a su propia ficha." : "We make Peace Be Still, so weigh our pick accordingly; every fact about other apps links to their own listing."}</p>\n` : "";
  const naNames = typeof p.notAffiliated === "string" ? p.notAffiliated : "Bible Chat";
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="pbs:door" content="${p.door}">
<link rel="canonical" href="${url}">${hreflangs(p, url)}
<meta name="theme-color" content="#F4F0E6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1A22" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Peace Be Still">
<meta property="og:title" content="${esc(p.ogTitle || p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">${p.ogAlt ? `\n<meta property="og:image:alt" content="${esc(p.ogAlt)}">` : ""}
<meta property="og:locale" content="${{ en: "en_US", es: "es_US", ko: "ko_KR", "zh-Hans": "zh_CN" }[p.lang]}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml(p.lang, isLocal(p.lang) ? "/" : null)}
<main id="main" class="wrap article">
  <nav class="crumbs" aria-label="${t.crumbs}">${crumbs.map(([n, h]) => `<a href="${h}">${n}</a>`).join(" › ")}</nav>
  <h1>${p.h1}</h1>
${p.claim ? "  <!-- claim:start --><!-- claim:end -->\n" : ""}  <p class="lead" id="what">${p.definition}</p>
  <section class="qa"><h2>${t.quick}</h2><p>${p.quick}</p><p class="muted">${t.best}${t.colon || ": "}${p.bestFor}</p></section>
${pick}${sections}
  <section class="qa" id="faq"><h2>${t.faq}</h2>
    <div class="faq">
${faq}
    </div>
  </section>
${relatedHtml}
${sources}
${p.notAffiliated ? `  <p class="muted not-affiliated">${es ? `Peace Be Still no está afiliada con ${naNames} ni con ninguna app nombrada aquí.` : `Peace Be Still is not affiliated with ${naNames} or any app named here.`} ${es ? "Los nombres se usan solo para identificar las apps." : "Names are used only to identify the apps."}</p>\n` : ""}  <p class="byline">${t.by ? `${t.by} ` : ""}Peace Be Still · ${t.maker} · ${t.pub} ${p.publishedText} · ${t.upd} ${p.updatedText}</p>
</main>
${storeCtaHtml(p.lang)}
${footerHtml(p.lang, p.updated, p.door)}
</body>
</html>
`;
}

function renderIndex(lang, list) {
  const es = lang === "es";
  const path = es ? "/es/preguntas/" : "/questions/";
  const { title, description: desc } = INDEX_WORDS[es ? "es" : "en"];
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
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", url: `${BASE}${path}`, name: title, inLanguage: lang, dateModified: UPDATED, isPartOf: { "@id": `${BASE}/#site` }, publisher: { "@type": "Organization", "@id": `${BASE}/#org`, name: "Peace Be Still", url: `${BASE}/`, logo: `${BASE}/icon-512.png`, sameAs: SAME_AS, parentOrganization: ENTITY.parentOrganization }, breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Peace Be Still", item: `${BASE}${es ? "/es/" : "/"}` }, { "@type": "ListItem", position: 2, name: es ? "Preguntas" : "Questions", item: `${BASE}${path}` }] } })}</script>
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
// The search snippet (b1/b2): every page's title and description fit, in every store state, before
// anything is written. site/test/snippet.test.mjs holds the built pages (home, legal, engine) to the same.
{
  const bad = [];
  for (const [state, store] of Object.entries(STORE_STATES)) {
    for (const p of PAGES) bad.push(...snippetFindings(`${p.path} [${state}]`, fillStores(p.title, p.lang, store), fillStores(p.description, p.lang, store)));
    for (const [lang, w] of Object.entries(INDEX_WORDS)) bad.push(...snippetFindings(`${lang} index [${state}]`, fillStores(w.title, lang, store), fillStores(w.description, lang, store)));
  }
  if (bad.length) { console.error(`NAMED STOP [SNIPPET_LENGTH]\n${[...new Set(bad.map((b) => b.replace(/ \[\w+\]:/, ":")))].join("\n")}`); process.exit(1); }
}
// Every {{stores.*}} token (the launch state, from store.json) is filled here, per page language.
for (const p of PAGES) write(p.path, fillStores(render(p), p.lang));
write("/questions/", fillStores(renderIndex("en", PAGES.filter((p) => p.lang === "en")), "en"));
write("/es/preguntas/", fillStores(renderIndex("es", PAGES.filter((p) => p.lang === "es")), "es"));
// The two home pages (two equal doors), from site/content/home.mjs.
writeFileSync(join(pub, "index.html"), homeHtml("en"));
writeFileSync(join(pub, "es/index.html"), homeHtml("es"));
// Shared parts inside the hand-written pages, between markers.
const STATIC = [["about.html", "en", "/about"], ["support.html", "en", "/support"], ["es/soporte.html", "es", "/es/soporte"], ["404.html", "en", "/404"]];
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
// The legal pages, rendered from legal/*.md and legal/es/*.md (site/content/legal.mjs).
const legal = legalPages();
for (const [f, html] of legal) writeFileSync(join(pub, f), html);
// llms.txt: the store line (launch state and listing links, from store.json) and the question and
// landing pages list (from PAGES), each between markers.
{
  const f = join(pub, "llms.txt");
  const s = readFileSync(f, "utf8");
  const list = PAGES.map((p) => `- [${p.indexLabel || p.h1}](${BASE}${p.path})`).join("\n");
  const st = storeConfig();
  const links = [st.app_store_url && `App Store: ${st.app_store_url}`, st.play_url && `Google Play: ${st.play_url}`].filter(Boolean).map((x) => ` ${x}.`).join("");
  const out = s.replace(/<!-- pages:start -->[\s\S]*?<!-- pages:end -->/, `<!-- pages:start -->\n${list}\n<!-- pages:end -->`)
    .replace(/<!-- stores:start -->[\s\S]*?<!-- stores:end -->/, `<!-- stores:start -->${storeWords("en", st).line}${links} No waitlist.<!-- stores:end -->`);
  if (!out.includes("<!-- pages:start -->")) { console.error("NAMED STOP [NO_LLMS_MARKER] llms.txt has no pages markers"); process.exit(1); }
  if (!out.includes("<!-- stores:start -->")) { console.error("NAMED STOP [NO_LLMS_MARKER] llms.txt has no stores markers"); process.exit(1); }
  writeFileSync(f, out);
}
const cta = applyCta();
console.log(`OUTPUT build-seed-pages: ${PAGES.length} pages + 2 indexes + ${legal.length} legal pages; store CTA on ${cta} pages`);
