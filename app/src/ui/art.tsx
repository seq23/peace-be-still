// Line art from the approved mock-ups: the journey tiles (night, with the door's accent line) and the tab
// icons. No moons, stars or sparkles (the brand's do-not list).
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { night } from '../theme/tokens';
import type { Door, JourneyId, Tab } from '../model';
import { doorLine } from './index';

type Stroke = { d: string; accent?: boolean; width?: number };

const ART: Record<JourneyId, Stroke[]> = {
  'bible-chat': [{ d: 'M5 9c5-2 10-2 14 1 4-3 9-3 14-1v14c-5-2-10-2-14 1-4-3-9-3-14-1z', accent: true, width: 2 }, { d: 'M19 10v14' }],
  'hush-harbor': [{ d: 'M4 22c4-8 10-12 15-12s11 4 15 12', accent: true, width: 2 }, { d: 'M4 26h30' }],
  'mi-refugio': [{ d: 'M10 24V11h4V7h4v4h2V7h4v4h4v13', accent: true, width: 2 }, { d: 'M4 26h30' }],
  'psalm-nights': [{ d: 'M3 12c5-6 9 6 16 0s11 6 16 0' }, { d: 'M3 22h32', accent: true, width: 2 }],
  'morning-word': [{ d: 'M6 24V12M19 24V6M32 24V14', accent: true, width: 2 }, { d: 'M3 26h32' }],
  'young-faith': [{ d: 'M8 22l11-14 11 14', accent: true, width: 2 }, { d: 'M3 26h32' }],
  'imagination-nights': [{ d: 'M3 12c5-6 9 6 16 0s11 6 16 0' }, { d: 'M3 22h32', accent: true, width: 2 }],
  'living-in-the-end': [{ d: 'M11 5h16a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z', accent: true, width: 2 }, { d: 'M13 11h12M13 16h8' }],
  'morning-word-mindset': [{ d: 'M6 24V12M19 24V6M32 24V14', accent: true, width: 2 }, { d: 'M3 26h32' }],
};

const DOOR: Stroke[] = [{ d: 'M3 12c5-6 9 6 16 0s11 6 16 0' }, { d: 'M3 23h32', accent: true, width: 2.2 }];

function Tile({ strokes, door, size }: { strokes: Stroke[]; door: Door; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: night.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={38} height={30} viewBox="0 0 38 30" fill="none">
        {strokes.map(s => <Path key={s.d} d={s.d} fill="none" stroke={s.accent ? doorLine(door) : night.ink} strokeWidth={s.width ?? 1.6} strokeLinecap="round" strokeLinejoin="round" />)}
      </Svg>
    </View>
  );
}

export function JourneyArt({ id, door }: { id: JourneyId; door: Door }) {
  return <Tile strokes={ART[id]} door={door} size={60} />;
}

export function DoorArt({ door }: { door: Door }) {
  return <Tile strokes={DOOR} door={door} size={56} />;
}

export function TabIcon({ tab, color }: { tab: Tab; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === 'today' && <><Circle cx={12} cy={12} r={8} {...p} /><Circle cx={12} cy={12} r={3} {...p} /></>}
      {tab === 'chat' && <Path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-8l-4 3v-3h-2a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1z" {...p} />}
      {tab === 'bible' && <><Path d="M12 7c-2-1.5-5-2-7-1.5v12c2-.5 5 0 7 1.5c2-1.5 5-2 7-1.5v-12c-2-.5-5 0-7 1.5z" {...p} /><Path d="M12 7v12" {...p} /></>}
      {tab === 'nights' && <><Path d="M3 9c3-3 5 3 9 0s6 3 9 0" {...p} /><Path d="M3 15c3-3 5 3 9 0s6 3 9 0" {...p} /></>}
      {tab === 'more' && <><Path d="M5 7h14M5 12h14M5 17h14" {...p} /></>}
    </Svg>
  );
}
