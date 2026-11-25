// Review capture: what a reviewer needs to judge a PR's phone preview without a local browser.
// For every route, in two passes (fresh install with empty storage, and onboarded with the storage the
// onboarding writes seeded), at 390x844 light, 390x844 dark (prefers-color-scheme) and 1280x800 light:
//   <pass>/<view>/<route>.png        full-page screenshot
//   <pass>/<view>/<route>.aria.yml   Playwright aria snapshot (roles, names, checked/selected/pressed)
//   <pass>/<view>/<route>.json       final URL, console errors, page errors, failed requests, visible text,
//                                    every [role]/aria-* element with its state, sideways overflow
// plus summary.json and summary.md over all of them.
// Usage: node scripts/review-capture/capture.mjs <preview url> <routes, comma list> <out dir> [onboarded storage JSON]
// Needs `playwright` resolvable from PW_DIR (the folder it was installed into) or this repo.
// Exits 1 (named stop REVIEW_CAPTURE_EMPTY) when the preview cannot be reached or no screenshot was made;
// console errors are data for the reviewer, never a failure here.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// What phase 1's onboarding writes (app/src/settings.tsx STORAGE_KEY, app/src/model.ts Settings): an adult
// who chose the God's Word door and Hush Harbor. AsyncStorage on web is localStorage, value = JSON string.
export const DEFAULT_ONBOARDED = {
  'peace-be-still-settings': { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'church', language: 'en', journey: 'hush-harbor' },
};

export const VIEWS = [
  { name: '390-light', viewport: { width: 390, height: 844 }, colorScheme: 'light', mobile: true },
  { name: '390-dark', viewport: { width: 390, height: 844 }, colorScheme: 'dark', mobile: true },
  { name: '1280-light', viewport: { width: 1280, height: 800 }, colorScheme: 'light', mobile: false },
];

export function slug(route) {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || 'root';
}

export function parseRoutes(list) {
  const routes = [...new Set(String(list).split(',').map(r => r.trim()).filter(Boolean).map(r => (r.startsWith('/') ? r : `/${r}`)))];
  if (!routes.length) throw new Error('REVIEW_CAPTURE_EMPTY: no routes given');
  return routes;
}

/** Storage to seed: an object of key -> value; non-string values are stored as JSON (what AsyncStorage does). */
export function parseStorage(json) {
  const raw = json && String(json).trim() ? JSON.parse(json) : DEFAULT_ONBOARDED;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('onboarded storage must be a JSON object of key -> value');
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  // React Native Web paints after the bundle runs and redirects client-side; give it a beat to finish.
  await page.waitForTimeout(1500);
}

async function captureOne(browser, base, route, view, seed, dir) {
  const context = await browser.newContext({
    viewport: view.viewport,
    deviceScaleFactor: view.mobile ? 2 : 1,
    isMobile: view.mobile,
    hasTouch: view.mobile,
    colorScheme: view.colorScheme,
  });
  if (seed) {
    // Seed once per context (first document only), so the app's own later writes are never overwritten.
    await context.addInitScript(entries => {
      if (sessionStorage.getItem('__review_seeded')) return;
      for (const [k, v] of entries) localStorage.setItem(k, v);
      sessionStorage.setItem('__review_seeded', '1');
    }, Object.entries(seed));
  }
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push({ type: m.type(), text: m.text().slice(0, 2000) }); });
  page.on('pageerror', e => pageErrors.push(String(e?.stack || e).slice(0, 2000)));
  page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }); });

  const name = slug(route);
  const record = { route, view: view.name, pass: seed ? 'onboarded' : 'fresh', status: null, finalUrl: null };
  try {
    const res = await page.goto(base + route, { waitUntil: 'load', timeout: 60000 });
    record.status = res?.status() ?? null;
    await settle(page);
    record.finalUrl = page.url().replace(base, '') || '/';
    await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
    record.shot = `${name}.png`;
    const aria = await page.locator('body').ariaSnapshot({ timeout: 15000 }).catch(e => `# aria snapshot failed: ${e.message}`);
    writeFileSync(join(dir, `${name}.aria.yml`), aria + '\n');
    Object.assign(record, await page.evaluate(() => {
      const text = document.body.innerText;
      const roles = [...document.querySelectorAll('[role], [aria-label], [aria-checked], [aria-selected], [aria-pressed], button, a, input, select, textarea')]
        .filter(el => el.getClientRects().length)
        .slice(0, 400)
        .map(el => {
          const out = { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') ?? undefined, text: (el.innerText || '').trim().slice(0, 120) || undefined };
          for (const a of el.getAttributeNames()) if (a.startsWith('aria-')) out[a] = el.getAttribute(a);
          if (el.tagName === 'A') out.href = el.getAttribute('href');
          return out;
        });
      // Text that looks like an untranslated i18n key ("home.title", "bible.search.empty").
      const rawKeys = [...new Set(text.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+(?:\.[a-zA-Z]+)*\b/g) ?? [])].filter(k => !/\.(com|app|org|net|dev|live|vc)$/.test(k));
      const doc = document.documentElement;
      return { title: document.title, text: text.slice(0, 8000), textLength: text.trim().length, rawKeys, sidewaysOverflow: doc.scrollWidth > doc.clientWidth ? doc.scrollWidth - doc.clientWidth : 0, roles };
    }));
  } catch (e) {
    record.error = String(e?.message || e).slice(0, 2000);
  }
  Object.assign(record, { consoleErrors, pageErrors, failedRequests });
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(record, null, 2) + '\n');
  await context.close();
  return record;
}

export async function capture({ url, routes, out, storage }) {
  const base = url.replace(/\/$/, '');
  const require = createRequire(join(resolve(process.env.PW_DIR ?? '.'), 'node_modules', 'x.js'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const records = [];
  try {
    for (const [pass, seed] of [['fresh', null], ['onboarded', storage]]) {
      for (const view of VIEWS) {
        const dir = join(out, pass, view.name);
        mkdirSync(dir, { recursive: true });
        for (const route of routes) {
          const r = await captureOne(browser, base, route, view, seed, dir);
          records.push(r);
          console.log(`${pass} ${view.name} ${route} -> ${r.finalUrl ?? 'ERROR'}${r.error ? ` (${r.error.split('\n')[0]})` : ''} console=${r.consoleErrors.length} pageErrors=${r.pageErrors.length}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  const shots = records.filter(r => r.shot).length;
  const blank = records.filter(r => r.shot && r.textLength === 0).length;
  const summary = { url: base, routes, storage, shots, blank, records: records.map(({ text, roles, ...rest }) => rest) };
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  const md = [
    `# Review capture`, '', `Preview: ${base}`, `Onboarded storage: \`${JSON.stringify(storage)}\``, '',
    '| pass | view | route | lands on | text chars | console err/warn | page errors | failed requests | raw keys | sideways px | error |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...records.map(r => `| ${r.pass} | ${r.view} | ${r.route} | ${r.finalUrl ?? ''} | ${r.textLength ?? ''} | ${r.consoleErrors.length} | ${r.pageErrors.length} | ${r.failedRequests.length} | ${(r.rawKeys ?? []).join(' ')} | ${r.sidewaysOverflow ?? ''} | ${(r.error ?? '').split('\n')[0]} |`),
  ].join('\n');
  writeFileSync(join(out, 'summary.md'), md + '\n');
  return { shots, blank, total: records.length, consoleErrors: records.reduce((n, r) => n + r.consoleErrors.length + r.pageErrors.length, 0) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, routeList, out, storageJson] = process.argv.slice(2);
  const local = process.env.REVIEW_CAPTURE_LOCAL === '1' && /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(url ?? '');
  if (!local && !/^https:\/\//.test(url ?? '')) {
    console.error('REVIEW_CAPTURE_EMPTY: preview_url must be HTTPS or the CI loopback server');
    process.exit(1);
  }
  const result = await capture({ url, routes: parseRoutes(routeList ?? '/'), out: resolve(out ?? 'review-capture'), storage: parseStorage(storageJson) });
  console.log(`OUTPUT review-capture: ${result.shots} of ${result.total} shots, ${result.blank} blank, ${result.consoleErrors} console/page errors`);
  if (result.shots === 0) { console.error('REVIEW_CAPTURE_EMPTY: no screenshot was made (preview unreachable or every page failed)'); process.exit(1); }
}
