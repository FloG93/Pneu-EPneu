// A throttle check valve (Festo GRA-1/4-B as the model: G1/4 both ends, knurled
// adjusting screw) as an isometric section in the plane of both passages.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are listed in the
// figure's README; the inside is a textbook arrangement and an assumption.
//
// This script holds geometry and the four data tables; springs, depth sorting,
// legend and page shell come from ../../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is kept
// is the one at y <= 0 and its cut face at y = 0 looks at the viewer. Port 1 is
// on the left (x = 0), port 2 on the right (x = LAENGE). Inside: a chamber behind
// each port and two straight passages between them.
//   upper passage (throttle): a ridge in the floor is the needle's seat, the needle
//                  comes down on it from the top
//   lower passage (check):    a ball, pressed by a spring against a wall with a hole;
//                  1 → 2 presses the ball onto the hole (shut), 2 → 1 lifts it off
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
import { GRA_1_4 as M } from "../../../figur/stromventil.mjs";
import { seite, knopf, hausBedienung } from "../../../figur/seite.mjs";
import { zeichner } from "../../../figur/zylinderteile.mjs";
import { normteile, stummel, sechskant, federPruefen, SCHNITT_CSS } from "../../../figur/normteile.mjs";
import { CSS as LUFT_CSS } from "../../../figur/luft.mjs";
import { LEGENDE } from "./legende-drossel.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const W = 900;
const H = 800;
const TAU = Math.PI * 2;

// --- Dimensions ----------------------------------------------------------
const LAENGE = 86, TIEFE = 16, HOEHE = 62;      // housing block; the half y in [-16, 0] is kept
const ZA = 31;                                  // port axis height
const R_PORT = 6.5;                             // G1/4 thread bore, outside Ø 13.2
const R_STUMMEL = R_PORT - 0.2;                 // the threaded stub of a fitting, clear of the thread
const X_KAMMER = [[12, 24], [62, 74]];          // the two chambers behind the ports
const Z_KAMMER = [8, 54];
const OBEN = [40, 50];                          // upper passage, z
const UNTEN = [11, 23];                         // lower passage, z
const X_PASSAGE = [24, 62];
const X_N = 43;                                 // needle axis
const RIDGE = { x: [38.5, 47.5], z: 43.5 };     // the throttle seat: a ridge in the floor of the upper passage
const R_GEWINDE = 3.5, Z_GEWINDE = [54, HOEHE]; // thread of the adjusting screw, in the housing
const Z_KUGEL = (UNTEN[0] + UNTEN[1]) / 2;      // axis of the check valve
const WAND = [54, 58], R_SITZ = 2.5;            // wall with the ball's seat hole
const R_KUGEL = 4.4;
const X_KUGEL = WAND[0] - Math.sqrt(R_KUGEL ** 2 - R_SITZ ** 2);   // ball centre on its seat
const X_STUETZE = 26.5, R_STUETZE = 2.4;        // the plug's post, the spring's seat
const Z_STUETZE = 21;

// Needle: the tip's height follows the turns of the screw (model: pitch 1 mm).
const U0 = M.umdrehungen / 2;                   // start: half open
const Z_SPITZE_ZU = RIDGE.z;                    // tip height with the throttle shut
const zSpitze = (u) => Z_SPITZE_ZU + M.steigung * u;
const ZT = zSpitze(U0);
const Z_KONTER = [HOEHE, HOEHE + 4.5];          // lock nut on top of the housing
const Z_KOPF = [Z_KONTER[1] + 10, Z_KONTER[1] + 20];   // knurled head
const R_KOPF = 9;

// Ball spring: horizontal, from the post to the ball.
const FEDER_A = X_STUETZE + R_STUETZE;
const FEDER = { draht: 1.4, windungen: 6, rWindung: 3.6, laenge: X_KUGEL - R_KUGEL - FEDER_A };
const FEDER_TEXT = federPruefen(FEDER, M.kugelHub, 2);

// Fittings and hoses along the port axis, s from the housing's face outward.
const VERSCHRAUBUNG = { gewinde: [-12, 0], sechskant: [0, 4.5], rS: 7.6, koerper: [4.5, 11], rK: 6, ring: [11, 12.5], rR: 5.2 };
const R_SCHLAUCH = 4, R_SCHLAUCH_INNEN = 3;
// A short hose stub out of each fitting, bent towards the viewer so its cut end is seen as a ring.
const WEGE = Object.fromEntries([1, 2].map((nr) => {
  const v = nr === 1 ? -1 : 1;
  const s0 = VERSCHRAUBUNG.ring[1];
  const p0 = [v === -1 ? -s0 : LAENGE + s0, 0, ZA];
  return [nr, stummel(p0, [v, 0, 0], [p0[0] + v * 22, 20, ZA - 4], v === -1 ? [-0.25, 0.96, -0.1] : [0.6, 0.8, -0.1], 9)];
}));

// The extreme points of what is drawn: the block, the heads of the fittings, the ends of the hoses,
// the knurled head and the plug's head.
const P = k.fitProjection(
  [[0, -TIEFE, 0], [LAENGE, -TIEFE, 0], [0, 0, 0], [LAENGE, 0, 0], [0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE],
    ...WEGE[1].slice(-1).map((q) => [q[0] - 5, q[1] + 5, q[2] + 5]), ...WEGE[1].slice(-1).map((q) => [q[0] - 5, q[1] + 5, q[2] - 5]),
    ...WEGE[2].slice(-1).map((q) => [q[0] + 5, q[1] + 5, q[2] + 5]), ...WEGE[2].slice(-1).map((q) => [q[0] + 5, q[1] + 5, q[2] - 5]),
    [X_N - R_KOPF, -R_KOPF, Z_KOPF[1]], [X_N + R_KOPF, R_KOPF, Z_KOPF[1]], [X_STUETZE - 7, 7, -5], [X_STUETZE + 7, 7, -5]],
  W, H, { pad: 30, azimuth: 38, elevation: 34 },
);

// --- Assemblies ----------------------------------------------------------
// Outside first. The screw goes before its lock nut: the nut sits on the screw's
// thread and the screw's head would block it, so the screw is turned out of the nut.
const STAGGER = ["leitung", "verschraubung", "schraube", "kontermutter", "verschluss", "feder", "kugel", "gehaeuse"];
// Escape paths in mm along the machine's axes (x along the flow, y towards the viewer, z up).
// The housing is cut open towards the viewer, so everything that sits in a half-cut hole
// can leave through the cut (+y); the screw, the nut and the plug leave the way they were screwed in.
const MOVE = {
  grund: [0, 0, 0],
  luft: [0, 0, 0],
  leitung: [0, 90, 16],
  verschraubung: [0, 55, 8],
  schraube: [0, 0, 72],
  kontermutter: [0, 0, 40],
  verschluss: [0, 0, -52],
  feder: [0, 74, -24],
  kugel: [0, 98, 30],
  gehaeuse: [0, 0, 0],
};

const { R, rec, put, gruppe } = zeichner({ P, MOVE });
const NT = normteile({ P, rec, put, gruppe });
const at = (p) => k.iso(p, P);
const V = G.viewOf(P);
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const ring3 = (punkte) => SCH.pfad(punkte.map(at));

const FZ = (x) => G.frameOf([x, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);                  // vertical axes
const FPORT = { 1: G.frameOf([0, 0, ZA], [-1, 0, 0], [0, 1, 0], [0, 0, 1]), 2: G.frameOf([LAENGE, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]) };
const ortPort = (nr) => (rng) => { const s = (rng[0] + rng[1]) / 2; return [nr === 1 ? -s : LAENGE + s, 0, ZA]; };

// --- The hollows: rectangles (x0, x1, z0, z1) in the cut plane --------------
// kind: "h" horizontal bore (lit from below), "v" vertical bore (lit from the right)
const HOHLRAUM = [
  [[0, 12, ZA - R_PORT, ZA + R_PORT], "h"],                                // port 1 (thread bore)
  [[X_KAMMER[0][0], X_KAMMER[0][1], ...Z_KAMMER], "v"],                    // chamber 1
  [[X_PASSAGE[0], RIDGE.x[0], OBEN[0], OBEN[1]], "h"],                     // upper passage, left of the seat
  [[RIDGE.x[0], RIDGE.x[1], RIDGE.z, OBEN[1]], "h"],                       // above the seat
  [[RIDGE.x[1], X_PASSAGE[1], OBEN[0], OBEN[1]], "h"],                     // right of the seat
  [[X_N - R_GEWINDE, X_N + R_GEWINDE, OBEN[1], HOEHE], "v"],               // the needle's thread bore
  [[X_PASSAGE[0], WAND[0], UNTEN[0], UNTEN[1]], "h"],                      // lower passage, ball side
  [[WAND[0], WAND[1], Z_KUGEL - R_SITZ, Z_KUGEL + R_SITZ], "h"],           // the ball's seat hole
  [[WAND[1], X_PASSAGE[1], UNTEN[0], UNTEN[1]], "h"],                      // lower passage, 2 side
  [[X_STUETZE - 3.5, X_STUETZE + 3.5, 0, UNTEN[0]], "v"],                  // the plug's bore, from below
  [[X_KAMMER[1][0], X_KAMMER[1][1], ...Z_KAMMER], "v"],                    // chamber 2
  [[LAENGE - 12, LAENGE, ZA - R_PORT, ZA + R_PORT], "h"],                  // port 2 (thread bore)
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
  return flaeche(x0, x1, z0, z1, 0) + flaeche(x0 + b * 0.4, x1, z0, z1, 1) + flaeche(x0 + b * 0.72, x1, z0, z1, 2);
}

// --- The housing ------------------------------------------------------------
function gehaeuse() {
  gruppe("gehaeuse");
  const plan = { x: 0, y: -TIEFE, w: LAENGE, d: TIEFE, r: 0 };
  const umriss = (x0, x1, z0, z1) => ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]);
  const stege = [
    [RIDGE.x[0], RIDGE.x[1], OBEN[0], RIDGE.z],                      // the seat ridge
    [WAND[0], WAND[1], UNTEN[0], Z_KUGEL - R_SITZ],                  // the wall of the ball's seat, below the hole
    [WAND[0], WAND[1], Z_KUGEL + R_SITZ, UNTEN[1]],                  // and above it
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
    L(HOHLRAUM.map(([r]) => umriss(...r)).join(""), { tone: "mid" }),
    ...HOHLRAUM.map(hohlraum),
    // what stands inside the hollows is cut material again: the seat ridge and the seat wall
    ...stege.map(([x0, x1, z0, z1]) => NT.schnitt([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])),
    L(stege.map((r) => umriss(...r)).join(""), { tone: "mid" }),
    L(ring3([[0, 0, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [0, 0, HOEHE]]), { tone: "mid" }),
    // the outer edges of the half block that are not part of a face's outline
    L(k.segment([LAENGE, 0, HOEHE], [LAENGE, -TIEFE, HOEHE], P) + k.segment([LAENGE, -TIEFE, HOEHE], [0, -TIEFE, HOEHE], P) + k.segment([0, -TIEFE, HOEHE], [0, 0, HOEHE], P)
      + k.segment([LAENGE, -TIEFE, HOEHE], [LAENGE, -TIEFE, 0], P) + k.segment([LAENGE, -TIEFE, 0], [LAENGE, 0, 0], P), { tone: "mid" }),
  ];
  put([LAENGE / 2, -TIEFE / 2, HOEHE / 2], teile.join(""), materialKoerper(), { name: "gehaeuse.koerper" });
}

// --- The ball and its spring ------------------------------------------------
function kugelUndFeder() {
  gruppe("kugel");
  const mitte = [X_KUGEL, 0, Z_KUGEL];
  put(mitte, SV(G.sphereOf(mitte, R_KUGEL, P), { tone: "hi" }), [rec(A.ball(mitte, R_KUGEL, { name: "kugel.kugel" }))], { name: "kugel.kugel" });

  // The spring runs along x, from the post to the ball: its pieces carry their x (data-federx).
  gruppe("feder");
  const F = G.frameOf([0, 0, Z_KUGEL], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const r = FEDER.draht / 2;
  const wendel = NT.druckfeder(F, FEDER_A + r, X_KUGEL - R_KUGEL - r, FEDER);
  put([(FEDER_A + X_KUGEL - R_KUGEL) / 2, 0, Z_KUGEL], wendel.join(""), [
    rec(A.ring(F, FEDER_A, X_KUGEL - R_KUGEL, FEDER.rWindung - r, FEDER.rWindung + r, { name: "feder.wendel" })),
  ], { name: "feder.wendel" });
}

// --- The plug under the lower passage; its post is the spring's seat ----------
function verschluss() {
  gruppe("verschluss");
  const F = FZ(X_STUETZE);
  const hx = sechskant(7);
  put([X_STUETZE, 0, 6], [
    NT.gewinde(F, 0, 8, 3.45),
    SV(G.disc(8, Z_STUETZE, R_STUETZE, F, P), { tone: "hi" }),
    SV(G.ringBand(-1, 0, 3.45, 6, F, P), { tone: "lo" }),
    SV(G.prismOf(F, hx, -5, -1, P), { tone: "mid" }),
    L(G.circleOf(F, -5, 2.6, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(F, 0, 8, 3.45, { name: "verschluss.gewinde" })),
    rec(A.disc(F, 8, Z_STUETZE, R_STUETZE, { name: "verschluss.stuetze" })),
    rec(A.ring(F, -1, 0, 3.45, 6, { name: "verschluss.dichtring" })),
    rec(A.prism(F, hx, -5, -1, { name: "verschluss.kopf" })),
  ], { name: "verschluss.kopf" });
}

// --- Adjusting screw with needle, lock nut -----------------------------------
function schraube() {
  const F = FZ(X_N);
  const zNadel = [[ZT, 0.4], [ZT + 4.6, 2.7], [ZT + 4.6, 3.3], [Z_GEWINDE[0] - 2, 3.3], [Z_GEWINDE[0] - 2, R_GEWINDE], [Z_KONTER[1], R_GEWINDE]];
  const gewinde = [];
  for (let s = Z_GEWINDE[0] + 0.6; s < Z_KONTER[1] - 0.3; s += 1.3) gewinde.push(G.arcOf(F, s, R_GEWINDE, P));

  // The part below the nut's top face: needle, shaft with thread.
  gruppe("schraube");
  put([X_N, 0, (ZT + Z_KONTER[1]) / 2], [
    SV(G.solidOf(zNadel, F, P), { tone: "hi" }),
    L(gewinde.join(""), { tone: "faint" }),
  ].join(""), [
    rec(A.solid(F, zNadel, { name: "schraube.nadel" })),
  ], { name: "schraube.nadel" });

  // The lock nut: a hexagon on the thread, on top of the housing.
  gruppe("kontermutter");
  const hx = sechskant(7.6);
  put([X_N, 0, (Z_KONTER[0] + Z_KONTER[1]) / 2], [
    SV(G.prismOf(F, hx, Z_KONTER[0], Z_KONTER[1], P), { tone: "mid" }),
    L(G.circleOf(F, Z_KONTER[1], R_GEWINDE + 0.8, P), { tone: "faint" }),
  ].join(""), [
    rec(A.ring(F, Z_KONTER[0], Z_KONTER[1], R_GEWINDE, 6.8, { name: "kontermutter.mutter" })),
  ], { name: "kontermutter.mutter" });

  // Above the nut: the rest of the shaft and the knurled head, drawn after the nut.
  gruppe("schraube");
  put([X_N, 0, (Z_KONTER[1] + Z_KOPF[1]) / 2], [
    SV(G.disc(Z_KONTER[1], Z_KOPF[0] + 0.5, R_GEWINDE, F, P), { tone: "hi" }),
    SV(G.disc(Z_KOPF[0], Z_KOPF[1], R_KOPF, F, P), { tone: "hi" }),
    L(G.ribsOf(F, Z_KOPF[0] + 0.6, Z_KOPF[1] - 1, R_KOPF, 22, P, { seams: true }), { tone: "faint" }),
    L(G.circleOf(F, Z_KOPF[1], 3.2, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(F, Z_KONTER[1], Z_KOPF[0], R_GEWINDE, { name: "schraube.hals" })),
    rec(A.disc(F, Z_KOPF[0], Z_KOPF[1], R_KOPF, { name: "schraube.kopf" })),
  ], { name: "schraube.kopf" });
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

// --- Fittings and hoses ---------------------------------------------------------
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

// --- Compose --------------------------------------------------------------------
gehaeuse();
anschluesse();
schraube();
verschluss();
kugelUndFeder();

const LEGENDE_IDS = LEGENDE.map((e) => e.piece);
for (const it of R.items) {
  if (!LEGENDE_IDS.includes(it.piece)) throw new Error(`Teil ${it.name} hat keine Legendennummer (${it.piece})`);
}
if (STAGGER.length !== LEGENDE_IDS.length || !LEGENDE_IDS.every((id) => STAGGER.includes(id))) {
  throw new Error("STAGGER und LEGENDE nennen nicht dieselben Baugruppen");
}

A.settle(R, P);
// The housing is the back drop of everything inside it; the shaft's part above the nut is drawn
// after the nut it passes through, the part below it before.
const eintrag = (name) => R.items.find((it) => it.name === name);
{
  const unten = Math.min(...R.items.filter((it) => it.name !== "gehaeuse.koerper").map((it) => it.key));
  eintrag("gehaeuse.koerper").key = unten - 1;
  const nadel = eintrag("schraube.nadel"), mutter = eintrag("kontermutter.mutter"), kopf = eintrag("schraube.kopf");
  nadel.key = Math.min(nadel.key, mutter.key - 0.02);
  kopf.key = Math.max(kopf.key, mutter.key + 0.02);
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
    "Ein Drosselrückschlagventil mit G1/4-Anschlüssen im Schnitt: Zwischen Anschluss 1 links und Anschluss 2 rechts liegen zwei Wege nebeneinander. "
    + "Oben sitzt die Drosselnadel der Regulierschraube mit Rändelkopf und Kontermutter im Nadelsitz, unten die Kugel des Rückschlagventils mit Feder und Verschlussschraube. "
    + "Links und rechts stecken Schläuche in den Steckverschraubungen.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}">${it.svg}</g>`).join(""),
    `<g class="luft" data-luftlage=""></g>`,
  ],
});

// --- The page (the live behaviour follows with the air and the controls) ----------------
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

function bildZeichnen() {}
function vorDemZerlegen() {}
poseExplode();
window.__figur = { zerlegt: () => zerlegt, offen: () => offenAnteil(), spiele, waehle };
`;

const LEISTE = knopf("btn-explode", "Zerlegen und zusammenbauen") + `<span class="luecke"></span>` + hausBedienung();
const INFO = "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor. „Zerlegen und zusammenbauen“ zeigt, wie das Ventil aufgebaut ist.";
const ZIEL = join(HIER, "..", "..", "index.html");
mkdirSync(dirname(ZIEL), { recursive: true });
const html = seite({
  titel: "Drosselrückschlagventil – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "Drosselrückschlagventil",
  hinweis: "zerlegen",
  anzeige: "in Arbeit",
  schluessel: [
    { mark: "lit", label: "Schraube, Kontermutter, Kugel und Feder – was man einstellt oder was sich bewegt" },
    { mark: "dim", label: "Das Gehäuse ist in der Ebene beider Kanäle aufgeschnitten" },
  ],
  caption: "Drosselrückschlagventil, G1/4, im Schnitt: oben der Drosselweg mit der Nadel, unten der Rückschlagweg mit Kugel und Feder.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: INFO,
  lesetext: "",
  laufzeit: live,
  breite: 1240,
  buehneLabel: "Drosselrückschlagventil im Schnitt: Drossel, Rückschlagventil und Baugruppen",
}).replace("</style>", `${LUFT_CSS}${SCHNITT_CSS}</style>`);
writeFileSync(ZIEL, html);

console.log(`geschrieben: ${ZIEL}`);
console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
console.log(FEDER_TEXT);
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
      // Parts that stand in a half-cut hole of the housing: the cut face is in front of their back
      // half and behind their front half, so no drawing order is right. The housing is drawn first
      // and its hollows are painted over the cut face, which is what the eye expects (the same
      // excuse the cylinder pages make for a rod in its gland).
      ["gehaeuse.koerper", "verschraubung1.*"],
      ["gehaeuse.koerper", "verschraubung2.*"],
      ["gehaeuse.koerper", "schraube.nadel"],
      ["gehaeuse.koerper", "verschluss.kopf"],
      ["gehaeuse.koerper", "kugel.kugel"],
      ["gehaeuse.koerper", "feder.wendel"],
      // The lock nut is a ring round the shaft: the shaft below it is drawn before it, the rest after it.
      ["schraube.nadel", "kontermutter.mutter"],
    ],
    crowd: [],
    cover: [],
  });
}
