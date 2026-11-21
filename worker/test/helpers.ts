import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { createApp, type ChatResponse, type Deps } from '../src/index';
import type { LadderRung } from '../src/ladder';
import { RungError, type Message } from '../src/providers/types';
import type { RiskVerdict } from '../src/crisis';
import { backoff } from '../src/providers/types';

backoff.ms = () => 0; // retries are proven without real waits

export const NOW = Date.parse('2026-11-20T18:00:00Z'); // noon Central

/** A rung that replays scripted replies (or throws) and records what it was sent. */
export function scripted(id: string, replies: Array<unknown | Error>, cap = 1000) {
  const calls: Message[][] = [];
  const rung: LadderRung = {
    id, cap, day: '2026-11-20',
    call: async messages => {
      calls.push(messages);
      const next = replies.length > 1 ? replies.shift() : replies[0];
      if (next instanceof Error) throw next;
      if (next === undefined) throw new RungError('failed', 'NO_SCRIPT');
      return next;
    },
  };
  return { rung, calls };
}
export const throwing = (id = 'workers-ai') => scripted(id, [new Error('a model must not be called')]);

export type TestDeps = Deps & { riskCalls: number };
/** Default: the risk read says "none" (so every crisis test proves the floor or tripwire ALONE). */
export function deps(over: Partial<Deps> & { rungList?: LadderRung[]; riskVerdict?: RiskVerdict; paidNow?: boolean } = {}): TestDeps {
  const d: TestDeps = {
    riskCalls: 0,
    now: over.now ?? (() => NOW),
    risk: over.risk ?? (async () => { d.riskCalls++; return over.riskVerdict ?? { verdict: 'none' }; }),
    judge: over.judge ?? (async () => ({ verdict: 'pass', voice: 5 })),
    rungs: over.rungs ?? (() => over.rungList ?? []),
    paid: over.paid ?? (async () => ({ paid: over.paidNow ?? false, paidUntil: over.paidNow ? NOW + 30 * 86400_000 : null })),
    // No DeviceCheck answer by default: every first chat is the normal free lane (fail closed).
    deviceCheck: over.deviceCheck ?? (async () => 'error'),
  };
  return d;
}

let ipCounter = 0;
export const freshIp = () => `203.0.113.${(++ipCounter % 250) + 1}`;

export async function call(d: Deps, path: string, init: { method?: string; body?: unknown; token?: string; ip?: string; country?: string } = {}) {
  const app = createApp(d);
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': init.ip ?? '198.51.100.7' };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const request = new Request(`https://peacebestillapp.com${path}`, {
    method: init.method ?? 'POST', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cf: { country: init.country ?? 'US' },
  } as RequestInit);
  const ctx = createExecutionContext();
  const res = await app.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

export async function tokenFor(d: Deps, age: 'teen' | 'adult' = 'adult'): Promise<string> {
  const res = await call(d, '/api/token', { body: { age }, ip: freshIp() });
  if (res.status !== 200) throw new Error(`token ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

export const conv = () => crypto.randomUUID();
export function chatBody(text: string | string[], over: Record<string, unknown> = {}) {
  const texts = Array.isArray(text) ? text : [text];
  const messages = texts.map((t, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', text: t }));
  // The app sends freeConsent once she has said yes on the free-chat screen; tests start there.
  return { conversation: conv(), messages, door: 'faith', voice: 'plain', language: 'en', freeConsent: true, ...over };
}

export async function chat(d: Deps, text: string | string[], opts: { age?: 'teen' | 'adult'; token?: string; body?: Record<string, unknown>; ip?: string } = {}) {
  const token = opts.token ?? (await tokenFor(d, opts.age ?? 'adult'));
  const res = await call(d, '/api/chat', { body: chatBody(text, opts.body), token, ip: opts.ip });
  return { status: res.status, body: (await res.json()) as ChatResponse & { error?: string }, token };
}

export const good = (text = 'You are not alone tonight, and God stays close to a broken heart. Psalm 34:18 says so. Lord, sit close to us tonight.', references = ['Psalm 34:18']) => ({ text, references });
