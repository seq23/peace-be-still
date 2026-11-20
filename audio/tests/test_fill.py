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
import qa  # noqa: E402
import text as T  # noqa: E402

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
    def test_never_in_her_workday_and_a_batch_ends_by_eight(self):
        at = lambda d, h, m=0: dt.datetime(2026, 11, d, h, m, tzinfo=fill.CT)   # 23 Nov 2026 is a Monday
        self.assertEqual(fill.window_minutes(at(23, 12)), 0)            # Mon noon: no run
        self.assertEqual(fill.window_minutes(at(23, 8)), 0)
        self.assertEqual(fill.window_minutes(at(23, 16, 59)), 0)
        self.assertEqual(fill.window_minutes(at(23, 7, 30)), 30)        # Mon 07:30: at most 30 minutes
        self.assertEqual(fill.window_minutes(at(23, 17)), 15 * 60)      # Mon 17:00 -> Tue 08:00
        self.assertEqual(fill.window_minutes(at(21, 12)), 44 * 60)      # Sat noon runs, until Mon 08:00
        self.assertEqual(fill.window_minutes(at(20, 17)), 63 * 60)      # Fri 17:00 -> Mon 08:00


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
    def test_written_while_incomplete_and_removed_when_done(self):
        items = fill.plan(bibles())
        with tempfile.TemporaryDirectory() as d:
            flag = Path(d) / "library-fill.active"
            self.assertFalse(fill.settle_active(flag, items, [], NOW))
            body = json.loads(flag.read_text())
            self.assertTrue(body["started"] and body["reason"])
            later = NOW + dt.timedelta(hours=3)
            fill.settle_active(flag, items, [], later)
            self.assertEqual(json.loads(flag.read_text())["started"], body["started"])  # start kept
            rows = [{"file": i["file"], "status": "passed"} for i in items]
            self.assertTrue(fill.settle_active(flag, items, rows, later))
            self.assertFalse(flag.exists())

    def test_expected_end_from_measured_speed(self):
        items = fill.plan(bibles())
        rows = [{"file": items[0]["file"], "status": "passed", "work_s": 100, "checks": {"words": 100}}]
        end = fill.expected_end(items, rows, NOW)
        left = sum(len(T.score_words(fill.script_of(i), i["lang"])) for i in items[1:])
        self.assertEqual(end, NOW + dt.timedelta(seconds=left))


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


class Bars(unittest.TestCase):
    def test_good_track_passes(self):
        r = qa.judge(transcript=GOOD["script"], **GOOD)
        self.assertTrue(r["pass"], r["problems"])

    def test_each_fault_fails(self):
        cases = {
            "A01": dict(transcript="The Lord is my " * 10),
            "A07": dict(transcript=GOOD["script"].rsplit(" ", 3)[0]),
            "A06 loudness": dict(transcript=GOOD["script"], lufs=-16.0),
            "true peak": dict(transcript=GOOD["script"], true_peak=-0.5),
            "clipped": dict(transcript=GOOD["script"], clipped=3),
            "length": dict(transcript=GOOD["script"], seconds=600.0),
        }
        for name, over in cases.items():
            r = qa.judge(**{**GOOD, **over})
            self.assertFalse(r["pass"], name)
            self.assertTrue(any(name.split()[0] in p for p in r["problems"]), (name, r["problems"]))

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
            if "aac_at" in cmd and Path(cmd[-1]).parent.is_dir():
                Path(cmd[-1]).write_bytes(b"m4a")
            return mock.Mock(stderr=self.PASS1 if "null" in cmd else "", returncode=0)
        return run

    def test_encoded_file_out_of_bars_is_mastered_again_lower(self):
        calls = []
        got = iter([{"lufs": -17.0, "true_peak": -0.4}, {"lufs": -18.2, "true_peak": -1.3}, {"lufs": -17.1, "true_peak": -1.6}])
        r = fill.master(Path("in.wav"), Path("out.m4a"), "read", run=self.fake_ffmpeg(calls), measure=lambda p: next(got))
        encodes = [c for c in calls if "aac_at" in c]
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
        self.assertEqual(len([c for c in calls if "aac_at" in c]), 1)

    def make(self, checks, louds):
        item = fill.plan(bibles())[2]
        calls, renders = [], []
        res = lambda probs: {"pass": not probs, "problems": probs, "accuracy": 0.97, "wpm": 100, "words": 10,
                             "lufs": -17.0, "true_peak": -1.5, "clipped": 0, "asr": "base", "seconds": 60.0}
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(fill, "render", side_effect=lambda *a: (renders.append(a[3]), Path(a[2]).write_bytes(b"w"))), \
                mock.patch.object(fill.subprocess, "run", side_effect=self.fake_ffmpeg(calls)), \
                mock.patch.object(qa, "loudness", side_effect=louds), \
                mock.patch.object(qa, "check", side_effect=[res(p) for p in checks]):
            row = fill.make_one(item, {}, Path(d))
            self.assertFalse((Path(d) / "track.wav").exists())
        return row, renders, [c for c in calls if "aac_at" in c]

    def test_mastering_miss_is_mastered_again_never_rendered_again(self):
        ok = {"lufs": -17.0, "true_peak": -1.5}
        row, renders, encodes = self.make([[]], [{"lufs": -17.0, "true_peak": -0.2}, ok])
        self.assertEqual((len(renders), len(encodes), row["status"]), (1, 2, "passed"))
        row, renders, _ = self.make([["A06 loudness -18.1 LUFS outside (-18.0, -16.0)"]], [ok])
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
