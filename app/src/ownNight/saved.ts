// Saved nights: kept on this phone only (never uploaded, never in chat memory), at most SAVED_NIGHTS_MAX.
// A night is her moment, how long it plays, its voice and language, and (for "my voice") the recording's file.
// Deleting a night deletes its recording file first; if the file cannot be deleted the night stays listed, so
// nothing is ever shown as gone while it is still on the phone.
import { OWN_NIGHT_MINUTES, RECORDING_MAX_SECONDS, SAVED_NIGHTS_MAX, SCENE_MAX, WHO_MAX, WISH_MAX, type OwnNightMinutes } from './limits';

export const SAVED_NIGHTS_KEY = 'peace-be-still-own-nights';
export type NightVoice = 'mine' | 'phone';
export type SavedNight = {
  id: string;
  scene: string;
  wish: string;
  who: string;
  lang: 'en' | 'es';
  minutes: OwnNightMinutes;
  voice: NightVoice;
  /** The recording's file URI on this phone, for voice 'mine'. */
  recording?: string;
  /** How long the recording plays, for the night's schedule. */
  recordingSeconds?: number;
  /** The moment came back from the AI (shown as written with AI), rather than written by her. */
  ai?: boolean;
  savedAt: number;
};

export interface NightStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
/** Deletes a recording file; resolves once it is gone (a file already gone counts as gone). */
export type RemoveFile = (uri: string) => Promise<void>;

const valid = (n: unknown): n is SavedNight => {
  const x = n as Partial<SavedNight> | null;
  return !!x && typeof x.id === 'string' && typeof x.scene === 'string' && x.scene.trim().length > 0 && x.scene.length <= SCENE_MAX
    && typeof x.wish === 'string' && x.wish.length <= WISH_MAX && typeof x.who === 'string' && x.who.length <= WHO_MAX
    && (x.lang === 'en' || x.lang === 'es') && OWN_NIGHT_MINUTES.includes(x.minutes as OwnNightMinutes)
    && (x.voice === 'mine' || x.voice === 'phone') && (x.recording === undefined || typeof x.recording === 'string')
    && (x.voice === 'phone' || (typeof x.recording === 'string' && Number.isFinite(x.recordingSeconds) && x.recordingSeconds! >= 1 && x.recordingSeconds! <= RECORDING_MAX_SECONDS))
    && (x.ai === undefined || typeof x.ai === 'boolean') && typeof x.savedAt === 'number';
};

export function parseNights(raw: string | null): SavedNight[] {
  try {
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(valid).slice(0, SAVED_NIGHTS_MAX) : [];
  } catch {
    return [];
  }
}

export type SaveResult = { ok: true; nights: SavedNight[] } | { ok: false; reason: 'full' | 'invalid' | 'failed' };
export type DeleteResult = { ok: true; nights: SavedNight[] } | { ok: false; reason: 'failed' };

export function createSavedNights(storage: NightStorage, removeFile: RemoveFile) {
  const read = async () => parseNights(await storage.getItem(SAVED_NIGHTS_KEY));
  const write = (nights: SavedNight[]) => storage.setItem(SAVED_NIGHTS_KEY, JSON.stringify(nights));
  return {
    list: () => read().catch(() => [] as SavedNight[]),
    /** A new night, or an edit of one already saved (same id). A 21st new night is refused, never pushes one out. */
    async save(night: SavedNight): Promise<SaveResult> {
      const clean = { ...night, scene: night.scene.trim(), wish: night.wish.trim(), who: night.who.trim() };
      if (!valid(clean)) return { ok: false, reason: 'invalid' };
      try {
        const nights = await read();
        const at = nights.findIndex(n => n.id === clean.id);
        if (at < 0 && nights.length >= SAVED_NIGHTS_MAX) return { ok: false, reason: 'full' };
        const old = at >= 0 ? nights[at] : null;
        const next = at >= 0 ? nights.map((n, i) => (i === at ? clean : n)) : [clean, ...nights];
        await write(next);
        // An edit that replaced or dropped the recording deletes the old file (the new list is already saved).
        if (old?.recording && old.recording !== clean.recording) await removeFile(old.recording).catch(() => undefined);
        return { ok: true, nights: next };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },
    /** A recording made in the editor and never saved (cancelled, re-recorded, or the phone voice chosen). */
    discard: (uri: string) => removeFile(uri).catch(() => undefined),
    /** Deletes the night's recording, then the night. */
    async remove(id: string): Promise<DeleteResult> {
      try {
        const nights = await read();
        const night = nights.find(n => n.id === id);
        if (night?.recording) await removeFile(night.recording);
        const next = nights.filter(n => n.id !== id);
        await write(next);
        return { ok: true, nights: next };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },
  };
}
export type SavedNights = ReturnType<typeof createSavedNights>;
