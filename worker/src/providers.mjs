// The chat ladder's rungs, in the order they are tried. Phase 3's ladder builds its
// providers from this list; the release gate fails if legal/privacy.md does not name
// every `disclosedAs` here, so a new rung cannot ship undisclosed.
// The order is the one legal/privacy.md promises ("tried in this order"). Workers AI also runs
// the safety read and the answer check on every message, so its answer rung keeps a small daily
// cap (WORKERS_AI_ANSWER_CALLS_DAILY) and the ladder moves on to Gemini once it is used.
// trains: whether the provider's own terms let it keep or train on what is sent. Unknown is true.
// Workers AI: "Cloudflare does not use Customer Content processed by Workers AI to train AI models" and
// keeps no inputs or outputs past the request (developers.cloudflare.com/workers-ai/platform/data-usage,
// read 23 Nov 2026; true only while no AI Gateway logging is in the path, and workers-ai.ts uses none).
// Gemini's free tier and OpenRouter's :free models may keep and train on inputs.
export const providers = [
  { id: 'workers-ai', disclosedAs: 'Cloudflare Workers AI', trains: false },
  { id: 'gemini-free', disclosedAs: 'Google Gemini (free tier)', trains: true },
  { id: 'openrouter-free', disclosedAs: 'free models reached through OpenRouter', trains: true },
];

// A teen (13-17), or anyone whose age is not known to be adult, is sent only to rungs that never train
// (private-data-routing: children's writing never reaches a training route). When those are out, the
// teen is told chat is resting: there is no fallback to a training rung.
export const teenProviders = providers.filter(p => p.trains === false);

// Google's Gemini API free tier may not serve user-facing apps in the EEA, the UK or
// Switzerland. While Gemini free is a rung, the app is not offered there.
// Apple territory codes (ISO 3166-1 alpha-3), read by scripts/asc-dry-run.mjs.
export const excludedTerritories = [
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL',
  'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
  'ISL', 'LIE', 'NOR',
  'GBR',
  'CHE',
  // China mainland: religious content online needs a government permit, and AI-generated content has its own rules.
  'CHN',
];
