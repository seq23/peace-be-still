import { useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { t } from '../i18n';
import { fonts } from '../theme/tokens';
import { BackLink, Body, Card, Label, PillButton, Screen, TextLink, Title, usePalette } from '../ui';
import { madeForYouApi, SessionError, type Ready, type SessionContext, type Shelf } from './api';
import { madeForYouCopy } from './copy';
import { MadeForYouPlayback } from './Playback';

type Props = {
  paid: boolean;
  context: SessionContext;
  close: () => void;
  plans: () => void;
  api?: typeof madeForYouApi;
};

export function MadeForYouScreen({ paid, context, close, plans, api = madeForYouApi }: Props) {
  const copy = madeForYouCopy(context.lang);
  const back = t('common.back', { locale: context.lang });
  if (!paid) return <Screen>
    <BackLink onPress={close}>{back}</BackLink>
    <Title>{copy('title')}</Title>
    <Body>{copy('locked')}</Body>
    <PillButton onPress={plans}>{copy('plans')}</PillButton>
  </Screen>;
  return <Sessions context={context} close={close} api={api} />;
}

function Sessions({ context, close, api }: Pick<Props, 'context' | 'close'> & { api: typeof madeForYouApi }) {
  const { age, door, kind, lang } = context;
  const copy = madeForYouCopy(lang);
  const palette = usePalette();
  const focused = useIsFocused();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, refresh] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<'limit' | 'failed' | null>(null);
  const [crisis, setCrisis] = useState('');
  const [selected, setSelected] = useState<Ready | null>(null);
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

  const source = useCallback(async (id: string) => {
    const { url } = await api.play({ age, door, kind, lang }, id);
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Invalid audio URL');
    return parsed.href;
  }, [age, api, door, kind, lang]);

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
      else {
        ++requestVersion.current;
        setShelf(previous => ({ ready: previous?.ready ?? [], pending: response }));
        refresh(value => value + 1);
      }
    } catch (error) {
      setNotice(error instanceof SessionError && error.code === 'DAILY_LIMIT' ? 'limit' : 'failed');
    } finally {
      submission.current = false;
      setSending(false);
    }
  }

  if (selected) return <MadeForYouPlayback key={selected.id} row={selected} lang={lang}
    source={source} close={() => setSelected(null)} />;
  const journey = t(kind === 'psalm' ? 'journey.psalmNights.name' : 'journey.imaginationNights.name', { locale: lang });
  const date = (day: string) => new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(day));

  return <Screen>
    <BackLink onPress={close}>{t('common.back', { locale: lang })}</BackLink>
    <Title>{copy('title')}</Title>
    <Label>{journey}</Label>
    {loadFailed && <Text accessibilityRole="alert" style={{ color: palette.wine, fontFamily: fonts.body }}>{copy('error')}</Text>}
    {shelf?.pending && <Card><Body muted={false}>{copy('pending')}</Body></Card>}
    {shelf?.ready.map(row => <Card key={row.id} onPress={() => setSelected(row)}>
      <Body muted={false}>{date(row.day)}</Body>
    </Card>)}
    {(loadFailed || shelf?.pending) && <TextLink onPress={() => refresh(value => value + 1)}>{copy('refresh')}</TextLink>}
    {!shelf && !loadFailed && <Body>{copy('loading')}</Body>}
    {crisis ? <Text accessibilityRole="alert" style={{ color: palette.ink, fontFamily: fonts.body }}>{crisis}</Text> :
      shelf && !shelf.pending && <React.Fragment>
        <Body muted={false}>{copy('note')}</Body>
        <TextInput accessibilityLabel={copy('note')} multiline maxLength={500} editable={!sending}
          value={text} onChangeText={setText} style={{
            minHeight: 116, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 14,
            color: palette.ink, backgroundColor: palette.card, fontFamily: fonts.body, fontSize: 17, textAlignVertical: 'top',
          }} />
        <Body size={14}>{copy('counter', text.length)}</Body>
        <Body size={14}>{copy('privacy')}</Body>
        {notice && <Text accessibilityRole="alert" style={{ color: palette.wine, fontFamily: fonts.body }}>{copy(notice)}</Text>}
        {sending ? <Body>{copy('sending')}</Body> : !!text.trim() && <PillButton onPress={() => void submit()}>{copy('submit')}</PillButton>}
      </React.Fragment>}
  </Screen>;
}
