// Workers AI bills past 10,000 neurons a UTC day per account, and a live run against `wrangler dev`
// starts a fresh local D1 every time, so the chat's own daily call caps reset with each run. On
// 20 Nov 2026 five red-team runs took the main account to 29,072 neurons (overage billed). This
// reads what the account has already used today and refuses a run that would pass the ceiling.
export const CEILING = 9_000;
// Measured 20 Nov 2026 from the account's analytics: the 98-item round-4 run (21:51-22:00 UTC)
// used ~3,240 neurons, ~33 an item. Rounded up. The owner's bar (20 Nov 2026): strive for $0,
// so the ceiling sits under the 10,000 free neurons a day.
export const NEURONS_PER_ITEM = 40;

/** How many items fit under the ceiling given today's use (pure, tested). */
export function itemsThatFit(used, { ceiling = CEILING, perItem = NEURONS_PER_ITEM } = {}) {
  return Math.max(0, Math.floor((ceiling - used) / perItem));
}

/** Today's (UTC) neurons on the account, from Cloudflare's GraphQL analytics. Throws if unreadable. */
export async function neuronsUsedToday(token, account, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const query = `query{viewer{accounts(filter:{accountTag:"${account}"}){aiInferenceAdaptiveGroups(limit:100,filter:{date:"${day}"}){sum{totalNeurons}}}}}`;
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  const j = await res.json().catch(() => ({}));
  const groups = j?.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups;
  if (!Array.isArray(groups)) throw new Error(`analytics answer had no usage (${JSON.stringify(j?.errors ?? res.status).slice(0, 200)})`);
  return groups.reduce((s, g) => s + (g.sum?.totalNeurons ?? 0), 0);
}

/** Exits with NAMED STOP NEURON_CEILING / NEURON_READ_FAILED unless `items` fit today. */
export async function requireHeadroom(items, env = process.env) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) { console.error('NAMED STOP NEURON_READ_FAILED: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are needed to read today\'s Workers AI use'); process.exit(4); }
  let used;
  try { used = await neuronsUsedToday(env.CLOUDFLARE_API_TOKEN, env.CLOUDFLARE_ACCOUNT_ID); }
  catch (e) { console.error(`NAMED STOP NEURON_READ_FAILED: ${e.message}`); process.exit(4); }
  // A run the owner approved past the free allowance (her typed yes, with its cost) names its own
  // ceiling for that one run; never set in a committed workflow.
  const ceiling = Number(env.REDTEAM_NEURON_CEILING) > 0 ? Number(env.REDTEAM_NEURON_CEILING) : CEILING;
  if (ceiling !== CEILING) console.log(`owner-approved ceiling for this run: ${ceiling} neurons (~$${(Math.max(0, used + items * NEURONS_PER_ITEM - 10_000) * 0.011 / 1000).toFixed(2)} past the free allowance)`);
  const fit = itemsThatFit(used, { ceiling });
  if (items > fit) { console.error(`NAMED STOP NEURON_CEILING: the account has used ${Math.round(used)} of ${ceiling} neurons today (UTC); ${items} items need ~${items * NEURONS_PER_ITEM}, ${fit} fit. Run after 00:00 UTC (6 PM Central).`); process.exit(4); }
  console.log(`neurons today ${Math.round(used)}; this run ~${items * NEURONS_PER_ITEM}; ceiling ${ceiling}`);
}
