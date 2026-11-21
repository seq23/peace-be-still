// The top of Today: the date, how many days she opened the app this week, and the week's dots with those
// days filled. The count comes from the saved days (the tabs layout records each day she opens the app).
import React from 'react';
import { Text, View } from 'react-native';
import { dayKey, openedThisWeek, weekOf } from '../model';
import { useSettings, useT } from '../settings';
import { fonts } from '../theme/tokens';
import { Body, Label, usePalette } from './index';

export function WeekStrip() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const now = new Date();
  const opened = openedThisWeek(settings, now);
  const count = t('today.week', { count: opened.size });
  const date = new Intl.DateTimeFormat(t.locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
        <Label>{date}</Label>
        <Body size={14}>{count}</Body>
      </View>
      <View accessible role="img" aria-label={count} style={{ flexDirection: 'row', gap: 8 }}>
        {weekOf(now).map(day => {
          const key = dayKey(day);
          const isToday = key === dayKey(now);
          const filled = opened.has(key);
          return (
            <View key={key} style={{ width: 30, alignItems: 'center', gap: 3 }}>
              <View testID={filled ? 'day-opened' : 'day'} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: isToday ? 2 : 1.5, borderColor: filled ? c.accent : c.line, borderStyle: filled ? 'solid' : 'dashed', backgroundColor: filled ? c.accent : 'transparent' }} />
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: c.muted }}>{new Intl.DateTimeFormat(t.locale, { weekday: 'narrow' }).format(day)}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}
