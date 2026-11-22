// Every verse on the website equals the stored Bible (content/bible: KJV in English, Reina-Valera 1909
// in Spanish, 개역한글 1961 in Korean, the 1919 和合本 in Chinese), word for word. Quotes are marked by site/content/scripture.mjs with data-ref/data-tr;
// a verse block without a reference is a typed verse and fails.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { verses, bible, joinVerses } from "../../scripts/content/lib.mjs";
const bibleLines = (tr) => bible(tr).entries();

const pub = new URL("../public/", import.meta.url).pathname;
const stored = (ref, tr) => joinVerses(verses(ref, tr).map((x) => x.text), tr);
const inner = (html) => html.replace(/<[^>]+>/g, "").trim();

export function checkPage(name, s) {
  const bad = [];
  let n = 0;
  for (const m of s.matchAll(/<blockquote class="verse"([^>]*)><p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const ref = m[1].match(/data-ref="([^"]+)"/)?.[1], tr = m[1].match(/data-tr="([^"]+)"/)?.[1];
    if (!ref || !tr) { bad.push(`${name}: a verse block with no stored reference (typed verse?)`); continue; }
    n++;
    if (inner(m[2]) !== stored(ref, tr)) bad.push(`${name}: ${ref} (${tr}) differs from the stored text`);
  }
  for (const m of s.matchAll(/<(q|li)\b([^>]*data-ref="([^"]+)"[^>]*data-tr="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g)) {
    n++;
    const want = stored(m[3], m[4]), got = inner(m[5]);
    const ok = /data-part="1"/.test(m[2]) ? want.includes(got) && got.length > 0 : got === want;
    if (!ok) bad.push(`${name}: ${m[3]} (${m[4]}) differs from the stored text`);
  }
  return { n, bad };
}

test("a planted wrong or typed verse is caught", () => {
  const typed = checkPage("t", '<blockquote class="verse"><p>The Lord is my shepherd.</p></blockquote>');
  assert.equal(typed.bad.length, 1);
  const wrong = checkPage("w", '<q class="v" data-ref="PSA 4:8" data-tr="KJV">I will lay me down in peace.</q><q class="v" data-ref="PSA 4:8" data-tr="KJV" data-part="1">sleep in peace</q>');
  assert.equal(wrong.bad.length, 2);
  const right = checkPage("r", '<q class="v" data-ref="PSA 4:8" data-tr="RV1909" data-part="1">En paz me acostaré</q>');
  assert.deepEqual(right.bad, []);
  // A changed 개역한글 verse is caught like any other.
  const ko = checkPage("k", '<blockquote class="verse" data-ref="PSA 4:8" data-tr="KRV"><p>내가 평안히 눕고 자기도 하리니</p><cite>시편 4:8 · 개역한글</cite></blockquote>');
  assert.equal(ko.n, 1);
  assert.equal(ko.bad.length, 1);
});

// Korean pages (owner ruling 21 Nov 2026): verses are 개역한글 only, except an English KJV verse set inside
// a lang="en" block for a bilingual family; every Korean page carries the 개역한글 credit line.
export function koreanIssues(name, s) {
  const bad = [];
  const outsideEn = s.replace(/<div lang="en">[\s\S]*?<\/div>/g, "");
  for (const m of outsideEn.matchAll(/data-tr="([^"]+)"/g)) if (m[1] !== "KRV") bad.push(`${name}: a ${m[1]} verse outside a lang="en" block`);
  if (!s.includes("개역한글판 (대한성서공회 번역, 1961)")) bad.push(`${name}: no 개역한글 credit line`);
  return bad;
}

// Read from the Korean Bible Society's own reader (bskorea.or.kr, version=HAN) on 21 Nov 2026: the
// verses the review found changed in the Wikisource copy. The store must be the publisher's words.
const KBS_FIXTURE = {
  "PSA 46:5": "하나님이 그 성중에 거하시매 성이 요동치 아니할 것이라 새벽에 하나님이 도우시리로다",
  "PSA 130:6": "파숫군이 아침을 기다림보다 내 영혼이 주를 더 기다리나니 참으로 파숫군의 아침을 기다림보다 더하도다",
  "MAR 1:4": "세례 요한이 이르러 광야에서 죄 사함을 받게 하는 회개의 세례를 전파하니",
  "JER 33:1": "예레미야가 아직 시위대 뜰에 갇혔을 때에 여호와의 말씀이 그에게 다시 임하니라 가라사대",
  "LAM 3:32": "저가 비록 근심케 하시나 그 풍부한 자비대로 긍휼히 여기실 것임이라",
  "PSA 72:20": "이새의 아들 다윗의 기도가 필하다",
  "MAT 18:20": "두 세 사람이 내 이름으로 모인 곳에는 나도 그들 중에 있느니라",
  "GEN 11:9": "그러므로 그 이름을 바벨이라 하니 이는 여호와께서 거기서 온 땅의 언어를 혼잡케 하셨음이라 여호와께서 거기서 그들을 온 지면에 흩으셨더라",
  "PSA 46:10": "이르시기를 너희는 가만히 있어 내가 하나님 됨을 알찌어다 내가 열방과 세계 중에서 높임을 받으리라 하시도다",
};

test("the stored 개역한글 is the Korean Bible Society's text, word for word", () => {
  for (const [ref, text] of Object.entries(KBS_FIXTURE)) assert.equal(verses(ref, "KRV")[0].text, text, ref);
  // The reader's section headings ("셈의 후예(대상 1:24-27)") are not verse text.
  const withHeading = [...bibleLines("KRV")].filter(([, t]) => /\([가-힣]+ \d+:\d+(?:-\d+)?\)$/.test(t));
  assert.deepEqual(withHeading.slice(0, 5), []);
  // 개역한글 prints some verse pairs as one ("12-13"): stored once under the first number, never merged into the verse before.
  assert.ok(verses("1CH 16:12", "KRV")[0].text.startsWith("그 종 이스라엘의 후손"));
  assert.equal(verses("1CH 16:11", "KRV")[0].text, "여호와와 그 능력을 구할찌어다 그 얼굴을 항상 구할찌어다");
});

test("a Korean page quoting KJV, or without the credit line, is caught", () => {
  assert.equal(koreanIssues("k", '<q class="v" data-ref="PSA 4:8" data-tr="KJV">x</q> 개역한글판 (대한성서공회 번역, 1961)').length, 1);
  assert.equal(koreanIssues("k", '<q class="v" data-ref="PSA 4:8" data-tr="KRV">x</q>').length, 1);
  assert.deepEqual(koreanIssues("k", '<div lang="en"><q data-tr="KJV">x</q></div><q data-tr="KRV">y</q> 개역한글판 (대한성서공회 번역, 1961)'), []);
});

test("every built Korean page quotes 개역한글 and credits it", () => {
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) files.push(p); } })(join(pub, "ko"));
  assert.ok(files.length >= 8, `only ${files.length} Korean pages`);
  assert.deepEqual(files.flatMap((f) => koreanIssues(f.slice(pub.length), readFileSync(f, "utf8"))), []);
});

test("every verse on every built page equals the stored KJV / RV1909 / 개역한글 text", () => {
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) files.push(p); } })(pub);
  let total = 0;
  const bad = [];
  for (const f of files) { const r = checkPage(f.slice(pub.length), readFileSync(f, "utf8")); total += r.n; bad.push(...r.bad); }
  assert.deepEqual(bad, []);
  assert.ok(total >= 300, `only ${total} verses checked; the pages should carry far more`);
});

// Chinese pages (owner's plan, 21 Nov 2026): verses are the 1919 和合本 in Simplified (CUVS) only, except an
// English KJV verse inside a lang="en" block; every Chinese page carries the 和合本 credit line; and the page
// is in one script: no Traditional-only character outside a lang="en" block.
const SCRIPT = JSON.parse(readFileSync(new URL("../../content/bible/zh_script.json", import.meta.url), "utf8"));
const TRAD_ONLY = new Set(SCRIPT.tradOnly);
const CREDIT = "和合本（1919年版，公有领域）";
export function chineseIssues(name, s) {
  const bad = [];
  const outsideEn = s.replace(/<div lang="en">[\s\S]*?<\/div>/g, "");
  for (const m of outsideEn.matchAll(/data-tr="([^"]+)"/g)) if (m[1] !== "CUVS") bad.push(`${name}: a ${m[1]} verse outside a lang="en" block`);
  if (!s.includes(CREDIT)) bad.push(`${name}: no 和合本 credit line`);
  const trad = [...new Set([...outsideEn].filter((ch) => TRAD_ONLY.has(ch)))];
  if (trad.length) bad.push(`${name}: Traditional-only characters on a Simplified page: ${trad.join("")}`);
  return bad;
}

// The second, independent 1919 copy: FHL 官話和合本 (bible.fhl.net/json/qb.php?version=cumv&gb=0), read
// 22 Nov 2026, as served. It is the 上帝 edition with its own headings, its own marks for added words
// "( …)" and its own spelling of a few characters, so both sides are compared on their words alone:
// tags and headings out, 上帝 and "　神" both as 神, 呌 as 叫, punctuation and spaces out.
const FHL_FIXTURE = {
  "PSA 4:8": "我必安然躺下睡覺、因爲獨有你耶和華使我安然居住。",
  "PSA 127:2": "你們清晨早起、夜晚安歇、喫勞碌得來的飯、本是枉然．惟有耶和華所親愛的、必呌他安然睡覺。",
  "PRO 3:24": "你躺下、必不懼怕．你躺臥、睡得香甜。",
  "MAT 11:28": "凡勞苦擔重擔的人、可以到我這裏來、我就使你們得安息。",
  "PHI 4:7": "上帝所賜出人意外的平安、必在基督耶穌裏、保守你們的心懷意念。",
  "ISA 26:3": "堅心倚賴( 你的)、你必保守他十分平安、因爲他倚靠你。",
  "JOH 14:27": "我留下平安給你們、我將我的平安賜給你們．我所賜的、不像世人所賜的．你們心裏不要憂愁、也不要膽怯。",
  "1PE 5:7": "<h2> 須將憂慮卸給上帝\n</h2> 你們要將一切的憂慮卸給上帝、因爲他顧念你們。",
  "MAR 4:39": "耶穌醒了．斥責風、向海說、住了罷、靜了罷．風就止住、大大的平靜了。",
  "LAM 3:23": "每早晨這都是新的．你的誠實、極其廣大。",
  "PSA 23:1": "<b><u>大衞</u>的詩。</b><br/><h2>耶和華爲牧者</h2> 耶和華是我的牧者我必不至缺乏。",
  // FHL also prints GEN 24:29-30 as one verse under 29 (its verse 30 is an empty marker).
  "GEN 24:29": "<u>利百加</u>有一個哥哥、名呌<u>拉班</u>、看見金環、又看見金鐲在他妹子的手上、並聽見他妹子<u>利百加</u>的話、說、那人對我如此如此說、<u>拉班</u>就跑出來往井旁去、到那人跟前、見他仍站在駱駝旁邊的井旁那裏．",
};
const wordsOnly = (t) => t.replace(/<h2>[\s\S]*?<\/h2>/g, "").replace(/<[^>]+>/g, "").replace(/上帝/g, "神").replace(/呌/g, "叫")
  .replace(/[\s　、．。，；：「」『』？！()（）]/g, "");

test("the stored 和合本 has the 1919 words, checked against a second, independent 1919 copy", () => {
  assert.ok(Object.keys(FHL_FIXTURE).length >= 9);
  for (const [ref, text] of Object.entries(FHL_FIXTURE)) assert.equal(wordsOnly(verses(ref, "CUV")[0].text), wordsOnly(text), ref);
  // And the comparison itself is not blind: one changed character fails it.
  assert.notEqual(wordsOnly("我必安然躺下睡覺"), wordsOnly("我必安然躺下睡着"));
  // The 1919 punctuation (、．) and the full-width space of the 神 edition are kept, not modernised.
  assert.equal(verses("JOH 3:16", "CUV")[0].text, "　神愛世人、甚至將他的獨生子賜給他們、叫一切信他的、不至滅亡、反得永生。");
  // Verses printed as one are stored once, under the first number, never merged into the verse before.
  assert.throws(() => verses("GEN 24:30", "CUV"), /REF_NOT_IN_CUV/);
  assert.equal(verses("GEN 24:28", "CUV")[0].text, "女子跑回去、照着這些話告訴他母親和他家裏的人。");
});

// No Traditional page is built yet, so the reverse check (no Simplified-only character on a Traditional
// page) has nothing to read; the Traditional store is the 1919 source as printed, variant glyphs included.
test("the Simplified store is all Simplified, verse for verse with the Traditional", () => {
  assert.ok(TRAD_ONLY.size > 2000, "the script table is empty");
  const t = bible("CUV"), s = bible("CUVS");
  assert.deepEqual([...t.keys()], [...s.keys()]);
  const tradInS = [...new Set([...[...s.values()].join("")].filter((ch) => TRAD_ONLY.has(ch)))];
  assert.deepEqual(tradInS, [], "Traditional-only characters in the Simplified store");
  assert.equal(verses("PSA 4:8", "CUVS")[0].text, "我必安然躺下睡觉、因为独有你耶和华使我安然居住。");
  assert.ok(!readdirSync(pub).includes("zh-hant"), "a Traditional section exists: add the reverse script check");
});

test("a Chinese page quoting KJV outside an English block, without the credit, or in Traditional is caught", () => {
  const ok = `<q data-tr="CUVS">我必安然躺下睡觉</q><div lang="en"><q data-tr="KJV">x</q></div> ${CREDIT}`;
  assert.deepEqual(chineseIssues("z", ok), []);
  assert.equal(chineseIssues("z", `<q data-tr="KJV">x</q> ${CREDIT}`).length, 1);
  assert.equal(chineseIssues("z", `<q data-tr="CUVS">x</q>`).length, 1);
  assert.equal(chineseIssues("z", `<p>睡前禱告</p> ${CREDIT}`).length, 1);
});

test("every built Chinese page quotes the 1919 和合本 in Simplified and credits it", () => {
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) files.push(p); } })(join(pub, "zh"));
  assert.ok(files.length >= 7, `only ${files.length} Chinese pages`);
  assert.deepEqual(files.flatMap((f) => chineseIssues(f.slice(pub.length), readFileSync(f, "utf8"))), []);
  const verseCount = files.reduce((n, f) => n + checkPage(f, readFileSync(f, "utf8")).n, 0);
  assert.ok(verseCount >= 30, `only ${verseCount} verses on the Chinese pages`);
});

test("the 和合本 importer keeps the printed words and nothing else", async () => {
  const { parseBook, bookLines } = await import("../../scripts/content/import-cuv.mjs");
  const wt = `==第一章==
{{verse|1|1}}{{-|大衞的詩。}}耶和華是我的{{udots|牧者}}{{*|或作{{!|𤘘|牛口}}}}．
{{verse|1|2}}
{{verse|1|3}}從耶西的本{{*|原文作{{!|𣎴|木下}}}}必發、[[#1a|〡]]　神同在。
:{{Anchor|1a}}<sup>〡</sup>[[../詩篇#2:4|詩二　〤]]
{{gototop}}`;
  const { lines, joined } = bookLines("PSA", parseBook(wt, "t"));
  assert.deepEqual(lines, ["PSA 1:1 大衞的詩。耶和華是我的牧者．", "PSA 1:2 從耶西的本必發、　神同在。"]);
  assert.deepEqual(joined, ["PSA 1:2-3"]);
  // Leftover markup is a stop, never stored.
  assert.throws(() => bookLines("PSA", parseBook("{{verse|1|1}}文字{{unknown|x}}", "t")), /CUV_TEMPLATE/);
});
