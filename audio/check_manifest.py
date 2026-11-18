"""Gate on audio/manifest.jsonl (CI): every row has its fields, a passed row has a sha256, a Drive
path and checks that pass the bars, a FAILED row names its problems, no file appears twice, and
every voice id is listed in VOICES.md (QUALITY.md A09). Audio files themselves are never in git.
Exit 1 with problems by name; --self-test proves each broken shape is caught."""
import json
import re
import sys
from pathlib import Path

AUDIO = Path(__file__).resolve().parent
FIELDS = ("file", "kind", "lang", "ref", "seconds", "sha256", "checks", "shelved", "status", "voice")


def problems(rows, voices_md):
    licensed = set(re.findall(r"`(kokoro:[^`]+)`", voices_md))
    out, seen = [], set()
    for n, r in enumerate(rows, 1):
        where = f"row {n} ({r.get('file')})"
        out += [f"{where}: no {f}" for f in FIELDS if f not in r]
        if r.get("file") in seen:
            out.append(f"{where}: file listed twice")
        seen.add(r.get("file"))
        if r.get("voice") not in licensed:
            out.append(f"{where}: voice {r.get('voice')!r} is not in VOICES.md")
        if r.get("status") == "passed":
            if not re.fullmatch(r"[0-9a-f]{64}", str(r.get("sha256"))):
                out.append(f"{where}: passed without a sha256")
            if not str(r.get("shelved") or "").startswith("gdrive:"):
                out.append(f"{where}: passed but not shelved on Drive")
            if (r.get("checks") or {}).get("problems"):
                out.append(f"{where}: passed with problems listed")
        elif r.get("status") == "FAILED":
            if not (r.get("checks") or {}).get("problems"):
                out.append(f"{where}: FAILED without naming why")
        else:
            out.append(f"{where}: status {r.get('status')!r} is neither passed nor FAILED")
    return out


def main():
    voices = (AUDIO / "VOICES.md").read_text("utf-8")
    if "--self-test" in sys.argv:
        good = {"file": "en/psalms/kjv-psa-001.m4a", "kind": "psalms", "lang": "en", "ref": "PSA 1", "seconds": 60,
                "sha256": "a" * 64, "checks": {"problems": []}, "shelved": "gdrive:x", "status": "passed",
                "voice": "kokoro:af_nicole"}
        broken = [("missing field", [{k: v for k, v in good.items() if k != "ref"}]),
                  ("twice", [good, good]),
                  ("unlicensed voice", [{**good, "voice": "kokoro:af_heart"}]),
                  ("no hash", [{**good, "sha256": None}]),
                  ("not shelved", [{**good, "shelved": None}]),
                  ("failed silently", [{**good, "status": "FAILED"}]),
                  ("unknown status", [{**good, "status": "skipped"}])]
        assert not problems([good], voices), problems([good], voices)
        missed = [n for n, rows in broken if not problems(rows, voices)]
        if missed:
            print(f"NAMED STOP [SELF_TEST_BLIND] not caught: {', '.join(missed)}")
            return 1
        print(f"SELF-TEST OK — {len(broken)} broken shapes caught")
        return 0
    path = AUDIO / "manifest.jsonl"
    rows = [json.loads(l) for l in path.read_text("utf-8").splitlines() if l.strip()] if path.exists() else []
    if not rows:
        print("NAMED STOP [MANIFEST_EMPTY] audio/manifest.jsonl has no rows; the gate examined nothing")
        return 2
    p = problems(rows, voices)
    for x in p:
        print(x)
    print(f"manifest: {len(rows)} rows, {len(p)} problems")
    return 1 if p else 0


if __name__ == "__main__":
    sys.exit(main())
