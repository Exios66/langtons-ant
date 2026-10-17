/**
 * URL-hash permalinks.
 *
 * Contract format (GitHub Pages safe, never sent to a server):
 *   #r=<ruleString>&a=<packedAnts>&s=<stepsB36>&z=<zoom x1000 b36>
 *    &c=<camX b36>,<camY b36>&p=<paletteId>&x=<seed 8 hex>&g=<RLE>
 *
 * The rule is the shortest canonical string (ant string, decimal ID, or
 * GollyGang triples). The grid RLE rides along only when its encoding stays
 * under ~1 KB; larger states fall back to rule+ants+steps with a toast.
 * All writes use history.replaceState — never pushState.
 */

import type { World } from "../engine/grid";
import { parseAntString, parseDecimal, parseTriples, ruleToString, type Rule } from "../engine/rule";
import type { Ant } from "../engine/simulation";
import {
  fromB36,
  packAnts,
  toB36,
  unpackAnts,
  worldFromRLE,
  worldToRLE,
} from "../engine/serialize";
import { clampZoom } from "./camera";
import { PALETTES } from "../render/palette";

export const RLE_URL_LIMIT = 900;

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
}

export interface DecodedState {
  rule: Rule;
  ants: Array<{ x: number; y: number; dir: number; state: number }>;
  /** True when an `a=` key was present (vs. absent → default origin ant). */
  antsSpecified: boolean;
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
  const live = snap.ants.filter((a) => !a.halted);
  if (live.length > 0) {
    try {
      parts.push(`a=${packAnts(live)}`);
    } catch {
      // Malformed ant records are silently skipped; rule still round-trips.
    }
  }
  parts.push(`s=${toB36(Math.max(0, Math.round(snap.steps)))}`);
  parts.push(`z=${toB36(Math.round(clampZoom(snap.zoom) * 1000))}`);
  parts.push(`c=${toB36(Math.round(snap.centerX))},${toB36(Math.round(snap.centerY))}`);
  if (PALETTES.some((p) => p.id === snap.paletteId)) {
    parts.push(`p=${snap.paletteId}`);
  }
  parts.push(`x=${seedToHex(snap.seed)}`);
  if (snap.world !== null) {
    try {
      const rle = worldToRLE(snap.world);
      if (rle.length > 0 && rle.length <= RLE_URL_LIMIT) {
        parts.push(`g=${rle}`);
      }
    } catch {
      // >26 colors cannot be RLE-encoded; a gridless link is still valid.
    }
  }
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
  return { rule, ants, antsSpecified, steps, zoom, centerX, centerY, seed, paletteId, world };
}
