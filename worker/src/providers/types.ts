export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
export type JsonSchema = Record<string, unknown>;
/** Why a rung gave nothing. Only 'exhausted' (the provider said today's quota is used up) and
 *  'missing_key' mean the rung is out for the day; everything else is a passing failure. */
/** cut_off: the reply hit its token cap (thinking counts inside it on Gemini) and stopped mid-answer. */
export type RungErrorKind = 'missing_key' | 'exhausted' | 'rate_limited' | 'failed' | 'malformed' | 'cut_off';
export class RungError extends Error {
  constructor(readonly kind: RungErrorKind, code: string) { super(code); }
}
/** One rung: messages in, parsed JSON out (structured output on every provider; prose is never parsed). */
/** cached: input tokens served from the route's prompt cache (part of in). */
/** usd: what the route itself billed for the call (OpenRouter's usage.cost), when it says. */
export type Usage = { in: number; out: number; think: number; cached?: number; usd?: number };
export type Rung = (messages: Message[], schema: JsonSchema, maxTokens: number, onUsage?: (u: Usage) => void) => Promise<unknown>;
export function parseJson(value: unknown): unknown {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') throw new RungError('malformed', 'NO_CONTENT');
  try { return JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new RungError('malformed', 'NOT_JSON'); }
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
/** Backoff before retry n (1-based): 1 s, then 2.5 s. Tests set it to 0. */
export const backoff: { ms: (n: number) => number } = { ms: n => (n === 1 ? 1000 : 2500) };
const TRANSIENT = new Set([500, 502, 503, 504]);

/**
 * One HTTP call with retries for passing failures: a 5xx, a network error or a per-minute 429 is
 * tried again after a short backoff (up to `retries` times). A 429 whose body says the DAILY quota
 * is used up is 'exhausted' at once (no retry): that is the only 429 that means "out for today".
 */
export async function httpJson(url: string, init: RequestInit, opts: { retries?: number; daily?: RegExp } = {}): Promise<unknown> {
  const retries = opts.retries ?? 1;
  const daily = opts.daily ?? /PerDay|per day|per-day|daily/i;
  let last: RungError = new RungError('failed', 'NETWORK');
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt) await sleep(backoff.ms(attempt));
    let res: Response;
    try { res = await fetch(url, { ...init, signal: AbortSignal.timeout(25_000) }); } catch { last = new RungError('failed', 'NETWORK'); continue; }
    if (res.ok) {
      try { return await res.json(); } catch { throw new RungError('malformed', 'NOT_JSON'); }
    }
    const body = await res.text().catch(() => '');
    if (res.status === 429) {
      if (daily.test(body)) throw new RungError('exhausted', 'HTTP_429_DAILY');
      last = new RungError('rate_limited', 'HTTP_429');
      continue;
    }
    if (TRANSIENT.has(res.status)) { last = new RungError('failed', `HTTP_${res.status}`); continue; }
    throw new RungError('failed', `HTTP_${res.status}`); // 4xx: a retry will not help
  }
  throw last;
}
