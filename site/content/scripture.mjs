// Scripture for the website, pasted by code from the stored Bibles in content/bible/ (KJV in English,
// Reina-Valera 1909 in Spanish) through scripts/content/lib.mjs. Nobody types a verse into a page.
// Every quote carries data-ref and data-tr, so site/test/scripture.test.mjs can compare each one with
// the stored text. Refs use the file codes: "PSA 4:8", "MAT 11:28-30".
import { verses, label, joinVerses } from "../../scripts/content/lib.mjs";

// Korean pages ("ko") quote 개역한글판 (대한성서공회 번역, 1961), stored word for word in
// content/bible/krv_vpl.txt.gz (scripts/content/import-krv.mjs; the Korean Bible Society lists its term as
// expired on 31 Dec 2011). Citations read "시편 57:8 · 개역한글". 개역개정 and 새번역 are never used.
// Chinese pages ("zh-Hans") quote the 1919 和合本 (神 edition) in Simplified, converted by OpenCC from the
// 1919 text and stored in content/bible/cuvs_vpl.txt.gz (scripts/content/import-cuv.mjs). Citations read
// "诗篇 4:8 · 和合本". Never the 1988 新标点和合本 or the 和合本修订版 (both administered by the Hong Kong Bible Society).
const TR = { en: { code: "KJV", name: "KJV" }, es: { code: "RV1909", name: "RV 1909" }, ko: { code: "KRV", name: "개역한글" }, "zh-Hans": { code: "CUVS", name: "和合本" } };
const tr = (lang) => TR[TR[lang] ? lang : "en"];

// Standard Korean Protestant book names, by file code (only the name, never verse text).
export const BOOK_KO = {
  GEN: "창세기", EXO: "출애굽기", LEV: "레위기", NUM: "민수기", DEU: "신명기", JOS: "여호수아", JDG: "사사기", RUT: "룻기",
  "1SA": "사무엘상", "2SA": "사무엘하", "1KI": "열왕기상", "2KI": "열왕기하", "1CH": "역대상", "2CH": "역대하", EZR: "에스라",
  NEH: "느헤미야", EST: "에스더", JOB: "욥기", PSA: "시편", PRO: "잠언", ECC: "전도서", SOL: "아가", ISA: "이사야", JER: "예레미야",
  LAM: "예레미야애가", EZE: "에스겔", DAN: "다니엘", HOS: "호세아", JOE: "요엘", AMO: "아모스", OBA: "오바댜", JON: "요나", MIC: "미가",
  NAH: "나훔", HAB: "하박국", ZEP: "스바냐", HAG: "학개", ZEC: "스가랴", MAL: "말라기", MAT: "마태복음", MAR: "마가복음", LUK: "누가복음",
  JOH: "요한복음", ACT: "사도행전", ROM: "로마서", "1CO": "고린도전서", "2CO": "고린도후서", GAL: "갈라디아서", EPH: "에베소서",
  PHI: "빌립보서", COL: "골로새서", "1TH": "데살로니가전서", "2TH": "데살로니가후서", "1TI": "디모데전서", "2TI": "디모데후서", TIT: "디도서",
  PHM: "빌레몬서", HEB: "히브리서", JAM: "야고보서", "1PE": "베드로전서", "2PE": "베드로후서", "1JO": "요한일서", "2JO": "요한이서",
  "3JO": "요한삼서", JUD: "유다서", REV: "요한계시록",
};

// Standard Chinese Protestant (和合本) book names in Simplified, by file code.
export const BOOK_ZH = {
  GEN: "创世记", EXO: "出埃及记", LEV: "利未记", NUM: "民数记", DEU: "申命记", JOS: "约书亚记", JDG: "士师记", RUT: "路得记",
  "1SA": "撒母耳记上", "2SA": "撒母耳记下", "1KI": "列王纪上", "2KI": "列王纪下", "1CH": "历代志上", "2CH": "历代志下",
  EZR: "以斯拉记", NEH: "尼希米记", EST: "以斯帖记", JOB: "约伯记", PSA: "诗篇", PRO: "箴言", ECC: "传道书", SOL: "雅歌",
  ISA: "以赛亚书", JER: "耶利米书", LAM: "耶利米哀歌", EZE: "以西结书", DAN: "但以理书", HOS: "何西阿书", JOE: "约珥书",
  AMO: "阿摩司书", OBA: "俄巴底亚书", JON: "约拿书", MIC: "弥迦书", NAH: "那鸿书", HAB: "哈巴谷书", ZEP: "西番雅书",
  HAG: "哈该书", ZEC: "撒迦利亚书", MAL: "玛拉基书", MAT: "马太福音", MAR: "马可福音", LUK: "路加福音", JOH: "约翰福音",
  ACT: "使徒行传", ROM: "罗马书", "1CO": "哥林多前书", "2CO": "哥林多后书", GAL: "加拉太书", EPH: "以弗所书", PHI: "腓立比书",
  COL: "歌罗西书", "1TH": "帖撒罗尼迦前书", "2TH": "帖撒罗尼迦后书", "1TI": "提摩太前书", "2TI": "提摩太后书", TIT: "提多书",
  PHM: "腓利门书", HEB: "希伯来书", JAM: "雅各书", "1PE": "彼得前书", "2PE": "彼得后书", "1JO": "约翰一书", "2JO": "约翰二书",
  "3JO": "约翰三书", JUD: "犹大书", REV: "启示录",
};
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
