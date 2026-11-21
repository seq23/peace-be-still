// The private first chat (her ruling 21 Nov 2026; src/firstprivate.ts): the coordinator's how-it-breaks
// list, one test each. Abuse (a lying client), the privacy promise, money and outage.
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { call, chatBody, deps, freshIp, good, NOW, scripted } from './helpers';
import { centralDay } from '../src/day';
import { appleDeviceCheck, FIRST_PRIVATE_PER_IP } from '../src/firstprivate';
import { RungError } from '../src/providers/types';
import { FREE_CHAT_MESSAGES } from '../src/shared';
import type { DeviceBit } from '../src/firstprivate';
import type { LadderRung } from '../src/ladder';

const DAY = centralDay(NOW);
const answers = [
  good('You are not alone tonight, and God stays close to a broken heart. Psalm 34:18 says so. Lord, sit close to us tonight.', ['Psalm 34:18']),
  good('Rest is a gift, not a reward you earn. Jesus calls the weary to come to him. Lord, give us your rest tonight.', ['Matthew 11:28']),
  good('Fear does not get the last word. God has not given you a spirit of fear. Lord, steady our hearts tonight.', ['2 Timothy 1:7']),
  good('Your worry can be handed over in prayer, one thing at a time. Philippians 4:6 shows the way. Lord, take what we carry.', ['Philippians 4:6']),
  good('God keeps the one whose mind stays on him in perfect peace. Isaiah 26:3 says so. Lord, keep our minds on you.', ['Isaiah 26:3']),
];

/** A phone: each Apple device keeps its bit0 the way Apple does (a Set of device tokens' devices). */
function apple() {
  const had = new Set<string>();
  const calls: string[] = [];
  const check = async (_e: unknown, token: string): Promise<DeviceBit> => { calls.push(token); const device = token.split(':')[0]; if (had.has(device)) return 'used'; had.add(device); return 'new'; };
  return { check, calls };
}

async function freshInstall(d: ReturnType<typeof deps>, ip = freshIp()) {
  const res = await call(d, '/api/token', { body: { age: 'adult' }, ip });
  return ((await res.json()) as { token: string }).token;
}
const probe = async (d: ReturnType<typeof deps>, token: string, conversation: string, deviceCheck: string | undefined, ip = freshIp()) =>
  ((await (await call(d, '/api/chat/first', { token, ip, body: { conversation, ...(deviceCheck ? { deviceCheck } : {}) } })).json()) as { private: boolean }).private;
const say = async (d: ReturnType<typeof deps>, token: string, conversation: string, texts: string[], over: Record<string, unknown> = {}) =>
  (await (await call(d, '/api/chat', { token, body: { ...chatBody(texts, { freeConsent: false, ...over }), conversation } })).json()) as { kind: string; firstPrivate?: boolean; remaining: number | null };
const device = (name: string) => `${name}:${'x'.repeat(40)}`;

describe('the private first chat', () => {
  it('a new iPhone: the first chat runs on the private route with no free-chat consent, labelled, counted as the free day; free models are never called', async () => {
    const paid = scripted('paid-test', [...answers]);
    const free = scripted('gemini-free', [good()]);
    const a = apple();
    const d = deps({ deviceCheck: a.check, rungs: (_e, _n, lane) => (lane === 'free' ? [free.rung] : [paid.rung]) });
    const token = await freshInstall(d);
    const conversation = crypto.randomUUID();
    expect(await probe(d, token, conversation, device('phone-a'))).toBe(true);
    expect(await probe(d, token, conversation, device('phone-a'))).toBe(true); // asking again changes nothing
    const turns: string[] = [];
    for (let i = 0; i < FREE_CHAT_MESSAGES; i++) {
      turns.push(`Private question number ${i} about my week`);
      const r = await say(d, token, conversation, turns);
      expect(r.kind, `message ${i + 1}`).toBe('answer');
      expect(r.firstPrivate).toBe(true);
      expect(r.remaining).toBe(FREE_CHAT_MESSAGES - 1 - i);
      turns.push('An answer.');
    }
    expect(free.calls.length).toBe(0);
    turns.push('one more');
    expect((await say(d, token, conversation, turns)).kind).toBe('limit');
    const row = await env.DB.prepare('SELECT granted, reason, messages FROM chat_first_private WHERE install_id IS NOT NULL ORDER BY decided_at DESC LIMIT 1').first<{ granted: number; reason: string; messages: number }>();
    expect(row).toMatchObject({ granted: 1, reason: 'devicecheck', messages: FREE_CHAT_MESSAGES }); // the cohort row
    expect(a.calls.length).toBe(1); // DeviceCheck asked once, not on every message
    // Conversion: the cohort row is marked when the install later chats with a paid plan.
    const later = deps({ paidNow: true, rungs: () => [scripted('paid-test', [answers[1]]).rung] });
    await call(later, '/api/chat', { token, body: { ...chatBody('now with a plan'), conversation: crypto.randomUUID() } });
    expect((await env.DB.prepare('SELECT paid_at FROM chat_first_private WHERE install_id = (SELECT install_id FROM chat_first_private ORDER BY decided_at DESC LIMIT 1)').first<{ paid_at: number | null }>())?.paid_at).not.toBeNull();
  });

  it('ABUSE: a reinstall on the same iPhone (a new install id) gets the normal free lane, behind the consent', async () => {
    const paid = scripted('paid-test', [...answers]);
    const free = scripted('gemini-free', [good()]);
    const a = apple();
    const d = deps({ deviceCheck: a.check, rungs: (_e, _n, lane) => (lane === 'free' ? [free.rung] : [paid.rung]) });
    expect(await probe(d, await freshInstall(d), crypto.randomUUID(), device('phone-b'))).toBe(true);
    const again = await freshInstall(d);
    const conversation = crypto.randomUUID();
    expect(await probe(d, again, conversation, device('phone-b'))).toBe(false);
    const r = await say(d, again, conversation, ['hello after reinstalling']);
    expect(r.kind).toBe('consent');
    expect(free.calls.length + paid.calls.length).toBe(0);
  });

  it(`ABUSE: the ${FIRST_PRIVATE_PER_IP + 1}th first chat from one network in a day is the normal free lane; the client's own claim is never trusted`, async () => {
    const a = apple();
    const d = deps({ deviceCheck: a.check });
    const ip = '192.0.2.77';
    for (let i = 0; i < FIRST_PRIVATE_PER_IP; i++) expect(await probe(d, await freshInstall(d), crypto.randomUUID(), device(`ipphone-${i}`), ip)).toBe(true);
    const fourth = await freshInstall(d);
    const conversation = crypto.randomUUID();
    expect(await probe(d, fourth, conversation, device('ipphone-new'), ip)).toBe(false);
    // The app claiming a first private chat in the body changes nothing.
    const paid = scripted('paid-test', [...answers]);
    const lying = deps({ rungs: (_e, _n, lane) => (lane === 'free' ? [] : [paid.rung]) });
    expect((await say(lying, fourth, conversation, ['hi'], { firstPrivate: true })).kind).toBe('consent');
    expect(paid.calls.length).toBe(0);
  });

  it('ABUSE: the app-wide FIRST_PRIVATE_PER_DAY cap holds', async () => {
    const perDay = Number(env.FIRST_PRIVATE_PER_DAY);
    expect(perDay).toBe(300);
    const batch = Array.from({ length: perDay }, (_, i) => env.DB.prepare("INSERT INTO chat_first_private (install_id, conversation, granted, reason, ip_hash, day, decided_at) VALUES (?, NULL, 1, 'devicecheck', ?, ?, ?)").bind(`cap-${i}`, `h${i}`, DAY, NOW));
    await env.DB.batch(batch);
    const a = apple();
    const d = deps({ deviceCheck: a.check });
    expect(await probe(d, await freshInstall(d), crypto.randomUUID(), device('late-phone'))).toBe(false);
    expect(a.calls.length).toBe(0); // the device's bit is not spent when the day is full
    await env.DB.prepare("DELETE FROM chat_first_private WHERE install_id LIKE 'cap-%'").run();
  });

  it('OUTAGE: no DeviceCheck token (web, Android), DeviceCheck erroring, or its key unset: the normal free lane, never private-for-everyone', async () => {
    const d = deps({ deviceCheck: async () => 'error' });
    expect(await probe(d, await freshInstall(d), crypto.randomUUID(), undefined)).toBe(false);
    expect(await probe(d, await freshInstall(d), crypto.randomUUID(), device('phone-err'))).toBe(false);
    const thrown = deps({ deviceCheck: async () => { throw new Error('apple down'); } });
    expect(await probe(thrown, await freshInstall(thrown), crypto.randomUUID(), device('phone-throw'))).toBe(false);
    // The real check with no key never calls Apple.
    let fetched = 0;
    expect(await appleDeviceCheck({}, device('phone-nokey'), NOW, (async () => { fetched++; return new Response('{}'); }) as typeof fetch)).toBe('error');
    expect(fetched).toBe(0);
    // Apple refusing the token, or timing out: error.
    const keyed = (await testKeyEnvSigned()).env;
    expect(await appleDeviceCheck(keyed, device('phone-bad'), NOW, (async () => new Response('Missing or badly formatted authorization token', { status: 401 })) as typeof fetch)).toBe('error');
    expect(await appleDeviceCheck(keyed, device('phone-slow'), NOW, (async () => { throw new DOMException('timeout', 'TimeoutError'); }) as typeof fetch)).toBe('error');
  });

  it('the real DeviceCheck call: a signed ES256 query, then bit0 set for a device Apple has never seen; a device with bit0 is "used"', async () => {
    const sent: Array<{ url: string; body: Record<string, unknown>; auth: string }> = [];
    const fake = (answer: string) => (async (url: string, init: RequestInit) => { sent.push({ url, body: JSON.parse(String(init.body)), auth: String((init.headers as Record<string, string>).authorization) }); return new Response(url.endsWith('query_two_bits') ? answer : ''); }) as unknown as typeof fetch;
    const e = await testKeyEnvSigned();
    expect(await appleDeviceCheck(e.env, device('phone-real'), NOW, fake('Failed to find bit state'))).toBe('new');
    expect(sent.map(s => s.url.split('/v1/')[1])).toEqual(['query_two_bits', 'update_two_bits']);
    expect(sent[1].body).toMatchObject({ device_token: device('phone-real'), bit0: true, bit1: false, timestamp: NOW });
    const [h, p, sig] = sent[0].auth.replace('Bearer ', '').split('.');
    expect(JSON.parse(atob(h))).toEqual({ alg: 'ES256', kid: 'KEYID12345' });
    expect(JSON.parse(atob(p))).toMatchObject({ iss: 'TEAM123456' });
    const raw = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, e.publicKey, raw, new TextEncoder().encode(`${h}.${p}`))).toBe(true);
    sent.length = 0;
    expect(await appleDeviceCheck(e.env, device('phone-real'), NOW, fake('{"bit0":true,"bit1":false,"last_update_time":"2026-11"}'))).toBe('used');
    expect(sent.length).toBe(1); // never re-set
  });

  it('PRIVACY: the private route fails on message 3 of the first chat: the free-chat consent, zero calls to free models before her yes; after it, no turn of the first chat travels', async () => {
    const paid = scripted('paid-test', [answers[0], answers[1], new RungError('failed', 'HTTP_402')]);
    const free = scripted('gemini-free', [good()]);
    const d = deps({ deviceCheck: apple().check, rungs: (_e, _n, lane) => (lane === 'free' ? [free.rung] : [paid.rung]) });
    const token = await freshInstall(d);
    const conversation = crypto.randomUUID();
    expect(await probe(d, token, conversation, device('phone-down'))).toBe(true);
    const turns = ['My secret one: I lost my job', 'An answer.', 'My secret two: my marriage is hard', 'An answer.', 'Message three, after the outage'];
    expect((await say(d, token, conversation, turns.slice(0, 1))).firstPrivate).toBe(true);
    expect((await say(d, token, conversation, turns.slice(0, 3))).firstPrivate).toBe(true);
    const down = await say(d, token, conversation, turns);
    expect(down.kind).toBe('consent');
    expect(free.calls.length).toBe(0);
    // The same message again without her yes: still nothing to a free model.
    expect((await say(d, token, conversation, turns)).kind).toBe('consent');
    expect(free.calls.length).toBe(0);
    // Her yes: free chat, and the free model sees only the new message.
    const after = await say(d, token, conversation, turns, { freeConsent: true });
    expect(after.kind).toBe('answer');
    expect(after.firstPrivate).toBeUndefined();
    const seen = free.calls.flat().map(m => m.content).join('\n');
    expect(free.calls.length).toBeGreaterThan(0);
    expect(seen).not.toMatch(/secret one|secret two/);
  });

  it('PRIVACY: a later free chat (the same conversation kept open into the next day) carries no turn of the first chat', async () => {
    const paid = scripted('paid-test', [...answers]);
    const free = scripted('gemini-free', [good()]);
    let now = NOW;
    const d = deps({ now: () => now, deviceCheck: apple().check, rungs: (_e, _n, lane) => (lane === 'free' ? [free.rung] : [paid.rung]) });
    const token = await freshInstall(d);
    const conversation = crypto.randomUUID();
    expect(await probe(d, token, conversation, device('phone-day'))).toBe(true);
    expect((await say(d, token, conversation, ['My private worry about money'])).firstPrivate).toBe(true);
    now = NOW + 86_400_000;
    expect(await probe(d, token, conversation, device('phone-day'))).toBe(false); // one first chat, ever
    expect((await say(d, token, conversation, ['My private worry about money', 'An answer.', 'A new day'])).kind).toBe('consent');
    const r = await say(d, token, conversation, ['My private worry about money', 'An answer.', 'A new day'], { freeConsent: true });
    expect(r.kind).toBe('answer');
    expect(free.calls.flat().map(m => m.content).join('\n')).not.toMatch(/worry about money/);
  });

  it('MONEY: past the monthly cap no first chat starts, and one under way stops with the consent, never a silent switch; its spend is on the paid meter', async () => {
    // A billed rung that reports its tokens, as the real ones do.
    const billed: LadderRung = { id: 'paid-test', cap: 1000, day: '2026-11-20', price: { in: 0.3, out: 1.2, cached: 0.03 }, call: async (_m, _s, _t, usage) => { usage?.({ in: 1000, out: 300, think: 0, cached: 0 }); return answers[0]; } };
    const free = scripted('gemini-free', [good()]);
    const d = deps({ deviceCheck: apple().check, rungs: (_e, _n, lane) => (lane === 'free' ? [free.rung] : [billed]) });
    const token = await freshInstall(d);
    const conversation = crypto.randomUUID();
    await env.DB.prepare("DELETE FROM chat_counts WHERE metric = 'paid_spend_micro'").run();
    expect(await probe(d, token, conversation, device('phone-money'))).toBe(true);
    expect((await say(d, token, conversation, ['A first private question'])).firstPrivate).toBe(true);
    const spent = (await env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric = 'paid_spend_micro'").first<{ n: number }>())!.n;
    expect(spent).toBeGreaterThan(0);
    await env.DB.prepare("INSERT INTO chat_counts VALUES (?, 'paid_spend_micro', ?) ON CONFLICT(day, metric) DO UPDATE SET n = n + excluded.n").bind(DAY, 100_000_000).run();
    const r = await say(d, token, conversation, ['A first private question', 'An answer.', 'And another']);
    expect(r.kind).toBe('consent');
    expect(free.calls.length).toBe(0);
    const other = await freshInstall(d);
    expect(await probe(d, other, crypto.randomUUID(), device('phone-money-2'))).toBe(false);
    await env.DB.prepare("DELETE FROM chat_counts WHERE metric = 'paid_spend_micro'").run();
  });

  it('CRISIS is unchanged in the first chat: an intent phrase is the fixed crisis card', async () => {
    const paid = scripted('paid-test', [...answers]);
    const d = deps({ deviceCheck: apple().check, rungs: (_e, _n, lane) => (lane === 'free' ? [] : [paid.rung]) });
    const token = await freshInstall(d);
    const conversation = crypto.randomUUID();
    expect(await probe(d, token, conversation, device('phone-crisis'))).toBe(true);
    expect((await say(d, token, conversation, ['I want to kill myself tonight'])).kind).toBe('crisis');
  });
});

// A throwaway P-256 key in the .p8 (PKCS#8 PEM) form Apple hands out.
async function testKeyEnvSigned() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pkcs8 = new Uint8Array((await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END PRIVATE KEY-----`;
  return { env: { APPLE_DEVICECHECK_KEY: pem, APPLE_DEVICECHECK_KEY_ID: 'KEYID12345', APPLE_TEAM_ID: 'TEAM123456', DEVICECHECK_HOST: 'https://devicecheck.test' }, publicKey: pair.publicKey };
}
