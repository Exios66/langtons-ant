import { describe, expect, it } from "vitest";
import {
  isAbsoluteTurn,
  isHaltTurn,
  mirrorRule,
  parseAntString,
  parseDecimal,
  parseTriples,
  ruleToAntString,
  ruleToDecimal,
  ruleToString,
  ruleToTriples,
  TURN_ABS_E,
  TURN_ABS_N,
  TURN_ABS_S,
  TURN_ABS_W,
  TURN_HALT,
  TURN_LEFT,
  TURN_RIGHT,
} from "../src/engine/rule";

describe("parseAntString", () => {
  it("parses the classic ant under the GollyGang chirality (color 0 -> right)", () => {
    const r = parseAntString("RL");
    expect(r.states).toBe(1);
    expect(r.colors).toBe(2);
    expect([...r.write]).toEqual([1, 0]);
    expect([...r.turn]).toEqual([TURN_RIGHT, TURN_LEFT]);
    expect([...r.next]).toEqual([0, 0]);
  });

  it("parses multi-color ants", () => {
    const r = parseAntString("LLRR");
    expect(r.colors).toBe(4);
    expect([...r.turn]).toEqual([TURN_LEFT, TURN_LEFT, TURN_RIGHT, TURN_RIGHT]);
    expect([...r.write]).toEqual([1, 2, 3, 0]);
  });

  it("rejects non-ant letters and empty input", () => {
    expect(() => parseAntString("AB")).toThrow();
    expect(() => parseAntString("RLX")).toThrow();
    expect(() => parseAntString("")).toThrow();
  });
});

describe("parseTriples", () => {
  it("round-trips the classic ant to the GollyGang table", () => {
    const triple = parseTriples("{{{1,2,0},{0,8,0}}}");
    const ant = parseAntString("RL");
    expect([...triple.write]).toEqual([...ant.write]);
    expect([...triple.turn]).toEqual([...ant.turn]);
    expect([...triple.next]).toEqual([...ant.next]);
  });

  it("extracts states/colors/entries in order", () => {
    const r = parseTriples("{{{1,2,1},{0,8,1}},{{1,8,1},{0,1,0}}}");
    expect(r.states).toBe(2);
    expect(r.colors).toBe(2);
    expect([...r.write]).toEqual([1, 0, 1, 0]);
    expect([...r.turn]).toEqual([2, 8, 8, 1]);
    expect([...r.next]).toEqual([1, 1, 1, 0]);
  });

  it("normalizes halt entries (turn 0) to next = -1", () => {
    const r = parseTriples("{{{1,0,0},{0,2,0}}}");
    expect(r.turn[0]).toBe(TURN_HALT);
    expect(r.next[0]).toBe(-1);
    expect(r.next[1]).toBe(0);
  });

  it("accepts absolute heading letters, quoted or bare", () => {
    const bare = parseTriples("{{{0,S,1},{1,W,1}},{{1,E,2},{1,S,2}},{{1,W,0},{0,N,0}}}");
    const quoted = parseTriples("{{{0,'S',1},{1,'W',1}},{{1,'E',2},{1,'S',2}},{{1,'W',0},{0,'N',0}}}");
    expect(bare.states).toBe(3);
    expect([...bare.turn]).toEqual([TURN_ABS_S, TURN_ABS_W, TURN_ABS_E, TURN_ABS_S, TURN_ABS_W, TURN_ABS_N]);
    expect([...quoted.turn]).toEqual([...bare.turn]);
  });

  it("rejects additive (ant-splitting) turn codes", () => {
    expect(() => parseTriples("{{{1,10,0},{0,8,0}}}")).toThrow(/additive/);
  });

  it("rejects out-of-range writes, nexts and malformed shapes", () => {
    expect(() => parseTriples("{{{9,2,0},{0,8,0}}}")).toThrow();
    expect(() => parseTriples("{{{1,2,7},{0,8,0}}}")).toThrow();
    expect(() => parseTriples("{{{1,2,0},{0,8}}}")).toThrow();
    expect(() => parseTriples("")).toThrow();
  });
});

describe("parseDecimal", () => {
  it("decodes the Wikipedia-Commons spiral ID exactly", () => {
    const r = parseDecimal("111180121010");
    expect(r.states).toBe(2);
    expect(r.colors).toBe(2);
    expect(ruleToTriples(r)).toBe("{{{1,1,1},{1,8,0}},{{1,2,1},{0,1,0}}}");
  });

  it("rejects malformed decimal IDs", () => {
    expect(() => parseDecimal("12")).toThrow();
    expect(() => parseDecimal("1111801210113")).toThrow(); // not a multiple of 3
    expect(() => parseDecimal("abc")).toThrow();
    expect(() => parseDecimal("921021110111")).toThrow(/write/);
  });
});

describe("encodings", () => {
  it("ant string round-trips", () => {
    expect(ruleToAntString(parseAntString("LLRR"))).toBe("LLRR");
    expect(ruleToString(parseAntString("LLRR"))).toBe("LLRR");
  });

  it("decimal round-trips", () => {
    expect(ruleToDecimal(parseDecimal("181181121010"))).toBe("181181121010");
    expect(ruleToString(parseDecimal("181181121010"))).toBe("181181121010");
  });

  it("falls back to triples for absolute rules", () => {
    const r = parseTriples("{{{0,S,1},{1,W,1}},{{1,E,2},{1,S,2}},{{1,W,0},{0,N,0}}}");
    expect(ruleToString(r)).toContain("S");
  });

  it("prefers multi-color ant strings over other encodings", () => {
    expect(ruleToString(parseAntString("LRNU"))).toBe("LRNU");
  });
});

describe("mirrorRule", () => {
  it("swaps L<->R (relative) and E<->W (absolute)", () => {
    const mirrored = mirrorRule(parseAntString("RL"));
    expect([...mirrored.turn]).toEqual([TURN_LEFT, TURN_RIGHT]);
    expect([...mirrored.write]).toEqual([1, 0]);

    const abs = parseTriples("{{{0,S,1},{1,W,1}},{{1,E,2},{1,S,2}},{{1,W,0},{0,N,0}}}");
    const absT = mirrorRule(abs).turn;
    expect(absT[1]).toBe(TURN_ABS_E); // W -> E
    expect(absT[2]).toBe(TURN_ABS_W); // E -> W
  });

  it("is an involution", () => {
    for (const s of ["RL", "LLRR", "LRRL", "LLLR"]) {
      const twice = mirrorRule(mirrorRule(parseAntString(s)));
      expect([...twice.turn]).toEqual([...parseAntString(s).turn]);
    }
  });
});
