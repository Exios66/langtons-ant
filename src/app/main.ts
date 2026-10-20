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
import { ruleToString, mirrorRule, type Rule } from "../engine/rule";
import { Simulation } from "../engine/simulation";
import { toB36, worldToRLE } from "../engine/serialize";
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
import { RLE_URL_LIMIT, decodeState, encodeState, type DecodedState, type UrlSnapshot } from "./urlState";
import { buildPresetList, createRuleEditor, paletteOptionList, type RuleEditorHandle, type SwatchOption } from "./ui";
import { HighwayDetector } from "./highwayDetector";
import { ruleFromString, sessionToJSON, sessionFromJSON, downloadText, pickFile, type SessionState } from "./sessionIO";
import { openRuleDocs, closeRuleDocs } from "./ruleDocs";

const MAX_BATCH = 250_000;
const INITIAL_SEED = 0x1a2b3c4d;
const PERSIST_INTERVAL_MS = 5000;
const STATUS_INTERVAL_MS = 200;

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
let recording = false;
let mediaRecorder: MediaRecorder | null = null;

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
  ants?: Array<{ x: number; y: number; dir: number; state: number }>;
  steps?: number;
  running?: boolean;
}

function newRun(r: Rule, opts: RunOptions = {}): void {
  rule = r;
  const world = opts.world ?? new World();
  sim = new Simulation(r, world);
  if (opts.steps !== undefined) sim.stepCount = opts.steps;
  const ants = opts.ants ?? [{ x: 0, y: 0, dir: 1, state: 0 }];
  for (const a of ants) sim.addAnt(a.x, a.y, a.dir, a.state);
  if (opts.running !== undefined) running = opts.running;
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
  $("st-steps").textContent = fmtInt(sim.stepCount);
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
  iconPlay.toggleAttribute("hidden", running);
  iconPause.toggleAttribute("hidden", !running);
  btnPlay.setAttribute("aria-label", running ? "Pause" : "Play");
  btnPlay.setAttribute("aria-pressed", running ? "true" : "false");
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

  if (running && sim.liveCount > 0) {
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
  const fpsInst = 1000 / dt;
  emaFps = emaFps === null ? fpsInst : emaFps * 0.9 + fpsInst * 0.1;

  renderer.frame();

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
  };
}

function persist(): void {
  const enc = encodeState(snapshot());
  saveAutosave(enc);
  try {
    history.replaceState(null, "", location.pathname + location.search + "#" + enc);
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

function gridTooLarge(): boolean {
  try {
    return worldToRLE(sim.world).length > RLE_URL_LIMIT;
  } catch {
    return true; // >26 colors cannot be RLE-encoded, among other reasons
  }
}

function copyPermalink(preset?: Preset): void {
  let snap: UrlSnapshot;
  if (preset !== undefined) {
    snap = {
      rule: preset.rule,
      ants: [{ x: 0, y: 0, dir: 1, state: 0 }],
      steps: 0,
      zoom: cam.zoom,
      centerX: worldCenterX(),
      centerY: worldCenterY(),
      seed: freshSeed(),
      paletteId,
      world: new World(),
    };
  } else {
    snap = snapshot();
  }
  const tooBig = preset === undefined && gridTooLarge();
  if (tooBig) {
    // Gridless link: rule + ants + steps still replay by re-simulation.
    snap.world = null;
  }
  const url = location.origin + location.pathname + location.search + "#" + encodeState(snap);
  void copyText(url).then((ok) => {
    if (ok) {
      toast(tooBig ? "Link copied — state too large for a link" : "Permalink copied");
    } else {
      toast("Copy failed — the address bar holds the current link");
    }
    persist();
  });
}

// ----------------------------------------------------------------- colony

function addAntAtCenter(): void {
  sim.addAnt(Math.round(worldCenterX()), Math.round(worldCenterY()), 1);
  updateStatus();
  persist();
}

function clearAnts(): void {
  sim.clearAnts();
  updateStatus();
  persist();
  toast("Colony cleared");
}

function seedStrays(n: number): void {
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
  persist();
  toast(`Seeded ${n} strays · seed 0x${(seed >>> 0).toString(16).padStart(8, "0")}`);
}

function toggleAntAt(sx: number, sy: number): void {
  const wx = screenToWorldX(cam, sx);
  const wy = screenToWorldY(cam, sy);
  const idx = sim.ants.findIndex((a) => a.x === wx && a.y === wy);
  if (idx >= 0) {
    sim.ants.splice(idx, 1);
  } else {
    sim.addAnt(wx, wy, 1);
  }
  updateStatus();
  persist();
}

// ---------------------------------------------------------------- actions

function togglePlay(): void {
  running = !running;
  updatePlayButton();
  persist();
}

function stepOnce(): void {
  if (sim.liveCount === 0) return;
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
  newRun(rule, { running: true });
  persist();
}

function fitView(): void {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
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
  fitRect(cam, minX, minY, maxX, maxY, cssW, cssH);
  refreshCam();
}

function setSpeed(s: number): void {
  speedS = clampSpeed(s);
  (document.getElementById("speed") as HTMLInputElement).value = String(speedS);
  speedLabelEl.textContent = fmtInt(stepsPerSec()) + " steps/s";
}

function clampSpeed(s: number): number {
  if (!Number.isFinite(s)) return 0.5;
  return Math.min(1, Math.max(0, s));
}

// ---------------------------------------------------------------- pointer

const pointers = new Map<number, { x: number; y: number }>();
let pinch: { dist: number; mx: number; my: number; cam: Camera } | null = null;
let downMoved = false;

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
    if (pointers.size === 2) {
      const list = Array.from(pointers.values());
      const t = touchPos(list);
      if (t !== null) {
        pinch = { dist: Math.max(1, t.dist), mx: t.mx, my: t.my, cam: { ...cam } };
      }
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (prev === undefined) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (dx * dx + dy * dy > 1 || dt0(prev, e) > 6) downMoved = true;
    prev.x = e.clientX;
    prev.y = e.clientY;
    if (pointers.size === 1 && pinch === null) {
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
    if (pointers.size < 2) pinch = null;
    if (wasSingle && !downMoved && placeMode) {
      toggleAntAt(e.clientX, e.clientY);
    }
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0012));
      zoomAt(cam, e.clientX, e.clientY, cam.zoom * factor);
      refreshCam();
    },
    { passive: false },
  );
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
      const snap: UrlSnapshot = {
        rule: p.rule,
        ants: [{ x: 0, y: 0, dir: 1, state: 0 }],
        steps: 0,
        zoom: cam.zoom,
        centerX: worldCenterX(),
        centerY: worldCenterY(),
        seed: freshSeed(),
        paletteId,
        world: new World(),
      };
      const url = location.origin + location.pathname + location.search + "#" + encodeState(snap);
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
    fitView();
    persist();
  });

  const speed = document.getElementById("speed") as HTMLInputElement;
  speedLabelEl = $("speedLabel");
  setSpeed(speedS);
  speed.addEventListener("input", () => setSpeed(parseFloat(speed.value)));

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

  $("btnPermalink").addEventListener("click", () => copyPermalink());
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

  const panel = $("panel");
  const panelToggle = $("panelToggle");
  panelToggle.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    panelToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $("btnClosePanel").addEventListener("click", () => {
    panel.classList.remove("open");
    panelToggle.setAttribute("aria-expanded", "false");
  });
}

function exportJSON(): void {
  const state: SessionState = {
    v: 1,
    rule: ruleToString(rule),
    ants: sim.ants.filter((a) => !a.halted).map((a) => ({ x: a.x, y: a.y, dir: a.dir, state: a.state })),
    steps: sim.stepCount,
    camera: { x: cam.panX, y: cam.panY, zoom: cam.zoom },
    seed,
    palette: paletteId,
  };
  downloadText(`langtons-ant-${toB36(sim.stepCount)}.json`, sessionToJSON(state));
  toast("Session exported");
}

async function importJSON(): Promise<void> {
  let text: string;
  try {
    text = await pickFile();
  } catch (err) {
    toast("Import cancelled");
    return;
  }
  let state: SessionState;
  try {
    state = sessionFromJSON(text);
  } catch (err) {
    toast("Invalid session file");
    return;
  }
  const r = ruleFromString(state.rule);
  newRun(r, { ants: state.ants, steps: 0, running: false });
  if (state.steps > 0) sim.advance(state.steps);
  cam = { panX: state.camera.x, panY: state.camera.y, zoom: state.camera.zoom };
  refreshCam();
  seed = state.seed;
  rng = mulberry32(seed);
  paletteId = state.palette;
  applyPaletteToRenderer();
  persist();
  toast(`Session imported (${fmtInt(sim.stepCount)} steps)`);
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
        fitView();
        break;
      case "+":
      case "=":
        setSpeed(speedS + 0.05);
        break;
      case "-":
      case "_":
        setSpeed(speedS - 0.05);
        break;
      case "?":
        $("help").classList.toggle("open");
        break;
      case "d":
        openRuleDocs();
        break;
      case "t":
        toggleTheme();
        break;
      case "Escape":
        $("help").classList.remove("open");
        closeRuleDocs();
        if (placeMode) {
          placeMode = false;
          const place = $("btnPlace");
          place.classList.remove("on");
          place.setAttribute("aria-pressed", "false");
          canvas.classList.remove("placing");
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

function applyDecoded(): void {
  const hash = location.hash;
  let d: DecodedState | null = null;
  if (hash.length > 1) {
    d = decodeState(hash);
  }
  let savedApplied = false;
  if (d === null) {
    const saved = loadAutosave();
    if (saved !== null) {
      d = decodeState("#" + saved);
      savedApplied = d !== null;
    }
  }
  if (d === null) {
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
  const ants =
    d.antsSpecified && d.ants.length > 0
      ? d.ants
      : [{ x: 0, y: 0, dir: 1, state: 0 }];
  newRun(d.rule, {
    world: d.world ?? undefined,
    ants,
    steps: d.steps,
    running: true,
  });
  if (savedApplied) {
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
  applyDecoded();
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
