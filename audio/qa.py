"""The checks every library track passes before it is shelved (QUALITY.md, audio rows).

Runs in the faster-whisper venv (PBS_WHISPER_PY on the Mac; the cloud runner's own python), never CI.

  A01 words match the script   ONE judge: faster-whisper large-v3-turbo (int8), told the chapter's names,
                               word accuracy against the stored text (see `accuracy`)
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

# The owner's margin rule (~/.claude/CLAUDE.md, 21 Nov 2026): the bars above are TARGETS. A file only
# FAILS about 25% outside them, which catches broken output (silent, truncated, wrong text, distorted);
# a near-miss ships with a logged note. 21 Nov: a -18.1 LUFS chapter (0.1 LU under -18.0) was thrown away.
LU_MARGIN = 2.5              # loudness: read -18..-16 is the target, -20.5..-13.5 the hard band
TP_MARGIN = 1.0              # true peak: 1 dB over the ceiling (never above 0 dBTP)
CLIP_MAX = 25                # a handful of clipped samples is inaudible; more is distortion
ACC_MARGIN = 0.25            # word accuracy: 25% more misheard words than the target allows (0.95 -> 0.9375)
WPM_HARD = (WPM[0] * 0.75, WPM[1] * 1.25)


def hard_accuracy(target: float) -> float:
    """The accuracy below which a render is broken: the target's error rate plus 25%. Pure."""
    return round(1 - (1 - target) * (1 + ACC_MARGIN), 4)


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

# The one judge (23 Nov 2026). base -> small misheard the KJV's names and old words, so chapters read right
# failed the strict scripture bar: Psalm 83 small 0.929 (asaph, hagarenes, gebal, sisera, zalmunna ...),
# large-v3-turbo told the psalm's names 0.973; Psalm 121 small cut "for evermore" (A07), turbo 0.992.
# Measured on the Mac CPU: about 45 s for a 3-minute chapter, 1.9 GB peak.
JUDGE_MODEL = "large-v3-turbo"
# The judge's name in a manifest row (`judge`): the model AND its scoring rules. A held file is tried again by
# itself whenever this changes (fill.is_held). r2 (27 Nov 2026): every name of a long chapter told to the judge
# by its own part, two-letter and hyphenated names, the KJV's same-sounding spellings. The bars are unchanged.
JUDGE = f"{JUDGE_MODEL} r2"
NAME_LIKE = 0.8        # a name of THIS script heard within one letter or so (tiras/tiraz, azor/azur) is the name
HINT_NAMES = 60        # names told to the judge (faster-whisper hotwords: a prompt, so it is kept short)


class JudgeUnavailable(RuntimeError):
    """The judge model could not be loaded (download, disk, memory). The caller stops by name and the
    next run retries: a file is never passed, failed or held because the judge was missing."""


def judge_model():
    """The judge, loaded once per process. Any failure to load is JudgeUnavailable, never a verdict."""
    if JUDGE_MODEL not in _MODELS:
        try:
            _MODELS[JUDGE_MODEL] = whisper_model(JUDGE_MODEL)
        except Exception as e:
            raise JudgeUnavailable(f"faster-whisper {JUDGE_MODEL} did not load: {' '.join(str(e).split())[-200:]}") from e
    return _MODELS[JUDGE_MODEL]


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


def hint(script: str, lang: str) -> str:
    """The script's names, told to the judge so it can spell them (hotwords). Pure."""
    return " ".join(list(T.names(script, lang).values())[:HINT_NAMES])


def transcribe(path: Path, lang: str, hint_words: str = "", parts: list | None = None) -> str:
    """The judge hears the speech only (speech_only), told the script's names. With `parts` (fill.parts_of:
    [(start s, end s, the part's stored words)], cut in the quiet between whole verses), each part is heard
    on its own, told ITS names, and the transcripts are joined in order: a name-list chapter (1 Chronicles 1
    has over 200 names) has far more names than the HINT_NAMES a single hint can carry. Pure of the bars:
    the joined transcript is scored against the whole script exactly as before."""
    audio = decode(path, 16000)
    pieces = [(audio, hint_words)] if not parts else [
        (audio[int(a * 16000):int(b * 16000)], hint(words, lang)) for a, b, words in parts]
    out = []
    for x, h in pieces:
        segs, _ = judge_model().transcribe(speech_only(x), language=lang, beam_size=5,
                                           condition_on_previous_text=False, hotwords=h or None)
        out += [s.text.strip() for s in segs]
    return " ".join(out)


def aligned(script: str, transcript: str, lang: str) -> tuple[list[str], list[str], list[int | None], int]:
    """(script words, heard words, heard[k], heard words used): heard[k] is the heard index of script word
    k, or None when it was not heard. Three things count as heard, and only these: the same word; words
    whose letters are the same with the spaces moved ("beth lehem" / "bethlehem", "for evermore" /
    "forevermore", "washpot" / "wash pot"); and a name of THIS script heard one-for-one within NAME_LIKE
    ("tiras" / "tiraz"). A dropped verse, an added word or a swapped word is never heard. Pure."""
    ref, hyp = T.score_words(script, lang), T.score_words(transcript, lang)
    names = set(T.names(script, lang))
    heard: list[int | None] = [None] * len(ref)
    used = 0
    for op, a, b, c, d in SequenceMatcher(None, ref, hyp, autojunk=False).get_opcodes():
        if op == "equal":
            heard[a:b] = range(c, d)
            used += d - c
        elif op == "replace" and "".join(ref[a:b]) == "".join(hyp[c:d]):
            heard[a:b] = [d - 1] * (b - a)
            used += d - c
        elif (op == "replace" and b - a > 1 and "".join(ref[a:b]) in names
              and SequenceMatcher(None, "".join(ref[a:b]), "".join(hyp[c:d])).ratio() >= NAME_LIKE):
            # a hyphenated name of THIS script ("Lo-debar" heard "Lodibar"): the one-name rule, the name whole
            heard[a:b] = [d - 1] * (b - a)
            used += d - c
        elif op == "replace" and b - a == d - c:
            for k in range(b - a):
                if ref[a + k] in names and SequenceMatcher(None, ref[a + k], hyp[c + k]).ratio() >= NAME_LIKE:
                    heard[a + k] = c + k
                    used += 1
    return ref, hyp, heard, used


def accuracy(script: str, transcript: str, lang: str) -> float:
    """(script words heard + heard words used) / (script words + heard words): SequenceMatcher.ratio's
    2M / (a + b), counting `aligned`'s three kinds of match. Pure."""
    ref, hyp, heard, used = aligned(script, transcript, lang)
    if not ref:
        return 0.0
    return round((sum(h is not None for h in heard) + used) / (len(ref) + len(hyp)), 4)


def ends_whole(script: str, transcript: str, lang: str) -> bool:
    """A07: at least two of the script's last three words were heard, inside the transcript's last fifteen."""
    _, hyp, heard, _ = aligned(script, transcript, lang)
    last = heard[-3:]
    return bool(last) and sum(h is not None and h >= len(hyp) - 15 for h in last) >= min(2, len(last))


def speech_problems(problems: list[str]) -> list[str]:
    """The problems a new render can fix. A06 (loudness, true peak, clipping) is mastering: the
    fill masters again from the same WAV instead (fill.master)."""
    return [p for p in problems if not p.startswith("A06")]


def judge(*, script: str, transcript: str, lang: str, level: str, seconds: float, lufs: float,
          true_peak: float, clipped: int, quiet: float = 0.0, strict_words: bool = False) -> dict:
    """Pure: the numbers in, pass/problems out. Kept apart from the measuring so it is tested."""
    words = len(T.score_words(script, lang))
    acc = accuracy(script, transcript, lang)
    spoken = seconds - quiet       # a session's long scripted pauses are not slow speech
    wpm = round(words / (spoken / 60.0), 1) if spoken > 0 else 0.0
    bar = BARS[level]
    problems, notes = [], []        # problems fail the file; notes ship it with a logged line

    def judge_one(miss: str, broken: bool) -> None:
        (problems if broken else notes).append(miss)
    if acc < ACCURACY[lang]:
        # A file that IS scripture (a Bible chapter, a psalm) keeps the strict bar: a verse read wrong is
        # always a fail. Other sessions get the margin.
        judge_one(f"A01 word accuracy {acc} < {ACCURACY[lang]}", strict_words or acc < hard_accuracy(ACCURACY[lang]))
    if not ends_whole(script, transcript, lang):
        problems.append("A07 the last words are not in the transcript")     # truncated: always broken
    lo, hi = bar["lufs"]
    if not (lo <= lufs <= hi):
        judge_one(f"A06 loudness {lufs} LUFS outside {bar['lufs']}", not (lo - LU_MARGIN <= lufs <= hi + LU_MARGIN))
    if true_peak > bar["tp_max"]:
        judge_one(f"A06 true peak {true_peak} dBTP > {bar['tp_max']}", true_peak > min(bar["tp_max"] + TP_MARGIN, 0.0))
    if clipped:
        judge_one(f"A06 {clipped} clipped samples", clipped > CLIP_MAX)
    if not (WPM[0] <= wpm <= WPM[1]):
        judge_one(f"length {seconds}s for {words} words = {wpm} wpm, outside {WPM}", not (WPM_HARD[0] <= wpm <= WPM_HARD[1]))
    return {"pass": not problems, "problems": problems, "notes": notes, "accuracy": acc, "wpm": wpm, "words": words,
            "lufs": lufs, "true_peak": true_peak, "clipped": clipped}


def check(path: Path, script: str, lang: str, level: str, quiet: float = 0.0, strict_words: bool = False,
          parts: list | None = None) -> dict:
    seconds = ffprobe_seconds(path)
    loud = loudness(path)
    clipped = clipped_samples(path)
    transcript = transcribe(path, lang, hint(script, lang), parts)
    out = judge(script=script, transcript=transcript, lang=lang, level=level, seconds=seconds,
                lufs=loud["lufs"], true_peak=loud["true_peak"], clipped=clipped, quiet=quiet, strict_words=strict_words)
    out["asr"] = JUDGE_MODEL
    out["seconds"] = round(seconds, 2)
    out["transcript_tail"] = transcript[-120:]
    return out


if __name__ == "__main__":
    # Manual use: qa.py <file> <lang> <level> < script.txt
    print(json.dumps(check(Path(sys.argv[1]), sys.stdin.read(), sys.argv[2], sys.argv[3]), indent=1))
