// "My voice": she records her moment on the phone (iPhone only; never uploaded). The web preview has no
// microphone, so it offers the marked TEST recording instead; a store build never has that file or that button.
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useT } from '../settings';
import { fonts } from '../theme/tokens';
import { Body, TextLink, styles, usePalette } from '../ui';
import { canRecord, keepRecording, previewRecording, recordingSession, recordingVoice } from './adapters';
import { RECORDING_MAX_SECONDS } from './limits';

type Props = { nightId: string; lang: 'en' | 'es'; recording?: string; onRecorded: (uri: string, seconds: number) => void };

export function Recorder(props: Props) {
  return canRecord() ? <PhoneRecorder {...props} /> : <PreviewRecorder {...props} />;
}

function PreviewRecorder({ lang, recording, onRecorded }: Props) {
  const t = useT('journey');
  const test = previewRecording(lang);
  if (!test) return null;
  return <View style={{ gap: 6 }}>
    {recording ? <Body muted={false}>{t('ownNight.recorded')}</Body> : null}
    <TextLink onPress={() => onRecorded(test.uri, test.seconds)}>{t('ownNight.testRecording')}</TextLink>
    {recording ? <PlayBack uri={recording} /> : null}
  </View>;
}

function PhoneRecorder({ nightId, recording, onRecorded }: Props) {
  const t = useT('journey');
  const c = usePalette();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<'idle' | 'recording' | 'denied' | 'failed'>('idle');
  const started = useRef(0);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (limit.current) clearTimeout(limit.current); }, []);

  async function start() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { setState('denied'); return; }
      await recordingSession(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
      started.current = Date.now();
      setState('recording');
      limit.current = setTimeout(() => void stop(), RECORDING_MAX_SECONDS * 1000);
    } catch {
      setState('failed');
      await recordingSession(false).catch(() => undefined);
    }
  }
  async function stop() {
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
    try {
      await recorder.stop();
      const seconds = Math.max(1, Math.round((Date.now() - started.current) / 1000));
      const uri = recorder.uri;
      if (!uri) throw new Error('NO_RECORDING');
      onRecorded(keepRecording(uri, nightId), Math.min(seconds, RECORDING_MAX_SECONDS));
      setState('idle');
    } catch {
      setState('failed');
    } finally {
      await recordingSession(false).catch(() => undefined);
    }
  }

  return <View style={{ gap: 6 }}>
    {state === 'recording' ? <>
      <Text accessibilityLiveRegion="polite" style={{ color: c.ink, fontFamily: fonts.body, fontSize: 16 }}>{t('ownNight.recording')}</Text>
      <TextLink onPress={() => void stop()}>{t('ownNight.stop')}</TextLink>
    </> : <View style={[styles.row, { flexWrap: 'wrap' }]}>
      <TextLink onPress={() => void start()}>{t(recording ? 'ownNight.recordAgain' : 'ownNight.record')}</TextLink>
      {recording ? <PlayBack uri={recording} /> : null}
    </View>}
    {recording && state !== 'recording' ? <Body size={14}>{t('ownNight.recordingNote')}</Body> : null}
    {state === 'denied' || state === 'failed'
      ? <Text accessibilityRole="alert" style={{ color: c.wine, fontFamily: fonts.body }}>{t(state === 'denied' ? 'ownNight.micDenied' : 'ownNight.recordFailed')}</Text> : null}
  </View>;
}

function PlayBack({ uri }: { uri: string }) {
  const t = useT('journey');
  const voice = useRef<ReturnType<typeof recordingVoice> | null>(null);
  useEffect(() => () => voice.current?.stop(), []);
  return <TextLink onPress={() => { voice.current?.stop(); voice.current = recordingVoice(uri); void voice.current.say(1).catch(() => undefined); }}>{t('ownNight.playBack')}</TextLink>;
}
