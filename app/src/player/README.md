# Player (engine only; the player screen is a later phase)

- `library.ts` + `build-library.ts`: `npm run library` (run before start, typecheck, the web export and EAS builds; never on install) turns `audio/manifest.jsonl`
  into `library.json` (git-ignored, bundled): passed rows only, a readable title per track, no checks or Drive paths.
  A bad row is held and logged (`HELD manifest line N`); zero tracks stops with `AUDIO_LIBRARY_EMPTY`.
- Audio host: ONE value, `app.config.ts` `extra.audioBaseUrl` (env `PBS_AUDIO_BASE_URL`, https). The R2 object key
  equals the manifest `file`. Unset → `usePlayer().stop === 'CONFIG_AUDIO_BASE_URL'` and play shows `audio-not-ready`.
- `player.ts`: expo-audio through `adapters.ts` (background audio, lock-screen title, calls pause it), sleep timer
  15/30/45/60 on wall-clock time with a 30 s fade, her place saved per track (every 10 s, pause, timer end,
  background) and restored by any later player.
- `dimmer.ts`: real screen brightness (expo-brightness) after 15 s without a touch while playing; restored on touch,
  leaving the screen, background and unmount. `dimmed` also drives the dark overlay the web preview needs.
- `downloads.ts`: paid only (`gate.ts`, swapped for lane 2A's `canUse` when it lands); `<sha256>.part`, hashed,
  renamed only when it matches the manifest.
- `books.ts`: book names until lane 2A's shared book list lands.
- Tests: `app/test/player.unit.ts`.
