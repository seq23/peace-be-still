// The Chat tab (mock-up screen 3). The disclosure comes before the first chat and is remembered
// on the device; every AI answer carries the AI label; the crisis reply is not labelled AI and
// its phone numbers are tappable; "N of 10 messages left today" comes from the Worker's count.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { displayRuns } from '../bible/core';
import { t as translate } from '../i18n';
import type { Settings } from '../model';
import { colors } from '../theme/tokens';
import { ChatError, DISCLOSURE_KEY, sendChat } from './api';
import type { ChatResponse, ChatTurn } from './contract';

type Palette = (typeof colors)['light'] | (typeof colors)['dark'];
type Entry = { role: 'user'; text: string } | { role: 'reply'; res: ChatResponse } | { role: 'note'; text: string };

/** Tappable lines for a crisis reply: 988 always; the hotline the reply names. */
export function crisisLinks(res: ChatResponse): Array<{ label: string; url: string }> {
  const links = [{ label: 'Call 988', url: 'tel:988' }, { label: 'Text 988', url: 'sms:988' }];
  if (res.text.includes('1-800-799-7233')) links.push({ label: 'Call 1-800-799-7233', url: 'tel:18007997233' });
  if (res.text.includes('1-800-422-4453')) links.push({ label: 'Call 1-800-422-4453', url: 'tel:18004224453' });
  return links;
}

export default function ChatScreen({ settings, c, locale }: { settings: Settings; c: Palette; locale: 'en' | 'es' }) {
  const t = (key: string, values: Record<string, string | number> = {}) => translate(key, { ...values, locale });
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState<{ remaining: number; limit: number } | null>(null);
  const [closed, setClosed] = useState(false);
  const [conversation, setConversation] = useState(() => randomUUID());
  const spanish = settings.journey === 'Mi Refugio' || settings.voice === 'spanish' || settings.language === 'es';

  useEffect(() => { AsyncStorage.getItem(DISCLOSURE_KEY).then(v => setAccepted(v === 'yes')).catch(() => setAccepted(false)); }, []);
  if (accepted === null) return null;

  if (!accepted) {
    return <View style={[s.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <Text style={[s.label, { color: c.muted }]}>{t('BEFORE YOUR FIRST CHAT')}</Text>
      <Text style={[s.title, { color: c.ink }]}>{t('Chat answers are written by AI.')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('Every answer is marked AI. It is not a pastor, a counselor or a person.')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('What you type goes to free AI providers, and they may learn from it. Please leave out names and anything that identifies you or someone else.')}</Text>
      <Text style={[s.body, { color: c.ink }]}>{t('If you are in danger or thinking about hurting yourself, call or text 988.')}</Text>
      <Pressable accessibilityRole="button" onPress={() => { setAccepted(true); void AsyncStorage.setItem(DISCLOSURE_KEY, 'yes').catch(() => undefined); }} style={[s.button, { backgroundColor: c.accent }]}>
        <Text style={[s.buttonText, { color: c.on }]}>{t('I understand')}</Text>
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
      const res = await sendChat(settings, conversation, history);
      setEntries(list => [...list, { role: 'reply', res }]);
      if (res.remaining !== null && res.limit) setLeft({ remaining: res.remaining, limit: res.limit });
      if (res.kind === 'limit' || res.kind === 'no_free_model') setClosed(true);
    } catch (error) {
      setEntries(list => [...list, { role: 'note', text: t(error instanceof ChatError && error.message === 'slow' ? 'One moment, then send that again.' : "Chat couldn't reach us just now. Check your connection and try again.") }]);
    } finally { setSending(false); }
  }

  return <View>
    <View style={[s.head, { borderColor: c.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.headTitle, { color: c.ink }]}>{t(settings.journey ?? 'Chat')}</Text>
        <Text style={[s.ai, { color: c.muted }]}>{t(spanish ? 'AI · verses from Reina-Valera 1909' : 'AI · verses from KJV')}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { setConversation(randomUUID()); setEntries([]); }}><Text style={{ color: c.accent }}>{t('+ New chat')}</Text></Pressable>
    </View>
    {entries.length === 0 && <Text style={[s.body, { color: c.muted, marginTop: 16 }]}>{t('Say what is on your heart. You will get a short answer and a verse to hold on to.')}</Text>}
    {entries.map((e, i) => e.role === 'user'
      ? <Text key={i} style={[s.me, { backgroundColor: c.accent, color: c.on }]}>{e.text}</Text>
      : e.role === 'note'
        ? <Text key={i} accessibilityRole="alert" style={[s.note, { color: c.muted }]}>{e.text}</Text>
        : <View key={i} testID={`reply-${e.res.kind}`} style={[s.bot, { backgroundColor: c.card, borderColor: c.line }]}>
          {e.res.ai && <Text testID="ai-label" style={[s.ai, { color: c.muted }]}>{t('AI · not a pastor or a person')}</Text>}
          {e.res.reminder && <Text style={[s.body, { color: c.ink }]}>{t("A reminder: you're talking with an AI, not a person. It's a good time to take a break.")}</Text>}
          <Text style={[s.body, { color: c.ink }]}>{e.res.text}</Text>
          {e.res.scripture.map(v => <View key={v.ref} style={s.verse}>
            <Text style={s.ref}>{`${v.ref} · ${v.translation === 'RV1909' ? 'RV1909' : 'KJV'}`}</Text>
            <Text style={s.verseText}>{displayRuns(v.text).map((r, j) => <Text key={j} style={r.italic ? { fontStyle: 'italic' } : undefined}>{r.text}</Text>)}</Text>
          </View>)}
          {e.res.kind === 'crisis' && crisisLinks(e.res).map(l => <Pressable key={l.url} accessibilityRole="link" onPress={() => void Linking.openURL(l.url)} style={[s.link, { borderColor: c.accent }]}>
            <Text style={{ color: c.accent, fontSize: 17 }}>{t(l.label)}</Text>
          </Pressable>)}
        </View>)}
    {left && <Text style={[s.left, { color: c.muted }]}>{t('%{count} of %{limit} messages left today', { count: left.remaining, limit: left.limit })}</Text>}
    <View style={[s.input, { borderColor: c.line, backgroundColor: c.card }]}>
      <TextInput accessibilityLabel={t("Type what's on your heart")} placeholder={t("Type what's on your heart")} placeholderTextColor={c.muted} value={input} onChangeText={setInput} editable={!closed} multiline maxLength={2000} style={[s.field, { color: c.ink }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('Send')} disabled={sending || closed} onPress={() => void send()} style={[s.send, { backgroundColor: c.accent, opacity: sending || closed ? 0.5 : 1 }]}>
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
  me: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 4, maxWidth: '78%', fontSize: 16, marginTop: 12, overflow: 'hidden' },
  bot: { alignSelf: 'flex-start', borderWidth: 1, padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, maxWidth: '92%', gap: 10, marginTop: 12 },
  verse: { backgroundColor: night.bg, borderRadius: 12, padding: 14, gap: 6 },
  ref: { fontFamily: 'SplineSansMono_500Medium', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: night.dawn },
  verseText: { fontFamily: 'LibreCaslonText_400Regular', fontSize: 16, lineHeight: 23, color: night.ink },
  link: { borderWidth: 1.5, borderRadius: 40, paddingVertical: 12, alignItems: 'center' },
  note: { textAlign: 'center', fontSize: 14, marginTop: 12 },
  left: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 28, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, marginTop: 16 },
  field: { flex: 1, fontFamily: 'Figtree_400Regular', fontSize: 16, minHeight: 40 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
