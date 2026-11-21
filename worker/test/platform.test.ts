import { applyD1Migrations, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { blockedCountries } from '../src/index';
import { ipHash, ipPrefix } from '../src/iphash';
import { lookup, psalmHeading } from '../src/scripture';
import { excludedTerritories } from '../src/shared';
import { issueToken, verifyToken } from '../src/token';

describe('migrations (repo-conventions)', () => {
  it('the newest schema_version row is the newest migration file', async () => {
    const newest = env.TEST_MIGRATIONS.map(m => m.name.replace(/\.sql$/, '')).sort().at(-1);
    const row = await env.DB.prepare('SELECT migration FROM schema_version ORDER BY migration DESC LIMIT 1').first<{ migration: string }>();
    expect(row?.migration).toBe(newest);
  });
  it('every migration records itself, and re-applying them all is a no-op', async () => {
    const before = (await env.DB.prepare('SELECT count(*) AS n FROM schema_version').first<{ n: number }>())!.n;
    expect(before).toBe(env.TEST_MIGRATIONS.length);
    for (const m of env.TEST_MIGRATIONS) for (const q of m.queries) await env.DB.prepare(q).run(); // the raw SQL again
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    expect((await env.DB.prepare('SELECT count(*) AS n FROM schema_version').first<{ n: number }>())!.n).toBe(before);
  });
});

describe('the Bible lookup is the stored text', () => {
  it('200 random verses per translation from the real source equal what the Worker returns', async () => {
    expect(env.TEST_SAMPLE.length).toBe(400);
    for (const [translation, book, chapter, verse, text] of env.TEST_SAMPLE) {
      const got = await lookup(env.DB, translation as 'KJV' | 'RV1909', { book, chapter, verse });
      const stored = text.replace(/^¶\s*/, '');
      const heading = book === 'PSA' && verse === 1 ? psalmHeading(translation as 'KJV' | 'RV1909', stored) : null;
      expect(got?.text, `${translation} ${book} ${chapter}:${verse}`).toBe(heading ? stored.slice(heading.length) : stored);
    }
  });
  it('Psalm headings: the same Psalms carry one in the KJV and the RV1909 (all 150, real data), and verse 1 starts with the verse', async () => {
    const heads = (t: string) => env.TEST_PSALM_HEADS.filter(r => r[0] === t);
    expect(heads('KJV').length).toBe(150);
    expect(heads('RV1909').length).toBe(150);
    const kjv = new Set(heads('KJV').filter(r => psalmHeading('KJV', r[4])).map(r => r[2]));
    const rv = new Set(heads('RV1909').filter(r => psalmHeading('RV1909', r[4])).map(r => r[2]));
    expect(kjv.size).toBe(115);
    expect([...kjv].sort()).toEqual([...rv].sort());
    expect((await lookup(env.DB, 'KJV', { book: 'PSA', chapter: 18, verse: 1 }))?.text).toBe('I will love thee, O LORD, my strength.');
    expect((await lookup(env.DB, 'KJV', { book: 'PSA', chapter: 1, verse: 1 }))?.text.startsWith('Blessed [is] the man')).toBe(true);
    expect((await lookup(env.DB, 'RV1909', { book: 'PSA', chapter: 51, verse: 1 }))?.text.startsWith('TEN piedad de mí')).toBe(true);
    expect((await lookup(env.DB, 'RV1909', { book: 'PSA', chapter: 150, verse: 1 }))?.text.startsWith('Aleluya.')).toBe(true);
  });
});

describe('region, tokens and IP hashes', () => {
  it('every excluded territory maps to a Cloudflare country code', () => {
    expect(blockedCountries.size).toBe(excludedTerritories.length);
    for (const code of blockedCountries) expect(code).toMatch(/^[A-Z]{2}$/);
  });
  it('rotation: a token signed with the previous key still verifies; an unknown kid does not', async () => {
    const old = await issueToken({ kid: 'k1', secret: 'a'.repeat(40) }, 'adult', Date.now());
    expect(await verifyToken({ kid: 'k2', secret: 'b'.repeat(40), previous: 'a'.repeat(40) }, old.token, Date.now())).toMatchObject({ age: 'adult' });
    expect(await verifyToken({ kid: 'k2', secret: 'b'.repeat(40) }, old.token, Date.now())).toBeNull();
    await expect(issueToken({ kid: 'k1', secret: 'short' }, 'adult', Date.now())).rejects.toThrow('CHAT_TOKEN_SECRET_MISSING');
  });
  it('IPv6 is hashed by its /64; the hash is keyed and changes daily', async () => {
    expect(ipPrefix('2001:db8:1:2:aaaa::1')).toBe(ipPrefix('2001:DB8:1:2:ffff:1:2:3'));
    const s = 'x'.repeat(40);
    expect(await ipHash(s, '2026-11-20', '1.2.3.4')).not.toBe(await ipHash(s, '2026-11-21', '1.2.3.4'));
    expect(await ipHash(s, '2026-11-20', '1.2.3.4')).not.toBe(await ipHash('y'.repeat(40), '2026-11-20', '1.2.3.4'));
    await expect(ipHash(undefined, '2026-11-20', '1.2.3.4')).rejects.toThrow('IP_HASH_SECRET_MISSING');
  });
});
