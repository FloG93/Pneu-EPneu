// A throttle check valve as Festo builds it (GR/GRA, G1/4 both ends, knurled adjusting screw),
// redrawn after the catalogue's section drawing as an isometric section through the middle plane.
// Dimensions in mm, 1 world unit = 1 mm. Everything is coaxial about the adjusting screw:
//   regulating screw with a conical pin → the pin dips into the throttle bore of the valve insert,
//   the annular gap between pin and bore is the throttle;
//   a lip seal (Dichtmanschette) round the insert is the check valve: pressure on its open side
//   (from port 1) spreads the lip against the housing wall (shut), pressure from the ring space
//   (port 2) folds it inwards (free), the air passes outside it;
//   a screw-in bush guides the screw, a nut sits on the bush's neck.
// Port 1 is the throttled inlet on the left (low axis), port 2 on the right (high axis): the
// catalogue's drawing mirrored. The sizes are estimated, gaps and the lip are drawn a little
// larger than they are (the figure's README says so). Nothing of the catalogue's picture is
// copied; the construction is redrawn in the style of the collection.
//
// This script holds geometry and the four data tables; springs, depth sorting, legend and page
// shell come from ../../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is kept is the one at
// y <= 0 and its cut face at y = 0 looks at the viewer. Turned parts are cut in half: their
// cut faces lie in the plane y = 0 in the section tone.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../../.claude/skills/anatomy/kit/tube.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import * as EX from "../../../figur/explode.mjs";
import * as LEG from "../../../figur/legende.mjs";
import * as LU from "../../../figur/luft.mjs";
import * as VS from "../../../figur/ventilseite.mjs";
import { GRA_1_4 as M, DROSSELRICHTUNG, FREIE_RICHTUNG, anzeige, anzeigeZeile, neuerZustand, durchfluss } from "../../../figur/stromventil.mjs";
import { drosselRueckschlagSymbol, DROSSEL_SYMBOL_CSS, DROSSEL_SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { LAUFZEIT as BEDIENUNG_LAUFZEIT } from "../../../figur/bedienung.mjs";
import { seite, knopf, schieber, hausBedienung, modulQuelle } from "../../../figur/seite.mjs";
import { zeichner } from "../../../figur/zylinderteile.mjs";
import { normteile, stummel, sechskant, SCHNITT_CSS } from "../../../figur/normteile.mjs";
import { LEGENDE } from "./legende-drossel.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..", "..");
const W = 900;
const H = 800;
const TAU = Math.PI * 2;

// --- Dimensions ----------------------------------------------------------
const XC = 35;                                   // the axis of the screw, insert and bush
const LAENGE = 70, TIEFE = 16, HOEHE = 42;       // housing block; the half y in [-16, 0] is kept
const Z1 = 13.5, Z2 = 22.5;                      // port axes: 1 low on the left, 2 higher on the right
const R_PORT = 6.5;                              // G1/4 thread bore, outside Ø 13.2
const R_STUMMEL = R_PORT - 0.2;                  // the threaded stub of a fitting, clear of the thread
const BODEN = 9;                                 // floor of the central cavity (= bottom of channel 1)
const R_KAV = 9.5, Z_KAV = 27.5;                 // cavity for the insert and the lip: up to the bush's lower end
const R_GEW = 10.5;                              // thread bore of the bush, from Z_KAV to the top face
const ZM = 25;                                   // top of the insert: the throttle bore's mouth
const R_BOHRUNG = 3.0;                           // throttle bore (exaggerated, see README)
const R_EIN = 6.5;                               // outside of the insert's tube
const FENSTER = [12.5, 14.5];                    // the cross holes in the insert's wall: air from port 1 enters
const LIPPE = { wurzel: [21.5, 23.5], mund: 17.6, rZu: 9.4, rAuf: 7.2 };   // the lip seal: root, mouth height, mouth radius shut / folded
const SCHEIBE = { z: [15.8, 16.8], r: [R_EIN, 8.3] };                    // the support disc
// The pin (Zapfen) of the screw: a cone that grows 0,4 mm in radius per mm, up to the bore's radius.
const KONUS = 0.4, R_SPITZE = 0.6, L_KONUS = (R_BOHRUNG - R_SPITZE) / KONUS;   // 6 mm
const U0 = M.umdrehungen / 2;                    // start: half open
const zSpitze = (u) => ZM - L_KONUS + M.steigung * u;   // closed at 0 turns: the cone's base meets the mouth
const ZT0 = zSpitze(U0);
const BUCHSE = { z0: Z_KAV, bund: [43.4, 47], hals: [47, 60], rBund: 13, rHals: 8.5, rInnen: 4.5, rTasche: 5.5, zTasche: 29.5 };
const MUTTER = { z: [51, 57], rIn: 8.5, rHex: 13 };
const R_KOPF = 9, Z_KOPF = [64, 74];
const Z_SCHAFT_OBEN = 64;
const LOCH = { x: [11, 59], z: 34, r: 3.5 };     // the two mounting holes, across the block

// Fittings and hoses along the port axis, s from the housing's face outward.
const VERSCHRAUBUNG = { gewinde: [-12, 0], sechskant: [0, 4.5], rS: 7.6, koerper: [4.5, 11], rK: 6, ring: [11, 12.5], rR: 5.2 };
const R_SCHLAUCH = 4, R_SCHLAUCH_INNEN = 3;
const WEGE = Object.fromEntries([1, 2].map((nr) => {
  const v = nr === 1 ? -1 : 1;
  const s0 = VERSCHRAUBUNG.ring[1];
  const za = nr === 1 ? Z1 : Z2;
  const p0 = [v === -1 ? -s0 : LAENGE + s0, 0, za];
  // left: out and round towards the viewer (its cut end faces us); right: straight out, its cut end faces us anyway
  return [nr, v === -1 ? stummel(p0, [-1, 0, 0], [p0[0] - 12, 15, za - 2], [-0.35, 0.92, -0.1], 6) : stummel(p0, [1, 0, 0], [p0[0] + 12, 0, za], [1, 0, 0], 8)];
}));

// The extreme points of what is drawn: the block, the fittings' hoses, the knurled head.
const P = k.fitProjection(
  [[0, -TIEFE, 0], [LAENGE, -TIEFE, 0], [0, 0, 0], [LAENGE, 0, 0], [0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE],
    ...WEGE[1].slice(-1).map((q) => [q[0] - 5, q[1] + 5, q[2] + 5]), ...WEGE[1].slice(-1).map((q) => [q[0] - 5, q[1] + 5, q[2] - 5]),
    ...WEGE[2].slice(-1).map((q) => [q[0] + 5, q[1] + 5, q[2] + 5]), ...WEGE[2].slice(-1).map((q) => [q[0] + 5, q[1] + 5, q[2] - 5]),
    [XC - R_KOPF, -R_KOPF, Z_KOPF[1]], [XC + R_KOPF, R_KOPF, Z_KOPF[1]]],
  W, H, { pad: 30, azimuth: 38, elevation: 34 },
);

// --- Assemblies ----------------------------------------------------------
// Outside first. The screw leaves before the nut (its head is wider than the nut's hole), the lip
// and the disc slide off the insert's top before the insert goes.
const STAGGER = ["leitung", "verschraubung", "schraube", "kontermutter", "buchse", "manschette", "scheibe", "einsatz", "gehaeuse"];
// Escape paths in mm along the machine's axes (x along the flow, y towards the viewer, z up): the
// turned parts leave upwards along the screw's axis in the order they were mounted, the fittings
// and the hoses sideways through the cut.
const MOVE = {
  grund: [0, 0, 0],
  luft: [0, 0, 0],
  leitung: [0, 90, 16],
  verschraubung: [0, 55, 8],
  schraube: [0, 0, 120],
  kontermutter: [0, 0, 100],
  buchse: [0, 0, 70],
  manschette: [0, 0, 70],
  scheibe: [0, 0, 45],
  einsatz: [0, 0, 20],
  gehaeuse: [0, 0, 0],
};

const { R, rec, put, gruppe } = zeichner({ P, MOVE });
const NT = normteile({ P, rec, put, gruppe });
const at = (p) => k.iso(p, P);
const V = G.viewOf(P);
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const ring3 = (punkte) => SCH.pfad(punkte.map(at));

const FZ = (x = XC) => G.frameOf([x, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);               // vertical axes
const FPORT = {
  1: G.frameOf([0, 0, Z1], [-1, 0, 0], [0, 1, 0], [0, 0, 1]),
  2: G.frameOf([LAENGE, 0, Z2], [1, 0, 0], [0, 1, 0], [0, 0, 1]),
};
const ortPort = (nr) => (rng) => { const s = (rng[0] + rng[1]) / 2; return [nr === 1 ? -s : LAENGE + s, 0, nr === 1 ? Z1 : Z2]; };

// --- The hollows of the housing: rectangles (x0, x1, z0, z1) in the cut plane ----------------------
// kind "h": horizontal bore (lit from below), "v": vertical bore (lit from the right)
const HOHLRAUM = [
  [[0, 12, Z1 - R_PORT, Z1 + R_PORT], "h"],                         // port 1 (thread bore)
  [[12, XC - R_KAV, Z1 - 4.5, Z1 + 4.5], "h"],                      // channel 1: under the middle
  [[XC - R_KAV, XC + R_KAV, BODEN, Z_KAV], "v"],                    // the cavity of insert and lip
  [[XC + R_KAV, LAENGE - 12, Z2 - 4.5, Z2 + 4.5], "h"],             // channel 2: into the ring space
  [[LAENGE - 12, LAENGE, Z2 - R_PORT, Z2 + R_PORT], "h"],           // port 2 (thread bore)
  [[XC - R_GEW, XC + R_GEW, Z_KAV, HOEHE], "v"],                    // the bush's thread bore (the bush fills it)
  [[LOCH.x[0] - LOCH.r, LOCH.x[0] + LOCH.r, LOCH.z - LOCH.r, LOCH.z + LOCH.r], "loch"],   // mounting holes, across the block
  [[LOCH.x[1] - LOCH.r, LOCH.x[1] + LOCH.r, LOCH.z - LOCH.r, LOCH.z + LOCH.r], "loch"],
];
const innen = (x, z) => HOHLRAUM.some(([[a, b, c, d]]) => x > a + 1e-9 && x < b - 1e-9 && z > c + 1e-9 && z < d - 1e-9);

/** The material of the half block as axis boxes: the grid of all hollow edges, empty cells left out, runs merged. */
function materialKoerper() {
  const xs = [...new Set([0, LAENGE, ...HOHLRAUM.flatMap(([[a, b]]) => [a, b])])].sort((a, b) => a - b);
  const zs = [...new Set([0, HOEHE, ...HOHLRAUM.flatMap(([[, , c, d]]) => [c, d])])].sort((a, b) => a - b);
  const boxen = [];
  for (let j = 0; j < zs.length - 1; j += 1) {
    let start = null;
    for (let i = 0; i <= xs.length - 1; i += 1) {
      const voll = i < xs.length - 1 && !innen((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
      if (voll && start === null) start = xs[i];
      if (!voll && start !== null) { boxen.push([start, xs[i], zs[j], zs[j + 1]]); start = null; }
    }
  }
  // A long block is split along x: the crowding check reads anything four times longer than thick as a rod.
  return boxen.flatMap(([x0, x1, z0, z1]) => {
    const n = Math.max(1, Math.ceil((x1 - x0) / 24 - 1e-9));
    return Array.from({ length: n }, (_, i) => rec(A.box(
      [x0 + ((x1 - x0) * i) / n, -TIEFE, z0], [x0 + ((x1 - x0) * (i + 1)) / n, 0, z1], { name: "gehaeuse.material", ground: true })));
  });
}

const flaeche = (x0, x1, z0, z1, band) => `<path class="iso-shade" data-shade="${band}" d="${ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])}"/>`;
/** One hollow on the cut face: the far half of a round bore, dark where the light does not reach, lit on the far side. */
function hohlraum([[x0, x1, z0, z1], art]) {
  const h = z1 - z0, b = x1 - x0;
  if (art === "h") return flaeche(x0, x1, z0, z1, 0) + flaeche(x0, x1, z0, z0 + h * 0.62, 1) + flaeche(x0, x1, z0, z0 + h * 0.28, 2);
  if (art === "loch") {
    // a round hole across the block, seen as an ellipse on the cut face: its far wall shows as a lit crescent
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, r = b / 2;
    const kreis = (rr, dz = 0) => ring3(Array.from({ length: 41 }, (_, i) => [mx + rr * Math.cos((i / 40) * TAU), 0, mz + dz + rr * Math.sin((i / 40) * TAU)]));
    return `<path class="iso-shade" data-shade="0" d="${kreis(r)}"/><path class="iso-shade" data-shade="1" d="${kreis(r * 0.8, -r * 0.14)}"/>`;
  }
  return flaeche(x0, x1, z0, z1, 0) + flaeche(x0 + b * 0.4, x1, z0, z1, 1) + flaeche(x0 + b * 0.72, x1, z0, z1, 2);
}

// --- Turned parts, cut in half: polygons in the plane y = 0, mirrored about the axis ------------
const spiegel = (pt) => pt.map(([r, z]) => [XC - r, 0, z]);     // (radius, z) pairs → left side points in the cut plane
const rechts = (pt) => pt.map(([r, z]) => [XC + r, 0, z]);
/** A closed profile of (radius, z) points, once on each side of the axis. */
const beideSeiten = (profil) => [spiegel(profil), rechts(profil)];
/**
 * Every turned part is drawn twice, once as its half section (while the valve is together) and once
 * whole (once it flies apart); the page blends the two by how far that part has left its place.
 * A half section floating in the air would be a flat strip, not a part.
 */
const zweiLagen = (schnitt, ganz) => `<g data-lage="schnitt">${schnitt}</g><g data-lage="ganz">${ganz}</g>`;
let hatchNr = 0;
/**
 * A cut face in the section tone with the hatching of technical drawings: parallel lines at 45° in the
 * cut plane, clipped to the face, so the cut parts that lie one against the other can be told apart.
 * `richtung` 1 or -1 turns the lines the other way for the neighbouring part.
 */
function schnittFlaeche(punkte, richtung = 1) {
  const poly = punkte.map((p) => [p[0], p[2]]);
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const d = [];
  // every line x - r·z = c (r = ±1) is cut with the polygon's edges; between each pair of crossings it lies inside the face
  for (let c = x0 - richtung * (richtung > 0 ? z1 : z0) - 1; c <= x1 - richtung * (richtung > 0 ? z0 : z1) + 1; c += 2.2) {
    const treffer = [];
    for (let i = 0; i < poly.length; i += 1) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      const fa = ax - richtung * az - c, fb = bx - richtung * bz - c;
      if ((fa < 0) === (fb < 0) || fa === fb) continue;
      const t = fa / (fa - fb);
      treffer.push(az + (bz - az) * t);
    }
    treffer.sort((u, v) => u - v);
    for (let i = 0; i + 1 < treffer.length; i += 2) {
      const pa = at([c + richtung * treffer[i], 0, treffer[i]]), pb = at([c + richtung * treffer[i + 1], 0, treffer[i + 1]]);
      d.push(`M${pa.map((v) => v.toFixed(1)).join(" ")}L${pb.map((v) => v.toFixed(1)).join(" ")}`);
    }
  }
  return NT.schnitt(punkte) + L(d.join(""), { tone: "faint" });
}
const umriss = (punkte) => ring3(punkte);
/** The top face of a turned part that stands above the housing: a mid-light tone and an outline, so it does not melt into the white top of the block. */
const obenFlaeche = (punkte) => `<path class="iso-shade" data-shade="2" d="${ring3(punkte)}"/>` + L(ring3(punkte), { tone: "mid" });
/** The half annulus a horizontal ring shows to the camera from above (the back half, y <= 0), at height z. */
function halbRing(rIn, rAus, z) {
  const n = 28;
  const aussen = Array.from({ length: n + 1 }, (_, i) => [XC + rAus * Math.cos((i / n) * Math.PI), -rAus * Math.sin((i / n) * Math.PI), z]);
  const innenB = Array.from({ length: n + 1 }, (_, i) => [XC + rIn * Math.cos(((n - i) / n) * Math.PI), -rIn * Math.sin(((n - i) / n) * Math.PI), z]);
  return obenFlaeche([...aussen, ...innenB]);
}
/** The same for a hexagon whose flats face the cut plane (the nut): the back half of a hexagonal ring at height z. */
function halbSechskant(rIn, rAus, z) {
  const f = rAus * Math.cos(Math.PI / 6);
  const aussen = [[XC + f, 0, z], [XC + f, -rAus / 2, z], [XC, -rAus, z], [XC - f, -rAus / 2, z], [XC - f, 0, z]];
  const n = 24;
  const innenB = Array.from({ length: n + 1 }, (_, i) => [XC - rIn * Math.cos((i / n) * Math.PI), -rIn * Math.sin((i / n) * Math.PI), z]);
  return obenFlaeche([...aussen, ...innenB]);
}

// --- Rooms of air: polygons (radius or x, z) painted over the hollows, by side of the valve ------------
// s1 is the side of port 1 (cavity under the lip, inside the insert, channel 1), s2 the side of port 2
// (ring space above the lip, the gap under the bush, channel 2). The page paints them, see the runtime.
const RAUM_RECHTECKE = [
  ["s1", [0, 12, Z1 - R_PORT, Z1 + R_PORT]], ["s1", [12, XC - R_KAV, Z1 - 4.5, Z1 + 4.5]],
  ["s1", [XC - R_KAV, XC + R_KAV, BODEN, LIPPE.mund]],                          // cavity below the lip's mouth
  ["s1", [XC - R_BOHRUNG, XC + R_BOHRUNG, BODEN, ZM]],                          // the throttle bore, up to its mouth
  ["s2", [XC + R_KAV, LAENGE - 12, Z2 - 4.5, Z2 + 4.5]], ["s2", [LAENGE - 12, LAENGE, Z2 - R_PORT, Z2 + R_PORT]],
  ["s2", [XC - R_KAV, XC + R_KAV, LIPPE.wurzel[1], Z_KAV]],                     // the ring space over the lip, wall to wall
  ["s2", [XC - R_KAV, XC + R_KAV, ZM, LIPPE.wurzel[1]]],                        // and round the insert's top
  ["s2", [XC - BUCHSE.rTasche, XC + BUCHSE.rTasche, Z_KAV, BUCHSE.zTasche]],    // the bush's pocket round the pin
];
/** The space between the insert and the lip (side 1) and the wedge outside the lip (side 2), once per side. */
const RAUM_KEILE = [
  ["s1", [[R_EIN, LIPPE.mund], [LIPPE.rZu, LIPPE.mund], [LIPPE.rZu - 0.4, LIPPE.mund], [7.8, LIPPE.wurzel[1]], [R_EIN, LIPPE.wurzel[1]]]],
  ["s2", [[LIPPE.rZu, LIPPE.mund], [R_KAV, LIPPE.mund], [R_KAV, LIPPE.wurzel[1]], [7.8, LIPPE.wurzel[1]]]],
];

// --- The housing ---------------------------------------------------------------------------------------
function gehaeuse() {
  gruppe("gehaeuse");
  const plan = { x: 0, y: -TIEFE, w: LAENGE, d: TIEFE, r: 0 };
  const rahmen = (x0, x1, z0, z1) => ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]);
  const raeume = [
    ...RAUM_RECHTECKE.map(([seite, [x0, x1, z0, z1]]) => `<path class="kammer" data-raum="${seite}" fill="none" d="${rahmen(x0, x1, z0, z1)}"/>`),
    ...RAUM_KEILE.flatMap(([seite, pt]) => beideSeiten(pt).map((s) => `<path class="kammer" data-raum="${seite}" fill="none" d="${ring3(s)}"/>`)),
  ];
  const teile = [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, HOEHE, P)}"/>`,
    // top and the right end: the two outer faces the camera sees besides the cut face
    NT.flach([[0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE], [LAENGE, 0, HOEHE], [0, 0, HOEHE]], [0, 0, 1]),
    NT.flach([[LAENGE, -TIEFE, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [LAENGE, -TIEFE, HOEHE]], [1, 0, 0]),
    // the cut face
    NT.schnitt([[0, 0, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [0, 0, HOEHE]]),
    // The hollows: all outlines first, then all fills over them, so the lines inside a junction
    // of two hollows are covered and only the outline of the union stays.
    L(HOHLRAUM.filter(([, art]) => art !== "loch").map(([[x0, x1, z0, z1]]) => rahmen(x0, x1, z0, z1)).join(""), { tone: "mid" }),
    ...HOHLRAUM.map(hohlraum),
    ...raeume,
    L(HOHLRAUM.filter(([, art]) => art === "loch").map(([[x0, x1, z0, z1]]) => ring3(Array.from({ length: 41 }, (_, i) => [(x0 + x1) / 2 + ((x1 - x0) / 2) * Math.cos((i / 40) * TAU), 0, (z0 + z1) / 2 + ((z1 - z0) / 2) * Math.sin((i / 40) * TAU)]))).join(""), { tone: "mid" }),
    L(rahmen(0, LAENGE, 0, HOEHE), { tone: "mid" }),
    L(k.segment([LAENGE, 0, HOEHE], [LAENGE, -TIEFE, HOEHE], P) + k.segment([LAENGE, -TIEFE, HOEHE], [0, -TIEFE, HOEHE], P) + k.segment([0, -TIEFE, HOEHE], [0, 0, HOEHE], P)
      + k.segment([LAENGE, -TIEFE, HOEHE], [LAENGE, -TIEFE, 0], P) + k.segment([LAENGE, -TIEFE, 0], [LAENGE, 0, 0], P), { tone: "mid" }),
  ];
  // The particles of the passages run in a layer of their own at the end of the housing's drawing: in front of
  // the cut face, behind the parts that stand in the hollows and are drawn after it.
  teile.push(`<g class="luft" data-luftlage-hinten=""></g>`);
  put([LAENGE / 2, -TIEFE / 2, HOEHE / 2], teile.join(""), materialKoerper(), { name: "gehaeuse.koerper" });
}

// --- The insert with the throttle bore ---------------------------------------------------------------------
function einsatz() {
  gruppe("einsatz");
  const F = FZ();
  const profil = [
    [[R_BOHRUNG, BODEN], [8.5, BODEN], [8.5, 11.5], [R_EIN, 11.5], [R_EIN, FENSTER[0]], [R_BOHRUNG, FENSTER[0]]],      // foot with the lower wall
    [[R_BOHRUNG, FENSTER[1]], [R_EIN, FENSTER[1]], [R_EIN, ZM], [R_BOHRUNG, ZM]],                                       // the tube above the cross holes
  ];
  const flaechen = profil.flatMap(beideSeiten);
  put([XC, 0, (BODEN + ZM) / 2], zweiLagen([
    ...flaechen.map((f) => schnittFlaeche(f, 1)),
    L(flaechen.map(umriss).join(""), { tone: "mid" }),
  ].join(""), [
    SV(G.ringBand(BODEN, 11.5, R_BOHRUNG, 8.5, F, P), { tone: "mid" }),
    SV(G.ringBand(11.5, ZM, R_BOHRUNG, R_EIN, F, P), { tone: "hi" }),
    L(G.circleOf(F, ZM, R_BOHRUNG, P), { tone: "mid" }),
  ].join("")), [
    rec(A.ring(F, BODEN, 11.5, R_BOHRUNG, 8.5, { name: "einsatz.fuss" })),
    rec(A.ring(F, 11.5, FENSTER[0], R_BOHRUNG, R_EIN, { name: "einsatz.wand1" })),
    rec(A.ring(F, FENSTER[1], ZM, R_BOHRUNG, R_EIN, { name: "einsatz.wand2" })),
  ], { name: "einsatz.fuss" });
}

// --- The lip seal and its support disc --------------------------------------------------------------------
// Two shapes of the lip are drawn on top of one another: spread against the wall (shut) and folded in
// (free); the page blends them by how far the lip has folded (data-lippe).
function manschette() {
  gruppe("manschette");
  const F = FZ();
  const [w0, w1] = LIPPE.wurzel;
  const zu = [[R_EIN, w0], [7.0, w0], [8.6, LIPPE.mund], [LIPPE.rZu, LIPPE.mund], [7.8, w1], [R_EIN, w1]];
  const auf = [[R_EIN, w0], [LIPPE.rAuf - 0.7, w0], [LIPPE.rAuf - 0.7, LIPPE.mund], [LIPPE.rAuf, LIPPE.mund], [7.8, w1], [R_EIN, w1]];
  const lage = (profil, art) => `<g data-lippe="${art}">${beideSeiten(profil).map((f) => schnittFlaeche(f, -1)).join("")}${L(beideSeiten(profil).map(umriss).join(""), { tone: "mid" })}</g>`;
  put([XC, 0, (LIPPE.mund + w1) / 2], zweiLagen([
    lage(zu, "zu"), lage(auf, "auf"),
  ].join(""), [
    SV(G.ringBand(21.5, w1, R_EIN, 7.8, F, P), { tone: "lo" }),
    SV(G.ringBand(19.5, 21.5, R_EIN, 8.6, F, P), { tone: "lo" }),
    SV(G.ringBand(LIPPE.mund, 19.5, R_EIN, LIPPE.rZu, F, P), { tone: "lo" }),
  ].join("")), [
    rec(A.ring(F, LIPPE.mund, w1, R_EIN, LIPPE.rZu, { name: "manschette.lippe" })),
  ], { name: "manschette.lippe" });
}
function scheibe() {
  gruppe("scheibe");
  const F = FZ();
  const profil = [[SCHEIBE.r[0], SCHEIBE.z[0]], [SCHEIBE.r[1], SCHEIBE.z[0]], [SCHEIBE.r[1], SCHEIBE.z[1]], [SCHEIBE.r[0], SCHEIBE.z[1]]];
  put([XC, 0, (SCHEIBE.z[0] + SCHEIBE.z[1]) / 2], zweiLagen([
    ...beideSeiten(profil).map((f) => schnittFlaeche(f, -1)),
    L(beideSeiten(profil).map(umriss).join(""), { tone: "mid" }),
  ].join(""), SV(G.ringBand(SCHEIBE.z[0], SCHEIBE.z[1], SCHEIBE.r[0], SCHEIBE.r[1], F, P), { tone: "mid" })), [
    rec(A.ring(F, SCHEIBE.z[0], SCHEIBE.z[1], SCHEIBE.r[0], SCHEIBE.r[1], { name: "scheibe.ring" })),
  ], { name: "scheibe.ring" });
}

// --- The bush, with its O-ring, and the nut ----------------------------------------------------------------
function buchse() {
  gruppe("buchse");
  const F = FZ();
  const B = BUCHSE;
  const profil = [[B.rTasche, B.z0], [R_GEW, B.z0], [R_GEW, B.bund[0]], [B.rBund, B.bund[0]], [B.rBund, B.bund[1]], [B.rHals, B.bund[1]],
    [B.rHals, B.hals[1]], [B.rInnen, B.hals[1]], [B.rInnen, B.zTasche], [B.rTasche, B.zTasche]];
  const oring = [[R_GEW + 0.3, HOEHE], [R_GEW + 1.7, HOEHE], [R_GEW + 1.7, B.bund[0]], [R_GEW + 0.3, B.bund[0]]];
  put([XC, 0, (B.z0 + B.hals[1]) / 2], zweiLagen([
    ...beideSeiten(profil).map((f) => schnittFlaeche(f, 1)),
    ...beideSeiten(oring).map((s) => `<path class="iso-shade" data-shade="0" d="${umriss(s)}"/>`),
    L([...beideSeiten(profil), ...beideSeiten(oring)].map(umriss).join(""), { tone: "mid" }),
  ].join(""), [
    SV(G.ringBand(B.z0, B.bund[0], B.rInnen, R_GEW, F, P), { tone: "mid" }),
    SV(G.ringBand(HOEHE, B.bund[0], R_GEW, R_GEW + 1.7, F, P), { tone: "lo" }),
    SV(G.ringBand(B.bund[0], B.bund[1], B.rInnen, B.rBund, F, P), { tone: "hi" }),
    SV(G.ringBand(B.bund[1], B.hals[1], B.rInnen, B.rHals, F, P), { tone: "hi" }),
    L(G.circleOf(F, B.hals[1], B.rInnen, P), { tone: "mid" }),
  ].join("")), [
    rec(A.ring(F, B.z0, B.bund[0], B.rInnen, R_GEW, { name: "buchse.gewinde" })),
    rec(A.ring(F, B.bund[0], B.bund[1], B.rInnen, B.rBund, { name: "buchse.bund" })),
    rec(A.ring(F, B.bund[1], B.hals[1], B.rInnen, B.rHals, { name: "buchse.hals" })),
    rec(A.ring(F, HOEHE, B.bund[0], R_GEW, R_GEW + 1.7, { name: "buchse.oring" })),
  ], { name: "buchse.gewinde" });

  gruppe("kontermutter");
  const f = MUTTER.rHex * Math.cos(Math.PI / 6);
  const nut = [[MUTTER.rIn, MUTTER.z[0]], [f, MUTTER.z[0]], [f, MUTTER.z[1]], [MUTTER.rIn, MUTTER.z[1]]];
  put([XC, 0, (MUTTER.z[0] + MUTTER.z[1]) / 2], zweiLagen([
    ...beideSeiten(nut).map((f) => schnittFlaeche(f, -1)),
    L(beideSeiten(nut).map(umriss).join(""), { tone: "mid" }),
  ].join(""), [
    SV(G.prismOf(F, sechskant(MUTTER.rHex), MUTTER.z[0], MUTTER.z[1], P), { tone: "mid" }),
    L(G.circleOf(F, MUTTER.z[1], MUTTER.rIn, P), { tone: "mid" }),
  ].join("")), [
    rec(A.ring(F, MUTTER.z[0], MUTTER.z[1], MUTTER.rIn, f - 0.2, { name: "kontermutter.mutter" })),
  ], { name: "kontermutter.mutter" });
}

// --- The regulating screw with the pin; it moves with the regulator (data-hub) ---------------------------------
const schraubenProfil = (zt) => {
  // half profile (radius, z) from the tip up to the head's neck: pin cone, cylinder, step to the thread, thread
  const zKonusEnde = zt + L_KONUS;
  const stufe = BUCHSE.zTasche + (zt - ZT0);              // the step from the thin pin to the thread follows the screw
  const rStufe = zKonusEnde > stufe ? R_SPITZE + KONUS * (stufe - zt) : R_BOHRUNG;
  const punkte = [[R_SPITZE, zt]];
  if (zKonusEnde <= stufe) punkte.push([R_BOHRUNG, zKonusEnde]);
  punkte.push([rStufe, stufe], [BUCHSE.rInnen, stufe], [BUCHSE.rInnen, Z_SCHAFT_OBEN]);
  return punkte;
};
function schraube() {
  gruppe("schraube");
  const F = FZ();
  const hz = schraubenProfil(ZT0);
  const links = hz.map(([r, z]) => [XC - r, 0, z]);
  const rechtsP = hz.slice().reverse().map(([r, z]) => [XC + r, 0, z]);
  const flaechenPunkte = [...links, ...rechtsP];
  const gewinde = [];
  for (let z = BUCHSE.zTasche + (ZT0 - ZT0) + 1.2; z < BUCHSE.hals[1] - 0.8; z += 1.3) {
    gewinde.push(`M${at([XC - BUCHSE.rInnen, 0, z]).map((v) => v.toFixed(1)).join(" ")}L${at([XC + BUCHSE.rInnen, 0, z]).map((v) => v.toFixed(1)).join(" ")}`);
  }
  const ganzProfil = hz.map(([r, z]) => [z, r]);
  put([XC, 0, (ZT0 + Z_KOPF[1]) / 2], [
    zweiLagen([
      schnittFlaeche(flaechenPunkte, -1),
      L(umriss(flaechenPunkte), { tone: "mid" }),
      L(gewinde.join(""), { tone: "faint" }),
    ].join(""), SV(G.solidOf(ganzProfil, F, P), { tone: "hi" })),
    SV(G.disc(Z_KOPF[0], Z_KOPF[1], R_KOPF, F, P), { tone: "hi" }),
    L(G.ribsOf(F, Z_KOPF[0] + 0.6, Z_KOPF[1] - 1, R_KOPF, 22, P, { seams: true }), { tone: "faint" }),
    L(G.circleOf(F, Z_KOPF[1], 3.2, P), { tone: "faint" }),
  ].join(""), [
    rec(A.solid(F, [[ZT0, R_SPITZE], [ZT0 + L_KONUS, R_BOHRUNG - 0.05], [BUCHSE.zTasche, R_BOHRUNG - 0.05], [BUCHSE.zTasche, BUCHSE.rInnen], [Z_SCHAFT_OBEN, BUCHSE.rInnen]], { name: "schraube.zapfen" })),
    rec(A.disc(F, Z_KOPF[0], Z_KOPF[1], R_KOPF, { name: "schraube.kopf" })),
  ], { name: "schraube.zapfen", hub: true });
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

// --- Fittings and hoses ---------------------------------------------------------------------------------------
function anschluesse() {
  for (const nr of [1, 2]) {
    NT.verschraubung(FPORT[nr], VERSCHRAUBUNG, "verschraubung", `verschraubung${nr}`, ortPort(nr), R_STUMMEL);
  }
  gruppe("leitung");
  for (const nr of [1, 2]) {
    const punkte = WEGE[nr];
    // The far end is cut off in the air on purpose: it is no tip that must land on a part.
    R.route(`leitung.${nr}`, punkte, R_SCHLAUCH, { piece: "leitung", move: MOVE.leitung, ends: [true, false], free: [true, false] });
    const stuecke = tubePieces(punkte, R_SCHLAUCH, P, { maxLength: 14 });
    stuecke.forEach((teil, i) => {
      const letztes = i === stuecke.length - 1;
      put(teil.mid, tubeSvg(teil, { tone: "mid" }) + (letztes ? schnittEnde(punkte, R_SCHLAUCH, R_SCHLAUCH_INNEN) : ""),
        [A.tube(teil.points, teil.radii)],
        { name: `leitung.schlauch${nr}:${i}`, route: `leitung.${nr}`, chunk: i });
    });
  }
}

// --- Compose ----------------------------------------------------------------------------------------------------
gehaeuse();
anschluesse();
einsatz();
scheibe();
manschette();
buchse();
schraube();

const LEGENDE_IDS = LEGENDE.map((e) => e.piece);
for (const it of R.items) {
  if (!LEGENDE_IDS.includes(it.piece)) throw new Error(`Teil ${it.name} hat keine Legendennummer (${it.piece})`);
}
if (STAGGER.length !== LEGENDE_IDS.length || !LEGENDE_IDS.every((id) => STAGGER.includes(id))) {
  throw new Error("STAGGER und LEGENDE nennen nicht dieselben Baugruppen");
}

A.settle(R, P);
// The housing is the back drop of everything inside it.
const eintrag = (name) => R.items.find((it) => it.name === name);
{
  const unten = Math.min(...R.items.filter((it) => it.name !== "gehaeuse.koerper").map((it) => it.key));
  eintrag("gehaeuse.koerper").key = unten - 1;
  // The turned parts are drawn flat in the cut plane and share one axis, so no depth order tells them
  // apart; they are drawn in the order of their mounting, from the inside out.
  const reihe = ["einsatz.fuss", "scheibe.ring", "manschette.lippe", "buchse.gewinde", "kontermutter.mutter", "schraube.zapfen"].map(eintrag);
  const basis = Math.min(...reihe.map((it) => it.key));
  reihe.forEach((it, i) => { it.key = basis + i * 0.01; });
}
R.items.sort((a, b) => a.key - b.key);

const { KEYS, LIFT, VIEW0, VIEW1: VIEW1_ROH, MITTE } = EX.vorbereiten(R, P, MOVE, W, H);
// vorbereiten measures the parts' places, not their extent: the housing is big, so the view
// with everything out is widened by a tenth about its centre (same aspect ratio).
const VIEW1 = (([x, y, w, h]) => [x - w * 0.06, y - h * 0.06, w * 1.12, h * 1.12])(VIEW1_ROH);

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein Drosselrückschlagventil mit G1/4-Anschlüssen im Schnitt durch die Mitte: Anschluss 1 links liegt tiefer, Anschluss 2 rechts höher. "
    + "In der Mitte sitzen von oben die Regulierschraube mit Rändelkopf und kegeligem Zapfen, die Einschraubbuchse mit der Mutter und der Ventileinsatz mit der Drosselbohrung; "
    + "um den Einsatz liegen die Dichtmanschette und die Stützscheibe. Links und rechts stecken Schläuche in den Steckverschraubungen.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}">${it.svg}</g>`).join(""),
    `<g class="luft" data-luftlage=""></g>`,
  ],
});

// --- The page (the live behaviour follows with the air and the controls) --------------------------------
const live = `
const P = ${JSON.stringify(P)};
const MOVE = ${JSON.stringify(MOVE)};
const ORDER = ${JSON.stringify(STAGGER)};
const SPR = ${JSON.stringify(EX.SPRING)};
const TAKT = ${JSON.stringify(EX.TAKT)};
const KEYS = ${JSON.stringify(KEYS)};
const LIFT = ${JSON.stringify(LIFT)};
const VIEW0 = ${JSON.stringify(VIEW0)};
const VIEW1 = ${JSON.stringify(VIEW1.map((v) => Math.round(v * 10) / 10))};
const MITTE = ${JSON.stringify(Object.fromEntries(Object.entries(MITTE).map(([a, b]) => [a, b.map((v) => Math.round(v * 10) / 10)])))};
const STEP = ${JSON.stringify(LEG.tabelle(LEGENDE))};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = Array.from(svg.querySelectorAll("[data-g]"));
const info = document.querySelector(".pickinfo");
${EX.LAUFZEIT}
${LEG.LAUFZEIT}
${EX.ABLAUF}
const lagen = Array.from(svg.querySelectorAll("[data-lage]"));
// Every turned part: its half section while it sits in place, the whole part once it has left.
function zeichneLagen() {
  for (const el of lagen) {
    const x = spr[el.closest("[data-g]").dataset.piece]?.x ?? 0;
    const ganz = Math.min(1, Math.max(0, x * 6));
    const wert = el.dataset.lage === "ganz" ? ganz : 1 - ganz;
    if (el.dataset.stand !== String(wert)) { el.style.opacity = String(wert); el.dataset.stand = String(wert); }
  }
}
function bildZeichnen() { zeichneLagen(); }
function vorDemZerlegen() {}
zeichneLagen();
poseExplode();
window.__figur = { zerlegt: () => zerlegt, offen: () => offenAnteil(), spiele, waehle };
`;

const LEISTE = knopf("btn-explode", "Zerlegen und zusammenbauen") + `<span class="luecke"></span>` + hausBedienung();
const ZIEL = join(HIER, "..", "..", "index.html");
mkdirSync(dirname(ZIEL), { recursive: true });
const html = seite({
  titel: "Drosselrückschlagventil – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "Drosselrückschlagventil",
  hinweis: "zerlegen",
  anzeige: "in Arbeit",
  schluessel: [{ mark: "lit", label: "Teile im Schnitt" }],
  caption: "Drosselrückschlagventil, G1/4, im Schnitt.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.",
  lesetext: "",
  laufzeit: live,
  breite: 1240,
  buehneLabel: "Drosselrückschlagventil im Schnitt",
}).replace("</style>", `${LU.CSS}${SCHNITT_CSS}\n[data-lage="ganz"] { opacity: 0; pointer-events: none }</style>`);
writeFileSync(ZIEL, html);

console.log(`geschrieben: ${ZIEL}`);
console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
console.log(`Nummern an: ${Object.keys(MITTE).join(", ")}`);

if (process.argv.includes("--apart")) {
  for (const shape of R.solids) shape.move = MOVE[shape.piece] ?? [0, 0, 0];
  const probleme = A.solidClearances(R.solids, { state: 1 });
  for (const p of probleme.slice(0, 20)) console.log(`  ${p.a ?? p.one ?? ""} × ${p.b ?? p.two ?? ""}  ${JSON.stringify(p).slice(0, 150)}`);
  console.log(`Ansicht auseinandergefahren: ${VIEW1.map((v) => v.toFixed(0)).join(" ")}`);
  console.log(probleme.length ? `auseinandergefahren: ${probleme.length} Durchdringungen` : "auseinandergefahren: sauber");
  if (probleme.length) process.exit(1);
}

if (process.argv.includes("--audit")) {
  A.auditOrExit(R, P, {
    allow: [
      // Parts that stand in a half-cut hole of the housing: the cut face is in front of their back half
      // and behind their front half, so no drawing order is right. The housing is drawn first and its
      // hollows are painted over the cut face, which is what the eye expects (the same excuse the
      // cylinder pages make for a rod in its gland).
      ["gehaeuse.koerper", "verschraubung1.*"], ["gehaeuse.koerper", "verschraubung2.*"],
      ["gehaeuse.koerper", "einsatz.*"], ["gehaeuse.koerper", "scheibe.*"], ["gehaeuse.koerper", "manschette.*"],
      ["gehaeuse.koerper", "buchse.*"], ["gehaeuse.koerper", "schraube.*"],
      // The turned parts sit one inside the other on a common axis and are drawn as flat cut faces in
      // one plane: they are drawn in the order of their mounting (see the keys above).
      ["einsatz.*", "scheibe.*"], ["einsatz.*", "manschette.*"], ["einsatz.*", "schraube.*"], ["scheibe.*", "manschette.*"],
      ["buchse.*", "kontermutter.*"], ["buchse.*", "schraube.*"], ["schraube.*", "kontermutter.*"],
      ["buchse.*", "manschette.*"], ["buchse.*", "einsatz.*"],
    ],
    crowd: [],
    cover: [],
  });
}
