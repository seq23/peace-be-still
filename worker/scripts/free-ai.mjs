// The ONE way a Peace Be Still script, eval or dev tool reaches Cloudflare Workers AI (her answer 27 Nov
// 2026: "Remove it, never bill"). Only the second Cloudflare account is allowed: it is on the free Workers
// plan, so Cloudflare stops it at 10,000 neurons a UTC day and never bills. The main account is on Workers
// Paid and bills every neuron past 10,000 (Nov 2026: 692,199 over, ~$6 of it from these scripts), so it is
// refused before the first call. There is no flag, input or variable that lets a run past this guard or
// past the daily stop: a run bigger than the free room stops, keeps every result, and carries on the next
// UTC day from where it stopped.
//   Keys: CF2_ACCOUNT_ID + CF2_WORKERS_AI_TOKEN from the Boss OS vault (or the repo's CF2 secrets in a
//   workflow). Ids and keys are never printed.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

// sha256 of the second account's id (lower case): the only account a run may use. An allow-list, so a
// third account, a typo or the main id is refused even where the main id is not in the environment.
export const FREE_ACCOUNT_SHA256 = 'f4b7c0208aab0b7fa0afa5f503e164820927b22e7996378c5faa8a169df7071a';
// The stop, on the ACCOUNT's whole UTC-day total (side apps share it), under the 10,000 free neurons.
export const CEILING = 9_000;
// Measured 20 Nov 2026: the 98-item round-4 red team used ~33 neurons an item. Rounded up.
export const NEURONS_PER_ITEM = 40;

export class NamedStop extends Error {
  constructor(code, message, exitCode = 3) { super(message); this.code = code; this.exitCode = exitCode; }
}
const issued = new WeakSet();
const hash = s => createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex');

/** The free account's keys, or a NamedStop. Pure: reads env only, makes no call. (`allow` is for the unit
 * test's own made-up account; no script passes it, and nothing in the environment can change it.) */
export function freeAiKeys(env = process.env, allow = FREE_ACCOUNT_SHA256) {
  const account = env.CF2_ACCOUNT_ID?.trim(), token = env.CF2_WORKERS_AI_TOKEN?.trim();
  if (!account || !token) throw new NamedStop('WORKERS_AI_KEYS_MISSING', 'set CF2_ACCOUNT_ID and CF2_WORKERS_AI_TOKEN (the free second Cloudflare account)');
  const main = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const mainTokens = [env.CLOUDFLARE_API_TOKEN, env.T2R_CLOUDFLARE_WORKERS_AI_TOKEN].map(t => t?.trim()).filter(Boolean);
  if ((main && hash(main) === hash(account)) || mainTokens.includes(token)) {
    throw new NamedStop('MAIN_ACCOUNT_REFUSED', 'the main Cloudflare account bills Workers AI past the free allowance; AI tests run only on the free second account');
  }
  if (hash(account) !== allow) throw new NamedStop('CF_ACCOUNT_NOT_FREE', 'CF2_ACCOUNT_ID is not the free second account this repo allows (worker/scripts/free-ai.mjs)');
  const keys = Object.freeze({ account, token });
  issued.add(keys);
  return keys;
}

/** The only Workers AI call a script makes: `path` under /ai/ (run/<model>, v1/chat/completions), with keys
 * that freeAiKeys handed out. Any other keys object is refused before the call. */
export function freeAiCall(keys, path, body, { timeoutMs = 90_000, fetchImpl = fetch } = {}) {
  if (!issued.has(keys)) throw new NamedStop('WORKERS_AI_KEYS_UNCHECKED', 'Workers AI keys must come from freeAiKeys (worker/scripts/free-ai.mjs)');
  return fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${keys.account}/ai/${path}`, {
    method: 'POST', headers: { authorization: `Bearer ${keys.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Today's (UTC) neurons on the account, from Cloudflare's GraphQL analytics. Throws if unreadable. */
export async function neuronsUsedToday({ token, account }, now = Date.now(), fetchImpl = fetch) {
  const day = new Date(now).toISOString().slice(0, 10);
  const query = `query{viewer{accounts(filter:{accountTag:"${account}"}){aiInferenceAdaptiveGroups(limit:100,filter:{date:"${day}"}){sum{totalNeurons}}}}}`;
  const res = await fetchImpl('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20_000) });
  const j = await res.json().catch(() => ({}));
  const groups = j?.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups;
  if (!Array.isArray(groups)) throw new Error(`analytics answer had no usage (status ${res.status})`);
  const total = groups.reduce((s, g) => s + (g.sum?.totalNeurons ?? 0), 0);
  if (!Number.isFinite(total)) throw new Error('analytics total was not a number');
  return total;
}

/**
 * The daily stop. `need(n)` before each batch: it reads the account's day total and refuses (NamedStop
 * NEURON_CEILING) when that total plus this run's own spend since the first read plus `n` would pass the
 * ceiling. Analytics lag a few minutes, so the run's own count is the floor of what it has used. A total
 * that cannot be read is "couldn't check": no room is assumed beyond what is already known, so it stops.
 */
// The stop is CEILING, fixed in code: no option, flag or variable raises it.
export function neuronMeter(keys, { read = neuronsUsedToday, now = Date.now, log = console.log } = {}) {
  const ceiling = CEILING;
  let day = null, first = 0, own = 0;
  return {
    get own() { return own; },
    spent(n) { own += n; },
    async need(n, where = 'the next batch') {
      const today = new Date(now()).toISOString().slice(0, 10);
      if (today !== day) { day = today; first = null; own = 0; }
      let total;
      try { total = await read(keys, now()); }
      catch (e) { throw new NamedStop('NEURON_READ_FAILED', `couldn't check today's Workers AI use on the free account (${e.message}); stopped before ${where}, nothing assumed free`, 4); }
      if (first === null) first = total;
      const used = Math.max(total, first + own);
      if (used + n > ceiling) throw new NamedStop('NEURON_CEILING', `the free account has used ~${Math.round(used)} of ${ceiling} neurons today (UTC); ${where} needs ~${Math.round(n)}`, 4);
      log(`neurons today ~${Math.round(used)} of ${ceiling}; ${where} ~${Math.round(n)}`);
      own += n;
    },
  };
}

/** What a run's inputs are: the commit plus any uncommitted change, so a resume never mixes two versions. */
export function runFingerprint(parts, cwd = new URL('../..', import.meta.url).pathname) {
  let code = 'no-git';
  try { code = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim() + hash(execFileSync('git', ['diff', 'HEAD'], { cwd, encoding: 'utf8', maxBuffer: 64 << 20 })); } catch { /* not a checkout */ }
  return hash(JSON.stringify([code, ...parts])).slice(0, 16);
}

/**
 * Results kept across a stop: one JSON file per run fingerprint, rewritten (atomically) after every result,
 * so a run stopped at the daily limit carries on the next day from the first item it has not done.
 */
export function checkpoint(file) {
  const done = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return {
    file, done,
    has: id => Object.hasOwn(done, id),
    get: id => done[id],
    put(id, value) {
      done[id] = value;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.tmp`, JSON.stringify(done));
      renameSync(`${file}.tmp`, file);
    },
  };
}
export const checkpointFile = (name, fingerprint) => new URL(`../../.free-ai-runs/${name}-${fingerprint}.json`, import.meta.url).pathname;

/** Prints a NamedStop the way every script ends on one, with where the kept results are, and exits. */
export function exitOnStop(error, kept) {
  if (!(error instanceof NamedStop)) throw error;
  const resume = kept && ['NEURON_CEILING', 'NEURON_READ_FAILED'].includes(error.code)
    ? ` Results so far are kept in ${kept}; run the same command again (after 00:00 UTC, 6 PM Central, for NEURON_CEILING) and it carries on from there.` : '';
  console.error(`NAMED STOP ${error.code}: ${error.message}.${resume}`);
  process.exit(error.exitCode);
}

// CLI: `node worker/scripts/free-ai.mjs check` exits 0 only for the free account's keys (scripts/worker-dev.sh).
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'check') {
  try { freeAiKeys(); console.log('free-ai: the free second account'); } catch (e) { exitOnStop(e); }
}
