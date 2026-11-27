// The phone side of a night: the bed and a recording through expo-audio (in the app's one audio session, so the
// screen can lock), the phone's own voice through expo-speech (on-device, $0, no server voice), and the recording
// files kept under the app's documents folder. Kept apart from night.ts and saved.ts so the tests run those with fakes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { prepareAudioSession } from '../player/adapters';
import { isOwnNightPreview } from './api';
import { RECORDING_MAX_SECONDS } from './limits';
import type { BedOutput, VoiceOutput } from './night';
import { createSavedNights, type RemoveFile } from './saved';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BED = require('../../assets/audio/night-bed.mp3');

/** Slower and a little lower than the phone's normal voice, so it reads softly. */
export const PHONE_VOICE = { rate: 0.8, pitch: 0.95 } as const;
const speechLanguage = (lang: 'en' | 'es') => (lang === 'es' ? 'es-MX' : 'en-US');

export function bedOutput(title: string): BedOutput {
  let player: AudioPlayer | null = null;
  return {
    start(volume) {
      player?.remove();
      player = createAudioPlayer(BED);
      player.loop = true;
      player.volume = volume;
      // The night shows on the lock screen like any session; it has no seek (it is a timed night, not a file).
      player.setActiveForLockScreen(true, { title, artist: 'Peace Be Still' }, { showSeekBackward: false, showSeekForward: false, isLiveStream: true });
      player.play();
    },
    setVolume(volume) { if (player) player.volume = Math.max(0, Math.min(1, volume)); },
    stop() {
      if (!player) return;
      player.pause();
      player.clearLockScreenControls();
      player.remove();
      player = null;
    },
  };
}

export function phoneVoice(scene: string, lang: 'en' | 'es'): VoiceOutput {
  return {
    say: volume => new Promise<void>((resolve, reject) => {
      Speech.speak(scene, { language: speechLanguage(lang), ...PHONE_VOICE, volume, onDone: () => resolve(), onStopped: () => resolve(), onError: error => reject(error) });
    }),
    stop: () => { void Speech.stop(); },
  };
}

/** Her recording, once per saying; a file that will not play (or never ends) is a failed saying, never a hang. */
export function recordingVoice(uri: string): VoiceOutput {
  let player: AudioPlayer | null = null;
  const release = () => { player?.pause(); player?.remove(); player = null; };
  return {
    say: volume => new Promise<void>((resolve, reject) => {
      release();
      const current = createAudioPlayer({ uri });
      player = current;
      current.volume = volume;
      const timer = setTimeout(() => { sub.remove(); reject(new Error('RECORDING_TIMEOUT')); }, (RECORDING_MAX_SECONDS + 15) * 1000);
      const sub = current.addListener('playbackStatusUpdate', status => {
        if (!status.didJustFinish) return;
        clearTimeout(timer); sub.remove(); resolve();
      });
      try { current.play(); } catch (error) { clearTimeout(timer); sub.remove(); reject(error); }
    }),
    stop: release,
  };
}

/** Recording only on iPhone: Android keeps RECORD_AUDIO blocked (app.config.ts), so it offers the phone voice. */
export const canRecord = () => Platform.OS === 'ios';

/** The marked TEST recording, on the web preview only (app/public is part of the web export, never a store build). */
export function previewRecording(lang: 'en' | 'es'): { uri: string; seconds: number } | null {
  if (!isOwnNightPreview()) return null;
  const origin = (globalThis as { location?: Location }).location?.origin;
  if (!origin) return null;
  return { uri: `${origin}/own-night-preview/test-recording-${lang}.mp3`, seconds: lang === 'es' ? 11 : 9 };
}

const folder = () => new Directory(Paths.document, 'own-nights');
/** Moves a finished recording from the recorder's cache into the app's documents, named for its night. */
export function keepRecording(from: string, nightId: string): string {
  const dir = folder();
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, `${nightId}-${Date.now()}.m4a`);
  new File(from).move(target);
  return target.uri;
}

/** Deletes a recording file on this phone. Only files under the app's own folder are ever touched. */
export const removeRecording: RemoveFile = async uri => {
  if (!uri.startsWith('file:')) return; // the preview's TEST recording is a web address: nothing on the phone
  const file = new File(uri);
  if (file.exists) file.delete();
};

/** Recording needs the session to allow the microphone; afterwards playback goes back to the speaker. */
export const recordingSession = (on: boolean) => on
  ? setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
  : setAudioModeAsync({ allowsRecording: false }).then(prepareAudioSession);

/** The phone's one shelf of saved nights. */
export const savedNights = createSavedNights(AsyncStorage, removeRecording);
