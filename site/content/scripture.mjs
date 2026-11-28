// Scripture for the website, pasted by code from the stored Bibles in content/bible/ (KJV in English,
// Reina-Valera 1909 in Spanish) through scripts/content/lib.mjs. Nobody types a verse into a page.
// Every quote carries data-ref and data-tr, so site/test/scripture.test.mjs can compare each one with
// the stored text. Refs use the file codes: "PSA 4:8", "MAT 11:28-30".
import { readFileSync } from "node:fs";
import { verses, label, joinVerses } from "../../scripts/content/lib.mjs";

// Korean pages ("ko") quote 개역한글판 (대한성서공회 번역, 1961), stored word for word in
// content/bible/krv_vpl.txt.gz (scripts/content/import-krv.mjs; the Korean Bible Society lists its term as
// expired on 31 Dec 2011). Citations read "시편 57:8 · 개역한글". 개역개정 and 새번역 are never used.
// Chinese pages ("zh-Hans") quote the 1919 和合本 (神 edition) in Simplified, converted by OpenCC from the
// 1919 text and stored in content/bible/cuvs_vpl.txt.gz (scripts/content/import-cuv.mjs). Citations read
// "诗篇 4:8 · 和合本". Never the 1988 新标点和合本 or the 和合本修订版 (both administered by the Hong Kong Bible Society).
const TR = { en: { code: "KJV", name: "KJV" }, es: { code: "RV1909", name: "RV 1909" }, ko: { code: "KRV", name: "개역한글" }, "zh-Hans": { code: "CUVS", name: "和合本" } };
const tr = (lang) => TR[TR[lang] ? lang : "en"];

// Standard Korean and Chinese (和合本, Simplified) Protestant book names, by file code (only the name, never
// verse text). One list for the site and the app: content/bible/books.json.
const BOOKS = JSON.parse(readFileSync(new URL("../../content/bible/books.json", import.meta.url), "utf8"));
export const BOOK_KO = Object.fromEntries(BOOKS.map((b) => [b.code, b.ko]));
export const BOOK_ZH = Object.fromEntries(BOOKS.map((b) => [b.code, b["zh-Hans"]]));
const NAMES = { ko: BOOK_KO, "zh-Hans": BOOK_ZH };

// The stored text of a ref, verses joined by a space.
export function text(ref, lang = "en") {
  return joinVerses(verses(ref, tr(lang).code).map((x) => x.text), tr(lang).code);
}
// "Psalm 4:8" / "Salmos 4:8" / "시편 4:8" / "诗篇 4:8"
export const ref = (r, lang = "en") => (NAMES[lang] ? label(r, "en").replace(/^.+? (?=\d+:)/, `${NAMES[lang][r.split(" ")[0]]} `) : label(r, lang === "es" ? "es" : "en"));
// "Psalm 4:8 · KJV" / "Salmos 4:8 · RV 1909" / "시편 4:8 · KJV"
export function cite(r, lang = "en") {
  return `${ref(r, lang)} · ${tr(lang).name}`;
}
// A block quote with its reference.
export function V(r, lang = "en") {
  return `<blockquote class="verse" data-ref="${r}" data-tr="${tr(lang).code}"><p>${text(r, lang)}</p><cite>${cite(r, lang)}</cite></blockquote>`;
}
// An inline quote (the browser adds the quotation marks).
export function Q(r, lang = "en") {
  return `<q class="v" data-ref="${r}" data-tr="${tr(lang).code}">${text(r, lang)}</q>`;
}
// A whole passage, one numbered line per verse.
export function P(r, lang = "en") {
  const vs = verses(r, tr(lang).code);
  const [book, cv] = r.split(" ");
  const ch = cv.split(":")[0];
  return `<ol class="passage" start="${vs[0].v}">${vs.map((x) => `<li data-ref="${book} ${ch}:${x.v}" data-tr="${tr(lang).code}">${x.text}</li>`).join("")}</ol>\n<p class="muted">${cite(r, lang)}</p>`;
}
// A few words from a verse, inline. The build stops if the words are not in the stored text.
export function F(r, phrase, lang = "en") {
  const t = text(r, lang);
  if (!t.includes(phrase)) throw new Error(`NAMED STOP [PHRASE_NOT_IN_VERSE] "${phrase}" is not in ${r} (${tr(lang).code})`);
  return `<q class="v" data-ref="${r}" data-tr="${tr(lang).code}" data-part="1">${phrase}</q>`;
}
