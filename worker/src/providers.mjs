// The chat ladder's rungs, in the order they are tried. Phase 3's ladder builds its
// providers from this list; the release gate fails if legal/privacy.md does not name
// every `disclosedAs` here, so a new rung cannot ship undisclosed.
// Workers AI also runs the safety read and the answer check on every message, so its free
// neurons go there first and it is the last answer rung.
export const providers = [
  { id: 'gemini-free', disclosedAs: 'Google Gemini (free tier)' },
  { id: 'openrouter-free', disclosedAs: 'free models reached through OpenRouter' },
  { id: 'workers-ai', disclosedAs: 'Cloudflare Workers AI' },
];

// Google's Gemini API free tier may not serve user-facing apps in the EEA, the UK or
// Switzerland. While Gemini free is a rung, the app is not offered there.
// Apple territory codes (ISO 3166-1 alpha-3), read by scripts/asc-dry-run.mjs.
export const excludedTerritories = [
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL',
  'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
  'ISL', 'LIE', 'NOR',
  'GBR',
  'CHE',
];
