// The Peace Be Still palette (design-every-tongue skill). Light follows linen; dark follows night.
// Dawn is God's Word's accent and appears only on night surfaces (never on linen, 1.95:1).
export const night = { bg: '#0E1A22', raised: '#16252F', ink: '#F4F0E6', muted: '#A9B6BC', line: '#2A3B46', glow: '#86CBC1' } as const;
export const dawn = '#E0A33E';

export const colors = {
  light: { bg: '#F4F0E6', card: '#FFFDF8', line: '#DCD5C6', ink: '#0E1A22', muted: '#4F5B63', accent: '#1D6A64', on: '#FFFFFF', wine: '#A3303A' },
  dark: { bg: '#0E1A22', card: '#16252F', line: '#2A3B46', ink: '#F4F0E6', muted: '#A9B6BC', accent: '#86CBC1', on: '#0E1A22', wine: '#F28B8B' },
} as const;

export type Palette = (typeof colors)['light' | 'dark'];

export const fonts = {
  serif: 'LibreCaslonText_400Regular',
  // Scripture's supplied words (the KJV's [brackets]); its own face, because a phone never slants a single-face font.
  serifItalic: 'LibreCaslonText_400Regular_Italic',
  body: 'Figtree_400Regular',
  strong: 'Figtree_600SemiBold',
  mono: 'SplineSansMono_500Medium',
} as const;

// The logo mark's two strokes, path for path from assets/brand/pbs-mark-light.svg and pbs-mark-dark.svg
// (test/brand.unit.ts keeps them equal).
export const MARK = { wave: 'M14 27 q6 -8 12 0 t12 0 t12 0', line: 'M14 41 H50' } as const;
