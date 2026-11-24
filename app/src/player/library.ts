import { chapterTitles } from './books';

export type Lang = 'en' | 'es';
export type Titles = Partial<Record<Lang, string>>;
/** `journey` marks a night that is not a Psalm Night: the grief nights and the one "3 AM, back to sleep" night. */
type TrackDisplay = { titles: Titles; scriptureRef?: string; journey?: NightJourney };
export type NightJourney = 'grief' | 'back-to-sleep';
export const NIGHT_JOURNEYS: readonly NightJourney[] = ['grief', 'back-to-sleep'];

/** One line of audio/manifest.jsonl, as the Mac library fill writes it (only the fields the app reads). */
export type ResponsePauses = readonly [number, number];
export const RESPONSE_PAUSE_SECONDS = 3;

export type ManifestRow = {
  file: string; kind: string; lang: string; ref: string; seconds: number; sha256: string; voice: string; status: string; checks?: { pause_starts_s?: unknown };
  /** Served rows only (publish.py): a story's or night's display, read from its script at publish time. */
  title?: unknown; scripture_ref?: unknown; journey?: unknown; pause_starts_s?: unknown;
};

/** What ships in the app: passed rows only, no Drive paths, no checks, a readable title. The R2 key is `file`. */
export type Track = TrackDisplay & {
  file: string; kind: string; lang: Lang; ref: string; seconds: number; sha256: string; voice: string; responsePauses?: ResponsePauses;
};

export type Skipped = { line: number; reason: string };

export class LibraryEmptyError extends Error {
  readonly code = 'AUDIO_LIBRARY_EMPTY';
  constructor(skipped: number) { super(`AUDIO_LIBRARY_EMPTY: no playable track (${skipped} rows skipped)`); }
}

const SAFE_FILE = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.m4a$/i;
const HASH = /^[a-f0-9]{64}$/;

/** Why a passed row cannot ship, or null when it can. */
function problem(row: Partial<ManifestRow>): string | null {
  if (typeof row.file !== 'string' || !SAFE_FILE.test(row.file)) return 'unsafe or missing file path';
  if (row.lang !== 'en' && row.lang !== 'es') return 'unknown language';
  if (typeof row.kind !== 'string' || !row.kind) return 'missing kind';
  if (typeof row.ref !== 'string' || !row.ref) return 'missing ref';
  if (typeof row.seconds !== 'number' || !Number.isFinite(row.seconds) || row.seconds <= 0) return 'bad length';
  if (typeof row.sha256 !== 'string' || !HASH.test(row.sha256)) return 'bad sha256';
  if (typeof row.voice !== 'string' || !row.voice) return 'missing voice';
  return null;
}

/**
 * Passed rows become tracks; a bad passed row is held (skipped, with its line and reason) and the rest ship.
 * `displayOf` supplies a story’s title and excerpt reference; scripture titles come from the book list.
 * Throws AUDIO_LIBRARY_EMPTY only when nothing at all can play.
 */
export function readManifest(jsonl: string, displayOf: (row: ManifestRow) => TrackDisplay | null): { tracks: Track[]; skipped: Skipped[] } {
  const tracks: Track[] = [];
  const skipped: Skipped[] = [];
  jsonl.split(/\r?\n/).forEach((text, index) => {
    if (!text.trim()) return;
    const line = index + 1;
    let row: Partial<ManifestRow>;
    try { row = JSON.parse(text); } catch { skipped.push({ line, reason: 'not JSON' }); return; }
    if (row.status !== 'passed') return;
    const reason = problem(row);
    if (reason) { skipped.push({ line, reason }); return; }
    const full = row as ManifestRow;
    const chapter = chapterTitles(full.ref);
    const display = chapter ? { titles: chapter } : displayOf(full);
    if (!display || !Object.values(display.titles).some(Boolean)) { skipped.push({ line, reason: 'no readable title' }); return; }
    const { file, kind, ref, seconds, sha256, voice } = full;
    const track: Track = { file, kind, lang: full.lang as Lang, ref, seconds, sha256, voice, ...display };
    const starts = full.checks?.pause_starts_s ?? full.pause_starts_s;
    if (hasCallAndResponse(track) && Array.isArray(starts) && starts.length === 2) {
      const [first, second] = starts;
      if (typeof first === 'number' && typeof second === 'number' &&
          first >= 0 && first + RESPONSE_PAUSE_SECONDS <= second && second + RESPONSE_PAUSE_SECONDS <= seconds) {
        track.responsePauses = [first, second];
      }
    }
    tracks.push(track);
  });
  if (!tracks.length) throw new LibraryEmptyError(skipped.length);
  return { tracks, skipped };
}

/** The kinds the live R2 manifest may add after the build. Scripture is titled from the book list; a story or a
 * night from the display publish.py serves beside it (its script's title, key verse, journey and pauses). */
const SCRIPTURE_KINDS = new Set(['bible', 'psalms']);
const SCRIPT_KINDS = new Set(['stories', 'psalm-night', 'imagination-night']);
const isScript = (kind: string, ref: string) => SCRIPT_KINDS.has(kind) && ref.startsWith('content/');

/** A served story's or night's display; null for anything else, so it is held (readManifest's "no readable title"). */
function servedDisplay(row: ManifestRow): TrackDisplay | null {
  if (!isScript(row.kind, row.ref) || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 200) return null;
  const ref = typeof row.scripture_ref === 'string' && row.scripture_ref.trim() ? { scriptureRef: row.scripture_ref.trim() } : {};
  const journey = NIGHT_JOURNEYS.includes(row.journey as NightJourney) ? { journey: row.journey as NightJourney } : {};
  return { titles: { [row.lang]: row.title.trim() }, ...ref, ...journey };
}

/** Every track in the served R2 manifest (publish.py's ledger): chapters, stories and nights voiced and published
 * after this build. A row of one kind dressed as another (a story with a chapter ref) is held. Anything unreadable
 * gives none, never an error: the bundled library is the fallback. Pure. */
export function liveLibrary(jsonl: string): Track[] {
  try {
    return readManifest(jsonl, servedDisplay).tracks
      .filter(track => SCRIPTURE_KINDS.has(track.kind) ? !!chapterTitles(track.ref) : isScript(track.kind, track.ref));
  } catch {
    return [];
  }
}

/**
 * The bundled library plus every track published after this build. `set` takes the last good read of the R2
 * manifest (liveLibrary) and returns the tracks it added, by file, a bundled row always winning. An empty read
 * (R2 down, a bad body) changes nothing: the list is never smaller than the bundled library.
 */
export function createLiveLibrary(bundled: readonly Track[]) {
  let all: readonly Track[] = bundled;
  return {
    tracks: () => all,
    set(live: readonly Track[]): readonly Track[] {
      if (!live.length) return [];
      const have = new Set(bundled.map(track => track.file));
      const added = live.filter(track => !have.has(track.file) && !!have.add(track.file));
      all = added.length ? [...bundled, ...added] : bundled;
      return added;
    },
  };
}

/** Tracks back as served rows, so a saved copy is read by the same checks as the network one (liveLibrary). */
export function asManifestRows(tracks: readonly Track[]): string {
  return tracks.map(({ file, kind, lang, ref, seconds, sha256, voice, titles, scriptureRef, journey, responsePauses }) =>
    JSON.stringify({
      file, kind, lang, ref, seconds, sha256, voice, status: 'passed',
      ...(isScript(kind, ref) ? { title: titles[lang] ?? Object.values(titles).find(Boolean) } : {}),
      ...(scriptureRef && isScript(kind, ref) ? { scripture_ref: scriptureRef } : {}),
      ...(journey ? { journey } : {}),
      ...(responsePauses ? { pause_starts_s: [...responsePauses] } : {}),
    })).join('\n');
}

/** A re-voiced script (edited text, a longer night) is a new file with a new row, while its older passed file
 * stays live. The library keeps every passed file; a screen shows ONE per script: the newest it can play now
 * (published or downloaded), else the newest, so a newer file that is not in R2 yet never hides the old one
 * that is. Rows are appended in voicing order, so a later track is a newer file. */
export function onePerScript(tracks: readonly Track[], playable: (track: Track) => boolean): Track[] {
  const key = (t: Track) => `${t.kind}|${t.lang}|${t.ref}`;
  const pick = new Map<string, number>();
  tracks.forEach((t, i) => {
    const had = pick.get(key(t));
    if (had === undefined || playable(t) || !playable(tracks[had])) pick.set(key(t), i);
  });
  return tracks.filter((t, i) => pick.get(key(t)) === i);
}

export function hasCallAndResponse(track: Track): boolean {
  return track.kind === 'stories' && (
    track.ref.startsWith('content/stories/hush-harbor/') ||
    track.ref.startsWith('content/stories/mi-refugio/')
  );
}

/** The title in the phone's language, else the track's own language. */
export function trackTitle(track: Track, lang: Lang): string {
  return track.titles[lang] ?? track.titles[track.lang] ?? Object.values(track.titles)[0] ?? '';
}

/** The ONE audio base URL (app.config.ts extra.audioBaseUrl). Unset or not https → null: NAMED STOP CONFIG_AUDIO_BASE_URL. */
export function audioBaseUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href.replace(/\/?$/, '/') : null;
  } catch { return null; }
}

/** The R2 object key equals the manifest `file`, so the URL is base + file. */
export function trackUrl(track: Track, base: string): string {
  return new URL(track.file, base).href;
}
