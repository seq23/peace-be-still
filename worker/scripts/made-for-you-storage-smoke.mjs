#!/usr/bin/env node
// Live smoke of the private bucket with the production code on both sides, run once the keys exist
// (on GitHub, or by hand through the Boss OS vault). The Mac's own upload (made_for_you.upload over its
// r2p: remote, after the whole-account free-cap read) puts a test object; then the Worker's r2Private does
// HEAD, a presigned GET (must be 200 and the same bytes), a server-side copy, DELETE of both, and a HEAD
// that must now say missing. Nothing else in the bucket is touched.
//   node worker/scripts/made-for-you-storage-smoke.mjs
// Env: CF2_ACCOUNT_ID, PBS_MFY_R2_ACCESS_KEY_ID, PBS_MFY_R2_SECRET_ACCESS_KEY, PBS_MFY_R2_BUCKET,
// CF2_WORKERS_AI_TOKEN (reads the account's R2 analytics); rclone and python3 on PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../app/node_modules/esbuild/lib/main.js';

const bundle = await build({ entryPoints: ['worker/src/madeForYou.storage.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' });
const { r2Private } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const env = process.env;
const storage = r2Private({ accountId: env.CF2_ACCOUNT_ID, accessKeyId: env.PBS_MFY_R2_ACCESS_KEY_ID,
  secretAccessKey: env.PBS_MFY_R2_SECRET_ACCESS_KEY, bucket: env.PBS_MFY_R2_BUCKET });
const id = crypto.randomUUID();
const key = `made-for-you/${'0'.repeat(8)}-0000-4000-a000-${'0'.repeat(12)}/${id}.m4a`;
const copy = `reports/smoke-${id}.m4a`;
const bytes = `made-for-you storage smoke ${id}`;
const step = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) process.exitCode = 1; return ok; };

const dir = mkdtempSync(join(tmpdir(), 'mfy-smoke-'));
writeFileSync(join(dir, 'smoke.m4a'), bytes);
// The Mac side: the whole account's R2 use is read (publish.account_bytes), an upload that would pass the free
// cap is a named stop with nothing stored, and a real upload is stored and hash-verified over the r2p: remote.
const mac = execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'audio'); from pathlib import Path; import made_for_you as m, publish, fill
bucket = m.connect_private(); used = publish.account_bytes(); local = Path(sys.argv[2])
cap, publish.FREE_CAP_BYTES = publish.FREE_CAP_BYTES, int(used)
try:
    m.upload({'file': sys.argv[1] + '.over'}, local, bucket); stopped = None
except fill.NamedStop as e:
    stopped = e.code
publish.FREE_CAP_BYTES = cap
over = publish.rclone('lsjson', '--stat', f'r2p:{bucket}/{sys.argv[1]}.over', timeout=60).returncode == 0
m.upload({'file': sys.argv[1]}, local, bucket)
print(json.dumps({'used': used, 'cap': cap, 'stopped': stopped, 'over_stored': over}))`, key, join(dir, 'smoke.m4a')], { encoding: 'utf8' });
const seen = JSON.parse(mac.trim().split('\n').pop());
console.log(`account R2 use ${(seen.used / 1e9).toFixed(2)} GB of the ${(seen.cap / 1e9).toFixed(1)} GB cap (every bucket on the second account)`);
step('publish.py counts the whole account (a real, non-zero read)', seen.used > 0 && seen.used < seen.cap);
step('an upload past the free cap is a named stop and stores nothing', seen.stopped === 'MADE_FOR_YOU_R2_FREE_CAP' && !seen.over_stored);
step('the Mac upload (r2p: remote, hash verified)', true);
try {
  step('HEAD finds it', await storage.hasAudio(key));
  const res = await fetch(await storage.playUrl(key));
  step('presigned GET is 200 with the same bytes', res.status === 200 && (await res.text()) === bytes);
  step('the playback link lasts at most 1 hour', Number(new URL(await storage.playUrl(key)).searchParams.get('X-Amz-Expires')) <= 3600);
  step('a 2-hour link is clamped to 1 hour', new URL(await storage.playUrl(key, 7200)).searchParams.get('X-Amz-Expires') === '3600');
  const tampered = new URL(await storage.playUrl(key)); tampered.searchParams.set('X-Amz-Expires', '86400');
  step('a link stretched past its hour is refused', (await fetch(tampered)).status === 403);
  await storage.copyAudio(key, copy);
  step('server-side copy under reports/', await storage.hasAudio(copy));
} finally {
  await storage.deleteAudio(key).catch(() => {});
  await storage.deleteAudio(copy).catch(() => {});
}
step('DELETE removed both', !(await storage.hasAudio(key)) && !(await storage.hasAudio(copy)));
console.log(`OUTPUT made-for-you-storage-smoke: ${process.exitCode ? 'FAILED' : 'passed'} on ${env.PBS_MFY_R2_BUCKET}`);
