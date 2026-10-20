import { describe, expect, it } from "vitest";
import { World } from "../src/engine/grid";
import { PRESETS } from "../src/engine/presets";
import { parseAntString, type Rule } from "../src/engine/rule";
import { tryWorldToRLE, worldFromRLE, worldToRLE } from "../src/engine/serialize";
import { Simulation } from "../src/engine/simulation";
import {
  REPLAY_STEP_CAP,
  planFromSession,
  planFromUrl,
  restoreSimulation,
  type RestorePlan,
} from "../src/app/restore";
import { makeSession, sessionFromJSON, sessionToJSON } from "../src/app/sessionIO";
import { RLE_URL_LIMIT, decodeState, encodeState, type AntRecord } from "../src/app/urlState";
import { packAnts, toB36 } from "../src/engine/serialize";

const START: AntRecord[] = [{ x: 0, y: 0, dir: 1, state: 0 }];
const STEPS = [100, 1_000, 20_000];

function run(rule: Rule, ants: AntRecord[], steps: number): Simulation {
  const sim = new Simulation(rule);
  for (const a of ants) sim.addAnt(a.x, a.y, a.dir, a.state);
  sim.advance(steps);
  return sim;
}

function preset(id: string): Rule {
  const p = PRESETS.find((q) => q.id === id);
  if (!p) throw new Error(`no preset ${id}`);
  return p.rule;
}

/** Exact equality of two runs: counter, grid (box and every cell) and ant records. */
function expectSameRun(truth: Simulation, got: Simulation): void {
  expect(got.stepCount).toBe(truth.stepCount);
  expect(got.world.bbox).toEqual(truth.world.bbox);
  const b = truth.world.bbox;
  let mismatches = 0;
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      if (got.world.get(x, y) !== truth.world.get(x, y)) mismatches++;
    }
  }
  expect(mismatches).toBe(0);
  const records = (s: Simulation) =>
    s.ants.filter((a) => !a.halted).map((a) => ({ x: a.x, y: a.y, dir: a.dir, state: a.state }));
  expect(records(got)).toEqual(records(truth));
}

function urlRoundTrip(
  truth: Simulation,
  recipe: AntRecord[] | null,
  rleLimit?: number,
  omitGrid = false,
): RestorePlan {
  const enc = encodeState({
    rule: truth.rule,
    ants: truth.ants,
    steps: truth.stepCount,
    zoom: 6,
    centerX: 0,
    centerY: 0,
    seed: 0x1a2b3c4d,
    paletteId: "none",
    world: omitGrid ? null : truth.world,
    initialAnts: recipe,
    rleLimit,
  });
  const d = decodeState("#" + enc);
  expect(d).not.toBeNull();
  return planFromUrl(d!);
}

describe("permalink round trip", () => {
  it.each(STEPS)("classic ant restores exactly after %i steps", (steps) => {
    const truth = run(parseAntString("RL"), START, steps);
    const plan = urlRoundTrip(truth, START);
    expect(plan.message).toBeNull();
    // Small grids ride in the link; the 20,000-step grid (3,830-char RLE) cannot.
    expect(plan.kind).toBe(steps <= 1_000 ? "embedded" : "replay");
    expectSameRun(truth, restoreSimulation(plan));
  });

  it("a replay link stays short and does not need the grid", () => {
    const truth = run(parseAntString("RL"), START, 20_000);
    expect(worldToRLE(truth.world).length).toBeGreaterThan(RLE_URL_LIMIT);
    const enc = encodeState({
      rule: truth.rule,
      ants: truth.ants,
      steps: truth.stepCount,
      zoom: 6,
      centerX: 0,
      centerY: 0,
      seed: 1,
      paletteId: "none",
      world: truth.world,
      initialAnts: START,
    });
    expect(enc).not.toContain("g=");
    expect(enc.length).toBeLessThan(120);
  });

  it.each([
    ["RLR", "rlr"],
    ["LLRR colony of two", "llrr"],
    ["Perfectionist (absolute headings, 3 states)", "perfectionist"],
    ["Commons Chaos→Highway (decimal ID)", "commons-highway"],
  ])("restores %s exactly at 20,000 steps", (_label, id) => {
    const ants: AntRecord[] = id === "llrr" ? [...START, { x: 7, y: -3, dir: 2, state: 0 }] : START;
    const truth = run(preset(id), ants, 20_000);
    // As the app writes it (grid embedded only if it fits) ...
    expectSameRun(truth, restoreSimulation(urlRoundTrip(truth, ants)));
    // ... and forced down the replay path.
    const replay = urlRoundTrip(truth, ants, undefined, true);
    expect(replay.kind).toBe("replay");
    expectSameRun(truth, restoreSimulation(replay));
  });

  it("embedded and replayed restores of the same run agree", () => {
    const truth = run(parseAntString("RL"), START, 1_000);
    const embedded = urlRoundTrip(truth, START);
    expect(embedded.kind).toBe("embedded");
    const replay = planFromUrl(decodeState(`#r=RL&i=${packAnts(START)}&s=${toB36(1_000)}`)!);
    expect(replay.kind).toBe("replay");
    expectSameRun(restoreSimulation(embedded), restoreSimulation(replay));
  });

  it("an embedded link restored mid-run can be re-shared after running on", () => {
    const first = restoreSimulation(urlRoundTrip(run(parseAntString("RL"), START, 1_000), START));
    // The plan carried the starting ants along, so the continued run is still replayable.
    const plan1 = urlRoundTrip(run(parseAntString("RL"), START, 1_000), START);
    expect(plan1.recipe).toEqual(START);
    first.advance(19_000);
    const again = urlRoundTrip(first, plan1.recipe);
    expect(again.kind).toBe("replay");
    expectSameRun(run(parseAntString("RL"), START, 20_000), restoreSimulation(again));
  });

  it("restores a run whose ants all halted, without resurrecting an ant", () => {
    const truth = run(preset("brady-sigma"), START, 1_000);
    expect(truth.liveCount).toBe(0);
    const plan = urlRoundTrip(truth, START);
    expect(plan.kind).toBe("embedded");
    expect(plan.ants).toEqual([]);
    expectSameRun(truth, restoreSimulation(plan));
  });

  it("preset links (step 0, empty grid) restore the default ant on an empty grid", () => {
    const fresh = run(parseAntString("RL"), START, 0);
    const plan = urlRoundTrip(fresh, START);
    expectSameRun(fresh, restoreSimulation(plan));
    expect(plan.message).toBeNull();
  });
});

describe("runs that cannot be replayed say so", () => {
  it("a run edited mid-run with a big grid decodes as approximate, never silently exact", () => {
    const truth = run(parseAntString("RL"), START, 20_000);
    const plan = urlRoundTrip(truth, null);
    expect(plan.kind).toBe("approximate");
    expect(plan.message).toMatch(/not an exact reproduction/);
    const got = restoreSimulation(plan);
    expect(got.world.bbox.minX).toBe(Infinity); // empty grid
    expect(got.ants[0].x).toBe(truth.ants[0].x);
    expect(got.ants[0].y).toBe(truth.ants[0].y);
  });

  it("the same run restores exactly when the (autosave) grid limit is raised", () => {
    const truth = run(parseAntString("RL"), START, 20_000);
    const plan = urlRoundTrip(truth, null, 500_000);
    expect(plan.kind).toBe("embedded");
    expectSameRun(truth, restoreSimulation(plan));
  });

  it("a starting ant outside the 16-bit packing range is not offered as a replay recipe", () => {
    const far: AntRecord[] = [{ x: 40_000, y: 0, dir: 1, state: 0 }];
    const truth = run(parseAntString("RL"), far, 20_000);
    expect(urlRoundTrip(truth, far).kind).toBe("approximate");
  });

  it("refuses to replay beyond the cap and falls back to step 0 with a message", () => {
    const d = decodeState(`#r=RL&i=${packAnts(START)}&s=${toB36(REPLAY_STEP_CAP + 1)}`)!;
    const plan = planFromUrl(d);
    expect(plan.kind).toBe("refused");
    expect(plan.stepCount).toBe(0);
    expect(plan.replaySteps).toBe(0);
    expect(plan.ants).toEqual(START);
    expect(plan.message).toMatch(/replay limit/);
    // At the cap it still replays.
    const ok = planFromUrl(decodeState(`#r=RL&i=${packAnts(START)}&s=${toB36(REPLAY_STEP_CAP)}`)!);
    expect(ok.kind).toBe("replay");
    expect(ok.replaySteps).toBe(REPLAY_STEP_CAP);
  });
});

describe("old links keep decoding sanely", () => {
  it("pre-replay link with ants + steps and no grid: ants on an empty grid, flagged approximate", () => {
    const truth = run(parseAntString("RL"), START, 20_000);
    const old = `#r=RL&a=${packAnts(truth.ants.filter((a) => !a.halted))}&s=${toB36(20_000)}&z=6&c=0,0&x=1a2b3c4d`;
    const plan = planFromUrl(decodeState(old)!);
    expect(plan.kind).toBe("approximate");
    expect(plan.stepCount).toBe(20_000);
    expect(plan.message).not.toBeNull();
  });

  it("pre-replay link with a small grid still restores exactly", () => {
    const truth = run(parseAntString("RL"), START, 400);
    const old =
      `#r=RL&a=${packAnts(truth.ants)}&s=${toB36(400)}&z=6&c=0,0&x=1a2b3c4d&g=${worldToRLE(truth.world)}`;
    const plan = planFromUrl(decodeState(old)!);
    expect(plan.kind).toBe("embedded");
    expectSameRun(truth, restoreSimulation(plan));
  });

  it("a step-0 link with ants is exact", () => {
    const plan = planFromUrl(decodeState(`#r=RL&a=${packAnts(START)}&s=0`)!);
    expect(plan.kind).toBe("replay");
    expect(plan.replaySteps).toBe(0);
    expect(plan.message).toBeNull();
  });

  it("a hand-written #r=RL&s=<steps> replays the default ant", () => {
    const plan = planFromUrl(decodeState(`#r=RL&s=${toB36(20_000)}`)!);
    expect(plan.kind).toBe("replay");
    expectSameRun(run(parseAntString("RL"), START, 20_000), restoreSimulation(plan));
  });
});

describe("session JSON round trip", () => {
  const extras = { camera: { x: 1, y: 2, zoom: 6 }, seed: 7, palette: "none" };

  function jsonRoundTrip(truth: Simulation, recipe: AntRecord[] | null, mutate?: (s: any) => void): RestorePlan {
    const text = sessionToJSON(makeSession(truth, recipe, extras));
    const parsed = JSON.parse(text);
    mutate?.(parsed);
    const state = sessionFromJSON(JSON.stringify(parsed));
    return planFromSession(state, truth.rule);
  }

  it.each(STEPS)("classic ant restores exactly after %i steps, with no double-advance", (steps) => {
    const truth = run(parseAntString("RL"), START, steps);
    const plan = jsonRoundTrip(truth, START);
    expect(plan.kind).toBe("embedded");
    const got = restoreSimulation(plan);
    expect(got.stepCount).toBe(steps);
    expectSameRun(truth, got);
  });

  it.each(STEPS)("replays from the starting ants at %i steps when the grid is absent", (steps) => {
    const truth = run(parseAntString("RL"), START, steps);
    const plan = jsonRoundTrip(truth, START, (o) => {
      o.grid = null;
    });
    expect(plan.kind).toBe("replay");
    expectSameRun(truth, restoreSimulation(plan));
  });

  it("an edited colony (no recipe) still round-trips through its embedded grid", () => {
    const truth = run(parseAntString("RL"), START, 5_000);
    truth.addAnt(30, 30, 2, 0);
    truth.advance(15_000);
    const plan = jsonRoundTrip(truth, null);
    expect(plan.kind).toBe("embedded");
    expectSameRun(truth, restoreSimulation(plan));
  });

  it("keeps halted ants flagged", () => {
    const truth = run(preset("brady-s"), START, 1_000);
    const plan = jsonRoundTrip(truth, START);
    const got = restoreSimulation(plan);
    expect(got.liveCount).toBe(0);
    expect(got.ants.length).toBe(1);
    expectSameRun(truth, got);
  });

  it("with neither grid nor recipe the import is flagged approximate", () => {
    const truth = run(parseAntString("RL"), START, 20_000);
    const plan = jsonRoundTrip(truth, null, (o) => {
      o.grid = null;
    });
    expect(plan.kind).toBe("approximate");
    expect(plan.message).not.toBeNull();
  });

  it("a v1 file (ants + steps, no grid) is flagged and not advanced a second time", () => {
    const truth = run(parseAntString("RL"), START, 1_000);
    const v1 = JSON.stringify({
      v: 1,
      rule: "RL",
      ants: truth.ants.map((a) => ({ x: a.x, y: a.y, dir: a.dir, state: a.state })),
      steps: 1_000,
      camera: { x: 0, y: 0, zoom: 6 },
      seed: 1,
      palette: "none",
    });
    const plan = planFromSession(sessionFromJSON(v1), parseAntString("RL"));
    expect(plan.kind).toBe("approximate");
    const got = restoreSimulation(plan);
    expect(got.stepCount).toBe(1_000);
    expect(got.ants[0]).toMatchObject({ x: truth.ants[0].x, y: truth.ants[0].y });
  });

  it("rejects malformed files", () => {
    expect(() => sessionFromJSON("{}")).toThrow();
    expect(() => sessionFromJSON(JSON.stringify({ v: 2, rule: "RL", ants: [{ x: 1.5 }], steps: 0 }))).toThrow();
    expect(() => sessionFromJSON(JSON.stringify({ v: 3, rule: "RL", ants: [], steps: 0 }))).toThrow();
  });
});

describe("RLE helpers", () => {
  it("tryWorldToRLE respects the char and cell limits", () => {
    const w = run(parseAntString("RL"), START, 20_000).world;
    expect(tryWorldToRLE(w, 100, Infinity)).toBeNull();
    expect(tryWorldToRLE(w, Infinity, 10)).toBeNull();
    expect(tryWorldToRLE(w, Infinity, Infinity)).toBe(worldToRLE(w));
  });

  it("decoding keeps the visited bounding box even when the last cells are blank", () => {
    const w = new World();
    w.set(0, 0, 1);
    w.set(5, 5, 0); // visited but blank: the encoder drops the trailing run
    const back = worldFromRLE(worldToRLE(w));
    expect(back.bbox).toEqual(w.bbox);
    expect(back.get(0, 0)).toBe(1);
  });
});
