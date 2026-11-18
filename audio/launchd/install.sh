#!/bin/zsh
# Install (or refresh) the library-fill launchd job. Makes the runner clone if missing.
set -eu
RUNNER="${PBS_RUNNER:-$HOME/GitHub/.pbs-runner}"
[ -d "$RUNNER/.git" ] || git clone -q https://github.com/seq23/peace-be-still.git "$RUNNER"
git -C "$RUNNER" pull --rebase -q
mkdir -p "$HOME/.peace-be-still/logs"
DEST="$HOME/Library/LaunchAgents/com.seq.pbs-library-fill.plist"
sed -e "s#__RUNNER__#$RUNNER#g" -e "s#__HOME__#$HOME#g" "$RUNNER/audio/launchd/com.seq.pbs-library-fill.plist" > "$DEST"
plutil -lint "$DEST"
launchctl bootout "gui/$(id -u)/com.seq.pbs-library-fill" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "installed com.seq.pbs-library-fill (runner $RUNNER)"
