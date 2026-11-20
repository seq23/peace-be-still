// The free model ladder, in the order of providers.mjs (the list the privacy policy names).
// A rung that is out of its daily allowance, has no key, is rate-limited, fails or returns
// malformed JSON is skipped and counted; all out = null, which the caller turns into the named
// stop CHAT_NO_FREE_MODEL and the kind in-app message. Never fatal while another rung works.
import { reserve, logCode } from './counts';
import { RungError, type JsonSchema, type Message, type Rung } from './providers/types';

export type LadderRung = { id: string; call: Rung; cap: number; day: string };
export type Metrics = Map<string, number>;
export const tally = (m: Metrics, key: string) => m.set(key, (m.get(key) ?? 0) + 1);

export async function runLadder(db: D1Database, rungs: LadderRung[], messages: Message[], schema: JsonSchema, maxTokens: number, metrics: Metrics, valid: (data: unknown) => boolean): Promise<{ rung: string; data: unknown } | null> {
  for (const rung of rungs) {
    if (!(await reserve(db, rung.day, `calls:${rung.id}`, rung.cap))) { tally(metrics, `capped:${rung.id}`); continue; }
    try {
      const data = await rung.call(messages, schema, maxTokens);
      if (!valid(data)) throw new RungError('malformed', 'WRONG_SHAPE');
      tally(metrics, `ok:${rung.id}`);
      return { rung: rung.id, data };
    } catch (error) {
      const kind = error instanceof RungError ? error.kind : 'failed';
      tally(metrics, `${kind === 'rate_limited' ? '429' : kind === 'missing_key' ? 'missing' : kind === 'malformed' ? 'malformed' : 'fail'}:${rung.id}`);
      logCode(error instanceof RungError ? error.message : 'RUNG_ERROR', { rung: rung.id });
    }
  }
  return null;
}
