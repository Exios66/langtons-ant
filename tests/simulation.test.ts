import { describe, expect, it } from "vitest";
import { hashWorldRegion } from "../src/engine/hash";
import { mulberry32 } from "../src/engine/prng";
import { parseAntString, parseTriples } from "../src/engine/rule";
import { Simulation } from "../src/engine/simulation";

describe("step semantics", () => {
  it("matches the hand-traced first five steps of the classic ant", () => {
    // Ant starts at the origin heading East (dir 1). GollyGang convention:
    // color 0 -> turn right. The ant paints (0,0), (0,1), (-1,1), (-1,0)
    // black in four clockwise-inward steps, then erases (0,0) heading North.
    const sim = new Simulation(parseAntString("RL"));
    sim.addAnt(0, 0, 1);
    const a = sim.ants[0];

    sim.step();
    expect([a.x, a.y, a.dir]).toEqual([0, 1, 2]); // S
    sim.step();
    expect([a.x, a.y, a.dir]).toEqual([-1, 1, 3]); // W
    sim.step();
    expect([a.x, a.y, a.dir]).toEqual([-1, 0, 0]); // N
    sim.step();
    expect([a.x, a.y, a.dir]).toEqual([0, 0, 1]); // E, back at origin
    sim.step();
    expect([a.x, a.y, a.dir]).toEqual([0, -1, 0]); // N, having erased the origin

    expect(sim.world.get(0, 0)).toBe(0);
    expect(sim.world.get(0, 1)).toBe(1);
    expect(sim.world.get(-1, 1)).toBe(1);
    expect(sim.world.get(-1, 0)).toBe(1);
    expect(sim.stepCount).toBe(5);
  });
});

describe("determinism properties", () => {
  it("moves exactly one cell per step with heading in [0,3], for random rules", () => {
    const rng = mulberry32(0xa11ce);
    for (let trial = 0; trial < 30; trial++) {
      const colors = 2 + (trial % 5);
      let s = "";
      for (let c = 0; c < colors; c++) s += rng() < 0.5 ? "L" : "R";
      const sim = new Simulation(parseAntString(s));
      sim.addAnt(Math.floor(rng() * 41) - 20, Math.floor(rng() * 41) - 20, trial % 4);
      const a = sim.ants[0];
      let [px, py] = [a.x, a.y];
      for (let i = 0; i < 300; i++) {
        sim.resetChanged();
        sim.step();
        expect(Math.abs(a.x - px) + Math.abs(a.y - py)).toBe(1);
        expect(a.dir).toBeGreaterThanOrEqual(0);
        expect(a.dir).toBeLessThanOrEqual(3);
        expect(sim.changedCount).toBe(1); // exactly one cell written per ant
        [px, py] = [a.x, a.y];
      }
    }
  });

  it("replays byte-identically from the same rule and start", () => {
    const rng = mulberry32(0xb0b);
    for (let trial = 0; trial < 10; trial++) {
      let s = "";
      for (let c = 0; c < 2 + (trial % 4); c++) s += rng() < 0.5 ? "L" : "R";
      const steps = 100 + trial * 137;
      const digests: string[] = [];
      for (let run = 0; run < 2; run++) {
        const sim = new Simulation(parseAntString(s));
        sim.addAnt(3 * trial, -2 * trial - 1, trial % 4);
        sim.advance(steps);
        digests.push(hashWorldRegion(sim.world, sim.world.bbox));
      }
      expect(digests[0]).toBe(digests[1]);
    }
  });

  it("records every written cell for the renderer", () => {
    const sim = new Simulation(parseAntString("LLRR"));
    sim.addAnt(0, 0, 1);
    sim.addAnt(10, -10, 2);
    sim.step();
    expect(sim.changedCount).toBe(2);
    expect([sim.changedX[0], sim.changedY[0]]).toEqual([0, 0]);
    expect([sim.changedX[1], sim.changedY[1]]).toEqual([10, -10]);
  });
});

describe("halted machines", () => {
  it("stops advancing once every ant has halted", () => {
    // Brady busy-beaver champion (S = 121 under the source's convention).
    // Halting is chirality-invariant, so the exact count may shift with the
    // app's convention — assert that it halts soon, not a specific step.
    const sim = new Simulation(parseTriples("{{{1,2,1},{1,1,0}},{{1,4,0},{1,0,0}}}"));
    sim.addAnt(0, 0, 1, 0);
    const executed = sim.advance(500);
    expect(executed).toBeLessThan(500);
    expect(sim.liveCount).toBe(0);
    const more = sim.advance(10);
    expect(more).toBe(0);
  });
});
