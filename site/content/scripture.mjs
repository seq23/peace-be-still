// Scripture for the website, pasted by code from the stored Bibles in content/bible/ (KJV in English,
// Reina-Valera 1909 in Spanish) through scripts/content/lib.mjs. Nobody types a verse into a page.
// Every quote carries data-ref and data-tr, so site/test/scripture.test.mjs can compare each one with
// the stored text. Refs use the file codes: "PSA 4:8", "MAT 11:28-30".
import { verses, label } from "../../scripts/content/lib.mjs";

const TR = { en: { code: "KJV", name: "KJV" }, es: { code: "RV1909", name: "RV 1909" } };
const tr = (lang) => TR[lang === "es" ? "es" : "en"];

// The stored text of a ref, verses joined by a space.
export function text(ref, lang = "en") {
  return verses(ref, tr(lang).code).map((x) => x.text).join(" ");
}
// "Psalm 4:8 · KJV" / "Salmos 4:8 · RV 1909"
export function cite(ref, lang = "en") {
  return `${label(ref, lang === "es" ? "es" : "en")} · ${tr(lang).name}`;
}
export const ref = (r, lang = "en") => label(r, lang === "es" ? "es" : "en");
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
