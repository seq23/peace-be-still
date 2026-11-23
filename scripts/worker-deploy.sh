#!/usr/bin/env bash
# The ONLY way the chat Worker is deployed (never a bare `wrangler deploy`). Claude runs it after land,
# under the Boss OS vault: cd ~/GitHub/boss-os && npm run -s vault:run -- bash <repo>/scripts/worker-deploy.sh
# Order: config check -> secrets check -> DeviceCheck key check and sync -> D1 migrations -> Bible rows -> deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
# The prompts and crisis lists are encrypted in git: unlock first, or NAMED STOP and nothing deployed (never empty prompts).
bash scripts/git-crypt-unlock.sh
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
# The private first chat's Apple DeviceCheck key (worker/src/firstprivate.ts): checked with Apple first
# (401 = NAMED STOP DEVICECHECK_KEY_REJECTED, nothing deployed), then put from the vault through a pipe.
node scripts/devicecheck-probe.mjs
printf %s "$APPLE_DEVICECHECK_KEY" | $W secret put APPLE_DEVICECHECK_KEY $CFG >/dev/null
printf %s "$APPLE_DEVICECHECK_KEY_ID" | $W secret put APPLE_DEVICECHECK_KEY_ID $CFG >/dev/null
printf %s "$APPLE_TEAM_ID_PBS" | $W secret put APPLE_TEAM_ID $CFG >/dev/null
echo "OUTPUT devicecheck: 3 Worker secrets put from the vault"
# Store review access (worker/src/review.ts): the code is the vault's PBS_PLAY_REVIEW_CODE (10 digits), so the
# Play Console App access note and the Worker never differ; the used-up alert files Open Loops with BOSS_OPEN_LOOPS_TOKEN.
if printf %s "${PBS_PLAY_REVIEW_CODE:-}" | grep -Eqx '[0-9]{10}'; then
  printf %s "$PBS_PLAY_REVIEW_CODE" | $W secret put REVIEW_CODE $CFG >/dev/null && echo "OUTPUT review: REVIEW_CODE put from the vault"
else echo "NOTE PBS_PLAY_REVIEW_CODE_MISSING: review code not refreshed (the Worker keeps its own; no window opens without one)"; fi
if [ -n "${BOSS_OPEN_LOOPS_TOKEN:-}" ]; then printf %s "$BOSS_OPEN_LOOPS_TOKEN" | $W secret put BOSS_OPEN_LOOPS_TOKEN $CFG >/dev/null
else echo "NOTE BOSS_OPEN_LOOPS_TOKEN_MISSING: a used-up review code is logged (REVIEW_DEVICE_CAP) but files no Open Loops row"; fi
# Story artwork (worker/src/storyart.ts): the R2 bucket, made once.
$W r2 bucket list $CFG 2>/dev/null | grep -q "pbs-story-art" || $W r2 bucket create pbs-story-art $CFG
$W d1 migrations apply peace-be-still-chat --remote $CFG
node scripts/worker-bible-load.mjs --remote
# Made for you's Scripture index over the same Bible (idempotent, keyed to the Bible version; zero rows stops the deploy).
node worker/scripts/made-for-you-bible-runs.mjs --remote
$W deploy $CFG
echo "OUTPUT worker: deployed peace-be-still-chat"
