// The cut-open body of a spool valve, drawn the same way for every valve of
// the collection: the inside of a bore, a ring groove and a channel as the
// patches of a concave surface that face the viewer (with the dark tones a
// cavity gets), the groove flanks, the bore's outline on the cut face, and
// the axis boxes the audit records as the material around them. It knows no
// valve: the 5/2 and the 3/2 build scripts hand in their own bore, grooves
// and channels, and keep their dimensions.
//
// Pure helpers, exported by name:
//   bogen(von, bis, n)        n + 1 angles from von to bis
//   hohlTon(band)             the tone of a cavity: only the two darkest
//   nahtlos(inhalt)           group whose tone patches share one stroke colour
//   ohne(min, max, loecher)   a box minus axis-aligned holes, as [min, max] pairs
//
// Everything that draws needs the projection and the recorder, so it comes
// from a factory without global state (the parameters keep the names the
// build scripts use for them):
//   const GH = gehaeuseSchnitt({ P, rec, FX, FZ, NUTEN, RB, R_NUT, ZA, GEH, R_KANAL, ZP, R_GEWINDE });
//     P          projection of the figure
//     rec        recorder.solid, to register shapes for the audit
//     FX         frame along the spool axis; FZ(x, y) the frame of a vertical channel
//     NUTEN      the ring grooves as [x0, x1] pairs; RB bore radius, R_NUT groove radius
//     ZA         height of the spool axis; GEH { x0, x1 } housing ends
//     R_KANAL    channel radius; ZP, R_GEWINDE port axis height and thread radius
//   GH.innen(ecke, normale, winkel)        inside of a concave surface by angle
//   GH.bohrungInnen(F, s0, s1, r, a0, a1)  inside of a round bore along a frame
//   GH.flanke(F, s, rIn, rOut, a0, a1, n)  half annulus (a groove flank)
//   GH.rBohrung(x)                         bore radius at x (groove or bore)
//   GH.bohrungsKante(a, b, seite)          bore outline on the cut face
//   GH.gehaeuseBohrung()                   the bore with webs, grooves, flanks
//   GH.kanalInnen(x, z0, z1)               inside of a channel, ends by function
//   GH.aufNut, GH.aufGewinde(x)            channel ends on the groove and on the thread
//   GH.box, GH.boxenOhne, GH.unterLoch     recorded material (long blocks split along x)
//   GH.schnittEnde(punkte, rAussen, rInnen) cut end of a hose

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "./schnitt.mjs";

const TAU = Math.PI * 2;

export const bogen = (von, bis, n) => Array.from({ length: n + 1 }, (_, i) => von + ((bis - von) * i) / n);

/**
 * Inside a bore, a groove or a channel little light gets in: a cavity takes
 * only the two darkest tones, so it reads as a hollow behind the bright cut.
 */
export const hohlTon = (band) => (band >= 3 ? 1 : 0);

/** Seamless group: abutting tone patches are stroked in their own colour, so no hairline shows. */
export const nahtlos = (inhalt) => `<g class="iso-solid" data-seamless="">${inhalt}</g>`;

/** A box minus axis-aligned holes, as [min, max] pairs. */
export function ohne(min, max, loecher) {
  let teile = [[min, max]];
  for (const [lmin, lmax] of loecher) {
    teile = teile.flatMap(([a0, b0]) => {
      const lo = [0, 1, 2].map((j) => Math.max(a0[j], lmin[j]));
      const hi = [0, 1, 2].map((j) => Math.min(b0[j], lmax[j]));
      if (lo.some((v, j) => v >= hi[j] - 1e-9)) return [[a0, b0]];
      const raus = [];
      const a = a0.slice(), b = b0.slice();
      for (const j of [0, 1, 2]) {
        if (a[j] < lo[j]) { const q1 = b.slice(); q1[j] = lo[j]; raus.push([a.slice(), q1]); a[j] = lo[j]; }
        if (b[j] > hi[j]) { const q0 = a.slice(); q0[j] = hi[j]; raus.push([q0, b.slice()]); b[j] = hi[j]; }
      }
      return raus;
    });
  }
  return teile;
}

export function gehaeuseSchnitt({ P, rec, FX, FZ, NUTEN, RB, R_NUT, ZA, GEH, R_KANAL, ZP, R_GEWINDE }) {
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const L = (d, style) => k.lineSvg(d, style);
  const ring3 = (punkte) => SCH.pfad(punkte.map(at));

  /**
   * The visible inside of a concave round surface: patches of a cylinder (or of
   * anything parametrised by an angle) whose inward normal faces the viewer,
   * merged into one polygon per run of equal tone. `ecke(theta, 0|1)` gives the
   * two ends of the generator at that angle, `normale(theta)` the inward normal.
   */
  function innen(ecke, normale, winkel) {
    const teile = [];
    let lauf = null;
    const aus = () => {
      if (lauf) {
        const punkte = [...lauf.w.map((t) => ecke(t, 0)), ...lauf.w.slice().reverse().map((t) => ecke(t, 1))];
        teile.push(`<path class="iso-shade" data-shade="${lauf.band}" d="${ring3(punkte)}"/>`);
      }
      lauf = null;
    };
    for (let i = 0; i < winkel.length - 1; i += 1) {
      const n = normale((winkel[i] + winkel[i + 1]) / 2);
      if (G.dot3(n, V) <= 0) { aus(); continue; }
      const band = hohlTon(G.toneOf(n, P));
      if (lauf && lauf.band === band) lauf.w.push(winkel[i + 1]);
      else { aus(); lauf = { band, w: [winkel[i], winkel[i + 1]] }; }
    }
    aus();
    return teile.join("");
  }

  /** The inside of a round bore along the frame's axis between s0 and s1, over angles a0…a1. */
  function bohrungInnen(F, s0, s1, r, a0, a1, n = 36) {
    return innen(
      (t, e) => G.pointOf(F, e ? s1 : s0, r, t),
      (t) => G.mul3(G.radialOf(F, t), -1),
      bogen(a0, a1, n),
    );
  }

  /** Half an annulus on the plane s of frame F (a groove flank), between rIn and rOut. */
  function flanke(F, s, rIn, rOut, a0, a1, normale, n = 24) {
    const w = bogen(a0, a1, n);
    const punkte = [...w.map((t) => G.pointOf(F, s, rOut, t)), ...w.slice().reverse().map((t) => G.pointOf(F, s, rIn, t))];
    return `<path class="iso-shade" data-shade="${hohlTon(G.toneOf(normale, P))}" d="${ring3(punkte)}"/>`;
  }

  /** The bore radius at x: the groove radius inside a ring groove, else the bore. */
  function rBohrung(x) {
    return NUTEN.some(([a, b]) => x > a + 1e-9 && x < b - 1e-9) ? R_NUT : RB;
  }
  /** The bore's outline on the cut face, from x = a to x = b, at the side `seite` (+1 top, −1 bottom). */
  function bohrungsKante(a, b, seite) {
    const kanten = NUTEN.flat().filter((x) => x > Math.min(a, b) + 1e-9 && x < Math.max(a, b) - 1e-9);
    if (a > b) kanten.reverse();
    const z = (r) => ZA + seite * r;
    const richtung = Math.sign(b - a);
    const punkte = [[a, 0, z(rBohrung(a + richtung * 0.01))]];
    for (const x of kanten) {
      punkte.push([x, 0, z(rBohrung(x - richtung * 0.01))]);
      punkte.push([x, 0, z(rBohrung(x + richtung * 0.01))]);
    }
    punkte.push([b, 0, z(rBohrung(b - richtung * 0.01))]);
    return punkte;
  }

  /** The inside of the spool bore in the housing: webs, groove floors and the flanks you can see. */
  function gehaeuseBohrung() {
    const teile = [];
    const kanten = [GEH.x0, ...NUTEN.flat(), GEH.x1];
    for (let i = 0; i < kanten.length - 1; i += 1) {
      const [a, b] = [kanten[i], kanten[i + 1]];
      teile.push(bohrungInnen(FX, a, b, rBohrung((a + b) / 2), Math.PI / 2, (3 * Math.PI) / 2));
    }
    // Only the flank at the start of each groove faces the viewer (+x).
    for (const [a] of NUTEN) teile.push(flanke(FX, a, RB, R_NUT, Math.PI / 2, (3 * Math.PI) / 2, [1, 0, 0]));
    return nahtlos(teile.join(""));
  }

  /**
   * The inside of a vertical channel (back half), from z0(theta) to z1(theta).
   * The ends are where it meets the bore of the port below and the groove above.
   */
  function kanalInnen(x, z0, z1, n = 24) {
    const F = FZ(x, 0);
    return innen(
      (t, e) => {
        const p = G.pointOf(F, 0, R_KANAL, t);
        return [p[0], p[1], e ? z1(p) : z0(p)];
      },
      (t) => G.mul3(G.radialOf(F, t), -1),
      bogen(Math.PI, TAU, n),
    );
  }
  const aufNut = (p) => ZA - Math.sqrt(R_NUT ** 2 - p[1] ** 2);
  const aufGewinde = (x) => (p) => ZP + Math.sqrt(Math.max(0, R_GEWINDE ** 2 - (p[0] - x) ** 2));

  /**
   * Recorded material is a set of axis boxes. A long block is split along x:
   * the crowding check reads anything four times longer than thick as a rod,
   * and a body is not a rod.
   */
  const LAENGSTENS = 24;
  function box(min, max, meta) {
    const n = Math.max(1, Math.ceil((max[0] - min[0]) / LAENGSTENS - 1e-9));
    return Array.from({ length: n }, (_, i) => rec(A.box(
      [min[0] + ((max[0] - min[0]) * i) / n, min[1], min[2]],
      [min[0] + ((max[0] - min[0]) * (i + 1)) / n, max[1], max[2]], meta)));
  }

  const boxenOhne = (min, max, loecher, meta) => ohne(min, max, loecher).flatMap(([a, b]) => box(a, b, meta));

  /**
   * The material under a round hole along y (centre x, z = zm, radius r), as a
   * staircase of strips that never rises above the hole's wall: what is
   * recorded there may not stand in front of a stub lying in the hole.
   */
  function unterLoch(x, zm, r, y0, y1, z0, meta, n = 8) {
    return Array.from({ length: n }, (_, i) => {
      const [u, v] = [x - r + (2 * r * i) / n, x - r + (2 * r * (i + 1)) / n];
      const d = u <= x && v >= x ? 0 : Math.min(Math.abs(u - x), Math.abs(v - x));
      return box([u, y0, z0], [v, y1, zm - Math.sqrt(r * r - d * d)], meta);
    }).flat();
  }

  /** The cut end of a hose: its wall as a ring and the dark bore inside. */
  function schnittEnde(punkte, rAussen, rInnen) {
    const ende = punkte[punkte.length - 1];
    const vor = punkte[punkte.length - 2];
    const F = G.frameAlong(ende, G.unit3(G.sub3(ende, vor)));
    const band = G.toneOf(F.a, P);
    const ringPfad = (r) => Array.from({ length: 41 }, (_, i) => at(G.pointOf(F, 0, r, (i / 40) * TAU)));
    if (G.dot3(F.a, V) <= 0) return "";
    return [
      `<path class="iso-fill" d="${SCH.pfad(ringPfad(rAussen))}"/>`,
      band >= 4 ? `<path class="iso-top" d="${SCH.pfad(ringPfad(rAussen))}"/>` : `<path class="iso-shade" data-shade="${band}" d="${SCH.pfad(ringPfad(rAussen))}"/>`,
      `<path class="iso-shade" data-shade="0" d="${SCH.pfad(ringPfad(rInnen))}"/>`,
      L(SCH.pfad(ringPfad(rAussen)), { tone: "mid" }),
      L(SCH.pfad(ringPfad(rInnen)), { tone: "mid" }),
    ].join("");
  }

  return { innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung, kanalInnen, aufNut, aufGewinde, box, boxenOhne, unterLoch, schnittEnde };
}
