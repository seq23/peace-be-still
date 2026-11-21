// The rungs' HTTP behaviour (round 2, finding 3): a passing failure is retried and never read as
// "out for today"; only a provider's own DAILY quota message is. OpenRouter runs :free models only.
import { afterEach, describe, expect, it, vi } from 'vitest';
import './helpers'; // sets backoff to 0
import { gemini } from '../src/providers/gemini';
import { openRouter } from '../src/providers/openrouter';
import { RungError } from '../src/providers/types';

const answer = { text: 'Rest tonight.', references: ['Psalm 4:8'] };
const geminiOk = () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] });
const orOk = (model: string) => Response.json({ model, choices: [{ message: { content: JSON.stringify(answer) } }] });
function stub(...replies: Array<() => Response | Promise<Response>>) {
  const sent: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    const next = replies.length > 1 ? replies.shift()! : replies[0];
    return next();
  });
  return sent;
}
const msgs = [{ role: 'user' as const, content: 'hi' }];
afterEach(() => vi.unstubAllGlobals());

describe('Gemini rung', () => {
  it('a 503 then ok on the same rung gives the answer (the live run had 9 of 20 calls at 503)', async () => {
    const sent = stub(() => new Response('{"error":{"status":"UNAVAILABLE"}}', { status: 503 }), geminiOk);
    expect(await gemini('k', 'gemini-3.5-flash-lite')(msgs, {}, 100)).toEqual(answer);
    expect(sent.length).toBe(2);
  });
  it('a network error then ok gives the answer', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async () => { if (n++ === 0) throw new TypeError('network'); return geminiOk(); });
    expect(await gemini('k', 'm')(msgs, {}, 100)).toEqual(answer);
  });
  it('a per-minute 429 is a passing failure; a PerDay 429 is "exhausted" at once', async () => {
    stub(() => new Response('{"error":{"details":[{"violations":[{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]}]}}', { status: 429 }));
    await expect(gemini('k', 'm')(msgs, {}, 100)).rejects.toMatchObject({ kind: 'rate_limited' });
    const sent = stub(() => new Response('{"error":{"details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}', { status: 429 }));
    await expect(gemini('k', 'm')(msgs, {}, 100)).rejects.toMatchObject({ kind: 'exhausted' });
    expect(sent.length).toBe(1);
  });
  it('503 every time is "failed" (busy), never "exhausted"', async () => {
    stub(() => new Response('', { status: 503 }));
    await expect(gemini('k', 'm')(msgs, {}, 100)).rejects.toMatchObject({ kind: 'failed' });
  });
});

describe('OpenRouter rung', () => {
  it('rotates to the next :free model when one is rate-limited upstream', async () => {
    const sent = stub(() => new Response('{"error":{"message":"temporarily rate-limited upstream"}}', { status: 429 }), () => new Response('', { status: 429 }), () => orOk('b/two:free'));
    expect(await openRouter('k', ['a/one:free', 'b/two:free'])(msgs, {}, 100)).toEqual(answer);
    expect(sent.map(s => s.body.model)).toEqual(['a/one:free', 'a/one:free', 'b/two:free']);
  });
  it('runs only ":free" ids, asks for a $0 price cap, and refuses a reply from a paid model', async () => {
    const sent = stub(() => orOk('a/paid-model'));
    await expect(openRouter('k', ['a/paid-model', 'a/paid-model:free'])(msgs, {}, 100)).rejects.toBeInstanceOf(RungError);
    expect(sent.every(s => String(s.body.model).endsWith(':free'))).toBe(true);
    expect(sent[0].body.provider).toEqual({ max_price: { prompt: 0, completion: 0, request: 0 } });
    stub(() => orOk('x'));
    await expect(openRouter('k', ['a/paid-model'])(msgs, {}, 100)).rejects.toMatchObject({ kind: 'missing_key' });
  });
  it('"free-models-per-day" means out for today', async () => {
    stub(() => new Response('{"error":{"message":"Rate limit exceeded: free-models-per-day"}}', { status: 429 }));
    await expect(openRouter('k', ['a/one:free', 'b/two:free'])(msgs, {}, 100)).rejects.toMatchObject({ kind: 'exhausted' });
  });
});
