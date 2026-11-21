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
import os
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
    # The "3 AM, back to sleep" night: very quiet, for a half-awake listener in a dark room (21 Nov 2026).
    "hush": {"lufs": (-29.0, -25.0), "tp_max": -4.0},
}
ACCURACY = {"en": 0.95, "es": 0.90}
WPM = (55.0, 150.0)          # words a minute; a sleep session's scripted quiet (`quiet`) is left out
TARGET = {"sleep": -22.0, "read": -17.0, "hush": -27.0}


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


def whisper_model(size: str):
    """faster-whisper on the Mac's graphics chip (MPS) when it loads, else the CPU (her call 19 Nov 2026:
    "Do this"). Measured on kjv-luk-009: CPU 39.4 s, MPS 30.0 s, the same 1,473 words. PBS_WHISPER_DEVICE=cpu forces CPU."""
    from faster_whisper import WhisperModel
    if os.environ.get("PBS_WHISPER_DEVICE", "mps") == "mps":
        try:
            return WhisperModel(size, device="mps", compute_type="float16")
        except Exception as e:  # an older ctranslate2 without MPS: the CPU still works
            print(f"note: whisper on MPS unavailable ({str(e)[:80]}); using the CPU", file=sys.stderr)
    return WhisperModel(size, device="cpu", compute_type="int8")


SILENCE_DB = -50.0     # a 50 ms frame quieter than this is silence
KEEP_SILENCE_S = 0.4   # quiet kept at each cut, so words are never clipped


def speech_only(audio, rate: int = 16000, min_gap_s: float = 1.5):
    """The audio with every silence longer than min_gap_s cut down to KEEP_SILENCE_S, leading and trailing
    silence included. Whisper invents words in long silence (21 Nov 2026: "suscríbete suscríbete" in the
    closing 60 s of a sleep session), and a sleep session is mostly silence; the scripted quiet is checked
    by its own bars, so ASR hears only the speech. Pure (numpy in, numpy out)."""
    import numpy as np
    frame = int(rate * 0.05)
    n = len(audio) // frame
    if n == 0:
        return audio
    rms = np.sqrt(np.mean(np.square(audio[: n * frame].reshape(n, frame)), axis=1) + 1e-12)
    loud = 20 * np.log10(rms) > SILENCE_DB
    keep = np.zeros(n, dtype=bool)
    pad = int(KEEP_SILENCE_S / 0.05)
    run_start = None
    for i in range(n + 1):
        quiet = i < n and not loud[i]
        if quiet and run_start is None:
            run_start = i
        elif not quiet and run_start is not None:
            length = i - run_start
            inner = run_start > 0 and i < n     # a gap between speech keeps a little quiet on each side
            if length * 0.05 < min_gap_s and inner:
                keep[run_start:i] = True
            elif inner:
                keep[run_start:run_start + pad] = True
                keep[i - pad:i] = True
            run_start = None
        if i < n and loud[i]:
            keep[i] = True
    idx = np.repeat(keep, frame)
    return audio[: n * frame][idx]


def transcribe(path: Path, lang: str, model: str = "base") -> str:
    """faster-whisper, local. "base" first (QUALITY.md A01); a score under the bar is heard again
    by "small" before it counts, because base mishears the KJV's old words (Psalm 3, 18 Nov 2026:
    base 0.947 with "belongeth" -> "belongs", "Absalom" -> "upsalam"; small 0.98 on the same file)."""
    if model not in _MODELS:
        _MODELS[model] = whisper_model(model)
    segs, _ = _MODELS[model].transcribe(speech_only(decode(path, 16000)), language=lang, beam_size=5,
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


def speech_problems(problems: list[str]) -> list[str]:
    """The problems a new render can fix. A06 (loudness, true peak, clipping) is mastering: the
    fill masters again from the same WAV instead (fill.master)."""
    return [p for p in problems if not p.startswith("A06")]


def judge(*, script: str, transcript: str, lang: str, level: str, seconds: float, lufs: float,
          true_peak: float, clipped: int, quiet: float = 0.0) -> dict:
    """Pure: the numbers in, pass/problems out. Kept apart from the measuring so it is tested."""
    words = len(T.score_words(script, lang))
    acc = accuracy(script, transcript, lang)
    spoken = seconds - quiet       # a session's long scripted pauses are not slow speech
    wpm = round(words / (spoken / 60.0), 1) if spoken > 0 else 0.0
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


def check(path: Path, script: str, lang: str, level: str, quiet: float = 0.0) -> dict:
    seconds = ffprobe_seconds(path)
    loud = loudness(path)
    clipped = clipped_samples(path)
    asr = "base"
    transcript = transcribe(path, lang, asr)
    if accuracy(script, transcript, lang) < ACCURACY[lang] or not ends_whole(script, transcript, lang):
        asr = "small"
        transcript = transcribe(path, lang, asr)
    out = judge(script=script, transcript=transcript, lang=lang, level=level, seconds=seconds,
                lufs=loud["lufs"], true_peak=loud["true_peak"], clipped=clipped, quiet=quiet)
    out["asr"] = asr
    out["seconds"] = round(seconds, 2)
    out["transcript_tail"] = transcript[-120:]
    return out


if __name__ == "__main__":
    # Manual use: qa.py <file> <lang> <level> < script.txt
    print(json.dumps(check(Path(sys.argv[1]), sys.stdin.read(), sys.argv[2], sys.argv[3]), indent=1))
