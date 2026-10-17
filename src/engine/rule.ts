/**
 * The rule model: one flat (state x color) transition table spans everything
 * from the classic 1-state 2-color Langton's ant to full multi-state turmites.
 *
 * A rule is three parallel arrays of length `states * colors`, indexed
 * state-major: `entry = state * colors + color`. Per entry the head:
 *   1. writes `write[entry]` to the cell,
 *   2. turns by `turn[entry]`,
 *   3. transitions to `next[entry]`.
 *
 * Turn codes follow the GollyGang Rule Table Repository convention (the
 * lossless interchange format of the entire turmite corpus):
 *     0 = halt, 1 = forward, 2 = right, 4 = U-turn, 8 = left
 * Absolute heading codes extend the alphabet with 16 = N, 17 = E, 18 = S,
 * 19 = W (used by Wikipedia turmites like the Perfectionist).
 *
 * App-wide chirality convention (pinned, see README): color 0 -> turn RIGHT
 * for the classic ant, i.e. `RL` == `{{{1,2,0},{0,8,0}}}`. Mirror images are
 * semantically distinct runs, so imported strings are NOT silently rewritten;
 * chiral mirror detection is delegated to the mirrorRule() helper and the UI.
 *
 * Additive turn codes (10 = left+right -> the ant splits) are rejected by the
 * importer: split-and-extinct dynamics break reversibility and are deferred
 * to the colony/undo milestone.
 */

export const TURN_HALT = 0;
export const TURN_FORWARD = 1;
export const TURN_RIGHT = 2;
export const TURN_UTURN = 4;
export const TURN_LEFT = 8;
export const TURN_ABS_N = 16; // 16..19 = set heading to N/E/S/W respectively
export const TURN_ABS_E = 17;
export const TURN_ABS_S = 18;
export const TURN_ABS_W = 19;

export const MAX_COLORS = 32;
export const MAX_STATES = 16;

export interface Rule {
  readonly colors: number;
  readonly states: number;
  readonly write: Uint8Array; // color index written per (state, color)
  readonly turn: Uint8Array; // turn code per (state, color)
  readonly next: Int8Array; // next state; -1 when the entry halts
}

const RELATIVE_DELTA: Record<number, number> = {
  [TURN_FORWARD]: 0,
  [TURN_RIGHT]: 1,
  [TURN_UTURN]: 2,
  [TURN_LEFT]: 3,
};

/** Relative quarters-of-turn for a code (0 for halt/forward; undefined for others). */
export function turnDelta(code: number): number {
  return code <= TURN_UTURN ? (RELATIVE_DELTA[code] ?? -1) : -1;
}

export function isAbsoluteTurn(code: number): boolean {
  return code >= TURN_ABS_N && code <= TURN_ABS_W;
}

export function isHaltTurn(code: number): boolean {
  return code === TURN_HALT;
}

function buildTable(
  states: number,
  colors: number,
  entries: Array<{ write: number; turn: number; next: number }>,
): Rule {
  const write = new Uint8Array(states * colors);
  const turn = new Uint8Array(states * colors);
  const next = new Int8Array(states * colors);
  for (let state = 0; state < states; state++) {
    for (let color = 0; color < colors; color++) {
      const e = entries[state * colors + color];
      const idx = state * colors + color;
      write[idx] = e.write;
      turn[idx] = e.turn;
      // Normalize halts: any entry whose turn code is 0 halts regardless of
      // the advertised next state, so `next` is set to -1.
      next[idx] = isHaltTurn(e.turn) ? -1 : e.next;
    }
  }
  return { colors, states, write, turn, next };
}

/** Parse a Turk/Propp ant string: one turn letter per color, e.g. `RL`, `LLRR`, `LLLR`. */
export function parseAntString(s: string): Rule {
  const trimmed = s.trim().toUpperCase();
  if (trimmed.length === 0) throw new Error("empty rule string");
  if (!/^[LRNU]+$/.test(trimmed)) {
    throw new Error(
      `ant strings accept only the letters L, R, N (no turn) and U (U-turn); got "${s}"`,
    );
  }
  const colors = trimmed.length;
  if (colors > MAX_COLORS) throw new Error(`ant strings support up to ${MAX_COLORS} colors`);
  const entries: Array<{ write: number; turn: number; next: number }> = [];
  for (let c = 0; c < colors; c++) {
    const letter = trimmed[c];
    entries.push({
      write: (c + 1) % colors,
      turn: letter === "L" ? TURN_LEFT : letter === "R" ? TURN_RIGHT : letter === "U" ? TURN_UTURN : TURN_FORWARD,
      next: 0,
    });
  }
  return buildTable(1, colors, entries);
}

const ABS_LETTERS: Record<string, number> = { N: TURN_ABS_N, E: TURN_ABS_E, S: TURN_ABS_S, W: TURN_ABS_W };

/**
 * Parse a GollyGang triple table, the L/R/U/N rule names of the literature,
 * e.g. `{{{1,2,0},{0,8,0}}}`. Turn entries may be velocity digits (0/1/2/4/8)
 * or absolute letters (N/E/S/W, optional quotes). The outer groups define the
 * states; the inner groups define the color count.
 */
export function parseTriples(src: string): Rule {
  const s = src.replace(/[`'"]/g, "").replace(/\s+/g, "");
  if (!s.startsWith("{{{") || !s.endsWith("}}}")) {
    throw new Error(`expected a {{{...}}} triple table, got "${src}"`);
  }
  // Recursive structure relative to the whole string: depth 1 = outer table,
  // 2 = state groups, 3 = individual {write,turn,next} triples.
  let depth = 0;
  let pos = 0;
  const groups: string[][] = [];
  let stateBuf: string[] = [];
  let tripleBuf = "";

  while (pos < s.length) {
    const ch = s[pos];
    pos++;
    if (ch === "{") {
      depth++;
      if (depth === 2) stateBuf = [];
      else if (depth === 3) tripleBuf = "";
      else if (depth > 3) throw new Error("triple tables are (state x color) scopes; excessive nesting");
      if (depth === 1 && pos > 3) throw new Error("unexpected \"{\" after the outer table");
    } else if (ch === "}") {
      if (depth === 3) stateBuf.push(tripleBuf);
      else if (depth === 2) groups.push(stateBuf);
      else if (depth === 1) {
        // Close of the outer table: only residue must follow.
        const rest = s.slice(pos);
        if (rest.length > 0 && !/^[,}]*$/.test(rest)) {
          throw new Error(`unexpected trailing characters "${rest}"`);
        }
        depth = 0;
        pos = s.length;
        continue;
      } else throw new Error("unbalanced braces in triple table");
      depth--;
    } else if (depth === 3) {
      tripleBuf += ch;
    } else if (depth !== 1 && depth !== 2 && ch !== ",") {
      throw new Error(`unexpected character "${ch}"`);
    }
  }
  if (depth !== 0) throw new Error("unbalanced braces in triple table");

  if (groups.length === 0) throw new Error("empty triple table");
  if (groups.length > MAX_STATES) throw new Error(`triple tables support up to ${MAX_STATES} states`);
  const colors = groups[0].length;
  if (colors < 2) throw new Error("needs at least 2 colors");
  if (colors > MAX_COLORS) throw new Error(`triple tables support up to ${MAX_COLORS} colors`);
  for (const [i, g] of groups.entries()) {
    if (g.length !== colors) {
      throw new Error(`state ${i} has ${g.length} color entries; expected ${colors} on every state`);
    }
  }
  const entries: Array<{ write: number; turn: number; next: number }> = [];
  for (const g of groups) {
    for (const triple of g) {
      entries.push(parseTriple(triple, colors, groups.length));
    }
  }
  return buildTable(groups.length, colors, entries);
}

function parseTriple(s: string, colors: number, states: number): { write: number; turn: number; next: number } {
  const parts = s.split(",").map((p) => p.trim());
  if (parts.length !== 3) throw new Error(`expected 3 entries (write, turn, next); got "${s}"`);
  const [rawW, rawT, rawN] = parts;
  const write = Number(rawW);
  if (!Number.isInteger(write) || write < 0 || write >= colors) {
    throw new Error(`write color must be an integer in [0, ${colors - 1}]; got "${rawW}"`);
  }
  let turn: number;
  const absLetter = ABS_LETTERS[rawT.toUpperCase()];
  if (absLetter !== undefined) {
    turn = absLetter;
  } else {
    turn = Number(rawT);
    if (!Number.isInteger(turn)) throw new Error(`turn must be 0/1/2/4/8 or a letter N/E/S/W; got "${rawT}"`);
    checkRelativeTurn(turn);
  }
  const next = Number(rawN);
  if (!Number.isInteger(next) || next < -1 || next >= states) {
    throw new Error(`next state must be an integer in [-1, ${states - 1}]; got "${rawN}"`);
  }
  return { write, turn, next };
}

function checkRelativeTurn(t: number): void {
  if (t !== 0 && t !== 1 && t !== 2 && t !== 4 && t !== 8) {
    throw new Error(
      `single turn codes are 0 (halt), 1 (forward), 2 (right), 4 (U-turn) or 8 (left); ` +
        `additive codes like 10 (the ant splits) are not supported yet; got ${t}`,
    );
  }
}

/**
 * Parse a Wikipedia-Commons decimal rule ID: (write, turn, next) triples
 * concatenated state-major. Verified decode: 2 colors, 2 states = 12 digits,
 * e.g. `111180121010` == `{{{1,1,1},{1,8,0}},{{1,2,1},{0,1,0}}}` (spiral).
 */
export function parseDecimal(s: string): Rule {
  const t = s.trim();
  if (!/^\d+$/.test(t)) throw new Error(`decimal rule IDs are digits only; got "${s}"`);
  if (t.length % 3 !== 0) throw new Error(`decimal ID length must be a multiple of 3; got ${t.length}`);
  const entries: Array<{ write: number; turn: number; next: number }> = [];
  for (let i = 0; i + 2 < t.length; i += 3) {
    entries.push({
      write: Number(t[i]),
      turn: Number(t[i + 1]),
      next: Number(t[i + 2]),
    });
  }
  if (entries.length === 0) throw new Error("empty decimal ID");
  const colors = 2; // Wikipedia-Commons convention (documented for 2s2c IDs)
  const states = entries.length / colors;
  if (!Number.isInteger(states) || states === 0) {
    throw new Error(`decimal IDs are 2-color; digit count / 6 must be the state count`);
  }
  if (states > MAX_STATES) throw new Error(`decimal IDs support up to ${MAX_STATES} states`);
  for (const e of entries) {
    if (e.write >= colors) throw new Error(`write digit must be 0 or 1 for the 2-color convention`);
    checkRelativeTurn(e.turn);
    if (e.next >= states) throw new Error(`next-state digit out of range for a ${states}-state machine`);
  }
  return buildTable(states, colors, entries);
}

/** Render a rule as a GollyGang triple table string (the canonical interchange format). */
export function ruleToTriples(rule: Rule): string {
  const ABS_NAME = new Map([
    [TURN_ABS_N, "N"],
    [TURN_ABS_E, "E"],
    [TURN_ABS_S, "S"],
    [TURN_ABS_W, "W"],
  ]);
  const rows: string[] = [];
  for (let state = 0; state < rule.states; state++) {
    const cells: string[] = [];
    for (let color = 0; color < rule.colors; color++) {
      const idx = state * rule.colors + color;
      const t = rule.turn[idx];
      const turnTxt = ABS_NAME.get(t) ?? String(t);
      cells.push(`{${rule.write[idx]},${turnTxt},${rule.next[idx]}}`);
    }
    rows.push(`{${cells.join(",")}}`);
  }
  return `{${rows.join(",")}}`;
}

/** Render a rule as an ant string, when it is exactly a generalized ant. */
export function ruleToAntString(rule: Rule): string {
  if (rule.states !== 1) throw new Error("not an ant: more than one state");
  const CODE_LETTER = new Map<number, string>([
    [TURN_LEFT, "L"],
    [TURN_RIGHT, "R"],
    [TURN_FORWARD, "N"],
    [TURN_UTURN, "U"],
  ]);
  let out = "";
  for (let c = 0; c < rule.colors; c++) {
    const t = rule.turn[c];
    if (isAbsoluteTurn(t) || isHaltTurn(t)) throw new Error("not an ant string: absolute or halting turn");
    const write = rule.write[c];
    if (write !== (c + 1) % rule.colors) throw new Error("not a generalized ant string: custom write colors");
    if (rule.next[c] !== 0) throw new Error("not an ant string: unexpected next state");
    const letter = CODE_LETTER.get(t);
    if (letter === undefined) throw new Error("not an ant string");
    out += letter;
  }
  return out;
}

/** Render a rule as a decimal ID (2-color relative tables in the Wikipedia-Commons scheme). */
export function ruleToDecimal(rule: Rule): string {
  if (rule.colors !== 2) throw new Error("decimal IDs are defined for 2-color rules");
  let out = "";
  for (let state = 0; state < rule.states; state++) {
    for (let color = 0; color < rule.colors; color++) {
      const idx = state * rule.colors + color;
      if (isAbsoluteTurn(rule.turn[idx])) throw new Error("decimal IDs cannot encode absolute headings");
      out += `${rule.write[idx]}${rule.turn[idx]}${rule.next[idx] === -1 ? 0 : rule.next[idx]}`;
    }
  }
  return out;
}

/**
 * Chiral mirror of a rule: relative L<->R swap and absolute E<->W swap.
 * mirror(mirror(r)) === r; colors, writes and state graph are untouched, so
 * mirrored runs have identical step-for-step statistics but mirrored space.
 */
export function mirrorRule(rule: Rule): Rule {
  const t = new Uint8Array(rule.turn);
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === TURN_LEFT) t[i] = TURN_RIGHT;
    else if (v === TURN_RIGHT) t[i] = TURN_LEFT;
    else if (v === TURN_ABS_E) t[i] = TURN_ABS_W;
    else if (v === TURN_ABS_W) t[i] = TURN_ABS_E;
  }
  return { colors: rule.colors, states: rule.states, write: rule.write, turn: t, next: rule.next };
}

/** Shortest canonical string for URLs / storage: ant string, else decimal, else triples. */
export function ruleToString(rule: Rule): string {
  if (rule.states === 1) {
    try {
      return ruleToAntString(rule);
    } catch {
      // fall through to other encodings
    }
  }
  try {
    return ruleToDecimal(rule);
  } catch {
    return ruleToTriples(rule);
  }
}
