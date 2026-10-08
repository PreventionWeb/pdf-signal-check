// Renders the sample bar chart as a raster PNG, so its numbers exist only as pixels. Used to demonstrate an
// "image-only" chart: no text layer, nothing for a screen reader or text extractor to read. No dependencies.
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

// 5×7 glyphs for the characters the chart needs.
const GLYPHS = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'], r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000'],
  t: ['01000', '01000', '11100', '01000', '01000', '01001', '00110'], h: ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'], e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'], a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
};

/** A width×height RGB PNG of a three-bar chart with value and station labels drawn as pixels. */
export function chartPng({ values = [2.8, 3.1, 3.4], labels = ['North', 'Central', 'South'], width = 998, height = 346 } = {}) {
  const pale = [232, 244, 245], teal = [6, 110, 116], ink = [31, 51, 71];
  const px = new Uint8Array(width * height * 3);
  const set = (x, y, [r, g, b]) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const i = (y * width + x) * 3; px[i] = r; px[i + 1] = g; px[i + 2] = b; };
  const rect = (x, y, w, h, colour) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, colour); };
  const text = (value, x, y, scale, colour) => {
    let cursor = x;
    for (const ch of value) {
      const glyph = GLYPHS[ch];
      if (glyph) glyph.forEach((row, gy) => [...row].forEach((bit, gx) => { if (bit === '1') rect(cursor + gx * scale, y + gy * scale, scale, scale, colour); }));
      cursor += 6 * scale;
    }
  };
  rect(0, 0, width, height, pale);
  values.forEach((value, index) => {
    const barHeight = Math.round(value * 62), x = 94 + index * 278, base = height - 60;
    rect(x, base - barHeight, 144, barHeight, teal);
    text(`${value} m`, x + 26, base - barHeight - 44, 4, ink);
    text(labels[index], x + 20, base + 18, 4, ink);
  });
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 3 + 1)] = 0; Buffer.from(px.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1); }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
