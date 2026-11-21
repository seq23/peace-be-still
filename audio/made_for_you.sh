#!/bin/zsh
# launchd entry for paid made-for-you sessions (com.seq.pbs-made-for-you): its own job, lock, log and
# exit code, so a held request never turns the library fill red and a broken promise is never hidden
# inside it. Same runner checkout and voice venv as audio/run.sh; keys from the Boss OS vault.
# Exit 0 = every request is on time (held ones are retried); 9 = a named stop (MADE_FOR_YOU_LATE: a
# request is past the time the app showed her; MADE_FOR_YOU_CONFIG / _PRIVATE_BUCKET / _TIMEBOX ...).
set -u
cd "${0:A:h}/.." || exit 2
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
git pull --rebase --autostash -q || echo "note: git pull failed; running on the code already here"
PY="${PBS_WHISPER_PY:-$HOME/Work/codex-briefs/peace-be-still/voice-samples/.venv/bin/python}"
SCRIPT="$PWD/audio/made_for_you.py"
cd "${BOSS_OS_REPO:-$HOME/GitHub/boss-os}" && exec npm run -s vault:run -- "$PY" "$SCRIPT"
