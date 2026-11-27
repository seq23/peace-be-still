// The tap-through flow files fit the runner and are all run. The runner (boss-os scripts/ops/tap-through.mjs)
// refuses a flow over MAX_STEPS = 40 ("at most 40 fit one review; split the flow"), and the tap-through only
// runs on main (the preview job is main-only), so an oversized flow first shows as a red main
// (27 Nov 2026: 70 steps, NAMED STOP [FLOW_INVALID]). This runs on every PR and fails before that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MAX_STEPS = 40; // boss-os scripts/ops/tap-through.mjs MAX_STEPS
const root = new URL('../../', import.meta.url);
const files = readdirSync(root).filter(f => /^tap-through(?:-[a-z0-9-]+)?\.json$/.test(f)).sort();
const workflow = readFileSync(new URL('.github/workflows/mobile-preview.yml', root), 'utf8');

test('there is at least the main flow file', () => {
  assert.ok(files.includes('tap-through.json'), `flow files found: ${files.join(', ') || 'none'}`);
});

for (const file of files) {
  const flow = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
  test(`${file} fits one review (at most ${MAX_STEPS} steps)`, () => {
    const steps = flow.journeys.reduce((n, j) => n + j.steps.length, 0);
    assert.ok(steps > 0, `${file} taps nothing`);
    assert.ok(steps <= MAX_STEPS, `${file} has ${steps} steps: split it into another tap-through-<name>.json`);
  });
  test(`${file}: every promise names steps in this same file`, () => {
    const ids = new Set(flow.journeys.flatMap(j => j.steps.filter(s => s.id).map(s => `${j.name}:${s.id}`)));
    const features = new Set((flow.native_only ?? []).map(n => n.feature));
    for (const p of flow.promises ?? []) {
      assert.ok(ids.has(p.on), `"${p.text}": its price screen ${p.on} is not in ${file}`);
      if (p.native_only) assert.ok(features.has(p.native_only), `"${p.text}": native_only "${p.native_only}" is not in ${file}`);
      else assert.ok(!p.built || ids.has(p.built), `"${p.text}": ${p.built} is not in ${file}`);
    }
  });
  test(`${file} is run by the preview workflow with its own label`, () => {
    assert.match(workflow, new RegExp(`\\n {6}flow_file: ${escape(file)}\\n {6}label: \\$\\{\\{ github\\.run_id \\}\\}-[a-z-]+\\n`), `${file} has no tap-through call in mobile-preview.yml`);
  });
}

test('each call has its own artifact label', () => {
  const labels = [...workflow.matchAll(/\n {6}label: (.+)\n/g)].map(m => m[1]);
  assert.equal(new Set(labels).size, labels.length, `labels repeat: ${labels.join(', ')}`);
  assert.equal(labels.length, files.length, `${files.length} flow files, ${labels.length} labelled calls`);
});
