// The cut-open body of a spool valve, drawn the same way for every valve of
// the collection: the sub-base with its stepped section, the flat gasket, the
// housing with its bore, ring grooves and channels, the spool with its lands
// and seal rings, the end caps with their pilot pistons, the return spring,
// the screws and the hoses. It also holds what the build script records them
// with: the recorder's `put`, the axis boxes the audit takes as material.
// It knows the build of a longitudinal spool valve, not one particular valve:
// the build script hands in its bore, grooves, channels, lands and dimensions,
// and keeps its tables (PIECE_OF, STAGGER, MOVE, LEGENDE).
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
//   const GH = gehaeuseSchnitt({ P, R, PIECE_OF, MOVE, FX, FY, FZ, NUTEN, STEGE, FOLGE, PORT,
//     RB, R_NUT, ZA, GEH, PLATTE, DICHT, R_KANAL, ZP, R_GEWINDE, Y_BOHR,
//     R_KAMMER, R_KOLBEN, KAPPE, STEUER_V, R_STEUER_GEWINDE, R_STEUER_BOHRUNG, SP,
//     R_HALS, R_BUND, R_RINGNUT, RING_B, R_SCHLAUCH, R_SCHLAUCH_INNEN,
//     R_STEUERSCHLAUCH, R_STEUERSCHLAUCH_INNEN });
//     P            projection of the figure; R the recorder (audit kit)
//     PIECE_OF, MOVE   the assembly of each drawing group, the escape path of each assembly
//     FX           frame along the spool axis; FY(x, z) of a port, FZ(x, y) of a channel
//     NUTEN, STEGE the ring grooves and the webs between them, as [x0, x1] pairs
//     FOLGE, PORT  the ports along the spool and the x of each channel
//     RB, R_NUT    bore radius, groove radius; ZA height of the spool axis
//     GEH, PLATTE, DICHT   housing, sub-base and gasket boxes
//     R_KANAL, ZP, R_GEWINDE, Y_BOHR   channel radius, port axis height, thread radius, end of the port drilling
//     the rest     the dimensions of caps, pilot threads, spool, rings and hoses
//   Drawing a part: GH.grundplatte(), GH.dichtung(), GH.gehaeuse(),
//     GH.schieber({ bunde, ringe, namen, variante, owner }),
//     GH.kappe(gruppe, K, steuerX, links, { nummer, mitPort, ohnePort }),
//     GH.steuerkolben(gruppe, [a, b], name, variante, owner),
//     GH.federsitz(K, FEDER, { variante, owner }),
//     GH.steuerverschraubung(x, suffix, variante), GH.schrauben({ oben, kappen }), GH.schlaeuche(WEGE, { istSteuer, name, variante })
//   GH.put, GH.inGruppe(name), GH.NT (normteile), GH.flach, GH.schnitt, GH.rec
//   Helpers: innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung,
//     kanalInnen, aufNut, aufGewinde, box, boxenOhne, unterLoch, schnittEnde

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "./schnitt.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import { normteile, sechskant } from "./normteile.mjs";

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

export function gehaeuseSchnitt({ P, R, PIECE_OF, MOVE, FX, FY, FZ, NUTEN, STEGE, FOLGE, PORT, RB, R_NUT, ZA, GEH, PLATTE, DICHT, R_KANAL, ZP, R_GEWINDE, Y_BOHR,
  R_KAMMER, R_KOLBEN, KAPPE, STEUER_V, R_STEUER_GEWINDE, R_STEUER_BOHRUNG, SP, R_HALS, R_BUND, R_RINGNUT, RING_B,
  R_SCHLAUCH, R_SCHLAUCH_INNEN, R_STEUERSCHLAUCH, R_STEUERSCHLAUCH_INNEN }) {
  const rec = R.solid;
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const L = (d, style) => k.lineSvg(d, style);
  const ring3 = (punkte) => SCH.pfad(punkte.map(at));

  // The recorder's items: every put belongs to the drawing group set last with
  // gruppe(); hub parts ride with the spool, variant parts belong to one variant.
  let GRUPPE = "grundplatte";
  const gruppe = (g) => { GRUPPE = g; };
  const inGruppe = gruppe;
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



  function schieberProfil({ bunde, ringe }) {
    const f = 0.6;                         // chamfer on every land edge
    const p = [];
    bunde.forEach(([a, b], i) => {
      if (i > 0) p.push([a, R_HALS]);
      p.push([a, R_BUND - f], [a + f, R_BUND]);
      for (const x of ringe.filter((x) => x > a && x < b)) {
        p.push([x - RING_B / 2, R_BUND], [x - RING_B / 2, R_RINGNUT], [x + RING_B / 2, R_RINGNUT], [x + RING_B / 2, R_BUND]);
      }
      p.push([b - f, R_BUND], [b, R_BUND - f]);
      if (i < bunde.length - 1) p.push([b, R_HALS]);
    });
    return p;
  }

  /**
   * A spool with its seal rings. Everything that rides with the spool sits in an
   * inner data-hub group; `variante` wraps it in a group the page shows or hides
   * (a figure with two spools in one bore), `owner` tells the support check that
   * two such spools are not sunk into each other by mistake. `namen` holds the
   * item names { kolben, hinten, vorn }.
   */
  function schieber({ bunde, ringe, namen, variante = null, owner = undefined }) {
    inGruppe("schieber");
    const profil = schieberProfil({ bunde, ringe });
    put([(SP[0] + SP[1]) / 2, 0, ZA], [
      // The true silhouette, not the convex hull: the hull would paint paper
      // over the gaps round the necks, which is exactly where the air flows.
      SV(G.solidOf(profil, FX, P, { fill: "surface" }), { tone: "hi" }),
      L(G.circleOf(FX, SP[1], 2.2, P), { tone: "faint" }),
    ].join(""), [rec(A.solid(FX, profil, { name: namen.kolben, owner }))], { name: namen.kolben, hub: true, variante });

    // Each ring wraps the spool, so it is drawn in two halves: the far half
    // before the spool, the near half after it. Rubber: one dark tone.
    inGruppe("ringe");
    const m = SCH.naechsterWinkel(FX, P);
    // The near half reaches a little past each limb, so the outline belongs to it.
    const [v0, v1] = [m - Math.PI / 2 - 0.1, m + Math.PI / 2 + 0.1];
    const band = (x0, x1, r, a0, a1) => {
      const w = bogen(a0, a1, 24);
      return [...w.map((t) => G.pointOf(FX, x0, r, t)), ...w.slice().reverse().map((t) => G.pointOf(FX, x1, r, t))];
    };
    const sektoren = (x0, x1, a0, a1, name, rIn = R_RINGNUT) => Array.from({ length: 24 }, (_, i) => {
      const [u, v] = [a0 + ((a1 - a0) * i) / 24, a0 + ((a1 - a0) * (i + 1)) / 24];
      const quad = [[rIn, u], [R_BUND, u], [R_BUND, v], [rIn, v]].map(([r, t]) => [r * Math.cos(t), r * Math.sin(t)]);
      return rec(A.prism(FX, quad, x0, x1, { name, owner }));
    });
    const gummi = (punkte) => `<path class="iso-fill" d="${ring3(punkte)}"/><path class="iso-shade" data-shade="0" d="${ring3(punkte)}"/>`;
    for (const x of ringe) {
      const [x0, x1] = [x - RING_B / 2, x + RING_B / 2];
      const kreis = (r) => bogen(0, TAU, 48).map((t) => G.pointOf(FX, x1, r, t));
      const hinten = band(x0, x1, R_BUND, v1, v0 + TAU);
      const innenHinten = band(x0, x1, R_RINGNUT, m - Math.PI / 2, m + Math.PI / 2);
      put([x, 0, ZA], [
        gummi(hinten), gummi(innenHinten),
        `<path class="iso-fill" fill-rule="evenodd" d="${ring3(kreis(R_BUND))}${ring3(kreis(R_RINGNUT))}"/>`,
        `<path class="iso-shade" data-shade="0" fill-rule="evenodd" d="${ring3(kreis(R_BUND))}${ring3(kreis(R_RINGNUT))}"/>`,
        L(ring3(hinten) + ring3(kreis(R_BUND)) + ring3(kreis(R_RINGNUT)), { tone: "hi" }),
      ].join(""), sektoren(x0, x1, v1, v0 + TAU, namen.hinten), { name: namen.hinten, hub: true, variante });
      const vorn = band(x0, x1, R_BUND, v0, v1);
      put([x, 0, ZA], gummi(vorn) + L(ring3(vorn), { tone: "hi" }),
        // Recorded as the skin that is drawn: the rest of the near half sits in
        // the groove, and its end face is hidden behind the neighbouring land.
        // Recorded whole, that end face would read as "spool in front of ring".
        sektoren(x0, x1, v0, v1, namen.vorn, R_BUND - 0.05), { name: namen.vorn, hub: true, variante });
    }
  }

  /**
   * One end cap, cut like the body: the pilot chamber, the drilling up to the
   * pilot port, and the threaded hole for the fitting (half of it is cut away).
   * The cut face is split where the piston, the spring and the fitting's stub
   * lie between its pieces in depth: what is behind them is one item, what is
   * in front of them another.
   */
  /**
   * One end cap, cut like the body: the pilot chamber, the drilling up to the
   * pilot port, and the threaded hole for the fitting (half of it is cut away).
   * The cut face is split where the piston, the spring and the fitting's stub
   * lie between its pieces in depth: what is behind them is one item, what is
   * in front of them another. Options: `nummer(zeichne)` returns the pilot
   * number's drawing (`zeichne(text)` draws one text on the cap's top);
   * `mitPort(svg)` / `ohnePort(svg)` wrap what exists only with / without the
   * pilot port (a variant of the return side), by default the cap always has it.
   */
  function kappe(gruppe, { x0, x1, wand }, steuerX, links, optionen) {
    inGruppe(gruppe);
    const { y0, z0, z1 } = KAPPE;
    const [ka, kb] = links ? [wand, x1] : [x0, wand];        // chamber
    const [wa, wb] = links ? [x0, wand] : [wand, x1];        // end wall
    const zk = ZA + R_KAMMER;
    const zu = ZA - R_KAMMER;
    const zg = z1 - (STEUER_V.gewinde[1] - STEUER_V.gewinde[0]);  // bottom of the thread
    const [ga, gb] = [steuerX - R_STEUER_GEWINDE, steuerX + R_STEUER_GEWINDE];
    const [ba, bb] = [steuerX - R_STEUER_BOHRUNG, steuerX + R_STEUER_BOHRUNG];
    // Recorded material leaves out the thread (a stub sits in it) and the drilling below it.
    // The material behind the thread is an item of its own (see below).
    const loecher = [[[ga, y0, zk], [gb, 0, z1]]];
    const bohrung = [[ba, -R_STEUER_BOHRUNG, zk], [bb, 0, zg]];
    const n = (teil) => `${gruppe}.${teil}`;
    const mitPort = optionen.mitPort ?? ((svg) => svg);
    const ohnePort = optionen.ohnePort ?? (() => "");

    // Behind everything inside: the chamber, the drillings, the cut face below.
    const unten = [];
    const innenTeile = [bohrungInnen(FX, ka, kb, R_KAMMER, Math.PI / 2, (3 * Math.PI) / 2)];
    // The chamber's closed end below the axis; the half above belongs to the end wall item.
    if (links) innenTeile.push(flanke(FX, wand, 0, R_KAMMER, Math.PI, (3 * Math.PI) / 2, [1, 0, 0]));
    unten.push(nahtlos(innenTeile.join("")));
    // The pilot drilling, its far half.
    unten.push(mitPort(nahtlos(innen(
      (t, e) => { const p = G.pointOf(FZ(steuerX, 0), 0, R_STEUER_BOHRUNG, t); return [p[0], p[1], e ? zg : ZA + Math.sqrt(R_KAMMER ** 2 - p[1] ** 2)]; },
      (t) => G.mul3(G.radialOf(FZ(steuerX, 0), t), -1),
      bogen(Math.PI, TAU, 12),
    ))));
    const qU = links
      ? [[x0, 0, z0], [x1, 0, z0], [x1, 0, zu], [wand, 0, zu], [wand, 0, ZA], [x0, 0, ZA]]
      : [[x0, 0, z0], [wand, 0, z0], [wand, 0, zu], [x0, 0, zu]];
    unten.push(schnitt(qU), L(ring3(qU), { tone: "mid" }));
    put([(ka + kb) / 2, -10, zu - 4], unten.join(""), [
      // Below the chamber, and the wall behind it. On the left the wall behind
      // runs the full length, so no face of this item is buried in the end wall.
      box([x0, y0, z0], [links ? x1 : wand, 0, zu], { name: n("unten") }),
      box([x0, y0, zu], [links ? x1 : wand, -R_KAMMER, zk], { name: n("unten") }),
      ...(links ? [box([wa, -R_KAMMER, zu], [wb, 0, ZA], { name: n("unten") })] : []),
    ], { name: n("unten") });

    // The back wall of the thread lies behind the fitting's stub, while the cut
    // face on either side of it lies in front of the stub's back half: so the
    // material behind the thread is its own item, between the two.
    // It takes the column under the thread down to the chamber, with the two
    // narrow strips of cut face beside the drilling.
    const streifen = [[[ga, 0, zk], [ba, 0, zk], [ba, 0, zg], [ga, 0, zg]], [[bb, 0, zk], [gb, 0, zk], [gb, 0, zg], [bb, 0, zg]]];
    const zu12 = [[ga, 0, zk], [gb, 0, zk], [gb, 0, z1], [ga, 0, z1]];
    put([steuerX, -R_STEUER_GEWINDE - 1, z1 - 3], mitPort([
      nahtlos(bohrungInnen(FZ(steuerX, 0), zg, z1, R_STEUER_GEWINDE, Math.PI, TAU, 16)),
      ...streifen.map(schnitt),
      L(streifen.map(ring3).join(""), { tone: "mid" }),
    ].join("")) + ohnePort(schnitt(zu12) + L(ring3(zu12), { tone: "mid" })), [
      box([ga, y0, zg], [gb, -R_STEUER_GEWINDE, z1], { name: n("gewindegrund") }),
      boxenOhne([ga, y0, zk], [gb, 0, zg], [bohrung], { name: n("gewindegrund") }),
    ], { name: n("gewindegrund") });

    const deckel = [[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [gb, 0, z1],
      ...bogen(0, -Math.PI, 16).map((t) => [steuerX + R_STEUER_GEWINDE * Math.cos(t), R_STEUER_GEWINDE * Math.sin(t), z1]),
      [ga, 0, z1], [x0, 0, z1]];
    const nummer = optionen.nummer((text) => k.faceTextSvg(k.topMatrix([links ? x0 + 8 : x1 - 8, y0 + 6], z1, P), text, { size: 6.5, tone: "mid", anchor: "middle" }));

    if (links) {
      // The end wall above the axis lies behind the piston and the stub.
      const qW = [[x0, 0, ZA], [wand, 0, ZA], [wand, 0, zk], [ga, 0, zk], [ga, 0, z1], [x0, 0, z1]];
      put([(wa + wb) / 2, -10, zk], flanke(FX, wand, 0, R_KAMMER, Math.PI / 2, Math.PI, [1, 0, 0]) + schnitt(qW) + L(ring3(qW), { tone: "mid" }),
        [...boxenOhne([wa, -R_KAMMER, ZA], [wb, 0, zk], loecher, { name: n("wand") }),
          ...boxenOhne([wa, y0, zk], [wb, 0, z1], loecher, { name: n("wand") })],
        { name: n("wand") });
      // Above the chamber: in front of the piston's top and of the stub's back.
      const qO = [[gb, 0, zk], [x1, 0, zk], [x1, 0, z1], [gb, 0, z1]];
      put([(wb + x1) / 2, -10, z1 - 4], [
        flach(deckel, [0, 0, 1]), schnitt(qO), nummer,
        L(ring3(qO) + ring3(deckel), { tone: "mid" }),
      ].join(""), boxenOhne([wb, y0, zk], [x1, 0, z1], loecher, { name: n("oben") }), { name: n("oben") });
    } else {
      // Above the chamber, left of the hole, with the top: in front of the
      // piston, behind the stub's front half.
      const qO = [[x0, 0, zk], [ga, 0, zk], [ga, 0, z1], [x0, 0, z1]];
      const geschlossen = [[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [x0, 0, z1]];
      put([(x0 + wand) / 2, -10, z1 - 4], [
        mitPort(flach(deckel, [0, 0, 1]) + nummer + L(ring3(deckel), { tone: "mid" })),
        ohnePort(flach(geschlossen, [0, 0, 1]) + L(ring3(geschlossen), { tone: "mid" })),
        schnitt(qO), L(ring3(qO), { tone: "mid" }),
      ].join(""), boxenOhne([x0, y0, zk], [wand, 0, z1], loecher, { name: n("oben") }), { name: n("oben") });
      // The end wall and its outer face: in front of all that is inside.
      const qW = [[wand, 0, z0], [x1, 0, z0], [x1, 0, z1], [gb, 0, z1], [gb, 0, zk], [wand, 0, zk]];
      put([(wa + wb) / 2, -10, ZA], [
        flach([[x1, y0, z0], [x1, 0, z0], [x1, 0, z1], [x1, y0, z1]], [1, 0, 0]),
        schnitt(qW),
        L(ring3(qW) + linie([[x1, y0, z1], [x1, y0, z0], [x1, 0, z0]]), { tone: "mid" }),
      ].join(""), boxenOhne([wa, y0, z0], [wb, 0, z1], loecher, { name: n("wand") }), { name: n("wand") });
    }
  }

  /** A pilot piston with its lip seal, built at rest and shifted by the page. */
  function steuerkolben(gruppe, [a, b], name, variante = null, owner = undefined) {
    inGruppe(gruppe);
    const m = (a + b) / 2;
    put([m, 0, ZA], [
      SV(G.disc(a, b, R_KOLBEN, FX, P), { tone: "hi" }),
      SV(G.ringBand(m - 1.2, m + 1.2, R_KOLBEN - 0.8, R_KOLBEN + 0.01, FX, P), { tone: "hi" }).replace(/data-shade="\d"/g, 'data-shade="0"'),
      L(G.circleOf(FX, b, 3.2, P), { tone: "faint" }),
    ].join(""), [rec(A.disc(FX, a, b, R_KOLBEN, { name, owner }))], { name, hub: true, variante });
  }

  /**
   * A spring on a seat at the end of the spool, against the cap's end wall `K`.
   * `variante` / `owner` as for the spool.
   */
  function federsitz(K, FEDER, { variante = null, owner = undefined } = {}) {
    inGruppe("rueckstell");
    const sitz = [K.x0, K.x0 + FEDER.sitz];
    const R_DRAHT = FEDER.draht / 2, R_WINDUNG = FEDER.rWindung;
    const wendel = NT.druckfeder(FX, sitz[1] + R_DRAHT, K.wand - R_DRAHT, FEDER);
    put([(sitz[1] + K.wand) / 2, 0, ZA], [
      `<g data-hub="">${SV(G.disc(sitz[0], sitz[1], 8.2, FX, P), { tone: "hi" })}</g>`,
      // Each piece carries the x of its middle: the page compresses the coil by
      // shifting every piece in proportion to its distance from the end wall.
      ...wendel,
    ].join(""), [
      rec(A.disc(FX, sitz[0], sitz[1], 8.2, { name: "rueckstell.federsitz", owner })),
      rec(A.ring(FX, sitz[1], K.wand, R_WINDUNG - R_DRAHT, R_WINDUNG + R_DRAHT, { name: "rueckstell.feder", owner })),
    ], { name: "rueckstell.feder", variante, feder: [sitz[1], K.wand] });
  }

  /** The two top screws at x = `oben`, and the cap screws `kappen` = [[x, direction, assembly], ...]. */
  function schrauben({ oben, kappen }) {
    inGruppe("schrauben");
    for (const x of oben) {
      const F = FZ(x, -12);
      put([x, -12, GEH.z1 + 2], NT.schraubenkopf(F, GEH.z1, GEH.z1 + 4.5, 4.2),
        [rec(A.disc(F, GEH.z1, GEH.z1 + 4.5, 4.2, { name: "schrauben.oben" }))], { name: "schrauben.oben" });
    }
    // The cap screws fasten the end caps: whoever takes a cap off takes its
    // screws with it, so they belong to the cap's assembly, not to this one.
    for (const [x, richtung, kappe] of kappen) {
      for (const z of [KAPPE.z0 + 6, KAPPE.z1 - 6]) {
        const F = G.frameOf([0, -12, z], [richtung, 0, 0], [0, 1, 0], [0, 0, 1]);
        const s0 = richtung * x;
        put([x + richtung * 2, -12, z], NT.schraubenkopf(F, s0, s0 + 4, 3.6),
          [rec(A.disc(F, s0, s0 + 4, 3.6, { name: `${kappe}.schraube` }))], { name: `${kappe}.schraube`, gruppe: kappe });
      }
    }
  }

  /**
   * The hoses of `WEGE` (port name -> points). `istSteuer(nr)` tells the thin
   * pilot lines, `name(gruppe, nr)` names a hose, `variante(nr)` is the variant
   * a hose belongs to, if any.
   */
  function schlaeuche(WEGE, { istSteuer, name: benenne, variante: waehle = () => null }) {
    for (const [nr, punkte] of Object.entries(WEGE)) {
      const steuer = istSteuer(nr);
      const gruppe = steuer ? "steuerleitung" : "leitung";
      const r = steuer ? R_STEUERSCHLAUCH : R_SCHLAUCH;
      const ri = steuer ? R_STEUERSCHLAUCH_INNEN : R_SCHLAUCH_INNEN;
      const variante = waehle(nr);
      inGruppe(gruppe);
      const name = benenne(gruppe, nr);
      // The far end is cut off in the air on purpose: it is no tip that must land on a part.
      R.route(name, punkte, r, { piece: PIECE_OF[gruppe], move: MOVE[PIECE_OF[gruppe]], ends: [true, false], free: [true, false] });
      const stuecke = tubePieces(punkte, r, P, { maxLength: 14 });
      stuecke.forEach((teil, i) => {
        const letztes = i === stuecke.length - 1;
        put(teil.mid, tubeSvg(teil, { tone: "mid" }) + (letztes ? schnittEnde(punkte, r, ri) : ""),
          [A.tube(teil.points, teil.radii)],
          { name: `${name}:${i}`, route: name, chunk: i, variante });
      });
    }
  }

  /**
   * The pilot fitting in a cap's thread: an M5 push-in fitting standing on the
   * cap's top at x. `suffix` ends the part names (one per pilot port),
   * `variante` is the variant the port belongs to, if any.
   */
  function steuerverschraubung(x, suffix = "", variante = null) {
    const F = FZ(x, 0);
    const D = STEUER_V;
    gruppe("steuerleitung");
    put([x, 0, (D.gewinde[0] + D.gewinde[1]) / 2], NT.gewinde(F, D.gewinde[0], D.gewinde[1], R_STEUER_GEWINDE - 0.2),
      [rec(A.disc(F, D.gewinde[0], D.gewinde[1], R_STEUER_GEWINDE - 0.2, { name: `steuerleitung.gewinde${suffix}` }))],
      { name: `steuerleitung.gewinde${suffix}`, variante });
    const hx = sechskant(D.rS);
    put([x, 0, (D.sechskant[0] + D.ring[1]) / 2], [
      SV(G.prismOf(F, hx, D.sechskant[0], D.sechskant[1], P), { tone: "mid" }),
      SV(G.disc(D.koerper[0], D.koerper[1], D.rK, F, P), { tone: "hi" }),
      SV(G.disc(D.ring[0], D.ring[1], D.rR, F, P), { tone: "hi" }),
    ].join(""), [
      rec(A.prism(F, hx, D.sechskant[0], D.sechskant[1], { name: `steuerleitung.sechskant${suffix}` })),
      rec(A.disc(F, D.koerper[0], D.koerper[1], D.rK, { name: `steuerleitung.koerper${suffix}` })),
      rec(A.disc(F, D.ring[0], D.ring[1], D.rR, { name: `steuerleitung.ring${suffix}` })),
    ], { name: `steuerleitung.verschraubung${suffix}`, variante });
  }

  return { steuerverschraubung, schieber, kappe, steuerkolben, federsitz, schrauben, schlaeuche, put, inGruppe: gruppe, NT, flach, schnitt, rec, grundplatte, dichtung, gehaeuse, innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung, kanalInnen, aufNut, aufGewinde, box, boxenOhne, unterLoch, schnittEnde };
}
