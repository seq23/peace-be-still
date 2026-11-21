import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { workersAi } from '../src/providers/workers-ai';

// Judge rebuild after run 9: the stronger Workers AI chat models answer in the chat-completions shape.
describe('the Workers AI rung reads both answer shapes', () => {
  const ai = (out: unknown) => ({ run: async () => out }) as unknown as Ai;
  it('the classic { response } shape', async () => {
    expect(await workersAi(ai({ response: { pass: true } }), 'm')([], {}, 10)).toEqual({ pass: true });
  });
  it('the chat-completions { choices } shape, JSON as text', async () => {
    expect(await workersAi(ai({ choices: [{ message: { content: '{"pass":true}' } }] }), 'm')([], {}, 10)).toEqual({ pass: true });
  });
});

describe('thinking off for chat answers (run 10 root cause)', () => {
  it('a chat answer call turns thinking off; DeepSeek also gets reasoning_effort none; a check call is left as is', async () => {
    const { workersAi } = await import('../src/providers/workers-ai');
    const sent: Array<Record<string, unknown>> = [];
    const ai = { run: async (_m: string, input: Record<string, unknown>) => { sent.push(input); return { choices: [{ message: { content: '{"text":"x","references":[],"risk":"none"}' } }] }; } } as unknown as Ai;
    await workersAi(ai, '@cf/zai-org/glm-4.7-flash', { thinking: false })([{ role: 'user', content: 'hi' }], {}, 350);
    await workersAi(ai, '@cf/deepseek-ai/deepseek-v4.1-flash-1017', { thinking: false })([{ role: 'user', content: 'hi' }], {}, 350);
    await workersAi(ai, '@cf/openai/gpt-oss-120b', { temperature: 0 })([{ role: 'user', content: 'hi' }], {}, 200);
    expect(sent[0].chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(sent[0].reasoning_effort).toBeUndefined();
    expect(sent[1].reasoning_effort).toBe('none');
    expect(sent[2].chat_template_kwargs).toBeUndefined();
  });
});

describe('the private OpenRouter route', () => {
  it('an answer stopped at its cap (finish_reason length) is cut_off, not a malformed reply', async () => {
    const { openRouterPrivate } = await import('../src/providers/openrouter');
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"text":"You can rest' } }] }))) as typeof fetch;
    try { await expect(openRouterPrivate('k', 'deepseek/deepseek-v4.1-flash', ['deepinfra'])([{ role: 'user', content: 'hi' }], {}, 350)).rejects.toMatchObject({ kind: 'cut_off' }); } finally { globalThis.fetch = real; }
  });
  it('the ledger records what OpenRouter billed for the call, not the list price', async () => {
    const { openRouterPrivate } = await import('../src/providers/openrouter');
    const { runLadder } = await import('../src/ladder');
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"text":"x","references":[],"risk":"none"}' } }], usage: { cost: 0.000123, prompt_tokens: 2000, completion_tokens: 200, prompt_tokens_details: { cached_tokens: 1500 } } }))) as typeof fetch;
    const metrics = new Map<string, number>();
    try {
      await runLadder(env.DB, [{ id: 'paid-openrouter-zdr:t', cap: 1000, day: '2026-11-21', price: { in: 0.3, out: 1.2, cached: 0.006 }, call: openRouterPrivate('k', 'deepseek/deepseek-v4.1-flash', ['deepinfra']) }], [{ role: 'user', content: 'hi' }], {}, 350, metrics, () => true);
    } finally { globalThis.fetch = real; }
    expect(metrics.get('paid_spend_micro')).toBe(123);
    expect(metrics.get('tok_cached:paid-openrouter-zdr:t')).toBe(1500);
  });
  it('asks for zero retention, no data collection, the named hosts only (in order), thinking off, and the billed cost', async () => {
    const { openRouterPrivate } = await import('../src/providers/openrouter');
    let body: Record<string, any> = {};
    const real = globalThis.fetch;
    globalThis.fetch = (async (_u: string, init: RequestInit) => { body = JSON.parse(String(init.body)); return new Response(JSON.stringify({ choices: [{ message: { content: '{"text":"x","references":[],"risk":"none"}' } }] })); }) as typeof fetch;
    try { await openRouterPrivate('k', 'deepseek/deepseek-v4.1-flash', ['deepinfra'])([{ role: 'user', content: 'hi' }], {}, 350); } finally { globalThis.fetch = real; }
    expect(body.provider).toEqual({ zdr: true, data_collection: 'deny', only: ['deepinfra'], order: ['deepinfra'], allow_fallbacks: true });
    expect(body.usage).toEqual({ include: true });
    expect(body.reasoning).toEqual({ enabled: false });
  });
});
