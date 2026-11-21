#!/bin/zsh
# launchd entry for the library fill (com.seq.pbs-library-fill). Runs from the runner checkout
# (~/GitHub/.pbs-runner, a clone tracking main) so the worktrees and her checkout are never touched.
# Pull first (new code, new content scripts marked passed), then three lanes, each in its own time box
# so none starves another: the Bible fill 60 minutes, Hush Harbor (Gemini) 12, the clone lane 45.
set -u
cd "${0:A:h}/.." || exit 2
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
git pull --rebase --autostash -q || echo "note: git pull failed; running on the code already here"
PY="${PBS_WHISPER_PY:-$HOME/Work/codex-briefs/peace-be-still/voice-samples/.venv/bin/python}"
# The run window (her call 20 Nov 2026): every night 17:00-08:00 CT, weekends included; never in the
# workday. Each step is capped to the minutes left before the next weekday 08:00 (fill.window_minutes).
left() { "$PY" audio/fill.py --window-minutes 2>/dev/null || echo 0; }
cap() { local l; l=$(left); echo $(( l < $1 ? l : $1 )); }
if (( $(left) <= 0 )); then
  echo "NOTE outside the run window (every day 17:00-08:00 CT): no audio this run"
  exit 0
fi
"$PY" audio/fill.py --commit --max-minutes "$(cap 60)"; rc=$?
# Then the Hush Harbor stories (Gemini, key from the Boss OS vault). One queue: it takes the fill's
# own lock, so the Mac never runs two renders at once; nice 15 comes from the launchd job. Its quota
# stops are notes (exit 0).
HH="$PWD/audio/hush_harbor.py"
rc2=0
if (( $(left) > 0 )); then
  (cd "${BOSS_OS_REPO:-$HOME/GitHub/boss-os}" && npm run -s vault:run -- "$PY" "$HH" --commit --max-minutes "$(cap 12)"); rc2=$?
fi
# The clone lane (Chatterbox on the Mac, highest story number first) for up to 45 minutes; a story the
# box cuts off carries on next run from its saved sentences. Same lock, nice 15, no key.
rc3=0
(( $(left) > 0 )) && { "$PY" audio/hush_clone.py --commit --max-minutes "$(cap 45)"; rc3=$?; }
(( rc3 > rc2 )) && rc2=$rc3
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
