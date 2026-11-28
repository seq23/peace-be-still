"""The 32 files held on 24 Nov 2026 (13 Bible name-list chapters, 19 Hush Harbor stories): why they failed,
and the fix (judge r2), without audio engines. The bars themselves never move: the judge is told every name
of a long chapter by its own part, two-letter and hyphenated names, and the KJV's spellings of the same
sound; the voices are given respelled names. Run: python3 -m unittest discover -s audio/tests"""
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
import hush_harbor as H  # noqa: E402
import qa  # noqa: E402
import text as T  # noqa: E402

FIX = AUDIO / "tests/fixtures"
_BIBLES = {}


def real_items() -> dict:
    if not _BIBLES:
        _BIBLES.update({l: T.load_bible(l) for l in ("en", "es")})
    return {i["file"]: i for i in fill.plan(_BIBLES)}


def timed(item: dict, sentences: bool = False, pron: dict | None = None):
    """Segments and renderer-style speech ends (a steady 15 letters a second; the gaps are the real ones)."""
    segs = fill.segments_of(item, pron if pron is not None else T.load_pronunciations(), sentences)
    t, ends = 0.6, []
    for s in segs:
        t += len(s["text"]) / 15
        ends.append(round(t, 3))
        t += s["gap"]
    return segs, ends


class TheBarsNeverMoved(unittest.TestCase):
    def test_every_threshold_is_the_one_the_32_failed_against(self):
        # The fix is never a lower bar: these are the values in the 24 Nov 2026 reason files.
        self.assertEqual(qa.ACCURACY, {"en": 0.95, "es": 0.90})
        self.assertEqual((qa.LU_MARGIN, qa.TP_MARGIN, qa.CLIP_MAX, qa.ACC_MARGIN, qa.WPM_HARD), (2.5, 1.0, 25, 0.25, (41.25, 187.5)))
        self.assertEqual((qa.hard_accuracy(0.95), qa.hard_accuracy(0.90)), (0.9375, 0.875))
        self.assertEqual((qa.NAME_LIKE, qa.HINT_NAMES, qa.JUDGE_MODEL), (0.8, 60, "large-v3-turbo"))
        self.assertEqual((H.CALL_BAR, C.MAX_TRIES, fill.MAX_TRIES, fill.ROUTES), (0.95, 3, 3, ("verses", "sentences")))
        self.assertEqual(qa.BARS["read"], {"lufs": (-18.0, -16.0), "tp_max": -1.0})
        # A Bible chapter keeps the strict bar: 0.949 fails, with no margin.
        good = dict(script="a b c", lang="en", level="read", seconds=2.0, lufs=-17.0, true_peak=-2.0, clipped=0)
        with mock.patch.object(qa, "accuracy", return_value=0.949):
            self.assertFalse(qa.judge(transcript="a b c", strict_words=True, **good)["pass"])

    def test_a_new_judge_name_so_the_held_files_are_tried_again(self):
        self.assertEqual(fill.judge_now(), "large-v3-turbo r2")
        self.assertNotEqual(fill.judge_now(), qa.JUDGE_MODEL)   # the 24 Nov rows say "large-v3-turbo"


class TheSameSoundInAnotherSpelling(unittest.TestCase):
    def test_the_hush_harbor_misses_were_spellings_and_the_real_misses_still_fail(self):
        """The 28 sentences that held 19 stories, heard by the judge from their kept takes (fixture). A spelling
        of the same sound now passes; a different sound (thee/the, man/men, call/called ...) still fails."""
        fx = json.loads((FIX / "held-hush-harbor-2026-11-24.json").read_text("utf-8"))["sentences"]
        stories = {s["id"]: s for s in H.load_stories()}
        got = {}
        for x in fx:
            story = stories[x["story"]]
            said = C.plan(story)[x["turn"]]["sentences"][x["sentence"]]
            got[(x["story"], x["turn"], x["sentence"])] = (
                C.sentence_verdict(said, x["heard"], C.is_scripture(said, C.scripture_words(story))), x["expect"], x["why"])
        wrong = {k: v for k, v in got.items() if v[0] != v[1]}
        self.assertEqual(wrong, {})
        self.assertEqual(sum(v[1] == "ok" for v in got.values()), 19)
        self.assertEqual(sum(v[1] == "bad" for v in got.values()), 9)

    def test_spellings_match_but_a_missing_or_different_word_never_does(self):
        same = [("mighty man of valour", "Mighty Man of Valor"), ("all thy neighbours", "all thy neighbors"),
                ("well favoured", "well-favored"), ("they bare it", "they bear it"), ("O my Lord", "Oh my Lord"),
                ("Talitha cumi", "Talitha Kumi"), ("for nought", "for naught"), ("shouldest thou", "shouldst thou"),
                ("borne of four", "born of four"), ("a cruse of water", "a cruise of water"), ("enquired of them", "inquired of them"),
                ("more subtil than", "more subtle than"), ("was straitly shut", "was straightly shut"), ("they rowed hard", "they rode hard"),
                ("what doest thou here", "what doest thou hear"), ("and they two went on", "and they too went on")]
        for a, b in same:
            self.assertEqual(T.score_words(a, "en"), T.score_words(b, "en"), (a, b))
        differ = [("borrow thee vessels", "borrow the vessels"), ("mighty man", "mighty men"), ("they call the", "they called the"),
                  ("ever wont to", "ever want to"), ("eyes were holden", "eyes were holding"), ("a cake baken", "a cake baking"),
                  ("our father", "or father"), ("four days", "for days"), ("they bare it", "they it"), ("an hour", "an or")]
        for a, b in differ:
            self.assertNotEqual(T.score_words(a, "en"), T.score_words(b, "en"), (a, b))

    def test_eleven_hundred_is_the_number_a_transcript_writes_as_digits(self):
        self.assertEqual(T.score_words("Eleven hundred pieces of silver", "en"), T.score_words("1,100 pieces of silver", "en"))
        self.assertEqual(T.score_words("twenty five hundred", "en"), T.score_words("2500", "en"))
        self.assertEqual(T.score_words("seven hundred", "en"), T.score_words("700", "en"))
        self.assertNotEqual(T.score_words("eleven hundred", "en"), T.score_words("1,200", "en"))
        self.assertEqual(T.score_words("eleven men", "en"), ["eleven", "men"])


class NamesTheJudgeIsTold(unittest.TestCase):
    def test_two_letter_and_hyphenated_names(self):
        self.assertIn("uz", T.names("Job lived in the land of Uz.", "en"))
        self.assertIn("Uz", qa.hint("Job lived in the land of Uz.", "en"))
        n = T.names("the son of Ammiel, from Lo-debar.", "en")
        self.assertEqual(n.get("lodebar"), "Lo-debar")
        s = "fetched him out of the house of Machir, the son of Ammiel, from Lo-debar."
        self.assertEqual(qa.accuracy(s, "fetched him out of the house of Machir, the son of Ammiel, from Lodibar.", "en"), 1.0)
        # The name rule only: a name heard as other words, or a lower-case word pair, is never forgiven.
        self.assertLess(qa.accuracy(s, "fetched him out of the house of Machir, the son of Ammiel, from lo the bar.", "en"), 1.0)
        self.assertLess(qa.accuracy("he was tender-eyed", "he was tenderized", "en"), 1.0)

    def test_every_name_of_a_name_list_chapter_reaches_the_judge(self):
        """1 Chronicles 1 has 182 names; one hint carries 60. Parts of whole verses carry them all."""
        item = real_items()["en/bible/kjv-1ch-001.m4a"]
        script = fill.script_of(item)
        everyone = set(T.names(script, "en").values())
        self.assertGreater(len(everyone), 150)
        self.assertLess(len(set(qa.hint(script, "en").split())), len(everyone) / 2)   # the old single hint
        for sentences in (False, True):
            segs, ends = timed(item, sentences)
            parts = fill.parts_of(item, segs, ends)
            self.assertGreater(len(parts), 3)
            self.assertEqual(" ".join(w for _, _, w in parts), script)            # every word, once, in order
            told = set(" ".join(qa.hint(w, "en") for _, _, w in parts).split())
            self.assertEqual(everyone - told, set())
            for (a, b, w), nxt in zip(parts, parts[1:]):
                self.assertEqual(b, nxt[0])                                        # no audio lost between parts
                self.assertLessEqual(len(T.names(w, "en")), qa.HINT_NAMES)
            # each cut is in the quiet after a verse, never inside speech
            speech = [(e - len(s["text"]) / 15, e) for s, e in zip(segs, ends)]
            for _, b, _ in parts[:-1]:
                self.assertFalse(any(a < b < e for a, e in speech), b)

    def test_a_short_chapter_is_heard_whole_as_before(self):
        item = real_items()["en/psalms/kjv-psa-023.m4a"]
        segs, ends = timed(item)
        self.assertEqual(len(fill.parts_of(item, segs, ends)), 1)
        self.assertIsNone(fill.parts_of(item, segs, ends[:-1]))   # timings that do not fit: heard whole

    def test_each_part_is_heard_told_its_own_names(self):
        import numpy as np
        calls = []

        class Seg:
            def __init__(self, t):
                self.text = t

        class M:
            def transcribe(self, audio, **k):
                calls.append((len(audio), k["hotwords"]))
                return [Seg(f"part{len(calls)}")], None
        loud = np.full(16000 * 10, 0.1, dtype=np.float32)
        parts = [(0.0, 4.0, "And Adah bare to Esau Eliphaz."), (4.0, 3600.0, "and Anah the daughter of Zibeon.")]
        with mock.patch.dict(qa._MODELS, {qa.JUDGE_MODEL: M()}), mock.patch.object(qa, "decode", return_value=loud):
            self.assertEqual(qa.transcribe(Path("x.m4a"), "en", "ignored", parts), "part1 part2")
            self.assertEqual([h for _, h in calls], ["Adah Esau Eliphaz", "Anah Zibeon"])
            self.assertEqual([n for n, _ in calls], [16000 * 4, 16000 * 6])
            calls.clear()
            qa.transcribe(Path("x.m4a"), "en", "Adah Anah")                       # no parts: the whole file, one hint
            self.assertEqual(calls, [(16000 * 10, "Adah Anah")])

    def test_make_one_gives_the_judge_the_parts_of_the_render(self):
        item = real_items()["en/bible/kjv-gen-036.m4a"]
        segs, ends = timed(item)
        seen = {}

        def check(out, script, lang, level, quiet=0.0, strict_words=False, parts=None):
            seen["parts"] = parts
            return {"pass": True, "problems": [], "notes": [], "accuracy": 0.97, "wpm": 100, "words": 10, "lufs": -17.0,
                    "true_peak": -1.5, "clipped": 0, "asr": qa.JUDGE_MODEL, "seconds": 500.0}
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as home, \
                mock.patch.object(fill, "HOME", Path(home)), \
                mock.patch.object(fill, "render", side_effect=lambda *a, **k: (Path(a[2]).write_bytes(b"w"), {"segs": segs, "ends": ends})[1]), \
                mock.patch.object(fill, "master", side_effect=lambda w, o, l: (Path(o).write_bytes(b"m"), {"tries": 1, "gain": 0, "limit": -3})[1]), \
                mock.patch.object(qa, "check", side_effect=check):
            row = fill.make_one(item, T.load_pronunciations(), Path(d))
        self.assertEqual(row["status"], "passed")
        self.assertGreater(len(seen["parts"]), 1)
        self.assertEqual(" ".join(w for _, _, w in seen["parts"]), fill.script_of(item))


class NamesTheVoicesAreGiven(unittest.TestCase):
    def test_kokoro_says_the_genesis_36_names_from_the_lexicon(self):
        item = real_items()["en/bible/kjv-gen-036.m4a"]
        said = " ".join(s["text"] for s in fill.segments_of(item, T.load_pronunciations()))
        for name, respelled in (("Anah", "Aina"), ("Zibeon", "Zibbeeun"), ("Seir", "Seeer")):
            self.assertNotRegex(said, rf"\b{name}\b")
            self.assertIn(respelled, said)
        self.assertEqual(fill.script_of(item).count("Anah"), said.count("Aina"))   # the stored words are untouched
        self.assertIn("Anah", fill.script_of(item))

    def test_the_clone_says_machir_and_lo_debar_from_its_own_lexicon(self):
        story = next(s for s in H.load_stories() if s["id"] == "fav-17-mephibosheth")
        given = []

        def render(items, deadline=None):
            given.extend(items)
            return False                                    # the box ends: make_story returns None, nothing written
        with tempfile.TemporaryDirectory() as d, mock.patch.object(C.fill, "HOME", Path(d)), \
                mock.patch.object(C, "refs", return_value={r: Path(d) / f"{r}.wav" for r in C.CLONE["ref"]}), \
                mock.patch.object(C, "render", side_effect=render), mock.patch.object(C, "push_work"), \
                mock.patch.object(C.memguard, "wait", return_value="go"):
            self.assertIsNone(C.make_story(story, Path(d) / "work"))
        text = " ".join(i["text"] for i in given)
        self.assertIn("May-keer", text)
        self.assertIn("Lo-deebar", text)
        self.assertNotIn("Machir", text)


class TheHeldFilesComeFirst(unittest.TestCase):
    """Rule 0: the run after this lands re-voices the 32, first, by the real manifest and the real plan."""

    HELD_BIBLE = 13
    HELD_STORIES = 19

    def rows(self):
        return fill.read_manifest(AUDIO / "manifest.jsonl")

    def test_the_32_held_on_24_nov_are_queued_first_under_the_new_judge(self):
        rows = self.rows()
        last = fill.latest(rows)
        held = [f for f, r in last.items() if r.get("status") == "held"]
        bible_held = [f for f in held if "/bible/" in f]
        story_held = [f for f in held if f.startswith("stories/hush-harbor/")]
        if len(held) == 0:
            self.skipTest("nothing is held any more")   # after the re-voice lands, the manifest has no held rows
        self.assertEqual(len(bible_held) + len(story_held), len(held))
        queue = [i["file"] for i in fill.todo(fill.plan(_BIBLES or {l: T.load_bible(l) for l in ("en", "es")}), rows)]
        self.assertEqual(sorted(queue[:len(bible_held)]), sorted(bible_held))
        stories = [H.row_file(s) for s in C.lane_order(H.todo(H.load_stories(), rows), rows)]
        self.assertEqual(sorted(stories[:len(story_held)]), sorted(story_held))
        for f in held:                                     # every route open again, the try count from zero
            self.assertEqual((fill.tries(last[f]), fill.next_route(last[f])), (0, "verses"))

    def test_a_file_that_fails_again_is_held_again_with_its_reason_and_never_queued(self):
        item = real_items()["en/bible/kjv-gen-036.m4a"]
        old = {"file": item["file"], "status": "held", "judge": qa.JUDGE_MODEL, "tries": 2,
               "failed_routes": ["verses", "sentences"], "words": fill.words_key(item)}
        with tempfile.TemporaryDirectory() as d:
            man = Path(d) / "m.jsonl"
            man.write_text(json.dumps(old) + "\n")
            self.assertEqual(fill.todo([item], fill.read_manifest(man))[0]["file"], item["file"])   # tried again
            for route in fill.ROUTES:
                fill._upsert_row({"file": item["file"], "status": "FAILED", "route": route, "words": fill.words_key(item),
                                  "checks": {"problems": ["A01 word accuracy 0.93 < 0.95"]}}, man)
            row = fill.latest(fill.read_manifest(man))[item["file"]]
        self.assertEqual((row["status"], row["judge"], row["failed_routes"]), ("held", fill.judge_now(), list(fill.ROUTES)))
        self.assertEqual(row["checks"]["problems"], ["A01 word accuracy 0.93 < 0.95"])
        self.assertEqual(fill.todo([item], [row]), [])                  # held under r2: not voiced again by itself
        self.assertNotIn("sha256", {k for k, v in row.items() if v})     # never shelved, never published

    def test_a_voice_route_down_is_never_a_passed_story(self):
        """Outage: Chatterbox fails to run (a missing model, a crash). The lane stops without a row: nothing
        is shelved or published, the story stays held, and the next batch tries again."""
        story = next(s for s in H.load_stories() if s["id"] == "core-013-job")
        with tempfile.TemporaryDirectory() as d, mock.patch.object(C.fill, "HOME", Path(d)), \
                mock.patch.object(C, "refs", return_value={r: Path(d) / f"{r}.wav" for r in C.CLONE["ref"]}), \
                mock.patch.object(C, "render", side_effect=RuntimeError("chatterbox failed: model not found")), \
                mock.patch.object(C, "push_work"), mock.patch.object(C.memguard, "wait", return_value="go"):
            with self.assertRaises(RuntimeError):
                C.make_story(story, Path(d) / "work")
            self.assertEqual(list((Path(d)).rglob("*.m4a")), [])


if __name__ == "__main__":
    unittest.main()
