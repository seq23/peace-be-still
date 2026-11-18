# Audio: the library fill (Phase 4 home)

Voices the app's library on her Mac and shelves every file on Drive. Audio never goes in git; this
folder holds the code and `manifest.jsonl` (one row per file: file, kind, lang, ref, seconds, sha256,
checks, shelved, status, voice).

- **Order**: (1) Psalms, KJV + RV1909, one file per psalm; (2) every other chapter of the 66 books,
  English and Spanish book by book; (3) scripts in `content/` marked `"status": "passed"`.
- **Per file**: `render_kokoro.py` (Kokoro, voices in `VOICES.md`, 1.5 s quiet between psalm verses,
  1.0 s between chapter verses) → AAC-LC mono 48 kbps `.m4a` → `qa.py` (word accuracy with
  faster-whisper, loudness/true peak/0 clipped, last words present, words a minute) → `rclone copyto`
  `gdrive:Mac-Shelf/peace-be-still/audio/<lang>/<kind>/` + md5 check → deleted from the Mac → manifest row.
  A failed check is re-rendered once (speed 0.82), then a `FAILED` row names the problems.
- **Spoken text**: stored text word for word; `[ ]`/`( )` marks dropped, ALL-CAPS said as words,
  names respelled from `pronunciations.json` (`engine`).
- **Schedule**: launchd `com.seq.pbs-library-fill` (`launchd/install.sh`), every 15 minutes, Nice 15 +
  low-priority I/O, from the runner clone `~/GitHub/.pbs-runner` via `run.sh`; a run lasts up to
  110 minutes and pushes the manifest to main every 10 files.
- **Pause flag**: `~/.peace-be-still/library-fill.active` exists while priorities 1–2 are incomplete
  (How We Know / Whisper Almanac pause on it); the run that completes them removes it.
- **Output**: `OUTPUT <n> files shelved` and `library fill: X of Y files, Z hours shelved, N failed`,
  once a day into the morning email's Notices. Stops: `DRIVE_UNREACHABLE`, `SHELF_HASH_MISMATCH`,
  `SHELF_NOT_VERIFIED`, `MAC_BUDGET` (5 GB), `SCRIPTURE_MISSING`, `NOTHING_SHELVED`.
- **Not yet here** (Phase 4 proper): A02 verse-by-verse alignment, A03 full name inventory + name
  reel heard by a person, A04 heteronyms, A05 Psalm Nights session pacing, R2 upload, the player.
- Tests: `python3 -m unittest discover -s audio/tests` and `python3 audio/check_manifest.py --self-test`.
