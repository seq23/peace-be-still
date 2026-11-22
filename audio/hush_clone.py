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
  voice      speaker similarity to her picked clip (Resemblyzer d-vector cosine) at or above the role's
             floor in voices.json clone.floor (the clone test's new-line score minus 0.05, never below
             the closest other voice + 0.03), measured on at least MIN_SIM_S of speech (a role's short
             turns pooled, sim_groups), the length the floor was set on; a miss re-renders those turns
  file       join (pauses exactly 3.0 s, by code), tempo, fill.master at -22 LUFS, qa.check (the fill's
             checks), then the Drive shelf and a manifest row, as the Gemini lane does.
Its own time box per run (`--max-minutes 45` from run.sh), at nice 15 under the library fill's lock,
so the Mac alternates: a Bible chunk, then clone stories; a story the box cuts off carries on next run
from its saved sentences. OUTPUT line every run.
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
import qa  # noqa: E402
import memguard  # noqa: E402
import text as T  # noqa: E402

CLONE = H.VOICES["clone"]
BATCH = 20          # sentences per Chatterbox call: the memory guard is read between calls
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


def sentence_verdict(text: str, transcript: str, scripture: bool = False) -> str:
    """"ok", "near" (ships with a logged note) or "bad" (re-rendered). The owner's margin rule
    (~/.claude/CLAUDE.md, 21 Nov 2026): the bar is a target and only output well outside it is broken.
    A sentence from a Bible verse keeps the strict bar: a verse read wrong is always a fail. Pure."""
    from difflib import SequenceMatcher
    acc = H.call_accuracy(text, transcript)
    if acc >= H.CALL_BAR:
        return "ok"
    ref, hyp = T.score_words(text, "en"), T.score_words(transcript, "en")
    hit = sum(b.size for b in SequenceMatcher(None, ref, hyp, autojunk=False).get_matching_blocks())
    off = (len(ref) - hit) + (len(hyp) - hit)
    if 0 < len(ref) <= 12 and off <= 1:
        return "ok"
    if scripture:
        return "bad"
    wrong = max(len(ref), len(hyp)) - hit      # words heard wrong, a substitution counted once
    near = acc >= qa.hard_accuracy(H.CALL_BAR) or (0 < len(ref) <= 12 and wrong <= 2)
    return "near" if near else "bad"


def sentence_ok(text: str, transcript: str, scripture: bool = False) -> bool:
    return sentence_verdict(text, transcript, scripture) != "bad"


def scripture_words(story: dict) -> dict:
    """The story's quoted scripture, to tell a verse sentence from a retelling one (turns merge
    neighbouring blocks, so the block type is gone by then): the verse words as one string, and every
    run of three verse words. Pure."""
    segs = [T.score_words(sg["text"], "en") for b in story["blocks"] if b["type"] == "scripture" for sg in b["segments"]]
    words = " " + " | ".join(" ".join(w) for w in segs) + " "
    grams = {tuple(w[i:i + 3]) for w in segs for i in range(len(w) - 2)}
    return {"words": words, "grams": grams}


def is_scripture(sentence: str, verses: dict) -> bool:
    """A sentence is scripture when all its words stand together in a quoted verse (a short line such as
    "Stand still.") or it shares any three-word run with one (a verse that ends mid-sentence). Erring
    toward scripture only makes the check stricter. Pure."""
    w = T.score_words(sentence, "en")
    if not w:
        return False
    if f" {' '.join(w)} " in verses["words"]:
        return True
    return any(tuple(w[i:i + 3]) in verses["grams"] for i in range(len(w) - 2))


def similarity_floor(role: str) -> float:
    """The hard floor for a role's voice match: the measured floor less 25% of the distance to a
    perfect match (0.888 -> 0.860). Between the two, the turn ships with a note."""
    f = CLONE["floor"][role]
    return round(f - 0.25 * (1 - f), 3)


def turn_ok(role: str, similarity: float) -> bool:
    return similarity >= similarity_floor(role)


def lane_order(stories: list[dict], rows: list[dict] = ()) -> list[dict]:
    """Stories to try again (a FAILED row) first, then the highest story number first, so the Gemini
    lane (lowest first) and this lane never meet."""
    last = fill.latest(rows)
    retry = [s for s in stories if H.row_file(s) in last]
    return retry + sorted((s for s in stories if H.row_file(s) not in last), key=lambda s: s["id"], reverse=True)


# ------------------------------------------------------------------ lanes and the cloud's work folders
# A cloud runner is wiped when its job ends, so a story's rendered sentences live on Drive between jobs
# (PBS_WORK_REMOTE, private; never a workflow artifact): pulled before the story, pushed after, removed
# once it is shelved.
WORK_REMOTE = os.environ.get("PBS_WORK_REMOTE", "")


def lane_of(story: dict, cfg: dict | None = None) -> str:
    return "mac" if story["id"] in (cfg or fill.lanes())["mac_stories"] else "cloud"


def pull_work(sid: str, work: Path) -> None:
    if WORK_REMOTE:
        work.mkdir(parents=True, exist_ok=True)
        fill.rclone("copy", f"{WORK_REMOTE}/{sid}", str(work), timeout=1800)


def push_work(sid: str, work: Path) -> None:
    if WORK_REMOTE and work.exists():
        if fill.rclone("copy", str(work), f"{WORK_REMOTE}/{sid}", timeout=1800).returncode != 0:
            print(f"note: could not save {sid}'s rendered sentences to Drive; the next job renders them again", flush=True)


def drop_work(sid: str) -> None:
    if WORK_REMOTE:
        fill.rclone("purge", f"{WORK_REMOTE}/{sid}", timeout=600)


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


def render(items: list[dict], deadline: float | None = None) -> bool:
    """Render every item not on disk yet; False when the deadline stopped it first (the rest next run)."""
    if not items:
        return True
    r = subprocess.run([CB_PY, str(AUDIO / "render_chatterbox.py")], input=json.dumps({"items": items, "deadline": deadline}),
                       capture_output=True, text=True, timeout=6 * 3600)
    if r.returncode != 0:
        raise RuntimeError(f"chatterbox failed: {r.stderr.strip()[-300:]}")
    return all(Path(i["out"]).exists() for i in items)


_ENC = []
MIN_SIM_S = 6.0   # speech a d-vector needs: the clone test's own passing grandmother clip (0.938 whole)
                  # scores 0.78-0.85 on 2 s slices and 0.911+ on 6 s slices (measured 20 Nov 2026)


def sim_groups(turns: list[tuple[int, str, float]]) -> tuple[list[list[int]], dict]:
    """Which turns are judged together for speaker similarity, from (turn, role, speech seconds) in
    story order. A turn with MIN_SIM_S of speech is judged alone; a role's shorter turns are pooled
    in order until they reach it; a short remainder joins that role's last group. A role whose speech
    never reaches MIN_SIM_S is returned as unmeasured {role: seconds}. Pure."""
    groups, open_, by_role = [], {}, {}
    for ti, role, secs in turns:
        if secs >= MIN_SIM_S:
            groups.append([ti])
            by_role[role] = groups[-1]
            continue
        g = open_.setdefault(role, [[], 0.0])
        g[0].append(ti)
        g[1] += secs
        if g[1] >= MIN_SIM_S:
            groups.append(g[0])
            by_role[role] = groups[-1]
            del open_[role]
    unmeasured = {}
    for role, (tis, secs) in open_.items():
        if role in by_role:
            by_role[role].extend(tis)
        else:
            unmeasured[role] = round(secs, 1)
    return [sorted(g) for g in groups], unmeasured


def speech_seconds(x16) -> float:
    from resemblyzer import preprocess_wav
    return len(preprocess_wav(x16, source_sr=16000)) / 16000


def similarity(wav_a: Path, x_b) -> float:
    import numpy as np
    import qa
    from resemblyzer import VoiceEncoder, preprocess_wav
    if not _ENC:
        _ENC.append(VoiceEncoder("cpu"))
    a = _ENC[0].embed_utterance(preprocess_wav(qa.decode(wav_a, 16000), source_sr=16000))
    b = _ENC[0].embed_utterance(preprocess_wav(x_b, source_sr=16000))
    return round(float(np.dot(a, b)), 3)


def make_story(story: dict, work: Path, deadline: float | None = None) -> dict | None:
    """The story's manifest row, or None when the time box (`deadline`, epoch seconds) ran out first:
    every rendered sentence and check stays in `work` and the next run carries on."""
    import numpy as np
    import qa
    t0 = time.monotonic()
    row = {"file": H.row_file(story), "kind": "stories", "lang": "en",
           "ref": f"content/stories/hush-harbor/{story['id']}.json", "text": "script", "voice": VOICE_ID,
           "engine": "clone", "models": ["chatterbox"], "voices": {r: Path(n).stem for r, n in CLONE["ref"].items()},
           "attempts": 1, "at": dt.datetime.now(fill.CT).isoformat(timespec="seconds")}
    key = story_key(story)
    # A held copy (a story that failed its file checks before) is re-checked under today's rules first.
    held = fill.held_copy("clone", H.row_file(story), key)
    if held:
        res = qa.check(held, H.spoken(story), "en", "sleep")
        if res["pass"]:
            work.mkdir(parents=True, exist_ok=True)
            out = work / H.file_of(story)
            shutil.copy2(held, out)
            print(f"  RESCUED {H.row_file(story)} from held-audio (no new render)", flush=True)
            checks = {k: res[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
            checks.update(problems=[], notes=[*(res.get("notes") or []), "rescued from held-audio by a re-check (no new render)"])
            return {**row, "seconds": res["seconds"], "checks": checks, "work_s": round(time.monotonic() - t0, 1),
                    "status": "passed", "sha256": fill.sha256(out), "_local": str(out)}
    work.mkdir(parents=True, exist_ok=True)
    (work / "engine").write_text("clone")
    ref = refs()
    steps = plan(story)
    problems: list[str] = []
    notes: list[str] = []
    verses = scripture_words(story)
    sims: dict = {}
    unmeasured: dict = {}
    seeds = work / "seeds.json"   # a re-render gets a new seed, across runs too (a story can span runs)
    seed = json.loads(seeds.read_text()) if seeds.exists() else {}
    for attempt in range(MAX_TRIES):
        items = []
        for ti, st in enumerate(steps):
            for si, s in enumerate(st.get("sentences", [])):
                out = work / f"t{ti:03d}-s{si:03d}.wav"
                items.append({"ref": str(ref[st["role"]]), "text": T.speech_text(s, "en", {}), "out": str(out),
                              "seed": 7 + seed.get(out.name, 0)})
        # In batches of BATCH sentences, with the memory guard between (never mid-sentence: every
        # sentence is saved as it is made, so a pause or a stop loses nothing).
        todo = [i for i in items if not Path(i["out"]).exists()]
        for b in range(0, len(todo), BATCH):
            if memguard.wait("clone", deadline=deadline) == "one-lane" or not render(todo[b:b + BATCH], deadline):
                return None
        bad = []

        def again(files):
            # The failed take is kept beside the sentence (its latest one) until the story is shelved.
            for f in files:
                if f.exists():
                    f.replace(f.with_suffix(".failed.wav"))
                f.with_suffix(".ok").unlink(missing_ok=True)
                seed[f.name] = seed.get(f.name, 0) + 1
        turn_files = {ti: [work / f"t{ti:03d}-s{si:03d}.wav" for si in range(len(st["sentences"]))]
                      for ti, st in enumerate(steps) if "sentences" in st}
        for ti, files in turn_files.items():
            for f, s in zip(files, steps[ti]["sentences"]):
                ok = f.with_suffix(".ok")
                if ok.exists():
                    continue
                holy = is_scripture(s, verses)
                verdict = sentence_verdict(s, qa.transcribe(f, "en", "base"), holy)
                if verdict != "ok":
                    second = sentence_verdict(s, qa.transcribe(f, "en", "small"), holy)
                    verdict = "ok" if "ok" in (verdict, second) else "near" if "near" in (verdict, second) else "bad"
                if verdict == "bad":
                    bad.append(f"t{ti}: \"{s[:40]}\" misheard{' (scripture)' if holy else ''}")
                    again([f])
                else:
                    if verdict == "near":
                        notes.append(f"t{ti}: \"{s[:40]}\" heard with a near-miss (inside the margin)")
                    ok.write_text("ok")
        # Speaker similarity on at least MIN_SIM_S of speech (sim_groups): a role's short turns are
        # judged together, never a 2-second line on its own.
        ready = {ti: np.concatenate([qa.decode(f, 16000) for f in files])
                 for ti, files in turn_files.items() if all(f.exists() for f in files)}
        groups, unmeasured = sim_groups([(ti, steps[ti]["role"], speech_seconds(x)) for ti, x in ready.items()])
        for g in groups:
            role = steps[g[0]]["role"]
            cache = work / ("g" + "-".join(f"{t:03d}" for t in g) + ".sim")
            sim = json.loads(cache.read_text()) if cache.exists() else similarity(ref[role], np.concatenate([ready[t] for t in g]))
            if sim < CLONE["floor"][role] and turn_ok(role, sim):
                notes.append(f"t{'+t'.join(map(str, g))} {role} similarity {sim} under {CLONE['floor'][role]}, inside the margin")
            if not turn_ok(role, sim):
                bad.append(f"t{'+t'.join(map(str, g))} {role} similarity {sim} < {similarity_floor(role)}")
                again([f for t in g for f in turn_files[t]])
            else:
                cache.write_text(json.dumps(sim))
                sims.setdefault(role, []).append(sim)
        seeds.write_text(json.dumps(seed))
        problems = bad
        if not bad:
            break
        print(f"  attempt {attempt + 1}: {'; '.join(bad[:4])}", flush=True)
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
    fill.master(wav, out, "sleep")   # mastering misses are mastered again from this WAV (no re-render)
    res = qa.check(out, H.spoken(story), "en", "sleep")
    wav.unlink()
    checks = {k: res[k] for k in ("accuracy", "wpm", "words", "lufs", "true_peak", "clipped", "asr")}
    if notes or res.get("notes"):
        print(f"  NOTE {H.row_file(story)}: {'; '.join([*notes, *(res.get('notes') or [])][:6])}", flush=True)
    checks.update(problems=res["problems"], notes=[*notes, *(res.get("notes") or [])][:20], pauses_s=[p for p in parts if isinstance(p, float)], tempo=factor,
                  similarity={r: min(vs) for r, vs in sims.items()}, similarity_unmeasured_s=unmeasured)
    row.update({"seconds": res["seconds"], "checks": checks, "work_s": round(time.monotonic() - t0, 1),
                "status": "passed" if res["pass"] else "FAILED"})
    if res["pass"]:
        row["sha256"] = fill.sha256(out)
        row["_local"] = str(out)
    else:
        row["sha256"], row["shelved"] = None, None
        held_at = fill.hold(out, "clone", H.row_file(story), key, res)
        if held_at:
            row["held"] = str(held_at)
    return row


def story_key(story: dict) -> str:
    """What the story says: a held copy is only re-used while the words are unchanged."""
    import hashlib
    return hashlib.sha256(H.spoken(story).encode()).hexdigest()[:12]


def free_models() -> None:
    """Between stories: drop the cached speech-recognition and voice models so their memory goes back
    to the Mac (Chatterbox itself runs in its own process per render and exits)."""
    import gc
    qa._MODELS.clear()
    _ENC.clear()
    gc.collect()


def prune_work(stories: list[dict], rows: list[dict]) -> int:
    """Work folders of stories already shelved are left-overs: remove them (the run's clean-up)."""
    done = {s["id"] for s in stories if fill.latest(rows).get(H.row_file(s), {}).get("status") == "passed"}
    n = 0
    for d in (fill.HOME / "hh-work").glob("*"):
        if d.is_dir() and d.name in done:
            shutil.rmtree(d, ignore_errors=True)
            n += 1
    return n


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="at most this many stories this run")
    ap.add_argument("--max-minutes", type=float, default=0, help="the lane's time box (run.sh: 45); a story the box "
                    "cuts off keeps its rendered sentences and carries on next run")
    ap.add_argument("--only", help="story ids starting with this")
    ap.add_argument("--commit", action="store_true")
    ap.add_argument("--keep", help="also copy each shelved file here")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--story", help="this one story id (a cloud job: one story per job)")
    ap.add_argument("--cloud-plan", type=int, metavar="JOBS", help="print at most JOBS cloud story ids as JSON")
    a = ap.parse_args(argv)
    # Its own lock (owner, 21 Nov 2026: the Bible and clone lanes run at the same time).
    fill.HOME.mkdir(parents=True, exist_ok=True)   # a fresh runner has no home yet
    lock = (fill.HOME / os.environ.get("PBS_HH_LOCK", "clone-lane.lock")).open("w")
    if not a.dry_run and a.cloud_plan is None:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("OUTPUT 0 Hush Harbor clone stories shelved (note: another render holds the Mac; the next run tries again)")
            return 0
    stories = H.load_stories()
    rows = fill.read_manifest()
    # The clone lane is the one Hush Harbor lane (owner, 21 Nov 2026: "we cloned the voices for hush
    # harbor ... so are not subj to quota"): a story the retired Gemini lane had started is voiced here too.
    queue = [s for s in lane_order(H.todo(stories, rows, a.only), rows) if lane_of(s) == fill.LANE]
    if a.story:
        queue = [s for s in queue if s["id"] == a.story]
    if a.cloud_plan is not None:
        print(json.dumps([s["id"] for s in queue[:a.cloud_plan]] if fill.LANE == "cloud" else []))
        return 0
    if not a.dry_run and (pruned := prune_work(stories, rows)):
        print(f"note: removed {pruned} work folders of stories already shelved", flush=True)
    if a.dry_run:
        print(f"clone lane: {len(queue)} stories to do; next: {', '.join(s['id'] for s in queue[:3])}")
        print(H.census_line(H.census(stories, rows)))
        return 0
    made = failed = 0
    stop = None
    try:
        if queue:
            fill.drive_reachable(H.SHELF)
        deadline = time.time() + a.max_minutes * 60 if a.max_minutes else None
        for s in queue:
            if (a.limit and made + failed >= a.limit) or (deadline and time.time() >= deadline):
                break
            # The heavier lane: it waits while memory is tight (never midway through a story) and stops
            # for the run when it stays tight, so the Bible lane carries the night alone.
            if memguard.wait("clone", deadline=deadline) == "one-lane":
                break
            work = fill.HOME / "hh-work" / s["id"]
            pull_work(s["id"], work)
            try:
                row = make_story(s, work, deadline)
            finally:
                push_work(s["id"], work)
            if row is None:
                print(f"note: the {a.max_minutes:g}-minute time box ended inside {s['id']}; its rendered sentences "
                      "are kept and the next run carries on", flush=True)
                break
            if row["status"] == "passed":
                local = Path(row.pop("_local"))
                if a.keep:
                    Path(a.keep).mkdir(parents=True, exist_ok=True)
                    shutil.copy2(local, Path(a.keep) / local.name)
                row["shelved"] = fill.shelve(local, H.file_of(s), H.SHELF)
                fill.release("clone", H.row_file(s))
                made += 1
            else:
                failed += 1
            row = fill.upsert_row(row)
            if row["status"] == "passed":
                shutil.rmtree(work, ignore_errors=True)   # a failed story keeps its good sentences for the retry
                drop_work(s["id"])
            free_models()
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
