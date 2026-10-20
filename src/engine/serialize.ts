import { bboxIsEmpty, World } from "./grid";

/**
 * RLE serialization for this simulator.
 *
 * Format: "minX,minY,w,h!" followed by run-length tokens over a row-major
 * sweep of the w*h region. Each token is a decimal count (default 1) followed
 * by an uppercase letter, where "A".. encode colors 0..25; cells past the end
 * of the token stream are color 0. Trailing zero-color runs are never emitted
 * (implicit), which also shrinks mostly-empty regions.
 */

const COLOR_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_RLE_COLORS = COLOR_ALPHABET.length;

export function worldToRLE(world: World): string {
  const rle = tryWorldToRLE(world, Infinity, Infinity);
  // Unreachable with infinite limits; keeps the return type a plain string.
  if (rle === null) throw new Error("RLE encoding failed");
  return rle;
}

/**
 * RLE-encode a world unless that would exceed `maxChars` of output or sweep
 * more than `maxCells` cells of its bounding box; returns null in that case.
 * The sweep visits every cell of the visited bounding box, which for a
 * highway-building ant is quadratic in the step count, so callers that only
 * want a small encoding (permalinks) must bound the work as well as the size.
 * Throws if the world uses more than 26 colors.
 */
export function tryWorldToRLE(world: World, maxChars: number, maxCells: number): string | null {
  const bbox = world.bbox;
  if (bboxIsEmpty(bbox)) return "0,0,0,0!";
  const w = bbox.maxX - bbox.minX + 1;
  const h = bbox.maxY - bbox.minY + 1;
  if (Math.min(w, h) < 1) return "0,0,0,0!";
  if (w * h > maxCells) return null;
  const parts: string[] = [`${bbox.minX},${bbox.minY},${w},${h}!`];
  let size = parts[0].length;
  let runColor = -1;
  let runLen = 0;
  const flush = () => {
    if (runLen > 0) {
      if (runColor >= MAX_RLE_COLORS) {
        throw new Error(`RLE supports up to ${MAX_RLE_COLORS} colors`);
      }
      const token = (runLen > 1 ? String(runLen) : "") + COLOR_ALPHABET[runColor];
      parts.push(token);
      size += token.length;
    }
    runLen = 0;
  };
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      const c = world.get(x, y);
      if (c === runColor) {
        runLen++;
      } else {
        flush();
        if (size > maxChars) return null;
        runColor = c;
        runLen = 1;
      }
    }
  }
  // A trailing color-0 run is implicit; drop it.
  if (runColor !== 0) flush();
  return size > maxChars ? null : parts.join("");
}

export function worldFromRLE(rle: string): World {
  const world = new World();
  const bang = rle.indexOf("!");
  if (bang < 0) throw new Error("RLE missing '!' header terminator");
  const header = rle.slice(0, bang).split(",");
  if (header.length !== 4) throw new Error(`RLE header needs 4 fields; got ${header.length}`);
  const [x0, y0, w, h] = header.map(Number);
  if (![x0, y0, w, h].every(Number.isInteger) || w < 0 || h < 0) {
    throw new Error(`malformed RLE header "${rle.slice(0, bang)}"`);
  }
  if (w === 0 || h === 0) return world;
  const body = rle.slice(bang + 1);
  const token = /(\d*)([A-Z])/g;
  let x = x0;
  let y = y0;
  let parsed = 0;
  let m: RegExpExecArray | null;
  while ((m = token.exec(body)) !== null) {
    const count = m[1] ? Number(m[1]) : 1;
    const color = m[2].charCodeAt(0) - 65;
    for (let i = 0; i < count; i++) {
      if (parsed >= w * h) throw new Error("RLE token stream overruns bounding rect");
      // Every parsed cell is recorded as visited so the bbox round-trips.
      world.set(x, y, color);
      x++;
      if (x >= x0 + w) {
        x = x0;
        y++;
      }
      parsed++;
    }
  }
  if (parsed === 0) throw new Error("RLE body has no color runs");
  // The encoder drops a trailing run of color 0, so a bounding box that ended
  // in blank cells would shrink on decode; touch the far corner to keep it.
  if (parsed < w * h) world.set(x0 + w - 1, y0 + h - 1, 0);
  return world;
}

/** Pack ants as base64url of (x: i16 LE, y: i16 LE, flags u8) records. */
export interface PackedAntFlags {
  dir: number; // 0..3
  state: number; // 0..31
}

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const B64URL_REVERSE = new Map<string, number>([...B64URL].map((c, i) => [c, i]));

export function packAnts(ants: ReadonlyArray<{ x: number; y: number } & PackedAntFlags>): string {
  const bytes: number[] = [];
  for (const a of ants) {
    const x = a.x & 0xffff;
    const y = a.y & 0xffff;
    bytes.push(x & 0xff, (x >>> 8) & 0xff, y & 0xff, (y >>> 8) & 0xff);
    if (!Number.isInteger(a.dir) || a.dir < 0 || a.dir > 3) throw new Error(`bad dir ${a.dir}`);
    if (!Number.isInteger(a.state) || a.state < 0 || a.state > 31) throw new Error(`bad state ${a.state}`);
    bytes.push(a.dir | (a.state << 2));
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64URL[(n >>> 18) & 63] + B64URL[(n >>> 12) & 63];
    out += i + 1 < bytes.length ? B64URL[(n >>> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64URL[n & 63] : "=";
  }
  return out;
}

export function unpackAnts(s: string): Array<{ x: number; y: number; dir: number; state: number }> {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const chunk = s.slice(i, i + 4);
    if (chunk.length < 2) break;
    let n = 0;
    for (let j = 0; j < 4; j++) {
      const c = chunk[j];
      if (c === undefined || c === "=") break;
      const v = B64URL_REVERSE.get(c);
      if (v === undefined) throw new Error(`bad base64url character "${c}"`);
      n |= v << (18 - 6 * j);
    }
    bytes.push((n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
  }
  const ants: Array<{ x: number; y: number; dir: number; state: number }> = [];
  for (let i = 0; i + 5 <= bytes.length; i += 5) {
    const x = s16(bytes[i], bytes[i + 1]);
    const y = s16(bytes[i + 2], bytes[i + 3]);
    const flags = bytes[i + 4];
    ants.push({ x, y, dir: flags & 3, state: (flags >>> 2) & 0x1f });
  }
  return ants;
}

function s16(lo: number, hi: number): number {
  const v = lo | (hi << 8);
  return v > 0x7fff ? v - 0x10000 : v;
}

/** Base36 helpers for step counts / seeds / zoom in URLs. */
export function toB36(n: number): string {
  return Math.round(n).toString(36);
}

export function fromB36(s: string): number {
  const n = parseInt(s, 36);
  if (!Number.isFinite(n)) throw new Error(`not a base36 number: "${s}"`);
  return n;
}
