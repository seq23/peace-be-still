// The legal pages on peacebestillapp.com, built from the one source of each text: legal/*.md
// (English, the version that controls) and legal/es/*.md (the checked Spanish translation; owner
// ruling 6 Nov 2026: no machine-translated legal text, see site/test/legal.test.mjs). The page
// paths here are also what the store listings link (site/scripts/store-set.mjs --es-legal).
import { readFileSync } from "node:fs";
import { BASE, headerHtml, footerHtml } from "./parts.mjs";

const legalDir = new URL("../../legal/", import.meta.url);

// key -> [English source + path, Spanish source + path]
export const LEGAL = [
  { key: "privacy", en: { file: "privacy.md", path: "/privacy" }, es: { file: "es/privacidad.md", path: "/es/privacidad" } },
  { key: "terms", en: { file: "terms.md", path: "/terms" }, es: { file: "es/terminos.md", path: "/es/terminos" } },
  { key: "disclaimer", en: { file: "disclaimer.md", path: "/disclaimer" }, es: { file: "es/aviso.md", path: "/es/aviso" } },
];

export const readLegal = (file) => readFileSync(new URL(file, legalDir), "utf8");

/**
 * Parses the small Markdown the legal texts use: "# " title, "> " translation note, an
 * "Effective:" / "Vigente desde:" line, "## " sections, "- " list items, paragraphs, [links](url).
 * Returns { title, note, effective, intro: Block[], sections: { h, blocks: Block[] }[] },
 * Block = { type: "p" | "li", text }. Throws on anything else, so a new shape cannot slip through.
 */
export function parseLegal(md) {
  const doc = { title: "", note: "", effective: "", intro: [], sections: [] };
  let blocks = doc.intro;
  for (const raw of md.split(/\n\s*\n|\n(?=- |## )/)) {
    const chunk = raw.trim();
    if (!chunk) continue;
    if (chunk.startsWith("# ")) doc.title = chunk.slice(2).trim();
    else if (chunk.startsWith("> ")) doc.note = chunk.slice(2).trim();
    else if (/^(Effective|Vigente desde): /.test(chunk)) doc.effective = chunk;
    else if (chunk.startsWith("## ")) { const s = { h: chunk.slice(3).trim(), blocks: [] }; doc.sections.push(s); blocks = s.blocks; }
    else if (chunk.startsWith("- ")) blocks.push({ type: "li", text: chunk.slice(2).replace(/\s+/g, " ").trim() });
    else if (/^[#>]/.test(chunk)) throw new Error(`legal markdown: unsupported line "${chunk.slice(0, 40)}"`);
    else blocks.push({ type: "p", text: chunk.replace(/\s+/g, " ") });
  }
  if (!doc.title || !doc.effective || !doc.sections.length) throw new Error("legal markdown: a title, an effective line and sections are required");
  return doc;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const curly = (s) => s.replace(/"([^"]*)"/g, "“$1”").replace(/'/g, "’");

/** Inline text to HTML: links, the contact address as a mailto link, typographic quotes. */
export function inline(text) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    parts.push(esc(curly(text.slice(last, m.index))));
    const href = m[2].startsWith(BASE) ? m[2].slice(BASE.length) || "/" : m[2];
    // Outside links use the one shape check-site allows for a sourced link (incl. Apple's pages).
    parts.push(href.startsWith("/") ? `<a href="${esc(href)}">${esc(curly(m[1]))}</a>` : `<a class="src" rel="nofollow noopener" href="${esc(href)}">${esc(curly(m[1]))}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(esc(curly(text.slice(last))));
  return parts.join("").replace(/info@peacebestillapp\.com/g, '<a href="mailto:info@peacebestillapp.com">info@peacebestillapp.com</a>');
}

const ISO = { November: "11", noviembre: "11" };
function isoDate(effective) {
  const en = effective.match(/([A-Z][a-z]+) (\d{1,2}), (\d{4})/);
  const es = effective.match(/(\d{1,2}) de ([a-z]+) de (\d{4})/);
  const [mon, day, year] = en ? [en[1], en[2], en[3]] : es ? [es[2], es[1], es[3]] : [];
  if (!ISO[mon]) throw new Error(`legal markdown: cannot read the date in "${effective}"`);
  return `${year}-${ISO[mon]}-${day.padStart(2, "0")}`;
}
const SHORT = { "11": "Nov" };

export function renderLegal(entry, lang) {
  const es = lang === "es";
  const self = entry[lang], other = entry[es ? "en" : "es"];
  const doc = parseLegal(readLegal(self.file));
  const url = `${BASE}${self.path}`;
  const iso = isoDate(doc.effective);
  const updated = `${Number(iso.slice(8))} ${SHORT[iso.slice(5, 7)]} ${iso.slice(0, 4)}`;
  const desc = es
    ? `${doc.title} de Peace Be Still, la app de Spry Labs. ${doc.effective}.`
    : `The Peace Be Still ${doc.title.toLowerCase()}, for the app and peacebestillapp.com. ${doc.effective}.`;
  const title = `${doc.title} · Peace Be Still`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", url, name: title, inLanguage: lang, isPartOf: { "@id": `${BASE}/#site` }, datePublished: iso, dateModified: iso,
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Peace Be Still", item: `${BASE}${es ? "/es/" : "/"}` }, { "@type": "ListItem", position: 2, name: doc.title, item: url }] } };
  const blocks = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].type === "p") { out.push(`  <p>${inline(list[i].text)}</p>`); continue; }
      const items = [];
      while (i < list.length && list[i].type === "li") items.push(`    <li>${inline(list[i++].text)}</li>`);
      i--;
      out.push(`  <ul>\n${items.join("\n")}\n  </ul>`);
    }
    return out.join("\n");
  };
  const body = [
    doc.note ? `  <p class="muted" lang="${lang}">${inline(doc.note)}</p>` : "",
    `  <p class="lead">${esc(doc.effective)}</p>`,
    blocks(doc.intro),
    ...doc.sections.map((s) => `  <h2>${esc(s.h)}</h2>\n${blocks(s.blocks)}`),
  ].filter(Boolean).join("\n");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="pbs:door" content="neutral">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${BASE}${entry.en.path}">
<link rel="alternate" hreflang="es" href="${BASE}${entry.es.path}">
<link rel="alternate" hreflang="x-default" href="${BASE}${entry.en.path}">
<meta name="robots" content="noindex, follow">
<meta name="theme-color" content="#F4F0E6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1A22" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Peace Be Still">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/${es ? "og-es.png" : "og.png"}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml(lang, other.path)}
<main id="main" class="wrap doc">
  <a href="${es ? "/es/" : "/"}">${es ? "← Volver a Peace Be Still" : "← Back to Peace Be Still"}</a>
  <h1 style="font-size:clamp(30px,5vw,40px)">${esc(doc.title)}</h1>
${body}
</main>
<!-- footer:start -->${footerHtml(lang, updated)}<!-- footer:end -->
</body>
</html>
`;
}

/** Every legal page as [public file, html]. */
export function legalPages() {
  return LEGAL.flatMap((e) => ["en", "es"].map((lang) => [`${e[lang].path.slice(1)}.html`, renderLegal(e, lang)]));
}

/**
 * The legal lines of the es-MX store listing (store/listing-es.md), from the one switch
 * site/config/store.json "es_listing_spanish_legal" (OFF until the owner says yes; flip it with
 * npm run store:set -- --es-legal on). Off: the English pages, marked "(en inglés)". On: the
 * Spanish pages. The EULA URL is app-wide in App Store Connect, so it stays the English terms.
 */
export function esListingLegal(on) {
  const [privacy, terms] = ["privacy", "terms"].map((k) => LEGAL.find((e) => e.key === k));
  const p = `${BASE}${on ? privacy.es.path : privacy.en.path}`, t = `${BASE}${on ? terms.es.path : terms.en.path}`;
  return {
    "Privacy policy URL": p,
    "Terms of use (EULA) URL": `${BASE}${terms.en.path}`,
    body: on ? `Términos: ${t} · Privacidad: ${p}` : `Términos (en inglés): ${t} · Privacidad (en inglés): ${p}`,
  };
}
