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
  private prevPos = new Map<Ant, { x: number; y: number }>();

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
    if (this.viewDirty || this.contentDirty) {
      this.compose();
      this.viewDirty = false;
      this.contentDirty = false;
    }
  }

  private trackAntPositions(): void {
    const sim = this.sim;
    if (sim === null) return;
    for (const ant of sim.ants) {
      if (ant.halted) {
        this.prevPos.delete(ant);
        continue;
      }
      let prev = this.prevPos.get(ant);
      if (prev === undefined) {
        this.prevPos.set(ant, { x: ant.x, y: ant.y });
      } else {
        prev.x = ant.x;
        prev.y = ant.y;
      }
    }
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

    const sim = this.sim;
    if (sim !== null && this.zoom >= 0.3) {
      const size = Math.max(3, Math.min(14, this.zoom * 0.8));
      for (const ant of sim.ants) {
        if (ant.halted) continue;
        const sx = (ant.x + 0.5) * this.zoom + this.panX;
        const sy = (ant.y + 0.5) * this.zoom + this.panY;
        ctx.fillStyle = this.accentCss;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        if (size >= 7) {
          ctx.strokeStyle = "rgba(0,0,0,0.75)";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - size / 2 + 0.5, sy - size / 2 + 0.5, size - 1, size - 1);
        }
      }
    }
  }
}
