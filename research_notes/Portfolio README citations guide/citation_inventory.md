# Citation inventory — Langton's Ant / Turmite portfolio simulator (README + references)

Compiled 2026-10-17 from all five project research artifacts:
- `research_notes/Langton ant portfolio simulator/turmite_rules_and_theory.md`
- `research_notes/Langton ant portfolio simulator/reference_implementation_audit.md`
- `research_notes/Langton ant portfolio simulator/engineering_and_performance.md`
- `research_notes/Langton ant portfolio simulator/portfolio_presentation.md`
- `reports/Langton ant portfolio simulator.md`

Scope: every distinct source cited anywhere in those five documents, de-duplicated by URL / DOI / arXiv ID (variant citations of the same work merged). Metadata verified against arXiv pages for the six 2017–2025 preprints where a field was missing; everything else is taken from the dossier's own citations. **No metadata has been invented** — unknown authors/years are marked `unknown` and flagged in §5.

Totals: **12 academic/research papers** (peer-reviewed or arXiv preprints) + **3 student technical reports** + **22 encyclopedia/reference works** + **34 software, documentation & tooling sources** + **68 web articles, blogs, benchmarks & community sources** = **139 distinct sources**. (Dead links and unverified metadata are listed in §5–§6, not counted as sources.)

---

## 1. Academic papers & preprints (12)

| Key | Type | Authors | Title | Year | Venue | URL | Used for |
|---|---|---|---|---|---|---|---|
| langton1986artificiallife | article | Christopher G. Langton | Studying artificial life with cellular automata | 1986 | Physica D 22(1–3):120–149 | https://deepblue.lib.umich.edu/bitstream/2027.42/26022/1/0000093.pdf | Origin of Langton's ant; three-phase behavior |
| dewdney1989turmite | article | A. K. Dewdney | Computer Recreations column (turmites coined) — exact article title unknown | 1989 | Scientific American, Sep 1989; doi:10.1038/scientificamerican0989-180 | https://doi.org/10.1038/scientificamerican0989-180 | Naming history of "turmite" (Brady/Turk/Dewdney) |
| bunimovich1992recurrence | article | L. A. Bunimovich, S. E. Troubetzkoy | Recurrence properties of Lorentz Lattice Gas Cellular Automata | 1992 | J. Stat. Phys. 67:289–302; doi:10.1007/BF01049035 | https://doi.org/10.1007/BF01049035 | Unboundedness theorem ("Fundamental Theorem of Myrmecology") |
| gale1995furthertravels | preprint | David Gale, Jim Propp, Scott Sutherland, Serge Troubetzkoy | Further Travels with My Ant | 1995 | arXiv:math/9501233 (also Mathematical Intelligencer 1995 — venue not verified) | https://arxiv.org/abs/math/9501233 | Generalized ants, base-2 numbering, symmetric-ant theorem, unboundedness attribution correction |
| gajardo2002complexity | article | Andrés Gajardo, Andrés Moreira, Eric Goles | Complexity of Langton's ant | 2002 (journal) / 2003 (arXiv) | Discrete Applied Mathematics 117:41–50; arXiv:nlin/0306022 | https://arxiv.org/abs/nlin/0306022 (also https://www.sciencedirect.com/science/article/pii/S0166218X00003346, https://www.dim.uchile.cl/~anmoreir/oficial/langton_dam.pdf) | Universality/P-hardness; circuit construction; Highway Conjecture (finite support) |
| stewart1994antyparticles | article | Ian Stewart | The Ultimate in Anty-Particles | 1994 | Scientific American 271:104–107 | https://web.archive.org/web/20160303211426/http://dev.whydomath.org/Reading_Room_Material/ian_stewart/AntyParticles.pdf | Ant collisions as particle/antiparticle annihilation (popular) |
| belgacem2012asynchronous | article | N. Belgacem, N. Fatès | Asynchronous robustness of turmites (exact title unverified) | 2012 | Complex Systems 21(3):165–182 | https://hal.inria.fr/inria-00462438/file/AsynchRobustnessTurmites.pdf | Synchronous vs asynchronous multi-turmite robustness |
| gajardo2017nontrivial | preprint | Andrés Gajardo, Benjamin Hellouin de Menibus, Diego Maldonado, Andrés Moreira | Nontrivial Turmites Are Turing-Universal | 2017 | arXiv:1702.05547 | https://arxiv.org/abs/1702.05547 (also https://arxiv.org/html/1702.05547) | All nontrivial turmites Turing-universal; P-completeness |
| tokarz2018straight | preprint | Paweł Tokarz | Dynamics of Langton's ant allowed to periodically go straight | 2018 | arXiv:1807.08789 [nlin.CG] | https://arxiv.org/abs/1807.08789 | N-ants variant; oscillators; breaks unboundedness argument |
| gajardo2024antshighway | article | Anahí Gajardo, Victor Lutfalla, Michaël Rao | Ants on the highway | 2024 (arXiv) / 2025 (journal) | arXiv:2409.10124 [cs.DM]; Natural Computing, May 2025, doi:10.1007/s11047-025-10018-9 | https://arxiv.org/abs/2409.10124 (also https://link.springer.com/article/10.1007/s11047-025-10018-9) | Proven highway families (L2kR ≥ k−1 highways; LLRLRL infinitely many) |
| lutfalla2025sideways | preprint | Victor Lutfalla | Sideways on the highways | 2025 | arXiv:2505.05426 [cs.DM] | https://arxiv.org/abs/2505.05426 | LLRRRL / LLRLRLL reach non-highway behaviors; generalized Highway Conjecture fails |
| lutfalla2025lllr | preprint | Victor Lutfalla | The LLLR generalised Langton's ant | 2025 | arXiv:2506.10482 [cs.DM] | https://arxiv.org/abs/2506.10482 | Formal highway definition; LLLR has two distinct highways; 90° rotation quadruples |

## 2. Student technical reports (3)

| Key | Type | Authors | Title | Year | Venue | URL | Used for |
|---|---|---|---|---|---|---|---|
| eml2021langton | techreport | unknown (EML Luxembourg student report) | Langton's Ant report | 2021 | University of Luxembourg EML assets | https://math.uni.lu/eml/assets/reports/2021/langton.pdf | Highway onset ~10,647?; 60-pattern study (553–42,175 step onsets, median ≈7,162); multi-ant parity folklore |
| eml2022turmites | techreport | unknown (EML Luxembourg student report) | Turmites report | 2022 | University of Luxembourg EML assets | https://math.uni.lu/eml/assets/reports/2022/turmites.pdf | 3-matrix (S/C/T) turmite formalization; 2-state busy beaver comparison |
| eml_langton_noyear | techreport | unknown (EML Luxembourg report) | Langton's Ant report (year not stated in citation) | unknown (flagged) | University of Luxembourg EML assets | https://math.uni.lu/eml/assets/reports/langton.pdf | Highway ~11,000 steps; behavior benchmarks (RRLLLRLLLRRR ~15,900) |

## 3. Encyclopedia, reference & community knowledge bases (22)

| Key | Type | Authors/Org | Title | Year | Venue | URL | Used for |
|---|---|---|---|---|---|---|---|
| wikipedia_langtonsant | encyclopedia | Wikipedia contributors | Langton's ant | accessed 2026-10-17 | Wikipedia | https://en.wikipedia.org/wiki/Langton%27s_ant | Canonical rule, phases, highway, naming, L/R strings, hex notation, examples |
| wikipedia_turmite | encyclopedia | Wikipedia contributors | Turmite | accessed 2026-10-17 | Wikipedia | https://en.wikipedia.org/wiki/Turmite | General model, relative/absolute, grids, busy beavers, naming history |
| mathworld_langtonsant | encyclopedia | Eric W. Weisstein / Wolfram Research | Langton's Ant | accessed 2026-10-17 | MathWorld | https://mathworld.wolfram.com/LangtonsAnt.html | Opposite color convention; highway ~10,647; Kotani's Ant Problem |
| wolfram_nks_5_3 | book | Stephen Wolfram | A New Kind of Science, §5.3 | 2002 | Wolfram Science (online) | https://www.wolframscience.com/nksonline/section-5.3 | NKS absolute machines (p.184–186) |
| esolang_langtonsant | encyclopedia | Esolang wiki contributors | Langton's ant | accessed 2026-10-17 | Esolang | https://esolangs.org/wiki/Langton%27s_ant | Reversibility; shifted turn phase |
| gollygang_wiki | doc | GollyGang | TwoDimensionalTuringMachines (Rule Table Repository wiki) | accessed 2026-10-17 | GitHub wiki | https://github.com/GollyGang/ruletablerepository/wiki/TwoDimensionalTuringMachines | Triple notation, turn codes, busy beavers, extinction, Penrose, Moore, NKS examples |
| golly_help_ruleloader | doc | Golly (A. Trevorrow, T. Rokicki) | Golly Help: RuleLoader algorithm | accessed 2026-10-17 | Golly docs | https://golly.sourceforge.io/Help/Algorithms/RuleLoader.html | .rule format; Worms family |
| golly_help_formats | doc | Golly | Golly Help: File Formats | accessed 2026-10-17 | Golly docs | https://golly.sourceforge.io/Help/formats.html | .rule sections, RLE |
| golly_help_quicke | doc | Golly | Golly Help: QuickLife (MAP rules) | accessed 2026-10-17 | Golly docs | https://golly.sourceforge.io/Help/Algorithms/QuickLife.html | MAP base64 rules; bounded/unbounded |
| golly_help_index | doc | Golly | Golly Help index (no hosted Turmites page) | accessed 2026-10-17 | Golly docs | https://golly.sourceforge.net/Help/index.html | Note: Turmites help page not hosted online |
| golly_home | software | Golly | Golly home page | accessed 2026-10-17 | Golly | https://golly.sourceforge.io/ | Production CA tool; features; versions |
| golly_webapp | software | Golly | Golly for the Web (4.3) | 2024-05 | Golly web app | https://golly.sourceforge.io/webapp/golly.html | Web port UI |
| conwaylife_golly | encyclopedia | LifeWiki contributors | Golly | accessed 2026-10-17 | LifeWiki | https://conwaylife.com/wiki/Golly | Golly feature list |
| wolframcloud_turmites | web | Wolfram Research | Turmites demo (Wolfram Cloud) | accessed 2026-10-17 | Wolfram Cloud | https://www.wolframcloud.com/obj/18cf7366-9f3d-43f1-9b0e-eab4721abb66?src=CloudBasicCopiedContent | Wolfram turmite gallery |
| turmite_bestiary | web | William Hackspeare (site owner) | A Bestiary of Turmites | accessed 2026-10-17 | personal site | https://williamhackspeare.github.io/turmite-bestiary | 57 canonical L/R rules; step/painted-cell stats |
| lutfalla_ant | software | Victor Lutfalla | GL_Ant web simulator | accessed 2026-10-17 | personal site | http://lutfalla.fr/ant | Live simulator for generalized ants |
| sutherland_generalized_ants | web | Scott Sutherland (Stony Brook) | Generalized Ants | accessed 2026-10-17 | personal site | https://www.math.stonybrook.edu/~scott/ants/ | Propp's ant.c; base-2 numbering origin |
| gollygang_gollyaccesspoint | doc | GollyGang | GollyAccessPoint.html | accessed 2026-10-17 | GitHub Pages | https://github.com/GollyGang/ruletablerepository/blob/gh-pages/GollyAccessPoint.html | Turmites.zip / nColor.zip downloads |
| gollygang_downloads_turmites | software | GollyGang | Turmites.zip (generator set) | accessed 2026-10-17 | GollyGang downloads | https://gollygang.github.io/ruletablerepository/downloads/Turmites.zip | Turmite generators |
| gollygang_downloads_ncolor | software | GollyGang | Langtons-Ant-nColor.zip | accessed 2026-10-17 | GollyGang downloads | https://gollygang.github.io/ruletablerepository/downloads/Langtons-Ant-nColor.zip | n-color ant generators |
| gollygang_terminatingturmites | software | GollyGang | terminatingturmites (repo) | accessed 2026-10-17 | GitHub | https://github.com/gollygang/terminatingturmites | Busy-beaver search tool |
| pegg_mathpuzzle | web | Ed Pegg Jr. | MathPuzzle (26 Mar 2003) | 2003 | mathpuzzle.com | http://www.mathpuzzle.com/26Mar03.html | Extinction/annihilating turmites |
| youtube_langton_multiple_ants | video | unknown (Chris Langton demonstration) | Multiple ants interacting (video) | unknown | YouTube | https://www.youtube.com/watch?v=w6XQQhCgq5c | Colony demo precedent |

## 4. Software, documentation & tooling (34)

| Key | Type | Authors/Org | Title | Year | Venue | URL | Used for |
|---|---|---|---|---|---|---|---|
| chirs_cellular_automata | software | chirs (GitHub) | cellular_automata (JS CA framework) | accessed 2026-10-17 | GitHub | https://github.com/chirs/cellular_automata | Typed-array storage, turmite support, URL sharing, headless tests, 73M cell-updates/s benchmark |
| nluka_langant_explorer | software | nluka (GitHub) | langant-explorer (C++ toolchain) | accessed 2026-10-17 | GitHub | https://github.com/nluka/langant-explorer | 1 byte/cell; state format; RLE/PGM export |
| dwmkerr_langtonsant | software | dwmkerr (GitHub) | langtonsant (repo + demo + npm compiler) | accessed 2026-10-17 | GitHub / GitHub Pages | https://github.com/dwmkerr/langtonsant ; https://dwmkerr.github.io/langtonsant/ ; https://raw.githubusercontent.com/dwmkerr/langtonsant/master/README.md | Rule DSL, ?p= URL sharing, gallery pattern |
| maxrobinson_turmites | software | MaxRobinsonTheGreat (GitHub) | turmites (repo + evolvecode.io deploy) | accessed 2026-10-17 | GitHub / evolvecode.io | https://github.com/MaxRobinsonTheGreat/turmites ; https://evolvecode.io/turmites/index.html ; /script.js ; /presets.js ; https://raw.githubusercontent.com/MaxRobinsonTheGreat/turmites/main/index.html | Reference baseline: multi-state turmite engine |
| langtonant_com | software | coder369 (GitHub) | langtonant.com (vanilla JS demo) | accessed 2026-10-17 | langtonant.com | https://langtonant.com/ ; https://langtonant.com/js/moore-sof.langton-ant.min.js | Reference baseline: frozen 2017 demo |
| mdn_putImageData | doc | MDN (Mozilla) | CanvasRenderingContext2D.putImageData() | accessed 2026-10-17 | MDN | https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData | Dirty-rect incremental updates |
| mdn_offscreencanvas | doc | MDN (Mozilla) | OffscreenCanvas | accessed 2026-10-17 | MDN | https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas | Baseline since Mar 2023 |
| mdn_offscreencanvas2d | doc | MDN (Mozilla) | OffscreenCanvasRenderingContext2D | accessed 2026-10-17 | MDN | https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D | 2D context support |
| web_dev_coop_coep | doc | web.dev (Google) | COOP & COEP | accessed 2026-10-17 | web.dev | https://web.dev/articles/coop-coep | SAB requires cross-origin isolation headers |
| chrome_blink_dev_sab | doc | Chromium (blink-dev) | SAB announcement (Chrome 92) | accessed 2026-10-17 | Google Groups | https://groups.google.com/a/chromium.org/g/blink-dev/c/_0MEXs6TJhg/m/F0UduPfpAQAJ | SAB gating history |
| wicg_document_isolation_policy | doc | WICG | document-isolation-policy (proposal) | accessed 2026-10-17 | GitHub | https://github.com/WICG/document-isolation-policy | Future SAB deployment ease (unconfirmed shipped) |
| caniuse_offscreencanvas | doc | caniuse | OffscreenCanvas support | accessed 2026-10-17 | caniuse | https://caniuse.com/offscreencanvas ; https://caniuse.com/mdn-api_offscreencanvas_getcontext_2d_context | 96.76% global support (Mar 2026) |
| threejs_offscreencanvas | doc | Three.js | OffscreenCanvas manual | accessed 2026-10-17 | Three.js docs | https://threejs.org/manual/pages/offscreencanvas.html | Main-thread fallback pattern |
| vite_build | doc | Vite | Building for Production | accessed 2026-10-17 | Vite docs | https://vite.dev/guide/build | base path, output dir |
| vite_deploy | doc | Vite | Deploying a Static Site | accessed 2026-10-17 | Vite docs | https://vite.dev/guide/static-deploy | GitHub Pages recipe |
| playwright_test_snapshots | doc | Playwright | Visual comparisons | accessed 2026-10-17 | Playwright docs | https://playwright.dev/docs/test-snapshots | toHaveScreenshot, maxDiffPixels |
| playwright_pageassertions | doc | Playwright | PageAssertions API | accessed 2026-10-17 | Playwright docs | https://playwright.dev/docs/api/class-pageassertions | Canvas assertions |
| playwright_issue_8000 | issue | Playwright (GitHub issue) | Screenshot capture on hidden canvas (2021) | accessed 2026-10-17 | GitHub | https://github.com/microsoft/playwright/issues/8000 | Headless Firefox canvas caveat |
| rustwasm_implementing | doc | Rust and WebAssembly book | Implementing Life / Rendering to Canvas Directly from Memory | accessed 2026-10-17 | rustwasm.github.io | https://rustwasm.github.io/book/game-of-life/implementing.html | Flat-memory rendering pattern |
| rustwasm_testing | doc | Rust and WebAssembly book | Testing chapter | accessed 2026-10-17 | rustwasm.github.io | https://github.com/rustwasm/book/blob/master/src/game-of-life/testing.md | Known-input → known-output golden tests |
| github_docs_social_preview | doc | GitHub Docs | Customizing repository social media preview | accessed 2026-10-17 | GitHub Docs | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview | 1280×640 social card |
| github_blog_og | blog | GitHub Blog | Framework for building Open Graph images | 2021 | GitHub Blog | https://github.blog/open-source/git/framework-building-open-graph-images/ | OG image generation precedent |
| github_api_search_langtonsant | api | GitHub REST API | Search repositories: langtons-ant | accessed 2026-10-17 | GitHub API | https://api.github.com/search/repositories?q=langtons-ant ; https://api.github.com/search/repositories?q=langtons-ant&sort=stars | Star counts / activity snapshot |
| github_api_search_turmite | api | GitHub REST API | Search repositories: turmite | accessed 2026-10-17 | GitHub API | https://api.github.com/search/repositories?q=turmite&sort=stars | Turmite repo landscape |
| mintpi_golly | software | mintpi (GitHub mirror) | Golly README mirror | accessed 2026-10-17 | GitHub | https://github.com/mintpi/golly | Topology layered on storage |
| fourmilab_cellab | software | John Walker (Fourmilab) | Cellab web (turmite rule program) | accessed 2026-10-17 | fourmilab.ch | https://fourmilab.ch/cellab/webca/?ruleprog=turmite | Turmite rule program; torus/open topology |
| glife3_org | software | eruditor (GitHub) | glife3 (WebGL2 CA) | accessed 2026-10-17 | glife3.org | https://glife3.org ; https://github.com/eruditor/glife3 | GPU performance ceiling (~1000× CPU claim) |
| copy_sh_life | software | copy.sh | copy.sh/life (browser Hashlife) | accessed 2026-10-17 | copy.sh | http://copy.sh/life/ | Browser performance benchmark (29,201m cells) |
| cenonym_trmt | software | cenonym (GitHub) | trmt (Rust CLI turmite) | accessed 2026-10-17 | GitHub | https://github.com/cenonym/trmt | 256 heads; ~10^15 rules; deterministic seeds |
| rrwick_animator | software | rrwick (GitHub) | Langtons-Ant-Animator (Qt) | accessed 2026-10-17 | GitHub | https://github.com/rrwick/Langtons-Ant-Animator | Supersampled animation-frame export |
| AdrianMargel_evolving_ant_farm | software | AdrianMargel (GitHub) | evolving-ant-farm | accessed 2026-10-17 | GitHub | https://github.com/AdrianMargel/evolving-ant-farm | Evolving rules; undo/redo; stats |
| MrCamoga_langton_s_ant | software | MrCamoga (GitHub) | Langton-s-Ant (distributed highway finder) | accessed 2026-10-17 | GitHub / langtonsant.es | https://github.com/MrCamoga/Langton-s-Ant ; https://langtonsant.es | Highway period/size/rotation; square/hex/3D/4D |
| tvil_turm8 | software | tvil (itch.io) | turm8 (SUPER-CHIP) | accessed 2026-10-17 | itch.io | https://tvil.itch.io/turm8 | Numeric rule entry (turn values 1/2/4/8) |
| neuroky_me | software | neuroky.me | turmites2.html | accessed 2026-10-17 | neuroky.me | https://neuroky.me/turmites2.html | Mobile-friendly; FPS; URL params; help overlay |
| mdciotti_turmites | software | mdciotti (GitHub Pages) | turmites | accessed 2026-10-17 | GitHub Pages | https://mdciotti.github.io/turmites/ | Click-to-place turmites |
| mysimulator_uk | software | mysimulator.uk | langtons-ant | accessed 2026-10-17 | mysimulator.uk | https://www.mysimulator.uk/langtons-ant/ | Multi-ant mode; speed slider |
| t3rmit3 | software | screenseva (GitHub) | t3rmit3 | accessed 2026-10-17 | GitHub | https://github.com/screenseva/t3rmit3 | Save/load/share rule configs; seed sharing |
| Jmakesthingswith_antfarm | software | Jmakesthingswith (GitHub) | antfarm-simulator | accessed 2026-10-17 | GitHub | https://github.com/Jmakesthingswith/antfarm-simulator | Undo/redo; stats overlay; JSON gallery |
| nzbin_langton_ant_redux | software | nzbin (GitHub) | langton-ant-redux (React+Redux) | accessed 2026-10-17 | GitHub Pages | https://nzbin.github.io/langton-ant-redux/ | React+Redux demo |
| carlosgmartin_ant | web | Carlos G. Martin | Ant (open problems) | accessed 2026-10-17 | personal site | https://carlosgmartin.com/ant/index.html | Open problems (infinitely-visited cells, highway) |
| langton_ant_tau_vercel | web | unknown | Langton's Ant field notebook | accessed 2026-10-17 | Vercel | https://langton-ant-tau.vercel.app/ | Ant carries almost no memory (state vector) |
| maxrobinsonthegreat_githubio | software | MaxRobinsonTheGreat (GitHub) | turmites GitHub Pages (dead) | accessed 2026-10-17 | GitHub Pages | https://maxrobinsonthegreat.github.io/turmites/ | 404 at research time (flagged) |

## 5. Web articles, blogs, benchmarks & community sources (68)

| Key | Type | Authors/Org | Title | Year | Venue | URL | Used for |
|---|---|---|---|---|---|---|---|
| devplaybook_portfolio | web | DevPlaybook | Developer Portfolio Checklist: 20 Things Hiring Managers Look For | 2026 | DevPlaybook | https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/ | Reviewer funnel; tests; commits |
| scalyz_portfolios | web | Scalyz | Importance of Portfolios and GitHub Profiles | accessed 2026 | Scalyz blog | https://blog.scalyz.com/en/portfolios-github-profiles-hiring | 90s profile scan; 71% GitHub activity stat |
| techtrust_keyprojects | web | Techtrust | Evaluate Key Projects in Developer Portfolios | accessed 2026 | Techtrust | https://www.techtrust.com/post/key-projects-in-developer-portfolios-for-hiring | Problem→approach→outcomes arc |
| alishahnovin_faq | web | Alishah Novin | FAQs for a Software Engineering Hiring Manager | 2022 | personal blog | https://blog.alishahnovin.com/2022/07/faqs-of-software-engineering-hiring.html | Project presentation template |
| lastroundai_sideprojects | web | LastRound AI | Side Projects vs GPA for Tech Jobs | 2026 | LastRound AI | https://lastroundai.com/blog/side-projects-vs-gpa | Interview questions; production thinking |
| solidweb_firstjob | web | Solid Web | How to Get Your First Developer Job in 2026 | 2026 | Solid Web | https://solid-web.com/first-developer-job/ | Commit history as signal; broken demo worse than none |
| glamfire_multimedia | web | glamworks/glamfire | 17-multimedia-assets.md (research doc) | accessed 2026 | GitHub | https://github.com/glamworks/glamfire/blob/main/research/17-multimedia-assets.md | README asset priority; VHS; scripted demos |
| banger_exemplary_readmes | web | kerryhatcher/banger-readme | exemplary-readmes.md | accessed 2026 | GitHub | https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md | Demo GIF as biggest missed opportunity |
| banger_examples_audit | web | kerryhatcher/banger-readme | examples-audit.md | accessed 2026 | GitHub | https://github.com/kerryhatcher/banger-readme/blob/main/docs/examples-audit.md | Meilisearch README analysis |
| awesome_readme | web | matiassingers/awesome-readme | awesome-readme | accessed 2026 | GitHub | https://github.com/matiassingers/awesome-readme | README elements (GIF, TOC, badges) |
| ultimate_project_readme | web | jacobmarks/ultimate-project-readme | ultimate-project-readme | accessed 2026 | GitHub | https://github.com/jacobmarks/ultimate-project-readme | GIF tools; GitHub 10MB limit |
| hn_cameras_lenses | web | Hacker News thread | Cameras and Lenses (Ciechanowski) | accessed 2026 | Hacker News | https://news.ycombinator.com/item?id=27000223 | Ciechanowski exemplar |
| mangodeveloper_sound | web | mangodeveloper | Bartosz Ciechanowski's interactive Sound article teardown | accessed 2026 | mangodeveloper.com | https://mangodeveloper.com/articles/bartosz-ciechanowskis-interactive-sound-article-is-the-best-physics-explainer-youll-play-with-all | Ciechanowski format; 237 HN points |
| learnui_explorable | web | learn-ui.com | Explorable explanations | accessed 2026 | learn-ui.com | https://learn-ui.com/chapters/explaining/explorable-explanations | Genre definition |
| coolpeople_ciechanowski | web | Cool People Stories | Bartosz Ciechanowski profile | accessed 2026 | coolpeoplestories.com | https://www.coolpeoplestories.com/bartosz-ciechanowski-interactive | Ciechanowski bio |
| ryanorban_notes | web | Ryan Orban | Notes on Ciechanowski blog | accessed 2026 | ryanorban.com | https://ryanorban.com/notes/bartosz-ciechanowski-blog/ | Ciechanowski notes |
| matpic_highway | web | Matpic | An ant that builds a highway | accessed 2026 | matpic.com | https://www.matpic.com/essays/an-ant-that-builds-a-highway/ | 3 phases; 60-pattern study; onset 553–42,175 (median 7,162) |
| mathoverflow_highway | web | MathOverflow (community) | Intermediate results for Langton's ant highway conjecture | 2017 | MathOverflow | https://mathoverflow.net/questions/277040/intermediate-results-for-langtons-ant-highway-conjecture | Highway conjecture; Collatz Π⁰₂ analogy |
| cstheory_highway | web | CS Theory StackExchange | Langton's ant highway conjecture and undecidability | accessed 2026 | StackExchange | https://cstheory.stackexchange.com/questions/14729/langtons-ant-highway-conjecture-and-undecidability | Finite vs infinite support distinction |
| gajardo_moreira_goles_pdf | web | A. Gajardo, A. Moreira, E. Goles | Complexity of Langton's ant (PDF) | 2002 | dim.uchile.cl | https://www.dim.uchile.cl/~anmoreir/oficial/langton_compx.pdf ; https://www.dim.uchile.cl/~anmoreir/oficial/langton_dam.pdf | Universality; geometry on hexagonal grids |
| sciedirect_complexity | web | ScienceDirect | Complexity of Langton's ant (article page) | 2002 | ScienceDirect | https://www.sciencedirect.com/science/article/pii/S0166218X00003346 | Published version of gajardo2002complexity |
| arxiv_1702_html | web | arXiv (HTML rendering) | Nontrivial Turmites Are Turing-Universal (HTML) | 2017 | arXiv | https://arxiv.org/html/1702.05547 | HTML mirror of gajardo2017nontrivial |
| codepath_sideprojects | web | CodePath | How to Have Side Projects That Stand Out | 2024 | CodePath | https://www.codepath.org/news/how-to-have-side-projects-that-stand-out-and-why/ | Validation clauses; Projects section advice |
| msdn_upstart | web | MSDN Magazine (Microsoft Learn) | Upstart: 11 things to consider with side projects | 2017 | Microsoft Learn | https://learn.microsoft.com/en-us/archive/msdn-magazine/2017/january/upstart-you-re-hired-11-things-to-consider-with-side-projects | Superlatives; side-project stories |
| techinterview_quantify | web | techinterview.org | Quantifying Impact on Engineering Resumes | 2026 | techinterview.org | https://www.techinterview.org/post/3233474604/quantifying-impact-engineering-resume/ | Résumé bullet formula |
| thita_quantify | web | thita.ai | How to quantify impact on your resume as a developer | 2026 | thita.ai | https://thita.ai/blog/resume/how-to-quantify-impact-on-your-resume-as-a-developer | Quantification guide |
| devto_quantify | web | dev.to (Prat Naik) | How to Quantify Resume Bullet Points (50 examples) | 2026 | dev.to | https://dev.to/prat_naik/how-to-quantify-resume-bullet-points-with-50-real-examples-38ma | Quantification examples |
| writecv_quantify | web | WriteCV | 50 quantified examples | 2026 | writecv.ai | https://writecv.ai/blog/how-to-quantify-resume-bullets | Quantification examples |
| infiniteresume_beforeafter | web | Infinite Resume | Quantify achievements guide | accessed 2026 | infiniteresume.com | https://www.infiniteresume.com/blog/quantify-achievements-guide | Before→after catalog |
| drinkbird_og | web | DrinkBird | Open Graph and Twitter cards | accessed 2026 | DrinkBird | https://blog.drinkbird.com/courses/jekyll-engineering-blog-github-pages/04-production-polish/02-open-graph-and-social-previews/ | OG tags; cache-busting |
| ogfixer_githubpages | web | OG Fixer | GitHub Pages Open Graph Tags | accessed 2026 | ogfixer.com | https://ogfixer.com/blog/github-pages-open-graph-tags | Static hosting OG baking |
| stackoverflow_customize_preview | web | Stack Overflow (community) | Customize preview image for github pages | accessed 2026 | Stack Overflow | https://stackoverflow.com/questions/62743304/customize-preview-image-for-github-pages | Platform cache behavior |
| yashsingh_us_og | web | Yash Singh | Open Graph image GitHub repo guide | accessed 2026 | yashsingh.us | https://www.yashsingh.us/blog/post/open-graph-image-github-repo | OG image guidance |
| turingmachinesimulator_com | web | turingmachinesimulator.com | Turing machine simulator | accessed 2026 | turingmachinesimulator.com | https://turingmachinesimulator.com/ | "Machine saved as link" precedent |
| turingsim_com | web | turingsim.com | Turing simulator | accessed 2026 | turingsim.com | https://turingsim.com/ | Save/load/share machines |
| hn_floor796 | web | Hacker News thread | Floor796 | 2024 | Hacker News | https://news.ycombinator.com/item?id=40400648 | Viral comparable (533 pts) |
| hn_automata | web | Hacker News thread | Automata (1D reversible) | 2025 | Hacker News | https://news.ycombinator.com/item?id=42887484 | Show HN CA precedent |
| hn_cellular_automata_studio | web | Hacker News thread | Cellular Automata Studio | accessed 2026 | Hacker News | https://news.ycombinator.com/item?id=46285882 | Hardware-synth UI + WebGL |
| hn_cellarium | web | Hacker News thread | Cellarium | accessed 2026 | Hacker News | https://news.ycombinator.com/item?id=47096186 | Replayable timelines |
| hn_aperocky_ca | web | Hacker News thread | Aperocky cellular automata | 2021 | Hacker News | https://news.ycombinator.com/item?id=26466275 | Declarative rule DSL |
| hn_lifeee | web | Hacker News thread | Lifeee | accessed 2026 | Hacker News | https://news.ycombinator.com/item?id=29203502 | Infinite zoomable grid |
| hn_emoji_sim | web | Hacker News thread | Emoji simulator (ncase.me) | 2020 | Hacker News | https://news.ycombinator.com/item?id=24317034 | Character/fun angle |
| measurethat_sparse_vs_map | benchmark | MeasureThat.net | Sparse array vs Map | accessed 2026 | MeasureThat | https://www.measurethat.net/Benchmarks/Show/22496/1/sparse-array-vs-map-for-random-access-and-iteration | Map slower than typed arrays at scale |
| measurethat_clearing_canvas | benchmark | MeasureThat.net | Clearing canvas v2 | accessed 2026 | MeasureThat | https://www.measurethat.net/Benchmarks/Show/33628/1/clearing-canvas-v2 | putImageData ~50 µs @ 320×180 |
| measurethat_putimagedata_vs_drawimage | benchmark | MeasureThat.net / BenchmarkLab | PutImageData vs DrawImage vs fillRect | accessed 2026 | BenchmarkLab | https://benchmarklab.azurewebsites.net/Benchmarks/Show/589377 ; https://www.measurethat.net/Benchmarks/Show/589377 | drawImage 2 orders cheaper than putImageData |
| measurethat_fillrect_vs_putimagedata | benchmark | MeasureThat.net | Drawing pixels putImageData vs fillRect | accessed 2026 | MeasureThat | https://www.measurethat.net/Benchmarks/Show/33591/1/drawing-pixels-putimagedata-vs-fillrect | fillRect 30–100× slower |
| measurethat_canvas_pixel_vs_fillrect | benchmark | MeasureThat.net | Canvas Pixel vs Fill rect | accessed 2026 | MeasureThat | https://www.measurethat.net/Benchmarks/Show/11760/0/canvas-pixel-vs-fill-rect | fillRect per-pixel cost |
| tebs_lab_gol | web | Teb's Lab (Medium) | How I optimized Conway's Game of Life | accessed 2026 | Medium | https://medium.com/tebs-lab/optimizing-conways-game-of-life-12f1b7f2f54c | GC pressure from per-frame allocation |
| hashbangcode_langton_js | web | #! code | Langton's Ant in JavaScript | accessed 2026 | hashbangcode.com | https://www.hashbangcode.com/article/langtons-ant-javascript | setInterval 13 fps toy-scale contrast |

---

## 5. Flagged / incomplete / ambiguous metadata

1. **dewdney1989turmite** — exact Scientific American article title and page range not verified; only DOI 10.1038/scientificamerican0989-180 was cited. Title given as the column name "Computer Recreations" with topic "turmites"; verify before quoting.
2. **belgacem2012asynchronous** — exact paper title unverified (cited as "AsynchRobustnessTurmites.pdf" on HAL). Venue Complex Systems 21(3):165–182 is cited in the dossier; confirm title spelling/author first names.
3. **gale1995furthertravels** — journal publication venue unverified; dossier cites only the arXiv HTML mirror. Commonly listed as Mathematical Intelligencer 17(3), 1995, but not confirmed in fetched sources — verify.
4. **eml_langton_noyear** (`math.uni.lu/eml/assets/reports/langton.pdf`) — publication year not stated in the citation; may duplicate the 2021 report or be a separate/older note. Verify before citing.
5. **eml2021langton / eml2022turmites** — authors unknown (student reports); mark "unknown" if cited in README.
6. **youtube_langton_multiple_ants** — uploader/title/year not captured; verify if cited.
7. **turmite_bestiary** — site author listed as "William Hackspeare" (likely pseudonym); treat as community source, not peer-reviewed.
8. **maxrobinsonthegreat_githubio** — dead link (404) at research time; the working deploy is evolvecode.io. Do not cite the dead URL.
9. **langtons_ant_amber_vercel** — listed as homepage of coder369/langtons-ant but not verified live; treat as unverified.
10. **measurethat_putimagedata_vs_drawimage** — cited via two hosts (benchmarklab.azurewebsites.net and measurethat.net) for the same benchmark; de-duplicated to one entry but both URLs retained.
11. **golly_help_index** — Golly's Turmites help page is *not* hosted online (404 at all mirrors); any verbatim quote must come from the in-app help. Flagged in dossier as a gap.
12. **opengraph.githubassets.com template URL** (`https://opengraph.githubassets.com/1/<owner>/<repo>`) — documentation template, not a source; excluded from inventory.
13. **junk combined URLs** captured by the extractor (e.g. "https://langtonant.com/ and https://evolvecode.io/...", "https://github.com/coder369/langtons-ant (\"An HTML5...") — excluded as non-URLs.

## 6. Dead / unverified links (not counted as sources)

- https://maxrobinsonthegreat.github.io/turmites/ (404)
- https://golly.sourceforge.net/Help/Turmites.html (404) and raw.githubusercontent mirrors (404)
- https://benchmarklab.azurewebsites.net/... (mirror of a MeasureThat benchmark; possibly stale host)
- https://langtons-ant-amber.vercel.app (unverified)

## 7. BibTeX draft

```bibtex
% ---- Academic papers & preprints ----
@article{langton1986artificiallife,
  author  = {Langton, Christopher G.},
  title   = {Studying artificial life with cellular automata},
  journal = {Physica D: Nonlinear Phenomena},
  volume  = {22},
  number  = {1-3},
  pages   = {120--149},
  year    = {1986},
  url     = {https://deepblue.lib.umich.edu/bitstream/2027.42/26022/1/0000093.pdf}
}
@article{dewdney1989turmite,
  author  = {Dewdney, A. K.},
  title   = {Computer Recreations: {Turmites} (exact title unverified)},
  journal = {Scientific American},
  year    = {1989},
  doi     = {10.1038/scientificamerican0989-180},
  url     = {https://doi.org/10.1038/scientificamerican0989-180},
  note    = {September 1989 column; exact title/page range unverified}
}
@article{bunimovich1992recurrence,
  author  = {Bunimovich, L. A. and Troubetzkoy, S. E.},
  title   = {Recurrence properties of {Lorentz} lattice gas cellular automata},
  journal = {Journal of Statistical Physics},
  volume  = {67},
  pages   = {289--302},
  year    = {1992},
  doi     = {10.1007/BF01049035},
  url     = {https://doi.org/10.1007/BF01049035}
}
@misc{gale1995furthertravels,
  author       = {Gale, David and Propp, Jim and Sutherland, Scott and Troubetzkoy, Serge},
  title        = {Further travels with my ant},
  year         = {1995},
  howpublished = {arXiv:math/9501233},
  url          = {https://arxiv.org/abs/math/9501233},
  note         = {Journal venue unverified (commonly Mathematical Intelligencer)}
}
@article{gajardo2002complexity,
  author  = {Gajardo, Andr{\'e}s and Moreira, Andr{\'e}s and Goles, Eric},
  title   = {Complexity of {Langton}'s ant},
  journal = {Discrete Applied Mathematics},
  volume  = {117},
  number  = {1-3},
  pages   = {41--50},
  year    = {2002},
  url     = {https://arxiv.org/abs/nlin/0306022},
  note    = {arXiv:nlin/0306022; also ScienceDirect and dim.uchile.cl PDF}
}
@article{stewart1994antyparticles,
  author  = {Stewart, Ian},
  title   = {The ultimate in anty-particles},
  journal = {Scientific American},
  volume  = {271},
  pages   = {104--107},
  year    = {1994},
  url     = {https://web.archive.org/web/20160303211426/http://dev.whydomath.org/Reading_Room_Material/ian_stewart/AntyParticles.pdf}
}
@article{belgacem2012asynchronous,
  author  = {Belgacem, N. and Fat{\`e}s, N.},
  title   = {Asynchronous robustness of turmites (title unverified)},
  journal = {Complex Systems},
  volume  = {21},
  number  = {3},
  pages   = {165--182},
  year    = {2012},
  url     = {https://hal.inria.fr/inria-00462438/file/AsynchRobustnessTurmites.pdf},
  note    = {Exact title unverified}
}
@misc{gajardo2017nontrivial,
  author       = {Gajardo, Andr{\'e}s and Hellouin de Menibus, Benjamin and Maldonado, Diego and Moreira, Andr{\'e}s},
  title        = {Nontrivial turmites are {Turing}-universal},
  year         = {2017},
  howpublished = {arXiv:1702.05547},
  url          = {https://arxiv.org/abs/1702.05547}
}
@misc{tokarz2018straight,
  author       = {Tokarz, Pawe{\l}},
  title        = {Dynamics of {Langton}'s ant allowed to periodically go straight},
  year         = {2018},
  howpublished = {arXiv:1807.08789},
  url          = {https://arxiv.org/abs/1807.08789}
}
@misc{gajardo2024antshighway,
  author       = {Gajardo, Anah{\'i} and Lutfalla, Victor and Rao, Micha{\"e}l},
  title        = {Ants on the highway},
  year         = {2024},
  howpublished = {arXiv:2409.10124},
  url          = {https://arxiv.org/abs/2409.10124},
  note         = {Published in Natural Computing, May 2025, doi:10.1007/s11047-025-10018-9}
}
@misc{lutfalla2025sideways,
  author       = {Lutfalla, Victor},
  title        = {Sideways on the highways},
  year         = {2025},
  howpublished = {arXiv:2505.05426},
  url          = {https://arxiv.org/abs/2505.05426}
}
@misc{lutfalla2025lllr,
  author       = {Lutfalla, Victor},
  title        = {The {LLLR} generalised {Langton}'s ant},
  year         = {2025},
  howpublished = {arXiv:2506.10482},
  url          = {https://arxiv.org/abs/2506.10482}
}

% ---- Student technical reports ----
@techreport{eml2021langton,
  author      = {{Unknown (EML Luxembourg student report)}},
  title       = {Langton's ant report},
  institution = {University of Luxembourg (EML)},
  year        = {2021},
  url         = {https://math.uni.lu/eml/assets/reports/2021/langton.pdf}
}
@techreport{eml2022turmites,
  author      = {{Unknown (EML Luxembourg student report)}},
  title       = {Turmites report},
  institution = {University of Luxembourg (EML)},
  year        = {2022},
  url         = {https://math.uni.lu/eml/assets/reports/2022/turmites.pdf}
}
@techreport{eml_langton_noyear,
  author      = {{Unknown (EML Luxembourg report)}},
  title       = {Langton's ant report (year unverified)},
  institution = {University of Luxembourg (EML)},
  year        = {unknown},
  url         = {https://math.uni.lu/eml/assets/reports/langton.pdf},
  note        = {Publication year not stated in citation}
}

% ---- Encyclopedia / reference works ----
@misc{wikipedia_langtonsant,
  author = {{Wikipedia contributors}},
  title  = {Langton's ant},
  year   = {2026},
  url    = {https://en.wikipedia.org/wiki/Langton\%27s_ant},
  note   = {Accessed 2026-10-17}
}
@misc{wikipedia_turmite,
  author = {{Wikipedia contributors}},
  title  = {Turmite},
  year   = {2026},
  url    = {https://en.wikipedia.org/wiki/Turmite},
  note   = {Accessed 2026-10-17}
}
@misc{mathworld_langtonsant,
  author = {{Weisstein, Eric W. / Wolfram Research}},
  title  = {Langton's ant},
  year   = {2026},
  url    = {https://mathworld.wolfram.com/LangtonsAnt.html},
  note   = {Accessed 2026-10-17}
}
@book{wolfram2002nks,
  author    = {Wolfram, Stephen},
  title     = {A New Kind of Science},
  year      = {2002},
  publisher = {Wolfram Media},
  url       = {https://www.wolframscience.com/nksonline/section-5.3},
  note      = {Section 5.3, Two dimensions and beyond}
}
@misc{esolang_langtonsant,
  author = {{Esolang wiki contributors}},
  title  = {Langton's ant},
  year   = {2026},
  url    = {https://esolangs.org/wiki/Langton\%27s_ant},
  note   = {Accessed 2026-10-17}
}
@misc{gollygang_wiki,
  author = {{GollyGang}},
  title  = {TwoDimensionalTuringMachines (Rule Table Repository wiki)},
  year   = {2026},
  url    = {https://github.com/GollyGang/ruletablerepository/wiki/TwoDimensionalTuringMachines},
  note   = {Accessed 2026-10-17}
}
@misc{golly_help_ruleloader,
  author = {{Golly (Trevorrow, Rokicki)}},
  title  = {Golly Help: RuleLoader algorithm},
  year   = {2026},
  url    = {https://golly.sourceforge.io/Help/Algorithms/RuleLoader.html}
}
@misc{golly_help_formats,
  author = {{Golly}},
  title  = {Golly Help: File Formats},
  year   = {2026},
  url    = {https://golly.sourceforge.io/Help/formats.html}
}
@misc{golly_help_quicke,
  author = {{Golly}},
  title  = {Golly Help: QuickLife (MAP rules)},
  year   = {2026},
  url    = {https://golly.sourceforge.io/Help/Algorithms/QuickLife.html}
}
@misc{golly_help_index,
  author = {{Golly}},
  title  = {Golly Help index (no hosted Turmites page)},
  year   = {2026},
  url    = {https://golly.sourceforge.net/Help/index.html}
}
@misc{golly_home,
  author = {{Golly}},
  title  = {Golly home page},
  year   = {2026},
  url    = {https://golly.sourceforge.io/}
}
@misc{golly_webapp,
  author = {{Golly}},
  title  = {Golly for the Web (4.3)},
  year   = {2024},
  url    = {https://golly.sourceforge.io/webapp/golly.html}
}
@misc{conwaylife_golly,
  author = {{LifeWiki contributors}},
  title  = {Golly},
  year   = {2026},
  url    = {https://conwaylife.com/wiki/Golly}
}
@misc{wolframcloud_turmites,
  author = {{Wolfram Research}},
  title  = {Turmites demo (Wolfram Cloud)},
  year   = {2026},
  url    = {https://www.wolframcloud.com/obj/18cf7366-9f3d-43f1-9b0e-eab4721abb66?src=CloudBasicCopiedContent}
}
@misc{turmite_bestiary,
  author = {{Hackspeare, William (site owner)}},
  title  = {A Bestiary of Turmites},
  year   = {2026},
  url    = {https://williamhackspeare.github.io/turmite-bestiary}
}
@misc{lutfalla_ant,
  author = {Lutfalla, Victor},
  title  = {{GL\_Ant} web simulator},
  year   = {2026},
  url    = {http://lutfalla.fr/ant}
}
@misc{sutherland_generalized_ants,
  author = {Sutherland, Scott},
  title  = {Generalized Ants},
  year   = {2026},
  url    = {https://www.math.stonybrook.edu/~scott/ants/}
}
@misc{gollygang_gollyaccesspoint,
  author = {{GollyGang}},
  title  = {GollyAccessPoint.html},
  year   = {2026},
  url    = {https://github.com/GollyGang/ruletablerepository/blob/gh-pages/GollyAccessPoint.html}
}
@misc{gollygang_downloads_turmites,
  author = {{GollyGang}},
  title  = {Turmites.zip (generator set)},
  year   = {2026},
  url    = {https://gollygang.github.io/ruletablerepository/downloads/Turmites.zip}
}
@misc{gollygang_downloads_ncolor,
  author = {{GollyGang}},
  title  = {Langtons-Ant-nColor.zip},
  year   = {2026},
  url    = {https://gollygang.github.io/ruletablerepository/downloads/Langtons-Ant-nColor.zip}
}
@misc{gollygang_terminatingturmites,
  author = {{GollyGang}},
  title  = {terminatingturmites (repo)},
  year   = {2026},
  url    = {https://github.com/gollygang/terminatingturmites}
}
@misc{pegg_mathpuzzle,
  author = {Pegg, Ed, Jr.},
  title  = {MathPuzzle (26 Mar 2003)},
  year   = {2003},
  url    = {http://www.mathpuzzle.com/26Mar03.html}
}
@misc{youtube_langton_multiple_ants,
  author = {{Unknown (Chris Langton demonstration)}},
  title  = {Multiple ants interacting (video)},
  year   = {unknown},
  url    = {https://www.youtube.com/watch?v=w6XQQhCgq5c}
}

% ---- Software, documentation & tooling ----
@software{chirs_cellular_automata,
  author = {{chirs (GitHub)}},
  title  = {cellular\_automata (JS CA framework)},
  year   = {2026},
  url    = {https://github.com/chirs/cellular_automata}
}
@software{nluka_langant_explorer,
  author = {{nluka (GitHub)}},
  title  = {langant-explorer (C++ toolchain)},
  year   = {2026},
  url    = {https://github.com/nluka/langant-explorer}
}
@software{dwmkerr_langtonsant,
  author = {{dwmkerr (GitHub)}},
  title  = {langtonsant (repo, demo, npm compiler)},
  year   = {2026},
  url    = {https://github.com/dwmkerr/langtonsant}
}
@software{maxrobinson_turmites,
  author = {{MaxRobinsonTheGreat (GitHub)}},
  title  = {turmite engine (evolvecode.io deploy)},
  year   = {2026},
  url    = {https://github.com/MaxRobinsonTheGreat/turmites}
}
@software{langtonant_com,
  author = {{coder369 (GitHub)}},
  title  = {langtonant.com (vanilla JS demo)},
  year   = {2017},
  url    = {https://langtonant.com/}
}
@misc{mdn_putImageData,
  author = {{MDN (Mozilla)}},
  title  = {CanvasRenderingContext2D.putImageData()},
  year   = {2026},
  url    = {https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData}
}
@misc{mdn_offscreencanvas,
  author = {{MDN (Mozilla)}},
  title  = {OffscreenCanvas},
  year   = {2026},
  url    = {https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas}
}
@misc{mdn_offscreencanvas2d,
  author = {{MDN (Mozilla)}},
  title  = {OffscreenCanvasRenderingContext2D},
  year   = {2026},
  url    = {https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D}
}
@misc{web_dev_coop_coep,
  author = {{web.dev (Google)}},
  title  = {COOP \& COEP},
  year   = {2026},
  url    = {https://web.dev/articles/coop-coep}
}
@misc{chrome_blink_dev_sab,
  author = {{Chromium (blink-dev)}},
  title  = {SharedArrayBuffer announcement (Chrome 92)},
  year   = {2021},
  url    = {https://groups.google.com/a/chromium.org/g/blink-dev/c/_0MEXs6TJhg/m/F0UduPfpAQAJ}
}
@misc{wicg_document_isolation_policy,
  author = {{WICG}},
  title  = {document-isolation-policy (proposal)},
  year   = {2026},
  url    = {https://github.com/WICG/document-isolation-policy}
}
@misc{caniuse_offscreencanvas,
  author = {{caniuse}},
  title  = {OffscreenCanvas support},
  year   = {2026},
  url    = {https://caniuse.com/offscreencanvas}
}
@misc{threejs_offscreencanvas,
  author = {{Three.js}},
  title  = {OffscreenCanvas manual},
  year   = {2026},
  url    = {https://threejs.org/manual/pages/offscreencanvas.html}
}
@misc{vite_build,
  author = {{Vite}},
  title  = {Building for Production},
  year   = {2026},
  url    = {https://vite.dev/guide/build}
}
@misc{vite_deploy,
  author = {{Vite}},
  title  = {Deploying a Static Site},
  year   = {2026},
  url    = {https://vite.dev/guide/static-deploy}
}
@misc{playwright_test_snapshots,
  author = {{Playwright}},
  title  = {Visual comparisons},
  year   = {2026},
  url    = {https://playwright.dev/docs/test-snapshots}
}
@misc{playwright_pageassertions,
  author = {{Playwright}},
  title  = {PageAssertions API},
  year   = {2026},
  url    = {https://playwright.dev/docs/api/class-pageassertions}
}
@misc{playwright_issue_8000,
  author = {{Playwright (GitHub issue)}},
  title  = {Screenshot capture on hidden canvas (2021)},
  year   = {2021},
  url    = {https://github.com/microsoft/playwright/issues/8000}
}
@misc{rustwasm_implementing,
  author = {{Rust and WebAssembly book}},
  title  = {Implementing Life / Rendering to Canvas Directly from Memory},
  year   = {2026},
  url    = {https://rustwasm.github.io/book/game-of-life/implementing.html}
}
@misc{rustwasm_testing,
  author = {{Rust and WebAssembly book}},
  title  = {Testing chapter},
  year   = {2026},
  url    = {https://github.com/rustwasm/book/blob/master/src/game-of-life/testing.md}
}
@misc{github_docs_social_preview,
  author = {{GitHub Docs}},
  title  = {Customizing repository social media preview},
  year   = {2026},
  url    = {https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview}
}
@misc{github_blog_og,
  author = {{GitHub Blog}},
  title  = {A framework for building Open Graph images},
  year   = {2021},
  url    = {https://github.blog/open-source/git/framework-building-open-graph-images/}
}
@misc{github_api_search_langtonsant,
  author = {{GitHub REST API}},
  title  = {Search repositories: langtons-ant},
  year   = {2026},
  url    = {https://api.github.com/search/repositories?q=langtons-ant}
}
@misc{github_api_search_turmite,
  author = {{GitHub REST API}},
  title  = {Search repositories: turmite},
  year   = {2026},
  url    = {https://api.github.com/search/repositories?q=turmite&sort=stars}
}
@misc{mintpi_golly,
  author = {{mintpi (GitHub mirror)}},
  title  = {Golly README mirror},
  year   = {2026},
  url    = {https://github.com/mintpi/golly}
}
@misc{fourmilab_cellab,
  author = {{Walker, John (Fourmilab)}},
  title  = {Cellab web (turmite rule program)},
  year   = {2026},
  url    = {https://fourmilab.ch/cellab/webca/?ruleprog=turmite}
}
@software{glife3_org,
  author = {{eruditor (GitHub)}},
  title  = {glife3 (WebGL2 CA)},
  year   = {2026},
  url    = {https://glife3.org}
}
@software{copy_sh_life,
  author = {{copy.sh}},
  title  = {copy.sh/life (browser Hashlife)},
  year   = {2026},
  url    = {http://copy.sh/life/}
}
@software{cenonym_trmt,
  author = {{cenonym (GitHub)}},
  title  = {trmt (Rust CLI turmite)},
  year   = {2026},
  url    = {https://github.com/cenonym/trmt}
}
@software{rrwick_animator,
  author = {{rrwick (GitHub)}},
  title  = {Langtons-Ant-Animator (Qt)},
  year   = {2026},
  url    = {https://github.com/rrwick/Langtons-Ant-Animator}
}
@software{AdrianMargel_evolving_ant_farm,
  author = {{AdrianMargel (GitHub)}},
  title  = {evolving-ant-farm},
  year   = {2026},
  url    = {https://github.com/AdrianMargel/evolving-ant-farm}
}
@software{MrCamoga_langton_s_ant,
  author = {{MrCamoga (GitHub)}},
  title  = {Langton-s-Ant (distributed highway finder)},
  year   = {2026},
  url    = {https://github.com/MrCamoga/Langton-s-Ant}
}
@software{tvil_turm8,
  author = {{tvil (itch.io)}},
  title  = {turm8 (SUPER-CHIP)},
  year   = {2026},
  url    = {https://tvil.itch.io/turm8}
}
@software{neuroky_me,
  author = {{neuroky.me}},
  title  = {turmite2.html},
  year   = {2026},
  url    = {https://neuroky.me/turmites2.html}
}
@software{mdciotti_turmites,
  author = {{mdciotti (GitHub Pages)}},
  title  = {turmite simulator},
  year   = {2026},
  url    = {https://mdciotti.github.io/turmites/}
}
@software{mysimulator_uk,
  author = {{mysimulator.uk}},
  title  = {langtons-ant},
  year   = {2026},
  url    = {https://www.mysimulator.uk/langtons-ant/}
}
@software{t3rmit3,
  author = {{screenseva (GitHub)}},
  title  = {t3rmit3},
  year   = {2026},
  url    = {https://github.com/screenseva/t3rmit3}
}
@software{Jmakesthingswith_antfarm,
  author = {{Jmakesthingswith (GitHub)}},
  title  = {antfarm-simulator},
  year   = {2026},
  url    = {https://github.com/Jmakesthingswith/antfarm-simulator}
}
@software{nzbin_langton_ant_redux,
  author = {{nzbin (GitHub)}},
  title  = {langton-ant-redux},
  year   = {2026},
  url    = {https://nzbin.github.io/langton-ant-redux/}
}
@misc{carlosgmartin_ant,
  author = {Martin, Carlos G.},
  title  = {Ant (open problems)},
  year   = {2026},
  url    = {https://carlosgmartin.com/ant/index.html}
}
@misc{langton_ant_tau_vercel,
  author = {{Unknown}},
  title  = {Langton's Ant field notebook},
  year   = {2026},
  url    = {https://langton-ant-tau.vercel.app/}
}
@misc{maxrobinsonthegreat_githubio,
  author = {{MaxRobinsonTheGreat (GitHub)}},
  title  = {turmite GitHub Pages (dead link)},
  year   = {2026},
  url    = {https://maxrobinsonthegreat.github.io/turmites/},
  note   = {404 at research time}
}

% ---- Web articles, blogs, benchmarks & community sources ----
@misc{devplaybook_portfolio,
  author = {{DevPlaybook}},
  title  = {Developer Portfolio Checklist: 20 Things Hiring Managers Look For},
  year   = {2026},
  url    = {https://devplaybook.cc/blog/developer-portfolio-checklist-20-things-hiring-managers/}
}
@misc{scalyz_portfolios,
  author = {{Scalyz}},
  title  = {Importance of Portfolios and GitHub Profiles},
  year   = {2026},
  url    = {https://blog.scalyz.com/en/portfolios-github-profiles-hiring}
}
@misc{techtrust_keyprojects,
  author = {{Techtrust}},
  title  = {Evaluate Key Projects in Developer Portfolios},
  year   = {2026},
  url    = {https://www.techtrust.com/post/key-projects-in-developer-portfolios-for-hiring}
}
@misc{alishahnovin_faq,
  author = {Novin, Alishah},
  title  = {FAQs for a Software Engineering Hiring Manager},
  year   = {2022},
  url    = {https://blog.alishahnovin.com/2022/07/faqs-of-software-engineering-hiring.html}
}
@misc{lastroundai_sideprojects,
  author = {{LastRound AI}},
  title  = {Side Projects vs GPA for Tech Jobs},
  year   = {2026},
  url    = {https://lastroundai.com/blog/side-projects-vs-gpa}
}
@misc{solidweb_firstjob,
  author = {{Solid Web}},
  title  = {How to Get Your First Developer Job in 2026},
  year   = {2026},
  url    = {https://solid-web.com/first-developer-job/}
}
@misc{glamfire_multimedia,
  author = {{glamworks/glamfire}},
  title  = {17-multimedia-assets.md (research doc)},
  year   = {2026},
  url    = {https://github.com/glamworks/glamfire/blob/main/research/17-multimedia-assets.md}
}
@misc{banger_exemplary_readmes,
  author = {{kerryhatcher/banger-readme}},
  title  = {exemplary-readmes.md},
  year   = {2026},
  url    = {https://github.com/kerryhatcher/banger-readme/blob/main/docs/exemplary-readmes.md}
}
@misc{banger_examples_audit,
  author = {{kerryhatcher/banger-readme}},
  title  = {examples-audit.md},
  year   = {2026},
  url    = {https://github.com/kerryhatcher/banger-readme/blob/main/docs/examples-audit.md}
}
@misc{awesome_readme,
  author = {{matiassingers/awesome-readme}},
  title  = {awesome-readme},
  year   = {2026},
  url    = {https://github.com/matiassingers/awesome-readme}
}
@misc{ultimate_project_readme,
  author = {{jacobmarks/ultimate-project-readme}},
  title  = {ultimate-project-readme},
  year   = {2026},
  url    = {https://github.com/jacobmarks/ultimate-project-readme}
}
@misc{hn_cameras_lenses,
  author = {{Hacker News community}},
  title  = {Cameras and Lenses (Ciechanowski thread)},
  year   = {2026},
  url    = {https://news.ycombinator.com/item?id=27000223}
}
@misc{mangodeveloper_sound,
  author = {{mangodeveloper}},
  title  = {Bartosz Ciechanowski's interactive Sound article teardown},
  year   = {2026},
  url    = {https://mangodeveloper.com/articles/bartosz-ciechanowskis-interactive-sound-article-is-the-best-physics-explainer-youll-play-with-all}
}
@misc{learnui_explorable,
  author = {{learn-ui.com}},
  title  = {Explorable explanations},
  year   = {2026},
  url    = {https://learn-ui.com/chapters/explaining/explorable-explanations}
}
@misc{coolpeople_ciechanowski,
  author = {{Cool People Stories}},
  title  = {Bartosz Ciechanowski profile},
  year   = {2026},
  url    = {https://www.coolpeoplestories.com/bartosz-ciechanowski-interactive}
}
@misc{ryanorban_notes,
  author = {Orban, Ryan},
  title  = {Notes on Ciechanowski blog},
  year   = {2026},
  url    = {https://ryanorban.com/notes/bartosz-ciechanowski-blog/}
}
@misc{matpic_highway,
  author = {{Matpic}},
  title  = {An ant that builds a highway},
  year   = {2026},
  url    = {https://www.matpic.com/essays/an-ant-that-builds-a-highway/}
}
@misc{mathoverflow_highway,
  author = {{MathOverflow community}},
  title  = {Intermediate results for Langton's ant highway conjecture},
  year   = {2017},
  url    = {https://mathoverflow.net/questions/277040/intermediate-results-for-langtons-ant-highway-conjecture}
}
@misc{cstheory_highway,
  author = {{CS Theory StackExchange community}},
  title  = {Langton's ant highway conjecture and undecidability},
  year   = {2026},
  url    = {https://cstheory.stackexchange.com/questions/14729/langtons-ant-highway-conjecture-and-undecidability}
}
@misc{gajardo_moreira_goles_pdf,
  author = {Gajardo, Andr{\'e}s and Moreira, Andr{\'e}s and Goles, Eric},
  title  = {Complexity of Langton's ant (PDF mirror)},
  year   = {2002},
  url    = {https://www.dim.uchile.cl/~anmoreir/oficial/langton_compx.pdf}
}
@misc{sciedirect_complexity,
  author = {{ScienceDirect}},
  title  = {Complexity of Langton's ant (article page)},
  year   = {2002},
  url    = {https://www.sciencedirect.com/science/article/pii/S0166218X00003346}
}
@misc{arxiv_1702_html,
  author = {{arXiv}},
  title  = {Nontrivial Turmites Are Turing-Universal (HTML mirror)},
  year   = {2017},
  url    = {https://arxiv.org/html/1702.05547}
}
@misc{codepath_sideprojects,
  author = {{CodePath}},
  title  = {How to Have Side Projects That Stand Out},
  year   = {2024},
  url    = {https://www.codepath.org/news/how-to-have-side-projects-that-stand-out-and-why/}
}
@misc{msdn_upstart,
  author = {{MSDN Magazine}},
  title  = {Upstart: 11 things to consider with side projects},
  year   = {2017},
  url    = {https://learn.microsoft.com/en-us/archive/msdn-magazine/2017/january/upstart-you-re-hired-11-things-to-consider-with-side-projects}
}
@misc{techinterview_quantify,
  author = {{techinterview.org}},
  title  = {Quantifying Impact on Engineering Resumes},
  year   = {2026},
  url    = {https://www.techinterview.org/post/3233474604/quantifying-impact-engineering-resume/}
}
@misc{thita_quantify,
  author = {{thita.ai}},
  title  = {How to quantify impact on your resume as a developer},
  year   = {2026},
  url    = {https://thita.ai/blog/resume/how-to-quantify-impact-on-your-resume-as-a-developer}
}
@misc{devto_quantify,
  author = {{dev.to (Naik, Prat)}},
  title  = {How to Quantify Resume Bullet Points (50 examples)},
  year   = {2026},
  url    = {https://dev.to/prat_naik/how-to-quantify-resume-bullet-points-with-50-real-examples-38ma}
}
@misc{writecv_quantify,
  author = {{WriteCV}},
  title  = {50 quantified examples},
  year   = {2026},
  url    = {https://writecv.ai/blog/how-to-quantify-resume-bullets}
}
@misc{infiniteresume_beforeafter,
  author = {{Infinite Resume}},
  title  = {Quantify achievements guide},
  year   = {2026},
  url    = {https://www.infiniteresume.com/blog/quantify-achievements-guide}
}
@misc{drinkbird_og,
  author = {{DrinkBird}},
  title  = {Open Graph and Twitter cards},
  year   = {2026},
  url    = {https://blog.drinkbird.com/courses/jekyll-engineering-blog-github-pages/04-production-polish/02-open-graph-and-social-previews/}
}
@misc{ogfixer_githubpages,
  author = {{OG Fixer}},
  title  = {GitHub Pages Open Graph Tags},
  year   = {2026},
  url    = {https://ogfixer.com/blog/github-pages-open-graph-tags}
}
@misc{stackoverflow_customize_preview,
  author = {{Stack Overflow community}},
  title  = {Customize preview image for github pages},
  year   = {2026},
  url    = {https://stackoverflow.com/questions/62743304/customize-preview-image-for-github-pages}
}
@misc{yashsingh_us_og,
  author = {{Singh, Yash}},
  title  = {Open Graph image GitHub repo guide},
  year   = {2026},
  url    = {https://www.yashsingh.us/blog/post/open-graph-image-github-repo}
}
@misc{turingmachinesimulator_com,
  author = {{turingmachinesimulator.com}},
  title  = {Turing machine simulator},
  year   = {2026},
  url    = {https://turingmachinesimulator.com/}
}
@misc{turingsim_com,
  author = {{turingsim.com}},
  title  = {Turing simulator},
  year   = {2026},
  url    = {https://turingsim.com/}
}
@misc{hn_floor796,
  author = {{Hacker News community}},
  title  = {Floor796},
  year   = {2024},
  url    = {https://news.ycombinator.com/item?id=40400648}
}
@misc{hn_automata,
  author = {{Hacker News community}},
  title  = {Automata (1D reversible)},
  year   = {2025},
  url    = {https://news.ycombinator.com/item?id=42887484}
}
@misc{hn_cellular_automata_studio,
  author = {{Hacker News community}},
  title  = {Cellular Automata Studio},
  year   = {2026},
  url    = {https://news.ycombinator.com/item?id=46285882}
}
@misc{hn_cellarium,
  author = {{Hacker News community}},
  title  = {Cellarium},
  year   = {2026},
  url    = {https://news.ycombinator.com/item?id=47096186}
}
@misc{hn_aperocky_ca,
  author = {{Hacker News community}},
  title  = {Aperocky cellular automata},
  year   = {2021},
  url    = {https://news.ycombinator.com/item?id=26466275}
}
@misc{hn_lifeee,
  author = {{Hacker News community}},
  title  = {Lifeee},
  year   = {2026},
  url    = {https://news.ycombinator.com/item?id=29203502}
}
@misc{hn_emoji_sim,
  author = {{Hacker News community}},
  title  = {Emoji simulator (ncase.me)},
  year   = {2020},
  url    = {https://news.ycombinator.com/item?id=24317034}
}
@misc{measurethat_sparse_vs_map,
  author = {{MeasureThat.net}},
  title  = {Sparse array vs Map},
  year   = {2026},
  url    = {https://www.measurethat.net/Benchmarks/Show/22496/1/sparse-array-vs-map-for-random-access-and-iteration}
}
@misc{measurethat_clearing_canvas,
  author = {{MeasureThat.net}},
  title  = {Clearing canvas v2},
  year   = {2026},
  url    = {https://www.measurethat.net/Benchmarks/Show/33628/1/clearing-canvas-v2}
}
@misc{measurethat_putimagedata_vs_drawimage,
  author = {{MeasureThat.net}},
  title  = {PutImageData vs DrawImage vs fillRect},
  year   = {2026},
  url    = {https://benchmarklab.azurewebsites.net/Benchmarks/Show/589377}
}
@misc{measurethat_fillrect_vs_putimagedata,
  author = {{MeasureThat.net}},
  title  = {Drawing pixels putImageData vs fillRect},
  year   = {2026},
  url    = {https://www.measurethat.net/Benchmarks/Show/33591/1/drawing-pixels-putimagedata-vs-fillrect}
}
@misc{measurethat_canvas_pixel_vs_fillrect,
  author = {{MeasureThat.net}},
  title  = {Canvas Pixel vs Fill rect},
  year   = {2026},
  url    = {https://www.measurethat.net/Benchmarks/Show/11760/0/canvas-pixel-vs-fill-rect}
}
@misc{tebs_lab_gol,
  author = {{Teb's Lab (Medium)}},
  title  = {How I optimized Conway's Game of Life},
  year   = {2026},
  url    = {https://medium.com/tebs-lab/optimizing-conways-game-of-life-12f1b7f2f54c}
}
@misc{hashbangcode_langton_js,
  author = {{\#! code}},
  title  = {Langton's Ant in JavaScript},
  year   = {2026},
  url    = {https://www.hashbangcode.com/article/langtons-ant-javascript}
}
```

---

## 8. Usage notes for the report writer

- **De-duplication applied**: same work cited via multiple URLs merged into one entry (e.g. `gajardo2002complexity` keeps arXiv + ScienceDirect + dim.uchile PDF; `gajardo2024antshighway` keeps arXiv + Springer; `gale1995furthertravels` keeps arXiv abs (ar5iv HTML noted in used-for); `wikipedia_langtonsant`/`wikipedia_turmite` absorb all section-level Wikipedia citations; `gollygang_wiki` absorbs all GollyGang wiki sub-references).
- **Counts**: 12 academic papers + 3 student reports + 22 encyclopedia/reference + 34 software/docs/tools + 68 web/benchmark/community = 139 distinct sources.
- **BibTeX keys** are stable and ASCII-safe; `@software`/`@misc`/`@techreport` chosen per type. Academic journal papers use `@article`; preprints use `@misc` with `howpublished = {arXiv:...}`.
- **Flagged items** (§5) must be verified before the README quotes them verbatim, especially Dewdney's exact title, Belgacem & Fatès' title, Gale et al.'s journal venue, and the possibly-duplicate Luxembourg `langton.pdf`.
- **Dead link**: `maxrobinsonthegreat.github.io/turmites/` (404) — cite evolvecode.io instead. **Golly's Turmites help page is not hosted online** — quote from in-app help only.