// The Chat tab (mock-up screen 3). Free chat asks once for her yes to its data use (a free AI
// service may keep what she types; paid chat is private) and paid chat shows the AI disclosure once; every AI answer carries the AI label; the crisis reply is not labelled AI and
// its phone numbers are tappable; "N of 10 messages left today" comes from the Worker's count.
// Every AI answer has "Report this answer" (Apple Guideline 1.2): the answer and a reason are sent.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { displayRuns } from '../bible/core';
import type { Key } from '../i18n';
import { usePurchases } from '../purchases/provider';
import { useSettings, useT } from '../settings';
import { usePalette } from '../ui';
import { ChatError, DISCLOSURE_KEY, reportAnswer, sendChat, type ReportReason } from './api';
import type { ChatResponse, ChatTurn } from './contract';

type Palette = ReturnType<typeof usePalette>;
type T = (key: Key, values?: Record<string, string | number>) => string;
type Entry = { role: 'user'; text: string } | { role: 'reply'; res: ChatResponse } | { role: 'note'; text: string };
/** Her one-time yes that free chat goes to a free AI service that may keep what she types (two lanes, 21 Nov 2026). */
export const FREE_CONSENT_KEY = 'peace-be-still-free-chat-consent';

/** Tappable lines for a crisis reply: 988 always; the hotline the reply names (Poison Control and 911 first for medical danger). */
export function crisisLinks(res: ChatResponse): Array<{ label: Key; url: string }> {
  // The hotline the reply leads with comes first, as in the text.
  const links: Array<{ label: Key; url: string }> = [];
  if (res.text.includes('1-800-222-1222')) links.push({ label: 'chat.call.poison', url: 'tel:18002221222' }, { label: 'chat.call.911', url: 'tel:911' });
  if (res.text.includes('1-800-422-4453')) links.push({ label: 'chat.call.childhelp', url: 'tel:18004224453' }, { label: 'chat.text.childhelp', url: 'sms:18004224453' });
  if (res.text.includes('1-800-799-7233')) links.push({ label: 'chat.call.dv', url: 'tel:18007997233' }, { label: 'chat.text.dv', url: 'sms:88788?body=START' });
  links.push({ label: 'chat.call.988', url: 'tel:988' }, { label: 'chat.text.988', url: 'sms:988' });
  return links;
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

// Replies that end today's chat on this screen: the day's limit, free chat resting, a paused account,
// the fair-use pause. 'busy' (a model failed for a moment) keeps chat open.
const CLOSES = new Set<ChatResponse['kind']>(['limit', 'no_free_model', 'paused', 'fair_use']);

export default function ChatScreen() {
  const { settings } = useSettings();
  const { paid } = usePurchases();
  const t = useT('journey') as T;
  const c = usePalette();
  const router = useRouter();
  // accepted: she read that answers are AI (every lane). freeOk: her yes to the free lane's data use.
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [freeOk, setFreeOk] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState<{ remaining: number; limit: number } | null>(null);
  const [closed, setClosed] = useState(false);
  const [conversation, setConversation] = useState(() => randomUUID());
  const spanish = settings.journey === 'mi-refugio' || settings.voice === 'spanish' || settings.language === 'es';
  // The Mindset door shows no faith words (hostile review F8): no KJV, verse or pastor.
  const mind = settings.door === 'mindset';

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(DISCLOSURE_KEY), AsyncStorage.getItem(FREE_CONSENT_KEY)])
      .then(([d, f]) => { setAccepted(d === 'yes'); setFreeOk(f === 'yes'); })
      .catch(() => { setAccepted(false); setFreeOk(false); });
  }, []);
  if (accepted === null || freeOk === null) return null;

  const disclosure = <>
    <Text style={[s.title, { color: c.ink }]}>{t('chat.disclosure.title')}</Text>
    <Text style={[s.body, { color: c.ink }]}>{t(mind ? 'chat.disclosure.mindset' : 'chat.disclosure.faith')}</Text>
  </>;
  const remember = (key: string) => AsyncStorage.setItem(key, 'yes').catch(() => undefined);

  // Free chat: one screen, once, before the first free chat: what free chat does with her words, and
  // the private way. No free chat without it (the Worker refuses one too: kind 'consent').
  if (!paid && !freeOk) {
    return <View testID="free-consent" style={[s.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <Text style={[s.label, { color: c.muted }]}>{t('chat.free.label')}</Text>
      {disclosure}
      <Text style={[s.title, { color: c.ink }]}>{t('chat.free.title')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('chat.free.body')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('chat.free.private')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('chat.disclosure.danger')}</Text>
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
      <Text style={[s.label, { color: c.muted }]}>{t('chat.disclosure.label')}</Text>
      {disclosure}
      <Text style={[s.body, { color: c.ink }]}>{t('chat.paid.private')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('chat.disclosure.danger')}</Text>
      <Pressable accessibilityRole="button" onPress={() => { setAccepted(true); void remember(DISCLOSURE_KEY); }} style={[s.button, { backgroundColor: c.accent }]}>
        <Text style={[s.buttonText, { color: c.on }]}>{t('chat.disclosure.ok')}</Text>
      </Pressable>
    </View>;
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || closed) return;
    const history: ChatTurn[] = [...entries.flatMap((e): ChatTurn[] => e.role === 'user' ? [{ role: 'user', text: e.text }] : e.role === 'reply' && e.res.ai ? [{ role: 'assistant', text: e.res.text }] : []), { role: 'user', text }];
    setEntries(list => [...list, { role: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const res = await sendChat(settings, conversation, history, fetch, !paid && !!freeOk);
      // Her consent is gone on the server's side (another device, cleared storage): ask again.
      if (res.kind === 'consent') { setFreeOk(false); void AsyncStorage.removeItem(FREE_CONSENT_KEY).catch(() => undefined); return; }
      setEntries(list => [...list, { role: 'reply', res }]);
      if (res.remaining !== null && res.limit) setLeft({ remaining: res.remaining, limit: res.limit });
      if (CLOSES.has(res.kind)) setClosed(true);
    } catch (error) {
      const why = error instanceof ChatError ? error.message : '';
      if (why === 'network') setClosed(true); // no new install can start from this network today
      setEntries(list => [...list, { role: 'note', text: t(why === 'slow' ? 'chat.error.slow' : why === 'network' ? 'chat.error.network' : 'chat.error.offline') }]);
    } finally { setSending(false); }
  }

  return <View>
    <View style={[s.head, { borderColor: c.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.headTitle, { color: c.ink }]}>{t('tabs.chat')}</Text>
        <Text style={[s.ai, { color: c.muted }]}>{t(mind ? 'chat.ai.mindset' : spanish ? 'chat.ai.rv' : 'chat.ai.kjv')}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { setConversation(randomUUID()); setEntries([]); }}><Text style={[s.small, { color: c.accent }]}>{t('chat.new')}</Text></Pressable>
    </View>
    {entries.length === 0 && <Text style={[s.body, { color: c.muted, marginTop: 16 }]}>{t(mind ? 'chat.empty.mindset' : 'chat.empty.faith')}</Text>}
    {entries.map((e, i) => e.role === 'user'
      ? <Text key={i} style={[s.me, { backgroundColor: c.accent, color: c.on }]}>{e.text}</Text>
      : e.role === 'note'
        ? <Text key={i} accessibilityRole="alert" style={[s.note, { color: c.muted }]}>{e.text}</Text>
        : <View key={i} testID={`reply-${e.res.kind}`} style={[s.bot, { backgroundColor: c.card, borderColor: c.line }]}>
          {e.res.ai && <Text testID="ai-label" style={[s.ai, { color: c.muted }]}>{t(mind ? 'chat.ai.mindset' : 'chat.ai.faith')}</Text>}
          {e.res.reminder && <Text style={[s.body, { color: c.ink }]}>{t('chat.reminder')}</Text>}
          <Text style={[s.body, { color: c.ink }]}>{e.res.text}</Text>
          {e.res.scripture.map(v => <View key={v.ref} style={s.verse}>
            <Text style={s.ref}>{`${v.ref} · ${v.translation === 'RV1909' ? 'RV1909' : 'KJV'}`}</Text>
            <Text style={s.verseText}>{displayRuns(v.text).map((r, j) => <Text key={j} style={r.italic ? { fontStyle: 'italic' } : undefined}>{r.text}</Text>)}</Text>
          </View>)}
          {e.res.kind === 'crisis' && crisisLinks(e.res).map(l => <Pressable key={l.url} accessibilityRole="link" onPress={() => void Linking.openURL(l.url)} style={[s.link, { borderColor: c.accent }]}>
            <Text style={[s.linkText, { color: c.accent }]}>{t(l.label)}</Text>
          </Pressable>)}
          {e.res.kind === 'fair_use' || (e.res.kind === 'no_free_model' && !paid) ? <Pressable accessibilityRole="button" onPress={() => router.push('/paid')} style={[s.link, { borderColor: c.accent }]}>
            <Text style={[s.linkText, { color: c.accent }]}>{t('chat.free.makePrivate')}</Text>
          </Pressable> : null}
          {e.res.ai && <ReportAnswer answer={e.res.text} c={c} t={t} />}
        </View>)}
    {left && <Text style={[s.left, { color: c.muted }]}>{t('chat.left', { count: left.remaining, limit: left.limit })}</Text>}
    <View style={[s.input, { borderColor: c.line, backgroundColor: c.card }]}>
      <TextInput accessibilityLabel={t('chat.input')} placeholder={t('chat.input')} placeholderTextColor={c.muted} value={input} onChangeText={setInput} editable={!closed} multiline maxLength={2000} style={[s.field, { color: c.ink }]} />
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
  link: { borderWidth: 1.5, borderRadius: 40, paddingVertical: 12, alignItems: 'center' },
  linkText: { fontFamily: 'Figtree_600SemiBold', fontSize: 17 },
  note: { textAlign: 'center', fontSize: 14, marginTop: 12 },
  small: { fontFamily: 'Figtree_400Regular', fontSize: 14, lineHeight: 20 },
  reasons: { gap: 6 },
  reason: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  left: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 28, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, marginTop: 16 },
  field: { flex: 1, fontFamily: 'Figtree_400Regular', fontSize: 16, minHeight: 40 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
