/**
 * Dynamic UI sections: the rule editor (ant-string mode + state×color
 * matrix mode) and the preset gallery cards. Deliberately DOM-only — no
 * framework, no virtual anything.
 */

import {
  MAX_COLORS,
  MAX_STATES,
  TURN_ABS_E,
  TURN_ABS_N,
  TURN_ABS_S,
  TURN_ABS_W,
  TURN_FORWARD,
  TURN_HALT,
  TURN_LEFT,
  TURN_RIGHT,
  TURN_UTURN,
  parseAntString,
  ruleToAntString,
  type Rule,
} from "../engine/rule";
import type { Preset } from "../engine/presets";
import { PALETTES, packedToCss } from "../render/palette";

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

// ------------------------------------------------------------ preset list

export function buildPresetList(
  root: HTMLElement,
  cbs: { onLoad(p: Preset): void; onPermalink(p: Preset): void },
  presets: readonly Preset[],
): void {
  root.replaceChildren();
  for (const preset of presets) {
    const card = el("article", "preset-card" + (preset.flagship ? " flagship" : ""));
    const head = el("header", "preset-head");
    const name = el("h4");
    name.textContent = preset.name;
    head.appendChild(name);
    if (preset.flagship) {
      const badge = el("span", "badge badge-flagship");
      badge.textContent = "flagship";
      head.appendChild(badge);
    } else if (preset.milestone) {
      const badge = el("span", "badge");
      badge.textContent = "milestone";
      head.appendChild(badge);
    }
    card.appendChild(head);

    const space = el("div", "preset-space");
    space.textContent = preset.space + " — " + preset.notation;
    card.appendChild(space);

    const blurb = el("p", "preset-blurb");
    blurb.textContent = preset.blurb;
    card.appendChild(blurb);

    if (preset.milestone) {
      const milestone = el("div", "preset-milestone");
      milestone.textContent = "◆ " + preset.milestone;
      card.appendChild(milestone);
    }

    const foot = el("footer", "preset-foot");
    const load = el("button", "btn btn-primary");
    load.type = "button";
    load.textContent = "Load";
    load.addEventListener("click", () => cbs.onLoad(preset));
    foot.appendChild(load);

    const copy = el("button", "btn");
    copy.type = "button";
    copy.textContent = "Copy link";
    copy.setAttribute("aria-label", `Copy permalink for ${preset.name}`);
    copy.addEventListener("click", () => cbs.onPermalink(preset));
    foot.appendChild(copy);

    const src = el("a", "preset-src");
    src.href = preset.source;
    src.target = "_blank";
    src.rel = "noreferrer";
    src.textContent = "source ↗";
    foot.appendChild(src);
    card.appendChild(foot);

    root.appendChild(card);
  }
}

// ------------------------------------------------------------- rule editor

export interface SwatchOption {
  css: string;
  packed: number;
  label: string;
}

export interface RuleEditorApi {
  rule(): Rule;
  /** Current working colors (packed), i.e. palette + overrides. */
  colors(): Uint32Array;
  /** Commit a rebuilt/edited rule; restarts the run. */
  submit(rule: Rule): void;
  toast(msg: string): void;
  swatchOptions(index: number): SwatchOption[];
  applySwatch(index: number, packed: number): void;
  resetSwatch(index: number): void;
}

export interface RuleEditorHandle {
  refresh(): void;
}

const TURN_OPTIONS: Array<{ code: number; label: string; disabled?: boolean }> = [
  { code: TURN_HALT, label: "Halt" },
  { code: TURN_FORWARD, label: "Forward" },
  { code: TURN_RIGHT, label: "Right" },
  { code: TURN_UTURN, label: "U-turn" },
  { code: TURN_LEFT, label: "Left" },
  { code: TURN_ABS_N, label: "N (absolute)", disabled: true },
  { code: TURN_ABS_E, label: "E (absolute)", disabled: true },
  { code: TURN_ABS_S, label: "S (absolute)", disabled: true },
  { code: TURN_ABS_W, label: "W (absolute)", disabled: true },
];

export function createRuleEditor(container: HTMLElement, api: RuleEditorApi): RuleEditorHandle {
  let lastKey = "";
  let menu: HTMLDivElement | null = null;
  let activeSwatch = -1;

  const closeMenu = () => {
    if (menu !== null) {
      menu.remove();
      menu = null;
    }
    activeSwatch = -1;
  };
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest(".swatch, .swatch-menu")) return;
    closeMenu();
  });

  const build = (): void => {
    const rule = api.rule();
    let antString: string | null = null;
    if (rule.states === 1) {
      try {
        antString = ruleToAntString(rule);
      } catch {
        antString = null;
      }
    }
    container.replaceChildren();

    if (antString !== null) {
      // ---------------------------------------------------- ant-string mode
      const wrap = el("div", "ant-editor");
      const row = el("div", "row");
      const input = el("input", "ant-input") as HTMLInputElement;
      input.type = "text";
      input.spellcheck = false;
      input.maxLength = MAX_COLORS;
      input.value = antString;
      input.setAttribute("aria-label", "Ant rule string — one turn letter per color, e.g. RL");
      const dim = el("span", "dim");
      dim.textContent = `${rule.colors} color${rule.colors === 1 ? "" : "s"}`;
      row.appendChild(input);
      row.appendChild(dim);
      wrap.appendChild(row);

      const err = el("div", "rule-err");
      err.setAttribute("role", "alert");
      err.hidden = true;
      wrap.appendChild(err);

      input.addEventListener("input", () => {
        const v = input.value;
        try {
          const parsed = parseAntString(v);
          err.hidden = true;
          api.submit(parsed);
        } catch (ex) {
          err.hidden = false;
          err.textContent = ex instanceof Error ? ex.message : String(ex);
        }
      });

      const btns = el("div", "row btn-row");
      const addC = el("button", "btn btn-small");
      addC.type = "button";
      addC.textContent = "+ color";
      addC.disabled = rule.colors >= MAX_COLORS;
      addC.title = "Append a color (inherits the last turn)";
      addC.addEventListener("click", () => {
        const v = input.value;
        if (v.length >= MAX_COLORS) return;
        try {
          api.submit(parseAntString(v + v[v.length - 1]));
        } catch {
          api.toast("Fix the rule string first");
        }
      });
      const remC = el("button", "btn btn-small");
      remC.type = "button";
      remC.textContent = "− color";
      remC.disabled = rule.colors <= 1;
      remC.title = "Drop the last color";
      remC.addEventListener("click", () => {
        if (input.value.length <= 1) return;
        try {
          api.submit(parseAntString(input.value.slice(0, -1)));
        } catch {
          api.toast("Fix the rule string first");
        }
      });
      btns.appendChild(addC);
      btns.appendChild(remC);
      wrap.appendChild(btns);
      container.appendChild(wrap);
    } else {
      // ------------------------------------------------------ matrix mode
      const wrap = el("div", "matrix-editor");
      const table = el("table", "matrix");
      const thead = el("thead");
      const headRow = el("tr");
      const corner = el("th", "matrix-corner");
      corner.textContent = "state ↓ · color →";
      headRow.appendChild(corner);
      for (let c = 0; c < rule.colors; c++) {
        const th = el("th", "matrix-color");
        const swatch = el("span", "swatch-dot");
        swatch.style.background = packedToCss(api.colors()[c]);
        th.appendChild(swatch);
        const idx = el("span", "swatch-idx");
        idx.textContent = String(c);
        th.appendChild(idx);
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el("tbody");
      for (let s = 0; s < rule.states; s++) {
        const tr = el("tr");
        const label = el("th", "matrix-state");
        label.textContent = "S" + s;
        tr.appendChild(label);
        for (let c = 0; c < rule.colors; c++) {
          const idx = s * rule.colors + c;
          const td = el("td", "matrix-cell");
          const group = el("div", "cell-selects");

          const wSel = el("select") as HTMLSelectElement;
          wSel.setAttribute("aria-label", `Write color for state ${s}, color ${c}`);
          for (let w = 0; w < rule.colors; w++) {
            const opt = el("option");
            opt.value = String(w);
            opt.textContent = "→ " + w;
            if (w === rule.write[idx]) opt.selected = true;
            wSel.appendChild(opt);
          }

          const tSel = el("select") as HTMLSelectElement;
          tSel.setAttribute("aria-label", `Turn for state ${s}, color ${c}`);
          for (const to of TURN_OPTIONS) {
            const opt = el("option");
            opt.value = String(to.code);
            opt.textContent = to.label;
            if (to.disabled) opt.disabled = true;
            if (to.code === rule.turn[idx]) opt.selected = true;
            tSel.appendChild(opt);
          }

          const nSel = el("select") as HTMLSelectElement;
          nSel.setAttribute("aria-label", `Next state for state ${s}, color ${c}`);
          for (let n = 0; n < rule.states; n++) {
            const opt = el("option");
            opt.value = String(n);
            opt.textContent = "S" + n;
            if (n === rule.next[idx]) opt.selected = true;
            nSel.appendChild(opt);
          }
          const haltOpt = el("option");
          haltOpt.value = "-1";
          haltOpt.textContent = "Halt";
          if (rule.next[idx] === -1) haltOpt.selected = true;
          nSel.appendChild(haltOpt);

          const onChange = () => {
            api.submit(collectFromTable(table, rule.colors, rule.states));
          };
          wSel.addEventListener("change", onChange);
          tSel.addEventListener("change", onChange);
          nSel.addEventListener("change", onChange);

          group.appendChild(wSel);
          group.appendChild(tSel);
          group.appendChild(nSel);
          td.appendChild(group);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);

      const btns = el("div", "row btn-row");
      const addS = el("button", "btn btn-small");
      addS.type = "button";
      addS.textContent = "+ state";
      addS.disabled = rule.states >= MAX_STATES;
      addS.addEventListener("click", () => {
        api.submit(withAddedState(collectFromTable(table, rule.colors, rule.states)));
      });
      const remS = el("button", "btn btn-small");
      remS.type = "button";
      remS.textContent = "− state";
      remS.disabled = rule.states <= 1;
      remS.addEventListener("click", () => {
        api.submit(withRemovedState(collectFromTable(table, rule.colors, rule.states)));
      });
      btns.appendChild(addS);
      btns.appendChild(remS);
      const hint = el("span", "dim");
      hint.textContent = `${rule.states} states × ${rule.colors} colors`;
      btns.appendChild(hint);
      wrap.appendChild(btns);
      container.appendChild(wrap);
    }

    // ---------------------------------------------------------- swatches
    const strip = el("div", "swatches");
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", "Color palette editor — click a swatch to re-color it");
    for (let i = 0; i < rule.colors; i++) {
      const sw = el("button", "swatch");
      sw.type = "button";
      sw.style.background = packedToCss(api.colors()[i]);
      sw.title = i === 0 ? "Background (color 0)" : `Color ${i} — click to re-color`;
      sw.setAttribute("aria-label", sw.title);
      sw.toggleAttribute("data-swatch", true);
      sw.dataset.index = String(i);
      sw.addEventListener("click", () => openMenu(sw, i));
      strip.appendChild(sw);
    }
    container.appendChild(strip);
  };

  const openMenu = (anchor: HTMLElement, index: number): void => {
    closeMenu();
    const m = el("div", "swatch-menu");
    m.setAttribute("role", "menu");
    for (const opt of api.swatchOptions(index)) {
      const item = el("button", "swatch-menu-item");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.innerHTML = "";
      const dot = el("span", "swatch-dot");
      dot.style.background = opt.css;
      const label = el("span");
      label.textContent = opt.label;
      item.appendChild(dot);
      item.appendChild(label);
      item.addEventListener("click", () => {
        api.applySwatch(index, opt.packed);
        closeMenu();
      });
      m.appendChild(item);
    }
    const reset = el("button", "swatch-menu-item");
    reset.type = "button";
    reset.setAttribute("role", "menuitem");
    const dot = el("span", "swatch-dot");
    dot.style.background = packedToCss(api.colors()[index]);
    dot.style.opacity = "0.45";
    const rl = el("span");
    rl.textContent = "Reset to palette";
    reset.appendChild(dot);
    reset.appendChild(rl);
    reset.addEventListener("click", () => {
      api.resetSwatch(index);
      closeMenu();
    });
    m.appendChild(reset);

    const rect = anchor.getBoundingClientRect();
    const host = container.getBoundingClientRect();
    m.style.left = `${rect.left - host.left}px`;
    m.style.top = `${rect.bottom - host.top + 4}px`;
    container.appendChild(m);
    menu = m;
    activeSwatch = index;
  };

  return {
    refresh(): void {
      const rule = api.rule();
      let key: string;
      try {
        key = `${rule.states}x${rule.colors}:${ruleToAntString(rule)}`;
      } catch {
        key = `${rule.states}x${rule.colors}:matrix`;
      }
      // Swatch colors can change without a rule change.
      const colorSig = Array.from(api.colors().slice(0, rule.colors)).join(",");
      const fullKey = key + "|" + colorSig;
      if (fullKey === lastKey) return;
      lastKey = fullKey;
      closeMenu();
      build();
    },
  };
}

/** Read the state×color matrix selects back into a normalized Rule. */
function collectFromTable(table: HTMLTableElement, colors: number, states: number): Rule {
  const write = new Uint8Array(states * colors);
  const turn = new Uint8Array(states * colors);
  const next = new Int8Array(states * colors);
  const rows = table.tBodies[0]?.rows ?? [];
  for (let s = 0; s < states; s++) {
    const cells = rows[s]?.getElementsByTagName("select");
    for (let c = 0; c < colors; c++) {
      const base = c * 3;
      const idx = s * colors + c;
      const w = cells ? Number((cells[base] as HTMLSelectElement).value) : 0;
      const t = cells ? Number((cells[base + 1] as HTMLSelectElement).value) : 0;
      const n = cells ? Number((cells[base + 2] as HTMLSelectElement).value) : -1;
      write[idx] = w >>> 0;
      turn[idx] = t >>> 0;
      next[idx] = t === 0 ? -1 : n;
    }
  }
  return { colors, states, write, turn, next };
}

function withAddedState(rule: Rule): Rule {
  const states = rule.states + 1;
  if (states > MAX_STATES) return rule;
  const write = new Uint8Array(states * rule.colors);
  const turn = new Uint8Array(states * rule.colors);
  const next = new Int8Array(states * rule.colors);
  write.set(rule.write);
  turn.set(rule.turn);
  next.set(rule.next);
  // New trailing state: default write color 1, turn right, stay.
  const defW = rule.colors > 1 ? 1 : 0;
  for (let c = 0; c < rule.colors; c++) {
    const idx = rule.states * rule.colors + c;
    write[idx] = defW;
    turn[idx] = TURN_RIGHT;
    next[idx] = 0;
  }
  return { colors: rule.colors, states, write, turn, next };
}

function withRemovedState(rule: Rule): Rule {
  if (rule.states <= 1) return rule;
  const states = rule.states - 1;
  const size = states * rule.colors;
  return {
    colors: rule.colors,
    states,
    write: rule.write.slice(0, size),
    turn: rule.turn.slice(0, size),
    next: rule.next.slice(0, size),
  };
}

/** Exposed for the panel builder; lists palettes for the Display selector. */
export function paletteOptionList(): Array<{ id: string; name: string }> {
  return PALETTES.map((p) => ({ id: p.id, name: p.name }));
}
