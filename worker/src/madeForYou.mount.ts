// Made for you inside the chat Worker: the real dependencies, bound once. index.ts calls madeForYou(env, deps,
// install) for /api/made-for-you/*, for a session report ({session} on /api/report) and from its hourly cron.
import { appSpendMonth, capAlert, safetyBudgetLeft } from './controls';
import { crisisLevel, phraseHit, type RiskVerdict } from './crisis';
import { bump, logCode, reserve } from './counts';
import { centralDay, utcDay } from './day';
import { openRouterPrivate } from './providers/openrouter';
import { runLadder } from './ladder';
import { RungError } from './providers/types';
import { checkAnswer } from './quality/answer';
import { judgeSchema, judgeVerdict } from './quality/judge';
import { crisisText } from './replies';
import { banned } from './shared';
import type { Install } from './token';
import type { Deps } from './index';
import { createMadeForYou, madeForYouEnv, madeForYouRungs, verbatimScripture, type PaidCall } from './madeForYou';
import config from './madeForYou.config.json';
import { r2Private } from './madeForYou.storage';

/** The made-for-you secrets and var (worker/integration/README.md lists where each one comes from). */
export type MadeForYouEnv = {
  CF2_ACCOUNT_ID?: string;
  PBS_MFY_R2_ACCESS_KEY_ID?: string;
  PBS_MFY_R2_SECRET_ACCESS_KEY?: string;
  PBS_MFY_R2_BUCKET?: string;
  PBS_MADE_FOR_YOU_RUNNER_SECRET?: string;
};

/** Chat keeps at least half of every rung: made-for-you books chat's own row too, under half its cap. */
export const chatShare = (db: D1Database) => ({
  book: (day: string, metric: string, cap: number) => reserve(db, day, metric, cap),
  out: () => new RungError('exhausted', 'MFY_SHARE_USED'),
});

type InstallReader = (request: Request, env: Env, now: number, graceDays?: number) => Promise<Install | null | 'missing'>;
/** The last rung: phase 3's private paid route on its key, left out once the app's paid AI spend this month is at the cap. */
async function paidCall(env: Env, now: number): Promise<PaidCall | null> {
  const capUsd = Number(env.PAID_AI_MONTHLY_CAP_USD);
  const cap = (Number.isFinite(capUsd) && capUsd >= 0 ? capUsd : 100) * 1e6;
  const spent = await appSpendMonth(env.DB, now);
  if (spent >= cap) { await capAlert(env.DB, now, 100, spent, cap / 1e6); return null; }
  return { call: openRouterPrivate(env.OPENROUTER_API_KEY, config.paid.model, config.paid.hosts), day: utcDay(now) };
}
/** The ladder's paid cost goes into chat's own paid_spend_micro (the one monthly cap and its 80%/100% alerts). */
export async function bookPaidSpend(db: D1Database, now: number, metrics: Map<string, number>, capUsd: number) {
  const micro = metrics.get('paid_spend_micro') ?? 0;
  if (micro <= 0) return;
  await bump(db, centralDay(now), 'paid_spend_micro', micro);
  const spent = await appSpendMonth(db, now);
  if (spent >= capUsd * 1e6) await capAlert(db, now, 100, spent, capUsd);
  else if (spent >= 0.8 * capUsd * 1e6) await capAlert(db, now, 80, spent, capUsd);
}

const central = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });

export function madeForYou(env: Env & MadeForYouEnv, deps: Deps, install: InstallReader, graceDays: number) {
  const storage = r2Private({
    accountId: env.CF2_ACCOUNT_ID, accessKeyId: env.PBS_MFY_R2_ACCESS_KEY_ID,
    secretAccessKey: env.PBS_MFY_R2_SECRET_ACCESS_KEY, bucket: env.PBS_MFY_R2_BUCKET,
  }, deps.now);
  return createMadeForYou({
    db: env.DB,
    now: deps.now,
    centralDay: value => central.format(value),
    // index.ts has already refused blocked regions and plain HTTP before routing here.
    allowedRegion: () => true,
    async install(request, at) {
      // An expired token still deletes (her delete must work whenever she asks), as /api/memory does.
      const who = await install(request, env, at, request.method === 'DELETE' ? graceDays : 0);
      return who === 'missing' ? null : who;
    },
    limit: async installId => (await env.CHAT_BURST.limit({ key: installId })).success,
    paid: (installId, at) => deps.paid(env, installId, at),
    // Chat's own layers, before anything is queued: the intent phrases, then the private safety model under
    // chat's monthly safety budget. Any signal, high or low, is the crisis reply (a note that may be a cry for
    // help is never turned into a session); a model that cannot read is 'down', and nothing is queued.
    detectCrisis: async turns => {
      const hit = phraseHit(turns);
      if (hit) return { fired: true, kind: hit };
      const cap = Number(env.SAFETY_MONTHLY_CAP_USD);
      const read: RiskVerdict = await safetyBudgetLeft(env.DB, deps.now(), Number.isFinite(cap) && cap >= 0 ? cap : 10)
        ? await deps.risk(env, turns).catch((): RiskVerdict => ({ verdict: 'down' }))
        : { verdict: 'down' };
      const level = crisisLevel(turns, read);
      return level.level === 'none' ? { fired: false, read: level.read } : { fired: true, kind: level.kind };
    },
    crisisText: (kind, lang, age, text, door) => crisisText(kind, lang, age, text, door),
    async ladder(use, messages, schema, maxTokens, valid, signal, paidOnly) {
      const now = deps.now();
      const metrics = new Map<string, number>();
      const rungs = madeForYouRungs(deps.rungs(madeForYouEnv(env), now), use, chatShare(env.DB), signal, await paidCall(env, now), paidOnly);
      try {
        const result = await runLadder(env.DB, rungs, messages, schema as never, maxTokens, metrics, valid);
        // Which rung answered (a code, never the text): the soak's live log and the paid fallback's own count.
        if ('rung' in result) logCode('MADE_FOR_YOU_RUNG', { use, rung: result.rung });
        return result;
      }
      finally { const capUsd = Number(env.PAID_AI_MONTHLY_CAP_USD); await bookPaidSpend(env.DB, now, metrics, Number.isFinite(capUsd) && capUsd >= 0 ? capUsd : 100); }
    },
    checkProse: (draft, ctx) => checkAnswer(draft, { ...ctx, db: env.DB }),
    verbatim: (translation, text) => verbatimScripture(env.DB, translation, text),
    judgeShared: { schema: judgeSchema, verdict: judgeVerdict },
    banned,
    async psalm(translation, psalm) {
      const { results } = await env.DB.prepare("SELECT text FROM bible_verses WHERE translation = ? AND book = 'PSA' AND chapter = ? AND verse <= ? ORDER BY verse")
        .bind(translation, psalm.chapter, psalm.verses).all<{ text: string }>();
      return results.map(row => row.text);
    },
    playUrl: storage.playUrl,
    hasAudio: storage.hasAudio,
    deleteAudio: storage.deleteAudio,
    copyAudio: storage.copyAudio,
    runnerSecret: env.PBS_MADE_FOR_YOU_RUNNER_SECRET,
  });
}
