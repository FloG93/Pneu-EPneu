// Drawing helpers for the standard parts every pneumatic figure has: cut
// faces, threads, hose fittings, silencers, screws, hoses and compression
// springs. None of them knows a component; the build script of a figure hands
// in what they need and keeps its own dimensions.
//
// Pure helpers (no projection needed), exported by name:
//   hermite(p0, d0, p1, d1, n)      smooth hose path between two points
//   stummel(p0, aus, p1, ende, g)   hose stub cut off in the air
//   sechskant(r)                    hexagon outline for a prism
//   federPruefen(feder, hub, res)   throws when the spring would go solid
//   SCHNITT_TON, SCHNITT_CSS        the one tone of every cut face
//
// Everything that draws needs the projection P, the recorder and the "put"
// function of the build script, so it comes from a factory without any global
// state:
//   const NT = normteile({ P, rec, put, gruppe });
//     P        projection of the figure
//     rec      recorder.solid, to register shapes for the audit
//     put      put(pos, svg, shapes, extra) of the build script
//     gruppe   gruppe(name) sets the drawing group the next put belongs to
//   NT.flach(punkte, normale)            outer face shaded by its normal
//   NT.schnitt(punkte)                   cut face (SCHNITT_TON, data-schnitt)
//   NT.schraubenkopf(F, s0, s1, r)       hexagon-socket screw head
//   NT.gewinde(F, s0, s1, r)             threaded stub, thread as rings
//   NT.verschraubung(F, D, gruppe, name, ort, rGewinde)
//        push-in fitting D = { gewinde, sechskant, rS, koerper, rK, ring, rR };
//        ort([a, b]) gives the middle of a range along the axis
//   NT.schalldaempfer(F, D, nr, ort, rGewinde)
//        silencer D = { gewinde, sechskant, rS, hals, rH, sinter, rD, kuppe }
//   NT.druckfeder(F, fa, fb, feder)      coil of a compression spring as one
//        <g data-federx> per tube piece, back to front; feder = { draht,
//        windungen, rWindung }

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "./schnitt.mjs";

const TAU = Math.PI * 2;

/** A smooth hose between two points, leaving and arriving along the given tangents. */
export function hermite(p0, d0, p1, d1, n = 30) {
  const punkte = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n, t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    punkte.push([0, 1, 2].map((j) => h00 * p0[j] + h10 * d0[j] + h01 * p1[j] + h11 * d1[j]));
  }
  return punkte;
}

/**
 * A hose stub cut off in the air: a short straight piece out of the fitting,
 * so its end sits flush in the collet, then a gentle curve to the cut.
 */
export function stummel(p0, aus, p1, ende, gerade = 6) {
  const a0 = p0.map((v, j) => v + aus[j] * gerade);
  const laenge = Math.hypot(...p1.map((v, j) => v - a0[j]));
  return [p0, ...hermite(a0, aus.map((v) => v * laenge), p1, ende.map((v) => v * laenge), 24)];
}

/** The outline of a hexagon (a nut or a fitting's flats), corner first at 30°. */
export const sechskant = (r) => Array.from({ length: 6 }, (_, i) => [r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);

/**
 * A cut face: where the saw went through the material. One tone for every
 * cut face of the figure, so the section reads as one plane; `data-schnitt`
 * lets the page give it its own colour.
 */
export const SCHNITT_TON = 3;

/**
 * The cut faces' own tone, one calm warm grey per mode: darker than every
 * outer face in light, lighter than them in dark, ≥ 3:1 against the paper in
 * both. The data-shade above is only the fallback without this rule.
 */
export const SCHNITT_CSS = `
.iso { --schnitt: #8a877f }
.iso[data-theme="light"] { --schnitt: #8f8c85 }
.iso-svg .iso-shade[data-schnitt] { fill: var(--schnitt) }
`;

/**
 * The spring has to compress by the full stroke without going solid: at full
 * stroke its length must stay above the block length (n + 1)·d. `feder` is
 * { laenge (at rest), draht, windungen }; returns the report line, throws if
 * the reserve is missed.
 */
export function federPruefen(feder, hub, reserve) {
  const gespannt = feder.laenge - hub;
  const block = (feder.windungen + 1) * feder.draht;
  const text = `Feder: ${feder.laenge.toFixed(2)} mm in Ruhe, ${gespannt.toFixed(2)} mm bei vollem Hub, Blocklänge `
    + `(${feder.windungen} + 1) · ${feder.draht} = ${block.toFixed(2)} mm, Reserve ${(gespannt - block).toFixed(2)} mm`;
  if (gespannt < block + reserve) {
    throw new Error(`Feder geht auf Block: ${text} (verlangt ≥ ${reserve} mm)`);
  }
  return text;
}

export function normteile({ P, rec, put, gruppe }) {
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const SV = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const ring3 = (punkte) => SCH.pfad(punkte.map(at));

  /** A flat outer face, shaded by its normal like every solid of the kit. */
  const flach = (punkte, normale) => SCH.flaeche(punkte.map(at), normale, P);

  const schnitt = (punkte) => `<path class="iso-shade" data-shade="${SCHNITT_TON}" data-schnitt="" d="${ring3(punkte)}"/>`;

  function schraubenkopf(F, s0, s1, r) {
    const sechs = Array.from({ length: 6 }, (_, i) => [0.42 * r * Math.cos((i * Math.PI) / 3), 0.42 * r * Math.sin((i * Math.PI) / 3)]);
    const innen6 = sechs.map(([u, v]) => k.iso(G.add3(G.add3(G.pointOf(F, s1, 0, 0), G.mul3(F.u, u)), G.mul3(F.v, v)), P));
    return [
      SV(G.disc(s0, s1, r, F, P), { tone: "mid" }),
      `<path class="iso-shade" data-shade="0" d="${SCH.pfad(innen6)}"/>`,
      L(SCH.pfad(innen6), { tone: "mid" }),
    ].join("");
  }

  /** A threaded stub inside a half-cut hole: whole, with its thread as rings. */
  function gewinde(F, s0, s1, r) {
    const ringe = [];
    for (let s = s0 + 1; s < s1 - 0.4; s += 1.3) ringe.push(G.arcOf(F, s, r, P));
    return SV(G.disc(s0, s1, r, F, P), { tone: "mid", inner: L(ringe.join(""), { tone: "faint" }) });
  }

  function verschraubung(F, D, gr, name, ort, rGewinde) {
    gruppe(gr);
    put(ort(D.gewinde), gewinde(F, D.gewinde[0], D.gewinde[1], rGewinde),
      [rec(A.disc(F, D.gewinde[0], D.gewinde[1], rGewinde, { name: `${name}.gewinde` }))],
      { name: `${name}.gewinde` });
    const hx = sechskant(D.rS);
    put(ort([D.sechskant[0], D.ring[1]]), [
      SV(G.prismOf(F, hx, D.sechskant[0], D.sechskant[1], P), { tone: "mid" }),
      SV(G.disc(D.koerper[0], D.koerper[1], D.rK, F, P), { tone: "hi" }),
      SV(G.disc(D.ring[0], D.ring[1], D.rR, F, P), { tone: "hi" }),
      L(G.circleOf(F, D.ring[1], D.rR - 0.9, P), { tone: "faint" }),
    ].join(""), [
      rec(A.prism(F, hx, D.sechskant[0], D.sechskant[1], { name: `${name}.sechskant` })),
      rec(A.disc(F, D.koerper[0], D.koerper[1], D.rK, { name: `${name}.koerper` })),
      rec(A.disc(F, D.ring[0], D.ring[1], D.rR, { name: `${name}.ring` })),
    ], { name: `${name}.koerper` });
  }

  /** Threaded stub, hexagon, neck and a sintered-bronze body with a dome. */
  function schalldaempfer(F, D, nr, ort, rGewinde) {
    gruppe("daempfer");
    put(ort(D.gewinde), gewinde(F, D.gewinde[0], D.gewinde[1], rGewinde),
      [rec(A.disc(F, D.gewinde[0], D.gewinde[1], rGewinde, { name: `daempfer.gewinde${nr}` }))], { name: `daempfer.gewinde${nr}` });
    const hx = sechskant(D.rS);
    const ende = D.sinter[1];
    const kuppe = Array.from({ length: 7 }, (_, i) => {
      const t = ((i + 1) / 7) * (Math.PI / 2);
      return [ende + D.kuppe * Math.sin(t), D.rD * Math.cos(t) * 0.999 + 0.001, 1];
    });
    const profil = [[D.sinter[0], D.rD], [ende, D.rD, 1], ...kuppe.slice(0, -1)];
    // Sintered bronze: a field of pores that fades towards the limbs.
    const poren = [];
    let reihe = 0;
    for (let s = D.sinter[0] + 1.2; s < ende - 0.4; s += 1.25, reihe += 1) {
      poren.push(...G.dotsOf(F, s, D.rD, 22, P, { phase: (reihe % 2) * (Math.PI / 22), fade: [0.04, 0.42] }));
    }
    put(ort([D.sechskant[0], ende]), [
      SV(G.prismOf(F, hx, D.sechskant[0], D.sechskant[1], P), { tone: "mid" }),
      SV(G.disc(D.hals[0], D.hals[1], D.rH, F, P), { tone: "mid" }),
      SV(G.solidOf(profil, F, P), { tone: "mid" }),
      k.dotsSvg(poren, { size: 0.55, tone: "hi" }),
    ].join(""), [
      rec(A.prism(F, hx, D.sechskant[0], D.sechskant[1], { name: `daempfer.sechskant${nr}` })),
      rec(A.disc(F, D.hals[0], D.hals[1], D.rH, { name: `daempfer.hals${nr}` })),
      rec(A.solid(F, profil, { name: `daempfer.sinter${nr}` })),
    ], { name: `daempfer.koerper${nr}` });
  }

  /**
   * The coil of a compression spring from s = fa to s = fb along the frame's
   * axis: the wire as a tube along a helix, ground flat at both ends (the
   * last half turn closes up), drawn back to front. Each piece carries the
   * world x of its middle (the spring axis has to run along x): the page compresses the coil by shifting every piece in
   * proportion to its distance from the end wall.
   */
  function druckfeder(F, fa, fb, feder) {
    const R_DRAHT = feder.draht / 2, R_WINDUNG = feder.rWindung, WINDUNGEN = feder.windungen;
    const wendel = Array.from({ length: 221 }, (_, i) => {
      const t = i / 220;
      const w = t * WINDUNGEN * TAU;
      // pitch closes towards the ends: flat seats on the spring plate and the wall
      const zu = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
      const anteil = (0.5 / WINDUNGEN) * zu(t * WINDUNGEN / 0.5) + (1 - 1 / WINDUNGEN) * Math.min(1, Math.max(0, (t * WINDUNGEN - 0.5) / (WINDUNGEN - 1)))
        + (0.5 / WINDUNGEN) * zu((t * WINDUNGEN - (WINDUNGEN - 0.5)) / 0.5);
      return G.pointOf(F, fa + (fb - fa) * anteil, R_WINDUNG, w);
    });
    const draht = tubePieces(wendel, R_DRAHT, P, { maxLength: 4, caps: true })
      .sort((p1, p2) => G.dot3(p1.mid, V) - G.dot3(p2.mid, V));
    return draht.map((teil) => `<g data-federx="${teil.mid[0].toFixed(2)}">${tubeSvg(teil, { tone: "hi" })}</g>`);
  }

  return { flach, schnitt, schraubenkopf, gewinde, verschraubung, schalldaempfer, druckfeder };
}
