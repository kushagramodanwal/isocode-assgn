// Generates the PWA icons (a white case/crate on the brand green) without any image library.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const GREEN = [29, 107, 79, 255], WHITE = [255, 255, 255, 255];
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const icon = (x, y) => {
  // full-bleed background (maskable safe zone keeps the glyph in the middle 60%)
  const box = inRect(x, y, 0.28, 0.38, 0.72, 0.72);
  const lid = inRect(x, y, 0.25, 0.3, 0.75, 0.4);
  const tape = inRect(x, y, 0.46, 0.3, 0.54, 0.55);
  const handle = inRect(x, y, 0.42, 0.5, 0.58, 0.54);
  if ((box || lid) && !tape && !handle) return WHITE;
  if (tape && !(box || lid)) return GREEN;
  if (tape || handle) return [196, 222, 210, 255];
  return GREEN;
};
writeFileSync("public/icon-192.png", png(192, icon));
writeFileSync("public/icon-512.png", png(512, icon));
console.log("icons written");
