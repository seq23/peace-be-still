# Audio: the library fill (Phase 4 home)

Voices the app's library on GitHub's free runners and on her Mac, and shelves every file on Drive. Audio never goes in git; this
folder holds the code and `manifest.jsonl` (one row per file: file, kind, lang, ref, seconds, sha256,
checks, shelved, status, voice).

- **Where and when** (owner, 21 Nov 2026: "yea we can def move into github"; `audio/lanes.json` says who
  voices what, so no file is voiced twice; times Central):

  | Lane | Where | When | Takes | Engine |
  |---|---|---|---|---|
  | Bible matrix | GitHub Actions (`fill-cloud.yml`, job `bible`) | round the clock: each batch's gather job starts the next (an hourly cron restarts a broken chain; one batch at a time), up to 12 shards, each a 300-minute box (about 40 chapters) | every Bible chapter (`kind` bible, EN and ES) | Kokoro, CPU |
  | Clone stories | GitHub Actions (job `story`) | the same batches, up to 4 stories, one per job, 260-minute box plus a 45-minute QA reserve; sentences saved to Drive after every batch | every Hush Harbor story but the Mac's | Chatterbox, CPU |
  | Gather | GitHub Actions (job `gather`) | the end of each batch | lays every job's rows over main's manifest, one push | none |
  | Mac Bible lane | her Mac (`run.sh`, launchd) | rests: `lanes.json` gives it nothing (measured 21 Nov 2026: the cloud is about 30 times the Mac); 22:00–06:45 in 90-minute boxes if it is given a share | whatever `mac_kinds` lists | Kokoro |
  | Mac clone lane | her Mac, in parallel | rests the same way; when given a share, waits while memory is tight or her morning jobs run | whatever `mac_stories` lists | Chatterbox |
  | Publish | her Mac, after each run | the same window | Drive → R2 for the app | none |

  The cloud uses the same code and checks as the Mac (`PBS_LANE=cloud`); failed files are held on Drive
  (`PBS_HELD_REMOTE`); no audio is ever a workflow artifact (only rows files, which the public manifest
  holds anyway); the Drive remote reaches the runner as the `PBS_RCLONE_CONF` secret (from the vault) and
  is deleted with the work at the end of each job. When nothing is left the plan job logs
  `NOTE FILL_COMPLETE`, posts the Open Loops row "PBS fill complete: YouTube can restart after the
  overhaul is approved" and switches the workflow off; the Mac marks `library-fill.active` `"complete"`
  and keeps it (YouTube restarts only after the owner approves the channels overhaul).
- **Order**: (1) English Psalms; (2) the sleep sessions, the paid core (coordinator 21 Nov 2026): EN Psalm Nights,
  ES Psalm Nights, Imagination Nights EN then ES (`content/psalm-nights`, `content/imagination-nights`: `segments`,
  where `[pause N]` is N s of real quiet, verses are the stored text said with their reference, and QA's words-a-minute
  leaves the scripted quiet out); (3) the stories Kokoro voices (coordinator 21 Nov 2026): the 60 plain English
  tellings (af_nicole) then the 60 Mi Refugio (the Spanish blend), each the title, the retelling and the stored verses
  word for word in one narrator voice, the call and response's `[PAUSE 3s]` as real quiet (row `checks.pause_starts_s`,
  as Hush Harbor rows carry it); a bounded batch (about 7 Mac-hours) queued ahead of the failed-chapter retries;
  Hush Harbor stays on its own lanes; (4) every other chapter, English then Spanish, in listening order.
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
- **The bars are targets, with a margin** (the owner's rule, 21 Nov 2026: "a reasonable margin of error
  in all these things"): `qa.judge` fails a file only about 25% outside a bar (loudness 2.5 LU past the
  band, true peak 1 dB over the ceiling and never above 0 dBTP, over 25 clipped samples, word accuracy
  under `qa.hard_accuracy` (0.95 → 0.9375, 0.90 → 0.875), words a minute 25% outside 55–150). A
  near-miss ships with a note in the row (`checks.notes`) and a `NOTE … shipped inside the margin` log
  line. A07 (the last words missing) is always a fail. Why: a -18.1 LUFS chapter (0.1 LU under -18.0) was
  thrown away on 21 Nov.
- **Run window** (the Mac's day, her ruling): heavy work 22:00–07:00 CT only, the Mac off 07:00–10:00.
  `fill.window_minutes` gives the minutes until 06:45, when new work stops so every lane checkpoints
  before 06:55; `run.sh` exits with a `NOTE` line outside it and caps each step to the minutes left.
- **Schedule**: launchd `com.seq.pbs-library-fill` (`launchd/install.sh`), every 15 minutes, Nice 15 +
  low-priority I/O, from the runner clone `~/GitHub/.pbs-runner` via `run.sh`. **Two lanes at once**
  (owner, 21 Nov 2026: "2 lanes is a must"): the Bible fill and the clone lane start together, each with
  its own lock (`library-fill.lock`, `clone-lane.lock`) and a 90-minute box; manifest writes and commits
  share `manifest.lock`. They are the night's only two heavy jobs. `run.sh` logs `MEM before` / `MEM
  after` (pressure level, swap, free disk) every run.
- **Memory guard** (`lib/memguard.py`; the Mac has 8 GB and went 22 GB into swap on 20 Nov): before each
  story the clone lane (the heavier) reads macOS's pressure level and swap; at level 2+ or swap over
  4,096 MB (baseline measured 21 Nov 20:15 CT: level 1, 1,653 MB, 53% free, plus 2.4 GB headroom;
  `PBS_SWAP_LIMIT_MB` overrides) it logs `NOTE MEMGUARD_PAUSE`, waits, and logs `MEMGUARD_RESUME`; still
  tight after 20 minutes, `MEMGUARD_ONE_LANE` and it stops for the run while the Bible lane carries on.
  Never mid-story. **Her morning jobs come first** (owner, 21 Nov 2026): while
  `~/.boss-os/morning-window.active` exists (`PBS_MORNING_FLAG` overrides), the clone lane waits
  (`MEMGUARD_MORNING_PAUSE` / `_RESUME`) and only the Bible lane runs; no flag file means no morning window; a flag older than 3 hours is ignored with `MEMGUARD_MORNING_STALE` (a crashed morning job left it). Boss OS creates and removes the flag (the Mac-schedule work). Between stories it frees the speech and voice models; finished stories' work folders
  are removed at the start of each run.
- **Pause flag**: `~/.peace-be-still/library-fill.active` exists while priorities 1–2 are incomplete
  (How We Know / Whisper Almanac pause on it); the run that completes them removes it.
- **Output**: `OUTPUT <n> files shelved` and `library fill: X of Y files, Z hours shelved, N failed`,
  once a day into the morning email's Notices. Stops: `DRIVE_UNREACHABLE`, `SHELF_HASH_MISMATCH`,
  `SHELF_NOT_VERIFIED`, `MAC_BUDGET` (5 GB), `SCRIPTURE_MISSING`, `NOTHING_SHELVED`.
- **Hush Harbor is voiced on the clone lane only** (owner, 21 Nov 2026: "we cloned the voices for hush
  harbor -----thats what we did and those are cloned so are not subj to quota"). The Gemini lane below is
  kept as code (its vetting and pitch checks are reused) but `run.sh` no longer runs it, so no story waits
  on `QUOTA_OUT`; a story it had started is finished by the clone lane.
- **Hush Harbor Gemini lane, retired from the night run** (`hush_harbor.py`):
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
  one sentence at a time on the Mac's CPU, highest story number first. Checks: each sentence's word
  accuracy (the margin rule: a retelling line up to two words off, or above the hard accuracy, ships with
  a note; a sentence from a quoted Bible verse keeps the strict bar), speaker similarity over the role's
  floor (`voices.json` clone.floor; under it by less than 25% of the way to 1.0 ships with a note)
  measured on at least 6 s of speech (a role's short turns pooled: a d-vector on a 2 s line is noise),
  then the same file checks and shelf. A story the box cuts off carries on next run.
- **Served to the app (R2)** (`publish.py`, last step of `run.sh`, same window, keys from the vault): bucket
  `peace-be-still-audio` on her SECOND Cloudflare account (its own free 10 GB; her ruling 20 Nov 2026),
  public only at `https://pbs-audio.professionalresourcelibrary.com/<file>` (R2 custom domain: no listing,
  CORS GET/HEAD from `r2/cors.json`, set in that account's dashboard: the bucket key cannot change bucket settings). Each passed, shelved row streams Drive -> R2 under exactly its manifest
  `file` (Drive SHA-256 = manifest, then R2 size + md5 = Drive; the Mac never holds the file).
  `manifest.jsonl` at the bucket root is what the app reads (public fields + story titles) and the ledger
  that makes runs idempotent and resumable; the app's bundled copy is the offline fallback. The same step is
  the backfill. Stops: `R2_FREE_STORAGE` (every bucket on the account, read from Cloudflare's R2 analytics with
  `CF2_WORKERS_AI_TOKEN`, + this batch over 9.5 GB), `R2_USAGE_UNREAD` (that total unreadable: nothing uploads), `R2_HASH_MISMATCH`,
  `R2_UNREACHABLE`, `R2_KEY_MISSING`; a Drive copy that is missing or not the manifest's file is HELD.
  Output `OUTPUT <n> files published to R2` and `r2: X of Y shelved files public`.
- **Not yet here** (Phase 4 proper): A02 verse-by-verse alignment, A03 full name inventory + name
  reel heard by a person, A04 heteronyms, A05 Psalm Nights session pacing. The app's player (reads the R2 manifest) is in `app/src/player/`.
- Tests: `python3 -m unittest discover -s audio/tests` (needs numpy; `test_publish.py` covers the R2 step) and `python3 audio/check_manifest.py --self-test`.
