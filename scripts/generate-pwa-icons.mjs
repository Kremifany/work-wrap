/**
 * Generates simple branded PNG icons for the PWA (no sharp dependency).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
const appDir = join(__dirname, "..", "src", "app");

const BRAND = [30, 58, 138]; // #1e3a8a brand-900
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgbaFn) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = rgbaFn(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const ex = px - (x1 + t * dx);
  const ey = py - (y1 + t * dy);
  return Math.hypot(ex, ey);
}

/** Rounded rect filled with brand blue + white "W²" mark. */
function drawIcon(x, y, size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const r = size * 0.18;
  const left = pad;
  const top = pad;
  const right = size - pad;
  const bottom = size - pad;

  const inRoundedRect = (px, py) => {
    if (px < left || px > right || py < top || py > bottom) return false;
    const cx = px < left + r ? left + r : px > right - r ? right - r : px;
    const cy = py < top + r ? top + r : py > bottom - r ? bottom - r : py;
    if (cx === px || cy === py) return true;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  };

  const inGlyph = (px, py) => {
    const s = size;
    const stroke = s * 0.055;
    const w = [
      [0.16, 0.48],
      [0.28, 0.78],
      [0.39, 0.58],
      [0.48, 0.78],
      [0.58, 0.48],
    ].map(([nx, ny]) => [nx * s, ny * s]);
    for (let i = 0; i < w.length - 1; i++) {
      if (distToSeg(px, py, w[i][0], w[i][1], w[i + 1][0], w[i + 1][1]) <= stroke) {
        return true;
      }
    }

    // Superscript 2, clear of the W's right arm
    const x0 = s * 0.64;
    const y0 = s * 0.24;
    const bw = s * 0.14;
    const bh = s * 0.18;
    const th = Math.max(2, bh * 0.22);
    const inBox = (x, y, wdt, hgt) => px >= x && px < x + wdt && py >= y && py < y + hgt;
    if (inBox(x0, y0, bw, th)) return true;
    if (inBox(x0 + bw - th, y0, th, bh * 0.5)) return true;
    if (inBox(x0, y0 + bh * 0.39, bw, th)) return true;
    if (inBox(x0, y0 + bh * 0.39, th, bh * 0.61)) return true;
    if (inBox(x0, y0 + bh - th, bw, th)) return true;
    return false;
  };

  if (!inRoundedRect(x, y)) {
    return maskable ? [...BRAND, 255] : [0, 0, 0, 0];
  }
  if (inGlyph(x, y)) return [...WHITE, 255];
  return [...BRAND, 255];
}

mkdirSync(outDir, { recursive: true });

const specs = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
];

function encodeIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const parts = [header, dir];
  images.forEach(({ size, png }, i) => {
    const e = i * 16;
    dir[e] = size >= 256 ? 0 : size;
    dir[e + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(png.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += png.length;
    parts.push(png);
  });
  return Buffer.concat(parts);
}

for (const { file, size, maskable } of specs) {
  const png = encodePng(size, (x, y, s) => drawIcon(x, y, s, { maskable }));
  writeFileSync(join(outDir, file), png);
  console.log(`Wrote ${file} (${png.length} bytes)`);
}

const tabIcon = encodePng(192, (x, y, s) => drawIcon(x, y, s));
writeFileSync(join(appDir, "icon.png"), tabIcon);
console.log(`Wrote src/app/icon.png (${tabIcon.length} bytes)`);

const ico = encodeIco(
  [32, 48].map((size) => ({
    size,
    png: encodePng(size, (x, y, s) => drawIcon(x, y, s)),
  }))
);
writeFileSync(join(appDir, "favicon.ico"), ico);
console.log(`Wrote src/app/favicon.ico (${ico.length} bytes)`);
