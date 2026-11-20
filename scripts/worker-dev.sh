#!/usr/bin/env bash
# Local chat Worker on the REAL free ladder, for `npm run redteam` (never in CI).
#   npm run worker:dev          (then, in another terminal: npm run redteam)
# Keys come from the Boss OS vault and are never printed:
#   CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID open wrangler dev's remote Workers AI session
#   (T2R_CLOUDFLARE_WORKERS_AI_TOKEN cannot: it has no Workers Scripts permission);
#   PBS_GEMINI_API_KEY (the Peace Be Still-only free AI Studio project, never a billed key) and
#   OPENROUTER_API_KEY ($0 spend limit, :free models only) go into worker/.dev.vars (git-ignored, 0600).
# No REVENUECAT_SECRET_KEY: everyone runs as free, as the red team expects.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOSS_OS="${BOSS_OS:-$HOME/GitHub/boss-os}"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${PBS_GEMINI_API_KEY:-}" ]; then
  [ -d "$BOSS_OS" ] || { echo "NAMED STOP VAULT_MISSING: set BOSS_OS to the boss-os checkout (vault:run)"; exit 3; }
  exec bash -c "cd '$BOSS_OS' && npm run -s vault:run -- bash '$ROOT/scripts/worker-dev.sh'"
fi
cd "$ROOT"
W="npx --prefix worker wrangler"
CFG="--config worker/wrangler.jsonc"
umask 077
{
  echo "CHAT_TOKEN_SECRET=$(openssl rand -hex 32)"
  echo "IP_HASH_SECRET=$(openssl rand -hex 32)"
  echo "PBS_GEMINI_API_KEY=$PBS_GEMINI_API_KEY"
  [ -n "${OPENROUTER_API_KEY:-}" ] && echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY"
} > worker/.dev.vars
$W d1 migrations apply peace-be-still-chat --local $CFG >/dev/null
n=$($W d1 execute peace-be-still-chat --local $CFG --json --command "SELECT count(*) AS n FROM bible_verses" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[0].results[0].n)}catch{console.log(0)}})')
[ "${n:-0}" -ge 62000 ] || node scripts/worker-bible-load.mjs --local
echo "worker:dev: D1 ready ($n verses); starting wrangler dev on :8787 at nice 15"
exec nice -n 15 $W dev $CFG --port 8787
