#!/bin/zsh
# Install (or refresh) the library-fill and made-for-you launchd jobs. Makes the runner clone if missing.
# Every reload goes through seq-bin launchd-reload (21 Nov 2026): a paused job keeps its pause, a running
# fill is not killed (its new file is applied after it ends), and a reload that fails puts the last good
# file back. A fill whose plist is HELD (~/.peace-be-still/held/, moved in by its own one-shot) is never
# written or loaded from here: the hold is the one-shot's to end.
set -eu
RUNNER="${PBS_RUNNER:-$HOME/GitHub/.pbs-runner}"
RELOAD="${LAUNCHD_RELOAD:-$HOME/bin/launchd-reload}"
HELD="$HOME/.peace-be-still/held"
[ -x "$RELOAD" ] || { echo "NAMED STOP [NO_LAUNCHD_RELOAD] $RELOAD is missing (seq-bin install-launchd.sh puts it there). Nothing installed." >&2; exit 4; }
"$RELOAD" --seed >/dev/null || { echo "NAMED STOP [RELOAD_SEED_FAILED] could not keep the last good plists. Nothing installed." >&2; exit 4; }
[ -d "$RUNNER/.git" ] || git clone -q https://github.com/seq23/peace-be-still.git "$RUNNER"
git -C "$RUNNER" pull --rebase -q
mkdir -p "$HOME/.peace-be-still/logs"
rc=0
for JOB in com.seq.pbs-library-fill com.seq.pbs-made-for-you; do
  if [ -e "$HELD/$JOB.plist" ]; then
    echo "HELD $JOB: its plist is held in $HELD; left alone (its one-shot moves it in)"
    continue
  fi
  DEST="$HOME/Library/LaunchAgents/$JOB.plist"
  sed -e "s#__RUNNER__#$RUNNER#g" -e "s#__HOME__#$HOME#g" "$RUNNER/audio/launchd/$JOB.plist" > "$DEST"
  "$RELOAD" "$DEST" || rc=1
  echo "installed $JOB (runner $RUNNER)"
done
[ "$rc" = 0 ] || { echo "NAMED STOP [RELOAD_FAILED] a job kept its OLD schedule (lines above)." >&2; exit 1; }
