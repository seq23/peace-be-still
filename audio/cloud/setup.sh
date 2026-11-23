#!/usr/bin/env bash
# Sets up a GitHub runner for the cloud fill lane (.github/workflows/fill-cloud.yml): ffmpeg, rclone with
# the Drive remote from the PBS_RCLONE_CONF secret (written 0600, never printed), and one engine:
#   setup.sh kokoro      Kokoro (the Bible lane), faster-whisper (the judge, qa.JUDGE_MODEL) for the checks
#   setup.sh chatterbox  Chatterbox (the clone lane), Resemblyzer and faster-whisper for the checks
# The repo and its logs are public: no audio, clip or token is ever printed or uploaded from here.
set -euo pipefail
engine="${1:?kokoro|chatterbox}"
sudo apt-get -qq update >/dev/null
sudo apt-get -qq install -y ffmpeg >/dev/null
# rclone pinned by version and sha256 (the runner that gets the Drive token runs nothing unpinned).
RCLONE=v1.75.2; RCLONE_SHA=349ac8fba6ff65d6247043f1750cdcb518ec5d500ef91463a10d37c0ccdf3702
curl -fsSL -o /tmp/rclone.zip "https://downloads.rclone.org/$RCLONE/rclone-$RCLONE-linux-amd64.zip"
echo "$RCLONE_SHA  /tmp/rclone.zip" | sha256sum -c --quiet
unzip -q -o /tmp/rclone.zip -d /tmp && sudo install -m 0755 "/tmp/rclone-$RCLONE-linux-amd64/rclone" /usr/local/bin/rclone
if [ -z "${PBS_RCLONE_CONF:-}" ]; then
  echo "NAMED STOP [RCLONE_CONF_MISSING] the PBS_RCLONE_CONF secret is not set; nothing was voiced" >&2
  exit 4
fi
mkdir -p ~/.config/rclone
( umask 077; printf '%s\n' "$PBS_RCLONE_CONF" > ~/.config/rclone/rclone.conf )
rclone lsjson --max-depth 1 gdrive:Mac-Shelf/peace-be-still >/dev/null 2>&1 || {
  echo "NAMED STOP [DRIVE_UNREACHABLE] the runner could not list the Drive shelf; nothing was voiced" >&2; exit 4; }
# The fill reads audio/, content/ and scripts/content/, none of them git-crypt encrypted today (.gitattributes:
# the chat prompts, crisis lists, worker tests). If one ever is, this runner would read ciphertext: stop by name.
python - <<'PY'
import pathlib, sys
locked = [str(p) for d in ("audio", "content", "scripts/content") for p in pathlib.Path(d).rglob("*")
          if p.is_file() and p.open("rb").read(10) == b"\x00GITCRYPT\x00"]
if locked:
    sys.exit(f"NAMED STOP [ENCRYPTED_INPUT] the fill reads git-crypt files this runner cannot unlock: {', '.join(locked[:5])}")
PY
python -m pip install -q --upgrade pip
case "$engine" in
  kokoro)
    python -m pip install -q "kokoro-onnx==0.4.7" "faster-whisper==1.2.1" soundfile numpy scipy
    d="$HOME/kokoro"; mkdir -p "$d"
    base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
    [ -f "$d/kokoro-v1.0.onnx" ] || curl -fsSL -o "$d/kokoro-v1.0.onnx" "$base/kokoro-v1.0.onnx"
    [ -f "$d/voices-v1.0.bin" ] || curl -fsSL -o "$d/voices-v1.0.bin" "$base/voices-v1.0.bin"
    # The same files the Mac voices with (sha256 of ~/Work/claude-work/tts, 21 Nov 2026).
    echo "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5  $d/kokoro-v1.0.onnx
bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d  $d/voices-v1.0.bin" | sha256sum -c --quiet
    echo "PBS_KOKORO_DIR=$d" >> "$GITHUB_ENV"
    echo "PBS_KOKORO_PY=$(command -v python)" >> "$GITHUB_ENV"
    ;;
  chatterbox)
    python -m pip install -q "torch==2.6.0" "torchaudio==2.6.0" --index-url https://download.pytorch.org/whl/cpu
    python -m pip install -q "chatterbox-tts==0.1.7" "Resemblyzer==0.1.4" "faster-whisper==1.2.1" soundfile scipy
    HF_HUB_OFFLINE=0 python -c "from chatterbox.tts import ChatterboxTTS; ChatterboxTTS.from_pretrained(device='cpu')" >/dev/null 2>&1
    echo "PBS_CHATTERBOX_PY=$(command -v python)" >> "$GITHUB_ENV"
    ;;
  *) echo "unknown engine $engine" >&2; exit 2 ;;
esac
# The judge (qa.JUDGE_MODEL), fetched and loaded once here, so a download that fails stops the job by name
# before anything is voiced; the fill itself treats a judge that will not load as JUDGE_UNAVAILABLE, never a verdict.
( cd audio && python - <<'PY' ) || { echo "NAMED STOP [JUDGE_MODEL_UNAVAILABLE] the judge model did not download or load; nothing was voiced, the next batch retries" >&2; exit 4; }
import sys
sys.path[:0] = [".", "lib"]
import qa
qa.judge_model()
print(f"judge {qa.JUDGE_MODEL} loaded")
PY
echo "OUTPUT runner ready for $engine ($(nproc) CPUs, $(free -g | awk '/Mem/{print $2}') GB)"
