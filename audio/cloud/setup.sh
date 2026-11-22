#!/usr/bin/env bash
# Sets up a GitHub runner for the cloud fill lane (.github/workflows/fill-cloud.yml): ffmpeg, rclone with
# the Drive remote from the PBS_RCLONE_CONF secret (written 0600, never printed), and one engine:
#   setup.sh kokoro      Kokoro (the Bible lane), faster-whisper for the checks
#   setup.sh chatterbox  Chatterbox (the clone lane), Resemblyzer and faster-whisper for the checks
# The repo and its logs are public: no audio, clip or token is ever printed or uploaded from here.
set -euo pipefail
engine="${1:?kokoro|chatterbox}"
sudo apt-get -qq update >/dev/null
sudo apt-get -qq install -y ffmpeg >/dev/null
curl -fsSL https://rclone.org/install.sh | sudo bash >/dev/null 2>&1 || command -v rclone >/dev/null
if [ -z "${PBS_RCLONE_CONF:-}" ]; then
  echo "NAMED STOP [RCLONE_CONF_MISSING] the PBS_RCLONE_CONF secret is not set; nothing was voiced" >&2
  exit 4
fi
mkdir -p ~/.config/rclone
( umask 077; printf '%s\n' "$PBS_RCLONE_CONF" > ~/.config/rclone/rclone.conf )
rclone lsjson --max-depth 1 gdrive:Mac-Shelf/peace-be-still >/dev/null 2>&1 || {
  echo "NAMED STOP [DRIVE_UNREACHABLE] the runner could not list the Drive shelf; nothing was voiced" >&2; exit 4; }
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
echo "OUTPUT runner ready for $engine ($(nproc) CPUs, $(free -g | awk '/Mem/{print $2}') GB)"
