// The Spanish legal pages say the same as the English ones (owner ruling 6 Nov 2026: no
// machine-translated legal text, because an unchecked translation could say something different).
// A fresh model reads both side by side (reviews/legal-es-check.md in the briefs folder); this test
// holds the parts code can prove, clause by clause: the same sections and paragraphs, and in each
// paragraph the same numbers, the same named companies, products and places, the same email
// addresses and the same links. Everything is parsed from the two texts; nothing is a copied list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEGAL, parseLegal, readLegal, legalPages } from "../content/legal.mjs";
import { providers } from "../../worker/src/providers.mjs";

const BASE = "https://peacebestillapp.com";
const pub = new URL("../public/", import.meta.url);
const docs = LEGAL.map((e) => ({ e, en: parseLegal(readLegal(e.en.file)), es: parseLegal(readLegal(e.es.file)) }));

// Every paragraph and list item of a document, in order, with the section it sits in.
const clauses = (d) => [
  { where: "effective", text: d.effective },
  ...d.intro.map((b, i) => ({ where: `intro ${i + 1}`, ...b })),
  ...d.sections.flatMap((s, si) => s.blocks.map((b, i) => ({ where: `section ${si + 1} (${s.h}) ${b.type} ${i + 1}`, ...b }))),
];

// Numbers as written, separators dropped: "1,000" -> 1000, "1-800-799-7233" -> 1 800 799 7233.
const numbers = (t) => (t.match(/\d+(?:,\d{3})*/g) || []).map((n) => n.replace(/,/g, "")).sort();
const emails = (t) => (t.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).sort();
// Links, with the English legal pages mapped to their Spanish twins.
const toEs = new Map(LEGAL.map((e) => [`${BASE}${e.en.path}`, `${BASE}${e.es.path}`]));
const links = (t, map) => [...t.matchAll(/\]\(([^)]+)\)/g)].map((m) => (map ? toEs.get(m[1]) || m[1] : m[1])).sort();

// Names: capitalised words that are not the first word of a sentence (Cloudflare, RevenueCat,
// Wyoming, Family Sharing...). Each must appear in the Spanish clause, as written, or as its
// standard Spanish name (Apple's own es-MX feature names, country and common nouns).
const SPANISH = {
  AI: /\bIA\b/, SDKs: /\bSDK\b/, "Apple-branded": /marca Apple/, Bible: /Biblia|bíblic[oa]/, God: /Dios/, Settings: /Configuración/,
  United: /Estados Unidos|Reino Unido/, States: /Estados/, Kingdom: /Reino/, European: /Europeo/, Economic: /Económico/,
  Area: /Espacio/, Switzerland: /Suiza/, State: /Estado/, November: /noviembre/, Spanish: /español/,
  Scripture: /Escrituras/, Government: /Gobierno/,
};
// A capitalised word counts as a name when it sits mid-sentence, or when the English texts never
// use it in lower case (RevenueCat, Apple and Cloudflare often open a sentence). The few ordinary
// words that open a sentence and never recur in lower case are listed here.
const SENTENCE_OPENERS = new Set(["Everything", "Manage", "Nothing", "Using", "Questions", "Listening", "Effective", "Very"]);
const lowerWords = new Set(LEGAL.map((e) => readLegal(e.en.file)).join("\n").match(/\b\p{Ll}[\p{L}'-]*/gu));
const names = (raw) => {
  const t = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const mid = [...t.matchAll(/(?<=[\p{Ll},;(]\s|\(|\s&\s)\p{Lu}[\p{L}\d-]*/gu)].map((m) => m[0]);
  const rare = (t.match(/\p{Lu}[\p{L}\d-]*/gu) || []).filter((w) => !lowerWords.has(w.toLowerCase()) && !SENTENCE_OPENERS.has(w));
  return [...new Set([...mid, ...rare])];
};

test("every legal page on the site is built from the current legal/*.md text", () => {
  const pages = legalPages();
  assert.equal(pages.length, 6);
  for (const [file, html] of pages) assert.equal(readFileSync(new URL(file, pub), "utf8"), html, `${file} is stale: run node site/scripts/build-seed-pages.mjs`);
});

test("each Spanish page opens by saying the English version controls, and links it", () => {
  for (const { e, es } of docs) {
    assert.match(es.note, /prevalece la versión en inglés/, `${e.es.file}: no "English controls" line`);
    assert.deepEqual(links(es.note), [`${BASE}${e.en.path}`], `${e.es.file}: the note must link the English page`);
  }
});

test("the Spanish pages have the same sections and the same clauses as the English", () => {
  for (const { e, en, es } of docs) {
    assert.equal(es.sections.length, en.sections.length, `${e.es.file}: section count`);
    assert.deepEqual(clauses(es).map((c) => c.where.replace(/\(.*\)/, "")), clauses(en).map((c) => c.where.replace(/\(.*\)/, "")), `${e.es.file}: clause layout`);
  }
});

test("clause by clause: same numbers, same email addresses, same links", () => {
  let checked = 0;
  for (const { e, en, es } of docs) {
    const a = clauses(en), b = clauses(es);
    a.forEach((c, i) => {
      assert.deepEqual(numbers(b[i].text), numbers(c.text), `${e.es.file} ${c.where}: numbers differ`);
      assert.deepEqual(emails(b[i].text), emails(c.text), `${e.es.file} ${c.where}: email addresses differ`);
      assert.deepEqual(links(b[i].text), links(c.text, true), `${e.es.file} ${c.where}: links differ`);
      checked += numbers(c.text).length;
    });
  }
  assert.ok(checked > 40, `only ${checked} numbers were compared`);
});

test("clause by clause: every named company, product, place and law in the English is in the Spanish", () => {
  let checked = 0;
  for (const { e, en, es } of docs) {
    const a = clauses(en), b = clauses(es);
    a.forEach((c, i) => {
      for (const n of names(c.text)) {
        checked++;
        const ok = b[i].text.includes(n) || SPANISH[n]?.test(b[i].text);
        assert.ok(ok, `${e.es.file} ${c.where}: "${n}" is missing from the Spanish`);
      }
    });
  }
  assert.ok(checked > 60, `only ${checked} names were compared`);
});

test("the Spanish privacy policy names every AI provider on the chat ladder", () => {
  const es = readLegal(LEGAL.find((e) => e.key === "privacy").es.file);
  assert.ok(providers.length > 0);
  for (const p of providers) for (const n of p.disclosedAs.match(/\p{Lu}[\p{L}]*(?:\s\p{Lu}[\p{L}]*)*/gu)) assert.ok(es.includes(n), `"${n}" (${p.disclosedAs}) is not in legal/es/privacidad.md`);
});

test("the checks can fail: a changed number, a dropped name and a dropped clause are caught", () => {
  const { en, es } = docs.find((d) => d.e.key === "privacy");
  const i = clauses(en).findIndex((c) => /48 hours/.test(c.text));
  const bad = clauses(es)[i].text.replace("48 horas", "72 horas");
  assert.notDeepEqual(numbers(bad), numbers(clauses(en)[i].text));
  const j = clauses(en).findIndex((c) => /RevenueCat/.test(c.text));
  assert.ok(names(clauses(en)[j].text).includes("RevenueCat"));
  assert.ok(!clauses(es)[j].text.replace(/RevenueCat/g, "el proveedor").includes("RevenueCat"));
  assert.notDeepEqual(clauses({ ...es, sections: es.sections.slice(1) }).length, clauses(en).length);
});
