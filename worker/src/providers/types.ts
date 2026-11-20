export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
export type JsonSchema = Record<string, unknown>;
export class RungError extends Error {
  constructor(readonly kind: 'missing_key' | 'rate_limited' | 'failed' | 'malformed', code: string) { super(code); }
}
/** One rung: messages in, parsed JSON out (structured output on every provider; prose is never parsed). */
export type Rung = (messages: Message[], schema: JsonSchema, maxTokens: number) => Promise<unknown>;
export function parseJson(value: unknown): unknown {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') throw new RungError('malformed', 'NO_CONTENT');
  try { return JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new RungError('malformed', 'NOT_JSON'); }
}
export async function httpJson(url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try { res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) }); } catch { throw new RungError('failed', 'NETWORK'); }
  if (res.status === 429) { await res.body?.cancel(); throw new RungError('rate_limited', 'HTTP_429'); }
  if (!res.ok) { await res.body?.cancel(); throw new RungError('failed', `HTTP_${res.status}`); }
  return res.json();
}
