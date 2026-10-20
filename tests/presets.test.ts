import { describe, expect, it } from "vitest";
import { PRESETS } from "../src/engine/presets";
import { Simulation } from "../src/engine/simulation";

function runToHalt(rule: (typeof PRESETS)[number]["rule"], cap: number): Simulation {
  const sim = new Simulation(rule);
  sim.addAnt(0, 0, 1, 0);
  while (sim.liveCount > 0 && sim.stepCount < cap) {
    sim.advance(10_000);
    sim.resetChanged();
  }
  return sim;
}

function nonZeroCells(sim: Simulation): number {
  const b = sim.world.bbox;
  let n = 0;
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) if (sim.world.get(x, y) !== 0) n++;
  }
  return n;
}

describe("preset gallery", () => {
  it("has unique ids and ships the 20 presets the README documents", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(PRESETS.length).toBe(20);
  });

  const halting = PRESETS.filter((p) => p.halts !== undefined);

  it("pins both Brady champions", () => {
    expect(halting.map((p) => p.id).sort()).toEqual(["brady-s", "brady-sigma"]);
  });

  it.each(halting.map((p) => [p.id, p] as const))("%s halts at its documented step with its documented cell count", (_id, p) => {
    const expected = p.halts!;
    const sim = runToHalt(p.rule, 10_000);
    expect(sim.liveCount).toBe(0);
    expect(sim.stepCount).toBe(expected.steps);
    expect(nonZeroCells(sim)).toBeGreaterThan(0);
    expect(nonZeroCells(sim)).toBe(expected.cells);
  });

  it("each Brady label matches what the machine does (S = 121 steps; Sigma = 37 cells)", () => {
    const s = PRESETS.find((p) => p.id === "brady-s")!;
    const sigma = PRESETS.find((p) => p.id === "brady-sigma")!;
    // The S champion is named for, and halts at, step 121; the Sigma champion
    // is named for, and leaves, 37 painted cells.
    expect(s.name).toContain("121");
    expect(s.milestone).toContain("121");
    expect(s.halts!.steps).toBe(121);
    expect(sigma.name).toContain("37");
    expect(sigma.milestone).toContain("37");
    expect(sigma.halts!.cells).toBe(37);
    // And they are distinct machines.
    expect(s.notation).not.toBe(sigma.notation);
  });
});
