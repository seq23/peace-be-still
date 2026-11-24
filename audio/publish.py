"""PUBLISH: put every shelved, passed library file in the app's R2 bucket and serve the manifest.

The ONE path to R2, for new files and the backfill alike (run.sh runs it after the render lanes,
inside the run window). Drive stays the master; R2 is what the app plays and can be rebuilt from it.

Per file (a manifest row with status passed, a sha256 and a Drive `shelved` path, latest row per file):
  Drive's own SHA-256 of the shelved copy must equal the manifest's (else the row is HELD, not served)
  -> `rclone copyto <shelved> r2:<bucket>/<file>` (Drive streams straight into R2: the Mac never holds
  the file) -> R2's size and md5 must equal Drive's (else the object is deleted: NAMED STOP R2_HASH_MISMATCH).
The served manifest `manifest.jsonl` at the bucket root is the ledger: one public row per file that is
in R2 (file, kind, lang, ref, seconds, sha256, voice, status, and a story's or night's title, key verse,
journey and pause timings; never checks or Drive paths). A file whose ledger sha256 equals the manifest's is done, so every run is idempotent and
a run cut off by its time box resumes where it stopped. The app reads <audioBaseUrl>/manifest.jsonl
to check which tracks it can stream and to list every track published after its build.

Where (her ruling 20 Nov 2026): her SECOND Cloudflare account. Its free 10 GB is shared by every bucket
on it (this library, the private made-for-you bucket, anything else), so the cap is read for the WHOLE
account from Cloudflare's own R2 storage analytics (account_bytes(); token CF2_WORKERS_AI_TOKEN, the
second account's token that also reads its analytics). The account's stored bytes plus this batch must stay under PBS_R2_FREE_CAP_GB
(default 9.5 of the free 10 GB), else NAMED STOP R2_FREE_STORAGE (nothing past the cap is uploaded). An
unreadable total is NAMED STOP R2_USAGE_UNREAD: nothing is uploaded on a guess. Class A operations: a run
costs about one listing plus one PUT per new file, far under the free 1,000,000 a month.

Key: CF2_ACCOUNT_ID + PBS_CF2_R2_ACCESS_KEY_ID / PBS_CF2_R2_SECRET_ACCESS_KEY from the Boss OS vault
(vault:run), passed to rclone in its environment, never argv.
Output: `OUTPUT <n> files published to R2` and `r2: X of Y shelved files public`.
By hand: cd ~/GitHub/boss-os && npm run -s vault:run -- <python> <repo>/audio/publish.py --limit 3 [--dry-run]
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import subprocess
import urllib.request
import sys
import tempfile
import time
from pathlib import Path

AUDIO = Path(__file__).resolve().parent
sys.path.insert(0, str(AUDIO))
import fill  # noqa: E402
from fill import NamedStop  # noqa: E402

BUCKET = os.environ.get("PBS_R2_BUCKET", "peace-be-still-audio")
PUBLIC_BASE = "https://pbs-audio.professionalresourcelibrary.com/"
SERVED = "manifest.jsonl"
FREE_CAP_BYTES = float(os.environ.get("PBS_R2_FREE_CAP_GB", "9.5")) * 1e9
PUBLIC_FIELDS = ("file", "kind", "lang", "ref", "seconds", "sha256", "voice", "status")
AUDIO_HEADERS = ["--header-upload", "Content-Type: audio/mp4",
                 "--header-upload", "Cache-Control: public, max-age=86400"]
SERVED_HEADERS = ["--header-upload", "Content-Type: application/x-ndjson; charset=utf-8",
                  "--header-upload", "Cache-Control: public, max-age=300"]
RCLONE_ENV: dict = {}


def rclone(*args: str, timeout: int = 600) -> subprocess.CompletedProcess:
    return subprocess.run(["rclone", *args], capture_output=True, text=True, timeout=timeout,
                          env={**os.environ, **RCLONE_ENV})


# ------------------------------------------------------------------ pure parts (tested)
def candidates(rows: list[dict]) -> dict[str, dict]:
    """file -> the latest row, kept only when it passed and is shelved with a hash."""
    return {f: r for f, r in fill.latest(rows).items()
            if r.get("status") == "passed" and r.get("sha256") and r.get("shelved")}


def todo(cands: dict[str, dict], ledger: dict[str, dict], in_r2: dict[str, dict]) -> list[dict]:
    """Rows whose file is not yet served with this exact sha256 (a re-mastered file goes again)."""
    return [r for f, r in cands.items()
            if not (f in ledger and ledger[f].get("sha256") == r["sha256"] and f in in_r2)]


# The spoken scripts whose title, key verse, journey and pause timings the app shows (app/src/player/build-library.ts
# reads the same files at build time; this serves them so a story or night published after a build still lists).
SCRIPT_ROOTS = ("stories", "psalm-nights", "imagination-nights")
NIGHT_JOURNEYS = ("grief", "back-to-sleep")


def key_scripture(blocks) -> str | None:
    """A story's key verse: the Scripture its call and response answers (the last one before it), else its first."""
    if not isinstance(blocks, list):
        return None
    is_ref = lambda b: isinstance(b, dict) and b.get("type") == "scripture" and isinstance(b.get("ref"), str)
    call = next((i for i, b in enumerate(blocks) if isinstance(b, dict) and b.get("type") == "call_response"), -1)
    for b in reversed(blocks[:max(call, 0)]):
        if is_ref(b):
            return b["ref"]
    return next((b["ref"] for b in blocks if is_ref(b)), None)


def script_display(row: dict) -> dict:
    """The served display fields of a story or night (title, scripture_ref, journey, pause_starts_s); {} for
    scripture rows or an unreadable script, which the app then lists by its bundled copy only."""
    repo = fill.REPO.resolve()
    p = (repo / str(row.get("ref", "")).split("#")[0]).resolve()
    if not any(str(p).startswith(str(repo / "content" / root) + "/") for root in SCRIPT_ROOTS) \
            or p.suffix != ".json" or not p.is_file():
        return {}
    try:
        doc = json.loads(p.read_text("utf-8"))
    except Exception:
        return {}
    title = doc.get("title")
    if not isinstance(title, str) or not title.strip():
        return {}
    out: dict = {"title": title.strip()}
    main = doc.get("main")
    ref = key_scripture(doc.get("blocks")) or (main[0] if isinstance(main, list) and main and isinstance(main[0], str) else None)
    if ref:
        out["scripture_ref"] = ref
    if doc.get("journey") in NIGHT_JOURNEYS:
        out["journey"] = doc["journey"]
    starts = (row.get("checks") or {}).get("pause_starts_s")
    if isinstance(starts, list) and len(starts) == 2 and all(isinstance(x, (int, float)) for x in starts):
        out["pause_starts_s"] = starts
    return out


def public_row(row: dict) -> dict:
    out = {k: row[k] for k in PUBLIC_FIELDS if k in row}
    out.update(script_display(row))
    return out


def served_text(ledger: dict[str, dict]) -> str:
    return "".join(json.dumps(ledger[f], ensure_ascii=False, sort_keys=True) + "\n" for f in sorted(ledger))


def estimate_bytes(row: dict) -> int:
    """AAC 48 kbps mono plus container overhead; used only for the free-cap guard."""
    return int(float(row.get("seconds") or 0) * 48000 / 8 * 1.1) + 4096


def fits(batch: list[dict], account_bytes: float, cap: float = FREE_CAP_BYTES) -> list[dict]:
    """The longest prefix of the batch that keeps the account's R2 storage under the free cap."""
    out, total = [], account_bytes
    for r in batch:
        total += estimate_bytes(r)
        if total > cap:
            break
        out.append(r)
    return out


# ------------------------------------------------------------------ Cloudflare
def connect() -> None:
    """Fill RCLONE_ENV with an `r2:` remote on the second account. No key = NAMED STOP R2_KEY_MISSING."""
    need = ("CF2_ACCOUNT_ID", "PBS_CF2_R2_ACCESS_KEY_ID", "PBS_CF2_R2_SECRET_ACCESS_KEY")
    if not all(os.environ.get(k) for k in need):
        raise NamedStop("R2_KEY_MISSING", f"{' / '.join(need)} are not all set; run through "
                        "`npm run -s vault:run --` in ~/GitHub/boss-os. Nothing was published.")
    RCLONE_ENV.update({
        "RCLONE_CONFIG_R2_TYPE": "s3", "RCLONE_CONFIG_R2_PROVIDER": "Cloudflare",
        "RCLONE_CONFIG_R2_ACCESS_KEY_ID": os.environ["PBS_CF2_R2_ACCESS_KEY_ID"],
        "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY": os.environ["PBS_CF2_R2_SECRET_ACCESS_KEY"],
        "RCLONE_CONFIG_R2_ENDPOINT": f"https://{os.environ['CF2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        "RCLONE_CONFIG_R2_NO_CHECK_BUCKET": "true"})


R2_USAGE_QUERY = """query ($account: String!, $since: Time!) { viewer { accounts(filter: {accountTag: $account}) {
  r2StorageAdaptiveGroups(limit: 1000, filter: {datetime_geq: $since}, orderBy: [datetime_DESC]) {
    max { payloadSize metadataSize } dimensions { bucketName datetime } } } } }"""


def account_bytes(post=None, now: dt.datetime | None = None) -> float:
    """Every bucket's stored bytes on the second account (its latest storage sample per bucket), from
    Cloudflare's GraphQL analytics. Unreadable -> NAMED STOP R2_USAGE_UNREAD before anything is uploaded."""
    token, account = os.environ.get("CF2_WORKERS_AI_TOKEN"), os.environ.get("CF2_ACCOUNT_ID")
    if not token or not account:
        raise NamedStop("R2_USAGE_UNREAD", "CF2_WORKERS_AI_TOKEN with CF2_ACCOUNT_ID (the second account) "
                        "is not set, so the account's whole R2 storage cannot be counted. Nothing was uploaded.")
    since = ((now or dt.datetime.now(dt.timezone.utc)) - dt.timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = json.dumps({"query": R2_USAGE_QUERY, "variables": {"account": account, "since": since}}).encode()
    def fetch(data: bytes) -> dict:
        request = urllib.request.Request("https://api.cloudflare.com/client/v4/graphql", data=data, method="POST",
                                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    try:
        reply = (post or fetch)(body)
        groups = reply["data"]["viewer"]["accounts"][0]["r2StorageAdaptiveGroups"]
    except Exception:
        raise NamedStop("R2_USAGE_UNREAD", "Cloudflare's R2 storage analytics did not answer. Nothing was uploaded.") from None
    latest: dict[str, float] = {}
    for group in groups:  # newest first: the first sample seen for a bucket is its current size
        name = group["dimensions"]["bucketName"]
        if name not in latest:
            latest[name] = float(group["max"]["payloadSize"] or 0) + float(group["max"]["metadataSize"] or 0)
    return sum(latest.values())


def r2_listing() -> dict[str, dict]:
    r = rclone("lsjson", "-R", "--files-only", "--hash", f"r2:{BUCKET}", timeout=600)
    if r.returncode != 0:
        raise NamedStop("R2_UNREACHABLE", f"could not list r2:{BUCKET}: {r.stderr.strip()[-200:]}")
    return {e["Path"]: e for e in json.loads(r.stdout or "[]")}


def read_ledger() -> dict[str, dict]:
    r = rclone("cat", f"r2:{BUCKET}/{SERVED}", timeout=300)
    if r.returncode != 0:
        if "not found" in r.stderr.lower() or "404" in r.stderr or "NoSuchKey" in r.stderr:
            return {}
        raise NamedStop("R2_UNREACHABLE", f"could not read the served manifest: {r.stderr.strip()[-200:]}")
    return {row["file"]: row for row in (json.loads(x) for x in r.stdout.splitlines() if x.strip())}


def write_ledger(ledger: dict[str, dict]) -> None:
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / SERVED
        p.write_text(served_text(ledger), "utf-8")
        r = rclone("copyto", *SERVED_HEADERS, str(p), f"r2:{BUCKET}/{SERVED}", timeout=300)
    if r.returncode != 0:
        raise NamedStop("R2_UNREACHABLE", f"could not write the served manifest: {r.stderr.strip()[-200:]}")


def publish_one(row: dict) -> None:
    """Drive -> R2 for one row, both hashes checked. Raises NamedStop; returns only when R2 matches."""
    f, src = row["file"], row["shelved"]
    r = rclone("lsjson", "--hash", "--files-only", src, timeout=300)
    try:
        drive = json.loads(r.stdout)[0]
    except Exception:
        raise NamedStop("SHELF_MISSING", f"{f}: the shelved copy {src} is not on Drive ({r.stderr.strip()[-160:]})", 0)
    if (drive.get("Hashes") or {}).get("sha256") != row["sha256"]:
        raise NamedStop("SHELF_HASH_MISMATCH", f"{f}: Drive's SHA-256 is not the manifest's; held, not served", 0)
    dest = f"r2:{BUCKET}/{f}"
    r = rclone("copyto", *AUDIO_HEADERS, src, dest, timeout=1800)
    if r.returncode != 0:
        raise NamedStop("R2_UNREACHABLE", f"{f}: the copy to R2 failed: {r.stderr.strip()[-200:]}")
    r = rclone("lsjson", "--hash", "--files-only", dest, timeout=300)
    try:
        got = json.loads(r.stdout)[0]
    except Exception:
        got = {}
    if got.get("Size") != drive.get("Size") or (got.get("Hashes") or {}).get("md5") != drive["Hashes"].get("md5"):
        rclone("deletefile", dest, timeout=300)
        raise NamedStop("R2_HASH_MISMATCH", f"{f}: R2 has size {got.get('Size')} md5 {(got.get('Hashes') or {}).get('md5')}, "
                        f"Drive has {drive.get('Size')} {drive['Hashes'].get('md5')}; the R2 copy was deleted")


# ------------------------------------------------------------------ the run
def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="at most this many files this run")
    ap.add_argument("--max-minutes", type=float, default=0, help="stop starting new files after this")
    ap.add_argument("--dry-run", action="store_true", help="print what would go up and the free-tier room")
    a = ap.parse_args(argv)

    fill.HOME.mkdir(parents=True, exist_ok=True)
    lock = (fill.HOME / "r2-publish.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("OUTPUT 0 files published to R2 (note: another publish run holds the lock)")
        return 0

    now = dt.datetime.now(fill.CT)
    connect()
    cands = candidates(fill.read_manifest())
    in_r2 = r2_listing()
    previous_ledger = read_ledger()
    ledger = {f: r for f, r in previous_ledger.items() if f in in_r2}
    # A served row whose file is unchanged takes the script's current display (title, key verse, journey,
    # pauses), so the rows published before the app read them live carry them too.
    for f, r in cands.items():
        if f in ledger and ledger[f].get("sha256") == r["sha256"] and ledger[f] != public_row(r):
            ledger[f] = public_row(r)
    queue = todo(cands, ledger, in_r2)
    if a.limit:
        queue = queue[:a.limit]
    # The analytics lag by up to an hour, so this bucket's own listing is the floor for its share.
    stored = max(account_bytes(), float(sum(e.get("Size") or 0 for e in in_r2.values())))
    batch = fits(queue, stored)
    room = f"account {stored / 1e9:.2f} of {FREE_CAP_BYTES / 1e9:.1f} GB cap (second account, all buckets, free 10 GB)"
    if a.dry_run:
        print(f"{len(queue)} to publish, {len(batch)} fit under the free cap; {room}")
        return 0

    stop: NamedStop | None = None
    held: list[str] = []
    made, t0, dirty = 0, time.monotonic(), ledger != previous_ledger
    try:
        for row in batch:
            if a.max_minutes and (time.monotonic() - t0) / 60 >= a.max_minutes:
                break
            try:
                publish_one(row)
            except NamedStop as e:
                if e.exit_code == 0 or e.code == "R2_HASH_MISMATCH":
                    dirty = ledger.pop(row["file"], None) is not None or dirty
                if e.exit_code == 0:      # one bad shelf copy: hold that file, carry on
                    held.append(str(e))
                    continue
                raise
            ledger[row["file"]] = public_row(row)
            made, dirty = made + 1, True
            print(f"r2     {row['file']}", flush=True)
            if made % 20 == 0:
                write_ledger(ledger)
                dirty = False
    except NamedStop as e:
        stop = e
    finally:
        if dirty or (cands and not in_r2.get(SERVED)):
            write_ledger(ledger)
    if not stop and len(batch) < len(queue) and len(batch) == made:
        stop = NamedStop("R2_FREE_STORAGE", f"{room}; {len(queue) - len(batch)} files wait. The bucket is near "
                         "the second account's free 10 GB: her call (more space or a third account); nothing past the cap is uploaded.")
    public = sum(1 for f in cands if f in ledger and ledger[f]["sha256"] == cands[f]["sha256"])
    for h in held:
        print(f"HELD {h}", file=sys.stderr)
    print(f"OUTPUT {made} files published to R2")
    print(f"r2: {public} of {len(cands)} shelved files public at {PUBLIC_BASE}; {room}"
          + (f"; {len(held)} held" if held else ""))
    if stop:
        print(str(stop), file=sys.stderr)
        print(fill.morning_line(f"Peace Be Still audio publish stopped: {stop}", f"stop:{stop.code}", now))
        return stop.exit_code
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except NamedStop as e:
        print(str(e), file=sys.stderr)
        sys.exit(e.exit_code or 9)
