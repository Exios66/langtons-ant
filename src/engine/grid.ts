/**
 * Unbounded world grid, stored as chunked typed arrays.
 *
 * - Each chunk is a 64x64 cell region held in a `Uint8Array` (1 byte per cell).
 * - Chunks are created lazily and live in a `Map` keyed by a packed chunk
 *   coordinate. A single ant touches exactly one cell per step, so the hot
 *   path is a Map lookup only when the ant crosses a chunk boundary.
 * - Chunk coordinates are packed as `cx * 2^32 + cy` (exact in float64 for
 *   |cx| <= 2^20, i.e. +/-134M cells per axis): a plain 16-bit packing would
 *   collide once an 8-digit-step highway drifts past ~4.2M cells.
 * - The most recently touched chunk is cached: an ant stays inside the same
 *   chunk for ~64 consecutive steps on average.
 *
 * Memory math (1 byte/cell): after 10^8 single-ant steps the visited region
 * is ~10^8 cells -> on the order of 100-200 MB of chunks plus ~24k Map
 * entries. A sparse `Map<packedXY, color>` for the same workload would cost
 * an estimated 4-8 GB (V8 entry overhead): infeasible. Chunked typed arrays
 * are the load-bearing design decision of the whole simulator.
 */

const CHUNK_BITS = 6;
export const CHUNK_SIZE = 1 << CHUNK_BITS; // 64
const CHUNK_MASK = CHUNK_SIZE - 1; // 63

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function chunkKey(cx: number, cy: number): number {
  return cx * 4294967296 + cy;
}

export const EMPTY_BBOX: BBox = {
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity,
};

export function bboxIsEmpty(b: BBox): boolean {
  return b.minX > b.maxX || b.minY > b.maxY;
}

export class World {
  private chunks = new Map<number, Uint8Array>();
  private lastKey = 0;
  private lastChunk: Uint8Array | null = null;
  private hasLast = false;
  private visited: BBox = { ...EMPTY_BBOX };

  /** Read the color at world coordinates (x, y). Out-of-chunks cells are color 0. */
  get(x: number, y: number): number {
    const key = chunkKey(x >> CHUNK_BITS, y >> CHUNK_BITS);
    const chunk =
      this.hasLast && key === this.lastKey ? this.lastChunk : this.chunks.get(key);
    if (!chunk) return 0;
    return chunk[((y & CHUNK_MASK) << CHUNK_BITS) | (x & CHUNK_MASK)];
  }

  /** Write a color, recording the visited bounding box. */
  set(x: number, y: number, color: number): void {
    const key = chunkKey(x >> CHUNK_BITS, y >> CHUNK_BITS);
    let chunk: Uint8Array;
    const found = this.hasLast && key === this.lastKey ? this.lastChunk : this.chunks.get(key);
    if (found) {
      chunk = found;
    } else {
      chunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
      this.chunks.set(key, chunk);
      this.lastKey = key;
      this.lastChunk = chunk;
      this.hasLast = true;
    }
    chunk[((y & CHUNK_MASK) << CHUNK_BITS) | (x & CHUNK_MASK)] = color;
    this.recordVisit(x, y);
  }

  private recordVisit(x: number, y: number): void {
    const b = this.visited;
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (y < b.minY) b.minY = y;
    if (y > b.maxY) b.maxY = y;
  }

  /** Bounding box of all visited (written) cells. */
  get bbox(): BBox {
    return this.visited;
  }

  get chunkCount(): number {
    return this.chunks.size;
  }

  /** Approximate memory of the grid in bytes (chunks only, excluding Map overhead). */
  get memoryBytes(): number {
    return this.chunks.size * CHUNK_SIZE * CHUNK_SIZE;
  }

  /** Collect the distinct chunk keys covering a rect (for dirty-chunk repaints). */
  chunkKeysInRect(minX: number, minY: number, maxX: number, maxY: number): number[] {
    const keys: number[] = [];
    const cx0 = minX >> CHUNK_BITS;
    const cy0 = minY >> CHUNK_BITS;
    const cx1 = maxX >> CHUNK_BITS;
    const cy1 = maxY >> CHUNK_BITS;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = chunkKey(cx, cy);
        if (this.chunks.has(key)) keys.push(key);
      }
    }
    return keys;
  }

  /** Overwrite every currently-stored chunk cell with 0 without dropping Map entries. */
  clear(): void {
    for (const chunk of this.chunks.values()) chunk.fill(0);
    this.visited = { ...EMPTY_BBOX };
  }
}
