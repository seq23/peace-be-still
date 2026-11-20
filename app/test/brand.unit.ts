import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { MARK } from '../src/theme/tokens';

test('the in-app mark is drawn from the brand files', () => {
  for (const file of ['assets/brand/pbs-mark-light.svg', 'assets/brand/pbs-mark-dark.svg']) {
    const paths = [...readFileSync(file, 'utf8').matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(paths, [MARK.wave, MARK.line], file);
  }
});
