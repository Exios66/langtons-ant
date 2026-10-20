/**
 * URL-hash permalinks.
 *
 * Contract format (GitHub Pages safe, never sent to a server):
 *   #r=<ruleString>&a=<packedAnts>&i=<packedInitialAnts>&s=<stepsB36>
 *    &z=<zoom x1000 b36>&c=<camX b36>,<camY b36>&p=<paletteId>
 *    &x=<seed 8 hex>&g=<RLE>
 *
 * The rule is the shortest canonical string (ant string, decimal ID, or
 * GollyGang triples). A link reproduces the run it was copied from in one of
 * three ways, chosen by `planFromUrl` (restore.ts):
 *
 *   1. Embedded grid: `g` (RLE of the whole grid, only when it stays under
 *      ~1 KB) and `a` (the ants as they are now) restore the exact state
 *      instantly. `s` is just the step counter.
 *   2. Replay: `i` holds the ants the run STARTED with. A run is a pure
 *      function of (rule, starting ants, step count), so the app rebuilds it
 *      by re-simulating `s` steps from an empty grid (capped, see
 *      REPLAY_STEP_CAP). Used when the grid is too big to embed.
 *   3. Neither: a run that was edited mid-run (ants added or removed after
 *      step 0) is not a function of its starting ants, and a big grid cannot
 *      ride in a URL. The link then carries only `a` + `s`; restoring it puts
 *      those ants on an EMPTY grid and the app says so. Links written before
 *      replay support (no `i`) with s > 0 and no `g` decode the same way.
 *
 * `i` is also written next to `g` whenever the run is replayable, so a link
 * that was restored from an embedded grid can be re-shared after running on.
 * All writes use history.replaceState — never pushState.
 */

import type { World } from "../engine/grid";
import { parseAntString, parseDecimal, parseTriples, ruleToString, type Rule } from "../engine/rule";
import type { Ant } from "../engine/simulation";
import {
  fromB36,
  packAnts,
  toB36,
  tryWorldToRLE,
  unpackAnts,
  worldFromRLE,
} from "../engine/serialize";
import { clampZoom } from "./camera";
import { PALETTES } from "../render/palette";

export const RLE_URL_LIMIT = 900;
/**
 * Bounding-box area above which no grid is serialized: sweeping it is the
 * expensive part, and a region this large essentially never fits the limit.
 */
export const RLE_MAX_CELLS = 4_000_000;

/** Ant records as stored in links and session files. */
export interface AntRecord {
  x: number;
  y: number;
  dir: number;
  state: number;
}

/** Positions are packed as signed 16-bit values; anything else would wrap. */
export function antsFitPacking(ants: ReadonlyArray<AntRecord>): boolean {
  return ants.every(
    (a) =>
      Number.isInteger(a.x) &&
      Number.isInteger(a.y) &&
      a.x >= -32768 &&
      a.x <= 32767 &&
      a.y >= -32768 &&
      a.y <= 32767 &&
      a.dir >= 0 &&
      a.dir <= 3 &&
      a.state >= 0 &&
      a.state <= 31,
  );
}

export interface UrlSnapshot {
  rule: Rule;
  /** Live ants only (dir 0..3, state 0..31). */
  ants: Ant[];
  steps: number;
  zoom: number;
  /** World coords of the viewport center. */
  centerX: number;
  centerY: number;
  seed: number;
  paletteId: string;
  world: World | null;
  /**
   * The ants this run started with, or null when the run is not a pure
   * function of them (ants were added/removed after step 0). Without it a
   * link can only carry the grid, and only when that is small.
   */
  initialAnts?: ReadonlyArray<AntRecord> | null;
  /** Largest grid RLE (chars) to embed; defaults to RLE_URL_LIMIT. */
  rleLimit?: number;
}

export interface DecodedState {
  rule: Rule;
  ants: Array<{ x: number; y: number; dir: number; state: number }>;
  /** True when an `a=` key was present (vs. absent → default origin ant). */
  antsSpecified: boolean;
  /** Ants the run started with (`i=`), or null when the link has none. */
  initialAnts: AntRecord[] | null;
  steps: number;
  zoom: number;
  centerX: number;
  centerY: number;
  seed: number | null;
  paletteId: string | null;
  world: World | null;
}

/** Parse a rule in any of the three supported notations. */
export function ruleFromString(s: string): Rule {
  const t = s.trim();
  let firstError: unknown = null;
  try {
    return parseAntString(t);
  } catch (e) {
    firstError = e;
  }
  try {
    return parseDecimal(t);
  } catch {
    // fall through
  }
  try {
    return parseTriples(t);
  } catch {
    // fall through
  }
  if (firstError instanceof Error) throw firstError;
  throw new Error(`unrecognized rule string "${s}"`);
}

function seedToHex(seed: number): string {
  return ((seed >>> 0) || 0).toString(16).padStart(8, "0");
}

function seedFromHex(s: string): number | null {
  if (!/^[0-9a-fA-F]{1,8}$/.test(s)) return null;
  return parseInt(s, 16) >>> 0;
}

export function encodeState(snap: UrlSnapshot): string {
  const parts: string[] = [];
  parts.push(`r=${ruleToString(snap.rule)}`);

  let rle: string | null = null;
  if (snap.world !== null) {
    try {
      const r = tryWorldToRLE(snap.world, snap.rleLimit ?? RLE_URL_LIMIT, RLE_MAX_CELLS);
      if (r !== null && r.length > 0) rle = r;
    } catch {
      // >26 colors cannot be RLE-encoded; fall back to replay (or approximate).
    }
  }
  const recipe =
    snap.initialAnts !== undefined && snap.initialAnts !== null && antsFitPacking(snap.initialAnts)
      ? snap.initialAnts
      : null;

  // Current ants are written when they are the state (embedded grid) or the
  // best available approximation (no grid, no replay recipe). With a replay
  // recipe and no grid they would be redundant, so they are omitted.
  const live = snap.ants.filter((a) => !a.halted);
  if ((rle !== null || recipe === null) && live.length > 0) {
    try {
      parts.push(`a=${packAnts(live)}`);
    } catch {
      // Malformed ant records are silently skipped; rule still round-trips.
    }
  }
  if (recipe !== null) parts.push(`i=${packAnts(recipe)}`);
  parts.push(`s=${toB36(Math.max(0, Math.round(snap.steps)))}`);
  parts.push(`z=${toB36(Math.round(clampZoom(snap.zoom) * 1000))}`);
  parts.push(`c=${toB36(Math.round(snap.centerX))},${toB36(Math.round(snap.centerY))}`);
  if (PALETTES.some((p) => p.id === snap.paletteId)) {
    parts.push(`p=${snap.paletteId}`);
  }
  parts.push(`x=${seedToHex(snap.seed)}`);
  if (rle !== null) parts.push(`g=${rle}`);
  return parts.join("&");
}

function parsePairs(query: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const piece of query.split("&")) {
    if (piece.length === 0) continue;
    const eq = piece.indexOf("=");
    if (eq <= 0) continue;
    const key = piece.slice(0, eq);
    let value = piece.slice(eq + 1);
    if (value.includes("%")) {
      try {
        value = decodeURIComponent(value);
      } catch {
        // keep raw value
      }
    }
    out.push([key, value]);
  }
  return out;
}

/** Decode a permalink query string; returns null if the rule is unusable. */
export function decodeState(query: string): DecodedState | null {
  if (!query.startsWith("#")) return null;
  const q = query.slice(1);
  if (q.length === 0) return null;
  let rule: Rule | null = null;
  let ants: Array<{ x: number; y: number; dir: number; state: number }> = [];
  let antsSpecified = false;
  let initialAnts: AntRecord[] | null = null;
  let steps = 0;
  let zoom = -1;
  let centerX = 0;
  let centerY = 0;
  let seed: number | null = null;
  let paletteId: string | null = null;
  let world: World | null = null;

  for (const [key, value] of parsePairs(q)) {
    switch (key) {
      case "r": {
        try {
          rule = ruleFromString(value);
        } catch {
          rule = null;
        }
        break;
      }
      case "a": {
        antsSpecified = true;
        try {
          ants = unpackAnts(value);
        } catch {
          ants = [];
        }
        break;
      }
      case "i": {
        try {
          initialAnts = unpackAnts(value);
        } catch {
          initialAnts = null;
        }
        break;
      }
      case "s": {
        const n = fromB36(value);
        if (Number.isFinite(n) && n >= 0) steps = Math.min(n, Number.MAX_SAFE_INTEGER);
        break;
      }
      case "z": {
        const n = fromB36(value);
        if (Number.isFinite(n)) zoom = clampZoom(n / 1000);
        break;
      }
      case "c": {
        const comma = value.indexOf(",");
        if (comma > 0) {
          const cx = fromB36(value.slice(0, comma));
          const cy = fromB36(value.slice(comma + 1));
          if (Number.isFinite(cx)) centerX = cx;
          if (Number.isFinite(cy)) centerY = cy;
        }
        break;
      }
      case "p": {
        if (PALETTES.some((p) => p.id === value)) paletteId = value;
        break;
      }
      case "x": {
        seed = seedFromHex(value);
        break;
      }
      case "g": {
        try {
          world = worldFromRLE(value);
        } catch {
          world = null;
        }
        break;
      }
      default:
        break;
    }
  }

  if (rule === null) return null;
  return { rule, ants, antsSpecified, initialAnts, steps, zoom, centerX, centerY, seed, paletteId, world };
}
