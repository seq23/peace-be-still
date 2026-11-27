import { contentLanguage } from '../i18n';
import { madeForYouApi, type Ready, type SessionContext, type Shelf } from './api';

// Public excerpts of the approved stock Kokoro voices. The neutral scene stays
// separate from the Psalm samples so Mindset never plays a faith excerpt.
const clips = {
  'psalm-en': { seconds: 13.818667, sha256: 'e3e0e76066ee9009c66e26ef8012a6ea2d5d4c7f71c64d09ce8e245f2dfb043a' },
  'psalm-es': { seconds: 14.010667, sha256: 'bff06ae35c9541a9cba2c16bc037828e576d7150ea2f1e906a1680648808a3fb' },
  'scene-en': { seconds: 8.421333, sha256: '113744afe7f568cf3759289c9b9a5e8b6922adf097c9f3bc0d324e882fd04768' },
  'scene-es': { seconds: 8.512000, sha256: '5c3639605d1728b429cf54d6d219d84394fa34ce2628bd1d982561789e800794' },
} as const;

const clipOf = ({ kind, lang }: Pick<SessionContext, 'kind' | 'lang'>) => `${kind === 'psalm' ? 'psalm' : 'scene'}-${contentLanguage(lang)}` as const;
export const previewClipPath = (context: Pick<SessionContext, 'kind' | 'lang'>) => `/made-for-you-preview/${clipOf(context)}.mp3`;
function sample(context: SessionContext): Ready {
  // The shelf shows a real session's length (11 min 30 s); the player plays the short public excerpt.
  return { id: 'preview-session', day: '2026-11-20', ...clips[clipOf(context)], seconds: 690 };
}

/** The next 08:00 Central after now, plus `nights` more (the promise the Worker would give). */
function morning(nights: number, now = Date.now()) {
  for (let at = now + 3_600_000; ; at += 3_600_000) {
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(at));
    if (hour === 8) return Math.floor(at / 3_600_000) * 3_600_000 + nights * 86_400_000;
  }
}

export const PREVIEW_STATES = ['form', 'pending', 'tomorrow', 'retrying', 'late', 'stopped', 'expired', 'ready', 'used', 'full', 'crisis', 'error', 'locked'] as const;

/** ?state=<one of PREVIEW_STATES> on the web preview: every screen state, with no paid API call. */
export function previewApi(state: string | undefined): typeof madeForYouApi {
  return {
    async list(context) {
      if (state === 'error') throw new Error('Preview error');
      const row = sample(context);
      const waiting = state === 'pending' || state === 'tomorrow' || state === 'retrying' || state === 'late';
      const shelf: Shelf = {
        ready: state === 'ready' ? [row] : [],
        pending: waiting ? {
          id: row.id, day: row.day, dueAt: state === 'late' ? Date.now() - 3_600_000 : morning(state === 'tomorrow' ? 1 : 0),
          late: state === 'late', retrying: state === 'retrying',
        } : null,
        ended: state === 'stopped' || state === 'expired' ? state : null,
        requestedToday: waiting || state === 'used' || state === 'ready',
        next: state === 'full' ? null : morning(0),
      };
      return shelf;
    },
    async submit() { return { status: 'preview' }; },
    async play(context, id) {
      if (state !== 'ready' || id !== sample(context).id) throw new Error('Preview audio unavailable');
      return { url: new URL(previewClipPath(context), globalThis.location.origin).href };
    },
    async remove() { return { deleted: 0 }; },
    async report() { return { reported: true }; },
  };
}
