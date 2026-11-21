import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Language } from '../model';
import { fonts, night } from '../theme/tokens';
import type { ReportReason } from './api';
import { madeForYouCopy, type CopyKey } from './copy';

/**
 * Under every made-for-you session in the player: "Report this session" (Apple 1.2; the chat's four
 * reasons, one report path) and "Delete this session". Both take the session off her list.
 */
export function SessionActions({ lang, faith, report, remove, gone }: {
  lang: Language;
  faith: boolean;
  report: (reason: ReportReason) => Promise<unknown>;
  remove: () => Promise<unknown>;
  gone: () => void;
}) {
  const copy = madeForYouCopy(lang);
  const [step, setStep] = useState<'idle' | 'reasons' | 'reporting' | 'reported' | 'reportFailed' | 'confirm' | 'deleting' | 'deleteFailed'>('idle');
  const reasons: Array<[ReportReason, CopyKey]> = [
    ['hurtful', 'reasonHurtful'], ['wrong', faith ? 'reasonWrongFaith' : 'reasonWrongMindset'], ['unsafe', 'reasonUnsafe'], ['other', 'reasonOther'],
  ];
  const button = (label: string, onPress: () => void, disabled = false) =>
    <Pressable key={label} accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>;

  async function send(reason: ReportReason) {
    setStep('reporting');
    try { await report(reason); setStep('reported'); } catch { setStep('reportFailed'); }
  }
  async function erase() {
    setStep('deleting');
    try { await remove(); gone(); } catch { setStep('deleteFailed'); }
  }

  if (step === 'reported') return <Text accessibilityRole="alert" style={styles.note}>{copy('reported')}</Text>;
  if (step === 'reasons' || step === 'reporting' || step === 'reportFailed') return <View style={styles.box}>
    <Text style={styles.note} accessibilityRole={step === 'reportFailed' ? 'alert' : undefined}>{copy(step === 'reportFailed' ? 'reportFailed' : 'reportAsk')}</Text>
    {reasons.map(([reason, label]) => button(copy(label), () => void send(reason), step === 'reporting'))}
  </View>;
  if (step === 'confirm' || step === 'deleting' || step === 'deleteFailed') return <View style={styles.box}>
    <Text style={styles.note} accessibilityRole={step === 'deleteFailed' ? 'alert' : undefined}>{copy(step === 'deleteFailed' ? 'deleteFailed' : 'deleteAsk')}</Text>
    {button(copy('deleteYes'), () => void erase(), step === 'deleting')}
    {button(copy('deleteNo'), () => setStep('idle'), step === 'deleting')}
  </View>;
  return <View style={styles.box}>
    {button(copy('report'), () => setStep('reasons'))}
    {button(copy('delete'), () => setStep('confirm'))}
  </View>;
}

const styles = StyleSheet.create({
  box: { gap: 4, marginTop: 8 },
  button: { minHeight: 44, justifyContent: 'center' },
  link: { color: night.muted, fontFamily: fonts.body, fontSize: 15, textDecorationLine: 'underline' },
  note: { color: night.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});
