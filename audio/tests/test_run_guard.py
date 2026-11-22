"""run.sh runs the whole fill behind seq-bin's mac-window (the Mac's day, 21 Nov 2026): HEAVY, one heavy
slot, no wait on an interval tick, before it pulls or voices anything."""
import os
import pathlib
import subprocess
import tempfile
import shutil
import unittest

RUN = pathlib.Path(__file__).resolve().parents[1] / "run.sh"


@unittest.skipUnless(shutil.which("zsh") and os.path.exists("/bin/zsh"), "run.sh is a Mac zsh script")
class RunGuard(unittest.TestCase):
    def test_fill_runs_behind_mac_window_with_one_slot(self):
        with tempfile.TemporaryDirectory() as td:
            fake = pathlib.Path(td) / "mac-window"
            rec = pathlib.Path(td) / "rec"
            fake.write_text(f'#!/bin/bash\necho "$* SLOTS=$MAC_WINDOW_SLOTS INSIDE=$PBS_UNDER_MAC_WINDOW" > {rec}\n')
            fake.chmod(0o755)
            env = {k: v for k, v in os.environ.items() if k != "PBS_UNDER_MAC_WINDOW"}
            # HOME and the voice python are fakes: if the guard ever broke, nothing real could run
            env.update(HOME=td, PBS_WHISPER_PY="/usr/bin/false", MAC_WINDOW_BIN=str(fake))
            # a COPY of run.sh in a throwaway repo with no remote: a broken guard can only pull a dead repo
            repo = pathlib.Path(td) / "repo"
            (repo / "audio").mkdir(parents=True)
            shutil.copy(RUN, repo / "audio" / "run.sh")
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            run = repo / "audio" / "run.sh"
            r = subprocess.run(["/bin/zsh", str(run)], env=env,
                               capture_output=True, text=True, timeout=30)
            self.assertEqual(r.returncode, 0, r.stderr)
            got = rec.read_text()
            # the guard got the whole run (exec: nothing of run.sh ran before it, no pull, no lanes)
            self.assertTrue(got.startswith(f"run HEAVY com.seq.pbs-library-fill --no-wait -- /bin/zsh {run.resolve()}"), got)
            self.assertIn("SLOTS=1 INSIDE=1", got)


INSTALL = pathlib.Path(__file__).resolve().parents[1] / "launchd" / "install.sh"


@unittest.skipUnless(os.path.exists("/bin/zsh") and shutil.which("git"), "install.sh is a Mac zsh script")
class Install(unittest.TestCase):
    def run_install(self, td, held=False, reload=True, fail=""):
        home = pathlib.Path(td) / "home"
        (home / "Library" / "LaunchAgents").mkdir(parents=True, exist_ok=True)
        runner = pathlib.Path(td) / "runner"
        if not runner.exists():
            subprocess.run(["git", "clone", "-q", str(INSTALL.parents[2]), str(runner)], check=True)
        if held:
            (home / ".peace-be-still" / "held").mkdir(parents=True, exist_ok=True)
            (home / ".peace-be-still" / "held" / "com.seq.pbs-library-fill.plist").write_text("HELD")
        calls = pathlib.Path(td) / "calls"
        fake = pathlib.Path(td) / "launchd-reload"
        fake.write_text(f'#!/bin/bash\necho "$*" >> {calls}\n[ -n "{fail}" ] && [[ "$1" == *{fail or "@none@"}* ]] && exit 1\nexit 0\n')
        fake.chmod(0o755)
        env = {**os.environ, "HOME": str(home), "PBS_RUNNER": str(runner),
               "LAUNCHD_RELOAD": str(fake if reload else pathlib.Path(td) / "missing")}
        r = subprocess.run(["/bin/zsh", str(INSTALL)], env=env, capture_output=True, text=True, timeout=60)
        return r, (calls.read_text() if calls.exists() else ""), home

    def test_seed_first_then_every_job_through_the_reload(self):
        with tempfile.TemporaryDirectory() as td:
            r, calls, home = self.run_install(td)
            self.assertEqual(r.returncode, 0, r.stderr)
            lines = calls.splitlines()
            self.assertEqual(lines[0], "--seed")
            self.assertTrue(any(l.endswith("com.seq.pbs-library-fill.plist") for l in lines[1:]), calls)

    def test_a_held_fill_is_never_written_or_loaded(self):
        with tempfile.TemporaryDirectory() as td:
            r, calls, home = self.run_install(td, held=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertNotIn("pbs-library-fill", calls)
            self.assertFalse((home / "Library" / "LaunchAgents" / "com.seq.pbs-library-fill.plist").exists())
            self.assertIn("HELD com.seq.pbs-library-fill", r.stdout)

    def test_no_reload_tool_is_a_named_stop_and_nothing_is_written(self):
        with tempfile.TemporaryDirectory() as td:
            r, calls, home = self.run_install(td, reload=False)
            self.assertEqual(r.returncode, 4)
            self.assertIn("NO_LAUNCHD_RELOAD", r.stderr)
            self.assertEqual(list((home / "Library" / "LaunchAgents").iterdir()), [])

    def test_a_failed_reload_exits_1(self):
        with tempfile.TemporaryDirectory() as td:
            r, calls, home = self.run_install(td, fail="made-for-you")
            self.assertEqual(r.returncode, 1)
            self.assertIn("RELOAD_FAILED", r.stderr)


if __name__ == "__main__":
    unittest.main()
