// A double-acting cylinder to ISO 15552 (bore 50, stroke 200) on the 5/2 valve
// that switches it, as an isometric cutaway with the compressed air visible.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are Festo DSBC Ø 50;
// everything else is an assumption and is listed in the README.
//
// This script holds geometry and four data tables and nothing else: springs,
// depth sorting, legend, air and page shell all come from ../../figur/.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import * as PN from "../../../figur/pneumatik.mjs";
import * as EX from "../../../figur/explode.mjs";
import * as LU from "../../../figur/luft.mjs";
import * as LEG from "../../../figur/legende.mjs";
import { zylinderTeile, schlauch } from "../../../figur/zylinderteile.mjs";
import * as ZS from "../../../figur/zylinderseite.mjs";
import { seite, knopf, schieber, hausBedienung, modulQuelle } from "../../../figur/seite.mjs";
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
const quer = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);

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

const ZT = zylinderTeile({ P, R, put, gruppe: (g) => { GRUPPE = g; }, MOVE });

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
function anschluss(x) {
  const F = quer(x, ZC);
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
  put([12, DHW + 8, ZC], anschluss(12), [
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
  put([276, DHW + 8, ZC], anschluss(276), [
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

  ZT.lastschlitten({ x: SPITZE0, hw: LAST_HW, d: LAST_D, h: LAST_H, F: FZ, rStange: RS });
}

// --- Hoses and the supply line -------------------------------------------
const PY_ = VY - V_HW / 2;

const AUF = [0, 0, 1];
const VOR = [0, 1, 0];
const WEGE = {
  A: schlauch([12, DHW + 15, ZC], VOR, [PORT[4] - 20, PY_, VZ + 29], [-1, 0, 0], 40, 100),
  B: schlauch([276, DHW + 15, ZC], VOR, [PORT[2] + 20, PY_, VZ + 29], [1, 0, 0], 120, 40),
  V: schlauch([PORT[1], PY_, VZ + 42], AUF, [PORT[1] - 96, VY + 86, 34], AUF, 190, 170),
};
// --- Compose -------------------------------------------------------------
ZT.grundplatte({ fuss: FUSS, fussZ: FUSS_Z, schiene: SCHIENE });
zylinderboden();
zuganker();
const FINFO = zylinderrohr();
innereien();
zylinderkopf();
drosselschrauben();
ZT.ventil({
  x: V_X, y: VY, z: VZ, halbbreite: V_HW, rBohrung: R_BOHRUNG, rSchieber: R_SCHIEBER, port: PORT,
  oben: ARBEIT, unten: ABLUFT, winkel: WINKEL, sockelH: SOCKEL_H, scheiben: [95, 124.5, 153.5, 183],
});
const BAHN_PUNKTE = ZT.schlaeuche(WEGE, { radius: R_SCHLAUCH, versorgung: "V" });

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

${modulQuelle(WURZEL, ["figur/ventil.mjs", "figur/pneumatik.mjs"])}
${EX.LAUFZEIT}
${LEG.LAUFZEIT}
${EX.ABLAUF}
${LU.LAUFZEIT}
${ZS.LAUFZEIT}

// --- the model drives everything -----------------------------------------
const zustand = neuerZustand(MASSE, { weg: WEG0, stellung: "ausfahren" });
let druck = 6;
let auto = true;
let angehalten = false;

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
  teileVerschieben(weg, zustand.schieber, SCHIEBER_WEG);
  const vorn = KOLBEN0 + weg;
  kammerA.setAttribute("d", kammerPfad(X_ROHR[0] + 1, vorn));
  kammerB.setAttribute("d", kammerPfad(vorn + KB, X_ROHR[1] - 1));
}

function zeichneLuft(dt) {
  const F = luftFarben();
  const { qA, qB } = kammerFluesse(zustand, druck);
  kammerFuellen(kammerA, zustand.pA, druck, F);
  kammerFuellen(kammerB, zustand.pB, druck, F);

  const tempo = stromTempo, kraft = stromKraft;
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

// --- one frame (the loop itself is EX.ABLAUF) -----------------------------
function bildZeichnen(dt, offen, bewegt) {
  const ruhig = still.matches;
  const willHub = Math.max(0, 1 - offen * 2);
  if (Math.abs(willHub - hubAnteil) > 1e-4) { hubAnteil = willHub; zeichneHub(); }
  luftLage.style.opacity = String(Math.max(0, 1 - offen * 3));
  for (const el of [kammerA, kammerB]) el.style.opacity = String(Math.max(0, 1 - offen * 3));
  // The machine stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    if (auto) {
      automatikTakt(zustand, dt, druck);
    }
    if (!angehalten) schritt(zustand, MASSE, ruhig ? dt * 0.4 : dt, druck);
    zeichneHub();
    zeichneLuft(dt);
    zeichneAnzeige();
  } else {
    for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
  }
}
// The stroke runs back to zero on its own while the machine comes apart
// (hubAnteil above), so nothing has to be reset first.
function vorDemZerlegen() {}

// --- controls -------------------------------------------------------------
const knopfVentil = document.getElementById("btn-ventil");
const knopfAuto = document.getElementById("btn-auto");
const druckRegler = document.getElementById("druck");
const druckWert = document.getElementById("druck-wert");

function schalte() {
  angehalten = false;
  zustand.stellung = zustand.stellung === "ausfahren" ? "einfahren" : "ausfahren";
  takteNeu();
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
  takteNeu();
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

zeichneHub();
zeichneAnzeige();
poseExplode();

// A handle for the browser test and for screenshots: it can put the figure
// into a known state instead of waiting and hoping to catch the right moment.
window.__figur = figurGrundstock({
  stelle(weg, stellung) {
    auto = false;
    angehalten = true;
    knopfAuto.setAttribute("aria-pressed", "false");
    zustandSetzen(zustand, weg, stellung, druck);
    zeichneHub();
    zeichneLuft(0.016);
    zeichneAnzeige();
  },
});
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
Aufgabe des <a href="../Wegeventil-5-2/">5/2-Wegeventils</a> (eigene Seite: wie es innen schaltet): ein Anschluss für die Zuluft (1), zwei zum Zylinder (2 und 4) und zwei für die
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
  laufzeit: live,
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
