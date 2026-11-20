"""Behaviour of the R2 publish step without the network: which files go up, the free-tier cap, the
hash checks, and what the app is served. Run: python3 -m unittest discover -s audio/tests"""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

AUDIO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AUDIO))
import fill  # noqa: E402
import publish  # noqa: E402

REAL = fill.read_manifest(AUDIO / "manifest.jsonl")


def row(file, sha="a" * 64, status="passed", **kw):
    r = {"file": file, "kind": "psalms", "lang": "en", "ref": "PSA 1", "seconds": 80.0, "sha256": sha,
         "voice": "kokoro:af_nicole", "status": status, "shelved": f"gdrive:shelf/{file}",
         "checks": {"lufs": -22}, "attempts": 1}
    r.update(kw)
    return r


class Selection(unittest.TestCase):
    def test_only_the_latest_passed_shelved_row_per_file(self):
        rows = [row("a.m4a", status="FAILED", sha256=None, shelved=None), row("a.m4a", sha="b" * 64),
                row("c.m4a"), row("c.m4a", status="FAILED", sha256=None, shelved=None)]
        self.assertEqual(list(publish.candidates(rows)), ["a.m4a"])

    def test_served_with_the_same_hash_is_never_sent_again_and_a_remaster_is(self):
        cands = publish.candidates([row("a.m4a"), row("b.m4a", sha="c" * 64), row("d.m4a")])
        ledger = {"a.m4a": {"sha256": "a" * 64}, "b.m4a": {"sha256": "a" * 64}, "d.m4a": {"sha256": "a" * 64}}
        in_r2 = {"a.m4a": {}, "b.m4a": {}}          # d is in the ledger but gone from the bucket
        self.assertEqual([r["file"] for r in publish.todo(cands, ledger, in_r2)], ["b.m4a", "d.m4a"])

    def test_real_manifest_every_passed_shelved_file_is_a_candidate(self):
        cands = publish.candidates(REAL)
        passed = {r["file"] for r in fill.latest(REAL).values() if r["status"] == "passed" and r.get("shelved")}
        self.assertGreater(len(passed), 0)
        self.assertEqual(set(cands), passed)


class FreeCap(unittest.TestCase):
    def test_stops_before_the_file_that_would_cross_the_cap(self):
        batch = [row(f"{i}.m4a") for i in range(5)]
        each = publish.estimate_bytes(batch[0])
        got = publish.fits(batch, account_bytes=1000 - 2.5 * each, cap=1000)
        self.assertEqual(len(got), 2)
        self.assertEqual(publish.fits(batch, account_bytes=1001, cap=1000), [])

    def test_estimate_is_not_under_the_real_size_of_a_real_file(self):
        # kjv-psa-001.m4a: 83.84 s, 512,431 bytes on Drive (measured 20 Nov 2026)
        self.assertGreaterEqual(publish.estimate_bytes({"seconds": 83.84}), 512431)

    def test_over_the_cap_nothing_uploads_and_the_run_is_a_named_stop(self):
        calls = []
        with tempfile.TemporaryDirectory() as home, mock.patch.object(publish.fill, "HOME", Path(home)), \
                mock.patch.object(publish, "connect"), \
                mock.patch.object(publish.fill, "read_manifest", return_value=[row("a.m4a")]), \
                mock.patch.object(publish, "r2_listing", return_value={"x.m4a": {"Size": 9.6e9}}), \
                mock.patch.object(publish, "read_ledger", return_value={}), \
                mock.patch.object(publish, "publish_one", side_effect=lambda r: calls.append(r)), \
                mock.patch.object(publish, "write_ledger"), \
                mock.patch.object(publish.fill, "morning_line", return_value="m"):
            rc = publish.main([])
        self.assertEqual(calls, [])
        self.assertEqual(rc, 9)


class Hashes(unittest.TestCase):
    def fake(self, drive_sha, r2_md5):
        drive = {"Size": 10, "Hashes": {"md5": "m" * 32, "sha256": drive_sha}}
        r2 = {"Size": 10, "Hashes": {"md5": r2_md5}}
        seen = []

        def rclone(*args, timeout=0):
            seen.append(args)
            out = ""
            if args[0] == "lsjson":
                out = json.dumps([drive if args[-1].startswith("gdrive:") else r2])
            return mock.Mock(returncode=0, stdout=out, stderr="")
        return rclone, seen

    def test_a_drive_copy_that_is_not_the_manifest_file_is_held_and_never_uploaded(self):
        rc, seen = self.fake("f" * 64, "m" * 32)
        with mock.patch.object(publish, "rclone", rc), self.assertRaises(fill.NamedStop) as e:
            publish.publish_one(row("a.m4a"))
        self.assertEqual(e.exception.code, "SHELF_HASH_MISMATCH")
        self.assertFalse(any(a[0] == "copyto" for a in seen))

    def test_an_r2_copy_that_differs_from_drive_is_deleted_and_stops(self):
        rc, seen = self.fake("a" * 64, "0" * 32)
        with mock.patch.object(publish, "rclone", rc), self.assertRaises(fill.NamedStop) as e:
            publish.publish_one(row("a.m4a"))
        self.assertEqual(e.exception.code, "R2_HASH_MISMATCH")
        self.assertIn(("deletefile", "r2:peace-be-still-audio/a.m4a"), seen)

    def test_the_r2_key_is_exactly_the_manifest_file(self):
        rc, seen = self.fake("a" * 64, "m" * 32)
        with mock.patch.object(publish, "rclone", rc):
            publish.publish_one(row("en/psalms/kjv-psa-001.m4a"))
        copy = next(a for a in seen if a[0] == "copyto")
        self.assertEqual(copy[-2:], ("gdrive:shelf/en/psalms/kjv-psa-001.m4a", "r2:peace-be-still-audio/en/psalms/kjv-psa-001.m4a"))


class Served(unittest.TestCase):
    def test_served_rows_carry_no_checks_or_drive_paths_and_stories_carry_their_title(self):
        story = next(r for r in REAL if r["kind"] == "stories" and r["status"] == "passed")
        out = publish.public_row(story)
        self.assertNotIn("shelved", out)
        self.assertNotIn("checks", out)
        title = json.loads((fill.REPO / story["ref"]).read_text())["title"]
        self.assertEqual(out["title"], title)
        self.assertEqual(out["sha256"], story["sha256"])

    def test_served_manifest_is_one_json_row_per_line_in_file_order(self):
        text = publish.served_text({"b": {"file": "b"}, "a": {"file": "a"}})
        self.assertEqual([json.loads(x)["file"] for x in text.splitlines()], ["a", "b"])


if __name__ == "__main__":
    unittest.main()
