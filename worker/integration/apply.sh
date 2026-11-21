#!/usr/bin/env bash
# Puts Made for you into a phase 3 checkout exactly as the integration merge will: the lane's Worker
# modules and migration next to phase 3's, and the one change to index.ts (phase3-index.patch).
#   worker/integration/apply.sh <phase 3 checkout>
set -euo pipefail
lane="$(cd "$(dirname "$0")/../.." && pwd)"
p3="$(cd "$1" && pwd)"
for f in madeForYou.ts madeForYou.storage.ts madeForYou.samples.ts madeForYou.mount.ts madeForYou.config.json; do
  cp "$lane/worker/src/$f" "$p3/worker/src/$f"
done
cp "$lane/worker/migrations/0006_made_for_you.sql" "$p3/worker/migrations/"
git -C "$p3" apply --whitespace=nowarn "$lane/worker/integration/phase3-index.patch"
echo "OUTPUT made-for-you integrated into phase 3 $(git -C "$p3" rev-parse --short HEAD)"
