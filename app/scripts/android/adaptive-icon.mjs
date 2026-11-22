// Draws the Android adaptive icon's foreground layer from the approved mark (assets/brand/pbs-mark-dark.svg:
// a linen wave over a dawn line). The background layer is the tile colour (#0E1A22) in app.config.ts, so the
// launcher can mask it to any shape. Run once after a mark change: node scripts/android/adaptive-icon.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 1024; // 108 dp; Android keeps the middle 66 dp (676 px) visible under every mask.
const SCALE = 14.2; // mark units to px: the 36-unit drawing is 511 px wide, inside the safe zone.
const at = (x, y) => [SIZE / 2 + (x - 32) * SCALE, SIZE / 2 + (y - 32) * SCALE];
const quad = (p0, c, p1, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
});
// M14 27 q6 -8 12 0 t12 0 t12 0 (each t reflects the last control point).
const wave = [...quad([14, 27], [20, 19], [26, 27]), ...quad([26, 27], [32, 35], [38, 27]), ...quad([38, 27], [44, 19], [50, 27])].map(([x, y]) => at(x, y));
const line = [at(14, 41), at(50, 41)];
const strokes = [
  { points: wave, rgb: [0xf4, 0xf0, 0xe6], alpha: 0.62 },
  { points: line, rgb: [0xe0, 0xa3, 0x3e], alpha: 1 },
];
const half = (4.5 * SCALE) / 2;
function distance(px, py, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy));
  }
  return best;
}
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const s of strokes) {
      const cover = Math.max(0, Math.min(1, half + 0.5 - distance(x + 0.5, y + 0.5, s.points))) * s.alpha;
      if (!cover) continue;
      // "over" compositing of straight-alpha colours
      const na = cover + a * (1 - cover);
      r = (s.rgb[0] * cover + r * a * (1 - cover)) / na; g = (s.rgb[1] * cover + g * a * (1 - cover)) / na; b = (s.rgb[2] * cover + b * a * (1 - cover)) / na; a = na;
    }
    raw.set([Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)], y * (SIZE * 4 + 1) + 1 + x * 4);
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const v of buf) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr.set([8, 6, 0, 0, 0], 8);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
writeFileSync(new URL('../../assets/adaptive-icon.png', import.meta.url), png);
console.log(`OUTPUT assets/adaptive-icon.png ${SIZE}x${SIZE} ${png.length} bytes`);
