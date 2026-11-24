#!/usr/bin/env bash
# Over-the-air fix for Peace Be Still (EAS Update, free tier). Sends main's JS bundle to every phone on the SAME app
# version (runtimeVersion = appVersion); a phone fetches it at launch and runs it on the next launch.
# Never for a native change (new package, permission, plugin, icon): that is a new store version.
# Run through the vault so both purchase keys and EXPO_TOKEN are present (app.config.ts otaKeyStop refuses otherwise):
#   cd ~/GitHub/boss-os && npm run -s vault:run -- bash ~/GitHub/peace-be-still/scripts/ota-update.sh "what this fixes"
# Undo: `npx eas-cli@27.11.0 update:republish --group <previous group id>` (or update:rollback) from app/.
set -euo pipefail
msg="${1:-}"
[ -n "$msg" ] || { echo "NAMED STOP OTA_MESSAGE_MISSING: say what this update fixes" >&2; exit 2; }
cd "$(dirname "$0")/../app"
[ -n "${EXPO_TOKEN:-}" ] || { echo "NAMED STOP EXPO_TOKEN_MISSING: run through the vault" >&2; exit 2; }
git fetch -q origin main
[ -z "$(git status --short --untracked-files=no)" ] || { echo "NAMED STOP OTA_DIRTY_TREE: only landed code goes out" >&2; exit 2; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "NAMED STOP OTA_NOT_MAIN: check out origin/main first" >&2; exit 2; }
npm run -s library
export PBS_OTA_UPDATE=1
unset REVENUECAT_PBS_TEST_STORE
npx --yes eas-cli@27.11.0 update --channel production --platform all --environment production \
  --message "$msg ($(git rev-parse --short HEAD))" --non-interactive
