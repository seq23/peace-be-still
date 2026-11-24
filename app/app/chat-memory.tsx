// "What the chat remembers" (Settings): the one note paid chat keeps about her, read from the server with her
// signed token, and a delete that asks first. A read that fails says so; "nothing remembered" is shown only when
// the server said so. Not offered under 13 (no chat memory exists there).
import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { deleteChatMemory, readChatMemory } from '../src/chat/api';
import { onboarded, startRoute } from '../src/model';
import { usePurchases } from '../src/purchases/provider';
import { useSettings, useT } from '../src/settings';
import { fonts } from '../src/theme/tokens';
import { BackLink, Body, Card, Label, Screen, TextLink, Title, usePalette } from '../src/ui';

type Read = { state: 'loading' } | { state: 'failed' } | { state: 'read'; summary: string | null };
type Erase = 'idle' | 'confirm' | 'deleting' | 'done' | 'failed';

export default function ChatMemoryScreen() {
  const { settings } = useSettings();
  const t = useT();
  const c = usePalette();
  const router = useRouter();
  const { paid } = usePurchases();
  const [read, setRead] = useState<Read>({ state: 'loading' });
  const [erase, setErase] = useState<Erase>('idle');
  const blocked = !onboarded(settings) || settings.age === 'child';

  const load = useCallback(async () => {
    setRead({ state: 'loading' });
    try { setRead({ state: 'read', summary: (await readChatMemory()).summary }); } catch { setRead({ state: 'failed' }); }
  }, []);
  useEffect(() => { if (!blocked) void load(); }, [blocked, load]);

  if (!onboarded(settings)) return <Redirect href={startRoute(settings)} />;
  if (settings.age === 'child') return <Redirect href="/settings" />;

  async function remove() {
    setErase('deleting');
    try {
      await deleteChatMemory();
      setErase('done');
      setRead({ state: 'read', summary: null });
    } catch { setErase('failed'); }
  }
  const alert = (text: string) => <Text accessibilityRole="alert" style={{ color: c.wine, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 }}>{text}</Text>;
  // A note on screen, or a read that failed (she may still want it gone), can be deleted.
  const canDelete = erase !== 'done' && ((read.state === 'read' && !!read.summary) || read.state === 'failed');

  return (
    <Screen>
      <BackLink onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}>{t('settings.title')}</BackLink>
      <Title>{t('memory.title')}</Title>
      <Body>{t(paid ? 'memory.intro.paid' : 'memory.intro.free')}</Body>
      {read.state === 'loading' ? <ActivityIndicator color={c.accent} accessibilityLabel={t('memory.loading')} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        : read.state === 'failed' ? <>
          {alert(t('memory.failed'))}
          <TextLink onPress={() => void load()}>{t('memory.retry')}</TextLink>
        </>
        : read.summary ? <>
          <Label>{t('memory.note')}</Label>
          <Card><Body muted={false}>{read.summary}</Body></Card>
        </>
        : erase === 'done' ? <Body muted={false}>{t('memory.done')}</Body>
        : <Body muted={false}>{t('memory.none')}</Body>}
      {canDelete && (erase === 'idle'
        ? <TextLink onPress={() => setErase('confirm')}>{t('memory.delete')}</TextLink>
        : <>
          {erase === 'failed' ? alert(t('memory.deleteFailed')) : <Body muted={false}>{t(erase === 'deleting' ? 'memory.deleting' : 'memory.ask')}</Body>}
          {erase !== 'deleting' && <TextLink onPress={() => void remove()}>{t('memory.yes')}</TextLink>}
          {erase !== 'deleting' && <TextLink onPress={() => setErase('idle')}>{t('memory.no')}</TextLink>}
        </>)}
    </Screen>
  );
}
