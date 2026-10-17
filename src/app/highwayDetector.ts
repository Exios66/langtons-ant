/**
 * Heuristic highway detector for a single ant.
 *
 * A "highway" (Lutfalla's formal definition, arXiv:2506.10482) is a
 * trajectory that becomes periodic with a fixed drift. Detecting that
 * rigorously is research-grade; this detector uses the practical signal that
 * the ant's *average velocity* over a sliding window stabilizes to a nonzero
 * constant for several consecutive windows. The classic ant's highway drifts
 * ~2 cells per 104 steps, so its windowed velocity is ~0.019 px/step and
 * rock-steady; the chaos phase averages ~0.0 and jitters between windows.
 *
 * Sampling is cheap (O(1) per call) and is meant to be invoked from the
 * render loop once per frame; internally it only recomputes every
 * `sampleEvery` steps.
 */
export interface AntLike {
  x: number;
  y: number;
}

export class HighwayDetector {
  private positions: { x: number; y: number }[] = [];
  private windowSize = 500;
  private sampleEvery = 200;
  private lastSampleStep = -Infinity;
  private velocities: { vx: number; vy: number }[] = [];
  private stableCount = 0;
  private stableThreshold = 3;
  private velTolerance = 0.0025;
  private minSpeed = 0.005;
  private detected = false;
  private detectedStep = 0;

  reset(): void {
    this.positions.length = 0;
    this.velocities.length = 0;
    this.stableCount = 0;
    this.detected = false;
    this.detectedStep = 0;
    this.lastSampleStep = -Infinity;
  }

  sample(ant: AntLike, stepCount: number): void {
    if (stepCount - this.lastSampleStep < this.sampleEvery) return;
    this.lastSampleStep = stepCount;
    this.positions.push({ x: ant.x, y: ant.y });
    if (this.positions.length < this.windowSize + 1) return;

    const n = this.positions.length;
    const a = this.positions[n - 1];
    const b = this.positions[n - 1 - this.windowSize];
    const vx = (a.x - b.x) / this.windowSize;
    const vy = (a.y - b.y) / this.windowSize;
    this.velocities.push({ vx, vy });
    if (this.velocities.length > this.stableThreshold + 2) this.velocities.shift();

    const speed = Math.hypot(vx, vy);
    if (speed < this.minSpeed) {
      this.stableCount = 0;
      return;
    }
    if (this.velocities.length < 2) return;
    const prev = this.velocities[this.velocities.length - 2];
    if (Math.abs(vx - prev.vx) < this.velTolerance && Math.abs(vy - prev.vy) < this.velTolerance) {
      this.stableCount++;
    } else {
      this.stableCount = 0;
    }
    if (!this.detected && this.stableCount >= this.stableThreshold) {
      this.detected = true;
      this.detectedStep = stepCount;
    }
  }

  get isHighway(): boolean {
    return this.detected;
  }

  get onsetStep(): number {
    return this.detectedStep;
  }
}
