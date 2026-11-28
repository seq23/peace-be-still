#!/usr/bin/env bash
# Local chat Worker on the REAL free ladder, for `npm run redteam` (never in CI).
#   npm run worker:dev          (then, in another terminal: npm run redteam)
# Keys come from the Boss OS vault and are never printed:
#   CF2_ACCOUNT_ID + CF2_WORKERS_AI_TOKEN: Workers AI on the free second account ONLY (her answer 27 Nov 2026,
#   "Remove it, never bill"). worker/scripts/free-ai.mjs refuses the main account (Workers Paid: it bills past
#   10,000 neurons a day) before anything starts; wrangler dev runs --local with worker/scripts/dev-entry.ts,
#   which reaches Workers AI over REST on that account. The main account's keys are unset before wrangler runs,
#   so no remote AI binding can open on it;
#   PBS_FREE_GEMINI_API_KEY (the unbilled "PBS free chat" project: the free lane) and/or
#   PBS_GEMINI_API_KEY (the billed project: the paid lane; DEV_LANE=paid makes every install paid) and
#   OPENROUTER_API_KEY ($0 spend limit, :free models only) go into worker/.dev.vars (git-ignored, 0600).
# No REVENUECAT_SECRET_KEY: everyone runs as free, as the red team expects.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOSS_OS="${BOSS_OS:-$HOME/GitHub/boss-os}"
if { [ -z "${CF2_ACCOUNT_ID:-}" ] || [ -z "${CF2_WORKERS_AI_TOKEN:-}" ]; } || { [ -z "${PBS_GEMINI_API_KEY:-}" ] && [ -z "${PBS_FREE_GEMINI_API_KEY:-}" ]; }; then
  [ -z "${PBS_WORKER_DEV_VAULTED:-}" ] || { echo "NAMED STOP WORKERS_AI_KEYS_MISSING: the vault has no CF2_ACCOUNT_ID / CF2_WORKERS_AI_TOKEN or Gemini key"; exit 3; }
  [ -d "$BOSS_OS" ] || { echo "NAMED STOP VAULT_MISSING: set BOSS_OS to the boss-os checkout (vault:run)"; exit 3; }
  exec bash -c "cd '$BOSS_OS' && PBS_WORKER_DEV_VAULTED=1 npm run -s vault:run -- bash '$ROOT/scripts/worker-dev.sh'"
fi
cd "$ROOT"
node worker/scripts/free-ai.mjs check # exits 3 (NAMED STOP MAIN_ACCOUNT_REFUSED / CF_ACCOUNT_NOT_FREE) before anything runs
bash scripts/git-crypt-unlock.sh # the encrypted prompts, crisis lists and red-team sets (from the vault)
W="npx --prefix worker wrangler"
CFG="--config worker/wrangler.jsonc"
umask 077
{
  echo "CHAT_TOKEN_SECRET=$(openssl rand -hex 32)"
  echo "IP_HASH_SECRET=$(openssl rand -hex 32)"
  [ -n "${PBS_FREE_GEMINI_API_KEY:-}" ] && echo "PBS_FREE_GEMINI_API_KEY=$PBS_FREE_GEMINI_API_KEY"
  # The billed key: the paid lane and the crisis lane (any flagged message, free or paid). The free lane
  # never reads it (worker/test/controls.test.ts proves the free lane cannot see this name).
  [ -n "${PBS_GEMINI_API_KEY:-}" ] && echo "PBS_GEMINI_API_KEY=$PBS_GEMINI_API_KEY"
  [ -n "${DEV_LANE:-}" ] && echo "DEV_LANE=$DEV_LANE"
  # Research runs (21 Nov 2026): the paid lane's route and model, its list prices, and the judge.
  for v in PAID_PROVIDER PAID_MODEL PAID_HOSTS PAID_BACKUP_MODEL MEMORY_EVERY PAID_ANSWER_MAX_TOKENS PAID_PRICE_IN_PER_M PAID_PRICE_OUT_PER_M PAID_PRICE_CACHED_PER_M CRISIS_MODEL WORKERS_AI_JUDGE_MODEL CHAT_GLOBAL_MESSAGES_DAILY CHAT_IP_MESSAGES_DAILY; do
    eval "x=\${DEV_$v:-}"; [ -z "$x" ] || echo "$v=$x"
  done
  [ -n "${OPENROUTER_API_KEY:-}" ] && echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY"
  echo "DEV_AI_TOKEN=$CF2_WORKERS_AI_TOKEN"
  echo "DEV_AI_ACCOUNT=$CF2_ACCOUNT_ID"
} > worker/.dev.vars
# The main account's keys never reach wrangler (no remote session, no remote AI binding on it).
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID T2R_CLOUDFLARE_WORKERS_AI_TOKEN
# CI=1 + no stdin: wrangler never waits on an "OK to proceed?" prompt.
export CI=1
$W d1 migrations apply peace-be-still-chat --local $CFG </dev/null | tail -1
count() { $W d1 execute peace-be-still-chat --local $CFG --json --command "SELECT count(*) AS n FROM bible_verses" 2>/dev/null </dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[0].results[0].n)}catch{console.log(0)}})'; }
[ "$(count)" -ge 155000 ] || node scripts/worker-bible-load.mjs --local </dev/null
n=$(count)
[ "$n" -ge 155000 ] || { echo "NAMED STOP BIBLE_NOT_LOADED: local D1 has $n verses"; exit 3; }
echo "worker:dev: D1 ready ($n verses); starting wrangler dev on https://localhost:8787 at nice 15"
unset CI # wrangler dev itself stays interactive-safe without it
# HTTPS: the Worker refuses plain HTTP (privacy policy), so the red team talks to it over TLS.
exec nice -n 15 $W dev worker/scripts/dev-entry.ts $CFG --local --port 8787 --local-protocol https </dev/null
