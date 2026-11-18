"""Clone lane behaviour without audio engines: the plan, the lane order, one engine per story, the
floors. Run: python3 -m unittest discover -s audio/tests"""
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

    def test_sentence_check(self):
        self.assertTrue(C.sentence_ok("And he arose, and rebuked the wind.", "and he arose and rebuked the wind"))
        self.assertTrue(C.sentence_ok("Go, return.", "go return now"))
        self.assertFalse(C.sentence_ok("And he arose, and rebuked the wind.", "and the wind"))
        self.assertEqual(C.sentences("One. Two? Three!"), ["One.", "Two?", "Three!"])


if __name__ == "__main__":
    unittest.main()
