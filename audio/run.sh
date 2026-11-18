#!/bin/zsh
# launchd entry for the library fill (com.seq.pbs-library-fill). Runs from the runner checkout
# (~/GitHub/.pbs-runner, a clone tracking main) so the worktrees and her checkout are never touched.
# Pull first (new code, new content scripts marked passed), then one fill run of up to ~110 minutes,
# then up to 12 minutes of Hush Harbor stories (audio/hush_harbor.py).
set -u
cd "${0:A:h}/.." || exit 2
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
git pull --rebase --autostash -q || echo "note: git pull failed; running on the code already here"
PY="${PBS_WHISPER_PY:-$HOME/Work/codex-briefs/peace-be-still/voice-samples/.venv/bin/python}"
"$PY" audio/fill.py --commit --max-minutes 110; rc=$?
# Then the Hush Harbor stories (Gemini, key from the Boss OS vault). Its quota stops are notes
# (exit 0); it holds its own lock, so while a long fill run works, the next start still runs it.
HH="$PWD/audio/hush_harbor.py"
(cd "${BOSS_OS_REPO:-$HOME/GitHub/boss-os}" && npm run -s vault:run -- "$PY" "$HH" --commit --max-minutes 12); rc2=$?
exit $(( rc > rc2 ? rc : rc2 ))
