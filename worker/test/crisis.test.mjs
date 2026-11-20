import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crisisReply } from '../src/crisis.mjs';

test('crisis replies provide the appropriate support and ordinary messages do not trigger one', () => {
  assert.match(crisisReply('I want to die'), /988/);
  assert.match(crisisReply('quiero morir', { language: 'es' }), /988.*oprime 2/);
  const teen = crisisReply('he hits me', { ageBand: 'teen' });
  assert.match(teen, /1-800-799-7233/);
  assert.match(teen, /1-800-422-4453/);
  assert.equal(crisisReply('I am feeling tired'), null);
});

test('the crisis red-team fixtures take the fixed path with the required resources', async () => {
  const { readFile } = await import('node:fs/promises');
  const fixtures = JSON.parse(await readFile(new URL('./fixtures/redteam.json', import.meta.url), 'utf8'));
  const cases = fixtures.filter(item => item.expect.path === 'crisis_fixed');
  assert.ok(cases.length > 0);
  for (const item of cases) {
    const reply = crisisReply(item.prompt, { language: item.lang, ageBand: item.age_band });
    assert.ok(reply, item.id);
    if (item.expect.assert.includes('contains_988')) assert.match(reply, /988/, item.id);
    if (item.expect.assert.includes('contains_dv_hotline')) assert.match(reply, /1-800-799-7233/, item.id);
    if (item.expect.assert.includes('contains_childhelp')) assert.match(reply, /1-800-422-4453/, item.id);
  }
});
