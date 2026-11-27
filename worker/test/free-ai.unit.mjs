// No Peace Be Still script, eval or dev tool can run Workers AI on the main Cloudflare account (Workers Paid,
// bills past 10,000 neurons a day), and no flag or variable lets a run past the daily stop (her answer
// 27 Nov 2026: "Remove it, never bill"). Runs on every PR (no secrets, no unlock): node --test worker/test/free-ai.unit.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { CEILING, NamedStop, checkpoint, freeAiCall, freeAiKeys, neuronMeter } from '../scripts/free-ai.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const sha = s => createHash('sha256').update(s).digest('hex');
const TEST_FREE = 'test-free-account-0000';   // made up: the unit tests' own allowed account
const code = fn => { try { fn(); return null; } catch (e) { assert.ok(e instanceof NamedStop, e.message); return e.code; } };
const MAIN = { CLOUDFLARE_ACCOUNT_ID: 'main-account-0000', CLOUDFLARE_API_TOKEN: 'main-token', T2R_CLOUDFLARE_WORKERS_AI_TOKEN: 't2r-token' };

test('the main account is refused, by id (any case, any spaces) or by its tokens; an unknown account too', () => {
  assert.equal(code(() => freeAiKeys({ ...MAIN, CF2_ACCOUNT_ID: 'main-account-0000', CF2_WORKERS_AI_TOKEN: 'x' }, sha(TEST_FREE))), 'MAIN_ACCOUNT_REFUSED');
  assert.equal(code(() => freeAiKeys({ ...MAIN, CF2_ACCOUNT_ID: ' MAIN-ACCOUNT-0000\n', CF2_WORKERS_AI_TOKEN: 'x' }, sha(TEST_FREE))), 'MAIN_ACCOUNT_REFUSED');
  // Even when the main id were the allowed one, the main id in the environment wins: refused.
  assert.equal(code(() => freeAiKeys({ ...MAIN, CF2_ACCOUNT_ID: 'main-account-0000', CF2_WORKERS_AI_TOKEN: 'x' }, sha('main-account-0000'))), 'MAIN_ACCOUNT_REFUSED');
  assert.equal(code(() => freeAiKeys({ ...MAIN, CF2_ACCOUNT_ID: TEST_FREE, CF2_WORKERS_AI_TOKEN: 'main-token' }, sha(TEST_FREE))), 'MAIN_ACCOUNT_REFUSED');
  assert.equal(code(() => freeAiKeys({ ...MAIN, CF2_ACCOUNT_ID: TEST_FREE, CF2_WORKERS_AI_TOKEN: 't2r-token' }, sha(TEST_FREE))), 'MAIN_ACCOUNT_REFUSED');
  // No main id in the environment (a workflow): only the allow-listed account passes.
  assert.equal(code(() => freeAiKeys({ CF2_ACCOUNT_ID: 'some-other-account', CF2_WORKERS_AI_TOKEN: 'x' }, sha(TEST_FREE))), 'CF_ACCOUNT_NOT_FREE');
  assert.equal(code(() => freeAiKeys({ CF2_ACCOUNT_ID: TEST_FREE, CF2_WORKERS_AI_TOKEN: 'x' })), 'CF_ACCOUNT_NOT_FREE');
  assert.equal(code(() => freeAiKeys({ CF2_ACCOUNT_ID: '', CF2_WORKERS_AI_TOKEN: 'x' })), 'WORKERS_AI_KEYS_MISSING');
  assert.equal(code(() => freeAiKeys({ ...MAIN })), 'WORKERS_AI_KEYS_MISSING');
});

test('the free account passes, and only keys freeAiKeys handed out can make a call', async () => {
  const keys = freeAiKeys({ ...MAIN, CF2_ACCOUNT_ID: TEST_FREE, CF2_WORKERS_AI_TOKEN: 'free-token' }, sha(TEST_FREE));
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push([url, init.headers.authorization]); return new Response('{}'); };
  await freeAiCall(keys, 'run/@cf/x', {}, { fetchImpl });
  assert.deepEqual(calls, [[`https://api.cloudflare.com/client/v4/accounts/${TEST_FREE}/ai/run/@cf/x`, 'Bearer free-token']]);
  assert.equal(code(() => freeAiCall({ account: 'main-account-0000', token: 'main-token' }, 'run/@cf/x', {}, { fetchImpl })), 'WORKERS_AI_KEYS_UNCHECKED');
  assert.equal(code(() => freeAiCall({ ...keys }, 'run/@cf/x', {}, { fetchImpl })), 'WORKERS_AI_KEYS_UNCHECKED');
  assert.equal(calls.length, 1);
});

const keys = freeAiKeys({ CF2_ACCOUNT_ID: TEST_FREE, CF2_WORKERS_AI_TOKEN: 't' }, sha(TEST_FREE));
const stopOf = async p => { try { await p; return null; } catch (e) { assert.ok(e instanceof NamedStop, e.message); return e; } };

test('the daily stop reads the account total before each batch; the last neuron under 9,000 fits, one more does not', async () => {
  let total = 8_960;
  const m = neuronMeter(keys, { read: async () => total, log: () => {} });
  assert.equal(await stopOf(m.need(40)), null);                        // 8,960 + 40 = 9,000: fits
  assert.equal((await stopOf(m.need(1)))?.code, 'NEURON_CEILING');     // analytics lag: still 8,960 read, but 40 already spent
  total = 0;
  const fresh = neuronMeter(keys, { read: async () => total, log: () => {} });
  assert.equal(await stopOf(fresh.need(CEILING)), null);
  assert.equal((await stopOf(fresh.need(1)))?.code, 'NEURON_CEILING');
  // Side apps on the same account count: their use read mid-run stops this run.
  const shared = neuronMeter(keys, { read: async () => total, log: () => {} });
  assert.equal(await stopOf(shared.need(100)), null);
  total = 8_950;
  assert.equal((await stopOf(shared.need(100)))?.code, 'NEURON_CEILING');
});

test('there is no override: the old owner-ceiling variables change nothing', async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { REDTEAM_NEURON_CEILING: '1000000', REDTEAM_ALLOW_MAIN: '1', WORKERS_AI_ANSWER_CALLS_DAILY: '100000' });
  try {
    const m = neuronMeter(keys, { read: async () => 8_990, log: () => {} });
    assert.equal((await stopOf(m.need(40)))?.code, 'NEURON_CEILING');
    assert.equal(code(() => freeAiKeys({ ...process.env, ...MAIN, CF2_ACCOUNT_ID: 'main-account-0000', CF2_WORKERS_AI_TOKEN: 'x' }, sha(TEST_FREE))), 'MAIN_ACCOUNT_REFUSED');
  } finally { for (const k of ['REDTEAM_NEURON_CEILING', 'REDTEAM_ALLOW_MAIN', 'WORKERS_AI_ANSWER_CALLS_DAILY']) if (!(k in saved)) delete process.env[k]; }
});

test('no script hands freeAiKeys its own allow-list or reads the keys any other way', () => {
  const files = spawnSync('git', ['ls-files', 'worker/scripts', 'scripts'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim().split('\n').filter(f => /\.(mjs|js|ts|sh)$/.test(f) && f !== 'worker/scripts/free-ai.mjs');
  assert.ok(files.length > 20, `only ${files.length} scripts listed`);
  for (const f of files) {
    const src = readFileSync(resolve(ROOT, f), 'utf8');
    for (const call of src.match(/freeAiKeys\([^)]*\)/g) ?? []) assert.equal(call, 'freeAiKeys()', `${f}: ${call}`);
    // Workers AI is reached only through freeAiCall (the dev Worker's REST stand-in gets its keys from worker-dev.sh's check).
    if (/\/ai\/(run|v1)\//.test(src)) assert.equal(f, 'worker/scripts/dev-entry.ts', `${f} calls Workers AI directly`);
  }
});

test("a total that can't be read is \"couldn't check\": the run stops, never assumes free room", async () => {
  const m = neuronMeter(keys, { read: async () => { throw new Error('403'); }, log: () => {} });
  const e = await stopOf(m.need(1));
  assert.equal(e?.code, 'NEURON_READ_FAILED');
  assert.match(e.message, /couldn't check/);
  assert.notEqual(e.exitCode, 0);
});

test('a run stopped at the limit keeps every result and the next day does only what is left', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'free-ai-'));
  const file = join(dir, 'run.json');
  const items = ['a', 'b', 'c', 'd', 'e'];
  let day = Date.UTC(2026, 10, 27, 20), used = 8_880;
  const run = async () => {
    const kept = checkpoint(file);
    const meter = neuronMeter(keys, { read: async () => used, now: () => day, log: () => {} });
    const made = [];
    for (const id of items) {
      if (kept.has(id)) continue;
      const stop = await stopOf(meter.need(40, `item ${id}`));
      if (stop) return { stop, made };
      made.push(id); kept.put(id, { ok: true, id });
    }
    return { stop: null, made };
  };
  const first = await run();
  assert.equal(first.stop?.code, 'NEURON_CEILING');
  assert.deepEqual(first.made, ['a', 'b', 'c']);                   // 8,880 + 3 x 40 = 9,000
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(file, 'utf8'))), ['a', 'b', 'c']);
  day += 86_400_000; used = 0;                                      // the next UTC day
  const second = await run();
  assert.equal(second.stop, null);
  assert.deepEqual(second.made, ['d', 'e']);                        // never restarted
  assert.deepEqual(Object.keys(checkpoint(file).done), items);
  assert.equal(existsSync(`${file}.tmp`), false);
});

// The real scripts, as a person would run them under vault:run with the main account's keys: each is refused by
// name before it loads anything else, and makes zero network calls (every fetch is logged by the preload).
const scripts = [
  ['worker/scripts/risk-measure.mjs'],
  ['worker/scripts/judge-calibrate.mjs'],
  ['worker/scripts/rejudge.mjs', 'redteam-out'],
  ['worker/scripts/redteam.mjs'],
  ['worker/scripts/crisis-eval.mjs'],
  ['worker/scripts/made-for-you-soak.mjs', 'drain', '<dir>'],
];
const runScript = (args, env) => {
  const net = join(mkdtempSync(join(tmpdir(), 'free-ai-net-')), 'net.log');
  writeFileSync(net, '');
  const r = spawnSync(process.execPath, ['--import', resolve(ROOT, 'worker/test/net-count.preload.mjs'), ...args.map(a => a === '<dir>' ? mkdtempSync(join(tmpdir(), 'soak-')) : a)],
    { cwd: ROOT, env: { PATH: process.env.PATH, NET_LOG: net, PBS_RT_GEMINI_FREE: 'g', PBS_RT_OPENROUTER_PAID: 'o', ...env }, encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, err: r.stderr, calls: readFileSync(net, 'utf8').trim() };
};
for (const args of scripts) {
  test(`${args[0]}: the main account is refused with zero calls`, () => {
    const r = runScript(args, { ...MAIN, CF2_ACCOUNT_ID: MAIN.CLOUDFLARE_ACCOUNT_ID, CF2_WORKERS_AI_TOKEN: MAIN.CLOUDFLARE_API_TOKEN });
    assert.equal(r.status, 3, r.err);
    assert.match(r.err, /NAMED STOP MAIN_ACCOUNT_REFUSED/);
    assert.equal(r.calls, '');
  });
  test(`${args[0]}: an account that is not the free one is refused with zero calls, even with no main id to compare`, () => {
    const r = runScript(args, { CF2_ACCOUNT_ID: 'some-paid-account', CF2_WORKERS_AI_TOKEN: 'x' });
    assert.equal(r.status, 3, r.err);
    assert.match(r.err, /NAMED STOP CF_ACCOUNT_NOT_FREE/);
    assert.equal(r.calls, '');
  });
}

test('scripts/worker-dev.sh refuses the main account before it unlocks, writes keys or starts wrangler', () => {
  const r = spawnSync('bash', ['scripts/worker-dev.sh'], { cwd: ROOT, encoding: 'utf8', timeout: 60_000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...MAIN, CF2_ACCOUNT_ID: MAIN.CLOUDFLARE_ACCOUNT_ID, CF2_WORKERS_AI_TOKEN: 'x', PBS_FREE_GEMINI_API_KEY: 'g' } });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /NAMED STOP MAIN_ACCOUNT_REFUSED/);
  assert.doesNotMatch(r.stdout + r.stderr, /git-crypt|D1 ready|wrangler/);
});
