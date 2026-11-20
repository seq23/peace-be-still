// A live red-team run must not take the account past 9,000 Workers AI neurons in a UTC day.
import { describe, expect, it } from 'vitest';
import { CEILING, NEURONS_PER_ITEM, itemsThatFit } from '../scripts/neuron-headroom.mjs';

describe('red-team neuron headroom', () => {
  it('a fresh day fits the whole 98-item set', () => expect(itemsThatFit(0)).toBeGreaterThanOrEqual(98));
  it('20 Nov 2026 (29,072 used) fits nothing', () => expect(itemsThatFit(29_072)).toBe(0));
  it('never lets the estimate cross the ceiling', () => {
    for (const used of [0, 1234, 8_899, 8_900, 9_000]) expect(used + itemsThatFit(used) * NEURONS_PER_ITEM).toBeLessThanOrEqual(CEILING);
  });
});
