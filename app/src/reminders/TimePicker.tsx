// The reminder time, chosen with the phone's own time picker. The time is handed back ONCE, when the picker closes
// (iOS: Done on the sheet; Android: OK on its dialog; web preview: leaving the time field), so the reminder is
// rescheduled once, never on every turn of the wheel.
import React, { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useT } from '../settings';
import { Label, styles, usePalette } from '../ui';
import { fonts } from '../theme/tokens';

export type Time = { hour: number; minute: number };
const asDate = ({ hour, minute }: Time) => new Date(2026, 0, 1, hour, minute);
const fromDate = (date: Date): Time => ({ hour: date.getHours(), minute: date.getMinutes() });

export function TimePicker({ value, label, shown, onClose }: { value: Time; label: string; shown: string; onClose: (time: Time | null) => void }) {
  const t = useT();
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Time>(value);
  const close = (time: Time | null) => { setOpen(false); onClose(time); };
  const row = (
    <Pressable role="button" aria-label={`${label}, ${shown}`} onPress={() => { setDraft(value); setOpen(true); }}
      style={({ pressed }) => [styles.row, { minHeight: 44 }, pressed && { opacity: 0.85 }]}>
      <View style={styles.grow}>
        <Label>{label}</Label>
        <Text style={{ fontFamily: fonts.mono, fontSize: 17, color: c.ink }}>{shown}</Text>
      </View>
      <Text style={{ fontFamily: fonts.strong, fontSize: 15, color: c.accent }}>{`${t('reminder.settings.change')}  ›`}</Text>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    // The web preview: the browser's own time field. Typing or spinning only edits; leaving the field commits.
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      <View style={{ gap: 6 }}>
        <Label>{label}</Label>
        {React.createElement('input', {
          type: 'time', 'aria-label': label, step: 60, value: `${pad(draft.hour)}:${pad(draft.minute)}`,
          onChange: (e: { target: { value: string } }) => {
            const [h, m] = e.target.value.split(':').map(Number);
            if (Number.isInteger(h) && Number.isInteger(m)) setDraft({ hour: h, minute: m });
          },
          onBlur: () => onClose(draft.hour === value.hour && draft.minute === value.minute ? null : draft),
          style: { fontFamily: fonts.mono, fontSize: 17, color: c.ink, background: c.card, border: `1px solid ${c.line}`, borderRadius: 12, padding: 10, minHeight: 44 },
        })}
      </View>
    );
  }

  const Picker = require('@react-native-community/datetimepicker').default as typeof import('@react-native-community/datetimepicker').default;
  if (Platform.OS === 'android') {
    // Android's own dialog: OK hands the time back once; Cancel hands back nothing.
    return <>
      {row}
      {open && <Picker mode="time" value={asDate(value)} onChange={(event, date) => close(event.type === 'set' && date ? fromDate(date) : null)} />}
    </>;
  }
  // iOS: the wheel in a bottom sheet; turning it only moves the draft, Done hands it back.
  return <>
    {row}
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => close(null)}>
      <Pressable aria-label={t('reminder.settings.cancel')} onPress={() => close(null)} style={{ flex: 1 }} />
      <View style={{ backgroundColor: c.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Pressable role="button" onPress={() => close(null)} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 16, color: c.muted }}>{t('reminder.settings.cancel')}</Text>
          </Pressable>
          <Pressable role="button" onPress={() => close(draft)} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.strong, fontSize: 16, color: c.accent }}>{t('reminder.settings.done')}</Text>
          </Pressable>
        </View>
        <Picker mode="time" display="spinner" value={asDate(draft)} onChange={(_event, date) => { if (date) setDraft(fromDate(date)); }} />
      </View>
    </Modal>
  </>;
}
