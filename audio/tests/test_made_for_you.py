import io
import json
import sys
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
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
            "closing": "The room is dark now.\nStay as long as you like.",
            "verses": ["Stored text " + str(i) for i in range(6)] if kind == "psalm" else [],
            **({"psalm": 23} if kind == "psalm" else {}),
        }

    def test_translation_and_verse_sequence_survive_the_fixed_template(self):
        for lang, translation in (("en", "KJV"), ("es", "RV1909")):
            with self.subTest(lang=lang):
                job = self.job(lang)
                item = sessions.session_item(job)
                self.assertEqual(item["text"], translation)
                # Heard in order: template opening, prose, bridge, the stored psalm, the fixed closing, the closing line.
                self.assertEqual(item["verses"][1:3], ["A quiet room.", "The rain at the window."])
                self.assertEqual(item["verses"][-9:-3], job["verses"])
                self.assertEqual(item["verses"][-3:-1], ["The room is dark now.", "Stay as long as you like."])
                self.assertGreaterEqual(item["gap"], 1.5)
                self.assertIn("The rain at the window.", fill.script_of(item))
        # Each comfort psalm is named and read whole; a count that does not match its psalm is refused.
        for chapter, (count, en, es) in sessions.PSALMS.items():
            for lang, name in (("en", en), ("es", es)):
                job = {**self.job(lang), "psalm": chapter, "verses": [f"Verse {i}" for i in range(count)]}
                item = sessions.session_item(job)
                self.assertEqual(item["verses"][-count - 4], sessions.TEMPLATE[lang, "psalm"][1].format(name=name))
                self.assertEqual(item["verses"][-count - 3:-3], job["verses"])
        for wrong in ({"psalm": 4}, {"psalm": 150}, {"psalm": None}, {"closing": ""}, {"closing": None}):
            with self.assertRaises(ValueError):
                sessions.session_item({**self.job(), **wrong})
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
            if target == "status":
                return {"queue": 0, "held": 0, "oldestHours": 0, "late": 0}
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
        }), patch.object(sessions, "connect_private", return_value="fixture-private"), patch.object(sessions, "make_request", return_value=call), \
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
        render = Mock(side_effect=[
            {"status": "FAILED"},
            {"status": "passed", "seconds": 680, "sha256": "hash", "_local": "session.m4a"},
        ])
        put = Mock()
        blocked, ready = self.job(), self.job()
        ready_id = "10000000-0000-4000-a000-000000000002"
        ready.update(id=ready_id, path=ready["path"].replace(blocked["id"] + ".m4a", ready_id + ".m4a"))
        replies = [
            busy,
            io.BytesIO(json.dumps({"job": blocked}).encode()),
            io.BytesIO(b'{"code":"MADE_FOR_YOU_QA"}'),
            io.BytesIO(json.dumps({"job": ready}).encode()),
            io.BytesIO(b'{"published":true}'),
            io.BytesIO(b'{"job":null}'),
        ]
        logs = io.StringIO()
        with patch.object(sessions, "urlopen", side_effect=replies) as request, redirect_stdout(logs):
            # A held request is a note the next pass retries, never a failed run.
            self.assertEqual(sessions.drain_queue(call, render, put, drop=Mock()), 1)
            self.assertIn(f"NOTE [{code}]", logs.getvalue())
            self.assertIn("NOTE [MADE_FOR_YOU_QA]", logs.getvalue())
            self.assertEqual([entry.args[0].full_url.rsplit("/", 1)[-1] for entry in request.call_args_list],
                             ["claim", "claim", "qa-failed", "claim", ready_id, "claim"])
        self.assertEqual(render.call_count, 2)
        self.assertEqual(put.call_args.args[0]["ref"], ready_id)
        self.assertEqual(put.call_count, 1)

    def test_qa_failure_cannot_upload_or_acknowledge(self):
        call = Mock(return_value={"job": self.job()})
        put = Mock()
        with self.assertRaisesRegex(fill.NamedStop, "MADE_FOR_YOU_QA"):
            sessions.process_one(call, Mock(return_value={"status": "FAILED"}), put, Mock())
        put.assert_not_called()
        self.assertEqual(call.call_args_list[0].args, ("claim", {}))
        job = self.job()
        self.assertEqual(call.call_args_list[1].args, (f"{job['id']}/qa-failed", {"lease": job["lease"]}))

    def test_timed_out_claim_does_not_skip_the_next_session(self):
        job = self.job()
        replies = [TimeoutError(), io.BytesIO(json.dumps({"job": job}).encode()),
                   io.BytesIO(b'{"published":true}'), io.BytesIO(b'{"job":null}')]
        render = Mock(return_value={"status": "passed", "seconds": 680, "sha256": "hash", "_local": "session.m4a"})
        call = sessions.make_request("https://fixture.example/api", "fixture")
        put = Mock()
        with patch.object(sessions, "urlopen", side_effect=replies) as request, redirect_stdout(io.StringIO()):
            self.assertEqual(sessions.drain_queue(call, render, put, drop=Mock()), 1)
            self.assertEqual(request.call_args_list[0].kwargs["timeout"], 300)
            self.assertTrue(request.call_args_list[2].args[0].full_url.endswith(job["id"]))
        put.assert_called_once()

    def test_each_pass_prints_one_output_line_and_a_broken_promise_is_a_named_stop(self):
        status = {"queue": 3, "held": 1, "oldestHours": 5.25, "late": 0}
        out = io.StringIO()
        with redirect_stdout(out):
            sessions.report(lambda target, body: status, 2)
        self.assertEqual(out.getvalue().strip(), "OUTPUT 2 published, queue 3, held 1, oldest 5.2 hours, late 0, refused full 0")
        status["late"] = 1
        with redirect_stdout(io.StringIO()), self.assertRaises(fill.NamedStop) as stopped:
            sessions.report(lambda target, body: status, 0)
        self.assertEqual(stopped.exception.code, "MADE_FOR_YOU_LATE")
        self.assertNotEqual(stopped.exception.exit_code, 0)

    def test_outside_the_window_a_pass_renders_nothing_but_still_reports(self):
        seen = []
        def call(target, body):
            seen.append(target)
            return {"queue": 1, "held": 0, "oldestHours": 2, "late": 0}
        with patch.dict(sessions.os.environ, {
            "PBS_MADE_FOR_YOU_API": "https://fixture.example/api", "PBS_MADE_FOR_YOU_RUNNER_SECRET": "fixture",
        }), patch.object(sessions, "make_request", return_value=call), patch.object(sessions, "connect_private") as connect, \
                redirect_stdout(io.StringIO()):
            self.assertEqual(sessions.work(render=False), 0)
        self.assertEqual(seen, ["status"])
        connect.assert_not_called()

    def test_a_session_ended_mid_render_has_its_upload_removed_and_the_drain_goes_on(self):
        other = "10000000-0000-4000-a000-000000000002"
        ended, next_job = self.job(), {**self.job(), "id": other, "lease": other, "path": f"made-for-you/{other}/{other}.m4a"}
        ended_id, next_id = ended["id"], next_job["id"]
        jobs = [ended, next_job, None]
        gone = HTTPError("https://fixture.example", 409, "Conflict", {}, io.BytesIO(b'{"error":"LEASE_EXPIRED"}'))
        def call(target, body):
            if target == "claim":
                return {"job": jobs.pop(0)}
            if target == ended_id:
                raise gone
            return {"published": True}
        render = Mock(side_effect=lambda item, directory: {"status": "passed", "seconds": 680, "sha256": "h", "_local": directory / "s.m4a"})
        put, drop = Mock(), Mock()
        with redirect_stdout(io.StringIO()) as out:
            self.assertEqual(sessions.drain_queue(call, render, put, drop=drop), 1)
        self.assertEqual(put.call_count, 2)
        drop.assert_called_once()
        self.assertEqual(drop.call_args.args[0]["ref"], ended_id, "only the ended session's upload is removed")
        self.assertIn("MADE_FOR_YOU_ENDED", out.getvalue())
        self.assertNotEqual(next_id, ended_id)

    def test_private_uploads_use_their_own_token_never_the_library_key(self):
        env = {"CF2_ACCOUNT_ID": "acct", "PBS_MFY_R2_ACCESS_KEY_ID": "id", "PBS_MFY_R2_SECRET_ACCESS_KEY": "s", "PBS_MFY_R2_BUCKET": "pbs-made-for-you",
               "PBS_CF2_R2_ACCESS_KEY_ID": "library-id"}
        with patch.dict(sessions.os.environ, env), patch.dict(sessions.publish.RCLONE_ENV, {}, clear=True):
            self.assertEqual(sessions.connect_private(), "pbs-made-for-you")
            self.assertEqual(sessions.publish.RCLONE_ENV["RCLONE_CONFIG_R2P_ACCESS_KEY_ID"], "id")
        with patch.dict(sessions.os.environ, {**env, "PBS_MFY_R2_BUCKET": ""}), self.assertRaises(fill.NamedStop) as stop:
            sessions.connect_private()
        self.assertEqual(stop.exception.code, "MADE_FOR_YOU_STORAGE_CONFIG")
        with patch.dict(sessions.os.environ, {**env, "PBS_MFY_R2_BUCKET": sessions.publish.BUCKET}), self.assertRaises(fill.NamedStop):
            sessions.connect_private()

    def test_upload_is_held_when_the_whole_account_is_at_the_free_cap(self):
        with TemporaryDirectory() as directory:
            local = Path(directory) / "s.m4a"
            local.write_bytes(b"x" * 10)
            with patch.object(sessions.publish, "account_bytes", return_value=sessions.publish.FREE_CAP_BYTES), \
                    patch.object(sessions.publish, "rclone") as rclone, self.assertRaises(fill.NamedStop) as stop:
                sessions.upload({"file": "made-for-you/a/b.m4a"}, local, "pbs-made-for-you")
        self.assertEqual(stop.exception.code, "MADE_FOR_YOU_R2_FREE_CAP")
        rclone.assert_not_called()

    def test_session_time_comes_from_the_config_the_worker_promises_with(self):
        self.assertEqual(sessions.MIN_SESSION_SECONDS, sessions.CONFIG["sessionMinutes"] * 60)
        self.assertGreater(sessions.BOX_MINUTES * 60, sessions.MIN_SESSION_SECONDS)

    def test_a_voice_crash_is_a_counted_failure_and_the_drain_moves_on(self):
        crashed, ready = self.job(), self.job()
        ready_id = "10000000-0000-4000-a000-000000000002"
        ready.update(id=ready_id, path=ready["path"].replace(crashed["id"] + ".m4a", ready_id + ".m4a"))
        jobs = iter([crashed, ready, None])
        seen = []

        def call(target, body):
            seen.append(target)
            if target == "claim":
                return {"job": next(jobs)}
            if target.endswith("/qa-failed"):
                return {"code": "MADE_FOR_YOU_QA"}
            return {"published": True}

        render = Mock(side_effect=[RuntimeError("kokoro failed"),
                                   {"status": "passed", "seconds": 680, "sha256": "hash", "_local": "session.m4a"}])
        with redirect_stdout(io.StringIO()):
            self.assertEqual(sessions.drain_queue(call, render, Mock(), drop=Mock()), 1)
        self.assertEqual(seen, ["claim", f"{crashed['id']}/qa-failed", "claim", ready_id, "claim"])

    def test_timebox_kills_a_slow_render_and_raises_a_named_stop(self):
        with self.assertRaisesRegex(fill.NamedStop, "MADE_FOR_YOU_TIMEBOX") as stopped:
            sessions.run_timebox([sys.executable, "-c", "import time; time.sleep(30)"], 0.1)
        self.assertNotEqual(stopped.exception.exit_code, 0)

    def test_drain_leaves_the_next_row_unclaimed_when_the_window_is_too_short(self):
        job = self.job()
        call = Mock(side_effect=[{"job": job}, {"published": True}])
        render = Mock(return_value={"status": "passed", "seconds": 680, "sha256": "hash", "_local": "session.m4a"})
        with patch.object(sessions.time, "monotonic", side_effect=[0, 0, 460, 460]):
            self.assertEqual(sessions.drain_queue(call, render, Mock(), drop=Mock(), deadline=1200), 1)
        self.assertEqual([entry.args[0] for entry in call.call_args_list], ["claim", job["id"]])

    def test_measured_audio_gate_checks_duration_and_pace_as_well_as_library_qa(self):
        check = {"pass": True, "seconds": 590, "wpm": 105}
        with patch.object(fill, "render"), patch.object(sessions.qa, "ffprobe_seconds", return_value=600), \
                patch.object(sessions.subprocess, "run") as ffmpeg, patch.object(fill, "master") as master, \
                patch.object(sessions.qa, "check", return_value=check), patch.object(fill, "sha256", return_value="hash"):
            item = sessions.session_item(self.job())
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "FAILED")
            check.update(seconds=680, wpm=120)
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "FAILED")
            check.update(wpm=105, **{"pass": False})
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "FAILED")
            check["pass"] = True
            self.assertEqual(sessions.render_session(item, Path("/unused"))["status"], "passed")
            encode = master.call_args.kwargs["run"]
            encode(["ffmpeg", "-c:a", "aac_at"], check=True)
            ffmpeg.assert_called_with(["ffmpeg", "-c:a", "aac"], check=True)

    def test_disallowed_prose_is_rejected_before_the_voice(self):
        job = self.job()
        job["reflection"] = "Manifest your outcome."
        with self.assertRaises(ValueError):
            sessions.session_item(job)


if __name__ == "__main__":
    unittest.main()
