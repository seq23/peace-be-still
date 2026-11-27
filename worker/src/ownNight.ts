// POST /api/own-night/scene: "Write your own night" (her ruling 24 Nov 2026: paid only, 18+ only, Living in the end).
// She sends a wish (and who is with her); the paid private model writes one short first-person, present-tense moment
// from after it has come true, and a second read on the same private route checks it. Nothing she sends is stored:
// no D1 row holds her words, and every log line is a code. Order: signed token (adults only, from the token, never
// the request) -> burst -> body size -> fields -> paid (RevenueCat, on the server) -> operator pause -> crisis
// phrases (no model ever reads those) -> the private safety read (down = no scene) -> the app's monthly paid cap ->
// one message of today's private allowance -> write -> check -> the scene, or the crisis card, or the fixed refusal,
// or "write it yourself". A write that ends without a model answer gives the message back.
import { addUserSpend, appSpendMonth, blockFor, safetyBudgetLeft } from './controls';
import { bump, logCode, refundMessage } from './counts';
import { crisisLevel, phraseHit, type CrisisKind, type RiskVerdict, type Turn } from './crisis';
import { centralDay } from './day';
import { ipHash } from './iphash';
import { runLadder, type Metrics } from './ladder';
import { bookPaidSpend } from './madeForYou.mount';
import { sceneCheckPrompt, sceneObjections, scenePrompt } from './prompts';
import { crisisText, pausedText, regionOf, type Lang } from './replies';
import { PAID_CHAT_MESSAGES } from './shared';
import { faithContentIssues } from '../../app/src/model';
import { SCENE_BODY_MAX_BYTES, SCENE_MAX, SCENE_MESSAGE_COST, WHO_MAX, WISH_MAX } from '../../app/src/ownNight/limits';
import type { Deps } from './index';
import { refusedText, type SceneReply } from '../../app/src/ownNight/contract';
import type { Install } from './token';

type InstallReader = (request: Request, env: Env, now: number, graceDays?: number) => Promise<Install | null | 'missing'>;
const PAID_UNCAPPED = 1_000_000;
const SAFETY = new Set(['harm', 'control', 'sexual', 'minor', 'crisis']);
const REASONS = ['ok', 'harm', 'control', 'sexual', 'minor', 'crisis', 'other'] as const;
const PROBLEMS = ['harm', 'control', 'sexual', 'minor', 'crisis', 'promise', 'divine', 'not_present', 'language', 'gender', 'off'] as const;
export const sceneSchema = {
  type: 'object',
  properties: { write: { type: 'boolean' }, reason: { type: 'string', enum: REASONS }, scene: { type: 'string' }, risk: { type: 'string', enum: ['none', 'low', 'high'] } },
  required: ['write', 'reason', 'scene', 'risk'], additionalProperties: false,
};
export const checkSchema = {
  type: 'object',
  properties: { pass: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string', enum: PROBLEMS } } },
  required: ['pass', 'problems'], additionalProperties: false,
};
type Written = { write: boolean; reason: (typeof REASONS)[number]; scene: string; risk: 'none' | 'low' | 'high' };
type Checked = { pass: boolean; problems: string[] };
const isWritten = (d: unknown): d is Written => {
  const w = d as Partial<Written> | null;
  return !!w && typeof w.write === 'boolean' && REASONS.includes(w.reason as never) && typeof w.scene === 'string' && ['none', 'low', 'high'].includes(w.risk as string);
};
const isChecked = (d: unknown): d is Checked => {
  const c = d as Partial<Checked> | null;
  return !!c && typeof c.pass === 'boolean' && Array.isArray(c.problems) && c.problems.every(p => typeof p === 'string');
};
const usd = (value: string | undefined, fallback: number) => { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : fallback; };
const json = (body: SceneReply | { error: string }, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

const sentencesIn = (text: string) => text.split(/(?<=[.!?…])\s+/u).filter(s => /\p{L}/u.test(s));

/** The shape of a moment, in code (its meaning is the check model's): 2 to 4 sentences, short, no banned word. */
export function sceneShapeIssues(scene: string): string[] {
  const text = scene.trim();
  const issues: string[] = [];
  if (!text) return ['empty'];
  if (text.length > SCENE_MAX) issues.push('too_long');
  const sentences = sentencesIn(text);
  if (sentences.length < 2 || sentences.length > 4) issues.push('sentences');
  if (faithContentIssues(text).length) issues.push('banned_word');
  return issues;
}

/** What the rewrite is told about a shape miss, in words (never a line to copy). */
export function shapeObjection(scene: string, issues: string[]): string {
  const count = sentencesIn(scene.trim()).length;
  return [issues.includes('sentences') ? `It had ${count} sentence${count === 1 ? '' : 's'}.` : '', issues.includes('too_long') ? 'It was too long.' : '', issues.includes('banned_word') ? 'It used a word the rules forbid.' : '', issues.includes('empty') ? 'It was empty.' : ''].filter(Boolean).join(' ');
}

function parse(raw: unknown): { wish: string; who: string; lang: Lang; region?: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.wish !== 'string' || (b.who !== undefined && typeof b.who !== 'string')) return null;
  if (b.lang !== 'en' && b.lang !== 'es') return null;
  const wish = b.wish.trim();
  const who = typeof b.who === 'string' ? b.who.trim() : '';
  if (!wish || wish.length > WISH_MAX || who.length > WHO_MAX) return null;
  return { wish, who, lang: b.lang, region: typeof b.region === 'string' && /^[A-Z]{2}$/.test(b.region) ? b.region : undefined };
}

const hope = (wish: string, who: string) => `<hope>${wish}</hope>${who ? `\n<people>${who}</people>` : ''}`;

export async function ownNightScene(request: Request, env: Env, ctx: ExecutionContext, deps: Deps, install: InstallReader): Promise<Response> {
  const now = deps.now();
  const day = centralDay(now);
  const who = await install(request, env, now);
  if (who === 'missing') { logCode('CHAT_TOKEN_SECRET_MISSING'); return json({ error: 'CHAT_TOKEN_SECRET_MISSING' }, 503); }
  if (!who) return json({ error: 'UNAUTHORIZED' }, 401);
  // 18+ only, from the age band inside the SIGNED token (unknown age is a teen): a teen never reaches a model here.
  if (who.age !== 'adult') { logCode('OWN_NIGHT_NOT_ADULT'); return json({ error: 'ADULTS_ONLY' }, 403); }
  if (!(await env.CHAT_BURST.limit({ key: who.installId })).success) return json({ error: 'SLOW_DOWN' }, 429);
  const body = await request.text().catch(() => '');
  if (new TextEncoder().encode(body).length > SCENE_BODY_MAX_BYTES) return json({ error: 'TOO_LARGE' }, 413);
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return json({ error: 'BAD_REQUEST' }, 400); }
  // A request may only make the routing stricter: any age field that is not adult is refused like a teen token.
  const claimed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  if ((claimed.age !== undefined && claimed.age !== 'adult') || (claimed.ageBand !== undefined && claimed.ageBand !== 'adult')) return json({ error: 'ADULTS_ONLY' }, 403);
  const req = parse(raw);
  if (!req) return json({ error: 'BAD_REQUEST' }, 400);
  // Paid status is RevenueCat's word on the server, never the phone's; RevenueCat down or no key = not paid.
  const paid = await deps.paid(env, who.installId, now);
  if (!paid.paid) return json({ error: 'PAID_ONLY' }, 402);
  if (!env.IP_HASH_SECRET) { logCode('IP_HASH_SECRET_MISSING'); return json({ error: 'IP_HASH_SECRET_MISSING' }, 503); }
  if (await blockFor(env.DB, who.installId, now)) return json({ kind: 'paused', text: pausedText[req.lang] });

  const metrics: Metrics = new Map();
  const outcome = async (reply: SceneReply, refund: boolean) => {
    if (refund) await refundMessage(env.DB, day, who.installId, hashed, SCENE_MESSAGE_COST);
    await bookPaidSpend(env.DB, now, metrics, usd(env.PAID_AI_MONTHLY_CAP_USD, 100));
    await addUserSpend(env.DB, who.installId, metrics.get('paid_spend_micro') ?? 0, paid.paidUntil, now);
    const code = reply.kind === 'unavailable' ? `unavailable:${reply.reason}` : reply.kind;
    ctx.waitUntil(bump(env.DB, day, `own_night:${code}`, 1).catch(() => undefined));
    logCode('OWN_NIGHT', { outcome: code });
    return json(reply);
  };
  let hashed = '';
  const region = regionOf(req.region ?? (request as unknown as { cf?: { country?: string } }).cf?.country);
  const crisis = (kind: CrisisKind, refund: boolean) => outcome({ kind: 'crisis', crisis: kind, text: crisisText(kind, req.lang, 'adult', req.wish, 'mindset', region) }, refund);
  const turns: Turn[] = [{ role: 'user', text: req.who ? `${req.wish}\n${req.who}` : req.wish }];

  // 1. Intent phrases (code): the crisis card, and no AI model ever reads these words (the privacy policy's promise).
  const hit = phraseHit(turns);
  if (hit) return crisis(hit, false);
  // 2. The private safety model reads every wish. A signal of any level is the card; a read that cannot happen
  //    (down, or the safety budget used) is no scene: she can write it herself.
  const read: RiskVerdict = await safetyBudgetLeft(env.DB, now, usd(env.SAFETY_MONTHLY_CAP_USD, 10))
    ? await deps.risk(env, turns).catch((): RiskVerdict => ({ verdict: 'down' }))
    : { verdict: 'down' };
  const level = crisisLevel(turns, read);
  if (level.level !== 'none') return crisis(level.kind, false);
  if (level.read === 'down') return outcome({ kind: 'unavailable', reason: 'busy' }, false);
  // 3. The app's one monthly paid AI cap.
  if ((await appSpendMonth(env.DB, now)) >= usd(env.PAID_AI_MONTHLY_CAP_USD, 100) * 1e6) return outcome({ kind: 'unavailable', reason: 'cap' }, false);
  // 4. One write = SCENE_MESSAGE_COST of today's private messages, through chat's own atomic admission.
  hashed = await ipHash(env.IP_HASH_SECRET, day, request.headers.get('cf-connecting-ip') ?? '0.0.0.0');
  const current = await env.DB.prepare('SELECT conversation FROM chat_device_day WHERE day = ? AND device = ?').bind(day, who.installId).first<{ conversation: string }>();
  let admitted = 0;
  try {
    for (; admitted < SCENE_MESSAGE_COST; admitted++) {
      await env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(day, who.installId, current?.conversation ?? 'own-night', hashed, 1, PAID_CHAT_MESSAGES, PAID_UNCAPPED, PAID_UNCAPPED, now).run();
    }
  } catch (error) {
    if (!/CHAT_(?:GLOBAL|IP|DEVICE|CONVERSATION)_LIMIT/.test(String(error))) throw error;
    if (admitted) await refundMessage(env.DB, day, who.installId, hashed, admitted);
    return outcome({ kind: 'unavailable', reason: 'limit' }, false);
  }

  // 5. Write, then check, on the paid private route only (never a free model: her wish is private).
  const rungs = deps.rungs(env, now, 'paid', false);
  let objection = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      { role: 'system' as const, content: scenePrompt(req.lang) },
      ...(objection ? [{ role: 'system' as const, content: `Your last moment was not used: ${objection} Write a new one.` }] : []),
      { role: 'user' as const, content: hope(req.wish, req.who) },
    ];
    const written = await runLadder(env.DB, rungs, messages, sceneSchema, 400, metrics, isWritten);
    if ('empty' in written) return outcome({ kind: 'unavailable', reason: 'busy' }, true);
    const w = written.data as Written;
    // Its own read of her safety: any sign is the card (toward safety; nothing is written).
    if (w.risk !== 'none' || w.reason === 'crisis') return crisis('selfharm', false);
    if (!w.write || w.reason !== 'ok') return outcome({ kind: 'refused', text: refusedText[req.lang] }, false);
    const scene = w.scene.trim();
    const shape = sceneShapeIssues(scene);
    if (shape.length) { objection = `${shapeObjection(scene, shape)} Write three short sentences, each ending with a period, no more than ${SCENE_MAX} characters in all, and none of the words the rules forbid.`; continue; }
    const checked = await runLadder(env.DB, rungs, [
      { role: 'system', content: sceneCheckPrompt },
      { role: 'user', content: `Language: ${req.lang === 'es' ? 'Spanish' : 'English'}\n${hope(req.wish, req.who)}\n<moment>${scene}</moment>` },
    ], checkSchema, 200, metrics, isChecked);
    // A check that cannot be read is unsure: no scene.
    if ('empty' in checked) return outcome({ kind: 'unavailable', reason: 'busy' }, true);
    const c = checked.data as Checked;
    const problems = c.problems.filter(p => (PROBLEMS as readonly string[]).includes(p));
    if (problems.includes('crisis')) return crisis('selfharm', false);
    if (problems.some(p => SAFETY.has(p))) return outcome({ kind: 'refused', text: refusedText[req.lang] }, false);
    if (c.pass && !problems.length) {
      const left = await env.DB.prepare('SELECT messages FROM chat_device_day WHERE day = ? AND device = ?').bind(day, who.installId).first<{ messages: number }>();
      return outcome({ kind: 'scene', scene, remaining: Math.max(0, PAID_CHAT_MESSAGES - (left?.messages ?? 0)) }, false);
    }
    objection = (problems.length ? problems : ['off']).map(p => sceneObjections[p] ?? '').filter(Boolean).join(' ') || sceneObjections.off;
  }
  return outcome({ kind: 'unavailable', reason: 'busy' }, true);
}
