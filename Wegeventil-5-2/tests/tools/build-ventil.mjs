// A 5/2 directional valve, spool type, in the size of ISO 5599-1 size 1
// (G1/4) on its sub-base, as an isometric section in the plane of the spool.
// Dimensions in mm, 1 world unit = 1 mm. The width of 42 mm is catalogue
// (Festo VSVA size 1); everything else is an assumption and is listed in the
// README of the figure.
//
// This script holds geometry and data tables and nothing else: springs,
// depth sorting, legend, air and page shell all come from ../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is
// kept is the one at y ≤ 0, its cut face at y = 0 looks at the viewer, and
// the ports leave the sub-base towards +y.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import { ISO_5599_GR1, wegeOffen } from "../../../figur/ventil.mjs";
import { TONE_CSS } from "../../../figur/toene.mjs";
import { LEGENDE } from "./legende-ventil.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));

const W = 900;
const H = 800;

// --- Dimensions ----------------------------------------------------------
const M = ISO_5599_GR1;
const HUB = M.hub;                   // 7, spool stroke
const RB = M.bohrung / 2;            // 6.5, spool bore
const RK = M.steuerkolben / 2;       // 10, pilot piston bore
const ZA = 44;                       // spool axis height

const GEH = { x0: 0, x1: 130, y0: -21, z0: 18, z1: 66 };          // housing, back half
const PLATTE = { x0: -6, x1: 136, y0: -24, y1: 24, z0: 0, z1: 17 }; // sub-base
const DICHT = { x0: -1, x1: 131, y0: -22, z0: 17, z1: 18 };         // flat gasket, 1 mm proud all round
const ZP = (PLATTE.z0 + PLATTE.z1) / 2;  // 8.5, port axis; the cut steps down to it in front

const PORT = { 5: 25, 4: 45, 1: 65, 2: 85, 3: 105 };
const FOLGE = [5, 4, 1, 2, 3];       // along the spool
const R_KANAL = 4;                   // channel Ø 8 from the bore down into the sub-base
const R_NUT = 10.5;                  // ring groove in the bore (assumption)
const NUT_HALB = 7;                  // groove 14 wide, so the webs between are 6
const R_GEWINDE = 6.5;               // G1/4, outside Ø 13.2
const R_STUMMEL = R_GEWINDE - 0.2;  // the threaded stub of a fitting, clear of the half-cut thread
const Y_BOHR = -R_KANAL - 0.5;       // where the port drilling ends, just behind the channel

// End caps: a little smaller than the body, so the joint shows.
const KAPPE = { y0: -20, z0: 23, z1: 65 };
const K14 = { x0: -22, x1: 0, wand: -17 };     // chamber from the wall face to the body; the thread sits just inside the wall
const K12 = { x0: 130, x1: 152, wand: 147 };
const R_KAMMER = RK;                 // pilot chamber = piston bore
const R_KOLBEN = RK - 0.2;
const KOLBEN14 = [-13, -7];          // pilot piston 14 at rest (position 12)
const KOLBEN12 = [130, 136];         // pilot piston 12 at rest, against the body
const STEUER = { 14: -14.5, 12: 144.5 };  // pilot ports, over the pilot chambers
const R_STEUER_GEWINDE = 2.5;        // M5
const R_STEUER_BOHRUNG = 1.5;

// --- The spool ------------------------------------------------------------
// The lands are placed from the overlap: a web between two grooves opens when
// a land edge leaves it. Set a (1→4, 2→3) must begin to open at
// s_a = (0.5 + ü/2)·hub, set b (1→2, 4→5) at s_b = (0.5 − ü/2)·hub.
const S_A = (0.5 + M.ueberdeckung / 2) * HUB;
const S_B = (0.5 - M.ueberdeckung / 2) * HUB;
const NUTEN = FOLGE.map((nr) => [PORT[nr] - NUT_HALB, PORT[nr] + NUT_HALB]);
const STEGE = [
  [GEH.x0, NUTEN[0][0]],
  ...NUTEN.slice(1).map((n, i) => [NUTEN[i][1], n[0]]),
  [NUTEN[4][1], GEH.x1],
];
// STEGE[1] = web 5|4 (set b), [2] = 4|1 (set a), [3] = 1|2 (set b), [4] = 2|3 (set a)
const R_BUND = RB - 0.2;             // land, 0.2 clearance in the bore
const R_HALS = 3.6;                  // neck between the lands
const SP = [-7, 130];                // spool ends at rest
const BUNDE = [
  [SP[0], STEGE[1][0] - S_B],        // land A: shuts 5|4 in position 14
  [STEGE[2][1] - S_A, STEGE[3][0] - S_B],  // land B: shuts 4|1 at rest and 1|2 in position 14
  [STEGE[4][1] - S_A, SP[1]],        // land C: shuts 2|3 at rest
];
// One seal ring next to every sealing edge, and one at each end towards the
// pilot chambers. Each sits on a web in the position in which it seals.
const RING_B = 2.2;
const R_RINGNUT = R_BUND - 1;
const RINGE = [
  4, BUNDE[0][1] - 2.6,
  BUNDE[1][0] + 2.6, BUNDE[1][1] - 2.6,
  BUNDE[2][0] + 2.6, 122,
];

// --- Frames ----------------------------------------------------------------
const FX = G.frameOf([0, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]);          // spool axis
const FY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]); // ports
const FZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]); // channels, pilots

// --- Fittings ----------------------------------------------------------------
// Along their own axis, from the face they are screwed into.
const VERSCHRAUBUNG = { gewinde: [12, 24], sechskant: [24, 28.5], rS: 7.6, koerper: [28.5, 35], rK: 6, ring: [35, 36.5], rR: 5.2 };
const DAEMPFER = { gewinde: [12, 24], sechskant: [24, 28], rS: 7.6, hals: [28, 29.5], rH: 5.5, sinter: [29.5, 40], rD: 6.5, kuppe: 2 };
const STEUER_V = { gewinde: [59, 65], sechskant: [65, 69], rS: 5, koerper: [69, 73], rK: 3.6, ring: [73, 74.5], rR: 3 };
const R_SCHLAUCH = 4;                // 8/6 hose
const R_SCHLAUCH_INNEN = 3;
const R_STEUERSCHLAUCH = 2;          // 4/2.5 hose
const R_STEUERSCHLAUCH_INNEN = 1.25;

/** A smooth hose between two points, leaving and arriving along the given tangents. */
function hermite(p0, d0, p1, d1, n = 30) {
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
function stummel(p0, aus, p1, ende, gerade = 6) {
  const a0 = p0.map((v, j) => v + aus[j] * gerade);
  const laenge = Math.hypot(...p1.map((v, j) => v - a0[j]));
  return [p0, ...hermite(a0, aus.map((v) => v * laenge), p1, ende.map((v) => v * laenge), 24)];
}

const Y_SCHLAUCH = VERSCHRAUBUNG.ring[1];
const Z_STEUERSCHLAUCH = STEUER_V.ring[1];
const WEGE = {
  4: stummel([PORT[4], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[4], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  1: stummel([PORT[1], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[1], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  2: stummel([PORT[2], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[2], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  14: stummel([STEUER[14], 0, Z_STEUERSCHLAUCH], [0, 0, 1], [STEUER[14], 13, 88], [0, 0.85, 0.53], 4),
  12: stummel([STEUER[12], 0, Z_STEUERSCHLAUCH], [0, 0, 1], [STEUER[12], 13, 88], [0, 0.85, 0.53], 4),
};

// --- Projection --------------------------------------------------------------
const P = k.fitProjection(
  [
    [PLATTE.x0, PLATTE.y0, 0], [PLATTE.x1, PLATTE.y0, 0], [PLATTE.x1, PLATTE.y1, 0], [PLATTE.x0, PLATTE.y1, 0],
    [K14.x0 - 5, KAPPE.y0, KAPPE.z1], [K12.x1 + 5, KAPPE.y0, KAPPE.z1], [K12.x1 + 5, 0, KAPPE.z0],
    [GEH.x0, GEH.y0, GEH.z1 + 5], [GEH.x1, GEH.y0, GEH.z1 + 5],
    ...Object.values(WEGE).flatMap((w) => [w[w.length - 1].map((v, j) => v + (j === 2 ? 6 : 0)), w[w.length - 1].map((v, j) => v - (j === 2 ? 6 : 0))]),
    [PORT[3], PLATTE.y1 + DAEMPFER.sinter[1] + 4, ZP - 8], [PORT[5], PLATTE.y1 + DAEMPFER.sinter[1] + 4, ZP + 8],
  ],
  W, H, { pad: 40, azimuth: 38, elevation: 34 },
);

const at = (p) => k.iso(p, P);
const V = G.viewOf(P);
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const linie = (punkte) => punkte.map(at).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const ring3 = (punkte) => SCH.pfad(punkte.map(at));
const TAU = Math.PI * 2;
const bogen = (von, bis, n) => Array.from({ length: n + 1 }, (_, i) => von + ((bis - von) * i) / n);

// --- Faces -------------------------------------------------------------------
/** A flat outer face, shaded by its normal like every solid of the kit. */
const flach = (punkte, normale) => SCH.flaeche(punkte.map(at), normale, P);

/**
 * A cut face: where the saw went through the material. One tone for every
 * cut face of the figure, so the section reads as one plane; `data-schnitt`
 * lets the page give it its own colour.
 */
const SCHNITT_TON = 3;
const schnitt = (punkte) => `<path class="iso-shade" data-shade="${SCHNITT_TON}" data-schnitt="" d="${ring3(punkte)}"/>`;

/**
 * Inside a bore, a groove or a channel little light gets in: a cavity takes
 * only the two darkest tones, so it reads as a hollow behind the bright cut.
 */
const hohlTon = (band) => (band >= 3 ? 1 : 0);

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
/** Seamless group: abutting tone patches are stroked in their own colour, so no hairline shows. */
const nahtlos = (inhalt) => `<g class="iso-solid" data-seamless="">${inhalt}</g>`;

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

/** The back half (y ≤ 0) of the spool bore with its ring grooves, x0…x1. */
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

// --- Recording ------------------------------------------------------------------
const R = A.recorder(P);
const rec = R.solid;
let GRUPPE = "grundplatte";
function put(pos, svg, shapes = [], extra = {}) {
  const { bias = 0, gruppe = GRUPPE, name = gruppe, hub = false, variante = null, ...rest } = extra;
  let inhalt = svg;
  // Parts that ride with the spool sit in an inner group the page shifts;
  // the outer group stays where it is.
  if (hub) inhalt = `<g data-hub="">${inhalt}</g>`;
  if (variante) inhalt = `<g data-variante="${variante}">${inhalt}</g>`;
  R.put({ name: R.nameFor(name), piece: gruppe, label: gruppe, at: pos, pos, bias, gruppe, svg: inhalt, shapes: shapes.flat(), ...rest });
}
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

/** A box minus axis-aligned holes, as [min, max] pairs. */
function ohne(min, max, loecher) {
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

// --- Sub-base ----------------------------------------------------------------------
// The cut steps: behind the port axis it runs at y = 0 like the body, in front
// it drops to the port axis, so each port is seen as an L — down from the
// groove, then forward to the thread — and the fittings stay whole.
const STUFE = { y0: 0, y1: PLATTE.y1, z1: ZP };
const STUECKE = [PLATTE.x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_GEWINDE, PORT[nr] + R_GEWINDE]), PLATTE.x1];

function grundplatte() {
  GRUPPE = "grundplatte";
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

// --- Gasket --------------------------------------------------------------------------
function dichtung() {
  GRUPPE = "dichtung";
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

// --- Housing ---------------------------------------------------------------------------
// Two items, because the spool lies between them in depth: the part above the
// bore covers the top of the spool's back half, the spool covers the rest.
function gehaeuse() {
  GRUPPE = "gehaeuse";
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

// --- Spool and its rings ---------------------------------------------------------------
function schieberProfil() {
  const f = 0.6;                         // chamfer on every land edge
  const p = [];
  BUNDE.forEach(([a, b], i) => {
    if (i > 0) p.push([a, R_HALS]);
    p.push([a, R_BUND - f], [a + f, R_BUND]);
    for (const x of RINGE.filter((x) => x > a && x < b)) {
      p.push([x - RING_B / 2, R_BUND], [x - RING_B / 2, R_RINGNUT], [x + RING_B / 2, R_RINGNUT], [x + RING_B / 2, R_BUND]);
    }
    p.push([b - f, R_BUND], [b, R_BUND - f]);
    if (i < BUNDE.length - 1) p.push([b, R_HALS]);
  });
  return p;
}

function schieber() {
  GRUPPE = "schieber";
  const profil = schieberProfil();
  put([(SP[0] + SP[1]) / 2, 0, ZA], [
    SV(G.solidOf(profil, FX, P), { tone: "hi" }),
    L(G.circleOf(FX, SP[1], 2.2, P), { tone: "faint" }),
  ].join(""), [rec(A.solid(FX, profil, { name: "schieber.kolben" }))], { name: "schieber.kolben", hub: true });

  // Each ring wraps the spool, so it is drawn in two halves: the far half
  // before the spool, the near half after it. Rubber: one dark tone.
  GRUPPE = "ringe";
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
    return rec(A.prism(FX, quad, x0, x1, { name }));
  });
  const gummi = (punkte) => `<path class="iso-fill" d="${ring3(punkte)}"/><path class="iso-shade" data-shade="0" d="${ring3(punkte)}"/>`;
  for (const x of RINGE) {
    const [x0, x1] = [x - RING_B / 2, x + RING_B / 2];
    const kreis = (r) => bogen(0, TAU, 48).map((t) => G.pointOf(FX, x1, r, t));
    const hinten = band(x0, x1, R_BUND, v1, v0 + TAU);
    const innenHinten = band(x0, x1, R_RINGNUT, m - Math.PI / 2, m + Math.PI / 2);
    put([x, 0, ZA], [
      gummi(hinten), gummi(innenHinten),
      `<path class="iso-fill" fill-rule="evenodd" d="${ring3(kreis(R_BUND))}${ring3(kreis(R_RINGNUT))}"/>`,
      `<path class="iso-shade" data-shade="0" fill-rule="evenodd" d="${ring3(kreis(R_BUND))}${ring3(kreis(R_RINGNUT))}"/>`,
      L(ring3(hinten) + ring3(kreis(R_BUND)) + ring3(kreis(R_RINGNUT)), { tone: "hi" }),
    ].join(""), sektoren(x0, x1, v1, v0 + TAU, "ringe.hinten"), { name: "ringe.hinten", hub: true });
    const vorn = band(x0, x1, R_BUND, v0, v1);
    put([x, 0, ZA], gummi(vorn) + L(ring3(vorn), { tone: "hi" }),
      // Recorded as the skin that is drawn: the rest of the near half sits in
      // the groove, and its end face is hidden behind the neighbouring land.
      // Recorded whole, that end face would read as "spool in front of ring".
      sektoren(x0, x1, v0, v1, "ringe.vorn", R_BUND - 0.05), { name: "ringe.vorn", hub: true });
  }
}

// --- End caps ---------------------------------------------------------------------------
/**
 * One end cap, cut like the body: the pilot chamber, the drilling up to the
 * pilot port, and the threaded hole for the fitting (half of it is cut away).
 * The cut face is split where the piston, the spring and the fitting's stub
 * lie between its pieces in depth: what is behind them is one item, what is
 * in front of them another.
 */
function kappe(gruppe, { x0, x1, wand }, steuerX, links) {
  GRUPPE = gruppe;
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

  // Behind everything inside: the chamber, the drillings, the cut face below.
  const unten = [];
  const innenTeile = [bohrungInnen(FX, ka, kb, R_KAMMER, Math.PI / 2, (3 * Math.PI) / 2)];
  // The chamber's closed end below the axis; the half above belongs to the end wall item.
  if (links) innenTeile.push(flanke(FX, wand, 0, R_KAMMER, Math.PI, (3 * Math.PI) / 2, [1, 0, 0]));
  // The pilot drilling and the thread above it, their far halves.
  innenTeile.push(innen(
    (t, e) => { const p = G.pointOf(FZ(steuerX, 0), 0, R_STEUER_BOHRUNG, t); return [p[0], p[1], e ? zg : ZA + Math.sqrt(R_KAMMER ** 2 - p[1] ** 2)]; },
    (t) => G.mul3(G.radialOf(FZ(steuerX, 0), t), -1),
    bogen(Math.PI, TAU, 12),
  ));
  unten.push(nahtlos(innenTeile.join("")));
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
  put([steuerX, -R_STEUER_GEWINDE - 1, z1 - 3], [
    nahtlos(bohrungInnen(FZ(steuerX, 0), zg, z1, R_STEUER_GEWINDE, Math.PI, TAU, 16)),
    ...streifen.map(schnitt),
    L(streifen.map(ring3).join(""), { tone: "mid" }),
  ].join(""), [
    box([ga, y0, zg], [gb, -R_STEUER_GEWINDE, z1], { name: n("gewindegrund") }),
    boxenOhne([ga, y0, zk], [gb, 0, zg], [bohrung], { name: n("gewindegrund") }),
  ], { name: n("gewindegrund") });

  const deckel = [[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [gb, 0, z1],
    ...bogen(0, -Math.PI, 16).map((t) => [steuerX + R_STEUER_GEWINDE * Math.cos(t), R_STEUER_GEWINDE * Math.sin(t), z1]),
    [ga, 0, z1], [x0, 0, z1]];
  const nummer = k.faceTextSvg(k.topMatrix([links ? x0 + 8 : x1 - 8, y0 + 6], z1, P), links ? "14" : "12", { size: 6.5, tone: "mid", anchor: "middle" });

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
    put([(x0 + wand) / 2, -10, z1 - 4], [
      flach(deckel, [0, 0, 1]), schnitt(qO), nummer,
      L(ring3(qO) + ring3(deckel), { tone: "mid" }),
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
  GRUPPE = gruppe;
  const m = (a + b) / 2;
  put([m, 0, ZA], [
    SV(G.disc(a, b, R_KOLBEN, FX, P), { tone: "hi" }),
    SV(G.ringBand(m - 1.2, m + 1.2, R_KOLBEN - 0.8, R_KOLBEN + 0.01, FX, P), { tone: "hi" }).replace(/data-shade="\d"/g, 'data-shade="0"'),
    L(G.circleOf(FX, b, 3.2, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FX, a, b, R_KOLBEN, { name, owner }))], { name, hub: true, variante });
}

// The two right-hand variants fill the same space on purpose: the page shows
// one of them. A shared owner tells the support check they are not sunk into
// each other by mistake.
const VARIANTEN = "rueckstell.variante";

function rueckstellung() {
  // Monostable: a spring on a seat at the end of the spool.
  GRUPPE = "rueckstell";
  const sitz = [K12.x0, K12.x0 + 2];
  // The wire as a tube along a helix, ground flat at both ends (the last
  // half turn closes up), drawn back to front.
  const R_DRAHT = 0.75, R_WINDUNG = 7, WINDUNGEN = 5.5;
  const [fa, fb] = [sitz[1] + R_DRAHT, K12.wand - R_DRAHT];
  const wendel = Array.from({ length: 221 }, (_, i) => {
    const t = i / 220;
    const w = t * WINDUNGEN * TAU;
    // pitch closes towards the ends: flat seats on the spring plate and the wall
    const zu = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
    const anteil = (0.5 / WINDUNGEN) * zu(t * WINDUNGEN / 0.5) + (1 - 1 / WINDUNGEN) * Math.min(1, Math.max(0, (t * WINDUNGEN - 0.5) / (WINDUNGEN - 1)))
      + (0.5 / WINDUNGEN) * zu((t * WINDUNGEN - (WINDUNGEN - 0.5)) / 0.5);
    return G.pointOf(FX, fa + (fb - fa) * anteil, R_WINDUNG, w);
  });
  const draht = tubePieces(wendel, R_DRAHT, P, { maxLength: 4, caps: true })
    .sort((p1, p2) => G.dot3(p1.mid, V) - G.dot3(p2.mid, V));
  put([(sitz[1] + K12.wand) / 2, 0, ZA], [
    `<g data-hub="">${SV(G.disc(sitz[0], sitz[1], 8.2, FX, P), { tone: "hi" })}</g>`,
    ...draht.map((teil) => tubeSvg(teil, { tone: "hi" })),
  ].join(""), [
    rec(A.disc(FX, sitz[0], sitz[1], 8.2, { name: "rueckstell.federsitz", owner: VARIANTEN })),
    rec(A.ring(FX, sitz[1], K12.wand, R_WINDUNG - R_DRAHT, R_WINDUNG + R_DRAHT, { name: "rueckstell.feder", owner: VARIANTEN })),
  ], { name: "rueckstell.feder", variante: "feder", feder: [sitz[1], K12.wand] });
  // Bistable: a second pilot piston instead.
  steuerkolben("rueckstell", KOLBEN12, "rueckstell.kolben12", "kolben12", VARIANTEN);
}

// --- Screws --------------------------------------------------------------------------------
function schraubenkopf(F, s0, s1, r, name) {
  const sechs = Array.from({ length: 6 }, (_, i) => [0.42 * r * Math.cos((i * Math.PI) / 3), 0.42 * r * Math.sin((i * Math.PI) / 3)]);
  const innen6 = sechs.map(([u, v]) => k.iso(G.add3(G.add3(G.pointOf(F, s1, 0, 0), G.mul3(F.u, u)), G.mul3(F.v, v)), P));
  return [
    SV(G.disc(s0, s1, r, F, P), { tone: "mid" }),
    `<path class="iso-shade" data-shade="0" d="${SCH.pfad(innen6)}"/>`,
    L(SCH.pfad(innen6), { tone: "mid" }),
  ].join("");
}

function schrauben() {
  GRUPPE = "schrauben";
  for (const x of [7, 123]) {
    const F = FZ(x, -12);
    put([x, -12, GEH.z1 + 2], schraubenkopf(F, GEH.z1, GEH.z1 + 4.5, 4.2, "schrauben.oben"),
      [rec(A.disc(F, GEH.z1, GEH.z1 + 4.5, 4.2, { name: "schrauben.oben" }))], { name: "schrauben.oben" });
  }
  for (const [x, richtung] of [[K14.x0, -1], [K12.x1, 1]]) {
    for (const z of [KAPPE.z0 + 6, KAPPE.z1 - 6]) {
      const F = G.frameOf([0, -12, z], [richtung, 0, 0], [0, 1, 0], [0, 0, 1]);
      const s0 = richtung * x;
      put([x + richtung * 2, -12, z], schraubenkopf(F, s0, s0 + 4, 3.6, "schrauben.kappe"),
        [rec(A.disc(F, s0, s0 + 4, 3.6, { name: "schrauben.kappe" }))], { name: "schrauben.kappe" });
    }
  }
}

// --- Threads, fittings, silencers -------------------------------------------------------------
const sechskant = (r) => Array.from({ length: 6 }, (_, i) => [r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);

/** A threaded stub inside a half-cut hole: whole, with its thread as rings. */
function gewinde(F, s0, s1, r, gruppe, name) {
  GRUPPE = gruppe;
  const ringe = [];
  for (let s = s0 + 1; s < s1 - 0.4; s += 1.3) ringe.push(G.arcOf(F, s, r, P));
  return [
    SV(G.disc(s0, s1, r, F, P), { tone: "mid", inner: L(ringe.join(""), { tone: "faint" }) }),
  ].join("");
}

function verschraubung(F, D, gruppe, name, ort) {
  GRUPPE = gruppe;
  put(ort(D.gewinde), gewinde(F, D.gewinde[0], D.gewinde[1], D === STEUER_V ? R_STEUER_GEWINDE - 0.2 : R_STUMMEL, gruppe),
    [rec(A.disc(F, D.gewinde[0], D.gewinde[1], D === STEUER_V ? R_STEUER_GEWINDE - 0.2 : R_STUMMEL, { name: `${name}.gewinde` }))],
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

function anschluesse() {
  for (const nr of [4, 1, 2]) {
    verschraubung(FY(PORT[nr], ZP), VERSCHRAUBUNG, "leitung", `leitung.verschraubung${nr}`,
      ([a, b]) => [PORT[nr], (a + b) / 2, ZP]);
  }
  for (const nr of [5, 3]) {
    const F = FY(PORT[nr], ZP);
    const D = DAEMPFER;
    GRUPPE = "daempfer";
    put([PORT[nr], (D.gewinde[0] + D.gewinde[1]) / 2, ZP], gewinde(F, D.gewinde[0], D.gewinde[1], R_STUMMEL, "daempfer"),
      [rec(A.disc(F, D.gewinde[0], D.gewinde[1], R_STUMMEL, { name: `daempfer.gewinde${nr}` }))], { name: `daempfer.gewinde${nr}` });
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
    put([PORT[nr], (D.sechskant[0] + ende) / 2, ZP], [
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
  for (const [nr, gruppe, variante] of [[14, "steuerleitung", null], [12, "steuerleitung", "kolben12"]]) {
    const x = STEUER[nr];
    const F = FZ(x, 0);
    const D = STEUER_V;
    GRUPPE = gruppe;
    put([x, 0, (D.gewinde[0] + D.gewinde[1]) / 2], gewinde(F, D.gewinde[0], D.gewinde[1], R_STEUER_GEWINDE - 0.2, gruppe),
      [rec(A.disc(F, D.gewinde[0], D.gewinde[1], R_STEUER_GEWINDE - 0.2, { name: `steuerleitung.gewinde${nr}` }))],
      { name: `steuerleitung.gewinde${nr}`, variante });
    const hx = sechskant(D.rS);
    put([x, 0, (D.sechskant[0] + D.ring[1]) / 2], [
      SV(G.prismOf(F, hx, D.sechskant[0], D.sechskant[1], P), { tone: "mid" }),
      SV(G.disc(D.koerper[0], D.koerper[1], D.rK, F, P), { tone: "hi" }),
      SV(G.disc(D.ring[0], D.ring[1], D.rR, F, P), { tone: "hi" }),
    ].join(""), [
      rec(A.prism(F, hx, D.sechskant[0], D.sechskant[1], { name: `steuerleitung.sechskant${nr}` })),
      rec(A.disc(F, D.koerper[0], D.koerper[1], D.rK, { name: `steuerleitung.koerper${nr}` })),
      rec(A.disc(F, D.ring[0], D.ring[1], D.rR, { name: `steuerleitung.ring${nr}` })),
    ], { name: `steuerleitung.verschraubung${nr}`, variante });
  }
}

// --- Hoses -----------------------------------------------------------------------------------------
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

function schlaeuche() {
  for (const [nr, punkte] of Object.entries(WEGE)) {
    const steuer = nr === "12" || nr === "14";
    const gruppe = steuer ? "steuerleitung" : "leitung";
    const r = steuer ? R_STEUERSCHLAUCH : R_SCHLAUCH;
    const ri = steuer ? R_STEUERSCHLAUCH_INNEN : R_SCHLAUCH_INNEN;
    const variante = nr === "12" ? "kolben12" : null;
    GRUPPE = gruppe;
    const name = `${gruppe}.schlauch${nr}`;
    // The far end is cut off in the air on purpose: it is no tip that must land on a part.
    R.route(name, punkte, r, { piece: gruppe, ends: [true, false], free: [true, false] });
    const stuecke = tubePieces(punkte, r, P, { maxLength: 14 });
    stuecke.forEach((teil, i) => {
      const letztes = i === stuecke.length - 1;
      put(teil.mid, tubeSvg(teil, { tone: "mid" }) + (letztes ? schnittEnde(punkte, r, ri) : ""),
        [A.tube(teil.points, teil.radii)],
        { name: `${name}:${i}`, route: name, chunk: i, variante });
    });
  }
}

// --- The overlap, measured on the drawn edges ------------------------------------------------------
/**
 * From the land edges and the groove edges: at which spool travel does each
 * web open? A web is open while no land covers any of it. The figure must
 * show the overlap the model computes with, or the drawing teaches a different
 * valve than the one the page simulates.
 */
function ueberdeckungPruefen() {
  const offen = (steg, s) => BUNDE.every(([a, b]) => b + s <= steg[0] || a + s >= steg[1]);
  const schritte = 7000;
  const wege = { "5|4": STEGE[1], "4|1": STEGE[2], "1|2": STEGE[3], "2|3": STEGE[4] };
  const verlauf = Object.fromEntries(Object.entries(wege).map(([n, steg]) => [n,
    Array.from({ length: schritte + 1 }, (_, i) => offen(steg, (i / schritte) * HUB))]));
  const erstesOffen = (v) => (v.indexOf(true) / schritte) * HUB;
  const letztesOffen = (v) => (v.lastIndexOf(true) / schritte) * HUB;
  const fehler = [];
  // Position 12 (s = 0): 1→2 and 4→5 open, 1→4 and 2→3 shut; position 14 the other way round.
  for (const [n, soll12] of [["5|4", true], ["4|1", false], ["1|2", true], ["2|3", false]]) {
    if (verlauf[n][0] !== soll12) fehler.push(`Stellung 12: Weg ${n} ist ${verlauf[n][0] ? "offen" : "zu"}`);
    if (verlauf[n][schritte] !== !soll12) fehler.push(`Stellung 14: Weg ${n} ist ${verlauf[n][schritte] ? "offen" : "zu"}`);
  }
  for (const steg of [STEGE[0], STEGE[5]]) {
    if (Array.from({ length: 101 }, (_, i) => offen(steg, (i / 100) * HUB)).some(Boolean)) fehler.push(`Endsteg ${steg} öffnet`);
  }
  const oeffnetA = erstesOffen(verlauf["4|1"]);      // 1→4 begins to open
  const oeffnetB = letztesOffen(verlauf["1|2"]);     // 1→2 begins to open, coming back
  const oeffnetA2 = erstesOffen(verlauf["2|3"]);
  const oeffnetB2 = letztesOffen(verlauf["5|4"]);
  const gemessen = (oeffnetA - oeffnetB) / HUB;
  if (Math.abs(gemessen - M.ueberdeckung) > 0.05) fehler.push(`Überdeckung ${gemessen.toFixed(3)} statt ${M.ueberdeckung}`);
  if (Math.abs(oeffnetA2 - oeffnetA) / HUB > 0.05 || Math.abs(oeffnetB2 - oeffnetB) / HUB > 0.05) {
    fehler.push(`2→3 öffnet bei ${oeffnetA2.toFixed(2)}, 1→4 bei ${oeffnetA.toFixed(2)}; 4→5 bei ${oeffnetB2.toFixed(2)}, 1→2 bei ${oeffnetB.toFixed(2)}`);
  }
  // The same points from the model: where wegeOffen first lets air through.
  const modellA = Array.from({ length: 1001 }, (_, i) => i / 1000).find((t) => wegeOffen(t, M.ueberdeckung).a > 0);
  const modellB = Array.from({ length: 1001 }, (_, i) => 1 - i / 1000).find((t) => wegeOffen(t, M.ueberdeckung).b > 0);
  if (Math.abs(modellA - oeffnetA / HUB) > 0.05 || Math.abs(modellB - oeffnetB / HUB) > 0.05) {
    fehler.push(`Modell öffnet bei ${modellA.toFixed(3)} / ${modellB.toFixed(3)}, Zeichnung bei ${(oeffnetA / HUB).toFixed(3)} / ${(oeffnetB / HUB).toFixed(3)}`);
  }
  if (fehler.length) {
    console.error(`Überdeckung falsch gezeichnet:\n  ${fehler.join("\n  ")}`);
    process.exit(1);
  }
  return { oeffnetA, oeffnetB, gemessen };
}

// --- Compose ---------------------------------------------------------------------------------------------
const UEBERDECKUNG = ueberdeckungPruefen();

grundplatte();
dichtung();
gehaeuse();
schieber();
kappe("kappe14", K14, STEUER[14], true);
steuerkolben("kappe14", KOLBEN14, "kappe14.kolben");
kappe("rueckstell", K12, STEUER[12], false);
rueckstellung();
schrauben();
anschluesse();
schlaeuche();

const LEGENDE_IDS = LEGENDE.map((e) => e.piece);
for (const it of R.items) {
  if (!LEGENDE_IDS.includes(it.piece)) throw new Error(`Teil ${it.name} hat keine Legendennummer (${it.piece})`);
}

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein 5/2-Wegeventil in Schieberbauart nach ISO 5599-1, Größe 1, auf seiner Grundplatte, in der Ebene des Schiebers aufgeschnitten. "
    + "Man sieht die Bohrung mit fünf Ringnuten, den Steuerschieber mit drei Bunden und Dichtringen, die fünf Kanäle hinunter in die Grundplatte "
    + "und die Anschlüsse 1 bis 5 mit Schläuchen und Schalldämpfern. Links sitzt die Endkappe mit dem Steuerkolben 14, rechts die Rückstellseite "
    + "mit Feder oder zweitem Steuerkolben 12. Der Schieber steht in der Ausgangsstellung 12: 1 ist mit 2 verbunden, 4 mit 5.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}"${it.feder ? ` data-feder="${it.feder.join(" ")}"` : ""}>${it.svg}</g>`).join(""),
  ],
});

console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
console.log(`Überdeckung: 1→4 öffnet bei ${UEBERDECKUNG.oeffnetA.toFixed(2)} mm, 1→2 bei ${UEBERDECKUNG.oeffnetB.toFixed(2)} mm `
  + `→ ${(UEBERDECKUNG.gemessen * 100).toFixed(1)} % des Hubs (Modell ${M.ueberdeckung * 100} %)`);

// A plain preview to look at while the page does not exist yet (Task 6).
const vorschau = process.argv.find((a) => a.startsWith("--vorschau="));
if (vorschau) {
  const ziel = vorschau.slice("--vorschau=".length);
  mkdirSync(dirname(ziel), { recursive: true });
  const thema = process.argv.includes("--dunkel") ? "dark" : "light";
  writeFileSync(ziel, `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Vorschau 5/2-Wegeventil</title>
<style>${k.ISO_CSS}${TONE_CSS}
body{margin:0;background:var(--anatomy-card)} .buehne{width:${W}px;margin:0 auto}
${process.argv.includes("--feder") ? '[data-variante="kolben12"]{display:none}' : ""}
${process.argv.includes("--kolben") ? '[data-variante="feder"]{display:none}' : ""}
</style></head><body class="iso" data-theme="${thema}"><div class="buehne">${svg}</div></body></html>`);
  console.log(`Vorschau: ${ziel}`);
}

if (process.argv.includes("--audit")) {
  A.auditOrExit(R, P, {
    allow: [
      // The two variants of the return side fill the same space on purpose:
      // spring and second pilot piston are both drawn, the page shows one.
      // No drawing order between them is right, and none is ever seen.
      ["rueckstell.feder", "rueckstell.kolben12"],
    ],
    crowd: [],
    cover: [],
  });
}
