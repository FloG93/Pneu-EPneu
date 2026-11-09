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
import { normteile } from "./normteile.mjs";

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

export function gehaeuseSchnitt({ P, R, PIECE_OF, MOVE, FX, FY, FZ, NUTEN, STEGE, FOLGE, PORT, RB, R_NUT, ZA, GEH, PLATTE, DICHT, R_KANAL, ZP, R_GEWINDE, Y_BOHR }) {
  const rec = R.solid;
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const L = (d, style) => k.lineSvg(d, style);
  const ring3 = (punkte) => SCH.pfad(punkte.map(at));

  // The recorder's items: every put belongs to the drawing group set last with
  // gruppe(); hub parts ride with the spool, variant parts belong to one variant.
  let GRUPPE = "grundplatte";
  const gruppe = (g) => { GRUPPE = g; };
  function put(pos, svg, shapes = [], extra = {}) {
    const { bias = 0, gruppe: gr = GRUPPE, name = gr, hub = false, variante = null, ...rest } = extra;
    let inhalt = svg;
    // Parts that ride with the spool sit in an inner group the page shifts;
    // the outer group stays where it is.
    if (hub) inhalt = `<g data-hub="">${inhalt}</g>`;
    if (variante) inhalt = `<g data-variante="${variante}">${inhalt}</g>`;
    R.put({ name: R.nameFor(name), piece: PIECE_OF[gr], label: PIECE_OF[gr], move: MOVE[PIECE_OF[gr]], at: pos, pos, bias, gruppe: gr, svg: inhalt, shapes: shapes.flat(), ...rest });
  }
  // The shared standard parts (figur/normteile.mjs) draw into this figure's recorder.
  const NT = normteile({ P, rec, put, gruppe });
  const { flach, schnitt } = NT;
  const SV = (paths, style) => k.solidSvg(paths, style);
  const linie = (punkte) => punkte.map(at).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

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


  // The cut steps: behind the port axis it runs at y = 0 like the body, in front
  // it drops to the port axis, so each port is seen as an L — down from the
  // groove, then forward to the thread — and the fittings stay whole.
  const STUFE = { y0: 0, y1: PLATTE.y1, z1: ZP };
  const STUECKE = [PLATTE.x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_GEWINDE, PORT[nr] + R_GEWINDE]), PLATTE.x1];

  function grundplatte() {
    gruppe("grundplatte");
    const hinten = { x0: PLATTE.x0, x1: PLATTE.x1, y0: PLATTE.y0, y1: 0, z0: 0, z1: PLATTE.z1 };
    const teile = [
      `<path class="iso-halo" d="${k.haloOf({ x: PLATTE.x0, y: PLATTE.y0, w: PLATTE.x1 - PLATTE.x0, d: PLATTE.y1 - PLATTE.y0, r: 2 }, 0, PLATTE.z1, P)}"/>`,
      flach([[hinten.x0, hinten.y0, hinten.z1], [hinten.x1, hinten.y0, hinten.z1], [hinten.x1, 0, hinten.z1], [hinten.x0, 0, hinten.z1]], [0, 0, 1]),
      flach([[hinten.x1, hinten.y0, 0], [hinten.x1, 0, 0], [hinten.x1, 0, hinten.z1], [hinten.x1, hinten.y0, hinten.z1]], [1, 0, 0]),
    ];
    // Behind the cut: the end of each port drilling and the channel coming down into it.
    const innenTeile = [];
    for (const nr of FOLGE) {
      const x = PORT[nr];
      const F = FY(x, ZP);
      innenTeile.push(flach(Array.from({ length: 37 }, (_, i) => G.pointOf(F, Y_BOHR, R_GEWINDE, (i / 36) * TAU)), [0, 1, 0]));
      innenTeile.push(bohrungInnen(F, Y_BOHR, 0, R_GEWINDE, 0, TAU, 48));
      innenTeile.push(kanalInnen(x, aufGewinde(x), () => PLATTE.z1));
    }
    teile.push(nahtlos(innenTeile.join("")));
    // The cut face behind the step: between the ports, each piece bounded by the
    // channel above and the half-round of the port drilling below.
    const tiefe = Math.sqrt(R_GEWINDE ** 2 - R_KANAL ** 2);
    const kanten = [];
    const halb = (x, von, bis) => bogen(von, bis, 12).map((t) => [x + R_GEWINDE * Math.cos(t), 0, ZP + R_GEWINDE * Math.sin(t)]);
    const grenzen = [PLATTE.x0, ...FOLGE.map((nr) => PORT[nr]), PLATTE.x1];
    for (let i = 0; i < grenzen.length - 1; i += 1) {
      const links = i > 0 ? grenzen[i] : null;
      const rechts = i < grenzen.length - 2 ? grenzen[i + 1] : null;
      const punkte = [];
      if (links === null) punkte.push([PLATTE.x0, 0, ZP]);
      else punkte.push(...halb(links, Math.atan2(tiefe, R_KANAL), 0), [links + R_GEWINDE, 0, ZP]);
      if (rechts === null) punkte.push([PLATTE.x1, 0, ZP], [PLATTE.x1, 0, PLATTE.z1]);
      else punkte.push(...halb(rechts, Math.PI, Math.PI - Math.atan2(tiefe, R_KANAL)), [rechts - R_KANAL, 0, PLATTE.z1]);
      if (links === null) punkte.push([PLATTE.x0, 0, PLATTE.z1]);
      else punkte.push([links + R_KANAL, 0, PLATTE.z1]);
      if (links !== null) punkte.push([links + R_KANAL, 0, ZP + tiefe]);
      // `halb` from the port's right already starts at the channel wall.
      teile.push(schnitt(punkte));
      kanten.push(ring3(punkte));
    }
    teile.push(L(kanten.join(""), { tone: "mid" }));
    teile.push(L(linie([[hinten.x0, hinten.y0, hinten.z1], [hinten.x1, hinten.y0, hinten.z1], [hinten.x1, hinten.y0, 0], [hinten.x1, 0, 0]])
      + linie([[hinten.x1, hinten.y0, hinten.z1], [hinten.x1, 0, hinten.z1]]), { tone: "mid" }));
    put([(PLATTE.x0 + PLATTE.x1) / 2, -12, ZP], teile.join(""), [
      box([hinten.x0, hinten.y0, 0], [hinten.x1, 0, hinten.z1], { name: "grundplatte.hinten", ground: true }),
    ], { name: "grundplatte.hinten" });

    // The step in front, one piece between two ports. Each piece carries the
    // trough of the port to its right: you look into it over this piece, and
    // the next piece covers its near wall.
    for (let i = 0; i < STUECKE.length; i += 2) {
      const [xa, xb] = [STUECKE[i], STUECKE[i + 1]];
      const st = [];
      st.push(schnitt([[xa, 0, ZP], [xb, 0, ZP], [xb, STUFE.y1, ZP], [xa, STUFE.y1, ZP]]));
      if (xb === PLATTE.x1) st.push(flach([[xb, 0, 0], [xb, STUFE.y1, 0], [xb, STUFE.y1, ZP], [xb, 0, ZP]], [1, 0, 0]));
      const nr = FOLGE[i / 2];
      const formen = [box([xa, 0, 0], [xb, STUFE.y1 - 0.1, ZP], { name: "grundplatte.stufe", ground: true })];
      if (nr !== undefined) {
        const x = PORT[nr];
        st.push(nahtlos(bohrungInnen(FY(x, ZP), 0, STUFE.y1, R_GEWINDE, Math.PI, TAU, 48)));
        formen.push(unterLoch(x, ZP, R_GEWINDE, 0, STUFE.y1 - 0.1, 0, { name: "grundplatte.stufe", ground: true }));
      }
      st.push(L(ring3([[xa, 0, ZP], [xb, 0, ZP], [xb, STUFE.y1, ZP], [xa, STUFE.y1, ZP]]), { tone: "mid" }));
      if (xb === PLATTE.x1) st.push(L(linie([[xb, 0, 0], [xb, STUFE.y1, 0], [xb, STUFE.y1, ZP]]), { tone: "mid" }));
      put([(xa + xb) / 2, STUFE.y1 / 2, ZP / 2], st.join(""), formen, { name: "grundplatte.stufe" });
    }

    // The front face with the five threads, cut in half by the step.
    const vorne = [[PLATTE.x0, PLATTE.y1, 0], [PLATTE.x1, PLATTE.y1, 0], [PLATTE.x1, PLATTE.y1, ZP]];
    for (const nr of FOLGE.slice().reverse()) {
      const x = PORT[nr];
      vorne.push(...bogen(0, -Math.PI, 18).map((t) => [x + R_GEWINDE * Math.cos(t), PLATTE.y1, ZP + R_GEWINDE * Math.sin(t)]));
    }
    vorne.push([PLATTE.x0, PLATTE.y1, ZP]);
    const vornFormen = [];
    for (let i = 0; i < STUECKE.length; i += 2) {
      vornFormen.push(box([STUECKE[i], PLATTE.y1 - 0.1, 0], [STUECKE[i + 1], PLATTE.y1, ZP], { name: "grundplatte.front", ground: true }));
      const nr = FOLGE[i / 2];
      if (nr !== undefined) vornFormen.push(unterLoch(PORT[nr], ZP, R_GEWINDE, PLATTE.y1 - 0.1, PLATTE.y1, 0, { name: "grundplatte.front", ground: true }));
    }
    put([(PLATTE.x0 + PLATTE.x1) / 2, PLATTE.y1, ZP / 2], [
      flach(vorne, [0, 1, 0]),
      L(ring3(vorne), { tone: "mid" }),
    ].join(""), vornFormen, { name: "grundplatte.front" });
  }


  function dichtung() {
    gruppe("dichtung");
    const { x0, x1, y0, z0, z1 } = DICHT;
    const teile = [
      flach([[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [x0, 0, z1]], [0, 0, 1]),
      flach([[x1, y0, z0], [x1, 0, z0], [x1, 0, z1], [x1, y0, z1]], [1, 0, 0]),
    ];
    const innenTeile = FOLGE.map((nr) => kanalInnen(PORT[nr], () => z0, () => z1));
    teile.push(nahtlos(innenTeile.join("")));
    const grenzen = [x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_KANAL, PORT[nr] + R_KANAL]), x1];
    const kanten = [];
    for (let i = 0; i < grenzen.length; i += 2) {
      const q = [[grenzen[i], 0, z0], [grenzen[i + 1], 0, z0], [grenzen[i + 1], 0, z1], [grenzen[i], 0, z1]];
      teile.push(schnitt(q));
      kanten.push(ring3(q));
    }
    // The front edges are the outlines of the cut pieces; a box edge there
    // would run straight across the channels.
    teile.push(L(kanten.join("") + linie([[x0, 0, z1], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, 0, z0]])
      + linie([[x1, y0, z1], [x1, 0, z1]]), { tone: "mid" }));
    put([(x0 + x1) / 2, y0 / 2, (z0 + z1) / 2], teile.join(""),
      [box([x0, y0, z0], [x1, 0, z1], { name: "dichtung.platte" })], { name: "dichtung.platte" });
  }


  // Two items, because the spool lies between them in depth: the part above the
  // bore covers the top of the spool's back half, the spool covers the rest.
  function gehaeuse() {
    gruppe("gehaeuse");
    const { x0, x1, y0, z0, z1 } = GEH;
    const stege = STEGE;

    // Below the axis: the bore, the channels and the lower cut face.
    const unten = [];
    const innenTeile = [gehaeuseBohrung()];
    for (const nr of FOLGE) innenTeile.push(nahtlos(kanalInnen(PORT[nr], () => z0, aufNut)));
    unten.push(...innenTeile);
    unten.push(flach([[x1, y0, z0], [x1, 0, z0], [x1, 0, ZA - RB],
      ...bogen((3 * Math.PI) / 2, Math.PI, 12).map((t) => G.pointOf(FX, x1, RB, t)), [x1, y0, ZA]], [1, 0, 0]));
    const schlitze = [x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_KANAL, PORT[nr] + R_KANAL]), x1];
    const kantenU = [];
    for (let i = 0; i < schlitze.length; i += 2) {
      const [a, b] = [schlitze[i], schlitze[i + 1]];
      const q = [[a, 0, z0], [b, 0, z0], ...bohrungsKante(b, a, -1)];
      unten.push(schnitt(q));
      kantenU.push(ring3(q));
    }
    unten.push(L(kantenU.join("") + linie([[x1, y0, ZA], [x1, y0, z0], [x1, 0, z0]]), { tone: "mid" }));
    const formenU = [
      box([x0, y0, z0], [x1, 0, ZA - R_NUT], { name: "gehaeuse.unten" }),
      box([x0, y0, ZA - R_NUT], [x1, -R_NUT, ZA + R_NUT], { name: "gehaeuse.unten" }),
      ...stege.flatMap(([a, b]) => [
        box([a, -R_NUT, ZA - R_NUT], [b, 0, ZA - RB], { name: "gehaeuse.unten" }),
        box([a, -R_NUT, ZA - RB], [b, -RB, ZA + RB], { name: "gehaeuse.unten" }),
      ]),
    ];
    put([(x0 + x1) / 2, -10, ZA - 12], unten.join(""), formenU, { name: "gehaeuse.unten" });

    // Above the axis: the upper cut face, the top and the port numbers on it,
    // the way they are cast into a real body.
    const oben = [];
    const qOben = [[x0, 0, z1], [x1, 0, z1], ...bohrungsKante(x1, x0, 1)];
    oben.push(flach([[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [x0, 0, z1]], [0, 0, 1]));
    oben.push(flach([[x1, y0, ZA], [x1, -RB, ZA],
      ...bogen(Math.PI, Math.PI / 2, 12).map((t) => G.pointOf(FX, x1, RB, t)), [x1, 0, z1], [x1, y0, z1]], [1, 0, 0]));
    oben.push(schnitt(qOben));
    for (const nr of FOLGE) {
      oben.push(k.faceTextSvg(k.topMatrix([PORT[nr], -9.5], z1, P), String(nr), { size: 8, tone: "mid", anchor: "middle" }));
    }
    oben.push(L(ring3(qOben) + linie([[x0, 0, z1], [x0, y0, z1], [x1, y0, z1], [x1, 0, z1]])
      + linie([[x1, y0, z1], [x1, y0, ZA]]), { tone: "mid" }));
    const formenO = [
      box([x0, y0, ZA + R_NUT], [x1, 0, z1], { name: "gehaeuse.oben" }),
      ...stege.map(([a, b]) => box([a, -R_NUT, ZA + RB], [b, 0, ZA + R_NUT], { name: "gehaeuse.oben" })),
    ];
    put([(x0 + x1) / 2, -10, ZA + 14], oben.join(""), formenO, { name: "gehaeuse.oben" });
  }


  return { put, inGruppe: gruppe, NT, flach, schnitt, rec, grundplatte, dichtung, gehaeuse, innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung, kanalInnen, aufNut, aufGewinde, box, boxenOhne, unterLoch, schnittEnde };
}
