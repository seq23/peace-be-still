"""The checks every library track passes before it is shelved (QUALITY.md, audio rows).

Runs in the faster-whisper venv (PBS_WHISPER_PY, default
~/Work/codex-briefs/peace-be-still/voice-samples/.venv/bin/python), on the Mac, never CI.

  A01 words match the script   faster-whisper base, word accuracy against the stored text
  A06 loudness, peaks, clipping ffmpeg ebur128 (integrated, true peak) + 0 clipped samples
  A07 not cut short            the script's last words are in the last part of the transcript
  length sane                  spoken words per minute (gaps included) inside a range

`check(...)` returns {"pass": bool, "problems": [...], ...numbers}. The bars are in BARS, by kind.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
import text as T  # noqa: E402

# Psalms are the sleep library (Psalm Nights draw on them): sleep loudness. Bible chapters and
# other read-aloud: the read-aloud level. Accuracy: KJV 0.95, Spanish 0.90 (QUALITY.md A01/A11).
BARS = {
    "sleep": {"lufs": (-24.0, -20.0), "tp_max": -2.0},
    "read": {"lufs": (-18.0, -16.0), "tp_max": -1.0},
}
ACCURACY = {"en": 0.95, "es": 0.90}
WPM = (55.0, 150.0)          # words a minute over the whole file, quiet gaps included
TARGET = {"sleep": -22.0, "read": -17.0}


def ffprobe_seconds(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def loudness(path: Path) -> dict:
    """Integrated LUFS and true peak (dBTP) from ffmpeg ebur128."""
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
    tp = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
    if not i or not tp:
        raise RuntimeError(f"ebur128 gave no summary for {path.name}")
    return {"lufs": float(i.group(1)), "true_peak": float(tp.group(1))}


def decode(path: Path, rate: int):
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def clipped_samples(path: Path) -> int:
    import numpy as np
    return int(np.count_nonzero(np.abs(decode(path, 24000)) >= 0.999))


_MODELS: dict = {}


def transcribe(path: Path, lang: str, model: str = "base") -> str:
    """faster-whisper, local. "base" first (QUALITY.md A01); a score under the bar is heard again
    by "small" before it counts, because base mishears the KJV's old words (Psalm 3, 18 Nov 2026:
    base 0.947 with "belongeth" -> "belongs", "Absalom" -> "upsalam"; small 0.98 on the same file)."""
    if model not in _MODELS:
        from faster_whisper import WhisperModel
        _MODELS[model] = WhisperModel(model, device="cpu", compute_type="int8")
    segs, _ = _MODELS[model].transcribe(decode(path, 16000), language=lang, beam_size=5,
                                        condition_on_previous_text=False)
    return " ".join(s.text.strip() for s in segs)


def accuracy(script: str, transcript: str, lang: str) -> float:
    ref, hyp = T.score_words(script, lang), T.score_words(transcript, lang)
    if not ref:
        return 0.0
    return round(SequenceMatcher(None, ref, hyp, autojunk=False).ratio(), 4)


def ends_whole(script: str, transcript: str, lang: str) -> bool:
    """A07: at least two of the script's last three words are among the transcript's last fifteen."""
    ref, hyp = T.score_words(script, lang), T.score_words(transcript, lang)
    tail = set(hyp[-15:])
    last = ref[-3:]
    return bool(last) and sum(w in tail for w in last) >= min(2, len(last))


def judge(*, script: str, transcript: str, lang: str, level: str, seconds: float, lufs: float,
          true_peak: float, clipped: int) -> dict:
    """Pure: the numbers in, pass/problems out. Kept apart from the measuring so it is tested."""
    words = len(T.score_words(script, lang))
    acc = accuracy(script, transcript, lang)
    wpm = round(words / (seconds / 60.0), 1) if seconds > 0 else 0.0
    bar = BARS[level]
    problems = []
    if acc < ACCURACY[lang]:
        problems.append(f"A01 word accuracy {acc} < {ACCURACY[lang]}")
    if not ends_whole(script, transcript, lang):
        problems.append("A07 the last words are not in the transcript")
    if not (bar["lufs"][0] <= lufs <= bar["lufs"][1]):
        problems.append(f"A06 loudness {lufs} LUFS outside {bar['lufs']}")
    if true_peak > bar["tp_max"]:
        problems.append(f"A06 true peak {true_peak} dBTP > {bar['tp_max']}")
    if clipped:
        problems.append(f"A06 {clipped} clipped samples")
    if not (WPM[0] <= wpm <= WPM[1]):
        problems.append(f"length {seconds}s for {words} words = {wpm} wpm, outside {WPM}")
    return {"pass": not problems, "problems": problems, "accuracy": acc, "wpm": wpm, "words": words,
            "lufs": lufs, "true_peak": true_peak, "clipped": clipped}


def check(path: Path, script: str, lang: str, level: str) -> dict:
    seconds = ffprobe_seconds(path)
    loud = loudness(path)
    clipped = clipped_samples(path)
    asr = "base"
    transcript = transcribe(path, lang, asr)
    if accuracy(script, transcript, lang) < ACCURACY[lang] or not ends_whole(script, transcript, lang):
        asr = "small"
        transcript = transcribe(path, lang, asr)
    out = judge(script=script, transcript=transcript, lang=lang, level=level, seconds=seconds,
                lufs=loud["lufs"], true_peak=loud["true_peak"], clipped=clipped)
    out["asr"] = asr
    out["seconds"] = round(seconds, 2)
    out["transcript_tail"] = transcript[-120:]
    return out


if __name__ == "__main__":
    # Manual use: qa.py <file> <lang> <level> < script.txt
    print(json.dumps(check(Path(sys.argv[1]), sys.stdin.read(), sys.argv[2], sys.argv[3]), indent=1))
