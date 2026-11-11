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
// The core (insert, lip seal, bush, pin) is drawn large: about half of the block's width, so that the ring
// gap and the lip can be seen at overview scale. The sizes are estimates anyway (README).
const XC = 35;                                   // the axis of the screw, insert and bush
const LAENGE = 70, TIEFE = 16, HOEHE = 58;       // housing block; the half y in [-16, 0] is kept
const Z1 = 16, Z2 = 33;                          // port axes: 1 low on the left, 2 higher on the right
const R_PORT = 6.5;                              // G1/4 thread bore, outside Ø 13.2
const R_STUMMEL = R_PORT - 0.2;                  // the threaded stub of a fitting, clear of the thread
const BODEN = 9;                                 // floor of the central cavity (= bottom of channel 1)
const R_KAV = 14, Z_KAV = 36.5;                  // cavity for the insert and the lip: up to the bush's lower end
const R_GEW = 16;                                // thread bore of the bush, from Z_KAV to the top face
const ZM = 33;                                   // top of the insert: the throttle bore's mouth
const R_BOHRUNG = 4.5;                           // throttle bore (exaggerated, see README)
const R_EIN = 10;                                // outside of the insert's tube
const R_FUSS = 12.5, Z_FUSS = 12.5;              // the insert's foot
const FENSTER = [14.5, 17.5];                    // the cross holes in the insert's wall: air from port 1 enters
// The lip seal: root heights, height and radius of the mouth when it is shut / folded in, radius of its root
const LIPPE = { wurzel: [28, 31], mund: 22, rZu: 13.8, rAuf: 11.3, rWurzel: 12, rMundInnen: 11.4, rMundInnenAuf: 10.1 };
const SCHEIBE = { z: [19.5, 21], r: [R_EIN, 12.5] };                    // the support disc
// The pin (Zapfen) of the screw: a cone that grows in radius up to the bore's radius over six millimetres.
const L_KONUS = 6, R_SPITZE = 1, KONUS = (R_BOHRUNG - R_SPITZE) / L_KONUS;
const U0 = M.umdrehungen / 2;                    // start: half open
const zSpitze = (u) => ZM - L_KONUS + M.steigung * u;   // closed at 0 turns: the cone's base meets the mouth
const ZT0 = zSpitze(U0);
const BUCHSE = { z0: Z_KAV, bund: [HOEHE + 2, HOEHE + 7], hals: [HOEHE + 7, HOEHE + 25], rBund: 19.5, rHals: 13, rInnen: 7, rTasche: 8.5, zTasche: Z_KAV + 3 };
const MUTTER = { z: [HOEHE + 10, HOEHE + 18], rIn: 13, rHex: 20 };
const R_KOPF = 12, Z_KOPF = [HOEHE + 28, HOEHE + 40];
const Z_SCHAFT_OBEN = Z_KOPF[0];
// The half profiles (radius, z) of the turned parts: the section in the figure and the detail panel are drawn from the same ones.
const PROFIL_EINSATZ = [
  [[R_BOHRUNG, BODEN], [R_FUSS, BODEN], [R_FUSS, Z_FUSS], [R_EIN, Z_FUSS], [R_EIN, FENSTER[0]], [R_BOHRUNG, FENSTER[0]]],      // foot with the lower wall
  [[R_BOHRUNG, FENSTER[1]], [R_EIN, FENSTER[1]], [R_EIN, ZM], [R_BOHRUNG, ZM]],                                       // the tube above the cross holes
];
const PROFIL_LIPPE = {
  zu: [[R_EIN, LIPPE.wurzel[0]], [R_EIN + 0.5, LIPPE.wurzel[0]], [LIPPE.rMundInnen, LIPPE.mund], [LIPPE.rZu, LIPPE.mund], [LIPPE.rWurzel, LIPPE.wurzel[1]], [R_EIN, LIPPE.wurzel[1]]],
  auf: [[R_EIN, LIPPE.wurzel[0]], [LIPPE.rMundInnenAuf, LIPPE.wurzel[0]], [LIPPE.rMundInnenAuf, LIPPE.mund], [LIPPE.rAuf, LIPPE.mund], [LIPPE.rWurzel, LIPPE.wurzel[1]], [R_EIN, LIPPE.wurzel[1]]],
};
const PROFIL_SCHEIBE = [[SCHEIBE.r[0], SCHEIBE.z[0]], [SCHEIBE.r[1], SCHEIBE.z[0]], [SCHEIBE.r[1], SCHEIBE.z[1]], [SCHEIBE.r[0], SCHEIBE.z[1]]];
const PROFIL_BUCHSE = [[BUCHSE.rTasche, BUCHSE.z0], [R_GEW, BUCHSE.z0], [R_GEW, BUCHSE.bund[0]], [BUCHSE.rBund, BUCHSE.bund[0]], [BUCHSE.rBund, BUCHSE.bund[1]], [BUCHSE.rHals, BUCHSE.bund[1]],
  [BUCHSE.rHals, BUCHSE.hals[1]], [BUCHSE.rInnen, BUCHSE.hals[1]], [BUCHSE.rInnen, BUCHSE.zTasche], [BUCHSE.rTasche, BUCHSE.zTasche]];
const LOCH = { x: [9, 61], z: 47, r: 4 };        // the two mounting holes, across the block

// Fittings and hoses along the port axis, s from the housing's face outward.
const VERSCHRAUBUNG = { gewinde: [-12, 0], sechskant: [0, 4.5], rS: 7.6, koerper: [4.5, 11], rK: 6, ring: [11, 12.5], rR: 5.2 };
const R_SCHLAUCH = 4, R_SCHLAUCH_INNEN = 3;
const SCHLAUCH_LAENGE = 14;                      // the hose stubs drawn in the section
const WEGE = Object.fromEntries([1, 2].map((nr) => {
  const v = nr === 1 ? -1 : 1;
  const s0 = VERSCHRAUBUNG.ring[1];
  const za = nr === 1 ? Z1 : Z2;
  const p0 = [v === -1 ? -s0 : LAENGE + s0, 0, za];
  // seen whole (while the valve is taken apart) the left one bends towards the viewer, so that its cut end faces us
  return [nr, v === -1 ? stummel(p0, [-1, 0, 0], [p0[0] - 12, 15, za - 2], [-0.35, 0.92, -0.1], 6) : stummel(p0, [1, 0, 0], [p0[0] + 12, 0, za], [1, 0, 0], 8)];
}));

// The extreme points of what is drawn: the block, the fittings' hoses, the knurled head.
const P = k.fitProjection(
  [[-VERSCHRAUBUNG.ring[1] - SCHLAUCH_LAENGE, 0, 0], [LAENGE + VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE, 0, 0], [0, -TIEFE, 0], [LAENGE, -TIEFE, 0], [0, 0, 0], [LAENGE, 0, 0], [0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE],
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
  leitung: [0, 50, 6],
  verschraubung: [0, 32, 4],
  schraube: [-30, 0, 88],
  kontermutter: [34, 0, 90],
  buchse: [0, 0, 65],
  manschette: [30, 0, 62],
  scheibe: [-28, 0, 45],
  einsatz: [0, 0, 14],
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
  [[XC + R_KAV, LAENGE - 12, Z2 - 3.5, Z2 + 3.5], "h"],             // channel 2: into the ring space
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
/** The hatching of a polygon of (x, z) points: parallel 45° lines, each cut with the polygon's edges and kept between pairs of crossings. */
function hatchSegmente(poly, richtung = 1) {
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const segmente = [];
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
    for (let i = 0; i + 1 < treffer.length; i += 2) segmente.push([[c + richtung * treffer[i], treffer[i]], [c + richtung * treffer[i + 1], treffer[i + 1]]]);
  }
  return segmente;
}
function schnittFlaeche(punkte, richtung = 1) {
  const d = hatchSegmente(punkte.map((p) => [p[0], p[2]]), richtung)
    .map(([a, b]) => `M${at([a[0], 0, a[1]]).map((v) => v.toFixed(1)).join(" ")}L${at([b[0], 0, b[1]]).map((v) => v.toFixed(1)).join(" ")}`);
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
/** The bores of the cut fittings and hoses outside the block (the air inside them is part of the figure). */
const AUSSEN_HOHL = [
  [[-VERSCHRAUBUNG.ring[1] - SCHLAUCH_LAENGE, 0, Z1 - 4, Z1 + 4], "h"],
  [[LAENGE, LAENGE + VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE, Z2 - 4, Z2 + 4], "h"],
];
const RAUM_RECHTECKE = [
  ["s1", [0, 12, Z1 - R_PORT, Z1 + R_PORT]], ["s1", [12, XC - R_KAV, Z1 - 4.5, Z1 + 4.5]],
  ["s1", [XC - R_KAV, XC + R_KAV, BODEN, LIPPE.mund]],                          // cavity below the lip's mouth
  ["s1", [XC - R_BOHRUNG, XC + R_BOHRUNG, BODEN, ZM]],                          // the throttle bore, up to its mouth
  ["s2", [XC + R_KAV, LAENGE - 12, Z2 - 3.5, Z2 + 3.5]], ["s2", [LAENGE - 12, LAENGE, Z2 - R_PORT, Z2 + R_PORT]],
  ["s2", [XC - R_KAV, XC + R_KAV, LIPPE.wurzel[1], Z_KAV]],                     // the ring space over the lip, wall to wall
  ["s2", [XC - R_KAV, XC + R_KAV, ZM, LIPPE.wurzel[1]]],                        // and round the insert's top
  ["s2", [XC - BUCHSE.rTasche, XC + BUCHSE.rTasche, Z_KAV, BUCHSE.zTasche]],    // the bush's pocket round the pin
];
/** The space between the insert and the lip (side 1) and the wedge outside the lip (side 2), once per side. */
const RAUM_KEILE = [
  ["s1", [[R_EIN, LIPPE.mund], [LIPPE.rZu, LIPPE.mund], [LIPPE.rZu - 0.4, LIPPE.mund], [LIPPE.rWurzel, LIPPE.wurzel[1]], [R_EIN, LIPPE.wurzel[1]]]],
  ["s2", [[LIPPE.rZu, LIPPE.mund], [R_KAV, LIPPE.mund], [R_KAV, LIPPE.wurzel[1]], [LIPPE.rWurzel, LIPPE.wurzel[1]]]],
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
    NT.schnitt([[0, 0, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [0, 0, HOEHE]]).replace("<path ", '<path data-mass="" '),   // data-mass: the browser test reads the scale from it
    // The hollows: all outlines first, then all fills over them, so the lines inside a junction
    // of two hollows are covered and only the outline of the union stays.
    L(HOHLRAUM.filter(([, art]) => art !== "loch").map(([[x0, x1, z0, z1]]) => rahmen(x0, x1, z0, z1)).join(""), { tone: "mid" }),
    ...HOHLRAUM.map(hohlraum),
    // the round walls behind the cut: the far half of the insert's bore, of the gaps round the insert and of the pocket round the pin
    ...[[XC - R_BOHRUNG, XC + R_BOHRUNG, BODEN, ZM], [XC - R_KAV, XC - R_EIN, BODEN, Z_KAV], [XC + R_EIN, XC + R_KAV, BODEN, Z_KAV],
      [XC - BUCHSE.rTasche, XC + BUCHSE.rTasche, Z_KAV, BUCHSE.zTasche]].map((r) => hohlraum([r, "v"])),
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
  const profil = PROFIL_EINSATZ;
  const flaechen = profil.flatMap(beideSeiten);
  put([XC, 0, (BODEN + ZM) / 2], zweiLagen([
    ...flaechen.map((f) => schnittFlaeche(f, 1)),
    L(flaechen.map(umriss).join(""), { tone: "mid" }),
    // the mouth of the throttle bore, where the pin's cone must sit at 0 turns (a mark for the browser test)
    `<circle data-mund="" cx="${at([XC, 0, ZM])[0].toFixed(2)}" cy="${at([XC, 0, ZM])[1].toFixed(2)}" r="0.05" fill="none"/>`,
  ].join(""), [
    SV(G.ringBand(BODEN, Z_FUSS, R_BOHRUNG, R_FUSS, F, P), { tone: "mid" }),
    SV(G.ringBand(Z_FUSS, ZM, R_BOHRUNG, R_EIN, F, P), { tone: "hi" }),
    L(G.circleOf(F, ZM, R_BOHRUNG, P), { tone: "mid" }),
  ].join("")), [
    rec(A.ring(F, BODEN, Z_FUSS, R_BOHRUNG, R_FUSS, { name: "einsatz.fuss" })),
    rec(A.ring(F, Z_FUSS, FENSTER[0], R_BOHRUNG, R_EIN, { name: "einsatz.wand1" })),
    // the cross holes are two small drillings in the tube, not a slit round it: between the two walls the tube is whole
    rec(A.ring(F, FENSTER[0], FENSTER[1], R_BOHRUNG, R_EIN, { name: "einsatz.steg" })),
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
  const { zu, auf } = PROFIL_LIPPE;
  // the rubber is drawn dark, like the black rings of the catalogue
  const lage = (profil, art) => `<g data-lippe="${art}">${beideSeiten(profil).map((f) => `<path class="iso-shade" data-shade="0" style="fill:var(--anatomy-strong)" d="${umriss(f)}"/>`).join("")}${L(beideSeiten(profil).map(umriss).join(""), { tone: "mid" })}</g>`;
  put([XC, 0, (LIPPE.mund + w1) / 2], zweiLagen([
    lage(zu, "zu"), lage(auf, "auf"),
  ].join(""), [
    SV(G.ringBand(w0, w1, R_EIN, LIPPE.rWurzel, F, P), { tone: "lo" }),
    SV(G.ringBand((w0 + LIPPE.mund) / 2, w0, R_EIN, LIPPE.rMundInnen, F, P), { tone: "lo" }),
    SV(G.ringBand(LIPPE.mund, (w0 + LIPPE.mund) / 2, R_EIN, LIPPE.rZu, F, P), { tone: "lo" }),
  ].join("")), [
    rec(A.ring(F, LIPPE.mund, w1, R_EIN, LIPPE.rZu, { name: "manschette.lippe" })),
  ], { name: "manschette.lippe" });
}
function scheibe() {
  gruppe("scheibe");
  const F = FZ();
  const profil = PROFIL_SCHEIBE;
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
  const profil = PROFIL_BUCHSE;
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

// The fittings and the hose stubs cut in the same plane as the block: walls in the section tone, the bore free, so the
// way of the air from the hose to the core can be followed. While they leave the valve the whole parts are shown.
function anschlussSchnitte() {
  for (const nr of [1, 2]) {
    const v = nr === 1 ? -1 : 1, za = nr === 1 ? Z1 : Z2;
    const x = (sOut) => (v < 0 ? -sOut : LAENGE + sOut);
    const streifen = (s0, s1, rIn, rAus, richtung) => [[x(s0), x(s1)].sort((a, b) => a - b), rIn, rAus, richtung];
    const teile = [
      [[-12, 0], 4, R_STUMMEL, 1],                       // the threaded stub, in the housing's port bore
      [[0, 4.5], 4, 6.6, -1],                            // the hexagon (across the flats at the cut)
      [[4.5, 11], 4, 6, 1],                              // the body
      [[11, 12.5], 4, 5.2, -1],                          // the release collar
    ];
    // the bore outside the block, with its far wall and its room of air: part of the fitting's section
    const bohrung = AUSSEN_HOHL[nr - 1][0];
    const flaechen = [`<g data-hohl="">${hohlraum(AUSSEN_HOHL[nr - 1])}`, `<path class="kammer" data-raum="${nr === 1 ? "s1" : "s2"}" fill="none" d="${ring3([[bohrung[0], 0, bohrung[2]], [bohrung[1], 0, bohrung[2]], [bohrung[1], 0, bohrung[3]], [bohrung[0], 0, bohrung[3]]])}"/></g>`], linien = [];
    for (const [[s0, s1], rIn, rAus, richtung] of teile) {
      const [xa, xb] = [x(s0), x(s1)].sort((a, b) => a - b);
      for (const [za0, za1] of [[za + rIn, za + rAus], [za - rAus, za - rIn]]) {
        const poly = [[xa, 0, za0], [xb, 0, za0], [xb, 0, za1], [xa, 0, za1]];
        flaechen.push(schnittFlaeche(poly, richtung));
        linien.push(ring3(poly));
      }
    }
    const [ha, hb] = [x(VERSCHRAUBUNG.ring[1]), x(VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)].sort((a, b) => a - b);
    for (const [za0, za1] of [[za + R_SCHLAUCH_INNEN, za + R_SCHLAUCH], [za - R_SCHLAUCH, za - R_SCHLAUCH_INNEN]]) {
      const poly = [[ha, 0, za0], [hb, 0, za0], [hb, 0, za1], [ha, 0, za1]];
      linien.push(ring3(poly));
      flaechen.push(`<path class="iso-shade" data-shade="0" d="${ring3(poly)}"/>`);
    }
    // The section hangs on the whole fitting's first item (an item without a recorded body would not pass the audit)
    // and is drawn before it: the part's own recorded body is the whole stub.
    const trager = R.items.find((it) => it.name === `verschraubung${nr}.gewinde`);
    trager.svg = `<g data-lage="schnitt">${flaechen.join("")}${L(linien.join(""), { tone: "mid" })}</g><g data-lage="ganz">${trager.svg}</g>`;
  }
}

// --- Compose ----------------------------------------------------------------------------------------------------
gehaeuse();
anschluesse();
anschlussSchnitte();
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
  // the whole fittings and hoses are what is seen once they have left; in place the cut ones are
  for (const it of R.items) if ((it.piece === "verschraubung" || it.piece === "leitung") && !it.svg.startsWith("<g data-lage=\"schnitt\">")) it.svg = `<g data-lage="ganz">${it.svg}</g>`;
}
R.items.sort((a, b) => a.key - b.key);

const { KEYS, LIFT, VIEW0, VIEW1: VIEW1_ROH, MITTE } = EX.vorbereiten(R, P, MOVE, W, H);
// vorbereiten measures the parts' places, not their extent: the housing is big, so the view
// with everything out is widened by a few percent about its centre (same aspect ratio).
const VIEW1 = (([x, y, w, h]) => [x - w * 0.03, y - h * 0.03, w * 1.06, h * 1.06])(VIEW1_ROH);


// --- Air: the ways the particles take, in the cut plane, always in the direction 1 → 2 ----------------------
// They run only through free space, never over a cut face: round the insert through its cross holes, up the
// throttle bore, through the ring gap between pin and bore (this part follows the pin: the page calls
// `spaltBahnen` whenever the pin has moved), over the insert's top into the ring space and out of channel 2;
// and, when the lip is folded in, down the ring space outside the lip and straight across at the height of the
// cross holes. The streams sit in the housing's back layer, the hoses' in the front layer.
// Free spaces the particles use: the middle of the ring space outside the lip, the gaps between insert and wall.
const X_RING = (LIPPE.rWurzel + R_KAV) / 2;      // distance of the ring space's middle from the axis
const X_MIT = (R_EIN + R_KAV) / 2;               // the middle of the gap between the insert's tube and the cavity's wall
const X_TASCHE = (R_BOHRUNG + BUCHSE.rTasche) / 2;   // the middle of the pocket round the pin
const Z_OBEN = ZM + 1.8;                         // over the insert's top, under the bush
const X_ENDE = LAENGE - 21;                      // where the ways end in channel 2: clear of the fitting
const SPALT = { XC, ZM, Z1, Z2, R_BOHRUNG, R_SPITZE, KONUS, ZT0, X_RING, X_MIT, X_TASCHE, Z_OBEN, X_ENDE, LAENGE };
const SPALT_GEO = { R_SPITZE, LAENGE, HOEHE, LIPPE_ZU: LIPPE.rZu, LIPPE_AUF: LIPPE.rAuf, L_KONUS };
/** The routes through the ring gap for a pin whose tip stands at `zt`: left leg bl/gl, right leg b/g. A pure
 * function of its two arguments, because the page embeds its source and calls it whenever the pin has moved. */
function spaltBahnen(S, zt) {
  const mitte = (z) => (Math.min(S.R_BOHRUNG, S.R_SPITZE + S.KONUS * Math.max(0, z - zt)) + S.R_BOHRUNG) / 2;   // middle of the free band at height z
  const lauf = (seite) => {
    const x = (r) => S.XC + seite * r;
    const zu = Math.max(S.Z1 + 1, zt - 1.0);
    const hoch = [[x(1.5), 0, zu], [x(mitte(zt + 0.4)), 0, zt + 0.4], [x(mitte(S.ZM - 0.2)), 0, S.ZM - 0.2]];
    return {
      b: [[S.XC - seite * (S.R_BOHRUNG + 1), 0, S.Z1], [x(1.5), 0, S.Z1], ...hoch],
      g: [[x(mitte(S.ZM - 0.2)), 0, S.ZM - 0.2], [x(S.X_TASCHE), 0, S.Z_OBEN], [x(S.X_RING), 0, S.Z_OBEN],
        ...(seite > 0 ? [[x(S.X_RING), 0, S.Z2], [S.X_ENDE, 0, S.Z2]] : [])],
    };
  };
  const l = lauf(-1), r = lauf(1);
  return { b: r.b, g: r.g, bl: l.b, gl: l.g };
}
// The streams in the channels and fittings run through the cut bores: hose end → fitting → port bore → channel.
const ROUTEN_FEST = {
  z1: [[-VERSCHRAUBUNG.ring[1] - SCHLAUCH_LAENGE + 1, 0, Z1], [14, 0, Z1]],
  k1: [[13.5, 0, Z1], [XC - X_MIT, 0, Z1]],
  w: [[XC - X_MIT, 0, Z1], [XC + X_MIT, 0, Z1]],
  l: [[XC + X_RING, 0, Z1], [XC + X_RING, 0, Z1 + 4], [XC + X_RING, 0, Z2]],
  z2: [[LAENGE - 14, 0, Z2], [LAENGE + VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE - 1, 0, Z2]],
};
const BAHNEN = Object.fromEntries(Object.entries({ ...ROUTEN_FEST, ...spaltBahnen(SPALT, ZT0) }).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]));
const SEITE_VON = { z1: "s1", k1: "s1", w: "s1", b: "s1", bl: "s1", l: "s2", g: "s2", gl: "s2", z2: "s2" };

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein Drosselrückschlagventil mit G1/4-Anschlüssen im Schnitt durch die Mitte: Anschluss 1 links liegt tiefer, Anschluss 2 rechts höher. "
    + "In der Mitte sitzen von oben die Regulierschraube mit Rändelkopf und kegeligem Zapfen, die Einschraubbuchse mit der Mutter und der Ventileinsatz mit der Drosselbohrung; "
    + "um den Einsatz liegen die Dichtmanschette und die Stützscheibe. Der Ringspalt zwischen Zapfen und Bohrung ist die Drossel, die Lippe der Manschette das Rückschlagventil. "
    + "Die Druckluft ist eingefärbt: das kräftige Blau steht unter Druck, das blasse ist entspannte Luft hinter der Drossel.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}">${it.svg}</g>`).join(""),
    `<g class="luft" data-luftlage=""></g>`,
  ],
});

// --- The page ------------------------------------------------------------------------
const komma = (x, n = 1) => x.toFixed(n).replace(".", ",");
const DP = 1;                                        // bar: the catalogue's pressure drop (6 bar in, 5 bar out)
const START = { richtung: DROSSELRICHTUNG, umdrehungen: M.umdrehungen / 2 };
const ANZEIGE = anzeigeZeile(anzeige(neuerZustand(M, START.umdrehungen), M, { richtung: START.richtung, dpBar: DP }), START.richtung, DP);
const q = (richtung, u) => durchfluss(richtung, u, DP, M);

// --- The detail panel ("Lupe"): a flat section of the core, drawn from the same profiles ----------------------
// The pin, the lip, the tones of the rooms and the arrows follow the same model state as the isometric figure.
const LUPE = { sx: 10, x0: XC - 19, x1: XC + 19, zUnten: BODEN - 2, zOben: Z_KAV + 12 };
const lupeP = (x, z) => `${((x - LUPE.x0) * LUPE.sx).toFixed(1)} ${((LUPE.zOben - z) * LUPE.sx).toFixed(1)}`;
const lupePfad = (pts) => `M${pts.map(([x, z]) => lupeP(x, z)).join("L")}Z`;
const lupeSeiten = (profil) => [profil.map(([r, z]) => [XC - r, z]), profil.map(([r, z]) => [XC + r, z])];
const lupeFlaeche = (pts, richtung) => `<path class="iso-shade" data-shade="3" data-schnitt="" d="${lupePfad(pts)}"/>`
  + (richtung ? L(hatchSegmente(pts, richtung).map(([a, b]) => `M${lupeP(...a)}L${lupeP(...b)}`).join(""), { tone: "faint" }) : "");
const lupeRahmen = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
function lupeSvg() {
  const gehaeuse = lupeRahmen(LUPE.x0, LUPE.x1, LUPE.zUnten, LUPE.zOben);
  const hohl = [
    lupeRahmen(XC - R_KAV, XC + R_KAV, BODEN, Z_KAV), lupeRahmen(XC - R_GEW, XC + R_GEW, Z_KAV, LUPE.zOben),
    lupeRahmen(LUPE.x0, XC - R_KAV, Z1 - 4.5, Z1 + 4.5), lupeRahmen(XC + R_KAV, LUPE.x1, Z2 - 3.5, Z2 + 3.5),
  ];
  const raeume = [
    ...RAUM_RECHTECKE.filter(([, [x0, x1, z0, z1]]) => x1 > LUPE.x0 && x0 < LUPE.x1 && z1 > LUPE.zUnten && z0 < LUPE.zOben)
      .map(([seite, [x0, x1, z0, z1]]) => `<path class="kammer" data-lupe-raum="${seite}" fill="none" d="${lupePfad(lupeRahmen(Math.max(x0, LUPE.x0), Math.min(x1, LUPE.x1), z0, Math.min(z1, LUPE.zOben)))}"/>`),
    ...RAUM_KEILE.flatMap(([seite, pt]) => lupeSeiten(pt).map((q) => `<path class="kammer" data-lupe-raum="${seite}" fill="none" d="${lupePfad(q)}"/>`)),
  ];
  const lage = (profil, art) => `<g data-lupe-lippe="${art}">${lupeSeiten(profil).map((f) => `<path class="iso-shade" data-shade="0" style="fill:var(--anatomy-strong)" d="${lupePfad(f)}"/>`).join("")}</g>`;
  const zapfen = schraubenProfil(ZT0);
  const zapfenPunkte = [...zapfen.map(([r, z]) => [XC - r, z]), ...zapfen.slice().reverse().map(([r, z]) => [XC + r, z])];
  return `<svg class="lupe iso-svg" viewBox="0 0 ${(LUPE.x1 - LUPE.x0) * LUPE.sx} ${(LUPE.zOben - LUPE.zUnten) * LUPE.sx}" role="img" `
    + `aria-label="Ausschnitt aus dem Schnitt, groß: der Zapfen der Regulierschraube in der Drosselbohrung des Einsatzes, die Dichtmanschette mit ihrer Lippe und der Stützscheibe, die Gehäusewand und die Luftwege">`
    + `<defs><marker id="lupe-spitze" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>`
    + `<path data-lupe-mass="" class="iso-shade" data-shade="3" data-schnitt="" d="${lupePfad(gehaeuse)}"/>`
    + hohl.map((q) => `<path class="iso-shade" data-shade="1" d="${lupePfad(q)}"/>`).join("")
    + raeume.join("")
    + lupeSeiten(PROFIL_BUCHSE).map((f) => lupeFlaeche(f, 1)).join("")
    + PROFIL_EINSATZ.flatMap(lupeSeiten).map((f) => lupeFlaeche(f, 1)).join("")
    + lupeSeiten(PROFIL_SCHEIBE).map((f) => lupeFlaeche(f, -1)).join("")
    + lage(PROFIL_LIPPE.zu, "zu") + lage(PROFIL_LIPPE.auf, "auf")
    + `<g data-lupe-zapfen="">${lupeFlaeche(zapfenPunkte, -1)}</g>`
    + L(`${[gehaeuse, ...hohl].map(lupePfad).join("")}`, { tone: "mid" })
    + `<path class="lupe-pfeil" data-lupe-pfeil="drossel" d="" marker-end="url(#lupe-spitze)"/>`
    + `<path class="lupe-pfeil" data-lupe-pfeil="lippe" d="" marker-end="url(#lupe-spitze)"/>`
    + `</svg>`;
}
const LUPE_TEXT = {
  [DROSSELRICHTUNG]: "Von 1 nach 2 spreizt der Druck die Lippe an die Gehäusewand: Der Weg außen herum ist dicht. Die Luft muss durch den Ringspalt am Zapfen und wird dort entspannt.",
  [FREIE_RICHTUNG]: "Von 2 nach 1 klappt der Druck die Lippe nach innen: Die Luft strömt außen an ihr vorbei. Auch durch den Spalt fließt ein Teil, und beide Seiten bleiben unter Druck.",
};

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
const FARBEN = ${JSON.stringify(LU.FARBEN)};
const BAHNEN = ${JSON.stringify(BAHNEN)};
const SEITE_VON = ${JSON.stringify(SEITE_VON)};
const DP = ${DP};
const U0 = ${M.umdrehungen / 2};
const AUTO_TAKT = 3;    // s between two automatic changes of direction
// what the ring gap's routes need to follow the pin
const LUPE = ${JSON.stringify(LUPE)};
const LUPE_TEXT = ${JSON.stringify(LUPE_TEXT)};
const SPALT = ${JSON.stringify(SPALT)};
const SPALT_GEO = ${JSON.stringify(SPALT_GEO)};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = Array.from(svg.querySelectorAll("[data-g]"));
const readout = document.querySelector("[data-readout]");
const info = document.querySelector(".pickinfo");
const still = matchMedia("(prefers-reduced-motion: reduce)");

${modulQuelle(WURZEL, ["figur/stromventil.mjs"])}
${EX.LAUFZEIT}
${LEG.LAUFZEIT}
${EX.ABLAUF}
${LU.LAUFZEIT}
${DROSSEL_SYMBOL_LAUFZEIT}
${BEDIENUNG_LAUFZEIT}

// --- the model drives everything -------------------------------------------
let richtung = DROSSELRICHTUNG;
let regler = U0;
let angehalten = false;
let hubAnteil = 1;                    // goes to 0 while the valve is taken apart: the moving parts stand home
const zustand = neuerZustand(GRA_1_4, U0);

const zapfenTeile = Array.from(svg.querySelectorAll("[data-hub]"));
const lippeZu = Array.from(svg.querySelectorAll('[data-lippe="zu"]'));
const lippeAuf = Array.from(svg.querySelectorAll('[data-lippe="auf"]'));
const lagen = Array.from(svg.querySelectorAll("[data-lage]"));
const raeume = Array.from(svg.querySelectorAll("[data-raum]"));
const luftLage = svg.querySelector("[data-luftlage]");
const luftHinten = svg.querySelector("[data-luftlage-hinten]");
const stroeme = {};
const ANZAHL = { z1: 8, k1: 6, w: 8, b: 9, bl: 6, g: 11, gl: 6, l: 8, z2: 8 };
for (const name in BAHNEN) stroeme[name] = stromBauen(/^(z1|z2)$/.test(name) ? luftLage : luftHinten, name, BAHNEN[name], ANZAHL[name]);
const symbole = Array.from(document.querySelectorAll(".beifigur-symbol svg"));
// the detail panel
const lupeRaeume = Array.from(document.querySelectorAll("[data-lupe-raum]"));
const lupeZapfen = document.querySelector("[data-lupe-zapfen]");
const lupeLippeZu = document.querySelector('[data-lupe-lippe="zu"]');
const lupeLippeAuf = document.querySelector('[data-lupe-lippe="auf"]');
const lupeDrossel = document.querySelector('[data-lupe-pfeil="drossel"]');
const lupeLippePfeil = document.querySelector('[data-lupe-pfeil="lippe"]');
const lupeText = document.querySelector("[data-lupe-text]");

const knopfRichtung = document.getElementById("btn-richtung");
const knopfAuto = document.getElementById("btn-auto");
const reglerEl = document.getElementById("drossel");
const reglerWert = document.getElementById("drossel-wert");
const komma = (x) => String(x).replace(".", ",");

// The automatic cycle is figur/bedienung.mjs: every AUTO_TAKT s of model time the direction flips.
const bed = bedienungSignale({
  namen: [],
  impuls: 0,
  autoTakt: AUTO_TAKT,
  autoAn: !still.matches,
  erster: "R",
  haltenModus: () => false,
  setzeSignal: () => {},
  autoSchritt: () => { richtung = richtung === DROSSELRICHTUNG ? FREIE_RICHTUNG : DROSSELRICHTUNG; zeichneBedienung(); },
  autoEnde: () => {},
  autoAnzeige: (an) => knopfAuto.setAttribute("aria-pressed", String(an)),
  geaendert: () => { angehalten = false; zeichneBedienung(); run(); },
});

// The routes of the ring gap follow the pin: the middle of the free band between its cone and the bore.
function bahnNeu(punkte) {
  const flach = punkte.map((p) => iso(p, P));
  const laenge = [0];
  for (let i = 1; i < flach.length; i += 1) laenge.push(laenge[i - 1] + Math.hypot(flach[i][0] - flach[i - 1][0], flach[i][1] - flach[i - 1][1]));
  return { punkte: flach.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), laenge, gesamt: laenge[laenge.length - 1] };
}
${spaltBahnen.toString()}
let spaltZapfen = null;
function zeichneSpalt() {
  if (spaltZapfen !== null && Math.abs(zustand.zapfen - spaltZapfen) < 0.04) return;
  spaltZapfen = zustand.zapfen;
  const neu = spaltBahnen(SPALT, SPALT.ZT0 + (zustand.zapfen - U0) * GRA_1_4.steigung);
  for (const name in neu) stroeme[name].bahn = bahnNeu(neu[name]);
}

let gezeichnet = "";
function zeichneHub() {
  const dz = (zustand.zapfen - U0) * GRA_1_4.steigung * hubAnteil;
  const marke = dz.toFixed(3) + "|" + zustand.lippe.toFixed(3);
  if (marke === gezeichnet) return;
  gezeichnet = marke;
  const tz = Math.abs(dz) > 1e-4 ? translateAlong(P, [0, 0, dz]) : null;
  for (const el of zapfenTeile) { if (tz) el.setAttribute("transform", tz); else el.removeAttribute("transform"); }
  // the lip: two drawn shapes blended by how far it has folded in
  const auf = zustand.lippe * hubAnteil;
  for (const el of lippeZu) el.style.opacity = String(1 - auf);
  for (const el of lippeAuf) el.style.opacity = String(auf);
}
// Every turned part: its half section while it sits in place, the whole part once it has left.
function zeichneLagen() {
  for (const el of lagen) {
    const x = spr[el.closest("[data-g]").dataset.piece]?.x ?? 0;
    const ganz = Math.min(1, Math.max(0, x * 6));
    const wert = el.dataset.lage === "ganz" ? ganz : 1 - ganz;
    if (el.dataset.stand !== String(wert)) { el.style.opacity = String(wert); el.dataset.stand = String(wert); }
  }
}

// The tones of the two sides. 1 → 2: the side the air comes from is under pressure, behind the throttle it is
// relaxed. 2 → 1 with the lip folded in the air is hardly relaxed at all, so both sides are strong; while the lip
// is still shut the free direction behaves like the throttled one with the sides swapped.
function seitenFarben() {
  const F = luftFarben();
  if (richtung === DROSSELRICHTUNG) return { s1: F.druck, s2: F.abluft };
  if (zustand.lippe > 0.5) return { s1: F.druck, s2: F.druck };
  return { s1: F.abluft, s2: F.druck };
}
function setzeRaumFarben(farbe) {
  for (const el of raeume) {
    const f = farbe[el.dataset.raum];
    if (el.getAttribute("fill") !== f) el.setAttribute("fill", f);
  }
  for (const el of lupeRaeume) {
    const f = farbe[el.dataset.lupeRaum];
    if (el.getAttribute("fill") !== f) el.setAttribute("fill", f);
  }
}

// Particle speed and strength follow the flow of the way they run on (l/min at the catalogue's pressure drop).
const tempoVon = (q) => Math.min(160, q * 0.25);
const staerkeVon = (q) => (q > 0.5 ? Math.min(1, 0.3 + (0.7 * q) / 420) : 0);
function zeichneLuft(dt) {
  const farbe = seitenFarben();
  setzeRaumFarben(farbe);
  const q = durchfluss(richtung, zustand.zapfen, DP, GRA_1_4);
  // the lip's own fold decides whether the way past it carries air
  const rueck = richtung === FREIE_RICHTUNG && zustand.lippe > 0.05 ? q.rueckschlag * zustand.lippe : 0;
  const lauf = richtung === FREIE_RICHTUNG ? -1 : 1;
  const strecke = { z1: q.drossel + rueck, z2: q.drossel + rueck, k1: q.drossel + rueck, w: rueck, l: rueck, b: q.drossel, g: q.drossel, bl: q.drossel * 0.5, gl: q.drossel * 0.5 };
  for (const name in stroeme) {
    const ton = farbe[SEITE_VON[name]];
    stromSchritt(stroeme[name], dt, lauf * tempoVon(strecke[name]), staerkeVon(strecke[name]), ton);
  }
  for (const name in stroeme) {
    const sichtbar = stroeme[name].kugeln.some((c) => c.getAttribute("opacity") !== "0");
    stroeme[name].g.style.opacity = sichtbar ? "" : "0";
  }
}

let letzteZeile = "";
function zeichneAnzeige() {
  const text = anzeigeZeile(anzeige(zustand, GRA_1_4, { richtung, dpBar: DP }), richtung, DP);
  if (text !== letzteZeile) { readout.textContent = text; letzteZeile = text; }
}

// The detail panel follows the same state: the pin, the lip, the arrows of the ways (the panel does not fly apart).
function lupePunkt(p) { return ((p[0] - LUPE.x0) * LUPE.sx).toFixed(1) + " " + ((LUPE.zOben - p[2]) * LUPE.sx).toFixed(1); }
function lupeWeg(punkte) { return "M" + punkte.map(lupePunkt).join("L"); }
let lupeStand = "";
function zeichneLupe() {
  const dz = (zustand.zapfen - U0) * GRA_1_4.steigung;
  const q = durchfluss(richtung, zustand.zapfen, DP, GRA_1_4);
  const rueck = richtung === FREIE_RICHTUNG && zustand.lippe > 0.05 ? q.rueckschlag * zustand.lippe : 0;
  const stand = dz.toFixed(3) + "|" + zustand.lippe.toFixed(3) + "|" + richtung + "|" + (q.drossel > 0) + "|" + (rueck > 0);
  if (stand === lupeStand) return;
  lupeStand = stand;
  lupeZapfen.setAttribute("transform", "translate(0 " + (-dz * LUPE.sx).toFixed(2) + ")");
  lupeLippeZu.style.opacity = String(1 - zustand.lippe);
  lupeLippeAuf.style.opacity = String(zustand.lippe);
  // the way through the ring gap: from channel 1 through the cross holes, up the bore, through the gap, over the insert to channel 2
  const bahnen = spaltBahnen(SPALT, SPALT.ZT0 + dz);
  const drossel = [[LUPE.x0, 0, SPALT.Z1], ...bahnen.b, ...bahnen.g.slice(1), [LUPE.x1, 0, SPALT.Z2]];
  lupeDrossel.setAttribute("d", lupeWeg(richtung === FREIE_RICHTUNG ? drossel.slice().reverse() : drossel));
  lupeDrossel.style.opacity = q.drossel > 0 ? "1" : "0";
  // round the lip: only in the free direction, down the ring space, across at the height of the cross holes
  lupeLippePfeil.setAttribute("d", lupeWeg([[LUPE.x1, 0, SPALT.Z2], [SPALT.XC + SPALT.X_RING, 0, SPALT.Z2], [SPALT.XC + SPALT.X_RING, 0, SPALT.Z1], [LUPE.x0, 0, SPALT.Z1]]));
  lupeLippePfeil.style.opacity = rueck > 0 ? "1" : "0";
  if (lupeText.textContent !== LUPE_TEXT[richtung]) lupeText.textContent = LUPE_TEXT[richtung];
}

// The symbol beside the card: the branch that carries air takes the strong tone.
function zeichneSymbol() {
  const q = durchfluss(richtung, zustand.zapfen, DP, GRA_1_4);
  const rueck = richtung === FREIE_RICHTUNG && zustand.lippe > 0.05 ? q.rueckschlag : 0;
  for (const sym of symbole) drosselSymbolStellen(sym, { drossel: q.drossel, rueckschlag: rueck, ton: "stark" });
}

function zeichneBedienung() {
  const frei = richtung === FREIE_RICHTUNG;
  knopfRichtung.setAttribute("aria-pressed", String(frei));
  const text = frei ? "Richtung 2 → 1 (frei)" : "Richtung 1 → 2 (gedrosselt)";
  if (knopfRichtung.textContent !== text) knopfRichtung.textContent = text;
  knopfAuto.setAttribute("aria-pressed", String(bed.auto));
  reglerWert.textContent = komma(regler) + " Umdr.";
}

// One frame (the loop itself is EX.ABLAUF).
function bildZeichnen(dt, offen, bewegt) {
  luftLage.style.opacity = String(Math.max(0, 1 - offen * 3));
  luftHinten.style.opacity = String(Math.max(0, 1 - offen * 3));
  for (const el of raeume) {
    if (offen > 0.001) el.style.opacity = (0.82 * Math.max(0, 1 - offen * 3)).toFixed(3);
    else el.style.removeProperty("opacity");
  }
  const willHub = Math.max(0, 1 - offen * 2);
  if (Math.abs(willHub - hubAnteil) > 1e-4) { hubAnteil = willHub; gezeichnet = ""; }
  // The valve stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    const dm = angehalten ? 0 : dt;
    if (dm > 0) {
      bed.takt(dm);
      schritt(zustand, GRA_1_4, dm, { richtung, umdrehungen: regler, dpBar: DP });
    }
    zeichneSpalt();
    zeichneHub();
    zeichneLuft(dm);
    zeichneAnzeige();
  } else {
    zeichneHub();
    for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
  }
  zeichneLagen();
  zeichneSymbol();
  zeichneLupe();
}

// --- controls -------------------------------------------------------------
const stoppeAuto = () => { bed.autoAus(); };
knopfRichtung.addEventListener("click", () => {
  stoppeAuto();
  richtung = richtung === DROSSELRICHTUNG ? FREIE_RICHTUNG : DROSSELRICHTUNG;
  angehalten = false;
  zeichneBedienung();
  run();
});
knopfAuto.addEventListener("click", () => {
  if (bed.auto) bed.autoAus(); else bed.autoStart("R");
  angehalten = false;
  zeichneBedienung();
  run();
});
reglerEl.addEventListener("input", () => {
  regler = reglerEl.valueAsNumber;
  angehalten = false;
  zeichneBedienung();
  run();
});

// Before taking it apart: no automatic cycle; the moving parts go home by themselves (hubAnteil).
function vorDemZerlegen() { stoppeAuto(); }

zeichneBedienung();
zeichneSpalt();
zeichneHub();
zeichneLuft(0);
zeichneAnzeige();
zeichneSymbol();
zeichneLagen();
zeichneLupe();
poseExplode();

// A handle for the browser test and for screenshots: it puts the figure into a known state.
window.__figur = {
  MASSE: GRA_1_4,
  geometrie: SPALT_GEO,
  modell: () => zustand,
  richtung: () => richtung,
  regler: () => regler,
  zerlegt: () => zerlegt,
  offen: () => offenAnteil(),
  // direction ("drossel" | "frei") and turns 0…6, everything settled at once
  stelle(r, u) {
    stoppeAuto();
    angehalten = true;
    richtung = r;
    regler = u;
    reglerEl.value = String(u);
    zustand.zapfen = u;
    zustand.lippe = r === FREIE_RICHTUNG ? lippeHub(DP, GRA_1_4) : 0;
    gezeichnet = "";
    spaltZapfen = null;
    zeichneBedienung();
    zeichneSpalt();
    zeichneHub();
    zeichneLuft(0.016);
    zeichneAnzeige();
    zeichneSymbol();
    zeichneLupe();
    run();
  },
  weiter: () => { angehalten = false; run(); },
  spiele,
  waehle,
};
`;

const LEISTE = knopf("btn-richtung", "Richtung 1 → 2 (gedrosselt)", { titel: "Umschalten zwischen Drosselrichtung (1 → 2) und freier Richtung (2 → 1)" })
  + schieber("drossel", "Drosselschraube", { min: 0, max: M.umdrehungen, step: 0.5, wert: START.umdrehungen, einheit: " Umdr.", beschreibung: "Drosselschraube: Umdrehungen offen, 0 ist ganz zu" })
    .replace(`>${START.umdrehungen} Umdr.</output>`, `>${komma(START.umdrehungen, 0)} Umdr.</output>`)
  + knopf("btn-auto", "Automatik", { gedrueckt: true })
  + knopf("btn-explode", "Zerlegen und zusammenbauen")
  + `<span class="luecke"></span>` + hausBedienung();

const INFO = "Der Schnitt zeigt, was wirklich im Ventil sitzt: den Zapfen der Schraube in der Drosselbohrung und die Dichtmanschette um den Einsatz. "
  + "Stelle die Richtung und die Drosselschraube ein oder lass die Automatik laufen. Das kräftige Blau steht unter Druck, das blasse ist entspannte Luft hinter der Drossel. "
  + "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const BEIFIGUR = `<p class="beifigur-titel">Schaltzeichen</p>`
  + `<div class="beifigur-symbol">${drosselRueckschlagSymbol({ feld: 60, feder: false }).svg}</div>`
  + `<p class="beifigur-text">Oben die einstellbare Drossel (zwei Bögen, vom Schrägpfeil durchkreuzt), darunter parallel das Rückschlagventil. `
  + `Es hat keine Feder: Die Lippe der Manschette braucht keine. Von 1 nach 2 sperrt es, von 2 nach 1 gibt es den Weg frei. Der Zweig, durch den gerade Luft strömt, färbt sich. `
  + `Für die Abluftdrosselung zeigt Anschluss 1 zum Zylinder und Anschluss 2 zum Wegeventil.</p>`
  + `<p class="beifigur-titel lupe-titel">Lupe: der Kern</p>`
  + `<div class="beifigur-lupe">${lupeSvg()}</div>`
  + `<p class="beifigur-text" data-lupe-text>${LUPE_TEXT[DROSSELRICHTUNG]}</p>`;

const LESETEXT = `<div class="lesetext">
<h2>Was man sieht</h2>
<p>Das Ventil ist durch seine Mitte aufgeschnitten und sieht aus wie der Funktionsschnitt im Katalog der Drossel-Rückschlagventile von Festo (Baureihe GR/GRA):
alles Wichtige sitzt <strong>rund um die Regulierschraube</strong>. Links liegt der Anschluss <strong>1</strong> (tiefer), rechts der Anschluss <strong>2</strong> (höher); mehr Anschlüsse hat das Ventil nicht.
Von oben stecken im Gehäuse die <strong>Einschraubbuchse</strong> mit der Mutter, darin die <strong>Regulierschraube</strong> mit dem Rändelkopf und dem kegeligen <strong>Zapfen</strong>, darunter der <strong>Ventileinsatz</strong>
mit der Drosselbohrung. Um den Einsatz liegt die <strong>Dichtmanschette</strong> aus Gummi, gestützt von einer kleinen Scheibe. Eine zweite Kammer, einen zweiten Kanal oder eine Feder gibt es nicht.</p>
<p>Die Schnittflächen sind schraffiert, jedes Teil in anderer Richtung. Der Spalt am Zapfen und die Lippe sind in der Zeichnung größer als in Wirklichkeit, damit man sie sieht.</p>

<h2>Von 1 nach 2: die Luft muss durch den Spalt</h2>
<p>Die Luft von Anschluss 1 kommt in einem Kanal unter die Mitte, tritt durch Querbohrungen in den Einsatz und steigt in seiner Bohrung nach oben. Der Zapfen taucht von oben in diese Bohrung;
der <strong>Ringspalt</strong> zwischen Zapfen und Bohrung ist die Drossel. Dahinter strömt die Luft über den Rand des Einsatzes in den Ringraum und durch den Kanal zu Anschluss 2.
Gleichzeitig drückt die Luft von 1 in den Raum <em>unter</em> der Manschette und spreizt ihre Lippe an die Gehäusewand: Der Weg außen herum ist dicht. Vor der Drossel ist die Luft im <strong>kräftigen Blau</strong> unter Druck,
dahinter im <strong>blassen Blau</strong> entspannt. Bei ganz offener Drossel schafft das Ventil so ${q(DROSSELRICHTUNG, M.umdrehungen).gesamt} l/min.</p>

<h2>Von 2 nach 1: die Lippe klappt zu, die Luft geht außen vorbei</h2>
<p>Drückt die Luft von 2 gegen die Manschette, klappt sie die Lippe nach innen (im Modell ab ${komma(M.oeffnungsdruck, 1)} bar Druckunterschied). Jetzt strömt die Luft ungebremst außen an der Manschette vorbei nach unten und durch die Querbohrungen
zu Anschluss 1; zusätzlich fließt ein Teil durch den Ringspalt. Weil sie auf dem Weg kaum entspannt wird, sind <strong>beide Seiten im kräftigen Blau</strong>. Zu den ${q(DROSSELRICHTUNG, M.umdrehungen).drossel} l/min der offenen Drossel
kommen ${q(FREIE_RICHTUNG, 0).rueckschlag} l/min an der Manschette vorbei, zusammen ${q(FREIE_RICHTUNG, M.umdrehungen).gesamt} l/min. Auch bei ganz zugedrehter Drossel
fließen in dieser Richtung im Modell noch ${q(FREIE_RICHTUNG, 0).gesamt} l/min (${M.qnFrei} − ${M.qnDrossel}, angenommen: die beiden Wege wirken unabhängig voneinander). Die Drossel wirkt also nur in <strong>einer</strong> Richtung.</p>

<h2>Die Rändelschraube</h2>
<p>Am Rändelkopf stellt man den Querschnitt ein. Dreht man die Schraube heraus, hebt sich der kegelige Zapfen aus der Bohrung, und der Ringspalt wird weiter. Im Modell ändert eine Umdrehung die Höhe des Zapfens um ${komma(M.steigung, 0)} mm,
${M.umdrehungen} Umdrehungen gehen von ganz zu bis ganz offen (angenommene Werte), und der Durchfluss wächst im gleichen Maß: bei ${komma(M.umdrehungen / 2, 0)} Umdrehungen sind es ${q(DROSSELRICHTUNG, M.umdrehungen / 2).gesamt} l/min,
bei 0 Umdrehungen fließt im Modell in Drosselrichtung keine Luft (angenommen ist ein dichter Sitz).</p>

<h2>Warum drosselt man die Abluft?</h2>
<p>Man setzt das Ventil an den Anschluss eines Zylinders und stellt damit seine Geschwindigkeit in <strong>einer</strong> Richtung ein. Für die
<strong>Abluftdrosselung</strong> zeigt dabei <strong>Anschluss 1 zum Zylinder und Anschluss 2 zum Wegeventil</strong>. Die Zuluft strömt dann vom Wegeventil frei
in den Zylinder (2 → 1, die Lippe klappt nach innen), nur die Abluft muss auf dem Rückweg durch die Drossel (1 → 2).</p>
<p>Dadurch ist der Kolben zwischen zwei Luftpolstern eingespannt: Hinter ihm steht der volle Druck, vor ihm bleibt ein Gegendruck stehen, den die Drossel erzeugt.
Das Gegenhalten macht die Bewegung gleichmäßig und ruhig. Der Kolben ruckt bei wechselnder Last nicht und wird auch von einer ziehenden Last nicht mitgerissen,
weil sie gegen den Gegendruck arbeiten müsste; die Geschwindigkeit hängt so weniger von der Last ab.
Bei der Zuluftdrosselung wäre es umgekehrt: Der Druck müsste sich erst langsam aufbauen, der Kolben bliebe haften und spränge dann los. Eine Ausnahme sind
einfachwirkende und sehr kleine Zylinder: Ein einfachwirkender Zylinder hat nur eine Luftseite, und bei sehr kleinem Volumen lässt sich kaum ein Luftpolster aufbauen;
dort wird meist die Zuluft gedrosselt. Wie ein Zylinder aufgebaut ist, zeigt die Seite zum <a href="../Zylinder-Doppeltwirkend/">doppeltwirkenden Zylinder</a>.</p>
<p class="formel">
Drossel ganz offen, 1 → 2: <strong>${q(DROSSELRICHTUNG, M.umdrehungen).gesamt} l/min</strong><br>
Drossel halb offen, 1 → 2: <strong>${q(DROSSELRICHTUNG, M.umdrehungen / 2).gesamt} l/min</strong><br>
Drossel zu, 1 → 2: <strong>${q(DROSSELRICHTUNG, 0).gesamt} l/min</strong><br>
2 → 1, Drossel offen: ${q(DROSSELRICHTUNG, M.umdrehungen).gesamt} + ${q(FREIE_RICHTUNG, 0).rueckschlag} = <strong>${q(FREIE_RICHTUNG, M.umdrehungen).gesamt} l/min</strong><br>
2 → 1, Drossel zu: nur an der Manschette vorbei, <strong>${q(FREIE_RICHTUNG, 0).gesamt} l/min</strong>
</p>
<p class="hinweis">Alle Zahlen stehen im Modell, das auch den Zapfen und die Lippe bewegt. Sie gelten bei den Bedingungen des Datenblatts: 6 bar am Eingang und 1 bar Druckunterschied
(die Anzeige nennt sie). Nur die Normdurchflüsse 420 und 780 l/min sind Katalogwerte; die 360 l/min, die Umdrehungen, der Öffnungsdruck und der Hub der Lippe sind Annahmen.
Der Katalog gibt von der Bauform nur den Schnitt mit den Nummern 1 bis 3 an: Die Maße sind geschätzt, die inneren Wege dem Schnitt nachgezeichnet, nicht vermessen; Spalt und Lippe sind überhöht. Die Anleitung zur Figur nennt alles einzeln.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

const EIGENES_CSS = `${VS.CSS}\n${DROSSEL_SYMBOL_CSS}\n[data-readout] { white-space: pre-line; text-align: left }\n[data-lage="ganz"] { opacity: 0; pointer-events: none }\n.beifigur-lupe .lupe { display: block; width: 100%; height: auto; margin: 10px 0 12px; color: var(--anatomy-strong); overflow: hidden }\n.lupe .lupe-pfeil { fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: 0 }\n.lupe-titel { margin-top: 20px }`;
const ZIEL = join(HIER, "..", "..", "index.html");
mkdirSync(dirname(ZIEL), { recursive: true });
const html = seite({
  titel: "Drosselrückschlagventil – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "Drosselrückschlagventil",
  hinweis: "Richtung, Drosselschraube, zerlegen",
  anzeige: ANZEIGE,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft unter Druck" },
    { mark: "dotted", label: "Blasses Blau: entspannte Luft hinter der Drossel" },
    { mark: "lit", label: "Zapfen der Schraube und Lippe der Manschette – was sich bewegt" },
    { mark: "dim", label: "Alle Teile sind durch die Mitte aufgeschnitten; Spalt und Lippe sind überhöht" },
  ],
  caption: "Drosselrückschlagventil, G1/4 (Vorbild Festo GR/GRA), im Schnitt durch die Mitte: Der Ringspalt zwischen Zapfen und Bohrung drosselt, die Lippe der Dichtmanschette ist das Rückschlagventil. "
    + "Von 1 nach 2 spreizt der Druck die Lippe an die Wand und die Luft muss durch den Spalt; von 2 nach 1 klappt sie nach innen und die Luft strömt außen vorbei.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  breite: 1240,
  buehneLabel: "Drosselrückschlagventil im Schnitt: Drosselspalt, Dichtmanschette, Luftweg und Baugruppen",
  beiFigur: BEIFIGUR,
  beiFigurLabel: "Schaltzeichen",
}).replace("</style>", `${EIGENES_CSS}${SCHNITT_CSS}</style>`);
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
    // The section of a whole fitting with its hose stub hangs on the stub's item; the other parts of the fitting
    // and the hose have bodies of their own.
    cover: ["verschraubung1.gewinde", "verschraubung2.gewinde"],
  });
}
