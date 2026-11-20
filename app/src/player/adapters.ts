// The expo side of the player: one expo-audio player, expo-brightness, expo-file-system, AsyncStorage.
// Kept apart from player.ts / dimmer.ts / downloads.ts so the tests run those with fakes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as ExpoBrightness from 'expo-brightness';
import { Directory, File, Paths } from 'expo-file-system';
import type { Brightness } from './dimmer';
import type { DownloadFiles } from './downloads';
import type { AudioOutput, Store } from './player';

/** Once at start: plays with the ringer switch off, keeps playing when the screen locks, pauses for a call. */
export function prepareAudioSession(): Promise<void> {
  return setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
}

export function expoAudioOutput(): AudioOutput {
  const player = createAudioPlayer(null, { updateInterval: 1000 });
  return {
    load(uri, title) {
      player.replace({ uri });
      player.setActiveForLockScreen(true, { title, artist: 'Peace Be Still' }, { showSeekBackward: true, showSeekForward: true });
    },
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: (seconds) => player.seekTo(seconds),
    get currentTime() { return player.currentTime; },
    get volume() { return player.volume; },
    set volume(value: number) { player.volume = Math.max(0, Math.min(1, value)); },
    onFinish(listener) {
      const subscription = player.addListener('playbackStatusUpdate', (status) => { if (status.didJustFinish) listener(); });
      return () => subscription.remove();
    },
    dispose() { player.clearLockScreenControls(); player.remove(); },
  };
}

export const expoBrightness: Brightness = {
  get: () => ExpoBrightness.getBrightnessAsync(),
  set: (level) => ExpoBrightness.setBrightnessAsync(level),
};

export function expoDownloadFiles(): DownloadFiles {
  const dir = new Directory(Paths.document, 'audio');
  const file = (name: string) => new File(dir, name);
  return {
    exists: (name) => file(name).exists,
    uri: (name) => file(name).uri,
    async download(url, name) {
      if (!dir.exists) dir.create({ intermediates: true });
      await File.downloadFileAsync(url, file(name));
    },
    sha256: (name) => file(name).digest('SHA-256'),
    move: (from, to) => file(from).move(file(to)),
    remove: (name) => file(name).delete(),
  };
}

export const store: Store = AsyncStorage;
