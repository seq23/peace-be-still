import io
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import fill
import made_for_you as sessions


class MadeForYouTest(unittest.TestCase):
    def job(self, lang="en", kind="psalm"):
        job_id = "10000000-0000-4000-a000-000000000001"
        return {
            "id": job_id, "lease": job_id, "lang": lang, "kind": kind,
            "path": f"made-for-you/{job_id}/{job_id}.m4a",
            "reflection": "A quiet room.\nThe rain at the window.",
            "verses": ["Stored text " + str(i) for i in range(6)] if kind == "psalm" else [],
        }

    def test_translation_and_verse_sequence_survive_the_fixed_template(self):
        for lang, translation in (("en", "KJV"), ("es", "RV1909")):
            with self.subTest(lang=lang):
                job = self.job(lang)
                item = sessions.session_item(job)
                self.assertEqual(item["text"], translation)
                self.assertEqual(item["verses"][-7:-1], job["verses"])
                self.assertGreaterEqual(item["gap"], 1.5)
                self.assertIn("The rain at the window.", fill.script_of(item))
        scene = self.job("es", "imagination")
        self.assertEqual(sessions.session_item(scene)["text"], "script")
        scene["verses"] = ["No verse goes here"]
        with self.assertRaises(ValueError):
            sessions.session_item(scene)

    def test_one_nightly_run_claims_and_publishes_two_sessions(self):
        first = self.job()
        second = self.job()
        second_id = "10000000-0000-4000-a000-000000000002"
        second.update(id=second_id, path=second["path"].replace(first["id"] + ".m4a", second_id + ".m4a"))
        jobs = iter([first, second])
        published = []
        put = Mock()

        def call(target, payload):
            if target == "claim":
                return {"job": next(jobs, None)}
            published.append(target)
            self.assertEqual(payload["seconds"], 680)
            return {"published": True}

        def voice(_item, directory):
            return {"status": "passed", "seconds": 680, "sha256": "hash", "_local": directory / "session.m4a"}

        with patch.dict(sessions.os.environ, {
            "PBS_MADE_FOR_YOU_API": "https://fixture.example/api",
            "PBS_MADE_FOR_YOU_RUNNER_SECRET": "fixture",
            "PBS_MADE_FOR_YOU_PRIVATE_BUCKET": "fixture-private",
        }), patch.object(sessions.publish, "connect"), patch.object(sessions, "make_request", return_value=call), \
                patch.object(sessions, "render_session", side_effect=voice), patch.object(sessions, "upload", put):
            self.assertEqual(sessions.work(), 0)
        self.assertEqual(published, [first["id"], second_id])
        self.assertEqual(put.call_count, 2)

    def test_dry_model_chain_holds_the_request_and_advances_the_queue(self):
        code = "MADE_FOR_YOU_NO_FREE_MODEL"
        busy = HTTPError("https://fixture.example", 503, "Unavailable", {}, io.BytesIO(
            b'{"error":"MADE_FOR_YOU_NO_FREE_MODEL"}',
        ))
        call = sessions.make_request("https://fixture.example/api", "fixture")
        render, put = Mock(), Mock()
        with patch.object(sessions, "urlopen", side_effect=[busy, io.BytesIO(b'{"job":null}')]) as request:
            with self.assertRaises(fill.NamedStop) as stopped:
                sessions.drain_queue(call, render, put)
            self.assertEqual(stopped.exception.code, code)
            self.assertEqual(request.call_count, 2)
        render.assert_not_called()
        put.assert_not_called()

    def test_qa_failure_cannot_upload_or_acknowledge(self):
        call = Mock(return_value={"job": self.job()})
        put = Mock()
        with self.assertRaisesRegex(fill.NamedStop, "MADE_FOR_YOU_QA"):
            sessions.process_one(call, Mock(return_value={"status": "FAILED"}), put)
        put.assert_not_called()
        call.assert_called_once_with("claim", {})

    def test_measured_audio_gate_checks_duration_and_pace_as_well_as_library_qa(self):
        check = {"pass": True, "seconds": 590, "wpm": 105}
        with patch.object(fill, "render"), patch.object(sessions.qa, "ffprobe_seconds", return_value=600), \
                patch.object(sessions.subprocess, "run"), patch.object(fill, "master"), \
                patch.object(sessions.qa, "check", return_value=check), patch.object(fill, "sha256", return_value="hash"):
            item = sessions.session_item(self.job())
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "FAILED")
            check.update(seconds=680, wpm=120)
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "FAILED")
            check.update(wpm=105, **{"pass": False})
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "FAILED")
            check["pass"] = True
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "passed")

    def test_disallowed_prose_is_rejected_before_the_voice(self):
        job = self.job()
        job["reflection"] = "Manifest your outcome."
        with self.assertRaises(ValueError):
            sessions.session_item(job)


if __name__ == "__main__":
    unittest.main()
