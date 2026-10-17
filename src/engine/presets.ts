import { parseAntString, parseDecimal, parseTriples, type Rule } from "./rule";

/**
 * The curated preset gallery. Every entry is a verified rule with sources and
 * known milestones from the research dossier (reports/Langton ant portfolio
 * simulator.md §1). Additive split-and-extinct rules and hexagonal rules are
 * deliberately absent until their engine support ships.
 *
 * The flagship is the classic "RL" ant under the app-wide GollyGang chirality
 * convention: color 0 -> turn RIGHT. Its documented milestone (chaos ->
 * 104-step periodic highway) is 9,977 steps in the Rule Table Repository's
 * count; the app self-measures rather than hard-coding the number.
 */

export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly rule: Rule;
  readonly notation: string; // display string for the rule panel
  readonly space: string; // e.g. "1 state × 8 colors, relative"
  readonly blurb: string; // 1-3 sentences, user-facing
  readonly milestone?: string; // known behavioral milestone, if any
  readonly source: string; // URL
  readonly flagship?: boolean;
}

export const PRESETS: Preset[] = [
  {
    id: "classic",
    name: "Classic Langton's Ant",
    rule: parseAntString("RL"),
    notation: "RL",
    space: "1 state × 2 colors, relative",
    blurb:
      "The original: 150 steps of perfect symmetry, ~10,000 steps of pseudo-random chaos, then a sudden 104-step periodic diagonal 'highway' it builds forever. Whether this always happens is an open conjecture.",
    milestone: "highway onset ≈ 9,977 steps (self-measured on screen)",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
    flagship: true,
  },
  {
    id: "rlr",
    name: "RLR — The Mystery",
    rule: parseAntString("RLR"),
    notation: "RLR",
    space: "1 state × 3 colors, relative",
    blurb:
      "Chaotic growth with no known highway. The three-color sibling of the classic ant and the natural first experiment for anyone hunting a counterexample.",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
  },
  {
    id: "llrr",
    name: "LLRR (ant 12)",
    rule: parseAntString("LLRR"),
    notation: "LLRR",
    space: "1 state × 4 colors, relative",
    blurb:
      "Ever-growing bilateral symmetry — the ant keeps returning to weave the same recursive, Truchet-tile pattern wider and wider.",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
  },
  {
    id: "lrrl",
    name: "LRRL (ant 9)",
    rule: parseAntString("LRRL"),
    notation: "LRRL",
    space: "1 state × 4 colors, relative",
    blurb:
      "The chiral mirror twin of LLRR: identical statistics, mirrored tapestry. Same rule space, opposite handedness.",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
  },
  {
    id: "lrrrrrllr",
    name: "LRRRRRLLR",
    rule: parseAntString("LRRRRRLLR"),
    notation: "LRRRRRLLR",
    space: "1 state × 8 colors, relative",
    blurb:
      "Fills a solid square around itself and keeps spiraling through it — one of the classic four-color-string 'shrub' species.",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
  },
  {
    id: "rrlllrlllrrr",
    name: "RRLLLRLLLRRR",
    rule: parseAntString("RRLLLRLLLRRR"),
    notation: "RRLLLRLLLRRR",
    space: "1 state × 12 colors, relative",
    blurb:
      "Builds a filled right triangle that grows and marches across the grid.",
    milestone: "triangle locomotion established by ~15,900 steps",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
  },
  {
    id: "llrrrlrlrllr",
    name: "LLRRRLRLRLLR",
    rule: parseAntString("LLRRRLRLRLLR"),
    notation: "LLRRRLRLRLLR",
    space: "1 state × 12 colors, relative",
    blurb: "A convoluted diagonal highway — organized growth with a labyrinthine texture.",
    source: "https://en.wikipedia.org/wiki/Langton%27s_ant",
  },
  {
    id: "lllr",
    name: "LLLR — Harmonic Highways",
    rule: parseAntString("LLLR"),
    notation: "LLLR",
    space: "1 state × 4 colors, relative",
    blurb:
      "Proven (2024–25) to build at least one 'harmonic' highway — and two distinct highways are known from random starts. Part of the family that turned the Highway Conjecture from folklore into proven mathematics.",
    source: "https://arxiv.org/abs/2409.10124",
  },
  {
    id: "llrlrl",
    name: "LLRLRL — Infinitely Many",
    rule: parseAntString("LLRLRL"),
    notation: "LLRLRL",
    space: "1 state × 6 colors, relative",
    blurb:
      "Proven to have infinitely many highways with periods 220 + 24n — yet for some starting orientations none appears even by 10^10 steps. Patience engine.",
    source: "https://arxiv.org/abs/2506.10482",
  },
  {
    id: "llrrrl",
    name: "LLRRRL — The Counterexample",
    rule: parseAntString("LLRRRL"),
    notation: "LLRRRL",
    space: "1 state × 6 colors, relative",
    blurb:
      "Reaches increasing rectangles and other non-highway asymptotic behavior: the generalized Highway Conjecture provably fails here (Lutfalla 2025).",
    source: "https://arxiv.org/abs/2505.05426",
  },
  {
    id: "jeronimus",
    name: "Jeronimus — Longest Chaos",
    rule: parseTriples("{{{1,2,1},{0,8,1}},{{1,8,1},{0,1,0}}}"),
    notation: "{{{1,2,1},{0,8,1}},{{1,8,1},{0,1,0}}}",
    space: "2 states × 2 colors, relative",
    blurb:
      "The patience champion: about 8.36 × 10^9 steps of apparent chaos before a highway emerges. At a million steps per second that is hours of watching order be invisible.",
    milestone: "highway after ≈ 8.36 × 10^9 steps",
    source: "https://github.com/GollyGang/ruletablerepository/wiki/TwoDimensionalTuringMachines",
  },
  {
    id: "brady-s",
    name: "Brady Busy Beaver (S = 121)",
    rule: parseTriples("{{{1,2,1},{1,1,0}},{{1,4,0},{1,0,0}}}"),
    notation: "{{{1,2,1},{1,1,0}},{{1,4,0},{1,0,0}}}",
    space: "2 states × 2 colors, relative",
    blurb: "Halts after 121 steps — the most patient halting 2-state 2-color turmite known.",
    milestone: "halts at step 121",
    source: "https://github.com/gollygang/terminatingturmites",
  },
  {
    id: "brady-sigma",
    name: "Brady Sigma Champion (37 cells)",
    rule: parseTriples("{{{1,8,0},{0,8,1}},{{1,0,0},{1,2,0}}}"),
    notation: "{{{1,8,0},{0,8,1}},{{1,0,0},{1,2,0}}}",
    space: "2 states × 2 colors, relative",
    blurb: "Halts after painting the most black cells (37) any known 2-state 2-color machine manages.",
    milestone: "halts after 37 painted cells",
    source: "https://github.com/gollygang/terminatingturmites",
  },
  {
    id: "fay",
    name: "Fay Champion",
    rule: parseTriples("{{{1,2,1},{2,4,1},{2,0,0}},{{1,2,0},{1,1,1},{1,4,1}}}"),
    notation: "{{{1,2,1},{2,4,1},{2,0,0}},{{1,2,0},{1,1,1},{1,4,1}}}",
    space: "2 states × 3 colors, relative",
    blurb:
      "The record halting machine for 2-state 3-color: 59,348,218 steps and 888,629 painted cells before it stops.",
    milestone: "halts after 59,348,218 steps",
    source: "https://github.com/gollygang/terminatingturmites",
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    rule: parseTriples("{{{0,'S',1},{1,'W',1}},{{1,'E',2},{1,'S',2}},{{1,'W',0},{0,'N',0}}}"),
    notation: "{{{0,S,1},{1,W,1}},{{1,E,2},{1,S,2}},{{1,W,0},{0,N,0}}}",
    space: "3 states × 2 colors, absolute",
    blurb:
      "An absolute-heading turmite that ripples chaotically for 15.5 million steps, then snaps into a clean periodic highway.",
    milestone: "highway after ≈ 15.5 × 10^6 steps",
    source: "https://github.com/GollyGang/ruletablerepository/wiki/TwoDimensionalTuringMachines",
  },
  {
    id: "base-phi",
    name: "Base-φ Counter",
    rule: parseTriples("{{{0,'N',2},{1,'S',1}},{{0,'E',0},{0,'S',0}},{{1,'W',1},{1,'N',2}}}"),
    notation: "{{{0,N,2},{1,S,1}},{{0,E,0},{0,S,0}},{{1,W,1},{1,N,2}}}",
    space: "3 states × 2 colors, absolute",
    blurb: "Grows logarithmically while counting in irrational base φ — a clock made of an ant.",
    source: "https://github.com/GollyGang/ruletablerepository/wiki/TwoDimensionalTuringMachines",
  },
  {
    id: "nks-e",
    name: "NKS p.185(e) — Not Random",
    rule: parseTriples("{{{1,'N',1},{0,'S',1}},{{1,'S',3},{0,'N',2}},{{1,'W',0},{1,'N',1}},{{1,'S',2},{0,'E',1}}}"),
    notation: "{{{1,N,1},{0,S,1}},{{1,S,3},{0,N,2}},{{1,W,0},{1,N,1}},{{1,S,2},{0,E,1}}}",
    space: "4 states × 2 colors, absolute",
    blurb:
      "Wolfram's NKS called its output 'completely random' — machinery later proved it perfectly periodic, period 2,074,575. A lesson in what 'random-looking' means.",
    milestone: "proved periodic with period 2,074,575",
    source: "https://www.wolframscience.com/nksonline/section-5.3",
  },
  {
    id: "commons-spiral",
    name: "Commons Spiral (111180121010)",
    rule: parseDecimal("111180121010"),
    notation: "111180121010",
    space: "2 states × 2 colors, relative",
    blurb: "Grows an intricate spiral texture — from the Wikipedia Wikimedia-Commons turmite gallery.",
    source: "https://en.wikipedia.org/wiki/Turmite",
  },
  {
    id: "commons-highway",
    name: "Commons Chaos→Highway (121021110111)",
    rule: parseDecimal("121021110111"),
    notation: "121021110111",
    space: "2 states × 2 colors, relative",
    blurb: "Texture first, highway later — another Wikipedia Commons gallery specimen.",
    source: "https://en.wikipedia.org/wiki/Turmite",
  },
  {
    id: "commons-fib",
    name: "Commons Fibonacci Spiral (181181121010)",
    rule: parseDecimal("181181121010"),
    notation: "181181121010",
    space: "2 states × 2 colors, relative",
    blurb: "Wikipedia's 'Fibonacci spiral' turmite — order that reads like geometry.",
    source: "https://en.wikipedia.org/wiki/Turmite",
  },
];
