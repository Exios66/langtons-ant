/**
 * Two-layer Canvas2D renderer.
 *
 * Layer 1: an offscreen "world texture" canvas at exactly 1 pixel per cell,
 * kept updated incrementally with `putImageData`. Layer 2: the visible
 * canvas, repainted with a single scaled `drawImage` of the whole texture
 * under the pan/zoom transform, `imageSmoothingEnabled = false` at 1 px/cell
 * and above (crisp pixels), interpolation on when zoomed out below 1 px/cell.
 *
 * Dirty strategy: the simulation records changed cells in
 * `sim.changedX/changedY`. Up to ~512 changed cells are painted per cell
 * with a reused 1x1 ImageData; beyond that the affected chunk set is
 * repainted through one reused 64x64 ImageData with `putImageData` dirty
 * rects, so only the actually-touched sub-rects are transferred. No
 * ImageData or typed array is allocated per frame (the chunk rect pool and
 * both ImageData buffers are permanent).
 *
 * Texture growth: origin + size track union(visited bbox, viewport). Growth
 * doubles the texture and blits the overlap so painted content survives.
 * Hard caps: 16384 px per axis and a 16.7 Mpx total area budget (a 16384²
 * RGBA texture would cost ~1 GB, which is never acceptable). Past the
 * budget the texture recenters on recent activity (rate-limited) and
 * repaints an anchor-centered chunk window from the authoritative grid;
 * cells outside the texture fall back to the background fill instead of
 * crashing.
 */

import { CHUNK_SIZE, bboxIsEmpty, chunkKey } from "../engine/grid";
import type { Ant, Simulation } from "../engine/simulation";
import { PALETTE_COLORS, type Palette } from "./palette";

const TEXTURE_MAX_AXIS = 16384;
/** ~67 MB RGBA ceiling; protects low-memory devices. */
const TEXTURE_AREA_MAX = 4096 * 4096;
const TEXTURE_INITIAL = 1024;
const GROW_MARGIN = 256;
/** Per-cell putImageData up to this many changed cells, chunk repaints beyond. */
const PER_CELL_LIMIT = 512;
/** Max chunks repainted in one shot (recenter / palette / resync). */
const REPAINT_CHUNK_BUDGET = 4000;
/** Min interval between texture recenters while saturated. */
const RECENTER_MIN_INTERVAL_MS = 250;
/** Afterglow: how many recent writes are remembered, and for how long they glow. */
const GLOW_CAPACITY = 1024;
const GLOW_LIFE_MS = 650;
/** Grid lines appear at this many px per cell and above. */
const GRID_MIN_ZOOM = 10;

interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function makeRect(): Rect {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private tex: HTMLCanvasElement | null = null;
  private tctx: CanvasRenderingContext2D | null = null;
  private texW = 0;
  private texH = 0;
  private originX = 0;
  private originY = 0;

  private sim: Simulation | null = null;

  private colors = new Uint32Array(PALETTE_COLORS);
  private colorCount = PALETTE_COLORS;
  private bgCss = "#000000";
  private accentCss = "#ffcc00";

  private cellImg: ImageData;
  private cellU32: Uint32Array;
  private chunkImg: ImageData;
  private chunkU32: Uint32Array;

  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  private panX = 0;
  private panY = 0;
  private zoom = 6;

  private viewDirty = true;
  private contentDirty = true;

  private anchorX = 0;
  private anchorY = 0;
  private lastRecenterAt = -1e9;

  /** Display options (see setOptions). */
  private afterglow = true;
  private gridLines = true;
  /** 0..1 progress of the marker from its previous cell to its current one; 1 = no tween. */
  private tween = 1;
  /** Ring buffer of recently written cells for the afterglow (x, y, time). */
  private glowX = new Int32Array(GLOW_CAPACITY);
  private glowY = new Int32Array(GLOW_CAPACITY);
  private glowT = new Float64Array(GLOW_CAPACITY).fill(-1e9);
  private glowHead = 0;
  private glowLastAt = -1e9;
  /** Minimap mapping from the last drawMinimap call: world = (px - off) / scale. */
  private miniScale = 1;
  private miniOffX = 0;
  private miniOffY = 0;

  private chunkRects = new Map<number, number>();
  private pool = new Int32Array(1024 * 4);

  private scratch: Rect = makeRect();
  private needRect: Rect = makeRect();
  private viewportRect: Rect = makeRect();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    this.tctx = probe.getContext("2d");
    const tctx = this.tctx as CanvasRenderingContext2D;
    this.cellImg = tctx.createImageData(1, 1);
    this.cellU32 = new Uint32Array(this.cellImg.data.buffer);
    this.chunkImg = tctx.createImageData(CHUNK_SIZE, CHUNK_SIZE);
    this.chunkU32 = new Uint32Array(this.chunkImg.data.buffer);
    this.tctx = null;
    this.colors[0] = 0xff000000;
  }

  // ---------------------------------------------------------------- public

  setSim(sim: Simulation): void {
    this.sim = sim;
    this.anchorX = 0;
    this.anchorY = 0;
    this.prevPos.clear();
    this.glowT.fill(-1e9);
    if (this.tctx !== null && this.texW > 0) {
      this.tctx.clearRect(0, 0, this.texW, this.texH);
    }
    this.contentDirty = true;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr) return;
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.viewDirty = true;
  }

  setCamera(panX: number, panY: number, zoom: number): void {
    if (panX === this.panX && panY === this.panY && zoom === this.zoom) return;
    this.panX = panX;
    this.panY = panY;
    this.zoom = zoom;
    this.viewDirty = true;
  }

  /** Force a recompose on the next frame (e.g. after another renderer used the canvas). */
  invalidate(): void {
    this.viewDirty = true;
  }

  setOptions(o: { afterglow?: boolean; gridLines?: boolean }): void {
    if (o.afterglow !== undefined) this.afterglow = o.afterglow;
    if (o.gridLines !== undefined) this.gridLines = o.gridLines;
    this.viewDirty = true;
  }

  /**
   * Marker tween for slow runs: `t` in [0,1) draws each ant part-way from the
   * cell it just left to the cell it is on; 1 draws it on its cell.
   */
  setTween(t: number): void {
    const v = t < 0 ? 0 : t > 1 ? 1 : t;
    if (v !== this.tween) {
      this.tween = v;
      this.viewDirty = true;
    }
  }

  /** Install a palette with optional per-index overrides (packed colors). */
  setPalette(p: Palette, overrides?: ReadonlyMap<number, number>): void {
    this.colors.set(p.colors);
    this.bgCss = p.backgroundBaseCss;
    if (overrides) {
      for (const [i, v] of overrides) {
        if (i >= 0 && i < this.colors.length) this.colors[i] = v >>> 0;
      }
    }
    this.repaintWorldChunks();
    this.contentDirty = true;
  }

  /** Override a single color index (packed), e.g. from the swatch editor. */
  setOverride(index: number, packed: number): void {
    if (index < 1 || index >= this.colors.length) return;
    this.colors[index] = packed >>> 0;
    this.repaintWorldChunks();
    this.contentDirty = true;
  }

  /** Repaint every chunk that intersects the visited bbox (budgeted). */
  repaintWorldChunks(): void {
    const sim = this.sim;
    if (sim === null || this.tctx === null || this.texW === 0) return;
    const bbox = sim.world.bbox;
    if (bboxIsEmpty(bbox)) return;
    const rect = this.needRect;
    rect.minX = bbox.minX;
    rect.minY = bbox.minY;
    rect.maxX = bbox.maxX;
    rect.maxY = bbox.maxY;
    this.repaintChunkWindow(rect, bbox);
  }

  /** Last known live-ant positions (identity-keyed), reused without churn. */
  private prevPos = new Map<Ant, { x: number; y: number; px: number; py: number }>();

  /** One composed frame; call every animation tick. Cheap when idle. */
  frame(): void {
    const sim = this.sim;
    if (sim === null) return;

    const count = sim.changedCount;
    if (count > 0) {
      const ch = this.scratch;
      const xs = sim.changedX;
      const ys = sim.changedY;
      // The engine's changed-record buffers can lag behind changedCount when
      // a large batch outruns their capacity (dropped tail records); clamp
      // to what is actually recorded and re-sync the corridor from the
      // authoritative grid below.
      const safeCount = Math.min(count, xs.length, ys.length);
      const minX = xs[0];
      const minY = ys[0];
      let bxMin = minX;
      let byMin = minY;
      let bxMax = minX;
      let byMax = minY;
      for (let i = 1; i < safeCount; i++) {
        const x = xs[i];
        const y = ys[i];
        if (x < bxMin) bxMin = x;
        else if (x > bxMax) bxMax = x;
        if (y < byMin) byMin = y;
        else if (y > byMax) byMax = y;
      }
      ch.minX = bxMin;
      ch.minY = byMin;
      ch.maxX = bxMax;
      ch.maxY = byMax;
      this.anchorX = (bxMin + bxMax) / 2;
      this.anchorY = (byMin + byMax) / 2;

      this.ensureTexture(ch);
      if (safeCount < count) this.repaintAntCorridors();
      this.paintChanges(safeCount);
      sim.resetChanged();
      this.contentDirty = true;
    }

    this.trackAntPositions();
    // Fading afterglow needs frames even when nothing else changes.
    if (this.afterglow && performance.now() - this.glowLastAt < GLOW_LIFE_MS) this.contentDirty = true;
    if (this.viewDirty || this.contentDirty) {
      this.compose();
      this.viewDirty = false;
      this.contentDirty = false;
    }
  }

  /**
   * Update the tween records and notice ants added or removed outside a step
   * (edits while paused), which change no cells but must still be drawn.
   */
  private trackAntPositions(): void {
    const sim = this.sim;
    if (sim === null) return;
    let live = 0;
    let added = false;
    for (const ant of sim.ants) {
      if (ant.halted) {
        if (this.prevPos.delete(ant)) this.contentDirty = true;
        continue;
      }
      live++;
      let prev = this.prevPos.get(ant);
      if (prev === undefined) {
        this.prevPos.set(ant, { x: ant.x, y: ant.y, px: ant.x, py: ant.y });
        added = true;
      } else if (prev.x !== ant.x || prev.y !== ant.y) {
        prev.px = prev.x;
        prev.py = prev.y;
        prev.x = ant.x;
        prev.y = ant.y;
      }
    }
    if (this.prevPos.size !== live) {
      // Some tracked ants left sim.ants: drop them so they are neither drawn
      // from stale state nor retained.
      const current = new Set(sim.ants);
      for (const ant of this.prevPos.keys()) {
        if (!current.has(ant)) this.prevPos.delete(ant);
      }
      added = true;
    }
    if (added) this.contentDirty = true;
  }

  /**
   * Corridor resync: when the engine dropped change records this frame,
   * repaint the chunks between each live ant's previous and current cell
   * straight from the grid, so the trail stays gap-free at interactive
   * speeds. Skipped per ant when the corridor exceeds 64 chunks (turbo
   * batches), where per-cell detail is invisible anyway.
   */
  private repaintAntCorridors(): void {
    const sim = this.sim;
    if (sim === null) return;
    for (const ant of sim.ants) {
      if (ant.halted) continue;
      const prev = this.prevPos.get(ant);
      if (prev === undefined) continue;
      if (prev.x === ant.x && prev.y === ant.y) continue;
      const rect = this.needRect;
      rect.minX = Math.min(prev.x, ant.x) - 1;
      rect.minY = Math.min(prev.y, ant.y) - 1;
      rect.maxX = Math.max(prev.x, ant.x) + 1;
      rect.maxY = Math.max(prev.y, ant.y) + 1;
      this.repaintChunkWindow(rect, rect, 64);
    }
  }

  // ------------------------------------------------------------- internals

  private computeViewportRect(): void {
    const v = this.viewportRect;
    const z = this.zoom;
    // Cells are unit squares anchored at their integer coordinates.
    v.minX = Math.floor((0 - this.panX) / z);
    v.minY = Math.floor((0 - this.panY) / z);
    v.maxX = Math.floor((this.cssW - this.panX) / z) + 1;
    v.maxY = Math.floor((this.cssH - this.panY) / z) + 1;
  }

  /**
   * Grow/recenter the texture so that union(need, viewport) is covered.
   * Returns true when the texture was recreated and its content discarded,
   * in which case a chunk window was repainted from the authoritative grid.
   */
  private ensureTexture(need: Rect): boolean {
    this.computeViewportRect();
    const v = this.viewportRect;
    const n = this.needRect;
    n.minX = Math.min(need.minX, v.minX) - 32;
    n.minY = Math.min(need.minY, v.minY) - 32;
    n.maxX = Math.max(need.maxX, v.maxX) + 32;
    n.maxY = Math.max(need.maxY, v.maxY) + 32;

    if (
      this.texW > 0 &&
      n.minX >= this.originX &&
      n.minY >= this.originY &&
      n.maxX < this.originX + this.texW &&
      n.maxY < this.originY + this.texH
    ) {
      return false;
    }

    const spanX = n.maxX - n.minX + 1 + GROW_MARGIN * 2;
    const spanY = n.maxY - n.minY + 1 + GROW_MARGIN * 2;

    let w = spanX;
    let h = spanY;
    let ox = this.texW > 0 ? Math.min(this.originX, n.minX - GROW_MARGIN) : n.minX - GROW_MARGIN;
    let oy = this.texW > 0 ? Math.min(this.originY, n.minY - GROW_MARGIN) : n.minY - GROW_MARGIN;

    if (w > TEXTURE_MAX_AXIS || h > TEXTURE_MAX_AXIS || w * h > TEXTURE_AREA_MAX) {
      // Budget exceeded: proportionally shrink the window and recenter it on
      // recent activity, discarding old texture content.
      const now = performance.now();
      if (now - this.lastRecenterAt < RECENTER_MIN_INTERVAL_MS) return false;
      this.lastRecenterAt = now;
      // Prefer covering the larger span; shrink both so area fits.
      const shrink = Math.sqrt(TEXTURE_AREA_MAX / (w * h));
      w = Math.min(TEXTURE_MAX_AXIS, Math.max(256, Math.floor(w * shrink)));
      h = Math.min(TEXTURE_MAX_AXIS, Math.max(256, Math.floor(h * shrink)));
      ox = Math.round(this.anchorX) - (w >> 1);
      oy = Math.round(this.anchorY) - (h >> 1);
      this.allocTexture(w, h, ox, oy, false);
      // Repaint what the viewport can see around the anchor.
      this.computeViewportRect();
      const cover = this.needRect;
      cover.minX = Math.max(this.viewportRect.minX, ox);
      cover.minY = Math.max(this.viewportRect.minY, oy);
      cover.maxX = Math.min(this.viewportRect.maxX, ox + w - 1);
      cover.maxY = Math.min(this.viewportRect.maxY, oy + h - 1);
      this.repaintChunkWindow(cover, cover);
      return true;
    }

    // Normal growth: double up and blit the overlap.
    w = Math.max(this.texW * 2, w, TEXTURE_INITIAL);
    h = Math.max(this.texH * 2, h, TEXTURE_INITIAL);
    if (w > TEXTURE_MAX_AXIS) w = TEXTURE_MAX_AXIS;
    if (h > TEXTURE_MAX_AXIS) h = TEXTURE_MAX_AXIS;
    while (w * h > TEXTURE_AREA_MAX) {
      if (w >= h) w = Math.floor(w / 2);
      else h = Math.floor(h / 2);
    }
    if (w === this.texW && h === this.texH && this.texW > 0) {
      // Same size but shifted need: recenter (rate-limited path too).
      const now = performance.now();
      if (now - this.lastRecenterAt < RECENTER_MIN_INTERVAL_MS) return false;
      this.lastRecenterAt = now;
      ox = Math.round(this.anchorX) - (w >> 1);
      oy = Math.round(this.anchorY) - (h >> 1);
      this.allocTexture(w, h, ox, oy, false);
      this.computeViewportRect();
      const cover = this.needRect;
      cover.minX = Math.max(this.viewportRect.minX, ox);
      cover.minY = Math.max(this.viewportRect.minY, oy);
      cover.maxX = Math.min(this.viewportRect.maxX, ox + w - 1);
      cover.maxY = Math.min(this.viewportRect.maxY, oy + h - 1);
      this.repaintChunkWindow(cover, cover);
      return true;
    }

    const wx = this.texW > 0 ? Math.min(this.originX, n.minX - GROW_MARGIN) : n.minX - GROW_MARGIN;
    const wy = this.texW > 0 ? Math.min(this.originY, n.minY - GROW_MARGIN) : n.minY - GROW_MARGIN;
    if (wx + w <= n.maxX) w = Math.min(TEXTURE_MAX_AXIS, n.maxX + 1 + GROW_MARGIN - wx);
    if (wy + h <= n.maxY) h = Math.min(TEXTURE_MAX_AXIS, n.maxY + 1 + GROW_MARGIN - wy);
    while (w * h > TEXTURE_AREA_MAX) {
      if (w >= h) w = Math.floor(w / 2);
      else h = Math.floor(h / 2);
    }
    this.allocTexture(w, h, wx, wy, true);
    return false;
  }

  private allocTexture(w: number, h: number, ox: number, oy: number, blit: boolean): void {
    const next = document.createElement("canvas");
    next.width = w;
    next.height = h;
    const ntctx = next.getContext("2d") as CanvasRenderingContext2D;
    if (blit && this.tex !== null && this.tctx !== null && this.texW > 0) {
      ntctx.drawImage(this.tex, this.originX - ox, this.originY - oy);
    }
    this.tex = next;
    this.tctx = ntctx;
    this.texW = w;
    this.texH = h;
    this.originX = ox;
    this.originY = oy;
    this.contentDirty = true;
  }

  // ------------------------------------------------------------ grid paint

  private recordGlow(xs: ArrayLike<number>, ys: ArrayLike<number>, from: number, to: number): void {
    if (from >= to) return;
    const now = performance.now();
    this.glowLastAt = now;
    let g = this.glowHead;
    for (let i = from; i < to; i++) {
      this.glowX[g] = xs[i];
      this.glowY[g] = ys[i];
      this.glowT[g] = now;
      g = (g + 1) % GLOW_CAPACITY;
    }
    this.glowHead = g;
  }

  private paintChanges(count: number): void {
    const tctx = this.tctx;
    const sim = this.sim;
    if (tctx === null || sim === null) return;
    const xs = sim.changedX;
    const ys = sim.changedY;
    const world = sim.world;
    const oX = this.originX;
    const oY = this.originY;
    const texW = this.texW;
    const texH = this.texH;

    // Afterglow keeps the most recent changes; older ones in a big batch
    // would be overwritten in the ring anyway.
    this.recordGlow(xs, ys, Math.max(0, count - GLOW_CAPACITY), count);

    if (count <= PER_CELL_LIMIT) {
      const cell = this.cellImg;
      const cellU32 = this.cellU32;
      for (let i = 0; i < count; i++) {
        const x = xs[i];
        const y = ys[i];
        const px = x - oX;
        const py = y - oY;
        if (px < 0 || py < 0 || px >= texW || py >= texH) continue;
        cellU32[0] = this.colors[world.get(x, y)];
        tctx.putImageData(cell, px, py);
      }
      return;
    }

    // Chunked path: collect the affected chunk set and the touched
    // sub-rect inside each chunk, then repaint through the reused 64x64
    // ImageData with dirty-rect putImageData.
    this.chunkRects.clear();
    let poolUsed = 0;
    for (let i = 0; i < count; i++) {
      const x = xs[i];
      const y = ys[i];
      const key = chunkKey(x >> 6, y >> 6);
      let slot = this.chunkRects.get(key);
      if (slot === undefined) {
        if ((poolUsed + 1) * 4 > this.pool.length) {
          const bigger = new Int32Array(this.pool.length * 2);
          bigger.set(this.pool);
          this.pool = bigger;
        }
        slot = poolUsed;
        poolUsed++;
        this.chunkRects.set(key, slot);
        const base = slot * 4;
        this.pool[base] = x;
        this.pool[base + 1] = y;
        this.pool[base + 2] = x;
        this.pool[base + 3] = y;
      } else {
        const base = slot * 4;
        if (x < this.pool[base]) this.pool[base] = x;
        if (y < this.pool[base + 1]) this.pool[base + 1] = y;
        if (x > this.pool[base + 2]) this.pool[base + 2] = x;
        if (y > this.pool[base + 3]) this.pool[base + 3] = y;
      }
    }

    const u32 = this.chunkU32;
    for (const [key, slot] of this.chunkRects) {
      const base = slot * 4;
      const bx0 = this.pool[base];
      const by0 = this.pool[base + 1];
      const bx1 = this.pool[base + 2];
      const by1 = this.pool[base + 3];
      // key = cx * 2^32 + cy with cy possibly negative: round-split decode
      // (Math.floor would mis-decode negative keys onto a bogus chunk).
      const cx = Math.round(key / 4294967296);
      const cy = key - cx * 4294967296;
      const chunkX = cx * CHUNK_SIZE;
      const chunkY = cy * CHUNK_SIZE;

      // Intersect the touched sub-rect with texture coverage.
      let lx0 = Math.max(bx0 - chunkX, oX - chunkX, 0);
      let ly0 = Math.max(by0 - chunkY, oY - chunkY, 0);
      const lx1 = Math.min(bx1 - chunkX, oX + texW - 1 - chunkX, CHUNK_SIZE - 1);
      const ly1 = Math.min(by1 - chunkY, oY + texH - 1 - chunkY, CHUNK_SIZE - 1);
      if (lx0 > lx1 || ly0 > ly1) continue;

      for (let ly = ly0; ly <= ly1; ly++) {
        const wy = chunkY + ly;
        const row = ly * CHUNK_SIZE;
        for (let lx = lx0; lx <= lx1; lx++) {
          u32[row + lx] = this.colors[world.get(chunkX + lx, wy)] | 0xff000000;
        }
      }
      tctx.putImageData(this.chunkImg, chunkX - oX, chunkY - oY, lx0, ly0, lx1 - lx0 + 1, ly1 - ly0 + 1);
    }
    this.chunkRects.clear();
  }

  /** Repaint full chunks inside `rect`, budgeted, centered on `focus`. */
  private repaintChunkWindow(rect: Rect, focus: Rect, budget: number = REPAINT_CHUNK_BUDGET): void {
    const tctx = this.tctx;
    const sim = this.sim;
    if (tctx === null || sim === null || this.texW === 0) return;
    const world = sim.world;

    let cx0 = rect.minX >> 6;
    let cy0 = rect.minY >> 6;
    let cx1 = rect.maxX >> 6;
    let cy1 = rect.maxY >> 6;
    let cols = cx1 - cx0 + 1;
    let rows = cy1 - cy0 + 1;
    if (cols <= 0 || rows <= 0) return;
    if (cols * rows > budget) {
      // Clamp the window to the budget, centered on the focus point.
      const k = Math.sqrt(budget / (cols * rows));
      cols = Math.max(1, Math.floor(cols * k));
      rows = Math.max(1, Math.floor(rows * k));
      const fcx = Math.floor((focus.minX + focus.maxX) / 2) >> 6;
      const fcy = Math.floor((focus.minY + focus.maxY) / 2) >> 6;
      cx0 = fcx - (cols >> 1);
      cy0 = fcy - (rows >> 1);
      cx1 = cx0 + cols - 1;
      cy1 = cy0 + rows - 1;
    }

    const u32 = this.chunkU32;
    const oX = this.originX;
    const oY = this.originY;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const chunkX = cx * CHUNK_SIZE;
        const chunkY = cy * CHUNK_SIZE;
        let lx0 = Math.max(oX - chunkX, 0);
        let ly0 = Math.max(oY - chunkY, 0);
        const lx1 = Math.min(oX + this.texW - 1 - chunkX, CHUNK_SIZE - 1);
        const ly1 = Math.min(oY + this.texH - 1 - chunkY, CHUNK_SIZE - 1);
        if (lx0 > lx1 || ly0 > ly1) continue;
        for (let ly = ly0; ly <= ly1; ly++) {
          const row = ly * CHUNK_SIZE;
          const wy = chunkY + ly;
          for (let lx = lx0; lx <= lx1; lx++) {
            u32[row + lx] = this.colors[world.get(chunkX + lx, wy)];
          }
        }
        tctx.putImageData(this.chunkImg, chunkX - oX, chunkY - oY, lx0, ly0, lx1 - lx0 + 1, ly1 - ly0 + 1);
      }
    }
  }

  // --------------------------------------------------------------- compose

  private compose(): void {
    if (this.cssW <= 0 || this.cssH <= 0) return;
    const ctx = this.ctx;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.bgCss;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (this.tex !== null && this.texW > 0) {
      const z = this.zoom;
      ctx.imageSmoothingEnabled = z < 1;
      ctx.imageSmoothingQuality = "medium";
      ctx.drawImage(
        this.tex,
        this.originX * z + this.panX,
        this.originY * z + this.panY,
        this.texW * z,
        this.texH * z,
      );
    }

    const z = this.zoom;

    if (this.gridLines && z >= GRID_MIN_ZOOM) {
      ctx.strokeStyle = `rgba(128,128,128,${Math.min(0.22, 0.08 + (z - GRID_MIN_ZOOM) * 0.008)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const x0 = Math.floor(-this.panX / z);
      const y0 = Math.floor(-this.panY / z);
      for (let x = x0; x * z + this.panX <= this.cssW; x++) {
        const sx = Math.round(x * z + this.panX) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, this.cssH);
      }
      for (let y = y0; y * z + this.panY <= this.cssH; y++) {
        const sy = Math.round(y * z + this.panY) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(this.cssW, sy);
      }
      ctx.stroke();
    }

    if (this.afterglow && z >= 1.5) {
      const now = performance.now();
      ctx.fillStyle = this.accentCss;
      for (let i = 0; i < GLOW_CAPACITY; i++) {
        const age = now - this.glowT[i];
        if (age >= GLOW_LIFE_MS) continue;
        const k = 1 - age / GLOW_LIFE_MS;
        ctx.globalAlpha = k * k * 0.6;
        ctx.fillRect(this.glowX[i] * z + this.panX, this.glowY[i] * z + this.panY, z, z);
      }
      ctx.globalAlpha = 1;
    }

    const sim = this.sim;
    if (sim !== null && z >= 0.3) this.drawAnts(sim.ants);
  }

  /** Ant markers: a halo plus an oriented glyph (a little ant when zoomed in). */
  private drawAnts(ants: ReadonlyArray<Ant>): void {
    const ctx = this.ctx;
    const z = this.zoom;
    const size = Math.max(5, Math.min(48, z * 0.92));
    const many = ants.length > 1;
    for (let i = 0; i < ants.length; i++) {
      const ant = ants[i];
      if (ant.halted) continue;
      let ax = ant.x;
      let ay = ant.y;
      const rec = this.prevPos.get(ant);
      if (this.tween < 1 && rec !== undefined && rec.x === ant.x && rec.y === ant.y) {
        if (Math.abs(rec.x - rec.px) + Math.abs(rec.y - rec.py) === 1) {
          ax = rec.px + (rec.x - rec.px) * this.tween;
          ay = rec.py + (rec.y - rec.py) * this.tween;
        }
      }
      const sx = (ax + 0.5) * z + this.panX;
      const sy = (ay + 0.5) * z + this.panY;
      if (sx < -size * 2 || sy < -size * 2 || sx > this.cssW + size * 2 || sy > this.cssH + size * 2) continue;
      // Several ants get golden-angle hues so they can be told apart.
      const color = many ? `hsl(${Math.round((i * 137.508) % 360)} 88% 62%)` : this.accentCss;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const ang = ((ant.dir - 1) * Math.PI) / 2; // dir 1 = East = 0 rad
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1;
      if (size >= 12) {
        // Legs, then abdomen / thorax / head along the heading.
        const u = size / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.beginPath();
        for (const along of [-0.12, 0.08, 0.28]) {
          for (const side of [-1, 1]) {
            const bx = sx + cos * u * along;
            const by = sy + sin * u * along;
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + (-sin * side * 0.62 + cos * (along - 0.08) * 0.9) * u, by + (cos * side * 0.62 + sin * (along - 0.08) * 0.9) * u);
          }
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 1;
        for (const [along, rx, ry] of [[-0.48, 0.36, 0.27], [0.06, 0.2, 0.16], [0.46, 0.2, 0.2]] as const) {
          ctx.beginPath();
          ctx.ellipse(sx + cos * u * along, sy + sin * u * along, u * rx, u * ry, ang, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        // Arrowhead pointing along the heading.
        const u = size / 2;
        ctx.beginPath();
        ctx.moveTo(sx + cos * u, sy + sin * u);
        ctx.lineTo(sx - cos * u * 0.8 - sin * u * 0.75, sy - sin * u * 0.8 + cos * u * 0.75);
        ctx.lineTo(sx - cos * u * 0.35, sy - sin * u * 0.35);
        ctx.lineTo(sx - cos * u * 0.8 + sin * u * 0.75, sy - sin * u * 0.8 - cos * u * 0.75);
        ctx.closePath();
        ctx.fill();
        if (size >= 7) ctx.stroke();
      }
    }
  }

  // --------------------------------------------------------------- minimap

  /**
   * Draw an overview of the world texture, fitted to the visited region and
   * the current viewport, with the viewport outlined.
   */
  drawMinimap(mctx: CanvasRenderingContext2D, mw: number, mh: number, frameCss: string): void {
    mctx.fillStyle = this.bgCss;
    mctx.fillRect(0, 0, mw, mh);
    const sim = this.sim;
    if (sim === null) return;
    this.computeViewportRect();
    const v = this.viewportRect;
    const b = sim.world.bbox;
    const empty = bboxIsEmpty(b);
    const minX = Math.min(empty ? v.minX : b.minX, v.minX);
    const minY = Math.min(empty ? v.minY : b.minY, v.minY);
    const maxX = Math.max(empty ? v.maxX : b.maxX, v.maxX);
    const maxY = Math.max(empty ? v.maxY : b.maxY, v.maxY);
    const spanX = maxX - minX + 1;
    const spanY = maxY - minY + 1;
    const scale = Math.min((mw - 8) / spanX, (mh - 8) / spanY);
    const offX = (mw - spanX * scale) / 2 - minX * scale;
    const offY = (mh - spanY * scale) / 2 - minY * scale;
    this.miniScale = scale;
    this.miniOffX = offX;
    this.miniOffY = offY;
    if (this.tex !== null && this.texW > 0) {
      mctx.imageSmoothingEnabled = scale < 1;
      mctx.drawImage(this.tex, this.originX * scale + offX, this.originY * scale + offY, this.texW * scale, this.texH * scale);
    }
    mctx.strokeStyle = frameCss;
    mctx.lineWidth = 1.5;
    mctx.strokeRect(
      v.minX * scale + offX,
      v.minY * scale + offY,
      Math.max(3, (v.maxX - v.minX) * scale),
      Math.max(3, (v.maxY - v.minY) * scale),
    );
    mctx.fillStyle = this.accentCss;
    for (const ant of sim.ants) {
      if (ant.halted) continue;
      mctx.fillRect(ant.x * scale + offX - 1.5, ant.y * scale + offY - 1.5, 3, 3);
    }
  }

  /** World cell under a minimap pixel (from the last drawMinimap). */
  minimapToWorld(mx: number, my: number): { x: number; y: number } {
    return { x: (mx - this.miniOffX) / this.miniScale, y: (my - this.miniOffY) / this.miniScale };
  }
}
