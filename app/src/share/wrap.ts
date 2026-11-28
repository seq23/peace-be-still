// The share card's line breaking, apart from the card so the tests can read it without a phone.

/** How wide a character draws, in ems: Hangul and Han are full width; Latin about 0.6. */
export const width = (text: string) => [...text].reduce((sum, ch) => sum + (/[\p{Script=Hangul}\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u.test(ch) ? 1 : 0.6), 0);

/**
 * The card's lines: words joined while they fit `max` ems; a run with no spaces wider than a line (Chinese) breaks
 * between characters. Pure, for the tests.
 */
export function wrapLines(text: string, max: number): string[] {
  const rows: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = rows.at(-1);
    if (last !== undefined && width(`${last} ${word}`) <= max) { rows[rows.length - 1] = `${last} ${word}`; continue; }
    let rest = word;
    while (width(rest) > max) {
      let cut = 1;
      while (cut < rest.length && width(rest.slice(0, cut + 1)) <= max) cut++;
      rows.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    rows.push(rest);
  }
  return rows;
}

/** The tall card: one of three sizes by length, lines 9 px apart, from the top. */
export function tallLayout(text: string) {
  const fontSize = text.length > 330 ? 18 : text.length > 180 ? 22 : 28;
  return { fontSize, lines: wrapLines(text, 440 / fontSize), top: 112, leading: fontSize + 9 };
}

/** The square (KakaoTalk) card, 520 units a side: the largest size whose lines fit the 280 between the label and
 * the credit, centred there. Undefined size never: the smallest is used even if it overflows (the tests prove the
 * 40 mornings all fit). */
export const SQUARE_SIZES = [34, 30, 26, 22, 20, 18, 16] as const;
export function squareLayout(text: string) {
  const fit = (size: number) => wrapLines(text, 440 / size).length * Math.round(size * 1.45) <= 280;
  const fontSize = SQUARE_SIZES.find(fit) ?? SQUARE_SIZES[SQUARE_SIZES.length - 1];
  const leading = Math.round(fontSize * 1.45);
  const lines = wrapLines(text, 440 / fontSize);
  return { fontSize, lines, top: 140 + Math.max(0, (280 - lines.length * leading) / 2) + fontSize, leading };
}
