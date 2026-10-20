/**
 * Full-session save/load helpers.
 *
 * A v2 session file holds enough to reproduce the exact run it came from:
 *   - `grid`: the whole grid as RLE (when it can be encoded and is not huge);
 *     import loads it directly, with no re-simulation;
 *   - `initialAnts`: the ants the run started with, valid only while the run
 *     is a pure function of them (no ants added/removed after step 0); import
 *     re-simulates `steps` steps from an empty grid when there is no `grid`.
 * If neither survives (an edited run whose grid is too big), the file says so
 * with `grid: null, initialAnts: null` and import restores only the ants, on
 * an empty grid, with a warning. v1 files (current ants + step count, no
 * grid) decode the same way; they used to be "replayed" by advancing again
 * from the saved positions, which double-counted steps and was never exact.
 */
import { parseAntString, parseDecimal, parseTriples, ruleToString } from "../engine/rule";
import type { Rule } from "../engine/rule";
import { World } from "../engine/grid";
import type { Ant } from "../engine/simulation";
import { packAnts, unpackAnts, toB36, fromB36, tryWorldToRLE } from "../engine/serialize";
import type { AntRecord } from "./urlState";

/** Largest session grid (RLE chars / swept bbox cells) written to a file. */
export const SESSION_RLE_MAX_CHARS = 4_000_000;
export const SESSION_RLE_MAX_CELLS = 100_000_000;

export interface SessionAnt extends AntRecord {
  halted?: boolean;
}

export interface SessionStateV1 {
  v: 1;
  rule: string; // canonical rule string
  ants: SessionAnt[];
  steps: number;
  camera: { x: number; y: number; zoom: number };
  seed: number;
  palette: string;
}

export interface SessionStateV2 {
  v: 2;
  rule: string;
  /** Ants as they are at `steps` (halted ones flagged). */
  ants: SessionAnt[];
  steps: number;
  /** Ants the run started with; null if the run was edited mid-run. */
  initialAnts: AntRecord[] | null;
  /** RLE of the full grid; null if it could not be stored. */
  grid: string | null;
  camera: { x: number; y: number; zoom: number };
  seed: number;
  palette: string;
}

export type SessionState = SessionStateV1 | SessionStateV2;

export interface SessionSource {
  rule: Rule;
  ants: ReadonlyArray<Ant>;
  stepCount: number;
  world: World;
}

/** Build a v2 session from a live run. `recipe` is the starting ants, or null. */
export function makeSession(
  src: SessionSource,
  recipe: ReadonlyArray<AntRecord> | null,
  extras: { camera: { x: number; y: number; zoom: number }; seed: number; palette: string },
): SessionStateV2 {
  let grid: string | null = null;
  try {
    grid = tryWorldToRLE(src.world, SESSION_RLE_MAX_CHARS, SESSION_RLE_MAX_CELLS);
  } catch {
    grid = null; // >26 colors: fall back to the replay recipe
  }
  return {
    v: 2,
    rule: ruleToString(src.rule),
    ants: src.ants.map((a) => ({
      x: a.x,
      y: a.y,
      dir: a.dir,
      state: a.state,
      ...(a.halted ? { halted: true } : {}),
    })),
    steps: src.stepCount,
    initialAnts: recipe === null ? null : recipe.map((a) => ({ x: a.x, y: a.y, dir: a.dir, state: a.state })),
    grid,
    camera: extras.camera,
    seed: extras.seed,
    palette: extras.palette,
  };
}

export function sessionToJSON(state: SessionState): string {
  return JSON.stringify(state, null, 2);
}

function checkAnts(list: unknown, what: string): void {
  if (!Array.isArray(list)) throw new Error(`missing ${what}`);
  for (const a of list) {
    if (
      !a ||
      !Number.isInteger(a.x) ||
      !Number.isInteger(a.y) ||
      !Number.isInteger(a.dir) ||
      a.dir < 0 ||
      a.dir > 3 ||
      !Number.isInteger(a.state) ||
      a.state < 0
    ) {
      throw new Error(`malformed ant in ${what}`);
    }
  }
}

export function sessionFromJSON(text: string): SessionState {
  const o = JSON.parse(text);
  if (!o || (o.v !== 1 && o.v !== 2)) throw new Error("unsupported session version");
  if (typeof o.rule !== "string") throw new Error("missing rule");
  checkAnts(o.ants, "ants");
  if (typeof o.steps !== "number" || !Number.isFinite(o.steps) || o.steps < 0) throw new Error("missing steps");
  if (o.v === 2) {
    if (o.initialAnts === undefined) o.initialAnts = null;
    if (o.initialAnts !== null) checkAnts(o.initialAnts, "initialAnts");
    if (o.grid === undefined) o.grid = null;
    if (o.grid !== null && typeof o.grid !== "string") throw new Error("malformed grid");
  }
  // Validate the rule parses before accepting.
  ruleFromString(o.rule);
  return o as SessionState;
}

export function ruleFromString(s: string) {
  const t = s.trim();
  try {
    return parseAntString(t);
  } catch {
    /* fall through */
  }
  try {
    return parseDecimal(t);
  } catch {
    /* fall through */
  }
  return parseTriples(t);
}

export function downloadText(filename: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) {
        reject(new Error("no file selected"));
        return;
      }
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = () => reject(r.error ?? new Error("read failed"));
      r.readAsText(f);
    };
    input.click();
  });
}

// Re-export for convenience
export { packAnts, unpackAnts, toB36, fromB36 };
