// The Chat tab (mock-up screen 3). Free chat asks once for her yes to its data use (a free AI
// service may keep what she types; paid chat is private) and paid chat shows the AI disclosure once; every AI answer carries the AI label; the crisis reply is not labelled AI and
// its phone numbers are tappable; "N of 5 messages left today" comes from the Worker's count.
// Every AI answer has "Report this answer" (Apple Guideline 1.2): the answer and a reason are sent.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { displayRuns, TRANSLATION_CREDIT, TRANSLATION_NAME } from '../bible/core';
import { noTracking } from '../ui';
import type { Key, Language } from '../i18n';
import { crisisLinks as linksFor, type HelpLink } from './crisisLines';
import { FREE_CHAT_MESSAGES } from '../gates';
import { usePurchases } from '../purchases/provider';
import { plansFrom } from '../purchases/revenuecat';
import { useSettings, useT } from '../settings';
import { usePalette } from '../ui';
import { askFirstPrivate, ChatError, DISCLOSURE_KEY, reportAnswer, sendChat, type ReportReason } from './api';
import type { ChatResponse, ChatTurn } from './contract';

type Palette = ReturnType<typeof usePalette>;
type T = ((key: Key, values?: Record<string, string | number>) => string) & { locale: Language };
type Entry = { role: 'user'; text: string } | { role: 'reply'; res: ChatResponse } | { role: 'note'; text: string; region: string | null };
/** Her one-time yes that free chat goes to a free AI service that may keep what she types (two lanes, 21 Nov 2026). */
export const FREE_CONSENT_KEY = 'peace-be-still-free-chat-consent';

/** Tappable lines for a crisis reply: 988 always; the hotline the reply names (Poison Control and 911 first for medical danger). */
import { HelpLine, lineLinkProps, phoneRegion } from './HelpLine';
export { regionHelp } from './regionHelp';

/** The help line under an error note: muted, with its [bracketed] words as inline links. */
function NoteHelp({ region, c, t }: { region: string | null; c: Palette; t: T }) {
  return <HelpLine testID="note-help" region={region} t={t} style={[s.note, { color: c.muted }]} link={c.accent} />;
}

/** The card's one-tap help, from the one list (./crisisLines.ts) Made for you and Write your own night use too. */
export function crisisLinks(res: ChatResponse, lang: Language = 'en'): HelpLink[] {
  return linksFor(res.text, lang);
}

const REASONS: Array<[ReportReason, Key]> = [['hurtful', 'chat.report.hurtful'], ['wrong', 'chat.report.wrong'], ['unsafe', 'chat.report.unsafe'], ['other', 'chat.report.other']];

/** The report action under one AI answer: tap, pick a reason, sent; a failure can be tried again. */
function ReportAnswer({ answer, c, t }: { answer: string; c: Palette; t: T }) {
  const [state, setState] = useState<'idle' | 'choosing' | 'sending' | 'sent' | 'failed'>('idle');
  if (state === 'sent') return <Text accessibilityRole="alert" style={[s.small, { color: c.muted }]}>{t('chat.report.sent')}</Text>;
  if (state === 'idle') return <Pressable accessibilityRole="button" testID="report-answer" onPress={() => setState('choosing')}><Text style={[s.small, { color: c.muted, textDecorationLine: 'underline' }]}>{t('chat.report')}</Text></Pressable>;
  const send = async (reason: ReportReason) => {
    setState('sending');
    try { await reportAnswer(answer, reason); setState('sent'); } catch { setState('failed'); }
  };
  return <View style={s.reasons}>
    <Text style={[s.small, { color: c.ink }]}>{t(state === 'failed' ? 'chat.report.failed' : 'chat.report.why')}</Text>
    {REASONS.map(([id, label]) => <Pressable key={id} accessibilityRole="button" testID={`report-${id}`} disabled={state === 'sending'} onPress={() => void send(id)} style={[s.reason, { borderColor: c.line }]}>
      <Text style={[s.small, { color: c.ink }]}>{t(label)}</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" testID="report-cancel" disabled={state === 'sending'} onPress={() => setState('idle')}><Text style={[s.small, { color: c.muted, textDecorationLine: 'underline' }]}>{t('chat.report.cancel')}</Text></Pressable>
  </View>;
}

// Replies that end today's chat on this screen: the day's limit, free chat resting, a paused account.
// A message that shows the crisis lines never carries the upgrade offer (her ruling 23 Nov 2026).
// 'busy' (a model failed for a moment) keeps chat open. A paid user meets none of these (the Worker
// offers free chat after her private messages, or answers privately and briefly).
const CLOSES = new Set<ChatResponse['kind']>(['limit', 'no_free_model', 'paused']);
/** The day (on this phone) a paid user said yes to free chat (not private) after her private messages. */
export const OVERFLOW_KEY = 'peace-be-still-chat-overflow-day';
/** She had her private first chat on this phone: the next free-chat screen names what she had. */
export const FIRST_HAD_KEY = 'peace-be-still-first-private-had';
const today = () => new Date().toDateString();

export default function ChatScreen() {
  const { settings } = useSettings();
  const { paid, store, preview } = usePurchases();
  // The monthly price for the free day's last message, from the store product (never hard-coded).
  const [monthly, setMonthly] = useState<string | null>(null);
  useEffect(() => {
    if (paid) return;
    let live = true;
    const plans = preview ? preview.getOfferings().then(v => plansFrom(v)) : store?.getOfferings().then(v => plansFrom(v));
    void plans?.then(p => { if (live) setMonthly(p?.monthly.product.priceString ?? null); }, () => {});
    return () => { live = false; };
  }, [paid, store, preview]);
  const t = useT('journey') as T;
  const c = usePalette();
  const router = useRouter();
  // accepted: she read that answers are AI (every lane). freeOk: her yes to the free lane's data use.
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [freeOk, setFreeOk] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState<{ remaining: number; limit: number } | null>(null);
  const [closed, setClosed] = useState(false);
  const [conversation, setConversation] = useState(() => randomUUID());
  // overflowDay: the day she accepted free chat after her private messages (asked again each day).
  // pending: what she sent when the Worker asked, kept so it goes on the lane she picks, never retyped.
  const [overflowDay, setOverflowDay] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatTurn[] | null>(null);
  // The install's private first chat (the Worker decides, per conversation; null while it answers).
  const [firstPrivate, setFirstPrivate] = useState<boolean | null>(null);
  const [hadFirst, setHadFirst] = useState(false);
  // The conversation that was the private first chat, and its day: once that chat is over, the next
  // message starts a NEW conversation, so no private turn is ever sent again (review 21 Nov 2026).
  const [firstConv, setFirstConv] = useState<{ id: string; day: string } | null>(null);
  const spanish = settings.journey === 'mi-refugio' || settings.voice === 'spanish' || settings.language === 'es';
  // The Mindset door shows no faith words (hostile review F8): no KJV, verse or pastor.
  const mind = settings.door === 'mindset';

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(DISCLOSURE_KEY), AsyncStorage.getItem(FREE_CONSENT_KEY), AsyncStorage.getItem(OVERFLOW_KEY), AsyncStorage.getItem(FIRST_HAD_KEY)])
      .then(([d, f, o, h]) => { setAccepted(d === 'yes'); setFreeOk(f === 'yes'); setOverflowDay(o); setHadFirst(h === 'yes'); })
      .catch(() => { setAccepted(false); setFreeOk(false); });
  }, []);
  useEffect(() => {
    if (paid) { setFirstPrivate(false); return; }
    let live = true;
    setFirstPrivate(null);
    void askFirstPrivate(settings, conversation).then(p => { if (live) setFirstPrivate(p); });
    return () => { live = false; };
  }, [paid, conversation]);
  if (accepted === null || freeOk === null) return null;
  // Waiting for the Worker's word before the free-chat screen: a private first chat never shows it.
  if (!paid && !freeOk && firstPrivate === null) return null;

  const disclosure = <>
    <Text style={[s.title, { color: c.ink }]}>{t('chat.disclosure.title')}</Text>
    <Text style={[s.body, { color: c.ink }]}>{t(mind ? 'chat.disclosure.mindset' : 'chat.disclosure.faith')}</Text>
  </>;
  const remember = (key: string) => AsyncStorage.setItem(key, 'yes').catch(() => undefined);
  // What she just had, at the store's monthly price.
  const keepPrivate = monthly ? t('chat.limit.firstPrivate', { price: monthly }) : t('chat.limit.firstPrivateNoPrice');

  // Free chat: one screen, once, before the first free chat: what free chat does with her words, and
  // the private way. No free chat without it (the Worker refuses one too: kind 'consent').
  if (!paid && !freeOk && !firstPrivate) {
    return <View testID="free-consent" style={[s.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <Text style={[s.label, { color: c.muted }, noTracking(t('chat.free.label'))]}>{t('chat.free.label')}</Text>
      {disclosure}
      <Text style={[s.title, { color: c.ink }]}>{t('chat.free.title')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('chat.free.body')}</Text>
      <Text testID={hadFirst ? 'free-had-private' : undefined} style={[s.body, { color: c.ink }]}>{hadFirst ? keepPrivate : t('chat.free.private')}</Text>
      <HelpLine region={phoneRegion()} t={t} style={[s.body, { color: c.ink }]} link={c.accent} />
      <Pressable accessibilityRole="button" testID="free-continue" onPress={() => { setFreeOk(true); setAccepted(true); void remember(FREE_CONSENT_KEY); void remember(DISCLOSURE_KEY); }} style={[s.button, { backgroundColor: c.accent }]}>
        <Text style={[s.buttonText, { color: c.on }]}>{t('chat.free.continue')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" testID="free-private" onPress={() => router.push('/paid')} style={[s.button, { borderWidth: 1.5, borderColor: c.accent }]}>
        <Text style={[s.buttonText, { color: c.accent }]}>{t('chat.free.makePrivate')}</Text>
      </Pressable>
    </View>;
  }
  if (!accepted) {
    return <View style={[s.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <Text style={[s.label, { color: c.muted }, noTracking(t('chat.disclosure.label'))]}>{t('chat.disclosure.label')}</Text>
      {disclosure}
      <Text style={[s.body, { color: c.ink }]}>{t('chat.paid.private')}</Text>
      <HelpLine region={phoneRegion()} t={t} style={[s.body, { color: c.ink }]} link={c.accent} />
      <Pressable accessibilityRole="button" onPress={() => { setAccepted(true); void remember(DISCLOSURE_KEY); }} style={[s.button, { backgroundColor: c.accent }]}>
        <Text style={[s.buttonText, { color: c.on }]}>{t('chat.disclosure.ok')}</Text>
      </Pressable>
    </View>;
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || closed) return;
    const history: ChatTurn[] = [...entries.flatMap((e): ChatTurn[] => e.role === 'user' ? [{ role: 'user', text: e.text }] : e.role === 'reply' && e.res.ai ? [{ role: 'assistant', text: e.res.text }] : e.role === 'reply' && e.res.checkIn ? [{ role: 'assistant', text: e.res.checkIn.text }] : []), { role: 'user', text }];
    setInput('');
    if (firstConv && conversation === firstConv.id && (firstConv.day !== today() || firstPrivate === false)) {
      const fresh = randomUUID();
      setFirstConv(null);
      setConversation(fresh);
      setEntries([{ role: 'user', text }]);
      await deliver([{ role: 'user', text }], overflowDay === today(), fresh);
      return;
    }
    setEntries(list => [...list, { role: 'user', text }]);
    await deliver(history, overflowDay === today());
  }

  /** Sends her turns; with overflow, on the free lane she accepted today. */
  async function deliver(history: ChatTurn[], overflow: boolean, conv = conversation) {
    setSending(true);
    // The phone's region picks the crisis lines (988 in the US, Línea de la Vida in Mexico, 024 in Spain).
    const region = phoneRegion();
    try {
      const res = await sendChat(settings, conv, history, fetch, !paid && !!freeOk, region, overflow);
      if (res.kind === 'overflow_consent') setPending(history);
      // Her consent is gone on the server's side (another device, cleared storage): ask again.
      if (res.kind === 'consent') { setFreeOk(false); setFirstPrivate(false); void AsyncStorage.removeItem(FREE_CONSENT_KEY).catch(() => undefined); return; }
      if (res.firstPrivate && !hadFirst) { setHadFirst(true); void remember(FIRST_HAD_KEY); }
      if (res.firstPrivate && firstConv?.id !== conv) setFirstConv({ id: conv, day: today() });
      setEntries(list => [...list, { role: 'reply', res }]);
      if (res.remaining !== null && res.limit) setLeft({ remaining: res.remaining, limit: res.limit });
      if (CLOSES.has(res.kind)) setClosed(true);
    } catch (error) {
      const why = error instanceof ChatError ? error.message : '';
      if (why === 'network') setClosed(true); // no new install can start from this network today
      setEntries(list => [...list, { role: 'note', text: t(why === 'slow' ? 'chat.error.slow' : why === 'network' ? 'chat.error.network' : 'chat.error.offline'), region }]);
    } finally { setSending(false); }
  }

  // Her choice after her private messages: free chat (not private) for the rest of today, sending the
  // message she already wrote; or wait, and nothing is sent.
  const keepChatting = async () => {
    const turns = pending;
    setPending(null);
    setOverflowDay(today());
    void AsyncStorage.setItem(OVERFLOW_KEY, today()).catch(() => undefined);
    if (turns) await deliver(turns, true);
  };
  // Waiting sends nothing and leaves chat open: a crisis message still reaches the private crisis model.
  const waitForTomorrow = () => setPending(null);
  const lastReply = [...entries].reverse().find((e): e is Extract<Entry, { role: 'reply' }> => e.role === 'reply');
  const notPrivateNow = !!lastReply?.res.notPrivate;

  return <View>
    <View style={[s.head, { borderColor: c.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.headTitle, { color: c.ink }]}>{t('tabs.chat')}</Text>
        <Text style={[s.ai, { color: c.muted }, noTracking(t('chat.ai.mindset'))]}>{t(mind ? 'chat.ai.mindset' : spanish ? 'chat.ai.rv' : 'chat.ai.kjv')}</Text>
        {notPrivateNow && <Text testID="not-private" style={[s.ai, { color: c.accent }, noTracking(t('chat.free.notPrivate'))]}>{t('chat.free.notPrivate')}</Text>}
        {!paid && firstPrivate && <Text testID="first-private" style={[s.ai, { color: c.accent }, noTracking(t('chat.firstPrivate'))]}>{t('chat.firstPrivate')}</Text>}
      </View>
      <Pressable accessibilityRole="button" onPress={() => { setConversation(randomUUID()); setEntries([]); }}><Text style={[s.small, { color: c.accent }]}>{t('chat.new')}</Text></Pressable>
    </View>
    {entries.length === 0 && <Text style={[s.body, { color: c.muted, marginTop: 16 }]}>{t(mind ? 'chat.empty.mindset' : 'chat.empty.faith')}</Text>}
    {entries.map((e, i) => e.role === 'user'
      ? <Text key={i} style={[s.me, { backgroundColor: c.accent, color: c.on }]}>{e.text}</Text>
      : e.role === 'note'
        ? <View key={i} testID="chat-note">
          <Text accessibilityRole="alert" style={[s.note, { color: c.muted, marginTop: 12 }]}>{e.text}</Text>
          <NoteHelp region={e.region} c={c} t={t} />
        </View>
        : <View key={i} testID={`reply-${e.res.kind}`} style={[s.bot, { backgroundColor: c.card, borderColor: c.line }]}>
          {e.res.ai && <Text testID="ai-label" style={[s.ai, { color: c.muted }, noTracking(t('chat.ai.faith'))]}>{t(mind ? 'chat.ai.mindset' : 'chat.ai.faith')}</Text>}
          {e.res.notPrivate && <Text testID="answer-not-private" style={[s.ai, { color: c.accent }, noTracking(t('chat.free.notPrivate'))]}>{t('chat.free.notPrivate')}</Text>}
          {e.res.reminder && <Text style={[s.body, { color: c.ink }]}>{t('chat.reminder')}</Text>}
          {e.res.checkIn && <>
            {e.res.checkIn.ai && <Text testID="ai-label" style={[s.ai, { color: c.muted }, noTracking(t('chat.ai.faith'))]}>{t(mind ? 'chat.ai.mindset' : 'chat.ai.faith')}</Text>}
            <Text testID="check-in" style={[s.body, { color: c.ink, fontFamily: 'Figtree_600SemiBold' }]}>{e.res.checkIn.text}</Text>
          </>}
          <Text style={[s.body, { color: c.ink }]}>{e.res.text}</Text>
          {e.res.scripture.map(v => <View key={v.ref} style={s.verse}>
            {/* A translation with a credit line names itself once, in the credit under the verse. */}
            <Text style={[s.ref, noTracking(v.ref)]}>{TRANSLATION_CREDIT[v.translation] ? v.ref : `${v.ref} · ${TRANSLATION_NAME[v.translation]}`}</Text>
            <Text style={s.verseText}>{displayRuns(v.text).map((r, j) => <Text key={j} style={r.italic ? { fontStyle: 'italic' } : undefined}>{r.text}</Text>)}</Text>
            {TRANSLATION_CREDIT[v.translation] ? <Text style={[s.ref, noTracking(TRANSLATION_CREDIT[v.translation])]}>{TRANSLATION_CREDIT[v.translation]}</Text> : null}
          </View>)}
          {(e.res.kind === 'crisis' || e.res.helpLines) && crisisLinks(e.res, t.locale).map(l => <Pressable key={l.url} accessibilityRole="link" {...lineLinkProps(l.url)} style={[s.link, { borderColor: c.accent }]}>
            <Text style={[s.linkText, { color: c.accent }]}>{t(l.label, l.values)}</Text>
          </Pressable>)}
          {/* Her ruling 21 Nov 2026: the free day's last message (FREE_CHAT_MESSAGES) always gets its full
              answer; under it, what a plan adds at the store's own monthly price, and when the free ones come back. */}
          {!paid && i === entries.length - 1 && !e.res.helpLines && (e.res.kind === 'limit' || (e.res.kind === 'answer' && e.res.remaining === 0)) ? <View testID="limit-upgrade-card" style={{ gap: 6 }}>
            <Pressable accessibilityRole="button" testID="limit-upgrade" onPress={() => router.push('/paid')} style={[s.link, { borderColor: c.accent }]}>
              <Text style={[s.linkText, { color: c.accent }]}>{e.res.firstPrivate || firstPrivate ? keepPrivate : monthly ? t('chat.limit.upgrade', { price: monthly }) : t('chat.limit.upgradeNoPrice')}</Text>
            </Pressable>
            <Text style={[s.body, { color: c.muted }]}>{t('chat.limit.tomorrow', { count: FREE_CHAT_MESSAGES })}</Text>
          </View> : null}
          {e.res.kind === 'no_free_model' && !paid ? <Pressable accessibilityRole="button" onPress={() => router.push('/paid')} style={[s.link, { borderColor: c.accent }]}>
            <Text style={[s.linkText, { color: c.accent }]}>{t('chat.free.makePrivate')}</Text>
          </Pressable> : null}
          {e.res.kind === 'overflow_consent' && pending && i === entries.length - 1 ? <>
            <Pressable accessibilityRole="button" testID="overflow-continue" onPress={() => void keepChatting()} style={[s.button, { backgroundColor: c.accent }]}>
              <Text style={[s.buttonText, { color: c.on }]}>{t('chat.overflow.continue')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" testID="overflow-wait" onPress={waitForTomorrow} style={[s.button, { borderWidth: 1.5, borderColor: c.accent }]}>
              <Text style={[s.buttonText, { color: c.accent }]}>{t('chat.overflow.wait')}</Text>
            </Pressable>
          </> : null}
          {e.res.ai && <ReportAnswer answer={e.res.text} c={c} t={t} />}
        </View>)}
    {left && <Text style={[s.left, { color: c.muted }]}>{t('chat.left', { count: left.remaining, limit: left.limit })}</Text>}
    {/* Focus shows on the pill's border (the accent), never as the browser's rectangle inside it. */}
    <View testID="composer" style={[s.input, { borderColor: focused ? c.accent : c.line, backgroundColor: c.card }]}>
      <TextInput accessibilityLabel={t('chat.input')} placeholder={t('chat.input')} placeholderTextColor={c.muted} value={input} onChangeText={setInput} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} editable={!closed} multiline maxLength={2000} style={[s.field, { color: c.ink }, Platform.OS === 'web' && s.noOutline]} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('chat.send')} disabled={sending || closed} onPress={() => void send()} style={[s.send, { backgroundColor: c.accent, opacity: sending || closed ? 0.5 : 1 }]}>
        <Text style={{ color: c.on, fontSize: 18 }}>↑</Text>
      </Pressable>
    </View>
  </View>;
}

const night = { bg: '#0E1A22', ink: '#F4F0E6', dawn: '#E0A33E' };
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 },
  label: { fontFamily: 'SplineSansMono_500Medium', fontSize: 12, letterSpacing: 1.7 },
  title: { fontFamily: 'LibreCaslonText_400Regular', fontSize: 24, lineHeight: 32 },
  body: { fontFamily: 'Figtree_400Regular', fontSize: 16, lineHeight: 24 },
  button: { borderRadius: 40, padding: 17, alignItems: 'center', marginTop: 8 },
  buttonText: { fontFamily: 'Figtree_400Regular', fontSize: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottomWidth: 1 },
  headTitle: { fontFamily: 'Figtree_600SemiBold', fontSize: 17 },
  ai: { fontFamily: 'SplineSansMono_500Medium', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  me: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 4, maxWidth: '78%', fontFamily: 'Figtree_400Regular', fontSize: 16, lineHeight: 22, marginTop: 12, overflow: 'hidden' },
  bot: { alignSelf: 'flex-start', borderWidth: 1, padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, maxWidth: '92%', gap: 10, marginTop: 12 },
  verse: { backgroundColor: night.bg, borderRadius: 12, padding: 14, gap: 6 },
  ref: { fontFamily: 'SplineSansMono_500Medium', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: night.dawn },
  verseText: { fontFamily: 'LibreCaslonText_400Regular', fontSize: 16, lineHeight: 23, color: night.ink },
  // Wrapped labels ("Llamar a la Línea de la Vida 800 911 2000" at 390 px) stay centred inside the pill's curve.
  link: { borderWidth: 1.5, borderRadius: 40, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  linkText: { fontFamily: 'Figtree_600SemiBold', fontSize: 17, textAlign: 'center' },
  note: { fontFamily: 'Figtree_400Regular', fontSize: 14, lineHeight: 20, marginTop: 4 },
  small: { fontFamily: 'Figtree_400Regular', fontSize: 14, lineHeight: 20 },
  reasons: { gap: 6 },
  reason: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  left: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 28, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, marginTop: 16 },
  field: { flex: 1, fontFamily: 'Figtree_400Regular', fontSize: 16, minHeight: 40 },
  // React Native's types list only solid/dotted/dashed, but the web draws its focus ring as `outline-style: auto`,
  // which ignores width and colour: only 'none' removes it (react-native-web passes it through).
  noOutline: { outlineStyle: 'none' as 'solid' },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
