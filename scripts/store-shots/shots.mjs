// App Store screenshots for Peace Be Still, 6.9" (1320x2868, APP_IPHONE_67) and 6.5" (1284x2778, APP_IPHONE_65),
// for every store language (en-US, es-MX, ko, zh-Hans, zh-Hant) plus the Imagination Nights custom page's
// "Write your own night" shot. Each screen is the real app from a main web preview (the same commit as the store
// build), captured at 390x800 @3x in a phone locale and region, then set under its caption in the brand's type.
// Two calls are answered here, never invented by the app: the token and one "Write your own night" moment. The
// moment is a real model output saved from the 27 Nov 2026 prompt run (~/Work/tasks/logs/own-night-a2-r2/ok-son-exam.json).
// The wish typed to get there is our own paraphrase, never the test fixture's words: those stay encrypted
// (scripts/check-encrypted.mjs COPY), and the wish is not on the final screen.
// With --play it renders the Google Play custom store listings instead (store/google-play/custom/<page>.md): each
// listing's phone shots at Play's own 1080x1920 from the same kind of raw screen (never an App Store PNG resized), its
// 1024x500 feature graphic and the 512x512 icon. Play shots show only what the Android build shows: no price screen
// (the web preview prints Apple's billing words there) and no "My voice" (recording is iPhone only, canRecord()).
// Usage: PW_DIR=<dir with playwright-core> node scripts/store-shots/shots.mjs <preview url> <out dir> [--play]
// Output: <out>/<locale>/<DISPLAY_TYPE>/NN-key.png (the layout pbs-submit reads) and <out>/custom/..., plus
// <out>/shots.json (every screen's visible text). --play: <out>/<page>/<locale>/phone/NN-key.png,
// <out>/<page>/<locale>/feature-graphic.png, <out>/icon-512.png and <out>/shots.json.
// Exits 1 (NAMED STOP STORE_SHOTS_BAD) on a missing line, an error screen, a preview label left on screen, an
// iPhone-only word on a Play shot, a caption or feature-graphic line that does not fit, or a page error.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const [BASE, OUT_ARG, MODE] = process.argv.slice(2);
if (!/^https:\/\//.test(BASE ?? '') || !OUT_ARG || (MODE && MODE !== '--play')) { console.error('usage: node scripts/store-shots/shots.mjs <preview url> <out dir> [--play]'); process.exit(2); }
const PLAY = MODE === '--play';
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
const PHONE = { 'en-US': 'en-US', 'es-MX': 'es-MX', 'es-US': 'es-US', ko: 'ko-KR', 'zh-Hans': 'zh-SG', 'zh-Hant': 'zh-TW' };
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

// Google Play custom store listings (store/google-play/custom/<page>.md), from the screens of each page's approved
// App Store set less its price screen. Captions are true of the Android build. `tap` opens a shelf, `scroll` brings
// a line near the top (`gap` px below it, or 'end': the list scrolled to its end), `hour` is the phone's hour (Today changes with it), `noRecording` drops the voice choice the
// Android build never shows (Screen.tsx recordingAllowed: canRecord() is iPhone only).
const PSALM_23_ES = PSALM_23['es-MX'];
const S = {
  hush: SETTINGS['en-US'],
  plain: { door: 'faith', ...adult, voice: 'plain', language: 'en', journey: 'psalm-nights' },
  morning: { door: 'faith', ...adult, voice: 'plain', language: 'en', journey: 'morning-word' },
  teen: { door: 'faith', age: 'teen', ageSetAt: 0, voice: 'teen', language: 'en', journey: 'young-faith' },
  es: SETTINGS['es-MX'],
  esPsalms: { ...SETTINGS['es-MX'], journey: 'psalm-nights' },
  mindset: { door: 'mindset', ...adult, voice: 'plain', language: 'en', journey: 'living-in-the-end' },
};
const DROWSY = '/listen/f63df26bb96b9b7169afe5a0d76db715d7f03f8d96226ea33645be49f828bde2';
const P = (page, locale, settings, list) => list.map(([n, key, route, scheme, caption, must, extra = {}]) => ({ play: page, locale, settings, n, key, route, scheme, caption, must, ...extra }));
const PLAY_SHOTS = [
  ...P('grief', 'en-US', S.plain, [
    ['01', 'grief', '/grief', 'light', 'For when you’ve lost someone', "For when you've lost someone"],
    ['02', 'verses', '/grief', 'light', 'A verse, and a few quiet words to say', 'Jesus wept', { scroll: 'Jesus wept' }],
    ['03', 'alone', '/grief', 'light', 'You do not have to carry this alone', 'the Father of mercies', { scroll: 'the Father of mercies', gap: 24 }],
    ['04', 'today', '/today', 'light', 'Find it any day, from Today', 'lost someone', { scroll: 'More for today', gap: 'end' }],
  ]),
  ...P('grief', 'es-US', S.es, [
    ['01', 'grief', '/grief', 'light', 'Para cuando has perdido a alguien', 'Para cuando has perdido a alguien'],
    ['02', 'verses', '/grief', 'light', 'Un versículo y unas palabras para decir', 'Y lloró Jesús', { scroll: 'Y lloró Jesús' }],
    ['03', 'alone', '/grief', 'light', 'No tienes que cargar esto a solas', 'Padre de misericordias', { scroll: 'Padre de misericordias', gap: 24 }],
    ['04', 'today', '/today', 'light', 'Encuéntralo cualquier día, desde Hoy', 'Para cuando has perdido a alguien', { scroll: 'Más para hoy', gap: 'end' }],
  ]),
  ...P('hush-harbor', 'en-US', S.hush, [
    ['01', 'story', '/today/story', 'light', 'A new Bible story every day', 'Retold with AI help'],
    ['02', 'stories', '/nights', 'dark', 'Bible stories told in a Black church voice', 'Hush Harbor', { tap: ['Hush Harbor · Black Bible Chat & Stories'], scroll: 'Hush Harbor · Black Bible Chat & Stories', gap: 16 }],
    ['03', 'bible', BIBLE_23, 'light', 'Every verse word for word, King James', 'my shepherd'],
    ['04', 'night', PSALM_23['en-US'], 'dark', 'Fall asleep to whispered Psalms', 'my shepherd'],
  ]),
  ...P('mi-refugio', 'es-US', S.es, [
    ['01', 'night', PSALM_23_ES, 'dark', 'Salmos susurrados para dormir', 'JEHOVÁ es mi pastor'],
    ['02', 'bible', BIBLE_23, 'light', 'Reina-Valera 1909, palabra por palabra', 'JEHOVÁ es mi pastor'],
    ['03', 'declaration', '/today/declaration', 'light', 'Una palabra para la mañana', 'Declaración diaria', { hour: '7' }],
    ['04', 'stories', '/nights', 'dark', 'Historias de la Biblia, en español', 'Mi Refugio', { tap: ['Mi Refugio'] }],
  ]),
  ...P('young-faith', 'en-US', S.teen, [
    ['01', 'story', '/today/story', 'light', 'A short Bible story, every day', 'Retold with AI help'],
    ['02', 'declaration', '/today/declaration', 'light', 'A declaration for the day', 'Daily declaration', { hour: '7' }],
    ['03', 'bible', BIBLE_23, 'light', 'The whole King James Bible, free to read', 'my shepherd'],
  ]),
  ...P('imagination-nights', 'en-US', S.mindset, [
    ['01', 'night', DROWSY, 'dark', 'Fall asleep inside the scene you hope for', 'The Drowsy Moment'],
    ['02', 'own-night', '/own-night?paid=1', 'dark', 'Write your own night (paid, 18+). Fall asleep to it.', 'Every word is yours to change', { wish: 'my son calling to tell me about his new hospital job', noRecording: true }],
    ['03', 'nights', '/nights', 'dark', 'Whispered night sessions, one for each night', 'The Drowsy Moment', { tap: ['Imagination Nights'] }],
  ]),
  ...P('morning-word', 'en-US', S.morning, [
    ['01', 'declaration', '/today/declaration', 'light', 'One verse. One thing to say out loud.', 'Daily declaration', { hour: '7' }],
    ['02', 'today', '/today', 'light', 'A word for each morning', 'Open declaration', { hour: '7' }],
    ['03', 'bible', BIBLE_23, 'light', 'The whole King James Bible, free to read', 'my shepherd', { hour: '7' }],
  ]),
  ...P('psalm-nights', 'en-US', S.plain, [
    ['01', 'night', PSALM_23['en-US'], 'dark', 'Fall asleep to the Psalms, whispered', 'my shepherd'],
    ['02', 'psalms', '/nights', 'dark', 'A whispered Psalm for each night', 'Psalm 1', { tap: ['Psalm Nights'] }],
    ['03', 'bible', BIBLE_23, 'dark', 'The whole King James Bible, free to read', 'my shepherd'],
  ]),
  ...P('psalm-nights', 'es-US', S.esPsalms, [
    ['01', 'night', PSALM_23_ES, 'dark', 'Salmos susurrados para dormir', 'JEHOVÁ es mi pastor'],
    ['02', 'psalms', '/nights', 'dark', 'Un Salmo susurrado para cada noche', 'Salmo 1', { tap: ['Salmos para dormir'] }],
    ['03', 'bible', BIBLE_23, 'dark', 'Toda la Reina-Valera 1909, gratis para leer', 'JEHOVÁ es mi pastor'],
  ]),
  ...P('whispered-bible', 'en-US', S.plain, [
    ['01', 'night', PSALM_23['en-US'], 'dark', 'Scripture, whispered close', 'my shepherd'],
    ['02', 'psalms', '/nights', 'dark', 'No ads. A whispered Psalm for each night.', 'Psalm 1', { tap: ['Psalm Nights'] }],
    ['03', 'bible', BIBLE_23, 'dark', 'Read along in the King James Bible', 'my shepherd'],
  ]),
];
// Each listing's 1024x500 feature graphic: its name and one line, on the night tile of the app icon. God's Word
// pages carry the dawn line; the Mindset page uses still water only (design-every-tongue).
const FEATURE = {
  'grief en-US': ['For when you’ve lost someone', 'Verses from the King James Bible for the days and nights after a loss'],
  'grief es-US': ['Para cuando has perdido a alguien', 'Versículos de la Reina-Valera 1909 para los días y las noches después de una pérdida'],
  'hush-harbor en-US': ['Hush Harbor · Black Bible Chat & Stories', 'Bible stories and chat in a Black church voice, every verse King James'],
  'mi-refugio es-US': ['Mi Refugio · Biblia y Chat en Español', 'La Reina-Valera 1909 completa, gratis para leer'],
  'young-faith en-US': ['Young Faith · Bible for Teens', 'For ages 13 to 17: a short Bible story and a declaration every day'],
  'imagination-nights en-US': ['Imagination Nights', 'Fall asleep inside the scene you hope for'],
  'morning-word en-US': ['Morning Word · Daily Declarations', 'One verse, one thing to say out loud and a short prayer'],
  'psalm-nights en-US': ['Psalm Nights · Psalms for Sleep', 'Whispered Psalms from the King James Bible'],
  'psalm-nights es-US': ['Salmos para dormir', 'Salmos susurrados de la Reina-Valera 1909'],
  'whispered-bible en-US': ['Whispered Bible for Sleep', 'Scripture, whispered close. No ads.'],
};
// Words a Play shot must never show: Apple's billing and account words, and the recording Android cannot make.
const NOT_ON_ANDROID = /\bApple\b|App Store|iPhone|Restore Purchases|Restaurar compras|Ask to Buy|My voice|Mi voz/;
const MARK = (line) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56"><rect width="64" height="64" rx="15" fill="#16252F"/><path d="M14 27 q6 -8 12 0 t12 0 t12 0" fill="none" stroke="#F4F0E6" stroke-opacity="0.62" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 41 H50" fill="none" stroke="${line}" stroke-width="4.5" stroke-linecap="round"/></svg>`;
const feature = (title, line, mindset, lang) => { const accent = mindset ? '#86CBC1' : '#E0A33E';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@400&family=Figtree:wght@400&family=Spline+Sans+Mono:wght@500&display=block" rel="stylesheet">
<style>html,body{margin:0;width:1024px;height:500px;background:#0E1A22;overflow:hidden}
.m{position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:18px;color:#86CBC1;font:500 17px/1 'Spline Sans Mono',monospace;letter-spacing:2.5px;text-transform:uppercase}
.b{position:absolute;left:72px;width:640px;top:50%;transform:translateY(-38%)}
.t{margin:0;color:#F4F0E6;font:400 46px/1.16 'Libre Caslon Text',Georgia,serif;letter-spacing:-0.5px;text-wrap:balance}
.r{width:88px;height:4px;border-radius:2px;background:${accent};margin:24px 0 20px}
.l{color:#A9B6BC;font:400 24px/1.4 Figtree,sans-serif;text-wrap:balance}
.w{position:absolute;right:64px;top:50%;transform:translateY(-50%)}
</style></head><body><div class="m">${MARK(accent)}<span>Peace Be Still</span></div>
<div class="b"><h1 class="t">${title.replace(" · ", "<br>")}</h1><div class="r"></div><div class="l">${line}</div></div>
<svg class="w" viewBox="10 14 44 32" width="200" height="145"><path d="M14 27 q6 -8 12 0 t12 0 t12 0" fill="none" stroke="#F4F0E6" stroke-opacity="0.32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 41 H50" fill="none" stroke="${accent}" stroke-opacity="0.85" stroke-width="3" stroke-linecap="round"/></svg></body></html>`; };
const PREVIEW_LABEL = /^(Preview|Vista previa|미리보기|预览|預覽) · /;
// TEST is the preview's own label (the TEST recording), matched as a whole word so "Testament" is not one.
const BAD = /could not be loaded|no se pudo cargar|not available here|no está disponible|\bTEST\b|\(preview\)|\(vista previa\)/i;
const T = { light: { bg: '#F4F0E6', ink: '#0E1A22', line: '#DCD5C6' }, dark: { bg: '#0E1A22', ink: '#F4F0E6', line: '#2A3B46' } };
const SIZES = [{ type: 'APP_IPHONE_67', w: 1320, h: 2868 }, { type: 'APP_IPHONE_65', w: 1284, h: 2778 }];
// Libre Caslon Text has no Hangul or Han: Korean and Chinese captions use Noto Serif in that script.
const FONT = { ko: 'Noto Serif KR', 'zh-Hans': 'Noto Serif SC', 'zh-Hant': 'Noto Serif TC' };
const fontLink = (locale) => FONT[locale]
  ? `https://fonts.googleapis.com/css2?family=${FONT[locale].replace(/ /g, '+')}:wght@500&display=block`
  : 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@400&display=block';
// Where the caption and the screen sit on a store canvas. The App Store canvas is 1320x2868, scaled down for 6.5";
// Google Play's is its own 1080x1920 (9:16), drawn from the same raw screen, never an App Store PNG resized.
const LAYOUT = {
  apple: { w: 1320, h: 2868, top: 150, side: 110, font: 84, cjkFont: 76, img: { left: 120, top: 600, w: 1080, h: 2215, r: 56 } },
  play: { w: 1080, h: 1920, top: 104, side: 80, font: 66, cjkFont: 60, img: { left: 160, top: 330, w: 760, h: 1559, r: 40 } },
};
const frame = (shot, png, size, L = LAYOUT.apple) => {
  const t = T[shot.scheme], k = Math.min(size.w / L.w, size.h / L.h), cjk = !!FONT[shot.locale];
  return `<!doctype html><html lang="${shot.locale}"><head><meta charset="utf-8"><link href="${fontLink(shot.locale)}" rel="stylesheet">
<style>html,body{margin:0;width:${size.w}px;height:${size.h}px;background:${t.bg};overflow:hidden}
.c{position:absolute;left:${(size.w - L.w * k) / 2}px;top:0;width:${L.w}px;height:${L.h}px;transform:scale(${k});transform-origin:0 0}
h1{position:absolute;top:${L.top}px;left:${L.side}px;right:${L.side}px;margin:0;text-align:center;color:${t.ink};
font:${cjk ? 500 : 400} ${cjk ? L.cjkFont : L.font}px/1.3 '${FONT[shot.locale] ?? 'Libre Caslon Text'}',Georgia,serif;letter-spacing:${cjk ? 0 : -0.5}px;text-wrap:balance;word-break:keep-all}
img{position:absolute;left:${L.img.left}px;top:${L.img.top}px;width:${L.img.w}px;height:${L.img.h}px;border-radius:${L.img.r}px;border:2px solid ${t.line};box-sizing:border-box;object-fit:cover;object-position:top}
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
const LIST = PLAY ? PLAY_SHOTS : SHOTS;
for (const shot of LIST) {
  const id = PLAY ? `${shot.play}-${shot.locale}-${shot.n}-${shot.key}` : `${shot.page ? `${shot.page}-` : ''}${shot.locale}-${shot.n}-${shot.key}`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: shot.scheme, locale: PHONE[shot.locale], timezoneId: 'America/Chicago' });
  const seed = { 'peace-be-still-settings': JSON.stringify(shot.settings ?? SETTINGS[shot.locale]), 'pbs-preview-hour': shot.hour ?? '21', 'peace-be-still-own-night-consent': 'yes' };
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
  for (const label of shot.tap ?? []) { await page.getByText(label, { exact: true }).first().click().catch((e) => errors.push(`tap "${label}": ${String(e).slice(0, 120)}`)); await settle(page); }
  // Bring the line to `gap` px below the top of its scrolling list (the card around it stays whole).
  if (shot.scroll) {
    await page.getByText(shot.scroll).first().evaluate((el, gap) => {
      el.scrollIntoView({ block: 'start' });
      for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY)) { p.scrollTop = gap === 'end' ? p.scrollHeight : p.scrollTop - gap; break; }
    }, shot.gap ?? 40).catch((e) => errors.push(`scroll "${shot.scroll}": ${String(e).slice(0, 120)}`));
    await page.waitForTimeout(800);
  }
  // The Android build has no voice choice on this screen (recording is iPhone only); the web preview offers its TEST recording.
  if (shot.noRecording) await page.evaluate(() => document.querySelector('[role=radiogroup][aria-label="Voice"]')?.parentElement?.remove());
  // The web preview prefixes the buy button with "Preview ·" (paid.previewJoin); the store build shows the action alone.
  await page.evaluate((re) => { const rx = new RegExp(re); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) n.nodeValue = n.nodeValue.replace(rx, ''); }, PREVIEW_LABEL.source);
  const png = await page.screenshot({ fullPage: false });
  writeFileSync(join(OUT, 'raw', `${id}.png`), png);
  const text = await page.evaluate(() => document.body.innerText);
  const shown = shot.wish ? text.includes(MOMENT) || (await page.locator('textarea').evaluateAll((els, m) => els.some(e => e.value === m), MOMENT)) : true;
  // A preview-only label (a sample button, a TEST line) fails only where the shot can see it: inside the viewport.
  const onScreen = await page.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const r = n.parentElement?.getBoundingClientRect(); if (r && r.bottom > 0 && r.top < innerHeight && n.nodeValue.trim()) out.push(n.nodeValue); } return out.join('\n'); });
  // The line the shot is about must be on screen, not only somewhere below the fold.
  const missing = !(PLAY ? onScreen : text).includes(shot.must) ? shot.must : !shown ? 'the moment' : null;
  const notReady = BAD.test(onScreen) ? onScreen.match(BAD)?.[0] : PLAY && NOT_ON_ANDROID.test(`${onScreen}\n${shot.caption}`) ? `${`${onScreen}\n${shot.caption}`.match(NOT_ON_ANDROID)?.[0]} (not on Android)` : null;
  if (missing || notReady || errors.length) bad.push({ id, missing, notReady, errors });
  await ctx.close();
  const targets = PLAY ? [{ dir: join(OUT, shot.play, shot.locale, 'phone'), size: LAYOUT.play, L: LAYOUT.play }]
    : SIZES.map((size) => ({ dir: shot.page ? join(OUT, 'custom', shot.page, shot.locale, size.type) : join(OUT, shot.locale, size.type), size, L: LAYOUT.apple }));
  for (const { dir, size, L } of targets) {
    mkdirSync(dir, { recursive: true });
    const fctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
    const fp = await fctx.newPage();
    await fp.setContent(frame(shot, png, size, L), { waitUntil: 'networkidle' });
    await fp.evaluate(() => document.fonts.ready);
    // A caption that runs into the screen under it is a broken shot, not a near miss.
    const fits = await fp.evaluate(() => document.querySelector('h1').getBoundingClientRect().bottom + 8 <= document.querySelector('img').getBoundingClientRect().top);
    if (!fits) bad.push({ id, missing: null, notReady: `caption does not fit above the screen (${size.w}x${size.h})`, errors: [] });
    await fp.screenshot({ path: join(dir, `${shot.n}-${shot.key}.png`), fullPage: false });
    await fctx.close();
  }
  log.push({ id, ...(PLAY ? { play: shot.play, locale: shot.locale } : {}), url: BASE + shot.route, finalUrl: page.url(), caption: shot.caption, errors, text: text.slice(0, 900), ...(PLAY ? { onScreen: onScreen.slice(0, 1500) } : {}) });
  console.log('shot', id, missing ? `MISSING "${missing}"` : notReady ? `NOT READY "${notReady}"` : errors.length ? `errors ${errors.length}` : 'clean');
}
const art = [];
if (PLAY) {
  // Feature graphics: 1024x500, no alpha. Every line has to fit inside the frame with its margins.
  for (const [key, [title, line]] of Object.entries(FEATURE)) {
    const [slug, locale] = key.split(' ');
    const fctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    const fp = await fctx.newPage();
    await fp.setContent(feature(title, line, slug === 'imagination-nights', locale), { waitUntil: 'networkidle' });
    await fp.evaluate(() => document.fonts.ready);
    const fits = await fp.evaluate(() => { const b = document.querySelector('.b').getBoundingClientRect(), m = document.querySelector('.m').getBoundingClientRect(), w = document.querySelector('.w').getBoundingClientRect(); return b.top >= m.bottom + 24 && b.bottom <= 500 - 40 && b.right <= w.left - 24; });
    if (!fits) bad.push({ id: `${slug}-${locale}-feature-graphic`, missing: null, notReady: 'feature graphic text runs past the frame', errors: [] });
    mkdirSync(join(OUT, slug, locale), { recursive: true });
    await fp.screenshot({ path: join(OUT, slug, locale, 'feature-graphic.png') });
    await fctx.close();
    art.push({ id: `${slug}-${locale}-feature-graphic`, title, line });
  }
  // The icon: the app's own icon at Play's 512x512, alpha kept (Play asks for a 32-bit PNG). Chrome drops the alpha
  // channel of an opaque picture, so macOS sips resizes it (this script runs on the Mac, with its Chrome).
  execFileSync('sips', ['-z', '512', '512', fileURLToPath(new URL('../../app/assets/icon.png', import.meta.url)), '--out', join(OUT, 'icon-512.png')], { stdio: 'ignore' });
}
await browser.close();
writeFileSync(join(OUT, 'shots.json'), JSON.stringify({ base: BASE, log, art, bad }, null, 2));
if (log.length !== LIST.length) { console.error('NAMED STOP STORE_SHOTS_SHORT'); process.exit(1); }
if (bad.length) { console.error(`NAMED STOP STORE_SHOTS_BAD ${bad.map((b) => b.id).join(' ')}`); process.exit(1); }
console.log(PLAY ? `OUTPUT ${log.length} Play screens, ${art.length} feature graphics, 1 icon` : `OUTPUT ${log.length} screens x ${SIZES.length} sizes`);
