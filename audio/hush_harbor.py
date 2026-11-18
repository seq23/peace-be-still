"""HUSH HARBOR AUDIO: voice the Hush Harbor stories with the four locked Gemini voices, check, shelve.

Owner-locked 18 Nov 2026 (COMMON.md "HUSH HARBOR VOICES LOCKED"; voices + exact style lines in
audio/hush-harbor/voices.json). The grandmother (Gacrux) narrates and reads every word Jesus or God
says; Charon reads elder men; Kore reads women; Umbriel reads other men and groups. The story JSON
already splits every verse by speaker (scripts/content/library.mjs speechSegments); this file maps
speakers to voices, so who speaks is decided by code, never by the model.

The free key allows 10 TTS calls a day PER MODEL (429 body, 18 Nov 2026), so a story is 2 calls:
  call A   everything before the call and response's first [PAUSE 3s]
  call B   the response line, then the rest of the story; cut by code after the response line
           (faster-whisper word times, then the quietest point between the two words)
Each call is Gemini multi-speaker (at most two voices): the grandmother plus the call's main other
voice; a minor voice's lines go to the closest of the two (a man's to the other man, otherwise the
grandmother). The pauses are 3.0 s of silence inserted by code. If call B cannot be cut cleanly it
is rendered as two calls instead (3 in all).

Checks: each call's word accuracy vs its text (old spellings forgiven, as in the fill), and each
turn's pitch (median F0 over its time span) inside its voice's band; a call that misses is rendered
again (MAX_TRIES). The joined file: fill.encode (-22 LUFS, limiter, AAC m4a) then qa.check, the
library fill's own checks. Then gdrive:Mac-Shelf/peace-be-still/stories/hush-harbor/en/ + md5
check, the Mac copy deleted, a manifest row (audio/manifest.jsonl, with the model(s) used).

Quota: MODELS are tried in order, each with its own free daily quota (same prebuilt voices); a
per-day 429 parks that model until the server's retry time; when every model is parked the run ends
with NAMED STOP [QUOTA_OUT], a note (exit 0): rendered calls are cached on the Mac and the next run
resumes. Never another key or project, never billing. Every run ends with
`OUTPUT <n> Hush Harbor stories shelved` and `hush harbor: X of Y stories voiced, N failed`.

Run by the library-fill launchd job (audio/run.sh, after fill.py), key from the Boss OS vault.
By hand:  cd ~/GitHub/boss-os && npm run -s vault:run -- <whisper venv python> <repo>/audio/hush_harbor.py --limit 1
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from difflib import SequenceMatcher
from pathlib import Path

AUDIO = Path(__file__).resolve().parent
REPO = AUDIO.parent
sys.path.insert(0, str(AUDIO))
sys.path.insert(0, str(AUDIO / "lib"))
import fill  # noqa: E402
import text as T  # noqa: E402

VOICES = json.loads((AUDIO / "hush-harbor" / "voices.json").read_text("utf-8"))
MODELS = VOICES["models"]
STORIES = REPO / "content" / "stories" / "hush-harbor"
SHELF = os.environ.get("PBS_HH_SHELF", "gdrive:Mac-Shelf/peace-be-still/stories/hush-harbor/en")
VOICE_ID = "gemini:hush-harbor"
RATE = 24000
GAP = 0.8            # seconds of quiet where two calls meet without a pause
LEAD, TAIL = 0.6, 2.0
MAX_TRIES = 3        # renders per call before the story is a FAILED row
PACE_S = float(os.environ.get("PBS_HH_PACE_S", "7"))
DAILY_CAP = int(os.environ.get("PBS_HH_DAILY_CAP", "10"))   # per model; the free tier's own limit
CALL_BAR = 0.95
PITCH_MIN_S = 1.5
TARGET_WPM = 130.0   # the whole file; Gemini reads faster than a bedtime story wants (152 wpm on 18 Nov)
MIN_TEMPO = 0.85    # turns shorter than this are too short for a pitch reading
PAUSE = re.compile(r"\[PAUSE (\d+(?:\.\d+)?)s[^\]]*\]")
MEN = {"elder", "young_man"}


class ModelOut(Exception):
    """The model a story started on is out for today: the story waits (its calls stay cached)."""


class NamedStop(fill.NamedStop):
    """note=True: the next scheduled run retries it (quota), so the run exits 0."""
    def __init__(self, code, msg, exit_code=9, note=False):
        super().__init__(code, msg, 0 if note else exit_code)
        self.note = note


# ------------------------------------------------------------------ pure: who speaks, what is said
def role_for(speaker: str, cast: list[dict]) -> str:
    """narrator (and so Jesus and God, who the content gate never lets be a character) -> grandmother;
    a woman or girl -> young_woman; an elder man -> elder; any other man or a group -> young_man."""
    if speaker == "narrator":
        return "grandmother"
    c = next((x for x in cast if x.get("id") == speaker), None)
    if c is None:
        raise ValueError(f"speaker {speaker!r} is not in the cast")
    if c.get("gender") == "f":
        return "young_woman"
    if c.get("gender") == "m" and c.get("age") == "elder":
        return "elder"
    return "young_man"


def turns_of(story: dict) -> list[dict]:
    """The story as ordered {"role", "text"} turns and {"silence": s}; same-voice neighbours merged.
    The title opens the first turn. Pure."""
    raw: list[dict] = [{"role": "grandmother", "text": story["title"] + "."}]
    cast = story.get("cast") or []
    for b in story["blocks"]:
        if b["type"] == "scripture":
            raw += [{"role": role_for(sg["speaker"], cast), "text": sg["text"]} for sg in b["segments"]]
        elif b["type"] == "call_response":
            pos = 0
            for m in PAUSE.finditer(b["text"]):
                raw += [{"role": "grandmother", "text": b["text"][pos:m.start()]}, {"silence": float(m.group(1))}]
                pos = m.end()
            raw.append({"role": "grandmother", "text": b["text"][pos:]})
        else:
            raw.append({"role": role_for(b["speaker"], cast), "text": b["text"]})
    out: list[dict] = []
    for u in raw:
        if "text" in u:
            u = {**u, "text": re.sub(r"\s+", " ", u["text"]).strip()}
            if not u["text"]:
                continue
            if out and "text" in out[-1] and out[-1]["role"] == u["role"]:
                out[-1]["text"] += " " + u["text"]
                continue
        out.append(dict(u))
    return out


def two_voices(turns: list[dict]) -> list[dict]:
    """At most two voices per call: the grandmother and the call's main other voice (most words).
    A minor voice goes to the closest of the two: a man's to the other voice when that is a man,
    otherwise to the grandmother. Neighbours that now share a voice stay separate turns. Pure."""
    words: dict = {}
    for t in turns:
        if t["role"] != "grandmother":
            words[t["role"]] = words.get(t["role"], 0) + len(t["text"].split())
    main = max(words, key=lambda r: (words[r], r)) if words else None
    out = []
    for t in turns:
        r = t["role"]
        if r not in ("grandmother", main):
            r = main if (r in MEN and main in MEN) else "grandmother"
        out.append({**t, "role": r, "cast_role": t["role"]})
    return out


def calls_of(story: dict, split_b: bool = False) -> list[dict]:
    """The calls a story needs: [{"turns": [...], "cut_after": i | None}] and silences between.
    Call B carries the response line and the rest, cut after turn `cut_after` (a silence goes
    there). split_b=True renders the two halves of B as separate calls (the fallback). Pure."""
    turns = turns_of(story)
    pauses = [i for i, t in enumerate(turns) if "silence" in t]
    if not pauses:
        return [{"turns": two_voices(turns), "cut_after": None}]
    p1 = pauses[0]
    out: list = [{"turns": two_voices(turns[:p1]), "cut_after": None}, {"silence": turns[p1]["silence"]}]
    rest = turns[p1 + 1:]
    if len(pauses) == 1:
        return out + [{"turns": two_voices(rest), "cut_after": None}]
    p2 = pauses[1] - p1 - 1
    head, sil, tail = rest[:p2], rest[p2], rest[p2 + 1:]
    if split_b or any("silence" in t for t in tail):
        out += [{"turns": two_voices(head), "cut_after": None}, {"silence": sil["silence"]}]
        return out + [{"turns": two_voices([t for t in tail if "text" in t]), "cut_after": None}]
    return out + [{"turns": two_voices(head + tail), "cut_after": len(head) - 1, "cut_silence": sil["silence"]}]


def spoken(story: dict) -> str:
    """What the whole file is scored against: every spoken word, title first, pauses removed."""
    return " ".join(t["text"] for t in turns_of(story) if "text" in t)


def story_hash(story: dict) -> str:
    return hashlib.sha256(json.dumps(turns_of(story), sort_keys=True).encode()).hexdigest()[:8]


def file_of(story: dict) -> str:
    return f"{story['id']}-{story_hash(story)}.m4a"


def load_stories(root: Path = STORIES) -> list[dict]:
    out = []
    for f in sorted(root.glob("*.json")):
        s = json.loads(f.read_text("utf-8"))
        if s.get("status") == "passed" and s.get("lang") == "en":
            out.append(s)
    return out


SPEAKER_NAME = {"grandmother": "Grandmother", "elder": "Deacon", "young_woman": "Woman", "young_man": "Man"}


def request_of(turns: list[dict]) -> dict:
    """The Gemini body for one call: the locked style line per voice, the turns as labelled lines,
    multi-speaker when two voices speak. Pure."""
    roles = list(dict.fromkeys(t["role"] for t in turns))
    lines = [f"{SPEAKER_NAME[t['role']]}: {T.speech_text(t['text'], 'en', {})}" for t in turns]
    if len(roles) == 1:
        r = VOICES["roles"][roles[0]]
        text = VOICES["prompt"].format(style=r["style"], text=" ".join(T.speech_text(t["text"], "en", {}) for t in turns))
        speech = {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": r["voice"]}}}
    else:
        who = " ".join(f"{SPEAKER_NAME[x]} is {VOICES['roles'][x]['style']}." for x in roles)
        text = VOICES["prompt_multi"].format(names=" and ".join(SPEAKER_NAME[x] for x in roles), who=who, lines="\n".join(lines))
        speech = {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
            {"speaker": SPEAKER_NAME[x], "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICES["roles"][x]["voice"]}}}
            for x in roles]}}
    return {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": speech}}


# ------------------------------------------------------------------ pure: checking a call
def call_accuracy(text: str, transcript: str) -> float:
    ref, hyp = T.score_words(text, "en"), T.score_words(transcript, "en")
    return round(SequenceMatcher(None, ref, hyp, autojunk=False).ratio(), 4) if ref else 0.0


def align(turns: list[dict], words: list[tuple[str, float, float]]) -> list[tuple[float, float] | None]:
    """Each turn's (start, end) seconds from the transcript's word times; None when no word of the
    turn was heard. words = [(score word, start, end)]. Pure."""
    ref, owner = [], []
    for i, t in enumerate(turns):
        for w in T.score_words(t["text"], "en"):
            ref.append(w)
            owner.append(i)
    hyp = [w for w, _, _ in words]
    spans: list = [None] * len(turns)
    for a, b, n in SequenceMatcher(None, ref, hyp, autojunk=False).get_matching_blocks():
        for k in range(n):
            i, (_, s, e) = owner[a + k], words[b + k]
            spans[i] = (min(spans[i][0], s), max(spans[i][1], e)) if spans[i] else (s, e)
    return spans


def cut_window(turns: list[dict], words, cut_after: int) -> tuple[float, float] | None:
    """Where call B may be cut: between the end of turn cut_after's last word and the start of the
    next turn's first word, both heard where they should be. None = no clean cut (fallback). Pure."""
    ref, owner = [], []
    for i, t in enumerate(turns):
        for w in T.score_words(t["text"], "en"):
            ref.append(w)
            owner.append(i)
    last = max(k for k, o in enumerate(owner) if o == cut_after)
    hit = {}
    for a, b, n in SequenceMatcher(None, ref, [w for w, _, _ in words], autojunk=False).get_matching_blocks():
        for k in range(n):
            hit[a + k] = b + k
    if last not in hit or last + 1 not in hit or hit[last + 1] != hit[last] + 1:
        return None
    e, s = words[hit[last]][2], words[hit[last + 1]][1]
    return (e - 0.15, s + 0.15) if s >= e else None


def call_problems(turns: list[dict], transcript: str, spans: list, f0s: list) -> list[str]:
    """Problems with one rendered call (empty = keep it). f0s[i] is the median pitch of turn i's
    span (None when too short to read). Pure."""
    problems = []
    acc = call_accuracy(" ".join(t["text"] for t in turns), transcript)
    if acc < CALL_BAR:
        problems.append(f"word accuracy {acc} < {CALL_BAR}")
    for t, span, f0 in zip(turns, spans, f0s):
        if span is None:
            problems.append(f"{t['role']} turn not heard: \"{t['text'][:40]}\"")
            continue
        lo, hi = VOICES["roles"][t["role"]]["f0_hz"]
        if f0 is not None and not (lo <= f0 <= hi):
            problems.append(f"{t['role']} pitch {f0:.0f} Hz outside {lo}-{hi} Hz")
    return problems


def median_f0(x, rate: int = RATE) -> float | None:
    """Median pitch (Hz) of the voiced frames: normalised autocorrelation, 50-400 Hz. numpy only."""
    import numpy as np
    x = np.asarray(x, dtype=np.float64)
    n, hop = int(0.04 * rate), int(0.01 * rate)
    lo, hi = int(rate / 400), int(rate / 50)
    if len(x) < n:
        return None
    rms_all = np.sqrt(np.mean(x ** 2)) or 1e-9
    f0s = []
    for s in range(0, len(x) - n, hop):
        fr = x[s:s + n] - x[s:s + n].mean()
        if np.sqrt(np.mean(fr ** 2)) < 0.5 * rms_all:
            continue
        ac = np.correlate(fr, fr, "full")[n - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] >= 0.5:
            f0s.append(rate / lag)
    return float(np.median(f0s)) if len(f0s) >= 10 else None


def quietest(x, a: float, b: float, rate: int = RATE) -> int:
    """Sample index of the quietest 20 ms inside [a, b] seconds."""
    import numpy as np
    w = int(0.02 * rate)
    i0, i1 = max(0, int(a * rate)), min(len(x), int(b * rate))
    if i1 - i0 <= w:
        return (i0 + i1) // 2
    e = np.convolve(np.asarray(x[i0:i1], dtype=np.float64) ** 2, np.ones(w), "valid")
    return i0 + int(np.argmin(e)) + w // 2


def trim(x, rate: int = RATE, floor_db: float = -45.0):
    """The samples between the first and last 10 ms window louder than floor_db (dBFS)."""
    import numpy as np
    w = int(0.01 * rate)
    if len(x) < w:
        return x
    k = len(x) // w
    rms = np.sqrt(np.mean(np.asarray(x[:k * w], dtype=np.float64).reshape(k, w) ** 2, axis=1))
    loud = np.nonzero(20 * np.log10(rms + 1e-12) > floor_db)[0]
    if not len(loud):
        return x[:0]
    return x[max(0, loud[0] - 2) * w:min(k, loud[-1] + 3) * w]


def join(parts: list, rate: int = RATE):
    """parts: arrays (speech) or floats (silence seconds). GAP between speech pieces; a pause is
    exactly its seconds (no gap added around it). Lead and tail quiet."""
    import numpy as np
    z = lambda s: np.zeros(int(round(s * rate)), dtype=np.float32)  # noqa: E731
    out, prev_speech = [z(LEAD)], False
    for p in parts:
        if isinstance(p, float):
            out.append(z(p))
            prev_speech = False
        else:
            if prev_speech:
                out.append(z(GAP))
            out.append(trim(p, rate).astype(np.float32))
            prev_speech = True
    out.append(z(TAIL))
    return np.concatenate(out)


def tempo_factor(parts: list, words: int, target_wpm: float = TARGET_WPM, rate: int = RATE) -> float:
    """How much to slow the speech (1.0 = not at all, never below MIN_TEMPO) so the whole file,
    pauses and gaps included, is at most target_wpm. Pauses are never stretched. Pure."""
    speech = sum(len(trim(p, rate)) / rate for p in parts if not isinstance(p, float))
    quiet = sum(p for p in parts if isinstance(p, float))
    quiet += LEAD + TAIL + GAP * max(0, sum(not isinstance(p, float) for p in parts) - 1)
    need = words / target_wpm * 60 - quiet
    if speech <= 0 or need <= speech:
        return 1.0
    return round(max(MIN_TEMPO, speech / need), 3)


def slow(x, factor: float, work: Path):
    """Speech slowed by ffmpeg atempo (pitch kept)."""
    a, b = work / "slow-in.wav", work / "slow-out.wav"
    write_wav(a, x)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-af", f"atempo={factor}", str(b)], check=True, timeout=600)
    y = read_wav(b)
    a.unlink()
    b.unlink()
    return y


def classify_429(body: str) -> tuple[str, float]:
    """("day" | "minute", seconds to wait) from a Gemini 429 body. Unknown shapes count as minute."""
    wait = 30.0
    try:
        err = json.loads(body).get("error", {})
    except Exception:
        return "minute", wait
    kind = "minute"
    for d in err.get("details", []) or []:
        for v in d.get("violations", []) or []:
            if "PerDay" in str(v.get("quotaId", "")):
                kind = "day"
        m = re.fullmatch(r"(\d+(?:\.\d+)?)s", str(d.get("retryDelay", "")))
        if m:
            wait = float(m.group(1))
    return kind, wait


# ------------------------------------------------------------------ quota state, per model
def state_file() -> Path:
    return fill.HOME / "hush-harbor-state.json"


def _state() -> dict:
    try:
        st = json.loads(state_file().read_text())
        return st if isinstance(st.get("models"), dict) else {"models": {}}
    except Exception:
        return {"models": {}}


def calls_today(model: str, now: dt.datetime) -> int:
    m = _state()["models"].get(model, {})
    return m.get("calls", 0) if m.get("day") == now.astimezone(fill.CT).date().isoformat() else 0


def count_call(model: str, now: dt.datetime, retry_after_s: float | None = None) -> None:
    """One more call on this model today; a per-day 429 also records when its quota comes back."""
    st = _state()
    day = now.astimezone(fill.CT).date().isoformat()
    m = st["models"].setdefault(model, {})
    m["calls"] = (m.get("calls", 0) if m.get("day") == day else 0) + 1
    m["day"] = day
    if retry_after_s is not None:
        m["back_at"] = (now + dt.timedelta(seconds=retry_after_s)).isoformat(timespec="seconds")
    state_file().parent.mkdir(parents=True, exist_ok=True)
    state_file().write_text(json.dumps(st, indent=1))


def usable_models(now: dt.datetime) -> list[str]:
    """The models that may be called now, in ladder order: not parked by a per-day 429 and under
    the daily cap."""
    st = _state()["models"]
    vetted = vetted_models()
    out = []
    for m in MODELS:
        if m not in vetted:
            continue
        back = st.get(m, {}).get("back_at")
        if back and dt.datetime.fromisoformat(back) > now:
            continue
        if calls_today(m, now) >= DAILY_CAP:
            continue
        out.append(m)
    return out


VETTING = AUDIO / "hush-harbor" / "model-vetting.json"
REFERENCE = Path(os.environ.get("PBS_HH_REFERENCE", fill.HOME / "hh-reference"))


def vetted_models() -> list[str]:
    """The first model (the owner's picks were made on it) and every model whose vetting passed."""
    try:
        v = json.loads(VETTING.read_text("utf-8"))
    except Exception:
        v = {}
    return [MODELS[0]] + [m for m in MODELS[1:] if (v.get(m) or {}).get("passed") is True]


def next_back(now: dt.datetime) -> str:
    backs = [dt.datetime.fromisoformat(v["back_at"]) for v in _state()["models"].values() if v.get("back_at")]
    backs = [b for b in backs if b > now]
    return f"{min(backs):%a %H:%M} CT" if backs else "the next reset"


# ------------------------------------------------------------------ Gemini
_last_call = [0.0]


def to_wav(data: bytes, mime: str, path: Path) -> None:
    """Gemini audio (raw 16-bit PCM `audio/l16; rate=N`, or a WAV file) -> 24 kHz mono wav."""
    src = path.with_suffix(".raw")
    src.write_bytes(data)
    m = re.search(r"rate=(\d+)", mime or "")
    inp = ["-f", "s16le", "-ar", m.group(1) if m else "24000", "-ac", "1"] if "l16" in (mime or "") or "pcm" in (mime or "") else []
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-i", str(src), "-ac", "1", "-ar", str(RATE), "-c:a", "pcm_s16le", str(path)],
                   check=True, timeout=300)
    src.unlink()


def gemini(body: dict, path: Path, prefer: str | None = None) -> str:
    """One TTS call on the first usable model; the audio lands at `path` (24 kHz wav). Returns the
    model used. Paced; a per-minute 429 waits; a per-day 429 parks the model and tries the next."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise NamedStop("KEY_MISSING", "GEMINI_API_KEY is not set; run through `npm run -s vault:run --` in ~/GitHub/boss-os")
    data = json.dumps(body).encode()
    errors = 0
    while True:
        now = dt.datetime.now(fill.CT)
        models = usable_models(now)
        if not models:
            raise NamedStop("QUOTA_OUT", f"every free Gemini TTS model's daily quota is used up ({', '.join(MODELS)}); "
                            f"rendered calls are kept and the first run after {next_back(now)} resumes", note=True)
        if prefer and prefer not in models:
            raise ModelOut(prefer)
        model = prefer or models[0]   # never two models inside one story
        wait = PACE_S - (time.monotonic() - _last_call[0])
        if wait > 0:
            time.sleep(wait)
        _last_call[0] = time.monotonic()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        req = urllib.request.Request(url, data, {"x-goog-api-key": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                d = json.load(resp)
            count_call(model, now)
            part = next(p for p in d["candidates"][0]["content"]["parts"] if "inlineData" in p)
            to_wav(base64.b64decode(part["inlineData"]["data"]), part["inlineData"].get("mimeType", ""), path)
            return model
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")
            kind, delay = classify_429(msg) if e.code == 429 else ("", 0.0)
            count_call(model, now, retry_after_s=delay if kind == "day" else None)
            if kind == "day":
                print(f"note: {model} daily quota used up; next model", flush=True)
                continue
            if e.code == 429:
                print(f"note: {model} per-minute limit, waiting {delay + 2:.0f}s", flush=True)
                time.sleep(min(delay + 2, 90))
                continue
            if e.code in (400, 401, 403):
                raise NamedStop("GEMINI_REFUSED", f"{model} said {e.code}: {msg[:200]}")
            errors += 1
        except (urllib.error.URLError, TimeoutError, KeyError, IndexError, StopIteration, subprocess.CalledProcessError) as e:
            print(f"note: {model} call failed ({type(e).__name__}), retrying", flush=True)
            errors += 1
        if errors >= 4:
            raise NamedStop("GEMINI_ERRORS", "Gemini failed four times running (network or server); the next run resumes", note=True)
        time.sleep(15 * errors)


# ------------------------------------------------------------------ audio steps
def read_wav(p: Path):
    import numpy as np
    with wave.open(str(p)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(p: Path, x) -> None:
    import numpy as np
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm)


def heard_words(path: Path, model_size: str) -> tuple[str, list[tuple[str, float, float]]]:
    """faster-whisper transcript and (score word, start, end) for every word."""
    import qa
    if model_size not in qa._MODELS:
        from faster_whisper import WhisperModel
        qa._MODELS[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8")
    segs, _ = qa._MODELS[model_size].transcribe(qa.decode(path, 16000), language="en", beam_size=5,
                                                condition_on_previous_text=False, word_timestamps=True)
    text, words = [], []
    for s in segs:
        text.append(s.text.strip())
        for w in s.words or []:
            for sw in T.score_words(w.word, "en"):
                words.append((sw, w.start, w.end))
    return " ".join(text), words


def check_call(call: dict, path: Path) -> tuple[list[str], list | None]:
    """Problems with a rendered call, and (for call B) the cut point in samples."""
    x = read_wav(path)
    for size in ("base", "small"):
        transcript, words = heard_words(path, size)
        spans = align(call["turns"], words)
        f0s = [median_f0(x[int(s * RATE):int(e * RATE)]) if sp and (e - s) >= PITCH_MIN_S else None
               for sp in spans for s, e in [sp or (0, 0)]]
        problems = call_problems(call["turns"], transcript, spans, f0s)
        cut = None
        if not problems and call.get("cut_after") is not None:
            win = cut_window(call["turns"], words, call["cut_after"])
            if win is None:
                problems = ["no clean cut after the response line"]
            else:
                cut = quietest(x, *win)
        if not problems:
            return [], cut
    return problems, None


def render_call(call: dict, path: Path, prefer: str | None = None) -> tuple[list[str], dict]:
    """Render until the call passes (or MAX_TRIES); keeps the passing wav at `path` and a `.ok`
    with its model and cut, so a resumed run trusts it. Returns (problems, info)."""
    ok = path.with_suffix(".ok")
    if path.exists() and ok.exists():
        return [], json.loads(ok.read_text())
    body = request_of(call["turns"])
    problems: list[str] = []
    for _ in range(MAX_TRIES):
        model = gemini(body, path, prefer)
        problems, cut = check_call(call, path)
        if not problems or problems == ["no clean cut after the response line"]:
            if problems:
                return problems, {"model": model}
            info = {"model": model, "cut": cut}
            ok.write_text(json.dumps(info))
            return [], info
        print(f"  re-render {path.name} ({model}): {'; '.join(problems)}", flush=True)
    path.unlink(missing_ok=True)
    return problems, {}


def render_story_parts(story: dict, work: Path) -> tuple[list, list[str], list[str], int]:
    """(parts for join, problems, models used, calls in the plan). Falls back to a split call B."""
    for split_b in (False, True):
        plan = calls_of(story, split_b)
        parts, models, problems = [], [], []
        cached = sorted(work.glob("*.ok"))
        if cached:
            models.append(json.loads(cached[0].read_text())["model"])
        for i, c in enumerate(plan):
            if "silence" in c:
                parts.append(float(c["silence"]))
                continue
            h = hashlib.sha256(json.dumps(c, sort_keys=True).encode()).hexdigest()[:10]
            p = work / f"{i:02d}-{h}.wav"
            bad, info = render_call(c, p, models[0] if models else None)
            if bad == ["no clean cut after the response line"] and not split_b:
                p.unlink(missing_ok=True)
                print("  call B could not be cut cleanly; rendering it as two calls", flush=True)
                break
            if bad:
                return [], [f"call {i}: {'; '.join(bad)}"], models, len(plan)
            if info["model"] not in models:
                models.append(info["model"])
            x = read_wav(p)
            if c.get("cut_after") is not None:
                parts += [x[:info["cut"]], float(c["cut_silence"]), x[info["cut"]:]]
            else:
                parts.append(x)
        else:
            return parts, [], models, sum("turns" in c for c in plan)
    return [], ["call B could not be rendered"], [], 0


def make_story(story: dict, work: Path) -> dict:
    """Every call rendered and checked (cached in work/), joined, encoded, checked as a whole.
    Returns the manifest row (status passed with _local, or FAILED with the problems)."""
    import qa
    t0 = time.monotonic()
    work.mkdir(parents=True, exist_ok=True)
    parts, problems, models, ncalls = render_story_parts(story, work)
    row = {"file": f"stories/hush-harbor/en/{file_of(story)}", "kind": "stories", "lang": "en",
           "ref": f"content/stories/hush-harbor/{story['id']}.json", "text": "script", "voice": VOICE_ID,
           "voices": {r: v["voice"] for r, v in VOICES["roles"].items()}, "models": sorted(set(models)),
           "calls": ncalls, "attempts": 1, "at": dt.datetime.now(fill.CT).isoformat(timespec="seconds")}
    if problems:
        return {**row, "status": "FAILED", "seconds": 0, "sha256": None, "shelved": None,
                "checks": {"problems": problems}, "work_s": round(time.monotonic() - t0, 1)}
    wav, out = work / "story.wav", work / file_of(story)
    factor = tempo_factor(parts, len(T.score_words(spoken(story), "en")))
    if factor < 1.0:
        parts = [p if isinstance(p, float) else slow(trim(p), factor, work) for p in parts]
    write_wav(wav, join(parts))
    # Gemini's voices have sharper peaks than Kokoro's: AAC can overshoot the limiter, so a file
    # whose only miss is its true peak is encoded again with more headroom (no new call).
    for margin in (1.5, 3.0, 4.5):
        fill.encode(wav, out, "sleep", margin)
        res = qa.check(out, spoken(story), "en", "sleep")
        if not res["problems"] or not all(p.startswith("A06 true peak") for p in res["problems"]):
            break
    wav.unlink()
    checks = {k: res[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    checks["problems"] = res["problems"]
    checks["pauses_s"] = [p for p in parts if isinstance(p, float)]
    checks["tempo"] = factor
    row.update({"seconds": res["seconds"], "checks": checks, "work_s": round(time.monotonic() - t0, 1),
                "status": "passed" if res["pass"] else "FAILED"})
    if res["pass"]:
        row["sha256"] = fill.sha256(out)
        row["_local"] = str(out)
    else:
        row["sha256"], row["shelved"] = None, None
    return row


def census(stories: list[dict], rows: list[dict]) -> dict:
    files = {f"stories/hush-harbor/en/{file_of(s)}" for s in stories}
    mine = [r for r in rows if r["file"] in files]
    return {"total": len(files), "passed": sum(r.get("status") == "passed" for r in mine),
            "failed": sum(r.get("status") == "FAILED" for r in mine)}


def census_line(c: dict) -> str:
    return f"hush harbor: {c['passed']} of {c['total']} stories voiced, {c['failed']} failed"


def todo(stories: list[dict], rows: list[dict], only: str | None = None) -> list[dict]:
    """Story order: by number (core-001 first). Anything in the manifest is skipped (resume)."""
    done = {r["file"] for r in rows}
    return [s for s in stories if f"stories/hush-harbor/en/{file_of(s)}" not in done
            and (not only or s["id"].startswith(only))]


# ------------------------------------------------------------------ vetting another model
def _mel_bank(rate: int = 16000, n: int = 40, nfft: int = 512):
    import numpy as np
    hz = lambda m: 700 * (10 ** (m / 2595) - 1)  # noqa: E731
    mel = lambda f: 2595 * np.log10(1 + f / 700)  # noqa: E731
    bins = np.floor((nfft + 1) * hz(np.linspace(mel(60), mel(7600), n + 2)) / rate).astype(int)
    fb = np.zeros((n, nfft // 2 + 1))
    for i in range(1, n + 1):
        a, b, c = bins[i - 1], bins[i], bins[i + 1]
        fb[i - 1, a:b] = (np.arange(a, b) - a) / max(b - a, 1)
        fb[i - 1, b:c] = (c - np.arange(b, c)) / max(c - b, 1)
    return fb


def voiceprint(x16):
    """MFCC 1-19 mean and spread over the louder 60% of 25 ms frames (16 kHz audio)."""
    import numpy as np
    from scipy.fft import dct
    n, h = 400, 160
    fr = np.lib.stride_tricks.sliding_window_view(np.asarray(x16, dtype=np.float64), n)[::h] * np.hamming(n)
    p = np.abs(np.fft.rfft(fr, 512)) ** 2
    e = p.sum(1)
    c = dct(np.log(p[e > np.percentile(e, 40)] @ _mel_bank().T + 1e-10), type=2, axis=1, norm="ortho")[:, 1:20]
    return np.concatenate([c.mean(0), c.std(0)])


def similarity(a, b, mu, sd) -> float:
    import numpy as np
    za, zb = (a - mu) / sd, (b - mu) / sd
    return round(float(za @ zb / (np.linalg.norm(za) * np.linalg.norm(zb))), 3)


def vet_verdict(sim: float, impostor_sims: list[float], f0: float | None, band: list[float]) -> bool:
    """Pure: closer to the picked clip than every other auditioned voice, and pitch in the band."""
    return bool(impostor_sims) and sim > max(impostor_sims) and f0 is not None and band[0] <= f0 <= band[1]


def vet(model: str) -> dict:
    """Render the four sample lines on `model`, score them against the picked clips, log it."""
    import numpy as np
    import qa
    ref = {f.stem: qa.decode(f, 16000) for f in sorted(REFERENCE.glob("*.m4a"))}
    if len(ref) < 8:
        raise NamedStop("REFERENCE_MISSING", f"the picked voice clips are not in {REFERENCE}")
    prints = {k: voiceprint(v) for k, v in ref.items()}
    pool = np.array(list(prints.values()))
    mu, sd = pool.mean(0), pool.std(0) + 1e-9
    V = VOICES["vetting"]
    out_dir = REFERENCE / model
    out_dir.mkdir(parents=True, exist_ok=True)
    roles = {}
    for role, r in V["roles"].items():
        wav = out_dir / f"{role}.wav"
        if not wav.exists():
            body = {"contents": [{"parts": [{"text": V["prompt"].format(desc=r["desc"], text=r["text"])}]}],
                    "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {
                        "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICES["roles"][role]["voice"]}}}}}
            _gemini_on(model, body, wav)
        x16 = qa.decode(wav, 16000)
        sim = similarity(voiceprint(x16), prints[r["clip"]], mu, sd)
        imp = [similarity(prints[i], prints[r["clip"]], mu, sd) for i in r["impostors"] if i in prints]
        f0 = median_f0(read_wav(wav))
        band = VOICES["roles"][role]["f0_hz"]
        roles[role] = {"voice": VOICES["roles"][role]["voice"], "similarity": sim, "bar": max(imp) if imp else None,
                       "impostors": dict(zip(r["impostors"], imp)), "f0_hz": round(f0) if f0 else None, "band": band,
                       "passed": vet_verdict(sim, imp, f0, band)}
    return {"passed": all(v["passed"] for v in roles.values()), "roles": roles,
            "at": dt.datetime.now(fill.CT).isoformat(timespec="seconds")}


def _gemini_on(model: str, body: dict, path: Path) -> None:
    """One call on exactly this model (vetting); a 429 here just ends the vetting for today."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise NamedStop("KEY_MISSING", "GEMINI_API_KEY is not set")
    now = dt.datetime.now(fill.CT)
    if calls_today(model, now) >= DAILY_CAP:
        raise NamedStop("DAILY_CAP", f"{model} has no calls left today for vetting", note=True)
    time.sleep(PACE_S)
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                 json.dumps(body).encode(), {"x-goog-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            d = json.load(resp)
    except urllib.error.HTTPError as e:
        kind, delay = classify_429(e.read().decode("utf-8", "replace")) if e.code == 429 else ("", 0.0)
        count_call(model, now, retry_after_s=delay if kind == "day" else None)
        raise NamedStop("QUOTA_OUT", f"{model} refused a vetting call ({e.code}); try again after its reset", note=True)
    count_call(model, now)
    part = next(p for p in d["candidates"][0]["content"]["parts"] if "inlineData" in p)
    to_wav(base64.b64decode(part["inlineData"]["data"]), part["inlineData"].get("mimeType", ""), path)


# ------------------------------------------------------------------ the run
def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="at most this many stories this run")
    ap.add_argument("--max-minutes", type=float, default=0, help="stop starting new stories after this")
    ap.add_argument("--only", help="story ids starting with this, e.g. core-001")
    ap.add_argument("--commit", action="store_true", help="commit and push the manifest (the runner)")
    ap.add_argument("--keep", help="also copy each shelved file to this folder before the Mac copy is deleted")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--vet", metavar="MODEL", help="score MODEL's voices against the picked clips and log it in model-vetting.json")
    a = ap.parse_args(argv)

    fill.HOME.mkdir(parents=True, exist_ok=True)
    # One heavy job on the Mac at a time: the library fill's own lock (PBS_HH_LOCK only for a by-hand run).
    lock = (fill.HOME / os.environ.get("PBS_HH_LOCK", "library-fill.lock")).open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        if not a.dry_run:
            print("OUTPUT 0 Hush Harbor stories shelved (note: the library fill or another render holds the Mac; the next run tries again)")
            return 0
    if a.vet:
        result = vet(a.vet)
        log = json.loads(VETTING.read_text("utf-8")) if VETTING.exists() else {}
        log[a.vet] = result
        VETTING.write_text(json.dumps(log, indent=1, sort_keys=True) + "\n")
        for role, v in result["roles"].items():
            print(f"  {role:12} {v['voice']:8} similarity {v['similarity']:+.3f} vs bar {v['bar']}  pitch {v['f0_hz']} Hz in {v['band']}  {'pass' if v['passed'] else 'FAIL'}")
        print(f"OUTPUT vetting {a.vet}: {'passed, joins the rotation' if result['passed'] else 'failed, stays out of the rotation'}")
        return 0
    stories = load_stories()
    if not stories:
        print("NAMED STOP [NO_STORIES] no passed Hush Harbor stories in content/stories/hush-harbor", file=sys.stderr)
        print("OUTPUT 0 Hush Harbor stories shelved")
        return 2
    rows = fill.read_manifest()
    queue = todo(stories, rows, a.only)
    now = dt.datetime.now(fill.CT)
    if a.dry_run:
        print(f"plan: {len(stories)} stories, {len(queue)} to do; models usable now: {', '.join(usable_models(now)) or 'none'}")
        for s in queue[:1]:
            for c in calls_of(s):
                if "silence" in c:
                    print(f"   silence {c['silence']}")
                else:
                    print(f"   call: {[(t['role'], len(t['text'].split())) for t in c['turns']]} cut_after={c['cut_after']}")
        print(census_line(census(stories, rows)))
        return 0

    made, failed, stop, t_start = 0, 0, None, time.monotonic()
    try:
        if queue and not usable_models(now):
            raise NamedStop("QUOTA_OUT", f"every free Gemini TTS model's quota is used up; the first run after {next_back(now)} resumes", note=True)
        if queue:
            fill.drive_reachable(SHELF)
        for s in queue:
            if a.limit and made + failed >= a.limit:
                break
            if a.max_minutes and (time.monotonic() - t_start) / 60 >= a.max_minutes:
                break
            work = fill.HOME / "hh-work" / s["id"]
            try:
                row = make_story(s, work)
            except ModelOut as e:
                print(f"note: {s['id']} started on {e} and waits for it (one model per story); its calls stay cached", flush=True)
                continue
            if row["status"] == "passed":
                local = Path(row.pop("_local"))
                if a.keep:
                    Path(a.keep).mkdir(parents=True, exist_ok=True)
                    shutil.copy2(local, Path(a.keep) / local.name)
                row["shelved"] = fill.shelve(local, file_of(s), SHELF)
                made += 1
            else:
                failed += 1
            fill.append_row(row)
            shutil.rmtree(work, ignore_errors=True)
            print(f"{row['status']:6} {row['file']}  {row['seconds']}s  {row['calls']} calls {row['models']}  "
                  f"acc {row['checks'].get('accuracy')}  {row['checks'].get('lufs')} LUFS  -> {row.get('shelved')}  "
                  f"{'; '.join(row['checks']['problems'])}", flush=True)
    except fill.NamedStop as e:
        stop = e
    rows = fill.read_manifest()
    line = census_line(census(stories, rows))
    notes = []
    if a.commit and (made or failed):
        notes.append(fill.git_commit(f"audio: Hush Harbor manifest ({line})"))
    if stop:
        print(str(stop), file=sys.stderr)
        if not getattr(stop, "note", False):
            notes.append(fill.morning_line(f"Peace Be Still Hush Harbor audio stopped: {stop}", f"hh-stop:{stop.code}", now))
    elif now.hour >= 5:
        notes.append(fill.morning_line(f"Peace Be Still {line}.", "hh-daily", now))
    print(f"OUTPUT {made} Hush Harbor stories shelved")
    print(line + f" (this run: {made} shelved, {failed} failed)" + (f"; notes: {'; '.join(notes)}" if notes else ""))
    if stop:
        return stop.exit_code
    if queue and made == 0 and failed and not a.only:
        print(f"NAMED STOP [NOTHING_SHELVED] all {failed} stories tried this run failed their checks", file=sys.stderr)
        return 9
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except fill.NamedStop as e:
        print(str(e), file=sys.stderr)
        sys.exit(e.exit_code)
