#!/bin/zsh
# Install (or refresh) the library-fill and made-for-you launchd jobs. Makes the runner clone if missing.
set -eu
RUNNER="${PBS_RUNNER:-$HOME/GitHub/.pbs-runner}"
[ -d "$RUNNER/.git" ] || git clone -q https://github.com/seq23/peace-be-still.git "$RUNNER"
git -C "$RUNNER" pull --rebase -q
mkdir -p "$HOME/.peace-be-still/logs"
for JOB in com.seq.pbs-library-fill com.seq.pbs-made-for-you; do
  DEST="$HOME/Library/LaunchAgents/$JOB.plist"
  sed -e "s#__RUNNER__#$RUNNER#g" -e "s#__HOME__#$HOME#g" "$RUNNER/audio/launchd/$JOB.plist" > "$DEST"
  plutil -lint "$DEST"
  launchctl bootout "gui/$(id -u)/$JOB" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$DEST"
  echo "installed $JOB (runner $RUNNER)"
done
