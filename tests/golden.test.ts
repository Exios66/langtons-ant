import { describe, expect, it } from "vitest";
import { digestHex, fnv1a32, hashWorldRegion } from "../src/engine/hash";
import { parseAntString, parseTriples } from "../src/engine/rule";
import { Simulation } from "../src/engine/simulation";

describe("fnv1a32", () => {
  it("matches published FNV-1a vectors", () => {
    // FNV-1a 32 of "" = 2166136261, "a" = 0xe40c292c, "foobar" = 0xbf9cf968
    const bytes = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
    expect(fnv1a32(new Uint8Array(0))).toBe(2166136261);
    expect(digestHex(fnv1a32(bytes("a")))).toBe("e40c292c");
    expect(digestHex(fnv1a32(bytes("foobar")))).toBe("bf9cf968");
  });
});

describe("hashWorldRegion", () => {
  it("is stable across identical worlds and sensitive to single cells", () => {
    const a = new Simulation(parseAntString("RL"));
    const b = new Simulation(parseAntString("RL"));
    a.addAnt(0, 0, 1);
    b.addAnt(0, 0, 1);
    a.advance(77);
    b.advance(77);
    expect(hashWorldRegion(a.world, a.world.bbox)).toBe(hashWorldRegion(b.world, b.world.bbox));
    b.world.set(-3, -3, 1);
    expect(hashWorldRegion(a.world, a.world.bbox)).not.toBe(hashWorldRegion(b.world, b.world.bbox));
  });

  it("depends on the framing coordinates of the region", () => {
    const w = new Simulation(parseAntString("RL"));
    w.addAnt(0, 0, 1);
    // Same cells, different framing -> different digest by construction.
    const d1 = hashWorldRegion(w.world, { minX: 0, minY: 0, maxX: 3, maxY: 3 });
    const d2 = hashWorldRegion(w.world, { minX: -1, minY: 0, maxX: 2, maxY: 3 });
    expect(d1).not.toBe(d2);
  });
});

/**
 * The determinism thesis in one assertion: 11,000 classic-ant steps from a
 * blank grid must hash to a committed constant on every Node version, every
 * OS, and the live page. Pins the step function's integer determinism, the
 * chunked grid's addressing (including negative coordinates), and rule-table
 * integrity in one test. The highway's 104-step periodic tail is inside the
 * hashed window: any drift in any layer fails loudly.
 */
describe("golden grid", () => {
  it("11,000 RL steps hash to the committed constant", () => {
    const sim = new Simulation(parseAntString("RL"));
    sim.addAnt(0, 0, 1); // origin, heading East
    sim.advance(11000);
    const digest = hashWorldRegion(sim.world, sim.world.bbox);
    expect(digest).toBe(GOLDEN_DIGEST);
  });
});

// 32-bit FNV-1a over the visited bbox of the 11,000-step run (see above).
// Computed once with this same test file and pinned; do not "fix" a red value
// here without a diff review of the trajectory itself.
const GOLDEN_DIGEST = "6219b3fb";
