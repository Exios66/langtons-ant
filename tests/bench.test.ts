import { it } from "vitest";
import { mulberry32 } from "../src/engine/prng";
import { parseAntString } from "../src/engine/rule";
import { Simulation } from "../src/engine/simulation";

// Node's `process` global, typed locally — the project ships no @types/node
// (zero added dependencies) and tsc's types don't cover it, but vitest's Node
// environment always provides it at runtime.
const proc = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined>; version: string; platform: string; arch: string };
  }
).process;

/**
 * Throughput benchmark for the engine's step hot loop.
 *
 * Gated: it only runs when RUN_BENCH=1 is in the environment, so a plain
 * `npx vitest run` stays fast and quiet. To run it:
 *
 *   RUN_BENCH=1 npx vitest run tests/bench.test.ts
 *
 * The measurements are logged, never asserted: hardware-dependent throughput
 * must not become a flaky CI gate. Determinism is covered by the committed
 * FNV-1a golden digest in tests/golden.test.ts instead.
 */

const WARMUP_STEPS = 50_000;
const STEPS_PER_RUN = 1_000_000;
const RUNS = 5;

const COLONY_SIZE = 25;
const COLONY_RADIUS = 12; // ants seeded within [-12, +12] of the origin
const COLONY_SEED = 0x5eed_0025;

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtMillions(n: number): string {
  return `${(n / 1e6).toFixed(2)}M`;
}

/**
 * Builds a fresh simulation, warms it up, then times RUNS runs of
 * STEPS_PER_RUN steps each, logging raw per-run timings and mean throughput.
 *
 * `updatesPerStep` is the number of ant-acts per sim.step(): 1 for the single
 * ant, liveCount for the colony (each step acts every live ant in order).
 */
function bench(label: string, build: () => Simulation, updatesPerStep: () => number): void {
  const sim = build();
  sim.advance(WARMUP_STEPS); // warm the JIT and the chunk map

  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const t0 = performance.now();
    sim.advance(STEPS_PER_RUN);
    const dt = performance.now() - t0;
    times.push(dt);
    console.log(
      `${label}: ${fmtInt(STEPS_PER_RUN)} steps in ${dt.toFixed(1)} ms` +
        ` → ${fmtMillions((STEPS_PER_RUN / dt) * 1000)} steps/s`,
    );
  }

  const meanMs = times.reduce((a, b) => a + b, 0) / times.length;
  const updates = updatesPerStep();
  const stepsPerSec = (STEPS_PER_RUN / meanMs) * 1000;
  console.log(
    `${label}: mean ${meanMs.toFixed(1)} ms per ${fmtInt(STEPS_PER_RUN)} steps` +
      ` over ${RUNS} runs → ${fmtMillions(stepsPerSec)} steps/s`,
  );
  console.log(
    `${label}: cell updates ≈ ${fmtInt(updates)} / step` +
      ` → ${fmtMillions((stepsPerSec * updates))} cell-updates/s`,
  );
}

// Explicit long timeout: two full series take ~10 s of measured runs, and the
// default 5 s vitest timeout would kill the benchmark mid-flight.
it.runIf(proc.env.RUN_BENCH === "1")("engine throughput benchmark", { timeout: 600_000 }, () => {
  console.log(
    `bench environment: node ${proc.version}, ${proc.platform}-${proc.arch}` +
      `, ${WARMUP_STEPS.toLocaleString("en-US")}-step warmup, ${RUNS} runs of ${fmtInt(STEPS_PER_RUN)} steps`,
  );

  // Series 1 — the classic RL ant at the origin heading East.
  bench(
    "single ant",
    () => {
      const sim = new Simulation(parseAntString("RL"));
      sim.addAnt(0, 0, 1); // dir 1 = East
      return sim;
    },
    () => 1,
  );

  // Series 2 — a 25-ant colony seeded deterministically around the origin.
  // mulberry32 is the engine's canonical PRNG, so the colony layout is
  // reproducible across machines and runs.
  bench(
    "colony (25 ants)",
    () => {
      const sim = new Simulation(parseAntString("RL"));
      const rand = mulberry32(COLONY_SEED);
      for (let i = 0; i < COLONY_SIZE; i++) {
        const dx = Math.floor(rand() * (2 * COLONY_RADIUS + 1)) - COLONY_RADIUS;
        const dy = Math.floor(rand() * (2 * COLONY_RADIUS + 1)) - COLONY_RADIUS;
        const dir = Math.floor(rand() * 4); // 0=N 1=E 2=S 3=W
        sim.addAnt(dx, dy, dir);
      }
      return sim;
    },
    () => COLONY_SIZE,
  );
});
