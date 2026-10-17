/**
 * Renders public/social-card.png (1200x630) straight from the engine: the
 * classic RL ant at 12,000 steps (chaos blob plus the first highway stretch).
 * Deterministic and dependency-free — run with `npx vite-node scripts/social-card.ts`.
 */
import { deflateSync } from "node:zlib";
import fs from "node:fs";
import { parseAntString } from "../src/engine/rule";
import { Simulation } from "../src/engine/simulation";

const W = 1200;
const H = 630;
const STEPS = 12000;
const BG: [number, number, number] = [11, 13, 18];
const FG: [number, number, number] = [255, 196, 0];

const sim = new Simulation(parseAntString("RL"));
sim.addAnt(0, 0, 1);
sim.advance(STEPS);

const b = sim.world.bbox;
const bw = b.maxX - b.minX + 1;
const bh = b.maxY - b.minY + 1;
const scale = Math.max(1, Math.floor(Math.min((W - 80) / bw, (H - 80) / bh)));
const ox = Math.floor((W - bw * scale) / 2);
const oy = Math.floor((H - bh * scale) / 2);

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  const row = y * (W * 3 + 1);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
    const wx = Math.floor((x - ox) / scale) + b.minX;
    const wy = Math.floor((y - oy) / scale) + b.minY;
    const inside = x >= ox && y >= oy && wx <= b.maxX && wy <= b.maxY;
    const c = inside && sim.world.get(wx, wy) !== 0 ? FG : BG;
    raw.set(c, row + 1 + x * 3);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer): Buffer => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB
fs.writeFileSync(
  new URL("../public/social-card.png", import.meta.url),
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
console.log(`social-card.png: ${bw}x${bh} cells at ${scale}x`);
