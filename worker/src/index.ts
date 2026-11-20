// Peace Be Still chat Worker: POST /api/token, POST /api/chat, DELETE /api/memory, hourly cleanup.
// Order for a chat message: region -> signed token (age band inside) -> burst limit -> body ->
// crisis (floor + Cloudflare safety read) -> paid status (RevenueCat) -> daily admission (D1)
// -> free ladder -> answer gate (+ judge) -> one regeneration -> fixed fallback -> response.
import './env';
import { cleanup } from './cleanup';
import { bump, logCode, reserve } from './counts';
import { detectCrisis, guardRead, type GuardVerdict, type Turn } from './crisis';
import { centralDay, pacificDay, utcDay } from './day';
import { paidStatus, type Paid } from './entitlement';
import { ipHash } from './iphash';
import { runLadder, tally, type LadderRung, type Metrics } from './ladder';
import { deleteMemory, markCrisis, readMemory, saveMemory } from './memory';
import { memoryBlock, prompts, summaryPrompt, type PromptId } from './prompts';
import { gemini } from './providers/gemini';
import { openRouter } from './providers/openrouter';
import type { Message } from './providers/types';
import { workersAi } from './providers/workers-ai';
import { checkAnswer } from './quality/answer';
import { judgeAnswer, type JudgeVerdict } from './quality/judge';
import { crisisText, fallbackText, identityText, limitText, noFreeModelText, type Lang } from './replies';
import { refugeVerse, type Scripture } from './scripture';
import { excludedTerritories, FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES, providers, type Translation } from './shared';
import { issueToken, verifyToken, type Install } from './token';

import type { ChatRequest, ChatResponse } from '../../app/src/chat/contract';
export type { ChatRequest, ChatResponse };

export type Deps = {
  now: () => number;
  guard: (env: Env, turns: Turn[]) => Promise<GuardVerdict>;
  judge: (env: Env, text: string) => Promise<JudgeVerdict>;
  rungs: (env: Env, now: number) => LadderRung[];
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
const IDENTITY = /\b(?:are you (?:a |an )?(?:real|human|person|people|robot|bot|ai|a\.i\.|machine|computer|chatbot|pastor|preacher|minister|priest|god|jesus|the lord)|is this (?:a |an )?(?:bot|ai|robot|real person|human|computer)|am i (?:talking|speaking|chatting) (?:to|with) (?:a |an )?(?:human|person|real person|bot|ai|robot|computer|pastor)|(?:eres|es esto) (?:un |una )?(?:persona|humano|humana|robot|bot|ia|inteligencia artificial|pastor|dios|jesus|real)|estoy hablando con (?:un |una )?(?:persona|humano|bot|robot|ia|pastor))\b/;
const answerSchema = { type: 'object', properties: { text: { type: 'string' }, references: { type: 'array', items: { type: 'string' }, maxItems: 3 } }, required: ['text', 'references'], additionalProperties: false };
const summarySchema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false };
const isAnswer = (d: unknown) => !!d && typeof (d as { text?: unknown }).text === 'string' && !!(d as { text: string }).text.trim() && Array.isArray((d as { references?: unknown }).references);
const isSummary = (d: unknown) => !!d && typeof (d as { summary?: unknown }).summary === 'string';
const RED_LINES = new Set(['first_person_divine', 'god_told_me', 'prophecy', 'salvation_claim', 'end_times_date', 'prosperity', 'money_ask', 'outcome_promise', 'stop_medicine', 'partisan', 'ethnicity_claim', 'secrecy', 'sexual_detail']);
const THREE_HOURS = 3 * 3600_000;

const int = (value: string, fallback: number) => { const n = Number.parseInt(value, 10); return Number.isSafeInteger(n) && n > 0 ? n : fallback; };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const fail = (code: string, status: number) => { logCode(code); return json({ error: code }, status); };

export const realDeps: Deps = {
  now: () => Date.now(),
  async guard(env, turns) {
    if (!(await reserve(env.DB, utcDay(Date.now()), 'calls:workers-ai-safety', int(env.WORKERS_AI_SAFETY_CALLS_DAILY, 170)))) return { verdict: 'down' };
    return guardRead(env.AI, env.WORKERS_AI_GUARD_MODEL, turns);
  },
  async judge(env, text) {
    if (!(await reserve(env.DB, utcDay(Date.now()), 'calls:workers-ai-judge', int(env.WORKERS_AI_SAFETY_CALLS_DAILY, 170)))) return { verdict: 'down' };
    return judgeAnswer(env.AI, env.WORKERS_AI_JUDGE_MODEL, text);
  },
  rungs(env, now) {
    const built: Record<string, LadderRung> = {
      'workers-ai': { id: 'workers-ai', call: workersAi(env.AI, env.WORKERS_AI_ANSWER_MODEL), cap: int(env.WORKERS_AI_ANSWER_CALLS_DAILY, 25), day: utcDay(now) },
      'gemini-free': { id: 'gemini-free', call: gemini(env.PBS_GEMINI_API_KEY, env.GEMINI_MODEL), cap: int(env.GEMINI_CALLS_DAILY, 200), day: pacificDay(now) },
      'openrouter-free': { id: 'openrouter-free', call: openRouter(env.OPENROUTER_API_KEY, env.OPENROUTER_MODELS.split(',').map(s => s.trim())), cap: int(env.OPENROUTER_CALLS_DAILY, 50), day: utcDay(now) },
    };
    return providers.map(p => built[p.id]).filter(Boolean);
  },
  paid: (env, installId, now) => paidStatus(env, installId, now),
};

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
  return { conversation: b.conversation, messages, door: b.door, voice: b.voice as ChatRequest['voice'], language: b.language, journey: b.journey as string | undefined, scripture: b.scripture === true };
}

/** Mi Refugio, the Spanish voice or a Spanish phone: Spanish and the Reina-Valera 1909. Teens keep the teen rules in their language. */
export function voiceFor(req: ChatRequest, install: Install): { lang: Lang; translation: Translation; prompt: PromptId; teen: boolean } {
  const lang: Lang = req.journey === 'Mi Refugio' || req.voice === 'spanish' || req.language === 'es' ? 'es' : 'en';
  const teen = install.age === 'teen';
  const prompt: PromptId = teen ? (lang === 'es' ? 'teen-es' : 'teen') : req.door === 'mindset' && lang === 'en' ? 'mindset' : lang === 'es' ? 'spanish' : req.voice === 'church' ? 'church' : 'plain';
  return { lang, translation: lang === 'es' ? 'RV1909' : 'KJV', prompt, teen };
}

async function token(request: Request, env: Env, deps: Deps): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { age?: unknown } | null;
  if (body?.age === 'child') return json({ kind: 'blocked' }, 403); // under 13: no chat, no install id
  if (body?.age !== 'teen' && body?.age !== 'adult') return fail('BAD_REQUEST', 400);
  const now = deps.now();
  const day = centralDay(now);
  let hash: string;
  try { hash = await ipHash(env.IP_HASH_SECRET, day, request.headers.get('cf-connecting-ip') ?? '0.0.0.0'); } catch { return fail('IP_HASH_SECRET_MISSING', 503); }
  if (!(await env.TOKEN_BURST.limit({ key: hash })).success) return json({ kind: 'limit' }, 429);
  try {
    await env.DB.prepare('INSERT INTO token_admission VALUES (?, ?, ?)').bind(day, hash, int(env.TOKENS_PER_IP_DAILY, 3)).run();
  } catch (error) {
    if (/TOKEN_IP_LIMIT/.test(String(error))) return json({ kind: 'limit' }, 429);
    throw error;
  }
  try {
    const issued = await issueToken({ kid: env.CHAT_TOKEN_KID, secret: env.CHAT_TOKEN_SECRET }, body.age, now);
    return json({ token: issued.token });
  } catch { return fail('CHAT_TOKEN_SECRET_MISSING', 503); }
}

async function install(request: Request, env: Env, now: number): Promise<Install | null | 'missing'> {
  if (!env.CHAT_TOKEN_SECRET) return 'missing';
  const header = request.headers.get('authorization') ?? '';
  return verifyToken({ kid: env.CHAT_TOKEN_KID, secret: env.CHAT_TOKEN_SECRET, previous: env.CHAT_TOKEN_SECRET_PREVIOUS }, header.startsWith('Bearer ') ? header.slice(7) : null, now);
}

async function chat(request: Request, env: Env, ctx: ExecutionContext, deps: Deps): Promise<Response> {
  const now = deps.now();
  const day = centralDay(now);
  const who = await install(request, env, now);
  if (who === 'missing') return fail('CHAT_TOKEN_SECRET_MISSING', 503);
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  if (!(await env.CHAT_BURST.limit({ key: who.installId })).success) return json({ kind: 'limit', error: 'SLOW_DOWN' }, 429);
  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (raw && (raw.age === 'child' || raw.ageBand === 'child')) return json({ kind: 'blocked' }, 403);
  const req = parseChat(raw);
  if (!req) return fail('BAD_REQUEST', 400);
  const v = voiceFor(req, who);
  const metrics: Metrics = new Map();
  const flush = async () => {
    for (const [metric, n] of metrics) await bump(env.DB, day, metric, n);
  };
  const reply = (body: ChatResponse) => { ctx.waitUntil(flush()); return json(body); };
  const turns = req.messages.slice(-12);
  const band = v.teen ? 'teen' : 'adult';

  // Crisis: never reaches admission or a model that writes answers.
  const crisis = await detectCrisis(turns, () => deps.guard(env, turns));
  if (crisis.fired) {
    tally(metrics, 'crisis'); tally(metrics, `crisis:${crisis.layer}`);
    await markCrisis(env.DB, day, who.installId, req.conversation, now);
    return reply({ kind: 'crisis', ai: false, text: crisisText(crisis.kind, v.lang, band), scripture: [], remaining: null, limit: null, reminder: false, crisis: crisis.kind });
  }
  if (crisis.guard === 'down') tally(metrics, 'guard_down');

  const paid = await deps.paid(env, who.installId, now);
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
    if (code === 'CHAT_GLOBAL_LIMIT') { tally(metrics, 'no_free_model'); logCode('CHAT_NO_FREE_MODEL', { reason: 'global_ceiling' }); return reply({ kind: 'no_free_model', ai: false, text: noFreeModelText[v.lang], scripture: [], remaining: null, limit: null, reminder: false }); }
    return reply({ kind: 'limit', ai: false, text: limitText[v.lang], scripture: [], remaining: 0, limit: deviceLimit, reminder: false });
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
  if (IDENTITY.test(` ${last.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()} `)) return done({ kind: 'answer', ai: true, text: identityText[v.lang], scripture: [] });

  const memory = paid.paid ? await readMemory(env.DB, who.installId) : null;
  const system: Message[] = [{ role: 'system', content: prompts[v.prompt] }];
  if (memory) system.push({ role: 'system', content: memoryBlock(memory, v.lang) });
  const history: Message[] = turns.map(t => ({ role: t.role, content: t.text }));
  const rungs = deps.rungs(env, now);
  const gate = { db: env.DB, lang: v.lang, translation: v.translation, teen: v.teen, door: req.door, userText: last } as const;

  let objection: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = objection ? [...system, { role: 'system' as const, content: `Your last answer was not used because of: ${objection}. Write a new answer that avoids this.` }, ...history] : [...system, ...history];
    const out = await runLadder(env.DB, rungs, messages, answerSchema, 700, metrics, isAnswer);
    if (!out) {
      if (attempt === 0) { tally(metrics, 'no_free_model'); logCode('CHAT_NO_FREE_MODEL'); return done({ kind: 'no_free_model', ai: false, text: noFreeModelText[v.lang], scripture: [] }); }
      break;
    }
    const checked = await checkAnswer(out.data, gate);
    let problems = checked.ok ? [] : checked.problems;
    if (checked.ok) {
      const j = await deps.judge(env, checked.text);
      if (j.verdict === 'fail') problems = j.which.map(w => `judge:${w}`);
      if (j.verdict === 'down') tally(metrics, 'judge_down');
    }
    if (checked.ok && !problems.length) {
      if (paid.paid) ctx.waitUntil(remember(env, rungs, { installId: who.installId, day, now, paidUntil: paid.paidUntil, memory, user: last, answer: checked.text }).catch(() => logCode('MEMORY_UPDATE_FAILED')));
      return done({ kind: 'answer', ai: true, text: checked.text, scripture: checked.scripture });
    }
    if (problems.some(p => RED_LINES.has(p) || p.startsWith('judge:'))) tally(metrics, 'red_line');
    for (const p of problems) tally(metrics, `gate:${p}`);
    objection = problems.join(', ');
    if (attempt === 0) tally(metrics, 'regenerated');
  }
  tally(metrics, 'fallback');
  const verse = await refugeVerse(env.DB, v.translation);
  return done({ kind: 'fallback', ai: true, text: fallbackText[v.lang], scripture: verse ? [verse] : [] });
}

async function remember(env: Env, rungs: LadderRung[], a: { installId: string; day: string; now: number; paidUntil: number | null; memory: string | null; user: string; answer: string }): Promise<void> {
  const metrics: Metrics = new Map();
  const out = await runLadder(env.DB, rungs, [
    { role: 'system', content: summaryPrompt },
    { role: 'user', content: `Old note:\n"""\n${a.memory ?? ''}\n"""\nShe wrote:\n"""\n${a.user}\n"""\nThe answer:\n"""\n${a.answer}\n"""` },
  ], summarySchema, 300, metrics, isSummary);
  for (const [metric, n] of metrics) await bump(env.DB, a.day, `memory:${metric}`, n);
  const summary = out && typeof (out.data as { summary?: unknown }).summary === 'string' ? (out.data as { summary: string }).summary : null;
  if (summary) await saveMemory(env.DB, { installId: a.installId, day: a.day, summary, paidUntil: a.paidUntil, now: a.now });
}

export function createApp(deps: Deps = realDeps) {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const { pathname } = new URL(request.url);
      const country = (request.cf as { country?: string } | undefined)?.country;
      if (country && blockedCountries.has(country)) return json({ error: 'REGION_UNAVAILABLE' }, 403);
      try {
        if (pathname === '/api/token' && request.method === 'POST') return await token(request, env, deps);
        if (pathname === '/api/chat' && request.method === 'POST') return await chat(request, env, ctx, deps);
        if (pathname === '/api/memory' && request.method === 'DELETE') {
          const who = await install(request, env, deps.now());
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
      const removed = await cleanup(env.DB, deps.now());
      logCode('CHAT_CLEANUP', removed);
    },
  };
}

const app = createApp();
export default { fetch: app.fetch, scheduled: app.scheduled } satisfies ExportedHandler<Env>;
