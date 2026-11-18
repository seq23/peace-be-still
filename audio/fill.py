"""THE LIBRARY FILL: voice the whole app library on her Mac, check every file, shelve it on Drive.

Owner-approved 18 Nov 2026. Order (a partial library is still launchable), English first:
  1. Psalms (KJV), one file per psalm.
  2. Then, one file per chapter, the listening order in FIRST_BOOKS (Matthew, Mark, Luke, John,
     Proverbs, Genesis, ...), then the rest of the 66 books in canon order.
  The same order again in Spanish (RV1909). Files already in the manifest are never redone.
  3. Content scripts marked passed in content/ (stories, Psalm Nights, Imagination Nights, declarations).
Text is the stored text word for word (lib/text.py says the only spoken-form changes).

Each file: render (Kokoro, render_kokoro.py) -> encode (AAC-LC mono 48 kbps .m4a, plays on iOS and
Android) -> check (qa.py) -> rclone copy to Drive + md5 check -> delete from the Mac -> manifest row
(audio/manifest.jsonl). A failed check is re-rendered once (a touch slower), then written as a
FAILED row, never skipped. Drive unreachable = NAMED STOP, exit 9. The Mac holds at most ~5 GB of work.

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
SCRIPTURE = Path(os.environ.get("PBS_SCRIPTURE_DIR", Path.home() / "Work/codex-briefs/peace-be-still"))
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
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text("utf-8").splitlines() if line.strip()]


def append_row(row: dict, path: Path = MANIFEST) -> None:
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def todo(items: list[dict], rows: list[dict], only: str | None = None) -> list[dict]:
    """Resumable: everything already in the manifest (passed or FAILED) is skipped. Pure."""
    done = {r["file"] for r in rows}
    return [i for i in items if i["file"] not in done and (not only or i["file"].startswith(only))]


def census(items: list[dict], rows: list[dict]) -> dict:
    """The run's numbers, over priorities 1-2 (the scripture library). Pure."""
    core = {i["file"] for i in items if i["priority"] <= 2}
    mine = [r for r in rows if r["file"] in core]
    passed = [r for r in mine if r.get("status") == "passed"]
    failed = [r for r in mine if r.get("status") == "FAILED"]
    return {"total": len(core), "done": len(mine), "passed": len(passed), "failed": len(failed),
            "hours": round(sum(r.get("seconds", 0) for r in passed) / 3600, 1),
            "complete": len(mine) == len(core) and len(core) > 0}


def census_line(c: dict) -> str:
    return (f"library fill: {c['passed']} of {c['total']} files, {c['hours']} hours shelved, "
            f"{c['failed']} failed")


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


def encode(wav: Path, out: Path, level: str, margin_db: float = 1.5) -> None:
    """Gain to the level's target, a peak limiter `margin_db` under its true-peak ceiling, AAC-LC mono 48 kbps."""
    import qa
    target, tp = LEVEL_TARGET[level]
    gain = round(target - qa.loudness(wav)["lufs"], 2)
    limit = round(10 ** ((tp - margin_db) / 20), 4)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af",
                    f"volume={gain}dB,alimiter=limit={limit}:attack=5:release=50:level=false",
                    "-ac", "1", "-ar", "24000", "-c:a", "aac_at", "-b:a", "48k", "-movflags", "+faststart", str(out)],
                   check=True, timeout=1800)


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
    """Render, encode and check one file (re-render once on a failed check). Returns the row
    (without shelving): status passed with the local path, or FAILED with the problems."""
    import qa
    t0 = time.monotonic()
    wav, out = work / "track.wav", work / Path(item["file"]).name
    result, attempts = None, 0
    for speed in (SPEED, RETRY_SPEED):
        attempts += 1
        render(item, pron, wav, speed)
        encode(wav, out, item["level"])
        wav.unlink(missing_ok=True)
        result = qa.check(out, script_of(item), item["lang"], item["level"])
        if result["pass"]:
            break
    checks = {k: result[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    checks["problems"] = result["problems"]
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


# ------------------------------------------------------------------ the run
def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="at most this many files this run")
    ap.add_argument("--max-minutes", type=float, default=0, help="stop starting new files after this")
    ap.add_argument("--only", help="only files whose path starts with this, e.g. en/psalms")
    ap.add_argument("--commit", action="store_true", help="commit and push the manifest (the runner)")
    ap.add_argument("--dry-run", action="store_true", help="print the plan and the census; voice nothing")
    a = ap.parse_args(argv)

    HOME.mkdir(parents=True, exist_ok=True)
    lock = (HOME / "library-fill.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("OUTPUT 0 files shelved (note: another library-fill run holds the lock and is working)")
        return 0

    now = dt.datetime.now(CT)
    bibles = {lang: T.load_bible(lang, SCRIPTURE) for lang in ("en", "es")}
    if len(bibles["en"]) != 66 or len(bibles["es"]) != 66:
        raise NamedStop("SCRIPTURE_MISSING", f"expected 66 books in each store, found KJV {len(bibles['en'])}, "
                        f"RV1909 {len(bibles['es'])} (read from {SCRIPTURE})", 2)
    pron = T.load_pronunciations()
    items = plan(bibles, content_items(REPO))
    rows = read_manifest()
    queue = todo(items, rows, a.only)
    active = HOME / "library-fill.active"
    c0 = census(items, rows)
    if a.dry_run:
        print(f"plan: {len(items)} files ({c0['total']} scripture), {len(queue)} to do; next: "
              + ", ".join(i["file"] for i in queue[:3]))
        print(census_line(c0))
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
            append_row(row)
            print(f"{row['status']:6} {item['file']}  {row['seconds']}s  acc {row['checks']['accuracy']}  "
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
    line = census_line(c)
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
