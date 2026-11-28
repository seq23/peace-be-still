// App Store screenshots for Peace Be Still, 6.9" (1320x2868, APP_IPHONE_67) and 6.5" (1284x2778, APP_IPHONE_65),
// for every store language (en-US, es-MX, ko, zh-Hans, zh-Hant) plus the Imagination Nights custom page's
// "Write your own night" shot. Each screen is the real app from a main web preview (the same commit as the store
// build), captured at 390x800 @3x in a phone locale and region, then set under its caption in the brand's type.
// Two calls are answered here, never invented by the app: the token and one "Write your own night" moment. The
// moment is a real model output saved from the 27 Nov 2026 prompt run (~/Work/tasks/logs/own-night-a2-r2/ok-son-exam.json).
// The wish typed to get there is our own paraphrase, never the test fixture's words: those stay encrypted
// (scripts/check-encrypted.mjs COPY), and the wish is not on the final screen.
// Usage: PW_DIR=<dir with playwright-core> node scripts/store-shots/shots.mjs <preview url> <out dir>
// Output: <out>/<locale>/<DISPLAY_TYPE>/NN-key.png (the layout pbs-submit reads) and <out>/custom/..., plus
// <out>/shots.json (every screen's visible text). Exits 1 (NAMED STOP STORE_SHOTS_BAD) on a missing line, an error
// screen, a preview label left on screen or a page error.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [BASE, OUT_ARG] = process.argv.slice(2);
if (!/^https:\/\//.test(BASE ?? '') || !OUT_ARG) { console.error('usage: node scripts/store-shots/shots.mjs <preview url> <out dir>'); process.exit(2); }
const OUT = resolve(OUT_ARG);
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

const adult = { age: 'adult', ageSetAt: 0 };
const SETTINGS = {
  'en-US': { door: 'faith', ...adult, voice: 'church', language: 'en', journey: 'hush-harbor' },
  'es-MX': { door: 'faith', ...adult, voice: 'spanish', language: 'es', journey: 'mi-refugio' },
  ko: { door: 'faith', ...adult, voice: 'plain', language: 'ko', journey: 'saebyeok', dawnStart: today },
  'zh-Hans': { door: 'faith', ...adult, voice: 'plain', language: 'zh-Hans', journey: 'psalm-nights' },
  'zh-Hant': { door: 'faith', ...adult, voice: 'plain', language: 'zh-Hant', journey: 'psalm-nights' },
};
// The phone the screen is seen on: its locale picks the date format, its region the crisis line.
const PHONE = { 'en-US': 'en-US', 'es-MX': 'es-MX', ko: 'ko-KR', 'zh-Hans': 'zh-SG', 'zh-Hant': 'zh-TW' };
const PSALM_23 = { 'en-US': '/listen/c10885fa4115a5242d8168a181befd093cc41b1576fe515f9665ba2e556b00df', 'es-MX': '/listen/e2a7d1e8f455d757d48a35154b722d6cbf3a7a531446f386f420dd15f8fe5b51' };
const BIBLE_23 = '/bible/chapter?book=PSA&chapter=23';
const MOMENT = "I hear Marcus' voice on the phone, his words tumbling out in excitement. My son is talking about his new job at the hospital. Marcus is making plans for us to celebrate this weekend.";

// Captions: short, plain, true of the screen under them. `must` is a line the screen has to show.
const SHOTS = [
  { locale: 'en-US', n: '01', key: 'private', route: '/paid', scheme: 'light', caption: 'Unlimited Bible chat, kept private', must: 'Private for your first 50 messages each day' },
  { locale: 'en-US', n: '02', key: 'night', route: PSALM_23['en-US'], scheme: 'dark', caption: 'Fall asleep to whispered Psalms', must: 'The LORD is my shepherd' },
  { locale: 'en-US', n: '03', key: 'grief', route: '/grief', scheme: 'light', caption: 'For when you’ve lost someone', must: "For when you've lost someone" },
  { locale: 'en-US', n: '04', key: 'mfy', route: '/made-for-you?paid=1&state=ready', scheme: 'light', caption: 'Made from what you write, with a paid plan', must: 'Made for you' },
  { locale: 'es-MX', n: '01', key: 'private', route: '/paid', scheme: 'light', caption: 'Chat bíblico ilimitado y privado', must: '50 mensajes' },
  { locale: 'es-MX', n: '02', key: 'night', route: PSALM_23['es-MX'], scheme: 'dark', caption: 'Salmos susurrados para dormir', must: 'JEHOVÁ es mi pastor' },
  { locale: 'es-MX', n: '03', key: 'grief', route: '/grief', scheme: 'light', caption: 'Para cuando has perdido a alguien', must: 'Para cuando has perdido a alguien' },
  { locale: 'es-MX', n: '04', key: 'mfy', route: '/made-for-you?paid=1&state=ready', scheme: 'light', caption: 'Hecha con lo que escribes, con un plan de pago', must: 'Para ti' },
  { locale: 'ko', n: '01', key: 'dawn', route: '/today/declaration', scheme: 'light', caption: '새벽마다 말씀 한 구절과 짧은 기도', must: '개역한글' },
  { locale: 'ko', n: '02', key: 'today', route: '/today', scheme: 'light', caption: '40일 새벽기도, 매일 새벽 한 구절', must: '새벽 말씀 열기' },
  { locale: 'ko', n: '03', key: 'bible', route: BIBLE_23, scheme: 'light', caption: '개역한글 성경 전체를 무료로', must: '여호와는 나의 목자시니' },
  { locale: 'ko', n: '04', key: 'grief', route: '/grief', scheme: 'light', caption: '사랑하는 사람을 잃은 날들에', must: '사랑하는 사람을 잃었을 때' },
  { locale: 'zh-Hans', n: '01', key: 'bible', route: BIBLE_23, scheme: 'light', caption: '整本和合本圣经，免费读', must: '耶和华是我的牧者' },
  { locale: 'zh-Hans', n: '02', key: 'today', route: '/today', scheme: 'light', caption: '每天一节经文和一句祷告', must: '今日宣告' },
  { locale: 'zh-Hans', n: '03', key: 'private', route: '/paid', scheme: 'light', caption: '无限圣经聊天，保持私密', must: '每天前 50 条消息是私密的' },
  { locale: 'zh-Hans', n: '04', key: 'grief', route: '/grief', scheme: 'light', caption: '失去亲人的日子里', must: '诗篇 34:18' },
  { locale: 'zh-Hant', n: '01', key: 'bible', route: BIBLE_23, scheme: 'light', caption: '整本和合本聖經，免費讀', must: '耶和華是我的牧者' },
  { locale: 'zh-Hant', n: '02', key: 'today', route: '/today', scheme: 'light', caption: '每天一節經文和一句禱告', must: '今日宣告' },
  { locale: 'zh-Hant', n: '03', key: 'private', route: '/paid', scheme: 'light', caption: '無限聖經聊天，保持私密', must: '每天前 50 條訊息是私密的' },
  { locale: 'zh-Hant', n: '04', key: 'grief', route: '/grief', scheme: 'light', caption: '失去親人的日子裡', must: '詩篇 34:18' },
  // Imagination Nights custom page, screenshot 2 (store/custom/imagination-nights.md): adults on the Mindset door only.
  { locale: 'en-US', page: 'imagination-nights', n: '02', key: 'own-night', route: '/own-night?paid=1', scheme: 'dark', caption: 'Write your own night (paid, 18+). Fall asleep to it.', must: 'Every word is yours to change',
    settings: { door: 'mindset', ...adult, voice: 'plain', language: 'en', journey: 'living-in-the-end' }, wish: 'my son calling to tell me about his new hospital job' },
];

const PREVIEW_LABEL = /^(Preview|Vista previa|미리보기|预览|預覽) · /;
const BAD = /could not be loaded|no se pudo cargar|not available here|no está disponible|TEST|\(preview\)|\(vista previa\)/i;
const T = { light: { bg: '#F4F0E6', ink: '#0E1A22', line: '#DCD5C6' }, dark: { bg: '#0E1A22', ink: '#F4F0E6', line: '#2A3B46' } };
const SIZES = [{ type: 'APP_IPHONE_67', w: 1320, h: 2868 }, { type: 'APP_IPHONE_65', w: 1284, h: 2778 }];
// Libre Caslon Text has no Hangul or Han: Korean and Chinese captions use Noto Serif in that script.
const FONT = { ko: 'Noto Serif KR', 'zh-Hans': 'Noto Serif SC', 'zh-Hant': 'Noto Serif TC' };
const fontLink = (locale) => FONT[locale]
  ? `https://fonts.googleapis.com/css2?family=${FONT[locale].replace(/ /g, '+')}:wght@500&display=block`
  : 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@400&display=block';
const frame = (shot, png, size) => {
  const t = T[shot.scheme], k = Math.min(size.w / 1320, size.h / 2868), cjk = !!FONT[shot.locale];
  return `<!doctype html><html lang="${shot.locale}"><head><meta charset="utf-8"><link href="${fontLink(shot.locale)}" rel="stylesheet">
<style>html,body{margin:0;width:${size.w}px;height:${size.h}px;background:${t.bg};overflow:hidden}
.c{position:absolute;left:${(size.w - 1320 * k) / 2}px;top:0;width:1320px;height:2868px;transform:scale(${k});transform-origin:0 0}
h1{position:absolute;top:150px;left:110px;right:110px;margin:0;text-align:center;color:${t.ink};
font:${cjk ? 500 : 400} ${cjk ? 76 : 84}px/1.3 '${FONT[shot.locale] ?? 'Libre Caslon Text'}',Georgia,serif;letter-spacing:${cjk ? 0 : -0.5}px;text-wrap:balance;word-break:keep-all}
img{position:absolute;left:120px;top:600px;width:1080px;height:2215px;border-radius:56px;border:2px solid ${t.line};box-sizing:border-box;object-fit:cover;object-position:top}
</style></head><body><div class="c"><h1>${shot.caption}</h1><img src="data:image/png;base64,${png.toString('base64')}"></div></body></html>`;
};
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  await page.waitForTimeout(2500);
}

mkdirSync(join(OUT, 'raw'), { recursive: true });
const require = createRequire(join(resolve(process.env.PW_DIR ?? '.'), 'node_modules', 'x.js'));
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ channel: 'chrome' });
const log = [], bad = [];
for (const shot of SHOTS) {
  const id = `${shot.page ? `${shot.page}-` : ''}${shot.locale}-${shot.n}-${shot.key}`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: shot.scheme, locale: PHONE[shot.locale], timezoneId: 'America/Chicago' });
  const seed = { 'peace-be-still-settings': JSON.stringify(shot.settings ?? SETTINGS[shot.locale]), 'pbs-preview-hour': '21', 'peace-be-still-own-night-consent': 'yes' };
  await ctx.addInitScript((entries) => {
    if (sessionStorage.getItem('__seeded')) return;
    for (const [k, v] of entries) localStorage.setItem(k, v);
    sessionStorage.setItem('__seeded', '1');
  }, Object.entries(seed));
  if (shot.wish) {
    await ctx.route('**/api/token', (r) => r.fulfill({ json: { token: 'aaaaaaaaaaaa.bbbbbbbbbbbb', installId: 'store-shot' } }));
    await ctx.route('**/api/own-night/scene', (r) => r.fulfill({ json: { kind: 'scene', scene: MOMENT, remaining: 49 } }));
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await page.goto(BASE + shot.route, { waitUntil: 'load', timeout: 60000 });
  await settle(page);
  if (shot.wish) {
    await page.getByRole('button', { name: 'Write a new night' }).click().catch(() => undefined);
    await page.getByLabel('What do you hope for?').fill(shot.wish);
    await page.getByRole('button', { name: 'Write my moment' }).click();
    await page.getByText(MOMENT.slice(0, 40)).first().waitFor({ timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
  }
  // The web preview prefixes the buy button with "Preview ·" (paid.previewJoin); the store build shows the action alone.
  await page.evaluate((re) => { const rx = new RegExp(re); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) n.nodeValue = n.nodeValue.replace(rx, ''); }, PREVIEW_LABEL.source);
  const png = await page.screenshot({ fullPage: false });
  writeFileSync(join(OUT, 'raw', `${id}.png`), png);
  const text = await page.evaluate(() => document.body.innerText);
  const shown = shot.wish ? text.includes(MOMENT) || (await page.locator('textarea').evaluateAll((els, m) => els.some(e => e.value === m), MOMENT)) : true;
  const missing = !text.includes(shot.must) ? shot.must : !shown ? 'the moment' : null;
  // A preview-only label (a sample button, a TEST line) fails only where the shot can see it: inside the viewport.
  const onScreen = await page.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const r = n.parentElement?.getBoundingClientRect(); if (r && r.bottom > 0 && r.top < innerHeight && n.nodeValue.trim()) out.push(n.nodeValue); } return out.join('\n'); });
  const notReady = BAD.test(onScreen);
  if (missing || notReady || errors.length) bad.push({ id, missing, notReady: notReady ? onScreen.match(BAD)?.[0] : null, errors });
  await ctx.close();
  for (const size of SIZES) {
    const dir = shot.page ? join(OUT, 'custom', shot.page, shot.locale, size.type) : join(OUT, shot.locale, size.type);
    mkdirSync(dir, { recursive: true });
    const fctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
    const fp = await fctx.newPage();
    await fp.setContent(frame(shot, png, size), { waitUntil: 'networkidle' });
    await fp.evaluate(() => document.fonts.ready);
    await fp.screenshot({ path: join(dir, `${shot.n}-${shot.key}.png`), fullPage: false });
    await fctx.close();
  }
  log.push({ id, url: BASE + shot.route, finalUrl: page.url(), caption: shot.caption, errors, text: text.slice(0, 900) });
  console.log('shot', id, missing ? `MISSING "${missing}"` : notReady ? `NOT READY "${onScreen.match(BAD)?.[0]}"` : errors.length ? `errors ${errors.length}` : 'clean');
}
await browser.close();
writeFileSync(join(OUT, 'shots.json'), JSON.stringify({ base: BASE, log, bad }, null, 2));
if (log.length !== SHOTS.length) { console.error('NAMED STOP STORE_SHOTS_SHORT'); process.exit(1); }
if (bad.length) { console.error(`NAMED STOP STORE_SHOTS_BAD ${bad.map((b) => b.id).join(' ')}`); process.exit(1); }
console.log(`OUTPUT ${log.length} screens x ${SIZES.length} sizes`);
