#!/bin/zsh
# launchd entry for the library fill (com.seq.pbs-library-fill). Runs from the runner checkout
# (~/GitHub/.pbs-runner, a clone tracking main) so the worktrees and her checkout are never touched.
# Pull first (new code, new content scripts marked passed), then the two lanes AT THE SAME TIME (owner,
# 21 Nov 2026: "2 lanes is a must"), each with its own lock and a 90-minute box: the Bible fill (Kokoro)
# and the Hush Harbor clone lane (Chatterbox). They are the night's only two heavy jobs. The clone lane,
# the heavier, waits while memory is tight (audio/lib/memguard.py) and stops for the run if it stays tight,
# so the night degrades to one lane on its own.
# Hush Harbor is voiced ONLY on the clone lane (owner, 21 Nov 2026: "we cloned the voices for hush harbor
# ... so are not subj to quota"); the Gemini lane (audio/hush_harbor.py) is kept as code but not run.
# Memory and disk are logged before and after every run; each lane clears its own work files.
set -u
cd "${0:A:h}/.." || exit 2
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
git pull --rebase --autostash -q || echo "note: git pull failed; running on the code already here"
PY="${PBS_WHISPER_PY:-$HOME/Work/codex-briefs/peace-be-still/voice-samples/.venv/bin/python}"
# The run window (the Mac's day, her ruling): heavy work 22:00-07:00 CT only; new work stops at 06:45
# so every lane checkpoints before 06:55. Each step is capped to the minutes left (fill.window_minutes).
left() { "$PY" audio/fill.py --window-minutes 2>/dev/null || echo 0; }
cap() { local l; l=$(left); echo $(( l < $1 ? l : $1 )); }
if (( $(left) <= 0 )); then
  echo "NOTE outside the run window (every day 22:00-06:45 CT): no audio this run"
  exit 0
fi
mem() { echo "MEM $1: pressure level $(sysctl -n kern.memorystatus_vm_pressure_level 2>/dev/null), $(sysctl vm.swapusage 2>/dev/null | sed 's/^vm.swapusage: //'), disk free $(df -h "$HOME" | awk 'NR==2{print $4}')"; }
mem before
box=$(cap 90)
"$PY" audio/fill.py --commit --max-minutes "$box" & bible=$!
PBS_HH_LOCK=clone-lane.lock "$PY" audio/hush_clone.py --commit --max-minutes "$box" & clone=$!
wait $bible; rc=$?
wait $clone; rc2=$?
mem after
# Then publish: every shelved, passed file not yet in R2 streams Drive -> R2 (hash-checked) and the
# served manifest is rewritten, so the app gets new audio with no release (audio/publish.py). This
# same step is the backfill. Key from the vault; free-tier cap is its own named stop.
PUB="$PWD/audio/publish.py"
rc4=0
(( $(left) > 0 )) && { (cd "${BOSS_OS_REPO:-$HOME/GitHub/boss-os}" && npm run -s vault:run -- "$PY" "$PUB" --max-minutes "$(cap 20)"); rc4=$?; }
(( rc4 > rc2 )) && rc2=$rc4
# Push any manifest commit this run made (a push that failed inside fill.py is retried here), so the
# runner is never left ahead of origin when a PR also touches the manifest.
git push -q 2>/dev/null || echo "note: manifest push failed; the next run pushes it"
exit $(( rc > rc2 ? rc : rc2 ))
