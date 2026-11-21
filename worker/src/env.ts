// Secrets are not in wrangler.jsonc (they are put with `wrangler secret put`), so `wrangler types`
// cannot see them. They are declared here as optional: a missing one is a named stop in code.
type Secrets = {
  CHAT_TOKEN_SECRET?: string;
  CHAT_TOKEN_SECRET_PREVIOUS?: string;
  IP_HASH_SECRET?: string;
  PBS_GEMINI_API_KEY?: string;
  PBS_FREE_GEMINI_API_KEY?: string;
  CHAT_ADMIN_TOKEN?: string;
  OPENROUTER_API_KEY?: string;
  REVENUECAT_SECRET_KEY?: string;
};
declare global {
  namespace Cloudflare { interface Env extends Secrets {} }
  interface Env extends Secrets {}
}
export {};
