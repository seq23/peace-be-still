// Peace Be Still chat Worker: POST /api/token, POST /api/chat, POST /api/report, DELETE /api/memory, hourly cleanup.
// Order for a chat message: region -> signed token (age band inside) -> burst limit -> body ->
// crisis (floor, then the model risk read on EVERY message; no read = no answer) -> paid status
// (RevenueCat) -> daily admission (D1) -> free ladder -> crisis tripwire on the draft -> answer gate
// (+ variety against her recent answers and everyone's, + judge with the verse texts) -> up to two
// rewrites -> fixed fallback -> response. The model writes every answer whole; two human-written
// answers in the same voice go in ahead of the chat as an earlier exchange (src/voice/samples.ts),
// so it hears the voice. Code never chooses its words. Crisis kinds: selfharm, abuse, child_abuse,
// medical (danger to the body from medicine or alcohol that is not a wish to die: Poison Control first).
// POST /api/token/renew re-signs the SAME install id (paid status and memory follow it).
import './env';
import { cleanup } from './cleanup';
import { addUserSpend, appSpendToday, blockFor, liftBlock, resetsOn, setBlock, throttle, userCeilingUsd, userSpend } from './controls';
import { bump, logCode, reserve } from './counts';
import { confirmRisk, detectCrisis, floor, riskMessages, riskSchema, riskVerdict, tripwire, type CrisisKind, type RiskVerdict, type Turn } from './crisis';
import { centralDay, pacificDay, utcDay } from './day';
import { paidStatus, recheckMemory, type Paid } from './entitlement';
import { ipHash } from './iphash';
import { runLadder, tally, type LadderRung, type Metrics } from './ladder';
import { deleteMemory, markCrisis, readMemory, saveMemory } from './memory';
import { memoryBlock, mindsetTeen, prompts, spanishOnly, summaryPrompt, type PromptId } from './prompts';
import { gemini } from './providers/gemini';
import { openRouter, openRouterPrivate } from './providers/openrouter';
import type { Message } from './providers/types';
import { workersAi } from './providers/workers-ai';
import { checkAnswer } from './quality/answer';
import { hashShape, nextSeq, recentShapes, repeats, saveShape, shapeOf, varietyObjection, type Shape } from './quality/variety';
import { examplesFor, sampleSet } from './voice/samples';
import { judgeMessages, judgeSchema, judgeVerdict, type JudgeInput, type JudgeVerdict } from './quality/judge';
import { busyText, consentText, crisisText, fairUseText, freeRestingText, paidDownText, pausedText, slowText, MINDSET_FAITH_ASK, mindsetFaithAskText, ROLE_SWAP, ROLE_VERSE, roleText, fallbackMindsetText, fallbackText, fallbackTopic, identityMindsetText, identityText, limitMindsetText, limitText, noFreeModelMindsetText, noFreeModelText, oneTranslationText, topicText, type Lang } from './replies';
import { parseReport, REPORTS_DAILY, saveReport } from './report';
import { lookup, refugeVerse, type Scripture } from './scripture';
import { fold, parseReference, type Reference } from './shared';
import { excludedTerritories, FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES, providers, type Translation } from './shared';
import { issueToken, RENEW_GRACE_DAYS, verifyToken, type Install } from './token';

import type { ChatRequest, ChatResponse } from '../../app/src/chat/contract';
export type { ChatRequest, ChatResponse };

export type Deps = {
  now: () => number;
  risk: (env: Env, turns: Turn[]) => Promise<RiskVerdict>;
  judge: (env: Env, input: JudgeInput) => Promise<JudgeVerdict>;
  /** The free lane by default (the order the privacy policy names); 'paid' is the billed, private model only. */
  rungs: (env: Env, now: number, lane?: Lane) => LadderRung[];
  paid: (env: Env, installId: string, now: number) => Promise<Paid>;
};

// Apple's alpha-3 territory list (providers.mjs, shared with the store script) to the alpha-2 codes Cloudflare sends.
const ALPHA2: Record<string, string> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK', EST: 'EE', FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'GR', HUN: 'HU', IRL: 'IE',
  ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU', MLT: 'MT', NLD: 'NL', POL: 'PL', PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE',
  ISL: 'IS', LIE: 'LI', NOR: 'NO', GBR: 'GB', CHE: 'CH',
};
export const blockedCountries = new Set(excludedTerritories.map(code => ALPHA2[code] ?? code));

const VOICES = new Set<string>(['plain', 'church', 'teen', 'spanish'] satisfies ChatRequest['voice'][]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IDENTITY = /\b(?:(?:are you|are u|r u|ru|r you|you a|u a) (?:a |an |just a |just an )?(?:real|human|person|people|robot|bot|ai|a\.i\.|machine|computer|chatbot|pastor|preacher|minister|priest|god|jesus|the lord)|is this (?:a |an )?(?:bot|ai|robot|real person|human|computer)|(?:person|human|real|people) or (?:a |an )?(?:bot|robot|ai|machine|computer)|(?:bot|robot|ai|machine) or (?:a |an )?(?:real )?(?:person|human)|am i (?:talking|speaking|chatting) (?:to|with) (?:a |an )?(?:human|person|real person|bot|ai|robot|computer|pastor)|(?:eres|es esto) (?:un |una )?(?:persona|humano|humana|robot|bot|ia|inteligencia artificial|pastor|dios|jesus|real)|estoy hablando con (?:un |una )?(?:persona|humano|bot|robot|ia|pastor))\b/;
const answerSchema = { type: 'object', properties: { text: { type: 'string' }, references: { type: 'array', items: { type: 'string' }, maxItems: 3 } }, required: ['text', 'references'], additionalProperties: false };
const summarySchema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false };
const editSchema = { type: 'object', properties: { versions: { type: 'array', items: answerSchema, minItems: 2, maxItems: 3 } }, required: ['versions'], additionalProperties: false };
const hasVersions = (d: unknown) => !!d && Array.isArray((d as { versions?: unknown }).versions) && (d as { versions: unknown[] }).versions.some(v => isAnswer(v));
// A model that ignores the versions shape and sends one answer is still used.
const isEdit = (d: unknown) => hasVersions(d) || isAnswer(d);
const isAnswer = (d: unknown) => !!d && typeof (d as { text?: unknown }).text === 'string' && !!(d as { text: string }).text.trim() && Array.isArray((d as { references?: unknown }).references);
const isSummary = (d: unknown) => !!d && typeof (d as { summary?: unknown }).summary === 'string';
const RED_LINES = new Set(['first_person_divine', 'god_told_me', 'prophecy', 'salvation_claim', 'end_times_date', 'prosperity', 'money_ask', 'outcome_promise', 'stop_medicine', 'partisan', 'ethnicity_claim', 'secrecy', 'sexual_detail']);
const THREE_HOURS = 3 * 3600_000;
// The regeneration is told in words what was wrong, never a line to copy.
const OBJECTIONS: Record<string, string> = {
  stock_phrase: 'It used a stock phrase; say it in fresh words of your own.',
  non_store_scripture: 'It put Bible words in quotation marks or after "says" that are not the printed King James text. Do not retell any verse: name it by its reference and say in your own words what it means here.',
  missing_doctor: 'The question is about medicine: say plainly, in your own words, to talk with their doctor before changing anything.',
  missing_not_literal: 'Say plainly that Jesus is not speaking literally here and that God never wants anyone to hurt their body.',
  missing_988: 'An earlier message in this chat was about their safety: include the line that they can call or text 988 any time.',
  assumes_gender: 'It called the person "she" or "her" without knowing; speak to them as "you", and pray with "we", "us" or "you".',
  trusted_adult_for_adult: 'It told a grown adult to find a "trusted adult"; say "someone you trust" instead.',
  broken_ending: 'It ended on a fragment or a bare name; end on one whole sentence of your own.',
  missing_prayer: 'They asked for prayer: include a short prayer spoken to God, in your own words.',
  'judge:garbled': 'A sentence was broken or said something false about the Bible; write every sentence whole and true.',
  'judge:image_unfit': 'It used a picture that does not fit; leave pictures out unless the verse itself gives one.',
  'judge:assumes_gender': 'It called the person "she" or "her" without knowing; speak to them as "you".',
  echo_opening: 'It opened by restating her question; open with something true and specific instead.',
  glued_words: 'Two words ran together with no space; check the spacing.',
  ends_with_question: 'It ended on a question; end on a whole sentence of your own.',
  unasked_ai: 'It said it was an AI when they did not ask; do not mention it.',
  split_unasked: 'It said churches teach differently on something Christians do not split on; just answer.',
  split_dodge: 'It said churches differ where Scripture speaks plainly. Say kindly and without shame what Scripture and historic Christian teaching say, and suggest they talk it over with their pastor.',
  missing_pastor: 'Suggest, in a sentence of your own, that they talk this through with their pastor.',
  night_opening: 'It opened on the night or the dark, which they did not mention; open on what they actually said.',
  repeat_opening: 'It opened the same way as a recent answer; open differently, on what they said.',
  repeat_closing: 'It closed the same way as a recent answer; close differently.',
  repeat_image: 'It reused wording from a recent answer; say it in other words.',
  'judge:verse_read_in': 'It used a verse to approve what the verse does not say, or called a plain teaching a matter churches differ on; say what Scripture plainly says, kindly.',
  persona_roleplay: 'It acted as a person with a body or a home, or used a pet name; do neither.',
  verse_unfit: 'It named a verse whose words would promise healing or wealth for this question; choose a different verse.',
  'judge:verse_implies_promise': 'A verse it chose reads as a promise of the outcome they asked about; choose verses about God\'s nearness instead.',
  'judge:verse_harsh_for_moment': 'A verse it chose is harsh for someone hurting; choose a gentler one.',
  'judge:verse_off_topic': 'A verse it chose does not fit the question; choose one that does.',
  'judge:voice_low': 'It sounded like a leaflet; answer what they actually said, specifically, in the voice of the earlier answers, with no handout words.',
  'judge:roleplay': 'It acted as a person or used a pet name; do neither.',
};
const objectionText = (p: string) => OBJECTIONS[p] ?? `Problem: ${p.replace(/^judge:/, '').replace(/_/g, ' ')}.`;

// Other translations by name or abbreviation, on folded text (EN and ES).
const OTHER_TRANSLATION = / (?:niv|esv|nlt|nkjv|nasb|csb|hcsb|nrsv|rsv|amp|amplified|the message|msg|tpt|nvi|ntv|lbla|dhh|nbla|rvr ?1960|rv ?1960|rv60|rvc|new international|english standard|new living|new king james|nueva version internacional|nueva traduccion viviente|dios habla hoy|la biblia de las americas|reina valera 1960) /;
/** The first "Book 3:16" (or "1 Corinthians 13:4-7") she names, tried with one to three words of book name. */
function namedReference(text: string): Reference | null {
  for (const m of text.matchAll(/((?:[1-3]\s)?\p{L}+(?:\s\p{L}+){0,2})\s+(\d{1,3}:\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/gu)) {
    const words = m[1].split(/\s+/);
    for (let k = 1; k <= words.length; k++) {
      const ref = parseReference(`${words.slice(-k).join(' ')} ${m[2]}`);
      if (ref?.verse) return ref;
    }
  }
  return null;
}
const ANSWER_TRIES = 3;
const int = (value: string, fallback: number) => { const n = Number.parseInt(value, 10); return Number.isSafeInteger(n) && n > 0 ? n : fallback; };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const fail = (code: string, status: number) => { logCode(code); return json({ error: code }, status); };

export type Lane = 'free' | 'paid';
const geminiModels = (env: Env) => env.GEMINI_MODELS.split(',').map(s => s.trim()).filter(Boolean);
// The free lane's Gemini is an UNBILLED project's key (PBS_FREE_GEMINI_API_KEY); the billed key
// (PBS_GEMINI_API_KEY) is the paid lane's and is never used for free chat. A missing free key is the
// named stop PBS_FREE_GEMINI_API_KEY_MISSING: the rung is skipped, never replaced by the paid key.
const geminiRung = (env: Env, model: string, now: number): LadderRung => ({ id: `gemini-free:${model}`, call: gemini(env.PBS_FREE_GEMINI_API_KEY, model, { missing: 'PBS_FREE_GEMINI_API_KEY_MISSING', thinkingLevel: env.GEMINI_THINKING_LEVEL }), cap: int(env.GEMINI_CALLS_DAILY, 200), day: pacificDay(now) });
const usd = (value: string | undefined, fallback: number) => { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : fallback; };
/**
 * The paid lane's one rung: private, priced, with no free fallback after it. PAID_PROVIDER picks the
 * route (gemini: the billed key; workers-ai: this account; openrouter-zdr: the US zero-retention hosts
 * in PAID_HOSTS), PAID_MODEL the model, so a switch is a config change.
 */
const paidRung = (env: Env, now: number): LadderRung => {
  const provider: string = env.PAID_PROVIDER || 'gemini';
  const call = provider === 'workers-ai' ? workersAi(env.AI, env.PAID_MODEL)
    : provider === 'openrouter-zdr' ? openRouterPrivate(env.OPENROUTER_API_KEY, env.PAID_MODEL, (env.PAID_HOSTS ?? '').split(',').map(h => h.trim()).filter(Boolean))
    : gemini(env.PBS_GEMINI_API_KEY, env.PAID_MODEL, { missing: 'PBS_GEMINI_API_KEY_MISSING', thinkingLevel: env.GEMINI_THINKING_LEVEL });
  return { id: `paid-${provider}:${env.PAID_MODEL}`, call, cap: 1_000_000, day: utcDay(now), price: { in: usd(env.PAID_PRICE_IN_PER_M, 0.3), out: usd(env.PAID_PRICE_OUT_PER_M, 2.5) } };
};

/** A small ladder for a check (risk read, judge): Workers AI first, then the last Gemini model. */
async function check<T>(env: Env, now: number, first: LadderRung, messages: ReturnType<typeof riskMessages>, schema: Record<string, unknown>, maxTokens: number, read: (d: unknown) => T, ok: (v: T) => boolean, down: T): Promise<T> {
  const metrics: Metrics = new Map();
  // The backup reads the same words the risk read does, which may be about a crisis: only the
  // private (paid) model may see them, never a free one.
  const rungs = env.PBS_GEMINI_API_KEY || (env.PAID_PROVIDER && env.PAID_PROVIDER !== 'gemini') ? [first, paidRung(env, now)] : [first];
  const out = await runLadder(env.DB, rungs, messages, schema, maxTokens, metrics, d => ok(read(d)));
  for (const [metric, n] of metrics) await bump(env.DB, centralDay(now), `${first.id}:${metric}`, n);
  return 'data' in out ? read(out.data) : down;
}

export const realDeps: Deps = {
  now: () => Date.now(),
  risk(env, turns) {
    const now = Date.now();
    const read = (id: string, model: string, cap: number) => check(env, now, { id, call: workersAi(env.AI, model, { temperature: 0 }), cap, day: utcDay(now) }, riskMessages(turns), riskSchema, 60, riskVerdict, v => v.verdict !== 'down', { verdict: 'down' } as RiskVerdict);
    return confirmRisk(
      () => read('workers-ai-risk', env.WORKERS_AI_RISK_MODEL, int(env.WORKERS_AI_RISK_CALLS_DAILY, 400)),
      () => read('workers-ai-risk-confirm', env.WORKERS_AI_RISK_CONFIRM_MODEL, int(env.WORKERS_AI_RISK_CONFIRM_CALLS_DAILY, 100)),
    );
  },
  judge(env, input) {
    const now = Date.now();
    const first: LadderRung = { id: 'workers-ai-judge', call: workersAi(env.AI, env.WORKERS_AI_JUDGE_MODEL, { temperature: 0 }), cap: int(env.WORKERS_AI_JUDGE_CALLS_DAILY, 300), day: utcDay(now) };
    return check(env, now, first, judgeMessages(input), judgeSchema, 200, judgeVerdict, v => v.verdict !== 'down', { verdict: 'down' } as JudgeVerdict);
  },
  rungs(env, now, lane = 'free') {
    if (lane === 'paid') return [paidRung(env, now)];
    const built: Record<string, LadderRung[]> = {
      'workers-ai': [{ id: 'workers-ai', call: workersAi(env.AI, env.WORKERS_AI_ANSWER_MODEL), cap: int(env.WORKERS_AI_ANSWER_CALLS_DAILY, 10), day: utcDay(now) }],
      'gemini-free': geminiModels(env).map(model => geminiRung(env, model, now)),
      'openrouter-free': [{ id: 'openrouter-free', call: openRouter(env.OPENROUTER_API_KEY, env.OPENROUTER_MODELS.split(',')), cap: int(env.OPENROUTER_CALLS_DAILY, 900), day: utcDay(now) }],
    };
    return providers.flatMap(p => built[p.id] ?? []);
  },
  paid: (env, installId, now) => paidStatus(env, installId, now),
};

// Privacy policy: "Messages that mention self-harm or abuse are never sent to an AI provider." The
// newest message is checked by the floor before any model; an EARLIER message the floor is sure
// about was answered with crisis lines, so its words are replaced by a note before the risk read,
// the answer or the memory summary sees the history. The risk model still knows it happened.
// Not exported: every named export of the Worker entry module must be a handler, or workerd refuses to start.
const CRISIS_NOTE = '(An earlier message here was about their safety and was answered with crisis lines. Its words are not shown.)';
function withoutCrisisWords(turns: Turn[]): Turn[] {
  return turns.map((t, i) => t.role === 'user' && i < turns.length - 1 && floor([t]).sure ? { role: 'user', text: CRISIS_NOTE } : t);
}

function parseChat(body: unknown): ChatRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.conversation !== 'string' || !UUID.test(b.conversation)) return null;
  if (b.door !== 'faith' && b.door !== 'mindset') return null;
  if (typeof b.voice !== 'string' || !VOICES.has(b.voice)) return null;
  if (b.language !== 'en' && b.language !== 'es') return null;
  if (b.journey !== undefined && (typeof b.journey !== 'string' || b.journey.length > 60)) return null;
  if (!Array.isArray(b.messages) || b.messages.length < 1 || b.messages.length > 40) return null;
  const messages: ChatRequest['messages'] = [];
  for (const m of b.messages) {
    if (!m || typeof m !== 'object') return null;
    const t = m as Record<string, unknown>;
    if ((t.role !== 'user' && t.role !== 'assistant') || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 2000) return null;
    messages.push({ role: t.role, text: t.text });
  }
  if (messages[messages.length - 1].role !== 'user') return null;
  return { conversation: b.conversation, messages, door: b.door, voice: b.voice as ChatRequest['voice'], language: b.language, journey: b.journey as string | undefined, scripture: b.scripture === true, freeConsent: b.freeConsent === true };
}

/** Mi Refugio, the Spanish voice or a Spanish phone: Spanish and the Reina-Valera 1909. Teens keep the teen rules in their language. */
export function voiceFor(req: ChatRequest, install: Install): { lang: Lang; translation: Translation; prompt: PromptId; teen: boolean } {
  const lang: Lang = req.journey === 'Mi Refugio' || req.voice === 'spanish' || req.language === 'es' ? 'es' : 'en';
  const teen = install.age === 'teen';
  // The Mindset door keeps its own prompt for teens too (F8: no faith words); the teen rules are added to it.
  const prompt: PromptId = req.door === 'mindset' ? 'mindset' : teen ? (lang === 'es' ? 'teen-es' : 'teen') : lang === 'es' ? 'spanish' : req.voice === 'church' ? 'church' : 'plain';
  return { lang, translation: lang === 'es' ? 'RV1909' : 'KJV', prompt, teen };
}

async function token(request: Request, env: Env, deps: Deps): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { age?: unknown } | null;
  if (body?.age === 'child') return json({ kind: 'blocked' }, 403); // under 13: no chat, no install id
  if (body?.age !== 'teen' && body?.age !== 'adult') return fail('BAD_REQUEST', 400);
  const now = deps.now();
  const day = centralDay(now);
  let hash: string;
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  try { hash = await ipHash(env.IP_HASH_SECRET, day, ip); } catch { return fail('IP_HASH_SECRET_MISSING', 503); }
  if (!(await env.TOKEN_BURST.limit({ key: hash })).success) return json({ kind: 'limit' }, 429);
  // An IPv4 address is often shared (church Wi-Fi, a carrier's CGNAT); an IPv6 /64 is one home or phone.
  const perIp = ip.includes(':') ? int(env.TOKENS_PER_IPV6_DAILY, 3) : int(env.TOKENS_PER_IPV4_DAILY, 20);
  try {
    await env.DB.prepare('INSERT INTO token_admission VALUES (?, ?, ?)').bind(day, hash, perIp).run();
  } catch (error) {
    if (/TOKEN_IP_LIMIT/.test(String(error))) return json({ kind: 'network_limit' }, 429);
    throw error;
  }
  try {
    const issued = await issueToken({ kid: env.CHAT_TOKEN_KID, secret: env.CHAT_TOKEN_SECRET }, body.age, now);
    // The install id is also RevenueCat's app user id (phase 5 logs in with it), so paid status can be checked here.
    return json({ token: issued.token, installId: issued.installId });
  } catch { return fail('CHAT_TOKEN_SECRET_MISSING', 503); }
}

async function install(request: Request, env: Env, now: number, graceDays = 0): Promise<Install | null | 'missing'> {
  if (!env.CHAT_TOKEN_SECRET) return 'missing';
  const header = request.headers.get('authorization') ?? '';
  return verifyToken({ kid: env.CHAT_TOKEN_KID, secret: env.CHAT_TOKEN_SECRET, previous: env.CHAT_TOKEN_SECRET_PREVIOUS }, header.startsWith('Bearer ') ? header.slice(7) : null, now, graceDays);
}

/** A token past its 30 days (signature valid, up to a year late) gets a new one for the SAME install id. */
async function renew(request: Request, env: Env, deps: Deps): Promise<Response> {
  const now = deps.now();
  const who = await install(request, env, now, RENEW_GRACE_DAYS);
  if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  if (!(await env.TOKEN_BURST.limit({ key: who.installId })).success) return json({ kind: 'limit' }, 429);
  try {
    const issued = await issueToken({ kid: env.CHAT_TOKEN_KID, secret: env.CHAT_TOKEN_SECRET }, who.age, now, who.installId);
    return json({ token: issued.token, installId: issued.installId });
  } catch { return fail('CHAT_TOKEN_SECRET_MISSING', 503); }
}

/** Gives back a message admitted but never answered (busy, or every rung out): she is not charged for it. */
async function refund(db: D1Database, day: string, device: string, hash: string): Promise<void> {
  await db.batch([
    db.prepare('UPDATE chat_device_day SET messages = max(0, messages - 1) WHERE day = ? AND device = ?').bind(day, device),
    db.prepare('UPDATE chat_ip_day SET messages = max(0, messages - 1) WHERE day = ? AND ip_hash = ?').bind(day, hash),
    db.prepare('UPDATE chat_global_day SET messages = max(0, messages - 1) WHERE day = ?').bind(day),
  ]);
}

async function chat(request: Request, env: Env, ctx: ExecutionContext, deps: Deps): Promise<Response> {
  const now = deps.now();
  const day = centralDay(now);
  const who = await install(request, env, now);
  if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  if (!(await env.CHAT_BURST.limit({ key: who.installId })).success) {
    // A flood is a strike for the abuse throttle too (controls.ts): enough of them pause chat for 24 hours.
    if (env.IP_HASH_SECRET) await throttle(env.DB, env.IP_HASH_SECRET, day, who.installId, null, true, now);
    return json({ kind: 'limit', error: 'SLOW_DOWN' }, 429);
  }
  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (raw && (raw.age === 'child' || raw.ageBand === 'child')) return json({ kind: 'blocked' }, 403);
  const req = parseChat(raw);
  if (!req) return fail('BAD_REQUEST', 400);
  const v = voiceFor(req, who);
  // The Mindset door has no faith words in any reply (F8).
  const mind = req.door === 'mindset';
  const metrics: Metrics = new Map();
  let meter: { paidUntil: number | null } | null = null;
  const flush = async () => {
    for (const [metric, n] of metrics) await bump(env.DB, day, metric, n);
    if (meter) await addUserSpend(env.DB, who.installId, metrics.get('paid_spend_micro') ?? 0, meter.paidUntil, now);
  };
  const reply = (body: ChatResponse) => { ctx.waitUntil(flush()); return json(body); };
  const turns = withoutCrisisWords(req.messages.slice(-12));
  const band = v.teen ? 'teen' : 'adult';

  const crisisReply = async (kind: CrisisKind, layer: string) => {
    tally(metrics, 'crisis'); tally(metrics, `crisis:${layer}`);
    await markCrisis(env.DB, day, who.installId, req.conversation, now);
    return reply({ kind: 'crisis', ai: false, text: crisisText(kind, v.lang, band, turns[turns.length - 1].text, req.door), scripture: [], remaining: null, limit: null, reminder: false, crisis: kind });
  };
  // Crisis: never reaches admission or a model that writes answers. The floor needs no model; every
  // other message is read by a model for risk first, and with no read there is no answer.
  const crisis = await detectCrisis(turns, () => deps.risk(env, turns));
  if (crisis.fired) return crisisReply(crisis.kind, crisis.layer);
  if (crisis.read === 'down') {
    tally(metrics, 'risk_down'); tally(metrics, 'busy'); logCode('CHAT_RISK_READ_DOWN');
    return reply({ kind: 'busy', ai: false, text: busyText[v.lang], scripture: [], remaining: null, limit: null, reminder: false });
  }

  const paid = await deps.paid(env, who.installId, now);
  const fixedReply = (kind: ChatResponse['kind'], text: string) => reply({ kind, ai: false, text, scripture: [], remaining: null, limit: null, reminder: false });
  // Controls, after the crisis check so a crisis card is never withheld. The operator's kill switch
  // and the abuse throttle's 24-hour pause (controls.ts) come first.
  if (!env.IP_HASH_SECRET) return fail('IP_HASH_SECRET_MISSING', 503);
  if (await blockFor(env.DB, who.installId, now)) { tally(metrics, 'paused'); return fixedReply('paused', pausedText[v.lang]); }
  const abuse = await throttle(env.DB, env.IP_HASH_SECRET, day, who.installId, turns[turns.length - 1].text, false, now);
  if (abuse.verdict === 'paused') { tally(metrics, 'paused'); return fixedReply('paused', pausedText[v.lang]); }
  if (abuse.verdict === 'slow') { tally(metrics, `abuse_slow:${abuse.reason}`); return fixedReply('limit', slowText[v.lang]); }
  // The lane. Paid is private (the billed model only). Free goes to free models that may keep what
  // is typed, so it needs her consent first. A device whose crisis check fired today is answered on
  // the private lane for the rest of the day, paid or not: nothing near a crisis goes to a free model.
  const crisisToday = (await env.DB.prepare('SELECT crisis FROM chat_device_day WHERE day = ? AND device = ?').bind(day, who.installId).first<{ crisis: number | null }>())?.crisis === 1;
  const lane: Lane = paid.paid || crisisToday || turns.some(t => t.text === CRISIS_NOTE) ? 'paid' : 'free';
  if (lane === 'free' && req.freeConsent !== true) { tally(metrics, 'consent_needed'); return fixedReply('consent', consentText[v.lang]); }
  if (lane === 'paid') {
    // The app's paid spend today, then hers this month (controls.ts); past either, the fair-use pause,
    // never the free lane.
    const appMicro = await appSpendToday(env.DB, day);
    if (appMicro >= usd(env.CHAT_PAID_DAILY_USD, 50) * 1e6) {
      tally(metrics, 'paid_ceiling'); logCode('CHAT_PAID_CEILING', { micro: appMicro });
      return fixedReply('fair_use', fairUseText(v.lang, centralDay(now + 24 * 3600_000)));
    }
    if (paid.paid && (await userSpend(env.DB, who.installId, now)) >= userCeilingUsd(env, paid.paidUntil, now) * 1e6) {
      tally(metrics, 'user_ceiling'); logCode('CHAT_USER_CEILING');
      return fixedReply('fair_use', fairUseText(v.lang, resetsOn(now)));
    }
    if (paid.paid) meter = { paidUntil: paid.paidUntil };
  }
  const deviceLimit = paid.paid ? PAID_CHAT_MESSAGES : FREE_CHAT_MESSAGES;
  let hash: string;
  try { hash = await ipHash(env.IP_HASH_SECRET, day, request.headers.get('cf-connecting-ip') ?? '0.0.0.0'); } catch { return fail('IP_HASH_SECRET_MISSING', 503); }
  try {
    await env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(day, who.installId, req.conversation, hash, paid.paid ? 1 : 0, deviceLimit, int(env.CHAT_IP_MESSAGES_DAILY, 120), int(env.CHAT_GLOBAL_MESSAGES_DAILY, 150), now).run();
  } catch (error) {
    const code = /CHAT_(?:GLOBAL|IP|DEVICE|CONVERSATION)_LIMIT/.exec(String(error))?.[0];
    if (!code) throw error;
    tally(metrics, code.toLowerCase());
    if (code === 'CHAT_GLOBAL_LIMIT') { tally(metrics, 'no_free_model'); logCode('CHAT_NO_FREE_MODEL', { reason: 'global_ceiling' }); return reply({ kind: 'no_free_model', ai: false, text: (mind ? noFreeModelMindsetText : noFreeModelText)[v.lang], scripture: [], remaining: null, limit: null, reminder: false }); }
    return reply({ kind: 'limit', ai: false, text: (mind ? limitMindsetText : limitText)[v.lang], scripture: [], remaining: 0, limit: deviceLimit, reminder: false });
  }
  const row = await env.DB.prepare('SELECT messages, first_msg_at, last_reminder_at FROM chat_device_day WHERE day = ? AND device = ?').bind(day, who.installId)
    .first<{ messages: number; first_msg_at: number; last_reminder_at: number | null }>();
  const remaining = Math.max(0, deviceLimit - (row?.messages ?? 0));
  // SB 243: a teen is reminded at least every 3 hours of chat that this is AI and to take a break.
  let reminder = false;
  if (v.teen && row && now - (row.last_reminder_at ?? row.first_msg_at) >= THREE_HOURS) {
    reminder = true;
    await env.DB.prepare('UPDATE chat_device_day SET last_reminder_at = ? WHERE day = ? AND device = ?').bind(now, day, who.installId).run();
  }
  const last = turns[turns.length - 1].text;
  const done = (body: Omit<ChatResponse, 'remaining' | 'reminder' | 'limit'>) => reply({ ...body, remaining, reminder, limit: deviceLimit });

  // C08 floor: the honest answer, in code, whatever the model would say.
  if (IDENTITY.test(` ${last.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()} `)) return done({ kind: 'answer', ai: true, fixed: true, text: (mind ? identityMindsetText : identityText)[v.lang], scripture: [] });
  if (!mind && ROLE_SWAP.test(` ${fold(last)} `)) {
    const ref = parseReference(ROLE_VERSE);
    const verse = ref ? await lookup(env.DB, v.translation, ref) : null;
    return done({ kind: 'answer', ai: true, fixed: true, text: roleText[v.lang], scripture: verse ? [verse] : [] });
  }
  if (mind && MINDSET_FAITH_ASK.test(` ${fold(last)} `)) return done({ kind: 'answer', ai: true, fixed: true, text: mindsetFaithAskText[v.lang], scripture: [] });
  // A named verse in another translation is structure, not meaning: give the stored verse in her
  // translation with one plain line (round 3: models fell back on RT26, RT34 and q02 every run).
  if (!mind && OTHER_TRANSLATION.test(` ${fold(last)} `)) {
    const ref = namedReference(last);
    const verse = ref ? await lookup(env.DB, v.translation, ref) : null;
    if (verse) return done({ kind: 'answer', ai: true, fixed: true, text: oneTranslationText[v.lang], scripture: [verse] });
  }

  const memory = paid.paid ? await readMemory(env.DB, who.installId) : null;
  const system: Message[] = [{ role: 'system', content: v.prompt === 'mindset' ? [prompts.mindset, v.teen ? mindsetTeen : '', v.lang === 'es' ? spanishOnly : ''].filter(Boolean).join('\n') : prompts[v.prompt] }];
  if (memory) system.push({ role: 'system', content: memoryBlock(memory, v.lang) });
  // Only the last CHAT_HISTORY_TURNS turns travel to the model (a paid user's memory note carries the rest).
  const history: Message[] = turns.slice(-int(env.CHAT_HISTORY_TURNS, 6)).map(t => ({ role: t.role, content: t.text }));
  const rungs = deps.rungs(env, now, lane);
  const answerTokens = int(env.ANSWER_MAX_TOKENS, 350);
  const earlierTurns = turns.slice(0, -1).filter(t => t.role === 'user');
  const gate = { db: env.DB, lang: v.lang, translation: v.translation, teen: v.teen, door: req.door, userText: last, earlier: earlierTurns.map(t => t.text).join('\n'), afterCrisis: crisisToday || earlierTurns.some(t => t.text === CRISIS_NOTE) } as const;
  // The newest message plus her earlier ones: an echo of what she wrote ("I called 988") is not a tripwire.
  const herWords = turns.filter(t => t.role === 'user').map(t => t.text).join('\n');

  // A verse she named ("Philippians 4:20 says...") is printed in its stored words, so she can see
  // what it really says (round 4, x15).
  const named = req.door === 'faith' ? namedReference(last) : null;
  const namedVerse = named ? await lookup(env.DB, v.translation, named) : null;
  const withNamed = (scripture: Scripture[]) => namedVerse && !scripture.some(s => s.ref === namedVerse.ref) ? [namedVerse, ...scripture].slice(0, 3) : scripture;
  // Her recent answers and everyone's (keyed hashes only): the variety backstop (quality/variety.ts).
  const recent = await recentShapes(env.DB, who.installId);
  const show = (text: string, scripture: Scripture[], shape: Shape) => {
    ctx.waitUntil(saveShape(env.DB, who.installId, shape, now).catch(() => logCode('SHAPE_SAVE_FAILED')));
    if (paid.paid) ctx.waitUntil(remember(env, rungs, { installId: who.installId, day, now, paidUntil: paid.paidUntil, memory, user: last, answer: text }).catch(() => logCode('MEMORY_UPDATE_FAILED')));
    return done({ kind: 'answer', ai: true, text, scripture });
  };
  const judge = (text: string, scripture: Scripture[]) => deps.judge(env, { voice: v.prompt, question: last, text, verses: scripture.map(s => ({ ref: s.ref, text: s.text })) });
  let objection: string | null = null;
  let variety0 = false;
  // A draft that passed every safety check but repeated a recent answer, or that the judge found
  // only plain (voice_low and nothing else): shown if no later try does better. Variety and voice are
  // quality, not safety, and must never cost a real answer (round 5: 7 of 64 fell back that way).
  const spares: Array<{ text: string; scripture: Scripture[]; shape: Shape; judged: boolean }> = [];
  // Three tries, then a fixed reply. Measured round 3: with two tries 4 of 45 answers fell back.
  // Two human-written answers in this voice go in first, as an earlier exchange (one counter picks them).
  const examples = examplesFor(sampleSet(v.prompt, v.lang), v.lang, await nextSeq(env.DB, v.lang === 'es' ? 'es' : mind ? 'mindset' : 'en'));
  for (let attempt = 0; attempt < ANSWER_TRIES; attempt++) {
    const steer: Message[] = objection ? [{ role: 'system', content: variety0 ? `Your last answer needs an edit. ${objection}` : `Your last answer was not used. ${objection} Write three different new answers. Reply with JSON {"versions": [{"text": string, "references": [...]}, ...]}.` }] : [];
    const messages = [...system, ...examples, ...history.slice(0, -1), ...steer, ...history.slice(-1)];
    const out = objection
      ? await runLadder(env.DB, rungs, messages, editSchema, answerTokens * 3, metrics, isEdit)
      : await runLadder(env.DB, rungs, messages, answerSchema, answerTokens, metrics, isAnswer);
    if ('empty' in out) {
      if (attempt === 0) {
        await refund(env.DB, day, who.installId, hash);
        // Paid never falls back to a free model: if the private model is down, she is told so.
        if (lane === 'paid') { tally(metrics, 'paid_down'); logCode('CHAT_PAID_DOWN', { empty: out.empty }); return reply({ kind: 'busy', ai: false, text: paidDownText[v.lang], scripture: [], remaining: remaining + 1, reminder, limit: deviceLimit }); }
        if (out.empty === 'out') { tally(metrics, 'no_free_model'); logCode('CHAT_NO_FREE_MODEL'); return reply({ kind: 'no_free_model', ai: false, text: freeRestingText[v.lang], scripture: [], remaining: remaining + 1, reminder, limit: deviceLimit }); }
        tally(metrics, 'busy'); logCode('CHAT_BUSY');
        return reply({ kind: 'busy', ai: false, text: freeRestingText[v.lang], scripture: [], remaining: remaining + 1, reminder, limit: deviceLimit });
      }
      break;
    }
    // Every retry comes back as up to three versions in one call (r8: 9 of 61 shown answers repeated,
    // because a single retry met another recent answer, or a repeat was found only on the last try);
    // code keeps the first version that passes. Same call count, three chances.
    const drafts = hasVersions(out.data) ? (out.data as { versions: unknown[] }).versions.filter(isAnswer) as Array<{ text: string; references: string[] }> : [out.data as { text: string; references: string[] }];
    let problems: string[] = [];
    let variety = '';
    for (const [k, draft] of drafts.entries()) {
      // (c) The answer model as a third crisis detector: a draft that reaches for crisis lines is
      // replaced by the fixed crisis reply, never shown.
      const trip = tripwire(draft.text, herWords, gate.afterCrisis);
      if (trip) return crisisReply(trip, 'tripwire');
      const checked = await checkAnswer(draft, gate);
      let found = checked.ok ? [] : checked.problems;
      let edit = '';
      if (checked.ok) {
        const plainShape = shapeOf(checked.text);
        const shape = await hashShape(plainShape, env.IP_HASH_SECRET!);
        const scripture = withNamed(checked.scripture);
        found = repeats(shape, recent);
        if (found.length) { edit = varietyObjection(shape, plainShape.said, recent); spares.push({ text: checked.text, scripture, shape, judged: false }); }
        else {
          const j = await judge(checked.text, scripture);
          if (j.verdict === 'fail') found = j.which.map(w => `judge:${w}`);
          if (j.verdict === 'down') tally(metrics, 'judge_down');
          if (j.verdict !== 'down' && j.voice !== null) tally(metrics, `voice:${j.voice}`);
          if (!found.length) return show(checked.text, scripture, shape);
          if (found.length === 1 && found[0] === 'judge:voice_low') spares.push({ text: checked.text, scripture, shape, judged: true });
        }
      }
      // The next try is steered by the version closest to done: one that only repeats is edited.
      if (k === 0 || (edit && !variety)) { problems = found; variety = edit; }
    }
    if (problems.some(p => RED_LINES.has(p) || (p.startsWith('judge:') && p !== 'judge:voice_low'))) tally(metrics, 'red_line');
    for (const p of problems) tally(metrics, `gate:${p}`);
    logCode('CHAT_GATE', { attempt, problems: problems.join(',') });
    objection = variety || problems.map(objectionText).join(' ');
    variety0 = !!variety;
    if (attempt === 0) tally(metrics, 'regenerated');
  }
  // Newest first: it was written with the most guidance.
  for (const spare of spares.reverse()) {
    if (spare.judged) { tally(metrics, 'voice_waived'); return show(spare.text, spare.scripture, spare.shape); }
    const j = await judge(spare.text, spare.scripture);
    if (j.verdict === 'pass' || j.verdict === 'down' || (j.which.length === 1 && j.which[0] === 'voice_low')) { tally(metrics, 'variety_waived'); return show(spare.text, spare.scripture, spare.shape); }
    for (const w of j.which) tally(metrics, `gate:judge:${w}`);
    logCode('CHAT_GATE', { attempt: 'spare', problems: j.which.map(w => `judge:${w}`).join(',') });
  }
  // A few topics kept falling back (F5: teen grief, a seed or a debt, a cursing request, a
  // jailbreak): a short answer written by a person stands in for the plain fallback there.
  const topic = mind ? null : fallbackTopic(last, v.teen);
  if (topic) { tally(metrics, `fixed_topic:${topic}`); return done({ kind: 'answer', ai: true, fixed: true, text: topicText[topic][v.lang], scripture: [] }); }
  tally(metrics, 'fallback');
  if (mind) return done({ kind: 'fallback', ai: true, text: fallbackMindsetText[v.lang], scripture: [] });
  const verse = await refugeVerse(env.DB, v.translation);
  return done({ kind: 'fallback', ai: true, text: fallbackText[v.lang], scripture: verse ? [verse] : [] });
}
async function remember(env: Env, rungs: LadderRung[], a: { installId: string; day: string; now: number; paidUntil: number | null; memory: string | null; user: string; answer: string }): Promise<void> {
  const metrics: Metrics = new Map();
  const out = await runLadder(env.DB, rungs, [
    { role: 'system', content: summaryPrompt },
    { role: 'user', content: `Old note:\n"""\n${a.memory ?? ''}\n"""\nShe wrote:\n"""\n${a.user}\n"""\nThe answer:\n"""\n${a.answer}\n"""` },
  ], summarySchema, 300, metrics, isSummary);
  // The note's cost counts toward the app's paid spend like any answer.
  for (const [metric, n] of metrics) await bump(env.DB, a.day, metric === 'paid_spend_micro' ? metric : `memory:${metric}`, n);
  const summary = 'data' in out && typeof (out.data as { summary?: unknown }).summary === 'string' ? (out.data as { summary: string }).summary : null;
  if (summary) await saveMemory(env.DB, { installId: a.installId, day: a.day, summary, paidUntil: a.paidUntil, now: a.now });
}

/**
 * The operator's kill switch for one install (docs/OPERATIONS.md): POST {installId, reason, hours?}
 * pauses chat on it (no hours: until lifted), DELETE {installId} lifts it. Bearer CHAT_ADMIN_TOKEN;
 * without that secret the route is the named stop CHAT_ADMIN_TOKEN_MISSING.
 */
async function adminBlock(request: Request, env: Env, deps: Deps): Promise<Response> {
  if (!env.CHAT_ADMIN_TOKEN) return fail('CHAT_ADMIN_TOKEN_MISSING', 503);
  const given = new TextEncoder().encode(request.headers.get('authorization') ?? '');
  const want = new TextEncoder().encode(`Bearer ${env.CHAT_ADMIN_TOKEN}`);
  if (given.byteLength !== want.byteLength || !crypto.subtle.timingSafeEqual(given, want)) return json({ error: 'UNAUTHORIZED' }, 401);
  const b = (await request.json().catch(() => null)) as { installId?: unknown; reason?: unknown; hours?: unknown } | null;
  if (!b || typeof b.installId !== 'string' || !UUID.test(b.installId)) return fail('BAD_REQUEST', 400);
  const now = deps.now();
  if (request.method === 'DELETE') { await liftBlock(env.DB, b.installId); logCode('CHAT_BLOCK_LIFTED'); return json({ ok: true }); }
  const reason = typeof b.reason === 'string' && /^[a-z0-9_:-]{1,60}$/.test(b.reason) ? b.reason : 'operator';
  const until = typeof b.hours === 'number' && b.hours > 0 ? now + b.hours * 3600_000 : null;
  await setBlock(env.DB, b.installId, `operator:${reason}`.slice(0, 60), until, now);
  logCode('CHAT_BLOCK_SET', { reason });
  return json({ ok: true, until });
}

/** "Report this answer": the answer and a reason are kept (src/report.ts); her install id is only checked, never stored. */
async function report(request: Request, env: Env, deps: Deps): Promise<Response> {
  const now = deps.now();
  const who = await install(request, env, now, RENEW_GRACE_DAYS);
  if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  if (!(await env.CHAT_BURST.limit({ key: who.installId })).success) return json({ error: 'SLOW_DOWN' }, 429);
  const body = parseReport(await request.json().catch(() => null));
  if (!body) return fail('BAD_REQUEST', 400);
  if (!(await reserve(env.DB, centralDay(now), 'reports', REPORTS_DAILY))) { logCode('REPORT_DAILY_CAP'); return json({ error: 'SLOW_DOWN' }, 429); }
  await saveReport(env.DB, body, now);
  logCode('ANSWER_REPORTED', { reason: body.reason });
  return json({ reported: true });
}

export function createApp(deps: Deps = realDeps) {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const { pathname, protocol } = new URL(request.url);
      // Privacy policy: "Everything between the app and our service travels over HTTPS."
      if (protocol !== 'https:') return json({ error: 'HTTPS_REQUIRED' }, 403);
      const country = (request.cf as { country?: string } | undefined)?.country;
      if (country && blockedCountries.has(country)) return json({ error: 'REGION_UNAVAILABLE' }, 403);
      try {
        if (pathname === '/api/token' && request.method === 'POST') return await token(request, env, deps);
        if (pathname === '/api/token/renew' && request.method === 'POST') return await renew(request, env, deps);
        if (pathname === '/api/chat' && request.method === 'POST') return await chat(request, env, ctx, deps);
        if (pathname === '/api/report' && request.method === 'POST') return await report(request, env, deps);
        if (pathname === '/api/admin/chat-block' && (request.method === 'POST' || request.method === 'DELETE')) return await adminBlock(request, env, deps);
        if (pathname === '/api/memory' && request.method === 'DELETE') {
          // An expired token still deletes: her memory must go whenever she asks, not only within 30 days.
          const who = await install(request, env, deps.now(), RENEW_GRACE_DAYS);
          if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
          if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
          await deleteMemory(env.DB, who.installId);
          return json({ deleted: true });
        }
        return json({ error: 'NOT_FOUND' }, 404);
      } catch {
        return fail('CHAT_INTERNAL', 500);
      }
    },
    async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
      const now = deps.now();
      const rechecked = await recheckMemory(env, now).catch(() => { logCode('MEMORY_RECHECK_FAILED'); return 0; });
      const removed = await cleanup(env.DB, now);
      logCode('CHAT_CLEANUP', { ...removed, rechecked });
    },
  };
}

const app = createApp();
export default { fetch: app.fetch, scheduled: app.scheduled } satisfies ExportedHandler<Env>;
