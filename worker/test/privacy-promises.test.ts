// One test per promise in legal/privacy.md that the chat Worker keeps (PHASES.md, "CARRIED FROM 6A").
// Each was proven failing with its code removed. Promises the Worker does not handle (what stays on
// the phone, audio files, the website, purchases inside Apple) are kept elsewhere.
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import wranglerText from '../wrangler.jsonc?raw';
import { FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES } from '../src/shared';
import { cleanup } from '../src/cleanup';
import { centralDay } from '../src/day';
import { paidStatus } from '../src/entitlement';
import { createApp, realDeps } from '../src/index';
import { MEMORY_MAX, readMemory, saveMemory } from '../src/memory';
import type { Turn } from '../src/crisis';
import { call, chat, chatBody, conv, deps, good, NOW, scripted, tokenFor } from './helpers';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const iid = (token: string) => JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid as string;
async function everyRow(): Promise<string> {
  const tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%' AND name NOT LIKE 'bible%'").all<{ name: string }>()).results;
  const out: string[] = [];
  for (const { name } of tables) out.push(name, JSON.stringify((await env.DB.prepare(`SELECT * FROM ${name}`).all()).results));
  return out.join('\n');
}
afterEach(() => vi.unstubAllGlobals());

describe('Chat', () => {
  it('providers are tried in the order the policy names: Cloudflare Workers AI, Google Gemini, OpenRouter', () => {
    const ids = realDeps.rungs(env, NOW).map(r => r.id.split(':')[0]);
    expect([...new Set(ids)]).toEqual(['workers-ai', 'gemini-free', 'openrouter-free']);
  });
  it('the birth year never leaves the phone: only the age group travels, and nothing else is kept in the token', async () => {
    const rung = scripted('workers-ai', [good()]);
    const d = deps({ rungList: [rung.rung] });
    const res = await call(d, '/api/token', { body: { age: 'adult', birthYear: 1987 }, ip: '198.51.100.40' });
    const { token } = (await res.json()) as { token: string };
    expect(Object.keys(JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')))).sort()).toEqual(['age', 'exp', 'iid', 'kid', 'v']);
    await call(d, '/api/chat', { token, body: chatBody('hello', { birthYear: 1987, birthday: '1987-04-02' }) });
    expect(rung.calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(rung.calls)).not.toMatch(/1987/);
    expect(await everyRow()).not.toMatch(/1987/);
  });
  it('messages that mention self-harm are never sent to an AI provider, now or later in the conversation', async () => {
    const seen: Turn[][] = [];
    const rung = scripted('workers-ai', [good()]);
    const d = deps({ rungList: [rung.rung], risk: async (_e, turns) => { seen.push(turns); return { verdict: 'none' }; } });
    const token = await tokenFor(d);
    const conversation = conv();
    const now = await call(d, '/api/chat', { token, body: { ...chatBody('i want to die'), conversation } });
    expect(((await now.json()) as { kind: string }).kind).toBe('crisis');
    expect(seen.length + rung.calls.length).toBe(0);
    // The next message carries the earlier one in its history: its words reach no model.
    await call(d, '/api/chat', { token, body: { ...chatBody(['i want to die', 'Please call or text 988.', 'thank you. can we talk about something else?']), conversation } });
    expect(seen.length).toBe(1);
    expect(rung.calls.length).toBeGreaterThan(0);
    expect(JSON.stringify([seen, rung.calls])).not.toMatch(/want to die/);
  });
  it('we do not store chat text: it is in no D1 row and no log line once the answer is returned', async () => {
    const log = vi.spyOn(console, 'log');
    const sentinel = 'ZEBRA-SENTINEL-7731';
    await chat(deps({ rungList: [scripted('workers-ai', [new Error('x')]).rung, scripted('gemini-free', [good()]).rung] }), `my sister ${sentinel} is sick`);
    expect(log.mock.calls.flat().join('\n')).not.toContain(sentinel);
    log.mockRestore();
    expect(await everyRow()).not.toContain(sentinel);
  });
});

describe('Paid chat memory', () => {
  it('is a short summary, at most 1,000 characters, under the anonymous install id, and only in the paid lane', async () => {
    const id = crypto.randomUUID();
    await saveMemory(env.DB, { installId: id, day: centralDay(NOW), summary: 'She is carrying a lot. '.repeat(100), paidUntil: NOW + DAY, now: NOW });
    expect((await readMemory(env.DB, id))!.length).toBeLessThanOrEqual(MEMORY_MAX);
    expect(MEMORY_MAX).toBe(1000);
    const rung = scripted('workers-ai', [good(), { summary: 'should not be saved' }]);
    const token = await tokenFor(deps());
    await chat(deps({ rungList: [rung.rung] }), 'hello', { token });
    expect(await readMemory(env.DB, iid(token))).toBeNull();
  });
  it('is kept until she deletes it in Settings (an expired token still deletes it)', async () => {
    const token = await tokenFor(deps());
    await saveMemory(env.DB, { installId: iid(token), day: centralDay(NOW), summary: 'Carrying a lot at work.', paidUntil: NOW + DAY, now: NOW });
    await env.DB.prepare('INSERT INTO answer_shape VALUES (?, ?, ?, ?, ?)').bind(iid(token), NOW, 'aa', 'bb', 'cc').run();
    expect((await call(deps({ now: () => NOW + 60 * DAY }), '/api/memory', { method: 'DELETE', token })).status).toBe(200);
    expect(await readMemory(env.DB, iid(token))).toBeNull();
    expect(await env.DB.prepare('SELECT 1 FROM answer_shape WHERE scope = ?').bind(iid(token)).first()).toBeNull();
  });
  it('is deleted 30 days after the paid plan ends, even when she never opens chat again (refund of a lifetime plan)', async () => {
    const refunded = `refunded-${crypto.randomUUID()}`;
    const active = `active-${crypto.randomUUID()}`;
    for (const id of [refunded, active]) await saveMemory(env.DB, { installId: id, day: centralDay(NOW), summary: 'Grieving her father.', paidUntil: null, now: NOW });
    vi.stubGlobal('fetch', async (url: string) => Response.json({ subscriber: { entitlements: url.includes('active-') ? { paid: { expires_date: new Date(NOW + 90 * DAY).toISOString() } } : {} } }));
    const app = createApp(deps());
    await app.scheduled({} as ScheduledController, { ...env, REVENUECAT_SECRET_KEY: 'sk_test' } as Env);
    await cleanup(env.DB, NOW + 31 * DAY);
    expect(await readMemory(env.DB, refunded)).toBeNull();
    expect(await readMemory(env.DB, active)).not.toBeNull();
  });
  it('words about self-harm or abuse are never saved to memory', async () => {
    expect(await saveMemory(env.DB, { installId: crypto.randomUUID(), day: centralDay(NOW), summary: 'She said she wants to kill herself and wants to die', paidUntil: null, now: NOW })).toBe('crisis');
  });
});

describe('The anonymous install id and limits', () => {
  it('the install id is random, made by the service, and tied to nothing she gave', async () => {
    const res = await call(deps(), '/api/token', { body: { age: 'adult', email: 'a@b.co', phone: '5551234567' }, ip: '198.51.100.41' });
    const a = (await res.json()) as { installId: string };
    const b = (await (await call(deps(), '/api/token', { body: { age: 'adult', email: 'a@b.co', phone: '5551234567' }, ip: '198.51.100.41' })).json()) as { installId: string };
    expect(a.installId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a.installId).not.toBe(b.installId);
    expect(await everyRow()).not.toMatch(/a@b\.co|5551234567/);
  });
  it('free lane: 1 conversation of up to FREE_CHAT_MESSAGES messages a day; paid lane: PAID_CHAT_MESSAGES private messages a day, then free chat only after her yes', async () => {
    const free = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    const token = await tokenFor(free);
    const conversation = conv();
    const kinds: string[] = [];
    for (let i = 0; i <= FREE_CHAT_MESSAGES; i++) kinds.push(((await (await call(free, '/api/chat', { token, body: { ...chatBody(`message ${i}`), conversation } })).json()) as { kind: string }).kind);
    expect(kinds.slice(0, FREE_CHAT_MESSAGES)).not.toContain('limit');
    expect(kinds[FREE_CHAT_MESSAGES]).toBe('limit');
    const second = await tokenFor(free);
    await call(free, '/api/chat', { token: second, body: chatBody('first') });
    expect(((await (await call(free, '/api/chat', { token: second, body: chatBody('another conversation') })).json()) as { kind: string }).kind).toBe('limit');
    // Her rulings 21 Nov 2026 (now 50 a day): the message after the last private one reaches no model until she
    // accepts free chat, which is not private.
    const freeRung = scripted('workers-ai', [good()]);
    const paidRung = scripted('gemini-paid', [good()]);
    const paid = deps({ rungs: (_e, _n, lane) => (lane === 'paid' ? [paidRung.rung] : [freeRung.rung]), paidNow: true });
    const p = await tokenFor(paid);
    await env.DB.prepare('INSERT INTO chat_device_day (day, device, conversation, messages) VALUES (?, ?, ?, ?)').bind(centralDay(NOW), iid(p), conv(), PAID_CHAT_MESSAGES - 1).run();
    expect(((await (await call(paid, '/api/chat', { token: p, body: chatBody('the last private one') })).json()) as { kind: string }).kind).toBe('answer');
    const calls = paidRung.calls.length + freeRung.calls.length;
    expect(((await (await call(paid, '/api/chat', { token: p, body: chatBody('one more') })).json()) as { kind: string }).kind).toBe('overflow_consent');
    expect(paidRung.calls.length + freeRung.calls.length).toBe(calls);
  });
  it('those counters (and everything else under the install id but memory) are deleted within 48 hours, DST weekend included', async () => {
    const day = '2026-10-31'; // the Central day before clocks fall back (a 25-hour Nov 1)
    const start = Date.parse('2026-10-31T05:00:00Z');
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO chat_device_day (day, device, conversation, messages, first_msg_at) VALUES (?, ?, ?, 1, ?)').bind(day, id, 'c', start),
      env.DB.prepare('INSERT INTO chat_ip_day VALUES (?, ?, 1)').bind(day, `ip-${id}`),
      env.DB.prepare('INSERT INTO token_ip_day VALUES (?, ?, 1)').bind(day, `ip-${id}`),
      env.DB.prepare('INSERT INTO chat_entitlement VALUES (?, 1, NULL, ?)').bind(id, start),
      env.DB.prepare('INSERT INTO answer_shape VALUES (?, ?, ?, ?, ?)').bind(id, start, 'aa', 'bb', 'cc'),
      env.DB.prepare("INSERT INTO answer_shape VALUES ('all', ?, 'dd', 'ee', 'ff')").bind(start),
    ]);
    await cleanup(env.DB, start + 48 * HOUR);
    expect(await everyRow()).not.toContain(id);
    expect(await env.DB.prepare("SELECT 1 FROM answer_shape WHERE scope = 'all' AND opener = 'dd'").first()).not.toBeNull();
  });
  it('the daily message count has no text and no identifier', async () => {
    const token = await tokenFor(deps());
    await chat(deps({ rungList: [scripted('workers-ai', [good()]).rung] }), 'COUNT-SENTINEL hello', { token });
    const counts = JSON.stringify([
      (await env.DB.prepare('SELECT * FROM chat_counts').all()).results,
      (await env.DB.prepare('SELECT * FROM chat_global_day').all()).results,
    ]);
    const hashes = (await env.DB.prepare('SELECT ip_hash FROM chat_ip_day').all<{ ip_hash: string }>()).results.map(r => r.ip_hash);
    expect(counts).not.toContain(iid(token));
    expect(counts).not.toContain('COUNT-SENTINEL');
    for (const h of hashes) expect(counts).not.toContain(h);
    expect(await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE name = 'chat_global_day' AND sql LIKE '%device%'").first()).toBeNull();
  });
});

describe('Keeping it safe', () => {
  it('IP addresses are stored only as one-way hashes: never in D1, and no request logs that carry them', async () => {
    await chat(deps({ rungList: [scripted('workers-ai', [good()]).rung] }), 'hello', { ip: '2001:db8:1:2:aaaa::1' });
    await call(deps(), '/api/token', { body: { age: 'adult' }, ip: '192.0.2.77' });
    const rows = await everyRow();
    expect(rows).not.toMatch(/2001:db8|192\.0\.2\.77/);
    const observability = JSON.parse(wranglerText.replace(/^\s*\/\/.*$/gm, '')).observability;
    expect(observability.logs?.invocation_logs).toBe(false);
  });
  it('the install id is carried in a signed token: a forged one reaches no limits and no memory', async () => {
    const token = await tokenFor(deps());
    await saveMemory(env.DB, { installId: iid(token), day: centralDay(NOW), summary: 'kept safe', paidUntil: NOW + DAY, now: NOW });
    const forged = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    const rung = scripted('workers-ai', [good()]);
    expect((await call(deps({ rungList: [rung.rung] }), '/api/chat', { token: forged, body: chatBody('hi') })).status).toBe(401);
    expect((await call(deps(), '/api/memory', { method: 'DELETE', token: forged })).status).toBe(401);
    expect(rung.calls.length).toBe(0);
    expect(await readMemory(env.DB, iid(token))).toBe('kept safe');
  });
  it('everything between the app and the service travels over HTTPS: plain HTTP is refused', async () => {
    const rung = scripted('workers-ai', [good()]);
    const token = await tokenFor(deps());
    const app = createApp(deps({ rungList: [rung.rung] }));
    const ctx = createExecutionContext();
    const res = await app.fetch(new Request('http://peacebestillapp.com/api/chat', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(chatBody('hi')) }), env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(403);
    expect(rung.calls.length).toBe(0);
  });
});

describe('Children and where the app is offered', () => {
  it('under 13: no install id is made, nothing is counted, and no chat reaches a model', async () => {
    const before = await everyRow();
    const res = await call(deps(), '/api/token', { body: { age: 'child' }, ip: '198.51.100.99' });
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toMatch(/token|installId/);
    expect(await everyRow()).toBe(before);
    const rung = scripted('workers-ai', [good()]);
    const token = await tokenFor(deps());
    expect((await call(deps({ rungList: [rung.rung] }), '/api/chat', { token, body: { ...chatBody('hi'), age: 'child' } })).status).toBe(403);
    expect(rung.calls.length).toBe(0);
  });
  it('not offered in the EEA, the UK or Switzerland: the service refuses them before any model', async () => {
    const rung = scripted('workers-ai', [good()]);
    const token = await tokenFor(deps());
    for (const country of ['DE', 'FR', 'IE', 'NO', 'GB', 'CH']) {
      expect((await call(deps(), '/api/token', { body: { age: 'adult' }, country })).status, country).toBe(403);
      expect((await call(deps({ rungList: [rung.rung] }), '/api/chat', { token, body: chatBody('hi'), country })).status, country).toBe(403);
    }
    expect(rung.calls.length).toBe(0);
  });
});

describe('Purchases', () => {
  it('RevenueCat receives only the anonymous app user id from the service', async () => {
    const sent: Array<{ url: string; init: RequestInit }> = [];
    const id = crypto.randomUUID();
    const f = (async (url: string, init: RequestInit) => { sent.push({ url, init }); return Response.json({ subscriber: { entitlements: {} } }); }) as unknown as typeof fetch;
    await paidStatus({ ...env, REVENUECAT_SECRET_KEY: 'sk_test' } as Env, id, NOW, f);
    expect(sent.map(s => s.url)).toEqual([`https://api.revenuecat.com/v1/subscribers/${id}`]);
    expect(sent[0].init.body).toBeUndefined();
    expect(sent[0].init.method ?? 'GET').toBe('GET');
  });
});
