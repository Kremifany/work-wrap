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

/** Rounded rect filled with brand blue + white "JT" mark. */
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

  // Simple block letterforms for J and T inside the badge
  const inGlyph = (px, py) => {
    const gx0 = size * 0.28;
    const gx1 = size * 0.72;
    const gy0 = size * 0.28;
    const gy1 = size * 0.72;
    const stroke = size * 0.1;
    const mid = size * 0.5;

    // T top bar
    if (py >= gy0 && py <= gy0 + stroke && px >= gx0 && px <= gx1) return true;
    // T stem
    if (px >= mid - stroke / 2 && px <= mid + stroke / 2 && py >= gy0 && py <= gy1 * 0.55)
      return true;

    // J stem (right half)
    const jx = size * 0.62;
    if (px >= jx - stroke / 2 && px <= jx + stroke / 2 && py >= gy0 + stroke && py <= gy1 - stroke)
      return true;
    // J hook
    if (
      py >= gy1 - stroke * 1.4 &&
      py <= gy1 &&
      px >= mid - stroke * 0.2 &&
      px <= jx + stroke / 2
    )
      return true;

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

for (const { file, size, maskable } of specs) {
  const png = encodePng(size, (x, y, s) => drawIcon(x, y, s, { maskable }));
  writeFileSync(join(outDir, file), png);
  console.log(`Wrote ${file} (${png.length} bytes)`);
}
