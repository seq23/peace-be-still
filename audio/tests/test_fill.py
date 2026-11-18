"""Behaviour of the library fill that runs without audio: plan order, resume, census, the active
flag, the spoken text and the pass/fail bars. Run: python3 -m unittest discover -s audio/tests"""
import datetime as dt
import json
import sys
import tempfile
import unittest
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

    def test_resume_skips_passed_and_failed(self):
        items = fill.plan(bibles())
        rows = [{"file": items[0]["file"], "status": "passed"}, {"file": items[1]["file"], "status": "FAILED"}]
        self.assertEqual([i["file"] for i in fill.todo(items, rows)][:1], [items[2]["file"]])
        self.assertEqual(len(fill.todo(items, rows)), len(items) - 2)

    def test_census_counts_and_completion(self):
        items = fill.plan(bibles())
        rows = [{"file": i["file"], "status": "passed", "seconds": 360} for i in items[:-1]]
        c = fill.census(items, rows)
        self.assertEqual((c["passed"], c["total"], c["complete"]), (7, 8, False))
        rows.append({"file": items[-1]["file"], "status": "FAILED"})
        c = fill.census(items, rows)
        self.assertTrue(c["complete"])
        self.assertEqual(fill.census_line(c), "library fill: 7 of 8 files, 0.7 hours shelved, 1 failed")

    def test_empty_plan_is_never_complete(self):
        self.assertFalse(fill.census([], [])["complete"])


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


if __name__ == "__main__":
    unittest.main()
