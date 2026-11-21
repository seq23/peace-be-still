// The preview check: the built web app in a real browser at 390 x 844, judged on what the page really does,
// not on props. It catches what the render tests cannot see:
// - every tab label fits its own box (the bar once clipped "Today" to "Todav");
// - every radio announces its state (aria-checked), one checked per group;
// - each scripture row is exactly one labelled switch, and tapping it flips aria-checked (every switch is labelled, none doubled);
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
  const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
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
      // Settings also holds the daily reminder switch, so the scripture row is found by its own label.
      const all = page.locator('[role=switch]');
      const labels = await all.evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
      expect(labels.every(Boolean), `${path}: a switch has no label (${JSON.stringify(labels)})`);
      expect(labels.length === new Set(labels).size, `${path}: one row drawn as two switches (${JSON.stringify(labels)})`);
      const switches = page.locator('[role=switch][aria-label="Weave scripture in"]');
      const count = await switches.count();
      expect(count === 1, `${path}: ${count} switch elements for one scripture row (want 1)`);
      await shot(page, `${name}-off`);
      if (count) {
        const before = await switches.first().getAttribute('aria-checked');
        await switches.first().click();
        expect((await switches.first().getAttribute('aria-checked')) === String(before !== 'true'), `${path}: tapping the switch did not flip aria-checked (was ${before})`);
      }
      await shot(page, `${name}-on`);
      await context.close();
    }
    // 3b. The daily reminder in Settings: one labelled switch; on shows the time, off hides it.
    {
      const { page, context } = await open('/settings', adult);
      const reminder = page.locator('[role=switch][aria-label="Daily reminder"]');
      await reminder.waitFor({ timeout: 30000 });
      expect((await reminder.getAttribute('aria-checked')) === 'false', 'the daily reminder starts off');
      await reminder.click();
      await page.getByText('One a day at 8:30 PM.', { exact: true }).waitFor({ timeout: 10000 }).catch(() => undefined);
      expect((await reminder.getAttribute('aria-checked')) === 'true' && await shows(page, 'One a day at 8:30 PM.'), 'turning the reminder on did not show "One a day at 8:30 PM."');
      expect((await page.locator('input[type=time]').count()) === 1, 'the reminder time is not a time field on the web preview');
      await shot(page, '07-settings-reminder-on');
      await reminder.click();
      expect((await reminder.getAttribute('aria-checked')) === 'false' && (await page.locator('input[type=time]').count()) === 0, 'turning the reminder off left it on or kept the time row');
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
      // The picker: Bible Chat & Stories first, nothing picked, Start disabled until a tap, then named.
      const start = page.getByRole('button', { name: 'Choose a journey to start' });
      await start.waitFor({ timeout: 30000 });
      expect((await start.getAttribute('aria-disabled')) === 'true', 'Start is not disabled before a journey is picked');
      expect((await page.locator('[role=radio][aria-checked=true]').count()) === 0, 'a journey is preselected on a first run');
      expect(/^Bible Chat & Stories/.test((await page.locator('[role=radio]').first().innerText()).trim()), 'Bible Chat & Stories is not the first journey');
      expect(await fits(page), 'the journey picker is wider than 390 px');
      await shot(page, '08b-picker-first-run');
      await page.locator('[role=radio]').first().click();
      expect((await page.locator('[role=radio][aria-checked=true]').count()) === 1, 'tapping Bible Chat & Stories did not pick it');
      await shot(page, '08c-picker-bible-chat-picked');
      await page.getByText('Start Bible Chat & Stories', { exact: false }).first().click();
      const today = await page.waitForURL(url => new URL(url).pathname === '/today', { timeout: 30000 }).then(() => true, () => false);
      expect(today, `Start on a first run went to ${new URL(page.url()).pathname}, not /today`);
      await page.goBack().catch(() => undefined);
      await page.waitForTimeout(1500);
      expect(!/What do you need tonight\?/.test(await body(page)), `back from Today shows the front door (${new URL(page.url()).pathname})`);
      await shot(page, '09-back-from-today');
      await context.close();
      // The first-run picker in dark mode.
      const darkPicker = await open('/journeys', { ...adult, journey: undefined }, 'dark');
      await darkPicker.page.getByRole('button', { name: 'Choose a journey to start' }).waitFor({ timeout: 30000 });
      expect(await fits(darkPicker.page), 'the dark journey picker is wider than 390 px');
      await shot(darkPicker.page, '08d-picker-first-run-dark');
      await darkPicker.page.locator('[role=radio]').first().click();
      await shot(darkPicker.page, '08e-picker-bible-chat-picked-dark');
      await darkPicker.context.close();
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
      expect(await shows(teen.page, 'Choose a journey to start'), 'a teen\'s picker preselects a journey');
      expect(/^Young Faith/.test((await teen.page.locator('[role=radio]').first().innerText()).trim()), 'a teen\'s picker does not list Young Faith first');
      await shot(teen.page, '11-picker-teen');
      await teen.context.close();
      const child = await open('/journeys', { ...adult, age: 'child', language: 'es', journey: undefined });
      await child.page.getByText('Elige un camino para comenzar', { exact: false }).first().waitFor({ timeout: 30000 });
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
      // The HTML arrives long before the 380 KB bundle; the mark must be on screen while the bundle loads.
      await page.goto(base + '/', { waitUntil: 'commit', timeout: 60000 });
      const mark = await page.waitForSelector('#root .first-paint svg.mark.light', { state: 'visible', timeout: 10000 }).then(() => true, () => false);
      expect(mark, 'the first paint on a slow phone has no mark');
      const preloads = await page.evaluate(() => document.querySelectorAll('link[rel=preload][as=font]').length);
      expect(preloads >= 4, `the page preloads ${preloads} fonts (want 4)`);
      await shot(page, '14-slow-first-paint');
      await context.close();
    }
    // 15. "3 AM, back to sleep" (21 Nov 2026): with ?hour=3 Nights and Today are one calm button on night, nothing
    // wider than the phone; at ?hour=22 and ?hour=6 there is no button and the screen follows the light phone.
    // "For when you've lost someone" fits the phone too. (Preview only: the sample night stands in for the audio.)
    const darkBody = page => page.evaluate(() => {
      const bg = [...document.querySelectorAll('div')].map(el => getComputedStyle(el).backgroundColor).find(c => c && c !== 'rgba(0, 0, 0, 0)');
      return bg === 'rgb(14, 26, 34)';
    });
    for (const tab of ['nights', 'today']) {
      const { page, context } = await open(`/${tab}?hour=3`, adult);
      expect(await shows(page, 'Go back to sleep'), `${tab} at 3 AM: no back-to-sleep button`);
      const text = await body(page);
      expect(!/Psalm Nights|Today's declaration/.test(text), `${tab} at 3 AM shows more than the one button`);
      expect(await darkBody(page), `${tab} at 3 AM is not on night`);
      expect(await fits(page), `${tab} at 3 AM is wider than 390 px`);
      await shot(page, `15-${tab}-3am`);
      await context.close();
      for (const hour of [22, 6]) {
        const later = await open(`/${tab}?hour=${hour}`, adult);
        await later.page.getByText(tab === 'nights' ? 'Psalm Nights' : 'Tonight', { exact: false }).first().waitFor({ timeout: 30000 }).catch(() => undefined);
        expect(!/Go back to sleep/.test(await body(later.page)), `${tab} at ${hour}:00 shows the back-to-sleep button`);
        await later.context.close();
      }
    }
    {
      const { page, context } = await open('/grief', adult);
      expect(await shows(page, "For when you've lost someone"), 'the grief page did not open');
      expect(await shows(page, 'The LORD is nigh unto them that are of a broken heart'), 'the grief page has no stored KJV verse');
      expect(await fits(page), 'the grief page is wider than 390 px');
      await shot(page, '16-grief');
      await context.close();
    }
    // 17. Two tabs (21 Nov 2026): with the app open in one tab and a verse loaded, a second tab of the same site
    // loads its verses too. Each tab keeps its own copy of the Bible in memory; nothing is locked to one tab.
    {
      const first = await open('/grief', adult);
      const verse = 'The LORD is nigh unto them that are of a broken heart';
      expect(await shows(first.page, verse), 'two tabs: the first tab has no verse');
      const second = await first.context.newPage();
      await second.goto(base + '/grief', { waitUntil: 'commit', timeout: 60000 });
      expect(await shows(second, verse), 'two tabs: the second tab shows no verse while the first is open');
      expect(!/could not be loaded/.test(await body(second)), 'two tabs: the second tab says a verse could not be loaded');
      expect(await shows(first.page, verse), 'two tabs: the first tab lost its verses');
      await shot(second, '17-grief-second-tab');
      await first.context.close();
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
