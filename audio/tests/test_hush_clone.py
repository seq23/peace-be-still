"""Clone lane behaviour without audio engines: the plan, the lane order, one engine per story, the
floors. Run: python3 -m unittest discover -s audio/tests"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AUDIO))
sys.path.insert(0, str(AUDIO / "lib"))
import hush_clone as C  # noqa: E402
import hush_harbor as H  # noqa: E402


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
            self.assertIsNone(C.engine_of(w))
            self.assertFalse(H.taken_by_clone(w))
            (w / "engine").write_text("clone")
            self.assertTrue(H.taken_by_clone(w))
            (w / "engine").write_text("gemini")
            self.assertEqual(C.engine_of(w), "gemini")
            self.assertFalse(H.taken_by_clone(w))

    def test_floors_sit_between_the_test_and_the_other_voices(self):
        cl = H.VOICES["clone"]
        for r, f in cl["floor"].items():
            self.assertLess(f, cl["test_scores"]["new"][r])
            self.assertGreater(f, cl["test_scores"]["other"][r])
        self.assertTrue(C.turn_ok("elder", 0.9))
        self.assertFalse(C.turn_ok("elder", 0.8))

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
        self.assertEqual(C.sentences("One. Two? Three!"), ["One.", "Two?", "Three!"])


if __name__ == "__main__":
    unittest.main()
