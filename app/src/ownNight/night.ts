// The night itself: the quiet bed plays from the start; her moment is said softly, then a long gentle gap, again and
// again, each time a little quieter and the gaps a little longer; near the end the voice stops and the bed fades out.
// Everything runs from the wall clock (a phone that slept still ends on time). The outputs are interfaces so the
// tests run the whole night with a fake clock (adapters.ts backs them with expo-audio and expo-speech).
import type { OwnNightMinutes } from './limits';

/** The bed under the voice, and where the voice starts and ends, as shares of full volume. */
export const BED_VOLUME = 0.35;
export const VOICE_START = 0.8;
export const VOICE_END = 0.2;
/** Seconds of quiet between one saying and the next, at the start and at the end of the night. */
export const GAP_START_S = 40;
export const GAP_END_S = 100;
/** The bed alone for the first few seconds, and fading out alone over the last minute. */
export const LEAD_IN_S = 8;
export const BED_FADE_S = 60;
export const TICK_MS = 1000;
/** After this many failed sayings in a row the night keeps the bed and says why (never a silent loop of errors). */
export const VOICE_FAILS_MAX = 3;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const voiceVolumeAt = (elapsed: number, total: number) => VOICE_START + (VOICE_END - VOICE_START) * clamp(elapsed / total);
export const gapAfter = (elapsed: number, total: number) => GAP_START_S + (GAP_END_S - GAP_START_S) * clamp(elapsed / total);
export function bedVolumeAt(elapsed: number, total: number): number {
  const left = total - elapsed;
  if (left <= 0) return 0;
  return left < BED_FADE_S ? BED_VOLUME * (left / BED_FADE_S) : BED_VOLUME;
}
/** The last moment a saying may start: it must finish before the bed starts fading. */
export const lastStart = (total: number, sayS: number) => total - BED_FADE_S - sayS;

export interface BedOutput { start(volume: number): void; setVolume(volume: number): void; stop(): void }
/** Says (or plays) the moment once at this volume; resolves when it has finished. */
export interface VoiceOutput { say(volume: number): Promise<void>; stop(): void }

export type NightState = {
  playing: boolean;
  /** Wall-clock ms the night ends, while it plays. */
  endsAt: number | null;
  said: number;
  error: 'voice' | null;
  /** The night ran to its end (the sleep session counted as done). */
  finished: boolean;
};

export function createNight(options: {
  bed: BedOutput; voice: VoiceOutput; now?: () => number;
  /** Seconds one saying takes (an estimate for the phone voice, the file's length for a recording). */
  sayS: number;
  every?: (fn: () => void, ms: number) => () => void;
  onFinish?: () => void;
}) {
  const now = options.now ?? Date.now;
  const every = options.every ?? ((fn, ms) => { const id = setInterval(fn, ms); return () => clearInterval(id); });
  let state: NightState = { playing: false, endsAt: null, said: 0, error: null, finished: false };
  const listeners = new Set<(s: NightState) => void>();
  const set = (patch: Partial<NightState>) => { state = { ...state, ...patch }; for (const l of listeners) l(state); };
  let startedAt = 0, total = 0, nextAt = 0, speaking = false, fails = 0, generation = 0;
  let cancel: (() => void) | null = null;

  const end = (finished: boolean) => {
    generation++;
    cancel?.(); cancel = null;
    options.voice.stop();
    options.bed.stop();
    speaking = false;
    set({ playing: false, endsAt: null, finished });
    if (finished) options.onFinish?.();
  };

  const tick = () => {
    if (!state.playing) return;
    const elapsed = (now() - startedAt) / 1000;
    if (elapsed >= total) { end(true); return; }
    options.bed.setVolume(bedVolumeAt(elapsed, total));
    if (speaking || elapsed < nextAt || elapsed > lastStart(total, options.sayS) || fails >= VOICE_FAILS_MAX) return;
    speaking = true;
    const mine = generation;
    const done = (ok: boolean) => {
      if (mine !== generation) return;
      speaking = false;
      fails = ok ? 0 : fails + 1;
      const at = (now() - startedAt) / 1000;
      nextAt = at + gapAfter(at, total);
      set(ok ? { said: state.said + 1, error: null } : { error: fails >= VOICE_FAILS_MAX ? 'voice' : state.error });
    };
    options.voice.say(voiceVolumeAt(elapsed, total)).then(() => done(true), () => done(false));
  };

  return {
    getState: () => state,
    subscribe(listener: (s: NightState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(minutes: OwnNightMinutes) {
      if (state.playing) end(false);
      generation++;
      startedAt = now(); total = minutes * 60; nextAt = LEAD_IN_S; fails = 0; speaking = false;
      options.bed.start(BED_VOLUME);
      set({ playing: true, endsAt: startedAt + total * 1000, said: 0, error: null, finished: false });
      cancel = every(tick, TICK_MS);
      tick();
    },
    stop: () => { if (state.playing) end(false); },
    /** Back from the background: a night whose end passed while the phone slept stops now. */
    foreground: () => tick(),
  };
}
export type Night = ReturnType<typeof createNight>;

/** A spoken estimate for the phone voice: about 2.3 words a second at the slow rate, plus a breath. */
export function spokenSeconds(scene: string): number {
  const words = scene.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / 2.3) + 2;
}
