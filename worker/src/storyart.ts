// Story artwork (her request 21 Nov 2026): approved illustrations go live from R2 with no app build.
// GET /api/story-art/manifest.json → { version, ids }: only approved story ids (the manifest object in
// the bucket is the approval list). GET /api/story-art/<id>.webp → that image, only when its id is in the
// manifest, cached forever (the app adds ?v=<version>, so a new manifest version is a new URL).
// No bucket bound: STORY_ART_BUCKET_MISSING and 503; the app then shows no image, never an error.
import { logCode } from './counts';

export type StoryArtManifest = { version: number; ids: string[] };
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const IMMUTABLE = 'public, max-age=31536000, immutable';
const MANIFEST_CACHE = 'public, max-age=300';
// Public, read-only art: any page may read it. The web app sends Cross-Origin-Embedder-Policy: require-corp,
// so without these the browser blocks the manifest (CORS) and the image (CORP) and web readers see no art.
const OPEN = { 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' };

export async function readManifest(bucket: R2Bucket): Promise<StoryArtManifest> {
  const obj = await bucket.get('manifest.json');
  if (!obj) return { version: 0, ids: [] };
  const raw = (await obj.json().catch(() => null)) as Partial<StoryArtManifest> | null;
  const version = Number.isInteger(raw?.version) ? (raw!.version as number) : 0;
  const ids = Array.isArray(raw?.ids) ? raw!.ids.filter((x): x is string => typeof x === 'string' && ID.test(x)) : [];
  return { version, ids };
}

export async function storyArt(pathname: string, bucket: R2Bucket | undefined): Promise<Response> {
  if (!bucket) { logCode('STORY_ART_BUCKET_MISSING'); return Response.json({ error: 'STORY_ART_BUCKET_MISSING' }, { status: 503 }); }
  const name = pathname.slice('/api/story-art/'.length);
  const manifest = await readManifest(bucket);
  if (name === 'manifest.json') return Response.json(manifest, { headers: { ...OPEN, 'cache-control': MANIFEST_CACHE } });
  const id = /^(.+)\.webp$/.exec(name)?.[1];
  if (!id || !ID.test(id) || !manifest.ids.includes(id)) return new Response('Not found', { status: 404 });
  const obj = await bucket.get(`${id}.webp`);
  if (!obj) { logCode('STORY_ART_IMAGE_MISSING', { id }); return new Response('Not found', { status: 404 }); }
  return new Response(obj.body, { headers: { ...OPEN, 'content-type': 'image/webp', 'cache-control': IMMUTABLE, etag: obj.httpEtag } });
}
