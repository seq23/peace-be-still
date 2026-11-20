"""PUBLISH: put every shelved, passed library file in the app's R2 bucket and serve the manifest.

The ONE path to R2, for new files and the backfill alike (run.sh runs it after the render lanes,
inside the run window). Drive stays the master; R2 is what the app plays and can be rebuilt from it.

Per file (a manifest row with status passed, a sha256 and a Drive `shelved` path, latest row per file):
  Drive's own SHA-256 of the shelved copy must equal the manifest's (else the row is HELD, not served)
  -> `rclone copyto <shelved> r2:<bucket>/<file>` (Drive streams straight into R2: the Mac never holds
  the file) -> R2's size and md5 must equal Drive's (else the object is deleted: NAMED STOP R2_HASH_MISMATCH).
The served manifest `manifest.jsonl` at the bucket root is the ledger: one public row per file that is
in R2 (file, kind, lang, ref, seconds, sha256, voice, status, and a story's title; never checks or
Drive paths). A file whose ledger sha256 equals the manifest's is done, so every run is idempotent and
a run cut off by its time box resumes where it stopped. The app reads <audioBaseUrl>/manifest.jsonl
to check which tracks from the bundled catalog it can stream.

Where (her ruling 20 Nov 2026): her SECOND Cloudflare account, which holds only this bucket, so its own
free 10 GB is the app's. Free tier only: the bucket's stored bytes (summed from the S3 listing; the key is
scoped to this one bucket) plus this batch must stay under PBS_R2_FREE_CAP_GB (default 9.5 of the free
10 GB), else NAMED STOP R2_FREE_STORAGE (nothing past the cap is uploaded). Class A operations are not
read (the key cannot see analytics); a run costs about one listing plus one PUT per new file, far under
the free 1,000,000 a month.

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
import sys
import tempfile
import time
from pathlib import Path

AUDIO = Path(__file__).resolve().parent
sys.path.insert(0, str(AUDIO))
import fill  # noqa: E402
from fill import NamedStop  # noqa: E402

BUCKET = os.environ.get("PBS_R2_BUCKET", "peace-be-still-audio")
PUBLIC_BASE = "https://audio.peacebestillapp.com/"
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


def story_title(row: dict) -> str | None:
    p = (fill.REPO / row["ref"]).resolve()
    if row.get("kind") != "stories" or not str(p).startswith(str(fill.REPO / "content")) or not p.is_file():
        return None
    try:
        t = json.loads(p.read_text("utf-8")).get("title")
    except Exception:
        return None
    return t.strip() if isinstance(t, str) and t.strip() else None


def public_row(row: dict) -> dict:
    out = {k: row[k] for k in PUBLIC_FIELDS if k in row}
    title = story_title(row)
    if title:
        out["title"] = title
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


def stored_bytes(in_r2: dict[str, dict]) -> float:
    """Bytes in the bucket (the second account's only bucket), from the listing already read."""
    return float(sum(e.get("Size") or 0 for e in in_r2.values()))


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
    queue = todo(cands, ledger, in_r2)
    if a.limit:
        queue = queue[:a.limit]
    stored = stored_bytes(in_r2)
    batch = fits(queue, stored)
    room = f"bucket {stored / 1e9:.2f} of {FREE_CAP_BYTES / 1e9:.1f} GB cap (second account, free 10 GB)"
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
