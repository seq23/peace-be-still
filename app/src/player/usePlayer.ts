// What the player screen (a later phase) uses: usePlayer() for audio, useDimmer() while the screen is in front.
// The player is one per app, so audio keeps going while she moves between screens or locks the phone.
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { expoAudioOutput, expoBrightness, expoDownloadFiles, prepareAudioSession, store } from './adapters';
import { createDimmer } from './dimmer';
import { createDownloads } from './downloads';
import { audioBaseUrl, type Lang, type Track } from './library';
import library from './library.json';
import { createPlayer, type Player } from './player';
import { markFirstValue } from '../reminders';

/** Bundled at install time from audio/manifest.jsonl by build-library.ts. */
export const tracks = library as unknown as Track[];

/** NAMED STOP: no audio host configured yet (app.config.ts extra.audioBaseUrl, from PBS_AUDIO_BASE_URL). */
export const AUDIO_STOP = 'CONFIG_AUDIO_BASE_URL';
const baseUrl = audioBaseUrl(Constants.expoConfig?.extra?.audioBaseUrl);

export const phoneLang = (): Lang => (getLocales()[0]?.languageCode === 'es' ? 'es' : 'en');

let shared: Player | null = null;
function getPlayer(): Player {
  if (shared) return shared;
  void prepareAudioSession().catch(() => undefined);
  const player = createPlayer({
    audio: expoAudioOutput(), store, downloads: createDownloads(expoDownloadFiles()), baseUrl, lang: phoneLang(),
    onFinish: () => void markFirstValue(),
  });
  AppState.addEventListener('change', (next) => {
    if (next === 'active') player.foreground(); else if (next === 'background') void player.background();
  });
  shared = player;
  return player;
}

export function usePlayer() {
  const player = getPlayer();
  const state = useSyncExternalStore(player.subscribe, player.getState);
  return { player, state, tracks, stop: baseUrl ? null : AUDIO_STOP } as const;
}

/** Pass true while the player screen is focused. Returns whether to draw the dark overlay, and touch().
 * `afterMs` dims sooner (the 3 AM back-to-sleep night goes dark almost at once). */
export function useDimmer(focused: boolean, afterMs?: number) {
  const { state } = usePlayer();
  const [dimmer] = useState(() => createDimmer(expoBrightness, afterMs ? { afterMs } : undefined));
  const dimmed = useSyncExternalStore(dimmer.subscribe, () => dimmer.dimmed);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => { subscription.remove(); void dimmer.release(); };
  }, [dimmer]);
  // Not active (left the screen, paused, background) puts her brightness back at once.
  useEffect(() => { dimmer.setActive(focused && appActive && state.playing); }, [dimmer, focused, appActive, state.playing]);
  return { dimmed, touch: () => { void dimmer.touch(); } } as const;
}
