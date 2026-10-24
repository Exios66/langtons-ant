# Langton's Ant — an interactive 2D Turing-machine simulator

<div align="center">

**langtons-ant** — an interactive 2D Turing-machine simulator. Deterministic, seeded, permalink-sharable.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/Live%20demo-exios66.github.io%2Flangtons--ant-0f6b3c)](https://exios66.github.io/langtons-ant/)
[![Tests](https://img.shields.io/badge/tests-99%20passing-brightgreen)](tests/)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933)](package.json)

</div>

<div align="center">
  <img src="public/demo.gif" alt="Langton's ant running from the live demo: an 8k-step golden chaos cloud collapses into a clean diagonal highway; the HUD shows the detector badge light up (HIGHWAY 9,900) and the run auto-pauses" width="880" />
  <p><sub><b>The money shot, recorded from the live demo</b> — one ant, four trivial rules: thousands of steps of seeded chaos, then the abrupt collapse into the 104-step periodic highway.
  <a href="https://exios66.github.io/langtons-ant/#r=RL&amp;a=AAAAAAEA&amp;s=4mp&amp;p=starry">Replay it yourself</a> — same seed, same reveal. Starry Night palette.</sub></p>
</div>

## What is this?

In 1986 Christopher Langton asked what a single "ant" following four trivial rules could build. The classic ant paints ~10,000 steps of pseudo-random noise, then abruptly locks into a clean 104-step periodic highway it extends forever — and whether this *always* happens is still an open conjecture. Generalized ants ("turmites") turn out to be programmable matter: Langton's ant is provably universal (2002) [2], and all nontrivial 2D Turing machines of this kind are Turing-universal [3]. Between 2024 and 2025 whole families of multi-color ants finally had their highways proven [6][7][8] — turning the Highway Conjecture from folklore into real mathematics [14].

This app runs those machines live in your browser: any ant on an unbounded grid, seeded and deterministic, painted at millions of steps per second, with every run addressable by a URL fragment.

## Live demo

**[https://exios66.github.io/langtons-ant/](https://exios66.github.io/langtons-ant/)**

## Table of contents

- [What is this?](#what-is-this)
- [Live demo](#live-demo)
- [Run locally](#run-locally)
- [Features](#features)
- [Architecture](#architecture)
- [Rule formats](#rule-formats)
- [Preset gallery](#preset-gallery)
- [Benchmarks](#benchmarks)
- [Development](#development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [References](#references)
- [License](#license)

## Run locally

Requires Node.js ≥ 20 (Node 22 recommended, no runtime npm dependencies — only dev tooling).

```sh
npm ci          # install dev dependencies from the lockfile
npm run dev     # Vite dev server
npm run build   # type-check (tsc --noEmit) + production build to dist/
npm test        # vitest, the full suite
```

The throughput benchmark is gated so plain test runs stay fast:

```sh
RUN_BENCH=1 npx vitest run tests/bench.test.ts
```

## Features

| Area | What it gives you |
| --- | --- |
| Engine | Any N-color × M-state rule (up to 32 colors × 16 states), in three notations (ant string, triple table, decimal ID); allocation-free step hot loop |
| Renderer | Chunked typed-array unbounded grid; changed cells are painted incrementally into an offscreen 1 px/cell texture, which is redrawn onto the visible canvas each frame it changes |
| Determinism | Seeded, fully reproducible runs. A permalink (`#r=…&i=…&s=…&z=…&c=…&x=…`) reproduces the run it was copied from: small grids ride along in the link, larger runs are rebuilt by re-simulating from the starting ants (up to 50M steps, with progress); a run edited mid-run that is too big to embed says so instead |
| Presets | A curated gallery of verified landmark machines (below), each with notation, milestone and source |
| Colony mode | Run many ants at once — every ant acts each step in array order |
| Detection | Live highway detector for a single ant: a step-based drift heuristic (not a proof of periodicity) that flags the classic ant's highway a few thousand steps after it starts, reports an estimated onset step in a badge, and can auto-pause. It does not depend on frame rate |
| Documentation | In-app rule-space primer (press `d`); full bibliography in `citations.bib` |
| Theming | Dark/light theme toggle (`t`) |
| Export / telemetry | PNG / WebM clip export, full-session JSON import/export (the file carries the grid or the starting ants, so import reproduces the run), run telemetry |

## Architecture

```mermaid
flowchart LR
    subgraph app ["src/app"]
        LOOP["requestAnimationFrame loop"]
        UI["UI panels, input, preset gallery"]
        URLS["URL state / permalinks"]
    end
    subgraph render ["src/render"]
        PAL["palette"]
        REN["dirty-rect Canvas2D renderer"]
    end
    subgraph engine ["src/engine (frozen)"]
        RULE["rule — parsers, encodings"]
        GRID["grid — chunked World"]
        SIM["simulation"]
        SER["serialize / hash / prng"]
        PRE["presets"]
    end

    app --> render --> engine
    engine -. "runs identically in<br/>browser and Node (vitest)" .-> NODE["Node / browser-agnostic"]
```

Three deliberate choices and why:

- **Everything on the main thread.** A `SharedArrayBuffer` worker data path needs `COOP`/`COEP` response headers, and GitHub Pages cannot serve them. The single-threaded hot loop is fast enough (below) without them.
- **Chunked typed arrays instead of a sparse `Map`.** The grid grows in 64×64-cell chunks (`Uint8Array`, 4 KiB per chunk), giving the unbounded grid O(1) indexed access with tiny bookkeeping. A hash-map entry *per cell* costs more memory for the same state, by an amount that depends on the pattern. Measured with [`scripts/memory-compare.ts`](scripts/memory-compare.ts) (one run each, 20M steps, Node 22, `Map<number, number>` vs chunk bytes): RLR 32×, LLRR 34×, classic RL 6× (its highway is a thin diagonal, so each chunk it crosses is mostly empty). Earlier drafts said ~100×; that figure was an unvalidated estimate and is not supported by these runs.
- **Incremental texture, one blit per frame.** Many steps run per animation frame (up to 250,000), so the engine records every cell it writes and the renderer paints only those into an offscreen 1 px/cell texture — per cell for small batches, per touched 64×64 chunk for large ones — then calls `sim.resetChanged()`. The visible canvas is not redrawn incrementally: on any frame where content or the view changed, it is cleared and the whole texture is redrawn under the pan/zoom transform with one `drawImage`, plus the ant markers. Idle frames do nothing.

## Rule formats

The engine accepts three notations, all interconvertible where the rule allows (`ruleToString` picks the shortest canonical form):

| Notation | Grammar / domain | Examples |
| --- | --- | --- |
| Ant string | `L` `R` `N` `U` sequence for N-color ants | `RL` (classic), `LLRR`, `RRLLLRLLLRRR` |
| Triples | `{{write, turn, next-state}, …}` per (state, color); turns are the codes 0 (halt) / 1 / 2 / 4 / 8, or absolute headings as bare or quoted letters `N` `E` `S` `W` | `{{{1,2,0},{0,8,0}}}`, `{{{0,'S',1},{1,'W',1}}}` |
| Decimal ID | Wikipedia-Commons 2-color decimal encoding: (write, turn, next) digit triples, state-major | `111180121010` |

Multi-state machines and absolute-heading turmites (such as the Perfectionist) use the triple notation.

**Chirality convention** (matching the GollyGang Rule Table Repository [10]): **color 0 → turn RIGHT**, left/next-state indexing is state-major (`idx = state * colors + color`); `mirrorRule` provides the voluntary L↔R flip for the UI.

**Rejected:** additive split codes (later "extinct-phase"-style additive encodings) — the parser throws rather than misreading them.

## Preset gallery

All presets are verifiable landmark machines sourced from Wikipedia [12], the GollyGang Rule Table Repository [10], and the terminating-turmites repository [11]. Chirality convention: color 0 → turn RIGHT.

| Name | Notation | Space | Known milestone |
| --- | --- | --- | --- |
| Classic Langton's Ant ⭐ | `RL` | 1 state × 2 colors, relative | highway onset ≈ 9,977 steps (self-measured) |
| RLR — The Mystery | `RLR` | 1 state × 3 colors, relative | chaotic growth; no known highway |
| LLRR (ant 12) | `LLRR` | 1 state × 4 colors, relative | ever-growing bilateral symmetry |
| LRRL (ant 9) | `LRRL` | 1 state × 4 colors, relative | chiral mirror twin of LLRR |
| LRRRRRLLR | `LRRRRRLLR` | 1 state × 8 colors, relative | fills a solid square, spirals through it |
| RRLLLRLLLRRR | `RRLLLRLLLRRR` | 1 state × 12 colors, relative | marching filled triangle, ~15,900 steps |
| LLLR — Harmonic Highways | `LLLR` | 1 state × 4 colors, relative | proven harmonic highways (Lutfalla 2024–25) [6] |
| LLRLRL — Infinitely Many | `LLRLRL` | 1 state × 6 colors, relative | infinitely many highways, periods 220 + 24n [8] |
| LLRRRL — The Counterexample | `LLRRRL` | 1 state × 6 colors, relative | provably *no* extended highway [7] |
| Jeronimus — Longest Chaos | `{{{1,2,1},{0,8,1}},{{1,8,1},{0,1,0}}}` | 2 states × 2 colors, relative | highway after ≈ 8.36 × 10⁹ steps |
| Perfectionist | `{{{0,'S',1},{1,'W',1}},{{1,'E',2},{1,'S',2}},{{1,'W',0},{0,'N',0}}}` | 3 states × 2 colors, absolute | highway after ≈ 15.5 × 10⁶ steps |
| NKS p.185(e) — Not Random | `{{{1,'N',1},{0,'S',1}},{{1,'S',3},{0,'N',2}},{{1,'W',0},{1,'N',1}},{{1,'S',2},{0,'E',1}}}` | 4 states × 2 colors, absolute | proved periodic, period 2,074,575 [9] |
| Commons Chaos→Highway | `121021110111` | 2 states × 2 colors, relative | texture first, highway later |
| Base-φ Counter | `{{{0,'N',2},{1,'S',1}},{{0,'E',0},{0,'S',0}},{{1,'W',1},{1,'N',2}}}` | 3 states × 2 colors, absolute | logarithmic growth, counting in base φ |

<details>
<summary>Remaining presets (6 of the 20)</summary>

| Name | Notation | Space | Known milestone |
| --- | --- | --- | --- |
| LLRRRLRLRLLR | `LLRRRLRLRLLR` | 1 state × 12 colors, relative | convoluted diagonal highway |
| Brady Busy Beaver (S = 121) | `{{{1,8,0},{0,8,1}},{{1,0,0},{1,2,0}}}` | 2 states × 2 colors, relative | halts at step 121 |
| Brady Sigma Champion (37 cells) | `{{{1,2,1},{1,1,0}},{{1,4,0},{1,0,0}}}` | 2 states × 2 colors, relative | halts after 37 painted cells |
| Fay Champion | `{{{1,2,1},{2,4,1},{2,0,0}},{{1,2,0},{1,1,1},{1,4,1}}}` | 2 states × 3 colors, relative | halts after 59,348,218 steps / 888,629 cells |
| Commons Spiral | `111180121010` | 2 states × 2 colors, relative | intricate spiral texture |
| Commons Fibonacci Spiral | `181181121010` | 2 states × 2 colors, relative | order that reads like geometry |

</details>

Every preset loads with one click in the live demo and is addressable by a permalink (`#r=<rule>&a=…&s=…`).

## Benchmarks

Measured with the committed gated benchmark (`RUN_BENCH=1 npx vitest run tests/bench.test.ts`),
5 runs of 1,000,000 steps each after a 50,000-step warm-up, engine untouched (`src/engine/**` as shipped):

| Series | Mean ms / run | Throughput | Cell-updates/s |
| --- | --- | --- | --- |
| Classic `RL` ant, single | 50.9 | **19.65M steps/s** | 19.65M |
| Colony of 25 ants | 1,866.6 | 0.54M steps/s | **13.39M** |

Method: Node v22.14.0, macOS 26.3, Apple M2 (arm64), `console.log` timings — the benchmark asserts nothing numeric so throughput can never become a flaky CI gate. Per-run raw times are printed at INFO level above the mean line.

The throughput *determinism* is pinned separately: after exactly **11,000 classic-ant steps** from a blank grid, the visited region hashes to the committed constant **`6219b3fb`** (FNV-1a) — asserted in `tests/golden.test.ts`. The CI workflow (`.github/workflows/ci.yml`) can run the whole suite, golden hash included, on Linux (`ubuntu-latest`) with Node 20 and Node 22, but it is paused and only runs when started by hand; other operating systems are not covered, though the arithmetic is integer-only. The hashed region includes the 104-step periodic highway tail [1][12].

## Development

### Project layout

<details>
<summary>Repository layout</summary>

```text
.
├── index.html
├── src/
│   ├── app/                # rAF loop, UI, URL-state / permalinks
│   ├── render/             # palette, dirty-rect Canvas2D renderer
│   └── engine/             # frozen: rule, grid, simulation, serialize, hash, prng, presets
├── tests/                  # vitest: rule, grid, simulation, serialize, golden, highway, restore, presets, bench
├── .github/workflows/      # ci.yml: typecheck, tests and build on Node 20 and 22 (manual runs only)
├── scripts/                # deploy.mjs (branch-based Pages publish), memory-compare.ts (one-off measurement)
├── public/                 # static assets served at site root (social-card.png, .nojekyll)
├── vite.config.ts          # base: '/langtons-ant/', es2022 target, sourcemaps
└── vitest.config.ts        # node environment, tests/**/*.test.ts
```

</details>

### Scripts

<details>
<summary>npm scripts</summary>

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` / `npm run test:watch` | Vitest suite (the gated bench stays skipped unless `RUN_BENCH=1`) |
| `npm run deploy` | `npm run build`, then publish `dist/` to the `gh-pages` branch via a temporary worktree |

</details>

### Testing

- `tests/golden.test.ts` pins the 11,000-step FNV-1a digest (determinism, chunk addressing, rule table).
- `tests/bench.test.ts` (gated by `RUN_BENCH=1`) plus suites for the three rule parsers, the chunked grid, the simulation, and RLE/ant-packing round-trips.
- `tests/highway.test.ts`: the classic ant is detected near step 9,977, never before ~9,000, identically for every frame batch size.
- `tests/restore.test.ts`: permalink and session-JSON round trips at 100, 1,000 and 20,000 steps compare the grid cell by cell and the ant records; old links and files decode as documented.
- `tests/presets.test.ts`: the halting presets halt at their documented step with their documented cell count.
- The CI workflow (`.github/workflows/ci.yml`) runs `npx tsc --noEmit`, `npm test` and `npm run build`, but it is paused: it only runs when started by hand. Run those three commands locally before merging.

### Deployment

Branch-based GitHub Pages — **no Actions deployment required**:

1. Repository *Settings → Pages → Build and deployment → Source*: **Deploy from a branch**, branch `gh-pages`, folder `/ (root)` (one-time setup).
2. `npm run deploy` builds and publishes the current build to `gh-pages`, which serves https://exios66.github.io/langtons-ant/ until the next publish. Re-run it any time the source changes.
3. Optional: to make the repo citable, enable Zenodo on the repository and create a release (mints a concept + version DOI), then add the DOI to `CITATION.cff`.

## Roadmap

- **M2/M3:** animated GIF/WebM export of run regions; side-by-side rule comparison mode; Playwright visual regression tests; a stricter highway detector (the current one is a drift heuristic and can flag steady drift that is not exactly periodic).

## References

Cite this repository: see [`CITATION.cff`](./CITATION.cff) (GitHub renders APA + BibTeX via the "Cite this repository" button). Full bibliography of all 130 sources the project and its research rely on: [`citations.bib`](./citations.bib).

Numbered entries below are those the README's own claims depend on; each `[N]` in the text points here.

1. Langton, C. G. "Studying artificial life with cellular automata." *Physica D* 22(1–3) (1986): 120–149. https://deepblue.lib.umich.edu/bitstream/2027.42/26022/1/0000093.pdf
2. Gajardo, A., A. Moreira, E. Goles. "Complexity of Langton's ant." *Discrete Applied Mathematics* 117 (2002): 41–50. https://arxiv.org/abs/nlin/0306022
3. Gajardo, A., B. Hellouin de Menibus, D. Maldonado, A. Moreira. "Nontrivial Turmites Are Turing-Universal." arXiv:1702.05547 (2017). https://arxiv.org/abs/1702.05547
4. Bunimovich, L. A., S. E. Troubetzkoy. "Recurrence properties of Lorentz lattice gas cellular automata." *J. Stat. Phys.* 67 (1992): 289–302. https://doi.org/10.1007/BF01049035
5. Gale, D., J. Propp, S. Sutherland, S. Troubetzkoy. "Further Travels with My Ant." arXiv:math/9501233 (1995). https://arxiv.org/abs/math/9501233
6. Gajardo, A., V. Lutfalla, M. Rao. "Ants on the highway." *Natural Computing* (May 2025). https://arxiv.org/abs/2409.10124
7. Lutfalla, V. "Sideways on the highways." arXiv:2505.05426 (2025). https://arxiv.org/abs/2505.05426
8. Lutfalla, V. "The LLLR generalised Langton's ant." arXiv:2506.10482 (2025). https://arxiv.org/abs/2506.10482
9. Wolfram, S. *A New Kind of Science*, §5.3. Wolfram Media (2002). https://www.wolframscience.com/nksonline/section-5.3
10. GollyGang. "TwoDimensionalTuringMachines" (Rule Table Repository wiki). https://github.com/GollyGang/ruletablerepository/wiki/TwoDimensionalTuringMachines (accessed 2026-10-17)
11. GollyGang. terminatingturmites repository. https://github.com/gollygang/terminatingturmites (accessed 2026-10-17)
12. Wikipedia contributors. "Langton's ant." https://en.wikipedia.org/wiki/Langton%27s_ant (accessed 2026-10-17)
13. Wikipedia contributors. "Turmite." https://en.wikipedia.org/wiki/Turmite (accessed 2026-10-17)
14. MathOverflow community. "Intermediate results for Langton's ant highway conjecture." (2017). https://mathoverflow.net/questions/277040/intermediate-results-for-langtons-ant-highway-conjecture
15. Matpic. "An ant that builds a highway." https://www.matpic.com/essays/an-ant-that-builds-a-highway/ (accessed 2026-10-17)
16. Hackspeare, W. "A Bestiary of Turmites." https://williamhackspeare.github.io/turmite-bestiary (accessed 2026-10-17)

## License

[MIT](LICENSE) © 2026 Exios66

Citation: see [`CITATION.cff`](./CITATION.cff). Full bibliography of all 130 sources: [`citations.bib`](./citations.bib).
