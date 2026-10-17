# Ship Langton's README citation stack

The README of Exios66/langtons-ant should be tightened, not rewritten: keep the existing 13-section cognitive-funnel order and ~193-line footprint, but convert the flat 8-bullet References list into a grouped, numbered, annotated bibliography of 16 entries that are actually cited in the README, move the complete 139-source research bibliography into a root-level `citations.bib`, and add a `CITATION.cff` so GitHub's "Cite this repository" button emits APA and BibTeX. The README stays the single human-readable surface (no `docs/` site, no in-app help panel): anything that would have lived in `docs/references.md` is collapsed behind a `<details>` block and pointed at `citations.bib` instead. The result is a ~200-line README that a portfolio reviewer can skim in 60 seconds while still carrying a complete, machine-importable bibliography.

## Curate sixteen numbered refs in the README and one hundred thirty-nine in citations.bib

The research inventory holds **139 distinct sources** (12 academic papers, 3 student reports, 22 encyclopedia/reference works, 34 software/docs/tooling, 68 web/benchmark/community). No README can carry all of them without breaking the 150–300 line budget, so the split is: **16 numbered entries in the README** (the sources the README's own claims depend on, each with a 3–8 word "used for" annotation) and **all 139 in `citations.bib`** at repo root, linked from the References section. This matches the Golly/Ready and LTL-GollyScripting research-software idiom identified in the best-practices notes, and it keeps the README References section at ~16 lines instead of ~140.

The 16 entries, grouped and numbered, with their stable BibTeX keys from the inventory (standardize the one inconsistent key, `wolfram2002nks` → `wolfram_nks_5_3`, so every key matches the inventory table):

| # | BibTeX key | Citation (short) | Used for |
|---|---|---|---|
| 1 | `langton1986artificiallife` | Langton 1986, *Physica D* 22:120–149 | Origin; three-phase behavior |
| 2 | `gajardo2002complexity` | Gajardo, Moreira, Goles 2002, *Discrete Appl. Math.* 117:41–50 | Universality; P-hardness |
| 3 | `gajardo2017nontrivial` | Gajardo et al. 2017, arXiv:1702.05547 | All nontrivial turmites universal |
| 4 | `bunimovich1992recurrence` | Bunimovich & Troubetzkoy 1992, *J. Stat. Phys.* 67:289–302 | Unboundedness theorem |
| 5 | `gale1995furthertravels` | Gale, Propp, Sutherland, Troubetzkoy 1995, arXiv:math/9501233 | Generalized ants; base-2 numbering |
| 6 | `gajardo2024antshighway` | Gajardo, Lutfalla, Rao 2024/2025, *Natural Computing* | Proven highway families |
| 7 | `lutfalla2025sideways` | Lutfalla 2025a, arXiv:2505.05426 | Non-highway behaviors; conjecture fails |
| 8 | `lutfalla2025lllr` | Lutfalla 2025b, arXiv:2506.10482 | Formal highway definition |
| 9 | `wolfram_nks_5_3` | Wolfram, *A New Kind of Science* §5.3 (2002) | Absolute (NKS) machines |
| 10 | `gollygang_wiki` | GollyGang, TwoDimensionalTuringMachines wiki | Triple notation; chirality convention |
| 11 | `gollygang_terminatingturmites` | GollyGang, terminatingturmites repo | Preset source; busy-beaver records |
| 12 | `wikipedia_langtonsant` | Wikipedia contributors, "Langton's ant" (accessed 2026-10-17) | Canonical rule; phases; highway |
| 13 | `wikipedia_turmite` | Wikipedia contributors, "Turmite" (accessed 2026-10-17) | General model; decimal IDs |
| 14 | `mathoverflow_highway` | MathOverflow community, highway conjecture (2017) | Collatz Π⁰₂ analogy |
| 15 | `matpic_highway` | Matpic, "An ant that builds a highway" | 60-pattern study; onset range |
| 16 | `turmite_bestiary` | Hackspeare, "A Bestiary of Turmites" | 57 canonical L/R rules |

Every entry is already drafted in BibTeX in the inventory's §7; the edit is to copy that block into `citations.bib`, standardize the Wolfram key, and drop the four dead/unverified URLs flagged in inventory §6 (`maxrobinsonthegreat.github.io`, the Golly Turmites help page, the benchmarklab mirror, and `langtons-ant-amber.vercel.app`) or annotate them with a `note = {404 at research time — do not cite}`.

The exact text to paste into the README's References section (replacing the current 8 bullets) is:

```markdown
## References

Cite this repository: see [`CITATION.cff`](./CITATION.cff) (GitHub renders APA + BibTeX via the "Cite this repository" button). Full bibliography of all 139 sources the project and its research rely on: [`citations.bib`](./citations.bib).

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
```

Inline citations in the README should use the numbered form `… provably universal [2][3].` and `… highway onset ≈ 9,977 steps [12].`, matching the openstack style-guide rule (citation at the end of the sentence, before the period). Footnote-style `[^N]` is rejected here because GitHub renders footnotes at the bottom of the file, which splits the reader from the context; a bottom References section with `[N]` anchors is the Golly/Ready idiom and stays skimmable.

## Line-budget the README at roughly two hundred lines across thirteen sections

The existing README is 193 lines and already follows the cognitive funnel well; the change is a tighten-and-reorder, not a rewrite. Target **180–220 lines** (current 193 → budget 200). The section plan, with per-section line budgets drawn from the structure research and the current file:

| # | Section | Essential? | Budget (lines) | Change from current |
|---|---|---|---|---|
| 1 | Title + one-liner + badge row + live demo link + GIF | Essential | 18–24 | Add CI + tests badges (2nd line); add GIF CDN URL |
| 2 | "What is this?" (science hook) | Essential | 8–12 | Add inline `[2][3]` etc.; keep open-conjecture line |
| 3 | Features table | Essential | 8–10 | Unchanged; 6 rows |
| 4 | Quick start | Essential | 8–12 | Unchanged |
| 5 | Architecture (Mermaid + 3 choices) | Impressive | 18–24 | Unchanged; diagram already small |
| 6 | Rule formats | Domain-essential | 10–14 | Add `[10]` chirality pointer |
| 7 | Preset gallery | Domain-essential | 16–24 | Condense 22 → 12–14 rows; rest in `<details>` |
| 8 | Benchmarks | Essential (proof) | 10–14 | Add `[1][5]`-style pointers; keep golden hash |
| 9 | Development | Movable | 14–20 | Collapse script table into `<details>` |
| 10 | Deployment | Movable | 6–8 | Add optional Zenodo "make it citable" step |
| 11 | Roadmap | Optional | 3–5 | Keep one line |
| 12 | References | Essential-ish | 16–20 | Replace bullets with numbered list above |
| 13 | License | Essential | 2–3 | Add CITATION.cff pointer |
| — | Table of contents | — | 8–12 | **Add** (file >150 lines; Standard Readme requires it) |

The TOC is the one genuinely new section: GitHub auto-generates an Outline sidebar, but a manual TOC is required by the Standard Readme spec once a file exceeds 100 lines and saves scrolling past 150 lines. It links to all `##` headings.

If the file exceeds 220 lines, cut in this order: roadmap → deployment detail → development layout → References annotations → preset rows → architecture bullets. Never cut the Mermaid diagram, the one-liner, the demo GIF, the quickstart, or the license. The preset gallery is the selling point, so it is cut last among the compressible blocks, and only by moving rows into a `<details>` block rather than deleting them.

Visual hierarchy stays as the structure research specifies: **one** Mermaid flowchart (≤8 nodes), **one** GIF under 10 MB uploaded to GitHub's CDN (not committed) showing the chaos→highway transition, a badge row capped at 5 per line across two lines (line 1: CI, tests, license; line 2: live demo, Node ≥20, version), and dense 2–4 column tables with cells of one short phrase. Badge soup (15+ badges) and wide wrapping tables are the two anti-patterns to avoid.

## Ship CITATION.cff plus a root citations.bib as the complete bibliography

Two new files at repo root, and no `docs/` tree:

**`CITATION.cff`** (GitHub parses it and renders the "Cite this repository" sidebar button into APA + BibTeX; without it, only a plain link is produced):

```yaml
cff-version: 1.2.0
message: "If you use this software, please cite it as below."
type: software
title: "Langton's Ant — an interactive 2D Turing-machine simulator"
abstract: "A browser-based simulator for Langton's ant and generalized turmites: any N-color x M-state rule, seeded and permalink-sharable, rendered with chunked typed arrays and dirty-rect Canvas2D."
authors:
  - name: "Exios66"
keywords:
  - langtons-ant
  - turmite
  - cellular-automata
  - turing-machine
  - simulator
  - typescript
license: MIT
version: 0.1.0
date-released: "2026-10-17"
url: "https://exios66.github.io/langtons-ant/"
repository-code: "https://github.com/Exios66/langtons-ant"
# Add `doi:` once Zenodo mints one after the first GitHub release.
# No `preferred-citation`: there is no underlying paper yet.
```

Use the entity form (`name:`) rather than `given-names`/`family-names` because the author is published under the handle "Exios66"; switch to a person record if a real name is later attached. `type: software` makes GitHub emit `@software`, which is the correct BibTeX type for the project itself (the BibTeX entry then matches the `@software{exios66_langtons_ant_2026, …}` convention). `preferred-citation` is deliberately omitted: there is no paper, and adding a fake one would make GitHub emit an `@article` for a nonexistent work.

**`citations.bib`** at repo root (not `docs/`): GitHub detects `CITATION.bib`/`CITATIONS.bib` in root and links it (without parsing), and root placement matches the Cornell guidance to keep citation metadata at root and maximizes Zotero/Mendeley drag-and-drop discoverability. Contents: the full §7 BibTeX block from the inventory (all 139 entries), with the Wolfram key standardized to `wolfram_nks_5_3` and the four dead/unverified URLs either removed or annotated `note = {404 at research time — do not cite}`. The project's own entry is added at the top as `@software{exios66_langtons_ant_2026, …}` mirroring the CFF. One file, both the project citation and every referenced source, is the convention; do not split into per-topic `.bib` files.

Zenodo DOI minting is a one-time human action (OAuth + toggle repo + create release) and stays out of scope for the README edit; document it as an optional "make it citable" line in the Deployment section rather than a prerequisite.

## Edit the existing README in fourteen concrete steps

The checklist below is ordered so each edit is independently committable and verifiable; line numbers refer to the current 193-line file.

| # | Target (current file) | Edit | Verify |
|---|---|---|---|
| 1 | Lines 1–10 (title block) | Add a second badge line: CI (GitHub Actions), tests (vitest count); keep MIT + live demo on line 1; cap at 5 per line | Badge row renders on two lines, no wrap on mobile |
| 2 | Lines 1–10 | Add the demo GIF as a centered `<p align="center"><img … width="800"/></p>` immediately after the badge row, hosted on GitHub's CDN, ≤10 MB | GIF autoplays and loops |
| 3 | After line 10 | Insert a Table of Contents listing all `##` headings as anchor links | TOC present; links resolve |
| 4 | Line 14 ("What is this?") | Append numbered citations: universality `[2][3]`, highway families `[6][7][8]`, open conjecture `[14]` | Citations render as `[N]` |
| 5 | Lines 50–73 (Architecture) | Add `[10]` after the chirality convention bullet | — |
| 6 | Lines 96–122 (Preset gallery) | Condense 22 rows to 12–14, grouped by family; move the rest into a `<details>` block titled "Full preset list (22)" | In-README rows ≤14 |
| 7 | Lines 96–122 | Add a "Try it" permalink column or base link per row | Links resolve to live demo |
| 8 | Lines 123–135 (Benchmarks) | Add `[1]` to the highway-onset figure and `[12]` to the Wikipedia convention note; keep golden hash paragraph last | — |
| 9 | Lines 137–169 (Development) | Collapse the script table into `<details>`; keep layout tree and testing bullets | Section ≤20 lines |
| 10 | Lines 170–176 (Deployment) | Add optional line: "To make the repo citable, enable Zenodo on the repo and create a release (mints a concept + version DOI); then add the DOI to `CITATION.cff`." | — |
| 11 | Lines 181–189 (References) | Replace the 8 bullets with the 16 numbered entries and the CITATION.cff / citations.bib pointer block | Section 16–20 lines |
| 12 | Repo root | Add `CITATION.cff` (draft above) | GitHub shows "Cite this repository" button |
| 13 | Repo root | Add `citations.bib` (full 139 entries, standardized keys) | File parses in Zotero/Mendeley |
| 14 | Lines 191–193 (License) | Add "Citation: see `CITATION.cff`." line | — |

After these edits, run `wc -l README.md` and confirm 180–220; if over, apply the cut order from the section plan. Verify every `[N]` in the text has a matching numbered entry, every URL resolves (including the four flagged dead links excluded from the numbered list), and the BibTeX file imports cleanly into Zotero.

## Respect the no-docs scope by collapsing instead of relocating

The best-practices notes recommend moving the long tail (full preset table, detailed layout tree, benchmark raw times, full bibliography) to `docs/references.md` and `docs/presets.md`. The user's scope for this task is README + references only — no `docs/` site, no in-app help panel — so that recommendation is overridden here. Instead: keep the long tail **in the README behind `<details>` blocks** (full preset list, full script table, raw per-run benchmark times) and in the root `citations.bib` (full 139-source bibliography), and link to both from the References section. This preserves the "keep the README short" principle without creating a documentation surface that the portfolio reviewer has to leave the repo page to use. If the project later grows a GitHub Pages case study (the existing plan already has one), the same `citations.bib` and numbered list can be transcluded there without rework.

## Conclusion

The counterintuitive part of this plan is that "complete bibliography" does not mean "long README." The 139 sources the research relies on live in one importable `citations.bib`, while the README carries only the 16 entries its own sentences cite, numbered and annotated so a reviewer can verify any claim in one click. That split — machine-complete in the `.bib`, human-skimmable in the README, citable-software in the CFF — is what makes the repo both honest about its sources and fast to read, which is the combination portfolio reviewers actually reward. The one assumption to revisit later is the author identity in `CITATION.cff`: it is shipped under the handle "Exios66" as an entity, and should be converted to a person record with real given/family names the moment a paper or a real-name release is attached.
```|<|start|>assistant<|channel|>analysis<|message|>I wrote the report. Let me verify it's saved and check length/quality. Let me also double check I didn't violate "no bullets" too much. The body has tables and a code block, which is allowed. I used some bullet-like? No, I used tables. The numbered reference list is in a code block. Good.

Let me verify the file.<|end|><|start|> nodeList <|constrain|>xml<|message|><rfl:parameter name="command">
wc -l "/Users/morningstar/Desktop/Cold_Storage/langtons-ant/reports/Portfolio README citations guide.md"; head -5 "/Users/morningstar/Desktop/Cold_Storage/langtons-ant/reports/Portfolio README citations guide.md"