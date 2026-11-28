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
  // The runner's own flow rules (boss-os scripts/ops/tap-through.mjs flowProblems): a flow it refuses is a
  // NAMED STOP [FLOW_INVALID] on main and no tap-through at all (27 Nov 2026: "first-open-zh-Hans").
  test(`${file}: journey names are lower-case words joined by -, each once`, () => {
    const names = flow.journeys.map(j => j.name);
    for (const name of names) assert.match(name ?? '', /^[a-z0-9-]+$/, `journey "${name}": name must be lower-case words joined by -`);
    assert.equal(new Set(names).size, names.length, `${file}: a journey name is listed twice`);
    for (const [route, storage] of Object.entries(flow.route_storage_for ?? {})) {
      assert.ok(route.startsWith('/'), `route_storage_for "${route}": the key is a route path`);
      assert.ok(storage && typeof storage === 'object' && Object.keys(storage).length, `route_storage_for "${route}": no storage`);
    }
  });
  // The robot's browser runs on the runner's clock (UTC): from 00:00 to 05:00 UTC (6 to 11 PM Central) Today and
  // Nights are only "back to sleep", and a step on either never appears (27 Nov 2026, run 46098333472). Every journey
  // and every swept route states its hour (app/src/clock.ts PREVIEW_HOUR_KEY) unless its own address sets ?hour=.
  test(`${file}: every journey and swept route states the phone's hour`, () => {
    const hour = storage => /^(?:[0-9]|1[0-9]|2[0-3])$/.test(storage?.['pbs-preview-hour'] ?? '');
    for (const j of flow.journeys) assert.ok(/[?&]hour=\d/.test(j.start) || hour(j.storage), `${file} journey "${j.name}": no pbs-preview-hour in its storage`);
    assert.ok(hour(flow.route_storage), `${file}: no pbs-preview-hour in route_storage`);
    for (const [route, storage] of Object.entries(flow.route_storage_for ?? {})) assert.ok(hour(storage), `${file} route_storage_for "${route}": no pbs-preview-hour`);
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
