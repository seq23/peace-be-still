// "Write your own night": the saved nights on this phone, and the editor (wish -> one short moment she can change
// -> voice -> save). Paid adults only; a free adult sees what it is and the existing price screen. When the moment
// cannot be written (offline, busy, today's private messages used) the editor stays open for her to write it.
import { getLocales } from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { crisisLinks } from '../madeForYou/crisis';
import { PAID_CHAT_MESSAGES } from '../gates';
import { useT } from '../settings';
import { fonts } from '../theme/tokens';
import { BackLink, Body, Card, Label, PillButton, Screen, TextLink, Title, styles, usePalette } from '../ui';
import { REPORT_REASONS, type MomentReport, type SceneResult } from './api';
import { canRecord, previewRecording } from './adapters';
import { OWN_NIGHT_MINUTES, SAVED_NIGHTS_MAX, SCENE_MAX, WHO_MAX, WISH_MAX, type OwnNightMinutes } from './limits';
import { Recorder } from './Recorder';
import type { NightVoice, SavedNight, SavedNights } from './saved';

type Write = (input: { wish: string; who?: string; lang: 'en' | 'es'; region?: string }) => Promise<SceneResult>;
/** Her one-time yes (Apple 5.1.2(i)) to the services that read her wish, asked before the first one is sent. */
export type OwnNightConsent = { given: () => Promise<boolean>; give: () => Promise<void> };
/** The privacy policy in her language (legal/privacy.md, legal/es/privacidad.md). */
const POLICY = { en: 'https://peacebestillapp.com/privacy', es: 'https://peacebestillapp.com/es/privacidad' } as const;
type Props = {
  paid: boolean;
  lang: 'en' | 'es';
  saved: SavedNights;
  write: Write;
  /** Sends a reason-only report of an AI-written moment; resolves whether the server took it. */
  report: (reason: MomentReport) => Promise<boolean>;
  consent: OwnNightConsent;
  close: () => void;
  plans: () => void;
  play: (id: string) => void;
  /** Opens straight into the editor (the web preview's ?state=… switches). */
  startEditing?: boolean;
};
type Draft = Omit<SavedNight, 'savedAt' | 'ai'> & { ai: boolean; isNew: boolean };
type Notice = 'busy' | 'offline' | 'limit' | 'saveFailed' | 'needRecording' | 'full';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const blank = (lang: 'en' | 'es'): Draft => ({ id: newId(), wish: '', who: '', scene: '', lang, minutes: 45, voice: 'phone', ai: false, isNew: true });

export function OwnNightScreen(props: Props) {
  const t = useT('journey');
  if (!props.paid) return <Screen>
    <BackLink onPress={props.close}>{t('common.back')}</BackLink>
    <Title>{t('ownNight.title')}</Title>
    <Body>{t('ownNight.locked')}</Body>
    <PillButton onPress={props.plans}>{t('ownNight.seePlans')}</PillButton>
  </Screen>;
  return <Nights {...props} />;
}

function Nights({ lang, saved, write, report, consent, close, play, startEditing }: Props) {
  const t = useT('journey');
  const c = usePalette();
  const [nights, setNights] = useState<SavedNight[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(startEditing ? blank(lang) : null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  useEffect(() => { let live = true; void saved.list().then(list => { if (live) setNights(list); }); return () => { live = false; }; }, [saved]);

  async function remove(id: string) {
    setDeleteFailed(false);
    const result = await saved.remove(id);
    if (result.ok) { setNights(result.nights); setConfirming(null); } else setDeleteFailed(true);
  }

  if (draft) return <Editor draft={draft} write={write} report={report} consent={consent} saved={saved} count={nights?.length ?? 0}
    done={list => { if (list) setNights(list); setDraft(null); }} />;

  const full = (nights?.length ?? 0) >= SAVED_NIGHTS_MAX;
  const voiceName = (voice: NightVoice) => t(voice === 'mine' ? 'ownNight.voice.mine' : 'ownNight.voice.phone');
  return <Screen>
    <BackLink onPress={close}>{t('common.back')}</BackLink>
    <Label>{t('journey.livingInTheEnd.name')}</Label>
    <Title>{t('ownNight.title')}</Title>
    <Body>{t('ownNight.intro')}</Body>
    {nights && <View style={{ gap: 10 }}>
      <Label>{t('ownNight.saved')}</Label>
      <Body size={14}>{nights.length ? t('ownNight.savedCount', { count: nights.length, max: SAVED_NIGHTS_MAX }) : t('ownNight.none')}</Body>
      {nights.map(night => <Card key={night.id}>
        <Pressable accessibilityRole="button" onPress={() => play(night.id)} style={{ gap: 4, minHeight: 44 }}>
          <Text numberOfLines={2} style={[styles.t3, { color: c.ink }]}>{night.scene}</Text>
          <Body size={14}>{t('ownNight.row', { minutes: night.minutes, voice: voiceName(night.voice) })}</Body>
        </Pressable>
        {confirming === night.id ? <View style={{ gap: 4 }}>
          <Body muted={false}>{t('ownNight.deleteConfirm')}</Body>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            <TextLink onPress={() => void remove(night.id)}>{t('ownNight.deleteYes')}</TextLink>
            <TextLink onPress={() => setConfirming(null)}>{t('ownNight.deleteNo')}</TextLink>
          </View>
        </View> : <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <TextLink onPress={() => setDraft({ ...night, ai: night.ai ?? false, isNew: false })}>{t('ownNight.edit')}</TextLink>
          <TextLink onPress={() => { setDeleteFailed(false); setConfirming(night.id); }}>{t('ownNight.delete')}</TextLink>
        </View>}
      </Card>)}
      {deleteFailed && <Text accessibilityRole="alert" style={{ color: c.wine, fontFamily: fonts.body }}>{t('ownNight.deleteFailed')}</Text>}
    </View>}
    {full ? <Body muted={false}>{t('ownNight.full', { max: SAVED_NIGHTS_MAX })}</Body>
      : nights && <PillButton onPress={() => setDraft(blank(lang))}>{t('ownNight.new')}</PillButton>}
  </Screen>;
}

function Choices<T extends string | number>({ label, options, value, onChange }: { label: string; options: Array<{ value: T; text: string }>; value: T; onChange: (v: T) => void }) {
  return <View style={{ gap: 8 }}>
    <Label>{label}</Label>
    <View role="radiogroup" aria-label={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => <Card key={String(o.value)} role="radio" selected={o.value === value} label={o.text} onPress={() => onChange(o.value)}
        style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
        <Body muted={false} size={15}>{o.text}</Body>
      </Card>)}
    </View>
  </View>;
}

function Editor({ draft: start, write, report, consent, saved, count, done }: { draft: Draft; write: Write; report: Props['report']; consent: OwnNightConsent; saved: SavedNights; count: number; done: (list?: SavedNight[]) => void }) {
  const t = useT('journey');
  const c = usePalette();
  const [d, setD] = useState<Draft>(start);
  const [step, setStep] = useState<'ask' | 'scene'>(start.isNew ? 'ask' : 'scene');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [crisis, setCrisis] = useState('');
  const [refused, setRefused] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const busy = useRef(false);
  // Nothing is sent before her yes to the services that read it; an unreadable answer counts as not yet.
  const agreed = useRef(false);
  const [asking, setAsking] = useState(false);
  useEffect(() => { let live = true; void consent.given().then(yes => { if (live && yes) agreed.current = true; }, () => undefined); return () => { live = false; }; }, [consent]);
  // A recording made here and not saved is deleted when she leaves (only the saved night's own file is kept).
  const unsaved = useRef<string | null>(null);
  const set = (patch: Partial<Draft>) => setD(current => ({ ...current, ...patch }));
  const recordingAllowed = canRecord() || !!previewRecording(d.lang);
  const input = { minHeight: 52, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, color: c.ink, backgroundColor: c.card, fontFamily: fonts.body, fontSize: 17, textAlignVertical: 'top' as const };

  async function ask() {
    if (busy.current || !d.wish.trim()) return;
    if (!agreed.current) { setAsking(true); return; }
    busy.current = true; setSending(true); setNotice(null); setRefused(''); setCrisis('');
    let region: string | undefined;
    try { region = getLocales()[0]?.regionCode ?? undefined; } catch { region = undefined; }
    try {
      const result = await write({ wish: d.wish, who: d.who || undefined, lang: d.lang, region });
      if (result.kind === 'scene') { set({ scene: result.scene, ai: true }); setRemaining(result.remaining); setStep('scene'); }
      else if (result.kind === 'crisis') setCrisis(result.text);
      else if (result.kind === 'refused' || result.kind === 'paused') setRefused(result.text);
      else { setNotice(result.reason === 'offline' ? 'offline' : result.reason === 'limit' ? 'limit' : 'busy'); setStep('scene'); }
    } finally { busy.current = false; setSending(false); }
  }

  async function save() {
    if (busy.current || !d.scene.trim()) return;
    if (d.voice === 'mine' && !d.recording) { setNotice('needRecording'); return; }
    if (start.isNew && count >= SAVED_NIGHTS_MAX) { setNotice('full'); return; }
    busy.current = true; setNotice(null);
    const { isNew: _isNew, ...night } = d;
    const mine = d.voice === 'mine';
    const result = await saved.save({ ...night, recording: mine ? d.recording : undefined, recordingSeconds: mine ? d.recordingSeconds : undefined, savedAt: Date.now() });
    busy.current = false;
    if (!result.ok) { setNotice(result.reason === 'full' ? 'full' : 'saveFailed'); return; }
    // A recording she made, then switched to the phone voice before saving, is not kept.
    if (unsaved.current && unsaved.current !== result.nights.find(n => n.id === d.id)?.recording) await saved.discard(unsaved.current);
    unsaved.current = null;
    done(result.nights);
  }
  async function cancel() {
    if (unsaved.current && unsaved.current !== start.recording) await saved.discard(unsaved.current);
    unsaved.current = null;
    done();
  }

  const alert = (text: string) => <Text accessibilityRole="alert" style={{ color: c.wine, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 }}>{text}</Text>;
  const noticeText = !notice ? '' : notice === 'limit' ? t('ownNight.limit', { count: PAID_CHAT_MESSAGES }) : notice === 'full' ? t('ownNight.full', { max: SAVED_NIGHTS_MAX })
    : t(({ busy: 'ownNight.busy', offline: 'ownNight.offline', saveFailed: 'ownNight.saveFailed', needRecording: 'ownNight.needRecording' } as const)[notice]);

  if (crisis) return <Screen>
    <BackLink onPress={() => void cancel()}>{t('common.back')}</BackLink>
    <Title>{t('ownNight.title')}</Title>
    <Text accessibilityRole="alert" style={{ color: c.ink, fontFamily: fonts.body, fontSize: 17, lineHeight: 25 }}>{crisis}</Text>
    {crisisLinks(crisis, d.lang).map(link => <Pressable key={link.url} accessibilityRole="link" onPress={() => void Linking.openURL(link.url)}
      style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: c.accent, borderRadius: 24 }}>
      <Text style={{ color: c.ink, fontFamily: fonts.strong, fontSize: 16 }}>{link.label}</Text>
    </Pressable>)}
    <Body>{t('ownNight.crisisNothingSaved')}</Body>
    <TextLink onPress={() => { setCrisis(''); set({ wish: '', who: '' }); }}>{t('ownNight.writeAgain')}</TextLink>
  </Screen>;

  return <Screen>
    <BackLink onPress={() => void cancel()}>{t('ownNight.cancel')}</BackLink>
    <Title>{t('ownNight.title')}</Title>
    {step === 'ask' ? <>
      <Label>{t('ownNight.wish')}</Label>
      <TextInput accessibilityLabel={t('ownNight.wish')} multiline maxLength={WISH_MAX} editable={!sending} value={d.wish}
        onChangeText={wish => set({ wish })} style={[input, { minHeight: 116 }]} />
      <Body size={14}>{t('ownNight.wishHint')}</Body>
      <Label>{t('ownNight.who')}</Label>
      <TextInput accessibilityLabel={t('ownNight.who')} maxLength={WHO_MAX} editable={!sending} value={d.who} onChangeText={who => set({ who })} style={input} />
    </> : <>
      <Label>{t('ownNight.scene')}</Label>
      {notice && ['busy', 'offline', 'limit'].includes(notice) && alert(noticeText)}
      {d.ai && <Body size={14}>{t('ownNight.writtenWithAi')}</Body>}
      <TextInput accessibilityLabel={t('ownNight.scene')} multiline maxLength={SCENE_MAX} value={d.scene}
        onChangeText={scene => set({ scene })} style={[input, { minHeight: 300, fontFamily: fonts.serif, fontSize: 19, lineHeight: 27 }]} />
      <Body size={14}>{t('ownNight.sceneHint')}</Body>
      {remaining !== null && <Body size={13}>{t('ownNight.remaining', { count: remaining })}</Body>}
      {d.ai && <ReportMoment report={report} />}
    </>}
    <Choices<OwnNightMinutes> label={t('ownNight.length')} value={d.minutes} onChange={minutes => set({ minutes })}
      options={OWN_NIGHT_MINUTES.map(m => ({ value: m, text: t('listen.minutes', { minutes: m }) }))} />
    {recordingAllowed && <Choices<NightVoice> label={t('ownNight.voice')} value={d.voice} onChange={voice => set({ voice })}
      options={[{ value: 'phone', text: t('ownNight.voice.phone') }, { value: 'mine', text: t('ownNight.voice.mine') }]} />}
    <Choices<'en' | 'es'> label={t('ownNight.language')} value={d.lang} onChange={lang => set({ lang })}
      options={[{ value: 'en', text: t('ownNight.language.en') }, { value: 'es', text: t('ownNight.language.es') }]} />
    {step === 'scene' && d.voice === 'mine' && recordingAllowed &&
      <Recorder nightId={d.id} lang={d.lang} recording={d.recording}
        onRecorded={(uri, seconds) => { if (unsaved.current && unsaved.current !== start.recording && unsaved.current !== uri) void saved.discard(unsaved.current); unsaved.current = uri; set({ recording: uri, recordingSeconds: seconds }); setNotice(null); }} />}
    {step === 'ask' && <Body size={14}>{t('ownNight.privacy')}</Body>}
    {refused ? alert(refused) : null}
    {notice && !['busy', 'offline', 'limit'].includes(notice) && alert(noticeText)}
    {step === 'ask' && asking
      ? <Card style={{ gap: 10 }}>
          <Label>{t('ownNight.consent.title')}</Label>
          <Body muted={false} size={15}>{t('ownNight.consent.body')}</Body>
          <TextLink onPress={() => void Linking.openURL(POLICY[d.lang])}>{t('ownNight.consent.policy')}</TextLink>
          <PillButton onPress={() => { agreed.current = true; setAsking(false); void consent.give().catch(() => undefined); void ask(); }}>{t('ownNight.consent.agree')}</PillButton>
          <TextLink onPress={() => { setAsking(false); setNotice(null); setStep('scene'); }}>{t('ownNight.consent.no')}</TextLink>
        </Card>
      : step === 'ask'
      ? <>{sending ? <Body>{t('ownNight.writing')}</Body> : <PillButton disabled={!d.wish.trim()} onPress={() => void ask()}>{t('ownNight.write')}</PillButton>}
          {!sending && <TextLink onPress={() => { setNotice(null); setStep('scene'); }}>{t('ownNight.myself')}</TextLink>}</>
      : <PillButton disabled={!d.scene.trim()} onPress={() => void save()}>{t('ownNight.save')}</PillButton>}
  </Screen>;
}

const REPORT_KEYS = { hurtful: 'ownNight.report.hurtful', wrong: 'ownNight.report.wrong', unsafe: 'ownNight.report.unsafe', other: 'ownNight.report.other' } as const;
/** App Review 1.2: an AI-written moment can be reported. Only the reason is sent. */
function ReportMoment({ report }: { report: Props['report'] }) {
  const t = useT('journey');
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  if (state === 'sent') return <Body size={14}>{t('ownNight.report.sent')}</Body>;
  if (!open) return <TextLink onPress={() => setOpen(true)}>{t('ownNight.report')}</TextLink>;
  return <View style={{ gap: 2 }}>
    <Body muted={false} size={15}>{t('ownNight.report.why')}</Body>
    {REPORT_REASONS.map(reason => <TextLink key={reason} disabled={state === 'sending'} onPress={() => {
      setState('sending');
      void report(reason).then(ok => setState(ok ? 'sent' : 'failed'));
    }}>{t(REPORT_KEYS[reason])}</TextLink>)}
    {state === 'failed' && <Text accessibilityRole="alert" style={{ color: c.wine, fontFamily: fonts.body }}>{t('ownNight.report.failed')}</Text>}
  </View>;
}
