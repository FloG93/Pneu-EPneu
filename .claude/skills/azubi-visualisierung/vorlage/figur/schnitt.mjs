// Cutaways: a window cut out of a round body so the mechanism inside is the
// subject. Pneumatic parts are nearly all turned bodies with something working
// inside them, so every figure in this collection needs this.
//
// The kit's `lathe` always sweeps a full revolution, and `prismOf` only takes
// convex outlines, so a half-shell is not directly buildable. Instead the body
// is drawn whole and an opening is cut into its near surface: the window patch
// gives a clip path, what is inside is drawn through it, and the cut edges get
// their real wall thickness. That is the pattern the kit prescribes for
// content seen through an opening, and it keeps every recorded shape true.
//
// Frames here are the kit's: `F = { o, a, u, v }`, a point is `(s, r, angle)`
// with the angle measured from `u` towards `v`.

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";

export const TAU = Math.PI * 2;

/** A closed SVG path through projected points. */
export const pfad = (punkte) =>
  punkte.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";

/**
 * One flat face, shaded by its normal the way the kit shades every other face.
 * Band 4 is the kit's top tone, 0–3 are the sides.
 */
export function flaeche(punkte, normale, P, { fill = true } = {}) {
  const d = pfad(punkte);
  const band = G.toneOf(normale, P);
  const haut = band >= 4 ? `<path class="iso-top" d="${d}"/>` : `<path class="iso-shade" data-shade="${band}" d="${d}"/>`;
  return (fill ? `<path class="iso-fill" d="${d}"/>` : "") + haut;
}

/** The angle at which a round body on frame `F` faces the viewer most directly. */
export function naechsterWinkel(F, P) {
  const V = G.viewOf(P);
  return Math.atan2(G.dot3(V, F.v), G.dot3(V, F.u));
}

/**
 * A patch of a cylindrical surface as projected screen points, walked as a
 * closed ring: along the first end arc, back along the other.
 */
export function flaechenstueck(F, s0, s1, r, a0, a1, P, schritte = 24) {
  const punkte = [];
  const bogen = (s, von, bis) => {
    for (let i = 0; i <= schritte; i += 1) {
      punkte.push(k.iso(G.pointOf(F, s, r, von + ((bis - von) * i) / schritte), P));
    }
  };
  bogen(s0, a0, a1);
  bogen(s1, a1, a0);
  return punkte;
}

/**
 * A window cut into a round body.
 *
 *  - `id` / `defs`  the clip path for everything seen through the opening
 *  - `kanten`       the cut edges with their real wall thickness
 *  - `bohrung`      the inner surface of the far wall, seen through the opening
 *  - `saum`         the lines that bound the opening, drawn last
 *
 * `rAussen`/`rInnen` are the wall, `a0`/`a1` bound the opening.
 */
export function fenster(F, s0, s1, rAussen, rInnen, a0, a1, P, { name }) {
  const id = `fenster-${name}`;
  const clip = pfad(flaechenstueck(F, s0, s1, rAussen, a0, a1, P));

  // The two cut edges: the wall seen end-on, a band from rInnen to rAussen
  // running the length of the opening. Without them the wall reads paper-thin.
  const kante = (winkel, richtung) => {
    const ecken = [
      G.pointOf(F, s0, rInnen, winkel),
      G.pointOf(F, s1, rInnen, winkel),
      G.pointOf(F, s1, rAussen, winkel),
      G.pointOf(F, s0, rAussen, winkel),
    ].map((q) => k.iso(q, P));
    const normale = G.mul3(G.tangentOf(F, winkel), richtung);
    return flaeche(ecken, normale, P);
  };

  // The inner surface of the far wall: the half of the bore pointing away from
  // the viewer. Everything inside the body is drawn on top of it.
  const mitte = naechsterWinkel(F, P);
  const innen = flaechenstueck(F, s0, s1, rInnen, mitte + Math.PI / 2, mitte + (3 * Math.PI) / 2, P, 30);

  return {
    id,
    clip,
    defs: `<clipPath id="${id}"><path d="${clip}"/></clipPath>`,
    kanten: kante(a0, -1) + kante(a1, 1),
    bohrung:
      `<path class="iso-fill" d="${pfad(innen)}"/>`
      + `<path class="iso-shade" data-shade="0" d="${pfad(innen)}"/>`,
    saum:
      k.lineSvg(bogenPfad(F, s0, rAussen, a0, a1, P), { tone: "lo" })
      + k.lineSvg(bogenPfad(F, s1, rAussen, a0, a1, P), { tone: "lo" })
      + [a0, a1]
        .map((w) => k.lineSvg(k.segment(G.pointOf(F, s0, rAussen, w), G.pointOf(F, s1, rAussen, w), P), { tone: "lo" }))
        .join(""),
  };
}

/** An open arc on a round surface between two angles, as a path. */
export function bogenPfad(F, s, r, a0, a1, P, schritte = 24) {
  const punkte = [];
  for (let i = 0; i <= schritte; i += 1) {
    punkte.push(k.iso(G.pointOf(F, s, r, a0 + ((a1 - a0) * i) / schritte), P));
  }
  return punkte.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

/**
 * A disc standing on the axis, filling the bore: a chamber end, a piston face,
 * a column of air. `r` is the radius, `rLoch` an optional bore through it.
 */
export function scheibe(F, s, r, P, { rLoch = 0, schritte = 48 } = {}) {
  const ring = (radius) =>
    Array.from({ length: schritte + 1 }, (_, i) => k.iso(G.pointOf(F, s, radius, (i / schritte) * TAU), P));
  const aussen = pfad(ring(r));
  if (!rLoch) return aussen;
  // Even-odd on the group makes the inner ring a hole.
  return `${aussen}${pfad(ring(rLoch))}`;
}
