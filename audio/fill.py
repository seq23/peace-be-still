"""THE LIBRARY FILL: voice the whole app library on her Mac, check every file, shelve it on Drive.

Owner-approved 18 Nov 2026. Order (a partial library is still launchable), English first:
  1. Psalms (KJV), one file per psalm.
  2. Then, one file per chapter, the listening order in FIRST_BOOKS (Matthew, Mark, Luke, John,
     Proverbs, Genesis, ...), then the rest of the 66 books in canon order.
  The same order again in Spanish (RV1909). Files already in the manifest are never redone.
  3. Content scripts marked passed in content/: the sleep sessions (Psalm Nights, Imagination Nights) right
     after the English Psalms, then the stories Kokoro voices (plain English, Mi Refugio in Spanish; Hush
     Harbor has its own lanes), then the chapters.
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
import math
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from zoneinfo import ZoneInfo

AUDIO = Path(__file__).resolve().parent
REPO = Path(os.environ.get("PBS_REPO", AUDIO.parent))   # the gather job: this commit's code, main's checkout
sys.path.insert(0, str(AUDIO / "lib"))
import memguard  # noqa: E402
import text as T  # noqa: E402

CT = ZoneInfo("America/Chicago")
HOME = Path(os.environ.get("PBS_HOME", Path.home() / ".peace-be-still"))
KOKORO_PY = os.environ.get("PBS_KOKORO_PY", str(Path.home() / "Work/claude-work/tts/venv/bin/python"))
SHELF = os.environ.get("PBS_SHELF", "gdrive:Mac-Shelf/peace-be-still/audio")
MANIFEST = Path(os.environ.get("PBS_MANIFEST", REPO / "audio" / "manifest.jsonl"))
# The words of the 21 sessions voiced before rows recorded them (recovered exactly from git, 21 Nov 2026).
VOICED_WORDS = Path(os.environ.get("PBS_VOICED_WORDS", AUDIO / "voiced-words.json"))
# Who voices what (audio/lanes.json): the Mac's lanes take the kinds and stories listed there, the GitHub
# Actions fill lane (fill-cloud.yml) takes everything else, so the two never voice the same file.
LANE = os.environ.get("PBS_LANE", "mac")
# Cloud only: failed files are held on Drive, not on a runner that is wiped when the job ends.
HELD_REMOTE = os.environ.get("PBS_HELD_REMOTE", "")
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
# "hush" (-27 LUFS, TP <= -4) is the very quiet "3 AM, back to sleep" night (a session's `level`, 21 Nov 2026).
LEVEL_TARGET = {"sleep": (-22.0, -2.0), "read": (-17.0, -1.0), "hush": (-27.0, -4.0)}
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


SESSION_KINDS = ("psalm-night", "imagination-night")   # the sleep sessions (the paid "session every night")
STORY_KIND = "stories"
# Story tellings the Kokoro fill voices (coordinator 21 Nov 2026): Hush Harbor has its own Gemini and clone lanes.
STORY_TELLINGS = ("plain", "mi-refugio")
FRONT_KINDS = SESSION_KINDS + (STORY_KIND,)   # queued ahead of the chapters and of failed-chapter retries
# The voiced floor per session kind (21 Nov 2026: nights the gate estimated at 20 min voiced at 17): a file under it
# fails its checks and is rendered again slower, then held, never shelved short.
TARGET_SECONDS = {"imagination-night": 18 * 60, "psalm-night": 13 * 60}   # the low end of each writing target
# Her ruling 21 Nov 2026: a floor catches BROKEN output (cut off, skipped chunks), not the target: under 75% of
# the target is held (one slower render, then FAILED); between the floor and the target ships with a SHORT note.
# A night's own `target_seconds` (session_item) replaces its kind's target.


def plan(bibles: dict, content: list | None = None) -> list[dict]:
    """Every file the library needs, in recording order: English Psalms, then the sleep sessions
    (Psalm Nights in both languages, Imagination Nights: the paid core, coordinator 21 Nov 2026),
    then the stories (plain English, then Mi Refugio; 21 Nov 2026: queued after the sessions and before
    the chapters and their retries, a bounded batch), then the listening-order books, the rest in canon
    order, then Spanish the same way; any other content last. Pure."""
    content = list(content or [])
    # owner's order 21 Nov 2026: EN Psalm Nights, ES Psalm Nights, then Imagination Nights EN, then ES
    sessions = sorted((i for i in content if i["kind"] in SESSION_KINDS),
                      key=lambda i: (SESSION_KINDS.index(i["kind"]), i["lang"] != "en", i["file"]))
    items = []
    for lang in ("en", "es"):
        for code in book_order():
            for c in sorted(bibles[lang].get(code, {})):
                if code == "PSA":
                    items.append(_scripture_item(bibles, lang, code, c, kind="psalms", priority=1))
                else:
                    items.append(_scripture_item(bibles, lang, code, c, kind="bible", priority=2))
    stories = sorted((i for i in content if i["kind"] == STORY_KIND),
                     key=lambda i: (i["lang"] != "en", i["file"]))
    cut = next((n for n, i in enumerate(items) if not (i["lang"] == "en" and i["kind"] == "psalms")), len(items))
    return items[:cut] + sessions + stories + items[cut:] + [i for i in content if i["kind"] not in FRONT_KINDS]


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
            lang = o.get("lang") if o.get("lang") in ("en", "es") else "en"
            if status == "passed" and isinstance(o.get("segments"), list):
                item = session_item(o, f, root, lang)
                if item:
                    out.append(item)
                continue
            if isinstance(o.get("blocks"), list):
                item = story_item(o, f, root, lang) if status == "passed" and o.get("telling") in STORY_TELLINGS else None
                if item:
                    out.append(item)
                continue
            body = next((o[k] for k in ("script", "text", "retelling", "body") if isinstance(o.get(k), str)), "")
            if status != "passed" or not body.strip():
                continue
            kind = re.sub(r"[^a-z0-9-]+", "-", str(o.get("kind") or f.parent.name).lower()).strip("-") or "content"
            ident = re.sub(r"[^a-z0-9-]+", "-", str(o.get("id") or f.stem).lower()).strip("-")
            h = hashlib.sha256(body.encode()).hexdigest()[:8]
            paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
            title = o.get("title") if isinstance(o.get("title"), str) else ""
            out.append({"file": f"{lang}/{kind}/{ident}-{h}.m4a", "kind": kind, "lang": lang,
                        "ref": f"{f.relative_to(root)}#{o.get('id') or f.stem}", "priority": 3,
                        "level": "sleep", "heading": title, "verses": paras, "text": "script", "gap": GAP["content"]})
    return out


_PAUSE = re.compile(r"\[pause (\d+(?:\.\d+)?)\]")


def _verse_label(ref: str, lang: str) -> str:
    """'PSA 23:1-6' -> 'Psalm 23, verses 1 to 6.' (the reference is always said with the passage)."""
    book, rest = ref.split(" ", 1)
    chap, _, vv = rest.partition(":")
    head = T.heading(book, int(chap), lang).rstrip(".")
    if not vv:
        return head + "."
    a, _, b = vv.partition("-")
    if lang == "es":
        return f"{head}, versículos {a} al {b}." if b else f"{head}, versículo {a}."
    return f"{head}, verses {a} to {b}." if b else f"{head}, verse {a}."


def session_item(o: dict, f: Path, root: Path, lang: str) -> dict | None:
    """A sleep session (content/psalm-nights, content/imagination-nights): `segments` of narrator text,
    where `[pause N]` is N seconds of real quiet and a blank line is the script's paragraph quiet, and
    passages whose verses are the stored KJV / RV1909 words (checked word for word by the content gate),
    each said with its reference. Returns None when there is nothing to say."""
    pace = o.get("pacing") or {}
    para = float(pace.get("quiet_between_paragraphs_s", 2.0))
    verse_gap = float(pace.get("quiet_between_verses_s", GAP["psalms"]))
    pieces: list[list] = []          # [text, gap after]
    for seg in o["segments"]:
        if isinstance(seg.get("verses"), list) and seg.get("ref"):
            pieces.append([_verse_label(seg["ref"], lang), HEADING_GAP])
            pieces += [[str(v.get("text", "")).strip(), verse_gap] for v in seg["verses"]]
            if pieces:
                pieces[-1][1] = para
        elif isinstance(seg.get("text"), str):
            for block in re.split(r"\n\s*\n", seg["text"]):
                parts = _PAUSE.split(block)
                for n in range(0, len(parts), 2):
                    t = parts[n].strip()
                    pause = float(parts[n + 1]) if n + 1 < len(parts) else None
                    if t:
                        pieces.append([t, pause if pause is not None else para])
                    elif pause is not None and pieces:
                        pieces[-1][1] = max(pieces[-1][1], pause)
    pieces = [p for p in pieces if p[0]]
    if not pieces:
        return None
    kind = re.sub(r"[^a-z0-9-]+", "-", str(o.get("kind") or f.parent.name).lower()).strip("-")
    ident = re.sub(r"[^a-z0-9-]+", "-", str(o.get("id") or f.stem).lower()).strip("-")
    h = hashlib.sha256(json.dumps(pieces, ensure_ascii=False).encode()).hexdigest()[:8]
    # A night may carry its own writing target (the grief nights, the 5-8 min "3 AM, back to sleep") and level (hush).
    own = o.get("target_seconds")
    target = int(own) if isinstance(own, (int, float)) and own > 0 else TARGET_SECONDS.get(kind)
    level = o.get("level") if o.get("level") in LEVEL_TARGET else "sleep"
    return {"file": f"{lang}/{kind}/{ident}-{h}.m4a", "kind": kind, "lang": lang,
            "ref": f"{f.relative_to(root)}#{o.get('id') or f.stem}", "priority": 3, "level": level,
            "heading": o.get("title") if isinstance(o.get("title"), str) else "",
            "verses": [p[0] for p in pieces], "gaps": [p[1] for p in pieces], "text": "script",
            **({"min_seconds": round(target * 0.75), "target_seconds": target} if target else {})}


_CALL_PAUSE = re.compile(r"\[PAUSE (\d+(?:\.\d+)?)s[^\]]*\]")
VERSE_GAP = 0.6   # between the verses of one scripture block: the story keeps moving


def story_item(o: dict, f: Path, root: Path, lang: str) -> dict | None:
    """A story (content/stories/<telling>/*.json, `blocks`): the title, then each retelling paragraph,
    each verse of a scripture block word for word (every speaker in the one narrator voice; the reference
    is on screen, not read, as in Hush Harbor), and the call and response with its scripted quiet
    (`[PAUSE 3s | screen: ...]`) as real silence. The pauses are marked so the row records where they
    start (checks.pause_starts_s: the app shows the response on screen then). None when there is nothing to say."""
    pieces: list[list] = []          # [text, gap after, call-and-response pause?]
    gap = GAP["content"]
    for b in o["blocks"]:
        if b.get("type") == "scripture":
            vs = [str(v.get("text", "")).strip() for v in b.get("verses") or []]
            pieces += [[v, VERSE_GAP, False] for v in vs if v]
            if pieces:
                pieces[-1][1] = gap
        elif b.get("type") == "call_response" and isinstance(b.get("text"), str):
            parts = _CALL_PAUSE.split(b["text"])
            for n in range(0, len(parts), 2):
                t = re.sub(r"\s+", " ", parts[n]).strip()
                pause = float(parts[n + 1]) if n + 1 < len(parts) else None
                if t:
                    pieces.append([t, pause if pause is not None else gap, pause is not None])
                elif pause is not None and pieces:
                    pieces[-1][1], pieces[-1][2] = max(pieces[-1][1], pause), True
        elif isinstance(b.get("text"), str) and b["text"].strip():
            pieces.append([re.sub(r"\s+", " ", b["text"]).strip(), gap, False])
    if not pieces:
        return None
    telling = re.sub(r"[^a-z0-9-]+", "-", str(o.get("telling") or f.parent.name).lower()).strip("-")
    ident = re.sub(r"[^a-z0-9-]+", "-", str(o.get("id") or f.stem).lower()).strip("-")
    title = o.get("title") if isinstance(o.get("title"), str) else ""
    h = hashlib.sha256(json.dumps([title, pieces], ensure_ascii=False).encode()).hexdigest()[:8]
    return {"file": f"{lang}/{STORY_KIND}/{telling}/{ident}-{h}.m4a", "kind": STORY_KIND, "lang": lang,
            "ref": str(f.relative_to(root)), "priority": 3, "level": "sleep", "heading": title,
            "verses": [p[0] for p in pieces], "gaps": [p[1] for p in pieces],
            "marks": [i for i, p in enumerate(pieces) if p[2]], "text": "script"}


def script_of(item: dict) -> str:
    """What the transcript is scored against: the stored words, heading first."""
    return " ".join([item["heading"], *item["verses"]]).strip()


def segments_of(item: dict, pron: dict) -> list[dict]:
    """What Kokoro says, in order, each with the quiet after it; a call-and-response pause is `mark`ed."""
    gap = item.get("gap", GAP.get(item["kind"], 1.2))
    segs = [{"text": T.speech_text(item["heading"], item["lang"], pron), "gap": HEADING_GAP}] if item["heading"] else []
    gaps = item.get("gaps") or [gap] * len(item["verses"])
    marks = set(item.get("marks") or [])
    segs += [{"text": T.speech_text(v, item["lang"], pron), "gap": g, **({"mark": True} if n in marks else {})}
             for n, (v, g) in enumerate(zip(item["verses"], gaps))]
    return [s for s in segs if s["text"]]


def pause_starts(segs: list[dict], ends: list) -> list[float]:
    """Seconds into the file where each marked pause starts (the renderer's per-segment speech ends). Pure."""
    if len(ends or []) != len(segs):
        return []
    return [round(float(e), 3) for s, e in zip(segs, ends) if s.get("mark")]


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


class manifest_lock:
    """Two lanes run at once (owner, 21 Nov 2026: "2 lanes is a must"), so every read-modify-write of
    the manifest, and every commit of it, holds this one lock."""
    def __enter__(self):
        HOME.mkdir(parents=True, exist_ok=True)
        self.f = (HOME / "manifest.lock").open("w")
        fcntl.flock(self.f, fcntl.LOCK_EX)
        return self

    def __exit__(self, *exc):
        fcntl.flock(self.f, fcntl.LOCK_UN)
        self.f.close()


def upsert_row(row: dict, path: Path = MANIFEST) -> dict:
    """One row per file: a retried file replaces its FAILED row, carrying the run count on. The row is
    also kept in HOME/unpushed-rows.jsonl until a push carries it to main (git_commit), so a push that
    loses a race never loses a row; the cloud lane hands that file to its gather job."""
    with manifest_lock():
        row = _upsert_row(row, path)
        if path == MANIFEST:
            with unpushed_path().open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
        return row


def unpushed_path() -> Path:
    return HOME / "unpushed-rows.jsonl"


def parse_rows(text: str) -> list[dict]:
    return [json.loads(line) for line in text.splitlines() if line.strip() and line.lstrip().startswith("{")]


def local_rows_ahead(local: list[dict], origin: list[dict]) -> list[dict]:
    """Rows this checkout holds that main does not: a file main lacks, or a newer row (`at`) for one it
    has. Rows a run wrote before unpushed-rows.jsonl existed (a commit whose push failed, a rebase left
    half done) are kept this way. Pure."""
    o = latest(origin)
    return [r for r in latest(local).values()
            if r["file"] not in o or (r != o[r["file"]] and str(r.get("at", "")) > str(o[r["file"]].get("at", "")))]


def put_rows(new: list[dict], path: Path) -> None:
    """Lay finished rows over the manifest as they are (one row per file; tries already counted)."""
    rows = read_manifest(path)
    files = {r["file"] for r in new}
    rows = [r for r in rows if r["file"] not in files] + list(latest(new).values())
    tmp = path.with_suffix(".tmp")
    tmp.write_text("".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows), "utf-8")
    tmp.replace(path)


def lanes() -> dict:
    return json.loads((AUDIO / "lanes.json").read_text("utf-8"))


def lane_of(item: dict, cfg: dict | None = None) -> str:
    """"mac" for the kinds the Mac keeps, "cloud" for the rest. Pure given cfg."""
    return "mac" if item["kind"] in (cfg or lanes())["mac_kinds"] else "cloud"


def shard(seq: list, spec: str | None) -> list:
    """"i/n": every n-th item from i, so n parallel jobs share one queue and never meet. Pure."""
    if not spec:
        return list(seq)
    i, n = (int(x) for x in spec.split("/"))
    if not 0 <= i < n:
        raise ValueError(f"bad shard {spec}")
    return [x for k, x in enumerate(seq) if k % n == i]


def _upsert_row(row: dict, path: Path) -> dict:
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


def words_key(item: dict) -> str:
    """What is said, without the quiet: a script change that only adds quiet keeps it, a word change does not."""
    return hashlib.sha256(json.dumps([item.get("heading", ""), item.get("verses", [])], ensure_ascii=False).encode()).hexdigest()[:12]


def _voiced_words() -> dict:
    return json.loads(VOICED_WORDS.read_text("utf-8")) if VOICED_WORDS.exists() else {}


def todo(items: list, rows: list[dict], only: str | None = None, key=_file) -> list:
    """What this run voices: FAILED files with tries left first (never a permanent hole), then files
    not yet in the manifest, each in plan order. Passed files and files out of tries are skipped. Pure."""
    last = latest(rows)
    # Her call 21 Nov 2026: published audio is never re-voiced only to add quiet (no length is promised to anyone);
    # a script whose words match a passed file of the same script is done. A word change is voiced again.
    legacy = _voiced_words()
    said = {(r.get("ref"), r.get("words") or legacy.get(f)) for f, r in last.items() if r.get("status") == "passed"}
    mine = [i for i in items if (not only or key(i).startswith(only)) and
            (key(i) in last or (i.get("ref"), words_key(i)) not in said)]
    # Four parts, each retry-first inside itself: the sessions never voiced, the published sessions voiced again
    # for a word change, then the stories, then the rest. A failed story is retried after the unvoiced sessions
    # (review 21 Nov 2026), a failed chapter after the stories.
    cut1 = max((n + 1 for n, i in enumerate(mine) if i.get("kind") in SESSION_KINDS), default=0)
    cut2 = max([cut1] + [n + 1 for n, i in enumerate(mine) if i.get("kind") == STORY_KIND])

    def part(xs):
        retry = [i for i in xs if last.get(key(i), {}).get("status") == "FAILED" and tries(last[key(i)]) < MAX_TRIES]
        return retry + [i for i in xs if key(i) not in last]
    # The old file of a re-voiced session stays served until the new one passes.
    voiced = {r.get("ref") for r in last.values() if r.get("status") == "passed"}
    again = [i for i in mine[:cut1] if i.get("kind") in SESSION_KINDS and i.get("ref") in voiced]
    first = [i for i in mine[:cut1] if i not in again]
    return part(first) + part(again) + part(mine[cut1:cut2]) + part(mine[cut2:])


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
    # The 60 Psalm Nights only: the grief nights and the "3 AM, back to sleep" night share the folder, not the target.
    c["psalm"] = sum(1 for lang in ("en", "es") for o in passed(base / "psalm-nights" / lang)
                     if o.get("journey") not in ("grief", "back-to-sleep"))
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


def whole_fill_done(items: list[dict], rows: list[dict], stories: list[dict] | None = None) -> bool:
    """The WHOLE fill (owner: YouTube waits for all of it): every file of every priority and every Hush
    Harbor story passed or out of tries, whichever lane voiced it."""
    import hush_harbor as H
    stories = H.load_stories() if stories is None else stories
    return not todo(items, rows) and not H.todo(stories, rows)


def settle_active(active: Path, items: list[dict], rows: list[dict], now: dt.datetime,
                  stories: list[dict] | None = None) -> bool:
    """End of a run. The fill NEVER removes this file (How We Know reads its removal as the only unpause
    signal; owner: YouTube stays paused until the whole fill is done AND she approves the overhaul). When
    the whole fill is done the record is marked "complete": <date> and kept (True when it was just
    marked); the cloud plan job posts the Open Loops row. Otherwise it is refreshed."""
    if whole_fill_done(items, rows, stories):
        try:
            body = json.loads(active.read_text())
        except Exception:
            body = {}
        if body.get("complete"):
            return False
        body.update({"complete": now.date().isoformat(), "updated": now.isoformat(timespec="seconds"),
                     "reason": "Peace Be Still library fill is complete. This file stays until the owner approves "
                               "the YouTube channels overhaul; How We Know / Whisper Almanac stay paused until then."})
        active.parent.mkdir(parents=True, exist_ok=True)
        active.write_text(json.dumps(body, indent=1))
        return True
    write_active(active, now, expected_end(items, rows, now))
    return False


# ------------------------------------------------------------------ audio steps
def render(item: dict, pron: dict, wav: Path, speed: float) -> dict:
    """Kokoro renders the item; returns the renderer's line ({"seconds", "segments", "ends"}) plus `segs`."""
    v = VOICE[item["lang"]]
    segs = segments_of(item, pron)
    job = {"voice": v["spec"], "lang": v["lang"], "speed": speed, "lead": 0.6, "tail": 2.0,
           "segments": segs, "out": str(wav)}
    r = subprocess.run([KOKORO_PY, str(AUDIO / "render_kokoro.py")], input=json.dumps(job),
                       capture_output=True, text=True, timeout=4 * 3600)
    if r.returncode != 0 or not wav.exists():
        raise RuntimeError(f"render failed: {r.stderr.strip()[-300:]}")
    try:
        out = json.loads(r.stdout.strip().splitlines()[-1])
    except (json.JSONDecodeError, IndexError):
        out = {}
    return {**out, "segs": segs}


# Mastering (rebuilt 23 Nov 2026): the WAV's loudness is measured (ebur128), ONE linear gain takes it to the
# level's target, and a true-peak limiter (ffmpeg alimiter run at LIMIT_OVERSAMPLE x the rate, so the peaks
# between samples are seen) holds the peaks under the ceiling; then AAC. The gain alone sets the loudness, so
# limiting harder never moves it. Why not two-pass loudnorm (19-22 Nov): when the gain a quiet render needs
# would lift its peaks over loudnorm's TP, loudnorm leaves linear mode for its dynamic one, and each lowered
# TP pulled the loudness down with it (Luke 8: -21.1 LUFS after three masters, its target -17). And ffmpeg's
# own AAC (the cloud runner) fills quiet bands with noise (perceptual noise substitution), which put peaks
# 3-5 dB over a limited signal (Matthew 2: +3.9 dBTP); PNS is off for that encoder. The ENCODED file is
# what is judged; a peak that still misses is limited again lower, from the same WAV (never a new render).
LIMIT_OVERSAMPLE = 4
LIMIT_MARGIN = 1.5       # the first limiter ceiling sits this far under the level's ceiling (the encoder's overshoot)
LIMIT_DEPTH = 6.0        # never limit more than this under the ceiling: deeper flattens the voice; qa.check judges it
MASTER_TRIES = 3
RATE_OUT = 24000


def master_filter(gain_db: float, limit_db: float) -> str:
    """Gain, then the oversampled true-peak limiter (no auto level: the gain is the loudness). Pure."""
    return (f"volume={gain_db:.2f}dB,aresample={RATE_OUT * LIMIT_OVERSAMPLE},"
            f"alimiter=limit={10 ** (limit_db / 20):.4f}:attack=1:release=50:level=false,aresample={RATE_OUT}")


def aac_encoder() -> str:
    """Apple's AAC (aac_at) on the Mac, as the library was locked; ffmpeg's own AAC on a Linux runner
    (the cloud lane), which has no AudioToolbox. Either way the ENCODED file is what qa.check judges."""
    return os.environ.get("PBS_AAC") or ("aac_at" if sys.platform == "darwin" else "aac")


def aac_args(encoder: str) -> list[str]:
    """AAC-LC mono 48 kbps; ffmpeg's own encoder without noise substitution (see the note above). Pure."""
    return ["-c:a", encoder, "-b:a", "48k", *(["-aac_pns", "0"] if encoder == "aac" else [])]


def master(wav: Path, out: Path, level: str, *, run=None, measure=None, encoder: str | None = None) -> dict:
    """WAV -> mastered AAC-LC mono 48 kbps .m4a inside the level's bars (qa.BARS), judged on the ENCODED
    file by qa.loudness. A peak over the ceiling is limited again lower by the overshoot (+0.3 dB, at most
    LIMIT_DEPTH under the ceiling); a loudness miss moves the gain by the error; at most MASTER_TRIES, all
    from the same WAV. Returns the last measurement, the gain and the limit; qa.check is the final judge."""
    import qa
    run = run or subprocess.run
    measure = measure or qa.loudness
    encoder = encoder or aac_encoder()
    target, ceiling = LEVEL_TARGET[level]
    lo, hi = qa.BARS[level]["lufs"]
    src = measure(wav)
    if not math.isfinite(src["lufs"]):
        raise RuntimeError(f"the render is silent ({src['lufs']} LUFS): nothing to master")
    gain, limit = round(target - src["lufs"], 2), ceiling - LIMIT_MARGIN
    for n in range(1, MASTER_TRIES + 1):
        run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af", master_filter(gain, limit),
             "-ac", "1", "-ar", str(RATE_OUT), *aac_args(encoder), "-movflags", "+faststart", str(out)],
            check=True, timeout=1800)
        got = measure(out)
        peak_ok, loud_ok = got["true_peak"] <= ceiling, lo <= got["lufs"] <= hi
        if peak_ok and loud_ok:
            break
        if not peak_ok:
            if limit <= ceiling - LIMIT_DEPTH:
                break
            limit = round(max(ceiling - LIMIT_DEPTH, limit - (got["true_peak"] - ceiling) - 0.3), 1)
        if not loud_ok:
            gain = round(gain + (target - got["lufs"]), 2)
    return {**got, "tries": n, "gain": gain, "limit": limit}


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


# ------------------------------------------------------------------ held audio (never thrown away)
# Owner, 21 Nov 2026: "how are we going to not throw away good audio like the 63". A file that fails is
# never deleted: it moves to ~/.peace-be-still/held-audio/<lane>/<file> with <file>.reason.json (the
# problems, the values, the margins, the date, the words key). Before voicing a file again, the lane
# re-checks the held copy under today's rules; if it passes it ships without a new render. The held copy
# is removed once that file is shelved (passed, or re-voiced and passed), so the folder stays small.
def held_dir() -> Path:
    return HOME / "held-audio"


def hold(path: Path, lane: str, rel: str, words: str, result: dict) -> Path | None:
    """Move a failed file into held-audio with its reason. Returns the held path (None: nothing to hold)."""
    import qa
    if not path.exists():
        return None
    dest = held_dir() / lane / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), dest)
    reason = {"at": dt.datetime.now(CT).isoformat(timespec="seconds"), "words": words,
              "problems": result.get("problems"), "notes": result.get("notes"),
              "values": {k: result.get(k) for k in ("accuracy", "lufs", "true_peak", "clipped", "wpm", "seconds")},
              "margins": {"lu": qa.LU_MARGIN, "tp_db": qa.TP_MARGIN, "clipped_max": qa.CLIP_MAX,
                          "accuracy_margin": qa.ACC_MARGIN, "wpm_hard": qa.WPM_HARD}}
    why = dest.with_name(dest.name + ".reason.json")
    why.write_text(json.dumps(reason, ensure_ascii=False, indent=1), "utf-8")
    if HELD_REMOTE:   # the cloud runner is wiped at the end of the job: the held copy lives on Drive
        for f in (dest, why):
            if rclone("copyto", str(f), f"{HELD_REMOTE}/{lane}/{f.relative_to(held_dir() / lane)}", timeout=900).returncode != 0:
                print(f"note: could not hold {f.name} on Drive; it stays on this runner only", flush=True)
    return dest


def held_copy(lane: str, rel: str, words: str) -> Path | None:
    """The held file for rel, when its words still match what is to be said now."""
    dest = held_dir() / lane / rel
    why = dest.with_name(dest.name + ".reason.json")
    if HELD_REMOTE and not why.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        if rclone("copyto", f"{HELD_REMOTE}/{lane}/{rel}.reason.json", str(why), timeout=120).returncode == 0:
            rclone("copyto", f"{HELD_REMOTE}/{lane}/{rel}", str(dest), timeout=900)
    if not dest.exists() or not why.exists():
        return None
    try:
        return dest if json.loads(why.read_text("utf-8")).get("words") == words else None
    except json.JSONDecodeError:
        return None


def release(lane: str, rel: str) -> None:
    """The file is shelved: its held copy and reason go (the owner's frequent clean-up)."""
    dest = held_dir() / lane / rel
    dest.unlink(missing_ok=True)
    dest.with_name(dest.name + ".reason.json").unlink(missing_ok=True)
    if HELD_REMOTE:
        for f in (rel, rel + ".reason.json"):
            rclone("deletefile", f"{HELD_REMOTE}/{lane}/{f}", timeout=120)


def is_scripture_file(item: dict) -> bool:
    """A Bible chapter or a psalm: every word is a verse, so word accuracy keeps the strict bar."""
    return item["kind"] in ("bible", "psalms")


def expected_seconds(kind: str, rows: list[dict]) -> float:
    """How long a file of this kind takes to make on this Mac: the longest of the last 20 passed rows
    (measured, not guessed); 900 s before any row exists. Pure."""
    took = [r.get("work_s") or 0 for r in rows if r.get("kind") == kind and r.get("status") == "passed"][-20:]
    return max(took) if took else 900.0


def time_for(item: dict, rows: list[dict], now: dt.datetime) -> bool:
    """True when the file can finish before 06:55 CT (window_minutes runs to 06:45; 10 more minutes of
    grace for the file in hand). A run started at 06:44 never begins a 40-minute chapter. Pure."""
    return expected_seconds(item["kind"], rows) / 60 <= window_minutes(now) + 10


def make_one(item: dict, pron: dict, work: Path) -> dict:
    """Render, master and check one file. Mastering misses are mastered again from the kept WAV
    (master()); only a speech problem (qa.speech_problems: A01, A07, length) is rendered again, once,
    a touch slower. Returns the row (without shelving): passed with the local path, or FAILED."""
    import qa
    t0 = time.monotonic()
    wav, out = work / "track.wav", work / Path(item["file"]).name
    result, attempts = None, 0
    rendered, mastered = {}, {"tries": 0, "gain": None, "limit": None}
    script = script_of(item)
    # A held copy of this file is re-checked under today's rules first: if it passes, no new render.
    # (Not for files with call-and-response marks: their pause timings come from the render itself.)
    held = None if item.get("marks") else held_copy("fill", item["file"], words_key(item))
    if held:
        again = qa.check(held, script, item["lang"], item["level"], quiet=sum(item.get("gaps") or []), strict_words=is_scripture_file(item))
        if again["pass"] and not (item.get("min_seconds") and again["seconds"] < item["min_seconds"]):
            shutil.copy2(held, out)
            result = {**again, "notes": [*(again.get("notes") or []), "rescued from held-audio by a re-check (no new render)"]}
            print(f"  RESCUED {item['file']} from held-audio (no new render)", flush=True)
    try:
        for speed in (() if result else (SPEED, RETRY_SPEED)):
            attempts += 1
            rendered = render(item, pron, wav, speed)
            mastered = master(wav, out, item["level"])
            result = qa.check(out, script, item["lang"], item["level"], quiet=sum(item.get("gaps") or []), strict_words=is_scripture_file(item))
            if item.get("min_seconds") and result["seconds"] < item["min_seconds"]:
                result = {**result, "pass": False, "problems": [*result["problems"],
                          f"length {result['seconds']:.0f}s voiced is under the {item['min_seconds']}s floor"]}
            if result["pass"] or not qa.speech_problems(result["problems"]):
                break
    finally:
        wav.unlink(missing_ok=True)
    checks = {k: result[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    checks["problems"] = result["problems"]
    notes = list(result.get("notes") or [])
    if result["pass"] and item.get("target_seconds") and result["seconds"] < item["target_seconds"]:
        notes.append(f"SHORT {result['seconds']:.0f}s voiced is under the {item['target_seconds']}s target")
    if notes:
        checks["notes"] = notes
        if result["pass"]:
            print(f"  NOTE {item['file']} shipped inside the margin: {'; '.join(notes)}")
    checks["mastering"] = {k: mastered[k] for k in ("tries", "gain", "limit")}
    if item.get("marks"):
        # Where the call-and-response quiet starts, as Hush Harbor rows carry it (the app shows the response then).
        checks["pause_starts_s"] = pause_starts(rendered.get("segs") or [], rendered.get("ends"))
        checks["pauses_s"] = [s["gap"] for s in rendered.get("segs") or [] if s.get("mark")]
    row = {"file": item["file"], "kind": item["kind"], "lang": item["lang"], "ref": item["ref"],
           "text": item["text"], "words": words_key(item), "voice": VOICE[item["lang"]]["id"], "seconds": result["seconds"],
           "checks": checks, "attempts": attempts, "work_s": round(time.monotonic() - t0, 1),
           "status": "passed" if result["pass"] else "FAILED",
           "at": dt.datetime.now(CT).isoformat(timespec="seconds")}
    if result["pass"]:
        row["sha256"] = sha256(out)
        row["_local"] = str(out)
    else:
        held_at = hold(out, "fill", item["file"], row["words"], result)
        row["sha256"] = None
        row["shelved"] = None
        if held_at:
            row["held"] = str(held_at)
    return row


def crash_row(item: dict, e: BaseException) -> dict:
    """The FAILED row for a file whose making raised (ffmpeg, a render, QA): it uses a try like any
    failure, so a file that always crashes runs out of tries instead of killing every shard. Pure."""
    why = f"CRASH {type(e).__name__}: {' '.join(str(e).split())[-240:]}"
    print(f"  {why} ({item['file']})", flush=True)
    checks = {k: None for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    checks["problems"] = [why]
    return {"file": item["file"], "kind": item["kind"], "lang": item["lang"], "ref": item["ref"],
            "text": item["text"], "words": words_key(item), "voice": VOICE[item["lang"]]["id"], "seconds": 0.0,
            "checks": checks, "attempts": 1, "work_s": 0.0, "status": "FAILED", "sha256": None, "shelved": None,
            "at": dt.datetime.now(CT).isoformat(timespec="seconds")}


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
    with manifest_lock():
        return _git_commit(msg)


def _git_commit(msg: str) -> str:
    """Every row this machine wrote and has not pushed (HOME/unpushed-rows.jsonl) is laid over main's
    newest manifest and pushed, so two writers (the Mac, the cloud's gather job) never conflict: no
    rebase of the manifest, ever. Runs only on main (the runner checkout, the gather job)."""
    def g(*a, timeout=120):
        return subprocess.run(["git", "-C", str(REPO), *a], capture_output=True, text=True, timeout=timeout)
    g("rebase", "--abort")   # a rebase an older version of this left half done
    if g("rev-parse", "--abbrev-ref", "HEAD").stdout.strip() != "main":
        return "manifest rows kept for the next push (this checkout is not on main)"
    rel = str(MANIFEST.relative_to(REPO))
    for _ in range(4):
        if g("fetch", "-q", "origin", "main").returncode != 0:
            continue
        ahead = [f for f in g("diff", "--name-only", "origin/main...HEAD").stdout.split() if f != rel]
        if ahead:   # never reset away anything but manifest rows
            return f"manifest rows kept; this checkout has unpushed commits to {', '.join(ahead[:3])} (pushed by hand)"
        origin = subprocess.run(["git", "-C", str(REPO), "show", f"origin/main:{rel}"], capture_output=True, text=True).stdout
        mine = local_rows_ahead(read_manifest(MANIFEST), parse_rows(origin)) + read_manifest(unpushed_path())
        if not mine:
            return "no new manifest rows"
        g("reset", "-q", "--mixed", "origin/main")
        g("checkout", "origin/main", "--", rel)
        put_rows(mine, MANIFEST)
        g("add", rel)
        if g("diff", "--cached", "--quiet").returncode != 0:
            g("commit", "-q", "-m", msg)
        if g("push", "-q", "origin", "HEAD:main").returncode == 0:
            unpushed_path().unlink(missing_ok=True)
            return "manifest pushed"
    return "manifest rows kept; push failed (the next run pushes them)"


# ------------------------------------------------------------------ the run window
# The Mac's day (her ruling, ~/.claude/CLAUDE.md "The Mac's day"): heavy work 22:00-07:00 CT only, and
# the Mac is OFF 07:00-10:00. New work stops at 06:45 so the file in hand finishes and every lane has
# checkpointed (manifest row written, clone sentences saved) before 06:55. launchd's own start time is
# set elsewhere; this is the window every lane obeys.
WINDOW_START, WINDOW_STOP = dt.time(22, 0), dt.time(6, 45)


def window_minutes(now: dt.datetime) -> int:
    """Minutes the Mac may still spend starting audio work in this batch: from 22:00 CT until 06:45 CT,
    every day; 0 between 06:45 and 22:00. Pure."""
    n = now.astimezone(CT)
    t = n.time()
    if WINDOW_STOP <= t < WINDOW_START:
        return 0
    end = n.replace(hour=WINDOW_STOP.hour, minute=WINDOW_STOP.minute, second=0, microsecond=0)
    if n >= end:
        end += dt.timedelta(days=1)
    return int((end.timestamp() - n.timestamp()) // 60)


# ------------------------------------------------------------------ the run
CLOUD_FILES_PER_JOB = 40   # measured 21 Nov 2026 (Ruth EN, one runner): 4 chapters tried in 31 min = 7.7 an hour x a 300-minute box


# How many cloud jobs one launch may take, by its start time in Central (owner, 22 Nov 2026). GitHub Free
# runs 20 jobs at once across ALL her repos, and the fill's jobs hold a runner for up to 300 minutes, so a
# batch leaves KEEP_FREE runners for everything else. Measured 22 Nov 2026: a boss-os PR gate is 8 jobs
# (run 45036905012), boss-os e2e 6 (run 45032858695), this repo's gate 4. At night 6 stay free: e2e or
# this gate starts at once, a boss-os gate starts 6 jobs at once and its last 2 within minutes as its
# own short jobs end; by day 10 stay free, so any one gate starts at once. A render in another repo
# takes from the same 6, and then a gate starts within minutes, not at once.
# Hours are [start, end) in CT. cloud_batch is the one place a batch is sized (the plan job calls it).
ACCOUNT_JOBS, KEEP_FREE = 20, 6
CLOUD_JOBS = (("night", 22, 7, 14), ("day", 7, 22, 10))


def cloud_batch(now: dt.datetime, bible_jobs: int, story_jobs: int, bible_left: int) -> tuple[str, int, int]:
    """(window, Bible shards, story slots) for a launch starting at `now`. The window's jobs (14 from 22:00
    to 06:59 CT, 10 from 07:00 to 21:59) are shared: Bible gets at most `bible_jobs` and never the
    `story_jobs` kept for stories, and no more shards than `bible_left` files need; stories get the rest.
    At night: 10 Bible + 4 stories; by day 6 + 4. Pure."""
    h = now.astimezone(CT).hour
    window, jobs = next(((name, j) for name, start, end, j in CLOUD_JOBS
                         if ((start <= h < end) if start < end else (h >= start or h < end))), (None, 0))
    n_bible = max(0, min(bible_jobs, jobs - story_jobs, -(-bible_left // CLOUD_FILES_PER_JOB)))
    n_story = jobs - n_bible
    if window is None or n_bible + n_story > ACCOUNT_JOBS - KEEP_FREE:
        raise AssertionError(f"a {h}:00 CT batch of {n_bible + n_story} would leave fewer than {KEEP_FREE} of {ACCOUNT_JOBS} runners free")
    return window, n_bible, n_story


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="at most this many files this run")
    ap.add_argument("--max-minutes", type=float, default=0, help="stop starting new files after this")
    ap.add_argument("--only", help="only files whose path starts with this, e.g. en/psalms")
    ap.add_argument("--commit", action="store_true", help="commit and push the manifest (the runner)")
    ap.add_argument("--dry-run", action="store_true", help="print the plan and the census; voice nothing")
    ap.add_argument("--window-minutes", action="store_true", help="print the run window's minutes left now (run.sh)")
    ap.add_argument("--shard", help="i/n: this job's share of the lane's queue (the cloud matrix)")
    ap.add_argument("--cloud-batch", nargs=2, type=int, metavar=("BIBLE_JOBS", "STORY_JOBS"),
                    help="print this launch's batch as JSON (cloud_batch: window, Bible shards, story slots, census)")
    ap.add_argument("--push-rows", nargs="*", metavar="FILE", help="lay these rows files over main's manifest and push (the gather job)")
    a = ap.parse_args(argv)
    if a.push_rows is not None:
        HOME.mkdir(parents=True, exist_ok=True)
        with unpushed_path().open("a", encoding="utf-8") as f:
            for p in a.push_rows:
                f.write(Path(p).read_text("utf-8"))
        n = len(read_manifest(unpushed_path()))
        note = git_commit(f"audio: cloud fill manifest ({n} rows)")
        print(f"OUTPUT {n} cloud rows gathered; {note}")
        return 0 if note in ("manifest pushed", "no new manifest rows") else 3
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
    cfg = lanes()
    queue = shard([i for i in todo(items, rows, a.only) if lane_of(i, cfg) == LANE], a.shard)
    if a.cloud_batch is not None:
        left = sum(1 for i in todo(items, rows) if lane_of(i, cfg) == "cloud")
        window, n, stories = cloud_batch(dt.datetime.now(CT), *a.cloud_batch, left)
        print(json.dumps({"window": window, "bible": [f"{k}/{n}" for k in range(n)], "story_slots": stories,
                          "left": left, "complete": whole_fill_done(items, rows)}))
        return 0
    active = HOME / "library-fill.active"
    c0 = census(items, rows)
    if a.dry_run:
        print(f"plan: {len(items)} files ({c0['total']} scripture), {len(queue)} to do; next: "
              + ", ".join(i["file"] for i in queue[:3]))
        print(census_line(c0) + "; " + text_line(now))
        return 0

    if not c0["complete"] and LANE == "mac":
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
            if LANE == "mac" and not time_for(item, rows, dt.datetime.now(CT)):
                print(f"note: {item['file']} needs about {expected_seconds(item['kind'], rows) / 60:.0f} minutes; "
                      "not started so the run checkpoints before 06:55", flush=True)
                break
            mem = memguard.read()
            if memguard.high(mem):      # the Bible lane carries on; the clone lane is the one that pauses
                print(f"  NOTE MEMGUARD_HIGH bible: {memguard.line(mem)}; the clone lane pauses, this lane goes on", flush=True)
            if dir_bytes(work) > MAC_BUDGET_BYTES:
                raise NamedStop("MAC_BUDGET", f"the work folder {work} holds over 5 GB; nothing more is voiced until it is cleared")
            try:
                row = make_one(item, pron, work)
            except NamedStop:
                raise
            except Exception as e:      # one chapter's crash holds that chapter (a FAILED row, a try used); the shard goes on
                row = crash_row(item, e)
                (work / Path(item["file"]).name).unlink(missing_ok=True)
            if row["status"] == "passed":
                local = Path(row.pop("_local"))
                row["shelved"] = shelve(local, item["file"])
                local.unlink()
                release("fill", item["file"])
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
    if LANE == "mac" and settle_active(active, items, rows, now):
        notes.append(morning_line(f"Peace Be Still: the whole Bible is voiced and on Drive — {census_line(c)}. "
                                  "YouTube restarts once you approve the channels overhaul.", "complete", now))
    if a.commit and (made or failed_now):
        notes.append(git_commit(f"audio: library fill manifest ({census_line(c)})"))
    line = census_line(c) + "; " + text_line(now)
    if LANE == "mac" and now.hour >= 5 and not stop:
        notes.append(morning_line(f"Peace Be Still {line}.", "daily", now))
    if stop:
        print(str(stop), file=sys.stderr)
        if LANE == "mac":
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
