/**
 * Full-session save/load helpers. A session is the complete sufficient state:
 * rule (canonical string), ants, step count, camera, seed, palette id. The grid
 * itself is NOT stored — it is replayed deterministically from the rule + seed
 * + ants + step count, which keeps saves tiny and guarantees byte-identical
 * replay (the same property the golden-hash test pins).
 */
import { parseAntString, parseDecimal, parseTriples, ruleToString } from "../engine/rule";
import { packAnts, unpackAnts, toB36, fromB36 } from "../engine/serialize";

export interface SessionState {
  v: 1;
  rule: string; // canonical rule string
  ants: { x: number; y: number; dir: number; state: number }[];
  steps: number;
  camera: { x: number; y: number; zoom: number };
  seed: number;
  palette: string;
}

export function sessionToJSON(state: SessionState): string {
  return JSON.stringify(state, null, 2);
}

export function sessionFromJSON(text: string): SessionState {
  const o = JSON.parse(text);
  if (!o || o.v !== 1) throw new Error("unsupported session version");
  if (typeof o.rule !== "string") throw new Error("missing rule");
  if (!Array.isArray(o.ants)) throw new Error("missing ants");
  if (typeof o.steps !== "number") throw new Error("missing steps");
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
