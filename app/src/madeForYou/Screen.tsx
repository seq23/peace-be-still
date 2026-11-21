import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { t } from '../i18n';
import { fonts } from '../theme/tokens';
import { BackLink, Body, Card, Label, PillButton, Screen, TextLink, Title, usePalette } from '../ui';
import { madeForYouApi, SessionError, type Ready, type SessionContext, type Shelf } from './api';
import { playedSessionKey } from './played';
import { madeForYouCopy, readyWhen } from './copy';

type Props = {
  paid: boolean;
  context: SessionContext;
  close: () => void;
  plans: () => void;
  play: (row: Ready) => void;
  api?: typeof madeForYouApi;
};

export function MadeForYouScreen({ paid, context, close, plans, play, api = madeForYouApi }: Props) {
  const copy = madeForYouCopy(context.lang);
  const back = t('common.back', { locale: context.lang });
  if (!paid) return <Screen>
    <BackLink onPress={close}>{back}</BackLink>
    <Title>{copy('title')}</Title>
    <Body>{copy('locked')}</Body>
    <PillButton onPress={plans}>{copy('plans')}</PillButton>
  </Screen>;
  return <Sessions context={context} close={close} play={play} api={api} />;
}

function Sessions({ context, close, play, api }: Pick<Props, 'context' | 'close' | 'play'> & { api: typeof madeForYouApi }) {
  const { age, door, kind, lang } = context;
  const copy = madeForYouCopy(lang);
  const palette = usePalette();
  const focused = useIsFocused();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [unplayed, setUnplayed] = useState<string | null>(null);
  const newest = shelf?.ready[0]?.id;
  useEffect(() => {
    if (!focused || !newest) return;
    let active = true;
    void AsyncStorage.getItem(playedSessionKey(newest)).then(played => {
      if (active) setUnplayed(played ? null : newest);
    }, () => { if (active) setUnplayed(null); });
    return () => { active = false; };
  }, [focused, newest]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, refresh] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<'limit' | 'failed' | 'preview' | 'full' | null>(null);
  const [crisis, setCrisis] = useState('');
  const submission = useRef(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    setLoadFailed(false);
    void api.list({ age, door, kind, lang }, controller.signal).then(result => {
      if (!controller.signal.aborted && version === requestVersion.current) setShelf(result);
    }, () => {
      if (!controller.signal.aborted && version === requestVersion.current) setLoadFailed(true);
    });
    return () => controller.abort();
  }, [age, api, door, focused, kind, lang, revision]);

  async function submit() {
    const note = text.trim();
    if (submission.current || !note || note.length > 500) return;
    submission.current = true;
    setSending(true);
    setNotice(null);
    setCrisis('');
    try {
      const response = await api.submit(context, note);
      setText('');
      if (response.status === 'crisis') setCrisis(response.text);
      else if (response.status === 'preview') setNotice('preview');
      else {
        ++requestVersion.current;
        setShelf(previous => ({
          ready: previous?.ready ?? [], ended: null, requestedToday: true, next: previous?.next ?? null,
          pending: { id: response.id, day: response.day, dueAt: response.dueAt, late: false, retrying: false },
        }));
        refresh(value => value + 1);
      }
    } catch (error) {
      const code = error instanceof SessionError ? error.code : '';
      setNotice(code === 'DAILY_LIMIT' ? 'limit' : code === 'FULL' ? 'full' : 'failed');
      if (code === 'FULL' || code === 'DAILY_LIMIT') refresh(value => value + 1);
    } finally {
      submission.current = false;
      setSending(false);
    }
  }

  const journey = t(kind === 'psalm' ? 'journey.psalmNights.name' : 'journey.imaginationNights.name', { locale: lang });
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' });
  const minutes = new Intl.NumberFormat(lang, { style: 'unit', unit: 'minute', unitDisplay: 'short' });
  const pending = shelf?.pending;
  const alert = (message: string) => <Text accessibilityRole="alert" style={{ color: palette.wine, fontFamily: fonts.body }}>{message}</Text>;
  // The form shows only when a request can really be taken: none waiting, none today, and a night with room.
  const canAsk = !!shelf && !pending && !shelf.requestedToday && shelf.next !== null;

  return <Screen>
    <BackLink onPress={close}>{t('common.back', { locale: lang })}</BackLink>
    <Title>{copy('title')}</Title>
    <Label>{journey}</Label>
    {loadFailed && alert(copy('error'))}
    {pending && <Card>
      <Body muted={false}>{pending.late ? copy('late') : copy('readyStatus', { when: readyWhen(pending.dueAt, lang) })}</Body>
      {!pending.late && <Body size={14}>{copy(pending.retrying ? 'retrying' : 'pendingDetail')}</Body>}
    </Card>}
    {!pending && shelf?.ended && <Card><Body muted={false}>{copy(shelf.ended)}</Body></Card>}
    {!!shelf?.ready.length && <>
      <Label>{copy('shelf')}</Label>
      {shelf.ready.map(row => <Card key={row.id} onPress={() => play(row)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Body muted={false}>{`${journey} · ${minutes.format(Math.max(1, Math.round(row.seconds / 60)))}`}</Body>
          <Body size={14}>{date.format(new Date(row.day))}</Body>
          {row.id === newest && row.id === unplayed && <Label>{copy('new')}</Label>}
        </View>
        <Text aria-hidden style={{ color: palette.accent, fontSize: 21 }}>›</Text>
      </Card>)}
    </>}
    {(loadFailed || pending) && <TextLink onPress={() => refresh(value => value + 1)}>{copy('refresh')}</TextLink>}
    {!shelf && !loadFailed && <Body>{copy('loading')}</Body>}
    {crisis ? <Text accessibilityRole="alert" style={{ color: palette.ink, fontFamily: fonts.body }}>{crisis}</Text>
      : shelf && !pending && !canAsk ? <Body>{copy(shelf.requestedToday ? 'usedToday' : 'full')}</Body>
      : canAsk && <React.Fragment>
        <Body>{copy('description')}</Body>
        <Body muted={false}>{copy('note')}</Body>
        <TextInput accessibilityLabel={copy('note')} multiline maxLength={500} editable={!sending}
          value={text} onChangeText={setText} style={{
            minHeight: 116, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 14,
            color: palette.ink, backgroundColor: palette.card, fontFamily: fonts.body, fontSize: 17, textAlignVertical: 'top',
          }} />
        <Body size={14}>{copy('counter', { count: text.length })}</Body>
        <Body size={14}>{copy('privacy')}</Body>
        <Body size={14}>{copy('formPromise', { when: readyWhen(shelf!.next!, lang) })}</Body>
        {notice === 'preview' ? <Body>{copy(notice)}</Body> : notice && alert(copy(notice))}
        {sending ? <Body>{copy('sending')}</Body> : !!text.trim() && <PillButton onPress={() => void submit()}>{copy('submit')}</PillButton>}
      </React.Fragment>}
  </Screen>;
}
