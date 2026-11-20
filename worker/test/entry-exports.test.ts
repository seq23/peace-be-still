// workerd refuses to start ("Incorrect type for map entry") when the entry module exports anything that is not a
// function or handler object; round-5 red team run 44837523524 never started over an exported string.
import { expect, it } from 'vitest';
import * as entry from '../src/index';

it('the Worker entry module exports only functions and objects', () => {
  const bad = Object.entries(entry).filter(([, v]) => typeof v !== 'function' && (typeof v !== 'object' || v === null)).map(([k]) => k);
  expect(bad).toEqual([]);
});
