/**
 * Palettes for the renderer.
 *
 * `Palette.colors` holds packed 32-bit values aligned with a `Uint32Array`
 * view over `ImageData.data`. The packed layout depends on platform byte
 * order, so colors are built by writing RGBA bytes into a scratch buffer and
 * reading the word back — this yields the correct value on both little- and
 * big-endian platforms and keeps `putImageData` writes branch-free.
 *
 * Index 0 is always the background. Color 0 is written as an opaque pixel so
 * visited-but-reset cells paint the background exactly; unvisited texture
 * area stays transparent and composites over the canvas background fill.
 */

export const PALETTE_COLORS = 32;

export interface Palette {
  readonly id: string;
  readonly name: string;
  /** Packed colors, length PALETTE_COLORS; index 0 = background. */
  readonly colors: Uint32Array;
  /** CSS color of the background (index 0), for canvas fills and panels. */
  readonly backgroundBaseCss: string;
}

const scratch = new ArrayBuffer(4);
const scratchBytes = new Uint8ClampedArray(scratch);
const scratchWords = new Uint32Array(scratch);

/** Build the platform-correct packed value for an RGBA color. */
export function packRGBA(r: number, g: number, b: number, a = 255): number {
  scratchBytes[0] = r;
  scratchBytes[1] = g;
  scratchBytes[2] = b;
  scratchBytes[3] = a;
  return scratchWords[0];
}

/** Decode a packed color back to CSS (used for swatches / status text). */
export function packedToCss(v: number): string {
  scratchWords[0] = v >>> 0;
  return `rgb(${scratchBytes[0]},${scratchBytes[1]},${scratchBytes[2]})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

export function cssToPacked(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return packRGBA(r, g, b);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Generated color for arbitrary indices — a golden-angle hue spread so that
 * consecutive colors are maximally distinguishable even for pastel rules
 * with many colors (up to MAX_COLORS).
 */
export function hueSpreadPacked(i: number): number {
  const h = (i * 137.508) % 360;
  const l = 0.42 + 0.24 * ((i * 0.618) % 1);
  const [r, g, b] = hslToRgb(h, 0.78, l);
  return packRGBA(r, g, b);
}

/** Hue-spread color also as CSS, for UI swatches. */
export function hueSpreadCss(i: number): string {
  return packedToCss(hueSpreadPacked(i));
}

function buildColors(bgHex: string, patternHexes: string[]): Uint32Array {
  const out = new Uint32Array(PALETTE_COLORS);
  out[0] = cssToPacked(bgHex);
  for (let i = 0; i < PALETTE_COLORS - 1; i++) {
    const hex = patternHexes[i % patternHexes.length];
    out[i + 1] = i < patternHexes.length ? cssToPacked(hex) : hueSpreadPacked(i);
  }
  return out;
}

export const PALETTES: Palette[] = [
  {
    id: "classic",
    name: "Classic B/W",
    colors: buildColors("#000000", [
      "#ffffff", "#e8e8e8", "#c8c8c8", "#a8a8a8", "#808080", "#585858", "#383838", "#f4f4f4",
      "#d8d8d8", "#b8b8b8", "#909090", "#686868", "#484848", "#303030", "#f0f0f0", "#d0d0d0",
    ]),
    backgroundBaseCss: "#000000",
  },
  {
    id: "ember",
    name: "Ember",
    colors: buildColors("#170a06", [
      "#ff4d00", "#ffa142", "#ffd166", "#ea3b23", "#8c2f1b", "#ffe3b3", "#ff7a1a", "#c9184a",
      "#ffb56b", "#d63c0f", "#ff9e7a", "#a63d14", "#ffd9a0", "#e0521b", "#b3261e", "#ff6b35",
    ]),
    backgroundBaseCss: "#170a06",
  },
  {
    id: "aurora",
    name: "Aurora",
    colors: buildColors("#04101c", [
      "#23d5ab", "#71f5c8", "#4fa3ff", "#8a7dff", "#d16bff", "#58ef7d", "#b7ff7a", "#57e8ff",
      "#2bb8d4", "#9dffe0", "#6d8bff", "#c77bff", "#40ff9a", "#a2f7ff", "#7ce0ff", "#3ddad0",
    ]),
    backgroundBaseCss: "#04101c",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    colors: buildColors("#123f6d", [
      "#ffffff", "#b9d9f5", "#6fa8dc", "#e8f2fc", "#2d6ea8", "#a4c8e8", "#4f86c6", "#d6e8fa",
      "#7fb3e0", "#3a7ab8", "#f4fafd", "#5e9bd0", "#c2dcf2", "#8bbdda", "#3568a0", "#eaf4fd",
    ]),
    backgroundBaseCss: "#123f6d",
  },
  {
    id: "starry",
    name: "Starry Night",
    colors: buildColors("#0b1d3a", [
      "#f5c518", "#ffe066", "#fff4c2", "#4a7fb5", "#2e5c8a", "#8fb3d9",
      "#2d5a3d", "#6b8f5e", "#c9a227", "#f0e68c", "#1a3a5c", "#7fb3e0",
      "#e8d44d", "#3b6fa0", "#a8c8e8", "#d4af37",
    ]),
    backgroundBaseCss: "#0b1d3a",
  },
];

export const DEFAULT_PALETTE_ID = "classic";

export function paletteById(id: string): Palette {
  for (const p of PALETTES) if (p.id === id) return p;
  return PALETTES[0];
}
