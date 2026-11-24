// The CI web preview's sample sleep sessions, so a reviewer (and the store screenshots) can reach the
// sleep-night screens before any Psalm Nights / Imagination Nights audio is published. Read only on the web
// preview (EXPO_PUBLIC_PBS_PREVIEW=1 on web), the same switch as the preview paid flag; a phone or store build
// never lists them. They carry no audio: opened unlocked, they say the audio is not ready, which is true.
import { Platform } from 'react-native';
import { createLiveLibrary, type NightJourney, type Track } from '../../player/library';
import { tracks as library } from '../../player/usePlayer';

export const isListenPreview = () => Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1';

const sample = (kind: 'psalm-night' | 'imagination-night', lang: 'en' | 'es', title: string, journey?: NightJourney): Track => ({
  file: `${lang}/${kind}/preview-${journey ?? 'sample'}.m4a`, kind, lang, seconds: journey === 'back-to-sleep' ? 360 : 900, voice: 'preview',
  sha256: `preview-${journey ?? kind}-${lang}`,
  ref: `content/${kind === 'psalm-night' ? 'psalm-nights' : 'imagination-nights'}/${lang}/preview-${journey ?? 'sample'}.json#preview`,
  titles: { [lang]: title }, ...(journey ? { journey } : {}), ...(journey === 'back-to-sleep' ? { scriptureRef: 'PSA 4:8' } : {}),
} as Track);

export const PREVIEW_SLEEP_SESSIONS: readonly Track[] = [
  sample('psalm-night', 'en', 'Sample Psalm Night (preview)'),
  sample('psalm-night', 'es', 'Noche de Salmos de muestra (vista previa)'),
  sample('imagination-night', 'en', 'Sample Imagination Night (preview)'),
  // The grief shelf and the 3 AM button (open the preview with ?hour=3), before their audio is published.
  sample('psalm-night', 'en', 'Sample grief night (preview)', 'grief'),
  sample('psalm-night', 'es', 'Noche de duelo de muestra (vista previa)', 'grief'),
  sample('psalm-night', 'en', 'Back to Sleep (preview)', 'back-to-sleep'),
  sample('psalm-night', 'es', 'Para volver a dormir (vista previa)', 'back-to-sleep'),
];

// The bundled library plus the chapters published after this build: from the last good read of the R2 manifest
// (availability.ts), or before that the copy saved from the last one. A failed read changes nothing: the bundled
// library always shows.
const live = createLiveLibrary(library);
export const setLiveTracks = live.set;

/** Every track the Nights tab and the player may show: the bundled library, the chapters published since
 * (the live R2 manifest), plus the samples on the web preview. */
export function listenTracks(): readonly Track[] {
  return isListenPreview() ? [...live.tracks(), ...PREVIEW_SLEEP_SESSIONS] : live.tracks();
}

export const isPreviewSample = (track: Track) => track.sha256.startsWith('preview-');
