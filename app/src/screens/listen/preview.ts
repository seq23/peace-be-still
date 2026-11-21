// The CI web preview's sample sleep sessions, so a reviewer (and the store screenshots) can reach the
// sleep-night screens before any Psalm Nights / Imagination Nights audio is published. Read only on the web
// preview (EXPO_PUBLIC_PBS_PREVIEW=1 on web), the same switch as the preview paid flag; a phone or store build
// never lists them. They carry no audio: opened unlocked, they say the audio is not ready, which is true.
import { Platform } from 'react-native';
import type { Track } from '../../player/library';
import { tracks as library } from '../../player/usePlayer';

export const isListenPreview = () => Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1';

const sample = (kind: 'psalm-night' | 'imagination-night', lang: 'en' | 'es', title: string): Track => ({
  file: `${lang}/${kind}/preview-sample.m4a`, kind, lang, seconds: 900, voice: 'preview', sha256: `preview-${kind}-${lang}`,
  ref: `content/${kind === 'psalm-night' ? 'psalm-nights' : 'imagination-nights'}/${lang}/preview-sample.json#preview`,
  titles: { [lang]: title },
} as Track);

export const PREVIEW_SLEEP_SESSIONS: readonly Track[] = [
  sample('psalm-night', 'en', 'Sample Psalm Night (preview)'),
  sample('psalm-night', 'es', 'Noche de Salmos de muestra (vista previa)'),
  sample('imagination-night', 'en', 'Sample Imagination Night (preview)'),
];

/** Every track the Nights tab and the player may show: the bundled library, plus the samples on the web preview. */
export function listenTracks(): readonly Track[] {
  return isListenPreview() ? [...library, ...PREVIEW_SLEEP_SESSIONS] : library;
}

export const isPreviewSample = (track: Track) => track.sha256.startsWith('preview-');
