"""HUSH HARBOR CLONE LANE: the Hush Harbor stories in Chatterbox (MIT) zero-shot clones of the four
voices she picked (owner, 18 Nov 2026: "Use the clones"). The Gemini lane (hush_harbor.py) keeps its
free daily quota and works up from story 1; this lane works DOWN from the highest story number, so
the two never meet. One engine per story: the first lane to start a story writes `engine` in its work
folder and the other lane skips it; the manifest row names the engine.

Per story: hush_harbor.turns_of (who speaks is decided by code; Jesus's and God's words stay with the
grandmother) -> every turn split into sentences -> render_chatterbox.py in the Chatterbox venv
(resumable: each sentence is a file) -> checks:
  sentence   word accuracy vs its text (faster-whisper, old spellings forgiven; one word of slack on
             a short sentence); a miss is rendered again with a new seed (MAX_TRIES)
  turn       speaker similarity to her picked clip (Resemblyzer d-vector cosine) at or above the role's
             floor in voices.json clone.floor (the clone test's new-line score minus 0.05, never below
             the closest other voice + 0.03); a miss re-renders the turn
  file       join (pauses exactly 3.0 s, by code), tempo, fill.encode at -22 LUFS, qa.check (the fill's
             checks), then the Drive shelf and a manifest row, as the Gemini lane does.
One story per run (`--limit 1` from run.sh), at nice 15 under the library fill's lock, so the Mac
alternates: a Bible chunk, then a clone story. OUTPUT line every run.
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

AUDIO = Path(__file__).resolve().parent
sys.path.insert(0, str(AUDIO))
sys.path.insert(0, str(AUDIO / "lib"))
import fill  # noqa: E402
import hush_harbor as H  # noqa: E402
import text as T  # noqa: E402

CLONE = H.VOICES["clone"]
VOICE_ID = "chatterbox:hush-harbor-clone"
CB_PY = os.environ.get("PBS_CHATTERBOX_PY", str(Path.home() / "GitHub/how-we-know/.venv-tts/bin/python"))
REF_DIR = fill.HOME / "hh-reference" / "clone"
SENT_GAP = 0.3
MAX_TRIES = 3


# ------------------------------------------------------------------ pure
def sentences(text: str) -> list[str]:
    """Chatterbox drifts on long inputs: one sentence at a time (as in the clone test)."""
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]


def plan(story: dict) -> list[dict]:
    """[{"role", "sentences"}] and {"silence": s}, in order. Pure."""
    out = []
    for t in H.turns_of(story):
        out.append({"silence": t["silence"]} if "silence" in t else {"role": t["role"], "text": t["text"], "sentences": sentences(t["text"])})
    return out


def sentence_ok(text: str, transcript: str) -> bool:
    """Word accuracy at the bar, or (a short sentence) at most one word missing or extra."""
    from difflib import SequenceMatcher
    if H.call_accuracy(text, transcript) >= H.CALL_BAR:
        return True
    ref, hyp = T.score_words(text, "en"), T.score_words(transcript, "en")
    hit = sum(b.size for b in SequenceMatcher(None, ref, hyp, autojunk=False).get_matching_blocks())
    return 0 < len(ref) <= 12 and (len(ref) - hit) + (len(hyp) - hit) <= 1


def turn_ok(role: str, similarity: float) -> bool:
    return similarity >= CLONE["floor"][role]


def lane_order(stories: list[dict]) -> list[dict]:
    """Highest story number first, so the Gemini lane (lowest first) and this lane never meet."""
    return sorted(stories, key=lambda s: s["id"], reverse=True)


def engine_of(work: Path) -> str | None:
    f = work / "engine"
    return f.read_text().strip() if f.exists() else None


# ------------------------------------------------------------------ the Mac side
def refs() -> dict:
    """Her picked clips as local wavs (the shelf method: pulled from Drive when missing)."""
    REF_DIR.mkdir(parents=True, exist_ok=True)
    out = {}
    for role, name in CLONE["ref"].items():
        wav = REF_DIR / f"{Path(name).stem}.wav"
        if not wav.exists():
            src = REF_DIR / name
            r = fill.rclone("copyto", f"{CLONE['shelf']}/{name}", str(src), timeout=300)
            if r.returncode != 0 or not src.exists():
                raise fill.NamedStop("REFERENCE_MISSING", f"could not pull {CLONE['shelf']}/{name}: {r.stderr.strip()[-160:]}")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "24000", str(wav)], check=True, timeout=120)
        out[role] = wav
    return out


def render(items: list[dict]) -> None:
    if not items:
        return
    r = subprocess.run([CB_PY, str(AUDIO / "render_chatterbox.py")], input=json.dumps({"items": items}),
                       capture_output=True, text=True, timeout=6 * 3600)
    if r.returncode != 0:
        raise RuntimeError(f"chatterbox failed: {r.stderr.strip()[-300:]}")


_ENC = []


def similarity(wav_a: Path, x_b) -> float:
    import numpy as np
    import qa
    from resemblyzer import VoiceEncoder, preprocess_wav
    if not _ENC:
        _ENC.append(VoiceEncoder("cpu"))
    a = _ENC[0].embed_utterance(preprocess_wav(qa.decode(wav_a, 16000), source_sr=16000))
    b = _ENC[0].embed_utterance(preprocess_wav(x_b, source_sr=16000))
    return round(float(np.dot(a, b)), 3)


def make_story(story: dict, work: Path) -> dict:
    import numpy as np
    import qa
    t0 = time.monotonic()
    work.mkdir(parents=True, exist_ok=True)
    (work / "engine").write_text("clone")
    ref = refs()
    steps = plan(story)
    seed = {}
    problems: list[str] = []
    sims: dict = {}
    for attempt in range(MAX_TRIES):
        items = []
        for ti, st in enumerate(steps):
            for si, s in enumerate(st.get("sentences", [])):
                out = work / f"t{ti:03d}-s{si:03d}.wav"
                items.append({"ref": str(ref[st["role"]]), "text": T.speech_text(s, "en", {}), "out": str(out),
                              "seed": 7 + seed.get(out.name, 0)})
        render(items)
        bad = []
        for ti, st in enumerate(steps):
            if "sentences" not in st:
                continue
            files = [work / f"t{ti:03d}-s{si:03d}.wav" for si in range(len(st["sentences"]))]
            for f, s in zip(files, st["sentences"]):
                ok = f.with_suffix(".ok")
                if ok.exists():
                    continue
                heard = qa.transcribe(f, "en", "base")
                if not sentence_ok(s, heard) and not sentence_ok(s, qa.transcribe(f, "en", "small")):
                    bad.append(f"t{ti}: \"{s[:40]}\" misheard")
                    f.unlink()
                    seed[f.name] = seed.get(f.name, 0) + 1
                else:
                    ok.write_text("ok")
            if all(f.exists() for f in files) and not (work / f"t{ti:03d}.sim").exists():
                x = np.concatenate([qa.decode(f, 16000) for f in files])
                sim = similarity(ref[st["role"]], x) if len(x) > 16000 * 1.5 else None
                if sim is not None and not turn_ok(st["role"], sim):
                    bad.append(f"t{ti} {st['role']} similarity {sim} < {CLONE['floor'][st['role']]}")
                    for f in files:
                        f.unlink()
                        f.with_suffix(".ok").unlink(missing_ok=True)
                        seed[f.name] = seed.get(f.name, 0) + 1
                else:
                    (work / f"t{ti:03d}.sim").write_text(json.dumps(sim))
                    sims.setdefault(st["role"], []).append(sim)
        problems = bad
        if not bad:
            break
        print(f"  attempt {attempt + 1}: {'; '.join(bad[:4])}", flush=True)
    row = {"file": f"stories/hush-harbor/en/{H.file_of(story)}", "kind": "stories", "lang": "en",
           "ref": f"content/stories/hush-harbor/{story['id']}.json", "text": "script", "voice": VOICE_ID,
           "engine": "clone", "models": ["chatterbox"], "voices": {r: Path(n).stem for r, n in CLONE["ref"].items()},
           "attempts": 1, "at": dt.datetime.now(fill.CT).isoformat(timespec="seconds")}
    if problems:
        return {**row, "status": "FAILED", "seconds": 0, "sha256": None, "shelved": None,
                "checks": {"problems": problems[:10]}, "work_s": round(time.monotonic() - t0, 1)}
    parts = []
    for ti, st in enumerate(steps):
        if "silence" in st:
            parts.append(float(st["silence"]))
            continue
        pieces = []
        for si in range(len(st["sentences"])):
            pieces += [H.trim(qa.decode(work / f"t{ti:03d}-s{si:03d}.wav", H.RATE)), np.zeros(int(H.RATE * SENT_GAP), np.float32)]
        parts.append(np.concatenate(pieces[:-1]))
    factor = H.tempo_factor(parts, len(T.score_words(H.spoken(story), "en")))
    if factor < 1.0:
        parts = [p if isinstance(p, float) else H.slow(p, factor, work) for p in parts]
    wav, out = work / "story.wav", work / H.file_of(story)
    H.write_wav(wav, H.join(parts))
    for margin in (1.5, 3.0, 4.5):
        fill.encode(wav, out, "sleep", margin)
        res = qa.check(out, H.spoken(story), "en", "sleep")
        if not res["problems"] or not all(p.startswith("A06 true peak") for p in res["problems"]):
            break
    wav.unlink()
    checks = {k: res[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    checks.update(problems=res["problems"], pauses_s=[p for p in parts if isinstance(p, float)], tempo=factor,
                  similarity={r: min(v for v in vs if v is not None) for r, vs in sims.items() if any(v is not None for v in vs)})
    row.update({"seconds": res["seconds"], "checks": checks, "work_s": round(time.monotonic() - t0, 1),
                "status": "passed" if res["pass"] else "FAILED"})
    if res["pass"]:
        row["sha256"] = fill.sha256(out)
        row["_local"] = str(out)
    else:
        row["sha256"], row["shelved"] = None, None
    return row


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=1, help="stories this run (run.sh: 1, so the Mac alternates)")
    ap.add_argument("--only", help="story ids starting with this")
    ap.add_argument("--commit", action="store_true")
    ap.add_argument("--keep", help="also copy each shelved file here")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    lock = (fill.HOME / os.environ.get("PBS_HH_LOCK", "library-fill.lock")).open("w")
    if not a.dry_run:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("OUTPUT 0 Hush Harbor clone stories shelved (note: another render holds the Mac; the next run tries again)")
            return 0
    stories = H.load_stories()
    rows = fill.read_manifest()
    queue = [s for s in lane_order(H.todo(stories, rows, a.only)) if engine_of(fill.HOME / "hh-work" / s["id"]) in (None, "clone")]
    if a.dry_run:
        print(f"clone lane: {len(queue)} stories to do; next: {', '.join(s['id'] for s in queue[:3])}")
        print(H.census_line(H.census(stories, rows)))
        return 0
    made = failed = 0
    stop = None
    try:
        if queue:
            fill.drive_reachable(H.SHELF)
        for s in queue[: a.limit]:
            work = fill.HOME / "hh-work" / s["id"]
            row = make_story(s, work)
            if row["status"] == "passed":
                local = Path(row.pop("_local"))
                if a.keep:
                    Path(a.keep).mkdir(parents=True, exist_ok=True)
                    shutil.copy2(local, Path(a.keep) / local.name)
                row["shelved"] = fill.shelve(local, H.file_of(s), H.SHELF)
                made += 1
            else:
                failed += 1
            fill.append_row(row)
            shutil.rmtree(work, ignore_errors=True)
            print(f"{row['status']:6} {row['file']}  {row['seconds']}s  acc {row['checks'].get('accuracy')}  "
                  f"sim {row['checks'].get('similarity')}  -> {row.get('shelved')}  {'; '.join(row['checks']['problems'])}", flush=True)
    except fill.NamedStop as e:
        stop = e
    line = H.census_line(H.census(stories, fill.read_manifest()))
    notes = [fill.git_commit(f"audio: Hush Harbor clone manifest ({line})")] if a.commit and (made or failed) else []
    if stop:
        print(str(stop), file=sys.stderr)
    print(f"OUTPUT {made} Hush Harbor clone stories shelved")
    print(line + f" (clone lane this run: {made} shelved, {failed} failed)" + (f"; notes: {'; '.join(notes)}" if notes else ""))
    if stop:
        return stop.exit_code
    if not queue:
        print("note: the clone lane has nothing left (every story is voiced or taken by the Gemini lane)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except fill.NamedStop as e:
        print(str(e), file=sys.stderr)
        sys.exit(e.exit_code)
