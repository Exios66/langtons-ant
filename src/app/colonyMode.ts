/**
 * Colony mode controller: owns the ColonySim, its stepping, the scenario /
 * tool / parameter panel, and the population and food charts. main.ts owns
 * the canvas, camera, transport buttons and status chips, and calls in here.
 */

import { CASTE_NAMES, ColonySim, DEFAULT_PARAMS, type ColonyParams } from "../colony/sim";
import { SCENARIOS, scenarioById } from "../colony/scenarios";
import { ColonyRenderer, type ColonyLayers } from "../render/colonyRenderer";
import { Series } from "./analytics";
import { LineChart, type ChartSeriesSpec } from "./charts";
import { fmtInt } from "./format";
import { downloadText } from "./sessionIO";

export type ColonyTool = "pan" | "food" | "wall" | "erase";

const SAMPLE_TICKS = 50;
/** Wall-clock budget for simulation per frame, so a slow device keeps its frame rate. */
const FRAME_BUDGET_MS = 9;
const DEFAULT_SEED = 0x00c0ffee;

interface ParamSlider {
  key: keyof ColonyParams;
  id: string;
  fmt: (v: number) => string;
}

const SLIDERS: ParamSlider[] = [
  { key: "evaporation", id: "pEvap", fmt: (v) => `${(v * 100).toFixed(2)}% / tick` },
  { key: "diffusion", id: "pDiff", fmt: (v) => v.toFixed(2) },
  { key: "wander", id: "pWander", fmt: (v) => v.toFixed(2) },
  { key: "foodRegrow", id: "pRegrow", fmt: (v) => `${v.toFixed(0)} / 10k ticks` },
  { key: "aggression", id: "pAggro", fmt: (v) => `×${v.toFixed(1)}` },
];

export interface ColonyHost {
  toast(msg: string): void;
  /** Called when scenario/seed changed, so the host can update the URL and refit the view. */
  changed(refit: boolean): void;
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`missing #${id}`);
  return node as T;
}

export class ColonyMode {
  sim: ColonySim;
  scenarioId: string;
  seed: number;
  running = true;
  /** Speed slider position 0..1. */
  speedS = 0.55;
  tool: ColonyTool = "pan";
  brush = 3;
  readonly layers: ColonyLayers = { trail: true, home: true, alarm: true };

  private readonly renderer: ColonyRenderer;
  private readonly canvas: HTMLCanvasElement;
  /** Last painted point of the current drag, in cells. */
  private lastPaint: { x: number; y: number } | null = null;
  private readonly host: ColonyHost;
  private carry = 0;
  private popSeries: Series;
  private storeSeries: Series;
  private popChart: LineChart | null = null;
  private storeChart: LineChart | null = null;
  private rateTicks = 0;
  private rateStart = 0;
  /** Smoothed ticks per second actually achieved. */
  rate = 0;

  constructor(canvas: HTMLCanvasElement, host: ColonyHost, scenarioId?: string, seed?: number) {
    this.renderer = new ColonyRenderer(canvas);
    this.canvas = canvas;
    this.host = host;
    this.scenarioId = scenarioById(scenarioId ?? SCENARIOS[0].id).id;
    this.seed = (seed ?? DEFAULT_SEED) >>> 0;
    this.sim = new ColonySim(scenarioById(this.scenarioId), this.seed);
    this.popSeries = new Series(this.sim.colonies.length, SAMPLE_TICKS);
    this.storeSeries = new Series(this.sim.colonies.length, SAMPLE_TICKS);
    this.wire();
    this.rebuildCharts();
    this.syncPanel(true);
  }

  // ---------------------------------------------------------------- state

  ticksPerSec(): number {
    return 10 ** (this.speedS * 3.2);
  }

  hash(): string {
    return `m=colony&sc=${this.scenarioId}&x=${this.seed.toString(16).padStart(8, "0")}`;
  }

  /** Start a fresh run. Slider-adjusted parameters carry over unless the scenario changed. */
  restart(scenarioId: string, seed: number, keepParams: boolean): void {
    const sc = scenarioById(scenarioId);
    const params = keepParams && sc.id === this.scenarioId ? { ...this.sim.params } : undefined;
    this.scenarioId = sc.id;
    this.seed = seed >>> 0;
    this.sim = new ColonySim(sc, this.seed, params);
    this.carry = 0;
    this.popSeries = new Series(this.sim.colonies.length, SAMPLE_TICKS);
    this.storeSeries = new Series(this.sim.colonies.length, SAMPLE_TICKS);
    this.rebuildCharts();
    this.syncPanel(true);
  }

  // -------------------------------------------------------------- stepping

  stepOnce(): void {
    this.sim.step();
    this.sample();
  }

  /** Run `ticks` ticks now, within a time box; returns how many ran. */
  jump(ticks: number, budgetMs = 400): number {
    const t0 = performance.now();
    let ran = 0;
    while (ran < ticks && performance.now() - t0 < budgetMs) {
      this.sim.step();
      ran++;
      if (this.sim.tick % SAMPLE_TICKS === 0) this.sample();
    }
    return ran;
  }

  private sample(): void {
    const sim = this.sim;
    if (!this.popSeries.due(sim.tick)) return;
    this.popSeries.push(sim.tick, sim.colonies.map((_, c) => sim.population(c)));
    this.storeSeries.push(sim.tick, sim.colonies.map((c) => c.store));
  }

  /** Advance for one animation frame. */
  frame(now: number, dt: number): void {
    if (this.running && this.sim.n > 0) {
      const owed = this.ticksPerSec() * (dt / 1000) + this.carry;
      let n = Math.floor(owed);
      this.carry = owed - n;
      const t0 = performance.now();
      while (n > 0) {
        this.sim.step();
        this.rateTicks++;
        n--;
        if (this.sim.tick % SAMPLE_TICKS === 0) this.sample();
        if (performance.now() - t0 > FRAME_BUDGET_MS) {
          this.carry = 0; // behind schedule: drop the backlog rather than spiral
          break;
        }
      }
    }
    if (now - this.rateStart >= 500) {
      const inst = (this.rateTicks * 1000) / (now - this.rateStart);
      this.rate = this.rate * 0.5 + inst * 0.5;
      this.rateTicks = 0;
      this.rateStart = now;
    }
  }

  draw(cam: { panX: number; panY: number; zoom: number }, cssW: number, cssH: number, dpr: number, light: boolean): void {
    // Interpolate only when ticks are slower than frames; otherwise show the latest tick.
    const alpha = this.running && this.ticksPerSec() <= 90 ? this.carry : 1;
    this.renderer.draw(this.sim, cam, cssW, cssH, dpr, alpha, light, this.layers);
  }

  // --------------------------------------------------------------- editing

  /**
   * Apply the active tool at a world position (in cells). With
   * `continueStroke`, stamp along the segment from the previous point too, so
   * a fast drag leaves an unbroken stroke.
   */
  paint(wx: number, wy: number, continueStroke = false): void {
    const last = continueStroke ? this.lastPaint : null;
    this.lastPaint = { x: wx, y: wy };
    if (last === null) {
      this.stamp(wx, wy);
      return;
    }
    const dx = wx - last.x;
    const dy = wy - last.y;
    // Disc stamps spaced one radius apart overlap into a solid band.
    const n = Math.ceil(Math.hypot(dx, dy) / Math.max(1, this.brush));
    for (let i = 1; i <= n; i++) this.stamp(last.x + (dx * i) / n, last.y + (dy * i) / n);
  }

  private stamp(wx: number, wy: number): void {
    if (this.tool === "food") this.sim.paintFood(wx, wy, this.brush, 6);
    else if (this.tool === "wall") this.sim.paintWall(wx, wy, this.brush, true);
    else if (this.tool === "erase") this.sim.erase(wx, wy, this.brush);
  }

  setTool(tool: ColonyTool): void {
    this.tool = tool;
    this.lastPaint = null;
    this.canvas.classList.toggle("tooling", tool !== "pan");
    for (const btn of document.querySelectorAll<HTMLElement>("[data-tool]")) {
      const on = btn.dataset.tool === tool;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  // ----------------------------------------------------------------- panel

  private wire(): void {
    const sel = byId<HTMLSelectElement>("scenarioSelect");
    for (const sc of SCENARIOS) {
      const opt = document.createElement("option");
      opt.value = sc.id;
      opt.textContent = sc.name;
      sel.appendChild(opt);
    }
    sel.addEventListener("change", () => {
      this.restart(sel.value, this.seed, false);
      this.host.changed(true);
    });
    byId("btnColonyRestart").addEventListener("click", () => {
      this.restart(this.scenarioId, this.seed, true);
      this.host.changed(false);
      this.host.toast("Colony restarted with the same seed");
    });
    byId("btnColonyReseed").addEventListener("click", () => {
      const next = (Math.imul(this.seed ^ (Date.now() >>> 0), 2654435761) + 0x9e3779b9) >>> 0;
      this.restart(this.scenarioId, next, true);
      this.host.changed(false);
      this.host.toast(`New seed 0x${next.toString(16).padStart(8, "0")}`);
    });

    for (const btn of document.querySelectorAll<HTMLElement>("[data-tool]")) {
      btn.addEventListener("click", () => this.setTool(btn.dataset.tool as ColonyTool));
    }
    const brush = byId<HTMLInputElement>("brushSize");
    brush.addEventListener("input", () => {
      this.brush = Number(brush.value);
      byId("brushSizeOut").textContent = `${this.brush} cells`;
    });

    for (const s of SLIDERS) {
      const input = byId<HTMLInputElement>(s.id);
      input.addEventListener("input", () => {
        this.sim.params[s.key] = Number(input.value);
        byId(s.id + "Out").textContent = s.fmt(Number(input.value));
      });
    }
    byId("btnParamReset").addEventListener("click", () => {
      Object.assign(this.sim.params, DEFAULT_PARAMS, scenarioById(this.scenarioId).params);
      this.syncPanel(false);
    });

    const layer = (id: string, key: keyof ColonyLayers): void => {
      const box = byId<HTMLInputElement>(id);
      box.checked = this.layers[key];
      box.addEventListener("change", () => {
        this.layers[key] = box.checked;
      });
    };
    layer("layTrail", "trail");
    layer("layHome", "home");
    layer("layAlarm", "alarm");

    byId("btnColonyCSV").addEventListener("click", () => {
      const names = this.sim.colonies.map((_, c) => `colony_${c + 1}_ants`);
      const pop = this.popSeries.toCSV("tick", names).trimEnd().split("\n");
      const store = this.storeSeries
        .toCSV("tick", this.sim.colonies.map((_, c) => `colony_${c + 1}_food_store`))
        .trimEnd()
        .split("\n");
      const rows = pop.map((row, i) => row + "," + (store[i] ?? "").split(",").slice(1).join(","));
      downloadText(`colony-${this.scenarioId}-${this.sim.tick}.csv`, rows.join("\n") + "\n", "text/csv");
    });
  }

  private syncPanel(scenarioChanged: boolean): void {
    const sc = scenarioById(this.scenarioId);
    byId<HTMLSelectElement>("scenarioSelect").value = sc.id;
    byId("scenarioBlurb").textContent = sc.blurb;
    byId("colonySeed").textContent = `seed 0x${this.seed.toString(16).padStart(8, "0")} · ${sc.width}×${sc.height} cells`;
    for (const s of SLIDERS) {
      const input = byId<HTMLInputElement>(s.id);
      input.value = String(this.sim.params[s.key]);
      byId(s.id + "Out").textContent = s.fmt(this.sim.params[s.key]);
    }
    byId("alarmLayerRow").classList.toggle("hidden", this.sim.colonies.length < 2);
    byId("pAggroRow").classList.toggle("hidden", this.sim.colonies.length < 2);
    if (scenarioChanged) this.setTool("pan");
  }

  private rebuildCharts(): void {
    const hostEl = byId("colonyCharts");
    hostEl.replaceChildren();
    const series: ChartSeriesSpec[] = this.sim.colonies.map((_, c) => ({
      name: `Colony ${c + 1}`,
      colorVar: `--series-${c + 1}`,
    }));
    this.popChart = new LineChart(hostEl, { title: "Ants alive", xName: "ticks", series });
    this.storeChart = new LineChart(hostEl, { title: "Food in nest store", xName: "ticks", series });

    // One row per colony: caste split bar plus the demographic ledger.
    const stats = byId("colonyStats");
    stats.replaceChildren();
    this.sim.colonies.forEach((_, c) => {
      const row = document.createElement("div");
      row.className = "colony-row";
      row.innerHTML =
        `<div class="colony-name"><i style="background:var(--series-${c + 1})"></i>Colony ${c + 1}<span class="colony-status"></span></div>` +
        `<div class="caste-bar" role="img"><span></span><span></span><span></span></div>` +
        `<div class="colony-ledger"></div>`;
      row.style.setProperty("--colony", `var(--series-${c + 1})`);
      stats.appendChild(row);
    });
  }

  /** Refresh charts and the per-colony rows (call a few times per second). */
  updatePanel(): void {
    this.popChart?.setData(this.popSeries);
    this.storeChart?.setData(this.storeSeries);
    const rows = document.querySelectorAll<HTMLElement>("#colonyStats .colony-row");
    this.sim.colonies.forEach((col, c) => {
      const row = rows[c];
      if (!row) return;
      const total = this.sim.population(c);
      const segs = row.querySelectorAll<HTMLElement>(".caste-bar span");
      col.pop.forEach((n, k) => {
        segs[k].style.flexGrow = String(n);
        segs[k].style.display = n === 0 ? "none" : "";
        segs[k].title = `${fmtInt(n)} ${CASTE_NAMES[k]}`;
      });
      (row.querySelector(".caste-bar") as HTMLElement).setAttribute(
        "aria-label",
        col.pop.map((n, k) => `${n} ${CASTE_NAMES[k]}`).join(", "),
      );
      (row.querySelector(".colony-status") as HTMLElement).textContent =
        total === 0 ? "extinct" : `${fmtInt(total)} ants · store ${fmtInt(col.store)}`;
      (row.querySelector(".colony-ledger") as HTMLElement).textContent =
        `${col.pop.map((n, k) => `${fmtInt(n)} ${CASTE_NAMES[k]}`).join(" · ")}\n` +
        `delivered ${fmtInt(col.delivered)} · born ${fmtInt(col.born)} · died: ${fmtInt(col.starved)} starved, ` +
        `${fmtInt(col.killed)} in combat, ${fmtInt(col.aged)} of old age`;
    });
  }
}
