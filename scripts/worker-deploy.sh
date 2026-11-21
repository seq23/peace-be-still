#!/usr/bin/env bash
# The ONLY way the chat Worker is deployed (never a bare `wrangler deploy`). Claude runs it after land.
# Order: config check -> secrets check -> D1 migrations -> Bible rows -> deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
W="npx --prefix worker wrangler"
CFG="--config worker/wrangler.jsonc"
if grep -q '"database_id": "00000000-0000-0000-0000-000000000000"' worker/wrangler.jsonc; then
  echo "NAMED STOP D1_DATABASE_ID_MISSING: run '$W d1 create peace-be-still-chat' and commit the id in worker/wrangler.jsonc"; exit 3
fi
secrets=$($W secret list $CFG --format json 2>/dev/null || echo '[]')
for name in CHAT_TOKEN_SECRET IP_HASH_SECRET; do
  echo "$secrets" | grep -q "\"$name\"" || { echo "NAMED STOP ${name}_MISSING: openssl rand -base64 48 | $W secret put $name $CFG"; exit 3; }
done
for name in PBS_GEMINI_API_KEY OPENROUTER_API_KEY REVENUECAT_SECRET_KEY; do
  echo "$secrets" | grep -q "\"$name\"" || echo "NOTE ${name}_MISSING: that rung or check is skipped and counted (cd ~/GitHub/boss-os && npm run -s vault:run -- sh -c 'printf %s \"\$$name\" | $W secret put $name $CFG')"
done
$W d1 migrations apply peace-be-still-chat --remote $CFG
node scripts/worker-bible-load.mjs --remote
$W deploy $CFG
echo "OUTPUT worker: deployed peace-be-still-chat"
