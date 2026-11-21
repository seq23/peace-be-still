#!/usr/bin/env bash
# Local chat Worker on the REAL free ladder, for `npm run redteam` (never in CI).
#   npm run worker:dev          (then, in another terminal: npm run redteam)
# Keys come from the Boss OS vault and are never printed:
#   CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID open wrangler dev's remote Workers AI session
#   (T2R_CLOUDFLARE_WORKERS_AI_TOKEN cannot: it has no Workers Scripts permission);
#   or DEV_AI_TOKEN + DEV_AI_ACCOUNT (a token that may only run models, like the CF2 red-team pair):
#   then wrangler dev runs --local with worker/scripts/dev-entry.ts, which reaches Workers AI over REST;
#   PBS_FREE_GEMINI_API_KEY (the unbilled "PBS free chat" project: the free lane) and/or
#   PBS_GEMINI_API_KEY (the billed project: the paid lane; DEV_LANE=paid makes every install paid) and
#   OPENROUTER_API_KEY ($0 spend limit, :free models only) go into worker/.dev.vars (git-ignored, 0600).
# No REVENUECAT_SECRET_KEY: everyone runs as free, as the red team expects.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOSS_OS="${BOSS_OS:-$HOME/GitHub/boss-os}"
if { [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -z "${DEV_AI_TOKEN:-}" ]; } || { [ -z "${PBS_GEMINI_API_KEY:-}" ] && [ -z "${PBS_FREE_GEMINI_API_KEY:-}" ]; }; then
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
  [ -n "${PBS_FREE_GEMINI_API_KEY:-}" ] && echo "PBS_FREE_GEMINI_API_KEY=$PBS_FREE_GEMINI_API_KEY"
  # The billed key only for a paid-lane run: a free-lane run never has it.
  [ "${DEV_LANE:-}" = paid ] && [ -n "${PBS_GEMINI_API_KEY:-}" ] && echo "PBS_GEMINI_API_KEY=$PBS_GEMINI_API_KEY"
  [ -n "${DEV_LANE:-}" ] && echo "DEV_LANE=$DEV_LANE"
  # Research runs (21 Nov 2026): the paid lane's route and model, its list prices, and the judge.
  for v in PAID_PROVIDER PAID_MODEL PAID_HOSTS PAID_PRICE_IN_PER_M PAID_PRICE_OUT_PER_M WORKERS_AI_JUDGE_MODEL; do
    eval "x=\${DEV_$v:-}"; [ -z "$x" ] || echo "$v=$x"
  done
  [ -n "${OPENROUTER_API_KEY:-}" ] && echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY"
  # A red team the owner approved past the free answer rungs may raise the Workers AI answer cap for that run.
  [ -n "${WORKERS_AI_ANSWER_CALLS_DAILY:-}" ] && echo "WORKERS_AI_ANSWER_CALLS_DAILY=$WORKERS_AI_ANSWER_CALLS_DAILY"
  if [ -n "${DEV_AI_TOKEN:-}" ]; then echo "DEV_AI_TOKEN=$DEV_AI_TOKEN"; echo "DEV_AI_ACCOUNT=${DEV_AI_ACCOUNT:?DEV_AI_ACCOUNT is needed with DEV_AI_TOKEN}"; fi
} > worker/.dev.vars
# CI=1 + no stdin: wrangler never waits on an "OK to proceed?" prompt.
export CI=1
$W d1 migrations apply peace-be-still-chat --local $CFG </dev/null | tail -1
count() { $W d1 execute peace-be-still-chat --local $CFG --json --command "SELECT count(*) AS n FROM bible_verses" 2>/dev/null </dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[0].results[0].n)}catch{console.log(0)}})'; }
[ "$(count)" -ge 62000 ] || node scripts/worker-bible-load.mjs --local </dev/null
n=$(count)
[ "$n" -ge 62000 ] || { echo "NAMED STOP BIBLE_NOT_LOADED: local D1 has $n verses"; exit 3; }
echo "worker:dev: D1 ready ($n verses); starting wrangler dev on https://localhost:8787 at nice 15"
unset CI # wrangler dev itself stays interactive-safe without it
# HTTPS: the Worker refuses plain HTTP (privacy policy), so the red team talks to it over TLS.
if [ -n "${DEV_AI_TOKEN:-}" ]; then
  exec nice -n 15 $W dev worker/scripts/dev-entry.ts $CFG --local --port 8787 --local-protocol https </dev/null
fi
exec nice -n 15 $W dev $CFG --port 8787 --local-protocol https </dev/null
