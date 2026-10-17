/**
 * Deterministic, seedable PRNG (mulberry32).
 *
 * The simulation must never consume `Math.random`: every run has to be
 * reproducible from its seed so that permalinks, autosave replay and the
 * golden-hash CI test all observe byte-identical grids.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + (Math.imul(t ^ (t >>> 7), t | 61) ^ t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
