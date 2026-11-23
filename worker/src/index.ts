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
import { addUserSpend, appSpendMonth, blockFor, capAlert, openRouterHeadroom, safetyBudgetLeft, safetyMicro, spendStatus, liftBlock, resetsOn, setBlock, throttle, userCeilingUsd, userSpend } from './controls';
import { bump, logCode, reserve } from './counts';
import { aboutScripture, CRISIS_THINKING_HEADROOM, confirmRisk, crisisLevel, crisisPrompt, crisisSchema, crisisWords, distress, floor, phraseHit, saysNotSafe, saysSafe, RISK_TAG, riskMessages, riskSchema, riskVerdict, tripwire, type CrisisKind, type CrisisLevel, type RiskVerdict, type Turn } from './crisis';
import { centralDay, pacificDay, utcDay } from './day';
import { paidStatus, recheckMemory, type Paid } from './entitlement';
import { reviewOpen, reviewStatus, reviewUnlock } from './review';
import { storyArt } from './storyart';
import { appleDeviceCheck, countFirstMessage, decideFirst, endFirst, firstActive, firstRow, type DeviceBit } from './firstprivate';
import { madeForYou } from './madeForYou.mount';
import { ipHash } from './iphash';
import { runLadder, tally, type LadderRung, type Metrics } from './ladder';
import { deleteMemory, markCrisis, readMemory, saveMemory } from './memory';
import { memoryBlock, mindsetTeen, prompts, spanishOnly, summaryPrompt, type PromptId } from './prompts';
import { gemini } from './providers/gemini';
import { openRouter, openRouterPrivate } from './providers/openrouter';
import type { Message } from './providers/types';
import { workersAi } from './providers/workers-ai';
import { checkAnswer } from './quality/answer';
import { hashShape, nextSeq, recentShapes, repeats, saveShape, shapeOf, withoutTopic, varietyObjection, type Shape } from './quality/variety';
import { examplesFor, sampleSet } from './voice/samples';
import { judgeMessages, judgeSchema, judgeVerdict, type JudgeInput, type JudgeVerdict } from './quality/judge';
import { busyText, shortBusyText, checkInQuestion, checkInText, consentText, crisisText, overflowText, freeRestingText, paidDownText, pausedText, slowText, MINDSET_FAITH_ASK, mindsetFaithAskText, ROLE_SWAP, ROLE_VERSE, roleText, fallbackMindsetText, fallbackText, fallbackTopic, regionOf, identityMindsetText, identityText, limitMindsetText, limitText, noFreeModelMindsetText, noFreeModelText, oneTranslationText, topicText, type Lang } from './replies';
import { parseReport, REPORTS_DAILY, saveReport } from './report';
import { lookup, refugeVerse, type Scripture } from './scripture';
import { fold, parseReference, type Reference } from './shared';
import { excludedTerritories, FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES, PAID_SHORT_ANSWERS_DAILY, providers, teenProviders, type Translation } from './shared';
import { issueToken, RENEW_GRACE_DAYS, verifyToken, type Install } from './token';

import type { ChatRequest, ChatResponse } from '../../app/src/chat/contract';
export type { ChatRequest, ChatResponse };

export type Deps = {
  now: () => number;
  risk: (env: Env, turns: Turn[]) => Promise<RiskVerdict>;
  /** lane: the free lane's judge has no billed backup (brain rule: free chat never touches the billed key). */
  judge: (env: Env, input: JudgeInput, lane: Lane, teen?: boolean) => Promise<JudgeVerdict>;
  /** The free lane by default (the order the privacy policy names); 'paid' is the billed, private model only.
   *  teen: no Gemini route on any lane (offGoogle); free and crisis keep only the rungs that never train (providers.mjs teenProviders). */
  rungs: (env: Env, now: number, lane?: Lane, teen?: boolean) => LadderRung[];
  paid: (env: Env, installId: string, now: number) => Promise<Paid>;
  /** Apple DeviceCheck bit0 for the private first chat (firstprivate.ts): 'new' (now set), 'used', or 'error' (fail closed). */
  deviceCheck: (env: Env, token: string, now: number) => Promise<DeviceBit>;
};

// Apple's alpha-3 territory list (providers.mjs, shared with the store script) to the alpha-2 codes Cloudflare sends.
const ALPHA2: Record<string, string> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK', EST: 'EE', FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'GR', HUN: 'HU', IRL: 'IE',
  ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU', MLT: 'MT', NLD: 'NL', POL: 'PL', PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE',
  ISL: 'IS', LIE: 'LI', NOR: 'NO', GBR: 'GB', CHE: 'CH', CHN: 'CN',
};
export const blockedCountries = new Set(excludedTerritories.map(code => ALPHA2[code] ?? code));

const VOICES = new Set<string>(['plain', 'church', 'teen', 'spanish'] satisfies ChatRequest['voice'][]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IDENTITY = /\b(?:(?:are you|are u|r u|ru|r you|you a|u a) (?:a |an |just a |just an )?(?:real|human|person|people|robot|bot|ai|a\.i\.|machine|computer|chatbot|pastor|preacher|minister|priest|god|jesus|the lord)|is this (?:a |an )?(?:bot|ai|robot|real person|human|computer)|(?:person|human|real|people) or (?:a |an )?(?:bot|robot|ai|machine|computer)|(?:bot|robot|ai|machine) or (?:a |an )?(?:real )?(?:person|human)|am i (?:talking|speaking|chatting) (?:to|with) (?:a |an )?(?:human|person|real person|bot|ai|robot|computer|pastor)|(?:eres|es esto) (?:un |una )?(?:persona|humano|humana|robot|bot|ia|inteligencia artificial|pastor|dios|jesus|real)|estoy hablando con (?:un |una )?(?:persona|humano|bot|robot|ia|pastor))\b/;
// risk: the answer model's own read of the person's safety on the last turns (no extra call).
const riskTag = { type: 'string', enum: ['none', 'low', 'high'] };
const answerSchema = { type: 'object', properties: { text: { type: 'string' }, references: { type: 'array', items: { type: 'string' }, maxItems: 3 }, risk: riskTag }, required: ['text', 'references', 'risk'], additionalProperties: false };
const DAY_MS = 86_400_000;
const CALM_TURNS = 10;
const summarySchema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false };
const editSchema = { type: 'object', properties: { versions: { type: 'array', items: answerSchema, minItems: 2, maxItems: 3 }, risk: riskTag }, required: ['versions', 'risk'], additionalProperties: false };
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
  crisis_reach: 'They asked about the Bible and wrote nothing about danger to themselves: answer the question itself, with no crisis lines or hotlines.',
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

/** free: free models; paid: the billed private model; crisis: the stronger private model a flagged conversation stays on. */
export type Lane = 'free' | 'paid' | 'crisis';
const geminiModels = (env: Env) => env.GEMINI_MODELS.split(',').map(s => s.trim()).filter(Boolean);
// The free lane's Gemini is an UNBILLED project's key (PBS_FREE_GEMINI_API_KEY); the billed key
// (PBS_GEMINI_API_KEY) is the paid lane's and is never used for free chat. A missing free key is the
// named stop PBS_FREE_GEMINI_API_KEY_MISSING: the rung is skipped, never replaced by the paid key.
const geminiRung = (env: Env, model: string, now: number): LadderRung => ({ id: `gemini-free:${model}`, google: true, call: gemini(env.PBS_FREE_GEMINI_API_KEY, model, { missing: 'PBS_FREE_GEMINI_API_KEY_MISSING', thinkingLevel: env.GEMINI_THINKING_LEVEL }), cap: int(env.GEMINI_CALLS_DAILY, 200), day: pacificDay(now) });
const usd = (value: string | undefined, fallback: number) => { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : fallback; };
/**
 * The paid lane's one rung: private, priced, with no free fallback after it. PAID_PROVIDER picks the
 * route (gemini: the billed key; workers-ai: this account; openrouter-zdr: the US zero-retention hosts
 * in PAID_HOSTS), PAID_MODEL the model, so a switch is a config change.
 */
const paidRung = (env: Env, now: number): LadderRung => {
  const provider: string = env.PAID_PROVIDER || 'gemini';
  const call = provider === 'workers-ai' ? workersAi(env.AI, env.PAID_MODEL, { thinking: false })
    : provider === 'openrouter-zdr' ? openRouterPrivate(env.OPENROUTER_API_KEY, env.PAID_MODEL, (env.PAID_HOSTS ?? '').split(',').map(h => h.trim()).filter(Boolean))
    : gemini(env.PBS_GEMINI_API_KEY, env.PAID_MODEL, { missing: 'PBS_GEMINI_API_KEY_MISSING', thinkingLevel: env.GEMINI_THINKING_LEVEL });
  // A Gemini model is a Google route on any provider (OpenRouter names Google's models google/...).
  const google = (provider !== 'workers-ai' && provider !== 'openrouter-zdr') || /^google\//i.test(env.PAID_MODEL ?? '');
  return { id: `paid-${provider}:${env.PAID_MODEL}`, google, call, cap: 1_000_000, day: utcDay(now), price: { in: usd(env.PAID_PRICE_IN_PER_M, 0.3), out: usd(env.PAID_PRICE_OUT_PER_M, 2.5), cached: usd(env.PAID_PRICE_CACHED_PER_M, usd(env.PAID_PRICE_IN_PER_M, 0.3) / 4) } };
};

/** The paid lane's private backup when PAID_PROVIDER is not Gemini: PAID_BACKUP_MODEL on the billed key. */
const paidBackupRung = (env: Env, now: number): LadderRung => ({
  id: `paid-gemini:${env.PAID_BACKUP_MODEL}`, google: true, cap: 1_000_000, day: utcDay(now),
  call: gemini(env.PBS_GEMINI_API_KEY, env.PAID_BACKUP_MODEL, { missing: 'PBS_GEMINI_API_KEY_MISSING', thinkingLevel: env.GEMINI_THINKING_LEVEL }),
  price: { in: usd(env.CRISIS_PRICE_IN_PER_M, 0.3), out: usd(env.CRISIS_PRICE_OUT_PER_M, 2.5), cached: usd(env.CRISIS_PRICE_IN_PER_M, 0.3) / 10 },
});

/** The stronger private model for a flagged conversation (CRISIS_MODEL, billed key only; never a free model). */
const crisisRung = (env: Env, now: number): LadderRung => ({
  id: `crisis-gemini:${env.CRISIS_MODEL}`, google: true, cap: 1_000_000, day: utcDay(now),
  call: gemini(env.PBS_GEMINI_API_KEY, env.CRISIS_MODEL, { missing: 'PBS_GEMINI_API_KEY_MISSING', thinkingLevel: env.CRISIS_THINKING_LEVEL }),
  price: { in: usd(env.CRISIS_PRICE_IN_PER_M, 0.3), out: usd(env.CRISIS_PRICE_OUT_PER_M, 2.5) },
});

/** Teens (13-17 and unknown age; her ruling 23 Nov 2026): Google's terms (Cloud Service Specific Terms 20(d), the
 *  Gemini API terms) bar every Gemini route, Vertex AI included, from a service likely used by under-18s. A teen's
 *  words never reach a rung marked google: this is the one filter every teen ladder passes through. */
const offGoogle = (rungs: LadderRung[]) => rungs.filter(r => !r.google);

/** A paid install meets no device, IP or app-wide message count (it is only counted). */
const PAID_UNCAPPED = 1_000_000;
const SHORT_ANSWER = { en: 'Keep this answer brief: three or four short sentences.', es: 'Responde breve: tres o cuatro frases cortas.' } as const;
async function check<T>(env: Env, now: number, chain: LadderRung | LadderRung[], messages: ReturnType<typeof riskMessages>, schema: Record<string, unknown>, maxTokens: number, read: (d: unknown) => T, ok: (v: T) => boolean, down: T, backup = true, teen = false): Promise<T> {
  const metrics: Metrics = new Map();
  // The backup reads the same words the risk read does, which may be about a crisis: only the
  // private (paid) model may see them, never a free one.
  const first = Array.isArray(chain) ? chain[0] : chain;
  const all = Array.isArray(chain) ? chain : backup && (env.PBS_GEMINI_API_KEY || ((env.PAID_PROVIDER as string) && (env.PAID_PROVIDER as string) !== 'gemini')) ? [first, paidRung(env, now)] : [first];
  // A teen's words (her question and the draft answer) never reach a Gemini backup: with none left, the read is `down`.
  const rungs = teen ? offGoogle(all) : all;
  const out = await runLadder(env.DB, rungs, messages, schema, maxTokens, metrics, d => ok(read(d)));
  // A private backup's cost counts toward the app's paid spend like any answer.
  for (const [metric, n] of metrics) await bump(env.DB, centralDay(now), metric === 'paid_spend_micro' ? metric : `${first.id}:${metric}`, n);
  return 'data' in out ? read(out.data) : down;
}

export const realDeps: Deps = {
  now: () => Date.now(),
  risk(env, turns) {
    const now = Date.now();
    const read = (id: string, model: string, cap: number) => check(env, now, { id, call: workersAi(env.AI, model, { temperature: 0 }), cap, day: utcDay(now) }, riskMessages(turns), riskSchema, 60, riskVerdict, v => v.verdict !== 'down', { verdict: 'down' } as RiskVerdict, false).then(v => { void bump(env.DB, centralDay(now), 'safety_micro', safetyMicro(model)); return v; });
    return confirmRisk(
      () => read('workers-ai-risk', env.WORKERS_AI_RISK_MODEL, int(env.WORKERS_AI_RISK_CALLS_DAILY, 400)),
      () => read('workers-ai-risk-confirm', env.WORKERS_AI_RISK_CONFIRM_MODEL, int(env.WORKERS_AI_RISK_CONFIRM_CALLS_DAILY, 100)),
    );
  },
  judge(env, input, lane, teen = false) {
    const now = Date.now();
    const first: LadderRung = { id: 'workers-ai-judge', call: workersAi(env.AI, env.WORKERS_AI_JUDGE_MODEL, { temperature: 0 }), cap: int(env.WORKERS_AI_JUDGE_CALLS_DAILY, 300), day: utcDay(now) };
    // The judge thinks before it scores (gpt-oss): it gets the budget it was calibrated with (run 10: at 200
    // tokens its reasoning used everything and 76 of 76 reads came back empty, falling to the paid backup).
    // Free chat never touches the billed key: its judge has no paid backup, and a down judge is `down`.
    // Paid chat on DeepSeek (her ruling 21 Nov 2026: all-in cost <= $0.40 per 1,000): the private paid model
    // judges first, its fixed judge prompt a cached prefix (about a quarter of gpt-oss's cost per read);
    // Workers AI's gpt-oss is its backup. Free chat keeps Workers AI only, never the billed route.
    if (lane !== 'free' && (env.PAID_PROVIDER as string) === 'openrouter-zdr') {
      const paidJudge = { ...paidRung(env, now), id: `judge-${env.PAID_PROVIDER}:${env.PAID_MODEL}` };
      return check(env, now, [paidJudge, first], judgeMessages(input), judgeSchema, int(env.JUDGE_MAX_TOKENS, 1500), judgeVerdict, v => v.verdict !== 'down', { verdict: 'down' } as JudgeVerdict, true, teen);
    }
    return check(env, now, first, judgeMessages(input), judgeSchema, int(env.JUDGE_MAX_TOKENS, 1500), judgeVerdict, v => v.verdict !== 'down', { verdict: 'down' } as JudgeVerdict, lane !== 'free', teen);
  },
  rungs(env, now, lane = 'free', teen = false) {
    // A teen (her ruling 23 Nov 2026): paid is the private route alone, never its Gemini backup; free and the
    // crisis lane are the rungs that never train (Workers AI). When those give nothing, the teen is told chat is
    // resting, and on the crisis lane gets the card and her region's lines (chat's lane_down).
    if (teen) return offGoogle(lane === 'paid' ? [paidRung(env, now)] : teenProviders.flatMap(p => freeRungs(env, now)[p.id] ?? []));
    // The private model, then (when it is not Gemini already) Gemini on the billed key: both private, both paid.
    if (lane === 'paid') return (env.PAID_PROVIDER as string) !== 'gemini' && env.PAID_BACKUP_MODEL ? [paidRung(env, now), paidBackupRung(env, now)] : [paidRung(env, now)];
    if (lane === 'crisis') return [crisisRung(env, now)];
    return providers.flatMap(p => freeRungs(env, now)[p.id] ?? []);
  },
  paid: (env, installId, now) => paidStatus(env, installId, now),
  deviceCheck: (env, token, now) => appleDeviceCheck(env, token, now),
};
/** The free rungs by provider id (providers.mjs names the order). */
function freeRungs(env: Env, now: number): Record<string, LadderRung[]> {
  return {
    'workers-ai': [{ id: 'workers-ai', call: workersAi(env.AI, env.WORKERS_AI_ANSWER_MODEL, { thinking: false }), cap: int(env.WORKERS_AI_ANSWER_CALLS_DAILY, 10), day: utcDay(now) }],
    'gemini-free': geminiModels(env).map(model => geminiRung(env, model, now)),
    'openrouter-free': [{ id: 'openrouter-free', call: openRouter(env.OPENROUTER_API_KEY, env.OPENROUTER_MODELS.split(',')), cap: int(env.OPENROUTER_CALLS_DAILY, 900), day: utcDay(now) }],
  };
}

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
  return { conversation: b.conversation, messages, door: b.door, voice: b.voice as ChatRequest['voice'], language: b.language, journey: b.journey as string | undefined, scripture: b.scripture === true, freeConsent: b.freeConsent === true, overflowConsent: b.overflowConsent === true, region: typeof b.region === 'string' && /^[A-Z]{2}$/.test(b.region) ? b.region : undefined };
}

/** Who is a teen for routing and rules: the age band inside the SIGNED token, never a request field.
 *  Anything not known to be adult is a teen (unknown age = teen). A request may only make routing
 *  stricter (a teen voice or a teen age field on an adult token), never looser. */
export const teenInstall = (install: Pick<Install, 'age'>) => install.age !== 'adult';
export const teenRoute = (install: Pick<Install, 'age'>, raw: Record<string, unknown> | null, req: Pick<ChatRequest, 'voice'>) =>
  teenInstall(install) || req.voice === 'teen' || raw?.age === 'teen' || raw?.ageBand === 'teen';

/** Mi Refugio, the Spanish voice or a Spanish phone: Spanish and the Reina-Valera 1909. Teens keep the teen rules in their language. */
export function voiceFor(req: ChatRequest, install: Install): { lang: Lang; translation: Translation; prompt: PromptId; teen: boolean } {
  const lang: Lang = req.journey === 'mi-refugio' || req.journey === 'Mi Refugio' || req.voice === 'spanish' || req.language === 'es' ? 'es' : 'en';
  const teen = teenInstall(install);
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
  // Teens' words only ever reach rungs that never train (13-17 and unknown age; teenRoute above).
  const teenOnly = teenRoute(who, raw, req);
  const me = who; const ask = req; // narrowed, for the answer function below
  // The Mindset door has no faith words in any reply (F8).
  const mind = req.door === 'mindset';
  const metrics: Metrics = new Map();
  let meter: { paidUntil: number | null } | null = null;
  const flush = async () => {
    for (const [metric, n] of metrics) await bump(env.DB, day, metric, n);
    if (meter) await addUserSpend(env.DB, who.installId, metrics.get('paid_spend_micro') ?? 0, meter.paidUntil, now);
  };
  // Which lane answered and whether the safety model ran: two words in headers, for measuring routing (no text).
  const route = { lane: 'none', safety: false };
  const reply = (body: ChatResponse) => {
    ctx.waitUntil(flush());
    return Response.json(body, { headers: { 'cache-control': 'no-store', 'x-chat-lane': route.lane, 'x-chat-safety': route.safety ? '1' : '0' } });
  };
  const turns = withoutCrisisWords(req.messages.slice(-12));
  const band = v.teen ? 'teen' : 'adult';

  const last = turns[turns.length - 1].text;
  const region = regionOf(req.region ?? (request as unknown as { cf?: { country?: string } }).cf?.country);
  const paid = await deps.paid(env, who.installId, now);
  // The private-first-chat cohort's conversion (firstprivate.ts): marked once, when the install first chats paid.
  if (paid.paid) ctx.waitUntil(env.DB.prepare('UPDATE chat_first_private SET paid_at = ? WHERE install_id = ? AND paid_at IS NULL').bind(now, who.installId).run().then(() => undefined, () => undefined));
  // This conversation's crisis state (no words kept): the stronger model stays on while signals
  // continue, then returns to normal after 10 calm turns or 24 hours, whichever is first.
  const state = await env.DB.prepare('SELECT flagged_at, calm, asked FROM chat_crisis WHERE install_id = ? AND conversation = ?').bind(who.installId, req.conversation).first<{ flagged_at: number; calm: number; asked: number }>();
  const sticky = !!state && now - state.flagged_at < DAY_MS && state.calm < CALM_TURNS;
  const flag = (asked: boolean) => env.DB.prepare('INSERT INTO chat_crisis (install_id, conversation, flagged_at, calm, asked) VALUES (?, ?, ?, 0, ?) ON CONFLICT(install_id, conversation) DO UPDATE SET flagged_at = excluded.flagged_at, calm = 0, asked = max(asked, excluded.asked)')
    .bind(who.installId, req.conversation, now, asked ? 1 : 0).run();
  const calmTurn = () => env.DB.prepare('UPDATE chat_crisis SET calm = calm + 1 WHERE install_id = ? AND conversation = ?').bind(who.installId, req.conversation).run();
  const capUsd = usd(env.PAID_AI_MONTHLY_CAP_USD, 100);

  // A high signal (owner, 21 Nov 2026): the fixed crisis card and its hotlines (by the device
  // region) at once, with words that end on "Are you safe right now?". Never stopped or locked; the
  // switch to the stronger private model is silent and never waits on her answer.
  //  - An intent phrase (the floor): fixed words, because the privacy policy promises such a message
  //    reaches no AI model, now or later.
  //  - A teen (13-17 or unknown age; her ruling 23 Nov 2026, "Card + hotline only"): fixed words, written
  //    by people, with no model call of any kind (Google's terms bar the crisis model for under-18s).
  //  - Otherwise the private crisis model writes two or three warm sentences first. Crisis always
  //    answers: past the monthly cap a paid user still gets the crisis model, a free user the fixed words.
  const crisisReply = async (kind: CrisisKind, layer: string) => {
    route.lane = 'crisis';
    tally(metrics, 'crisis'); tally(metrics, `crisis:${layer}`);
    await markCrisis(env.DB, day, who.installId, req.conversation, now);
    await flag(true);
    const card = crisisText(kind, v.lang, band, last, req.door, region);
    let checkIn = { text: checkInText[v.lang], ai: false };
    // The fixed words when the crisis model is the one that just failed (lane_down), or no model may read it (floor).
    if (!teenOnly && layer !== 'floor' && layer !== 'lane_down' && (paid.paid || (await appSpendMonth(env.DB, now)) < capUsd * 1e6)) {
      const messages: Message[] = [{ role: 'system', content: crisisPrompt(v.lang, mind) }, ...turns.slice(-4).map(t => ({ role: t.role, content: t.text }))];
      const out = await runLadder(env.DB, deps.rungs(env, now, 'crisis'), messages, crisisSchema, 600 + CRISIS_THINKING_HEADROOM, metrics, d => crisisWords(d) !== null);
      if ('data' in out) checkIn = { text: `${crisisWords(out.data)} ${checkInQuestion[v.lang]}`, ai: true };
      else { tally(metrics, 'crisis_model_down'); logCode('CHAT_CRISIS_MODEL_DOWN', { empty: out.empty }); }
    }
    return reply({ kind: 'crisis', ai: false, text: card, checkIn, scripture: [], remaining: null, limit: null, reminder: false, crisis: kind });
  };
  // The separate safety model (Workers AI, private) runs only to confirm a signal: the distress
  // pre-filter, or an answer model's own risk tag. Its own budget (SAFETY_MONTHLY_CAP_USD); past it,
  // the phrases, the tags and the crisis model's instructions carry on.
  let confirmed: CrisisLevel | null = null;
  const confirm = async (): Promise<CrisisLevel> => {
    if (confirmed) return confirmed;
    if (!(await safetyBudgetLeft(env.DB, now, usd(env.SAFETY_MONTHLY_CAP_USD, 10)))) { tally(metrics, 'safety_over_budget'); return (confirmed = { level: 'none', read: 'down' }); }
    tally(metrics, 'safety_check'); route.safety = true;
    const r = await deps.risk(env, turns).catch((): RiskVerdict => ({ verdict: 'down' }));
    confirmed = crisisLevel(turns, r);
    // Her "yes, I'm safe" to the check-in is not a new high signal: she stays on the crisis model.
    if (confirmed.level === 'high' && saysSafe(lastAssistant, last)) confirmed = { ...confirmed, level: 'low' };
    return confirmed;
  };

  // 1. Intent phrases, on every message (code, microseconds).
  const hit = phraseHit(turns);
  if (hit) return crisisReply(hit, 'floor');
  // 2. Her answer to the check-in says she is not safe, or not sure: the card again.
  const lastAssistant = turns.slice(0, -1).filter(t => t.role === 'assistant').at(-1)?.text;
  if (saysNotSafe(lastAssistant, last)) return crisisReply('selfharm', 'not_safe');
  // 3. The distress pre-filter: such a message never reaches a free model; the safety model reads it
  //    first. High is the card; anything else is answered by the crisis model, silently.
  // A conversation already on the crisis model is read every message,
  // so it stays on while signals continue and decays when they stop.
  // A crisis turn in the history with no state here (another install, or state already cleaned) is
  // treated as on: nothing near a crisis goes to a free model. Once state exists, it decays.
  const inCrisis = sticky || (!state && turns.some(t => t.text === CRISIS_NOTE));
  let lane: Lane = inCrisis ? 'crisis' : paid.paid ? 'paid' : 'free';
  if (inCrisis || distress(turns)) {
    tally(metrics, inCrisis ? 'crisis_followup' : 'prefilter');
    const c = await confirm();
    if (c.level === 'high') return crisisReply(c.kind, c.layer);
    if (c.level === 'low') await flag(false);
    lane = 'crisis';
  }

  const fixedReply = (kind: ChatResponse['kind'], text: string) => reply({ kind, ai: false, text, scripture: [], remaining: null, limit: null, reminder: false });
  // Controls, after the crisis check so a crisis card is never withheld. The operator's kill switch
  // and the abuse throttle's 24-hour pause (controls.ts) come first.
  if (!env.IP_HASH_SECRET) return fail('IP_HASH_SECRET_MISSING', 503);
  if (await blockFor(env.DB, who.installId, now)) { tally(metrics, 'paused'); return fixedReply('paused', pausedText[v.lang]); }
  const abuse = await throttle(env.DB, env.IP_HASH_SECRET, day, who.installId, last, false, now);
  if (abuse.verdict === 'paused') { tally(metrics, 'paused'); return fixedReply('paused', pausedText[v.lang]); }
  if (abuse.verdict === 'slow') { tally(metrics, `abuse_slow:${abuse.reason}`); return fixedReply('limit', slowText[v.lang]); }
  // The lane. Paid is private (the billed model only). Free goes to free models that may keep what
  // is typed, so it needs her consent first. Crisis is the stronger private model, for anyone.
  // The install's private first chat (her ruling 21 Nov 2026; firstprivate.ts): this conversation runs
  // on the paid route, counted as the free day. Past the monthly cap it stops, and the next message
  // waits for her free-chat yes: never a silent switch. Its turns never travel to a free model.
  const firstState = !paid.paid && lane === 'free' ? await firstRow(env.DB, who.installId) : null;
  const firstHistory = !!firstState && firstState.granted === 1 && firstState.conversation === req.conversation;
  let firstPrivate = firstActive(firstState, req.conversation, day);
  if (firstPrivate) {
    const appMicro = await appSpendMonth(env.DB, now);
    if (appMicro >= capUsd * 1e6) {
      await capAlert(env.DB, now, 100, appMicro, capUsd);
      await endFirst(env.DB, who.installId, 'cap', now); tally(metrics, 'first_private_cap');
      return fixedReply('consent', consentText[v.lang]);
    }
    tally(metrics, 'first_private'); lane = 'paid';
  }
  if (lane === 'free' && req.freeConsent !== true) { tally(metrics, 'consent_needed'); return fixedReply('consent', consentText[v.lang]); }
  // Paid (her ruling 21 Nov 2026): PAID_CHAT_MESSAGES (75) private messages a day, then free chat for the rest of the day,
  // only after she sees and accepts that it is not private (asked again each day). Her own monthly
  // backstop (CHAT_USER_MONTHLY_USD_*) and the app's monthly cap lead to the same choice. A paid user
  // never meets a pause: if the free lane has nothing, she is answered on the private model, briefly.
  // A crisis conversation never leaves the private crisis model.
  let overflow: 'daily' | 'monthly' | 'down' | null = null;
  if (lane !== 'free') {
    const appMicro = await appSpendMonth(env.DB, now);
    const pastCap = appMicro >= capUsd * 1e6;
    if (pastCap) { tally(metrics, 'paid_cap'); await capAlert(env.DB, now, 100, appMicro, capUsd); }
    else if (appMicro >= 0.8 * capUsd * 1e6) await capAlert(env.DB, now, 80, appMicro, capUsd);
    if (lane === 'crisis' && pastCap && !paid.paid) return crisisReply('selfharm', 'cap');
    if (lane === 'paid' && paid.paid) {
      const today = await env.DB.prepare('SELECT messages FROM chat_device_day WHERE day = ? AND device = ?').bind(day, who.installId).first<{ messages: number }>();
      if ((today?.messages ?? 0) >= PAID_CHAT_MESSAGES) overflow = 'daily';
      else if (pastCap || (await userSpend(env.DB, who.installId, now)) >= userCeilingUsd(env, paid.paidUntil, now) * 1e6) { overflow = 'monthly'; if (!pastCap) { tally(metrics, 'user_ceiling'); logCode('CHAT_USER_CEILING'); } }
      if (overflow && req.overflowConsent !== true) { tally(metrics, `overflow_ask:${overflow}`); return fixedReply('overflow_consent', overflowText(v.lang, overflow, resetsOn(now))); }
      if (overflow) { tally(metrics, `overflow:${overflow}`); lane = 'free'; }
    }
    if (paid.paid) meter = { paidUntil: paid.paidUntil };
  }
  // A paid install counts its messages but meets no device, IP or app-wide limit: those guard the free
  // models' quotas, which the ladder's own caps already keep, and she is never walled.
  // A conversation the crisis check flagged is never cut off by the free day's count (her ruling 21 Nov
  // 2026): it is counted, but meets no device, conversation, IP or app-wide limit while it stays flagged.
  // A message on the crisis lane (an earlier flag, or this message's distress read) is never walled either.
  const crisisOpen = inCrisis || lane === 'crisis';
  const unwalled = paid.paid || crisisOpen;
  if (crisisOpen && !paid.paid) tally(metrics, 'crisis_past_free_limit_open');
  const deviceLimit = unwalled ? PAID_UNCAPPED : FREE_CHAT_MESSAGES;
  let hash: string;
  try { hash = await ipHash(env.IP_HASH_SECRET, day, request.headers.get('cf-connecting-ip') ?? '0.0.0.0'); } catch { return fail('IP_HASH_SECRET_MISSING', 503); }
  try {
    await env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(day, who.installId, req.conversation, hash, unwalled ? 1 : 0, deviceLimit, unwalled ? PAID_UNCAPPED : int(env.CHAT_IP_MESSAGES_DAILY, 120), unwalled ? PAID_UNCAPPED : int(env.CHAT_GLOBAL_MESSAGES_DAILY, 150), now).run();
  } catch (error) {
    const code = /CHAT_(?:GLOBAL|IP|DEVICE|CONVERSATION)_LIMIT/.exec(String(error))?.[0];
    if (!code) throw error;
    tally(metrics, code.toLowerCase());
    if (code === 'CHAT_GLOBAL_LIMIT') { tally(metrics, 'no_free_model'); logCode('CHAT_NO_FREE_MODEL', { reason: 'global_ceiling' }); return reply({ kind: 'no_free_model', ai: false, text: (mind ? noFreeModelMindsetText : noFreeModelText)[v.lang], scripture: [], remaining: null, limit: null, reminder: false }); }
    return reply({ kind: 'limit', ai: false, text: (mind ? limitMindsetText : limitText)[v.lang], scripture: [], remaining: 0, limit: deviceLimit, reminder: false });
  }
  const row = await env.DB.prepare('SELECT messages, first_msg_at, last_reminder_at FROM chat_device_day WHERE day = ? AND device = ?').bind(day, who.installId)
    .first<{ messages: number; first_msg_at: number; last_reminder_at: number | null }>();
  // Paid: private messages left today (none counted on the free lane she chose after them).
  const remaining = paid.paid ? (overflow ? null : Math.max(0, PAID_CHAT_MESSAGES - (row?.messages ?? 0))) : crisisOpen ? null : Math.max(0, deviceLimit - (row?.messages ?? 0));
  const shownLimit = paid.paid ? (overflow ? null : PAID_CHAT_MESSAGES) : crisisOpen ? null : deviceLimit;
  // SB 243: a teen is reminded at least every 3 hours of chat that this is AI and to take a break.
  let reminder = false;
  if (v.teen && row && now - (row.last_reminder_at ?? row.first_msg_at) >= THREE_HOURS) {
    reminder = true;
    await env.DB.prepare('UPDATE chat_device_day SET last_reminder_at = ? WHERE day = ? AND device = ?').bind(now, day, who.installId).run();
  }
  // short: the free lane had nothing for a paid user after her private messages, so the private model answered briefly.
  let short = false;
  const shortBusy = () => reply({ kind: 'busy', ai: false, text: shortBusyText[v.lang], scripture: [], remaining: null, reminder, limit: null });
  const emitNow = (body: Omit<ChatResponse, 'remaining' | 'reminder' | 'limit'>) => {
    const onFirst = firstPrivate && route.lane !== 'free';
    if (onFirst) ctx.waitUntil(countFirstMessage(env.DB, me.installId).catch(() => logCode('FIRST_PRIVATE_COUNT_FAILED')));
    return reply({ ...body, remaining, reminder, limit: shownLimit, ...(overflow && route.lane === 'free' && body.kind !== 'crisis' ? { notPrivate: true } : {}), ...(onFirst ? { firstPrivate: true } : {}) });
  };
  return answerOn(lane, false);

  // One answer on a lane. An answer model that tags its own risk low or high (its "risk" field, read
  // on the last turns) sends the message to the safety model before anything is shown: high is the
  // card, low is answered again by the crisis model (once). A calm turn on the crisis lane counts
  // toward its 10.
  async function answerOn(lane: Lane, final: boolean): Promise<Response> {
  route.lane = lane;
  let tag: 'none' | 'low' | 'high' = 'none';
  const done = async (body: Omit<ChatResponse, 'remaining' | 'reminder' | 'limit'>, effects?: () => void): Promise<Response> => {
    if (tag !== 'none' && !final) {
      tally(metrics, `risk_tag:${tag}`);
      const c = await confirm();
      // With no confirmation (down, or past the safety budget) the tag decides: toward safety.
      const level = c.level === 'none' && c.read === 'down' ? tag : c.level;
      if (level === 'high') return crisisReply(c.level === 'high' ? c.kind : 'selfharm', c.level === 'high' ? c.layer : 'tag');
      if (level === 'low') { await flag(false); if (lane !== 'crisis') return answerOn('crisis', true); }
    } else if (lane === 'crisis' && tag === 'none') await calmTurn();
    effects?.();
    return emitNow(body);
  };

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

  // Her memory note is private: never sent on the free lane she chose after her private messages.
  const memory = paid.paid && lane !== 'free' ? await readMemory(env.DB, me.installId) : null;
  const system: Message[] = [{ role: 'system', content: v.prompt === 'mindset' ? [prompts.mindset, v.teen ? mindsetTeen : '', v.lang === 'es' ? spanishOnly : ''].filter(Boolean).join('\n') : prompts[v.prompt] }];
  // Fixed text first (the voice prompt, then the risk tag), so the route's prompt cache covers it; her memory note last.
  system.push({ role: 'system', content: RISK_TAG });
  if (memory) system.push({ role: 'system', content: memoryBlock(memory, v.lang) });
  // Only the last CHAT_HISTORY_TURNS turns travel to the model (a paid user's memory note carries the rest).
  // On the free lane she chose after her private messages, only the new message travels: the earlier turns were private.
  const history: Message[] = (lane === 'free' && (overflow || firstHistory) ? turns.slice(-1) : turns.slice(-int(env.CHAT_HISTORY_TURNS, 6))).map(t => ({ role: t.role, content: t.text }));
  const rungs = deps.rungs(env, now, lane, teenOnly);
  // The crisis model thinks (CRISIS_THINKING_LEVEL) and Gemini counts thinking inside the output cap:
  // at 350 it ran out mid-answer (run 10d: 21 of 48 crisis-lane answers malformed, 7 sent as busy).
  // Only the tokens used are billed, so the headroom costs nothing when unused.
  // The paid lane's own cap (PAID_ANSWER_MAX_TOKENS): DeepSeek writes the same answer in more tokens than
  // Gemini, and at 350 it stopped mid-answer on 12 of 127 (run 12). Only tokens used are billed.
  const cap = lane === 'paid' ? int(env.PAID_ANSWER_MAX_TOKENS, int(env.ANSWER_MAX_TOKENS, 350)) : int(env.ANSWER_MAX_TOKENS, 350);
  const answerTokens = (short && lane === 'paid' ? Math.round(cap / 2) : cap) + (lane === 'crisis' ? CRISIS_THINKING_HEADROOM : 0);
  if (short && lane === 'paid') system.push({ role: 'system', content: SHORT_ANSWER[v.lang] });
  const earlierTurns = turns.slice(0, -1).filter(t => t.role === 'user');
  const gate = { db: env.DB, lang: v.lang, translation: v.translation, teen: v.teen, door: ask.door, userText: last, earlier: earlierTurns.map(t => t.text).join('\n'), afterCrisis: (sticky && state?.asked === 1) || earlierTurns.some(t => t.text === CRISIS_NOTE) } as const;
  // The newest message plus her earlier ones: an echo of what she wrote ("I called 988") is not a tripwire.
  const herWords = turns.filter(t => t.role === 'user').map(t => t.text).join('\n');

  // A verse she named ("Philippians 4:20 says...") is printed in its stored words, so she can see
  // what it really says (round 4, x15).
  const named = ask.door === 'faith' ? namedReference(last) : null;
  const namedVerse = named ? await lookup(env.DB, v.translation, named) : null;
  const withNamed = (scripture: Scripture[]) => namedVerse && !scripture.some(s => s.ref === namedVerse.ref) ? [namedVerse, ...scripture].slice(0, 3) : scripture;
  // Her recent answers and everyone's (keyed hashes only): the variety backstop (quality/variety.ts).
  const recent = await recentShapes(env.DB, me.installId);
  const show = (text: string, scripture: Scripture[], shape: Shape) => done({ kind: 'answer', ai: true, text, scripture }, () => {
    ctx.waitUntil(saveShape(env.DB, me.installId, shape, now).catch(() => logCode('SHAPE_SAVE_FAILED')));
    // Her memory note is rewritten every MEMORY_EVERY messages (not every one: it is a paid call), from
    // the turns since the last rewrite, so nothing she said in between is skipped; and on her first.
    const every = Math.max(1, int(env.MEMORY_EVERY, 3));
    if (paid.paid && lane === 'paid' && (!memory || (row?.messages ?? 0) % every === 0)) {
      const since = turns.slice(-(2 * every - 1)).filter(t => t.role === 'user').map(t => t.text).join('\n');
      ctx.waitUntil(remember(env, rungs, { installId: me.installId, day, now, paidUntil: paid.paidUntil, memory, user: since, answer: text }).catch(() => logCode('MEMORY_UPDATE_FAILED')));
    } else if (paid.paid && lane === 'paid') tally(metrics, 'memory_skipped');
  });
  const judge = (text: string, scripture: Scripture[]) => deps.judge(env, { voice: v.prompt, question: last, text, verses: scripture.map(s => ({ ref: s.ref, text: s.text })) }, lane, teenOnly);
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
        await refund(env.DB, day, me.installId, hash);
        // A message on the crisis lane is never told chat is resting or busy: if the crisis model
        // gives nothing, she gets the fixed check-in and her region's lines (review of c7910f6, F2).
        if (lane === 'crisis') { tally(metrics, 'crisis_lane_down'); logCode('CHAT_CRISIS_LANE_DOWN', { empty: out.empty }); return crisisReply(confirmed && confirmed.level !== 'none' ? confirmed.kind : 'selfharm', 'lane_down'); }
        // A paid user on free chat after her private messages never meets "resting": the private model answers, briefly.
        // Those short answers are capped per person per day (her ruling: a money ceiling); then "busy".
        if (lane === 'free' && overflow && overflow !== 'down') {
          const used = (await env.DB.prepare('INSERT INTO chat_short_day (day, device, n) VALUES (?, ?, 1) ON CONFLICT(day, device) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n').bind(day, me.installId, PAID_SHORT_ANSWERS_DAILY).first<{ n: number }>())?.n;
          if (used === undefined) { tally(metrics, 'overflow_short_cap'); return shortBusy(); }
          tally(metrics, 'overflow_short'); short = true; return answerOn('paid', final);
        }
        // Free chat after the private model was down, and free has nothing either: busy, never "resting".
        if (lane === 'free' && overflow === 'down') { tally(metrics, 'paid_down_free_out'); return shortBusy(); }
        if (lane === 'paid') {
          tally(metrics, 'paid_down'); logCode('CHAT_PAID_DOWN', { empty: out.empty });
          // Short private answers when the private model is down too: busy.
          if (short) return shortBusy();
          // The private first chat's route failed: it ends here, and nothing goes to a free model until
          // she says yes on the free-chat screen (the app shows it on kind 'consent').
          if (firstPrivate) { firstPrivate = false; await endFirst(env.DB, me.installId, 'down', now); tally(metrics, 'first_private_down'); return reply({ kind: 'consent', ai: false, text: consentText[v.lang], scripture: [], remaining: null, limit: null, reminder: false }); }
          // The private model is down (a refused key, an outage): the same choice as after her private messages, never an
          // error or a blank. Her yes sends this same message on free chat; with no yes, nothing is sent.
          if (paid.paid && !overflow) {
            if (ask.overflowConsent !== true) return reply({ kind: 'overflow_consent', ai: false, text: overflowText(v.lang, 'down', resetsOn(now)), scripture: [], remaining: null, limit: null, reminder: false });
            overflow = 'down'; return answerOn('free', final);
          }
          return reply({ kind: 'busy', ai: false, text: paidDownText[v.lang], scripture: [], remaining: remaining === null ? null : remaining + 1, reminder, limit: shownLimit });
        }
        if (out.empty === 'out') { tally(metrics, 'no_free_model'); logCode('CHAT_NO_FREE_MODEL'); return reply({ kind: 'no_free_model', ai: false, text: freeRestingText[v.lang], scripture: [], remaining: remaining === null ? null : remaining + 1, reminder, limit: shownLimit }); }
        tally(metrics, 'busy'); logCode('CHAT_BUSY');
        return reply({ kind: 'busy', ai: false, text: freeRestingText[v.lang], scripture: [], remaining: remaining === null ? null : remaining + 1, reminder, limit: shownLimit });
      }
      break;
    }
    // Her risk as the answer model read it: the highest tag of the call (and of its versions).
    const tags = [out.data, ...(hasVersions(out.data) ? (out.data as { versions: unknown[] }).versions : [])].map(d => (d as { risk?: unknown } | null)?.risk);
    if (tags.includes('high')) tag = 'high'; else if (tags.includes('low') && tag === 'none') tag = 'low';
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
      let reach = false;
      if (trip) {
        // The draft reached for crisis help: the safety model reads her words and names the kind (run 12:
        // a husband's control and a coach's secret texts got the 988 card for "if you are in danger").
        // A question about Scripture that it reads as calm (the rape of Tamar) is a rewrite, not a card;
        // anything else stays a card, toward safety.
        const c = await confirm();
        if (c.level !== 'none') return crisisReply(c.kind, 'tripwire');
        if (c.read === 'down' || !aboutScripture(last)) return crisisReply(trip, 'tripwire');
        tally(metrics, 'tripwire_scripture_calm'); reach = true;
      }
      const checked = await checkAnswer(draft, gate);
      let found = checked.ok ? (reach ? ['crisis_reach'] : []) : checked.problems;
      let edit = '';
      if (checked.ok && !reach) {
        const plainShape = withoutTopic(shapeOf(checked.text), herWords);
        const shape = await hashShape(plainShape, env.IP_HASH_SECRET!);
        const scripture = withNamed(checked.scripture);
        found = repeats(shape, recent);
        if (found.length) { edit = varietyObjection(shape, plainShape.said, recent); spares.push({ text: checked.text, scripture, shape, judged: false }); }
        else {
          // The judge reads meaning where it earns its cost: Scripture, doctrine, a crisis. A Mindset answer
          // (no Scripture by rule) outside a crisis is checked by code alone (her ruling 21 Nov 2026).
          const needsJudge = scripture.length > 0 || ask.door !== 'mindset' || lane === 'crisis' || gate.afterCrisis;
          const j = needsJudge ? await judge(checked.text, scripture) : ({ verdict: 'pass', voice: null } as JudgeVerdict);
          if (!needsJudge) tally(metrics, 'judge_skipped');
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
function adminAuth(request: Request, env: Env): Response | null {
  if (!env.CHAT_ADMIN_TOKEN) return fail('CHAT_ADMIN_TOKEN_MISSING', 503);
  const given = new TextEncoder().encode(request.headers.get('authorization') ?? '');
  const want = new TextEncoder().encode(`Bearer ${env.CHAT_ADMIN_TOKEN}`);
  if (given.byteLength !== want.byteLength || !crypto.subtle.timingSafeEqual(given, want)) return json({ error: 'UNAUTHORIZED' }, 401);
  return null;
}
/** The paid-route spend this month against PAID_AI_MONTHLY_CAP_USD, and which alerts fired (80, 100). */
async function adminSpend(request: Request, env: Env, deps: Deps): Promise<Response> {
  return adminAuth(request, env) ?? json(await spendStatus(env.DB, deps.now(), usd(env.PAID_AI_MONTHLY_CAP_USD, 100)));
}
async function adminBlock(request: Request, env: Env, deps: Deps): Promise<Response> {
  const denied = adminAuth(request, env);
  if (denied) return denied;
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
// POST /api/chat/first {conversation, deviceCheck?}: is this conversation the install's private first chat?
// The app asks when the Chat tab opens, before she types, so it can say so (or show the free-chat
// consent). The Worker decides once per install (firstprivate.ts); the app's word is never the decision.
async function first(request: Request, env: Env, deps: Deps): Promise<Response> {
  const now = deps.now();
  const day = centralDay(now);
  const who = await install(request, env, now);
  if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  if (!(await env.CHAT_BURST.limit({ key: who.installId })).success) return json({ error: 'SLOW_DOWN' }, 429);
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.conversation !== 'string' || !UUID.test(b.conversation)) return fail('BAD_REQUEST', 400);
  const token = typeof b.deviceCheck === 'string' && b.deviceCheck.length > 20 && b.deviceCheck.length < 8000 ? b.deviceCheck : null;
  if (!env.IP_HASH_SECRET) return fail('IP_HASH_SECRET_MISSING', 503);
  if ((await deps.paid(env, who.installId, now)).paid) return json({ private: false });
  const ipHashed = await ipHash(env.IP_HASH_SECRET, day, request.headers.get('cf-connecting-ip') ?? '0.0.0.0');
  const pastCap = (await appSpendMonth(env.DB, now)) >= usd(env.PAID_AI_MONTHLY_CAP_USD, 100) * 1e6;
  const out = await decideFirst({ db: env.DB, installId: who.installId, conversation: b.conversation, ipHash: ipHashed, day, now, deviceToken: token, perDay: int(env.FIRST_PRIVATE_PER_DAY, 300), pastCap, deviceCheck: t => deps.deviceCheck(env, t, now) });
  await bump(env.DB, day, `first_private:${out.private ? 'yes' : out.reason}`, 1);
  return json({ private: out.private });
}

async function report(request: Request, env: Env, deps: Deps): Promise<Response> {
  const now = deps.now();
  const who = await install(request, env, now, RENEW_GRACE_DAYS);
  if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  if (!(await env.CHAT_BURST.limit({ key: who.installId })).success) return json({ error: 'SLOW_DOWN' }, 429);
  const raw = await request.json().catch(() => null);
  // "Report this session" (Made for you): the same token, burst and daily checks, then its own store.
  const session = !!raw && typeof raw === 'object' && 'session' in raw;
  const body = session ? null : parseReport(raw);
  if (!session && !body) return fail('BAD_REQUEST', 400);
  if (!(await reserve(env.DB, centralDay(now), 'reports', REPORTS_DAILY))) { logCode('REPORT_DAILY_CAP'); return json({ error: 'SLOW_DOWN' }, 429); }
  if (session) return madeForYou(env, deps, install, RENEW_GRACE_DAYS).report(who.installId, raw as { session?: unknown; reason?: unknown }, now);
  if (!body) return fail('BAD_REQUEST', 400);
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
        if (pathname.startsWith('/api/story-art/') && request.method === 'GET') return await storyArt(pathname, env.STORY_ART);
        if (pathname === '/api/chat/first' && request.method === 'POST') return await first(request, env, deps);
        if (pathname.startsWith('/api/made-for-you')) {
          const answered = await madeForYou(env, deps, install, RENEW_GRACE_DAYS).fetch(request);
          if (answered) return answered;
        }
        if (pathname === '/api/review' && request.method === 'GET') return await reviewStatus(env, deps.now());
        if (pathname === '/api/review/unlock' && request.method === 'POST') {
          const now = deps.now();
          if (!reviewOpen(env, now)) return json({ error: 'NOT_FOUND' }, 404); // off: no token check, no network call
          const who = await install(request, env, now);
          if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
          if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
          return await reviewUnlock(env, who.installId, await request.text(), { now, ip: request.headers.get('cf-connecting-ip') ?? '0.0.0.0', waitUntil: p => ctx.waitUntil(p) });
        }
        if (pathname === '/api/admin/chat-block' && (request.method === 'POST' || request.method === 'DELETE')) return await adminBlock(request, env, deps);
        if (pathname === '/api/admin/spend' && request.method === 'GET') return await adminSpend(request, env, deps);
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
      await openRouterHeadroom(env.DB, now, env.OPENROUTER_API_KEY).catch(() => logCode('OPENROUTER_KEY_UNREAD', { status: -1 }));
      logCode('CHAT_CLEANUP', { ...removed, rechecked });
      // Made for you's retention promises (her note by day 7, audio 30 days after the plan, reports at 90 days).
      const made = await madeForYou(env, deps, install, RENEW_GRACE_DAYS).scheduled().catch(() => { logCode('MADE_FOR_YOU_CLEANUP_FAILED'); return null; });
      if (made) logCode('MADE_FOR_YOU_CLEANUP', made);
    },
  };
}

const app = createApp();
export default { fetch: app.fetch, scheduled: app.scheduled } satisfies ExportedHandler<Env>;
