"""THE LIBRARY FILL: voice the whole app library on her Mac, check every file, shelve it on Drive.

Owner-approved 18 Nov 2026. Order (a partial library is still launchable), English first:
  1. Psalms (KJV), one file per psalm.
  2. Then, one file per chapter, the listening order in FIRST_BOOKS (Matthew, Mark, Luke, John,
     Proverbs, Genesis, ...), then the rest of the 66 books in canon order.
  The same order again in Spanish (RV1909). Files already in the manifest are never redone.
  3. Content scripts marked passed in content/ (stories, Psalm Nights, Imagination Nights, declarations).
Text is the stored text word for word (lib/text.py says the only spoken-form changes).

Each file: render (Kokoro, render_kokoro.py) -> master (two-pass EBU R128 loudnorm, then AAC-LC mono
48 kbps .m4a, plays on iOS and Android; the ENCODED file is measured and re-mastered from the kept WAV
when AAC pushed it outside the bars) -> check (qa.py) -> rclone copy to Drive + md5 check -> delete
from the Mac -> manifest row (audio/manifest.jsonl, one row per file). A file whose only problems are
mastering (A06) is never re-rendered; a speech problem (A01, A07, length) is re-rendered once (a touch
slower). A FAILED row is tried again on later runs, before any new file, until it has failed
MAX_TRIES runs; then it is a NAMED STOP [FAILED_3_TRIES] in the census line (and so in her morning
Notices) naming the files. Drive unreachable = NAMED STOP, exit 9. The Mac holds at most ~5 GB of work.

While priorities 1-2 are incomplete, ~/.peace-be-still/library-fill.active exists
({started, expected_end, reason}); How We Know / Whisper Almanac pause while it does. It is removed
the run that finds every priority 1-2 file in the manifest.

Every run ends with `OUTPUT <n> files shelved` and the census
`library fill: X of Y files, Z hours shelved, N failed`, which also goes once a day into her
morning email's Notices (Boss OS addMorningLines; no new email).

Run by launchd (audio/launchd/, every 15 minutes, nice 15) from the runner checkout
~/GitHub/.pbs-runner via audio/run.sh. By hand:
  <whisper venv python> audio/fill.py --limit 3 [--only en/psalms] [--dry-run]
"""
from __future__ import annotations

import argparse
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
from pathlib import Path
from zoneinfo import ZoneInfo

AUDIO = Path(__file__).resolve().parent
REPO = AUDIO.parent
sys.path.insert(0, str(AUDIO / "lib"))
import text as T  # noqa: E402

CT = ZoneInfo("America/Chicago")
HOME = Path(os.environ.get("PBS_HOME", Path.home() / ".peace-be-still"))
KOKORO_PY = os.environ.get("PBS_KOKORO_PY", str(Path.home() / "Work/claude-work/tts/venv/bin/python"))
SHELF = os.environ.get("PBS_SHELF", "gdrive:Mac-Shelf/peace-be-still/audio")
MANIFEST = Path(os.environ.get("PBS_MANIFEST", AUDIO / "manifest.jsonl"))
MAC_BUDGET_BYTES = 5 * 1024 ** 3

# Voices locked 18 Nov 2026 (COMMON.md; VOICES.md). Speed 0.85 is Nicole "as shipped".
VOICE = {"en": {"id": "kokoro:af_nicole", "spec": "af_nicole", "lang": "en-us"},
         "es": {"id": "kokoro:blend af_nicole 0.7 + ef_dora 0.3",
                "spec": {"blend": {"af_nicole": 0.7, "ef_dora": 0.3}}, "lang": "es"}}
SPEED = 0.85
RETRY_SPEED = 0.82
GAP = {"psalms": 1.5, "bible": 1.0, "content": 1.2}   # seconds of quiet after each verse / paragraph
HEADING_GAP = 1.2
# Loudness targets inside qa.BARS: sleep -24..-20 LUFS (TP <= -2), read-aloud -18..-16 (TP <= -1).
LEVEL_TARGET = {"sleep": (-22.0, -2.0), "read": (-17.0, -1.0)}
TRANSLATION_NAME = {"en": "KJV", "es": "RV1909"}


class NamedStop(Exception):
    def __init__(self, code: str, msg: str, exit_code: int = 9):
        super().__init__(f"NAMED STOP [{code}] {msg}")
        self.code, self.exit_code = code, exit_code


# ------------------------------------------------------------------ the plan
# Listening order (owner, 18 Nov 2026): the books people reach for first, then the rest in canon
# order. English whole, then Spanish in the same order.
FIRST_BOOKS = ["PSA", "MAT", "MAR", "LUK", "JOH", "PRO", "GEN", "ROM", "ISA", "ACT", "EPH", "PHI", "JAM",
               "1JO", "RUT", "EST", "DAN", "EXO"]


def book_order() -> list[str]:
    return FIRST_BOOKS + [c for c in T.CODES if c not in FIRST_BOOKS]


def plan(bibles: dict, content: list | None = None) -> list[dict]:
    """Every file the library needs, in recording order: English Psalms, then the listening-order
    books, then the rest in canon order; then Spanish the same way. Pure."""
    items = []
    for lang in ("en", "es"):
        for code in book_order():
            for c in sorted(bibles[lang].get(code, {})):
                if code == "PSA":
                    items.append(_scripture_item(bibles, lang, code, c, kind="psalms", priority=1))
                else:
                    items.append(_scripture_item(bibles, lang, code, c, kind="bible", priority=2))
    return items + list(content or [])


def _scripture_item(bibles, lang, book, chapter, *, kind, priority):
    tr = T.TRANSLATION[lang][0]
    verses = bibles[lang][book][chapter]
    return {"file": f"{lang}/{kind}/{tr}-{book.lower()}-{chapter:03d}.m4a", "kind": kind, "lang": lang,
            "ref": f"{book} {chapter}", "priority": priority, "level": "sleep" if kind == "psalms" else "read",
            "heading": T.heading(book, chapter, lang), "verses": [t for _, t in verses],
            "text": TRANSLATION_NAME[lang]}


def content_items(root: Path) -> list[dict]:
    """Priority 3: content/**/*.json whose status (or qa.status) is "passed". Tolerant of shape:
    the script is `script`, `text`, `retelling` or `body`; paragraphs split on blank lines; `lang`
    defaults to en; `kind` defaults to the folder name. A changed script is a new file (text hash)."""
    out = []
    base = root / "content"
    if not base.is_dir():
        return out
    for f in sorted(base.rglob("*.json")):
        try:
            obj = json.loads(f.read_text("utf-8"))
        except Exception:
            continue
        for o in obj if isinstance(obj, list) else [obj]:
            if not isinstance(o, dict):
                continue
            status = str(o.get("status") or (o.get("qa") or {}).get("status") or "").lower()
            body = next((o[k] for k in ("script", "text", "retelling", "body") if isinstance(o.get(k), str)), "")
            if status != "passed" or not body.strip():
                continue
            lang = o.get("lang") if o.get("lang") in ("en", "es") else "en"
            kind = re.sub(r"[^a-z0-9-]+", "-", str(o.get("kind") or f.parent.name).lower()).strip("-") or "content"
            ident = re.sub(r"[^a-z0-9-]+", "-", str(o.get("id") or f.stem).lower()).strip("-")
            h = hashlib.sha256(body.encode()).hexdigest()[:8]
            paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
            title = o.get("title") if isinstance(o.get("title"), str) else ""
            out.append({"file": f"{lang}/{kind}/{ident}-{h}.m4a", "kind": kind, "lang": lang,
                        "ref": f"{f.relative_to(root)}#{o.get('id') or f.stem}", "priority": 3,
                        "level": "sleep", "heading": title, "verses": paras, "text": "script", "gap": GAP["content"]})
    return out


def script_of(item: dict) -> str:
    """What the transcript is scored against: the stored words, heading first."""
    return " ".join([item["heading"], *item["verses"]]).strip()


def segments_of(item: dict, pron: dict) -> list[dict]:
    gap = item.get("gap", GAP.get(item["kind"], 1.2))
    segs = [{"text": T.speech_text(item["heading"], item["lang"], pron), "gap": HEADING_GAP}] if item["heading"] else []
    segs += [{"text": T.speech_text(v, item["lang"], pron), "gap": gap} for v in item["verses"]]
    return [s for s in segs if s["text"]]


# ------------------------------------------------------------------ the manifest
def read_manifest(path: Path = MANIFEST) -> list[dict]:
    """Every row; a line that is not JSON (e.g. merge-conflict markers) is a NAMED STOP, never a traceback."""
    if not path.exists():
        return []
    rows = []
    for n, line in enumerate(path.read_text("utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            raise NamedStop("MANIFEST_CORRUPT", f"{path} line {n} is not JSON ({line[:40]!r}); a git merge likely left "
                            "conflict markers. Keep every JSON row (union), delete the marker lines, commit, and the next run resumes.")
    return rows


MAX_TRIES = 3   # runs that may fail one file before it is a named stop for a person


def latest(rows: list[dict]) -> dict:
    """file -> its row; a later row for the same file wins. Pure."""
    return {r["file"]: r for r in rows}


def tries(row: dict) -> int:
    """Runs that have voiced this file (rows from before 20 Nov 2026 carry no count: one run)."""
    return int(row.get("tries") or 1)


def upsert_row(row: dict, path: Path = MANIFEST) -> dict:
    """One row per file: a retried file replaces its FAILED row, carrying the run count on."""
    rows = read_manifest(path)
    prev = latest(rows).get(row["file"])
    row = {**row, "tries": tries(prev) + 1 if prev else 1}
    rows = [r for r in rows if r["file"] != row["file"]] + [row]
    tmp = path.with_suffix(".tmp")
    tmp.write_text("".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows), "utf-8")
    tmp.replace(path)
    return row


def _file(item: dict) -> str:
    return item["file"]


def todo(items: list, rows: list[dict], only: str | None = None, key=_file) -> list:
    """What this run voices: FAILED files with tries left first (never a permanent hole), then files
    not yet in the manifest, each in plan order. Passed files and files out of tries are skipped. Pure."""
    last = latest(rows)
    mine = [i for i in items if not only or key(i).startswith(only)]
    retry = [i for i in mine if last.get(key(i), {}).get("status") == "FAILED" and tries(last[key(i)]) < MAX_TRIES]
    return retry + [i for i in mine if key(i) not in last]


def given_up(items: list, rows: list[dict], key=_file) -> list[str]:
    """Files that failed MAX_TRIES runs: they wait for a person. Pure."""
    last = latest(rows)
    return [key(i) for i in items if last.get(key(i), {}).get("status") == "FAILED" and tries(last[key(i)]) >= MAX_TRIES]


def given_up_line(files: list[str]) -> str:
    return (f"NAMED STOP [FAILED_3_TRIES] {len(files)} file(s) failed {MAX_TRIES} runs and wait for a person: "
            + ", ".join(files)) if files else ""


def census(items: list[dict], rows: list[dict]) -> dict:
    """The run's numbers, over priorities 1-2 (the scripture library). Complete = every file passed
    or out of tries (those are named in the line). Pure."""
    core = [i for i in items if i["priority"] <= 2]
    last = latest(rows)
    mine = [last[i["file"]] for i in core if i["file"] in last]
    passed = [r for r in mine if r.get("status") == "passed"]
    failed = [r for r in mine if r.get("status") == "FAILED"]
    stuck = given_up(core, rows)
    return {"total": len(core), "done": len(mine), "passed": len(passed), "failed": len(failed),
            "hours": round(sum(r.get("seconds", 0) for r in passed) / 3600, 1), "given_up": stuck,
            "complete": len(passed) + len(stuck) == len(core) and len(core) > 0}


def census_line(c: dict) -> str:
    line = (f"library fill: {c['passed']} of {c['total']} files, {c['hours']} hours shelved, "
            f"{c['failed']} failed")
    return line + (f"; {given_up_line(c['given_up'])}" if c.get("given_up") else "")


# ------------------------------------------------------------------ text progress (the library text)
# Targets (coordinator brief 18 Nov 2026): stories 200 = plain 60 + Hush Harbor 60 + favourites 20 + Mi Refugio 60,
# by Sat 21 Nov; Psalm Nights 60 (30 en + 30 es), Imagination Nights 30, declarations 730 (365 en + es) by Mon 23 Nov.
TEXT_TARGETS = {"plain": 60, "hh": 60, "fav": 20, "es": 60, "psalm": 60, "imagination": 30, "declarations": 730}


def text_counts(root: Path) -> dict:
    """Passed items counted from the content JSON in the repo, never a hand-kept number. Pure (reads files)."""
    c = dict.fromkeys(TEXT_TARGETS, 0)
    base = root / "content"

    def passed(d: Path):
        for f in sorted(d.glob("*.json")) if d.is_dir() else []:
            try:
                o = json.loads(f.read_text("utf-8"))
            except Exception:
                continue
            if o.get("status") == "passed":
                yield o
    c["plain"] = sum(1 for _ in passed(base / "stories/plain"))
    for o in passed(base / "stories/hush-harbor"):
        c["fav" if str(o.get("id", "")).startswith("fav-") else "hh"] += 1
    c["es"] = sum(1 for _ in passed(base / "stories/mi-refugio"))
    c["psalm"] = sum(1 for lang in ("en", "es") for _ in passed(base / "psalm-nights" / lang))
    c["imagination"] = sum(1 for _ in passed(base / "imagination-nights/en"))
    for lang in ("en", "es"):
        f = base / "morning-word" / f"{lang}.json"
        try:
            c["declarations"] += sum(1 for i in json.loads(f.read_text("utf-8")).get("items", []) if i.get("status") == "passed")
        except Exception:
            pass
    return c


def text_progress(counts: dict, state: dict, now: dt.datetime) -> tuple[str, dict]:
    """The text line for her Notices, and the new state. BEHIND when the total has not grown for 24 h
    while any target is unmet. Pure."""
    total = sum(counts.values())
    st = dict(state)
    if total != st.get("total") or not st.get("grew_at"):
        st = {"total": total, "grew_at": now.isoformat()}
    met = all(counts[k] >= v for k, v in TEXT_TARGETS.items())
    stalled = now - dt.datetime.fromisoformat(st["grew_at"]) >= dt.timedelta(hours=24)
    stories = counts["plain"] + counts["hh"] + counts["fav"] + counts["es"]
    t = TEXT_TARGETS
    line = (f"text: stories {stories}/{t['plain'] + t['hh'] + t['fav'] + t['es']} "
            f"({counts['plain']}/{counts['hh']}/{counts['fav']}/{counts['es']} plain/HH/favourites/es), "
            f"Psalm Nights {counts['psalm']}/{t['psalm']}, Imagination {counts['imagination']}/{t['imagination']}, "
            f"declarations {counts['declarations']}/{t['declarations']} · target stories Sat 21 Nov, rest Mon 23 Nov")
    if stalled and not met:
        line = "BEHIND (no new text in 24 h) " + line
    return line, st


def text_line(now: dt.datetime) -> str:
    """Reads and updates the growth record in state.json; never stops the audio run."""
    try:
        st = json.loads(state_path().read_text())
    except Exception:
        st = {}
    line, st["text"] = text_progress(text_counts(REPO), st.get("text") or {}, now)
    try:
        state_path().parent.mkdir(parents=True, exist_ok=True)
        state_path().write_text(json.dumps(st, indent=1))
    except Exception:
        pass
    return line


def expected_end(items: list[dict], rows: list[dict], now: dt.datetime) -> dt.datetime | None:
    """Now + the words still to voice x the measured Mac seconds per word (passed rows). Pure."""
    timed = [r for r in rows if r.get("work_s") and r.get("checks", {}).get("words")]
    if not timed:
        return None
    per_word = sum(r["work_s"] for r in timed) / sum(r["checks"]["words"] for r in timed)
    done = {r["file"] for r in rows}
    left = sum(len(T.score_words(script_of(i), i["lang"])) for i in items if i["priority"] <= 2 and i["file"] not in done)
    return now + dt.timedelta(seconds=left * per_word)


# ------------------------------------------------------------------ the active flag
def write_active(path: Path, now: dt.datetime, end: dt.datetime | None) -> None:
    prev = {}
    try:
        prev = json.loads(path.read_text())
    except Exception:
        pass
    body = {"started": prev.get("started") or now.isoformat(timespec="seconds"),
            "expected_end": end.isoformat(timespec="seconds") if end else prev.get("expected_end"),
            "reason": "Peace Be Still library fill (KJV + RV1909 read aloud) is using the Mac; "
                      "How We Know / Whisper Almanac pause until this file is gone.",
            "updated": now.isoformat(timespec="seconds")}
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(body, indent=1))
    tmp.replace(path)


def settle_active(active: Path, items: list[dict], rows: list[dict], now: dt.datetime) -> bool:
    """End of a run: priorities 1-2 all in the manifest -> remove the flag (True when it was just
    removed); otherwise refresh it with the new expected end."""
    if census(items, rows)["complete"]:
        if active.exists():
            active.unlink()
            return True
        return False
    write_active(active, now, expected_end(items, rows, now))
    return False


# ------------------------------------------------------------------ audio steps
def render(item: dict, pron: dict, wav: Path, speed: float) -> None:
    v = VOICE[item["lang"]]
    job = {"voice": v["spec"], "lang": v["lang"], "speed": speed, "lead": 0.6, "tail": 2.0,
           "segments": segments_of(item, pron), "out": str(wav)}
    r = subprocess.run([KOKORO_PY, str(AUDIO / "render_kokoro.py")], input=json.dumps(job),
                       capture_output=True, text=True, timeout=4 * 3600)
    if r.returncode != 0 or not wav.exists():
        raise RuntimeError(f"render failed: {r.stderr.strip()[-300:]}")


# Mastering: ffmpeg's two-pass EBU R128 loudnorm (measure, then apply the measured values), then AAC.
# The AAC encoder adds inter-sample overs a filter before it cannot see (19 Nov 2026: 53 of 63 failures
# were A06 true peak), so the true-peak target starts TP_MARGIN under the ceiling and the ENCODED file
# is what is judged; a miss is mastered again from the same WAV (never a new render).
LRA = 11.0          # speech: wide enough that loudnorm stays linear (no pumping) on a calm reading
TP_MARGIN = 1.0
MASTER_TRIES = 3


def loudnorm_measured(stderr: str) -> dict:
    """The JSON block loudnorm prints in pass 1 (print_format=json). Pure."""
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr)
    if not m:
        raise RuntimeError(f"loudnorm pass 1 printed no measurement: {stderr.strip()[-200:]}")
    return json.loads(m.group(0))


def loudnorm_filter(i: float, tp: float, measured: dict | None = None) -> str:
    """loudnorm for pass 1 (no measurement: print it) or pass 2 (apply it, linear). Pure."""
    f = f"loudnorm=I={i}:TP={tp}:LRA={LRA}"
    if measured is None:
        return f + ":print_format=json"
    return (f + f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
            f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
            f":offset={measured['target_offset']}:linear=true:print_format=summary")


def master(wav: Path, out: Path, level: str, *, run=None, measure=None) -> dict:
    """WAV -> mastered AAC-LC mono 48 kbps .m4a inside the level's bars (qa.BARS), judged on the
    ENCODED file by qa.loudness. A miss is mastered again from the kept WAV: the true-peak target
    lowered by the overshoot (+0.5 dB), the loudness target moved by the error; at most MASTER_TRIES.
    Returns the last measurement and the targets used; the caller's qa.check is the final judge."""
    import qa
    run = run or subprocess.run
    measure = measure or qa.loudness
    target, ceiling = LEVEL_TARGET[level]
    lo, hi = qa.BARS[level]["lufs"]
    i, tp = target, round(ceiling - TP_MARGIN, 1)
    for n in range(1, MASTER_TRIES + 1):
        p1 = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af", loudnorm_filter(i, tp), "-f", "null", "-"],
                 capture_output=True, text=True, timeout=1800)
        run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af", loudnorm_filter(i, tp, loudnorm_measured(p1.stderr)),
             "-ac", "1", "-ar", "24000", "-c:a", "aac_at", "-b:a", "48k", "-movflags", "+faststart", str(out)],
            check=True, timeout=1800)
        got = measure(out)
        peak_ok, loud_ok = got["true_peak"] <= ceiling, lo <= got["lufs"] <= hi
        if peak_ok and loud_ok:
            break
        if not peak_ok:
            tp = round(tp - (got["true_peak"] - ceiling) - 0.5, 1)
        if not loud_ok:
            i = round(i + (target - got["lufs"]), 1)
    return {**got, "tries": n, "i": i, "tp": tp}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def rclone(*args: str, timeout: int = 600) -> subprocess.CompletedProcess:
    return subprocess.run(["rclone", *args], capture_output=True, text=True, timeout=timeout)


def drive_reachable(shelf: str | None = None) -> None:
    shelf = shelf or SHELF
    try:
        r = rclone("lsjson", "--max-depth", "1", shelf.split("/", 1)[0], timeout=120)
    except subprocess.TimeoutExpired:
        raise NamedStop("DRIVE_UNREACHABLE", f"rclone could not list {shelf} in 2 minutes; nothing was voiced. "
                        "Check the Mac's network and `rclone lsd gdrive:` (re-auth with `rclone config reconnect gdrive:`).")
    if r.returncode != 0:
        raise NamedStop("DRIVE_UNREACHABLE", f"rclone could not reach {shelf}: {r.stderr.strip()[-200:]}; nothing was voiced. "
                        "Re-auth with `rclone config reconnect gdrive:` on the Mac.")


def shelve(local: Path, rel: str, shelf: str | None = None) -> str:
    """rclone copy + size and md5 check; returns the Drive path. Any miss is a NAMED STOP."""
    dest = f"{shelf or SHELF}/{rel}"
    try:
        r = rclone("copyto", str(local), dest, timeout=1800)
    except subprocess.TimeoutExpired:
        raise NamedStop("DRIVE_UNREACHABLE", f"the copy of {rel} to Drive took over 30 minutes")
    if r.returncode != 0:
        raise NamedStop("DRIVE_UNREACHABLE", f"the copy of {rel} to Drive failed: {r.stderr.strip()[-200:]}")
    r = rclone("lsjson", "--hash", "--files-only", dest, timeout=300)
    try:
        meta = json.loads(r.stdout)[0]
    except Exception:
        raise NamedStop("SHELF_NOT_VERIFIED", f"{rel} was copied but Drive does not list it: {r.stderr.strip()[-200:]}")
    remote_md5 = (meta.get("Hashes") or {}).get("md5")
    if meta.get("Size") != local.stat().st_size or remote_md5 != md5(local):
        raise NamedStop("SHELF_HASH_MISMATCH", f"{rel} on Drive does not match the Mac copy "
                        f"(size {meta.get('Size')} vs {local.stat().st_size}, md5 {remote_md5}); the Mac copy is kept in the work folder.")
    return dest


def dir_bytes(p: Path) -> int:
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) if p.exists() else 0


def make_one(item: dict, pron: dict, work: Path) -> dict:
    """Render, master and check one file. Mastering misses are mastered again from the kept WAV
    (master()); only a speech problem (qa.speech_problems: A01, A07, length) is rendered again, once,
    a touch slower. Returns the row (without shelving): passed with the local path, or FAILED."""
    import qa
    t0 = time.monotonic()
    wav, out = work / "track.wav", work / Path(item["file"]).name
    result, attempts = None, 0
    try:
        for speed in (SPEED, RETRY_SPEED):
            attempts += 1
            render(item, pron, wav, speed)
            mastered = master(wav, out, item["level"])
            result = qa.check(out, script_of(item), item["lang"], item["level"])
            if result["pass"] or not qa.speech_problems(result["problems"]):
                break
    finally:
        wav.unlink(missing_ok=True)
    checks = {k: result[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    checks["problems"] = result["problems"]
    checks["mastering"] = {k: mastered[k] for k in ("tries", "i", "tp")}
    row = {"file": item["file"], "kind": item["kind"], "lang": item["lang"], "ref": item["ref"],
           "text": item["text"], "voice": VOICE[item["lang"]]["id"], "seconds": result["seconds"],
           "checks": checks, "attempts": attempts, "work_s": round(time.monotonic() - t0, 1),
           "status": "passed" if result["pass"] else "FAILED",
           "at": dt.datetime.now(CT).isoformat(timespec="seconds")}
    if result["pass"]:
        row["sha256"] = sha256(out)
        row["_local"] = str(out)
    else:
        out.unlink(missing_ok=True)
        row["sha256"] = None
        row["shelved"] = None
    return row


# ------------------------------------------------------------------ the morning line + git
def state_path() -> Path:
    return HOME / "state.json"


def morning_line(text: str, key: str, now: dt.datetime) -> str:
    """At most one line per key per Central day into Notices (Boss OS addMorningLines on this Mac)."""
    if os.environ.get("PBS_NO_MORNING"):
        return "morning line off (PBS_NO_MORNING)"
    day = now.astimezone(CT).date().isoformat()
    try:
        st = json.loads(state_path().read_text())
    except Exception:
        st = {}
    if st.get("said", {}).get(key) == day:
        return f"morning line already written today ({key})"
    mod = Path(os.path.expanduser(os.environ.get("BOSS_OS_REPO") or "~/GitHub/boss-os")) / "src/shared/boss/mail/morning.mjs"
    node = shutil.which("node") or "/opt/homebrew/bin/node"
    if not (Path(node).exists() and mod.exists()):
        return f"no morning line: {mod} or node not found"
    js = (f"import {{ addMorningLines }} from {json.dumps(mod.as_uri())};"
          "addMorningLines('notices', { lines: [{ text: process.argv[1] }] });")
    r = subprocess.run([node, "--input-type=module", "-e", js, text], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        return f"no morning line: {r.stderr.strip()[-160:]}"
    st.setdefault("said", {})[key] = day
    state_path().parent.mkdir(parents=True, exist_ok=True)
    state_path().write_text(json.dumps(st, indent=1))
    return "morning line written"


def git_commit(msg: str) -> str:
    """Commit the manifest and push it (the runner checkout tracks main). A push that fails is a
    note: the commit stays local and the next run pushes it."""
    def g(*a, timeout=120):
        return subprocess.run(["git", "-C", str(REPO), *a], capture_output=True, text=True, timeout=timeout)
    g("add", str(MANIFEST.relative_to(REPO)))
    if g("diff", "--cached", "--quiet").returncode != 0:
        g("commit", "-q", "-m", msg)
    for _ in range(3):
        if g("pull", "--rebase", "-q").returncode == 0 and g("push", "-q").returncode == 0:
            return "manifest pushed"
    return "manifest committed; push failed (the next run pushes it)"


# ------------------------------------------------------------------ the run window
def window_minutes(now: dt.datetime) -> int:
    """Minutes the Mac may still spend on audio in this batch (her pick "A", 20 Nov 2026): 0 in her
    workday (Mon-Fri 08:00-17:00 CT, Codex builds the app then); otherwise the minutes until the next
    weekday 08:00 CT, so a batch never runs into a workday. Weekends are open all day. Pure."""
    n = now.astimezone(CT)
    if n.weekday() < 5 and 8 <= n.hour < 17:
        return 0
    end = n.replace(hour=8, minute=0, second=0, microsecond=0)
    if n >= end:
        end += dt.timedelta(days=1)
    while end.weekday() >= 5:
        end += dt.timedelta(days=1)
    return int((end.timestamp() - n.timestamp()) // 60)


# ------------------------------------------------------------------ the run
def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="at most this many files this run")
    ap.add_argument("--max-minutes", type=float, default=0, help="stop starting new files after this")
    ap.add_argument("--only", help="only files whose path starts with this, e.g. en/psalms")
    ap.add_argument("--commit", action="store_true", help="commit and push the manifest (the runner)")
    ap.add_argument("--dry-run", action="store_true", help="print the plan and the census; voice nothing")
    ap.add_argument("--window-minutes", action="store_true", help="print the run window's minutes left now (run.sh)")
    a = ap.parse_args(argv)
    if a.window_minutes:
        print(window_minutes(dt.datetime.now(CT)))
        return 0

    HOME.mkdir(parents=True, exist_ok=True)
    lock = (HOME / "library-fill.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("OUTPUT 0 files shelved (note: another library-fill run holds the lock and is working)")
        return 0

    now = dt.datetime.now(CT)
    bibles = {lang: T.load_bible(lang) for lang in ("en", "es")}
    if len(bibles["en"]) != 66 or len(bibles["es"]) != 66:
        raise NamedStop("SCRIPTURE_MISSING", f"expected 66 books in each store, found KJV {len(bibles['en'])}, "
                        f"RV1909 {len(bibles['es'])} (read from {T.SCRIPTURE})", 2)
    pron = T.load_pronunciations()
    items = plan(bibles, content_items(REPO))
    rows = read_manifest()
    queue = todo(items, rows, a.only)
    active = HOME / "library-fill.active"
    c0 = census(items, rows)
    if a.dry_run:
        print(f"plan: {len(items)} files ({c0['total']} scripture), {len(queue)} to do; next: "
              + ", ".join(i["file"] for i in queue[:3]))
        print(census_line(c0) + "; " + text_line(now))
        return 0

    if not c0["complete"]:
        write_active(active, now, expected_end(items, rows, now))
    work = HOME / "work"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)

    made, failed_now, stop = 0, 0, None
    t_start = time.monotonic()
    try:
        if queue:
            drive_reachable()
        for item in queue:
            if a.limit and made + failed_now >= a.limit:
                break
            if a.max_minutes and (time.monotonic() - t_start) / 60 >= a.max_minutes:
                break
            if dir_bytes(work) > MAC_BUDGET_BYTES:
                raise NamedStop("MAC_BUDGET", f"the work folder {work} holds over 5 GB; nothing more is voiced until it is cleared")
            row = make_one(item, pron, work)
            if row["status"] == "passed":
                local = Path(row.pop("_local"))
                row["shelved"] = shelve(local, item["file"])
                local.unlink()
                made += 1
            else:
                failed_now += 1
            row = upsert_row(row)
            print(f"{row['status']:6} {item['file']}  try {row['tries']}  {row['seconds']}s  acc {row['checks']['accuracy']}  "
                  f"{row['checks']['lufs']} LUFS  work {row['work_s']}s  {'; '.join(row['checks']['problems'])}", flush=True)
            if a.commit and (made + failed_now) % 10 == 0:
                git_commit(f"audio: library fill manifest ({made + failed_now} more files)")
    except NamedStop as e:
        stop = e
    finally:
        shutil.rmtree(work, ignore_errors=True)

    rows = read_manifest()
    c = census(items, rows)
    now = dt.datetime.now(CT)
    notes = []
    if settle_active(active, items, rows, now):
        notes.append(morning_line(f"Peace Be Still: the whole Bible is voiced and on Drive — {census_line(c)}. "
                                  "How We Know and Whisper Almanac can run again.", "complete", now))
    if a.commit and (made or failed_now):
        notes.append(git_commit(f"audio: library fill manifest ({census_line(c)})"))
    line = census_line(c) + "; " + text_line(now)
    if now.hour >= 5 and not stop:
        notes.append(morning_line(f"Peace Be Still {line}.", "daily", now))
    if stop:
        print(str(stop), file=sys.stderr)
        notes.append(morning_line(f"Peace Be Still library fill stopped: {stop}", f"stop:{stop.code}", now))
    print(f"OUTPUT {made} files shelved")
    print(line + (f" (this run: {made} shelved, {failed_now} failed)") + (f"; notes: {'; '.join(notes)}" if notes else ""))
    if stop:
        return stop.exit_code
    if queue and made == 0 and failed_now and not a.only:
        print(f"NAMED STOP [NOTHING_SHELVED] all {failed_now} files tried this run failed their checks", file=sys.stderr)
        return 9
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except NamedStop as e:
        print(str(e), file=sys.stderr)
        sys.exit(e.exit_code)
