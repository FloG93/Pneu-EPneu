// The contrast ladder every figure shares.
//
// The kit's own tones are calm: the four face tones sit about 3 % apart, which
// is 1.08:1 in the dark. At a desk that is restful; on a projector in a bright
// classroom it disappears. So the figures carry a slider from that quiet
// setting (0 %) through the shipped look (45 %) to a deliberately hard top end
// (100 %), and the step is stored per device in `3d-druck.kontrast`.
//
// Taken from the printer figure in the 3D-Druck repo, where the two ends were
// measured rather than chosen.

export const K_DEFAULT = 0.45;

const TONE_QUIET = {
  dark: {
    "shade-0": "#0f0f0f", "shade-1": "#121212", "shade-2": "#151515", "shade-3": "#181818",
    top: "#1c1c1c", face: "#1b1b1b", "lit-top": "#262626", "lit-shade": "#1d1d1d",
    faint: "#2a2a2a", lo: "#3e3e3e", mid: "#6a6a6a", hi: "#d4d4d4",
  },
  light: {
    "shade-0": "#dcdcd9", "shade-1": "#e5e5e2", "shade-2": "#ededea", "shade-3": "#f4f4f1",
    top: "#ffffff", face: "#ffffff", "lit-top": "#ffffff", "lit-shade": "#eeeeeb",
    faint: "#d4d4d6", lo: "#b4b4b8", mid: "#8a8a8f", hi: "#26262a",
  },
};
const TONE_NOW = {
  dark: {
    "shade-0": "#202020", "shade-1": "#343434", "shade-2": "#484848", "shade-3": "#5c5c5c",
    top: "#6a6a6a", face: "#3d3d3d", "lit-top": "#7e7e7e", "lit-shade": "#5a5a5a",
    faint: "#4a4a4a", lo: "#737373", mid: "#a2a2a2", hi: "#e8e8e8",
  },
  light: {
    "shade-0": "#b9b9b3", "shade-1": "#cdcdc7", "shade-2": "#e0e0db", "shade-3": "#f1f1ed",
    top: "#ffffff", face: "#ffffff", "lit-top": "#ffffff", "lit-shade": "#e0e0db",
    faint: "#b2b2b6", lo: "#8c8c92", mid: "#63636b", hi: "#1a1a1e",
  },
};

export const bytesOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const hexOf = (b) =>
  "#" + b.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const ramp = (von, bis, t) => hexOf(bytesOf(von).map((a, i) => a + (bytesOf(bis)[i] - a) * t));

const TONE_STRONG = Object.fromEntries(
  Object.entries(TONE_QUIET).map(([modus, satz]) => [
    modus,
    Object.fromEntries(Object.keys(satz).map((n) => [n, ramp(satz[n], TONE_NOW[modus][n], 1 / K_DEFAULT)])),
  ]),
);

/** The tone a token has at a given slider position, 0…1. */
export const tonAt = (modus, name, t) => ramp(TONE_QUIET[modus][name], TONE_STRONG[modus][name], t);

const block = (sel, modus) =>
  `${sel} {\n`
  + Object.keys(TONE_QUIET[modus]).map((n) => `  --anatomy-${n}: ${tonAt(modus, n, K_DEFAULT)};`).join("\n")
  + "\n}";

/**
 * The default step, written into the stylesheet as well, so that without
 * JavaScript and before the first paint the same tones apply as with it.
 */
export const TONE_CSS = block(".iso", "dark") + "\n" + block('.iso[data-theme="light"]', "light");

/** The two ends, for the runtime to interpolate between. */
export const TONE_TABELLE = { quiet: TONE_QUIET, strong: TONE_STRONG };
