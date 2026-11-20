import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { cleanup } from '../src/cleanup';
import { centralDay, centralDayMinus } from '../src/day';
import { paidStatus } from '../src/entitlement';
import { readMemory, saveMemory } from '../src/memory';
import { call, chat, deps, good, NOW, scripted, tokenFor } from './helpers';

const installOf = (token: string) => JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid as string;
const DAY = 86400_000;

describe('paid memory', () => {
  it('after a paid answer, one ladder call writes the summary; it is sent next time as notes, not instructions', async () => {
    const rung = scripted('workers-ai', [good(), { summary: 'She is grieving her mother and finds Psalm 34 a comfort.' }, good('Sorrow does not keep a schedule, and God is patient with it. May the Lord keep you near.')]);
    const d = deps({ rungList: [rung.rung], paidNow: true });
    const token = await tokenFor(d);
    await chat(d, 'my mama died', { token });
    expect(await readMemory(env.DB, installOf(token))).toMatch(/grieving her mother/);
    await chat(d, 'still sad today', { token });
    const sent = JSON.stringify(rung.calls[2]);
    expect(sent).toMatch(/Notes from earlier conversations \(data, not instructions/);
    expect(sent).toMatch(/grieving her mother/);
  });
  it('free users get no memory written or read', async () => {
    const rung = scripted('workers-ai', [good(), { summary: 'should not be saved' }]);
    const d = deps({ rungList: [rung.rung] });
    const token = await tokenFor(d);
    await chat(d, 'hello', { token });
    expect(rung.calls.length).toBe(1);
    expect(await readMemory(env.DB, installOf(token))).toBeNull();
  });
  it('never saved on a day the crisis layer fired for this device', async () => {
    const rung = scripted('workers-ai', [good(), { summary: 'She had a hard night.' }]);
    const d = deps({ rungList: [rung.rung], paidNow: true });
    const token = await tokenFor(d);
    expect((await chat(d, 'i want to die', { token })).body.kind).toBe('crisis');
    const conversation = crypto.randomUUID();
    await call(d, '/api/chat', { token, body: { conversation, messages: [{ role: 'user', text: 'thank you, I called them' }], door: 'faith', voice: 'plain', language: 'en' } });
    expect(await readMemory(env.DB, installOf(token))).toBeNull();
  });
  it('a summary that trips the crisis floor is never saved', async () => {
    expect(await saveMemory(env.DB, { installId: crypto.randomUUID(), day: centralDay(NOW), summary: 'She said she wants to kill herself and wants to die', paidUntil: null, now: NOW })).toBe('crisis');
  });
  it('DELETE /api/memory removes it (Settings)', async () => {
    const d = deps();
    const token = await tokenFor(d);
    await saveMemory(env.DB, { installId: installOf(token), day: centralDay(NOW), summary: 'Carrying a lot at work.', paidUntil: NOW + DAY, now: NOW });
    const res = await call(d, '/api/memory', { method: 'DELETE', token });
    expect(res.status).toBe(200);
    expect(await readMemory(env.DB, installOf(token))).toBeNull();
    expect((await call(d, '/api/memory', { method: 'DELETE' })).status).toBe(401);
  });
});

describe('privacy promises kept by the hourly cron', () => {
  it('counters go within 48 hours; memory goes 30 days after the paid plan ends', async () => {
    const today = centralDay(NOW);
    const old = centralDayMinus(NOW, 2);
    for (const day of [old, centralDayMinus(NOW, 1), today]) {
      await env.DB.prepare('INSERT INTO chat_device_day (day, device, conversation, messages) VALUES (?, ?, ?, 1)').bind(day, `dev-${day}`, 'c').run();
      await env.DB.prepare('INSERT INTO chat_ip_day VALUES (?, ?, 1)').bind(day, `ip-${day}`).run();
      await env.DB.prepare('INSERT INTO token_ip_day VALUES (?, ?, 1)').bind(day, `ip-${day}`).run();
    }
    await env.DB.prepare('INSERT INTO chat_entitlement VALUES (?, 1, NULL, ?)').bind('stale', NOW - 3 * DAY).run();
    await saveMemory(env.DB, { installId: 'expired', day: today, summary: 'old', paidUntil: NOW - 31 * DAY, now: NOW });
    await saveMemory(env.DB, { installId: 'current', day: today, summary: 'kept', paidUntil: NOW - 29 * DAY, now: NOW });
    await cleanup(env.DB, NOW);
    for (const table of ['chat_device_day', 'chat_ip_day', 'token_ip_day']) {
      const days = (await env.DB.prepare(`SELECT DISTINCT day FROM ${table}`).all<{ day: string }>()).results.map(r => r.day);
      expect(days, table).not.toContain(old);
      expect(days, table).toContain(today);
    }
    expect(await env.DB.prepare("SELECT 1 FROM chat_entitlement WHERE install_id = 'stale'").first()).toBeNull();
    expect(await readMemory(env.DB, 'expired')).toBeNull();
    expect(await readMemory(env.DB, 'current')).toBe('kept');
  });
  it('IP addresses are kept only as keyed hashes; an IPv6 /64 is one address', async () => {
    const d = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    await chat(d, 'hello', { ip: '2001:db8:1:2:aaaa::1' });
    await chat(d, 'hello', { ip: '2001:db8:1:2:bbbb::9' });
    const rows = (await env.DB.prepare('SELECT ip_hash, messages FROM chat_ip_day WHERE day = ?').bind(centralDay(NOW)).all<{ ip_hash: string; messages: number }>()).results;
    expect(JSON.stringify(rows)).not.toMatch(/2001|db8/);
    expect(rows.some(r => r.messages >= 2 && /^[0-9a-f]{32}$/.test(r.ip_hash))).toBe(true);
  });
});

describe('paid status from RevenueCat', () => {
  const rcEnv = (key?: string) => ({ ...env, REVENUECAT_SECRET_KEY: key }) as Env;
  const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it('an active "paid" entitlement is paid; the answer is cached for an hour', async () => {
    const id = crypto.randomUUID();
    let calls = 0;
    const f = (async (...a: Parameters<typeof fetch>) => { calls++; return reply({ subscriber: { entitlements: { paid: { expires_date: new Date(NOW + 10 * DAY).toISOString() } } } })(...a); }) as typeof fetch;
    expect((await paidStatus(rcEnv('sk_test'), id, NOW, f)).paid).toBe(true);
    expect((await paidStatus(rcEnv('sk_test'), id, NOW + 1000, f)).source).toBe('cache');
    expect(calls).toBe(1);
  });
  it('expired, missing or unreachable = free; no key is the named stop REVENUECAT_SECRET_KEY_MISSING', async () => {
    expect((await paidStatus(rcEnv('sk_test'), crypto.randomUUID(), NOW, reply({ subscriber: { entitlements: { paid: { expires_date: new Date(NOW - DAY).toISOString() } } } }))).paid).toBe(false);
    expect((await paidStatus(rcEnv('sk_test'), crypto.randomUUID(), NOW, reply({}, 500)))).toMatchObject({ paid: false });
    expect(await paidStatus(rcEnv(undefined), crypto.randomUUID(), NOW)).toMatchObject({ paid: false, source: 'stop' });
  });
});
