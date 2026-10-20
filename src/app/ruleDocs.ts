/**
 * In-app rule-space documentation panel. Static content (no fetch) so it works
 * offline and adds zero bundle weight beyond the text. Content is kept short
 * and skimmable: a reviewer can read it in ~90 seconds.
 */
export const RULE_DOCS_HTML = `
<section class="docs">
  <h2>What am I looking at?</h2>
  <p>A <strong>turmite</strong> is a 2-D Turing machine: a head (the ant) walks
  an infinite grid, and at each cell it reads the color, writes a new color,
  turns, and changes its internal state. Langton's ant is the 2-color 1-state
  case. Generalized ants and turmites are exactly as powerful as 1-D Turing
  machines (universality proved for every nontrivial turmite, 2017 [3]).</p>

  <h3>The three notations</h3>
  <ul>
    <li><strong>Ant string</strong> — one letter per color: <code>L</code> (left), <code>R</code> (right), <code>N</code> (no turn), <code>U</code> (U-turn). <code>RL</code> is the classic ant.</li>
    <li><strong>Triple table</strong> — <code>{{{write, turn, next}, …}, …}</code>, one triple per (state, color). Turn codes: 1 = forward, 2 = right, 4 = U-turn, 8 = left, 0 = halt; compass machines (Perfectionist, Base-&phi; counter) write the letters <code>N E S W</code> instead of a turn code. Additive codes (e.g. 10) split the ant and are rejected.</li>
    <li><strong>Decimal ID</strong> — Wikipedia-Commons 2-color encoding, e.g. <code>111180121010</code>.</li>
  </ul>

  <h3>Chirality convention</h3>
  <p>Color 0 → turn <strong>RIGHT</strong> (GollyGang Rule Table Repository). <code>RL</code> therefore means "right on white, left on black". Mirror images are distinct machines; use the <em>Mirror</em> button.</p>

  <h3>The ~9,977-step milestone</h3>
  <p>The classic ant runs ~150 steps of symmetry, ~10,000 steps of pseudo-random chaos, then at step ~9,977 locks into a 104-step periodic diagonal highway (drift ±2, ±2). Whether this <em>always</em> happens is the open <strong>Highway Conjecture</strong> (Collatz-flavored, &Pi;&sup0;&sub2;). In 2024–25 whole families of multi-color ants had their highways proven [6][7][8].</p>

  <h3>Universality &amp; power</h3>
  <ul>
    <li>Langton's ant is a universal 2-D Turing machine (Gajardo et al., 2002 [2]); predicting it is P-hard.</li>
    <li>All nontrivial turmites are Turing-universal (Gajardo et al., 2017 [3]).</li>
    <li>The ant is unbounded (Bunimovich &amp; Troubetzkoy, 1992 [4]).</li>
  </ul>

  <h3>How to read the gallery</h3>
  <p>Each card shows a rule, its space (states × colors), and its known milestone. Click <em>Load</em> to run it; the permalink button copies a shareable URL. Presets marked "halts" are busy-beaver champions (most steps / most painted cells for that size).</p>

  <p class="docs-foot">Sources: Wikipedia (Langton's ant, Turmite); GollyGang Rule Table Repository; arXiv:1702.05547, 2409.10124, 2505.05426, 2506.10482. Full bibliography: <code>citations.bib</code>.</p>
</section>
`;

export function openRuleDocs(): void {
  let modal = document.getElementById("rule-docs-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "rule-docs-modal";
    modal.className = "docs-modal";
    modal.innerHTML = `<div class="docs-card">${RULE_DOCS_HTML}<button class="docs-close" type="button" aria-label="Close documentation">✕</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector(".docs-close")?.addEventListener("click", closeRuleDocs);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeRuleDocs();
    });
  }
  modal.classList.add("open");
}

export function closeRuleDocs(): void {
  document.getElementById("rule-docs-modal")?.classList.remove("open");
}
