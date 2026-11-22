"""run.sh runs the whole fill behind seq-bin's mac-window (the Mac's day, 21 Nov 2026): HEAVY, both heavy
slots, no wait on an interval tick, before it pulls or voices anything."""
import os
import pathlib
import subprocess
import tempfile
import shutil
import unittest

RUN = pathlib.Path(__file__).resolve().parents[1] / "run.sh"


@unittest.skipUnless(shutil.which("zsh") and os.path.exists("/bin/zsh"), "run.sh is a Mac zsh script")
class RunGuard(unittest.TestCase):
    def test_fill_runs_behind_mac_window_with_both_slots(self):
        with tempfile.TemporaryDirectory() as td:
            fake = pathlib.Path(td) / "mac-window"
            rec = pathlib.Path(td) / "rec"
            fake.write_text(f'#!/bin/bash\necho "$* SLOTS=$MAC_WINDOW_SLOTS INSIDE=$PBS_UNDER_MAC_WINDOW" > {rec}\n')
            fake.chmod(0o755)
            env = {k: v for k, v in os.environ.items() if k != "PBS_UNDER_MAC_WINDOW"}
            r = subprocess.run(["/bin/zsh", str(RUN)], env={**env, "MAC_WINDOW_BIN": str(fake)},
                               capture_output=True, text=True, timeout=30)
            self.assertEqual(r.returncode, 0, r.stderr)
            got = rec.read_text()
            self.assertTrue(got.startswith(f"run HEAVY com.seq.pbs-library-fill --no-wait -- /bin/zsh {RUN}"), got)
            self.assertIn("SLOTS=2 INSIDE=1", got)
            self.assertNotIn("git pull", r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
