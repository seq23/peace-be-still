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
        "Listen now to the words of Psalm {name}.",
        "Let those words be enough for this moment. You can rest here awhile.",
    ),
    ("es", "psalm"): (
        "Tómate un momento para acomodarte. Aquí hay espacio para lo que traes esta noche.",
        "Escucha ahora las palabras del Salmo {name}.",
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
# The comfort psalms the Worker turns through (PSALMS in worker/src/madeForYou.ts): verses read, and the name spoken.
PSALMS = {
    23: (6, "twenty-three", "veintitrés"), 4: (8, "four", "cuatro"), 121: (8, "one hundred twenty-one", "ciento veintiuno"),
    131: (3, "one hundred thirty-one", "ciento treinta y uno"), 91: (16, "ninety-one", "noventa y uno"),
    139: (12, "one hundred thirty-nine", "ciento treinta y nueve"),
}
# One config with the Worker (worker/src/madeForYou.config.json): the session time the nightly promise is
# built on is the same number the drain uses to decide whether another session fits.
CONFIG = json.loads((Path(__file__).resolve().parents[1] / "worker/src/madeForYou.config.json").read_text())
MIN_SESSION_SECONDS = CONFIG["sessionMinutes"] * 60
# A pass drains the whole queue; the box only stops a hung render. launchd starts a pass every 15 minutes.
BOX_MINUTES = 60
HELD_CODES = {
    "MADE_FOR_YOU_DRAFT", "MADE_FOR_YOU_QA", "MADE_FOR_YOU_NO_FREE_MODEL",
    "MADE_FOR_YOU_PSALM_UNAVAILABLE", "MADE_FOR_YOU_ATTEMPTS_EXHAUSTED",
    "MADE_FOR_YOU_CLAIM_TIMEOUT", "LEASE_EXPIRED", "MADE_FOR_YOU_ENDED", "MFY_SHARE_USED",
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
    psalm = PSALMS.get(job.get("psalm")) if bridge else None
    if bridge and not psalm:
        raise ValueError("Invalid psalm")
    if not isinstance(verses, list) or len(verses) != (psalm[0] if psalm else 0):
        raise ValueError("Invalid verse sequence")
    if psalm:
        bridge = bridge.format(name=psalm[1 if job["lang"] == "en" else 2])
    if any(not isinstance(verse, str) or not verse.strip() for verse in verses):
        raise ValueError("Invalid stored verse")
    prose = [paragraph.strip() for paragraph in reflection.splitlines() if paragraph.strip()]
    # The fixed closing paragraphs (worker/src/madeForYou.library.ts) follow the psalm, before the closing line.
    after = job.get("closing")
    if not isinstance(after, str) or not after.strip():
        raise ValueError("Invalid closing")
    after = [paragraph.strip() for paragraph in after.splitlines() if paragraph.strip()]
    return {
        "lang": job["lang"], "kind": "made-for-you", "ref": job["id"], "file": job["path"],
        "text": fill.TRANSLATION_NAME[job["lang"]] if bridge else "script",
        "level": "sleep", "heading": "", "gap": fill.GAP["psalms"],
        "verses": [opening, *prose, *([bridge, *verses] if bridge else []), *after, closing],
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
    fill.master(shaped, out, item["level"])   # ffmpeg's own AAC: no AudioToolbox needed in the background
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


def connect_private() -> str:
    """An `r2p:` rclone remote from the private bucket's own token (PBS_MFY_R2_*, scoped to that bucket
    only, never the public library's key), in rclone's environment, never argv. Returns the bucket."""
    need = ("CF2_ACCOUNT_ID", "PBS_MFY_R2_ACCESS_KEY_ID", "PBS_MFY_R2_SECRET_ACCESS_KEY", "PBS_MFY_R2_BUCKET")
    if not all(os.environ.get(k) for k in need):
        raise fill.NamedStop("MADE_FOR_YOU_STORAGE_CONFIG", f"{' / '.join(need)} are not all set (Boss OS vault).")
    bucket = os.environ["PBS_MFY_R2_BUCKET"]
    if bucket == publish.BUCKET:
        raise fill.NamedStop("MADE_FOR_YOU_PRIVATE_BUCKET", "Private sessions never go in the public library bucket.")
    publish.RCLONE_ENV.update({
        "RCLONE_CONFIG_R2P_TYPE": "s3", "RCLONE_CONFIG_R2P_PROVIDER": "Cloudflare",
        "RCLONE_CONFIG_R2P_ACCESS_KEY_ID": os.environ["PBS_MFY_R2_ACCESS_KEY_ID"],
        "RCLONE_CONFIG_R2P_SECRET_ACCESS_KEY": os.environ["PBS_MFY_R2_SECRET_ACCESS_KEY"],
        "RCLONE_CONFIG_R2P_ENDPOINT": f"https://{os.environ['CF2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        "RCLONE_CONFIG_R2P_NO_CHECK_BUCKET": "true"})
    return bucket


def drop(item: dict, bucket: str) -> None:
    """Removes an upload the Worker refused (the session ended while it was being voiced)."""
    result = publish.rclone("deletefile", f"r2p:{bucket}/{item['file']}", timeout=60)
    if result.returncode:
        # The Worker's hourly sweep deletes it from the key it set when the session ended.
        print("NOTE an orphaned private upload is left for the Worker's hourly sweep", flush=True)


def upload(item: dict, local: Path, bucket: str) -> None:
    # The second account's free 10 GB covers every bucket on it: the account's whole use, read once.
    if publish.account_bytes() + local.stat().st_size > publish.FREE_CAP_BYTES:
        raise fill.NamedStop("MADE_FOR_YOU_R2_FREE_CAP", "Private audio is held at the free storage cap.")
    dest = f"r2p:{bucket}/{item['file']}"
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


def process_one(call, render, put, drop) -> bool:
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
            try:
                row = render(item, Path(directory))
            except fill.NamedStop:
                raise
            except Exception:
                # A crash in the voice, ffmpeg or the QA check is a failed try (the third stops the request),
                # never an aborted pass that leaves the same row first in line for 7 days.
                raise failed("MADE_FOR_YOU_QA") from None
            if row["status"] != "passed":
                raise failed("MADE_FOR_YOU_QA")
            put(item, Path(row["_local"]))
            try:
                answer = call(job["id"], {"lease": job["lease"], "seconds": row["seconds"], "sha256": row["sha256"]})
            except HTTPError as error:
                if error.code != 409:
                    raise
                # She deleted it, or it expired, while it was being voiced: the audio must not stay.
                drop(item)
                raise fill.NamedStop("MADE_FOR_YOU_ENDED", "The session ended during its render; its upload was removed.") from None
            if answer.get("published") is not True:
                raise fill.NamedStop("MADE_FOR_YOU_PUBLISH", "The Worker did not confirm publication.")
        return True
    finally:
        print(f"NOTE private session elapsed {time.monotonic() - started:.1f} s", flush=True)


def drain_queue(call, render, put, *, drop, deadline: float = float("inf")) -> int:
    """Make sessions until the queue is empty or another would not fit. A held request is a NOTE: the
    Worker keeps it and the app shows her the retry; only a broken promise is a stop (report())."""
    published = 0
    consecutive_timeouts = 0
    while deadline - time.monotonic() >= MIN_SESSION_SECONDS:
        try:
            if not process_one(call, render, put, drop):
                break
        except fill.NamedStop as error:
            if error.code not in HELD_CODES:
                raise
            print(f"NOTE [{error.code}] one private request held for a retry", flush=True)
            consecutive_timeouts = consecutive_timeouts + 1 if error.code == "MADE_FOR_YOU_CLAIM_TIMEOUT" else 0
            if consecutive_timeouts >= 2:
                break
            continue
        consecutive_timeouts = 0
        published += 1
    return published


def report(call, published: int) -> None:
    """The pass's one OUTPUT line, then MADE_FOR_YOU_LATE when any request is past the time she was shown."""
    status = call("status", {})
    print(f"OUTPUT {published} published, queue {status['queue']}, held {status['held']}, "
          f"oldest {status['oldestHours']:.1f} hours, late {status['late']}, refused full {status.get('refusedFull', 0)}", flush=True)
    if status["late"]:
        raise fill.NamedStop("MADE_FOR_YOU_LATE", f"{status['late']} private session(s) past the promised time.")


def work(*, deadline: float = float("inf"), render: bool = True) -> int:
    base, secret = os.getenv("PBS_MADE_FOR_YOU_API", ""), os.getenv("PBS_MADE_FOR_YOU_RUNNER_SECRET", "")
    url = urlsplit(base)
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment or not secret:
        raise fill.NamedStop("MADE_FOR_YOU_CONFIG", "Configure the HTTPS API and the runner secret.")
    call = make_request(base, secret)
    published = 0
    if render:
        bucket = connect_private()
        published = drain_queue(call, render_session, lambda item, local: upload(item, local, bucket),
                                drop=lambda item: drop(item, bucket), deadline=deadline)
    report(call, published)
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
    """launchd entry (com.seq.pbs-made-for-you, its own job, log and exit code; audio/made_for_you.sh)."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-minutes", type=int, default=BOX_MINUTES)
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--deadline", type=float, default=float("inf"), help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        if args.worker:
            return work(deadline=args.deadline)
        minutes = min(args.max_minutes, BOX_MINUTES, fill.window_minutes(dt.datetime.now(fill.CT)))
        if minutes * 60 < MIN_SESSION_SECONDS:
            # Her workday (or the window's last minutes): nothing is rendered, but a late promise still shows.
            return work(render=False)
        fill.HOME.mkdir(parents=True, exist_ok=True)
        # Its own lock: the library fill never makes a paid session wait, and two passes never overlap.
        with (fill.HOME / "made-for-you.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print("NOTE a made-for-you pass is still running")
                return 0
            seconds = minutes * 60
            deadline = time.monotonic() + seconds
            return run_timebox([sys.executable, __file__, "--worker", "--deadline", str(deadline)], seconds)
    except fill.NamedStop as error:
        # Publisher exceptions may include storage details. Never log customer data or URLs.
        print(f"NAMED STOP [{error.code}] in private session rendering", file=sys.stderr)
        return error.exit_code
    except Exception:
        print("NAMED STOP [MADE_FOR_YOU_RUN_FAILED] in private session rendering", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
