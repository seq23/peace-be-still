// "3 AM, back to sleep" (her brief 21 Nov 2026), the rule on its own: which night to offer, and when. In the small
// hours Today and Nights on the God's Word door show one large, calm button (BackToSleep.tsx) that plays the short,
// very quiet back-to-sleep night (Psalm 4:8, 5-8 min, mastered at the hush level): free for everyone, never counted
// as a free night, and only once its audio is published. Outside 12 AM-4:59 AM it is never offered.
import { inSmallHours } from '../../clock';
import type { Door } from '../../model';
import { onePerScript, type Lang, type Track } from '../../player/library';

export const isBackToSleep = (track: Pick<Track, 'journey'>) => track.journey === 'back-to-sleep';

/** The one back-to-sleep night to offer now, or null: outside the small hours, behind the Mindset door, or not playable. */
export function backToSleepTrack(tracks: readonly Track[], lang: Lang, door: Door | null, now: Date, playable: (track: Track) => boolean): Track | null {
  if (door !== 'faith' || !inSmallHours(now)) return null;
  return onePerScript(tracks.filter(track => isBackToSleep(track) && track.lang === lang), playable).find(playable) ?? null;
}
