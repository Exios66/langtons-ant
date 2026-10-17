import { describe, expect, it } from "vitest";
import { World, CHUNK_SIZE } from "../src/engine/grid";
import { mulberry32 } from "../src/engine/prng";
import { worldFromRLE, worldToRLE } from "../src/engine/serialize";

describe("World", () => {
  it("round-trips get/set at positive, negative and boundary coordinates", () => {
    const w = new World();
    const points: Array<[number, number]> = [
      [0, 0],
      [CHUNK_SIZE - 1, CHUNK_SIZE - 1],
      [CHUNK_SIZE, CHUNK_SIZE], // first cell of the next chunk
      [CHUNK_SIZE - 1, CHUNK_SIZE], // boundary pair
      [CHUNK_SIZE, CHUNK_SIZE - 1],
      [-1, -1],
      [-CHUNK_SIZE, -CHUNK_SIZE],
      [-1, 0],
      [0, -1],
      [1000, -1000],
      [-100000, 100000],
    ];
    for (const [x, y] of points) {
      w.set(x, y, (Math.abs(x * 31 + y * 7) % 255) + 1);
    }
    for (const [x, y] of points) {
      const expected = (Math.abs(x * 31 + y * 7) % 255) + 1;
      expect(w.get(x, y)).toBe(expected);
    }
  });

  it("defaults untouched cells to color 0", () => {
    const w = new World();
    expect(w.get(5, 5)).toBe(0);
    expect(w.get(-9999, 9999)).toBe(0);
  });

  it("tracks the visited bounding box, including color-0 writes", () => {
    const w = new World();
    w.set(3, -7, 1);
    w.set(-2, 9, 0); // a color-0 write is still a visit
    expect(w.bbox).toEqual({ minX: -2, minY: -7, maxX: 3, maxY: 9 });
  });

  it("gives an empty world an empty bbox", () => {
    const w = new World();
    expect(w.get(0, 0)).toBe(0);
    expect(w.bbox.minX).toBe(Infinity);
    expect(w.chunkCount).toBe(0);
  });

  it("keeps writes in neighbouring chunks independent", () => {
    const w = new World();
    w.set(CHUNK_SIZE - 1, 0, 1);
    w.set(CHUNK_SIZE, 0, 2);
    w.set(CHUNK_SIZE - 1, 0, 1); // revisit the first chunk
    expect(w.get(CHUNK_SIZE - 1, 0)).toBe(1);
    expect(w.get(CHUNK_SIZE, 0)).toBe(2);
  });
});

describe("RLE", () => {
  it("round-trips a seeded random region", () => {
    const rng = mulberry32(0xc0ffee);
    const w = new World();
    const ox = -37;
    const oy = 11;
    for (let y = 0; y < 19; y++) {
      for (let x = 0; x < 23; x++) {
        if (rng() < 0.65) w.set(ox + x, oy + y, Math.floor(rng() * 4));
      }
    }
    const rle = worldToRLE(w);
    const w2 = worldFromRLE(rle);
    for (let y = w.bbox.minY; y <= w.bbox.maxY; y++) {
      for (let x = w.bbox.minX; x <= w.bbox.maxX; x++) {
        expect(w2.get(x, y)).toBe(w.get(x, y));
      }
    }
    expect(w2.bbox).toEqual(w.bbox);
  });

  it("round-trips a fully-zero (empty) world", () => {
    const rle = worldToRLE(new World());
    expect(rle).toBe("0,0,0,0!");
    const w2 = worldFromRLE(rle);
    expect(w2.chunkCount).toBe(0);
  });

  it("rejects malformed RLE", () => {
    expect(() => worldFromRLE("no header")).toThrow();
    expect(() => worldFromRLE("1,2,3,4!")).toThrow(); // header, no runs
    expect(() => worldFromRLE("0,0,1,1!AB")).toThrow(); // overrun
    expect(() => worldFromRLE("0,0,2,1!Δ")).toThrow(); // not in alphabet
  });
});
