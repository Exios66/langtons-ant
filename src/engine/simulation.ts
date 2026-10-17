import { World } from "./grid";
import { isHaltTurn, turnDelta, TURN_ABS_N, type Rule } from "./rule";

/**
 * The deterministic stepper. Ants are stepped sequentially in array order —
 * the classic formulation (heads contend for shared grid state, so there is
 * nothing to parallelize) — and this file is the engine's entire hot path.
 * It must stay allocation-free per step, integer-only, and side-effect free
 * beyond the world grid and the ant records, so that Node, CI and every
 * browser replay the same trajectory byte for byte.
 *
 * Step semantics (the community-standard order):
 *   1. read the color under the ant,
 *   2. write the table's color for (state, color),
 *   3. act on the turn entry: relative quarter-turn / U-turn / absolute
 *      heading, or halt (turn code 0),
 *   4. advance one cell in the (possibly new) heading,
 *   5. transition state.
 */

const DX = [0, 1, 0, -1]; // heading 0 = N (up), 1 = E, 2 = S, 3 = W
const DY = [-1, 0, 1, 0];

export interface Ant {
  x: number;
  y: number;
  dir: number; // 0..3 = N, E, S, W
  state: number;
  halted?: boolean;
  ruleIndex?: number; // reserved for per-ant rules (colony mode)
}

export class Simulation {
  readonly world: World;
  rule: Rule;
  ants: Ant[] = [];
  stepCount = 0;

  /** Cells written since the last resetChanged(); consumed by the renderer. */
  changedX: Int32Array;
  changedY: Int32Array;
  changedCount = 0;
  private capacity = 0;

  constructor(rule: Rule, world: World = new World()) {
    this.rule = rule;
    this.world = world;
    this.changedX = new Int32Array(16);
    this.changedY = new Int32Array(16);
    this.capacity = 16;
  }

  get liveCount(): number {
    let n = 0;
    for (const a of this.ants) if (!a.halted) n++;
    return n;
  }

  addAnt(x: number, y: number, dir = 1, state = 0): Ant {
    const ant: Ant = { x, y, dir, state };
    this.ants.push(ant);
    return ant;
  }

  clearAnts(): void {
    this.ants.length = 0;
  }

  /** One full step: every live ant acts once, in deterministic array order. */
  step(): void {
    this.ensureCapacity(this.changedCount + this.ants.length);
    for (const ant of this.ants) {
      if (!ant.halted) this.stepAnt(ant);
    }
    this.stepCount++;
  }

  /**
   * Advance up to `steps` steps, stopping early if every ant has halted.
   * Returns the number of steps actually executed.
   */
  advance(steps: number, shouldStop?: () => boolean): number {
    let executed = 0;
    for (let i = 0; i < steps; i++) {
      if (this.liveCount === 0) break;
      if (shouldStop !== undefined && executed > 0 && shouldStop()) break;
      this.step();
      executed++;
    }
    return executed;
  }

  resetChanged(): void {
    this.changedCount = 0;
  }

  private ensureCapacity(n: number): void {
    if (n <= this.capacity) return;
    let cap = this.capacity;
    while (cap < n) cap *= 2;
    const nx = new Int32Array(cap);
    const ny = new Int32Array(cap);
    nx.set(this.changedX);
    ny.set(this.changedY);
    this.changedX = nx;
    this.changedY = ny;
    this.capacity = cap;
  }

  private stepAnt(ant: Ant): void {
    const rule = this.rule;
    const idx = ant.state * rule.colors + this.world.get(ant.x, ant.y);
    this.world.set(ant.x, ant.y, rule.write[idx]);
    this.changedX[this.changedCount] = ant.x;
    this.changedY[this.changedCount] = ant.y;
    this.changedCount++;

    const t = rule.turn[idx];
    if (isHaltTurn(t)) {
      ant.halted = true;
      return;
    }
    if (t >= TURN_ABS_N) {
      ant.dir = t - TURN_ABS_N; // absolute heading
    } else {
      ant.dir = (ant.dir + turnDelta(t)) & 3;
    }
    ant.x += DX[ant.dir];
    ant.y += DY[ant.dir];
    ant.state = rule.next[idx];
  }
}
