import { bboxIsEmpty, World, type BBox } from "./grid";

/**
 * FNV-1a 32-bit hashing utilities.
 *
 * The golden-hash determinism test runs the classic RL ant for 11,000 steps
 * from a blank grid and compares the FNV-1a digest of the visited bounding
 * box against a committed constant. One test pins three subsystems at once:
 * integer determinism of the step function, chunked-grid addressing
 * (including negative coordinates), and rule-table integrity.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a32(data: Uint8Array, hash = FNV_OFFSET): number {
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

export function digestHex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, "0");
}

function pushI32LE(bytes: number[], v: number): void {
  const u = v | 0;
  bytes.push(u & 0xff, (u >>> 8) & 0xff, (u >>> 16) & 0xff, (u >>> 24) & 0xff);
}

/**
 * Hash a world region deterministically: the framing coordinates first, then
 * every cell color row-major. Same region + same cells -> same digest on any
 * Node version and any OS; anything else fails loudly in CI.
 */
export function hashWorldRegion(world: World, bbox: BBox): string {
  if (bboxIsEmpty(bbox)) return digestHex(fnv1a32(Uint8Array.of(0xf0, 0x0d, 0xdb, 0xab, 0x15)));
  const w = bbox.maxX - bbox.minX + 1;
  const h = bbox.maxY - bbox.minY + 1;
  const bytes: number[] = [];
  bytes.push(0x1a, 0x2b); // format tag
  pushI32LE(bytes, bbox.minX);
  pushI32LE(bytes, bbox.minY);
  pushI32LE(bytes, w);
  pushI32LE(bytes, h);
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      bytes.push(world.get(x, y));
    }
  }
  return digestHex(fnv1a32(Uint8Array.from(bytes)));
}
