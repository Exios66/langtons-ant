/**
 * A small dependency-free line chart on Canvas2D: one shared y-axis from
 * zero, recessive grid, 2px lines, an end dot per series, an HTML legend for
 * two or more series and a crosshair tooltip on hover. Colors and ink come
 * from CSS custom properties so the chart follows the light/dark theme.
 */

import { niceScale, type Series } from "./analytics";
import { fmtCompact, fmtInt } from "./format";

export interface ChartSeriesSpec {
  name: string;
  /** CSS custom property holding the series color, e.g. "--series-1". */
  colorVar: string;
  /** Index into the Series' value arrays; defaults to the series' position. */
  valueIndex?: number;
}

export interface ChartOptions {
  title: string;
  xName: string;
  series: ChartSeriesSpec[];
  height?: number;
}

export interface ChartMarker {
  x: number;
  label: string;
}

const PAD_L = 38;
const PAD_R = 10;
const PAD_T = 8;
const PAD_B = 18;

export class LineChart {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tip: HTMLElement;
  private readonly opts: ChartOptions;
  private data: Series | null = null;
  private marker: ChartMarker | null = null;
  private hoverIndex = -1;
  private cssW = 0;
  private readonly cssH: number;

  constructor(host: HTMLElement, opts: ChartOptions) {
    this.opts = opts;
    this.cssH = opts.height ?? 120;
    this.root = document.createElement("figure");
    this.root.className = "chart";

    const head = document.createElement("figcaption");
    head.className = "chart-head";
    const title = document.createElement("span");
    title.className = "chart-title";
    title.textContent = opts.title;
    head.appendChild(title);
    if (opts.series.length > 1) {
      const legend = document.createElement("span");
      legend.className = "chart-legend";
      for (const s of opts.series) {
        const item = document.createElement("span");
        item.className = "chart-key";
        const dot = document.createElement("i");
        dot.style.background = `var(${s.colorVar})`;
        item.appendChild(dot);
        item.appendChild(document.createTextNode(s.name));
        legend.appendChild(item);
      }
      head.appendChild(legend);
    }
    this.root.appendChild(head);

    const plot = document.createElement("div");
    plot.className = "chart-plot";
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", `${opts.title} over ${opts.xName}`);
    this.canvas.style.height = `${this.cssH}px`;
    plot.appendChild(this.canvas);
    this.tip = document.createElement("div");
    this.tip.className = "chart-tip";
    this.tip.hidden = true;
    plot.appendChild(this.tip);
    this.root.appendChild(plot);
    host.appendChild(this.root);

    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.canvas.addEventListener("pointermove", (e) => this.onHover(e));
    this.canvas.addEventListener("pointerleave", () => {
      this.hoverIndex = -1;
      this.tip.hidden = true;
      this.draw();
    });
  }

  setData(series: Series, marker: ChartMarker | null = null): void {
    this.data = series;
    this.marker = marker;
    this.draw();
  }

  private xRange(): [number, number] {
    const xs = this.data?.xs ?? [];
    if (xs.length === 0) return [0, 1];
    const x0 = xs[0];
    const x1 = xs[xs.length - 1];
    return [x0, x1 > x0 ? x1 : x0 + 1];
  }

  private onHover(e: PointerEvent): void {
    const d = this.data;
    if (d === null || d.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const [x0, x1] = this.xRange();
    const plotW = rect.width - PAD_L - PAD_R;
    const xv = x0 + ((e.clientX - rect.left - PAD_L) / plotW) * (x1 - x0);
    // Nearest sample by x (xs ascend).
    let lo = 0;
    let hi = d.xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (d.xs[mid] < xv) lo = mid;
      else hi = mid;
    }
    this.hoverIndex = Math.abs(d.xs[lo] - xv) <= Math.abs(d.xs[hi] - xv) ? lo : hi;
    const i = this.hoverIndex;
    this.tip.replaceChildren();
    const headRow = document.createElement("div");
    headRow.className = "chart-tip-x";
    headRow.textContent = `${this.opts.xName} ${fmtInt(d.xs[i])}`;
    this.tip.appendChild(headRow);
    this.opts.series.forEach((s, k) => {
      const v = d.ys[s.valueIndex ?? k][i];
      const row = document.createElement("div");
      row.className = "chart-tip-row";
      const dot = document.createElement("i");
      dot.style.background = `var(${s.colorVar})`;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(`${s.name}  ${Number.isFinite(v) ? fmtInt(v) : "—"}`));
      this.tip.appendChild(row);
    });
    this.tip.hidden = false;
    const px = PAD_L + ((d.xs[i] - x0) / (x1 - x0)) * plotW;
    const right = px > rect.width / 2;
    this.tip.style.left = right ? "" : `${px + 8}px`;
    this.tip.style.right = right ? `${rect.width - px + 8}px` : "";
    this.draw();
  }

  draw(): void {
    const w = this.canvas.clientWidth;
    if (w <= 0) return; // hidden (collapsed section or other mode)
    const h = this.cssH;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== this.cssW || this.canvas.width !== Math.round(w * dpr)) {
      this.cssW = w;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    const css = getComputedStyle(this.root);
    const ink = css.getPropertyValue("--text-dim").trim() || "#999";
    const grid = css.getPropertyValue("--line").trim() || "rgba(128,128,128,0.2)";
    const surface = css.getPropertyValue("--chart-surface").trim() || "#000";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const d = this.data;
    const plotW = w - PAD_L - PAD_R;
    const plotH = h - PAD_T - PAD_B;
    let maxV = 0;
    if (d !== null) {
      this.opts.series.forEach((sp, k) => {
        for (const v of d.ys[sp.valueIndex ?? k]) if (v > maxV) maxV = v;
      });
    }
    const scale = niceScale(maxV);
    const [x0, x1] = this.xRange();
    const sx = (x: number): number => PAD_L + ((x - x0) / (x1 - x0)) * plotW;
    const sy = (v: number): number => PAD_T + plotH - (v / scale.max) * plotH;

    // Grid and y labels.
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.lineWidth = 1;
    for (let v = 0; v <= scale.max + scale.step * 0.01; v += scale.step) {
      const y = Math.round(sy(v)) + 0.5;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(w - PAD_R, y);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.fillText(fmtCompact(v), PAD_L - 5, y);
    }
    // X extent labels.
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ink;
    ctx.textAlign = "left";
    ctx.fillText(fmtCompact(x0), PAD_L, h - 4);
    ctx.textAlign = "right";
    ctx.fillText(`${fmtCompact(x1)} ${this.opts.xName}`, w - PAD_R, h - 4);

    if (d === null || d.length === 0) {
      ctx.textAlign = "center";
      ctx.fillText("waiting for data", PAD_L + plotW / 2, PAD_T + plotH / 2);
      return;
    }

    // Annotation marker (e.g. highway onset).
    const m = this.marker;
    if (m !== null && m.x >= x0 && m.x <= x1) {
      const mx = Math.round(sx(m.x)) + 0.5;
      ctx.strokeStyle = ink;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, PAD_T);
      ctx.lineTo(mx, PAD_T + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ink;
      ctx.textAlign = mx > PAD_L + plotW / 2 ? "right" : "left";
      ctx.fillText(m.label, mx + (ctx.textAlign === "right" ? -4 : 4), PAD_T + 9);
    }

    // Series lines, then end dots ringed in the surface color.
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    this.opts.series.forEach((s, k) => {
      const color = css.getPropertyValue(s.colorVar).trim() || "#888";
      const ys = d.ys[s.valueIndex ?? k];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let pen = false;
      let lastX = 0;
      let lastY = 0;
      for (let i = 0; i < ys.length; i++) {
        const v = ys[i];
        if (!Number.isFinite(v)) {
          pen = false;
          continue;
        }
        lastX = sx(d.xs[i]);
        lastY = sy(v);
        if (pen) ctx.lineTo(lastX, lastY);
        else ctx.moveTo(lastX, lastY);
        pen = true;
      }
      ctx.stroke();
      if (pen) {
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Hover crosshair.
    const hi = this.hoverIndex;
    if (hi >= 0 && hi < d.length) {
      const hx = Math.round(sx(d.xs[hi])) + 0.5;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, PAD_T);
      ctx.lineTo(hx, PAD_T + plotH);
      ctx.stroke();
      this.opts.series.forEach((s, k) => {
        const v = d.ys[s.valueIndex ?? k][hi];
        if (!Number.isFinite(v)) return;
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.arc(hx, sy(v), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = css.getPropertyValue(s.colorVar).trim() || "#888";
        ctx.beginPath();
        ctx.arc(hx, sy(v), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}
