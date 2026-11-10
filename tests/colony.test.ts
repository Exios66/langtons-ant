import { describe, expect, it } from "vitest";
import { Series, niceScale } from "../src/app/analytics";
import { SCENARIOS, scenarioById } from "../src/colony/scenarios";
import { ColonySim } from "../src/colony/sim";

function digest(sim: ColonySim): string {
  let h = 0;
  for (let i = 0; i < sim.n; i++) h = (Math.imul(h, 31) + Math.round(sim.x[i] * 1000) + Math.round(sim.y[i] * 1000) * 7) | 0;
  return `${sim.n}:${h}:${sim.colonies.map((c) => c.delivered).join(",")}`;
}

describe("colony simulation", () => {
  it("replays identically for the same scenario and seed, and differs for another seed", () => {
    const run = (seed: number): string => {
      const sim = new ColonySim(scenarioById("rivals"), seed);
      for (let t = 0; t < 1500; t++) sim.step();
      return digest(sim);
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });

  it("forages: ants find food and deliver it to the nest", () => {
    const sim = new ColonySim(scenarioById("forage"), 1234);
    const before = sim.totalFood;
    for (let t = 0; t < 3000; t++) sim.step();
    expect(sim.colonies[0].delivered).toBeGreaterThan(100);
    expect(sim.totalFood).toBeLessThan(before);
    expect(sim.population(0)).toBeGreaterThan(160);
  });

  it("keeps every ant inside the map and off the walls, in every scenario", () => {
    for (const sc of SCENARIOS) {
      const sim = new ColonySim(sc, 7);
      for (let t = 0; t < 600; t++) sim.step();
      for (let i = 0; i < sim.n; i++) {
        const cell = (sim.y[i] | 0) * sim.w + (sim.x[i] | 0);
        expect(sim.walls[cell]).toBe(0);
      }
      const pops = sim.colonies.reduce((a, _, c) => a + sim.population(c), 0);
      expect(pops).toBe(sim.n);
    }
  });

  it("rival colonies fight, and fighting raises soldiers", () => {
    const sim = new ColonySim(scenarioById("rivals"), 1234);
    for (let t = 0; t < 5000; t++) sim.step();
    expect(sim.colonies[0].killed + sim.colonies[1].killed).toBeGreaterThan(0);
    expect(sim.colonies[0].pop[2] + sim.colonies[1].pop[2]).toBeGreaterThan(0);
  });

  it("walls block and erase clears", () => {
    const sim = new ColonySim(scenarioById("forage"), 1);
    sim.paintWall(60, 60, 2, true);
    expect(sim.walls[60 * sim.w + 60]).toBe(1);
    sim.paintFood(60, 60, 2, 5);
    expect(sim.food[60 * sim.w + 60]).toBe(0);
    sim.erase(60, 60, 2);
    expect(sim.walls[60 * sim.w + 60]).toBe(0);
    // The nest site cannot be walled in.
    sim.paintWall(sim.colonies[0].nestX, sim.colonies[0].nestY, 2, true);
    expect(sim.walls[sim.colonies[0].nestY * sim.w + sim.colonies[0].nestX]).toBe(0);
  });
});

describe("chart helpers", () => {
  it("Series stays bounded and doubles its spacing when it compacts", () => {
    const s = new Series(1, 10, 8);
    for (let x = 0; x < 1000; x += 10) if (s.due(x)) s.push(x, [x * 2]);
    expect(s.length).toBeLessThan(8);
    expect(s.spacing).toBeGreaterThan(10);
    expect(s.xs[0]).toBe(0);
    expect(s.ys[0][1]).toBe(s.xs[1] * 2);
    expect(s.toCSV("x", ["y"]).split("\n")[0]).toBe("x,y");
  });

  it("niceScale picks 1/2/5 steps that cover the maximum", () => {
    expect(niceScale(0)).toEqual({ max: 1, step: 0.5 });
    for (const m of [3, 97, 1234, 5e6, 0.4]) {
      const { max, step } = niceScale(m);
      expect(max).toBeGreaterThanOrEqual(m);
      expect(max / step).toBeLessThanOrEqual(6);
      const mant = step / Math.pow(10, Math.floor(Math.log10(step) + 1e-9));
      expect([1, 2, 5, 10].some((v) => Math.abs(mant - v) < 1e-6)).toBe(true);
    }
  });
});
