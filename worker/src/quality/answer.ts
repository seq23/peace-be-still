// Every model reply passes here before anyone sees it (QUALITY C01, C05-C07, C11-C16).
// Code handles structure and the hard floors; a free-model judge reads meaning for the
// C06/C07 red lines afterwards (judge.ts). A problem means one regeneration with the
// objection, then the fixed fallback reply. Nothing here keeps or logs the text.
import { banned, bookCode, fold, parseReference, type Translation } from '../shared';
import { faithContentIssues } from '../../../app/src/model';
import { lookup, type Scripture } from '../scripture';

export type Draft = { text: string; references: string[] };
export type GateContext = { db: D1Database; lang: 'en' | 'es'; translation: Translation; teen: boolean; door: 'faith' | 'mindset'; userText: string };
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
  // C14 respect
  ['partisan', / vote (?:for|republican|democrat|blue|red|against) | (?:christians|you|believers|we) should (?:vote|support|back) | (?:republicans?|democrats?|gop|maga|liberals?|conservatives?|the left|the right) (?:are|is) (?:evil|godly|ungodly|right|wrong|the christian|satanic) | vota (?:por|republicano|democrata|en contra) | (?:trump|biden|harris|vance|obama|newsom|desantis) /],
  ['ethnicity_claim', / (?:jesus|christ|moses|mary|adam|eve|abraham|david|solomon) (?:was|is) (?:definitely |certainly |clearly |actually |really )?(?:black|white|african|european|caucasian)\b| (?:jesus|cristo|moises|maria) era (?:definitivamente |claramente )?(?:negro|negra|blanco|blanca|africano|europeo) /],
  // C16 privacy
  ['personal_detail', / whats? (?:is )?(?:your|his|her|their) (?:full |last |real )?name | (?:tell me|share|give me|send me) (?:your|his|her) (?:full )?(?:name|address|phone|number) | what (?:church|congregation) do you (?:attend|go to) | where do you live | your (?:home )?address | your phone(?: number)? | como te llamas | tu (?:nombre completo|direccion|telefono|numero de telefono) | (?:a que|cual) iglesia (?:vas|asistes) | donde vives /],
  // C11 teens (secrecy applies to everyone)
  ['secrecy', / (?:dont|do not|no need to|you dont have to|you dont need to|never) tell (?:your )?(?:parents|mom|dad|mother|father|anyone|anybody|a teacher|adults?|grown ups) | keep (?:this|it) (?:a )?secret | our (?:little )?secret | no (?:le|les) (?:digas|cuentes) (?:nada )?a (?:tus papas|tu mama|tu papa|tus padres|nadie) | (?:guardalo|mantenlo) en secreto /],
  ['sexual_detail', / (?:oral|anal|intercourse|penetrat\w*|orgasm\w*|condoms?|foreplay|erection\w*|genital\w*|masturbat\w*|porn\w*|naked|nude|vagina|penis|ejaculat\w*|sexo oral|preservativos?|condon) /, { teenOnly: true }],
  // C12 Latin American Spanish
  ['vosotros', / (?:vosotros|vosotras|vuestro|vuestra|vuestros|vuestras|sois|estais|habeis|teneis|podeis|sabeis|quereis|seais|os) /, { lang: 'es' }],
];
const PROFANITY = new RegExp(` (?:${banned.profanity.join('|')}) `);
const HARD_TOPIC = / (?:died|dies|death|dead|funeral|suicide|sex|sexual|girlfriend|boyfriend|dating|crush|pregnan\w*|abuse|divorce\w*|depress\w*|anxiety|anxious|scared|afraid|bull(?:y|ied|ying)|parents fight\w*|murio|muerte|novio|novia|sexo|embaraz\w*|divorcio|miedo|ansiedad|deprim\w*) /;
const TRUSTED = / (?:trusted adult|parent|parents|mom|dad|mother|father|counselor|pastor|youth (?:leader|pastor)|teacher|coach|adulto de confianza|tus papas|tu mama|tu papa|tus padres|consejer[oa]|maestr[oa]|lider de jovenes) /;

// "Psalm 46:1", "1 John 4:8", "Primera de Juan 4:8", "Salmos 23:1-3", "JHN 3:16".
const REF_IN_TEXT = /((?:\p{L}+\s+){0,3}\p{L}+\.?)\s+(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gu;
const QUOTED = /"([^"]{3,}?)"|“([^”]{3,}?)”|«([^»]{3,}?)»|‘([^’]{3,}?)’|(?<![\p{L}])'([^']{3,}?)'(?![\p{L}])/gu;
const ATTRIBUTED = /\b(?:says|said|saith|it is written|is written|declares|promises|dice|dijo|declara|promete|est[aá] escrito|escrito est[aá])\s*[:,]?\s+([^.!?\n"“«‘]{3,})/giu;

function refsInText(text: string): Array<{ raw: string; book: string | null; chapter: number; verse: number; end?: number }> {
  const found = [];
  for (const m of text.matchAll(REF_IN_TEXT)) {
    const words = m[1].replace(/\.$/, '').split(/\s+/);
    let book: string | null = null;
    for (let i = 0; i < words.length && !book; i++) book = bookCode(words.slice(i).join(' '));
    found.push({ raw: m[0], book, chapter: Number(m[2]), verse: Number(m[3]), ...(m[4] ? { end: Number(m[4]) } : {}) });
  }
  return found;
}

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
  const seen = new Set<string>();
  const add = (s: Scripture | null) => { if (s && !seen.has(`${s.book} ${s.chapter}:${s.verse}`) && scripture.length < 3) { seen.add(`${s.book} ${s.chapter}:${s.verse}`); scripture.push(s); } };
  if (ctx.door === 'faith') {
    for (const raw of rawRefs) { const ref = parseReference(raw); add(ref ? await lookup(ctx.db, ctx.translation, ref) : null); }
    for (const r of refsInText(text)) {
      if (!r.book) continue;
      const s = await lookup(ctx.db, ctx.translation, { book: r.book, chapter: r.chapter, verse: r.verse, ...(r.end ? { endVerse: r.end } : {}) });
      if (!s) problems.push('unknown_reference'); else add(s);
    }
    if (rawRefs.length > 3) notes.push('over_3_refs');
  } else if (refsInText(text).some(r => r.book)) problems.push('scripture_in_mindset');

  // C01: any quoted or attributed run of 6+ words must be the stored text of a cited verse.
  const cited = scripture.map(s => ` ${fold(s.text)} `);
  const stored = (run: string) => { const w = words(run); return w.length < 6 || cited.some(c => c.includes(` ${w.join(' ')} `)); };
  for (const m of text.matchAll(QUOTED)) {
    const run = m.slice(1).find(Boolean) ?? '';
    if (!stored(run)) problems.push('non_store_scripture');
    else if (words(run).length >= 6) text = text.replace(m[0], ''); // the app shows the stored text below
  }
  // "Jesus said that..." is a paraphrase in her own words, not a quotation.
  for (const m of text.matchAll(ATTRIBUTED)) if (!/^(?:that|que)\b/i.test(m[1]) && !stored(m[1])) problems.push('non_store_scripture');
  text = text.replace(/\s+([,.;:!?])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
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
  if (ctx.door === 'faith' && faithContentIssues(text).length) problems.push('mindset_word');
  if (ctx.teen && HARD_TOPIC.test(norm(ctx.userText)) && !TRUSTED.test(n)) problems.push('missing_trusted_adult');

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
  if (!text) problems.push('empty');

  return problems.length ? { ok: false, problems: [...new Set(problems)] } : { ok: true, text, scripture, notes };
}
