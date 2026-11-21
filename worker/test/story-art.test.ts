// Story artwork from R2 (src/storyart.ts): only manifest ids are served; images are cached forever;
// a missing bucket or a bad id is a plain 404/503, never a crash.
import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import { call, deps } from './helpers';
import { storyArt } from '../src/storyart';

const put = (key: string, body: string | Uint8Array) => env.STORY_ART.put(key, body);
afterEach(async () => { for (const k of ['manifest.json', 'ruth.webp', 'secret.webp']) await env.STORY_ART.delete(k); });

describe('story art', () => {
  it('the manifest lists only approved ids, with its version; no manifest yet is an empty list', async () => {
    let r = await call(deps(), '/api/story-art/manifest.json', { method: 'GET' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ version: 0, ids: [] });
    await put('manifest.json', JSON.stringify({ version: 3, ids: ['ruth', '../etc', 'BAD ID'] }));
    r = await call(deps(), '/api/story-art/manifest.json', { method: 'GET' });
    expect(await r.json()).toEqual({ version: 3, ids: ['ruth'] });
    expect(r.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('an approved image is served as webp and cached forever; an image not in the manifest is 404 even when the file exists', async () => {
    await put('manifest.json', JSON.stringify({ version: 1, ids: ['ruth'] }));
    await put('ruth.webp', new Uint8Array([82, 73, 70, 70]));
    await put('secret.webp', new Uint8Array([1, 2, 3]));
    const ok = await call(deps(), '/api/story-art/ruth.webp', { method: 'GET' });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('image/webp');
    expect(ok.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(new Uint8Array([82, 73, 70, 70]));
    expect((await call(deps(), '/api/story-art/secret.webp', { method: 'GET' })).status).toBe(404);
    expect((await call(deps(), '/api/story-art/..%2Fmanifest.json', { method: 'GET' })).status).toBe(404);
    expect((await call(deps(), '/api/story-art/ruth.png', { method: 'GET' })).status).toBe(404);
  });

  it('OUTAGE: an approved id whose file is gone is 404; no bucket bound is 503 STORY_ART_BUCKET_MISSING, never a crash', async () => {
    await put('manifest.json', JSON.stringify({ version: 1, ids: ['ruth'] }));
    expect((await call(deps(), '/api/story-art/ruth.webp', { method: 'GET' })).status).toBe(404);
    const none = await storyArt('/api/story-art/manifest.json', undefined);
    expect(none.status).toBe(503);
    expect(await none.json()).toEqual({ error: 'STORY_ART_BUCKET_MISSING' });
  });

  it('a broken manifest file reads as no approved ids', async () => {
    await put('manifest.json', '{not json');
    expect(await (await call(deps(), '/api/story-art/manifest.json', { method: 'GET' })).json()).toEqual({ version: 0, ids: [] });
  });
});
