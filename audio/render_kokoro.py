"""Render one library track with Kokoro-82M (Apache-2.0; runtime kokoro-onnx, MIT).

Runs in the Kokoro venv (PBS_KOKORO_PY, default ~/Work/claude-work/tts/venv/bin/python), not CI.
Reads a job on stdin:
  {"voice": "af_nicole" | {"blend": {"af_nicole": 0.7, "ef_dora": 0.3}}, "lang": "en-us" | "es",
   "speed": 0.85, "lead": 0.6, "tail": 2.0, "segments": [{"text": "...", "gap": 1.5}], "out": "/path.wav"}
Each segment is voiced on its own, given a 25 ms fade at both ends (no clicks at the joins,
QUALITY.md A08), and followed by `gap` seconds of silence (the quiet between verses).
Prints one JSON line: {"seconds": ..., "segments": n}.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from kokoro_onnx.config import EspeakConfig

FADE_S = 0.025


def voice_of(k, spec):
    if isinstance(spec, str):
        return spec
    blend = spec["blend"]
    return sum(w * k.get_voice_style(name) for name, w in blend.items()).astype(np.float32)


def main():
    job = json.load(sys.stdin)
    t = Path(os.environ.get("PBS_KOKORO_DIR", Path.home() / "Work/claude-work/tts"))
    brew = Path(os.environ.get("PBS_ESPEAK_PREFIX", "/opt/homebrew/opt/espeak-ng"))
    k = Kokoro(str(t / "kokoro-v1.0.onnx"), str(t / "voices-v1.0.bin"),
               espeak_config=EspeakConfig(lib_path=str(brew / "lib/libespeak-ng.dylib"),
                                          data_path=str(brew / "share/espeak-ng-data")))
    voice = voice_of(k, job["voice"])
    sr = 24000
    parts = [np.zeros(int(job.get("lead", 0.6) * sr), dtype=np.float32)]
    for seg in job["segments"]:
        s, sr = k.create(seg["text"], voice=voice, speed=job.get("speed", 0.85), lang=job["lang"])
        s = np.asarray(s, dtype=np.float32)
        n = min(int(FADE_S * sr), len(s) // 2)
        if n:
            ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
            s[:n] *= ramp
            s[-n:] *= ramp[::-1]
        parts += [s, np.zeros(int(seg.get("gap", 1.0) * sr), dtype=np.float32)]
    parts.append(np.zeros(int(job.get("tail", 2.0) * sr), dtype=np.float32))
    audio = np.concatenate(parts)
    sf.write(job["out"], audio, sr, subtype="PCM_16")
    print(json.dumps({"seconds": round(len(audio) / sr, 2), "segments": len(job["segments"])}))


if __name__ == "__main__":
    main()
