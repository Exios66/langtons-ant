import { describe, expect, it } from "vitest";
import { HighwayDetector, SAMPLE_STEPS, WINDOW_STEPS } from "../src/app/highwayDetector";
import { parseAntString } from "../src/engine/rule";
import { Simulation } from "../src/engine/simulation";

/** The frame batch sizes a browser loop can plausibly produce. */
const BATCHES = [1, 17, 100, 200, 500, 1000, 5000, 16667, 50000];

function classicRun(): Simulation {
  const sim = new Simulation(parseAntString("RL"));
  sim.addAnt(0, 0, 1, 0);
  return sim;
}

/** Drive a fresh classic ant in `batch`-sized frames until detection (or the cap). */
function detect(batch: number, capSteps = 120_000) {
  const sim = classicRun();
  const det = new HighwayDetector();
  while (!det.isHighway && sim.stepCount < capSteps) det.advance(sim, batch);
  return { det, sim };
}

describe("HighwayDetector (classic RL ant)", () => {
  it("detects the highway and reports an onset near step 9,977", () => {
    const { det } = detect(1000);
    expect(det.isHighway).toBe(true);
    expect(det.onsetStep).toBeGreaterThan(9977 - 400);
    expect(det.onsetStep).toBeLessThan(9977 + 400);
    // Fires "shortly after" the onset, not tens of thousands of steps later.
    expect(det.detectedStep).toBeGreaterThan(det.onsetStep);
    expect(det.detectedStep).toBeLessThan(9977 + 6000);
  });

  it.each(BATCHES)("never fires early and fires on time with frame batches of %i steps", (batch) => {
    const sim = classicRun();
    const det = new HighwayDetector();
    while (!det.isHighway && sim.stepCount < 120_000) {
      det.advance(sim, batch);
      if (sim.stepCount <= 9_000) expect(det.isHighway).toBe(false);
    }
    expect(det.isHighway).toBe(true);
    expect(det.detectedStep).toBeGreaterThan(9_000);
    expect(Math.abs(det.onsetStep - 9977)).toBeLessThan(400);
  });

  it("gives bit-identical results for every batching of the same run", () => {
    const results = BATCHES.map((b) => {
      const { det } = detect(b);
      return `${det.onsetStep}/${det.detectedStep}`;
    });
    expect(new Set(results).size).toBe(1);
  });

  it("does not fire in the first 9,000 steps even when observed at every step", () => {
    const sim = classicRun();
    const det = new HighwayDetector();
    for (let i = 0; i < 9_000; i++) det.advance(sim, 1);
    expect(det.isHighway).toBe(false);
    expect(sim.stepCount).toBe(9_000);
  });

  it("advances exactly the requested number of steps", () => {
    const sim = classicRun();
    const det = new HighwayDetector();
    expect(det.advance(sim, 12_345)).toBe(12_345);
    expect(sim.stepCount).toBe(12_345);
    expect(det.advance(sim, 50_000)).toBe(50_000); // also past detection
    expect(sim.stepCount).toBe(62_345);
  });

  it("leaves the simulation trajectory untouched", () => {
    const plain = classicRun();
    plain.advance(30_000);
    const watched = classicRun();
    const det = new HighwayDetector();
    det.advance(watched, 17);
    det.advance(watched, 29_983);
    expect(watched.ants[0]).toEqual(plain.ants[0]);
  });

  it("reset() clears a detection and restarts the history", () => {
    const { det } = detect(1000);
    expect(det.isHighway).toBe(true);
    det.reset();
    expect(det.isHighway).toBe(false);
    expect(det.onsetStep).toBe(0);
    const fresh = classicRun();
    det.advance(fresh, 5_000);
    expect(det.isHighway).toBe(false);
  });
});

describe("HighwayDetector sampling contract", () => {
  it("ignores samples that are not on the step grid", () => {
    const det = new HighwayDetector();
    // A perfectly straight, fast mover would be flagged on the grid...
    for (let step = 1; step <= 20_000; step += 7) {
      if (step % SAMPLE_STEPS === 0) continue;
      det.sample({ x: step, y: step }, step);
    }
    expect(det.isHighway).toBe(false);
  });

  it("flags a perfectly straight mover sampled on the grid, back-dating the onset", () => {
    const det = new HighwayDetector();
    for (let step = 0; step <= 20_000; step += SAMPLE_STEPS) {
      det.sample({ x: step * 0.02, y: 0 }, step);
      if (det.isHighway) break;
    }
    expect(det.isHighway).toBe(true);
    expect(det.onsetStep).toBe(0);
    expect(det.detectedStep).toBeGreaterThanOrEqual(3 * WINDOW_STEPS);
  });

  it("does not flag a stationary ant", () => {
    const det = new HighwayDetector();
    for (let step = 0; step <= 50_000; step += SAMPLE_STEPS) det.sample({ x: 3, y: 4 }, step);
    expect(det.isHighway).toBe(false);
  });

  it("restarts its history across a gap in the sampled steps", () => {
    const det = new HighwayDetector();
    // Two straight runs separated by a gap: neither is long enough on its own.
    const need = 3 * WINDOW_STEPS;
    for (let step = 0; step < need; step += SAMPLE_STEPS) det.sample({ x: step * 0.02, y: 0 }, step);
    expect(det.isHighway).toBe(false);
    for (let step = 50_000; step < 50_000 + need; step += SAMPLE_STEPS) {
      det.sample({ x: step * 0.02, y: 0 }, step);
    }
    expect(det.isHighway).toBe(false);
  });

  it("only watches a lone live ant (a colony clears the history)", () => {
    const sim = classicRun();
    sim.addAnt(40, 40, 1, 0);
    const det = new HighwayDetector();
    det.advance(sim, 30_000);
    expect(det.isHighway).toBe(false);
  });
});
