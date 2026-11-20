import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import type { Age, Door } from '../model';
import { NowPlaying } from '../screens/listen/NowPlaying';
import { useT } from '../settings';
import { BackLink, Body, Screen } from '../ui';
import { madeForYouApi, type Ready, type SessionContext } from './api';
import { madeForYouCopy } from './copy';
import { isMadeForYouPreview, useMadeForYouPaid } from './paidStub';
import { previewApi } from './preview';

const previewPlayerApi = previewApi('ready');

export function MadeForYouListen({ id, age, door }: { id: string; age: Age; door: Door }) {
  const t = useT('journey');
  const { locale } = t;
  const paid = useMadeForYouPaid(age);
  const router = useRouter();
  const preview = isMadeForYouPreview();
  const api = preview ? previewPlayerApi : madeForYouApi;
  const kind = door === 'faith' ? 'psalm' : 'imagination';
  const context: SessionContext = { age, door, kind, lang: locale };
  const [row, setRow] = useState<Ready | null | undefined>(undefined);

  useEffect(() => {
    if (!paid) return;
    const controller = new AbortController();
    void api.list({ age, door, kind, lang: locale }, controller.signal).then(shelf => {
      if (!controller.signal.aborted) setRow(shelf.ready.find(item => item.id === id) ?? null);
    }, () => {
      if (!controller.signal.aborted) setRow(null);
    });
    return () => controller.abort();
  }, [age, api, door, id, kind, locale, paid]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace(preview ? '/made-for-you?state=ready' : '/made-for-you');
  }

  const copy = madeForYouCopy(locale);
  if (!paid || !row) return <Screen>
    <BackLink onPress={close}>{t('common.back')}</BackLink>
    <Body>{!paid ? copy('locked') : row === undefined ? copy('loading') : copy('error')}</Body>
  </Screen>;

  return <NowPlaying track={{
    file: row.path, kind: 'made-for-you', ref: row.id, lang: locale, voice: 'AI',
    titles: { [locale]: copy('title') }, seconds: row.seconds, sha256: row.sha256,
  }} close={close} privateStream={{
    label: t(kind === 'psalm' ? 'journey.psalmNights.name' : 'journey.imaginationNights.name'),
    async url(signal) {
      const { url } = await api.play(context, row.id, signal);
      const parsed = new URL(url);
      if (parsed.username || parsed.password || (parsed.protocol !== 'https:' &&
        !(preview && parsed.origin === globalThis.location.origin))) throw new Error('Invalid audio URL');
      return parsed.href;
    },
  }} />;
}
