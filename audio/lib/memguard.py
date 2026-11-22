"""The night's memory guard (owner, 21 Nov 2026: "i need to make sure my memory stays good and we clean up
frequently ---2 lanes is a must"). Two heavy lanes run at once on an 8 GB Mac that went 22 GB into
swap on 20 Nov, so before each file a lane asks `pressure_high()`:

  - kern.memorystatus_vm_pressure_level: 1 normal, 2 warning, 4 critical (macOS's own judgement);
  - vm.swapusage "used", in MB.

Limits, from the baseline measured 21 Nov 2026 20:15 CT with the fill idle and her apps open: pressure
level 1, swap used 1,653 MB, 53% memory free. The swap limit is that baseline plus 2.4 GB of headroom
(SWAP_LIMIT_MB 4096); pressure level 2 (warning) or above is high. Override with PBS_SWAP_LIMIT_MB.

The clone lane (Chatterbox, the heavier) pauses while pressure is high and resumes when it clears; the
Bible lane only logs. A pause never stops a file midway: the check sits between files (stories). A lane
paused longer than MAX_PAUSE_S gives up for this run (MEMGUARD_ONE_LANE), so the night degrades to one
lane on its own. Pure parsing, a thin reader, and wait() with injectable clock and reader for tests.
"""
from __future__ import annotations

import os
import re
import subprocess
import time
from pathlib import Path

SWAP_LIMIT_MB = float(os.environ.get("PBS_SWAP_LIMIT_MB", "4096"))
# Her morning email and briefs come first (owner, 21 Nov 2026): while Boss OS's morning jobs run, this
# flag exists and the clone lane waits; only the Bible lane runs. No flag file: no morning window.
MORNING_FLAG = Path(os.environ.get("PBS_MORNING_FLAG", str(Path.home() / ".boss-os" / "morning-window.active")))
MORNING_STALE_S = 3 * 3600   # a flag older than this was left by a crashed morning job: ignored, with a note
PRESSURE_HIGH = 2
CHECK_EVERY_S = 60
MAX_PAUSE_S = 20 * 60


def parse_swap_used_mb(text: str) -> float:
    """'vm.swapusage: total = 2048.00M  used = 1653.00M ...' -> 1653.0 (G is converted). Pure."""
    m = re.search(r"used = ([\d.]+)([MG])", text)
    if not m:
        raise ValueError(f"no swap figure in {text!r}")
    return float(m.group(1)) * (1024 if m.group(2) == "G" else 1)


def read() -> dict:
    """{"level": int, "swap_mb": float} now. Missing tools (not a Mac) read as normal."""
    try:
        level = int(subprocess.run(["sysctl", "-n", "kern.memorystatus_vm_pressure_level"],
                                   capture_output=True, text=True, timeout=10).stdout.strip() or 1)
        swap = parse_swap_used_mb(subprocess.run(["sysctl", "vm.swapusage"], capture_output=True,
                                                 text=True, timeout=10).stdout)
    except Exception:   # no sysctl, a changed format, anything: read as normal, never block the lane
        return {"level": 1, "swap_mb": 0.0}
    return {"level": level, "swap_mb": swap}


def high(m: dict, swap_limit_mb: float = SWAP_LIMIT_MB) -> bool:
    return m["level"] >= PRESSURE_HIGH or m["swap_mb"] > swap_limit_mb


def line(m: dict) -> str:
    return f"pressure level {m['level']}, swap used {m['swap_mb']:.0f} MB (limit {SWAP_LIMIT_MB:.0f})"


def morning_on(flag: Path, clock=time.time, log=print) -> bool:
    """The morning window is on while the flag exists and is younger than MORNING_STALE_S."""
    try:
        age = clock() - flag.stat().st_mtime
    except OSError:
        return False
    if age > MORNING_STALE_S:
        log(f"NOTE MEMGUARD_MORNING_STALE: {flag} is {int(age // 60)} minutes old; ignored (a morning job left it behind)")
        return False
    return True


def wait(lane: str, *, deadline: float | None = None, reader=read, sleep=time.sleep, clock=time.time,
         log=print, max_pause_s: float = MAX_PAUSE_S, flag: Path | None = None) -> str:
    """Block while the morning window is on, then while pressure is high. Returns "go" (clear, never
    paused or resumed), "resumed", or "one-lane" (gave up: paused past max_pause_s, or past the deadline).
    Logs each pause and resume as a named note."""
    flag = flag or MORNING_FLAG
    resumed = False
    if morning_on(flag, clock, log):
        start = clock()
        log(f"NOTE MEMGUARD_MORNING_PAUSE {lane}: {flag} exists (her morning jobs run); only the Bible lane goes on")
        while morning_on(flag, clock, log):
            if deadline and clock() >= deadline:
                log(f"NOTE MEMGUARD_ONE_LANE {lane}: the morning window outlasted this run's box; the next run looks again")
                return "one-lane"
            sleep(CHECK_EVERY_S)
        log(f"NOTE MEMGUARD_MORNING_RESUME {lane}: the morning window ended after {int(clock() - start)}s")
        resumed = True
    m = reader()
    if not high(m):
        return "resumed" if resumed else "go"
    start = clock()
    log(f"NOTE MEMGUARD_PAUSE {lane}: {line(m)}; waiting for memory to clear")
    while True:
        if clock() - start >= max_pause_s or (deadline and clock() >= deadline):
            log(f"NOTE MEMGUARD_ONE_LANE {lane}: still high after {int(clock() - start)}s ({line(m)}); "
                "this lane stops for the run and the other carries on alone")
            return "one-lane"
        sleep(CHECK_EVERY_S)
        m = reader()
        if not high(m):
            log(f"NOTE MEMGUARD_RESUME {lane}: {line(m)} after {int(clock() - start)}s")
            return "resumed"
