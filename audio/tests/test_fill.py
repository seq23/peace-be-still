"""Behaviour of the library fill that runs without audio: plan order, resume, census, the active
flag, the spoken text and the pass/fail bars. Run: python3 -m unittest discover -s audio/tests"""
import datetime as dt
import json
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AUDIO))
sys.path.insert(0, str(AUDIO / "lib"))
import fill  # noqa: E402
import hush_clone as C  # noqa: E402
import qa  # noqa: E402
import text as T  # noqa: E402

_HOME = tempfile.TemporaryDirectory()


def setUpModule():
    # No test ever writes to the real ~/.peace-be-still (held audio, locks).
    fill.HOME = Path(_HOME.name)
    import memguard
    memguard.MORNING_FLAG = Path(_HOME.name) / "no-morning-window"   # the real flag never steers a test

VPL_EN = """GEN 1:1 In the beginning God created the heaven and the earth.
GEN 2:1 Thus the heavens and the earth were finished.
PSA 1:1 Blessed [is] the man that walketh not in the counsel of the ungodly.
PSA 2:1 Why do the heathen rage? (Selah.)
TOB 1:1 The book of the words of Tobit.
""".splitlines()
VPL_ES = """GEN 1:1 EN el principio crió Dios los cielos y la tierra.
GEN 2:1 Y fueron acabados los cielos y la tierra.
PSA 1:1 BIENAVENTURADO el varón que no anduvo en consejo de malos.
PSA 2:1 ¿POR qué se amotinan las gentes?
""".splitlines()
NOW = dt.datetime(2026, 11, 18, 12, 0, tzinfo=fill.CT)


def bibles():
    return {"en": T.parse_vpl(VPL_EN), "es": T.parse_vpl(VPL_ES)}


class Plan(unittest.TestCase):
    def test_english_psalms_then_listening_order_then_spanish(self):
        files = [i["file"] for i in fill.plan(bibles())]
        self.assertEqual(files, ["en/psalms/kjv-psa-001.m4a", "en/psalms/kjv-psa-002.m4a",
                                 "en/bible/kjv-gen-001.m4a", "en/bible/kjv-gen-002.m4a",
                                 "es/psalms/rv1909-psa-001.m4a", "es/psalms/rv1909-psa-002.m4a",
                                 "es/bible/rv1909-gen-001.m4a", "es/bible/rv1909-gen-002.m4a"])

    def test_listening_order_books_come_before_canon_order(self):
        order = fill.book_order()
        self.assertEqual(order[:6], ["PSA", "MAT", "MAR", "LUK", "JOH", "PRO"])
        self.assertEqual(sorted(order), sorted(T.CODES))
        self.assertLess(order.index("EXO"), order.index("LEV"))
        self.assertLess(order.index("DAN"), order.index("NUM"))
        rest = [c for c in order if c not in fill.FIRST_BOOKS]
        self.assertEqual(rest, [c for c in T.CODES if c in rest])
        vpl = ["MAT 1:1 The book.", "LEV 1:1 And the LORD called.", "PSA 1:1 Blessed.", "GEN 1:1 In the beginning."]
        b = {"en": T.parse_vpl(vpl), "es": T.parse_vpl(vpl)}
        self.assertEqual([i["ref"] for i in fill.plan(b)][:4], ["PSA 1", "MAT 1", "GEN 1", "LEV 1"])

    def test_apocrypha_never_planned(self):
        self.assertNotIn("TOB", bibles()["en"])

    def test_resume_skips_passed_and_retries_failed_first(self):
        """20 Nov 2026: 71 FAILED rows were permanent holes (e.g. kjv-joh-003). A FAILED file is tried
        again before any new file until it has failed MAX_TRIES runs."""
        items = fill.plan(bibles())
        rows = [{"file": items[0]["file"], "status": "passed"}, {"file": items[5]["file"], "status": "FAILED"}]
        q = [i["file"] for i in fill.todo(items, rows)]
        self.assertEqual(q[:2], [items[5]["file"], items[1]["file"]])
        self.assertEqual(len(q), len(items) - 1)
        rows[1]["tries"] = fill.MAX_TRIES
        self.assertNotIn(items[5]["file"], [i["file"] for i in fill.todo(items, rows)])

    def test_a_failed_chapter_never_queues_ahead_of_new_sleep_sessions(self):
        vpl = ["MAT 1:1 The book.", "MAT 2:1 Now when.", "PSA 1:1 Blessed.", "PSA 2:1 Why."]
        b = {"en": T.parse_vpl(vpl), "es": T.parse_vpl(vpl)}
        session = {"file": "en/psalm-night/a.m4a", "kind": "psalm-night", "lang": "en", "priority": 3}
        items = fill.plan(b, [session])
        rows = [{"file": "en/bible/kjv-mat-001.m4a", "status": "FAILED"}, {"file": "en/psalms/kjv-psa-002.m4a", "status": "FAILED"},
                {"file": "en/psalms/kjv-psa-001.m4a", "status": "passed"}]
        q = [i["file"] for i in fill.todo(items, rows)]
        self.assertEqual(q[:4], ["en/psalms/kjv-psa-002.m4a", "en/psalm-night/a.m4a", "en/bible/kjv-mat-001.m4a", "en/bible/kjv-mat-002.m4a"])

    def test_third_failure_is_a_named_stop_in_the_census(self):
        items = fill.plan(bibles())
        with tempfile.TemporaryDirectory() as d:
            m = Path(d) / "m.jsonl"
            for i in items[:-1]:
                fill.upsert_row({"file": i["file"], "status": "passed", "seconds": 360}, m)
            for n in range(1, fill.MAX_TRIES + 1):
                row = fill.upsert_row({"file": items[-1]["file"], "status": "FAILED"}, m)
                self.assertEqual(row["tries"], n)
                rows = fill.read_manifest(m)
                self.assertEqual(len(rows), len(items))            # one row per file, never a duplicate
                c = fill.census(items, rows)
                self.assertEqual((c["passed"], c["failed"]), (7, 1))
                self.assertEqual(c["complete"], n == fill.MAX_TRIES)
                self.assertEqual("NAMED STOP [FAILED_3_TRIES]" in fill.census_line(c), n == fill.MAX_TRIES)
            self.assertIn(items[-1]["file"], fill.census_line(c))
            self.assertEqual(fill.todo(items, rows), [])
            fill.upsert_row({"file": items[0]["file"], "status": "passed", "seconds": 360}, m)
            self.assertEqual(len(fill.read_manifest(m)), len(items))

    def test_census_counts_and_completion(self):
        items = fill.plan(bibles())
        rows = [{"file": i["file"], "status": "passed", "seconds": 360} for i in items[:-1]]
        c = fill.census(items, rows)
        self.assertEqual((c["passed"], c["total"], c["complete"]), (7, 8, False))
        rows.append({"file": items[-1]["file"], "status": "FAILED"})
        c = fill.census(items, rows)
        self.assertFalse(c["complete"])  # a FAILED file with tries left is still to do
        self.assertEqual(fill.census_line(c), "library fill: 7 of 8 files, 0.7 hours shelved, 1 failed")

    def test_empty_plan_is_never_complete(self):
        self.assertFalse(fill.census([], [])["complete"])


class RunWindow(unittest.TestCase):
    def test_nights_only_and_new_work_stops_at_0645(self):
        # The Mac's day (her ruling): heavy work 22:00-07:00 CT, Mac off 07:00-10:00; new work stops at
        # 06:45 so every lane checkpoints before 06:55.
        at = lambda d, h, m=0: dt.datetime(2026, 11, d, h, m, tzinfo=fill.CT)   # 23 Nov 2026 is a Monday
        self.assertEqual(fill.window_minutes(at(23, 12)), 0)            # Mon noon: no run
        self.assertEqual(fill.window_minutes(at(23, 6, 45)), 0)         # 06:45: stop starting work
        self.assertEqual(fill.window_minutes(at(23, 8)), 0)
        self.assertEqual(fill.window_minutes(at(23, 17)), 0)            # the old 17:00 start is gone
        self.assertEqual(fill.window_minutes(at(23, 21, 59)), 0)
        self.assertEqual(fill.window_minutes(at(23, 6, 30)), 15)        # 06:30: 15 minutes left
        self.assertEqual(fill.window_minutes(at(23, 22)), 8 * 60 + 45)  # Mon 22:00 -> Tue 06:45
        self.assertEqual(fill.window_minutes(at(21, 23)), 7 * 60 + 45)  # Sat 23:00 -> Sun 06:45
        self.assertEqual(fill.window_minutes(at(22, 2)), 4 * 60 + 45)   # Sun 02:00 -> 06:45


class MemoryGuard(unittest.TestCase):
    """Two lanes at once on an 8 GB Mac: the clone lane pauses while memory is tight, then resumes."""
    def run_guard(self, readings, **kw):
        import memguard
        seq, logs, t = list(readings), [], [0.0]
        def reader():
            return seq.pop(0) if len(seq) > 1 else seq[0]
        def sleep(s):
            t[0] += s
        out = memguard.wait("clone", reader=reader, sleep=sleep, clock=lambda: t[0], log=logs.append, **kw)
        return out, logs

    def test_parse_swap(self):
        import memguard
        self.assertEqual(memguard.parse_swap_used_mb("vm.swapusage: total = 2048.00M  used = 1653.00M  free = 395.00M  (encrypted)"), 1653.0)
        self.assertEqual(memguard.parse_swap_used_mb("total = 22.00G  used = 2.50G  free = 1.0G"), 2560.0)

    def test_clear_memory_goes_straight_on(self):
        out, logs = self.run_guard([{"level": 1, "swap_mb": 1653.0}])
        self.assertEqual((out, logs), ("go", []))

    def test_pause_at_the_threshold_then_resume(self):
        import memguard
        lim = memguard.SWAP_LIMIT_MB
        self.assertEqual(self.run_guard([{"level": 1, "swap_mb": lim}])[0], "go")          # at the limit: fine
        out, logs = self.run_guard([{"level": 1, "swap_mb": lim + 1}, {"level": 1, "swap_mb": lim + 1}, {"level": 1, "swap_mb": lim - 500}])
        self.assertEqual(out, "resumed")
        self.assertTrue(logs[0].startswith("NOTE MEMGUARD_PAUSE clone"))
        self.assertTrue(logs[-1].startswith("NOTE MEMGUARD_RESUME clone"))
        out, logs = self.run_guard([{"level": 2, "swap_mb": 0.0}, {"level": 1, "swap_mb": 0.0}])  # macOS warning level
        self.assertEqual(out, "resumed")

    def test_a_failing_sysctl_reads_as_normal_and_never_blocks(self):
        import memguard
        with mock.patch.object(memguard.subprocess, "run", side_effect=OSError("no sysctl")):
            self.assertEqual(memguard.read(), {"level": 1, "swap_mb": 0.0})
            self.assertEqual(memguard.wait("clone", sleep=lambda s: self.fail("must not wait")), "go")

    def test_the_morning_window_pauses_the_clone_lane_until_it_clears(self):
        import memguard
        with tempfile.TemporaryDirectory() as d:
            flag = Path(d) / "morning-window.active"
            logs, t = [], [0.0]
            normal = lambda: {"level": 1, "swap_mb": 0.0}
            # No flag file: no morning window, both lanes run.
            self.assertEqual(memguard.wait("clone", reader=normal, log=logs.append, flag=flag, sleep=lambda s: self.fail("waited")), "go")
            flag.write_text("on")
            def sleep(s):
                t[0] += s
                if t[0] >= 180:
                    flag.unlink()      # the morning jobs finish after 3 minutes
            out = memguard.wait("clone", reader=normal, sleep=sleep, clock=lambda: t[0], log=logs.append, flag=flag)
            self.assertEqual(out, "resumed")
            self.assertTrue(logs[0].startswith("NOTE MEMGUARD_MORNING_PAUSE clone"))
            self.assertTrue(logs[-1].startswith("NOTE MEMGUARD_MORNING_RESUME clone"))
            # A morning window longer than the run's box: the lane stops for this run, the next looks again.
            flag.write_text("on")
            t[0] = 0.0
            out = memguard.wait("clone", reader=normal, sleep=lambda s: t.__setitem__(0, t[0] + s), clock=lambda: t[0],
                                log=logs.append, flag=flag, deadline=600)
            self.assertEqual(out, "one-lane")

    def test_a_morning_flag_left_behind_is_ignored(self):
        import memguard, os
        with tempfile.TemporaryDirectory() as d:
            flag = Path(d) / "morning-window.active"
            flag.write_text("on")
            old = flag.stat().st_mtime - 4 * 3600
            os.utime(flag, (old, old))
            logs = []
            out = memguard.wait("clone", reader=lambda: {"level": 1, "swap_mb": 0.0}, log=logs.append, flag=flag,
                                sleep=lambda s: self.fail("waited on a stale flag"))
            self.assertEqual(out, "go")
            self.assertTrue(any("MEMGUARD_MORNING_STALE" in l for l in logs))

    def test_pressure_that_never_clears_drops_to_one_lane(self):
        out, logs = self.run_guard([{"level": 4, "swap_mb": 9000.0}], max_pause_s=300)
        self.assertEqual(out, "one-lane")
        self.assertTrue(logs[-1].startswith("NOTE MEMGUARD_ONE_LANE clone"))


class Manifest(unittest.TestCase):
    def test_conflict_markers_are_a_named_stop(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "m.jsonl"
            p.write_text('{"file": "a"}\n<<<<<<< HEAD\n{"file": "b"}\n=======\n{"file": "c"}\n>>>>>>> x\n')
            with self.assertRaises(fill.NamedStop) as e:
                fill.read_manifest(p)
            self.assertEqual(e.exception.code, "MANIFEST_CORRUPT")
            p.write_text('{"file": "a"}\n\n{"file": "b"}\n')
            self.assertEqual([r["file"] for r in fill.read_manifest(p)], ["a", "b"])

    def test_manifest_merges_as_a_union(self):
        self.assertIn("audio/manifest.jsonl merge=union", (AUDIO.parent / ".gitattributes").read_text())


class ActiveFlag(unittest.TestCase):
    def test_written_while_incomplete_and_kept_marked_complete_when_done(self):
        items = fill.plan(bibles())
        with tempfile.TemporaryDirectory() as d:
            flag = Path(d) / "library-fill.active"
            self.assertFalse(fill.settle_active(flag, items, [], NOW, stories=[]))
            body = json.loads(flag.read_text())
            self.assertTrue(body["started"] and body["reason"])
            later = NOW + dt.timedelta(hours=3)
            fill.settle_active(flag, items, [], later, stories=[])
            self.assertEqual(json.loads(flag.read_text())["started"], body["started"])  # start kept
            rows = [{"file": i["file"], "status": "passed"} for i in items]
            self.assertTrue(fill.settle_active(flag, items, rows, later, stories=[]))
            # Kept (YouTube restarts only after the owner approves the overhaul), marked with the date.
            self.assertEqual(json.loads(flag.read_text())["complete"], later.date().isoformat())
            self.assertFalse(fill.settle_active(flag, items, rows, later + dt.timedelta(days=1), stories=[]))   # told once
            self.assertTrue(flag.exists())

    def test_expected_end_from_measured_speed(self):
        items = fill.plan(bibles())
        rows = [{"file": items[0]["file"], "status": "passed", "work_s": 100, "checks": {"words": 100}}]
        end = fill.expected_end(items, rows, NOW)
        left = sum(len(T.score_words(fill.script_of(i), i["lang"])) for i in items[1:])
        self.assertEqual(end, NOW + dt.timedelta(seconds=left))

    def test_a_story_left_keeps_the_fill_open_and_the_file_never_goes(self):
        items = fill.plan(bibles())
        rows = [{"file": i["file"], "status": "passed"} for i in items]
        story = C.H.load_stories()[:1]
        with tempfile.TemporaryDirectory() as d:
            flag = Path(d) / "library-fill.active"
            self.assertFalse(fill.settle_active(flag, items, rows, NOW, stories=story))
            self.assertNotIn("complete", json.loads(flag.read_text()))
            self.assertTrue(flag.exists())


class Lanes(unittest.TestCase):
    def test_the_mac_and_the_cloud_never_take_the_same_file(self):
        items = fill.plan(bibles(), fill.content_items(fill.REPO))
        cfg = fill.lanes()
        mac = {i["file"] for i in items if fill.lane_of(i, cfg) == "mac"}
        cloud = {i["file"] for i in items if fill.lane_of(i, cfg) == "cloud"}
        self.assertFalse(mac & cloud)
        self.assertEqual(len(mac | cloud), len(items))
        # A kind the Mac keeps is never the cloud's, whatever lanes.json lists.
        alt = {"mac_kinds": ["psalms"], "mac_stories": ["core-011-noah"]}
        self.assertTrue(all(fill.lane_of(i, alt) == ("mac" if i["kind"] == "psalms" else "cloud") for i in items))
        self.assertEqual(C.lane_of({"id": "core-011-noah"}, alt), "mac")
        stories = C.H.load_stories()
        self.assertEqual({s["id"] for s in stories if C.lane_of(s, cfg) == "mac"}, set(cfg["mac_stories"]))

    def test_shards_split_a_queue_with_no_overlap_and_no_gap(self):
        q = list(range(101))
        parts = [fill.shard(q, f"{i}/7") for i in range(7)]
        self.assertEqual(sorted(x for p in parts for x in p), q)
        self.assertEqual(fill.shard(q, None), q)
        with self.assertRaises(ValueError):
            fill.shard(q, "7/7")

    def test_cloud_plan_sizes_the_matrix_and_says_when_it_is_done(self):
        items = fill.plan(bibles(), fill.content_items(fill.REPO))
        cfg = fill.lanes()
        p = fill.cloud_plan(items, [], cfg, 12)
        n = min(12, -(-p["left"] // fill.CLOUD_FILES_PER_JOB))
        self.assertTrue(p["left"] > 0 and n >= 1)
        self.assertEqual(p["bible"], [f"{k}/{n}" for k in range(n)])
        self.assertEqual(len(fill.cloud_plan(items, [], cfg, 1)["bible"]), 1)   # capped at the jobs asked
        done = [{"file": i["file"], "status": "passed"} for i in items]
        with mock.patch.object(fill, "whole_fill_done", return_value=True):
            self.assertEqual(fill.cloud_plan(items, done, cfg, 12), {"bible": [], "left": 0, "complete": True})


class Gather(unittest.TestCase):
    """Two writers of the manifest (the Mac, the cloud's gather job) never conflict and never lose a row."""
    def repo(self, d: Path):
        import subprocess as sp
        self.git = lambda cwd, *a: sp.run(["git", "-C", str(cwd), *a], capture_output=True, text=True, check=True)
        sp.run(["git", "init", "-q", "--bare", "-b", "main", str(d / "origin.git")], check=True)
        for c in ("a", "b"):
            sp.run(["git", "clone", "-q", str(d / "origin.git"), str(d / c)], check=True, capture_output=True)
            self.git(d / c, "config", "user.email", "t@example.com"); self.git(d / c, "config", "user.name", "t")
            self.git(d / c, "checkout", "-q", "-B", "main")
        (d / "a" / "audio").mkdir()
        (d / "a" / "audio" / "manifest.jsonl").write_text(json.dumps({"file": "x", "status": "FAILED", "at": "1"}) + "\n")
        self.git(d / "a", "add", "-A"); self.git(d / "a", "commit", "-qm", "seed"); self.git(d / "a", "push", "-q", "origin", "main")
        self.git(d / "b", "pull", "-q", "origin", "main")
        return d / "a" / "audio" / "manifest.jsonl"

    def other_writer_pushes(self, d: Path, row: dict):
        man = d / "b" / "audio" / "manifest.jsonl"
        self.git(d / "b", "pull", "-q", "origin", "main")
        man.write_text(man.read_text() + json.dumps(row) + "\n")
        self.git(d / "b", "commit", "-qam", "other"); self.git(d / "b", "push", "-q", "origin", "main")

    def rows_on_main(self, d: Path) -> dict:
        self.git(d / "b", "pull", "-q", "origin", "main")
        return {r["file"]: r["status"] for r in fill.read_manifest(d / "b" / "audio" / "manifest.jsonl")}

    def patched(self, d: Path, man: Path, home: str):
        return [mock.patch.object(fill, "HOME", Path(home)), mock.patch.object(fill, "REPO", d / "a"),
                mock.patch.object(fill, "MANIFEST", man)]

    def run_with(self, patches, fn):
        for p in patches:
            p.start()
        try:
            return fn()
        finally:
            for p in patches:
                p.stop()

    def test_unpushed_rows_are_laid_over_the_newest_main_and_pushed(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home:
            d = Path(d); man = self.repo(d)
            self.other_writer_pushes(d, {"file": "y", "status": "passed", "at": "2"})
            def go():
                fill.upsert_row({"file": "x", "status": "passed", "at": "3"}, man)
                self.assertEqual(fill.git_commit("t"), "manifest pushed")
                self.assertFalse(fill.unpushed_path().exists())
            self.run_with(self.patched(d, man, home), go)
            self.assertEqual(self.rows_on_main(d), {"x": "passed", "y": "passed"})

    def test_a_rejected_push_is_retried_on_the_newer_main(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home:
            d = Path(d); man = self.repo(d)
            real = fill.subprocess.run
            raced = []
            def run(cmd, *a, **k):
                if cmd[:1] == ["git"] and "push" in cmd and not raced:   # the other writer lands first
                    raced.append(1)
                    self.other_writer_pushes(d, {"file": "z", "status": "passed", "at": "4"})
                return real(cmd, *a, **k)
            def go():
                with mock.patch.object(fill.subprocess, "run", side_effect=run):
                    fill.upsert_row({"file": "x", "status": "passed", "at": "3"}, man)
                    self.assertEqual(fill.git_commit("t"), "manifest pushed")
            self.run_with(self.patched(d, man, home), go)
            self.assertEqual(self.rows_on_main(d), {"x": "passed", "z": "passed"})

    def test_rows_in_an_old_unpushed_commit_are_kept(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home:
            d = Path(d); man = self.repo(d)
            # A run from before unpushed-rows.jsonl existed: committed, push failed.
            man.write_text(man.read_text() + json.dumps({"file": "old", "status": "passed", "at": "2"}) + "\n")
            self.git(d / "a", "commit", "-qam", "old run")
            self.other_writer_pushes(d, {"file": "y", "status": "passed", "at": "3"})
            self.run_with(self.patched(d, man, home), lambda: self.assertEqual(fill.git_commit("t"), "manifest pushed"))
            self.assertEqual(self.rows_on_main(d), {"x": "FAILED", "old": "passed", "y": "passed"})

    def test_a_checkout_with_other_unpushed_commits_is_never_reset(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home:
            d = Path(d); man = self.repo(d)
            (d / "a" / "notes.txt").write_text("work")
            self.git(d / "a", "add", "-A"); self.git(d / "a", "commit", "-qm", "someone's work")
            def go():
                fill.upsert_row({"file": "x", "status": "passed", "at": "3"}, man)
                self.assertIn("unpushed commits to notes.txt", fill.git_commit("t"))
                self.assertTrue(fill.unpushed_path().exists())     # the row waits; nothing lost
            self.run_with(self.patched(d, man, home), go)
            self.assertTrue((d / "a" / "notes.txt").exists())
            self.assertIn("someone's work", self.git(d / "a", "log", "-1", "--format=%s").stdout)

    def test_the_gather_job_pushes_every_jobs_rows(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home:
            d = Path(d); man = self.repo(d)
            r1, r2 = Path(home) / "r1.jsonl", Path(home) / "r2.jsonl"
            r1.write_text(json.dumps({"file": "p", "status": "passed", "at": "5"}) + "\n")
            r2.write_text(json.dumps({"file": "q", "status": "FAILED", "at": "5"}) + "\n")
            self.run_with(self.patched(d, man, home), lambda: self.assertEqual(fill.main(["--push-rows", str(r1), str(r2)]), 0))
            self.assertEqual(self.rows_on_main(d), {"x": "FAILED", "p": "passed", "q": "FAILED"})


class Text(unittest.TestCase):
    pron = {"en": {"engine": {"Selah": "Seelah"}}, "es": {"engine": {}}}

    def test_spoken_form(self):
        self.assertEqual(T.speech_text("The LORD [is] my shepherd. (Selah.)", "en", self.pron),
                         "The Lord is my shepherd. Seelah.")
        self.assertEqual(T.speech_text("JEHOVÁ es mi pastor", "es", self.pron), "Jehová es mi pastor")
        self.assertEqual(T.speech_text("junto á aguas ó en mí", "es", self.pron), "junto a aguas o en mí")

    def test_scored_against_the_stored_words(self):
        item = fill.plan(bibles())[1]
        self.assertEqual(fill.script_of(item), "Psalm 2. Why do the heathen rage? (Selah.)")
        self.assertIn("selah", T.score_words(fill.script_of(item), "en"))

    def test_digits_score_as_words_and_old_accents_match(self):
        self.assertEqual(T.score_words("Psalm 23", "en"), T.score_words("psalm twenty-three", "en"))
        self.assertEqual(T.score_words("junto á aguas", "es"), T.score_words("junto a aguas", "es"))
        self.assertEqual(T.number_words(119, "es"), "ciento diecinueve")

    def test_old_spellings_forgiven_but_missing_words_are_not(self):
        self.assertEqual(T.score_words("thou hast shewed it for ever. Selah.", "en"),
                         T.score_words("Thou haste showed it forever. Sila.", "en"))
        self.assertNotEqual(T.score_words("thou hast shewed it", "en"), T.score_words("thou showed it", "en"))
        self.assertEqual(T.score_words("he was honoured; that armour; go to day", "en"),
                         T.score_words("He was honored, that armor, go today", "en"))
        self.assertNotEqual(T.score_words("go to day", "en"), T.score_words("go", "en"))

    def test_real_respellings_load(self):
        p = T.load_pronunciations()
        self.assertEqual(p["en"]["engine"]["Job"], "Jobe")


class Content(unittest.TestCase):
    def test_only_passed_scripts(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "content/stories").mkdir(parents=True)
            (root / "content/stories/a.json").write_text(json.dumps(
                [{"id": "ruth-1", "status": "passed", "title": "Ruth", "script": "One.\n\nTwo."},
                 {"id": "draft", "status": "draft", "script": "No."}]))
            items = fill.content_items(root)
            self.assertEqual(len(items), 1)
            self.assertEqual(items[0]["verses"], ["One.", "Two."])
            self.assertTrue(items[0]["file"].startswith("en/stories/ruth-1-"))
            self.assertEqual(items[0]["priority"], 3)


class Sessions(unittest.TestCase):
    """The real session scripts (content/psalm-nights, content/imagination-nights) become fill items:
    before 21 Nov 2026 content_items read only a string body, so all 90 sessions were skipped."""
    def test_every_passed_session_script_is_planned(self):
        items = fill.content_items(fill.REPO)
        kinds = {}
        for i in items:
            kinds[(i["kind"], i["lang"])] = kinds.get((i["kind"], i["lang"]), 0) + 1
        for kind, folder in (("psalm-night", "psalm-nights"), ("imagination-night", "imagination-nights")):
            for lang in ("en", "es"):
                d = fill.REPO / "content" / folder / lang
                want = sum(1 for f in d.glob("*.json") if json.loads(f.read_text("utf-8")).get("status") == "passed") if d.is_dir() else 0
                self.assertEqual(kinds.get((kind, lang), 0), want, (kind, lang))
        self.assertGreaterEqual(sum(kinds.values()), 60, "rule 0: the real scripts must yield sessions")

    def test_pauses_are_real_quiet_and_scripture_is_the_stored_text_with_its_reference(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "content/psalm-nights/en").mkdir(parents=True)
            (root / "content/psalm-nights/en/pn.json").write_text(json.dumps({
                "id": "pn-x", "kind": "psalm-night", "lang": "en", "title": "Psalm 4", "status": "passed",
                "pacing": {"quiet_between_verses_s": 1.5, "quiet_between_paragraphs_s": 4},
                "segments": [{"text": "Hello. [pause 8]\n\nLie down."},
                             {"ref": "PSA 4:8", "verses": [{"v": 8, "text": "I will both lay me down in peace, and sleep."}]}]}))
            [item] = fill.content_items(root)
        self.assertEqual(item["verses"], ["Hello.", "Lie down.", "Psalm 4, verse 8.", "I will both lay me down in peace, and sleep."])
        self.assertEqual(item["gaps"], [8.0, 4.0, fill.HEADING_GAP, 4.0])
        self.assertNotIn("[pause", fill.script_of(item))
        segs = fill.segments_of(item, {})
        self.assertEqual([s["gap"] for s in segs][1:], item["gaps"])
        self.assertEqual(item["level"], "sleep")

    def test_a_night_with_its_own_target_and_level_keeps_them(self):
        """The grief nights (8 min target) and the 5-8 min "3 AM, back to sleep" night (hush level) are floored at
        75% of their OWN target, never the Psalm Night's 13 min; a night without one keeps its kind's."""
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "content/psalm-nights/en").mkdir(parents=True)
            base = {"kind": "psalm-night", "lang": "en", "title": "Night", "status": "passed",
                    "segments": [{"text": "You are awake. [pause 8]"}]}
            for name, extra in (("a", {"target_seconds": 300, "level": "hush"}), ("b", {"target_seconds": 480}),
                                ("c", {}), ("d", {"level": "loud"})):
                (root / f"content/psalm-nights/en/{name}.json").write_text(json.dumps({**base, "id": name, **extra}))
            items = {i["ref"].split("#")[1]: i for i in fill.content_items(root)}
        self.assertEqual((items["a"]["target_seconds"], items["a"]["min_seconds"], items["a"]["level"]), (300, 225, "hush"))
        self.assertEqual((items["b"]["target_seconds"], items["b"]["min_seconds"], items["b"]["level"]), (480, 360, "sleep"))
        self.assertEqual((items["c"]["target_seconds"], items["c"]["min_seconds"]), (780, 585))
        self.assertEqual(items["d"]["level"], "sleep")   # an unknown level never reaches the master
        self.assertIn("hush", qa.BARS)
        lo, hi = qa.BARS["hush"]["lufs"]
        self.assertTrue(lo <= fill.LEVEL_TARGET["hush"][0] <= hi and hi < qa.BARS["sleep"]["lufs"][0])

    def test_the_real_back_to_sleep_night_is_short_and_hushed(self):
        items = [i for i in fill.content_items(fill.REPO) if "/bs-" in i["ref"]]
        self.assertEqual(sorted(i["lang"] for i in items), ["en", "es"])
        for i in items:
            self.assertEqual((i["level"], i["target_seconds"]), ("hush", 300), i["ref"])

    def test_sessions_come_after_english_psalms_and_before_other_chapters(self):
        vpl = ["MAT 1:1 The book.", "PSA 1:1 Blessed.", "PSA 2:1 Why."]
        b = {"en": T.parse_vpl(vpl), "es": T.parse_vpl(vpl)}
        mk = lambda kind, lang, n: {"file": f"{lang}/{kind}/{n}.m4a", "kind": kind, "lang": lang, "priority": 3}
        content = [mk("imagination-night", "en", "a"), mk("story", "en", "s"), mk("psalm-night", "es", "b"), mk("psalm-night", "en", "c")]
        order = [i["file"] for i in fill.plan(b, content)]
        self.assertEqual(order[:5], ["en/psalms/kjv-psa-001.m4a", "en/psalms/kjv-psa-002.m4a",
                                     "en/psalm-night/c.m4a", "es/psalm-night/b.m4a", "en/imagination-night/a.m4a"])
        self.assertEqual(order[5], "en/bible/kjv-mat-001.m4a")
        self.assertEqual(order[-1], "en/story/s.m4a")   # a kind the plan does not know stays last

    def test_a_published_psalm_night_whose_words_changed_waits_for_the_new_sessions_and_comes_before_chapters(self):
        """A published night re-voiced for a word change queues after the sessions never voiced, before the rest
        (the old row records no words here, so its file is a word change)."""
        vpl = ["MAT 1:1 The book.", "PSA 1:1 Blessed."]
        b = {"en": T.parse_vpl(vpl), "es": T.parse_vpl(vpl)}
        mk = lambda kind, lang, n: {"file": f"{lang}/{kind}/{n}-new.m4a", "kind": kind, "lang": lang, "priority": 3, "ref": f"{lang}/{kind}/{n}"}
        content = [mk("psalm-night", "en", "pn-01"), mk("psalm-night", "en", "pn-08"), mk("imagination-night", "es", "in-01")]
        items = fill.plan(b, content)
        rows = [{"file": "en/psalms/kjv-psa-001.m4a", "status": "passed"},
                {"file": "en/psalm-night/pn-01-old.m4a", "ref": "en/psalm-night/pn-01", "status": "passed", "seconds": 723.3}]
        q = [i["file"] for i in fill.todo(items, rows)]
        self.assertEqual(q[:4], ["en/psalm-night/pn-08-new.m4a", "es/imagination-night/in-01-new.m4a",
                                 "en/psalm-night/pn-01-new.m4a", "en/bible/kjv-mat-001.m4a"])
        # A re-voice that failed is retried in the same place, still ahead of the chapters.
        rows.append({"file": "en/psalm-night/pn-01-new.m4a", "ref": "en/psalm-night/pn-01", "status": "FAILED"})
        self.assertEqual([i["file"] for i in fill.todo(items, rows)][2:4], ["en/psalm-night/pn-01-new.m4a", "en/bible/kjv-mat-001.m4a"])

    def test_a_re_voiced_published_imagination_night_queues_after_an_unvoiced_one(self):
        """Review of #83: a published English Imagination Night voiced again must not jump the unvoiced Spanish ones."""
        b = {"en": T.parse_vpl(["MAT 1:1 The book."]), "es": T.parse_vpl(["MAT 1:1 El libro."])}
        mk = lambda lang, n: {"file": f"{lang}/imagination-night/{n}-new.m4a", "kind": "imagination-night", "lang": lang,
                              "priority": 3, "ref": f"{lang}/imagination-night/{n}"}
        items = fill.plan(b, [mk("en", "in-01"), mk("es", "in-01")])
        rows = [{"file": "en/imagination-night/in-01-old.m4a", "ref": "en/imagination-night/in-01", "status": "passed", "seconds": 1029.0}]
        q = [i["file"] for i in fill.todo(items, rows)]
        self.assertEqual(q[:3], ["es/imagination-night/in-01-new.m4a", "en/imagination-night/in-01-new.m4a", "en/bible/kjv-mat-001.m4a"])

    def test_only_added_quiet_is_never_re_voiced_and_a_word_change_is(self):
        """Her call 21 Nov 2026: the published nights are not voiced again just to lengthen them."""
        mk = lambda gaps, words=("Welcome.", "Lie down."): {"file": f"en/psalm-night/pn-01-{hash((gaps, words)) & 0xffff:x}.m4a",
              "kind": "psalm-night", "lang": "en", "priority": 3, "ref": "c/pn-01.json#pn-01", "heading": "Psalm 23",
              "verses": list(words), "gaps": list(gaps)}
        old = mk((8.0, 4.0))
        rows = [{"file": old["file"], "ref": old["ref"], "status": "passed", "words": fill.words_key(old)}]
        quieter, reworded = mk((15.0, 9.0)), mk((15.0, 9.0), ("Welcome home.", "Lie down."))
        self.assertNotEqual(quieter["file"], old["file"])
        self.assertEqual(fill.todo([quieter], rows), [])
        self.assertEqual(fill.todo([reworded], rows), [reworded])
        # The rows voiced before rows recorded their words are matched by the recovered list.
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "voiced-words.json"
            p.write_text(json.dumps({old["file"]: fill.words_key(old)}))
            legacy = [{k: v for k, v in rows[0].items() if k != "words"}]
            with mock.patch.object(fill, "VOICED_WORDS", p):
                self.assertEqual(fill.todo([quieter], legacy), [])
                self.assertEqual(fill.todo([reworded], legacy), [reworded])

    def test_the_21_published_nights_are_not_queued_again_for_their_added_quiet(self):
        rows = fill.read_manifest()
        legacy = json.loads(fill.VOICED_WORDS.read_text("utf-8"))
        published = [r for r in rows if r.get("kind") in fill.SESSION_KINDS and r.get("status") == "passed"]
        self.assertGreaterEqual(len(published), 21, "rule 0: the published nights must be read")
        self.assertFalse([r["file"] for r in published if not (r.get("words") or legacy.get(r["file"]))])
        refs = {r["ref"] for r in published}
        queued = [i["ref"] for i in fill.todo(fill.content_items(fill.REPO), rows) if i["ref"] in refs]
        self.assertEqual(queued, [])

    def test_scripted_quiet_is_not_counted_as_slow_speech(self):
        import qa
        kw = dict(script="one two three", transcript="one two three", lang="en", level="sleep",
                  lufs=-22.0, true_peak=-3.0, clipped=0)
        self.assertTrue(any(p.startswith("length") for p in qa.judge(seconds=60.0, **kw)["problems"]))
        self.assertFalse(any(p.startswith("length") for p in qa.judge(seconds=60.0, quiet=58.4, **kw)["problems"]))


class Stories(unittest.TestCase):
    """21 Nov 2026: only Hush Harbor was voiced (its own lanes); the plain and Mi Refugio stories use `blocks`,
    which content_items skipped, so 120 passed stories were never queued."""
    def test_every_passed_plain_and_mi_refugio_story_is_planned_hush_harbor_never(self):
        items = [i for i in fill.content_items(fill.REPO) if i["kind"] == "stories"]
        for telling, lang in (("plain", "en"), ("mi-refugio", "es")):
            d = fill.REPO / "content/stories" / telling
            want = sum(1 for f in d.glob("*.json") if json.loads(f.read_text("utf-8")).get("status") == "passed")
            mine = [i for i in items if i["ref"].startswith(f"content/stories/{telling}/")]
            self.assertEqual(len(mine), want, telling)
            self.assertGreaterEqual(len(mine), 60, f"rule 0: the real {telling} stories must yield files")
            self.assertTrue(all(i["lang"] == lang and i["file"].startswith(f"{lang}/stories/{telling}/") for i in mine))
        self.assertFalse([i for i in items if "hush-harbor" in i["ref"]], "Hush Harbor has its own lanes")
        self.assertEqual(fill.VOICE["es"]["id"], "kokoro:blend af_nicole 0.7 + ef_dora 0.3")

    def story(self, root, telling="mi-refugio", status="passed"):
        d = root / "content/stories" / telling
        d.mkdir(parents=True, exist_ok=True)
        f = d / "core-001.json"
        f.write_text(json.dumps({"id": "core-001", "kind": "story", "telling": telling, "lang": "es", "title": "Calla, enmudece",
            "status": status, "blocks": [
                {"type": "retelling", "speaker": "narrator", "text": "Jesús había pasado el día enseñando."},
                {"type": "scripture", "speaker": "narrator", "ref": "MAR 4:35-36", "verses": [
                    {"v": 35, "text": "Y les dijo aquel día cuando fué tarde: Pasemos de la otra parte."},
                    {"v": 36, "text": "Y despachando la multitud, le tomaron como estaba, en el barco."}]},
                {"type": "call_response", "speaker": "narrator", "text": 'Cuando yo diga Dios es bueno, ustedes dicen, todo el tiempo. Dios es bueno. [PAUSE 3s | screen: "Todo el tiempo"] Y todo el tiempo. [PAUSE 3s | screen: "Dios es bueno"] También en la tormenta.'},
                {"type": "retelling", "speaker": "narrator", "text": "Y hubo grande bonanza."}]}, ensure_ascii=False))
        return f

    def test_story_words_are_the_stored_words_and_the_call_pauses_are_real_quiet(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.story(root)
            [item] = fill.content_items(root)
        self.assertEqual(item["verses"][:3], ["Jesús había pasado el día enseñando.",
                                              "Y les dijo aquel día cuando fué tarde: Pasemos de la otra parte.",
                                              "Y despachando la multitud, le tomaron como estaba, en el barco."])
        self.assertEqual(item["gaps"][1:3], [fill.VERSE_GAP, fill.GAP["content"]])
        self.assertEqual([item["gaps"][i] for i in item["marks"]], [3.0, 3.0])
        self.assertEqual([item["verses"][i] for i in item["marks"]], ["Cuando yo diga Dios es bueno, ustedes dicen, todo el tiempo. Dios es bueno.", "Y todo el tiempo."])
        self.assertNotIn("PAUSE", fill.script_of(item))
        self.assertEqual((item["kind"], item["lang"], item["level"], item["ref"]), ("stories", "es", "sleep", "content/stories/mi-refugio/core-001.json"))
        segs = fill.segments_of(item, {})
        self.assertEqual(len([s for s in segs if s.get("mark")]), 2)
        ends = [1.0 + n for n in range(len(segs))]
        self.assertEqual(fill.pause_starts(segs, ends), [ends[n] for n, s in enumerate(segs) if s.get("mark")])
        self.assertEqual(fill.pause_starts(segs, ends[:-1]), [], "a renderer line that does not match is never guessed")

    def test_held_story_and_hush_harbor_story_are_never_queued(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.story(root, status="held")
            self.story(root, telling="hush-harbor")
            self.assertEqual(fill.content_items(root), [])

    def test_stories_after_sessions_before_chapters_and_before_failed_chapter_retries(self):
        vpl = ["MAT 1:1 The book.", "MAT 2:1 Now when.", "PSA 1:1 Blessed."]
        b = {"en": T.parse_vpl(vpl), "es": T.parse_vpl(vpl)}
        mk = lambda kind, lang, n: {"file": f"{lang}/{kind}/{n}.m4a", "kind": kind, "lang": lang, "priority": 3}
        content = [mk("stories", "es", "mr"), mk("imagination-night", "es", "in"), mk("stories", "en", "plain"), mk("psalm-night", "en", "pn")]
        items = fill.plan(b, content)
        order = [i["file"] for i in items]
        self.assertEqual(order[:6], ["en/psalms/kjv-psa-001.m4a", "en/psalm-night/pn.m4a", "es/imagination-night/in.m4a",
                                     "en/stories/plain.m4a", "es/stories/mr.m4a", "en/bible/kjv-mat-001.m4a"])
        rows = [{"file": "en/bible/kjv-mat-001.m4a", "status": "FAILED"}, {"file": "en/psalms/kjv-psa-001.m4a", "status": "passed"},
                {"file": "es/stories/mr.m4a", "status": "FAILED"}]
        q = [i["file"] for i in fill.todo(items, rows)]
        # The unvoiced sessions first; a failed story is retried ahead of the new stories but after the sessions;
        # the failed chapter waits for the stories, then comes before every new chapter (the stories are bounded).
        self.assertEqual(q, ["en/psalm-night/pn.m4a", "es/imagination-night/in.m4a", "es/stories/mr.m4a", "en/stories/plain.m4a",
                             "en/bible/kjv-mat-001.m4a", "en/bible/kjv-mat-002.m4a", "es/psalms/rv1909-psa-001.m4a",
                             "es/bible/rv1909-mat-001.m4a", "es/bible/rv1909-mat-002.m4a"])

class TextProgress(unittest.TestCase):
    def test_counts_from_files_and_behind_after_24h(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for tell, ids in (("plain", ["core-001", "core-002"]), ("hush-harbor", ["core-001", "fav-01-hagar"])):
                (root / "content/stories" / tell).mkdir(parents=True)
                for i in ids:
                    (root / "content/stories" / tell / f"{i}.json").write_text(json.dumps({"id": i, "status": "passed"}))
            (root / "content/stories/plain/core-003.json").write_text(json.dumps({"id": "core-003", "status": "draft"}))
            c = fill.text_counts(root)
            self.assertEqual((c["plain"], c["hh"], c["fav"], c["es"]), (2, 1, 1, 0))
            line, st = fill.text_progress(c, {}, NOW)
            self.assertIn("stories 4/200", line)
            self.assertNotIn("BEHIND", line)
            line, _ = fill.text_progress(c, st, NOW + dt.timedelta(hours=25))
            self.assertIn("BEHIND", line)
            c["es"] += 1
            line, st2 = fill.text_progress(c, st, NOW + dt.timedelta(hours=25))
            self.assertNotIn("BEHIND", line)
            done = dict(fill.TEXT_TARGETS)
            line, _ = fill.text_progress(done, {"total": sum(done.values()), "grew_at": NOW.isoformat()}, NOW + dt.timedelta(days=3))
            self.assertNotIn("BEHIND", line)


GOOD = dict(script="The Lord is my shepherd I shall not want " * 9 + "he leadeth me beside the still waters", lang="en", level="sleep", seconds=60.0,
            lufs=-22.0, true_peak=-3.0, clipped=0)


class SpeechOnly(unittest.TestCase):
    """21 Nov 2026: Whisper invented "suscríbete suscríbete" in a session's closing 60 s of silence; the
    accuracy score must be taken on the speech, not on what the model dreams into the quiet."""
    def test_long_silence_is_cut_before_asr_and_the_speech_is_kept(self):
        import numpy as np
        r = 16000
        tone = (0.2 * np.sin(np.arange(r) * 2 * np.pi * 220 / r)).astype(np.float32)   # 1 s of "speech"
        quiet = lambda s: np.zeros(int(r * s), dtype=np.float32)
        audio = np.concatenate([quiet(3), tone, quiet(0.8), tone, quiet(20), tone, quiet(60)])
        out = qa.speech_only(audio, r)
        self.assertLess(len(out) / r, 5.5)                      # 3 s of speech, short gap kept, cuts at 0.4 s a side
        self.assertGreater(len(out) / r, 3.6)
        loud = np.count_nonzero(np.abs(out) > 0.05)
        self.assertGreaterEqual(loud, np.count_nonzero(np.abs(audio) > 0.05) - 3 * 800)  # every second of speech survives
        tail = len(out) - 1 - int(np.flatnonzero(np.abs(out) > 0.05)[-1])
        self.assertLess(tail / r, 0.5)                          # the 60 s tail is gone: nothing left for ASR to fill

    def test_transcribe_hears_only_the_speech(self):
        import numpy as np
        heard = []
        class M:
            def transcribe(self, audio, **k):
                heard.append(len(audio))
                return [], None
        audio = np.concatenate([np.full(16000, 0.2, dtype=np.float32), np.zeros(16000 * 60, dtype=np.float32)])
        with mock.patch.dict(qa._MODELS, {"base": M()}), mock.patch.object(qa, "decode", return_value=audio):
            qa.transcribe(Path("x.m4a"), "es")
        self.assertLess(heard[0], 16000 * 2)


class Bars(unittest.TestCase):
    def test_good_track_passes(self):
        r = qa.judge(transcript=GOOD["script"], **GOOD)
        self.assertTrue(r["pass"], r["problems"])

    def test_each_broken_fault_fails(self):
        cases = {
            "A01": dict(transcript="The Lord is my " * 10),
            "A07": dict(transcript=GOOD["script"].rsplit(" ", 3)[0]),
            "A06 loudness": dict(transcript=GOOD["script"], lufs=-14.0),
            "true peak": dict(transcript=GOOD["script"], true_peak=-0.5),
            "clipped": dict(transcript=GOOD["script"], clipped=300),
            "length": dict(transcript=GOOD["script"], seconds=600.0),
        }
        for name, over in cases.items():
            r = qa.judge(**{**GOOD, **over})
            self.assertFalse(r["pass"], name)
            self.assertTrue(any(name.split()[0] in p for p in r["problems"]), (name, r["problems"]))

    def test_near_misses_ship_with_a_note(self):
        # 21 Nov 2026: a chapter at -18.1 LUFS against -18..-16 was thrown away. Inside the margin it ships.
        read = {**GOOD, "level": "read", "lufs": -18.1, "true_peak": -1.5}
        r = qa.judge(transcript=GOOD["script"], **{k: v for k, v in read.items() if k != "transcript"})
        self.assertTrue(r["pass"], r["problems"])
        self.assertTrue(any("A06 loudness" in n for n in r["notes"]))
        self.assertFalse(qa.judge(transcript=GOOD["script"], **{**read, "lufs": -20.6})["pass"])   # 25% out: broken
        near = {**GOOD, "true_peak": -1.6, "clipped": 3}
        r = qa.judge(transcript=GOOD["script"], **near)
        self.assertTrue(r["pass"], r["problems"])
        self.assertEqual(len(r["notes"]), 2)

    def test_accuracy_margin(self):
        self.assertEqual(qa.hard_accuracy(0.95), 0.9375)
        self.assertEqual(qa.hard_accuracy(0.90), 0.875)

    def test_spanish_bar_is_090(self):
        self.assertEqual(qa.ACCURACY["es"], 0.90)



class Mastering(unittest.TestCase):
    """20 Nov 2026: a hand-built gain -> limiter chain plus a re-encode loop left chapters at -18.1 LUFS
    and failures rose 54 -> 71. Mastering is two-pass loudnorm judged on the ENCODED file, re-mastered
    from the kept WAV; only a speech problem costs a new render."""
    PASS1 = """[Parsed_loudnorm_0 @ 0x1] \n{\n\t"input_i" : "-21.43",\n\t"input_tp" : "-3.10",\n\t"input_lra" : "6.20",
\t"input_thresh" : "-31.80",\n\t"output_i" : "-17.02",\n\t"output_tp" : "-2.01",\n\t"output_lra" : "5.90",
\t"output_thresh" : "-27.40",\n\t"normalization_type" : "dynamic",\n\t"target_offset" : "0.02"\n}\n"""

    def test_pass_two_applies_the_pass_one_measurement(self):
        m = fill.loudnorm_measured("size=N/A time=00:05:00\n" + self.PASS1)
        f = fill.loudnorm_filter(-17.0, -2.0, m)
        for part in ("loudnorm=I=-17.0", "TP=-2.0", f"LRA={fill.LRA}", "measured_I=-21.43", "measured_TP=-3.10",
                     "measured_LRA=6.20", "measured_thresh=-31.80", "offset=0.02", "linear=true"):
            self.assertIn(part, f)
        self.assertIn("print_format=json", fill.loudnorm_filter(-17.0, -2.0))
        with self.assertRaises(RuntimeError):
            fill.loudnorm_measured("no json here")

    def fake_ffmpeg(self, calls):
        def run(cmd, **k):
            calls.append(cmd)
            if fill.aac_encoder() in cmd and Path(cmd[-1]).parent.is_dir():
                Path(cmd[-1]).write_bytes(b"m4a")
            return mock.Mock(stderr=self.PASS1 if "null" in cmd else "", returncode=0)
        return run

    def test_encoded_file_out_of_bars_is_mastered_again_lower(self):
        calls = []
        got = iter([{"lufs": -17.0, "true_peak": -0.4}, {"lufs": -18.2, "true_peak": -1.3}, {"lufs": -17.1, "true_peak": -1.6}])
        r = fill.master(Path("in.wav"), Path("out.m4a"), "read", run=self.fake_ffmpeg(calls), measure=lambda p: next(got))
        encodes = [c for c in calls if fill.aac_encoder() in c]
        self.assertEqual((len(encodes), r["tries"]), (3, 3))
        self.assertTrue(all(c[c.index("-i") + 1] == "in.wav" for c in encodes))   # always from the kept WAV
        tps = [float(c[c.index("-af") + 1].split("TP=")[1].split(":")[0]) for c in encodes]
        self.assertTrue(tps[0] > tps[1], tps)
        self.assertEqual(tps[0], -2.0)
        i3 = float(encodes[2][encodes[2].index("-af") + 1].split("I=")[1].split(":")[0])
        self.assertGreater(i3, -17.0)   # the low loudness was corrected upward

    def test_one_master_when_the_encoded_file_is_inside(self):
        calls = []
        fill.master(Path("in.wav"), Path("out.m4a"), "sleep", run=self.fake_ffmpeg(calls),
                    measure=lambda p: {"lufs": -22.0, "true_peak": -3.0})
        self.assertEqual(len([c for c in calls if fill.aac_encoder() in c]), 1)

    def test_a_peak_that_keeps_missing_never_asks_loudnorm_below_its_range(self):
        # 22 Nov 2026: 7 of 12 cloud shards died on "Error applying option 'TP' to filter 'loudnorm':
        # Numerical result out of range": each miss lowered TP by the whole overshoot + 0.5, past -9.
        calls = []
        r = fill.master(Path("in.wav"), Path("out.m4a"), "read", run=self.fake_ffmpeg(calls),
                        measure=lambda p: {"lufs": -17.0, "true_peak": 8.0})
        tps = [float(c[c.index("-af") + 1].split("TP=")[1].split(":")[0]) for c in calls]
        self.assertTrue(all(-9.0 <= t <= 0.0 for t in tps), tps)   # ffmpeg -h filter=loudnorm: TP "from -9 to 0"
        self.assertEqual(r["tp"], fill.TP_FLOOR)
        encodes = [c for c in calls if fill.aac_encoder() in c]
        self.assertEqual(len(encodes), 2)      # at the floor nothing lower can be asked: qa.check judges that encode
        self.assertEqual(fill.tp_target(-14.2), -9.0)
        self.assertEqual(fill.tp_target(0.4), 0.0)

    @unittest.skipUnless(fill.shutil.which("ffmpeg"), "ffmpeg not installed")
    def test_ffmpeg_accepts_the_floor_and_refuses_below_it(self):
        def ask(tp):
            return fill.subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "lavfi", "-i", "sine=d=1",
                                        "-af", fill.loudnorm_filter(-17.0, tp), "-f", "null", "-"],
                                       capture_output=True, text=True, timeout=60)
        self.assertIn("input_i", ask(fill.TP_FLOOR).stderr)
        self.assertNotEqual(ask(fill.TP_FLOOR - 0.5).returncode, 0)   # the range is ffmpeg's, not ours

    def make(self, checks, louds):
        item = fill.plan(bibles())[2]
        calls, renders = [], []
        res = lambda probs: {"pass": not probs, "problems": probs, "accuracy": 0.97, "wpm": 100, "words": 10,
                             "lufs": -17.0, "true_peak": -1.5, "clipped": 0, "asr": "base", "seconds": 60.0}
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home, \
                mock.patch.object(fill, "HOME", Path(home)), \
                mock.patch.object(fill, "render", side_effect=lambda *a: (renders.append(a[3]), Path(a[2]).write_bytes(b"w"))), \
                mock.patch.object(fill.subprocess, "run", side_effect=self.fake_ffmpeg(calls)), \
                mock.patch.object(qa, "loudness", side_effect=louds), \
                mock.patch.object(qa, "check", side_effect=[res(p) for p in checks]):
            row = fill.make_one(item, {}, Path(d))
            self.assertFalse((Path(d) / "track.wav").exists())
            self.held = sorted(str(f.relative_to(home)) for f in Path(home).rglob("*") if f.is_file())
        return row, renders, [c for c in calls if fill.aac_encoder() in c]

    def test_a_minus_18_1_lufs_file_is_normalised_and_passes(self):
        # 21 Nov 2026: -18.1 LUFS against -18..-16 was thrown away. Now it is mastered again from the same
        # WAV toward -17 (two-pass loudnorm), and even a file left at -18.1 ships inside the margin.
        calls = []
        got = iter([{"lufs": -18.1, "true_peak": -1.5}, {"lufs": -17.0, "true_peak": -1.5}])
        r = fill.master(Path("in.wav"), Path("out.m4a"), "read", run=self.fake_ffmpeg(calls), measure=lambda p: next(got))
        self.assertEqual((r["tries"], r["lufs"]), (2, -17.0))
        left = qa.judge(script=GOOD["script"], transcript=GOOD["script"], lang="en", level="read", seconds=60.0,
                        lufs=-18.1, true_peak=-1.5, clipped=0)
        self.assertTrue(left["pass"], left["problems"])

    def test_a_wrong_verse_fails_and_is_held_not_deleted(self):
        wrong = "A01 word accuracy 0.9 < 0.95"
        row, renders, _ = self.make([[wrong], [wrong]], [{"lufs": -17.0, "true_peak": -1.5}] * 2)
        self.assertEqual((row["status"], len(renders)), ("FAILED", 2))
        self.assertTrue(row["held"].endswith(row["file"]))
        self.assertIn(f"held-audio/fill/{row['file']}", self.held)
        self.assertIn(f"held-audio/fill/{row['file']}.reason.json", self.held)

    def test_scripture_files_keep_the_strict_word_bar(self):
        near = dict(script=GOOD["script"], lang="en", level="read", seconds=60.0, lufs=-17.0, true_peak=-1.5, clipped=0)
        heard = GOOD["script"].replace("shepherd", "shepard", 5)   # a few words wrong: accuracy just under 0.95
        loose = qa.judge(transcript=heard, **near)
        strict = qa.judge(transcript=heard, strict_words=True, **near)
        self.assertLess(loose["accuracy"], 0.95)
        self.assertGreaterEqual(loose["accuracy"], qa.hard_accuracy(0.95))
        self.assertTrue(loose["pass"])          # a session line: ships with a note
        self.assertFalse(strict["pass"])        # a Bible chapter: a verse read wrong fails
        self.assertTrue(fill.is_scripture_file({"kind": "bible"}) and fill.is_scripture_file({"kind": "psalms"}))
        self.assertFalse(fill.is_scripture_file({"kind": "psalm-night"}))

    def test_no_file_starts_that_cannot_finish_before_0655(self):
        rows = [{"kind": "bible", "status": "passed", "work_s": 2550.0}]
        at = lambda h, m: dt.datetime(2026, 11, 23, h, m, tzinfo=fill.CT)
        self.assertFalse(fill.time_for({"kind": "bible"}, rows, at(6, 44)))   # 1 + 10 minutes left, 42 needed
        self.assertTrue(fill.time_for({"kind": "bible"}, rows, at(5, 0)))
        self.assertEqual(fill.expected_seconds("psalms", rows), 900.0)          # nothing measured yet: 15 minutes

    def test_a_held_copy_of_a_call_and_response_file_is_never_reused(self):
        item = {**fill.plan(bibles())[2], "marks": [1]}
        renders = []
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home, \
                mock.patch.object(fill, "HOME", Path(home)), \
                mock.patch.object(fill, "render", side_effect=lambda *a: (renders.append(a[3]), Path(a[2]).write_bytes(b"w"), {})[2]), \
                mock.patch.object(fill, "master", side_effect=lambda wav, out, level: (Path(out).write_bytes(b"m"), {"tries": 1, "i": -17.0, "tp": -2.0})[1]), \
                mock.patch.object(fill, "pause_starts", return_value=[]), \
                mock.patch.object(qa, "check", return_value={"pass": True, "problems": [], "notes": [], "accuracy": 0.97, "wpm": 100, "words": 10,
                                                             "lufs": -17.0, "true_peak": -1.5, "clipped": 0, "asr": "base", "seconds": 60.0}):
            src = Path(d) / "old.m4a"
            src.write_bytes(b"m4a")
            fill.hold(src, "fill", item["file"], fill.words_key(item), {"problems": []})
            fill.make_one(item, {}, Path(d))
            self.assertEqual(len(renders), 1)   # rendered again: its pause timings come from the render

    def test_a_held_file_is_rescued_by_a_recheck_without_a_render(self):
        item = fill.plan(bibles())[2]
        ok = {"pass": True, "problems": [], "notes": [], "accuracy": 0.97, "wpm": 100, "words": 10,
              "lufs": -18.1, "true_peak": -1.5, "clipped": 0, "asr": "base", "seconds": 60.0}
        renders = []
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home, \
                mock.patch.object(fill, "HOME", Path(home)), \
                mock.patch.object(fill, "render", side_effect=lambda *a: renders.append(a)), \
                mock.patch.object(qa, "check", return_value=ok):
            src = Path(d) / "old.m4a"
            src.write_bytes(b"m4a")
            fill.hold(src, "fill", item["file"], fill.words_key(item), {"problems": ["A06 loudness -18.1 LUFS outside (-18.0, -16.0)"]})
            row = fill.make_one(item, {}, Path(d))
            self.assertEqual((row["status"], renders), ("passed", []))
            self.assertIn("rescued", " ".join(row["checks"]["notes"]))
            self.assertTrue(Path(row["_local"]).exists())
            fill.release("fill", item["file"])
            self.assertEqual([f for f in Path(home).rglob("*") if f.is_file()], [])
            # A held copy of different words is never re-used.
            src.write_bytes(b"m4a")
            fill.hold(src, "fill", item["file"], "otherwords", {"problems": []})
            self.assertIsNone(fill.held_copy("fill", item["file"], fill.words_key(item)))

    def night(self, kind, lang, seconds):
        """make_one on a fixture night whose voiced length is `seconds` (each render): (row, render speeds)."""
        folder = {"psalm-night": "psalm-nights", "imagination-night": "imagination-nights"}[kind]
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "content" / folder / lang).mkdir(parents=True)
            (Path(d) / "content" / folder / lang / "x.json").write_text(json.dumps({
                "id": "x", "kind": kind, "lang": lang, "title": "Night", "status": "passed",
                "segments": [{"part": "welcome", "text": "Welcome. [pause 8]"}, {"part": "rest", "text": "Rest now. [pause 20]"}]}))
            [item] = fill.content_items(Path(d))
        renders = []
        res = {"pass": True, "problems": [], "accuracy": 0.98, "wpm": 114, "words": 700, "lufs": -22.0,
               "true_peak": -3.0, "clipped": 0, "asr": "base", "seconds": seconds}
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(fill, "render", side_effect=lambda *a: (renders.append(a[3]), Path(a[2]).write_bytes(b"w"))), \
                mock.patch.object(fill.subprocess, "run", side_effect=self.fake_ffmpeg([])), \
                mock.patch.object(qa, "loudness", return_value={"lufs": -22.0, "true_peak": -3.0}), \
                mock.patch.object(qa, "check", return_value=res):
            return fill.make_one(item, {}, Path(d)), renders

    def test_a_truncated_night_is_rendered_slower_once_then_held(self):
        """Her ruling 21 Nov 2026: the floor (75% of the target's low end) catches broken output, e.g. a 6-min file."""
        for kind, lang, floor in (("psalm-night", "en", 585), ("imagination-night", "es", 810)):
            row, renders = self.night(kind, lang, 360.0)
            self.assertEqual(renders, [fill.SPEED, fill.RETRY_SPEED], kind)
            self.assertEqual(row["status"], "FAILED", kind)
            self.assertTrue(any(f"under the {floor}s floor" in p for p in row["checks"]["problems"]), row["checks"])

    def test_a_short_night_above_the_floor_ships_once_with_a_short_note(self):
        """A 12-min Psalm Night and the 17.6-min Spanish sample are not broken: shipped, never re-rendered or held."""
        for kind, lang, seconds, target in (("psalm-night", "en", 720.0, 780), ("imagination-night", "es", 1055.0, 1080)):
            row, renders = self.night(kind, lang, seconds)
            self.assertEqual((renders, row["status"]), ([fill.SPEED], "passed"), kind)
            self.assertEqual(row["checks"]["problems"], [])
            self.assertEqual(row["checks"]["notes"], [f"SHORT {seconds:.0f}s voiced is under the {target}s target"])
        row, _ = self.night("psalm-night", "en", 800.0)
        self.assertNotIn("notes", row["checks"])

    def test_a_story_row_records_where_its_call_and_response_pauses_start(self):
        with tempfile.TemporaryDirectory() as d:
            Stories().story(Path(d))
            [item] = fill.content_items(Path(d))
        segs = fill.segments_of(item, {})
        ends = [2.0 * (n + 1) for n in range(len(segs))]
        def fake_render(it, pron, wav, speed):
            Path(wav).write_bytes(b"w")
            return {"seconds": 99.0, "ends": ends, "segs": fill.segments_of(it, pron)}
        res = {"pass": True, "problems": [], "accuracy": 0.97, "wpm": 100, "words": 60, "lufs": -22.0,
               "true_peak": -3.0, "clipped": 0, "asr": "base", "seconds": 99.0}
        with tempfile.TemporaryDirectory() as d, mock.patch.object(fill, "render", side_effect=fake_render), \
                mock.patch.object(fill.subprocess, "run", side_effect=self.fake_ffmpeg([])), \
                mock.patch.object(qa, "loudness", return_value={"lufs": -22.0, "true_peak": -3.0}), \
                mock.patch.object(qa, "check", return_value=res) as chk:
            row = fill.make_one(item, {}, Path(d))
        marked = [n for n, sg in enumerate(segs) if sg.get("mark")]
        self.assertEqual(row["checks"]["pause_starts_s"], [ends[n] for n in marked])
        self.assertEqual(row["checks"]["pauses_s"], [3.0, 3.0])
        self.assertEqual((row["kind"], row["lang"], row["voice"]), ("stories", "es", fill.VOICE["es"]["id"]))
        self.assertGreaterEqual(chk.call_args.kwargs["quiet"], 6.0)


    def test_mastering_miss_is_mastered_again_never_rendered_again(self):
        ok = {"lufs": -17.0, "true_peak": -1.5}
        row, renders, encodes = self.make([[]], [{"lufs": -17.0, "true_peak": -0.2}, ok])
        self.assertEqual((len(renders), len(encodes), row["status"]), (1, 2, "passed"))
        row, renders, _ = self.make([["A06 loudness -22.0 LUFS outside (-18.0, -16.0)"]], [ok])
        self.assertEqual((len(renders), row["status"]), (1, "FAILED"))

    def test_speech_miss_is_rendered_again_slower(self):
        ok = {"lufs": -17.0, "true_peak": -1.5}
        row, renders, _ = self.make([["A01 word accuracy 0.9 < 0.95"], []], [ok, ok])
        self.assertEqual(renders, [fill.SPEED, fill.RETRY_SPEED])
        self.assertEqual((row["status"], row["attempts"]), ("passed", 2))

    def test_speech_problems_leave_out_mastering(self):
        self.assertEqual(qa.speech_problems(["A06 true peak -0.5 dBTP > -1.0", "A07 the last words are not in the transcript",
                                             "length 9s for 100 words = 600 wpm, outside (55.0, 150.0)"]),
                         ["A07 the last words are not in the transcript", "length 9s for 100 words = 600 wpm, outside (55.0, 150.0)"])


if __name__ == "__main__":
    unittest.main()


class CloudChain(unittest.TestCase):
    def test_the_launch_size_follows_the_central_clock(self):
        at = lambda h, m: dt.datetime(2026, 11, 22, h, m, tzinfo=fill.CT)
        self.assertEqual(fill.cloud_slots(at(21, 59)), ("day", 10))
        self.assertEqual(fill.cloud_slots(at(22, 0)), ("night", 16))
        self.assertEqual(fill.cloud_slots(at(3, 0)), ("night", 16))
        self.assertEqual(fill.cloud_slots(at(6, 59)), ("night", 16))
        self.assertEqual(fill.cloud_slots(at(7, 0)), ("day", 10))
        self.assertEqual(fill.cloud_slots(dt.datetime(2026, 11, 22, 4, 0, tzinfo=dt.timezone.utc)), ("night", 16))  # 22:00 CT
        self.assertEqual({fill.cloud_slots(at(h, 0)) for h in range(24)}, {("day", 10), ("night", 16)})
        wf = (AUDIO.parent / ".github/workflows/fill-cloud.yml").read_text()
        self.assertIn("--cloud-slots", wf)

    def test_a_manifest_push_is_checked_by_ci(self):
        # 22 Nov 2026: gather pushes rows with the job token, which starts no CI run, and 132 Spanish rows
        # turned main red unseen. Gather dispatches CI on main after a push that wrote rows.
        root = AUDIO.parent / ".github/workflows"
        gather = (root / "fill-cloud.yml").read_text().split("\n  gather:", 1)[1]
        self.assertRegex(gather, r"gh workflow run ci\.yml [^\n]*--ref main")
        self.assertRegex((root / "ci.yml").read_text().split("jobs:", 1)[0], r"\n  workflow_dispatch:")

    def test_a_chapter_that_crashes_is_held_and_the_shard_goes_on(self):
        items = fill.plan(bibles())[:3]
        tried = []
        def make_one(item, pron, work):
            tried.append(item["file"])
            if len(tried) == 1:
                raise RuntimeError("loudnorm pass 1 printed no measurement: Error applying option 'TP'")
            raise fill.subprocess.CalledProcessError(1, ["ffmpeg"])
        with tempfile.TemporaryDirectory() as home:
            man = Path(home) / "manifest.jsonl"; man.write_text("")
            read, upsert = fill.read_manifest, fill.upsert_row      # their path defaults are bound to the real manifest
            with mock.patch.object(fill, "HOME", Path(home)), mock.patch.object(fill, "MANIFEST", man), \
                    mock.patch.object(fill, "read_manifest", lambda path=man: read(path)), \
                    mock.patch.object(fill, "upsert_row", lambda row, path=man: upsert(row, path)), \
                    mock.patch.object(fill, "LANE", "cloud"), mock.patch.object(fill, "lane_of", lambda i, c=None: "cloud"), \
                    mock.patch.object(fill, "plan", lambda *a: items), mock.patch.object(fill, "content_items", lambda r: []), \
                    mock.patch.object(fill.T, "load_bible", lambda lang: [None] * 66), \
                    mock.patch.object(fill.T, "load_pronunciations", lambda: {}), \
                    mock.patch.object(fill, "drive_reachable", lambda *a: None), mock.patch.object(fill, "make_one", make_one), \
                    mock.patch.dict(fill.os.environ, {"PBS_NO_MORNING": "1"}):
                (Path(home) / "library-fill.active").write_text("{}")
                rc = fill.main([])
                rows = read(man)
            self.assertEqual(tried, [i["file"] for i in items])           # the shard went on past each crash
            self.assertEqual([r["status"] for r in rows], ["FAILED"] * 3)
            self.assertTrue(all(r["checks"]["problems"][0].startswith("CRASH ") for r in rows))
            self.assertTrue(all(r["tries"] == 1 for r in rows))              # a crash uses a try: never an endless loop
            self.assertEqual(rc, 9)                                          # NOTHING_SHELVED, the existing stop
            self.assertTrue((Path(home) / "library-fill.active").exists())   # the fill never removes the marker
        import check_manifest
        self.assertEqual(check_manifest.problems(rows, (AUDIO / "VOICES.md").read_text()), [])   # a valid FAILED row

    def test_a_batch_that_wrote_no_rows_never_starts_another(self):
        # A batch where every job hit a named stop must not loop round the clock: the chain step runs only
        # when the gather step counted at least one row, and that count starts at 0 before any push.
        wf = (AUDIO.parent / ".github/workflows/fill-cloud.yml").read_text()
        gather = wf[wf.index("id: g"):]
        self.assertLess(gather.index('echo "rows=0"'), gather.index("--push-rows"))
        chain = wf[wf.index("Start the next batch"):]
        cond = chain[chain.index("if:"):chain.index("\n", chain.index("if:"))]
        self.assertIn("steps.g.outputs.rows != '0'", cond)
        self.assertIn("steps.g.outputs.rows != ''", cond)
