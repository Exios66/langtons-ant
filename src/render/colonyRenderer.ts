/**
 * Canvas2D renderer for the colony simulation.
 *
 * Two offscreen images at 1 px per cell are rebuilt each frame:
 *   - the field image: soil plus every colony's pheromones, blended in the
 *     colony's color; drawn with smoothing so trails read as a soft glow;
 *   - the overlay image: walls and food, transparent elsewhere; drawn with
 *     smoothing off so they stay crisp.
 * Nests and ants are vector-drawn on top. Ant positions are interpolated
 * between the previous and current tick (`alpha`), so motion stays smooth
 * when the simulation runs slower than the display.
 */

import { CASTE_SOLDIER, STATE_CARRY, type ColonySim } from "../colony/sim";

export interface ColonyLayers {
  trail: boolean;
  home: boolean;
  alarm: boolean;
}

type RGB = readonly [number, number, number];

interface Theme {
  soil: RGB;
  wall: RGB;
  food: RGB;
  alarm: RGB;
  ink: string;
  colonies: readonly RGB[];
  /** Ant body = colony color mixed toward this, so ants stand out on their own trail. */
  antMix: RGB;
}

/** Categorical colony colors, in fixed order (same values as the --series-n CSS tokens). */
const DARK: Theme = {
  soil: [13, 15, 20],
  wall: [52, 58, 70],
  food: [214, 240, 120],
  alarm: [230, 103, 103],
  ink: "#f0efec",
  colonies: [
    [57, 135, 229],
    [217, 89, 38],
    [25, 158, 112],
    [201, 133, 0],
  ],
  antMix: [255, 255, 255],
};

const LIGHT: Theme = {
  soil: [240, 237, 228],
  wall: [120, 116, 108],
  food: [60, 120, 20],
  alarm: [208, 59, 59],
  ink: "#0b0b0b",
  colonies: [
    [42, 120, 214],
    [235, 104, 52],
    [27, 175, 122],
    [237, 161, 0],
  ],
  antMix: [0, 0, 0],
};

const css = (c: RGB, a = 1): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

export class ColonyRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private fieldCanvas = document.createElement("canvas");
  private overlayCanvas = document.createElement("canvas");
  private fieldImg: ImageData | null = null;
  private overlayImg: ImageData | null = null;
  private noise = new Int8Array(0);

  constructor(canvas: HTMLCanvasElement) {
    // Same context the turmite renderer uses; the two never draw in one frame.
    this.ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
  }

  private ensure(sim: ColonySim): void {
    if (this.fieldImg !== null && this.fieldImg.width === sim.w && this.fieldImg.height === sim.h) return;
    for (const c of [this.fieldCanvas, this.overlayCanvas]) {
      c.width = sim.w;
      c.height = sim.h;
    }
    this.fieldImg = new ImageData(sim.w, sim.h);
    this.overlayImg = new ImageData(sim.w, sim.h);
    // Fixed per-cell grain so soil and rock are not flat fills.
    this.noise = new Int8Array(sim.w * sim.h);
    for (let i = 0; i < this.noise.length; i++) {
      let hsh = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
      hsh ^= hsh >>> 13;
      hsh = Math.imul(hsh, 0xc2b2ae35);
      this.noise[i] = ((hsh >>> 16) & 15) - 8;
    }
  }

  private paintImages(sim: ColonySim, th: Theme, layers: ColonyLayers): void {
    const field = (this.fieldImg as ImageData).data;
    const over = (this.overlayImg as ImageData).data;
    const cells = sim.w * sim.h;
    const walls = sim.walls;
    const food = sim.food;
    const noise = this.noise;
    const nCol = sim.colonies.length;
    const [sr, sg, sb] = th.soil;
    for (let i = 0, p = 0; i < cells; i++, p += 4) {
      const grain = noise[i] >> 1;
      let r = sr + grain;
      let g = sg + grain;
      let b = sb + grain;
      if (walls[i] === 0) {
        for (let c = 0; c < nCol; c++) {
          const col = th.colonies[c];
          if (layers.home) {
            const v = sim.home[c][i];
            if (v > 0.02) {
              const t = (v / (v + 4)) * 0.4;
              r += (col[0] - r) * t;
              g += (col[1] - g) * t;
              b += (col[2] - b) * t;
            }
          }
          if (layers.trail) {
            const v = sim.trail[c][i];
            if (v > 0.01) {
              const t = (v / (v + 1.2)) * 0.95;
              r += (col[0] - r) * t;
              g += (col[1] - g) * t;
              b += (col[2] - b) * t;
            }
          }
          if (layers.alarm && nCol > 1) {
            const v = sim.alarm[c][i];
            if (v > 0.02) {
              const t = (v / (v + 1)) * 0.85;
              r += (th.alarm[0] - r) * t;
              g += (th.alarm[1] - g) * t;
              b += (th.alarm[2] - b) * t;
            }
          }
        }
      }
      field[p] = r;
      field[p + 1] = g;
      field[p + 2] = b;
      field[p + 3] = 255;

      if (walls[i] !== 0) {
        over[p] = th.wall[0] + noise[i];
        over[p + 1] = th.wall[1] + noise[i];
        over[p + 2] = th.wall[2] + noise[i];
        over[p + 3] = 255;
      } else if (food[i] > 0) {
        over[p] = th.food[0];
        over[p + 1] = th.food[1];
        over[p + 2] = th.food[2];
        over[p + 3] = Math.min(255, 150 + food[i] * 8);
      } else {
        over[p + 3] = 0;
      }
    }
    (this.fieldCanvas.getContext("2d") as CanvasRenderingContext2D).putImageData(this.fieldImg as ImageData, 0, 0);
    (this.overlayCanvas.getContext("2d") as CanvasRenderingContext2D).putImageData(this.overlayImg as ImageData, 0, 0);
  }

  draw(
    sim: ColonySim,
    cam: { panX: number; panY: number; zoom: number },
    cssW: number,
    cssH: number,
    dpr: number,
    alpha: number,
    light: boolean,
    layers: ColonyLayers,
  ): void {
    if (cssW <= 0 || cssH <= 0) return;
    this.ensure(sim);
    const th = light ? LIGHT : DARK;
    this.paintImages(sim, th, layers);

    const ctx = this.ctx;
    const z = cam.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = css(mix(th.soil, th.antMix, 0.06));
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.fieldCanvas, cam.panX, cam.panY, sim.w * z, sim.h * z);
    ctx.imageSmoothingEnabled = z < 1;
    ctx.drawImage(this.overlayCanvas, cam.panX, cam.panY, sim.w * z, sim.h * z);

    // Nests.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let c = 0; c < sim.colonies.length; c++) {
      const col = sim.colonies[c];
      const cx = col.nestX * z + cam.panX;
      const cy = col.nestY * z + cam.panY;
      const rad = 3.5 * z;
      const color = th.colonies[c];
      const glow = ctx.createRadialGradient(cx, cy, rad * 0.4, cx, cy, rad * 2.6);
      glow.addColorStop(0, css(color, 0.4));
      glow.addColorStop(1, css(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(mix(th.soil, color, 0.35));
      ctx.strokeStyle = css(color);
      ctx.lineWidth = Math.max(1.5, z * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (z >= 3) {
        ctx.fillStyle = th.ink;
        ctx.font = `600 ${Math.round(Math.min(15, Math.max(10, z * 1.9)))}px system-ui, sans-serif`;
        ctx.fillText(String(sim.population(c)), cx, cy);
      }
    }

    // Ants: one stroked path per (colony, soldier?) batch.
    const bodyLen = Math.max(2, z * 0.95);
    const width = Math.max(1.2, z * 0.34);
    ctx.lineCap = "round";
    const minX = -bodyLen;
    const minY = -bodyLen;
    const maxX = cssW + bodyLen;
    const maxY = cssH + bodyLen;
    for (let c = 0; c < sim.colonies.length; c++) {
      const body = css(mix(th.colonies[c], th.antMix, 0.5));
      for (let soldier = 0; soldier <= 1; soldier++) {
        ctx.strokeStyle = body;
        ctx.lineWidth = soldier === 1 ? width * 1.7 : width;
        ctx.beginPath();
        for (let i = 0; i < sim.n; i++) {
          if (sim.colony[i] !== c || (sim.caste[i] === CASTE_SOLDIER ? 1 : 0) !== soldier) continue;
          const x = (sim.px[i] + (sim.x[i] - sim.px[i]) * alpha) * z + cam.panX;
          const y = (sim.py[i] + (sim.y[i] - sim.py[i]) * alpha) * z + cam.panY;
          if (x < minX || y < minY || x > maxX || y > maxY) continue;
          const hx = Math.cos(sim.heading[i]) * bodyLen * 0.5;
          const hy = Math.sin(sim.heading[i]) * bodyLen * 0.5;
          ctx.moveTo(x - hx, y - hy);
          ctx.lineTo(x + hx, y + hy);
        }
        ctx.stroke();
      }
    }
    // Carried food: a dot at the jaws.
    if (z >= 2) {
      ctx.fillStyle = css(th.food);
      const dot = Math.max(1.5, z * 0.3);
      ctx.beginPath();
      for (let i = 0; i < sim.n; i++) {
        if (sim.state[i] !== STATE_CARRY) continue;
        const x = (sim.px[i] + (sim.x[i] - sim.px[i]) * alpha) * z + cam.panX + Math.cos(sim.heading[i]) * bodyLen * 0.6;
        const y = (sim.py[i] + (sim.y[i] - sim.py[i]) * alpha) * z + cam.panY + Math.sin(sim.heading[i]) * bodyLen * 0.6;
        if (x < minX || y < minY || x > maxX || y > maxY) continue;
        ctx.moveTo(x + dot, y);
        ctx.arc(x, y, dot, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }
}
