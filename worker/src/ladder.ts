// The free model ladder, in the order of providers.mjs (the list the privacy policy names).
// A rung out of its daily allowance or without a key is skipped; a rung that fails, is
// rate-limited or returns malformed JSON is counted and the next rung is tried. The outcome tells
// the two empty cases apart, because she is told different things:
//  - 'out':  every rung is really out for today (its counter is at the cap, the provider said its
//            DAILY quota is used up, or it has no key) -> the named stop CHAT_NO_FREE_MODEL,
//            "resting until tomorrow";
//  - 'busy': at least one rung only failed for a moment -> "give it a minute", chat stays open.
import { reserve, logCode } from './counts';
import { RungError, type JsonSchema, type Message, type Rung } from './providers/types';
import { microCost } from './controls';

/** price: per-million-token dollars for a billed rung (the paid lane); its cost is tallied as paid_spend_micro.
 *  google: the rung reaches a Gemini model (Google's API, or a google/ model through OpenRouter). Google's terms bar
 *  every Gemini route from a service likely used by under-18s, so a teen's words never reach such a rung (index.ts offGoogle). */
export type LadderRung = { id: string; call: Rung; cap: number; day: string; price?: { in: number; out: number; cached?: number }; google?: boolean };
export type Metrics = Map<string, number>;
export const tally = (m: Metrics, key: string, by = 1) => m.set(key, (m.get(key) ?? 0) + by);
export type LadderResult = { rung: string; data: unknown } | { empty: 'out' | 'busy' };

/** The provider said today's quota is used up: no more calls to it until its day turns. */
async function markOut(db: D1Database, rung: LadderRung): Promise<void> {
  await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, ?) ON CONFLICT(day, metric) DO UPDATE SET n = max(n, excluded.n)')
    .bind(rung.day, `calls:${rung.id}`, rung.cap).run();
}

export async function runLadder(db: D1Database, rungs: LadderRung[], messages: Message[], schema: JsonSchema, maxTokens: number, metrics: Metrics, valid: (data: unknown) => boolean): Promise<LadderResult> {
  let busy = false;
  for (const rung of rungs) {
    if (!(await reserve(db, rung.day, `calls:${rung.id}`, rung.cap))) { tally(metrics, `capped:${rung.id}`); continue; }
    try {
      const data = await rung.call(messages, schema, maxTokens, u => {
        tally(metrics, `tok_in:${rung.id}`, u.in); tally(metrics, `tok_out:${rung.id}`, u.out); tally(metrics, `tok_think:${rung.id}`, u.think);
        if (u.cached) tally(metrics, `tok_cached:${rung.id}`, u.cached);
        if (rung.price) {
          // What the route billed when it says (OpenRouter), else the list prices: the ledger is the real spend.
          tally(metrics, 'paid_spend_micro', typeof u.usd === 'number' ? Math.round(u.usd * 1e6) : microCost(u, rung.price.in, rung.price.out, rung.price.cached));
          // What the same call would have cost with no prompt cache: the saving is measured, not assumed.
          tally(metrics, 'paid_spend_nocache_micro', microCost(u, rung.price.in, rung.price.out));
        }
      });
      if (!valid(data)) throw new RungError('malformed', 'WRONG_SHAPE');
      tally(metrics, `ok:${rung.id}`);
      return { rung: rung.id, data };
    } catch (error) {
      const kind = error instanceof RungError ? error.kind : 'failed';
      const label = { rate_limited: '429', missing_key: 'missing', malformed: 'malformed', cut_off: 'cutoff', exhausted: 'exhausted', failed: 'fail' }[kind];
      tally(metrics, `${label}:${rung.id}`);
      logCode(error instanceof RungError ? error.message : 'RUNG_ERROR', { rung: rung.id });
      if (kind === 'exhausted') await markOut(db, rung);
      else if (kind !== 'missing_key') busy = true;
    }
  }
  return { empty: busy ? 'busy' : 'out' };
}
