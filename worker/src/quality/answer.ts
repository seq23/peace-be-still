// Every model reply passes here before anyone sees it (QUALITY C01, C05-C07, C11-C16).
// Code handles structure and the hard floors; a free-model judge reads meaning for the
// C06/C07 red lines afterwards (judge.ts). A problem means one regeneration with the
// objection, then the fixed fallback reply. Nothing here keeps or logs the text.
import { banned, bookCode, fold, parseReference, type Language, type Translation } from '../shared';
import { faithContentIssues } from '../../../app/src/model';
import { chapterVerses, lookup, type Scripture } from '../scripture';
import type { Reference } from '../shared';

export type Draft = { text: string; references: string[] };
// userText is the newest message; afterCrisis says an earlier message in this chat was answered with the crisis lines.
// lang is the prompt's language (English or Spanish); shown is the language she reads (Korean or Chinese answers come
// from the English prompt); line is the crisis line for her region that an answer after a crisis must name.
export type GateContext = { db: D1Database; lang: 'en' | 'es'; shown?: Language; line?: string; translation: Translation; teen: boolean; door: 'faith' | 'mindset'; userText: string; afterCrisis?: boolean };
export type GateResult =
  | { ok: true; text: string; scripture: Scripture[]; notes: string[] }
  | { ok: false; problems: string[] };

/** Lower case, accents and apostrophes gone, punctuation to spaces; "$" and digits kept. */
export function norm(text: string): string {
  return ` ${text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[‘’'`´]/g, '').replace(/[^\p{L}\p{N}$]+/gu, ' ').trim()} `;
}

const ARCHAIC = new Set(['thee', 'thou', 'thy', 'thine', 'hath', 'hast', 'saith', 'unto', 'shalt', 'doth', 'ye', 'verily', 'cometh', 'giveth', 'wilt', 'art']);
const EN_COMMON = new Set(['the', 'and', 'you', 'your', 'is', 'are', 'was', 'were', 'with', 'for', 'that', 'this', 'will', 'of', 'to', 'it', 'be', 'have', 'has', 'not', 'but', 'what', 'when', 'who', 'god', 'lord', 'pray', 'prayer', 'love', 'can', 'my', 'i', 'we', 'they', 'she', 'him', 'her', 'our', 'from', 'about', 'just', 'so', 'if', 'or', 'at', 'by', 'on', 'in', 'an', 'all', 'do', 'does', 'know', 'here', 'there', 'how', 'why', 'because', 'feel', 'today', 'tonight', 'night', 'heart', 'peace', 'hope', 'verse', 'bible', 'always', 'never', 'would', 'could', 'should', 'yes']);

type Rule = [problem: string, re: RegExp, opts?: { negatable?: boolean; teenOnly?: boolean; lang?: 'en' | 'es' }];
const NEG = /(?:dont|do not|never|not|no|without|before)\s+(?:\w+\s+){0,3}$/;
const RULES: Rule[] = [
  // C06 theology red lines
  ['first_person_divine', / i am (?:the lord|your god|god|jesus|the alpha|the good shepherd|your father) | i the lord | my (?:child|daughter|son|beloved|precious one) (?:\w+ ){0,6}i (?:have|will|am|love|see|know|never|hear) | i will never leave you | i have (?:called|chosen|redeemed) you | yo soy (?:el senor|tu dios|jehova|jesus|dios|tu padre) | (?:hija|hijo) mia? (?:\w+ ){0,6}yo /],
  ['god_told_me', / (?:god|the lord|jesus|the spirit|holy spirit) (?:told|showed|revealed to|is telling|wants me to tell|asked me to tell) (?:me|you) | i (?:have|ve got) a (?:word|prophecy|message) (?:from god|from the lord|for you) | dios me (?:dijo|mostro|revelo|pidio) | tengo (?:una palabra|un mensaje) de dios /],
  ['prophecy', / (?:god|the lord|jesus) (?:will|is going to|gonna) (?:give|bless|heal|cure|send|bring|restore|provide|make|open|double|grant|answer) you | your (?:blessing|breakthrough|miracle|husband|wife|spouse|money|healing|house|promotion) is (?:coming|on its way|on the way|near) | dios te (?:dara|va a dar|sanara|va a sanar|bendecira con|enviara|traera) /],
  ['salvation_claim', / you (?:are|re|will be|will go|are going|re going|will end up) (?:saved|lost|damned|going to hell|to hell|in hell|headed to hell) | (?:going|go|goes|headed|bound|send you) to hell | you (?:are|re) not saved | (?:he|she|they|your \w+) (?:is|are) (?:saved|lost|damned|in hell) | (?:iras|ira|van|vas|iran) al infierno | (?:eres|estas) (?:salva|salvo|perdida|perdido|condenada|condenado) /],
  ['end_times_date', / (?:rapture|second coming|return of (?:jesus|christ)|jesus (?:will )?(?:return|come back|comes back)\w*|christ (?:will )?return\w*|end of the world|end times|judgment day|arrebatamiento|segunda venida|fin del mundo|regreso de (?:jesus|cristo)|(?:jesus|cristo) (?:volvera|regresara|viene))(?: \w+){0,12} (?:(?:19|20)\d\d|this (?:year|month|week)|next (?:year|month)|este ano|el proximo ano|este mes) | (?:19|20)\d\d(?: \w+){0,8} (?:rapture|second coming|end of the world|arrebatamiento|fin del mundo) /],
  ['prosperity', / (?:sow|plant|give|send|siembra|sembrar|da|dar)s? (?:a |your |that |this |una |tu )?(?:\$ ?\d[\d ]*|\d+ (?:dollar|dolar)\w* )?(?:seed|semilla) | seed (?:faith|offering|money|of faith) | semilla de fe | give (?:to|and) (?:be blessed|get blessed|receive) | (?:tithe|tithing|giving|offering) (?:unlocks|brings|releases|opens|guarantees) | pacto de (?:prosperidad|siembra) /],
  ['money_ask', / (?:send|give|sow|donate|pay|offer|send in|enviar|envia|da|dona)\w* (?:\w+ ){0,3}\$ ?\d | (?:send|give|donate) (?:money|an offering|your tithe|dinero|una ofrenda) /],
  // C07 promises and medicine
  ['outcome_promise', / god (?:will|is going to|gonna) (?:heal|cure|fix|pay|provide the money|bring you a|give you a (?:husband|wife|house|job)) | you will be (?:healed|cured|rich|wealthy|debt free|blessed with) | (?:make|making) you (?:rich|wealthy) | (?:double|triple) your (?:income|money|salary|pay) | your (?:money|wealth|financial breakthrough|debt freedom) is coming | (?:debt|debts) (?:will be|is|are) (?:gone|cancelled|canceled|paid off|wiped) | dios te (?:sanara|curara|hara ric\w+|dara dinero) | te (?:hara|haran) ric[oa] | seras (?:sanada|sanado|curada|curado|rica|rico) /],
  ['stop_medicine', / (?:stop|quit|skip|drop|come off|get off|throw away|ditch) (?:taking )?(?:your |the |those |all )?(?:meds|medicine|medication|medications|pills|antidepressants|therapy|therapist|doctor|counseling|counselor|treatment) | (?:you )?(?:dont|do not) need (?:your |the |a )?(?:meds|medicine|medication|pills|doctor|therapist|therapy|counselor) | (?:trust|faith in) god instead of (?:your |the |a )?(?:meds|medicine|medication|doctor|therapy|treatment) | (?:deja|dejar|suspende|abandona) (?:de tomar )?(?:tus |los |la |el )?(?:medicinas|medicamentos|pastillas|terapia|tratamiento|medico) /, { negatable: true }],
  // C14 respect. An endorsement shape, negatable: "the Bible doesn't tell you who to vote for" passes.
  ['partisan', / (?:vote|voting) (?:for (?:the )?)?(?:republican|democrat|gop|blue|red|conservative|liberal|trump|biden|harris|vance|newsom|desantis)\w* | (?:christians|you|believers|we|everyone) (?:should|must|need to|ought to|have to) (?:vote|support|back) (?:for )?(?:the )?(?:republican|democrat|gop|conservative|liberal|left|right|trump|biden|harris|vance|newsom|desantis)\w*| (?:republicans?|democrats?|gop|maga|liberals?|conservatives?|the left|the right) (?:are|is) (?:evil|godly|ungodly|right|wrong|the christian|satanic|of god|of the devil) | vota (?:por (?:el |los )?)?(?:republican\w*|democrata\w*|trump|biden|harris) | (?:trump|biden|harris|vance|obama|newsom|desantis) (?:is|was|are) (?:gods|chosen|anointed|evil|the answer|right|wrong) /, { negatable: true }],
  ['ethnicity_claim', / (?:jesus|christ|moses|mary|adam|eve|abraham|david|solomon) (?:was|is) (?:definitely |certainly |clearly |actually |really )?(?:black|white|african|european|caucasian)\b| (?:jesus|cristo|moises|maria) era (?:definitivamente |claramente )?(?:negro|negra|blanco|blanca|africano|europeo) /],
  // C16 privacy
  ['personal_detail', / whats? (?:is )?(?:your|his|her|their) (?:full |last |real )?name | (?:tell me|share|give me|send me) (?:your|his|her) (?:full )?(?:name|address|phone|number) | what (?:church|congregation) do you (?:attend|go to) | where do you live | your (?:home )?address | your phone(?: number)? | como te llamas | tu (?:nombre completo|direccion|telefono|numero de telefono) | (?:a que|cual) iglesia (?:vas|asistes) | donde vives /],
  // C11 teens (secrecy applies to everyone)
  ['secrecy', / (?:dont|do not|no need to|you dont have to|you dont need to|never) tell (?:your )?(?:parents|mom|dad|mother|father|anyone|anybody|a teacher|adults?|grown ups) | keep (?:this|it) (?:a )?secret | our (?:little )?secret | no (?:le|les) (?:digas|cuentes) (?:nada )?a (?:tus papas|tu mama|tu papa|tus padres|nadie) | (?:guardalo|mantenlo) en secreto /],
  ['sexual_detail', / (?:oral|anal|intercourse|penetrat\w*|orgasm\w*|condoms?|foreplay|erection\w*|genital\w*|masturbat\w*|porn\w*|naked|nude|vagina|penis|ejaculat\w*|sexo oral|preservativos?|condon) /, { teenOnly: true }],
  // C08/C09: the AI never plays a person with a body or a home, and never calls a grown woman pet names.
  ['persona_roleplay', / (?:let me )?pour (?:you|us)| (?:a |your )?cup of (?:tea|coffee)| sit (?:down )?(?:here )?(?:at|with me at|around) (?:my|this|the) (?:kitchen )?table| (?:my|this) kitchen table| my (?:kitchen|porch|home|house)\b| pull up a chair| hold your hand| (?:stay|sit) (?:up )?(?:here )?with me tonight| (?:stay|be) (?:right )?here with you tonight| im (?:right )?here (?:beside|next to) you| te (?:sirvo|preparo) un (?:cafe|te|cafecito)| (?:mi|esta) (?:cocina|mesa)\b| me quedo contigo /],
  // C12 Latin American Spanish
  ['vosotros', / (?:vosotros|vosotras|vuestro|vuestra|vuestros|vuestras|sois|estais|habeis|teneis|podeis|sabeis|quereis|seais|os) /, { lang: 'es' }],
];
const PROFANITY = new RegExp(` (?:${banned.profanity.join('|')}) `);
// The stock lines the free models reach for (banned.json "chat", folded like norm()).
const STOCK = new RegExp(` (?:${(banned as { chat?: string[] }).chat?.join('|') ?? '(?!)'})`);
// Pet names used as address ("..., honey." / "Child, ..."), on the raw text: punctuation matters.
const ADDRESS = /(?:^|[,.;:!?¡¿]\s*)(?:oh\s+)?(?:honey|baby|child|chile|sugar|sweetheart|sweetie|darling|beloved|dear one|mija|mijo|cari[ñn]o|mi ni[ñn]a|coraz[oó]n)\s*[,.;!?]|,\s*(?:my\s+)?(?:honey|baby|child|chile|sugar|sweetheart|sweetie|darling|beloved|dear|mija|mijo|cari[ñn]o|mi ni[ñn]a)\b/iu;
// MEANING IS THE JUDGE'S (Open Loops PBS_GATE_KEYWORD_LISTS, 22 Nov 2026). Keyword lists that guessed
// what HER QUESTION was about (medicine, money, marriage, the night, a split doctrine, a prayer ask, a
// woman named, an AI ask) and which verses were unfit for it now live in the judge prompt
// (prompts.ts judgePrompt, quality/judge.ts CHAT_CHECKS): verse_implies_promise, verse_harsh_for_moment,
// verse_off_topic, churches_differ, missing_pastor, night_opening, echo_opening, missing_prayer,
// unasked_ai, assumes_gender. The live calibration set (test/fixtures/judge-calibration.json) holds
// the real answers those lists were written for. What stays below is structure (references, quotes,
// shape, language, length) and the hard safety stops (the red lines, medicine, a teen's trusted adult,
// "cut off your hand", the 988 line after a crisis, persona and pet names, privacy).
// A teen on a hard topic is pointed to a trusted adult (C11, child safety).
const HARD_TOPIC = / (?:died|dies|death|dead|funeral|suicide|sex|sexual|girlfriend|boyfriend|dating|crush|pregnan\w*|abuse|divorce\w*|depress\w*|anxiety|anxious|scared|afraid|bull(?:y|ied|ying)|parents fight\w*|murio|muerte|novio|novia|sexo|embaraz\w*|divorcio|miedo|ansiedad|deprim\w*) /;
const TRUSTED = / (?:trusted adult|parent|parents|mom|dad|mother|father|counselor|pastor|youth (?:leader|pastor)|teacher|coach|adulto de confianza|tus papas|tu mama|tu papa|tus padres|consejer[oa]|maestr[oa]|lider de jovenes) /;

const MINDSET_FAITH = / (?:god|gods|lord|jesus|christ|pray\w*|bible\w*|verse\w*|scripture\w*|kjv|pastor\w*|church\w*|dios|senor|jesucristo|orar|oracion\w*|biblia\w*|versiculo\w*|escritura\w*|iglesia\w*) /;
// Hostile review of 25c474f, F4: pastor-level floors in code.
// A question about medicine gets "talk with your doctor" (RT25 sent her only to her pastor).
const MEDS_Q = / (?:meds|medication\w*|medicine\w*|pills|antidepressants?|prescription\w*|insulin|dose|doses|dosage|medicament\w*|medicinas?|pastillas|receta\w*|dosis) /;
const DOCTOR = / (?:doctor\w*|physician\w*|psychiatrist\w*|prescriber|medic[oa]s?|doctora?s?|psiquiatra) /;
// Jesus' words on cutting off a hand or plucking out an eye are never left literal in a self-harm-adjacent app (n05).
const CUT_OFF_ASKED = / (?:cut (?:it )?off (?:your |my |the |a )?(?:hand|foot|arm)|pluck (?:it )?out|gouge (?:it )?out|tear (?:it )?out|(?:cortar|corta|cortate|cortarse|cortarme) (?:la |tu |mi )?(?:mano|pie)|(?:sacar|saca|sacate|sacarse|sacarme) (?:el |tu |mi )?ojo) /;
const NOT_LITERAL = / (?:not (?:\w+ ){0,2}literal\w*|isnt literal\w*|never (?:\w+ ){0,2}(?:wants|asks|asking|wanted|meant) (?:\w+ ){0,3}(?:to )?(?:hurt|harm|injure|cut)|no (?:\w+ ){0,3}literal\w*|nunca (?:\w+ ){0,4}(?:dano|lastim\w*|herir\w*)) /;
const CUT_OFF_REFS = ['Matthew 5:29-30', 'Matthew 18:8-9', 'Mark 9:43-47'].map(r => parseReference(r)!);
const overlaps = (s: Scripture, r: Reference) => s.book === r.book && s.chapter === r.chapter && (r.verse === undefined || (s.endVerse ?? s.verse) >= r.verse && s.verse <= (r.endVerse ?? r.verse));
// F6/S2: "trusted adult" is for a teen; to a grown woman it is a machine tell (q07, q08).
const TRUSTED_ADULT = / (?:trusted adult|adulto de confianza|adultos de confianza) /;
// F1: the last sentence is whole: at least 4 words, ending in . or !, never a bare name ("…, God").
// A closing "Amen." and a closing reference are not the sentence that has to be whole (run 44856144997:
// 36 drafts were refused, most of them prayers ending "... Amen.").
const lastSentence = (text: string) => {
  const t = text.replace(/\s*\([^)]*\d+:\d+[^)]*\)\s*([.!?])?\s*$/u, '$1').replace(/\s+(?:(?:in (?:jesus|christ)['’]?s?(?: holy)? name,?\s*)?amen|(?:en el nombre de (?:jes[uú]s|cristo),?\s*)?am[eé]n)[.!]*["'”’)]*\s*$/iu, '').trim();
  return t.split(/(?<=[.!?]["'”’)]*)\s+/).at(-1) ?? '';
};

// "Psalm 46:1", "1 John 4:8", "Primera de Juan 4:8", "Salmos 23:1-3", "JHN 3:16".
const REF_IN_TEXT = /((?:[123]\s+)?(?:\p{L}+\s+){0,3}\p{L}+\.?)\s+(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gu;
const QUOTED = /"([^"]{3,}?)"|“([^”]{3,}?)”|«([^»]{3,}?)»|‘([^’]{3,}?)’|(?<![\p{L}])'([^']{3,}?)'(?![\p{L}])/gu;
const ATTRIBUTED = /\b(?:says|said|saith|it is written|is written|declares|promises|dice|dijo|declara|promete|est[aá] escrito|escrito est[aá])\s*[:,]?\s+([^.!?\n"“«‘]{3,})/giu;

function refsInText(text: string): Array<{ raw: string; book: string | null; name: string; chapter: number; verse: number; end?: number }> {
  const found = [];
  for (const m of text.matchAll(REF_IN_TEXT)) {
    const words = m[1].replace(/\.$/, '').split(/\s+/);
    let book: string | null = null;
    for (let i = 0; i < words.length && !book; i++) book = bookCode(words.slice(i).join(' '));
    found.push({ raw: m[0], book, name: words.at(-1) ?? '', chapter: Number(m[2]), verse: Number(m[3]), ...(m[4] ? { end: Number(m[4]) } : {}) });
  }
  return found;
}

export const DROPPED_NOTE = { en: '(I left out a verse reference that is not in the Bible.)', es: '(Quité una cita que no está en la Biblia.)' } as const;
const words = (text: string) => fold(text).split(' ').filter(Boolean);

export async function checkAnswer(draft: unknown, ctx: GateContext): Promise<GateResult> {
  const problems: string[] = [];
  const notes: string[] = [];
  if (!draft || typeof draft !== 'object' || typeof (draft as Draft).text !== 'string' || !(draft as Draft).text.trim()) return { ok: false, problems: ['malformed'] };
  const d = draft as Draft;
  let text = d.text.trim().slice(0, 4000);
  const rawRefs = Array.isArray(d.references) ? d.references.filter((r): r is string => typeof r === 'string').slice(0, 6) : [];

  // C01: references resolve against the store or are dropped; numbers written in the text must exist.
  const scripture: Scripture[] = [];
  let dropNote = false;
  const seen = new Set<string>();
  const add = (s: Scripture | null) => { if (s && !seen.has(`${s.book} ${s.chapter}:${s.verse}`) && scripture.length < 3) { seen.add(`${s.book} ${s.chapter}:${s.verse}`); scripture.push(s); } };
  const asked = norm(ctx.userText);
  if (ctx.door === 'faith') {
    // Whether a verse FITS her question (a healing promise under a medicine question, a harsh verse to
    // someone grieving) is meaning: the judge reads the stored text of every verse printed here.
    for (const raw of rawRefs) { const ref = parseReference(raw); add(ref ? await lookup(ctx.db, ctx.translation, ref) : null); }
    // A reference that is not in the Bible (John 22:5) goes, with the sentence that leans on it, and
    // she is told plainly; an answer with too little left is written again instead.
    const madeUp: string[] = [];
    for (const r of refsInText(text)) {
      // A book that is not in the Bible, written like a reference ("Hezekiah 3:5", "1 Enoch 1:9",
      // "Jasher 2:1"), is made up too. Only a capitalised name counts: "at 3:30" is a time.
      if (!r.book) { if (/^\p{Lu}\p{Ll}+$/u.test(r.name) && !/^\s*(?:a\.?m\.?|p\.?m\.?|hrs?)\b/i.test(text.slice(text.indexOf(r.raw) + r.raw.length))) madeUp.push(r.raw); continue; }
      let s = await lookup(ctx.db, ctx.translation, { book: r.book, chapter: r.chapter, verse: r.verse, ...(r.end ? { endVerse: r.end } : {}) });
      // The verse number: a line from this chapter cited under the wrong verse ("watchmen wait for the
      // morning (Psalm 130:1-2)", really 130:6, model compare 21 Nov 2026) gets the right number.
      if (s) {
        const sentence = text.split(/(?<=[.!?…])\s+/).find(x => x.includes(r.raw))?.replace(r.raw, ' ') ?? '';
        const content = [...new Set(words(sentence).filter(w => w.length > 3).map(w => w.slice(0, 4)))];
        const share = (verse: string) => { const v = ` ${fold(verse)}`; return content.filter(w => v.includes(` ${w}`)).length; };
        if (content.length >= 4 && share(s.text) < 2) {
          const best = (await chapterVerses(ctx.db, ctx.translation, r.book, r.chapter)).map(v => ({ verse: v.verse, n: share(v.text) })).sort((a, b) => b.n - a.n)[0];
          if (best && best.n >= 3 && best.n / content.length >= 0.4 && (best.verse < r.verse || best.verse > (r.end ?? r.verse))) {
            const fixed = await lookup(ctx.db, ctx.translation, { book: r.book, chapter: r.chapter, verse: best.verse });
            if (fixed) { text = text.replace(r.raw, r.raw.replace(/\d+:\d+(?:\s*[-–]\s*\d+)?$/, `${r.chapter}:${best.verse}`)); s = fixed; notes.push('verse_number_fixed'); }
          }
        }
      }
      if (!s) madeUp.push(r.raw);
      else add(s);
    }
    if (madeUp.length) {
      const kept = text.split(/(?<=[.!?…])\s+/).filter(sentence => !madeUp.some(raw => sentence.includes(raw))).join(' ').trim();
      if (words(kept).length < 8) problems.push('unknown_reference');
      else { text = kept; dropNote = true; notes.push('reference_dropped'); }
    }
    if (rawRefs.length > 3) notes.push('over_3_refs');
  } else if (refsInText(text).some(r => r.book)) problems.push('scripture_in_mindset');
  // F8: the Mindset door has no faith words at all (run 44856144997 m04: "I cannot share Bible verses").
  if (ctx.door === 'mindset' && MINDSET_FAITH.test(norm(text))) problems.push('faith_word_in_mindset');

  // C01: any quoted or attributed run of 6+ words must be the stored text of a cited verse.
  const cited = scripture.map(s => ` ${fold(s.text)} `);
  const stored = (run: string) => { const w = words(run); return w.length < 6 || cited.some(c => c.includes(` ${w.join(' ')} `)); };
  // Half its content words are the words of a verse the app prints under it.
  const unsourced: string[] = [];
  const faithful = (run: string) => {
    const content = words(run).filter(w => w.length > 3).map(w => w.slice(0, 4));
    return content.length > 0 && cited.some(c => content.filter(w => c.includes(` ${w}`)).length / content.length >= 0.5);
  };
  // A misquote of a verse it cites (another translation, a word changed: "only Son" for "only begotten
  // Son") is taken out of the text the same way, so she reads that verse only as the stored KJV or
  // RV1909 printed below. A quotation that matches no cited verse is written again.
  for (const m of text.matchAll(QUOTED)) {
    const run = m.slice(1).find(Boolean) ?? '';
    if (words(run).length < 6) continue;
    if (stored(run)) text = text.replace(m[0], ''); // the app shows the stored text below
    else if (faithful(run)) { text = text.replace(m[0], ''); notes.push('misquote_replaced'); }
    else unsourced.push(m[0]);
  }
  // "Jesus said that..." is a paraphrase in her own words, not a quotation.
  // Her own words handed back ("Song of Solomon says love is beautiful", x16) are not a quotation:
  // a claim that starts with three words she wrote is hers, not a verse.
  const hers = ` ${fold(ctx.userText)} `;
  // A faithful paraphrase of a verse the app prints right under it ("Psalm 34:18 says God is close to
  // the brokenhearted") is not a made-up quotation: half its content words are that verse's own.
  // Run 44856144997: 21 drafts were refused for exactly that shape.
  for (const m of text.matchAll(ATTRIBUTED)) if (!/^(?:that|que)\b/i.test(m[1]) && !stored(m[1]) && !faithful(m[1]) && !hers.includes(` ${words(m[1]).slice(0, 3).join(' ')} `)) unsourced.push(m[0]);
  // Bible words that are not the printed text of a verse it cites (from memory, another translation, or
  // made up) go out with their sentence, so she never reads them as Scripture (run 12: 16 drafts were
  // rewritten for one such line). An answer with too little left is written again.
  if (unsourced.length) {
    const kept = text.split(/(?<=[.!?…]["”»']?)\s+/).filter(sentence => !unsourced.some(q => sentence.includes(q) || q.includes(sentence))).join(' ').trim();
    if (words(kept).length < 25) problems.push('non_store_scripture');
    else { text = kept; notes.push('unsourced_quote_dropped'); }
  }
  text = text.replace(/\s+([,.;:!?])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  text = tidyReferences(text);
  const archaic = words(text).filter(w => ARCHAIC.has(w)).length;
  if (ctx.lang === 'en' && archaic >= 2) problems.push('scripture_like');

  // Red lines and the rest, on normalised text.
  const n = norm(text);
  for (const [problem, re, opts] of RULES) {
    if (opts?.teenOnly && !ctx.teen) continue;
    if (opts?.lang && opts.lang !== ctx.lang) continue;
    const hit = [...n.matchAll(new RegExp(re.source, 'g'))].some(m => !(opts?.negatable && NEG.test(n.slice(0, m.index! + 1))));
    if (hit) problems.push(problem);
  }
  if (PROFANITY.test(n)) problems.push('profanity');
  if (STOCK.test(n)) problems.push('stock_phrase');
  if (ADDRESS.test(text)) problems.push('persona_roleplay');
  // Two words run together ("theSong of Solomon", RT10 round 3): a lowercase word glued to a capital.
  if (/\b[a-z]{2,}[A-Z][a-z]+/.test(text)) problems.push('glued_words');
  if (ctx.door === 'faith' && faithContentIssues(text).length) problems.push('mindset_word');
  if (ctx.teen && HARD_TOPIC.test(norm(ctx.userText)) && !TRUSTED.test(n)) problems.push('missing_trusted_adult');

  if (MEDS_Q.test(asked) && !DOCTOR.test(n)) problems.push('missing_doctor');
  const cutOff = CUT_OFF_ASKED.test(asked) || scripture.some(s => CUT_OFF_REFS.some(r => overlaps(s, r))) || refsInText(ctx.userText).some(x => CUT_OFF_REFS.some(r => r.book === x.book && r.chapter === x.chapter && x.verse >= r.verse! && x.verse <= (r.endVerse ?? r.verse!)));
  if (cutOff && !NOT_LITERAL.test(n)) problems.push('missing_not_literal');
  if (ctx.afterCrisis && !text.includes(ctx.line ?? '988')) problems.push('missing_988');
  if (!ctx.teen && TRUSTED_ADULT.test(n)) problems.push('trusted_adult_for_adult');
  const end = lastSentence(text);
  const cjk = ctx.shown === 'ko' || ctx.shown === 'zh-Hans' || ctx.shown === 'zh-Hant';
  if (text && !cjk && (words(end).length < 3 || !/[.!]["'”’)]*$/.test(end))) problems.push('broken_ending');
  // Korean and Chinese: a sentence ends on . ! 。 or ！ (Chinese has no spaces to count words by).
  if (text && cjk && !/[.!。！]["'”’)」』]*$/u.test(text.replace(/\s*[(（][^)）]*\d+:\d+[^)）]*[)）]\s*[.。]?\s*$/u, '。').trim())) problems.push('broken_ending');
  // C12 for Korean and Chinese: the letters are her script (Hangul, or Han characters), not English.
  if (text && cjk) {
    const letters = [...text.replace(REF_IN_TEXT, ' ').replace(/\d+:\d+/g, ' ')].filter(ch => /\p{L}/u.test(ch));
    const own = letters.filter(ch => (ctx.shown === 'ko' ? /[\p{Script=Hangul}\p{Script=Han}]/u : /\p{Script=Han}/u).test(ch)).length;
    if (letters.length && own / letters.length < 0.9) problems.push('not_her_language');
  }

  // C12: 95%+ Spanish words outside references.
  if (ctx.lang === 'es') {
    const w = words(text.replace(REF_IN_TEXT, ' '));
    const english = w.filter(x => EN_COMMON.has(x)).length;
    if (w.length && english / w.length > 0.05) problems.push('not_spanish');
  }
  // C13 length and shape: over the limit is a note, over by 25% blocks.
  const limit = ctx.teen ? 120 : 180;
  const count = words(text).length;
  if (count > limit * 1.25) problems.push('too_long'); else if (count > limit) notes.push('over_length');
  if ((text.match(/\?/g) ?? []).length >= 3) problems.push('question_string');
  // C13: it ends with a verse or a short prayer, never on a question.
  if (/[?？]["'”’)\]]*\s*$/.test(text)) problems.push('ends_with_question');
  if (!text) problems.push('empty');

  if (dropNote) text = `${text} ${DROPPED_NOTE[ctx.lang]}`;
  return problems.length ? { ok: false, problems: [...new Set(problems)] } : { ok: true, text, scripture, notes };
}

/** S1: "Psalm 119:76 (Psalm 119:76)" and "El Salmo 34:18 ... (Salmos 34:18)" lose the repeat, and a
 *  reference stranded after a full stop moves inside the sentence it belongs to. Structure only. */
export function tidyReferences(text: string): string {
  // A stranded "(ref)" after a full stop goes back before that stop.
  let out = text.replace(/([^.!?\s])([.!?])\s+(\((?:[^()]*\d+\s*:\s*\d+[^()]*)\))(?=\s|$)/gu, '$1 $3$2');
  out = out.replace(/([.!?])\s*\1/g, '$1');
  // In each sentence, a parenthetical reference already named outside the parentheses is dropped.
  out = out.split(/(?<=[.!?])\s+/).map(sentence => {
    const inside = [...sentence.matchAll(/\s*\(([^()]*\d+\s*:\s*\d+[^()]*)\)/gu)];
    if (!inside.length) return sentence;
    const bare = sentence.replace(/\([^()]*\)/g, ' ');
    const key = (r: { book: string | null; chapter: number; verse: number }) => `${r.book} ${r.chapter}:${r.verse}`;
    const outside = new Set(refsInText(bare).filter(r => r.book).map(key));
    let s = sentence;
    for (const m of inside) {
      const refs = refsInText(m[1]).filter(r => r.book);
      if (refs.length && refs.every(r => outside.has(key(r)))) s = s.replace(m[0], '');
    }
    return s;
  }).join(' ');
  return out.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
