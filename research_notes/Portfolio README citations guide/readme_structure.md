# Portfolio README Design for Interactive Simulation Repos (Langton's Ant / Turmite Simulator)

Research date: October 2026. Scope: README + references only. Dense reference for a concise, skimmable (~60-second) portfolio README for an interactive simulation repo (Exios66/langtons-ant). Sources: banger-readme docs, awesome-readme, GitHub Docs, DevPlaybook, Scalyz, rbmk/petri exemplars, sibling portfolio_presentation.md research.

## Q1 — The ~60-second reviewer funnel: above-the-fold, below-the-fold, and linkable

### Takeaway
The README is a routing document, not documentation: a reviewer decides in ~60s whether to clone, so the first screen must answer "what is it / does it work / can I run it" with a live link and visual proof; everything else is for the minority who already decided you are interesting. Move detailed reference (full API tables, contribution rules, changelogs, long preset lists) below the fold or into `docs/`.

### Cited Findings
- Hiring managers follow a ~60s funnel: skim homepage (10s) → click one featured project (20s) → scan code (20s) → check GitHub profile (10s); the featured project must have a working live demo and a real README. — [DevPlaybook, "Developer Portfolio Checklist" (2026)](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)
- Recruiters spend under 90s on a GitHub profile; 2–4 pinned repos with clear READMEs and real functionality beat repo count; ~71% of hiring managers consider GitHub activity for technical roles (Stack Overflow survey cited). — [Scalyz, "Portfolios and GitHub Profiles"](https://blog.scalyz.com/en/portfolios-github-profiles-hiring)
- "Most developers write the README for someone who has already cloned the repo… The person who matters has cloned nothing… roughly 30 seconds before moving to the next candidate." The top third of the README does almost all the work; everything below the fold is for the minority already interested. — [slategit, "Write a Project README That Sells" (2026)](https://slategit.com/blog/write-a-project-readme-that-gets-you-hired)
- First-pass skim signals: what it is in one sentence without jargon; that it works (screenshot/GIF/live link); that it can run quickly (short setup); that it is finished (tests, CI badge, clean structure); that a thoughtful person built it (clear writing, sensible sections). If these are not visible in the first screen of scrolling, most readers leave. — [slategit](https://slategit.com/blog/write-a-project-readme-that-gets-you-hired)
- "A README that starts with installation… Whoever lands there is not interested in installing anything until they know what it is and what it is for. Name, sentence, image, demo, problem — and then the rest." — [enterprisecampus project review notes (2026)](https://enterprisecampus.net/courses/javascript/11-06-project-presentation-and-review)
- The two-minute test: after 2 minutes a stranger should answer what it is, why it matters, how to run it; structure in strict order of decreasing interest: Name + one sentence (10s) → Screenshot/GIF (20s) → demo link (5s) → problem (30s) → features (30s) → technical decisions (1m) → run/test → architecture → limitations → roadmap/license. The three highlighted blocks carrying most weight: opening sentence, technical decisions, limitations. — [enterprisecampus](https://enterprisecampus.net/courses/javascript/11-06-project-presentation-and-review)
- GitHub Docs: "A README should only contain information necessary for developers to get started using and contributing… Longer documentation is best suited for wikis." Content beyond 500 KiB is truncated. — [GitHub Docs, "About READMEs"](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- Above-the-fold header anatomy (banger-readme): Logo → Badges → One-liner/elevator pitch → Demo (GIF/screenshot) → Feature highlights → Quick Start → TOC; each with a "time to read" budget (logo 1s, badges 2s, one-liner 5s, demo 10s, features 15s, quick start 20s). — [banger-readme, "Anatomy of a Standout README"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anatomy-of-a-readme.md)
- Interactive-sim exemplar rbmk README is ~60 lines: title → one sentence → Live link → screenshot → "What you can do" bullets → "Built with" → acknowledgments → license; no install wall, demo link as the 2nd line. — [natozenbilek/rbmk README](https://github.com/natozenbilek/rbmk/blob/main/README.md)
- "Don't bury the good stuff": all specific info about the system must come before boilerplate; reviewers often don't scroll past boilerplate. Links must work; document how to run tests. — [responsible.com, "Prevent your GitHub Portfolio from Selling You Short"](https://responsible.com/blog/prevent-your-github-portfolio-from-selling-you-short/)

### Inferences
- Above-the-fold (first ~40 lines, must render without scrolling on a laptop): (1) title + one-sentence elevator pitch naming the stack/role-relevant tech, (2) badge row (CI, tests, license, live demo), (3) live-demo link as its own bold line, (4) animated GIF/screenshot of a real run (highway visible), (5) 3–5 feature bullets each mapping to a hirable skill. Everything else (architecture details, full preset table, benchmarks, deployment, references) goes below.
- Below-the-fold is acceptable and expected for: architecture diagram + three deliberate choices, rule formats, full preset gallery, benchmark methodology, development/deployment, roadmap, references, license.
- Must be linkable rather than inlined: full API docs, changelog (GitHub Releases), contributor list (Contributors tab), long tutorials (`docs/`), FAQ; for this repo specifically the full 22-row preset table could be split with a `docs/presets.md` if the README exceeds budget, but keep a condensed 10–12 row table in-README since presets are a selling point.
- The GitHub repo description line (≤120 chars) is the only text seen on Trending/Topics pages and must be optimized separately from the README title. — [banger-readme, "Emerging Patterns" §7](https://github.com/kerryhatcher/banger-readme/blob/main/docs/emerging-patterns.md)

### Gaps
- No quantitative data on what fraction of reviewers click live-demo links (qualitative testimony only). — [sibling portfolio_presentation.md §Gaps](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- No authoritative source on hash-vs-query-param conventions for canvas sim state; permalink design remains inferred. — [sibling portfolio_presentation.md §Gaps](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)

## Q2 — Section ordering and length budgets (~150–250 lines)

### Takeaway
Target ~180–220 lines total (the user's 150–250 budget is right); use the cognitive-funnel order (logo/badges → pitch → demo → features → quick start → TOC → why → architecture → rule formats → presets → benchmarks → development → deployment → roadmap → references → license), and treat sections as essential (pitch, demo, features, quickstart, architecture, benchmarks-as-proof, license) vs. optional/movable (full preset table, detailed deployment, roadmap, references grouping).

### Cited Findings
- Cognitive funnel order (banger-readme): 1 Logo (1s) → 2 Badges (2s) → 3 One-liner (5s) → 4 Demo GIF (10s) → 5 Features (15s) → 6 Quick Start (20s) → 7 TOC → 8 The Why (30s) → 9 Installation → 10 Usage/Examples → 11 API (or link) → 12 Contributing → 13 License → 14 Credits. — [banger-readme, "Anatomy of a Standout README"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anatomy-of-a-readme.md)
- "The ideal README is as short as it can be without being any shorter. Detailed documentation is good — make separate pages for it! — but keep your README succinct." Move detailed API docs, changelog, contributor list, long tutorials, FAQ out. — [Art of README, cited in banger-readme](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anatomy-of-a-readme.md)
- Anti-patterns to avoid: empty/"Coming soon" sections; kitchen-sink README (full API docs + changelog + architecture + contributor list in one file); wall of text; repeating repo name as title; duplicating GitHub features (license, contributors, changelog, downloads) in README; badge abuse (>5 per line, 15 badges total). — [banger-readme, "Anti-Patterns"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anti-patterns.md)
- "For READMEs longer than about two scrolls, a table of contents is essential." — [banger-readme, "Anatomy"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anatomy-of-a-readme.md)
- GitHub auto-generates an "Outline" TOC for any Markdown file, so a manual TOC is optional polish, not required. — [GitHub Docs, "About READMEs"](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- Collapsible `<details>` sections solve the concision-vs-completeness tension: README stays scannable for the 60s scanner while offering depth for committed readers. — [banger-readme, "Emerging Patterns" §4](https://github.com/kerryhatcher/banger-readme/blob/main/docs/emerging-patterns.md)
- DevPlaybook expected README contents: one-paragraph description, run-locally commands, architecture overview or key technical decisions ("optional, but impressive"), screenshots/GIFs. — [DevPlaybook](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)
- responsible.com: "Make sure that the readme starts with an explanation of what the system does and has all the specific information about your system before the boilerplate. In several cases, we didn't scroll past the boilerplate during our review to find the 'good stuff.'" — [responsible.com](https://responsible.com/blog/prevent-your-github-portfolio-from-selling-you-short/)

### Inferences
Recommended section order and line budgets (for a ~180–220 line README; current repo README is 193 lines, so this is a tighten-and-reorder, not a rewrite):

| # | Section | Essential? | Budget (lines) | Notes |
|---|---------|------------|----------------|-------|
| 1 | Title + one-liner + badge row + live demo link + GIF | Essential | 18–24 | Above the fold; no install commands here |
| 2 | "What is this?" / problem (the science hook) | Essential | 8–12 | Open conjecture, universality, 2024–25 proofs |
| 3 | Features (table or bullets) | Essential | 8–10 | Map each bullet to a hirable skill |
| 4 | Quick start (3–5 commands) | Essential | 8–12 | `npm ci / dev / build / test` + bench gate |
| 5 | Architecture (Mermaid + 3 choices) | Impressive | 18–24 | Keep diagram small; 3 bullets why |
| 6 | Rule formats | Domain-essential | 10–14 | Table; move parser grammar to docs if tight |
| 7 | Preset gallery (condensed) | Domain-essential | 16–24 | 10–14 rows; full list → docs/presets.md |
| 8 | Benchmarks | Essential (proof) | 10–14 | Table + method + hardware + golden hash |
| 9 | Development (layout, scripts, testing) | Movable | 14–20 | Collapse scripts table if needed |
| 10 | Deployment | Movable | 6–8 | 4 lines + one-time setup |
| 11 | Roadmap | Optional | 3–5 | Keep as one line or move to issues |
| 12 | References | Essential-ish | 12–18 | Grouped, annotated, numbered |
| 13 | License | Essential | 2–3 | MIT line |

- Essential for a hiring reviewer: title/pitch/demo/features/quickstart/architecture/benchmarks/license. Optional/movable: full preset table (keep condensed), detailed deployment, roadmap, references (keep but grouped/short), development layout (move to docs/ or collapse).
- Cut or move to `docs/`: full API parser grammar, full 22-preset table, detailed project-layout tree, full script table, changelog, contributor list, FAQ, long tutorials. Use `<details>` for anything that must stay but shouldn't block the skim.
- If over budget, cut in this order: roadmap → deployment detail → development layout → references annotations → preset rows → architecture bullets (never cut the Mermaid + one-liner + demo + quickstart + license).

### Gaps
- No source prescribes a specific line count; the 150–250 target and per-section budgets are author inference supported by the rbmk (~60-line) and current repo (193-line) data points. — [natozenbilek/rbmk](https://github.com/natozenbilek/rbmk/blob/main/README.md); current repo README measured at 193 lines.

## Q3 — Visual hierarchy: Mermaid, GIFs, badges, table density

### Takeaway
Use one small Mermaid flowchart for architecture (native, diffable, renders on GitHub), one GIF under 10 MB uploaded to GitHub's CDN (not committed), a badge row capped at 5 per line / ~5–8 total, and dense-but-scannable tables (≤4 columns, short cells) for features/presets/benchmarks; avoid badge soup, giant diagrams, and wide tables that wrap on mobile.

### Cited Findings
- Mermaid diagrams render natively in GitHub Markdown; they are version-controlled (plain text), diff cleanly in PRs, and communicate structure in seconds; sweet spot between "no diagram" and "image file." — [banger-readme, "Emerging Patterns" §5](https://github.com/kerryhatcher/banger-readme/blob/main/docs/emerging-patterns.md)
- dutrevis/spark-resources-metrics-plugin exemplar: interactive Mermaid architecture diagram in the Developer section, with expandable blocks for install scenarios. — [banger-readme, "Exemplary READMEs"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md)
- GIF is "the single biggest missed opportunity" and the #1 priority in the glamfire asset priority list (demo → hero → thread → diagram → OG card); exemplars Meilisearch (animated demo with light/dark variants, 7 live demos linked, benchmark charts at top), Dioxus (visual per feature), Terminal.Gui (hero animation + demo GIF + runnable quickstart). — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- GIF tools: Gifski (free, vivid colors, low size), ScreenToGif, LICEcap; GitHub's 10 MB embed limit; drag-and-drop upload onto a GitHub CDN URL avoids bloating the repo; encoding a GIF with a `.png` extension forces autoplay in some README contexts. — [matiassingers/awesome-readme, "Creating GIFs"](https://github.com/matiassingers/awesome-readme#creating-gifs); [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Regeneration in CI: VHS (Charmbracelet) `.tape` files render to GIF/MP4/WebM and can be re-rendered in CI on release so the demo never drifts; for a canvas app this maps to a Playwright/puppeteer capture script committed to the repo. — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Badge rules: no more than 5 badges per line; group by category (line 1: CI/coverage/quality; line 2: version/downloads/license/community); all badges on one line same height; separate badge lines with an empty line; ask "what real value does this provide?" for each; pick 5–8 most important, not 15. — [banger-readme, "Anatomy" §2 Badges](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anatomy-of-a-readme.md); [banger-readme, "Anti-Patterns" §Badge Abuse](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anti-patterns.md)
- Badge abuse example: 15 badges (build, coverage, quality, version, downloads, license, twitter, discord, stars, forks, issues, PRs, size, deps, vulns) is visual noise. — [banger-readme, "Anti-Patterns"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anti-patterns.md)
- Hero animation pattern: centered `<p align="center"><img … width="800"/></p>` at top; 2–3s loop; motion captures attention like a "firm handshake." — [banger-readme, "Emerging Patterns" §1](https://github.com/kerryhatcher/banger-readme/blob/main/docs/emerging-patterns.md)
- Table density exemplars: petri uses a 2-column "Layer | What it does" table; rbmk uses bullets; GateLab uses a 3-column "Mode | What it is | Status" table. Keep cells to one short phrase. — [bernardogv/petri README](https://github.com/bernardogv/petri/blob/main/README.md); [natozenbilek/rbmk](https://github.com/natozenbilek/rbmk/blob/main/README.md); [Omega-Mu-Gamma-Studio/GateLab](https://github.com/Omega-Mu-Gamma-Studio/GateLab/blob/main/README.md)
- Dynamic content (stats cards, star-history, auto-updating roadmaps) signals liveness but adds maintenance; collapsible `<details>` blocks keep scannability. — [banger-readme, "Emerging Patterns" §3–4](https://github.com/kerryhatcher/banger-readme/blob/main/docs/emerging-patterns.md)

### Inferences
- Mermaid: use one flowchart (LR or TD) with ≤8 nodes and short labels for the engine/render/app layers; place it in the Architecture section, not the hero. Avoid sequence diagrams or giant graphs — they hurt on mobile and add scroll. Keep the existing 3 "deliberate choices" as bullets under it, not inside the diagram.
- GIF: produce a 5–8s loop showing the chaos→highway transition (the most dramatic, self-explanatory moment), ≤10 MB, uploaded via drag-and-drop to a GitHub issue/PR to get a `user-images.githubusercontent.com` CDN URL, referenced by URL (not committed). Add a CI step (Playwright capture + ffmpeg/XConvert) to regenerate on release so it never drifts; note the roadmap already lists "animated GIF/WebM export" as M2.
- Badges for this repo (two lines, ≤5 each): Line 1: CI (GitHub Actions), tests (vitest count), license (MIT). Line 2: live demo (Pages), Node ≥20, version/tag (if any). Drop decorative stars/forks/downloads (GitHub already shows them). Keep the existing MIT + Live demo badges; add CI + tests.
- Tables: features table 2 cols (Area | What it gives you); presets 4 cols (Name | Rule | Space | Milestone); benchmarks 4 cols; scripts 2 cols. Keep cell text ≤1 short phrase; avoid 5+ column tables that wrap on mobile.
- Collapsible `<details>` for: full 22-preset list (if kept in-README), full script table, detailed project layout, benchmark raw per-run times. Everything else stays open.

### Gaps
- No 2026 source gives an optimal GIF frame rate/dimensions; 800px width and ≤10 MB is inferred from GitHub's embed limit and the hero-animation pattern. — [banger-readme, "Emerging Patterns" §1](https://github.com/kerryhatcher/banger-readme/blob/main/docs/emerging-patterns.md); [matiassingers/awesome-readme](https://github.com/matiassingers/awesome-readme#creating-gifs)

## Q4 — Presenting benchmarks, golden-hash determinism, and résumé bullets

### Takeaway
Benchmarks earn trust only with method + hardware + variance + "asserts nothing" stated plainly; the golden 11,000-step FNV-1a hash (`6219b3fb`) is a genuinely rare, citable differentiator (determinism as a tested invariant, not a claim); résumé bullets follow action-verb + scope + measured outcome (baseline→after) with approximations allowed and validation clauses attached only when true.

### Cited Findings
- Benchmark honesty pattern: the repo's own README already states "5 runs of 1,000,000 steps after a 50,000-step warm-up, engine untouched," "Node v22.14.0, macOS 26.3, Apple M2 (arm64)," "console.log timings — the benchmark asserts nothing numeric so throughput can never become a flaky CI gate," per-run raw times at INFO level. — [current repo README §Benchmarks](README.md)
- Golden-hash determinism: "after exactly 11,000 classic-ant steps from a blank grid, the visited region hashes to the committed constant `6219b3fb` (FNV-1a) — asserted in tests/golden.test.ts on every Node version and OS, including the 104-step periodic highway tail." — [current repo README §Benchmarks](README.md)
- Résumé bullet formula: action verb + what + how + measurable result, with baseline→after; lead with the outcome; approximations acceptable; kill filler adverbs ("successfully"). Examples: "Reduced p95 latency from 1.5s → 350ms (77%)", "Built X used by N teams, reducing Y from A to B." — [techinterview.org (2026)](https://www.techinterview.org/post/3233474604/quantifying-impact-engineering-resume/); [thita.ai (2026)](https://thita.ai/blog/resume/how-to-quantify-impact-on-your-resume-as-a-developer); [Infinite Resume](https://www.infiniteresume.com/blog/quantify-achievements-guide)
- Side-project metrics that count even with no users: scale/scope numbers acceptable ("3 releases/week"); measurable-result pattern matters more than size. — [dev.to (2026)](https://dev.to/prat_naik/how-to-quantify-resume-bullet-points-with-50-real-examples-38ma); [WriteCV (2026)](https://writecv.ai/blog/how-to-quantify-resume-bullets)
- Validation clauses for side projects: stars, users/visitors, press, competition placement — attach one per bullet where true. — [CodePath (2024)](https://www.codepath.org/news/how-to-have-side-projects-that-stand-out-and-why/)
- "Numbers turn a project from a toy into evidence… 'Handles 2,000 requests per second on a single instance,' 'reduced query time from 400ms to 30ms with a composite index,' '95% test coverage on the core module.' Concrete figures make a reviewer believe the project is real. No empty adjectives: no 'robust', no 'scalable', no 'modern'." — [slategit](https://slategit.com/blog/write-a-project-readme-that-gets-you-hired)
- "Weak signals to not over-invest in: the green contribution graph 'predicts almost nothing'; star count is 'often unrelated to quality.' Substance = pinned repos, READMEs, one or two tested and documented projects." — [Scalyz](https://blog.scalyz.com/en/portfolios-github-profiles-hiring)
- Performance table as credibility: Meilisearch exemplar puts benchmark charts at the top of the README; gofiber exemplar includes benchmark charts. — [banger-readme, "Exemplary READMEs"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md)
- "A broken or unavailable demo is worse than no demo"; deployed URL that works right now beats screenshots. — [DevPlaybook](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/); [Solid Web (2026)](https://solid-web.com/first-developer-job/)

### Inferences
- Keep the existing benchmark table but tighten: state method (warm-up, runs, steps/run), hardware (Node version, OS, CPU), variance (mean + raw times at INFO), and the "asserts nothing numeric" rationale in ≤4 lines under the table. Keep the golden-hash paragraph as the closer — it is the differentiator.
- Golden-hash framing: present as "determinism is a tested invariant, not a claim" — any drift in step determinism, chunk addressing (incl. negative coords), or the rule table fails loudly. This is rarer than performance numbers and more defensible; lead the Benchmarks section with throughput, close with the hash.
- Résumé bullets (fill measured values; validation clause only if true): 
  - "Built Langton's Ant & Turmite Lab, a zero-dependency browser simulator for 2D Turing machines; renders [N]M steps/s on an M2 via typed-array chunks + dirty-rect Canvas2D — live at exios66.github.io/langtons-ant."
  - "Designed a data-driven rule engine where any turmite is a serialized rule table (states × symbols → turn/write), enabling live rule editing, ~10^15-rule random exploration, and URL-encoded run permalinks; every run reproducible from its link."
  - "Pinned simulation correctness with a golden-hash test: the 11,000-step FNV-1a digest (`6219b3fb`) is asserted on every Node version and OS."
  - "Shipped a narrated gallery of [N] verified landmark machines with automatic milestone detection (chaos→highway at ~10k steps), stat overlays, and side-by-side rule comparison."
- Phrase impact as numbers not adjectives; avoid "robust/scalable/modern/fast" without a figure; approximations are fine ("~10^15-rule space").

### Gaps
- No source quantifies README benchmark sections' effect on hiring; all evidence is practitioner judgment. — [sibling portfolio_presentation.md §Gaps](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Throughput/grid-size numbers are placeholders until measured on the actual implementation. — [sibling portfolio_presentation.md §Gaps](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)

## Q5 — Presenting the rule space / presets concisely with permalinks

### Takeaway
Use a 4-column table (Name | Rule | Space | Known milestone) with one-line behavior in the milestone cell, star the classic ant, cap at ~12–14 rows in-README (rest in docs/presets.md or a collapsible block), and give every preset a "copy link"/permalink so each row is a clickable exhibit; group by family (relative ants → multi-state turmites → absolute-heading → decimal/Commons).

### Cited Findings
- Preset table pattern from the current repo: 22 rows, columns Name | Notation | Space | Known milestone, e.g. "Classic Langton's Ant ⭐ | `RL` | 1 state × 2 colors, relative | highway onset ≈ 9,977 steps (self-measured on screen)"; "Jeronimus — Longest Chaos | … | highway after ≈ 8.36 × 10⁹ steps"; "Brady Busy Beaver (S = 121) | … | halts at step 121"; "Fay Champion | … | halts after 59,348,218 steps / 888,629 cells"; "Base-φ Counter | … | logarithmic growth, counting in base φ"; "NKS p.185(e) — Not Random | … | proved periodic, period 2,074,575". — [current repo README §Preset gallery](README.md)
- Permalink/state-as-link prior art: turingmachinesimulator.com "Machine saved as link"; turingsim.com "Save, load and share your machines"; cenonym/trmt deterministic seed-based reproducible runs. Pattern is established and users expect it. — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Side-by-side comparison mode and live-editable rule tables with randomize-with-seed (~10^15-rule space) are the differentiators vs. evolvecode.io (which lacks permalinks). — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Milestone detection (chaos→highway at ~10k steps) converts raw simulation into a story; onset counts differ by convention (~9,976 vs ~10,100) so state which convention. — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Feature table pattern: 2-column "Area | What it gives you" is scannable; keep to 6 rows. — [current repo README §Features](README.md); [petri README "How it works" table](https://github.com/bernardogv/petri/blob/main/README.md)
- "Each bullet should map to something a hiring team cares about. Do not list features that are not built yet; an aspirational roadmap reads as an unfinished project." (Roadmap is fine as a separate section, not in features.) — [slategit](https://slategit.com/blog/write-a-project-readme-that-gets-you-hired)

### Inferences
- Condense the 22-row gallery to ~12–14 rows in-README grouped by family: (a) 1-state relative ants (Classic ⭐, RLR, LLRR/LRRL, LRRRRRLLR, RRLLLRLLLRRR, LLLR, LLRLRL, LLRRRL), (b) multi-state relative turmites (Jeronimus, Brady Busy Beaver, Brady Sigma, Fay), (c) absolute-heading (Perfectionist, Base-φ, NKS p.185(e)), (d) Commons decimal (Spiral, Chaos→Highway, Fibonacci) — 3 representative rows. Move the rest to `docs/presets.md` or a `<details>` block.
- Column headers: `Name | Rule | Space | Known milestone` (drop "Notation" in favor of "Rule" for skimmability; keep inline code formatting). Milestone cell should be one short phrase + number; move provenance (Wikipedia/GollyGang) to a footnote or docs.
- Permalink column or link: add a "Try it" link per row pointing to the live demo with that rule encoded (e.g., `https://exios66.github.io/langtons-ant/#r=RL&…`), or a single "Open in demo" base link plus the rule string users can paste. Permalink-per-row is the differentiator vs. both benchmark sites.
- Rule-formats table: keep 4 rows (Ant string, Triples, Decimal ID, absolute headings); move the chirality convention and rejected-additive-codes notes to 2 lines under the table (keep — they signal rigor).
- Feature bullets: 6 rows max, each a skill signal (engine: N-color × M-state, allocation-free hot loop; renderer: chunked typed arrays + dirty rects; determinism: seeded + URL permalink; presets; colony mode; export/telemetry). Keep as-is, already good.

### Gaps
- No source documents permalink-per-preset as an existing pattern in turmite sims; it is inferred from saved-machine-link prior art (turingmachinesimulator.com, turingsim.com, trmt seeds). — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)

## Q6 — References section: useful but not overwhelming

### Takeaway
Group references into 3 labeled buckets (Primary papers/sources, Software & docs, Web/secondary), number them, and give each a 3–8 word "used for" annotation; cap at ~12–18 entries in-README and move the long tail to `docs/references.md`; never dump bare URLs.

### Cited Findings
- Current repo References (8 entries, flat list): Wikipedia Langton's ant + Turmite; GollyGang Rule Table Repository (2D Turing machines); GollyGang terminating-turmites; arXiv:1702.05547 (universality); arXiv:2409.10124 / 2505.05426 / 2506.10482 (highway families 2024–25); Wolfram NKS §5.3. — [current repo README §References](README.md)
- banger-readme exemplary READMEs and anatomy docs credit "Acknowledgements / Credits" as section 14 (15s read) and recommend linking to docs rather than inlining. — [banger-readme, "Anatomy"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anatomy-of-a-readme.md)
- responsible.com: "Make sure that all the links from your readme work." — [responsible.com](https://responsible.com/blog/prevent-your-github-portfolio-from-selling-you-short/)
- Anti-pattern: "Relying on externally hosted images for critical information" — inline anything essential; links rot. References as text links are fine, but don't put critical diagrams behind external hosts. — [banger-readme, "Anti-Patterns"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/anti-patterns.md)
- GitHub Docs: README should contain only what's needed to get started; longer docs → wikis. — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- petri README "Acknowledgments" pattern: credit people/sources with names + links + one line of what they contributed. — [bernardogv/petri](https://github.com/bernardogv/petri/blob/main/README.md)

### Inferences
- Structure (3 groups, numbered within group):
  - **Primary papers** (numbered 1–N): Langton 1986 (origin), Gajardo–Moreira–Goles 2002 (universality), arXiv:1702.05547 (all nontrivial turmites universal), Bunimovich & Troubetzkoy 1992 (unbounded), Lutfalla 2024–25 (highway families), NKS §5.3. Each with "used for: …" (≤8 words).
  - **Software & rule repositories**: GollyGang Rule Table Repository (chirality convention), terminating-turmites repo (presets source), Golly (reference tool).
  - **Web/secondary**: Wikipedia Langton's ant + Turmite, MathOverflow highway conjecture thread, Matpic highway essay, carlosgmartin open-problems page.
- Cap in-README at ~12–18 entries; move the long tail (arXiv preprints, Wolfram Cloud demo, HN threads) to `docs/references.md` linked from the section.
- Use Markdown numbered lists (`1. [Title](url) — used for: X`) rather than bullets so citations can be referenced as [1], [2] from the preset table and benchmarks (e.g., "highway onset ≈ 9,977 steps [1]"). This also keeps the section compact.
- Add a one-line "Chirality convention: color 0 → turn RIGHT, matching GollyGang [ref]" note inside Rule formats rather than in References, so the convention is where it's used.

### Gaps
- No source mandates a specific reference format; the grouped/numbered/annotated style is author inference from the petri acknowledgments pattern and GitHub Docs' "keep README short" guidance.

## Q7 — Examples of excellent portfolio READMEs for interactive sims/educational science repos

### Takeaway
The strongest interactive-sim READMEs are short (rbmk ~60 lines), lead with a live link and a real screenshot, state what you can do as outcome bullets, declare simplifications honestly, and put architecture/stack in a compact table; the differentiator vs. bare simulators (langtonant.com, evolvecode.io) is narrative + shareability, not more controls.

### Cited Findings
- rbmk (RBMK-1000 reactor sim): ~60 lines; title → one sentence with the scientific hook (Chernobyl accident, positive void coefficient, graphite-tipped rods, AZ-5) → **Live:** link → screenshot → "What you can do" bullets → "Built with" (plain HTML/CSS/JS, single index.html, canvas, Web Audio, PWA) → file tree → acknowledgments (named nuclear-engineering students) → license. Declares "Educational model… not validated against real plant data." — [natozenbilek/rbmk](https://github.com/natozenbilek/rbmk/blob/main/README.md)
- petri (Gray-Scott reaction-diffusion, breedable genomes): title + tagline → "Try it" (browser/offline/source) → "What you can do" bullets → "How it works" 2-col table (Simulation/Genome/Breeding/Garden) → project structure tree → test/build commands → "core logic pure and unit-tested headless; visual layer verified in browser." — [bernardogv/petri](https://github.com/bernardogv/petri/blob/main/README.md)
- GateLab (digital logic learning env): title + one-sentence audience → two-mode status table (Standard/Story, both ✅ complete) → "What is GateLab?" → mode breakdowns → "Key Features" shipped vs. remaining (explicit about stubs) → tech stack table → project structure → ecosystem table (14 tools) → honest "what's left" list. — [Omega-Mu-Gamma-Studio/GateLab](https://github.com/Omega-Mu-Gamma-Studio/GateLab/blob/main/README.md)
- SimuniVerse (40+ 3D science sims): emoji title → "Live Demo" link → "What is Simuni Verse?" → features bullets with emoji → getting started (clone/install/dev) → live site. — [Karushna/SimuniVerse](https://github.com/Karushna/SimuniVerse)
- microsims (100+ p5.js sims): title → "Live Site" → what it is → 100+ sims → tech stack → quick start (mkdocs) → project structure → contributing. — [dmccreary/microsims](https://github.com/dmccreary/microsims)
- PhET example-sim: minimal, clone-all-dependencies instructions, build steps, published-version link — library-style, not portfolio-style; shows the "docs-first" end of the spectrum. — [phetsims/example-sim](https://github.com/phetsims/example-sim)
- banger-readme exemplary (interactive/visual): Meilisearch (animated demo GIF with light/dark variants, 7 live demos linked, benchmark charts at top); Dioxus (visual per feature); Terminal.Gui (hero animation + demo GIF + runnable quickstart); NASA/ogma (institutional quality, demo GIFs per feature, simple install, usage samples). — [banger-readme, "Exemplary READMEs"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md)
- Ciechanowski-style explorable explanation (genre reference): open with a working model + instruction to touch it; ramp simple→real; narrate what to notice; openly admit simplifications; respect the reader's machine (pause animation, toggles). — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- Benchmark sites to exceed: langtonant.com (bare sim: orientation buttons, custom behavior field, grid size up to 5000×5000, steps/refresh, delay, step count, source/Wikipedia links; no narration/gallery/stats/sharing/export) and evolvecode.io/turmites (multi-ant, per-ant rule editing with presets, randomize panel, steps/sec; no narrated gallery, milestone detection, permalinks, stat overlays, export). — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)

### Inferences
- What the best sim READMEs do differently (and what this repo should copy):
  1. **Lead with the science hook in one sentence** (rbmk: "the Soviet design behind the 1986 Chernobyl accident"; this repo: "Langton's ant is provably universal; whether it always builds a highway is open"). — rbmk pattern.
  2. **Declare simplifications honestly** (rbmk "Educational model… not validated"; petri "core logic pure and unit-tested headless; visual layer verified in browser"). For this repo: "engine runs identically in browser and Node (vitest); rendering is Canvas2D, no SharedArrayBuffer." — rbmk/petri patterns.
  3. **Compact "what you can do" outcome bullets** (rbmk 5 bullets, each a capability; petri 5 bullets). Keep ≤6, present tense, no aspirational features.
  4. **Stack as a tiny table or one line** ("Plain HTML, CSS, and JavaScript in a single self-contained index.html — no framework, no build step" — rbmk). This repo already does this well; keep.
  5. **Credit sources by name** (petri: H. Nur Atmaca; this repo: Wikipedia/GollyGang/terminating-turmites) — signals provenance and rigor.
  6. **Honest status of unfinished work** (GateLab: "What's left is a specific, bounded list… still stub files"; this repo's Roadmap is fine but should not be in Features).
  7. **One real screenshot above the fold** (rbmk screenshot.jpg linked at top; this repo currently has no image — add GIF).
  8. **No install wall before the demo link** (rbmk puts Live 2nd line; this repo already does).
- What to avoid (from anti-patterns): no "Coming soon" sections (use issues), no broken links, no outdated requirements, no 15-badge soup, no wall of text, no kitchen-sink, no externally hosted critical images (inline the GIF via GitHub CDN URL).
- The differentiator vs. bare simulators is **narrative + shareability**, not more controls: narrated gallery, milestone detection, permalinks, stat overlays, export — all demo features, but the README's job is to make them visible in 60s via the GIF + feature bullets + benchmark/golden-hash proof. — [sibling portfolio_presentation.md](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)

### Gaps
- No 2025–2026 source quantifies how much README visuals convert reviewer attention into interviews; all evidence is practitioner judgment. — [sibling portfolio_presentation.md §Gaps](research_notes/Langton%20ant%20portfolio%20simulator/portfolio_presentation.md)
- No exemplar found of a portfolio README for a turmite-specific (as opposed to general CA) sim; rbmk/petri/GateLab are the closest structural analogues and are general simulators.