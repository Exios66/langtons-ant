import { describe, expect, it } from "vitest";
import {
  packAnts,
  toB36,
  fromB36,
  unpackAnts,
} from "../src/engine/serialize";

describe("ant packing (URL share)", () => {
  it("round-trips positions, headings and states including negatives", () => {
    const ants = [
      { x: 0, y: 0, dir: 1, state: 0 },
      { x: -1, y: -1, dir: 3, state: 31 },
      { x: -32768, y: 32767, dir: 0, state: 2 },
      { x: 32767, y: -32768, dir: 2, state: 8 },
      { x: 12345, y: 6789, dir: 1, state: 5 },
    ];
    const packed = packAnts(ants);
    const out = unpackAnts(packed);
    expect(out).toEqual([
      { x: 0, y: 0, dir: 1, state: 0 },
      { x: -1, y: -1, dir: 3, state: 31 },
      { x: -32768, y: 32767, dir: 0, state: 2 },
      { x: 32767, y: -32768, dir: 2, state: 8 },
      { x: 12345, y: 6789, dir: 1, state: 5 },
    ]);
  });

  it("is URL-safe (base64url alphabet only)", () => {
    const packed = packAnts([{ x: -1, y: 1, dir: 0, state: 3 }]);
    expect(packed).toMatch(/^[A-Za-z0-9\-_]*=*$/);
  });

  it("rejects bad flags", () => {
    expect(() => packAnts([{ x: 0, y: 0, dir: 9, state: 0 }])).toThrow();
    expect(() => packAnts([{ x: 0, y: 0, dir: 0, state: 99 }])).toThrow();
  });
});

describe("base36", () => {
  it("round-trips non-negative integers", () => {
    for (const n of [0, 1, 42, 9977, 59348218, 1234567890]) {
      expect(fromB36(toB36(n))).toBe(n);
    }
  });
});
