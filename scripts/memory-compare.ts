/**
 * One-off measurement behind the README's memory comparison: chunked
 * typed-array grid vs. a `Map<number, number>` holding the same touched cells.
 *
 *   node --expose-gc node_modules/.bin/vite-node scripts/memory-compare.ts [rule] [steps]
 *   e.g.  ... scripts/memory-compare.ts RLR 20000000
 *
 * Method: run the ant for `steps` steps; every cell the ant wrote goes into a
 * Map (numeric key, color value) as it is recorded from the engine's change
 * buffer; after a forced GC the Map's cost is the growth in `heapUsed` over
 * the pre-run baseline (this also counts the Simulation's small bookkeeping,
 * a negligible amount next to the Map). The chunked cost is
 * `World.memoryBytes` (chunk count x 4 KiB, ignoring its small Map of chunk
 * keys). Not part of the test suite: heap numbers depend on the V8 version.
 */
import { parseAntString } from "../src/engine/rule";
import { Simulation } from "../src/engine/simulation";

const rule = process.argv[2] ?? "RLR";
const steps = Number(process.argv[3] ?? 20_000_000);
const gc = (globalThis as { gc?: () => void }).gc;
if (gc === undefined) throw new Error("run with node --expose-gc");

gc();
const base = process.memoryUsage().heapUsed;
const sim = new Simulation(parseAntString(rule));
sim.addAnt(0, 0, 1, 0);
const map = new Map<number, number>();
const OFFSET = 1 << 24;
const STRIDE = 1 << 25;
for (let done = 0; done < steps; done += 100_000) {
  sim.advance(100_000);
  for (let i = 0; i < sim.changedCount; i++) {
    map.set((sim.changedY[i] + OFFSET) * STRIDE + (sim.changedX[i] + OFFSET), 0);
  }
  sim.resetChanged();
}
for (const key of map.keys()) {
  map.set(key, sim.world.get((key % STRIDE) - OFFSET, Math.floor(key / STRIDE) - OFFSET));
}
gc();
const mapBytes = process.memoryUsage().heapUsed - base;
const chunkBytes = sim.world.memoryBytes;
console.log(
  JSON.stringify({
    rule,
    steps,
    touchedCells: map.size,
    chunks: sim.world.chunkCount,
    chunkBytes,
    chunkBytesPerTouchedCell: +(chunkBytes / map.size).toFixed(2),
    mapBytes,
    mapBytesPerEntry: +(mapBytes / map.size).toFixed(1),
    mapOverChunks: +(mapBytes / chunkBytes).toFixed(1),
  }),
);
