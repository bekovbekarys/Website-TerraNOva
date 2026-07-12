// Renders the Felt Notes icon (felt square + $5-chip-red diamond with a
// bone inner stroke) procedurally and encodes it as PNG via zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const FELT = [0x10, 0x16, 0x0f];
const RED = [0xb8, 0x38, 0x2b];
const BONE = [0xe9, 0xe5, 0xd8];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(size) {
  const px = Buffer.alloc(size * size * 3);
  const cx = size / 2;
  const cy = size / 2;
  // diamond geometry from icon.svg, scaled from a 64 grid (supersampled 3x3)
  const hw = (14 / 64) * size;
  const hh = (20 / 64) * size;
  const ihw = (10.5 / 64) * size;
  const ihh = (14.5 / 64) * size;
  const strokeW = (0.7 / 64) * size; // half-thickness of bone stroke
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS;
          const fy = y + (sy + 0.5) / SS;
          const dx = Math.abs(fx - cx);
          const dy = Math.abs(fy - cy);
          let c = FELT;
          if (dx / hw + dy / hh <= 1) {
            c = RED;
            const d = dx / ihw + dy / ihh;
            // bone hairline where the inner diamond edge sits
            if (Math.abs(d - 1) * Math.min(ihw, ihh) < strokeW * 2.2) c = BONE;
          }
          acc[0] += c[0];
          acc[1] += c[1];
          acc[2] += c[2];
        }
      }
      const i = (y * size + x) * 3;
      px[i] = Math.round(acc[0] / (SS * SS));
      px[i + 1] = Math.round(acc[1] / (SS * SS));
      px[i + 2] = Math.round(acc[2] / (SS * SS));
    }
  }
  return encodePNG(size, px);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`${process.argv[2]}/icon-${size}.png`, 'file://'), render(size));
  console.log(`icon-${size}.png written`);
}
