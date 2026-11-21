"""Render the paid queue on the Mac. Private audio stays out of Drive and the public manifest."""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import re
import signal
import subprocess
import sys
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import fill
import publish
import qa

TEMPLATE = {
    ("en", "psalm"): (
        "Take a moment to settle. There is room here for what you carried into the night.",
        "Listen now to the words of Psalm twenty-three.",
        "Let those words be enough for this moment. You can rest here awhile.",
    ),
    ("es", "psalm"): (
        "Tómate un momento para acomodarte. Aquí hay espacio para lo que traes esta noche.",
        "Escucha ahora las palabras del Salmo veintitrés.",
        "Deja que esas palabras basten por ahora. Puedes descansar aquí un rato.",
    ),
    ("en", "imagination"): (
        "Let the room grow quiet around you. Take your time settling in.",
        "",
        "You can leave the scene here. Feel the bed beneath you, and give yourself time to rest.",
    ),
    ("es", "imagination"): (
        "Deja que el silencio te rodee. Tómate tu tiempo para acomodarte.",
        "",
        "Puedes dejar la escena aquí. Siente la cama debajo de ti y date tiempo para descansar.",
    ),
}
# A seeded Spanish Psalm session took 7m 38s through Kokoro, mastering and QA.
# With the Worker's four-minute claim deadline, 20 minutes leaves over 50% headroom.
BOX_MINUTES = 20
# Leave time for a full claim, the measured render, and private upload before taking a lease.
MIN_SESSION_SECONDS = 14 * 60
HELD_CODES = {
    "MADE_FOR_YOU_DRAFT", "MADE_FOR_YOU_QA", "MADE_FOR_YOU_NO_FREE_MODEL",
    "MADE_FOR_YOU_PSALM_UNAVAILABLE", "MADE_FOR_YOU_ATTEMPTS_EXHAUSTED",
    "MADE_FOR_YOU_CLAIM_TIMEOUT",
}
PRIVATE_PATH = re.compile(r"made-for-you/[a-f0-9-]{36}/([a-f0-9-]{36})\.m4a")


def session_item(job: dict) -> dict:
    """The model contributes prose. Psalm text comes from the Worker's stored Bible lookup."""
    opening, bridge, closing = TEMPLATE[job["lang"], job["kind"]]
    reflection = job["reflection"]
    verses = job["verses"]
    path = PRIVATE_PATH.fullmatch(job["path"])
    if not path or path[1] != job["id"] or not re.fullmatch(r"[a-f0-9-]{36}", job["lease"]):
        raise ValueError("Invalid queue path")
    if not isinstance(reflection, str) or not reflection.strip() or re.search(r"\bmanifest\w*\b", reflection, re.I):
        raise ValueError("Invalid reflection")
    if not isinstance(verses, list) or len(verses) != (6 if bridge else 0):
        raise ValueError("Invalid verse sequence")
    if any(not isinstance(verse, str) or not verse.strip() for verse in verses):
        raise ValueError("Invalid stored verse")
    prose = [paragraph.strip() for paragraph in reflection.splitlines() if paragraph.strip()]
    return {
        "lang": job["lang"], "kind": "made-for-you", "ref": job["id"], "file": job["path"],
        "text": fill.TRANSLATION_NAME[job["lang"]] if bridge else "script",
        "level": "sleep", "heading": "", "gap": fill.GAP["psalms"],
        "verses": [opening, *prose, *([bridge, *verses] if bridge else []), closing],
    }


def render_session(item: dict, work: Path) -> dict:
    """Use the library voice, then slow the closing minutes and master the encoded audio."""
    wav, shaped, out = work / "voice.wav", work / "sleep.wav", work / "session.m4a"
    fill.render(item, fill.T.load_pronunciations(), wav, fill.SPEED)
    duration = qa.ffprobe_seconds(wav)
    # Slow the last three minutes of output by 10% and fade the last 30 seconds.
    split = duration - 162
    if split <= 0:
        return {"status": "FAILED"}
    fade = split + 150
    # 162 source seconds / 0.9 = 180 output seconds.
    filters = (
        f"[0:a]asplit[a][b];[a]atrim=end={split},asetpts=PTS-STARTPTS[head];"
        f"[b]atrim=start={split},asetpts=PTS-STARTPTS,atempo=0.9[tail];"
        f"[head][tail]concat=n=2:v=0:a=1,afade=t=out:st={fade}:d=30"
    )
    subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(wav), "-filter_complex", filters, str(shaped)],
        capture_output=True, check=True,
    )
    def encode(command, **options):
        # The shared master accepts an ffmpeg runner. Use software AAC because AudioToolbox
        # may be unavailable to the background process even on macOS.
        if "aac_at" in command:
            command = ["aac" if argument == "aac_at" else argument for argument in command]
        return subprocess.run(command, **options)

    fill.master(shaped, out, item["level"], run=encode)
    result = qa.check(out, fill.script_of(item), item["lang"], item["level"])
    if not result["pass"] or not 600 <= result["seconds"] <= 1200 or not 90 <= result["wpm"] <= 115:
        return {"status": "FAILED"}
    return {"status": "passed", "seconds": result["seconds"], "sha256": fill.sha256(out), "_local": str(out)}


def make_request(base: str, secret: str):
    def call(target: str, body: dict) -> dict:
        request = Request(
            f"{base.rstrip('/')}/made-for-you/runner/{target}",
            data=json.dumps(body).encode(), method="POST",
            headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
        )
        try:
            with urlopen(request, timeout=300 if target == "claim" else 120) as response:
                return json.load(response)
        except HTTPError as error:
            with error:
                if error.code == 503:
                    code = json.load(error).get("error")
                    if code in HELD_CODES:
                        raise fill.NamedStop(code, "The queue held this request.") from None
            raise
        except (TimeoutError, URLError) as error:
            if target == "claim" and (isinstance(error, TimeoutError) or isinstance(error.reason, TimeoutError)):
                raise fill.NamedStop("MADE_FOR_YOU_CLAIM_TIMEOUT", "Claim response timed out.") from None
            raise
    return call


def upload(item: dict, local: Path, bucket: str) -> None:
    sizes = []
    for name in (publish.BUCKET, bucket):
        result = publish.rclone("size", "--json", f"r2:{name}", timeout=60)
        if result.returncode:
            raise fill.NamedStop("MADE_FOR_YOU_R2_UNREACHABLE", "Could not check R2 storage.")
        sizes.append(json.loads(result.stdout)["bytes"])
    if sum(sizes) + local.stat().st_size > publish.FREE_CAP_BYTES:
        raise fill.NamedStop("MADE_FOR_YOU_R2_FREE_CAP", "Private audio is held at the free storage cap.")
    dest = f"r2:{bucket}/{item['file']}"
    result = publish.rclone(
        "copyto", "--checksum", "--s3-upload-cutoff", "32M",
        "--header-upload", "Content-Type: audio/mp4", "--header-upload", "Cache-Control: private, no-store",
        str(local), dest, timeout=120,
    )
    if result.returncode:
        raise fill.NamedStop("MADE_FOR_YOU_R2_UNREACHABLE", "Private audio upload failed.")
    result = publish.rclone("lsjson", "--stat", "--hash", dest, timeout=60)
    stored = json.loads(result.stdout) if result.returncode == 0 else {}
    if stored.get("Size") != local.stat().st_size or stored.get("Hashes", {}).get("md5") != fill.md5(local):
        raise fill.NamedStop("MADE_FOR_YOU_R2_HASH", "Private audio could not be verified.")


def process_one(call, render, put) -> bool:
    started = time.monotonic()
    job = call("claim", {}).get("job")
    if job is None:
        return False

    def failed(code):
        result = call(f"{job['id']}/qa-failed", {"lease": job["lease"]})
        if result.get("code") == "MADE_FOR_YOU_ATTEMPTS_EXHAUSTED":
            code = result["code"]
        return fill.NamedStop(code, "Session held by the draft or audio quality gate.")

    try:
        try:
            item = session_item(job)
        except (KeyError, TypeError, ValueError):
            raise failed("MADE_FOR_YOU_DRAFT") from None
        with TemporaryDirectory(prefix="pbs-private-audio-") as directory:
            row = render(item, Path(directory))
            if row["status"] != "passed":
                raise failed("MADE_FOR_YOU_QA")
            put(item, Path(row["_local"]))
            if call(job["id"], {"lease": job["lease"], "seconds": row["seconds"], "sha256": row["sha256"]}).get("published") is not True:
                raise fill.NamedStop("MADE_FOR_YOU_PUBLISH", "The Worker did not confirm publication.")
        return True
    finally:
        print(f"NOTE private session elapsed {time.monotonic() - started:.1f} s", flush=True)


def drain_queue(call, render, put, *, deadline: float = float("inf")) -> int:
    published = 0
    held = None
    consecutive_timeouts = 0
    while deadline - time.monotonic() >= MIN_SESSION_SECONDS:
        try:
            if not process_one(call, render, put):
                if not published and held is None:
                    print("OUTPUT 0 private sessions (queue empty)")
                break
        except fill.NamedStop as error:
            if error.code not in HELD_CODES:
                raise
            print(f"NAMED STOP [{error.code}] private request held", file=sys.stderr, flush=True)
            held = error
            consecutive_timeouts = consecutive_timeouts + 1 if error.code == "MADE_FOR_YOU_CLAIM_TIMEOUT" else 0
            if consecutive_timeouts >= 2:
                break
            continue
        consecutive_timeouts = 0
        published += 1
        print(f"OUTPUT {published} private session(s) published", flush=True)
    else:
        print("OUTPUT private queue deferred until the next render window (insufficient time for another session)", flush=True)
    if held:
        raise held
    return published


def work(*, deadline: float = float("inf")) -> int:
    base, secret = os.getenv("PBS_MADE_FOR_YOU_API", ""), os.getenv("PBS_MADE_FOR_YOU_RUNNER_SECRET", "")
    bucket = os.getenv("PBS_MADE_FOR_YOU_PRIVATE_BUCKET", "")
    url = urlsplit(base)
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment or not secret:
        raise fill.NamedStop("MADE_FOR_YOU_CONFIG", "Configure the HTTPS API and the runner secret.")
    if not bucket or bucket == publish.BUCKET:
        raise fill.NamedStop("MADE_FOR_YOU_PRIVATE_BUCKET", "Configure a separate private R2 bucket.")
    publish.connect()
    drain_queue(make_request(base, secret), render_session, lambda item, local: upload(item, local, bucket), deadline=deadline)
    return 0


def run_timebox(command: list[str], seconds: float) -> int:
    started = time.monotonic()
    # The supervisor owns the temp directory so a killed renderer cannot strand private files.
    with TemporaryDirectory(prefix="pbs-made-for-you-") as temp:
        with subprocess.Popen(command, start_new_session=True, env={**os.environ, "TMPDIR": temp}) as child:
            try:
                return child.wait(timeout=max(0, started + seconds - time.monotonic()))
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                child.wait()
                print(f"OUTPUT private render box stopped after {time.monotonic() - started:.1f} s", flush=True)
                raise fill.NamedStop("MADE_FOR_YOU_TIMEBOX", "An unfinished request can be claimed after its lease.") from None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-minutes", type=int, default=BOX_MINUTES)
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--deadline", type=float, default=float("inf"), help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        if args.worker:
            return work(deadline=args.deadline)
        minutes = min(args.max_minutes, BOX_MINUTES, fill.window_minutes(dt.datetime.now(fill.CT)))
        if minutes <= 0:
            print("OUTPUT 0 private sessions (outside the render window)")
            return 0
        fill.HOME.mkdir(parents=True, exist_ok=True)
        with (fill.HOME / "library-fill.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print("OUTPUT 0 private sessions (library fill has the lock)")
                return 0
            seconds = minutes * 60
            deadline = time.monotonic() + seconds
            return run_timebox([sys.executable, __file__, "--worker", "--deadline", str(deadline)], seconds)
    except fill.NamedStop as error:
        # Existing publisher exceptions may include storage details. Do not log customer data or URLs.
        print(f"NAMED STOP [{error.code}] in private session rendering", file=sys.stderr)
        return error.exit_code
    except Exception:
        print("NAMED STOP [MADE_FOR_YOU_RUN_FAILED] in private session rendering", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
