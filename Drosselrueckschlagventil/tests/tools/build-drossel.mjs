// A throttle check valve (Festo GRA-1/4-B as the model: G1/4 both ends, knurled
// adjusting screw) as an isometric section in the plane of both channels.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are listed in the
// figure's README; the inside is a textbook arrangement (needle throttle and a
// spring-loaded ball check valve side by side) and an assumption.
//
// This script holds geometry and the four data tables; springs, depth sorting,
// legend and page shell come from ../../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is kept
// is the one at y <= 0 and its cut face at y = 0 looks at the viewer. Port 1 is
// on the left (x = 0), port 2 on the right (x = LAENGE).
//   throttle path: 1 → left channel → orifice (needle seat) → needle chamber
//                  → outlet channel → riser → right channel → 2
//   check path:    1 → riser → lower channel → chamber under the ball →
//                  ball seat → neck → right channel → 2
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
import { GRA_1_4 as M } from "../../../figur/stromventil.mjs";
import { seite, knopf, hausBedienung } from "../../../figur/seite.mjs";
import { zeichner } from "../../../figur/zylinderteile.mjs";
import { normteile, sechskant, federPruefen, SCHNITT_CSS } from "../../../figur/normteile.mjs";
import { CSS as LUFT_CSS } from "../../../figur/luft.mjs";
import { LEGENDE } from "./legende-drossel.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..", "..");
const W = 900;
const H = 800;

// --- Dimensions ----------------------------------------------------------
const LAENGE = 70, TIEFE = 16, HOEHE = 58;     // housing block; the half y in [-16, 0] is kept
const ZA = 36;                                  // port axis height
const R_PORT = 6.5;                             // G1/4 thread bore, outside Ø 13.2
const R_STUMMEL = R_PORT - 0.2;                 // the threaded stub of a fitting, clear of the thread
const R_KANAL = 4.5;                            // main channels
const X_DROSSEL = 24;                           // needle axis
const R_ORIFICE = 2.5, ZS = 46;                 // orifice up to the needle seat at z = 46
const R_KAMMER = 6, Z_KAMMER = [46, 54];        // needle chamber
const R_GEWINDE = 3.5, Z_GEWINDE = [54, HOEHE]; // thread of the adjusting screw, in the housing
const X_AUSLASS = 40;                           // riser from the outlet channel down to port 2
const X_KUGEL = 54;                             // check valve axis
const R_KUGELBOHRUNG = 6, Z_SITZ = 26, R_SITZ = 3;   // ball bore up to the seat, neck r 3 above it
const R_KUGEL = 4.4;
const Z_KUGEL = Z_SITZ - Math.sqrt(R_KUGEL ** 2 - R_SITZ ** 2);   // ball centre on its seat
const Z_FEDERFUSS = 4;                          // top of the plug's thread = spring seat
const Z_UNTEN = 14;                             // lower channel (the check path's way back to 1)
const X_RISER = 16;                             // riser from channel 1 down to the lower channel

// Needle: the tip's height follows the turns of the screw (model: pitch 1 mm).
const U0 = M.umdrehungen / 2;                   // start: half open
const Z_SPITZE_ZU = ZS - 4.2;                   // tip height with the throttle shut (cone r 2.5 at the seat)
const zSpitze = (u) => Z_SPITZE_ZU + M.steigung * u;
const ZT = zSpitze(U0);
const KONUS = 0.48;                             // cone slope, dr/ds
const Z_KONTER = [HOEHE, HOEHE + 4.5];          // lock nut on top of the housing
const Z_KOPF = [Z_KONTER[1] + 10, Z_KONTER[1] + 20];   // knurled head
const R_KOPF = 9;

// Ball spring.
const FEDER = { draht: 1.4, windungen: 6, rWindung: 3.6, laenge: Z_KUGEL - R_KUGEL - Z_FEDERFUSS };
const FEDER_TEXT = federPruefen(FEDER, M.kugelHub, 2);

// Fittings and hoses along the port axis, s from the housing's face outward.
const VERSCHRAUBUNG = { gewinde: [-12, 0], sechskant: [0, 4.5], rS: 7.6, koerper: [4.5, 11], rK: 6, ring: [11, 12.5], rR: 5.2 };
const R_SCHLAUCH = 4, SCHLAUCH_LAENGE = 24;

const P = k.fitProjection(
  [[-42, -TIEFE - 8, -10], [LAENGE + 42, TIEFE + 8, -10], [-42, TIEFE + 8, Z_KOPF[1] + 4], [LAENGE + 42, -TIEFE - 8, Z_KOPF[1] + 4],
    [-42, -TIEFE, Z_KOPF[1] + 4], [LAENGE + 42, TIEFE, Z_KOPF[1] + 4]],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
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
  leitung: [0, 100, 16],
  verschraubung: [0, 62, 8],
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
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const ring3 = (punkte) => SCH.pfad(punkte.map(at));

const FZ = (x) => G.frameOf([x, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);                  // vertical axes
const FPORT = { 1: G.frameOf([0, 0, ZA], [-1, 0, 0], [0, 1, 0], [0, 0, 1]), 2: G.frameOf([LAENGE, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]) };
const ortPort = (nr) => (rng) => { const s = (rng[0] + rng[1]) / 2; return [nr === 1 ? -s : LAENGE + s, 0, ZA]; };

// --- The hollows: rectangles (x0, x1, z0, z1) in the cut plane --------------
const rect = (x, r, z0, z1) => [x - r, x + r, z0, z1];
const HOHLRAUM = [
  [0, 12, ZA - R_PORT, ZA + R_PORT],                                  // port 1 (thread bore)
  [12, X_DROSSEL + R_KANAL, ZA - R_KANAL, ZA + R_KANAL],              // channel 1
  rect(X_RISER, 3.5, Z_UNTEN - 3.5, ZA),                              // riser down to the lower channel
  [X_RISER - 3.5, X_KUGEL - R_KUGELBOHRUNG, Z_UNTEN - 3.5, Z_UNTEN + 3.5],   // lower channel
  rect(X_DROSSEL, R_ORIFICE, ZA, ZS),                                 // orifice
  rect(X_DROSSEL, R_KAMMER, ...Z_KAMMER),                             // needle chamber
  rect(X_DROSSEL, R_GEWINDE, ...Z_GEWINDE),                           // thread bore
  [X_DROSSEL + R_KAMMER, X_AUSLASS + 3.5, 52 - 3.5, 52 + 3.5],        // outlet channel
  rect(X_AUSLASS, 3.5, ZA - R_KANAL, 52 + 3.5),                       // riser to port 2
  [X_AUSLASS, LAENGE - 12, ZA - R_KANAL, ZA + R_KANAL],               // channel 2
  rect(X_KUGEL, R_SITZ, Z_SITZ, ZA - R_KANAL),                        // neck above the ball seat
  rect(X_KUGEL, R_KUGELBOHRUNG, 0, Z_SITZ),                           // ball bore, open at the bottom
  [LAENGE - 12, LAENGE, ZA - R_PORT, ZA + R_PORT],                    // port 2 (thread bore)
];
const innen = (x, z) => HOHLRAUM.some(([a, b, c, d]) => x > a + 1e-9 && x < b - 1e-9 && z > c + 1e-9 && z < d - 1e-9);

/** The material of the half block as axis boxes: the grid of all hollow edges, empty cells left out, runs merged. */
function materialKoerper() {
  const xs = [...new Set([0, LAENGE, ...HOHLRAUM.flatMap(([a, b]) => [a, b])])].sort((a, b) => a - b);
  const zs = [...new Set([0, HOEHE, ...HOHLRAUM.flatMap(([, , c, d]) => [c, d])])].sort((a, b) => a - b);
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

/** One hollow on the cut face: the lit far half of a round bore, one flat tone. */
function hohlraum([x0, x1, z0, z1]) {
  return `<path class="iso-shade" data-shade="2" d="${ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])}"/>`;
}

// --- The housing ------------------------------------------------------------
function gehaeuse() {
  gruppe("gehaeuse");
  const plan = { x: 0, y: -TIEFE, w: LAENGE, d: TIEFE, r: 0 };
  const teile = [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, HOEHE, P)}"/>`,
    // top and the right end: the two outer faces the camera sees besides the cut face
    NT.flach([[0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE], [LAENGE, 0, HOEHE], [0, 0, HOEHE]], [0, 0, 1]),
    NT.flach([[LAENGE, -TIEFE, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [LAENGE, -TIEFE, HOEHE]], [1, 0, 0]),
    // the cut face
    NT.schnitt([[0, 0, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [0, 0, HOEHE]]),
    // The hollows: all outlines first, then all fills over them, so the lines inside a junction
    // of two channels are covered and only the outline of the union stays.
    L(HOHLRAUM.map(([x0, x1, z0, z1]) => ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])).join(""), { tone: "mid" }),
    ...HOHLRAUM.map(hohlraum),
    L(ring3([[0, 0, 0], [LAENGE, 0, 0], [LAENGE, 0, HOEHE], [0, 0, HOEHE]]), { tone: "mid" }),
    L(k.segment([LAENGE, -TIEFE, HOEHE], [LAENGE, 0, HOEHE], P) + k.segment([0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE], P)
      + k.segment([LAENGE, -TIEFE, 0], [LAENGE, -TIEFE, HOEHE], P) + k.segment([LAENGE, -TIEFE, 0], [LAENGE, 0, 0], P), { tone: "mid" }),
  ];
  put([LAENGE / 2, -TIEFE / 2, HOEHE / 2], teile.join(""), materialKoerper(), { name: "gehaeuse.koerper" });
}

// --- The ball and its spring ------------------------------------------------
function kugelUndFeder() {
  gruppe("kugel");
  const mitte = [X_KUGEL, 0, Z_KUGEL];
  put(mitte, SV(G.sphereOf(mitte, R_KUGEL, P), { tone: "hi" }), [rec(A.ball(mitte, R_KUGEL, { name: "kugel.kugel" }))], { name: "kugel.kugel" });

  gruppe("feder");
  const F = FZ(X_KUGEL);
  const r = FEDER.draht / 2;
  const wendel = NT.druckfeder(F, Z_FEDERFUSS + r, Z_KUGEL - R_KUGEL - r, FEDER);
  put([X_KUGEL, 0, (Z_FEDERFUSS + Z_KUGEL - R_KUGEL) / 2], wendel.join(""), [
    rec(A.ring(F, Z_FEDERFUSS, Z_KUGEL - R_KUGEL, FEDER.rWindung - r, FEDER.rWindung + r, { name: "feder.wendel" })),
  ], { name: "feder.wendel" });
}

// --- The plug under the ball bore -------------------------------------------
function verschluss() {
  gruppe("verschluss");
  const F = FZ(X_KUGEL);
  const hx = sechskant(8);
  put([X_KUGEL, 0, 0], [
    NT.gewinde(F, 0, Z_FEDERFUSS, R_KUGELBOHRUNG - 0.05),
    SV(G.ringBand(-1, 0, R_KUGELBOHRUNG - 0.05, 7.4, F, P), { tone: "lo" }),
    SV(G.prismOf(F, hx, -5, -1, P), { tone: "mid" }),
    L(G.circleOf(F, -5, 3.2, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(F, 0, Z_FEDERFUSS, R_KUGELBOHRUNG - 0.05, { name: "verschluss.gewinde" })),
    rec(A.ring(F, -1, 0, R_KUGELBOHRUNG - 0.05, 7.4, { name: "verschluss.dichtring" })),
    rec(A.prism(F, hx, -5, -1, { name: "verschluss.kopf" })),
  ], { name: "verschluss.kopf" });
}

// --- Adjusting screw with needle, lock nut -----------------------------------
function schraube() {
  const F = FZ(X_DROSSEL);
  const zNadel = [[ZT, 0.4], [ZT + 4.6, 2.7], [ZT + 4.6, 3.3], [Z_GEWINDE[0] - 2, 3.3], [Z_GEWINDE[0] - 2, R_GEWINDE], [Z_KONTER[1], R_GEWINDE]];
  const gewinde = [];
  for (let s = Z_GEWINDE[0] + 0.6; s < Z_KONTER[1] - 0.3; s += 1.3) gewinde.push(G.arcOf(F, s, R_GEWINDE, P));

  // The part below the nut's top face: needle, shaft with thread, the O-ring in the chamber.
  gruppe("schraube");
  put([X_DROSSEL, 0, (ZT + Z_KONTER[1]) / 2], [
    SV(G.solidOf(zNadel, F, P), { tone: "hi" }),
    SV(G.ringBand(Z_KAMMER[1] - 3, Z_KAMMER[1] - 1, R_GEWINDE - 0.05, 5, F, P), { tone: "lo" }),
    L(gewinde.join(""), { tone: "faint" }),
  ].join(""), [
    rec(A.solid(F, zNadel, { name: "schraube.nadel" })),
    rec(A.ring(F, Z_KAMMER[1] - 3, Z_KAMMER[1] - 1, R_GEWINDE, 5, { name: "schraube.oring" })),
  ], { name: "schraube.nadel" });

  // The lock nut: a hexagon on the thread, on top of the housing.
  gruppe("kontermutter");
  const hx = sechskant(7.6);
  put([X_DROSSEL, 0, (Z_KONTER[0] + Z_KONTER[1]) / 2], [
    SV(G.prismOf(F, hx, Z_KONTER[0], Z_KONTER[1], P), { tone: "mid" }),
    L(G.circleOf(F, Z_KONTER[1], R_GEWINDE + 0.8, P), { tone: "faint" }),
  ].join(""), [
    rec(A.ring(F, Z_KONTER[0], Z_KONTER[1], R_GEWINDE, 6.8, { name: "kontermutter.mutter" })),
  ], { name: "kontermutter.mutter" });

  // Above the nut: the rest of the shaft and the knurled head, drawn after the nut.
  gruppe("schraube");
  const F2 = Z_KOPF[0] + 0.6;
  put([X_DROSSEL, 0, (Z_KONTER[1] + Z_KOPF[1]) / 2], [
    SV(G.disc(Z_KONTER[1], Z_KOPF[0] + 0.5, R_GEWINDE, F, P), { tone: "hi" }),
    SV(G.disc(Z_KOPF[0], Z_KOPF[1], R_KOPF, F, P), { tone: "hi" }),
    L(G.ribsOf(F, F2, Z_KOPF[1] - 1, R_KOPF, 22, P, { seams: true }), { tone: "faint" }),
    L(G.circleOf(F, Z_KOPF[1], 3.2, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(F, Z_KONTER[1], Z_KOPF[0], R_GEWINDE, { name: "schraube.hals" })),
    rec(A.disc(F, Z_KOPF[0], Z_KOPF[1], R_KOPF, { name: "schraube.kopf" })),
  ], { name: "schraube.kopf" });
}

// --- Fittings and hoses ---------------------------------------------------------
function anschluesse() {
  for (const nr of [1, 2]) {
    NT.verschraubung(FPORT[nr], VERSCHRAUBUNG, "verschraubung", `verschraubung${nr}`, ortPort(nr), R_STUMMEL);
  }
  gruppe("leitung");
  for (const nr of [1, 2]) {
    const v = nr === 1 ? -1 : 1;
    const s0 = VERSCHRAUBUNG.ring[1];
    const punkte = [[v === -1 ? -s0 : LAENGE + s0, 0, ZA], [v === -1 ? -(s0 + SCHLAUCH_LAENGE) : LAENGE + s0 + SCHLAUCH_LAENGE, 0, ZA]];
    R.route(`leitung.${nr}`, punkte, R_SCHLAUCH, { piece: "leitung", move: MOVE.leitung, ends: [true, false], free: [true, false] });
    tubePieces(punkte, R_SCHLAUCH, P, { maxLength: 60 }).forEach((teil, i) => {
      put(teil.mid, tubeSvg(teil, { tone: "lo" }), [A.tube(teil.points, teil.radii)],
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

const { KEYS, LIFT, VIEW0, VIEW1, MITTE } = EX.vorbereiten(R, P, MOVE, W, H);

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
