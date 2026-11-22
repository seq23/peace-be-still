"""Clone lane behaviour without audio engines: the plan, the lane order, one engine per story, the
floors. Run: python3 -m unittest discover -s audio/tests"""
import json
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AUDIO))
sys.path.insert(0, str(AUDIO / "lib"))
import hush_clone as C  # noqa: E402
import hush_harbor as H  # noqa: E402
import memguard  # noqa: E402

memguard.MORNING_FLAG = Path(tempfile.gettempdir()) / "pbs-test-no-morning-window"   # the real flag never steers a test


class Clone(unittest.TestCase):
    def test_plan_keeps_every_word_and_the_pauses(self):
        for s in H.load_stories():
            p = C.plan(s)
            self.assertEqual([x["silence"] for x in p if "silence" in x], [3.0, 3.0], s["id"])
            said = " ".join(t for x in p for t in x.get("sentences", []))
            self.assertEqual(said.split(), H.spoken(s).split(), s["id"])

    def test_lanes_never_meet(self):
        stories = H.load_stories()
        self.assertEqual(C.lane_order(stories)[0]["id"], max(s["id"] for s in stories))
        self.assertEqual(H.todo(stories, [])[0]["id"], min(s["id"] for s in stories))
        retry = [{"file": H.row_file(stories[0]), "status": "FAILED"}]
        self.assertEqual(C.lane_order(H.todo(stories, retry), retry)[0]["id"], stories[0]["id"])  # a retry goes first

    def test_one_engine_per_story(self):
        with tempfile.TemporaryDirectory() as d:
            w = Path(d)
            self.assertFalse(H.taken_by_clone(w))
            (w / "engine").write_text("clone")
            self.assertTrue(H.taken_by_clone(w))
            (w / "engine").write_text("gemini")
            self.assertFalse(H.taken_by_clone(w))

    def test_floors_sit_between_the_test_and_the_other_voices(self):
        cl = H.VOICES["clone"]
        for r, f in cl["floor"].items():
            self.assertLess(f, cl["test_scores"]["new"][r])
            self.assertGreater(f, cl["test_scores"]["other"][r])
        self.assertTrue(C.turn_ok("elder", 0.9))
        self.assertFalse(C.turn_ok("elder", 0.8))
        # The margin rule: just under the measured floor ships with a note; well under it fails.
        f = cl["floor"]["grandmother"]
        self.assertTrue(C.turn_ok("grandmother", f - 0.01))
        self.assertFalse(C.turn_ok("grandmother", C.similarity_floor("grandmother") - 0.001))
        self.assertGreater(C.similarity_floor("grandmother"), cl["test_scores"]["other"]["grandmother"])

    def test_similarity_is_never_judged_on_a_short_line_alone(self):
        """20 Nov 2026: every similarity miss (16 of 16 on 18-19 Nov) was a 2-6 word turn; the passing
        test clip itself scores 0.78-0.85 on 2 s slices. Short turns of a role are pooled to MIN_SIM_S."""
        M = C.MIN_SIM_S
        groups, un = C.sim_groups([(0, "grandmother", M + 4), (2, "grandmother", 1.5), (3, "elder", 2.0),
                                   (4, "grandmother", 2.0), (6, "grandmother", M - 1), (8, "young_man", 2.5)])
        self.assertIn([0], groups)
        self.assertIn([2, 4, 6], groups)
        self.assertEqual(un, {"elder": 2.0, "young_man": 2.5})
        groups, un = C.sim_groups([(0, "grandmother", M + 1), (2, "grandmother", 2.0)])
        self.assertEqual((groups, un), ([[0, 2]], {}))   # a short remainder joins the role's last group
        for g in C.sim_groups([(i, "elder", 1.0) for i in range(20)])[0]:
            self.assertGreaterEqual(len(g) * 1.0, M)

    def test_time_box_stops_the_story_and_keeps_its_work(self):
        from unittest import mock
        story = H.load_stories()[0]
        with tempfile.TemporaryDirectory() as d, mock.patch.object(C, "refs", return_value={r: Path(d) / "r.wav" for r in H.VOICES["roles"]}), \
                mock.patch.object(C.subprocess, "run", return_value=mock.Mock(returncode=0)) as run:
            self.assertIsNone(C.make_story(story, Path(d) / "w", deadline=0.0))
            self.assertEqual(json.loads(run.call_args.kwargs["input"])["deadline"], 0.0)
            self.assertEqual((Path(d) / "w" / "engine").read_text(), "clone")

    def test_sentence_check(self):
        self.assertTrue(C.sentence_ok("And he arose, and rebuked the wind.", "and he arose and rebuked the wind"))
        self.assertTrue(C.sentence_ok("Go, return.", "go return now"))
        self.assertFalse(C.sentence_ok("And he arose, and rebuked the wind.", "and the wind"))

    def test_margin_for_retelling_never_for_scripture(self):
        # Two words off in a short retelling line (a name heard as another word): a near-miss that ships.
        line, heard = "Naaman Dips Seven Times.", "neiman dipped seven times"
        self.assertEqual(C.sentence_verdict(line, heard), "near")
        self.assertTrue(C.sentence_ok(line, heard))
        # The same miss inside a quoted verse stays a fail: a verse read wrong is always broken.
        self.assertEqual(C.sentence_verdict(line, heard, scripture=True), "bad")
        # Far off is broken anywhere.
        self.assertEqual(C.sentence_verdict("Church, Naaman had everything he could want.", "church"), "bad")

    def test_every_quoted_verse_sentence_in_every_story_is_scripture(self):
        # The review found 15 long verse sentences and every short one missed by the first version.
        missed = []
        for story in H.load_stories():
            verses = C.scripture_words(story)
            for step in C.plan(story):
                for sent in step.get("sentences", []):
                    in_verse = any(sent.strip() and sent.strip() in sg["text"] for b in story["blocks"] if b["type"] == "scripture" for sg in b["segments"])
                    if in_verse and C.T.score_words(sent, "en") and not C.is_scripture(sent, verses):
                        missed.append((story["id"], sent[:50]))
        self.assertEqual(missed, [])
        story = next(s for s in H.load_stories() if any(b["type"] == "scripture" for b in s["blocks"]))
        self.assertFalse(C.is_scripture("Grandmother pulled the quilt up and smiled at the children.", C.scripture_words(story)))

    def test_a_story_the_gemini_lane_started_joins_the_clone_queue(self):
        stories = H.load_stories()
        with tempfile.TemporaryDirectory() as d, mock.patch.object(C.fill, "HOME", Path(d)):
            w = Path(d) / "hh-work" / stories[0]["id"]
            w.mkdir(parents=True)
            (w / "engine").write_text("gemini")
            queue = C.lane_order(H.todo(stories, []), [])
            self.assertIn(stories[0]["id"], [s["id"] for s in queue])

    def test_a_held_story_is_rescued_only_while_its_words_match(self):
        story = H.load_stories()[0]
        ok = {"pass": True, "problems": [], "notes": [], "accuracy": 0.97, "wpm": 120, "words": 300,
              "lufs": -22.0, "true_peak": -3.0, "clipped": 0, "asr": "base", "seconds": 300.0}
        with tempfile.TemporaryDirectory() as d, mock.patch.object(C.fill, "HOME", Path(d)), \
                mock.patch.object(C.qa, "check", return_value=ok), \
                mock.patch.object(C, "render", side_effect=AssertionError("no render for a rescue")):
            src = Path(d) / "s.m4a"
            src.write_bytes(b"m4a")
            C.fill.hold(src, "clone", H.row_file(story), C.story_key(story), {"problems": ["A06 loudness"]})
            row = C.make_story(story, Path(d) / "hh-work" / story["id"])
            self.assertEqual(row["status"], "passed")
            self.assertIn("rescued", " ".join(row["checks"]["notes"]))
            # The script changed: the held copy is never re-used.
            changed = {**story, "title": story["title"] + " (revised)"}
            self.assertNotEqual(C.story_key(changed), C.story_key(story))
            self.assertIsNone(C.fill.held_copy("clone", H.row_file(story), C.story_key(changed)))


if __name__ == "__main__":
    unittest.main()
