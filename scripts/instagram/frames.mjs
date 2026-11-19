// The Instagram / Facebook pictures for data/instagram/posts.json: one HTML page per frame
// (1080x1350, the Reel cover 1080x1920), rendered to PNG by scripts/instagram/render.mjs.
// Templates are the ones on the approved samples (her yes 18 Nov 2026, "yes to the IG samples").
// Verses are never typed: a { verse: 'PSA 4:8' } block reads content/bible (KJV, or RV1909 for
// lang es). Highlighted verse words are colour only, never italic (in the King James, italic
// marks words the translators added).
import crypto from 'node:crypto';
import { BOOK, bible } from '../content/lib.mjs';

export const SITE_DIR = 'social/ig';
export const BASE_URL = 'https://peacebestillapp.com';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const mark = (dark, size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${dark ? '#16252F' : '#FFFDF8'}" ${dark ? '' : 'stroke="#DCD5C6"'}/><path d="M14 27 q6 -8 12 0 t12 0 t12 0" fill="none" stroke="${dark ? '#F4F0E6' : '#0E1A22'}" stroke-opacity="${dark ? .62 : .55}" stroke-width="4.5" stroke-linecap="round"/><path d="M14 41 H50" fill="none" stroke="${dark ? '#E0A33E' : '#1D6A64'}" stroke-width="4.5" stroke-linecap="round"/></svg>`;

export const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:var(--h);overflow:hidden}
body{font-family:Figtree,sans-serif;position:relative;display:flex;flex-direction:column;padding:96px 92px 84px}
body.night{--bg:#0E1A22;--ink:#F4F0E6;--muted:#A9B6BC;--accent:#E0A33E;--raised:#16252F;--line:#2A3B46;background:var(--bg);color:var(--ink)}
body.linen{--bg:#F4F0E6;--ink:#0E1A22;--muted:#4F5B63;--accent:#1D6A64;--raised:#FFFDF8;--line:#DCD5C6;background:var(--bg);color:var(--ink)}
.label{font:500 28px 'Spline Sans Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);display:flex;justify-content:space-between;gap:24px}
.label .n{color:var(--muted);white-space:nowrap;flex:none}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px;position:relative;z-index:1}
.kicker{font:400 40px/1.3 Figtree,sans-serif;color:var(--muted)}
.title{font:400 104px/1.05 'Libre Caslon Text',serif;letter-spacing:-.01em}
.sub{font:500 46px/1.25 Figtree,sans-serif;color:var(--muted)}
.verse{font:400 var(--vs,60px)/1.38 'Libre Caslon Text',serif;text-wrap:pretty}
.verse em{font-style:normal;color:var(--accent)}
.cite{font:500 32px 'Spline Sans Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.cite span{color:var(--muted)}
.body{font:400 44px/1.4 Figtree,sans-serif}
.say{font:400 64px/1.2 'Libre Caslon Text',serif}
.list{display:flex;flex-direction:column;gap:26px;font:400 42px/1.3 Figtree,sans-serif;padding:0;list-style:none}
.list li{display:flex;gap:22px;align-items:baseline}
.list li::before{content:'';flex:none;width:28px;height:4px;border-radius:2px;background:var(--accent);transform:translateY(-10px)}
.foot{display:flex;align-items:center;gap:20px;position:relative;z-index:1;padding-top:40px}
.foot .wm{font:400 38px 'Libre Caslon Text',serif}
.foot .soon{margin-left:auto;font:500 27px 'Spline Sans Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);text-align:right;line-height:1.5}
.wave{position:absolute;left:0;right:0;bottom:250px;z-index:0;opacity:.07}
.chat{display:flex;flex-direction:column;gap:30px}
.me{align-self:flex-end;max-width:80%;background:#1D6A64;color:#fff;border-radius:40px 40px 10px 40px;padding:30px 38px;font:400 42px/1.35 Figtree,sans-serif}
.hh{align-self:flex-start;max-width:92%;background:var(--raised);border:2px solid var(--line);border-radius:40px 40px 40px 10px;padding:32px 40px;display:flex;flex-direction:column;gap:20px;font:400 40px/1.4 Figtree,sans-serif}
.hh .q{font:400 44px/1.4 'Libre Caslon Text',serif}
.hh .c{font:500 28px 'Spline Sans Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.who{font:500 26px 'Spline Sans Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:-18px}
.who.r{align-self:flex-end}
.btns{display:flex;gap:20px;flex-wrap:wrap}
.pill{background:#1D6A64;color:#fff;border-radius:999px;padding:24px 42px;font:600 38px Figtree,sans-serif}
.ghost{border:2px solid var(--line);border-radius:999px;padding:22px 40px;font:500 38px Figtree,sans-serif;color:var(--muted)}
.ai{font:500 34px/1.35 Figtree,sans-serif;color:var(--muted)}
`;
const WAVE = (dark) => `<svg class="wave" viewBox="0 0 1080 120" width="1080" height="120"><path d="M-40 70 q90 -110 180 0 t180 0 t180 0 t180 0 t180 0 t180 0 t180 0" fill="none" stroke="${dark ? '#F4F0E6' : '#0E1A22'}" stroke-width="10" stroke-linecap="round"/></svg>`;

/** One stored verse: its text, how it is cited, and the translation name. */
export function verse(ref, lang = 'en') {
  const es = lang === 'es';
  const text = bible(es ? 'RV1909' : 'KJV').get(ref);
  if (!text) throw new Error(`${ref} is not in the ${es ? 'RV1909' : 'KJV'} file`);
  const [code, cv] = ref.split(' ');
  return { ref, text, cite: `${es ? BOOK[code].es : BOOK[code].en} ${cv}`, tr: es ? 'Reina-Valera 1909' : 'King James' };
}

/** "Coming soon" on the pictures becomes "Free on iPhone" once site/config/store.json has the App Store link. */
export function storeFrameText(html, live) {
  if (!live) return html;
  return html.replace(/Coming soon<br>to iPhone/g, 'Free<br>on iPhone').replace(/Coming soon to iPhone/g, 'Free on iPhone').replace(/Muy pronto<br>en iPhone/g, 'Gratis<br>en iPhone');
}

function block(b, ctx) {
  const st = (s) => (s ? ` style="${s}"` : '');
  if ('title' in b) return `<p class="title"${st(b.size && `font-size:${b.size}px`)}>${esc(b.title)}</p>`;
  if ('sub' in b) return `<p class="sub">${esc(b.sub)}</p>`;
  if ('kicker' in b) return `<p class="kicker">${esc(b.kicker)}</p>`;
  if ('ai' in b) return `<p class="ai"${st(b.accent && 'color:var(--accent)')}>${esc(b.ai)}</p>`;
  if ('body' in b) return `<p class="body"${st(b.muted && 'color:var(--muted)')}>${esc(b.body)}</p>`;
  if ('say' in b) return `<p class="say"${st(b.size && `font-size:${b.size}px`)}>${esc(b.say)}${b.accent ? `<span style="color:var(--accent)">${esc(b.accent)}</span>` : ''}</p>`;
  if ('list' in b) return `<ul class="list">${b.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  if ('who' in b) return `<span class="who${b.right ? ' r' : ''}">${esc(b.who)}</span>`;
  if ('me' in b) return `<div class="me">${esc(b.me)}</div>`;
  if ('btns' in b) return `<div class="btns"><span class="pill">${esc(b.btns[0])}</span><span class="ghost">${esc(b.btns[1])}</span></div>`;
  if ('mark' in b) return mark(ctx.dark, b.mark);
  if ('verse' in b) {
    const x = verse(b.verse, ctx.lang);
    ctx.verses.push(b.verse);
    let t = esc(x.text);
    if (b.em) {
      if (!x.text.includes(b.em)) throw new Error(`${b.verse}: highlight "${b.em}" is not in the verse`);
      t = t.replace(esc(b.em), `<em>${esc(b.em)}</em>`);
    }
    return `<p class="verse" style="--vs:${b.size}px">“${t}”</p><p class="cite">${esc(x.cite)} <span>· ${x.tr}</span></p>`;
  }
  if ('hh' in b) {
    return `<div class="hh">${b.hh.map((p) => {
      if (typeof p === 'string') return `<span>${esc(p)}</span>`;
      const x = verse(p.verse, ctx.lang);
      ctx.verses.push(p.verse);
      return `<span class="q">“${esc(x.text)}”</span><span class="c">${esc(x.cite)} · ${x.tr}</span>`;
    }).join('')}</div>`;
  }
  throw new Error(`unknown frame block ${JSON.stringify(b)}`);
}

/** One frame spec -> { html, verses, h }. fontsCss is the @font-face CSS (absolute file URLs when rendering). */
export function frameHtml(frame, { lang = 'en', live = false, fontsCss = '' } = {}) {
  const dark = frame.theme === 'night';
  const ctx = { dark, lang, verses: [] };
  const h = frame.h ?? 1350;
  const label = `<div class="label"><span>${esc(frame.label)}</span>${frame.n ? `<span class="n">${esc(frame.n)}</span>` : ''}</div>`;
  const main = `<div class="main${frame.chat ? ' chat' : ''}"${frame.mainStyle ? ` style="${frame.mainStyle}"` : ''}>${frame.blocks.map((b) => block(b, ctx)).join('')}</div>`;
  const foot = frame.foot && !Array.isArray(frame.foot) && frame.foot.only
    ? `<div class="foot"><span class="soon" style="margin-left:0;text-align:left">${esc(frame.foot.only)}</span></div>`
    : `<div class="foot">${mark(dark, 64)}<span class="wm">Peace Be Still</span><span class="soon">${(frame.foot ?? ['Coming soon', 'to iPhone']).map(esc).join('<br>')}</span></div>`;
  const inner = `${label}${main}${frame.wave ? WAVE(dark) : ''}${foot}`;
  const html = storeFrameText(`<!doctype html><html><head><meta charset="utf-8"><style>:root{--h:${h}px}\n${fontsCss}${CSS}${frame.css ?? ''}</style></head><body class="${frame.theme}">${inner}</body></html>`, live);
  return { html, verses: ctx.verses, h };
}

/** Every picture file a post needs: [{ file, frame }] (the Reel cover included). */
export function postFrames(post) {
  const out = post.frames.map((frame, i) => ({ file: `${post.id}-${i + 1}`, frame }));
  if (post.reel) out.push({ file: `${post.id}-reel`, frame: { ...post.reel.cover, h: 1920 } });
  return out;
}

/** What the lock records for a frame: the HTML without fonts, so a changed picture needs a re-render. */
export const frameHash = (frame, lang, live) => crypto.createHash('sha256').update(frameHtml(frame, { lang, live }).html).digest('hex').slice(0, 16);

/** The visible words of a frame, for alt text and the content checks. */
export function frameText(frame, lang = 'en', live = false) {
  return frameHtml(frame, { lang, live }).html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<br>/g, ' ').replace(/<\/(p|li|span|div)>/g, '$& ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
}
