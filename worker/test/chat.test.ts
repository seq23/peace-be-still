import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { buildChatRequest } from '../../app/src/chat/contract';
import { initial, type Settings } from '../../app/src/model';
import { centralDay } from '../src/day';
import { ipHash } from '../src/iphash';
import { RungError } from '../src/providers/types';
import { call, chat, chatBody, conv, deps, freshIp, good, NOW, scripted, throwing, tokenFor } from './helpers';

describe('contract with phase 1', () => {
  it("a request built from the app's Settings gets an answer (door 'faith', not 'gods-word')", async () => {
    const settings: Settings = { ...initial, door: 'faith', age: 'adult', voice: 'church', journey: 'Hush Harbor' };
    const body = buildChatRequest(settings, conv(), [{ role: 'user', text: 'My mama died last week.' }]);
    expect(body).not.toBeNull();
    const d = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    const res = await call(d, '/api/chat', { body, token: await tokenFor(d) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { kind: string; ai: boolean; scripture: Array<{ text: string }> };
    expect(json.kind).toBe('answer');
    expect(json.ai).toBe(true);
    expect(json.scripture[0].text).toContain('The LORD [is] nigh unto them that are of a broken heart');
  });
  it('the app builds no request for a child', () => {
    expect(buildChatRequest({ ...initial, door: 'faith', age: 'child' }, conv(), [{ role: 'user', text: 'hi' }])).toBeNull();
  });
});

describe('order of checks', () => {
  it('EEA, UK and Switzerland are refused before anything else', async () => {
    for (const country of ['DE', 'GB', 'CH', 'NO', 'ES']) {
      const res = await call(deps(), '/api/token', { body: { age: 'adult' }, country, ip: freshIp() });
      expect(res.status).toBe(403);
    }
    expect((await call(deps(), '/api/token', { body: { age: 'adult' }, country: 'MX', ip: freshIp() })).status).toBe(200);
  });
  it('no token, a forged token or an expired token is refused', async () => {
    const d = deps();
    expect((await call(d, '/api/chat', { body: chatBody('hi') })).status).toBe(401);
    const token = await tokenFor(d);
    const forged = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    expect((await call(d, '/api/chat', { body: chatBody('hi'), token: forged })).status).toBe(401);
    const later = deps({ now: () => NOW + 31 * 86400_000 });
    expect((await call(later, '/api/chat', { body: chatBody('hi'), token })).status).toBe(401);
  });
  it('the install id is made on the server and the token carries the age band', async () => {
    const d = deps();
    const a = await tokenFor(d, 'teen');
    const b = await tokenFor(d, 'teen');
    expect(a).not.toBe(b);
    const payload = JSON.parse(atob(a.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.age).toBe('teen');
    expect(payload.kid).toBe('k1');
    expect(payload.iid).toMatch(/^[0-9a-f-]{36}$/);
    const res = await call(d, '/api/token', { body: { age: 'adult' }, ip: freshIp() });
    const issued = (await res.json()) as { token: string; installId: string };
    expect(JSON.parse(atob(issued.token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid).toBe(issued.installId);
  });
  it('a teen token cannot be used as an adult: teen rules are forced whatever the voice', async () => {
    const rung = scripted('workers-ai', [good('That is hard. Please talk with a parent or counselor. Lord, be near.')]);
    await chat(deps({ rungList: [rung.rung] }), 'my parents fight a lot', { age: 'teen', body: { voice: 'church', age: 'adult' } });
    expect(rung.calls[0][0].content).toMatch(/teenager aged 13 to 17/);
  });
  it('a child is refused a token', async () => {
    expect((await call(deps(), '/api/token', { body: { age: 'child' }, ip: freshIp() })).status).toBe(403);
  });
  // The day's count is set just under the limit in D1, so the per-minute burst limit stays out of the way.
  const issuedToday = async (ip: string, n: number) => env.DB.prepare('INSERT OR REPLACE INTO token_ip_day VALUES (?, ?, ?)').bind(centralDay(NOW), await ipHash(env.IP_HASH_SECRET, centralDay(NOW), ip), n).run();
  it('a shared IPv4 (church Wi-Fi, CGNAT) gets 20 install tokens a day; the 21st is refused as network_limit', async () => {
    const ip = '192.0.2.77';
    await issuedToday(ip, 19);
    expect((await call(deps(), '/api/token', { body: { age: 'adult' }, ip })).status).toBe(200);
    const last = await call(deps(), '/api/token', { body: { age: 'adult' }, ip });
    expect(last.status).toBe(429);
    expect(((await last.json()) as { kind: string }).kind).toBe('network_limit');
  });
  it('one IPv6 /64 gets 3 install tokens a day (another address in the same /64 counts too)', async () => {
    await issuedToday('2001:db8:77:1::1', 2);
    expect((await call(deps(), '/api/token', { body: { age: 'adult' }, ip: '2001:db8:77:1::2' })).status).toBe(200);
    expect((await call(deps(), '/api/token', { body: { age: 'adult' }, ip: '2001:db8:77:1::3' })).status).toBe(429);
  });
});

describe('Mi Refugio', () => {
  it('a Spanish teen in Mi Refugio gets the Spanish teen rules and RV1909 text from the store', async () => {
    const rung = scripted('workers-ai', [{ text: 'Duele mucho, y Dios está cerca. Habla con tu mamá o con un consejero de la escuela. Señor, acompáñalo.', references: ['Salmos 34:18'] }]);
    const settings: Settings = { ...initial, door: 'faith', age: 'teen', voice: 'teen', journey: 'Mi Refugio' };
    const d = deps({ rungList: [rung.rung] });
    const res = await call(d, '/api/chat', { body: buildChatRequest(settings, conv(), [{ role: 'user', text: 'mi abuela murió' }]), token: await tokenFor(d, 'teen') });
    const json = (await res.json()) as { kind: string; scripture: Array<{ translation: string; text: string }> };
    expect(json.kind).toBe('answer');
    expect(rung.calls[0][0].content).toMatch(/adolescente de 13 a 17/);
    expect(json.scripture[0].translation).toBe('RV1909');
    expect(json.scripture[0].text).toContain('Cercano está Jehová á los quebrantados de corazón');
  });
});

describe('daily limits (D1 triggers)', () => {
  it('free: one conversation of 10 messages, "remaining" counts down, then the kind limit reply', async () => {
    const d = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    const token = await tokenFor(d);
    const conversation = conv();
    const remaining = [];
    for (let i = 0; i < 10; i++) {
      const res = await call(d, '/api/chat', { body: { ...chatBody('hello'), conversation }, token });
      remaining.push(((await res.json()) as { remaining: number }).remaining);
    }
    expect(remaining).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    const over = (await (await call(d, '/api/chat', { body: { ...chatBody('hello'), conversation }, token })).json()) as { kind: string; remaining: number };
    expect(over.kind).toBe('limit');
    expect(over.remaining).toBe(0);
  });
  it('free: a second conversation the same day is refused', async () => {
    const d = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    const token = await tokenFor(d);
    expect((await chat(d, 'hello', { token })).body.kind).toBe('answer');
    expect((await chat(d, 'hello again', { token })).body.kind).toBe('limit');
  });
  it('paid status comes from the server (RevenueCat), not the request: paid:true in the body changes nothing', async () => {
    const d = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    const r = await chat(d, 'hello', { body: { paid: true } });
    expect(r.body.remaining).toBe(9);
    const paid = deps({ rungList: [scripted('workers-ai', [good()]).rung], paidNow: true });
    expect((await chat(paid, 'hello')).body.remaining).toBe(99);
  });
  it('paid: 100 messages a day, across conversations', async () => {
    const day = centralDay(NOW);
    const insert = (conversation: string) => env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, 1, 100, 1000, 100000, ?)').bind(day, 'paid-device', conversation, 'h', NOW).run();
    for (let i = 0; i < 100; i++) await insert(i % 2 ? 'a' : 'b');
    await expect(insert('c')).rejects.toThrow(/CHAT_DEVICE_LIMIT/);
  });
  it('the per-IP limit holds across devices', async () => {
    const day = centralDay(NOW);
    const insert = (device: string) => env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, 0, 10, 3, 100000, ?)').bind(day, device, 'c', 'ip-x', NOW).run();
    await insert('d1'); await insert('d2'); await insert('d3');
    await expect(insert('d4')).rejects.toThrow(/CHAT_IP_LIMIT/);
  });
  it('the global ceiling answers with the kind CHAT_NO_FREE_MODEL message, not a 429', async () => {
    const day = centralDay(NOW);
    const saved = await env.DB.prepare('SELECT messages FROM chat_global_day WHERE day = ?').bind(day).first<{ messages: number }>();
    await env.DB.prepare('INSERT OR REPLACE INTO chat_global_day VALUES (?, ?)').bind(day, Number(env.CHAT_GLOBAL_MESSAGES_DAILY)).run();
    const rung = throwing();
    const r = await chat(deps({ rungList: [rung.rung] }), 'hello').finally(() => env.DB.prepare('INSERT OR REPLACE INTO chat_global_day VALUES (?, ?)').bind(day, saved?.messages ?? 0).run());
    expect(r.status).toBe(200);
    expect(r.body.kind).toBe('no_free_model');
    expect(r.body.text).toMatch(/resting until tomorrow/);
    expect(rung.calls.length).toBe(0);
  });
  it('the day is the Central day: 23:59 and 00:00 CT are different days', async () => {
    const before = Date.parse('2026-11-21T05:59:00Z'); // 23:59 CST on 20 Nov
    const after = Date.parse('2026-11-21T06:00:00Z');  // 00:00 CST on 21 Nov
    expect(centralDay(before)).toBe('2026-11-20');
    expect(centralDay(after)).toBe('2026-11-21');
    const t0 = await tokenFor(deps());
    const at = (now: number) => deps({ now: () => now, rungList: [scripted('workers-ai', [good()]).rung] });
    expect((await chat(at(before), 'hello', { token: t0 })).body.remaining).toBe(9);
    expect((await chat(at(before), 'again', { token: t0 })).body.kind).toBe('limit'); // new conversation, same day
    expect((await chat(at(after), 'next day', { token: t0 })).body.remaining).toBe(9);
  });
});

describe('the ladder', () => {
  it('falls through a throw, a 429 and malformed JSON to the next rung', async () => {
    const a = scripted('workers-ai', [new Error('down')]);
    const b = scripted('gemini-free', [new RungError('rate_limited', 'HTTP_429')]);
    const c = scripted('openrouter-free', [{ nope: true }]);
    const e = scripted('extra', [good()]);
    const r = await chat(deps({ rungList: [a.rung, b.rung, c.rung, e.rung] }), 'hello');
    expect(r.body.kind).toBe('answer');
    expect([a.calls.length, b.calls.length, c.calls.length, e.calls.length]).toEqual([1, 1, 1, 1]);
  });
  it('a rung with no key is skipped, never fatal while another works', async () => {
    const missing = scripted('gemini-free', [new RungError('missing_key', 'PBS_GEMINI_API_KEY_MISSING')]);
    const ok = scripted('openrouter-free', [good()]);
    expect((await chat(deps({ rungList: [missing.rung, ok.rung] }), 'hello')).body.kind).toBe('answer');
  });
  it('a rung out of its daily allowance is not called', async () => {
    const capped = scripted('workers-ai', [good()], 0);
    const ok = scripted('gemini-free', [good()]);
    await chat(deps({ rungList: [capped.rung, ok.rung] }), 'hello');
    expect(capped.calls.length).toBe(0);
    expect(ok.calls.length).toBe(1);
  });
  it('every rung really out for today (at its cap, or the provider said its daily quota is used): CHAT_NO_FREE_MODEL', async () => {
    const log = vi.spyOn(console, 'log');
    const capped = scripted('workers-ai', [good()], 0);
    const daily = scripted('gemini-free:m', [new RungError('exhausted', 'HTTP_429_DAILY')]);
    const r = await chat(deps({ rungList: [capped.rung, daily.rung] }), 'hello');
    expect(r.body.kind).toBe('no_free_model');
    expect(r.body.ai).toBe(false);
    expect(log.mock.calls.flat().join('\n')).toMatch(/CHAT_NO_FREE_MODEL/);
    log.mockRestore();
    // The exhausted rung is not called again today: its counter was set to its cap.
    await chat(deps({ rungList: [daily.rung] }), 'hello again');
    expect(daily.calls.length).toBe(1);
  });
  it('a rung that only failed (503, network, a per-minute 429) is "busy": chat stays open and the message is not charged', async () => {
    const d = deps({ rungList: [scripted('gemini-free', [new RungError('failed', 'HTTP_503')]).rung, scripted('openrouter-free', [new RungError('rate_limited', 'HTTP_429')]).rung] });
    const token = await tokenFor(d);
    const conversation = conv();
    const r = await call(d, '/api/chat', { token, body: { ...chatBody('hello'), conversation } });
    const body = (await r.json()) as { kind: string; text: string; remaining: number };
    expect(body.kind).toBe('busy');
    expect(body.text).not.toMatch(/resting until tomorrow/);
    expect(body.remaining).toBe(10);
    const ok = deps({ rungList: [scripted('gemini-free', [good()]).rung] });
    expect(((await (await call(ok, '/api/chat', { token, body: { ...chatBody('hello'), conversation } })).json()) as { remaining: number }).remaining).toBe(9);
  });
  it('a bad answer is regenerated once with the objection; a good second answer is used', async () => {
    const rung = scripted('workers-ai', [{ text: 'God will heal you by Friday.', references: [] }, good()]);
    const r = await chat(deps({ rungList: [rung.rung] }), 'pray for my back');
    expect(r.body.kind).toBe('answer');
    expect(rung.calls[1].some(m => m.content.includes('outcome promise'))).toBe(true);
  });
  it('the judge can fail an answer the code floor passed', async () => {
    const rung = scripted('workers-ai', [good(), good()]);
    const r = await chat(deps({ rungList: [rung.rung], judge: async () => ({ verdict: 'fail', which: ['prophecy'], voice: 5 }) }), 'hello');
    expect(r.body.kind).toBe('fallback');
  });
  it('the fallback carries Psalm 46:1 from the store in her translation', async () => {
    const bad = { text: 'Sow a seed.', references: [] };
    const en = await chat(deps({ rungList: [scripted('workers-ai', [bad]).rung] }), 'hello');
    expect(en.body.scripture[0].text).toContain('God [is] our refuge and strength');
    // Psalm 46's heading is not part of the verse she is given, and one psalm is "Psalm".
    expect(en.body.scripture[0].text).not.toMatch(/chief Musician|Alamoth/);
    expect(en.body.scripture[0].text.startsWith('God [is] our refuge')).toBe(true);
    expect(en.body.scripture[0].ref).toBe('Psalm 46:1');
    const es = await chat(deps({ rungList: [scripted('workers-ai', [{ text: 'Siembra una semilla de fe.', references: [] }]).rung] }), 'hola', { body: { language: 'es', voice: 'spanish' } });
    expect(es.body.scripture[0].text.startsWith('DIOS es nuestro amparo y fortaleza')).toBe(true);
    expect(es.body.scripture[0].ref).toBe('Salmos 46:1');
  });
});

describe('honesty and reminders', () => {
  it.each(['are you an AI?', 'is this a bot?', 'am I talking to a human?', 'are you a real pastor?', '¿eres una persona real?', 'wait r u a real person or a bot', 'ru human', 'are u a bot'])('"%s" gets the honest answer from code', async q => {
    const rung = throwing();
    const r = await chat(deps({ rungList: [rung.rung] }), q);
    expect(r.body.text).toMatch(/\bAI\b|\bIA\b/);
    expect(rung.calls.length).toBe(0);
  });
  it('a teen gets the SB 243 reminder after 3 hours of chat, then not again for 3 hours', async () => {
    const at = (h: number) => deps({ now: () => NOW + h * 3600_000, rungList: [scripted('workers-ai', [good('Hard day. Talk with a parent or counselor too. Lord, be near.')]).rung] });
    const token = await tokenFor(deps(), 'teen');
    const conversation = conv();
    const send = async (h: number) => (await call(at(h), '/api/chat', { body: { ...chatBody('hey', { voice: 'teen' }), conversation }, token })).json() as Promise<{ reminder: boolean }>;
    expect((await send(0)).reminder).toBe(false);
    expect((await send(2)).reminder).toBe(false);
    expect((await send(3)).reminder).toBe(true);
    expect((await send(4)).reminder).toBe(false);
  });
});

describe('logging and counts', () => {
  it('a sentinel in her message is in no log line and no D1 row', async () => {
    const log = vi.spyOn(console, 'log');
    const sentinel = 'ZEBRA-SENTINEL-7731';
    await chat(deps({ rungList: [scripted('workers-ai', [new Error('x')]).rung, scripted('gemini-free', [good()]).rung] }), `my sister ${sentinel} is sick`);
    expect(log.mock.calls.flat().join('\n')).not.toContain(sentinel);
    log.mockRestore();
    const tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%'").all<{ name: string }>()).results;
    for (const { name } of tables) {
      const rows = JSON.stringify((await env.DB.prepare(`SELECT * FROM ${name}`).all()).results);
      expect(rows, name).not.toContain(sentinel);
    }
  });
  it('daily counts record rungs, regenerations, fallbacks, red lines and crisis replies', async () => {
    await chat(deps({ rungList: [scripted('workers-ai', [{ text: 'God told me to tell you.', references: [] }]).rung] }), 'hello');
    await chat(deps(), 'i want to die');
    const rows = (await env.DB.prepare('SELECT metric, n FROM chat_counts WHERE day = ?').bind(centralDay(NOW)).all<{ metric: string; n: number }>()).results;
    const m = Object.fromEntries(rows.map(r => [r.metric, r.n]));
    expect(m['ok:workers-ai']).toBeGreaterThanOrEqual(2);
    expect(m.regenerated).toBeGreaterThanOrEqual(1);
    expect(m.fallback).toBeGreaterThanOrEqual(1);
    expect(m.red_line).toBeGreaterThanOrEqual(1);
    expect(m.crisis).toBeGreaterThanOrEqual(1);
  });
});

describe('the install id never changes (round 2, finding 8)', () => {
  const iid = (token: string) => JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid as string;
  it('an expired token is renewed for the SAME install id, so paid status and memory follow her', async () => {
    const d = deps();
    const token = await tokenFor(d);
    const later = deps({ now: () => NOW + 45 * 86400_000, rungList: [scripted('gemini-free', [good()]).rung] });
    expect((await call(later, '/api/chat', { body: chatBody('hi'), token })).status).toBe(401);
    const res = await call(later, '/api/token/renew', { token });
    expect(res.status).toBe(200);
    const renewed = (await res.json()) as { token: string; installId: string };
    expect(renewed.installId).toBe(iid(token));
    expect(iid(renewed.token)).toBe(iid(token));
    expect((await call(later, '/api/chat', { body: chatBody('hi'), token: renewed.token })).status).toBe(200);
  });
  it('a forged token or one over a year late is not renewed', async () => {
    const d = deps();
    const token = await tokenFor(d);
    const forged = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    expect((await call(d, '/api/token/renew', { token: forged })).status).toBe(401);
    expect((await call(deps({ now: () => NOW + 400 * 86400_000 }), '/api/token/renew', { token })).status).toBe(401);
  });
  it('DELETE /api/memory with an expired token still deletes the row', async () => {
    const d = deps({ rungList: [scripted('gemini-free', [good(), { summary: 'She is grieving.' }]).rung], paidNow: true });
    const token = await tokenFor(d);
    await chat(d, 'my mama died', { token });
    expect(await env.DB.prepare('SELECT 1 FROM chat_memory WHERE install_id = ?').bind(iid(token)).first()).not.toBeNull();
    const res = await call(deps({ now: () => NOW + 60 * 86400_000 }), '/api/memory', { method: 'DELETE', token });
    expect(res.status).toBe(200);
    expect(await env.DB.prepare('SELECT 1 FROM chat_memory WHERE install_id = ?').bind(iid(token)).first()).toBeNull();
  });
});
