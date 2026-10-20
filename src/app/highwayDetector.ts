import type { Simulation } from "../engine/simulation";

/**
 * Heuristic highway detector for a single ant.
 *
 * A "highway" (Lutfalla's formal definition, arXiv:2506.10482) is a
 * trajectory that becomes periodic with a fixed drift. Detecting that
 * rigorously is research-grade; this detector uses the practical signal that
 * the ant's net displacement over consecutive, equal-length windows of steps
 * becomes (nearly) identical and clearly nonzero. The classic ant's highway
 * drifts (2, 2) cells per 104 steps, i.e. ~0.019 cells/step per axis, while
 * the chaotic phase wanders and its windowed displacements disagree.
 *
 * ALL quantities here are in simulation STEPS and CELLS (never "samples"):
 *
 *   - The ant position is sampled at absolute step numbers that are multiples
 *     of `SAMPLE_STEPS`. Because the sampling grid is tied to the simulation's
 *     step counter and not to the caller's frame timing, the result is
 *     independent of how a caller batches steps. To keep that guarantee the
 *     caller must advance the simulation through `advance()`, which slices a
 *     batch at the sampling grid; `sample()` ignores positions that are not on
 *     the grid, and a gap in the sampled steps restarts the history.
 *   - A "window" is `WINDOW_STEPS` steps (`WINDOW_STEPS / SAMPLE_STEPS`
 *     samples). A highway is declared when the last `STABLE_WINDOWS`
 *     consecutive, non-overlapping windows each moved at least
 *     `MIN_SPEED` cells/step and their velocity vectors (displacement divided
 *     by `WINDOW_STEPS`) agree within `VEL_TOLERANCE` cells/step per axis.
 *     The tolerance absorbs the intra-period jitter of a highway whose period
 *     does not divide the window (the classic 104-step period vs. a
 *     1000-step window shifts the phase by 48 steps per window, and the
 *     windowed displacement then differs by up to ~10 cells between phases).
 *   - Because that tolerance is loose, a single agreement is not enough:
 *     it must hold at `PERSISTENCE` consecutive sampling steps. A genuine
 *     highway satisfies it continuously; the isolated coincidences seen in
 *     chaotic or filling ants do not.
 *   - `onsetStep` is back-dated to the first step of the first window of the
 *     first agreeing evaluation, so it estimates when the highway began
 *     (within a few hundred steps); `detectedStep` is the step at which the
 *     detector became sure. This is a heuristic on drift, not a proof: it can
 *     fire on a rule that drifts steadily without being exactly periodic.
 *
 * Only the first ant is tracked, and only while it is the sole live ant; a
 * colony (or a halted ant) clears the history without clearing a detection
 * that already happened.
 */

/** Position sampling period, in simulation steps. */
export const SAMPLE_STEPS = 100;
/** Length of one velocity window, in simulation steps (a multiple of SAMPLE_STEPS). */
export const WINDOW_STEPS = 1000;
/** Consecutive agreeing windows required. */
export const STABLE_WINDOWS = 3;
/** Max per-axis disagreement between window velocities, in cells/step. */
export const VEL_TOLERANCE = 0.008;
/** Consecutive sampling steps at which the windows must agree. */
export const PERSISTENCE = 5;
/** Min window speed (Euclidean, cells/step) for a window to count as drifting. */
export const MIN_SPEED = 0.01;

export interface AntLike {
  x: number;
  y: number;
}

const WINDOW_SAMPLES = WINDOW_STEPS / SAMPLE_STEPS;
const HISTORY_SAMPLES = STABLE_WINDOWS * WINDOW_SAMPLES + 1;

export class HighwayDetector {
  /** Ring of positions at consecutive grid steps, oldest first. */
  private xs: number[] = [];
  private ys: number[] = [];
  /** Step number of the newest stored sample; -1 when empty. */
  private lastStep = -1;
  /** Consecutive agreeing evaluations so far. */
  private streak = 0;
  private detected = false;
  private onset = 0;
  private detectedAt = 0;

  reset(): void {
    this.clearHistory();
    this.detected = false;
    this.onset = 0;
    this.detectedAt = 0;
  }

  private clearHistory(): void {
    this.xs.length = 0;
    this.ys.length = 0;
    this.lastStep = -1;
    this.streak = 0;
  }

  /**
   * Advance `sim` by up to `steps` steps (stopping early when every ant has
   * halted, like `Simulation.advance`) while observing the first ant on the
   * step-aligned sampling grid. Returns the number of steps executed. The
   * outcome does not depend on how a caller splits its steps across calls.
   */
  advance(sim: Simulation, steps: number): number {
    if (this.detected) return sim.advance(steps);
    let executed = 0;
    while (executed < steps) {
      const toGrid = SAMPLE_STEPS - (sim.stepCount % SAMPLE_STEPS);
      const chunk = Math.min(steps - executed, toGrid);
      const ran = sim.advance(chunk);
      executed += ran;
      if (ran < chunk) break; // all ants halted
      this.observe(sim);
      if (this.detected) {
        executed += sim.advance(steps - executed);
        break;
      }
    }
    return executed;
  }

  /** Observe the simulation at its current step (grid-aligned steps only). */
  private observe(sim: Simulation): void {
    if (sim.ants.length !== 1 || sim.ants[0].halted) {
      this.clearHistory();
      return;
    }
    this.sample(sim.ants[0], sim.stepCount);
  }

  /**
   * Record the ant's position at `stepCount`. Calls that are not on the
   * sampling grid (a multiple of `SAMPLE_STEPS`) are ignored; a skipped grid
   * step restarts the history so windows are never stretched across a gap.
   */
  sample(ant: AntLike, stepCount: number): void {
    if (this.detected || stepCount % SAMPLE_STEPS !== 0) return;
    if (this.lastStep >= 0 && stepCount !== this.lastStep + SAMPLE_STEPS) {
      if (stepCount === this.lastStep) return; // duplicate
      this.clearHistory(); // gap, or the step counter went backwards (new run)
    }
    this.xs.push(ant.x);
    this.ys.push(ant.y);
    this.lastStep = stepCount;
    if (this.xs.length > HISTORY_SAMPLES) {
      this.xs.shift();
      this.ys.shift();
    }
    if (this.xs.length < HISTORY_SAMPLES) return;

    if (!this.windowsAgree()) {
      this.streak = 0;
      return;
    }
    this.streak++;
    if (this.streak < PERSISTENCE) return;
    this.detected = true;
    this.detectedAt = stepCount;
    this.onset = stepCount - (PERSISTENCE - 1) * SAMPLE_STEPS - STABLE_WINDOWS * WINDOW_STEPS;
    this.clearHistory();
  }

  /** Do the last STABLE_WINDOWS windows drift at the same nonzero velocity? */
  private windowsAgree(): boolean {
    // Window k (0 = oldest) spans samples [k*W, (k+1)*W].
    let refVx = 0;
    let refVy = 0;
    for (let k = 0; k < STABLE_WINDOWS; k++) {
      const a = k * WINDOW_SAMPLES;
      const b = a + WINDOW_SAMPLES;
      const vx = (this.xs[b] - this.xs[a]) / WINDOW_STEPS;
      const vy = (this.ys[b] - this.ys[a]) / WINDOW_STEPS;
      if (Math.hypot(vx, vy) < MIN_SPEED) return false;
      if (k === 0) {
        refVx = vx;
        refVy = vy;
      } else if (Math.abs(vx - refVx) > VEL_TOLERANCE || Math.abs(vy - refVy) > VEL_TOLERANCE) {
        return false;
      }
    }
    return true;
  }

  get isHighway(): boolean {
    return this.detected;
  }

  /** Estimated step at which the highway began (back-dated; see class docs). */
  get onsetStep(): number {
    return this.onset;
  }

  /** Step at which the detector became confident. */
  get detectedStep(): number {
    return this.detectedAt;
  }
}
