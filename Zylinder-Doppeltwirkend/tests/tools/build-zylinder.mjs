// A double-acting cylinder to ISO 15552 (bore 50, stroke 200) on the 5/2 valve
// that switches it, as an isometric cutaway with the compressed air visible.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are Festo DSBC Ø 50;
// everything else is an assumption and is listed in the README.
//
// This script holds geometry and four data tables and nothing else: springs,
// depth sorting, legend, air and page shell all come from ../../figur/.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import * as PN from "../../../figur/pneumatik.mjs";
import * as EX from "../../../figur/explode.mjs";
import * as LU from "../../../figur/luft.mjs";
import * as LEG from "../../../figur/legende.mjs";
import { seite, knopf, schieber, hausBedienung } from "../../../figur/seite.mjs";
import { LEGENDE } from "./legende-zylinder.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, "..", "..", "index.html");
const WURZEL = join(HIER, "..", "..", "..");

const W = 1160;
const H = 660;

// --- Dimensions ----------------------------------------------------------
const Z = PN.ISO_15552_50;
const RB = Z.bohrung / 2;          // 25, bore
const RS = Z.stange / 2;           // 10, rod
const RA = RB + 3;                 // 28, tube outside (wall 3, assumption)
const HUB = Z.hub;                 // 200
const ZC = 62;                     // axis height over the ground

const DECKEL = 24;                 // cap thickness (assumption)
const DHW = 32;                    // cap half width, 64 square (assumption)
const X_BODEN = [0, DECKEL];
const X_ROHR = [DECKEL, DECKEL + 240];
const X_KOPF = [X_ROHR[1], X_ROHR[1] + DECKEL];
const TOT = Z.totraum;             // 6, dead length each end
const KB = 22;                     // piston width (assumption)
const KOLBEN0 = X_ROHR[0] + TOT;   // piston rear face at stroke 0
const RAGT = 64;                   // rod out of the head at stroke 0, enough for the
                                   // carriage to clear the head (the audit caught 6 mm of overlap)
const SPITZE0 = X_KOPF[1] + RAGT;
const RD = 13;                     // cushioning bush radius (assumption)
const DL = Z.daempfung;            // 20, cushioning length
const ANKER = 23;                  // tie rods on a 46 x 46 square
const R_ANKER = 5;                 // M10

const FUSS_Z = ZC - DHW;
const FUSS = [X_BODEN[0] + 12, X_KOPF[1] - 12];
const SCHIENE = { x: 312, y: -32, w: 300, d: 64, r: 3 };
const LAST_HW = 34;
const LAST_D = 72;
const LAST_H = 54;

const VY = 112;                    // valve spool, y — measured: closer than this
                                   // and no hose can turn between the two without folding
const VZ = 34;                     // spool axis height
const V_X = [62, 216];
const V_HW = 26;
const R_BOHRUNG = 8;
const R_SCHIEBER = 4.6;
const PORT = { 5: 80, 4: 110, 1: 139, 2: 168, 3: 198 };
const ARBEIT = [4, 1, 2];          // bosses on top: to the cylinder and the supply
const ABLUFT = [5, 3];             // down through the sub-base, out through a silencer
const SOCKEL_H = 17;               // sub-base: it carries the two exhaust ways
const WINKEL = { 4: -1, 2: 1 };    // which way each working port elbow faces
const SCHIEBER_WEG = 14;           // spool travel between the two positions
const R_SCHLAUCH = 4.2;

/** At rest the figure stands at mid-stroke, so both chambers are visible. */
const WEG0 = Math.round(HUB * 0.42);

// --- Frames --------------------------------------------------------------
const FZ = G.frameOf([0, 0, ZC], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FV = G.frameOf([0, VY, VZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const quer = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const hoch = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

const P = k.fitProjection(
  [
    [-30, -52, 0], [SPITZE0 + HUB + LAST_HW + 8, 0, 0],
    [SPITZE0 + HUB + LAST_HW + 8, 0, ZC + 36],
    [-30, 0, ZC + RA + 14], [0, 0, ZC + RA + 14],
    [V_X[0] - 28, VY + V_HW + 34, 0], [V_X[1] + 30, VY + V_HW + 34, VZ + 46],
  ],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
);

const at = (p) => k.iso(p, P);
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

const NAH = SCH.naechsterWinkel(FZ, P);
const FENSTER = [NAH - 1.52, NAH + 1.10];
const FENSTER_ID = "fenster-rohr";
let STANGEN_CLIP = "";

// --- Assemblies ----------------------------------------------------------
const PIECE_OF = {
  grund: "grund", boden: "boden", rohr: "rohr", kolben: "kolben",
  daempfung: "daempfung", stange: "stange", kopf: "kopf", anker: "anker",
  drossel: "drossel", gehaeuse: "gehaeuse", schieber: "schieber",
  betaetigung: "betaetigung", leitung: "leitung", luft: "luft",
};
const STAGGER = [
  "leitung", "betaetigung", "schieber", "gehaeuse", "drossel",
  "anker", "kopf", "stange", "daempfung", "kolben", "rohr", "boden",
];
const MOVE = {
  grund: [0, 0, 0], luft: [0, 0, 0],
  boden: [-190, 30, 60],
  rohr: [0, 20, 262],
  kolben: [0, 176, 118],
  daempfung: [78, 214, 64],
  stange: [150, 250, 96],
  kopf: [196, 26, 150],
  anker: [0, -126, 222],
  drossel: [-74, -232, 118],
  gehaeuse: [0, 252, -12],
  schieber: [-164, 176, 66],
  betaetigung: [226, 162, 28],
  leitung: [14, 118, 304],
};


const R = A.recorder(P);
const rec = R.solid;
let GRUPPE = "grund";
function put(pos, svg, shapes = [], extra = {}) {
  const { bias = 0, gruppe = GRUPPE, name = gruppe, clip = false, hub = false, schieber: istSchieber = false, ...rest } = extra;
  const piece = PIECE_OF[gruppe];
  let inhalt = svg;
  if (hub) inhalt = `<g data-hub>${inhalt}</g>`;
  if (istSchieber) inhalt = `<g data-schieber>${inhalt}</g>`;
  if (clip) inhalt = `<g data-clip="1" clip-path="url(#${clip === true ? FENSTER_ID : clip})">${inhalt}</g>`;
  R.put({
    name: R.nameFor(name), piece, label: piece, move: MOVE[piece],
    at: pos, pos, bias, gruppe, clip, svg: inhalt, shapes, ...rest,
  });
}

// --- Feet and rail: the machine stands on its own mounts -----------------
function grundplatte() {
  GRUPPE = "grund";
  for (const x of FUSS) {
    const bett = { x: x - 17, y: -50, w: 34, d: 100, r: 3 };
    const steg = { x: x - 12, y: -42, w: 24, d: 84, r: 2 };
    put([x, 0, FUSS_Z / 2], [
      `<path class="iso-halo" d="${k.haloOf(bett, 0, 9, P)}"/>`,
      SV(k.slabOf(bett, 0, 9, P, 3, 0.7), { tone: "lo" }),
      L(k.planOutline(k.insetPlan(bett, 6), 9, P), { tone: "faint" }),
      D(k.corners(bett, 8).map(([cx, cy]) => at([cx, cy, 9])), { size: 0.5 }),
      SV(k.slabOf(steg, 9, FUSS_Z - 9, P, 3, 0.6), { tone: "mid" }),
      L(k.planOutline(k.insetPlan(steg, 5), FUSS_Z, P), { tone: "faint" }),
      D([at([x, -32, FUSS_Z]), at([x, 32, FUSS_Z])], { size: 0.5 }),
    ].join(""), [
      rec(A.slab(bett, 0, 9, { name: "grund.bett", ground: true })),
      rec(A.slab(steg, 9, FUSS_Z - 9, { name: "grund.steg" })),
    ], { name: "grund.fuss", bias: -500 });
  }

  const bett = { x: SCHIENE.x - 8, y: SCHIENE.y - 10, w: SCHIENE.w + 16, d: SCHIENE.d + 20, r: 4 };
  put([SCHIENE.x + SCHIENE.w / 2, 0, 5], [
    `<path class="iso-halo" d="${k.haloOf(bett, 0, 8, P)}"/>`,
    SV(k.slabOf(bett, 0, 8, P, 4, 0.7), { tone: "lo" }),
    SV(k.slabOf(SCHIENE, 8, 9, P, 3, 0.5), { tone: "mid" }),
    L(k.planOutline(k.insetPlan(SCHIENE, 7), 17, P), { tone: "faint" }),
    D([SCHIENE.x + 26, SCHIENE.x + SCHIENE.w / 2, SCHIENE.x + SCHIENE.w - 26]
      .flatMap((x) => [at([x, -22, 17]), at([x, 22, 17])]), { size: 0.45, tone: "lo" }),
  ].join(""), [
    rec(A.slab(bett, 0, 8, { name: "grund.schienenbett", ground: true })),
    rec(A.slab(SCHIENE, 8, 9, { name: "grund.schiene" })),
  ], { name: "grund.schiene", bias: -500 });
}

/** The load, built at stroke 0 and translated by the runtime. */
function lastBlock() {
  const x = SPITZE0;
  const plan = { x, y: -LAST_D / 2, w: LAST_HW * 2, d: LAST_D, r: 4 };
  return [
    `<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 4), 17, 0.1, P)}" style="filter:blur(5px)"/>`,
    SV(G.disc(x - 15, x, 13, FZ, P, { steps: 6 }), { tone: "mid" }),
    SV(k.slabOf(plan, 17, LAST_H, P, 4, 0.9), { tone: "hi" }),
    L(k.planOutline(k.insetPlan(plan, 8), 17 + LAST_H, P), { tone: "faint" }),
    L(k.sideSeam(plan, 17 + LAST_H - 15, P, 4), { tone: "faint" }),
    D(k.corners(plan, 11).map(([cx, cy]) => at([cx, cy, 17 + LAST_H])), { size: 0.55 }),
  ].join("");
}

// --- Caps ----------------------------------------------------------------
function deckelRing(hw, r = 6, n = 5) {
  const punkte = [];
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const cx = sx * (hw - r);
    const cy = sy * (hw - r);
    const a0 = Math.atan2(sy, sx) - Math.PI / 4;
    for (let i = 0; i <= n; i += 1) {
      const a = a0 + (Math.PI / 2) * (i / n);
      punkte.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return punkte;
}
const RING_DECKEL = deckelRing(DHW);

/**
 * A port on a cap: the boss out of the front face and an elbow that turns the
 * hose along the cylinder. Without the elbow the hose would leave straight at
 * the viewer and then turn, which pinches to a V on screen.
 */
const WINKEL_RAUS = 22;
function anschlussFrame(x, hin) {
  return G.frameOf([x, DHW + 8, ZC], [hin, 0, 0], [0, 1, 0], [0, 0, 1]);
}
function anschluss(x, hin) {
  const F = quer(x, ZC);
  void hin;
  return [
    SV(G.disc(DHW, DHW + 8, 8, F, P), { tone: "mid" }),
    SV(G.disc(DHW + 8, DHW + 15, 6.5, F, P, { steps: 6 }), { tone: "mid" }),
    L(G.arcOf(F, DHW + 4, 8, P), { tone: "faint" }),
    L(G.circleOf(F, DHW + 15, 4.4, P), { tone: "faint" }),
  ].join("");
}

function zylinderboden() {
  GRUPPE = "boden";
  put([DECKEL / 2, 0, ZC], [
    SV(G.prismOf(FZ, RING_DECKEL, X_BODEN[0], X_BODEN[1], P), { tone: "mid" }),
    L(G.circleOf(FZ, X_BODEN[1], RD + 1, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_BODEN[1], RB, P), { tone: "faint" }),
    L(SCH.bogenPfad(FZ, X_BODEN[0] + 4, DHW - 5, NAH - 1.2, NAH + 1.2, P), { tone: "faint" }),
  ].join(""), [rec(A.prism(FZ, RING_DECKEL, X_BODEN[0], X_BODEN[1], { name: "boden.deckel" }))],
    { name: "boden.deckel" });
  put([12, DHW + 8, ZC], anschluss(12, 1), [
    rec(A.disc(quer(12, ZC), DHW, DHW + 15, 8, { name: "boden.anschluss" })),
  ], { name: "boden.anschluss" });
}

function zylinderkopf() {
  GRUPPE = "kopf";
  put([X_KOPF[0] + DECKEL / 2, 0, ZC], [
    SV(G.prismOf(FZ, RING_DECKEL, X_KOPF[0], X_KOPF[1], P), { tone: "mid" }),
    SV(G.disc(X_KOPF[1], X_KOPF[1] + 9, 17, FZ, P), { tone: "mid" }),
    L(G.circleOf(FZ, X_KOPF[1] + 9, RS + 1.4, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_KOPF[1] + 9, 13, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_KOPF[0], RD + 1, P), { tone: "faint" }),
    L(SCH.bogenPfad(FZ, X_KOPF[1] - 4, DHW - 5, NAH - 1.2, NAH + 1.2, P), { tone: "faint" }),
  ].join(""), [
    rec(A.prism(FZ, RING_DECKEL, X_KOPF[0], X_KOPF[1], { name: "kopf.deckel" })),
    rec(A.ring(FZ, X_KOPF[1], X_KOPF[1] + 9, RS, 17, { name: "kopf.buchse" })),
  ], { name: "kopf.deckel" });
  put([276, DHW + 8, ZC], anschluss(276, -1), [
    rec(A.disc(quer(276, ZC), DHW, DHW + 15, 8, { name: "kopf.anschluss" })),
  ], { name: "kopf.anschluss" });
}

/** The two cushioning screws, one per cap, on the upper front corner. */
function drosselschrauben() {
  GRUPPE = "drossel";
  for (const [name, x] of [["boden", X_BODEN[0] + 7], ["kopf", X_KOPF[1] - 7]]) {
    const F = quer(x, ZC + 21);
    put([x, DHW + 6, ZC + 21], [
      SV(G.disc(DHW, DHW + 4, 6.5, F, P, { steps: 6 }), { tone: "mid" }),
      SV(G.disc(DHW + 4, DHW + 10, 5, F, P), { tone: "hi" }),
      L(G.ribsOf(F, DHW + 4.5, DHW + 9.5, 5, 14, P, { seams: true }), { tone: "faint" }),
      L(G.circleOf(F, DHW + 10, 5, P), { tone: "lo" }),
      L(k.segment(G.pointOf(F, DHW + 10, 3.4, 0.6), G.pointOf(F, DHW + 10, -3.4, 0.6), P), { tone: "lo" }),
    ].join(""), [rec(A.disc(F, DHW, DHW + 10, 6.5, { name: `drossel.${name}` }))],
      { name: `drossel.${name}`, bias: 20 });
  }
}

function zuganker() {
  GRUPPE = "anker";
  for (const [u, v] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const y = u * ANKER;
    const z = ZC + v * ANKER;
    const F = G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const nah = v > 0;                 // the two upper rods graze the open section
    // The shaft runs between the inner faces of the two caps; where it passes
    // through them it is inside the material and is neither drawn nor recorded.
    const muttern = [
      SV(G.disc(-7, 0, 8, F, P, { steps: 6 }), { tone: "mid" }),
      SV(G.disc(X_KOPF[1], X_KOPF[1] + 7, 8, F, P, { steps: 6 }), { tone: "mid" }),
    ];
    const mutterKoerper = [
      rec(A.disc(F, -7, 0, 8, { name: "anker.mutter" })),
      rec(A.disc(F, X_KOPF[1], X_KOPF[1] + 7, 8, { name: "anker.mutter" })),
    ];
    if (nah) {
      // Cut away over the section, like the tube wall: whole at both ends,
      // absent where it would run straight across the open chamber.
      const bis = X_ROHR[0] + 16;
      const ab = X_ROHR[1] - 16;
      put([X_KOPF[1] / 2, y, z], [
        SV(G.disc(X_ROHR[0], bis, R_ANKER, F, P), { tone: "lo" }),
        SV(G.disc(ab, X_ROHR[1], R_ANKER, F, P), { tone: "lo" }),
        L(G.circleOf(F, bis, R_ANKER, P), { tone: "faint" }),
        L(G.circleOf(F, ab, R_ANKER, P), { tone: "faint" }),
        ...muttern,
      ].join(""), [
        rec(A.disc(F, X_ROHR[0], bis, R_ANKER, { name: "anker.stab" })),
        rec(A.disc(F, ab, X_ROHR[1], R_ANKER, { name: "anker.stab" })),
        ...mutterKoerper,
      ], { name: "anker.stab", bias: v > 0 ? 6 : -6 });
    } else {
      put([X_KOPF[1] / 2, y, z], [
        SV(G.disc(X_ROHR[0], X_ROHR[1], R_ANKER, F, P), { tone: "lo" }),
        ...muttern,
      ].join(""), [
        rec(A.disc(F, X_ROHR[0], X_ROHR[1], R_ANKER, { name: "anker.stab" })),
        ...mutterKoerper,
      ], { name: "anker.stab", bias: v > 0 ? 6 : -6 });
    }
  }
}

function zylinderrohr() {
  GRUPPE = "rohr";
  const f = SCH.fenster(FZ, X_ROHR[0], X_ROHR[1], RA, RB, FENSTER[0], FENSTER[1], P, { name: "rohr" });
  const profil = [[X_ROHR[0], RB], [X_ROHR[0], RA], [X_ROHR[1], RA], [X_ROHR[1], RB]];
  put([(X_ROHR[0] + X_ROHR[1]) / 2, 0, ZC], [
    SV(G.lathe(profil, FZ, P, { rims: "all" }), { tone: "mid" }),
    `<g clip-path="url(#${f.id})">${f.bohrung}</g>`,
    f.kanten,
    f.saum,
  ].join(""), [rec(A.ring(FZ, X_ROHR[0], X_ROHR[1], RB, RA, { name: "rohr.wand" }))],
    { name: "rohr.wand" });
  return f;
}

// --- The parts inside, built at stroke 0 and translated by the runtime ---
function innereien() {
  GRUPPE = "kolben";
  put([KOLBEN0 + KB / 2, 0, ZC], [
    SV(G.disc(KOLBEN0, KOLBEN0 + KB, RB, FZ, P), { tone: "hi" }),
    SV(G.ringBand(KOLBEN0 + 5.5, KOLBEN0 + 9, RB - 2.6, RB, FZ, P), { tone: "lo" }),
    SV(G.ringBand(KOLBEN0 + KB - 8, KOLBEN0 + KB - 5, RB - 1.8, RB, FZ, P), { tone: "lo" }),
    L(G.arcOf(FZ, KOLBEN0 + 13, RB, P), { tone: "faint" }),
    SV(G.disc(KOLBEN0 - DL, KOLBEN0, RD, FZ, P), { tone: "mid" }),
    L(G.circleOf(FZ, KOLBEN0 - DL, RD, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FZ, KOLBEN0, KOLBEN0 + KB, RB, { name: "kolben.scheibe" }))],
    { name: "kolben.scheibe", clip: true, hub: true });

  GRUPPE = "daempfung";
  put([KOLBEN0 + KB + DL / 2, 0, ZC], [
    SV(G.disc(KOLBEN0 + KB, KOLBEN0 + KB + DL, RD, FZ, P), { tone: "mid" }),
    L(G.arcOf(FZ, KOLBEN0 + KB + DL - 4, RD, P), { tone: "faint" }),
    L(G.circleOf(FZ, KOLBEN0 + KB + DL, RD, P), { tone: "faint" }),
  ].join(""), [rec(A.ring(FZ, KOLBEN0 + KB, KOLBEN0 + KB + DL, RS, RD, { name: "daempfung.buchse" }))],
    { name: "daempfung.buchse", clip: true, hub: true });

  // The rod is one body. Inside the tube it is seen through the window, outside
  // the head it stands free; both are the same cylinder, drawn in two places.
  GRUPPE = "stange";
  put([(KOLBEN0 + KB + X_ROHR[1]) / 2, 0, ZC],
    SV(G.disc(KOLBEN0 + KB, X_ROHR[1] + HUB, RS, FZ, P), { tone: "hi" }),
    [rec(A.disc(FZ, KOLBEN0 + KB, X_ROHR[1], RS, { name: "stange.innen" }))],
    { name: "stange.innen", clip: true, hub: true });
  const stab = G.rodOut(FZ, X_KOPF[1], SPITZE0, RS, P, { stroke: HUB });
  STANGEN_CLIP = `<clipPath id="stange-clip"><path d="${stab.clip}"/></clipPath>`;
  put([(X_KOPF[1] + SPITZE0) / 2, 0, ZC], [
    SV(stab.paths, { tone: "hi" }),
    L(G.arcOf(FZ, SPITZE0 - 24, RS, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FZ, X_KOPF[1], SPITZE0, RS, { name: "stange.aussen" }))],
    { name: "stange.aussen", bias: 30, hub: true, clip: "stange-clip" });

  GRUPPE = "grund";
  put([SPITZE0 + LAST_HW, 0, 17 + LAST_H / 2], lastBlock(),
    [rec(A.slab({ x: SPITZE0, y: -LAST_D / 2, w: LAST_HW * 2, d: LAST_D, r: 4 }, 17, LAST_H, { name: "grund.last" })),
      rec(A.ring(FZ, SPITZE0 - 15, SPITZE0, RS, 13, { name: "grund.mutter" }))],
    { name: "grund.last", hub: true, bias: 40 });
}

// --- The 5/2 valve -------------------------------------------------------
// Cut at the plane of its spool: the half towards the viewer is taken off, so
// the spool and its sealing discs sit on the cut face where they can be seen.
function ventil() {
  GRUPPE = "gehaeuse";
  const koerper = { x: V_X[0], y: VY - V_HW, w: V_X[1] - V_X[0], d: V_HW, r: 3 };
  const sockel = { x: V_X[0] - 6, y: VY - V_HW - 3, w: V_X[1] - V_X[0] + 12, d: V_HW + 25, r: 2 };
  const PY_ = VY - V_HW / 2;          // centre line of the half that is left
  const teile = [
    `<path class="iso-halo" d="${k.haloOf(sockel, 0, SOCKEL_H, P)}"/>`,
    SV(k.slabOf(sockel, 0, SOCKEL_H, P, 4, 0.8), { tone: "lo" }),
    L(k.planOutline(k.insetPlan(sockel, 6), SOCKEL_H, P), { tone: "faint" }),
    SV(k.slabOf(koerper, SOCKEL_H, VZ + 20 - SOCKEL_H, P, 3, 0.9), { tone: "mid" }),
    L(k.planOutline(k.insetPlan(koerper, 5), VZ + 20, P), { tone: "faint" }),
    // The bore, seen end-on on the cut face at both ends of the body.
    L(SCH.bogenPfad(FV, V_X[0], R_BOHRUNG, Math.PI / 2, (3 * Math.PI) / 2, P, 20), { tone: "faint" }),
    L(SCH.bogenPfad(FV, V_X[1], R_BOHRUNG, Math.PI / 2, (3 * Math.PI) / 2, P, 20), { tone: "faint" }),
    // The bore as a channel: the far inner half of the cylinder, shaded, so
    // the spool sits in it instead of being stuck on the outside.
    SCH.flaeche(
      SCH.flaechenstueck(FV, V_X[0], V_X[1], R_BOHRUNG, SCH.naechsterWinkel(FV, P) + Math.PI / 2,
        SCH.naechsterWinkel(FV, P) + (3 * Math.PI) / 2, P, 20),
      [0, -1, 0], P,
    ),
    L(k.segment([V_X[0], VY, VZ + R_BOHRUNG], [V_X[1], VY, VZ + R_BOHRUNG], P), { tone: "lo" }),
    L(k.segment([V_X[0], VY, VZ - R_BOHRUNG], [V_X[1], VY, VZ - R_BOHRUNG], P), { tone: "lo" }),
  ];
  // Only the working ports and the supply get a boss on top. The two exhaust
  // ways run down through the sub-base, the way a sub-base valve really does
  // it — which also keeps the top clear for the hoses.
  for (const nr of ARBEIT) {
    const x = PORT[nr];
    const F = hoch(x, PY_);
    const hoehe = nr === 1 ? 42 : 38;
    teile.push(SV(G.disc(VZ + 20, VZ + hoehe, 7, F, P), { tone: "mid" }));
    teile.push(L(G.arcOf(F, VZ + 26, 7, P), { tone: "faint" }));
    teile.push(k.faceTextSvg(k.topMatrix([x - 5, PY_ - 15], VZ + 20.2, P), String(nr), { size: 11, tone: "mid" }));
    teile.push(L(k.segment([x, VY, VZ + R_BOHRUNG], [x, VY, VZ + 20], P), { tone: "faint", free: true }));
    if (nr === 1) {
      teile.push(L(G.circleOf(F, VZ + 42, 4.4, P), { tone: "faint" }));
      continue;
    }
    // An elbow: the hose leaves along the valve, not towards the viewer.
    const FW = G.frameOf([x, PY_, VZ + 29], [WINKEL[nr], 0, 0], [0, 1, 0], [0, 0, 1]);
    teile.push(SV(G.disc(6.6, 20, 6, FW, P), { tone: "mid" }));
    teile.push(L(G.circleOf(FW, 20, 4.2, P), { tone: "faint" }));
    teile.push(L(G.arcOf(FW, 15, 6, P), { tone: "faint" }));
  }
  for (const nr of ABLUFT) {
    const x = PORT[nr];
    // The drilling from the bore down into the sub-base, on the cut face.
    teile.push(L(k.segment([x, VY, VZ - R_BOHRUNG], [x, VY, SOCKEL_H / 2], P), { tone: "faint", free: true }));
    teile.push(k.faceTextSvg(k.sideMatrix([x - 5, VY], VZ - R_BOHRUNG - 4, P, "right"), String(nr), { size: 10, tone: "mid" }));
  }
  // The bosses are drawn, so they are recorded: a hose has to end on a part.
  const stutzen = ARBEIT.flatMap((nr) => {
    const x = PORT[nr];
    if (nr === 1) return [rec(A.disc(hoch(x, PY_), VZ + 20, VZ + 42, 7, { name: "gehaeuse.stutzen1" }))];
    const FW = G.frameOf([x, PY_, VZ + 29], [WINKEL[nr], 0, 0], [0, 1, 0], [0, 0, 1]);
    return [
      rec(A.disc(hoch(x, PY_), VZ + 20, VZ + 38, 7, { name: `gehaeuse.stutzen${nr}` })),
      rec(A.disc(FW, 6.6, 20, 6, { name: `gehaeuse.winkel${nr}` })),
    ];
  });
  put([(V_X[0] + V_X[1]) / 2, PY_, VZ], teile.join(""), [
    ...stutzen,
    rec(A.slab(sockel, 0, SOCKEL_H, { name: "gehaeuse.sockel", ground: true })),
    rec(A.slab(koerper, SOCKEL_H, VZ - (R_BOHRUNG - 0.3) - SOCKEL_H, { name: "gehaeuse.unten" })),
    rec(A.slab(koerper, VZ + R_BOHRUNG - 0.3, 20 - R_BOHRUNG + 0.3, { name: "gehaeuse.oben" })),
  ], { name: "gehaeuse.koerper" });

  // The spool: a shaft with four sealing discs, one between each pair of
  // neighbouring ports. Sliding it by one port width swaps every connection.
  GRUPPE = "schieber";
  const mitten = [95, 124.5, 153.5, 183];
  put([(V_X[0] + V_X[1]) / 2, VY, VZ], [
    SV(G.disc(V_X[0] + 4, V_X[1] - 4, R_SCHIEBER, FV, P), { tone: "hi" }),
    ...mitten.map((x) => SV(G.disc(x - 5.5, x + 5.5, R_BOHRUNG - 0.3, FV, P), { tone: "hi" })),
    ...mitten.map((x) => L(G.arcOf(FV, x, R_BOHRUNG - 0.3, P), { tone: "faint" })),
    ...mitten.map((x) => L(G.circleOf(FV, x - 5.5, R_BOHRUNG - 0.3, P), { tone: "faint" })),
  ].join(""), [rec(A.disc(FV, V_X[0] + 4, V_X[1] - 4, R_BOHRUNG - 0.3, { name: "schieber.kolben" }))],
    { name: "schieber.kolben", bias: 40, schieber: true });

  // Push button one end, return spring the other.
  GRUPPE = "betaetigung";
  const FB = G.frameOf([0, VY, VZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put([V_X[1] + 16, VY, VZ], [
    SV(G.disc(V_X[1], V_X[1] + 10, 13, FB, P), { tone: "mid" }),
    SV(G.disc(V_X[1] + 10, V_X[1] + 24, 10, FB, P), { tone: "hi" }),
    L(G.ribsOf(FB, V_X[1] + 11, V_X[1] + 23, 10, 18, P, { seams: true }), { tone: "faint" }),
    L(G.circleOf(FB, V_X[1] + 24, 10, P), { tone: "lo" }),
  ].join(""), [rec(A.disc(FB, V_X[1], V_X[1] + 24, 13, { name: "betaetigung.taster" }))],
    { name: "betaetigung.taster", bias: 40 });
  // The cap is short enough for the spring to show: a spring buried in its own
  // housing is drawn over it and its ends land on nothing.
  const feder = k.coil(V_X[0] - 18, V_X[0], [VY, VZ], 8, 6, "x", P);
  put([V_X[0] - 14, VY, VZ], [
    SV(G.disc(V_X[0] - 30, V_X[0] - 18, 12, FB, P), { tone: "mid" }),
    L(G.ribsOf(FB, V_X[0] - 29, V_X[0] - 19, 12, 16, P, { seams: true }), { tone: "faint" }),
    L(G.circleOf(FB, V_X[0] - 18, 8, P), { tone: "faint" }),
    L(feder.back, { tone: "lo" }),
    SV(G.disc(V_X[0] - 18, V_X[0] + 4, R_SCHIEBER, FB, P), { tone: "mid" }),
    L(feder.front, { tone: "lo" }),
    L(G.circleOf(FB, V_X[0], 8, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(FB, V_X[0] - 30, V_X[0] - 18, 12, { name: "betaetigung.kappe" })),
    rec(A.disc(FB, V_X[0] - 18, V_X[0] + 4, R_SCHIEBER, { name: "betaetigung.stift" })),
  ], { name: "betaetigung.feder", bias: 40 });
}

// --- Hoses and the supply line -------------------------------------------
const PY_ = VY - V_HW / 2;

/** A smooth hose from one port to another, leaving and arriving along the ports. */
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
 * A hose between two ports. It leaves and enters along the port axis on a
 * short straight piece, so its end face sits flush in the fitting; the curve
 * between them is smooth, with no corner tighter than the hose is thick.
 */
function schlauch(p0, aus, p1, ein, k0, k1) {
  const weiter = (p, d, t) => [0, 1, 2].map((j) => p[j] + d[j] * t);
  const a0 = weiter(p0, aus, 18);
  const a1 = weiter(p1, ein, 26);
  const kurve = hermite(a0, aus.map((v) => v * k0), a1, ein.map((v) => -v * k1), 34);
  return [p0, ...kurve, p1];
}

const AUF = [0, 0, 1];
const VOR = [0, 1, 0];
const WEGE = {
  A: schlauch([12, DHW + 15, ZC], VOR, [PORT[4] - 20, PY_, VZ + 29], [-1, 0, 0], 40, 100),
  B: schlauch([276, DHW + 15, ZC], VOR, [PORT[2] + 20, PY_, VZ + 29], [1, 0, 0], 120, 40),
  V: schlauch([PORT[1], PY_, VZ + 42], AUF, [PORT[1] - 96, VY + 86, 34], AUF, 190, 170),
};
const BAHN_PUNKTE = {};
function schlaeuche() {
  GRUPPE = "leitung";
  for (const [name, punkte] of Object.entries(WEGE)) {
    BAHN_PUNKTE[name] = punkte;
    R.route(`leitung.${name}`, punkte, R_SCHLAUCH, { piece: "leitung", move: MOVE.leitung, free: [true, true] });
    tubePieces(punkte, R_SCHLAUCH, P, { maxLength: 60 }).forEach((teil, i) => {
      put(teil.mid, tubeSvg(teil, { tone: "lo" }), [A.tube(teil.points, teil.radii)],
        { name: `leitung.${name}:${i}`, route: `leitung.${name}`, chunk: i });
    });
  }
  // Where the figure's air comes from: a coupling on a post, so the supply
  // line ends on a real part instead of in mid-air.
  const ende = WEGE.V[WEGE.V.length - 1];
  const fuss = { x: ende[0] - 20, y: ende[1] - 20, w: 40, d: 40, r: 3 };
  const F = G.frameOf([ende[0], ende[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put([ende[0], ende[1], 16], [
    `<path class="iso-halo" d="${k.haloOf(fuss, 0, 7, P)}"/>`,
    SV(k.slabOf(fuss, 0, 7, P, 3, 0.6), { tone: "lo" }),
    SV(G.disc(7, 22, 9, F, P), { tone: "mid" }),
    SV(G.disc(22, 34, 12, F, P), { tone: "hi" }),
    L(G.ribsOf(F, 23, 33, 12, 16, P, { seams: true }), { tone: "faint" }),
    L(G.circleOf(F, 34, 12, P), { tone: "lo" }),
    L(G.circleOf(F, 34, 5, P), { tone: "faint" }),
  ].join(""), [
    rec(A.slab(fuss, 0, 7, { name: "leitung.kupplungsfuss", ground: true })),
    rec(A.disc(F, 7, 34, 12, { name: "leitung.kupplung" })),
  ], { name: "leitung.kupplung", bias: 40 });
}

// --- Compose -------------------------------------------------------------
grundplatte();
zylinderboden();
zuganker();
const FINFO = zylinderrohr();
innereien();
zylinderkopf();
drosselschrauben();
ventil();
schlaeuche();

A.settle(R, P);

// A cutaway the depth solver cannot know about: the tube's near wall really is
// in front of the piston, so `settle` paints it over everything inside — right
// for an uncut tube, wrong here, because that wall is what the window removes.
// The tube is therefore pushed behind every item clipped to the window; outside
// the window those items are clipped away, so the wall still covers what it should.
{
  const innen = R.items.filter((it) => it.clip);
  const rohr = R.items.find((it) => it.name === "rohr.wand");
  if (rohr && innen.length) rohr.key = Math.min(rohr.key, ...innen.map((it) => it.key)) - 0.5;
  void innen;
}

// The air sits in the bore: in front of the tube's far wall, behind the piston
// and the rod. Its key is set from those, not from the tube's.
const LUFT_KEY = Math.min(...R.items.filter((it) => it.clip).map((it) => it.key)) - 0.2;
R.items.push({
  key: LUFT_KEY, piece: "luft", gruppe: "luft", label: "luft", name: "luft.kammern", pos: null,
  svg: `<g data-clip="1" clip-path="url(#${FINFO.id})">`
    + `<path class="kammer" data-kammer="a" d=""/><path class="kammer" data-kammer="b" d=""/></g>`,
});

R.items.sort((a, b) => a.key - b.key);

const { KEYS, LIFT, VIEW0, VIEW1, MITTE } = EX.vorbereiten(R, P, MOVE, W, H);

// The air routes, projected once: the page places particles along them.
const BAHNEN = Object.fromEntries(
  Object.entries(BAHN_PUNKTE).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]),
);
// Two short routes from the valve body out through the silencers.
const SOCKEL_VORN = VY - V_HW - 3 + V_HW + 25;
for (const [name, nr] of [["E5", 5], ["E3", 3]]) {
  const x = PORT[nr];
  BAHNEN[name] = LU.bahn(
    [[x, VY, VZ], [x, VY, 9], [x, SOCKEL_VORN - 6, 9], [x, SOCKEL_VORN + 24, 9]], P, k.iso,
  );
}

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein doppeltwirkender Pneumatikzylinder nach ISO 15552 im Schnitt, davor das 5/2-Wegeventil, das ihn umschaltet. "
    + "Durch ein Fenster im Zylinderrohr sieht man den Kolben, der das Rohr in zwei Kammern teilt, die Dämpfungsbuchse und die Kolbenstange. "
    + "Zwei Schläuche verbinden die Anschlüsse der Zylinderdeckel mit dem Ventil; die Kolbenstange schiebt einen Schlitten auf einer Schiene. "
    + "Die Druckluft ist eingefärbt: das kräftige Blau steht unter Druck, das blasse ist Abluft auf dem Weg zum Schalldämpfer.",
  body: [
    `<defs>${FINFO.defs}${STANGEN_CLIP}</defs>`,
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}">${it.svg}</g>`).join(""),
    `<g class="luft" data-luftlage></g>`,
  ],
});

// --- The page ------------------------------------------------------------
const quelle = (datei) => readFileSync(join(WURZEL, datei), "utf8").replace(/^export /gm, "");

const live = `
const MASSE = ${JSON.stringify(Z)};
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
const RB = ${RB}, RS = ${RS}, ZC = ${ZC}, HUB = ${HUB};
const KOLBEN0 = ${KOLBEN0}, KB = ${KB}, DL = ${DL};
const X_ROHR = ${JSON.stringify(X_ROHR)}, X_KOPF = ${JSON.stringify(X_KOPF)};
const WEG0 = ${WEG0};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = Array.from(svg.querySelectorAll("[data-g]"));
const readout = document.querySelector("[data-readout]");
const info = document.querySelector(".pickinfo");
const still = matchMedia("(prefers-reduced-motion: reduce)");

${quelle("figur/pneumatik.mjs")}
${EX.LAUFZEIT}
${LU.LAUFZEIT}

// --- the model drives everything -----------------------------------------
const zustand = neuerZustand(MASSE, { weg: WEG0, stellung: "ausfahren" });
let druck = 6;
let auto = true;
let angehalten = false;

const hubTeile = Array.from(svg.querySelectorAll("[data-hub]"));
const schieberTeile = Array.from(svg.querySelectorAll("[data-schieber]"));
const SCHIEBER_WEG = ${SCHIEBER_WEG};
const kammerA = svg.querySelector('[data-kammer="a"]');
const kammerB = svg.querySelector('[data-kammer="b"]');
const luftLage = svg.querySelector("[data-luftlage]");
const stroeme = {};
for (const name in BAHNEN) stroeme[name] = stromBauen(luftLage, name, BAHNEN[name], name === "V" ? 5 : 9);

// While the machine comes apart the stroke runs back to zero: the parts in the
// bore would otherwise carry it on top of their escape path, and their numbers
// would point at where they are not.
let hubAnteil = 1;
function zeichneHub() {
  const weg = zustand.weg * hubAnteil;
  const t = translateAlong(P, [weg, 0, 0]);
  for (const el of hubTeile) el.setAttribute("transform", t);
  const ts = translateAlong(P, [(zustand.schieber - 0.5) * 2 * SCHIEBER_WEG, 0, 0]);
  for (const el of schieberTeile) el.setAttribute("transform", ts);
  const vorn = KOLBEN0 + weg;
  kammerA.setAttribute("d", kammerPfad(X_ROHR[0] + 1, vorn));
  kammerB.setAttribute("d", kammerPfad(vorn + KB, X_ROHR[1] - 1));
}

function zeichneLuft(dt) {
  const F = luftFarben();
  const q = UMGEBUNG + druck;
  const l = leitwerte(zustand, MASSE);
  const qA = l.aZu * (q - zustand.pA) + l.aAb * (UMGEBUNG - zustand.pA);
  const qB = l.bZu * (q - zustand.pB) + l.bAb * (UMGEBUNG - zustand.pB);
  const anteil = (p) => Math.max(0, Math.min(1, (p - UMGEBUNG) / Math.max(0.2, druck)));
  kammerA.setAttribute("fill", mische(F.abluft, F.druck, anteil(zustand.pA)));
  kammerB.setAttribute("fill", mische(F.abluft, F.druck, anteil(zustand.pB)));

  const tempo = (x) => Math.max(-260, Math.min(260, x * 2.4e-4));
  const kraft = (x) => Math.max(0, Math.min(1, Math.abs(x) / 2.2e5));
  stromSchritt(stroeme.A, dt, tempo(-qA), kraft(qA), qA > 0 ? F.druck : F.abluft);
  stromSchritt(stroeme.B, dt, tempo(-qB), kraft(qB), qB > 0 ? F.druck : F.abluft);
  stromSchritt(stroeme.V, dt, tempo(-(Math.max(0, qA) + Math.max(0, qB))), kraft(Math.max(0, qA) + Math.max(0, qB)), F.druck);
  stromSchritt(stroeme.E5, dt, tempo(Math.max(0, -qA)), kraft(Math.max(0, -qA)), F.abluft);
  stromSchritt(stroeme.E3, dt, tempo(Math.max(0, -qB)), kraft(Math.max(0, -qB)), F.abluft);
}

let letzteZeile = "";
function zeichneAnzeige() {
  const a = anzeige(zustand, MASSE, druck);
  const text = a.weg + " von " + HUB + " mm · " + a.kraftAus + " N aus / " + a.kraftEin + " N ein";
  if (text !== letzteZeile) { readout.textContent = text; letzteZeile = text; }
}

// --- frame loop -----------------------------------------------------------
let frame = 0, last = 0, sichtbar = false, zyklus = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const ruhig = still.matches;
  const bewegt = springStep(dt);
  const offen = poseExplode();
  const willHub = Math.max(0, 1 - offen * 2);
  if (Math.abs(willHub - hubAnteil) > 1e-4) { hubAnteil = willHub; zeichneHub(); }
  luftLage.style.opacity = String(Math.max(0, 1 - offen * 3));
  for (const el of [kammerA, kammerB]) el.style.opacity = String(Math.max(0, 1 - offen * 3));
  // The machine stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    if (auto) {
      zyklus += dt;
      if (zyklus > (ruht(zustand, MASSE, druck) ? 0.8 : 1e9)) {
        zustand.stellung = zustand.stellung === "ausfahren" ? "einfahren" : "ausfahren";
        zyklus = 0;
      }
    }
    if (!angehalten) schritt(zustand, MASSE, ruhig ? dt * 0.4 : dt, druck);
    zeichneHub();
    zeichneLuft(dt);
    zeichneAnzeige();
  } else {
    for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
  }
  frame = sichtbar ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && sichtbar) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { sichtbar = e[e.length - 1].isIntersecting; if (sichtbar) run(); }, { rootMargin: "140px 0px" }).observe(stage);

// --- controls -------------------------------------------------------------
const knopfVentil = document.getElementById("btn-ventil");
const knopfAuto = document.getElementById("btn-auto");
const knopfExplode = document.getElementById("btn-explode");
const druckRegler = document.getElementById("druck");
const druckWert = document.getElementById("druck-wert");

function schalte() {
  angehalten = false;
  zustand.stellung = zustand.stellung === "ausfahren" ? "einfahren" : "ausfahren";
  zyklus = 0;
  run();
}
knopfVentil.addEventListener("click", () => {
  auto = false;
  knopfAuto.setAttribute("aria-pressed", "false");
  schalte();
});
knopfAuto.addEventListener("click", () => {
  auto = !auto;
  angehalten = false;
  knopfAuto.setAttribute("aria-pressed", String(auto));
  zyklus = 0;
  run();
});
knopfAuto.setAttribute("aria-pressed", "true");
druckRegler.addEventListener("input", () => {
  druck = druckRegler.valueAsNumber;
  angehalten = false;
  druckWert.textContent = druck.toFixed(1).replace(".", ",") + " bar";
  zeichneAnzeige();
  run();
});

// --- take apart and rebuild ----------------------------------------------
let zerlegt = false, erzaehler = [];
function erzaehle(on) {
  for (const t of erzaehler) clearTimeout(t);
  erzaehler = [];
  if (!on) {
    const folge = ORDER.slice().reverse();
    folge.forEach((id, i) => {
      erzaehler.push(setTimeout(() => {
        const e = STEP[id];
        if (e) info.textContent = e.nr + " · " + e.name + " — " + e.satz;
      }, i * TAKT.zusammen));
    });
    erzaehler.push(setTimeout(() => { info.textContent = INFO_RUHE; }, folge.length * TAKT.zusammen + 900));
  }
}
const INFO_RUHE = info.textContent;
function spiele(on) {
  zerlegt = on;
  knopfExplode.setAttribute("aria-pressed", String(on));
  schedule(on, on ? TAKT.auseinander : TAKT.zusammen);
  if (on) info.textContent = "Die Baugruppen fahren auseinander. Noch einmal drücken oder Escape bricht ab.";
  else erzaehle(false);
  run();
}
knopfExplode.addEventListener("click", () => spiele(!zerlegt));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && zerlegt) spiele(false); });

// Taking apart in one go: out, hold, then back together assembly by assembly.
let haltezeit = 0;
const urSchedule = schedule;

// --- legend ---------------------------------------------------------------
let gewaehlt = null;
const pickKnoepfe = Array.from(document.querySelectorAll(".pickbtn"));
function zeige(id) {
  for (const el of groups) {
    el.classList.toggle("mark", Boolean(id) && el.dataset.piece === id);
    el.classList.toggle("dim", Boolean(id) && el.dataset.piece !== id);
  }
}
function waehle(id) {
  gewaehlt = gewaehlt === id ? null : id;
  for (const b of pickKnoepfe) b.setAttribute("aria-pressed", String(b.dataset.pick === gewaehlt));
  zeige(gewaehlt);
  info.textContent = gewaehlt && STEP[gewaehlt]
    ? STEP[gewaehlt].nr + " · " + STEP[gewaehlt].name + " — " + STEP[gewaehlt].satz
    : INFO_RUHE;
}
for (const b of pickKnoepfe) {
  // Showing and remembering are two different things: hovering must not store
  // anything, or the click after it sees the entry as already chosen.
  b.addEventListener("pointerenter", () => { if (!gewaehlt) zeige(b.dataset.pick); });
  b.addEventListener("pointerleave", () => { if (!gewaehlt) zeige(null); });
  b.addEventListener("click", () => waehle(b.dataset.pick));
}

zeichneHub();
zeichneAnzeige();
poseExplode();

// A handle for the browser test and for screenshots: it can put the figure
// into a known state instead of waiting and hoping to catch the right moment.
window.__figur = {
  zustand, MASSE,
  stelle(weg, stellung) {
    auto = false;
    angehalten = true;
    knopfAuto.setAttribute("aria-pressed", "false");
    zustand.weg = weg;
    zustand.v = 0;
    if (stellung) {
      zustand.stellung = stellung;
      zustand.schieber = stellung === "ausfahren" ? 1 : 0;
      const voll = UMGEBUNG + druck;
      zustand.pA = stellung === "ausfahren" ? voll : UMGEBUNG;
      zustand.pB = stellung === "ausfahren" ? UMGEBUNG : voll;
    }
    zeichneHub();
    zeichneLuft(0.016);
    zeichneAnzeige();
  },
  druck: () => druck,
  offen: () => offenAnteil(),
  zerlegt: () => zerlegt,
  spiele,
  waehle,
  weiter: () => { angehalten = false; },
};
void haltezeit; void urSchedule; void RS; void DL; void X_KOPF;
`;

const INFO =
  "Der Taster am Ventil schaltet um, die Automatik lässt den Zyklus laufen. "
  + "Das kräftige Blau ist Druckluft, das blasse ist Abluft auf dem Weg zum Schalldämpfer. "
  + "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const LEISTE =
  knopf("btn-ventil", "Ventil schalten", { titel: "Den Steuerschieber in die andere Stellung schieben" })
  + knopf("btn-auto", "Automatik", { gedrueckt: true })
  + knopf("btn-explode", "Zerlegen und zusammenbauen")
  + `<span class="luecke"></span>`
  + schieber("druck", "Druck", { min: 2, max: 8, step: 0.5, wert: 6, einheit: " bar", beschreibung: "Betriebsdruck in bar" })
  + hausBedienung();

const f = PN.flaechen(Z);
const LESETEXT = `<div class="lesetext">
<h2>Wozu zwei Anschlüsse?</h2>
<p>Ein <strong>einfachwirkender</strong> Zylinder bekommt nur an einer Seite Luft; zurück schiebt ihn eine Feder.
Das reicht, solange der Rückweg kraftlos sein darf. Der <strong>doppeltwirkende</strong> Zylinder hat an beiden
Deckeln einen Anschluss: welche Kammer gefüllt wird, bestimmt das Ventil, und er drückt in beide Richtungen
mit voller Kraft.</p>
<p>Damit sich überhaupt etwas bewegt, muss die <em>andere</em> Kammer gleichzeitig entlüften. Genau das ist die
Aufgabe des 5/2-Wegeventils: ein Anschluss für die Zuluft (1), zwei zum Zylinder (2 und 4) und zwei für die
Abluft (3 und 5). In der einen Stellung verbindet es 1→4 und 2→3, in der anderen 1→2 und 4→5.</p>

<h2>Wie viel Kraft?</h2>
<p>Die Kraft ist Druck mal Fläche. Beim Ausfahren drückt die Luft auf die ganze Kolbenfläche, beim Einfahren
nur noch auf die Ringfläche – die Kolbenstange nimmt ihren Querschnitt weg.</p>
<p class="formel">
A<sub>Kolben</sub> = π/4 · D² = π/4 · 50² = <strong>${f.kolben.toFixed(1)} mm²</strong><br>
A<sub>Ring</sub> = π/4 · (D² − d²) = π/4 · (50² − 20²) = <strong>${f.ring.toFixed(1)} mm²</strong><br>
bei 6 bar: F<sub>aus</sub> = 0,6 N/mm² · ${f.kolben.toFixed(1)} mm² = <strong>${Math.round(PN.kraftAus(6, Z))} N</strong><br>
bei 6 bar: F<sub>ein</sub> = 0,6 N/mm² · ${f.ring.toFixed(1)} mm² = <strong>${Math.round(PN.kraftEin(6, Z))} N</strong>
</p>
<p class="hinweis">Das sind theoretische Werte. Die Reibung der Dichtungen zieht in der Praxis noch einmal
3 bis 10 Prozent ab.</p>

<h2>Warum wird er vor dem Anschlag langsam?</h2>
<p>Kurz vor der Endlage taucht die Dämpfungsbuchse in den Deckel und sperrt den breiten Weg der Abluft. Die
Luft kann nur noch durch die Drosselschraube entweichen, staut sich auf und bremst den Kolben. Ohne diese
<strong>Endlagendämpfung</strong> würde der Kolben mit voller Geschwindigkeit auf den Deckel schlagen. Beim
Anfahren stört sie nicht: ein Rückschlagventil führt die Luft an der Drossel vorbei.</p>

<h2>Was ist schneller, Aus- oder Einfahren?</h2>
<p>Die bekannte Faustregel sagt „Einfahren", weil die Ringfläche kleiner ist. Sie stammt aber aus der Hydraulik,
wo der Volumenstrom fest vorgegeben ist. In der Pneumatik ist er das nicht – die Geschwindigkeit hängt davon ab,
wie frei die Luft hinein <em>und wieder hinaus</em> kommt. Ist die <strong>Zuluft</strong> die Engstelle, fährt er
schneller ein; ist die <strong>Abluft</strong> die Engstelle – der Normalfall, wenn man mit Drosselrückschlag­ventilen
abluftseitig drosselt –, fährt er schneller aus, weil beim Einfahren die große Kolbenkammer geleert werden muss.</p>

<p class="hinweis">Jede Zahl auf dieser Seite wird aus demselben Modell gerechnet, das auch den Kolben bewegt.
Welche Maße aus dem Katalog stammen und welche angenommen sind, steht in der Anleitung zur Figur.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

writeFileSync(ZIEL, seite({
  titel: "Doppeltwirkender Zylinder – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "Doppeltwirkender Zylinder mit 5/2-Wegeventil",
  hinweis: "Ventil schalten, Druck einstellen, zerlegen",
  anzeige: `${WEG0} von ${HUB} mm · ${Math.round(PN.kraftAus(6, Z))} N aus / ${Math.round(PN.kraftEin(6, Z))} N ein`,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft auf dem Weg in die Kammer" },
    { mark: "dotted", label: "Blasses Blau: Abluft auf dem Weg zum Schalldämpfer" },
    { mark: "lit", label: "Kolben, Kolbenstange und Steuerschieber – was sich bewegt" },
    { mark: "dim", label: "Das Zylinderrohr ist aufgeschnitten, das Ventil an der Schieberebene" },
  ],
  caption:
    "Normzylinder nach ISO 15552, Bohrung 50 mm, Hub 200 mm, am 5/2-Wegeventil. Das Ventil legt eine Kammer "
    + "an die Zuluft und entlüftet gleichzeitig die andere; erst dadurch bewegt sich der Kolben. Beim Ausfahren "
    + "drückt die Luft auf die volle Kolbenfläche, beim Einfahren nur auf die Ringfläche – daher die kleinere Kraft.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live + `\n${LU.CSS ? "" : ""}`,
  breite: 1220,
  buehneLabel: "Doppeltwirkender Zylinder mit 5/2-Wegeventil: Luftweg, Kolben und Baugruppen",
}).replace("</style>", `${LU.CSS}</style>`));

console.log(`geschrieben: ${ZIEL}`);
console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
console.log(`Fenster ${(FENSTER[0] * 57.3).toFixed(0)}°…${(FENSTER[1] * 57.3).toFixed(0)}° (nächster Winkel ${(NAH * 57.3).toFixed(0)}°)`);

if (process.argv.includes("--apart")) {
  // Everything at the end of its escape path: do the assemblies pass through
  // one another on the way out? The explode is not handed to the depth solver
  // (it cannot order a body this dense), so this is checked on its own.
  for (const shape of R.solids) shape.move = MOVE[shape.piece] ?? [0, 0, 0];
  const probleme = A.solidClearances(R.solids, { state: 1 });
  for (const p of probleme.slice(0, 20)) {
    console.log(`  ${p.a ?? p.one ?? ""} × ${p.b ?? p.two ?? ""}  ${JSON.stringify(p).slice(0, 150)}`);
  }
  console.log(probleme.length ? `auseinandergefahren: ${probleme.length} Durchdringungen` : "auseinandergefahren: sauber");
  if (probleme.length) process.exit(1);
}

if (process.argv.includes("--audit")) {
  A.auditOrExit(R, P, {
    // The tube's near wall is cut away over the window, so everything inside
    // is painted over it on purpose. The solver measures the uncut wall and
    // is right to object; the drawing is right too.
    allow: [
      ["rohr.wand", "kolben.scheibe"],
      ["rohr.wand", "daempfung.buchse"],
      ["rohr.wand", "stange.innen"],
      ["rohr.wand", "luft.kammern"],
      ["rohr.wand", "anker.stab*"],
      // Coaxial parts that genuinely interlock: a rod through a gland, a bush
      // on a rod, a spool in its bore, a tie rod through a cap. No drawing
      // order is "right" for these; they are cut, not biased.
      ["daempfung.buchse", "stange.innen"],
      ["kopf.deckel", "stange.aussen"],
      ["stange.aussen", "grund.last"],
      ["kopf.deckel", "anker.stab*"],
      ["boden.deckel", "anker.stab*"],
      ["gehaeuse.koerper", "schieber.kolben"],
      ["boden.anschluss", "leitung.A*"],
      ["kopf.anschluss", "leitung.B*"],
      ["gehaeuse.daempfer*", "leitung.*"],
      // A hose plugged into a fitting is a joint, and the fitting sits on the
      // body: no drawing order separates them.
      ["gehaeuse.koerper", "leitung.*"],
    ],
    // Where a hose ends IS a joint — it plugs into the fitting on the body.
    // That is what these would otherwise report.
    crowd: [
      ["leitung.A", "gehaeuse.oben"],
      ["leitung.B", "gehaeuse.oben"],
      ["leitung.A", "leitung.V"],
    ],
    // Both rod drawings are clipped to what is actually visible — the markup
    // box is the whole rod, the recorded shape only the part on screen.
    cover: ["stange.aussen", "stange.innen"],
  });
}
void TOT; void R_ANKER;
