# Portfolio README + Citation Best Practices (Research Notes)

## Canonical README section order for a high-star scientific/educational OSS project

### Takeaway
A scientific/portfolio README is a **cognitive funnel**: broad, proof-first, narrowing to specifics, with a TOC once it exceeds ~150 lines and a hard ceiling near 300 lines. The canonical 14-section order (Standard Readme / banger-readme audit) is: Title → Banner → Badges → One-liner → Demo GIF → Quickstart → TOC → "Why"/motivation → Install → Usage/API → Architecture (Mermaid) → Features → Benchmarks → Tests → Deployment → Roadmap → References → License → Acknowledgements. Each section owes the reader one thing: **a reason to keep reading or a reason to stop** (Art of README "respect people's time"). Long-form narrative lives in `docs/`, a wiki, or the GitHub Pages site — never in the README.

### Cited Findings
- The 14-section canonical structure: Logo/Banner → Badges → One-Liner → Demo (GIF/Screenshot) → Feature Highlights → Quick Start → Table of Contents → "The Why" → Installation → Usage/Examples → API Reference → Contributing → License → Acknowledgements. — [kerryhatcher/banger-readme, "anatomy-of-a-readme.md"](https://github.com/kerryhatcher/banger-readme/blob/main/docs/readme-best-practices-research.md)
- Standard Readme spec: sections must appear in this order — Title → Banner → Badges → Short Description → Long Description → Table of Contents → Security → Background → Install → Usage → Extra Sections → API → Maintainers → Contribute → License. TOC is required, but optional for READMEs shorter than 100 lines; TOC must link to all `##` headings. — [standard-readme/spec.md](https://github.com/melunbettle/standard-readme/blob/main/spec.md)
- "Once a README passes roughly 150 lines, a TOC built from anchor links saves readers from endless scrolling." — [docsio.co, "README Examples"](https://docsio.co/blog/readme-examples)
- Standard Readme: "Sections must appear in order given below. Optional sections may be omitted." Badges must be newline-delimited and title-less. — [standard-readme/spec.md](https://github.com/melunbettle/standard-readme/blob/main/spec.md)
- The "cognitive funnel" principle: broad, pertinent details first, progressively narrowing to specifics; respect people's time, let them bail early. — [kerryhatcher/banger-readme research](https://github.com/kerryhatcher/banger-readme/blob/main/docs/readme-best-practices-research.md) citing Art of README
- Badges row purpose: trust signals at a glance (CI status, tests, license, live demo, coverage). — [docsio.co](https://docsio.co/blog/readme-examples); [kerryhatcher/banger-readme](https://github.com/kerryhatcher/banger-readme)
- Mermaid diagrams: "renders natively in GitHub Markdown, diffs cleanly in PRs"; recommended for architecture overview. — [portfolio_presentation.md notes in-repo](https://github.com/Exios66/langtons-ant) (internal); [glamfire research doc](https://github.com/glamworks/glamfire/blob/main/research/17-multimedia-assets.md)
- GitHub auto-generates a TOC for README.md files (anchor links from headings). — [CodeRefinery, "Writing README files"](https://coderefinery.github.io/documentation/writing-readme-files/)
- Cornell Data Services research-code README: recommended sections General Information → Project Overview → Installation → Usage → License → Contact → Acknowledgements → References → Related Information. — [Cornell Data Services](https://data.research.cornell.edu/data-management/sharing/writing-readmes-for-research-code-software/)
- README design priority (glamfire): (1) animated demo, (2) README hero + quickstart, (3) launch thread, (4) architecture diagram, (5) OG social card. — [glamfire research doc](https://github.com/glamworks/glamfire/blob/main/research/17-multimedia-assets.md)
- "The README must communicate value in the first screen"; reviewers spend ~60 seconds per project. — [DevPlaybook, "Developer Portfolio Checklist"](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)

### Inferences
- For this repo, the existing README already follows the funnel well (badges → one-liner → demo → quickstart → features → architecture → rule formats → presets → benchmarks → tests → deployment → roadmap → references → license). The documentation update should **keep this order** and only tighten: add a TOC (file is ~250+ lines), pin length to ≤300 lines, move the long preset table? No — presets are the product; keep but compress.
- Each section's "debt to the reader":
  - Badges: trust signals, must be green/accurate, newline-delimited.
  - One-liner: what it is + for whom, in one sentence.
  - Demo: visual proof; GIF ≤10MB or hosted CDN; autoplay.
  - Quickstart: fewest commands to running; copy-paste.
  - TOC: navigation once >150 lines.
  - Architecture: Mermaid + 3 deliberate choices + why.
  - References: numbered, complete bibliography (see Q3/Q4).
- Length budget: ~150–300 lines total; if longer, split into `docs/` (architecture, rule format spec, benchmark methodology) and link.

### Gaps
- No authoritative 2026 study quantifying exact optimal README length; 150–300 is practitioner consensus, not empirical.

---

## Software-citation standards (CITATION.cff, Zenodo, FORCE11, GitHub "Cite this repository")

### Takeaway
For a software repo, the complete citation stack is: **CITATION.cff at repo root** (cff-version 1.2.0, type: software, authors, title, version, date-released, url, repository-code, license, and optionally preferred-citation pointing at the underlying paper) → GitHub renders a "Cite this repository" sidebar button parsing it into APA + BibTeX → **Zenodo mints a DOI on each GitHub release** (concept DOI + version DOI) → FORCE11's 6 principles (Importance, Credit/Attribution, Unique ID, Persistence, Accessibility, Specificity) justify the whole chain. GitHub also detects `CITATION`, `CITATIONS`, `CITATION.bib`, `CITATIONS.bib`, `CITATION.md`, `CITATIONS.md` and links them (without parsing).

### Cited Findings
- GitHub detects `CITATION.cff` in the default branch and adds a "Cite this repository" link in the right sidebar; parses into APA and BibTeX. — [GitHub Docs, "About CITATION files"](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- Supported additional citation files (case-insensitive, root only): `CITATION`, `CITATIONS`, `CITATION.bib`, `CITATIONS.bib`, `CITATION.md`, `CITATIONS.md`, and R's `inst/CITATION`. GitHub links but does not parse these. — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- CFF 1.2.0 (current) required keys: `cff-version`, `message`, `title`, `authors`. Minimal valid file has only those four. — [CFF schema guide v1.2.0](https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md)
- CFF keys (full list): abstract, authors, cff-version, commit, contact, date-released, doi, identifiers, keywords, license, license-url, message, preferred-citation, references, repository, repository-artifact, repository-code, title, type (software|dataset), url, version. — [CFF schema guide](https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md)
- `type` defaults to `software`; `authors` required and accepts person (given-names/family-names/orcid/affiliation) or entity (name). — [CFF schema guide](https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md)
- `preferred-citation` overrides the software citation with a research article (type: article) — produces `@article` instead of `@software`. GitHub's mapping table: software → `@software` [Computer software]; article → `@article`; conference-paper → `@inproceedings`; dataset → `@misc` [Data set]; etc. — [GitHub Docs, "About CITATION files"](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- GitHub's BibTeX example for software: `@software{Lisa_My_Research_Software_2017, author = {Lisa, Mona and Bot, Hew}, doi = {10.5281/zenodo.1234}, month = {12}, title = {{My Research Software}}, url = {...}, version = {2.0.4}, year = {2017}}`. — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- Zenodo: enable repo in Zenodo GitHub settings; each new GitHub release triggers archiving + mints a DOI (concept DOI for the project + version DOI per release). Cannot link a repo to an existing Zenodo record retroactively. Metadata priority: `.zenodo.json` > `CITATION.cff` > `LICENSE` > GitHub release/repo. — [Zenodo help, "Archive a release from GitHub"](https://help.zenodo.org/docs/github/archive-software/github-upload/); [rue-a.github.io/github-zenodo-integration](https://rue-a.github.io/github-zenodo-integration/documentation/)
- GitHub Docs: "Issuing a persistent identifier for your repository with Zenodo" — 5-step setup (login, authorize, toggle repo, create release, get DOI). — [GitHub Docs, "Referencing and citing content"](https://docs.github.com/en/repositories/archiving-a-github-repository/referencing-and-citing-content)
- FORCE11 Software Citation Principles (Smith, Katz, Niemeyer 2016, PeerJ CS 2:e86, doi:10.7717/peerj-cs.86): 6 principles — Importance, Credit and Attribution, Unique Identification, Persistence, Accessibility, Specificity. Recommends DOIs resolving to a persistent landing page (Zenodo/figshare), not raw repo URLs, to satisfy Persistence. — [FORCE11](https://force11.org/info/software-citation-principles-published-2016/); [PeerJ](https://peerj.com/articles/cs-86/)
- IEEE follows FORCE11 Software Citation Principles; format: `J. K. Author. Title of Software. Date Repository or Archive. (version or year). Publisher Name. Accessed: Date. [Type of Medium]. Global Persistent Identifier. Available: site/path/file`. — [Penn State IEEE guide](https://guides.libraries.psu.edu/ieeequickguide/datasets); [IEEE Reference Guide 2020](https://www.readkong.com/page/ieee-reference-guide-2020-ieee-ieee-author-center-9670675)
- IEEE guidance for software: author(s), software name, location/repository, version number, release date, unique identifier (+ licensure, description for use-in-new-software). — [IEEE Reference Guide 2020](https://www.readkong.com/page/ieee-reference-guide-2020-ieee-ieee-author-center-9670675)
- PMC software-citation guide (Chue Hong et al. lineage): essential metadata — Creator(s), Title, Publication venue (archive/repo with PID), Date, Identifier (preferably DOI); optional Version + Type (e.g., [Computer software]). If a published article describes the software, cite it as an additional reference. — [PMC7805487](https://pmc.ncbi.nlm.nih.gov/articles/PMC7805487/)
- MIT LibGuide: cite software via publisher style if exists; otherwise best-practice elements above; many packages state preferred citation — follow it. — [MIT Libraries](https://libguides.mit.edu/software/citing)
- IEEE software example (Penn State): `D. W. Arning et al. Mixed Mode–Mixed Level Circuit Simulator. (2011). Ngspice. Accessed: Jan. 11, 2019. [Online]. Available: http://ngspice.sourceforge.net`. — [Penn State IEEE guide](https://guides.libraries.psu.edu/ieeequickguide/datasets)

### Inferences
- For this portfolio repo: create `CITATION.cff` at root with `cff-version: 1.2.0`, `type: software`, author (Exios66), title "Langton's Ant — interactive 2D Turing-machine simulator", version "0.1.0", date-released, url (GitHub Pages live demo), repository-code (GitHub repo), license MIT, keywords. No underlying paper exists, so no `preferred-citation` (or set it only if a paper is later published). Add `doi` once Zenodo mints it after first release.
- Zenodo setup is a one-time human action (OAuth + toggle + create release); document in README Deployment section as optional "making it citable" step.
- Do not use CC licenses for software (per PMC guide); MIT is correct.

### Gaps
- Whether GitHub's "Cite this repository" button renders for `CITATION.bib`-only repos without CFF: it links but does not parse (confirmed). For full APA/BibTeX output, CFF is required.

---

## Numbered reference style for READMEs (inline [1], [2], References section)

### Takeaway
GitHub Flavored Markdown has **no native citation syntax** (no `[@key]` — that's Pandoc). The portable, skimmable pattern for a README is **manual numbered brackets inline** (`… as shown [1].`) plus a **`## References` section at the bottom** with one entry per number: `Author(s). "Title." Venue, Year. URL` (or DOI). Mix academic papers and web sources in one numbered list, grouped logically or chronologically, with DOIs/URLs as resolvable links. Footnotes (`[^1]`) are an alternative for sparse citations; for 10+ sources a References section is clearer. Avoid Pandoc syntax in READMEs — it renders as literal text on GitHub.

### Cited Findings
- "Markdown has no citation syntax." Pandoc adds `[@key]` but requires a build step; on GitHub it renders as literal text. — [allmarkdown.com, "Markdown citation"](https://allmarkdown.com/syntax/citations)
- For a README or GitHub document: use footnotes (`[^key]`) or a References list of ordinary links. — [allmarkdown.com](https://allmarkdown.com/syntax/citations)
- GitHub GFM supports footnotes: `[^1]` inline and `[^1]: definition` anywhere (rendered at bottom). — [Stack Overflow, "Cite a paper using github markdown syntax"](https://stackoverflow.com/questions/26587527/cite-a-paper-using-github-markdown-syntax)
- Numbered inline style example (Stack Overflow consensus): `"...the go to statement should be abolished..." [1].` with `<a id="1">[1]</a> Dijkstra, E. W. (1968). Go to statement considered harmful. Communications of the ACM, 11(3), 147-148.`; clicking [1] jumps to the reference. — [Stack Overflow](https://stackoverflow.com/questions/26587527/cite-a-paper-using-github-markdown-syntax)
- openstack-ai-style-guide agent rule: "Add numbered citations `[1]` immediately after statements containing factual information. Place citations at the end of sentences, before the period: 'This is a fact[1].'"; reference list at end as `[1] Original Source: [full URL] - Section: … - Retrieved: YYYY-MM-DD`. — [seanmooney/openstack-ai-style-guide, agents/doc-to-markdown.md](https://github.com/seanmooney/openstack-ai-style-guide/blob/master/agents/doc-to-markdown.md)
- Reference-style links (Markdown native) reduce clutter: `[text][label]` + `[label]: url "title"`; label case-insensitive; can live anywhere in the file. — [Markdown Guide, "Basic Syntax"](https://www.markdownguide.org/basic-syntax/)
- Golly citation pattern (real exemplar): "Citations:" bulleted list with author, title in quotes, venue, year, DOI/URL; plus "Please cite Ready as: …". — [GollyGang/ready README](https://github.com/gollygang/ready?tab=readme-ov-file)
- LTL-GollyScripting pattern: "Citation / Published papers" section with bolded paper + full IEEE-ish citation + repo citation line. — [Brandon-Ism/LTL-GollyScripting](https://github.com/Brandon-Ism/LTL-GollyScripting)
- Cornell research-code README: References section is one of the recommended headings. — [Cornell Data Services](https://data.research.cornell.edu/data-management/sharing/writing-readmes-for-research-code-software/)

### Inferences
- Recommended pattern for this repo (numbered refs, mixing academic + web):
  - Inline: `… still an open conjecture [3].` and `… ([arXiv:1702.05547](…))` may coexist; but to keep one numbered list, prefer `[N]` for every factual claim and put the URL in the References entry.
  - References section format (one line each, ~):
    `[1] C. Langton. "Studying artificial life with cellular automata." Physica D 22 (1986): 120–149.`
    `[2] A. Gajardo, A. Moreira, E. Goles. "Complexity of Langton's ant." Discrete Applied Mathematics 117 (2002): 41–50. https://doi.org/…`
    `[3] Wikipedia contributors. "Langton's ant." Wikipedia. https://en.wikipedia.org/wiki/Langton%27s_ant (accessed 2026-10-17).`
  - Group entries: academic papers first (numbered 1–N), then web/primary sources (N+1–M), OR keep a single chronological list. Single list is more skimmable for ≤20 refs; split only past ~30.
  - Always include DOI when available (resolvable, persistent); for web-only sources use URL + access date.
  - Make `[N]` clickable via `<a id="ref-N">` anchors or rely on GitHub's auto-anchor? GitHub does not auto-anchor plain `[1]` text — use `<a id="1">[1]</a>` if click-through is desired (optional; many repos skip).
- Length: keep References ≤ ~25 entries in README; move the full bibliography to `docs/references.md` or `citations.bib` and link.

### Gaps
- No single authoritative "numbered refs in README" standard; the above is synthesized from practitioner patterns (Stack Overflow, Golly, Cornell). The report writer should pick one and apply consistently.

---

## BibTeX conventions for a software project (@software vs @misc vs @article)

### Takeaway
Ship **one** `CITATION.cff` at root (GitHub parses it) and **one** `citations.bib` (Zotero/Mendeley import). Use `@software` (biblatex/biblatex-software) for the project itself and for software dependencies; `@misc` only as the classic-BibTeX fallback for unknown types; `@article` for papers. `@software` requires author, title, url, year (biblatex-software) and supports version, doi, repository, swhid, license, etc. Expose the `.bib` at repo root (or `docs/`) so GitHub's "Cite this repository" can link it and users can import it directly.

### Cited Findings
- GitHub parses `CITATION.cff` into BibTeX as `@software` (not `@article`) for software type. — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- Classic BibTeX: `@misc` is the fallback for everything else (preprints, software, datasets, websites); no required fields; classic styles ignore `url`/`doi`/`version` silently. — [bibtex.org, "@misc"](https://www.bibtex.org/EntryTypes/Misc/)
- biblatex (and biblatex-software) adds `@software` (formatted like `@misc` + `version` field), `@dataset`, `@online`. — [bibtex.org](https://www.bibtex.org/EntryTypes/Misc/); [biblatex-software](https://www.dicosmo.org/Articles/2020-SEN.pdf)
- biblatex-software `@software`: required fields author/editor, title, url, year; optional abstract, addendum, date, doi, eprint, file, hal_id, institution, license, month, note, organization, publisher, repository, swhid, urldate, version (+ related*). — [biblatex-software PDF](https://tug.ctan.org/macros/latex/contrib/biblatex-contrib/biblatex-software/software-biblatex.pdf)
- biblatex-software also defines `@softwareversion` (specific release; inherits from crossref'd `@software`), `@softwaremodule`, `@codefragment`. — [biblatex-software](https://www.dicosmo.org/Articles/2020-SEN.pdf)
- GitHub detects `CITATION.bib`/`CITATIONS.bib` in root and links them in "Cite this repository" (no parsing). — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- Cornell research-code guidance: "If you are in a field that makes use of LaTeX, you may consider including a BibTeX version of your citation so that others can copy it directly into their work." Keep CITATION/metadata at repo root. — [Cornell Data Services](https://data.research.cornell.edu/data-management/sharing/writing-readmes-for-research-code-software/)
- Software Heritage's indexer converts citation metadata (codemeta/cff) to BibTeX as `@software`/`@softwareversion`/`@codefragment`. — [Software Heritage docs](https://docs.softwareheritage.org/_modules/swh/indexer/citation/bibtex.html)
- `@software` GitHub example (from CFF): `@software{Lisa_My_Research_Software_2017, author = {Lisa, Mona and Bot, Hew}, doi = {10.5281/zenodo.1234}, month = {12}, title = {{My Research Software}}, url = {https://github.com/...}, version = {2.0.4}, year = {2017}}`. — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)

### Inferences
- Repo layout decision: keep `CITATION.cff` at root (GitHub requirement for parsing) and add `citations.bib` at root (or `docs/citations.bib`). Single file, both the project's own citation and all referenced sources. Mark the project entry as `@software{exios66_langtons_ant_2026, …}`; academic sources as `@article`/`@inproceedings`/`@book`; web sources as `@misc` or `@online`.
- Required fields to always populate for `@software`: author, title, url, year (+ version, doi once Zenodo mints). For `@article`: author, title, journal, year (+ volume, issue, pages, doi). For web `@misc`/`@online`: author (or `{Wikipedia contributors}`), title, url, urldate, year.
- Reader workflow: Zotero/Mendeley "Add item by identifier" or drag-and-drop the `.bib`; GitHub's "Cite this repository" button covers the software itself; README References section covers human reading.
- Do not split into per-topic .bib files; one `citations.bib` is the convention and matches "ship a single citations.bib".

### Gaps
- Whether to place `citations.bib` at root vs `docs/`: both appear in the wild; root maximizes discoverability and matches GitHub's filename detection; `docs/` keeps root clean. Recommendation: root (matches GitHub detection + Cornell "keep citation metadata at root").

---

## What makes a portfolio README "digestible" (skimmability, funnel, long-form placement)

### Takeaway
Digestibility = **visual proof in the first viewport + quantified claims + a TOC + zero walls of text**. The ~60-second reviewer funnel (DevPlaybook) is: 10s skim homepage → 20s click one project → 20s scan code → 10s check profile. Everything a reviewer needs to say "yes, interview" must be visible without scrolling past the first screen: working live URL, badge row, GIF, one command, architecture diagram, test count, benchmark number. Long-form narrative (case study, architecture deep-dive, rule-format spec, full bibliography) belongs in `docs/`, a wiki, or the GitHub Pages site — linked, not inlined. Never let a section exceed ~40 lines without a sub-heading or table.

### Cited Findings
- Reviewer funnel: ~60s per project — 10s homepage skim → 20s click featured project → 20s scan code → 10s GitHub profile. Featured project needs working live demo + real README. — [DevPlaybook, "Developer Portfolio Checklist"](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)
- Recruiters spend <90s on a GitHub profile before deciding; 2–4 pinned repos with clear READMEs beat repo count. — [Scalyz, "Portfolios and GitHub Profiles"](https://blog.scalyz.com/en/portfolios-github-profiles-hiring)
- README expected contents: one-paragraph description, run-locally commands, architecture overview/key decisions (optional but impressive), screenshots/GIFs. — [DevPlaybook](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)
- "The 30-second code test": any file should be understandable by a senior engineer in 30s. — [DevPlaybook](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)
- Zero tests on every project signals no testing in normal workflow; even basic unit tests on core logic count. — [DevPlaybook](https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/)
- README hero priority order (glamfire): (1) animated demo GIF, (2) README hero + quickstart, (3) launch thread, (4) architecture diagram, (5) OG social card. Demo GIFs are "the single biggest missed opportunity." — [glamfire research doc](https://github.com/glamworks/glamfire/blob/main/research/17-multimedia-assets.md); [banger-readme exemplary-READMEs audit](https://github.com/kerryhatcher/banger-readme/blob/main/docs/examples-audit.md)
- Beautiful-README elements (awesome-readme canon): GIF demo, TOC, badges, logo; architecture in dedicated ARCHITECTURE.md with diagrams and invariants (esbuild, VS Code, Tauri, Flutter cited). GIF tools: Gifski, ScreenToGif, Gifox; GitHub 10MB embed limit; drag-and-drop onto GitHub CDN avoids repo bloat. — [matiassingers/awesome-readme](https://github.com/matiassingers/awesome-readme); [jacobmarks/ultimate-project-readme](https://github.com/jacobmarks/ultimate-project-readme)
- Mermaid diagrams render natively on GitHub and diff cleanly in PRs. — [portfolio_presentation.md in-repo notes](https://github.com/Exios66/langtons-ant)
- VHS (Charmbracelet) `.tape` files render demos to GIF/MP4/WebM and can be re-rendered in CI so the demo never drifts. — [glamfire research doc](https://github.com/glamworks/glamfire/blob/main/research/17-multimedia-assets.md)
- Skimmability mechanics: tables over prose for feature lists; collapsible `<details>` for long content; badges as trust signals; TOC for >150 lines. — [docsio.co](https://docsio.co/blog/readme-examples); [standard-readme](https://github.com/melunbettle/standard-readme)
- "Address a junior developer, not yourself"; "Show, don't tell." — [banger-readme research](https://github.com/kerryhatcher/banger-readme/blob/main/docs/readme-best-practices-research.md)
- Quantified bullets beat adjectives: "Reduced p95 latency from 1.5s → 350ms (77%)" vs "significantly improved performance." — [techinterview.org](https://www.techinterview.org/post/3233474604/quantifying-impact-engineering-resume/); [thita.ai](https://thita.ai/blog/resume/how-to-quantify-impact-on-your-resume-as-a-developer)
- CodePath: validation (users/stars/press) makes a side project land; 1–3 bullets per project with description + validation. — [CodePath](https://www.codepath.org/news/how-to-have-side-projects-that-stand-out-and-why/)

### Inferences
- For this repo the existing README already hits most digestibility marks (tables for features/rule formats/presets/benchmarks, Mermaid architecture, badges, quickstart). The documentation update should:
  - Add a TOC (file is long enough to need one per docsio.co's 150-line rule).
  - Keep the hero (badges + one-liner + demo GIF) within the first viewport.
  - Move the full preset table? No — it's the product's showcase; but consider collapsing detailed per-preset notes behind links to `docs/presets.md`.
  - Keep References numbered and ≤~20 entries in README; full bibliography in `citations.bib` + `docs/references.md`.
  - Avoid walls of text: every paragraph ≤4 sentences; convert prose lists to tables.
- Long-form content placement: `docs/` for architecture deep-dive, rule-format grammar, benchmark methodology, full bibliography; GitHub Pages site for the narrated case study; wiki optional. README links to them.

### Gaps
- No 2025–2026 data on how much README visuals convert reviewer attention into interviews; evidence is practitioner judgment.

---

## Examples of excellent READMEs for interactive simulators / CA / educational science repos

### Takeaway
The standout CA/simulator READMEs share: **a demo GIF or animation at the very top, a one-command quickstart, a feature table, and (for research-adjacent ones) a "Citation / Published papers" section**. Golly is the reference for research-grade citation practice (scholar.google citation links + "Please cite Ready as:" block). trmt and Ready show the two citation idioms (repo-citation line; numbered paper list). Most interactive simulators (langtonant.com, evolvecode.io) ship **no citation section at all** — adding one is a cheap differentiator for a portfolio/research repo.

### Cited Findings
- Golly (jimblandy/golly): README is an HTML help page with feature overview + a "References" page listing books/magazine articles; "Please cite Ready as: …" block for the Ready companion. — [Golly docs/ReadMe.html](https://github.com/jimblandy/golly/blob/master/docs/ReadMe.html); [GollyGang/ready](https://github.com/gollygang/ready?tab=readme-ov-file)
- GollyGang/ready: research-grade citation pattern — bulleted paper list with author, title, venue, year, DOI/URL; plus "Please cite Ready as: [authors]. 'Ready, a cross-platform implementation…' https://github.com/GollyGang/ready". — [GollyGang/ready](https://github.com/gollygang/ready?tab=readme-ov-file)
- LTL-GollyScripting: "Citation / Published papers" section — published paper (full IEEE-ish citation with DOI) + "Repository citation" line (author, title, GitHub, year). — [Brandon-Ism/LTL-GollyScripting](https://github.com/Brandon-Ism/LTL-GollyScripting)
- cenonym/trmt (terminal turmite, Rust, 85★): demo GIF at top of README; feature bullets; rule-format docs; acknowledgements (Raphael Rau for demo background; cmatrix/pipes.sh/asciiquarium inspiration; contributors). No formal citation section. — [cenonym/trmt](https://github.com/cenonym/trmt)
- Gjum/turmite-simulator: minimal README — one-line description, features, included turmites, rule-format grammar, make-your-own section. No badges/citations. — [Gjum/turmite-simulator](https://github.com/Gjum/turmite-simulator)
- calculuswhiz/turmite-sandbox: minimal README with usage + ini file format spec. — [calculuswhiz/turmite-sandbox](https://github.com/calculuswhiz/turmite-sandbox)
- Meilisearch (cited in banger-readme audit): animated demo GIF with light/dark variants, 7 live demo apps linked from README, benchmark charts at top — "shows real value, not just a terminal recording." — [kerryhatcher/banger-readme examples-audit](https://github.com/kerryhatcher/banger-readme/blob/main/docs/examples-audit.md)
- Dioxus: every feature section has its own visual. Terminal.Gui: hero animation + demo GIF + runnable quickstart. — [kerryhatcher/banger-readme exemplary-readmes](https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md)
- awesome-readme canon (matiassingers): GIF demo, TOC, badges, logo; architecture in dedicated ARCHITECTURE.md with diagrams and invariants (esbuild, VS Code, Tauri, Flutter Engine exemplars). — [matiassingers/awesome-readme](https://github.com/matiassingers/awesome-readme)
- banger-readme exemplary READMEs: Meilisearch (animated demo GIF, benchmark charts at top), Dioxus (visual per feature), Terminal.Gui (hero animation + GIF + quickstart), Standard Readme (TOC + consistent sections), spark-resources (interactive Mermaid diagram in Developer section, expandable blocks, prior-art + next-steps sections). — [kerryhatcher/banger-readme exemplary-readmes](https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md)
- ORMIR readme template (research-software template): badges (docs, codecov, license, version, python version) → description → TOC → sections. — [ORMIRcommunity/templates](https://github.com/ORMIRcommunity/templates/blob/main/ORMIR_readme_template.md)

### Inferences
- Citation patterns observed across these repos fall into three idioms:
  1. **Research-software idiom** (Golly/Ready, LTL-GollyScripting): "Citations:" / "Citation / Published papers" section listing papers (author, title, venue, year, DOI/URL) + a "Please cite this repo as:" line. Best fit for this project.
  2. **Software idiom** (trmt, most simulators): acknowledgements only; no citation. Weaker for a research/portfolio repo.
  3. **Hybrid** (this repo's current README): "References" bullet list of links. Good but unnumbered and lacks DOIs/access dates.
- Recommendation: adopt idiom 1 + numbered refs (Q3) + `CITATION.cff` + `citations.bib` (Q2/Q4). Keep the "References" section as the human-readable numbered list; add a "Cite this repository" pointer line above it (GitHub auto-renders the button, but a textual pointer helps).
- The existing README's References section should be converted from bullets to numbered entries with DOIs where available, plus an access date for web sources (per Cornell + openstack style-guide agent rule).

### Gaps
- No 2025–2026 exemplar found of a CA simulator README combining numbered refs + BibTeX + CFF; the pattern is synthesized from Golly (research idiom) + GitHub CFF docs + standard-readme. The report writer should validate against the actual repo's references list.
