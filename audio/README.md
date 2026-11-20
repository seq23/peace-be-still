# Audio: the library fill (Phase 4 home)

Voices the app's library on her Mac and shelves every file on Drive. Audio never goes in git; this
folder holds the code and `manifest.jsonl` (one row per file: file, kind, lang, ref, seconds, sha256,
checks, shelved, status, voice).

- **Order**: (1) Psalms, KJV + RV1909, one file per psalm; (2) every other chapter of the 66 books,
  English and Spanish book by book; (3) scripts in `content/` marked `"status": "passed"`.
- **Per file**: `render_kokoro.py` (Kokoro, voices in `VOICES.md`, 1.5 s quiet between psalm verses,
  1.0 s between chapter verses) → `fill.master` (two-pass EBU R128 `loudnorm`, true-peak target 1 dB
  under the ceiling, then AAC-LC mono 48 kbps `.m4a`; the ENCODED file is measured and, if AAC pushed it
  outside the bars, mastered again from the kept WAV, at most 3 times) → `qa.py` (word accuracy with
  faster-whisper, loudness/true peak/0 clipped, last words present, words a minute) → `rclone copyto`
  `gdrive:Mac-Shelf/peace-be-still/audio/<lang>/<kind>/` + md5 check → deleted from the Mac → manifest row
  (one row per file). Only a speech problem (A01, A07, length) is re-rendered (once, speed 0.82); a
  mastering problem (A06) never costs a render. A `FAILED` row is tried again on later runs before any
  new file; after 3 failed runs it is `NAMED STOP [FAILED_3_TRIES]` in the census line, naming the files.
- **Spoken text**: stored text word for word; `[ ]`/`( )` marks dropped, ALL-CAPS said as words,
  names respelled from `pronunciations.json` (`engine`).
- **Run window** (her pick, 20 Nov 2026): Mon–Fri 17:00–08:00 CT and all weekend. `run.sh` exits
  with a `NOTE` line outside it and caps each step to the minutes left before the next weekday 08:00
  (`fill.window_minutes`), so a batch never runs into her workday.
- **Schedule**: launchd `com.seq.pbs-library-fill` (`launchd/install.sh`), every 15 minutes, Nice 15 +
  low-priority I/O, from the runner clone `~/GitHub/.pbs-runner` via `run.sh`; a run lasts up to
  110 minutes and pushes the manifest to main every 10 files.
- **Pause flag**: `~/.peace-be-still/library-fill.active` exists while priorities 1–2 are incomplete
  (How We Know / Whisper Almanac pause on it); the run that completes them removes it.
- **Output**: `OUTPUT <n> files shelved` and `library fill: X of Y files, Z hours shelved, N failed`,
  once a day into the morning email's Notices. Stops: `DRIVE_UNREACHABLE`, `SHELF_HASH_MISMATCH`,
  `SHELF_NOT_VERIFIED`, `MAC_BUDGET` (5 GB), `SCRIPTURE_MISSING`, `NOTHING_SHELVED`.
- **Hush Harbor stories** (`hush_harbor.py`, same launchd job, after the fill step in `run.sh`):
  the four locked Gemini voices in `hush-harbor/voices.json` (key `PBS_GEMINI_API_KEY`, the app's own free-tier project) (grandmother Gacrux narrates and reads
  Jesus's and God's words; Charon elder men; Kore women; Umbriel other men and groups). Two
  multi-speaker calls per story, split at the call and response; the 3 s pauses are silence put in by
  code. Checks: word accuracy and per-voice pitch band per call (a miss renders again), then the fill's
  file checks (`qa.py`, -22 LUFS). Shelf `gdrive:Mac-Shelf/peace-be-still/stories/hush-harbor/en/`,
  a manifest row with the model used. The free key gives 10 calls a day per TTS model; the models in
  `voices.json` are tried in turn (a model other than the first only after it passes vetting: `hush_harbor.py --vet MODEL` scores its four voices against her picked clips, logged in `hush-harbor/model-vetting.json`; one story never mixes models), then `QUOTA_OUT` (a note, exit 0) and the next run resumes from the
  calls cached in `~/.peace-be-still/hh-work/`. Output `OUTPUT <n> Hush Harbor stories shelved` and
  `hush harbor: X of Y stories voiced, N failed`. Mi Refugio stays on the Spanish Kokoro blend.
- **Hush Harbor clone lane** (`hush_clone.py` + `render_chatterbox.py`, owner: "Use the clones"):
  Chatterbox (MIT) clones of her four picked clips (`gdrive:Mac-Shelf/peace-be-still/voices/hush-harbor/`),
  one sentence at a time on the Mac's CPU. It works down from the highest story number while the
  Gemini lane works up, and the first lane to start a story writes `engine` in its work folder, so a
  story never mixes engines. Checks: each sentence's word accuracy, each turn's speaker similarity
  over its role's floor (`voices.json` clone.floor), then the same file checks and shelf. `run.sh`
  runs one clone story after each fill chunk, under the same lock, so the Mac alternates.
- **Not yet here** (Phase 4 proper): A02 verse-by-verse alignment, A03 full name inventory + name
  reel heard by a person, A04 heteronyms, A05 Psalm Nights session pacing, R2 upload.
- **R2 layout** (the app reads it): bucket `peace-be-still-audio`, object key = the manifest `file` exactly
  (`en/psalms/…`, `stories/hush-harbor/en/…`), never the `shelved` path. The app's player is in `app/src/player/`.
- Tests: `python3 -m unittest discover -s audio/tests` (needs numpy) and `python3 audio/check_manifest.py --self-test`.
