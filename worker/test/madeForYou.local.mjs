// From the repository root: node --test worker/test/madeForYou.local.mjs
// Uses CI's pinned Miniflare and the app's existing esbuild.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { build } from '../../app/node_modules/esbuild/lib/main.js';
import * as miniflare from 'miniflare';

const id = {
  owner: '10000000-0000-4000-a000-000000000001',
  other: '10000000-0000-4000-a000-000000000002',
  free: '10000000-0000-4000-a000-000000000003',
  limited: '10000000-0000-4000-a000-000000000004',
};
const secret = 'local-runner';
const day = 86_400_000;
const at = Date.parse('2026-11-21T04:00:00Z');
const schema = readFileSync('worker/migrations/0005_made_for_you.sql', 'utf8').replace(/\s+/g, ' ');
const python = promisify(execFile);

test('a seeded D1 row travels through the local Worker, Mac template and QA seam, private audio and paid playback', async t => {
  const bundle = await build({ entryPoints: ['worker/src/madeForYou.stub.ts'], bundle: true, format: 'esm', write: false });
  const options = {
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-11-20',
    d1Databases: ['DB'], r2Buckets: ['AUDIO'],
  };
  const worker = new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?.(options) ?? options);
  t.after(() => worker.dispose());
  const url = await worker.ready;
  const db = await worker.getD1Database('DB');
  for (const stmt of schema.split(';').filter(x => x.trim())) await db.prepare(stmt).run();
  await db.prepare('CREATE TABLE bible_verses (translation TEXT, verse INTEGER, text TEXT)').run();
  const original = new DatabaseSync('app/src/bible/data/rv1909.db', { readOnly: true });
  const verses = original.prepare("SELECT text FROM verses WHERE book = 'PSA' AND chapter = 23 ORDER BY verse").all();
  original.close();
  assert.equal(verses.length, 6);
  await db.batch(verses.map(({ text }, i) => db.prepare('INSERT INTO bible_verses VALUES (?, ?, ?)').bind('RV1909', i + 1, text)));

  const request = (token, { now = at, params = '?kind=psalm&lang=es', path = '', body, reject } = {}) =>
    fetch(new URL('/api/made-for-you' + path + params, url), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${token}`, 'x-test-now': String(now),
        'content-type': 'application/json', 'x-test-reject': reject ? 'yes' : 'no',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const note = { kind: 'psalm', door: 'faith', lang: 'es', text: 'Días de lluvia' };
  const count = async () => (await db.prepare('SELECT count(*) AS count FROM made_for_you').first()).count;
  assert.equal((await request(id.free, { body: note })).status, 403);
  assert.equal((await request(id.free)).status, 403);
  assert.equal((await request('invalid', { body: note })).status, 401);
  assert.equal((await request(id.limited, { body: note })).status, 429);
  for (const text of ['fixture floor', 'fixture model']) {
    assert.deepEqual(await (await request(id.owner, { body: { ...note, text } })).json(),
      { status: 'crisis', text: 'Fixed safety reply' });
  }
  assert.equal((await request(id.owner, { body: { ...note, text: 'fixture unavailable' } })).status, 503);
  assert.equal((await request(id.owner, { body: { ...note, door: 'mindset' } })).status, 400);
  assert.equal((await request(id.owner, { body: { ...note, text: 'a'.repeat(501) } })).status, 400);
  assert.equal(await count(), 0);

  const now = Date.now();
  const seed = await request(id.owner, { now, body: note });
  assert.equal(seed.status, 202);
  const { id: job, day: submittedDay } = await seed.json();
  assert.deepEqual((await (await request(id.owner, { now })).json()).pending, { id: job, day: submittedDay, delayed: false });
  assert.deepEqual((await (await request(id.other, { now })).json()), { pending: null, expired: false, ready: [] });
  assert.deepEqual((await (await request(id.owner, { now, params: '?kind=imagination&lang=es' })).json()), { pending: null, expired: false, ready: [] });
  const conflict = await request(id.owner, { now, body: { ...note, door: 'mindset', kind: 'imagination' } });
  assert.equal(conflict.status, 429);
  assert.deepEqual(await conflict.json(), { error: 'DAILY_LIMIT' });
  assert.equal((await request(id.owner, { now, path: '/runner/claim', body: {} })).status, 401);

  const rejected = await request(secret, { now: now - 31 * 60_000, path: '/runner/claim', body: {}, reject: true });
  assert.equal(rejected.status, 503);
  assert.deepEqual(await rejected.json(), { error: 'NO_APPROVED_DRAFT' });

  const runner = `
import hashlib, json, sys
from urllib.request import Request, urlopen
sys.path.insert(0, 'audio')
from made_for_you import make_request, process_one
base, secret, source = sys.argv[1:]
def voice(item, work):
    verses = json.loads(source)
    assert item['text'] == 'RV1909'
    first = item['verses'].index(verses[0]['text'])
    assert item['verses'][first:first + 6] == [v['text'] for v in verses]
    out = work / 'session.m4a'
    out.write_bytes(b'stub-voice')
    return dict(status='passed', seconds=680, sha256=hashlib.sha256(out.read_bytes()).hexdigest(), _local=str(out))
def put(item, file):
    with urlopen(Request(base + '/_test-media/' + item['file'], data=file.read_bytes(),
                        headers={'Authorization': 'Bearer ' + secret}, method='PUT')) as response:
        assert response.status == 204
assert process_one(make_request(base + '/api', secret), voice, put)
`;
  await python('python3', ['-c', runner, url.origin, secret, JSON.stringify(verses)]);
  const after = await db.prepare('SELECT text, lease, audio_path FROM made_for_you WHERE id = ?').bind(job).first();
  assert.equal(after.text, null);
  assert.equal(after.lease, null);
  assert.equal(after.audio_path, `made-for-you/${id.owner}/${job}.m4a`);
  const shelf = await (await request(id.owner, { now })).json();
  assert.equal(shelf.pending, null);
  assert.equal(shelf.ready[0].path, after.audio_path);
  assert.equal((await request(id.other, { now, params: '?kind=psalm&lang=es&play=' + job })).status, 404);
  const playback = await (await request(id.owner, { now, params: '?kind=psalm&lang=es&play=' + job })).json();
  assert.equal((await fetch(new URL('/_test-media/' + after.audio_path, url))).status, 403);
  assert.equal(await (await fetch(playback.url)).text(), 'stub-voice');

  const race = await Promise.all([
    request(id.other, { now, body: note }), request(id.other, { now, body: note }),
  ]);
  assert.deepEqual(race.map(response => response.status).sort(), [202, 429]);
  const expired = await (await race.find(response => response.ok).json()).id;
  const delayed = await (await request(id.other, { now: now + day })).json();
  assert.equal(delayed.pending.id, expired);
  assert.equal(delayed.pending.delayed, true);
  assert.equal(delayed.expired, false);
  const early = await fetch(new URL('/_test-cleanup', url), { headers: { 'x-test-now': String(now + 6 * day) } });
  assert.equal(early.status, 204);
  assert.equal((await db.prepare('SELECT text FROM made_for_you WHERE id = ?').bind(expired).first()).text, note.text);
  const cleanup = await fetch(new URL('/_test-cleanup', url), { headers: { 'x-test-now': String(now + 7 * day) } });
  assert.equal(cleanup.status, 204);
  const erased = await db.prepare('SELECT text, lease, audio_path FROM made_for_you WHERE id = ?').bind(expired).first();
  assert.deepEqual(erased, { text: null, lease: null, audio_path: null });
  assert.deepEqual(await (await request(id.other, { now: now + 8 * day })).json(),
    { pending: null, expired: true, ready: [] });
  assert.equal((await request(id.other, { now: now + 8 * day, body: note })).status, 202);
  const retry = await (await request(id.other, { now: now + 8 * day })).json();
  assert.equal(retry.expired, false);
  assert.equal(retry.pending.delayed, false);
  assert.equal((await db.prepare('SELECT audio_path FROM made_for_you WHERE id = ?').bind(job).first()).audio_path, after.audio_path);
});
