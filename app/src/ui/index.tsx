// The few building blocks every screen uses, so type, colour and spacing are decided once.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, dawn, fonts, MARK, night, type Palette } from '../theme/tokens';
import type { Door } from '../model';
import { clock, inSmallHours } from '../clock';

export function usePalette(): Palette & { dark: boolean } {
  // In the small hours the whole app is night, whatever the phone's setting: no bright screen at 3 AM.
  const dark = useColorScheme() === 'dark' || inSmallHours(clock.now());
  return { ...(dark ? colors.dark : colors.light), dark };
}

/** A door's own accent on night surfaces: dawn for God's Word, still water for Mindset (never dawn). */
export function doorLine(door: Door | null | undefined): string {
  return door === 'mindset' ? night.glow : dawn;
}

export function Screen({ children, footer, edges = ['top', 'bottom'], scrollRef }: { children: React.ReactNode; footer?: React.ReactNode; edges?: Edge[]; scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>> }) {
  const c = usePalette();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer ? <View style={[styles.footer, { borderColor: c.line, backgroundColor: c.bg }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Every small label: Spline Sans Mono 12, uppercase, letter-spaced. */
export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = usePalette();
  return <Text style={[styles.label, { color: c.muted }, style]}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return <Text accessibilityRole="header" style={[styles.title, { color: c.ink }]}>{children}</Text>;
}

export function Body({ children, muted = true, size = 16, style }: { children: React.ReactNode; muted?: boolean; size?: number; style?: StyleProp<TextStyle> }) {
  const c = usePalette();
  return <Text style={[{ fontFamily: fonts.body, fontSize: size, lineHeight: Math.round(size * 1.45), color: muted ? c.muted : c.ink }, style]}>{children}</Text>;
}

export function Card({ children, onPress, label, selected, expanded, role, style }: { children: React.ReactNode; onPress?: () => void; label?: string; selected?: boolean; expanded?: boolean; role?: 'button' | 'radio' | 'link'; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  const look = [styles.card, { backgroundColor: c.card, borderColor: selected ? c.accent : c.line, borderWidth: selected ? 2 : 1 }, style];
  if (!onPress) return <View style={look}>{children}</View>;
  return (
    // role + aria-checked are the props both React Native and react-native-web pass to the screen reader
    // (react-native-web drops accessibilityState, so a selected radio was never announced).
    <Pressable role={role ?? 'button'} aria-label={label} aria-checked={role === 'radio' ? !!selected : undefined} aria-expanded={expanded} onPress={onPress} style={({ pressed }) => [look, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

/**
 * An on/off row: the whole row is the one switch (role, state and label on it, 44 pt tall at least), and the
 * drawn track inside it is decoration. The off track is muted ink, so it stands out from the card (3:1 and up).
 */
export function SwitchRow({ title, detail, value, onChange }: { title: string; detail?: string; value: boolean; onChange: (value: boolean) => void }) {
  const c = usePalette();
  return (
    <Pressable role="switch" aria-checked={value} aria-label={title} accessibilityHint={detail} onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.card, styles.row, { gap: 12, minHeight: 44, backgroundColor: c.card, borderColor: c.line, borderWidth: 1 }, pressed && { opacity: 0.85 }]}>
      <View style={styles.grow}>
        <Text style={{ fontFamily: fonts.strong, fontSize: 16, color: c.ink }}>{title}</Text>
        {detail ? <Body size={14}>{detail}</Body> : null}
      </View>
      <View testID="switch-track" aria-hidden importantForAccessibility="no-hide-descendants"
        style={{ width: 51, height: 31, borderRadius: 16, padding: 2, justifyContent: 'center', alignItems: value ? 'flex-end' : 'flex-start', backgroundColor: value ? c.accent : c.muted }}>
        <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: value ? c.on : c.card }} />
      </View>
    </Pressable>
  );
}

/** The one still-water pill per screen, verb first. */
export function PillButton({ children, onPress, disabled = false }: { children: string; onPress: () => void; disabled?: boolean }) {
  const c = usePalette();
  return (
    // Its name is the words alone: the › is drawn, never read ("Write my moment", not "Write my moment, right angle quote").
    <Pressable accessibilityRole="button" accessibilityLabel={children} disabled={disabled} accessibilityState={{ disabled }} aria-disabled={disabled || undefined} onPress={disabled ? undefined : onPress} style={({ pressed }) => [styles.pill, { backgroundColor: c.accent }, disabled && { opacity: 0.45 }, pressed && !disabled && { opacity: 0.85 }]}>
      <Text style={[styles.pillText, { color: c.on }]}>{disabled ? children : `${children}  ›`}</Text>
    </Pressable>
  );
}

export function TextLink({ children, onPress, style, disabled = false }: { children: string; onPress: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="link" disabled={disabled} accessibilityState={{ disabled }} aria-disabled={disabled || undefined} onPress={disabled ? undefined : onPress} hitSlop={10} style={[{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontFamily: fonts.strong, fontSize: 15, color: disabled ? c.muted : c.accent }}>{children}</Text>
    </Pressable>
  );
}

export function BackLink({ children, onPress }: { children: string; onPress: () => void }) {
  return <TextLink onPress={onPress} style={{ marginBottom: 8 }}>{`←  ${children}`}</TextLink>;
}

export function Chevron() {
  const c = usePalette();
  return <Text importantForAccessibility="no" style={{ fontFamily: fonts.strong, fontSize: 22, color: c.accent }}>›</Text>;
}

/** One row that opens another screen (More and Settings): its name, an optional current value, and a chevron.
 * `onPress` is required, so a row that opens nothing cannot be drawn. */
export function LinkRow({ label, value, onPress }: { label: string; value?: string | null; onPress: () => void }) {
  const c = usePalette();
  return (
    <Card onPress={onPress} label={label} style={{ paddingVertical: 14 }}>
      <View style={styles.row}>
        <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 17, color: c.ink }}>{label}</Text>
        {value ? <Body size={15}>{value}</Body> : null}
        <Chevron />
      </View>
    </Card>
  );
}

// The mark (paths in tokens.ts, equal to assets/brand/pbs-mark-*.svg). The light tile has a night wave and a
// still-water line; the dark tile a linen wave and the door's line (dawn for God's Word and the front door,
// still water for Mindset).

export function Mark({ size = 32, door, tile }: { size?: number; door?: Door | null; tile?: 'light' | 'dark' }) {
  const c = usePalette();
  const dark = tile ? tile === 'dark' : c.dark;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="15" fill={dark ? night.bg : colors.light.bg} stroke={dark ? night.line : colors.light.line} strokeWidth={dark ? 2 : 1} />
      <Path d={MARK.wave} fill="none" stroke={dark ? night.ink : night.bg} strokeOpacity={dark ? 0.62 : 0.55} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={MARK.line} fill="none" stroke={dark ? doorLine(door) : colors.light.accent} strokeWidth={4.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Logo({ door, label }: { door?: Door | null; label: string }) {
  const c = usePalette();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.logo}>
      <Mark size={32} door={door} />
      <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: c.ink }}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, maxWidth: 520, width: '100%', alignSelf: 'center', gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  label: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36 },
  card: { borderRadius: 18, padding: 16, gap: 8 },
  pill: { minHeight: 52, borderRadius: 999, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.strong, fontSize: 16 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grow: { flex: 1, minWidth: 0, gap: 3 },
  t2: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27 },
  t3: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 23 },
});
