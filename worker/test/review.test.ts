// Store review access (src/review.ts): off unless both values are set, one 6-digit code, RevenueCat decides.
// How it breaks: a guessed code (try caps), a client claiming paid (only RevenueCat's grant unlocks), RevenueCat
// down (never unlocked), and the path left on by mistake (it closes itself at REVIEW_UNTIL).
import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { centralDay } from '../src/day';
import { REVIEW_TRIES_DAILY } from '../src/review';
import { call, deps, NOW, tokenFor } from './helpers';

const DAY = 86400_000;
const CODE = '482913';
const open = { REVIEW_CODE: CODE, REVIEW_UNTIL: new Date(NOW + 7 * DAY).toISOString().slice(0, 10), REVENUECAT_SECRET_KEY: 'sk_test_review' };
const iid = (token: string) => JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid as string;
const e = env as unknown as Record<string, unknown>;
function set(values: Record<string, string | undefined>) { for (const [k, v] of Object.entries(values)) { if (v === undefined) delete e[k]; else e[k] = v; } }
const revenueCat = (status = 200) => vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status }));
const unlock = (token: string | undefined, code: unknown) => call(deps(), '/api/review/unlock', { token, ip: '198.51.100.40', body: { code } });

afterEach(async () => {
  set({ REVIEW_CODE: undefined, REVIEW_UNTIL: undefined, REVENUECAT_SECRET_KEY: undefined });
  vi.restoreAllMocks();
  await env.DB.prepare("DELETE FROM chat_counts WHERE metric = 'review_tries'").run();
});

describe('store review access', () => {
  it('is off unless a 6-digit code and a future end date are both set: 404 to everyone, no network call', async () => {
    const fetch = revenueCat();
    const token = await tokenFor(deps());
    for (const values of [
      {},
      { REVIEW_CODE: CODE, REVENUECAT_SECRET_KEY: 'sk_x' },
      { REVIEW_UNTIL: open.REVIEW_UNTIL, REVENUECAT_SECRET_KEY: 'sk_x' },
      { ...open, REVIEW_CODE: '48291' },
      { ...open, REVIEW_CODE: 'abcdef' },
      { ...open, REVIEW_UNTIL: new Date(NOW - DAY).toISOString().slice(0, 10) },
      { ...open, REVIEW_UNTIL: 'soon' },
      { ...open, REVENUECAT_SECRET_KEY: undefined },
    ]) {
      set({ REVIEW_CODE: undefined, REVIEW_UNTIL: undefined, REVENUECAT_SECRET_KEY: undefined, ...values });
      expect((await call(deps(), '/api/review', { method: 'GET' })).status, JSON.stringify(values)).toBe(404);
      expect((await unlock(token, CODE)).status, JSON.stringify(values)).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('the right code asks RevenueCat to grant this install the paid entitlement for a week, and nothing else', async () => {
    set(open);
    const fetch = revenueCat();
    const token = await tokenFor(deps());
    const id = iid(token);
    await env.DB.prepare('INSERT INTO chat_entitlement (install_id, paid, paid_until, checked_at) VALUES (?, 0, NULL, ?)').bind(id, NOW).run();
    expect(await (await call(deps(), '/api/review', { method: 'GET' })).json()).toEqual({ open: true });
    const res = await unlock(token, CODE);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ unlocked: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}/entitlements/paid/promotional`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk_test_review');
    expect(JSON.parse(String(init?.body))).toEqual({ end_time_ms: NOW + 7 * DAY });
    // The hour-old "free" answer is dropped, so the next paid check asks RevenueCat.
    expect(await env.DB.prepare('SELECT 1 FROM chat_entitlement WHERE install_id = ?').bind(id).first()).toBeNull();
  });

  it('a wrong, short or missing code unlocks nothing and calls no one; a request with no token is refused', async () => {
    set(open);
    const fetch = revenueCat();
    // A fresh install per code: the 5-a-minute burst limit is its own test below.
    for (const code of ['482914', '48291', '4829133', 482913, null, ' 482913']) expect((await unlock(await tokenFor(deps()), code)).status, String(code)).toBe(403);
    expect((await unlock(undefined, CODE)).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('RevenueCat down or refusing means "try again", never unlocked', async () => {
    set(open);
    const token = await tokenFor(deps());
    revenueCat(500);
    const res = await unlock(token, CODE);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'TRY_AGAIN' });
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect((await unlock(token, CODE)).status).toBe(503);
  });

  it(`guessing is capped: ${REVIEW_TRIES_DAILY} tries a day for everyone (even the right code waits), 5 a minute per install`, async () => {
    set(open);
    const fetch = revenueCat();
    const token = await tokenFor(deps());
    await env.DB.prepare("INSERT INTO chat_counts (day, metric, n) VALUES (?, 'review_tries', ?) ON CONFLICT(day, metric) DO UPDATE SET n = excluded.n")
      .bind(centralDay(NOW), REVIEW_TRIES_DAILY).run();
    expect((await unlock(token, CODE)).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
    await env.DB.prepare("DELETE FROM chat_counts WHERE metric = 'review_tries'").run();
    const other = await tokenFor(deps());
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await unlock(other, '000000')).status);
    expect(statuses.slice(0, 5)).toEqual([403, 403, 403, 403, 403]);
    expect(statuses[5]).toBe(429);
  });
});
