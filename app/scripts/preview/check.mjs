// The preview check: the built web app in a real browser at 390 x 844, judged on what the page really does,
// not on props. It catches what the render tests cannot see:
// - every tab label fits its own box (the bar once clipped "Today" to "Todav");
// - every radio announces its state (aria-checked), one checked per group;
// - each scripture row is exactly one labelled switch, and tapping it flips aria-checked;
// - the onboarding guard: a fresh /journeys goes to the door, an onboarded /door goes to Today.
// Usage: node scripts/preview/check.mjs <dist folder | https://preview url>. Needs playwright-core (PW_DIR, the
// folder it was installed into, or this app's node_modules) and Chrome (CI) or Playwright's Chromium (CHROME_PATH).
// Exits 1 with every failure listed; prints "OUTPUT preview-check: N checks passed" on success.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const KEY = 'peace-be-still-settings';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.db': 'application/octet-stream' };

function serve(directory) {
  const root = resolve(directory);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cross-origin-embedder-policy': 'require-corp', 'cross-origin-opener-policy': 'same-origin', 'cross-origin-resource-policy': 'same-origin' });
    res.end(readFileSync(file));
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

const adult = { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'plain', language: 'en', journey: 'psalm-nights' };
const mindset = { ...adult, door: 'mindset', journey: 'imagination-nights' };

export async function check(target) {
  const require = createRequire(join(resolve(process.env.PW_DIR ?? '.'), 'node_modules', 'x.js'));
  const { chromium } = require('playwright-core');
  const local = !/^https?:/.test(target) ? await serve(target) : null;
  const base = local ? local.base : target.replace(/\/$/, '');
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  const failures = [];
  let passed = 0;
  const expect = (ok, what) => { if (ok) passed++; else failures.push(what); };
  async function open(path, settings, scheme = 'light') {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
    if (settings) await context.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, [KEY, JSON.stringify(settings)]);
    const page = await context.newPage();
    await page.goto(base + path, { waitUntil: 'commit', timeout: 60000 });
    return { page, context };
  }
  try {
    // 1. Tab labels fit (light and dark, English and Mi Refugio's Spanish).
    for (const [settings, labels, scheme] of [[adult, ['Today', 'Chat', 'Bible', 'Nights', 'More'], 'light'], [{ ...adult, journey: 'mi-refugio', voice: 'spanish' }, ['Hoy', 'Chat', 'Biblia', 'Noches', 'Más'], 'dark']]) {
      const { page, context } = await open('/today', settings, scheme);
      await page.getByText(labels[3], { exact: true }).last().waitFor({ timeout: 30000 });
      const boxes = await page.evaluate(names => names.map(name => {
        const all = [...document.querySelectorAll('div, span')].filter(el => el.childElementCount === 0 && el.textContent === name);
        const el = all.at(-1);
        return el ? { name, scroll: el.scrollHeight, client: el.clientHeight } : { name, missing: true };
      }), labels);
      for (const box of boxes) expect(!box.missing && box.scroll <= box.client, `tab label "${box.name}" is clipped (${box.scroll}px of text in a ${box.client}px box)`);
      await context.close();
    }
    // 2. Radios announce their state; one checked per group.
    {
      const { page, context } = await open('/settings', adult);
      await page.getByText('Plain modern', { exact: true }).waitFor({ timeout: 30000 });
      const groups = await page.evaluate(() => [...document.querySelectorAll('[role=radiogroup]')].map(g => [...g.querySelectorAll('[role=radio]')].map(r => r.getAttribute('aria-checked'))));
      expect(groups.length >= 2, `Settings has ${groups.length} radio groups (want voice + language)`);
      for (const states of groups) expect(states.length > 0 && states.every(s => s === 'true' || s === 'false') && states.filter(s => s === 'true').length === 1, `a radio group announces ${JSON.stringify(states)} (want aria-checked on each, one "true")`);
      await context.close();
    }
    // 3. One labelled switch per scripture row, and it flips.
    for (const path of ['/settings', '/journeys?door=mindset&change=1']) {
      const { page, context } = await open(path, mindset, 'dark');
      await page.getByText('Weave scripture in', { exact: true }).first().waitFor({ timeout: 30000 });
      const switches = page.locator('[role=switch]');
      const count = await switches.count();
      expect(count === 1, `${path}: ${count} switch elements for one scripture row (want 1)`);
      const label = count ? await switches.first().getAttribute('aria-label') : null;
      expect(!!label, `${path}: the switch has no label`);
      if (count) {
        const before = await switches.first().getAttribute('aria-checked');
        await switches.first().click();
        expect((await switches.first().getAttribute('aria-checked')) === String(before !== 'true'), `${path}: tapping the switch did not flip aria-checked (was ${before})`);
      }
      await context.close();
    }
    // 4. The onboarding guard.
    for (const [path, settings, want] of [['/journeys', null, '/door'], ['/door', adult, '/today'], ['/age', adult, '/today']]) {
      const { page, context } = await open(path, settings);
      const arrived = await page.waitForURL(url => new URL(url).pathname === want, { timeout: 30000 }).then(() => true, () => false);
      expect(arrived, `${path} (${settings ? 'onboarded' : 'fresh install'}) stayed on ${new URL(page.url()).pathname}, want ${want}`);
      await context.close();
    }
  } finally {
    await browser.close();
    local?.server.close();
  }
  return { passed, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = process.argv[2];
  if (!target) { console.error('usage: check.mjs <dist | url>'); process.exit(2); }
  const { passed, failures } = await check(target);
  if (failures.length || passed === 0) {
    console.error(`NAMED STOP [PREVIEW_CHECK_FAILED] ${failures.length} failure(s):\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`OUTPUT preview-check: ${passed} checks passed`);
}
