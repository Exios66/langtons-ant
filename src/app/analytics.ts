/**
 * Bounded time series for the live charts.
 *
 * A run can last billions of steps, so a series cannot keep every sample.
 * `Series` holds at most `capacity` points: when it fills up it drops every
 * other point and doubles the spacing it asks for, so the chart always shows
 * the whole run at a resolution of capacity/2..capacity points.
 */

export class Series {
  readonly capacity: number;
  readonly xs: number[] = [];
  /** One array per measured value, parallel to `xs`. */
  readonly ys: number[][];
  /** Minimum x distance between kept samples; doubles on each compaction. */
  spacing: number;
  private readonly initialSpacing: number;

  constructor(valueCount: number, spacing: number, capacity = 512) {
    if (capacity < 4) throw new Error("capacity must be at least 4");
    this.capacity = capacity;
    this.spacing = this.initialSpacing = spacing;
    this.ys = Array.from({ length: valueCount }, () => []);
  }

  get length(): number {
    return this.xs.length;
  }

  /** True when a sample at `x` is far enough past the last one to keep. */
  due(x: number): boolean {
    const n = this.xs.length;
    return n === 0 || x - this.xs[n - 1] >= this.spacing;
  }

  push(x: number, values: ReadonlyArray<number>): void {
    this.xs.push(x);
    for (let k = 0; k < this.ys.length; k++) this.ys[k].push(values[k] ?? NaN);
    if (this.xs.length >= this.capacity) this.compact();
  }

  private compact(): void {
    const keep = (arr: number[]): void => {
      let w = 0;
      for (let r = 0; r < arr.length; r += 2) arr[w++] = arr[r];
      arr.length = w;
    };
    keep(this.xs);
    for (const y of this.ys) keep(y);
    this.spacing *= 2;
  }

  clear(): void {
    this.xs.length = 0;
    for (const y of this.ys) y.length = 0;
    this.spacing = this.initialSpacing;
  }

  /** CSV with a header row; NaN values are left blank. */
  toCSV(xName: string, names: ReadonlyArray<string>): string {
    const rows = [[xName, ...names].join(",")];
    for (let i = 0; i < this.xs.length; i++) {
      const cells = [String(this.xs[i])];
      for (const y of this.ys) cells.push(Number.isFinite(y[i]) ? String(Math.round(y[i] * 1000) / 1000) : "");
      rows.push(cells.join(","));
    }
    return rows.join("\n") + "\n";
  }
}

/**
 * A "nice" axis maximum and tick step for values in [0, max]: the step is
 * 1, 2 or 5 times a power of ten and there are 2 to 5 intervals.
 */
export function niceScale(max: number, intervals = 4): { max: number; step: number } {
  if (!(max > 0) || !Number.isFinite(max)) return { max: 1, step: 0.5 };
  const raw = max / intervals;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  return { max: Math.ceil(max / step - 1e-9) * step, step };
}
