/**
 * Application entry: rAF loop with an adaptive steps-per-frame governor,
 * transport, colony management, persistence (URL hash permalinks +
 * localStorage autosave) and all control wiring.
 *
 * Scheduling contract (see reports/§scheduling): target a ~10 ms step
 * budget; dt < 12 ms grows the batch cap ×1.25 (max 250k steps/frame),
 * dt > 17 ms shrinks it by 16.7/dt. The speed slider maps logarithmically
 * to 10^(6s) steps/s, 1 → 1,000,000, with a fractional-remainder
 * accumulator so 1 step/s really steps once per second.
 */

import { bboxIsEmpty, World, type BBox } from "../engine/grid";
import { PRESETS, type Preset } from "../engine/presets";
import { mulberry32 } from "../engine/prng";
import { ruleToString, mirrorRule, parseAntString, type Rule } from "../engine/rule";
import { Simulation, type Ant } from "../engine/simulation";
import { toB36 } from "../engine/serialize";
import { DEFAULT_PALETTE_ID, PALETTES, hueSpreadPacked, packedToCss, paletteById } from "../render/palette";
import { Renderer } from "../render/renderer";
import {
  DEFAULT_ZOOM,
  clampZoom,
  centerOn,
  fitRect,
  panBy,
  screenToWorldX,
  screenToWorldY,
  zoomAt,
  type Camera,
} from "./camera";
import { fmtBytes, fmtInt } from "./format";
import { loadAutosave, saveAutosave } from "./storage";
import {
  decodeState,
  encodeState,
  type AntRecord,
  type DecodedState,
  type UrlSnapshot,
} from "./urlState";
import { REPLAY_STEP_CAP, planFromSession, planFromUrl, type RestorePlan } from "./restore";
import { buildPresetList, createRuleEditor, paletteOptionList, type RuleEditorHandle, type SwatchOption } from "./ui";
import { HighwayDetector } from "./highwayDetector";
import { ruleFromString, sessionToJSON, sessionFromJSON, makeSession, downloadText, pickFile } from "./sessionIO";
import { openRuleDocs, closeRuleDocs } from "./ruleDocs";
import { ColonyMode } from "./colonyMode";
import { Series } from "./analytics";
import { LineChart } from "./charts";

const MAX_BATCH = 250_000;
const INITIAL_SEED = 0x1a2b3c4d;
const PERSIST_INTERVAL_MS = 5000;
const STATUS_INTERVAL_MS = 200;
/** Replay budget per frame (ms) and slice size (steps) while re-simulating a saved run. */
const REPLAY_FRAME_MS = 10;
const REPLAY_SLICE = 20_000;
/** Autosave may embed a bigger grid than a URL can (localStorage, not the address bar). */
const AUTOSAVE_RLE_LIMIT = 500_000;

// ------------------------------------------------------------------- state

let rule: Rule = PRESETS[0].rule;
let sim: Simulation;
let seed = INITIAL_SEED;
let rng = mulberry32(seed);
let paletteId = DEFAULT_PALETTE_ID;
const overrides = new Map<number, number>();
let speedS = 0.5; // slider 0..1 → 10^(6s) steps/s
let running = false;
let placeMode = false;
let cam: Camera = { panX: 0, panY: 0, zoom: DEFAULT_ZOOM };
let camInit = false;
let autoPauseOnHighway = false;
/**
 * The ants the current run started with, while the run is still a pure
 * function of them (rule + these ants + stepCount). Null once ants were
 * added/removed after step 0: such a run can only be shared with its grid.
 */
let recipe: AntRecord[] | null = null;
/** Absolute step count a saved run is being re-simulated to; 0 when idle. */
let replayTarget = 0;
let replayRunAfter = true;
let recording = false;
let mediaRecorder: MediaRecorder | null = null;

type Mode = "turmite" | "colony";
let mode: Mode = "turmite";
let colony: ColonyMode | null = null;
/** Camera of the mode that is not on screen (`cam` is always the active one). */
let parkedCam: Camera | null = null;
/** Camera the view is easing toward (fit, minimap click); null when idle. */
let camGoal: Camera | null = null;
let followAnt = false;
let smoothMotion = true;
let showMinimap = true;
let lastMinimapAt = 0;
let minimapCtx: CanvasRenderingContext2D | null = null;
const reducedMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Turmite analytics: distance of the ants from where the run started, and
// painted cells, sampled against the step count.
/** Above this many chunks the live color scan is skipped (it would cost too much per sample). */
const SCAN_CHUNK_LIMIT = 600;
const SAMPLE_MIN_INTERVAL_MS = 100;
const tSeries = new Series(2, 50);
let distChart: LineChart | null = null;
let paintChart: LineChart | null = null;
/** Each ant's starting cell, so the distance chart measures travel, not spread. */
let antOrigin = new WeakMap<Ant, { x: number; y: number }>();
let lastSampleAt = 0;
const colorCounts = new Float64Array(32);
let colorCountsValid = false;

const workingColors = new Uint32Array(32);
let renderer: Renderer;
let canvas: HTMLCanvasElement;
let cssW = 0;
let cssH = 0;

const highway = new HighwayDetector();
/** detectedStep already announced by the auto-pause toast (so resuming does not re-pause). */
let highwayAnnounced = -1;

// loop state
let lastTime = 0;
let adaptiveCap = 1;
let carry = 0;
let emaRate: number | null = null;
let emaFps: number | null = null;
let windowSteps = 0;
let windowStart = 0;
let lastStatusAt = 0;
let lastPersistAt = 0;

// --------------------------------------------------------------------- dom

const $ = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`missing #${id}`);
  return node;
};

const toastsEl = { current: null as HTMLElement | null };
let ruleNotationEl: HTMLElement;
let ruleEditor: RuleEditorHandle;
let colonyInfoEl: HTMLElement;
let speedLabelEl: HTMLElement;
let btnPlay: HTMLButtonElement;
let iconPlay: SVGElement;
let iconPause: SVGElement;

function toast(msg: string): void {
  const host = toastsEl.current;
  if (host === null) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  t.setAttribute("role", "status");
  host.appendChild(t);
  window.setTimeout(() => t.classList.add("fade"), 3600);
  window.setTimeout(() => t.remove(), 4100);
}

// --------------------------------------------------------------- run setup

function worldCenterX(): number {
  return (cssW / 2 - cam.panX) / cam.zoom;
}

function worldCenterY(): number {
  return (cssH / 2 - cam.panY) / cam.zoom;
}

function refreshCam(): void {
  renderer.setCamera(cam.panX, cam.panY, cam.zoom);
}

interface RunOptions {
  world?: World;
  ants?: Array<AntRecord & { halted?: boolean }>;
  steps?: number;
  running?: boolean;
  /** Starting ants of the restored run; defaults to `ants` for a fresh run at step 0. */
  recipe?: AntRecord[] | null;
}

function cloneAnts(ants: ReadonlyArray<AntRecord>): AntRecord[] {
  return ants.map((a) => ({ x: a.x, y: a.y, dir: a.dir, state: a.state }));
}

function newRun(r: Rule, opts: RunOptions = {}): void {
  rule = r;
  const world = opts.world ?? new World();
  sim = new Simulation(r, world);
  if (opts.steps !== undefined) sim.stepCount = opts.steps;
  const ants = opts.ants ?? [{ x: 0, y: 0, dir: 1, state: 0 }];
  for (const a of ants) {
    const ant = sim.addAnt(a.x, a.y, a.dir, a.state);
    if (a.halted) ant.halted = true;
  }
  recipe =
    opts.recipe !== undefined
      ? opts.recipe
      : opts.world === undefined && (opts.steps ?? 0) === 0
        ? cloneAnts(ants)
        : null;
  replayTarget = 0;
  if (opts.running !== undefined) running = opts.running;
  const startAnts = recipe ?? ants;
  antOrigin = new WeakMap();
  if (startAnts.length === sim.ants.length) {
    sim.ants.forEach((ant, i) => antOrigin.set(ant, { x: startAnts[i].x, y: startAnts[i].y }));
  }
  tSeries.clear();
  lastSampleAt = 0;
  colorCountsValid = false;
  renderer.setSim(sim);
  if (!bboxIsEmpty(world.bbox)) renderer.repaintWorldChunks();
  refreshCam();
  updatePlayButton();
  ruleNotationEl.textContent = ruleToString(r);
  ruleEditor.refresh();
  updateStatus();
  highway.reset();
  highwayAnnounced = -1;
  updateHighwayBadge();
}

function setRule(r: Rule, startRunning?: boolean): void {
  newRun(r, { running: startRunning });
  persist();
}

// --------------------------------------------------------------- telemetry

function stepsPerSec(): number {
  return 10 ** (speedS * 6);
}

function updateStatus(): void {
  if (mode === "colony" && colony !== null) {
    const cs = colony.sim;
    $("st-steps").textContent = fmtInt(cs.tick);
    $("st-rate").textContent = fmtInt(colony.running ? colony.rate : 0);
    $("st-fps").textContent = String(Math.round(emaFps ?? 0));
    $("st-ants").textContent = fmtInt(cs.n);
    $("st-food").textContent = cs.endlessFood ? "∞" : fmtInt(cs.totalFood);
    colony.updatePanel();
    return;
  }
  updateTurmiteAnalytics();
  $("st-steps").textContent =
    replayTarget > 0
      ? `${fmtInt(sim.stepCount)} / ${fmtInt(replayTarget)} replaying`
      : fmtInt(sim.stepCount);
  const rate = running ? (emaRate ?? 0) : 0;
  $("st-rate").textContent = fmtInt(rate);
  $("st-fps").textContent = String(Math.round(emaFps ?? 0));
  const live = sim.liveCount;
  const halted = sim.ants.length - live;
  $("st-ants").textContent = halted > 0 ? `${live}+${halted}` : String(live);
  const b = sim.world.bbox;
  if (bboxIsEmpty(b)) {
    $("st-bbox").textContent = "—";
  } else {
    $("st-bbox").textContent = `${fmtInt(b.maxX - b.minX + 1)}×${fmtInt(b.maxY - b.minY + 1)}`;
  }
  $("st-mem").textContent = fmtBytes(sim.world.memoryBytes);
  colonyInfoEl.textContent =
    sim.ants.length === 0
      ? "no ants"
      : `${live} live${halted > 0 ? ` · ${halted} halted (removed)` : ""}`;
  updateHighwayBadge();
}

function updateHighwayBadge(): void {
  const chip = document.getElementById("st-highway");
  const val = document.getElementById("st-highway-step");
  if (!chip || !val) return;
  if (highway.isHighway) {
    chip.classList.remove("hidden");
    val.textContent = fmtInt(highway.onsetStep);
    chip.title = `Highway onset ≈ step ${fmtInt(highway.onsetStep)} (detected at step ${fmtInt(highway.detectedStep)}) — auto-pause optional`;
  } else {
    chip.classList.add("hidden");
  }
}

function updatePlayButton(): void {
  const on = mode === "colony" && colony !== null ? colony.running : running;
  iconPlay.toggleAttribute("hidden", on);
  iconPause.toggleAttribute("hidden", !on);
  btnPlay.setAttribute("aria-label", on ? "Pause" : "Play");
  btnPlay.setAttribute("aria-pressed", on ? "true" : "false");
}

// --------------------------------------------------------------- analytics

/** Count cells per color over the whole grid (skipped for very large grids). */
function scanColors(): boolean {
  if (sim.world.chunkCount > SCAN_CHUNK_LIMIT) return false;
  colorCounts.fill(0);
  for (const chunk of sim.world.chunkData()) {
    for (let i = 0; i < chunk.length; i++) colorCounts[chunk[i]]++;
  }
  return true;
}

/** Record one analytics sample if the run has advanced far enough since the last. */
function sampleTurmite(now: number): void {
  if (!tSeries.due(sim.stepCount) || (tSeries.length > 0 && now - lastSampleAt < SAMPLE_MIN_INTERVAL_MS)) return;
  lastSampleAt = now;
  let dist = 0;
  let live = 0;
  for (const a of sim.ants) {
    if (a.halted) continue;
    let o = antOrigin.get(a);
    if (o === undefined) {
      // Added after the run started: measure from where it was first seen.
      o = { x: a.x, y: a.y };
      antOrigin.set(a, o);
    }
    dist += Math.hypot(a.x - o.x, a.y - o.y);
    live++;
  }
  colorCountsValid = scanColors();
  let painted = NaN;
  if (colorCountsValid) {
    painted = 0;
    for (let c = 1; c < colorCounts.length; c++) painted += colorCounts[c];
  }
  tSeries.push(sim.stepCount, [live > 0 ? dist / live : NaN, painted]);
}

function updateTurmiteAnalytics(): void {
  const marker = highway.isHighway ? { x: highway.onsetStep, label: "highway" } : null;
  distChart?.setData(tSeries, marker);
  paintChart?.setData(tSeries, marker);
  const bar = document.getElementById("colorBar");
  const info = document.getElementById("colorBarInfo");
  if (bar === null || info === null) return;
  if (!colorCountsValid) {
    bar.replaceChildren();
    info.textContent =
      sim.world.chunkCount > SCAN_CHUNK_LIMIT
        ? `Grid too large to count live (${fmtInt(sim.world.chunkCount)} chunks)`
        : "No cells painted yet";
    return;
  }
  let painted = 0;
  for (let c = 1; c < rule.colors; c++) painted += colorCounts[c];
  const parts: string[] = [];
  bar.replaceChildren();
  for (let c = 1; c < rule.colors; c++) {
    const n = colorCounts[c];
    if (n === 0) continue;
    const seg = document.createElement("span");
    seg.style.flexGrow = String(n);
    seg.style.background = packedToCss(workingColors[c]);
    const pct = `${((n / painted) * 100).toFixed(1)}%`;
    seg.title = `color ${c}: ${fmtInt(n)} cells (${pct})`;
    bar.appendChild(seg);
    parts.push(`${c}: ${pct}`);
  }
  info.textContent =
    painted === 0
      ? "No cells painted yet"
      : `${fmtInt(painted)} painted cells · ${parts.slice(0, 6).join(" · ")}${parts.length > 6 ? " · …" : ""}`;
}

// ------------------------------------------------------------------ camera

function isLight(): boolean {
  return document.documentElement.classList.contains("light");
}

/** Ease the view toward `goal` (or jump there when motion is reduced). */
function moveCamTo(goal: Camera): void {
  if (reducedMotion) {
    cam.panX = goal.panX;
    cam.panY = goal.panY;
    cam.zoom = goal.zoom;
    camGoal = null;
    refreshCam();
  } else {
    camGoal = goal;
  }
}

/** Per-frame camera motion: easing toward a goal, and follow-the-ant. */
function stepCamera(dt: number): void {
  if (camGoal !== null) {
    const k = 1 - Math.exp(-dt / 110);
    // Interpolate the world point at the screen center, and zoom geometrically.
    const cx = (cssW / 2 - cam.panX) / cam.zoom;
    const cy = (cssH / 2 - cam.panY) / cam.zoom;
    const gx = (cssW / 2 - camGoal.panX) / camGoal.zoom;
    const gy = (cssH / 2 - camGoal.panY) / camGoal.zoom;
    const nz = cam.zoom * Math.pow(camGoal.zoom / cam.zoom, k);
    const nx = cx + (gx - cx) * k;
    const ny = cy + (gy - cy) * k;
    const done = Math.abs(Math.log(camGoal.zoom / nz)) < 0.002 && Math.hypot(gx - nx, gy - ny) * nz < 0.5;
    if (done) {
      cam.zoom = camGoal.zoom;
      cam.panX = camGoal.panX;
      cam.panY = camGoal.panY;
      camGoal = null;
    } else {
      cam.zoom = nz;
      centerOn(cam, nx, ny, cssW, cssH);
    }
    refreshCam();
  } else if (followAnt && mode === "turmite") {
    let sx = 0;
    let sy = 0;
    let live = 0;
    for (const a of sim.ants) {
      if (a.halted) continue;
      sx += a.x + 0.5;
      sy += a.y + 0.5;
      live++;
    }
    if (live > 0) {
      const k = reducedMotion ? 1 : 1 - Math.exp(-dt / 160);
      const cx = (cssW / 2 - cam.panX) / cam.zoom;
      const cy = (cssH / 2 - cam.panY) / cam.zoom;
      centerOn(cam, cx + (sx / live - cx) * k, cy + (sy / live - cy) * k, cssW, cssH);
      refreshCam();
    }
  }
}

function setFollow(on: boolean): void {
  followAnt = on;
  const btn = $("btnFollow");
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  if (on) camGoal = null;
}

function drawMinimap(now: number): void {
  if (!showMinimap || minimapCtx === null || now - lastMinimapAt < 100) return;
  lastMinimapAt = now;
  const c = minimapCtx.canvas;
  minimapCtx.setTransform(1, 0, 0, 1, 0, 0);
  renderer.drawMinimap(minimapCtx, c.width, c.height, isLight() ? "#15181e" : "#ffffff");
}

// -------------------------------------------------------------------- mode

function setMode(next: Mode, opts: { scenario?: string; seed?: number } = {}): void {
  if (next === "colony" && colony === null) {
    colony = new ColonyMode(
      canvas,
      {
        toast,
        changed: (refit) => {
          if (refit) fitView(true);
          persist();
          updateStatus();
        },
      },
      opts.scenario,
      opts.seed,
    );
  } else if (next === "colony" && colony !== null && opts.scenario !== undefined) {
    colony.restart(opts.scenario, opts.seed ?? colony.seed, false);
  }
  const changed = next !== mode;
  if (changed) {
    const other = parkedCam;
    parkedCam = { ...cam };
    mode = next;
    camGoal = null;
    if (other !== null) {
      cam.panX = other.panX;
      cam.panY = other.panY;
      cam.zoom = other.zoom;
    }
    if (next === "colony" && other === null) fitView(true);
  }
  document.body.dataset.mode = mode;
  for (const btn of document.querySelectorAll<HTMLElement>("[data-mode-btn]")) {
    btn.setAttribute("aria-pressed", btn.dataset.modeBtn === mode ? "true" : "false");
  }
  $("st-steps-lbl").textContent = mode === "colony" ? "ticks" : "steps";
  $("st-rate-lbl").textContent = mode === "colony" ? "ticks/s" : "steps/s";
  $("jumpLabel").textContent = mode === "colony" ? "+1k" : "+10k";
  canvas.classList.toggle("tooling", mode === "colony" && colony !== null && colony.tool !== "pan");
  if (mode === "turmite") {
    renderer.invalidate();
    refreshCam();
  } else if (placeMode) {
    exitPlaceMode();
  }
  setSpeed(mode === "colony" && colony !== null ? colony.speedS : speedS);
  updatePlayButton();
  updateStatus();
  persist();
}

function exitPlaceMode(): void {
  placeMode = false;
  const place = $("btnPlace");
  place.classList.remove("on");
  place.setAttribute("aria-pressed", "false");
  canvas.classList.remove("placing");
}

// ------------------------------------------------------------------ replay

/**
 * Re-simulate a saved run toward `replayTarget`, a time-boxed slice per frame
 * so the page stays responsive and the run is visibly rebuilt (the step
 * counter shows progress). Steps go through the highway detector, so a
 * replayed run recovers the same onset as the original.
 */
function stepReplay(): void {
  const t0 = performance.now();
  do {
    const want = Math.min(REPLAY_SLICE, replayTarget - sim.stepCount);
    const ran = want > 0 ? highway.advance(sim, want) : 0;
    if (ran < want || sim.stepCount >= replayTarget) {
      finishReplay(ran < want);
      return;
    }
  } while (performance.now() - t0 < REPLAY_FRAME_MS && sim.changedCount < MAX_BATCH);
}

function finishReplay(halted: boolean): void {
  replayTarget = 0;
  running = replayRunAfter && sim.liveCount > 0;
  updatePlayButton();
  updateStatus();
  toast(halted ? `Replay stopped at step ${fmtInt(sim.stepCount)}: all ants halted` : `Replayed ${fmtInt(sim.stepCount)} steps`);
  persist();
}

/** True (with a toast) while a saved run is still being rebuilt; edits would corrupt it. */
function busyReplaying(): boolean {
  if (replayTarget === 0) return false;
  toast("Still replaying the saved run…");
  return true;
}

/** Apply a restore plan: place the grid/ants, then (for replays) start re-simulating. */
function applyPlan(plan: RestorePlan, runAfter: boolean): void {
  const replaying = plan.replaySteps > 0;
  newRun(plan.rule, {
    world: plan.world ?? undefined,
    ants: plan.ants,
    steps: plan.stepCount,
    recipe: plan.recipe,
    running: replaying ? false : runAfter,
  });
  if (replaying) {
    replayTarget = plan.stepCount + plan.replaySteps;
    replayRunAfter = runAfter;
    toast(`Replaying ${fmtInt(plan.replaySteps)} steps…`);
  }
  if (plan.message !== null) toast(plan.message);
}

// ------------------------------------------------------------------- loop

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (lastTime === 0) {
    lastTime = now;
    windowStart = now;
    return;
  }
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 50) dt = 50;
  if (dt <= 0) dt = 1;

  const fpsNow = 1000 / dt;
  emaFps = emaFps === null ? fpsNow : emaFps * 0.9 + fpsNow * 0.1;
  stepCamera(dt);

  if (mode === "colony" && colony !== null) {
    colony.frame(now, dt);
    colony.draw(cam, cssW, cssH, Math.min(2, window.devicePixelRatio || 1), isLight());
    if (now - lastStatusAt >= STATUS_INTERVAL_MS) {
      lastStatusAt = now;
      updateStatus();
    }
    return;
  }

  if (replayTarget > 0) {
    stepReplay();
  } else if (running && sim.liveCount > 0) {
    // Adaptive governor: grow while frames stay under the ~17 ms deadline
    // (any refresh rate — the batch grows until the frame actually feels
    // the load), shrink proportionally when a frame overruns.
    if (dt < 17) {
      adaptiveCap = Math.min(MAX_BATCH, adaptiveCap * 1.25);
    } else if (dt > 17) {
      adaptiveCap = Math.max(1, adaptiveCap * (16.7 / dt));
    }
    const owed = stepsPerSec() * (dt / 1000) + carry;
    let n = Math.floor(owed);
    if (n > adaptiveCap) {
      n = Math.floor(adaptiveCap);
      carry = 0;
    } else {
      carry = owed - n;
    }
    let executed = 0;
    // The detector slices the batch at its step-aligned sampling grid, so
    // detection does not depend on the frame batch size.
    if (n > 0) executed = highway.advance(sim, n);
    windowSteps += executed;
    if (executed > 0 && sim.liveCount === 0) {
      running = false;
      updatePlayButton();
      toast("All ants halted.");
    }
    if (highway.isHighway && autoPauseOnHighway && running && highwayAnnounced !== highway.detectedStep) {
      highwayAnnounced = highway.detectedStep;
      running = false;
      updatePlayButton();
      toast(`Highway onset ≈ step ${fmtInt(highway.onsetStep)} — paused`);
    }
  }

  if (now - windowStart >= 250) {
    const inst = (windowSteps * 1000) / (now - windowStart);
    windowStart = now;
    windowSteps = 0;
    emaRate = emaRate === null ? inst : emaRate * 0.7 + inst * 0.3;
  }
  sampleTurmite(now);
  // At walking pace the marker glides between cells instead of jumping.
  renderer.setTween(
    smoothMotion && !reducedMotion && running && replayTarget === 0 && stepsPerSec() <= 60 && sim.liveCount > 0
      ? carry
      : 1,
  );
  renderer.frame();
  drawMinimap(now);

  if (now - lastStatusAt >= STATUS_INTERVAL_MS) {
    lastStatusAt = now;
    updateStatus();
  }
  if (running && now - lastPersistAt >= PERSIST_INTERVAL_MS) {
    lastPersistAt = now;
    persist();
  }
}

// ------------------------------------------------------------ persistence

function snapshot(): UrlSnapshot {
  return {
    rule,
    ants: sim.ants,
    steps: sim.stepCount,
    zoom: cam.zoom,
    centerX: worldCenterX(),
    centerY: worldCenterY(),
    seed,
    paletteId,
    world: sim.world,
    initialAnts: recipe,
  };
}

function persist(): void {
  if (mode === "colony" && colony !== null) {
    // Colony runs are addressed by scenario + seed; the turmite autosave is left alone.
    try {
      history.replaceState(null, "", location.pathname + location.search + "#" + colony.hash());
    } catch {
      /* ignore */
    }
    return;
  }
  // Mid-replay the step counter is a partial result; keep the last good save.
  if (replayTarget > 0) return;
  // The autosave (localStorage) may embed a grid far bigger than a URL can,
  // which is the only way to keep a run that was edited mid-run.
  const snap = snapshot();
  const enc = encodeState(recipe === null ? { ...snap, rleLimit: AUTOSAVE_RLE_LIMIT } : snap);
  saveAutosave(enc);
  const urlEnc = recipe === null ? encodeState(snap) : enc;
  try {
    history.replaceState(null, "", location.pathname + location.search + "#" + urlEnc);
  } catch {
    // Some browsers reject certain hash payloads silently; autosave still holds state.
  }
}

/** Bump the seed deterministically from wall-clock + old seed. */
function freshSeed(): number {
  seed = (Math.imul(seed ^ (Date.now() >>> 0), 2654435761) + 0x9e3779b9) >>> 0;
  return seed;
}

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard !== undefined) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => legacyCopy(text),
    );
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  ta.setAttribute("readonly", "readonly");
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

const DEFAULT_START: AntRecord[] = [{ x: 0, y: 0, dir: 1, state: 0 }];

/** Permalink snapshot of a fresh preset run (step 0: the empty grid is embedded). */
function presetSnapshot(p: Preset): UrlSnapshot {
  return {
    rule: p.rule,
    ants: DEFAULT_START,
    steps: 0,
    zoom: cam.zoom,
    centerX: worldCenterX(),
    centerY: worldCenterY(),
    seed: freshSeed(),
    paletteId,
    world: new World(),
    initialAnts: DEFAULT_START,
  };
}

function copyPermalink(): void {
  if (busyReplaying()) return;
  const enc = encodeState(snapshot());
  // Decode what we are about to hand out, so the toast says what opening it will do.
  const back = decodeState("#" + enc);
  const plan = back === null ? null : planFromUrl(back);
  const url = location.origin + location.pathname + location.search + "#" + enc;
  void copyText(url).then((ok) => {
    if (!ok) {
      toast("Copy failed — the address bar holds the current link");
    } else if (plan === null || plan.kind === "approximate") {
      toast(
        "Link copied, but it cannot reproduce this run: ants were edited mid-run and the grid is too large for a link. Use Export session (JSON) to share it.",
      );
    } else if (plan.kind === "refused") {
      toast(`Link copied, but this run is past the ${fmtInt(REPLAY_STEP_CAP)}-step replay limit: it will open from step 0.`);
    } else if (plan.kind === "replay" && plan.replaySteps > 0) {
      toast(`Permalink copied — opening it replays ${fmtInt(plan.replaySteps)} steps`);
    } else {
      toast("Permalink copied");
    }
    persist();
  });
}

// ----------------------------------------------------------------- colony

/**
 * Record that the colony was edited. At step 0 the edit just changes the
 * starting ants; later it makes the run no longer a function of them, so
 * shared links and sessions must carry the grid instead of a replay recipe.
 */
function noteAntEdit(): void {
  recipe = sim.stepCount === 0 ? cloneAnts(sim.ants) : null;
}

function addAntAtCenter(): void {
  if (busyReplaying()) return;
  sim.addAnt(Math.round(worldCenterX()), Math.round(worldCenterY()), 1);
  noteAntEdit();
  updateStatus();
  persist();
}

function clearAnts(): void {
  if (busyReplaying()) return;
  sim.clearAnts();
  noteAntEdit();
  updateStatus();
  persist();
  toast("Colony cleared");
}

function seedStrays(n: number): void {
  if (busyReplaying()) return;
  seed = freshSeed();
  rng = mulberry32(seed);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const z = cam.zoom;
  const x0 = Math.floor((w * 0.1 - cam.panX) / z);
  const x1 = Math.floor((w * 0.9 - cam.panX) / z);
  const y0 = Math.floor((h * 0.1 - cam.panY) / z);
  const y1 = Math.floor((h * 0.9 - cam.panY) / z);
  const spanX = Math.max(1, x1 - x0);
  const spanY = Math.max(1, y1 - y0);
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(rng() * spanX);
    const y = y0 + Math.floor(rng() * spanY);
    const dir = Math.floor(rng() * 4) & 3;
    sim.addAnt(x, y, dir);
  }
  noteAntEdit();
  persist();
  toast(`Seeded ${n} strays · seed 0x${(seed >>> 0).toString(16).padStart(8, "0")}`);
}

function toggleAntAt(sx: number, sy: number): void {
  if (busyReplaying()) return;
  const wx = screenToWorldX(cam, sx);
  const wy = screenToWorldY(cam, sy);
  const idx = sim.ants.findIndex((a) => a.x === wx && a.y === wy);
  if (idx >= 0) {
    sim.ants.splice(idx, 1);
  } else {
    sim.addAnt(wx, wy, 1);
  }
  noteAntEdit();
  updateStatus();
  persist();
}

// ---------------------------------------------------------------- actions

function togglePlay(): void {
  if (mode === "colony" && colony !== null) {
    colony.running = !colony.running;
    updatePlayButton();
    return;
  }
  if (busyReplaying()) return;
  running = !running;
  updatePlayButton();
  persist();
}

function stepOnce(): void {
  if (mode === "colony" && colony !== null) {
    colony.stepOnce();
    updateStatus();
    return;
  }
  if (busyReplaying() || sim.liveCount === 0) return;
  highway.advance(sim, 1);
  if (sim.liveCount === 0) {
    running = false;
    updatePlayButton();
    toast("All ants halted.");
  }
  updateStatus();
  persist();
}

function jump10k(): void {
  if (mode === "colony" && colony !== null) {
    const ran = colony.jump(1000);
    if (ran < 1000) toast(`Ran ${fmtInt(ran)} ticks (time limit)`);
    updateStatus();
    return;
  }
  if (busyReplaying()) return;
  const executed = highway.advance(sim, 10_000);
  if (executed > 0 && sim.liveCount === 0) {
    running = false;
    updatePlayButton();
    toast("All ants halted.");
  }
  updateStatus();
  persist();
}

function doReset(): void {
  if (mode === "colony" && colony !== null) {
    colony.restart(colony.scenarioId, colony.seed, true);
    colony.running = true;
    updatePlayButton();
    updateStatus();
    return;
  }
  newRun(rule, { running: true });
  persist();
}

function fitView(instant = false): void {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  if (mode === "colony" && colony !== null) {
    minX = 0;
    minY = 0;
    maxX = colony.sim.w - 1;
    maxY = colony.sim.h - 1;
  } else {
    const b: BBox = sim.world.bbox;
    if (!bboxIsEmpty(b)) {
      minX = b.minX;
      minY = b.minY;
      maxX = b.maxX;
      maxY = b.maxY;
    }
    for (const a of sim.ants) {
      if (a.x < minX) minX = a.x;
      if (a.y < minY) minY = a.y;
      if (a.x > maxX) maxX = a.x;
      if (a.y > maxY) maxY = a.y;
    }
  }
  const goal: Camera = { ...cam };
  // Leave room for the side panel on wide screens so the pattern is not hidden under it.
  const panelW = document.body.classList.contains("panel-open") && cssW > 860 ? 388 : 0;
  fitRect(goal, minX, minY, maxX, maxY, cssW - panelW, cssH, mode === "colony" ? 64 : 72);
  if (instant) {
    camGoal = null;
    cam.panX = goal.panX;
    cam.panY = goal.panY;
    cam.zoom = goal.zoom;
    refreshCam();
  } else {
    moveCamTo(goal);
  }
}

function setSpeed(s: number): void {
  const v = clampSpeed(s);
  (document.getElementById("speed") as HTMLInputElement).value = String(v);
  if (mode === "colony" && colony !== null) {
    colony.speedS = v;
    speedLabelEl.textContent = fmtInt(colony.ticksPerSec()) + " ticks/s";
  } else {
    speedS = v;
    speedLabelEl.textContent = fmtInt(stepsPerSec()) + " steps/s";
  }
}

function currentSpeed(): number {
  return mode === "colony" && colony !== null ? colony.speedS : speedS;
}

function clampSpeed(s: number): number {
  if (!Number.isFinite(s)) return 0.5;
  return Math.min(1, Math.max(0, s));
}

// ---------------------------------------------------------------- pointer

const pointers = new Map<number, { x: number; y: number }>();
let pinch: { dist: number; mx: number; my: number; cam: Camera } | null = null;
let downMoved = false;
/** True while a single-pointer paint drag is in progress (so moves join up). */
let stroking = false;

function touchPos(list: Array<{ x: number; y: number }>): { dist: number; mx: number; my: number } | null {
  if (list.length !== 2) return null;
  const dx = list[0].x - list[1].x;
  const dy = list[0].y - list[1].y;
  return {
    dist: Math.hypot(dx, dy),
    mx: (list[0].x + list[1].x) / 2,
    my: (list[0].y + list[1].y) / 2,
  };
}

function wireCanvasEvents(): void {
  canvas.addEventListener("pointerdown", (e) => {
    if (pointers.size === 0) downMoved = false;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; harmless.
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camGoal = null;
    stroking = false;
    if (pointers.size === 1 && toolActive()) {
      paintAt(e.clientX, e.clientY, false);
      stroking = true;
    }
    if (pointers.size === 2) {
      const list = Array.from(pointers.values());
      const t = touchPos(list);
      if (t !== null) {
        pinch = { dist: Math.max(1, t.dist), mx: t.mx, my: t.my, cam: { ...cam } };
      }
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    showHoverCell(e.clientX, e.clientY);
    const prev = pointers.get(e.pointerId);
    if (prev === undefined) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (dx * dx + dy * dy > 1 || dt0(prev, e) > 6) downMoved = true;
    prev.x = e.clientX;
    prev.y = e.clientY;
    if (pointers.size === 1 && pinch === null && toolActive()) {
      paintAt(e.clientX, e.clientY, stroking);
      stroking = true;
    } else if (pointers.size === 1 && pinch === null) {
      if (followAnt && downMoved) setFollow(false);
      panBy(cam, dx, dy);
      refreshCam();
    } else if (pointers.size === 2 && pinch !== null) {
      const t = touchPos(Array.from(pointers.values()));
      if (t === null) return;
      const scale = Math.max(0.1, Math.min(10, t.dist / pinch.dist));
      const nz = clampZoom(pinch.cam.zoom * scale);
      const wx = (pinch.mx - pinch.cam.panX) / pinch.cam.zoom;
      const wy = (pinch.my - pinch.cam.panY) / pinch.cam.zoom;
      cam.zoom = nz;
      cam.panX = t.mx - wx * nz;
      cam.panY = t.my - wy * nz;
      refreshCam();
    }
  });

  const release = (e: PointerEvent) => {
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    stroking = false;
    if (pointers.size < 2) pinch = null;
    if (wasSingle && !downMoved && placeMode && mode === "turmite") {
      toggleAntAt(e.clientX, e.clientY);
    }
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      camGoal = null;
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0012));
      zoomAt(cam, e.clientX, e.clientY, cam.zoom * factor);
      refreshCam();
    },
    { passive: false },
  );
}

/** True while a colony paint tool (not pan) owns single-pointer drags. */
function toolActive(): boolean {
  return mode === "colony" && colony !== null && colony.tool !== "pan";
}

/** Paint at a screen point; `continueStroke` joins it to the previous point of the drag. */
function paintAt(sx: number, sy: number, continueStroke: boolean): void {
  if (colony === null) return;
  colony.paint((sx - cam.panX) / cam.zoom, (sy - cam.panY) / cam.zoom, continueStroke);
}

/** Show the cell under the cursor in the status bar. */
function showHoverCell(sx: number, sy: number): void {
  const wx = screenToWorldX(cam, sx);
  const wy = screenToWorldY(cam, sy);
  const chip = $("st-cell-chip");
  if (mode === "colony" && colony !== null) {
    const cs = colony.sim;
    if (wx < 0 || wy < 0 || wx >= cs.w || wy >= cs.h) {
      chip.classList.add("hidden");
      return;
    }
    const i = wy * cs.w + wx;
    const what = cs.walls[i] !== 0 ? "wall" : cs.food[i] > 0 ? `food ${cs.food[i]}` : "open";
    $("st-cell").textContent = `${wx}, ${wy} · ${what}`;
  } else {
    $("st-cell").textContent = `${wx}, ${wy} · color ${sim.world.get(wx, wy)}`;
  }
  chip.classList.remove("hidden");
}

function dt0(prev: { x: number; y: number }, e: PointerEvent): number {
  return Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
}

// -------------------------------------------------------------------- boot

function applyPaletteToRenderer(): void {
  const p = paletteById(paletteId);
  workingColors.set(p.colors);
  for (const [i, v] of overrides) workingColors[i] = v >>> 0;
  renderer.setPalette(p, overrides);
}

function swatchOptions(index: number): SwatchOption[] {
  const out: SwatchOption[] = [];
  for (const p of PALETTES) {
    out.push({ css: packedToCss(p.colors[index]), packed: p.colors[index], label: p.name });
  }
  for (let k = 0; k < 4; k++) {
    const packed = hueSpreadPacked(index * 8 + k);
    out.push({ css: packedToCss(packed), packed, label: `Generated hue ${k + 1}` });
  }
  return out;
}

function wirePanel(): void {
  const ctx = {
    rule: () => rule,
    colors: () => workingColors,
    submit: (r: Rule) => {
      setRule(r);
    },
    toast,
    swatchOptions,
    applySwatch: (i: number, packed: number) => {
      overrides.set(i, packed);
      applyPaletteToRenderer();
      ruleEditor.refresh();
    },
    resetSwatch: (i: number) => {
      overrides.delete(i);
      applyPaletteToRenderer();
      ruleEditor.refresh();
    },
  };
  ruleEditor = createRuleEditor($("ruleEditor"), ctx);

  // Palette selector.
  const sel = document.getElementById("paletteSelect") as HTMLSelectElement;
  for (const { id, name } of paletteOptionList()) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    sel.appendChild(opt);
  }
  sel.value = paletteId;
  sel.addEventListener("change", () => {
    paletteId = sel.value;
    overrides.clear();
    applyPaletteToRenderer();
    ruleEditor.refresh();
    persist();
  });

  buildPresetList($("presetList"), {
    onLoad: (p) => {
      freshSeed();
      newRun(p.rule, { running: true });
      persist();
      toast(`Loaded “${p.name}”`);
    },
    onPermalink: (p) => {
      const url = location.origin + location.pathname + location.search + "#" + encodeState(presetSnapshot(p));
      void copyText(url).then((ok) => toast(ok ? "Preset link copied" : "Copy failed"));
      persist();
    },
  }, PRESETS);
}

function wireButtons(): void {
  btnPlay = $("btnPlay") as HTMLButtonElement;
  iconPlay = document.getElementById("iconPlay") as unknown as SVGElement;
  iconPause = document.getElementById("iconPause") as unknown as SVGElement;
  btnPlay.addEventListener("click", togglePlay);
  $("btnStep").addEventListener("click", stepOnce);
  $("btnJump").addEventListener("click", jump10k);
  $("btnReset").addEventListener("click", doReset);
  $("btnFit").addEventListener("click", () => {
    setFollow(false);
    fitView();
    persist();
  });
  $("btnFollow").addEventListener("click", () => setFollow(!followAnt));
  $("btnFullscreen").addEventListener("click", () => {
    if (document.fullscreenElement !== null) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => toast("Fullscreen is not available here"));
  });
  for (const btn of document.querySelectorAll<HTMLElement>("[data-mode-btn]")) {
    btn.addEventListener("click", () => setMode(btn.dataset.modeBtn as Mode));
  }
  $("btnRandomRule").addEventListener("click", () => {
    freshSeed();
    const r = mulberry32(seed);
    const n = 2 + Math.floor(r() * 7);
    let str = "";
    // An ant string needs both letters, or the ant just circles.
    do {
      str = "";
      for (let i = 0; i < n; i++) str += r() < 0.5 ? "L" : "R";
    } while (!str.includes("L") || !str.includes("R"));
    setRule(parseAntString(str), true);
    toast(`Random rule ${str}`);
  });
  $("btnColonyLink").addEventListener("click", () => {
    if (colony === null) return;
    const url = location.origin + location.pathname + location.search + "#" + colony.hash();
    void copyText(url).then((ok) => toast(ok ? "Colony link copied (scenario + seed)" : "Copy failed"));
  });
  $("btnTurmiteCSV").addEventListener("click", () => {
    downloadText(
      `langtons-ant-${ruleToString(rule)}-${toB36(sim.stepCount)}.csv`,
      tSeries.toCSV("step", ["distance_from_start", "painted_cells"]),
      "text/csv",
    );
  });
  canvas.addEventListener("pointerleave", () => $("st-cell-chip").classList.add("hidden"));

  // Display toggles.
  const toggle = (id: string, apply: (on: boolean) => void): void => {
    const box = $(id) as HTMLInputElement;
    box.addEventListener("change", () => apply(box.checked));
  };
  toggle("chkSmooth", (on) => {
    smoothMotion = on;
  });
  toggle("chkAfterglow", (on) => renderer.setOptions({ afterglow: on }));
  toggle("chkGrid", (on) => renderer.setOptions({ gridLines: on }));
  toggle("chkMinimap", (on) => {
    showMinimap = on;
    $("minimap").classList.toggle("hidden", !on);
  });

  // Overview map: click or drag to move the view there.
  const mini = $("minimap") as HTMLCanvasElement;
  minimapCtx = mini.getContext("2d");
  const miniGo = (e: PointerEvent): void => {
    const r = mini.getBoundingClientRect();
    const w = renderer.minimapToWorld(((e.clientX - r.left) / r.width) * mini.width, ((e.clientY - r.top) / r.height) * mini.height);
    const goal: Camera = { ...cam };
    centerOn(goal, w.x, w.y, cssW, cssH);
    setFollow(false);
    moveCamTo(goal);
  };
  mini.addEventListener("pointerdown", (e) => {
    mini.setPointerCapture(e.pointerId);
    miniGo(e);
  });
  mini.addEventListener("pointermove", (e) => {
    if (e.buttons !== 0) miniGo(e);
  });

  // Preset filter.
  const filter = $("presetFilter") as HTMLInputElement;
  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const card of document.querySelectorAll<HTMLElement>("#presetList .preset-card")) {
      const hit = q === "" || (card.textContent ?? "").toLowerCase().includes(q);
      card.classList.toggle("hidden", !hit);
      if (hit) shown++;
    }
    $("presetEmpty").classList.toggle("hidden", shown > 0);
  });

  // Remember which panel sections are collapsed.
  for (const sec of document.querySelectorAll<HTMLDetailsElement>("details.sec[id]")) {
    try {
      const saved = localStorage.getItem(`la:sec:${sec.id}`);
      if (saved !== null) sec.open = saved === "1";
    } catch {
      /* ignore */
    }
    sec.addEventListener("toggle", () => {
      try {
        localStorage.setItem(`la:sec:${sec.id}`, sec.open ? "1" : "0");
      } catch {
        /* ignore */
      }
      updateStatus(); // charts in a newly opened section need a first draw
    });
  }

  const speed = document.getElementById("speed") as HTMLInputElement;
  speedLabelEl = $("speedLabel");
  setSpeed(speedS);
  speed.addEventListener("input", () => setSpeed(parseFloat(speed.value)));

  distChart = new LineChart($("turmiteCharts"), {
    title: "Distance from start (cells)",
    xName: "steps",
    series: [{ name: "Distance", colorVar: "--series-1" }],
  });
  paintChart = new LineChart($("turmiteCharts"), {
    title: "Painted cells",
    xName: "steps",
    series: [{ name: "Painted", colorVar: "--series-2", valueIndex: 1 }],
  });

  colonyInfoEl = $("colonyInfo");
  $("btnAddAnt").addEventListener("click", addAntAtCenter);
  $("btnClearAnts").addEventListener("click", clearAnts);
  $("btnSeed5").addEventListener("click", () => seedStrays(5));
  $("btnSeed25").addEventListener("click", () => seedStrays(25));
  const place = $("btnPlace");
  place.addEventListener("click", () => {
    placeMode = !placeMode;
    if (place instanceof HTMLButtonElement) place.setAttribute("aria-pressed", placeMode ? "true" : "false");
    place.classList.toggle("on", placeMode);
    canvas.classList.toggle("placing", placeMode);
  });

  $("btnMirror").addEventListener("click", () => {
    setRule(mirrorRule(rule));
    toast("Chirality mirrored");
  });

  $("btnPermalink").addEventListener("click", copyPermalink);
  $("btnPNG").addEventListener("click", exportPNG);
  $("btnRecord").addEventListener("click", () => {
    if (recording) stopRecording();
    else startRecording();
  });
  $("btnTheme").addEventListener("click", toggleTheme);
  $("btnJSON").addEventListener("click", exportJSON);
  $("btnLoadJSON").addEventListener("click", () => {
    void importJSON();
  });
  $("btnDocs").addEventListener("click", () => openRuleDocs());

  const help = $("help");
  $("btnHelp").addEventListener("click", () => {
    help.classList.toggle("open");
  });
  $("btnCloseHelp").addEventListener("click", () => help.classList.remove("open"));

  $("panelToggle").addEventListener("click", () => setPanelOpen(true));
  $("btnClosePanel").addEventListener("click", () => setPanelOpen(false));
  setPanelOpen(window.innerWidth > 860);
}

function setPanelOpen(open: boolean): void {
  document.body.classList.toggle("panel-open", open);
  $("panelToggle").setAttribute("aria-expanded", open ? "true" : "false");
}

function exportJSON(): void {
  if (busyReplaying()) return;
  const state = makeSession(sim, recipe, {
    camera: { x: cam.panX, y: cam.panY, zoom: cam.zoom },
    seed,
    palette: paletteId,
  });
  downloadText(`langtons-ant-${toB36(sim.stepCount)}.json`, sessionToJSON(state));
  if (state.grid === null && state.initialAnts === null) {
    toast("Session exported, but without its grid (too large) — importing it will not reproduce the grid");
  } else {
    toast("Session exported");
  }
}

async function importJSON(): Promise<void> {
  let text: string;
  try {
    text = await pickFile();
  } catch (err) {
    toast("Import cancelled");
    return;
  }
  let state: ReturnType<typeof sessionFromJSON>;
  try {
    state = sessionFromJSON(text);
  } catch (err) {
    toast("Invalid session file");
    return;
  }
  const plan = planFromSession(state, ruleFromString(state.rule));
  // The imported setup replaces the current run; nothing is advanced a second time.
  applyPlan(plan, false);
  cam = { panX: state.camera.x, panY: state.camera.y, zoom: state.camera.zoom };
  refreshCam();
  seed = state.seed;
  rng = mulberry32(seed);
  paletteId = state.palette;
  applyPaletteToRenderer();
  persist();
  if (plan.replaySteps === 0) toast(`Session imported (${fmtInt(sim.stepCount)} steps)`);
}

function startRecording(): void {
  if (mediaRecorder !== null) return;
  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `langtons-ant-${toB36(sim.stepCount)}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Clip saved");
    mediaRecorder = null;
    recording = false;
    const btn = document.getElementById("btnRecord");
    if (btn) btn.textContent = "Record clip";
  };
  mediaRecorder.start(100);
  recording = true;
  const btn = document.getElementById("btnRecord");
  if (btn) btn.textContent = "Stop recording";
  toast("Recording…");
  const durSel = document.getElementById("recDur") as HTMLSelectElement | null;
  const dur = durSel ? parseInt(durSel.value, 10) || 5 : 5;
  window.setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  }, dur * 1000);
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
}

function toggleTheme(): void {
  const light = document.documentElement.classList.toggle("light");
  try {
    localStorage.setItem("la:theme", light ? "light" : "dark");
  } catch {
    /* ignore */
  }
}

function exportPNG(): void {
  canvas.toBlob((blob) => {
    if (blob === null) {
      toast("PNG export failed");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `langtons-ant-${toB36(sim.stepCount)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("PNG exported");
  }, "image/png");
}

function wireKeyboard(): void {
  window.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    if (target !== null && target.closest("input, select, textarea, a")) return;
    // A focused button consumes space itself (activation); the other shortcuts stay live.
    if (e.key === " " && target !== null && target.closest("button")) return;
    switch (e.key) {
      case " ":
        e.preventDefault();
        togglePlay();
        break;
      case "s":
        stepOnce();
        break;
      case "r":
        doReset();
        break;
      case "f":
        setFollow(false);
        fitView();
        break;
      case "c":
        if (mode === "turmite") setFollow(!followAnt);
        break;
      case "g": {
        const box = $("chkGrid") as HTMLInputElement;
        box.checked = !box.checked;
        renderer.setOptions({ gridLines: box.checked });
        break;
      }
      case "p":
        setPanelOpen(!document.body.classList.contains("panel-open"));
        break;
      case "1":
        setMode("turmite");
        break;
      case "2":
        setMode("colony");
        break;
      case "+":
      case "=":
        setSpeed(currentSpeed() + 0.05);
        break;
      case "-":
      case "_":
        setSpeed(currentSpeed() - 0.05);
        break;
      case "?":
        $("help").classList.toggle("open");
        break;
      case "d":
        if (mode === "turmite") openRuleDocs();
        break;
      case "t":
        toggleTheme();
        break;
      case "Escape":
        $("help").classList.remove("open");
        closeRuleDocs();
        if (placeMode) exitPlaceMode();
        if (colony !== null && colony.tool !== "pan") {
          colony.setTool("pan");
        }
        break;
      default:
        break;
    }
  });
}

function wireGlobals(): void {
  const onResize = () => {
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.resize(cssW, cssH, dpr);
    if (!camInit && cssW > 0) {
      camInit = true;
      centerOn(cam, 0, 0, cssW, cssH);
      refreshCam();
    }
  };
  window.addEventListener("resize", onResize);
  onResize();

  window.addEventListener("pagehide", () => persist());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
}

// ------------------------------------------------------------------ boot

/** `#m=colony&sc=<scenario>&x=<seed hex>` → the colony run it names, else null. */
function parseColonyHash(hash: string): { scenario?: string; seed?: number } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.get("m") !== "colony") return null;
  const x = params.get("x");
  return {
    scenario: params.get("sc") ?? undefined,
    seed: x !== null && /^[0-9a-fA-F]{1,8}$/.test(x) ? parseInt(x, 16) >>> 0 : undefined,
  };
}

function applyDecoded(colonyLink: boolean): void {
  // A colony link carries no turmite state: the turmite side restores from autosave.
  const hash = colonyLink ? "" : location.hash;
  let d: DecodedState | null = null;
  if (hash.length > 1) {
    d = decodeState(hash);
  }
  let savedApplied = false;
  const saved = loadAutosave();
  let plan: RestorePlan | null = d === null ? null : planFromUrl(d);
  if (saved !== null && (d === null || (plan !== null && plan.kind === "approximate"))) {
    const sd = decodeState("#" + saved);
    if (sd !== null && d === null) {
      d = sd;
      plan = planFromUrl(sd);
      savedApplied = true;
    } else if (sd !== null && d !== null) {
      // The address bar could not hold the grid of a run edited mid-run; the
      // autosave can. Use it only if it is the same run (same rule and step).
      const sp = planFromUrl(sd);
      if (sp.kind === "embedded" && sd.steps === d.steps && ruleToString(sd.rule) === ruleToString(d.rule)) {
        d = sd;
        plan = sp;
        savedApplied = true;
      }
    }
  }
  if (d === null || plan === null) {
    // First visit — Tier 0: fresh flagship ant, already running.
    camInit = false;
    cam = { panX: 0, panY: 0, zoom: DEFAULT_ZOOM };
    seed = INITIAL_SEED;
    rng = mulberry32(seed);
    paletteId = DEFAULT_PALETTE_ID;
    newRun(PRESETS[0].rule, { running: true });
    return;
  }
  camInit = false;
  cam = {
    panX: 0,
    panY: 0,
    zoom: d.zoom >= 0 ? clampZoom(d.zoom) : DEFAULT_ZOOM,
  };
  seed = d.seed ?? INITIAL_SEED;
  rng = mulberry32(seed);
  paletteId = d.paletteId ?? DEFAULT_PALETTE_ID;
  applyPlan(plan, true);
  if (savedApplied && plan.message === null && plan.replaySteps === 0) {
    toast("Session restored — Reset for a fresh ant");
  }
}

function main(): void {
  canvas = $("board") as HTMLCanvasElement;
  renderer = new Renderer(canvas);
  ruleNotationEl = $("ruleNotation");
  toastsEl.current = $("toasts");
  wireGlobals();
  wireButtons();
  wirePanel();
  wireCanvasEvents();
  wireKeyboard();
  applyPaletteToRenderer();
  const colonyReq = parseColonyHash(location.hash);
  applyDecoded(colonyReq !== null);
  if (colonyReq !== null) setMode("colony", colonyReq);
  const sel = document.getElementById("paletteSelect") as HTMLSelectElement;
  sel.value = paletteId;
  try {
    if (localStorage.getItem("la:theme") === "light") document.documentElement.classList.add("light");
  } catch {
    /* ignore */
  }
  const chk = document.getElementById("chkAutoPause") as HTMLInputElement | null;
  if (chk) {
    chk.checked = autoPauseOnHighway;
    chk.addEventListener("change", () => {
      autoPauseOnHighway = chk.checked;
    });
  }
  requestAnimationFrame(frame);
}

main();
