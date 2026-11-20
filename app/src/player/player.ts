import type { Downloads } from './downloads';
import { canUse, FEATURES, type User } from './gate';
import { trackTitle, trackUrl, type Lang, type Track } from './library';

/** The playing side; adapters.ts backs it with one expo-audio player (background audio + lock screen). */
export interface AudioOutput {
  /** Replace the source and show the title on the lock screen. */
  load(uri: string, title: string): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  readonly currentTime: number;
  volume: number;
  onFinish(listener: () => void): () => void;
  dispose(): void;
}

/** AsyncStorage's shape. */
export interface Store {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type PlayerError = 'audio-not-ready' | 'play-failed' | 'download-incomplete' | 'offline-locked';
export type PlayerState = {
  track: Track | null;
  playing: boolean;
  /** Wall-clock ms when the sleep timer ends, or null. */
  sleepEndsAt: number | null;
  fading: boolean;
  error: PlayerError | null;
};

export const SLEEP_MINUTES = [15, 30, 45, 60] as const;
export type SleepMinutes = (typeof SLEEP_MINUTES)[number];
export const FADE_MS = 30_000;
export const SAVE_EVERY_MS = 10_000;
/** A saved spot is used only past the first 5 s and before the last 10 s. */
export const RESUME_MIN_S = 5;
export const RESUME_TAIL_S = 10;

const positionKey = (track: Track) => `pbs.player.position:${track.file}`;
type Saved = { file: string; positionSeconds: number; savedAt: number };

export function createPlayer(options: {
  audio: AudioOutput; store: Store; downloads: Downloads; baseUrl: string | null; lang: Lang;
}) {
  const { audio, store, downloads, baseUrl, lang } = options;
  let state: PlayerState = { track: null, playing: false, sleepEndsAt: null, fading: false, error: null };
  let generation = 0;
  /** The track whose audio is in the output; only its position is ever saved. */
  let loaded: Track | null = null;
  let saver: ReturnType<typeof setInterval> | null = null;
  let sleepTicker: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<(state: PlayerState) => void>();
  const set = (patch: Partial<PlayerState>) => { state = { ...state, ...patch }; for (const l of listeners) l(state); };

  const savePosition = (track: Track | null = loaded): Promise<void> => {
    if (!track) return Promise.resolve();
    const saved: Saved = { file: track.file, positionSeconds: audio.currentTime, savedAt: Date.now() };
    return store.setItem(positionKey(track), JSON.stringify(saved)).catch(() => undefined);
  };
  const startAt = async (track: Track): Promise<number> => {
    try {
      const raw = await store.getItem(positionKey(track));
      const saved = raw ? (JSON.parse(raw) as Saved) : null;
      const at = saved?.positionSeconds ?? 0;
      return at > RESUME_MIN_S && at < track.seconds - RESUME_TAIL_S ? at : 0;
    } catch { return 0; }
  };
  const stopSaving = () => { if (saver !== null) clearInterval(saver); saver = null; };
  const startSaving = () => { stopSaving(); saver = setInterval(() => { void savePosition(); }, SAVE_EVERY_MS); };

  const stopSleep = () => { if (sleepTicker !== null) clearInterval(sleepTicker); sleepTicker = null; };
  const expire = () => {
    generation++;
    stopSleep();
    stopSaving();
    audio.volume = 0;
    audio.pause();
    void savePosition();
    set({ playing: false, sleepEndsAt: null, fading: false });
  };
  /** Wall-clock check, so time the phone spent asleep still counts; volume ramps down over the last 30 s. */
  const sleepTick = () => {
    if (state.sleepEndsAt === null) return;
    const left = state.sleepEndsAt - Date.now();
    if (left <= 0) { expire(); return; }
    if (left <= FADE_MS) {
      audio.volume = left / FADE_MS;
      if (!state.fading) set({ fading: true });
    }
  };

  const unsubscribeFinish = audio.onFinish(() => {
    const track = loaded;
    stopSaving();
    loaded = null;
    if (track) void store.removeItem(positionKey(track)).catch(() => undefined);
    set({ playing: false });
  });

  return {
    getState: () => state,
    subscribe(listener: (state: PlayerState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async play(track: Track, user: User): Promise<void> {
      const current = ++generation;
      if (state.playing) { stopSaving(); await savePosition(); }
      const local = canUse(FEATURES.OFFLINE, user) ? downloads.find(track) : null;
      const uri = local ?? (baseUrl ? trackUrl(track, baseUrl) : null);
      if (!uri) { audio.pause(); loaded = null; set({ track, playing: false, error: 'audio-not-ready' }); return; }
      try {
        const at = await startAt(track);
        if (current !== generation) return;
        audio.load(uri, trackTitle(track, lang));
        loaded = track;
        if (!state.fading) audio.volume = 1;
        if (at > 0) await audio.seekTo(at);
        if (current !== generation) return;
        audio.play();
        startSaving();
        set({ track, playing: true, error: null });
      } catch {
        if (current === generation) set({ track, playing: false, error: 'play-failed' });
      }
    },

    resume() {
      if (!loaded) return;
      if (state.sleepEndsAt !== null && Date.now() >= state.sleepEndsAt) { expire(); return; }
      if (!state.fading) audio.volume = 1;
      audio.play();
      startSaving();
      set({ playing: true });
    },

    async pause() {
      generation++;
      audio.pause();
      stopSaving();
      set({ playing: false });
      await savePosition();
    },

    setSleepTimer(minutes: SleepMinutes | null) {
      if (minutes !== null && !SLEEP_MINUTES.includes(minutes)) throw new RangeError('Sleep timer is 15, 30, 45 or 60 minutes');
      stopSleep();
      audio.volume = 1;
      if (minutes === null) { set({ sleepEndsAt: null, fading: false }); return; }
      set({ sleepEndsAt: Date.now() + minutes * 60_000, fading: false });
      sleepTicker = setInterval(sleepTick, 1000);
    },

    /** AppState → background: keep her place. */
    background() { return savePosition(); },
    /** AppState → active: a deadline that passed while JS was paused still stops playback. */
    foreground() { sleepTick(); },

    async download(track: Track, user: User): Promise<boolean> {
      if (!canUse(FEATURES.OFFLINE, user)) { set({ error: 'offline-locked' }); return false; }
      if (!baseUrl) { set({ error: 'audio-not-ready' }); return false; }
      try { await downloads.save(track, trackUrl(track, baseUrl)); return true; } catch {
        set({ error: 'download-incomplete' });
        return false;
      }
    },

    async dispose() {
      generation++;
      stopSleep();
      stopSaving();
      unsubscribeFinish();
      listeners.clear();
      await savePosition();
      audio.dispose();
    },
  };
}
export type Player = ReturnType<typeof createPlayer>;
