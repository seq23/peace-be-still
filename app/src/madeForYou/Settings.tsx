import React, { useState } from 'react';
import { Text } from 'react-native';
import { useSettings, useT } from '../settings';
import { fonts } from '../theme/tokens';
import { Body, Label, TextLink, usePalette } from '../ui';
import { madeForYouApi } from './api';
import { madeForYouCopy } from './copy';

/** Settings: "Delete my made-for-you sessions" (privacy policy: delete them in Settings at any time). */
export function MadeForYouSettings({ api = madeForYouApi }: { api?: Pick<typeof madeForYouApi, 'remove'> }) {
  const { settings } = useSettings();
  const { locale } = useT('journey');
  const palette = usePalette();
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting' | 'done' | 'failed'>('idle');
  const age = settings.age;
  if (!age || age === 'child') return null;
  const copy = madeForYouCopy(locale);
  async function erase() {
    setStep('deleting');
    try { await api.remove({ age: age! }); setStep('done'); } catch (error) {
      // No install token means nothing was ever sent, so there is nothing to delete.
      setStep(error instanceof Error && error.message === 'Install unavailable' ? 'done' : 'failed');
    }
  }
  return <>
    <Label>{copy('title')}</Label>
    {step === 'done' ? <Body>{copy('settingsDone')}</Body>
      : step === 'idle' ? <TextLink onPress={() => setStep('confirm')}>{copy('settingsDelete')}</TextLink>
      : <>
        {step === 'failed'
          ? <Text accessibilityRole="alert" style={{ color: palette.wine, fontFamily: fonts.body }}>{copy('deleteFailed')}</Text>
          : <Body>{copy('settingsAsk')}</Body>}
        {step !== 'deleting' && <TextLink onPress={() => void erase()}>{copy('deleteYes')}</TextLink>}
        {step !== 'deleting' && <TextLink onPress={() => setStep('idle')}>{copy('deleteNo')}</TextLink>}
      </>}
  </>;
}
