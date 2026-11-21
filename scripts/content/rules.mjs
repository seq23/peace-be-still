// The QUALITY.md code checks for the launch library (stories S01-S15 code part, Psalm Nights,
// Imagination Nights, Morning Word). Each check returns "pass", "note: ..." or "fail: ...".
// Only the text a person or model wrote is searched for banned words; stored scripture is
// checked for being stored scripture, word for word.
import { verses, label, words, pauses, sentences, fkGrade, fernandezHuerta, scriptureHits, verseLikeHits, passageText, TRANSLATION, parseRef } from "./lib.mjs";

export const GATE_VERSION = "library-1";

// JS \b is ASCII-only even with the u flag, so "años" and "demás" tripped \bos\b and \bdem\b in Spanish.
// Every list pattern's \b is a Unicode letter boundary instead.
const UB = "(?:(?<=[\\p{L}\\p{N}_])(?![\\p{L}\\p{N}_])|(?<![\\p{L}\\p{N}_])(?=[\\p{L}\\p{N}_]))";
const rx = (list) => new RegExp(`(?:${list.join("|").replaceAll("\\b", UB)})`, "iu");
// S14 + repo rules, every kind and both doors.
export const NEVER = rx([
  "black[\\s\\W_]*bible[\\s\\W_]*stor(?:y|ies)", "speak\\s+life", "\\burban\\b", "\\bmanifest\\w*", "\\bmanifestar\\w*",
  "\\byouversion\\b", "\\bhallow app\\b", "\\bglorify app\\b", "\\bpray\\.com\\b", "\\bheadspace\\b", "\\bcalm app\\b", "\\babide app\\b",
]);
// S06: mindset / New Age words never in the God's Word door.
export const MINDSET = rx([
  "\\bthe universe\\b", "\\bvibration\\w*", "\\benerg(?:y|ies)\\b", "law of (?:attraction|assumption)", "\\bneville\\b",
  "abundance mindset", "\\bkarma\\b", "\\bchakras?\\b", "\\bauras?\\b", "\\bcrystals?\\b", "\\bmantras?\\b", "higher self",
  "\\bthe source\\b", "\\balign\\w*", "\\battract\\w*", "\\bvisuali[sz]\\w*", "\\bmindset\\b", "\\bassumption\\b", "\\bsats\\b", "imagination nights",
  "\\bel universo\\b", "\\bvibraci\\w+", "\\benerg[íi]as?\\b", "ley de (?:la )?atracci[óo]n", "\\bcristales\\b",
]);
// S08: eye dialect and slang pastiche (never in any voice).
export const DIALECT = rx(["\\bdat\\b", "\\bdis\\b", "\\bdem\\b", "\\bdey\\b", "\\bgon'", "\\bfinna\\b", "\\bno cap\\b", "\\bslay\\b", "\\bfam\\b", "\\bgonna\\b", "\\bain't\\b", "\\blil\\b", "\\bchile\\b.*\\bchile\\b.*\\bchile\\b"]);
// S07 / sleep and health: no outcome promises in anything we wrote.
export const PROMISE = rx([
  "god will (?:heal|cure|fix|pay|bless you with|give you (?:money|a house|a husband|a wife))", "you will be healed", "\\bcures?\\b", "\\bguarantee\\w*",
  "breakthrough is coming", "debt[- ]free", "you will (?:fall asleep|sleep|be (?:healed|rich|protected|safe))", "\\binsomnia\\b",
  "will (?:protect|keep) you safe", "your money is coming", "\\bget rich\\b", "\\bmillionaire\\b",
  "dios (?:te )?(?:sanar[áa]|curar[áa])", "vas a (?:sanar|dormir|ser rico)", "\\bgarantiza\\w*", "\\binsomnio\\b", "\\bcurar\\w*",
  "te (?:dormir[áa]s|sanar[áa]s)", "tu dinero viene",
]);
// S05: theology red lines outside stored scripture.
export const REDLINE = rx([
  "god is telling you", "god told me to tell you", "curse of ham", "jesus was (?:black|white)", "\\byou are saved\\b", "\\byou(?:'re| are) (?:lost|going to hell|bound for hell)",
  "\\bi am the lord\\b", "\\bmy child, i\\b", "(?:rapture|end of the world|second coming)[^.]{0,40}\\b(?:20\\d\\d|this year|next year)",
  "dios te est[áa] diciendo", "\\best[áa]s salv[oa]\\b", "vas al infierno", "jes[úu]s era (?:negro|blanco)", "\\byo soy jehov[áa]\\b",
  "\\bsow (?:a|your) seed\\b", "\\bseed faith\\b", "siembra una semilla",
]);
// S04: words that send a story to a careful read (a note, never a block).
export const SPLIT = rx(["baptis\\w*", "\\btongues\\b", "predestin\\w*", "\\brapture\\b", "\\bsabbath\\b", "\\bcommunion\\b", "eternal security", "women preach\\w*", "bautism\\w*", "\\blenguas\\b", "\\bsábado\\b", "\\bpredestina\\w*"]);
// S12: Spain-only Spanish (dieciséis / veintiséis end in -éis but are numbers, not vosotros forms) and vosotros outside RV1909 blocks; English left in.
export const SPAIN = rx(["\\bvosotr[oa]s\\b", "\\bos\\b", "\\bsois\\b", "\\bhab[ée]is\\b", "\\b(?!(?:dieci|veinti)séis\\b)\\p{L}{2,}(?:áis|éis)\\b", "\\bvale[,.!]", "\\bcog(?:er|e|es|ió|ido)\\b", "\\bordenador\\w*", "\\bm[óo]vil\\b", "\\bvuestr[oa]s?\\b"]);
export const ENGLISH = rx(["\\bthe\\b", "\\band\\b", "\\bwith\\b", "\\byou\\b", "\\byour\\b", "\\bof\\b", "\\bthat\\b", "\\bnight\\b", "\\blord\\b"]);
// Mindset door (Imagination Nights): no God's Word cross-links, no scripture, no Neville without the disclaimer.
export const FAITH_LINK = rx(["hush harbor", "psalm nights", "mi refugio", "young faith", "\\bkjv\\b", "\\bscripture\\b", "\\bbible\\b", "\\bgod\\b", "\\bpsalms?\\b", "\\bprayer\\b", "\\bchurch\\b", "\\bjesus\\b", "\\bverse\\b", "king james",
  // Spanish (Imagination Nights in Spanish): the same door rule, so no verse of any translation (RV1909 or RVR1960) and no faith word gets in.
  "\\bdios\\b", "\\bbiblia\\b", "\\bb[íi]blic\\w*", "\\bescrituras?\\b", "\\bsalmos?\\b", "\\boraci[óo]n\\b", "\\brez(?:a|ar|o|amos)\\b", "\\biglesia\\b",
  "\\bjes[úu]s\\b", "\\bcristo\\b", "\\bvers[íi]culos?\\b", "\\bjehov[áa]\\b", "reina[- ]valera", "\\brvr?\\s?(?:19)?(?:09|60)\\b", "\\bamén\\b", "noches de salmos",
  "\\bel señor\\b", "mi paz (?:os|les|te)\\b", "\\bsalvador\\b"]);
// The characters never voiced: words of God (and of Jesus) are read by the narrator as quoted scripture.
// Narration markers that must never sit inside a character's voice.
export const NARRATION = {
  en: /\b(?:[Aa]nd|Then|But|So) (?:(?!hast\b|hath\b|have\b|has\b|had\b|thou\b|ye\b|we\b|I\b)[\w-]+ ){0,4}(?:said|saith|answered|spake)\b|\b(?:said|saith|spake|answered) (?:unto|to) (?:him|her|them|the)\b|\band (?:say|says) unto\b|\b(?:[Aa]nd) (?:they|he|she) (?:cried|came)\b|\bcould not answer\b/,
  es: /\b(?:dijo|dijeron|respondi[óo]|respondieron|habl[óo])(?!\p{L})[^:]{0,80}:/iu,
};
export const FIRST_PERSON = /\bmy (?:grand(?:mother|father|mama|daddy|ma|pa)|mama|mother|daddy|father|aunt|uncle|pastor|church|momma)\b|\bwhen I was (?:a child|little|young|a girl|a boy)\b|\bI remember\b|\bI (?:knew|grew up|used to)\b|\bmi (?:abuela|abuelo|mamá|madre|padre|tía|pastor)\b|\bcuando (?:yo )?era (?:niña|niño|pequeña|pequeño)\b|\b(?:yo )?recuerdo\b/i;
const CALLOUT = "(?:can I get an? (?:amen|witness)|somebody (?:ought to|say) (?:say )?amen|say amen|alguien diga amén|¿me dicen amén\\?)";
export const CALLOUT_G = new RegExp(CALLOUT, "gi");
export const CALLOUT_END = new RegExp(CALLOUT + "[?.!]*$", "i");
export const NEVER_VOICED = new Set(["god", "lord", "jehovah", "jesus", "christ", "holy-spirit", "spirit", "angel-of-the-lord"]);

// S10: sensitive passages force the content tags (and keep them off the family shelf).
const SENSITIVE = [["GEN", 19], ["GEN", 34], ["GEN", 38], ["JDG", 4], ["JDG", 5], ["JDG", 11], ["JDG", 19], ["JDG", 20], ["JDG", 21], ["2SA", 11], ["2SA", 13], ["SOL", 0], ["EZE", 16], ["EZE", 23], ["MAT", 2, 16], ["MAT", 27], ["MAR", 15], ["LUK", 23], ["JOH", 19]];

const pass = "pass";
const fail = (m) => `fail: ${m}`;
const note = (m) => `note: ${m}`;
const hit = (re, t) => { const m = String(t).match(re); return m ? m[0] : null; };
const listHits = (re, texts) => texts.map((t) => hit(re, t)).filter(Boolean);
export const isFail = (v) => String(v).startsWith("fail");

// One band check with the search-loop floor rule: inside = pass; within 25% = note; beyond = fail.
export function band(v, lo, hi, unit) {
  if (v >= lo && v <= hi) return pass;
  const slack = (hi - lo) * 0.25 + lo * 0.0;
  const lo2 = lo * 0.75, hi2 = hi * 1.25;
  void slack;
  return v >= lo2 && v <= hi2 ? note(`${Math.round(v * 10) / 10}${unit} outside ${lo}-${hi}${unit}`) : fail(`${Math.round(v * 10) / 10}${unit} outside ${lo}-${hi}${unit} by more than 25%`);
}

function commonText(kind, lang, written, door) {
  const c = {};
  const never = listHits(NEVER, written);
  c.never_words = never.length ? fail(`never-words: ${never.join(", ")}`) : pass;
  if (door === "gods-word") {
    const m = listHits(MINDSET, written);
    c.mindset_words = m.length ? fail(`mindset words in God's Word: ${m.join(", ")}`) : pass;
    const r = listHits(REDLINE, written);
    c.theology_redlines = r.length ? fail(`red line: ${r.join(", ")}`) : pass;
    const s = listHits(SPLIT, written);
    c.split_topics = s.length ? note(`split-topic words for the pastor read: ${s.join(", ")}`) : pass;
  } else {
    const f = listHits(FAITH_LINK, written);
    c.no_faith_links = f.length ? fail(`God's Word words in the Mindset door: ${f.join(", ")}`) : pass;
    const nev = written.some((t) => /neville/i.test(t)) && !written.some((t) => /not affiliated with neville goddard/i.test(t));
    c.neville = nev ? fail("Neville named without the not-affiliated line") : pass;
    // No scripture in any wording: a verse from a Bible we do not store (RVR1960, NIV) still reads as the stored one.
    const vl = written.flatMap((t) => verseLikeHits(t, TRANSLATION[lang]));
    c.no_verse_wording = vl.length ? fail(`reads as a Bible verse: ${vl[0]}`) : pass;
  }
  const p = listHits(PROMISE, written);
  c.no_promises = p.length ? fail(`outcome/health promise: ${p.join(", ")}`) : pass;
  const d = listHits(DIALECT, written);
  c.voice_dialect = d.length ? fail(`eye-dialect/slang: ${d.join(", ")}`) : pass;
  const quoted = written.flatMap((t) => [...String(t).matchAll(/[“"«]([^”"»]+)[”"»]/g)].map((m) => m[1])).filter((q) => words(q).length >= 6);
  c.no_quoted_runs = quoted.length ? fail(`quoted run of 6+ words outside a scripture block: "${quoted[0].slice(0, 60)}"`) : pass;
  const refs = written.map((t) => hit(/\b(?:[1-3] )?[A-ZÁÉÍÓÚ][a-záéíóú]+ \d+:\d+/u, t)).filter(Boolean);
  c.no_refs_in_text = refs.length ? fail(`verse reference inside written text: ${refs[0]}`) : pass;
  const tr = TRANSLATION[lang];
  const sh = written.flatMap((t) => scriptureHits(t, tr));
  c.no_typed_scripture = sh.length ? fail(`8+ words of stored scripture typed outside a scripture block: "${sh[0]}"`) : pass;
  if (lang === "es") {
    const sp = listHits(SPAIN, written);
    c.latin_american = sp.length ? fail(`Spain-only or vosotros form: ${sp.join(", ")}`) : pass;
    const en = listHits(ENGLISH, written);
    c.no_english = en.length ? fail(`English left in: ${en.join(", ")}`) : pass;
  }
  void kind;
  return c;
}

function scriptureBlock(b, lang) {
  const tr = TRANSLATION[lang];
  if (b.translation !== tr) return fail(`${b.ref} translation ${b.translation} is not ${tr}`);
  let stored;
  try { stored = verses(b.ref, tr); } catch (e) { return fail(e.message); }
  const want = stored.map((x) => x.text);
  const got = (b.verses || []).map((x) => x.text);
  if (want.length !== got.length || want.some((t, i) => t !== got[i])) return fail(`${b.ref} is not word for word the stored ${tr}`);
  if (b.label !== label(b.ref, lang)) return fail(`${b.ref} label`);
  return pass;
}

// ---------------------------------------------------------------- stories (S01-S15 code part)
// Every line on screen is the listener's answer: the same response both times, except the one call churches
// really turn around (COMMON.md: "God is good" / "All the time", both directions; Spanish the same).
const TURNS = new Set(["all the time|god is good", "god is good|all the time", "all the time|god is faithful", "todo el tiempo|dios es bueno", "dios es bueno|todo el tiempo"]);
const norm = (x) => String(x).toLowerCase().replace(/[’']/g, "'").replace(/[?.!¡¿]/g, "").trim();
function callAnswersOnly(blk) {
  const [a, b] = blk.pauses.map((p) => norm(p.screen));
  return a === b || TURNS.has(`${a}|${b}`);
}
export function checkStory(s) {
  const lang = s.lang, tr = TRANSLATION[lang];
  const ret = s.blocks.filter((b) => b.type === "retelling" || b.type === "call_response");
  const scr = s.blocks.filter((b) => b.type === "scripture");
  const written = [s.title, ...ret.map((b) => b.text)];
  const c = {};
  const bad = scr.map((b) => scriptureBlock(b, lang)).filter(isFail);
  c.S01_word_for_word = !scr.length ? fail("no scripture block") : bad.length ? bad[0] : pass;
  const shapeBad = s.blocks.find((b) => !["retelling", "scripture", "call_response"].includes(b.type) || (b.type !== "scripture" && !b.text) || (b.type === "scripture" && !b.ref));
  c.S02_scripture_apart = shapeBad ? fail("block is neither scripture (ref) nor retelling (text)") : ret.length < 3 ? fail("fewer than 3 retelling blocks") : pass;
  const t = commonText("story", lang, written, "gods-word");
  c.S05_redlines = t.theology_redlines;
  c.S04_split_topics = t.split_topics;
  c.S06_mindset = t.mindset_words;
  c.S07_promises = t.no_promises;
  c.S08_voice_code = t.voice_dialect;
  c.S14_never_words = t.never_words;
  c.S01_quoted_runs = t.no_quoted_runs;
  c.S01_typed_scripture = t.no_typed_scripture;
  c.S02_no_refs_in_retelling = t.no_refs_in_text;
  if (lang === "es") { c.S12_latin_american = t.latin_american; c.S12_no_english = t.no_english; }
  // S09 names: every voiced character's name is spelled as in the stored passage.
  const ptext = passageText(s.passage.refs, tr);
  const missing = (s.cast || []).filter((m) => m.gender !== "group" && !new RegExp(`(^|[^\\p{L}])${m.name}([^\\p{L}]|$)`, "u").test(ptext)).map((m) => m.name);
  c.S09_names = missing.length ? fail(`names not spelled as in the stored ${tr} passage: ${missing.join(", ")}`) : pass;
  // speakers: narrator or a cast id; God (and Jesus) never voiced as a character.
  const ids = new Set((s.cast || []).map((m) => m.id));
  const divine = (s.cast || []).filter((m) => NEVER_VOICED.has(m.id)).map((m) => m.id);
  const unknown = s.blocks.filter((b) => b.speaker !== "narrator" && !ids.has(b.speaker)).map((b) => b.speaker);
  const castBad = (s.cast || []).find((m) => !m.id || !m.name || !["child", "teen", "adult", "elder"].includes(m.age) || !["f", "m", "group"].includes(m.gender));
  c.speakers = divine.length ? fail(`never voiced as a character: ${divine.join(", ")}`) : unknown.length ? fail(`speaker not in cast: ${unknown.join(", ")}`) : castBad ? fail(`cast entry incomplete: ${JSON.stringify(castBad)}`) : pass;
  // Character-voiced segments: verbatim halves of the verse, and no narration inside the voice.
  const segBad = [];
  for (const b of scr) {
    if (!b.segments) { segBad.push(`${b.ref} has no segments`); continue; }
    for (const x of b.verses) {
      const parts = b.segments.filter((sg) => sg.v === x.v);
      if (parts.map((sg) => sg.text).join(" ").replace(/\s+/g, " ") !== x.text.replace(/\s+/g, " ")) segBad.push(`${b.ref}:${x.v} segments are not the verse word for word`);
      for (const sg of parts) if (sg.speaker !== "narrator" && NARRATION[lang].test(sg.text)) segBad.push(`${b.ref}:${x.v} narration in ${sg.speaker}'s voice: "${sg.text.slice(0, 50)}"`);
    }
  }
  c.voice_segments = segBad.length ? fail(segBad[0]) : pass;
  // S10 shelf and tags.
  const tagsOk = ["family", "young-faith", "adult"].includes(s.shelf) && ["none", "mild", "strong"].includes(s.content?.violence) && ["none", "implied"].includes(s.content?.sexual);
  const sens = s.passage.refs.some((r) => { const p = parseRef(r); return SENSITIVE.some(([b, ch, v]) => b === p.book && (ch === 0 || ch === p.ch) && (!v || (p.a <= v && v <= p.z))); });
  const shelfOk = s.shelf !== "family" || (s.content.violence !== "strong" && s.content.sexual === "none");
  c.S10_shelf = !tagsOk ? fail("shelf/content tags missing") : !shelfOk ? fail("family shelf with strong violence or sexual content") : sens && s.content.violence === "none" && s.content.sexual === "none" ? fail("sensitive passage tagged none/none") : pass;
  // S11 length and level.
  const n = s.words;
  const [lo, hi] = { family: [250, 450], "young-faith": [400, 700], adult: [500, 900] }[s.shelf] || [500, 900];
  const k = lang === "es" ? 1.15 : 1;
  c.S11_length = band(n, Math.round(lo * k), Math.round(hi * k), " words");
  const rt = ret.map((b) => b.text).join(" ");
  const ws = words(rt).length / (sentences(rt).length || 1);
  if (lang === "en") {
    c.S11_sentence_length = ws <= 18 ? pass : ws <= 22.5 ? note(`average sentence ${ws.toFixed(1)} words`) : fail(`average sentence ${ws.toFixed(1)} words`);
    const g = fkGrade(rt);
    c.S11_reading_level = g <= 8 ? (g < 4 ? note(`grade ${g.toFixed(1)}`) : pass) : g <= 10 ? note(`grade ${g.toFixed(1)}`) : fail(`grade ${g.toFixed(1)} above 10`);
  } else {
    const fh = fernandezHuerta(rt);
    c.S11_reading_level = fh >= 70 ? pass : fh >= 52.5 ? note(`Fernández-Huerta ${fh.toFixed(0)}`) : fail(`Fernández-Huerta ${fh.toFixed(0)}`);
  }
  // The narrator is a disclosed AI storyteller: no invented first-person life memories (risk R-PRF-02),
  // and at most one call-out per story, never as the last line.
  const fpm = listHits(FIRST_PERSON, written);
  c.no_invented_memories = fpm.length ? fail(`first-person memory: ${fpm.join(", ")}`) : pass;
  // Call and response (owner 18 Nov 2026): Hush Harbor and Mi Refugio carry exactly ONE "say it with me"
  // block (teach, 3 s pause with the response on screen, answer, 3 s pause, tie-back), after the first
  // verse and never last; the plain telling has none. No other call-outs in the retelling.
  const cr = s.blocks.map((b, i) => [b, i]).filter(([b]) => b.type === "call_response");
  const calls = s.blocks.filter((b) => b.type === "retelling").reduce((a, b) => a + (String(b.text).match(CALLOUT_G) || []).length, 0);
  const firstVerse = s.blocks.findIndex((b) => b.type === "scripture");
  if (s.telling === "plain") c.call_response = cr.length ? fail("the plain telling has no call and response") : calls ? fail("call-out in the plain telling") : pass;
  else {
    const [blk, i] = cr[0] || [];
    c.call_response = cr.length !== 1 ? fail(`${cr.length} call-and-response blocks (exactly one)`)
      : calls ? fail("a call-out outside the call-and-response block")
      : blk.pauses.length < 2 || blk.pauses.some((p) => p.seconds < 3 || !p.screen) ? fail("call and response needs two 3 s pauses with screen text")
      : !callAnswersOnly(blk) ? fail("the listener is asked to say the call back; only God is good / all the time turns around")
      : i === s.blocks.length - 1 ? fail("call and response is the last paragraph")
      : i < firstVerse ? fail("call and response comes before the first verse")
      : pass;
  }
  c.S13_ai_label = s.ai_label && scr.every((b) => b.translation === tr) ? pass : fail("AI label key or translation tag missing");
  return c;
}

// ---------------------------------------------------------------- Psalm Nights
export function checkPsalmNight(p) {
  const lang = p.lang;
  const fr = p.segments.filter((x) => x.part !== "passage");
  const ps = p.segments.filter((x) => x.part === "passage");
  const written = [p.title, ...fr.map((x) => x.text)];
  const c = {};
  const bad = ps.map((b) => scriptureBlock(b, lang)).filter(isFail);
  c.word_for_word = !ps.length ? fail("no passage") : bad.length ? bad[0] : pass;
  const plan = ["welcome", ...p.main.map(() => "passage"), "reflect", ...p.companions.map(() => "passage"), "reflect", ...p.main.map(() => "passage"), "rest"];
  c.plan = JSON.stringify(plan) === JSON.stringify(p.segments.map((x) => x.part)) ? pass : fail("segments are not welcome, main, reflect, companions, reflect, main, rest");
  const t = commonText("psalm-night", lang, written, "gods-word");
  Object.assign(c, t);
  c.speakers = p.segments.every((x) => x.speaker === "narrator") ? pass : fail("a Psalm Night is narrator only");
  // 13 min is a floor, not a band edge (21 Nov 2026: nights estimated at 13.6 min voiced at 12).
  c.length = p.est_seconds < 13 * 60 ? fail(`${(p.est_seconds / 60).toFixed(1)} min voiced is under the 13 min floor`) : band(p.est_seconds / 60, 13, 17, " min");
  c.ai_label = p.ai_label ? pass : fail("AI label key missing");
  return c;
}

// ---------------------------------------------------------------- Imagination Nights (Mindset door)
export function checkImaginationNight(n) {
  const written = [n.title, ...n.segments.map((x) => x.text)];
  const c = commonText("imagination-night", n.lang, written, "mindset");
  const order = n.segments.map((x) => x.part).join(",");
  c.plan = order === "settle,teaching,scene,close" ? pass : fail(`segments ${order} are not settle, teaching, scene, close`);
  c.speakers = n.segments.every((x) => x.speaker === "narrator") ? pass : fail("narrator only");
  c.teaching_length = band(words(n.segments.find((x) => x.part === "teaching")?.text || "").length / 1.0, 150, 300, " words");
  // 18 min is a floor, not a band edge (21 Nov 2026: nights estimated at 100 wpm voiced at 17 min).
  c.length = n.est_seconds < 18 * 60 ? fail(`${(n.est_seconds / 60).toFixed(1)} min voiced is under the 18 min floor`) : band(n.est_seconds / 60, 18, 22, " min");
  c.ai_label = n.ai_label ? pass : fail("AI label key missing");
  return c;
}

// ---------------------------------------------------------------- Morning Word
export function checkDeclaration(d, lang) {
  const written = [d.declaration];
  const c = commonText("declaration", lang, written, "gods-word");
  c.word_for_word = scriptureBlock(d, lang);
  c.length = band(d.est_seconds, 15, 25, " s");
  // Spanish: pronouns and possessives with a Unicode letter boundary (JS \b is ASCII-only, so "mí" never matched; "mis" and "conmigo" were missing).
  c.first_person = /\b(I|my|me|I'm|I will)\b/.test(d.declaration) || (lang === "es" && /(?<![\p{L}])(?:yo|mi|mis|me|mí|conmigo)(?![\p{L}])/iu.test(d.declaration)) ? pass : note("not in the first person");
  return c;
}
