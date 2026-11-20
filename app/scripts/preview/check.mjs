// The preview check: the built web app in a real browser at 390 x 844, judged on what the page really does,
// not on props. It catches what the render tests cannot see:
// - every tab label fits its own box (the bar once clipped "Today" to "Todav");
// - every radio announces its state (aria-checked), one checked per group;
// - each scripture row is exactly one labelled switch, and tapping it flips aria-checked;
// - the onboarding guard: a fresh /journeys goes to the door, an onboarded /door goes to Today, back from Today
//   after a first run never shows the door;
// - the other round-4 review findings, on the real page: week count, Mi Refugio Spanish, age bands, the age
//   wait, the evening-only greeting, the mark on a slow first paint.
// SHOTS_DIR=<folder> also saves a 390 x 844 screenshot of each screen walked.
// Usage: node scripts/preview/check.mjs <dist folder | https://preview url>. Needs playwright-core (PW_DIR, the
// folder it was installed into, or this app's node_modules) and Chrome (CI) or Playwright's Chromium (CHROME_PATH).
// Exits 1 with every failure listed; prints "OUTPUT preview-check: N checks passed" on success.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
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
  const shots = process.env.SHOTS_DIR ? resolve(process.env.SHOTS_DIR) : null;
  if (shots) mkdirSync(shots, { recursive: true });
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true }).catch(() => undefined); };
  async function open(path, settings, scheme = 'light', extra = {}) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, ...extra });
    if (settings) await context.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, [KEY, JSON.stringify(settings)]);
    const page = await context.newPage();
    await page.goto(base + path, { waitUntil: 'commit', timeout: 60000 });
    return { page, context };
  }
  const shows = (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  const body = page => page.evaluate(() => document.body.innerText);
  try {
    // 1. Tab labels fit (light and dark, English and Mi Refugio's Spanish), and the week count is live.
    for (const [settings, labels, scheme, name] of [[adult, ['Today', 'Chat', 'Bible', 'Nights', 'More'], 'light', '01-today-faith'], [{ ...adult, journey: 'mi-refugio', voice: 'spanish' }, ['Hoy', 'Chat', 'Biblia', 'Noches', 'Más'], 'dark', '02-today-mirefugio-dark']]) {
      const { page, context } = await open('/today', settings, scheme);
      await page.getByText(labels[3], { exact: true }).last().waitFor({ timeout: 30000 });
      const boxes = await page.evaluate(names => names.map(name => {
        const all = [...document.querySelectorAll('div, span')].filter(el => el.childElementCount === 0 && el.textContent === name);
        const el = all.at(-1);
        return el ? { name, scroll: el.scrollHeight, client: el.clientHeight } : { name, missing: true };
      }), labels);
      for (const box of boxes) expect(!box.missing && box.scroll <= box.client, `tab label "${box.name}" is clipped (${box.scroll}px of text in a ${box.client}px box)`);
      const text = await body(page);
      expect(/1 (day this week|día esta semana)/.test(text), `${name}: week count is not live ("1 day this week" on a first open)`);
      if (settings.journey === 'mi-refugio') expect(/Salmos para dormir/.test(text) && !/Psalm Nights/.test(text), `${name}: Mi Refugio Today names Psalm Nights in English`);
      await shot(page, name);
      await context.close();
    }
    // 2. Radios announce their state; one checked per group. Inside Mi Refugio the back link says Más.
    {
      const { page, context } = await open('/settings', adult);
      await page.getByText('Plain modern', { exact: true }).waitFor({ timeout: 30000 });
      const groups = await page.evaluate(() => [...document.querySelectorAll('[role=radiogroup]')].map(g => [...g.querySelectorAll('[role=radio]')].map(r => r.getAttribute('aria-checked'))));
      expect(groups.length >= 2, `Settings has ${groups.length} radio groups (want voice + language)`);
      for (const states of groups) expect(states.length > 0 && states.every(s => s === 'true' || s === 'false') && states.filter(s => s === 'true').length === 1, `a radio group announces ${JSON.stringify(states)} (want aria-checked on each, one "true")`);
      await shot(page, '03-settings');
      await context.close();
      const refugio = await open('/settings', { ...adult, journey: 'mi-refugio', voice: 'spanish' });
      expect(await shows(refugio.page, 'Más'), 'Mi Refugio Settings: the back link does not say "Más"');
      expect(/Español \(Mi Refugio\)/.test(await body(refugio.page)), 'Settings: the Spanish chat voice is not "Español (Mi Refugio)"');
      await shot(refugio.page, '04-settings-mirefugio');
      await refugio.context.close();
    }
    // 3. One labelled switch per scripture row, and it flips.
    for (const [path, name] of [['/settings', '05-settings-mindset-dark'], ['/journeys?door=mindset&change=1', '06-picker-mindset-dark']]) {
      const { page, context } = await open(path, mindset, 'dark');
      await page.getByText('Weave scripture in', { exact: true }).first().waitFor({ timeout: 30000 });
      const switches = page.locator('[role=switch]');
      const count = await switches.count();
      expect(count === 1, `${path}: ${count} switch elements for one scripture row (want 1)`);
      const label = count ? await switches.first().getAttribute('aria-label') : null;
      expect(!!label, `${path}: the switch has no label`);
      await shot(page, `${name}-off`);
      if (count) {
        const before = await switches.first().getAttribute('aria-checked');
        await switches.first().click();
        expect((await switches.first().getAttribute('aria-checked')) === String(before !== 'true'), `${path}: tapping the switch did not flip aria-checked (was ${before})`);
      }
      await shot(page, `${name}-on`);
      await context.close();
    }
    // 4. The onboarding guard.
    for (const [path, settings, want] of [['/journeys', null, '/door'], ['/door', adult, '/today'], ['/age', adult, '/today']]) {
      const { page, context } = await open(path, settings);
      const arrived = await page.waitForURL(url => new URL(url).pathname === want, { timeout: 30000 }).then(() => true, () => false);
      expect(arrived, `${path} (${settings ? 'onboarded' : 'fresh install'}) stayed on ${new URL(page.url()).pathname}, want ${want}`);
      if (!settings) await shot(page, '07-fresh-journeys-to-door');
      await context.close();
    }
    // 5. A first run end to end; back from Today never shows the front door. The greeting agrees with
    //    "tonight": none at 2 pm Chicago, "Good evening." at 8 pm London.
    {
      const { page, context } = await open('/', null, 'light', { timezoneId: 'America/Chicago' });
      await page.getByText("With God's Word", { exact: false }).first().waitFor({ timeout: 30000 });
      const hour = await page.evaluate(() => new Date().getHours());
      const greeted = /Good (morning|afternoon|evening)/.exec(await body(page))?.[0] ?? null;
      expect(greeted === (hour >= 17 || hour < 5 ? 'Good evening' : null), `the door greets "${greeted}" at ${hour}:00`);
      await shot(page, '08-door-chicago');
      await page.getByText("With God's Word", { exact: false }).first().click();
      await page.getByRole('textbox').fill('1990');
      await page.getByText('Continue', { exact: false }).first().click();
      await page.getByText('Start Hush Harbor', { exact: false }).first().click();
      const today = await page.waitForURL(url => new URL(url).pathname === '/today', { timeout: 30000 }).then(() => true, () => false);
      expect(today, `Start on a first run went to ${new URL(page.url()).pathname}, not /today`);
      await page.goBack().catch(() => undefined);
      await page.waitForTimeout(1500);
      expect(!/What do you need tonight\?/.test(await body(page)), `back from Today shows the front door (${new URL(page.url()).pathname})`);
      await shot(page, '09-back-from-today');
      await context.close();
      const evening = await open('/', null, 'dark', { timezoneId: 'Europe/London' });
      await evening.page.getByText("With God's Word", { exact: false }).first().waitFor({ timeout: 30000 });
      const h = await evening.page.evaluate(() => new Date().getHours());
      expect(/Good evening\./.test(await body(evening.page)) === (h >= 17 || h < 5), `the door at ${h}:00 London greets wrongly`);
      await shot(evening.page, '10-door-london-dark');
      await evening.context.close();
    }
    // 6. Age bands: a teen opens on Young Faith; a child (Spanish) never sees it.
    {
      const teen = await open('/journeys', { ...adult, age: 'teen', voice: 'teen', journey: undefined });
      expect(await shows(teen.page, 'Start Young Faith'), 'a teen\'s picker does not open on "Start Young Faith"');
      await shot(teen.page, '11-picker-teen');
      await teen.context.close();
      const child = await open('/journeys', { ...adult, age: 'child', language: 'es', journey: undefined });
      await child.page.getByText('Comenzar', { exact: false }).first().waitFor({ timeout: 30000 });
      expect(!/Young Faith|13 a 17/.test(await body(child.page)), 'a child is offered Young Faith');
      await shot(child.page, '12-picker-child-es');
      await child.context.close();
    }
    // 7. The age-correction wait: said once, muted (wine is only for a wrong year).
    {
      const { page, context } = await open('/age?correct=1', { ...adult, age: 'teen', voice: 'teen', ageSetAt: Date.now() });
      expect(await shows(page, 'once, 7 days after'), 'the correction screen does not show the rule');
      await page.getByRole('textbox').fill('1990');
      await page.getByText('Continue', { exact: false }).first().click();
      expect(await shows(page, 'older age group from'), 'the wait date is not shown');
      const text = await body(page);
      expect(!/once, 7 days after/.test(text), 'the wait is said twice (rule and date)');
      const colour = await page.getByText('older age group from', { exact: false }).first().evaluate(el => getComputedStyle(el).color);
      expect(colour !== 'rgb(163, 48, 58)', `the wait is in wine (${colour})`);
      await shot(page, '13-age-wait');
      await context.close();
    }
    // 8. A slow phone's first paint is the mark (50 KB/s, 400 ms).
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024 });
      await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1500);
      const mark = await page.evaluate(() => { const svg = document.querySelector('#root .first-paint svg.mark.light'); const r = svg?.getBoundingClientRect(); return r ? r.width > 0 && r.height > 0 : false; });
      expect(mark, 'the first paint on a slow phone has no mark');
      const preloads = await page.evaluate(() => document.querySelectorAll('link[rel=preload][as=font]').length);
      expect(preloads >= 4, `the page preloads ${preloads} fonts (want 4)`);
      await shot(page, '14-slow-first-paint');
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
