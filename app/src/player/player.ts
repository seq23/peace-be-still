import type { Downloads } from './downloads';
import { canUse, FEATURES, type User } from './gate';
import { hasCallAndResponse, RESPONSE_PAUSE_SECONDS, trackTitle, trackUrl, type Lang, type Track } from './library';

/** The playing side; adapters.ts backs it with one expo-audio player (background audio + lock screen). */
export interface AudioOutput {
  /** Replace the source and show the title on the lock screen. */
  load(uri: string, title: string, allowSeek: boolean): void;
  play(): void;
  pause(): void;
  /** Only honoured once the new source reports loaded (iOS drops a seek on an item that is not ready). */
  seekTo(seconds: number): Promise<void>;
  /** True once the source given to the last load() is ready. */
  readonly isLoaded: boolean;
  readonly currentTime: number;
  volume: number;
  /** Native status: fires when playing or loaded changes, the position changes, or the track ends. */
  onStatus(listener: (status: AudioStatus) => void): () => void;
  dispose(): void;
}

export type AudioStatus = { playing: boolean; isLoaded: boolean; didJustFinish: boolean };

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
  response: 0 | 1 | null;
  error: PlayerError | null;
};

export const SLEEP_MINUTES = [15, 30, 45, 60] as const;
export type SleepMinutes = (typeof SLEEP_MINUTES)[number];
export const FADE_MS = 30_000;
export const SAVE_EVERY_MS = 10_000;
/** A saved spot is used only past the first 5 s and before the last 10 s. */
export const RESUME_MIN_S = 5;
export const RESUME_TAIL_S = 10;
/** How long to wait for a source to load before giving up on the saved spot and starting at 0. */
export const LOAD_WAIT_MS = 10_000;

const positionKey = (track: Track) => `pbs.player.position:${track.file}`;
type Saved = { file: string; positionSeconds: number; savedAt: number };

export function createPlayer(options: {
  audio: AudioOutput; store: Store; downloads: Downloads; baseUrl: string | null; lang: Lang;
}) {
  const { audio, store, downloads, baseUrl, lang } = options;
  let state: PlayerState = { track: null, playing: false, sleepEndsAt: null, fading: false, response: null, error: null };
  let generation = 0;
  /** The track whose audio is in the output; only its position is ever saved. */
  let loaded: Track | null = null;
  let saver: ReturnType<typeof setInterval> | null = null;
  let sleepTicker: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<(state: PlayerState) => void>();
  const set = (patch: Partial<PlayerState>) => { state = { ...state, ...patch }; for (const l of listeners) l(state); };

  function responseAt(track: Track, position: number): PlayerState['response'] {
    const pauses = track.responsePauses;
    if (!pauses) return null;
    const index = pauses.findIndex(start => position >= start && position < start + RESPONSE_PAUSE_SECONDS);
    return index === 0 || index === 1 ? index : null;
  }

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
      if (!(at > RESUME_MIN_S && at < track.seconds - RESUME_TAIL_S)) return 0;
      const response = responseAt(track, at);
      return response === null ? at : track.responsePauses?.[response] ?? at;
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

  let loadWaiters: Array<() => void> = [];
  /** Resolves true once the loaded source is ready; after LOAD_WAIT_MS, whether it is ready even if no event said so. */
  const whenLoaded = (): Promise<boolean> => {
    if (audio.isLoaded) return Promise.resolve(true);
    return new Promise((resolve) => {
      const waiter = () => { clearTimeout(timeout); resolve(true); };
      const timeout = setTimeout(() => { loadWaiters = loadWaiters.filter((w) => w !== waiter); resolve(audio.isLoaded); }, LOAD_WAIT_MS);
      loadWaiters.push(waiter);
    });
  };

  // The lock screen, a call, AirPods coming out, Siri and Control Center play or pause the native player
  // directly; its status is the truth, so the saver, the dimmer (via state.playing) and the screen follow it.
  const unsubscribeStatus = audio.onStatus((status) => {
    if (status.isLoaded && loadWaiters.length) { const waiters = loadWaiters; loadWaiters = []; for (const w of waiters) w(); }
    if (!loaded) return;
    if (status.didJustFinish) {
      const track = loaded;
      stopSaving();
      loaded = null;
      void store.removeItem(positionKey(track)).catch(() => undefined);
      set({ playing: false, response: null });
      return;
    }
    const response = responseAt(loaded, audio.currentTime);
    if (status.playing === state.playing) {
      if (state.track === loaded && state.response !== response) set({ response });
      return;
    }
    if (status.playing) { startSaving(); set({ playing: true, response }); }
    else { stopSaving(); void savePosition(); set({ playing: false, response }); }
  });

  return {
    getState: () => state,
    subscribe(listener: (state: PlayerState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async play(track: Track, user: User): Promise<void> {
      const current = ++generation;
      if (state.playing) { stopSaving(); await savePosition(); set({ playing: false }); }
      const local = canUse(FEATURES.OFFLINE, user) ? downloads.find(track) : null;
      const uri = local ?? (baseUrl ? trackUrl(track, baseUrl) : null);
      if (!uri) { audio.pause(); loaded = null; set({ track, playing: false, response: null, error: 'audio-not-ready' }); return; }
      try {
        const at = await startAt(track);
        if (current !== generation) return;
        audio.load(uri, trackTitle(track, lang), !hasCallAndResponse(track));
        loaded = track;
        if (!state.fading) audio.volume = 1;
        if (at > 0 && (await whenLoaded())) {
          if (current !== generation) return;
          await audio.seekTo(at);
        }
        if (current !== generation) return;
        audio.play();
        startSaving();
        set({ track, playing: true, response: responseAt(track, audio.currentTime), error: null });
      } catch {
        if (current === generation) set({ track, playing: false, response: null, error: 'play-failed' });
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
      unsubscribeStatus();
      loadWaiters = [];
      listeners.clear();
      await savePosition();
      audio.dispose();
    },
  };
}
export type Player = ReturnType<typeof createPlayer>;
