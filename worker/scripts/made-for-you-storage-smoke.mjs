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
execFileSync('python3', ['-c', `import sys; sys.path.insert(0, 'audio'); from pathlib import Path; import made_for_you as m
bucket = m.connect_private(); m.upload({'file': sys.argv[1]}, Path(sys.argv[2]), bucket)`, key, join(dir, 'smoke.m4a')], { stdio: 'inherit' });
step('the Mac upload (whole-account cap read, r2p: remote, hash verified)', true);
try {
  step('HEAD finds it', await storage.hasAudio(key));
  const res = await fetch(await storage.playUrl(key));
  step('presigned GET is 200 with the same bytes', res.status === 200 && (await res.text()) === bytes);
  step('a 2-hour link is clamped to 1 hour', new URL(await storage.playUrl(key, 7200)).searchParams.get('X-Amz-Expires') === '3600');
  await storage.copyAudio(key, copy);
  step('server-side copy under reports/', await storage.hasAudio(copy));
} finally {
  await storage.deleteAudio(key).catch(() => {});
  await storage.deleteAudio(copy).catch(() => {});
}
step('DELETE removed both', !(await storage.hasAudio(key)) && !(await storage.hasAudio(copy)));
console.log(`OUTPUT made-for-you-storage-smoke: ${process.exitCode ? 'FAILED' : 'passed'} on ${env.PBS_MFY_R2_BUCKET}`);
