"""Behaviour of the Hush Harbor renderer that runs without audio engines or the network: who reads
what, the pauses as real silence, resume, the quota stops and the unit checks.
Run: python3 -m unittest discover -s audio/tests"""
import json
import sys
import unittest
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AUDIO))
sys.path.insert(0, str(AUDIO / "lib"))
import hush_harbor as H  # noqa: E402

CAST = [{"id": "disciples", "age": "adult", "gender": "group"}, {"id": "naomi", "age": "elder", "gender": "f"},
        {"id": "eli", "age": "elder", "gender": "m"}, {"id": "david", "age": "teen", "gender": "m"}]


def story(blocks):
    return {"id": "core-999-test", "title": "Test", "lang": "en", "status": "passed", "cast": CAST, "blocks": blocks}


class Voices(unittest.TestCase):
    def test_locked_voices(self):
        self.assertEqual({r: v["voice"] for r, v in H.VOICES["roles"].items()},
                         {"grandmother": "Gacrux", "elder": "Charon", "young_woman": "Kore", "young_man": "Umbriel"})
        for r in H.VOICES["roles"].values():
            lo, hi = r["f0_hz"]
            self.assertTrue(0 < lo < r["sample_f0_hz"] < hi)

    def test_who_reads_what(self):
        self.assertEqual(H.role_for("narrator", CAST), "grandmother")
        self.assertEqual(H.role_for("naomi", CAST), "young_woman")
        self.assertEqual(H.role_for("eli", CAST), "elder")
        self.assertEqual(H.role_for("david", CAST), "young_man")
        self.assertEqual(H.role_for("disciples", CAST), "young_man")
        with self.assertRaises(ValueError):
            H.role_for("jesus", CAST)

    def test_every_real_story_is_two_calls_with_the_pauses_between(self):
        stories = H.load_stories()
        self.assertGreaterEqual(len(stories), 30)
        for s in stories:
            plan = H.calls_of(s)
            calls = [c for c in plan if "turns" in c]
            self.assertEqual(len(calls), 2, s["id"])
            # pause 1 between the calls, pause 2 cut into call B by code; never the last thing said
            self.assertEqual([c["silence"] for c in plan if "silence" in c], [3.0], s["id"])
            self.assertEqual(calls[1]["cut_silence"], 3.0, s["id"])
            self.assertLess(calls[1]["cut_after"], len(calls[1]["turns"]) - 1, s["id"])
            for c in calls:
                self.assertLessEqual(len({t["role"] for t in c["turns"]}), 2, s["id"])
                self.assertIn("grandmother", {t["role"] for t in c["turns"]}, s["id"])
                self.assertFalse(any("PAUSE" in t["text"] for t in c["turns"]), s["id"])
            # every word of the story is in exactly one call
            said = " ".join(t["text"] for c in calls for t in c["turns"])
            self.assertEqual(said.split(), H.spoken(s).split(), s["id"])
            split = [c for c in H.calls_of(s, split_b=True) if "turns" in c]
            self.assertEqual(len(split), 3, s["id"])


S = story([
    {"type": "retelling", "speaker": "narrator", "text": "One."},
    {"type": "retelling", "speaker": "narrator", "text": "Two."},
    {"type": "scripture", "speaker": "naomi", "segments": [
        {"v": 1, "speaker": "narrator", "text": "And she said,"},
        {"v": 1, "speaker": "naomi", "text": "Go, return."}]},
    {"type": "scripture", "speaker": "david", "segments": [{"v": 2, "speaker": "david", "text": "I come."}]},
    {"type": "call_response", "speaker": "narrator",
     "text": 'Say it. [PAUSE 3s | screen: "All the time"] And back. [PAUSE 3s | screen: "God is good"] Tie.'},
    {"type": "scripture", "speaker": "eli", "segments": [{"v": 3, "speaker": "eli", "text": "Go in peace."}]},
])


class Units(unittest.TestCase):
    def test_split_by_speaker_and_pauses_become_silence(self):
        self.assertEqual(H.turns_of(S), [
            {"role": "grandmother", "text": "Test. One. Two. And she said,"},
            {"role": "young_woman", "text": "Go, return."},
            {"role": "young_man", "text": "I come."},
            {"role": "grandmother", "text": "Say it."}, {"silence": 3.0},
            {"role": "grandmother", "text": "And back."}, {"silence": 3.0},
            {"role": "grandmother", "text": "Tie."},
            {"role": "elder", "text": "Go in peace."}])

    def test_two_voices_a_call_minor_voices_to_the_closest(self):
        a, sil, b = H.calls_of(S)
        # call A: woman (2 words) and man (2 words) tie -> one is main; the other is not a man's
        # voice for a woman, so it goes to the grandmother or the main man
        roles = [t["role"] for t in a["turns"]]
        self.assertLessEqual(len(set(roles)), 2)
        self.assertEqual(sil, {"silence": 3.0})
        self.assertEqual([t["text"] for t in b["turns"]], ["And back.", "Tie.", "Go in peace."])
        self.assertEqual(b["cut_after"], 0)
        self.assertEqual([t["role"] for t in b["turns"]], ["grandmother", "grandmother", "elder"])
        men = H.two_voices([{"role": "grandmother", "text": "x"}, {"role": "young_man", "text": "a b c"},
                            {"role": "elder", "text": "d"}, {"role": "young_woman", "text": "e"}])
        self.assertEqual([t["role"] for t in men], ["grandmother", "young_man", "young_man", "grandmother"])
        self.assertEqual([t["cast_role"] for t in men], ["grandmother", "young_man", "elder", "young_woman"])

    def test_request_uses_the_locked_voices_and_style_lines(self):
        body = H.request_of([{"role": "grandmother", "text": "And the LORD said."}, {"role": "elder", "text": "Amen."}])
        cfg = body["generationConfig"]["speechConfig"]["multiSpeakerVoiceConfig"]["speakerVoiceConfigs"]
        self.assertEqual([c["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] for c in cfg], ["Gacrux", "Charon"])
        text = body["contents"][0]["parts"][0]["text"]
        self.assertIn(H.VOICES["roles"]["grandmother"]["style"], text)
        self.assertIn(H.VOICES["roles"]["elder"]["style"], text)
        self.assertIn("Grandmother: And the Lord said.", text)
        one = H.request_of([{"role": "grandmother", "text": "Hush."}])
        self.assertEqual(one["generationConfig"]["speechConfig"]["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"], "Gacrux")

    def test_changed_text_is_a_new_file(self):
        a = story([{"type": "retelling", "speaker": "narrator", "text": "One."}])
        b = story([{"type": "retelling", "speaker": "narrator", "text": "One more."}])
        self.assertNotEqual(H.file_of(a), H.file_of(b))
        self.assertEqual(H.file_of(a), H.file_of(json.loads(json.dumps(a))))

    def test_resume_skips_done(self):
        a = story([{"type": "retelling", "speaker": "narrator", "text": "One."}])
        rows = [{"file": f"stories/hush-harbor/en/{H.file_of(a)}", "status": "passed"}]
        self.assertEqual(H.todo([a], rows), [])
        self.assertEqual(H.census([a], rows), {"total": 1, "passed": 1, "failed": 0, "given_up": []})

    def test_failed_story_is_tried_again_first_until_out_of_tries(self):
        a = story([{"type": "retelling", "speaker": "narrator", "text": "One."}])
        b = story([{"type": "retelling", "speaker": "narrator", "text": "Two."}])
        rows = [{"file": H.row_file(b), "status": "FAILED", "tries": 1}]
        self.assertEqual(H.todo([a, b], rows), [b, a])
        rows[0]["tries"] = 3
        self.assertEqual(H.todo([a, b], rows), [a])
        self.assertIn("NAMED STOP [FAILED_3_TRIES]", H.census_line(H.census([a, b], rows)))


class Checks(unittest.TestCase):
    TURNS = [{"role": "grandmother", "text": "And all the time."}, {"role": "grandmother", "text": "He was good."},
             {"role": "elder", "text": "Go in peace."}]
    WORDS = [("and", 0.0, 0.2), ("all", 0.2, 0.4), ("the", 0.4, 0.5), ("time", 0.5, 0.9),
             ("he", 1.6, 1.7), ("was", 1.7, 1.9), ("good", 1.9, 2.3), ("go", 3.0, 3.2), ("in", 3.2, 3.3), ("peace", 3.3, 3.8)]

    def test_align_and_cut(self):
        self.assertEqual(H.align(self.TURNS, self.WORDS), [(0.0, 0.9), (1.6, 2.3), (3.0, 3.8)])
        self.assertEqual(H.cut_window(self.TURNS, self.WORDS, 0), (0.75, 1.75))
        # the response line's last word not heard -> no clean cut (render B as two calls)
        self.assertIsNone(H.cut_window(self.TURNS, [w for w in self.WORDS if w[0] != "time"], 0))

    def test_call_problems(self):
        spans = H.align(self.TURNS, self.WORDS)
        said = "And all the time. He was good. Go in peace."
        self.assertEqual(H.call_problems(self.TURNS, said, spans, [150, None, 95]), [])
        self.assertTrue(H.call_problems(self.TURNS, "Grandmother: and all the time. Deacon: he was good, go in peace", spans, [150, None, 95]))
        self.assertTrue(H.call_problems(self.TURNS, said, spans, [150, None, 200]))     # deacon too high: wrong voice
        self.assertTrue(H.call_problems(self.TURNS, said, [spans[0], spans[1], None], [150, None, None]))


class Audio(unittest.TestCase):
    def test_pause_is_exactly_its_seconds(self):
        import numpy as np
        tone = np.full(H.RATE, 0.3, dtype=np.float32)
        x = H.join([tone, 3.0, tone, tone])
        quiet = np.flatnonzero(np.abs(x) < 1e-6)
        runs = np.split(quiet, np.flatnonzero(np.diff(quiet) != 1) + 1)
        lens = sorted(round(len(r) / H.RATE, 2) for r in runs)
        self.assertEqual(lens, sorted([H.LEAD, 3.0, H.GAP, H.TAIL]))

    def test_the_row_knows_where_each_pause_starts(self):
        # 22 Nov 2026: the clone lane's first passed story had no pause_starts_s, so the app could not
        # show its response on screen. join() reports each pause's start in the joined audio.
        import numpy as np
        tone = np.full(H.RATE, 0.3, dtype=np.float32)
        starts = []
        x = H.join([tone, tone, 3.0, tone, 3.0, tone], pause_starts=starts)
        quiet = np.flatnonzero(np.abs(x) < 1e-6)
        runs = [r for r in np.split(quiet, np.flatnonzero(np.diff(quiet) != 1) + 1) if round(len(r) / H.RATE, 2) == 3.0]
        self.assertEqual(starts, [round(r[0] / H.RATE, 3) for r in runs])
        self.assertEqual(len(starts), 2)
        self.assertEqual(H.join([tone, 3.0, tone]).tolist(), H.join([tone, 3.0, tone], pause_starts=[]).tolist())

    def test_tempo_slows_speech_never_pauses(self):
        import numpy as np
        sec = np.full(H.RATE * 60, 0.3, dtype=np.float32)                 # one minute of "speech"
        self.assertEqual(H.tempo_factor([sec], 100), 1.0)                  # already slow enough
        f = H.tempo_factor([sec, 3.0, sec], 300)                           # 300 words in ~2.1 min: too fast
        self.assertTrue(H.MIN_TEMPO <= f < 1.0)
        self.assertEqual(H.tempo_factor([sec], 10000), H.MIN_TEMPO)        # never slower than the floor

    def test_pitch_of_a_tone(self):
        import numpy as np
        t = np.arange(H.RATE * 2) / H.RATE
        self.assertAlmostEqual(H.median_f0(0.3 * np.sin(2 * np.pi * 150 * t)), 150, delta=3)
        self.assertIsNone(H.median_f0(np.zeros(H.RATE)))


class Vetting(unittest.TestCase):
    def test_verdict(self):
        band = [95, 240]
        self.assertTrue(H.vet_verdict(0.5, [0.1, 0.3], 140, band))
        self.assertFalse(H.vet_verdict(0.2, [0.1, 0.3], 140, band))     # an auditioned other voice is closer
        self.assertFalse(H.vet_verdict(0.5, [0.1], 300, band))          # pitch out of the band
        self.assertFalse(H.vet_verdict(0.5, [], 140, band))             # nothing to compare against

    def test_unvetted_models_never_join_and_the_first_always_does(self):
        import tempfile
        old = H.VETTING
        try:
            with tempfile.TemporaryDirectory() as d:
                H.VETTING = Path(d) / "v.json"
                self.assertEqual(H.vetted_models(), [H.MODELS[0]])
                H.VETTING.write_text(json.dumps({H.MODELS[1]: {"passed": True}, H.MODELS[2]: {"passed": False}}))
                self.assertEqual(H.vetted_models(), [H.MODELS[0], H.MODELS[1]])
        finally:
            H.VETTING = old

    def test_voiceprint_tells_two_tones_apart(self):
        import numpy as np
        t = np.arange(16000 * 2) / 16000
        a, b = (0.3 * np.sin(2 * np.pi * f * t) + 0.01 * np.random.default_rng(1).standard_normal(len(t)) for f in (150, 900))
        pa, pb = H.voiceprint(a), H.voiceprint(b)
        pool = np.array([pa, pb, H.voiceprint(a[::-1].copy())])
        mu, sd = pool.mean(0), pool.std(0) + 1e-9
        self.assertGreater(H.similarity(pa, H.voiceprint(a[::-1].copy()), mu, sd), H.similarity(pa, pb, mu, sd))


class Quota(unittest.TestCase):
    def test_429_per_day_vs_per_minute(self):
        day = {"error": {"code": 429, "details": [
            {"@type": "type.googleapis.com/google.rpc.QuotaFailure",
             "violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]},
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "40s"}]}}
        minute = {"error": {"code": 429, "details": [
            {"@type": "type.googleapis.com/google.rpc.QuotaFailure",
             "violations": [{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]},
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "23s"}]}}
        self.assertEqual(H.classify_429(json.dumps(day)), ("day", 40.0))
        self.assertEqual(H.classify_429(json.dumps(minute)), ("minute", 23.0))
        self.assertEqual(H.classify_429("not json")[0], "minute")

    def test_a_billed_key_is_caught_from_its_429(self):
        free = {"error": {"details": [{"violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}
        paid = {"error": {"details": [{"violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel"}]}]}}
        self.assertFalse(H.billed_quota(json.dumps(free)))
        self.assertTrue(H.billed_quota(json.dumps(paid)))
        self.assertFalse(H.billed_quota("not json"))
        self.assertEqual(H.KEY_ENV, "PBS_GEMINI_API_KEY")

    def test_quota_stops_are_notes(self):
        self.assertEqual(H.NamedStop("QUOTA_OUT", "x", note=True).exit_code, 0)
        self.assertEqual(H.NamedStop("KEY_MISSING", "x").exit_code, 9)


if __name__ == "__main__":
    unittest.main()
