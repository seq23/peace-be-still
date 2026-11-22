// Release gate for everything Apple and the public read before install: the store listings,
// the 7 custom product pages, In-App Events, the privacy label, the legal pages and the
// App Store Connect dry run. Word lists come from the shared sources only:
// app/src/quality/banned.json (UI words) and scripts/content/rules.mjs (door and brand rules).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import banned from '../src/quality/banned.json';
import products from '../src/config/products.json';
import pkg from '../package.json';
import { NEVER, MINDSET, FAITH_LINK } from '../../scripts/content/rules.mjs';
import { verses } from '../../scripts/content/lib.mjs';
import { providers } from '../../worker/src/providers.mjs';
import { esListingLegal } from '../../site/content/legal.mjs';
import { FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES } from '../src/gates';

const ROOT = join(process.cwd(), '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const field = (text: string, name: string) => text.match(new RegExp(`^${name}: ?(.*)$`, 'm'))?.[1]?.trim();
const words = (list: string[]) => new RegExp(`\\b(?:${list.join('|')})\\b`, 'iu');

// The 7 custom product pages that launch together (her call 18 Nov 2026: one launch, all 7).
const LAUNCH_PAGES = ['hush-harbor', 'psalm-nights', 'whispered-bible', 'mi-refugio', 'imagination-nights', 'morning-word', 'young-faith'];

// Rules ------------------------------------------------------------------------------------
const UI = new RegExp(`${words(banned.ui).source}|[—!]|\\p{Extended_Pictographic}`, 'iu');
const FAITH_WORDS = words(banned.faith);
// Locked 18 Nov 2026 in the App Store strings (default description, line 3); "space" in the
// UI list targets filler like "a safe space", not this sentence.
const LOCKED_UI_EXCEPTIONS = ['Each one is its own space'];
// Words that only appear when scripture is being quoted; a caption with them must declare its verse.
const COUNT = /\b\d[\d,.]*\+?\s*k?\s+(?:of (?:your|our|the)\b|people|listeners|users|members|others|readers|believers|women|families|churches|downloads|reviews|ratings)/iu;
const ARCHAIC = /\b(?:thy|thee|thou|hath|unto|maketh|leadeth|shalt|saith|ye|strengtheneth)\b|á Jehová/iu;

type Kind = 'faith' | 'mindset' | 'neutral' | 'legal' | 'body' | 'shows';
type Item = { where: string; text: string; kind: Kind };

// Truth rules for store copy and screenshot notes (legal pages may say "not real people").
function truthIssues(text: string): string[] {
  const out: string[] = [];
  // Every spoken voice in the app is made by an AI voice engine (legal/disclaimer.md), so store
  // copy never calls a voice, reading or whisper "real" or "human". Legal pages may say "not real people".
  if (/\b(?:real|human)\s+(?:\p{L}+\s+)?(?:voices?|readings?|readers?|narrat\p{L}*|whisper\p{L}*|speakers?)\b/iu.test(text)) out.push('claims a real or human voice; the voices are AI');
  // No invented social proof: a count of people in a caption or screenshot needs a real feature behind it.
  if (COUNT.test(text)) out.push('invented count of people');
  return out;
}

function issues({ text, kind }: Item): string[] {
  const out: string[] = [];
  if (kind === 'shows') return truthIssues(text);
  const uiText = LOCKED_UI_EXCEPTIONS.reduce((t, locked) => t.replace(locked, ''), text);
  if (NEVER.test(text)) out.push('never-word');
  if (kind !== 'legal') out.push(...truthIssues(text));
  if (UI.test(uiText)) out.push('UI word, em dash, exclamation or emoji');
  if ((kind === 'faith' || kind === 'body' || kind === 'legal') && (MINDSET.test(text) || FAITH_WORDS.test(text))) out.push('mindset word where the God\'s Word door can see it');
  if (kind === 'mindset' && FAITH_LINK.test(text)) out.push('God\'s Word word on the Mindset page');
  if (/\bdraft\b|must be (?:confirmed|reconciled)|to be confirmed|\bTBD\b|\bTODO\b|placeholder|\bverify\b|undetermined/i.test(text)) out.push('unfinished wording');
  return out;
}

function keywordIssues(keywords: string, name: string, subtitle: string): string[] {
  const out: string[] = [];
  const list = keywords.split(',');
  const title = new Set(`${name} ${subtitle}`.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  if (Buffer.byteLength(keywords) > 100) out.push('over 100 bytes');
  if (/\s/.test(keywords)) out.push('space in the keyword field');
  if (new Set(list).size !== list.length) out.push('repeated keyword');
  for (const w of list) {
    if ([...w].length <= 2) out.push(`too short: ${w}`);
    if (title.has(w.toLocaleLowerCase())) out.push(`already in name or subtitle: ${w}`);
  }
  return out;
}

function assignmentIssues(field: string, unassigned: string[], pages: string[][]): string[] {
  const used = [...unassigned, ...pages.flat()];
  const out = field.split(',').filter(w => used.filter(u => u === w).length !== 1).map(w => `keyword not on exactly one page: ${w}`);
  return out.concat(used.filter(w => !field.split(',').includes(w)).map(w => `assigned but not in the keyword field: ${w}`));
}

const stored = (ref: string, tr: string) => verses(ref, tr).map((v: { text: string }) => v.text).join(' ');
function scriptureIssues(ref: string, tr: string, shown: string, whole: boolean): string[] {
  let text: string;
  try { text = stored(ref, tr); } catch { return [`unknown reference ${ref} ${tr}`]; }
  return (whole ? text === shown : text.includes(shown)) ? [] : [`${ref} ${tr} differs from the stored text`];
}

const SDKS = /sentry|bugsnag|crashlytics|firebase|amplitude|mixpanel|segment|posthog|appsflyer|adjust|branch|datadog|facebook|google-mobile-ads|admob|newrelic|instabug/i;
const diagnosticsIssues = (label: string, deps: string[]) =>
  /^\| Diagnostics[^\n]*\| Not collected/m.test(label) ? deps.filter(d => SDKS.test(d)).map(d => `label says Diagnostics not collected but ${d} is a dependency`) : [];

const disclosureIssues = (policy: string, names: string[]) => names.filter(n => !policy.includes(n)).map(n => `AI provider not named: ${n}`);

// Reading the store files ------------------------------------------------------------------
type Page = { slug: string; text: string; door: string; captions: [number, string][]; keywords: string[]; locale: string };
const pageFiles = readdirSync(join(ROOT, 'store/custom')).filter(f => f.endsWith('.md'));
const pages: Page[] = pageFiles.map(file => {
  const text = read(`store/custom/${file}`);
  return {
    slug: file.replace(/\.md$/, ''), text, door: field(text, 'Door') ?? '',
    captions: [1, 2, 3].map(n => [n, field(text, `Screenshot ${n}`) ?? ''] as [number, string]),
    keywords: (field(text, 'Keywords assigned') ?? '').split(',').filter(Boolean),
    locale: (field(text, 'Keywords locale') ?? '').slice(0, 5),
  };
});
const storeConfig = JSON.parse(read('site/config/store.json'));
const esLegal = esListingLegal(storeConfig.es_listing_spanish_legal);
const listings = { 'en-US': read('store/listing-en.md'), 'es-MX': read('store/listing-es.md') };
// Google Play has one default listing (no custom pages), so its text is checked like the App Store's neutral lines.
const play = read('store/google-play/listing-en.md');
const playFields = { title: field(play, 'Title') ?? '', short: field(play, 'Short description') ?? '', full: play.split('Full description:\n')[1]?.trim() ?? '' };
const events = read('store/events.md').split(/^## /m).slice(1).map(block => ({ name: block.split('\n')[0].trim(), block }));
const legal = ['privacy', 'terms', 'disclaimer'].map(name => ({ name, text: read(`legal/${name}.md`) }));

function visibleItems(): Item[] {
  const items: Item[] = [];
  for (const [locale, text] of Object.entries(listings)) {
    for (const key of ['Name', 'Subtitle', 'Promotional text']) items.push({ where: `${locale} ${key}`, text: field(text, key) ?? '', kind: 'neutral' });
    const first3 = text.split('Description first 3 lines:\n')[1]?.split('\n\n')[0] ?? '';
    items.push({ where: `${locale} description first 3 lines`, text: first3, kind: 'neutral' });
    items.push({ where: `${locale} description body`, text: text.split('Description body:\n')[1] ?? '', kind: 'body' });
  }
  for (const p of pages) {
    const kind: Kind = p.door === 'Mindset' ? 'mindset' : 'faith';
    items.push({ where: `${p.slug} title`, text: p.text.split('\n')[0].replace(/^# /, ''), kind });
    items.push({ where: `${p.slug} promotional text`, text: field(p.text, 'Promotional text') ?? '', kind });
    for (const [n, caption] of p.captions) items.push({ where: `${p.slug} screenshot ${n}`, text: caption, kind });
    for (const [n] of p.captions) { const shows = field(p.text, `Screenshot ${n} shows`); if (shows) items.push({ where: `${p.slug} screenshot ${n} shows`, text: shows, kind: 'shows' }); }
  }
  for (const e of events) {
    items.push({ where: `event ${e.name}`, text: e.name, kind: 'faith' });
    for (const key of ['Short description', 'Long description', 'Name es-MX']) {
      const text = field(e.block, key);
      if (text) items.push({ where: `event ${e.name} ${key}`, text, kind: 'faith' });
    }
  }
  items.push({ where: 'Play title', text: playFields.title, kind: 'neutral' }, { where: 'Play short description', text: playFields.short, kind: 'neutral' }, { where: 'Play full description', text: playFields.full, kind: 'neutral' });
  for (const l of legal) items.push({ where: `legal/${l.name}.md`, text: l.text, kind: 'legal' });
  items.push({ where: 'store/privacy-label.md', text: read('store/privacy-label.md'), kind: 'legal' });
  return items;
}

// Tests ------------------------------------------------------------------------------------
test('each rule catches its bad line and passes a clean one', () => {
  assert.ok(issues({ where: 'f', text: 'Fall asleep to the law of assumption', kind: 'faith' }).length);
  assert.ok(issues({ where: 'f', text: 'A whispered universe for sleep', kind: 'faith' }).length);
  assert.ok(issues({ where: 'm', text: 'Fall asleep with God', kind: 'mindset' }).length);
  assert.ok(issues({ where: 'm', text: 'A psalm before bed', kind: 'mindset' }).length);
  assert.ok(issues({ where: 'n', text: 'Black Bible Stories every day', kind: 'neutral' }).length);
  assert.ok(issues({ where: 'n', text: 'Sleep better — tonight', kind: 'neutral' }).length);
  assert.ok(issues({ where: 'n', text: 'Sleep tonight!', kind: 'neutral' }).length);
  assert.ok(issues({ where: 'l', text: 'Draft: must be confirmed before publication', kind: 'legal' }).length);
  assert.ok(issues({ where: 'm', text: 'A real voice, and no quiz before you start.', kind: 'mindset' }).length);
  assert.ok(issues({ where: 'n', text: 'Read by a human voice', kind: 'neutral' }).length);
  assert.deepEqual(issues({ where: 'm', text: 'A calm voice, and no quiz before you start.', kind: 'mindset' }), []);
  assert.ok(issues({ where: 'f', text: 'Real whispered readings of the Psalms', kind: 'faith' }).length);
  assert.ok(issues({ where: 'f', text: 'Psalms read by a real human narrator', kind: 'faith' }).length);
  assert.deepEqual(issues({ where: 'f', text: 'Real questions, plain answers', kind: 'faith' }), []);
  assert.ok(issues({ where: 'f', text: 'Today with "12 of your group did today\'s story"', kind: 'faith' }).length);
  assert.ok(issues({ where: 'n', text: 'Loved by 10,000 listeners', kind: 'neutral' }).length);
  assert.deepEqual(issues({ where: 'f', text: 'A 3-minute story, every day', kind: 'faith' }), []);
  assert.deepEqual(issues({ where: 'f', text: 'Fall asleep to whispered Psalms', kind: 'faith' }), []);
  assert.deepEqual(issues({ where: 'm', text: 'Fall asleep inside the scene you hope for', kind: 'mindset' }), []);
  assert.ok(keywordIssues('x'.repeat(101), 'Peace Be Still', 'Whispered sleep').length);
  assert.ok(keywordIssues('bible, prayer', 'Peace Be Still', 'Whispered sleep').length);
  assert.ok(keywordIssues('bible,bible', 'Peace Be Still', 'Whispered sleep').length);
  assert.ok(keywordIssues('sleep,bible', 'Peace Be Still', 'Whispered sleep').length);
  assert.ok(keywordIssues('ab,bible', 'Peace Be Still', 'Whispered sleep').length);
  assert.deepEqual(keywordIssues('bible,prayer', 'Peace Be Still', 'Whispered sleep'), []);
  assert.ok(assignmentIssues('black,kids', [], [['black'], ['black', 'kids']]).length);
  assert.ok(assignmentIssues('black,kids', [], [['black']]).length);
  assert.deepEqual(assignmentIssues('black,kids', ['kids'], [['black']]), []);
  const mark = stored('MAR 4:39', 'KJV');
  assert.deepEqual(scriptureIssues('MAR 4:39', 'KJV', mark, true), []);
  assert.ok(scriptureIssues('MAR 4:39', 'KJV', mark.replace('Peace, be still', 'Be still, peace'), true).length);
  assert.ok(diagnosticsIssues('| Diagnostics (crash) | Not collected |', ['@sentry/react-native']).length);
  assert.deepEqual(diagnosticsIssues('| Diagnostics (crash) | Not collected |', ['expo']), []);
  assert.ok(disclosureIssues('Cloudflare Workers AI only', ['Cloudflare Workers AI', 'Google Gemini (free tier)']).length);
});

test('every visible store string and legal page passes the door, brand and UI rules', () => {
  const items = visibleItems();
  assert.ok(items.length >= 60, `read only ${items.length} strings`);
  assert.ok(items.every(i => i.text.trim()), items.filter(i => !i.text.trim()).map(i => i.where).join(', '));
  const found = items.flatMap(i => issues(i).map(x => `${i.where}: ${x}`));
  assert.deepEqual(found, []);
});

test('all 7 launch pages exist with every field, and no mindset page or event reaches the faith side', () => {
  for (const slug of LAUNCH_PAGES) {
    const page = pages.find(p => p.slug === slug);
    assert.ok(page, `missing store/custom/${slug}.md`);
    for (const key of ['Door', 'Deep link', 'Keywords locale', 'Keywords assigned', 'Promotional text', 'Screenshot 1', 'Screenshot 2', 'Screenshot 3']) assert.ok(field(page.text, key), `${slug}: ${key}`);
    assert.match(field(page.text, 'Deep link')!, /^https:\/\/peacebestillapp\.com\/open\/[a-z-]+$/);
    assert.ok([...(field(page.text, 'Promotional text') ?? '')].length <= 170, `${slug}: promotional text over 170`);
  }
  const mindset = pages.filter(p => p.door === 'Mindset');
  assert.deepEqual(mindset.map(p => p.slug), ['imagination-nights']);
  assert.ok(pages.filter(p => p.door !== 'Mindset').every(p => !/imagination-nights/.test(field(p.text, 'Deep link')!)));
  assert.ok(events.length > 0 && events.every(e => field(e.block, 'Door') === "God's Word"), 'every event is on the God\'s Word side');
  for (const e of events) {
    assert.ok([...e.name].length <= 30, `${e.name}: name over 30`);
    assert.ok([...(field(e.block, 'Short description') ?? '')].length <= 50, `${e.name}: short over 50`);
    assert.ok([...(field(e.block, 'Long description') ?? '')].length <= 120, `${e.name}: long over 120`);
  }
});

test('listings have every App Store field, the subscription disclosures and the links Apple requires', () => {
  for (const [locale, text] of Object.entries(listings)) {
    for (const key of ['Name', 'Subtitle', 'Keywords', 'Promotional text', 'Category', 'Age rating', 'Privacy policy URL', 'Terms of use \\(EULA\\) URL']) assert.ok(field(text, key), `${locale}: ${key}`);
    assert.ok([...field(text, 'Name')!].length <= 30 && [...field(text, 'Subtitle')!].length <= 30, `${locale}: name or subtitle over 30`);
    assert.ok([...field(text, 'Promotional text')!].length <= 170, `${locale}: promotional text over 170`);
    const body = text.split('Description body:\n')[1] ?? '';
    assert.ok([...text.split('Description first 3 lines:\n')[1]].length <= 4000, `${locale}: description over 4000`);
    const legalLinks = locale === 'es-MX' ? [esLegal['Privacy policy URL'], esLegal.body.split(' · ')[0].split(': ')[1]] : ['https://peacebestillapp.com/privacy', 'https://peacebestillapp.com/terms'];
    for (const link of legalLinks) assert.ok(body.includes(link), `${locale}: legal link ${link}`);
    assert.match(body, /\b(?:AI|IA)\b[^\n]*\b(?:providers|proveedores)\b/, `${locale}: AI disclosure`);
    assert.doesNotMatch(body, /\$\s?\d/, `${locale}: prices are Apple's to show per storefront`);
  }
});

test('the Google Play listing fits Play\'s limits and promises nothing the Android build lacks', () => {
  assert.equal(playFields.title, 'Peace Be Still');
  assert.ok([...playFields.short].length > 20 && [...playFields.short].length <= 80, `short description ${[...playFields.short].length}/80`);
  assert.ok([...playFields.full].length > 500 && [...playFields.full].length <= 4000, `full description ${[...playFields.full].length}/4000`);
  // Android buys through Google Play and has no private first chat (that needs Apple's DeviceCheck).
  const shown = Object.values(playFields).join('\n');
  assert.doesNotMatch(shown, /\bApple\b|App Store|iPhone|first chat is private|tap your name/);
  assert.match(playFields.full, /Google Play/);
  assert.match(playFields.full, /https:\/\/peacebestillapp\.com\/privacy/);
  // Same free and paid numbers the app enforces.
  assert.match(playFields.full, new RegExp(`up to ${FREE_CHAT_MESSAGES} messages`));
  assert.match(playFields.full, new RegExp(`up to ${PAID_CHAT_MESSAGES} messages a day`));
});

test('the es-MX listing links the legal pages its one switch names (site/config/store.json)', () => {
  assert.equal(typeof storeConfig.es_listing_spanish_legal, 'boolean');
  const text = listings['es-MX'];
  for (const key of ['Privacy policy URL', 'Terms of use (EULA) URL'] as const) assert.equal(field(text, key.replace(/[()]/g, '\\$&')), esLegal[key], key);
  assert.ok(text.split('\n').includes(esLegal.body), `es-MX: the legal line must read "${esLegal.body}"`);
  assert.equal(/\(en inglés\)/.test(text), !storeConfig.es_listing_spanish_legal, 'es-MX: "(en inglés)" only while the switch is off');
});

test('keyword fields are valid and each keyword belongs to exactly one page', () => {
  let checked = 0;
  for (const [locale, text] of Object.entries(listings)) {
    const kw = field(text, 'Keywords')!;
    assert.deepEqual(keywordIssues(kw, field(text, 'Name')!, field(text, 'Subtitle')!), [], locale);
    const unassigned = (field(text, 'Unassigned keywords') ?? '').split(',').filter(Boolean);
    assert.deepEqual(assignmentIssues(kw, unassigned, pages.filter(p => p.locale === locale).map(p => p.keywords)), [], locale);
    checked += kw.split(',').length;
  }
  assert.ok(checked > 0);
});

test('every scripture shown on a store asset equals the stored KJV or RV1909 text', () => {
  const lines = read('store/scripture.md').split('\n').filter(l => /^[1-4A-Z]{3} \d+:\d+(?:-\d+)? \| /.test(l));
  assert.ok(lines.length > 0);
  const found = lines.flatMap(l => { const [ref, tr, shown] = l.split(' | '); return scriptureIssues(ref, tr, shown, true); });
  for (const p of pages) for (const [n, caption] of p.captions) {
    const quote = field(p.text, `Screenshot ${n} quotes`);
    if (quote) { const [ref, tr] = [quote.slice(0, quote.lastIndexOf(' ')), quote.slice(quote.lastIndexOf(' ') + 1)]; found.push(...scriptureIssues(ref, tr, caption, false)); }
    else if (ARCHAIC.test(caption)) found.push(`${p.slug} screenshot ${n}: quotes scripture without a "quotes" reference`);
  }
  assert.deepEqual(found, []);
});

test('the privacy policy names every AI provider on the chat ladder', () => {
  assert.ok(providers.length > 0);
  assert.deepEqual(disclosureIssues(read('legal/privacy.md'), providers.map((p: { disclosedAs: string }) => p.disclosedAs)), []);
});

// A reminder or notification promise (EN or ES). Figurative use ("as a reminder of what God said") is not a promise.
const REMINDER = /\b(?:reminders?\s+(?:a|each|every|per)\s+(?:day|morning)|daily\s+reminders?|gentle\s+reminders?|push\s+notifications?|notifications?\b|recordatorios?\s+(?:suaves?\s+)?(?:al|cada|por)\s+(?:día|mañana)|recordatorios?\s+diarios?|recordatorios?\s+suaves?|notificaci\p{L}*)/iu;
function reminderPromises(files: { where: string; text: string }[], deps: string[]): string[] {
  if (deps.includes('expo-notifications')) return [];
  return files.filter(f => REMINDER.test(f.text)).map(f => `${f.where} promises a reminder, but the app sends no notifications`);
}
const walk = (dir: string, ext: RegExp): string[] => readdirSync(join(ROOT, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(join(dir, e.name), ext) : ext.test(e.name) ? [join(dir, e.name)] : []);

test('no store, site or legal text promises a reminder the app does not send', () => {
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  // The rule itself: a promise fails without a notification library, figurative use passes, the library clears it.
  assert.equal(reminderPromises([{ where: 'x', text: 'One gentle reminder a day at most.' }], []).length, 1);
  assert.equal(reminderPromises([{ where: 'x', text: 'con un solo recordatorio suave al día' }], []).length, 1);
  assert.equal(reminderPromises([{ where: 'x', text: 'A declaration speaks God\'s Word, as a reminder of what is true.' }], []).length, 0);
  assert.equal(reminderPromises([{ where: 'x', text: 'One gentle reminder a day at most.' }], ['expo-notifications']).length, 0);
  const files = [...walk('store', /\.md$/), ...walk('legal', /\.md$/), ...walk('site/content', /\.mjs$/)].map(where => ({ where, text: read(where) }));
  assert.ok(files.length > 20, 'the scan reads the store, legal and site files');
  assert.deepEqual(reminderPromises(files, deps), []);
});

test('the privacy label matches the dependencies: no crash, analytics or ad SDK', () => {
  assert.deepEqual(diagnosticsIssues(read('store/privacy-label.md'), Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })), []);
});

test('legal pages are finished: effective date, operator, contact and Apple terms', () => {
  for (const { name, text } of legal) {
    assert.match(text, /^Effective: [A-Z][a-z]+ \d{1,2}, 20\d\d$/m, `${name}: effective date`);
    assert.match(text, /info@peacebestillapp\.com/, `${name}: contact`);
    assert.match(text, /Spry Labs/, `${name}: operator`);
  }
  const terms = legal.find(l => l.name === 'terms')!.text;
  assert.match(terms, /apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula/);
  assert.match(terms, /third-party beneficiar/);
  assert.match(terms, /^## Governing law/m);
});

test('the App Store Connect dry run prints the plan from the shared constants and cannot reach a network', () => {
  const source = read('scripts/asc-dry-run.mjs');
  const imports = [...source.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map(m => m[1]);
  assert.deepEqual(imports.sort(), ['../app/src/config/products.json', '../worker/src/providers.mjs']);
  assert.doesNotMatch(source, /\bfetch\s*\(|require\s*\(|import\s*\(|node:(?:http|https|net|tls|fs|child_process)/);
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts/asc-dry-run.mjs')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const plan = JSON.parse(run.stdout);
  assert.deepEqual(plan.products.map((p: { productId: string }) => p.productId), [products.products.monthly.id, products.products.yearly.id]);
  assert.ok(plan.products.every((p: { productId: string }) => p.productId.startsWith('com.peacebestillapp.mobile.')));
  assert.equal(plan.introductoryOffer, 'none');
  assert.equal(plan.revenueCat.entitlement, 'paid');
  assert.ok(plan.availability.excludedTerritories.includes('GBR') && plan.availability.excludedTerritories.includes('CHE'));
  assert.ok(plan.availability.excludedTerritories.includes('CHN'), 'China mainland is excluded (religious content permit, AIGC rules)');
});

// The iOS build image is pinned (review 21 Nov 2026): the simulator build was proven on Xcode 26.6
// (GitHub run 44945173301) and failed on Xcode 16.4; EAS's `latest`/`sdk-58` is Xcode 27.1, which
// needs the UIKit scene life cycle. Image names from docs.expo.dev/build-reference/infrastructure (read 21 Nov 2026).
test('every EAS build profile pins the iOS image to the proven Xcode 26.6 image', () => {
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8')) as { build: Record<string, { ios?: { image?: string } }> };
  const profiles = Object.entries(eas.build);
  assert.ok(profiles.length >= 3 && 'production' in eas.build, 'no build profiles read');
  for (const [name, profile] of profiles) assert.equal(profile.ios?.image, 'macos-tahoe-26.5-xcode-26.6', `${name}: iOS image not pinned`);
});
