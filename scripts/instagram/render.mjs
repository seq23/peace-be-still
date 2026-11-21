#!/usr/bin/env node
// Renders every picture in data/instagram/posts.json to site/public/social/ig/<post>-<n>.png
// (1080x1350; the Reel cover 1080x1920) with headless Chrome, and records each frame's hash in
// data/instagram/frames.lock.json so the validator can tell a picture that no longer matches its
// post (or the store state) from one that does. Only frames whose hash changed are re-rendered.
// Run after editing posts.json or after `npm run store:set`: npm run ig:render
// Chrome: $CHROME, else the Mac app, else google-chrome (preinstalled on GitHub's ubuntu runners).
// Drafts: --bank <posts.json> --out <dir> renders a draft bank (not posted, no lock file) with the
// same templates, e.g. data/drafts/diaspora-2026-12/; each post may add share-card frames in .share.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameHash, frameHtml, postFrames } from './frames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const DRAFT = Boolean(arg('--bank'));
export const OUT_DIR = arg('--out') ? path.resolve(arg('--out')) : path.join(ROOT, 'site', 'public', 'social', 'ig');
export const LOCK_FILE = DRAFT ? path.join(os.tmpdir(), `pbs-draft-lock-${process.pid}.json`) : path.join(ROOT, 'data', 'instagram', 'frames.lock.json');
const bank = JSON.parse(fs.readFileSync(arg('--bank') ? path.resolve(arg('--bank')) : path.join(ROOT, 'data', 'instagram', 'posts.json'), 'utf8'));
const live = Boolean(JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'config', 'store.json'), 'utf8')).app_store_url);
const lock = fs.existsSync(LOCK_FILE) ? JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')) : { frames: {} };
const fontsDir = path.join(ROOT, 'site', 'public', 'fonts');
const fontsCss = fs.readFileSync(path.join(fontsDir, 'fonts.css'), 'utf8').replaceAll('url(/fonts/', `url(file://${fontsDir}/`).replaceAll('font-display: swap', 'font-display: block');
const chrome = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbs-ig-'));
fs.mkdirSync(OUT_DIR, { recursive: true });
let rendered = 0;
const keep = new Set();
for (const post of bank.posts) {
  const shares = DRAFT ? (post.share ?? []).map((sh) => ({ file: `${post.id}-${sh.kind}`, frame: sh.frame })) : [];
  for (const { file, frame } of [...postFrames(post), ...shares]) {
    keep.add(file);
    const hash = frameHash(frame, post.lang, live);
    const png = path.join(OUT_DIR, `${file}.png`);
    if (lock.frames[file]?.hash === hash && fs.existsSync(png)) continue;
    if (!chrome) { console.error('NAMED STOP: CHROME_MISSING - set CHROME to a Chrome or Chromium binary'); process.exit(1); }
    const { html, h } = frameHtml(frame, { lang: post.lang, live, fontsCss });
    const src = path.join(tmp, `${file}.html`);
    fs.writeFileSync(src, html);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--window-size=${frame.w ?? 1080},${h}`, '--virtual-time-budget=6000', `--screenshot=${png}`, `file://${src}`], { stdio: 'ignore' });
    if (!fs.existsSync(png)) { console.error(`NAMED STOP: RENDER_FAILED - Chrome wrote no ${file}.png`); process.exit(1); }
    lock.frames[file] = { hash, store_live: live };
    rendered += 1;
  }
}
for (const f of Object.keys(lock.frames)) if (!keep.has(f)) delete lock.frames[f];
lock._comment = 'Written by scripts/instagram/render.mjs: the hash of each picture\'s HTML when its PNG was rendered. scripts/instagram/validate.mjs fails when a post changed without a re-render.';
if (DRAFT) fs.rmSync(LOCK_FILE, { force: true });
else fs.writeFileSync(LOCK_FILE, `${JSON.stringify({ _comment: lock._comment, frames: lock.frames }, null, 2)}\n`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`OUTPUT: rendered ${rendered} picture(s), ${keep.size} in the bank`);
