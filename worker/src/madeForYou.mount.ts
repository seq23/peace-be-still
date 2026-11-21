// Made for you inside the chat Worker: the real dependencies, bound once. Phase 3's index.ts calls
// madeForYou(env, deps, install) for /api/made-for-you/*, for a session report ({session} on /api/report)
// and from its hourly cron (worker/integration/phase3-index.patch is the whole change to index.ts; CI's
// made-for-you-integration job applies it to the pinned phase 3 and runs phase 3's own typecheck and tests).
// Relative imports are phase 3's modules: this file only compiles inside the integrated worker/src.
import { detectCrisis } from './crisis';
import { reserve } from './counts';
import { runLadder } from './ladder';
import { RungError } from './providers/types';
import { checkAnswer } from './quality/answer';
import { judgeSchema, judgeVerdict } from './quality/judge';
import { crisisText } from './replies';
import { banned } from './shared';
import type { Install } from './token';
import type { Deps } from './index';
import { createMadeForYou, madeForYouRungs } from './madeForYou';
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
    detectCrisis: async turns => {
      const result = await detectCrisis(turns, () => deps.risk(env, turns));
      return result.fired ? { fired: true, kind: result.kind } : { fired: false, read: result.read === 'down' ? 'down' : 'none' };
    },
    crisisText: (kind, lang, age, text, door) => crisisText(kind, lang, age, text, door),
    ladder: (use, messages, schema, maxTokens, valid, signal) =>
      runLadder(env.DB, madeForYouRungs(deps.rungs(env, deps.now()), use, chatShare(env.DB), signal), messages, schema as never, maxTokens, new Map(), valid),
    checkProse: (draft, ctx) => checkAnswer(draft, { ...ctx, db: env.DB }),
    judgeShared: { schema: judgeSchema, verdict: judgeVerdict },
    banned,
    async psalm(translation) {
      const { results } = await env.DB.prepare("SELECT text FROM bible_verses WHERE translation = ? AND book = 'PSA' AND chapter = 23 ORDER BY verse")
        .bind(translation).all<{ text: string }>();
      return results.map(row => row.text);
    },
    playUrl: storage.playUrl,
    hasAudio: storage.hasAudio,
    deleteAudio: storage.deleteAudio,
    copyAudio: storage.copyAudio,
    runnerSecret: env.PBS_MADE_FOR_YOU_RUNNER_SECRET,
  });
}
