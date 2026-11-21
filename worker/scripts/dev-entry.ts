// Local red-team entry only (scripts/worker-dev.sh with DEV_AI_TOKEN set; never deployed): the same
// Worker, with Workers AI reached over its REST API on a token that may only run models (the CF2
// pair). wrangler dev's remote AI binding needs a token with Workers Scripts permission, which the
// free second account's red-team token does not have, so `wrangler dev --local` runs this instead.
import { createApp } from '../src/index';

type DevEnv = Env & { DEV_AI_TOKEN: string; DEV_AI_ACCOUNT: string };
function restAi(token: string, account: string): Ai {
  return {
    async run(model: string, input: unknown) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(input) });
      const j = (await res.json().catch(() => ({}))) as { success?: boolean; result?: unknown; errors?: unknown };
      // The provider (src/providers/workers-ai.ts) reads the error text: 4006 = out for today, 429/3040 = busy.
      if (!res.ok || !j.success) throw new Error(`${res.status} ${JSON.stringify(j.errors ?? '').slice(0, 300)}`);
      return j.result;
    },
  } as unknown as Ai;
}
const app = createApp();
export default {
  fetch: (request, env, ctx) => app.fetch(request, { ...env, AI: restAi(env.DEV_AI_TOKEN, env.DEV_AI_ACCOUNT) }, ctx),
} satisfies ExportedHandler<DevEnv>;
