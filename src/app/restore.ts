/**
 * Turning a saved run (a permalink or a session file) back into a running
 * simulation.
 *
 * A run is a pure function of (rule, starting ants, step count): the engine
 * has no randomness, so re-simulating from the start reproduces it exactly.
 * There are therefore two exact ways to restore a run and one inexact one:
 *
 *   embedded  the saved grid is loaded as-is; instant.
 *   replay    the starting ants are placed on an empty grid and the run is
 *             re-simulated up to the saved step count. Refused above
 *             REPLAY_STEP_CAP steps (the app falls back to the starting setup
 *             at step 0 and says so).
 *   approximate  nothing but the ants' CURRENT positions survived (a run that
 *             was edited mid-run and is too big to embed, or a link/file from
 *             before replay existed): the ants are placed on an EMPTY grid.
 *             The grid cannot be recovered and the app says so.
 *
 * This module is DOM-free so the round trip can be tested under Node.
 */
import { World } from "../engine/grid";
import type { Rule } from "../engine/rule";
import { Simulation, type Ant } from "../engine/simulation";
import { worldFromRLE } from "../engine/serialize";
import type { AntRecord, DecodedState } from "./urlState";
import type { SessionState } from "./sessionIO";

/** Longest replay the app will run: ~2.5 s of engine time at 20M steps/s. */
export const REPLAY_STEP_CAP = 50_000_000;

export const DEFAULT_ANT: AntRecord = { x: 0, y: 0, dir: 1, state: 0 };

export type RestoreKind = "embedded" | "replay" | "approximate" | "refused";

export interface RestorePlan {
  kind: RestoreKind;
  rule: Rule;
  /** Grid to start from (embedded), or null for an empty grid. */
  world: World | null;
  /** Ants to place on the board now (halted ones keep their flag). */
  ants: Array<AntRecord & { halted?: boolean }>;
  /** Step counter to start from (0 for a replay). */
  stepCount: number;
  /** Steps still to re-simulate after placing `ants` (0 unless kind is "replay"). */
  replaySteps: number;
  /** The starting ants if the restored run stays a pure function of them, else null. */
  recipe: AntRecord[] | null;
  /** User-facing note when the restore is not an exact reproduction; null otherwise. */
  message: string | null;
}

const cloneAnts = (ants: ReadonlyArray<AntRecord>): AntRecord[] =>
  ants.map((a) => ({ x: a.x, y: a.y, dir: a.dir, state: a.state }));

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function replayOrRefuse(
  rule: Rule,
  initial: AntRecord[],
  steps: number,
): RestorePlan {
  if (steps > REPLAY_STEP_CAP) {
    return {
      kind: "refused",
      rule,
      world: null,
      ants: cloneAnts(initial),
      stepCount: 0,
      replaySteps: 0,
      recipe: cloneAnts(initial),
      message:
        `This run was saved at step ${fmt(steps)}, beyond the ${fmt(REPLAY_STEP_CAP)}-step replay limit. ` +
        `Started from step 0 with the saved starting setup instead.`,
    };
  }
  return {
    kind: "replay",
    rule,
    world: null,
    ants: cloneAnts(initial),
    stepCount: 0,
    replaySteps: steps,
    recipe: cloneAnts(initial),
    message: null,
  };
}

function approximate(rule: Rule, ants: AntRecord[], steps: number, why: string): RestorePlan {
  return {
    kind: "approximate",
    rule,
    world: null,
    ants: cloneAnts(ants),
    stepCount: steps,
    replaySteps: 0,
    recipe: null,
    message: `${why} Showing the ants at their saved positions on an empty grid; this is not an exact reproduction.`,
  };
}

/** Decide how to restore a decoded permalink. */
export function planFromUrl(d: DecodedState): RestorePlan {
  // 1. Embedded grid: exact, instant. A missing `a` then means every ant had halted.
  if (d.world !== null) {
    const ants = d.antsSpecified ? d.ants : [];
    const recipe = d.initialAnts ?? (d.steps === 0 ? cloneAnts(ants) : null);
    return {
      kind: "embedded",
      rule: d.rule,
      world: d.world,
      ants: cloneAnts(ants),
      stepCount: d.steps,
      replaySteps: 0,
      recipe,
      message: null,
    };
  }
  // 2. Replay from the starting ants.
  if (d.initialAnts !== null) return replayOrRefuse(d.rule, d.initialAnts, d.steps);
  // 3. Pre-replay or mid-run-edited link with ants but no grid.
  if (d.antsSpecified && d.ants.length > 0) {
    if (d.steps === 0) {
      return {
        kind: "replay",
        rule: d.rule,
        world: null,
        ants: cloneAnts(d.ants),
        stepCount: 0,
        replaySteps: 0,
        recipe: cloneAnts(d.ants),
        message: null,
      };
    }
    return approximate(
      d.rule,
      d.ants,
      d.steps,
      "This link carries no grid and no starting setup (it was copied after the ants were edited mid-run, or by an older version).",
    );
  }
  // 4. A bare `#r=<rule>&s=<steps>`: the default ant, replayed.
  return replayOrRefuse(d.rule, [DEFAULT_ANT], d.steps);
}

/** Decide how to restore a session file (v1 and v2). */
export function planFromSession(state: SessionState, rule: Rule): RestorePlan {
  if (state.v === 2) {
    if (state.grid !== null) {
      let world: World | null = null;
      try {
        world = worldFromRLE(state.grid);
      } catch {
        world = null;
      }
      if (world !== null) {
        return {
          kind: "embedded",
          rule,
          world,
          ants: state.ants.map((a) => ({
            x: a.x,
            y: a.y,
            dir: a.dir,
            state: a.state,
            ...(a.halted ? { halted: true } : {}),
          })),
          stepCount: state.steps,
          replaySteps: 0,
          recipe: state.initialAnts === null ? null : cloneAnts(state.initialAnts),
          message: null,
        };
      }
    }
    if (state.initialAnts !== null) return replayOrRefuse(rule, state.initialAnts, state.steps);
    return approximate(
      rule,
      state.ants.filter((a) => !a.halted),
      state.steps,
      "This session file stores neither a grid nor a starting setup (it was exported after ants were edited mid-run and the grid was too large).",
    );
  }
  // v1: ants at their saved positions plus a step count, never a grid.
  const ants = state.ants.filter((a) => !a.halted);
  if (state.steps === 0) {
    return {
      kind: "replay",
      rule,
      world: null,
      ants: cloneAnts(ants),
      stepCount: 0,
      replaySteps: 0,
      recipe: cloneAnts(ants),
      message: null,
    };
  }
  return approximate(rule, ants, state.steps, "This is an old (v1) session file, which never stored the grid.");
}

/** Build the simulation a plan describes at its starting point (before any replay). */
export function startSimulation(plan: RestorePlan): Simulation {
  const sim = new Simulation(plan.rule, plan.world ?? new World());
  sim.stepCount = plan.stepCount;
  for (const a of plan.ants) {
    const ant: Ant = sim.addAnt(a.x, a.y, a.dir, a.state);
    if (a.halted) ant.halted = true;
  }
  return sim;
}

/** Steps run between `resetChanged()` calls so the changed-cell buffers stay small. */
const REPLAY_CHUNK = 250_000;

/**
 * Re-simulate `plan.replaySteps` steps on `sim` synchronously, through
 * `advance` (so a caller can route the steps through the highway detector).
 * Stops early if every ant halts, exactly as the original run did.
 */
export function runReplay(
  sim: Simulation,
  plan: RestorePlan,
  advance: (sim: Simulation, steps: number) => number = (s, n) => s.advance(n),
): void {
  let left = plan.replaySteps;
  while (left > 0) {
    const ran = advance(sim, Math.min(left, REPLAY_CHUNK));
    sim.resetChanged();
    if (ran === 0) break;
    left -= ran;
  }
}

/** Plan -> finished simulation (embedded grid loaded, or replay completed). */
export function restoreSimulation(plan: RestorePlan): Simulation {
  const sim = startSimulation(plan);
  runReplay(sim, plan);
  return sim;
}
