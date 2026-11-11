// The air: the one thing in these figures that is allowed colour.
//
// Two tones with two different meanings, not just two colours:
//   dark blue  – compressed air under pressure, on its way to a chamber
//   light blue – spent air, already expanded, on its way out through a silencer
//
// They differ in LIGHTNESS rather than in hue, so they stay apart for someone
// who is red-green colour blind and in a black-and-white print. Both are
// checked against the paper and against each other by figur/tests/luft.test.mjs
// rather than being eyeballed — a tone that fails is changed, never the
// threshold.

/** Paper and card, taken from the kit's own stylesheet, to measure against. */
export const PAPIER = { light: "#f4f4f1", dark: "#121212" };

// Compressed air is always the STRONGER tone and spent air the weaker one.
// On paper that means dark blue against pale blue; on a dark ground it turns
// round, exactly as the kit's own tones do (hi is near-white in the dark and
// near-black in the light). The meaning stays put, the lightness follows the
// background — so the explanation says "kräftiges" and "blasses" Blau, not
// "dunkel" and "hell".
export const FARBEN = {
  light: { druck: "#123f87", abluft: "#5a8cbf", rand: "#0b2a5c" },
  dark: { druck: "#7cb8f5", abluft: "#3f6e9e", rand: "#bcd9f7" },
};

const kanal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const bytes = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Relative luminance per WCAG. */
export const leuchtkraft = (hex) => {
  const [r, g, b] = bytes(hex).map(kanal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Contrast ratio between two colours, 1…21. */
export function kontrast(a, b) {
  const la = leuchtkraft(a);
  const lb = leuchtkraft(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const CSS = `
.luft { pointer-events: none }
.kammer { stroke: none; opacity: .82 }
.strom circle { stroke: none }
.pfeil { fill: none; stroke-linecap: round; stroke-linejoin: round }
`;

/**
 * A stream of air as the page needs it: the route projected to screen points
 * with their running length, so the runtime can place particles along it
 * without projecting anything itself.
 */
export function bahn(punkte3, P, iso) {
  const flach = punkte3.map((p) => iso(p, P));
  const laenge = [0];
  for (let i = 1; i < flach.length; i += 1) {
    laenge.push(laenge[i - 1] + Math.hypot(flach[i][0] - flach[i - 1][0], flach[i][1] - flach[i - 1][1]));
  }
  return { punkte: flach.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), laenge, gesamt: laenge[laenge.length - 1] };
}

/**
 * The runtime. Expects `P`, `FARBEN`, `BAHNEN`, `RB`, `ZC` and the `iso`
 * function from the kit to be defined before it. `haltStroeme`, `blendeLeereStroeme` and
 * `setzeRaumFarben` use the page's own `stroeme` and `raeume`.
 */
export const LAUFZEIT = String.raw`
const NSL = "http://www.w3.org/2000/svg";

/** Mix two hex colours. */
function mische(a, b, t) {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const von = parseInt(a.substr(i, 2), 16);
    let v = Math.round(von + (parseInt(b.substr(i, 2), 16) - von) * t);
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    out += (v < 16 ? "0" : "") + v.toString(16);
  }
  return out;
}
const luftFarben = () => FARBEN[document.body.dataset.theme === "light" ? "light" : "dark"];

/** Convex hull, to close a chamber's silhouette around its two end circles. */
function huelle(pts) {
  const s = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bau = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length > 1 && kreuz(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...bau(s), ...bau(s.slice().reverse())];
}

/** The silhouette of the bore between two planes: a chamber of air. */
function kammerPfad(x0, x1) {
  if (x1 - x0 < 0.4) return "";
  const pts = [];
  for (const x of [x0, x1]) {
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      pts.push(iso([x, RB * Math.cos(a), ZC + RB * Math.sin(a)], P));
    }
  }
  return "M" + huelle(pts).map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
}

/** Where a point sits along a projected route, by running length. */
function aufBahn(bahn, at) {
  const L = bahn.laenge;
  let i = 1;
  while (i < L.length - 1 && L[i] < at) i++;
  const t = (at - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  const a = bahn.punkte[i - 1], b = bahn.punkte[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** One stream of particles on a route. */
function stromBauen(wurzel, name, bahn, anzahl) {
  const g = document.createElementNS(NSL, "g");
  g.setAttribute("class", "strom");
  g.dataset.strom = name;
  const kugeln = [];
  for (let i = 0; i < anzahl; i++) {
    const c = document.createElementNS(NSL, "circle");
    c.setAttribute("r", "3.1");
    c.setAttribute("opacity", "0");
    g.append(c);
    kugeln.push(c);
  }
  wurzel.append(g);
  return { g, kugeln, bahn, phase: 0 };
}

/**
 * Advance one stream. tempo is screen units per second, signed: negative
 * runs the other way. staerke 0…1 fades the whole stream out when nothing
 * is flowing, so it stops rather than blinking off.
 */
function stromSchritt(strom, dt, tempo, staerke, farbe) {
  const n = strom.kugeln.length;
  const abstand = strom.bahn.gesamt / n;
  strom.phase = (strom.phase + tempo * dt) % abstand;
  if (strom.phase < 0) strom.phase += abstand;
  for (let i = 0; i < n; i++) {
    const c = strom.kugeln[i];
    if (staerke < 0.02) { c.setAttribute("opacity", "0"); continue; }
    const at = strom.phase + i * abstand;
    const [x, y] = aufBahn(strom.bahn, Math.min(at, strom.bahn.gesamt));
    c.setAttribute("cx", x.toFixed(1));
    c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("fill", farbe);
    // Fade in at the start of the route and out at its end, so no particle
    // pops into being in the middle of a hose.
    const rand = Math.min(1, at / 14, (strom.bahn.gesamt - at) / 14);
    c.setAttribute("opacity", (staerke * Math.max(0, rand) * 0.95).toFixed(2));
  }
}

// The streams stand still and fade out (while a machine is taken apart). Uses the page's stroeme.
function haltStroeme(dt) {
  for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
}

// A stream whose particles are all transparent is hidden as a whole. Uses the page's stroeme.
function blendeLeereStroeme() {
  for (const name in stroeme) {
    const s = stroeme[name];
    const sichtbar = s.kugeln.some((c) => c.getAttribute("opacity") !== "0");
    s.g.style.opacity = sichtbar ? "" : "0";
  }
}

// Paint every room of the drawing (the page's raeume, [data-raum]) with the tone its number has in farbe.
function setzeRaumFarben(farbe) {
  for (const el of raeume) {
    const f = farbe[el.dataset.raum];
    if (el.getAttribute("fill") !== f) el.setAttribute("fill", f);
  }
}
`;
