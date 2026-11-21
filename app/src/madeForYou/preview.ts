import { madeForYouApi, type Ready, type SessionContext } from './api';

// Public excerpts of the approved stock Kokoro voices. The neutral scene stays
// separate from the Psalm samples so Mindset never plays a faith excerpt.
const clips = {
  'psalm-en': { seconds: 13.818667, sha256: 'e3e0e76066ee9009c66e26ef8012a6ea2d5d4c7f71c64d09ce8e245f2dfb043a' },
  'psalm-es': { seconds: 14.010667, sha256: 'bff06ae35c9541a9cba2c16bc037828e576d7150ea2f1e906a1680648808a3fb' },
  'scene-en': { seconds: 8.421333, sha256: '113744afe7f568cf3759289c9b9a5e8b6922adf097c9f3bc0d324e882fd04768' },
  'scene-es': { seconds: 8.512000, sha256: '5c3639605d1728b429cf54d6d219d84394fa34ce2628bd1d982561789e800794' },
} as const;

function sample({ kind, lang }: SessionContext): Ready {
  const clip = `${kind === 'psalm' ? 'psalm' : 'scene'}-${lang}` as const;
  return { id: 'preview-session', day: '2026-11-20', path: `/made-for-you-preview/${clip}.mp3`, ...clips[clip] };
}

export function previewApi(state: string | undefined): typeof madeForYouApi {
  return {
    async list(context) {
      if (state === 'error') throw new Error('Preview error');
      const row = sample(context);
      return {
        ready: state === 'ready' ? [row] : [],
        pending: state === 'pending' || state === 'delayed' || state === 'retrying' || state === 'stopped'
          ? { id: row.id, day: row.day, delayed: state === 'delayed', retrying: state === 'retrying' } : null,
        expired: state === 'expired',
      };
    },
    async submit() { return { status: 'preview' }; },
    async play(context, id) {
      const row = sample(context);
      if (state !== 'ready' || id !== row.id) throw new Error('Preview audio unavailable');
      return { url: new URL(row.path, globalThis.location.origin).href };
    },
  };
}
