// A single-acting round cylinder (Festo ESNU-50-25-P-A, Ø 50, stroke 25, return
// spring in the rod chamber, vented through a filter) on the 3/2 valve that
// switches it, as an isometric cutaway with the compressed air visible.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are Festo ESNU Ø 50;
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
import { normteile, federPruefen } from "../../../figur/normteile.mjs";
import { zylinderTeile, schlauch } from "../../../figur/zylinderteile.mjs";
import * as ZS from "../../../figur/zylinderseite.mjs";
import { seite, knopf, schieber, hausBedienung, modulQuelle } from "../../../figur/seite.mjs";
import { LEGENDE } from "./legende-zylinder-ew.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, "..", "..", "index.html");
const WURZEL = join(HIER, "..", "..", "..");

const W = 1160;
const H = 660;

// --- Dimensions ----------------------------------------------------------
const Z = PN.ESNU_50_25;
const RB = Z.bohrung / 2;          // 25, bore
const RS = Z.stange / 2;           // 10, rod
const RA = RB + 3;                 // 28, tube outside (wall 3, assumption)
const HUB = Z.hub;                 // 25
const ZC = 62;                     // axis height over the ground

const DECKEL = 14;                 // cap thickness (assumption)
const DR = 31;                     // cap radius: round caps, rolled onto the tube (assumption)
const TOT = Z.totraum;             // 6, dead length at each end
const KB = 18;                     // piston width (assumption)
const X_BODEN = [0, DECKEL];
const X_ROHR = [DECKEL, 115];      // 115: a long, soft spring (0,932 N/mm) with room at full stroke
const X_KOPF = [X_ROHR[1], X_ROHR[1] + DECKEL];
const KOLBEN0 = X_ROHR[0] + TOT;   // piston rear face at stroke 0
const RAGT = 44;                   // rod out of the head at stroke 0, enough for the carriage to clear the head
const SPITZE0 = X_KOPF[1] + RAGT;

// Return spring: wire 3 mm, 8 coils, free length 77 mm. At full stroke 52 mm are
// left (block length (8 + 1) * 3 = 27 mm), force 82 N in, 105,3 N out (catalogue).
const FEDER = { draht: 3, windungen: 8, rWindung: 15, laenge: X_ROHR[1] - (KOLBEN0 + KB) };
const FEDER_TEXT = federPruefen(FEDER, HUB, 3);

const FUSS_Z = ZC - DR;
const FUSS = [X_BODEN[0] + DECKEL / 2, X_KOPF[1] - DECKEL / 2];
const LAST_HW = 24;
const LAST_D = 56;
const LAST_H = 38;
const SCHIENE = { x: SPITZE0 - 18, y: -26, w: HUB + LAST_HW * 2 + 44, d: 52, r: 3 };

const VY = 112;                    // valve spool, y (measured, see the double-acting page)
const VZ = 34;                     // spool axis height
const V_X = [62, 168];
const V_HW = 26;
const R_BOHRUNG = 8;
const R_SCHIEBER = 4.6;
const PORT = { 3: 80, 2: 110, 1: 139 };
const ARBEIT = [2, 1];             // bosses on top: to the cylinder and the supply
const ABLUFT = [3];                // down through the sub-base
const SOCKEL_H = 17;               // sub-base: it carries the exhaust way
const WINKEL = { 2: -1 };          // the working port's elbow faces the cylinder
const SCHIEBER_WEG = 14;           // spool travel between the two positions
const R_SCHLAUCH = 4.2;

/** At rest the figure stands at mid-stroke, so both chambers and the compressed spring are visible. */
const WEG0 = Math.round(HUB * 0.42);

// --- Frames --------------------------------------------------------------
const FZ = G.frameOf([0, 0, ZC], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const quer = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);

const P = k.fitProjection(
  [
    [-30, -52, 0], [SPITZE0 + HUB + LAST_HW * 2 + 40, 0, 0],
    [SPITZE0 + HUB + LAST_HW * 2 + 40, 0, ZC + 36],
    [-30, 0, ZC + RA + 14], [0, 0, ZC + RA + 14],
    [V_X[0] - 28, VY + V_HW + 34, 0], [V_X[1] + 30, VY + V_HW + 34, VZ + 46],
    [PORT[1] - 96 - 20, VY + 86 + 24, 0],
  ],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
);

const at = (p) => k.iso(p, P);
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);

const NAH = SCH.naechsterWinkel(FZ, P);
const FENSTER = [NAH - 1.52, NAH + 1.10];
const FENSTER_ID = "fenster-rohr";
let STANGEN_CLIP = "";

// --- Assemblies ----------------------------------------------------------
const PIECE_OF = {
  grund: "grund", boden: "boden", rohr: "rohr", kolben: "kolben", stange: "stange",
  feder: "feder", kopf: "kopf", fuss: "fuss", gehaeuse: "gehaeuse", schieber: "schieber",
  betaetigung: "betaetigung", leitung: "leitung", luft: "luft",
};
const STAGGER = [
  "leitung", "betaetigung", "schieber", "gehaeuse", "fuss",
  "kopf", "stange", "feder", "kolben", "rohr", "boden",
];
const MOVE = {
  grund: [0, 0, 0], luft: [0, 0, 0],
  boden: [-120, 20, 50],
  rohr: [0, 20, 190],
  kolben: [0, 150, 90],
  feder: [60, 110, 150],
  stange: [110, 190, 70],
  kopf: [140, 20, 110],
  fuss: [0, -120, 0],
  gehaeuse: [0, 190, -12],
  schieber: [-120, 150, 66],
  betaetigung: [190, 130, 28],
  leitung: [14, 118, 260],
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
const NT = normteile({ P, rec, put, gruppe: (g) => { GRUPPE = g; } });

// --- Caps ----------------------------------------------------------------
/** A port on a cap: the boss out of the cap's rim, along y. */
function anschluss(x) {
  const F = quer(x, ZC);
  return [
    SV(G.disc(DR, DR + 8, 8, F, P), { tone: "mid" }),
    SV(G.disc(DR + 8, DR + 15, 6.5, F, P, { steps: 6 }), { tone: "mid" }),
    L(G.arcOf(F, DR + 4, 8, P), { tone: "faint" }),
    L(G.circleOf(F, DR + 15, 4.4, P), { tone: "faint" }),
  ].join("");
}

function zylinderboden() {
  GRUPPE = "boden";
  put([DECKEL / 2, 0, ZC], [
    SV(G.disc(X_BODEN[0], X_BODEN[1], DR, FZ, P), { tone: "mid" }),
    L(G.circleOf(FZ, X_BODEN[1], RB, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_BODEN[0], DR - 4, P), { tone: "faint" }),
    L(G.arcOf(FZ, X_BODEN[1] - 3, DR, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FZ, X_BODEN[0], X_BODEN[1], DR, { name: "boden.deckel" }))],
    { name: "boden.deckel" });
  put([DECKEL / 2, DR + 8, ZC], anschluss(DECKEL / 2), [
    rec(A.disc(quer(DECKEL / 2, ZC), DR, DR + 15, 8, { name: "boden.anschluss" })),
  ], { name: "boden.anschluss" });
}

/** The head: gland for the rod and, on top of it, the vent with its sintered filter. */
function zylinderkopf() {
  GRUPPE = "kopf";
  put([X_KOPF[0] + DECKEL / 2, 0, ZC], [
    SV(G.disc(X_KOPF[0], X_KOPF[1], DR, FZ, P), { tone: "mid" }),
    SV(G.disc(X_KOPF[1], X_KOPF[1] + 9, 17, FZ, P), { tone: "mid" }),
    L(G.circleOf(FZ, X_KOPF[1] + 9, RS + 1.4, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_KOPF[1] + 9, 13, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_KOPF[0], RB - 3, P), { tone: "faint" }),
    L(G.arcOf(FZ, X_KOPF[1] - 3, DR, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(FZ, X_KOPF[0], X_KOPF[1], DR, { name: "kopf.deckel" })),
    rec(A.ring(FZ, X_KOPF[1], X_KOPF[1] + 9, RS, 17, { name: "kopf.buchse" })),
  ], { name: "kopf.deckel" });
  // The vent: the rod chamber breathes through a sintered filter.
  const x = X_KOPF[0] + DECKEL / 2;
  const F = quer(x, ZC);
  put([x, DR + 8, ZC], [
    SV(G.disc(DR, DR + 5, 5.5, F, P, { steps: 6 }), { tone: "mid" }),
    SV(G.disc(DR + 5, DR + 15, 7.5, F, P), { tone: "lo" }),
    L(G.arcOf(F, DR + 11, 7.5, P), { tone: "faint" }),
    L(G.circleOf(F, DR + 15, 7.5, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(F, DR, DR + 15, 7.5, { name: "kopf.filter" })),
  ], { name: "kopf.filter" });
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
    SV(G.ringBand(KOLBEN0 + 4, KOLBEN0 + 7.5, RB - 2.6, RB, FZ, P), { tone: "lo" }),
    SV(G.ringBand(KOLBEN0 + KB - 7, KOLBEN0 + KB - 4, RB - 1.8, RB, FZ, P), { tone: "lo" }),
    L(G.arcOf(FZ, KOLBEN0 + 11, RB, P), { tone: "faint" }),
    // the elastic disc on the rear face, the end-position buffer
    SV(G.disc(KOLBEN0 - 2.5, KOLBEN0, 19, FZ, P), { tone: "lo" }),
    L(G.circleOf(FZ, KOLBEN0 - 2.5, 19, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(FZ, KOLBEN0, KOLBEN0 + KB, RB, { name: "kolben.scheibe" })),
    rec(A.disc(FZ, KOLBEN0 - 2.5, KOLBEN0, 19, { name: "kolben.puffer" })),
  ], { name: "kolben.scheibe", clip: true, hub: true });

  // The return spring around the rod, between the piston and the head. Each
  // piece of the coil carries its x; the page compresses it with the stroke.
  GRUPPE = "feder";
  const fa = KOLBEN0 + KB;
  const R_DRAHT = FEDER.draht / 2;
  // The coil is cut in two at the rod: the half behind the axis is drawn before
  // the rod, the half in front of it after, so the rod really stands inside the spring.
  const wendel = NT.druckfeder(FZ, fa + R_DRAHT, X_ROHR[1] - R_DRAHT, FEDER, { teilen: true });
  put([(fa + X_ROHR[1]) / 2, 0, ZC], wendel.hinten.join(""), [
    rec(A.ring(FZ, fa + 0.5, X_ROHR[1], FEDER.rWindung - R_DRAHT, FEDER.rWindung + R_DRAHT, { name: "feder.wendel" })),
  ], { name: "feder.wendel", clip: true, feder: [fa, X_ROHR[1]] });

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

  // The front half of the coil: the half millimetre at the piston end stands for it as a
  // body; its place in the drawing order is set after the depth solver has run.
  GRUPPE = "feder";
  put([(fa + X_ROHR[1]) / 2, 0, ZC], wendel.vorn.join(""), [
    rec(A.ring(FZ, fa, fa + 0.5, FEDER.rWindung - R_DRAHT, FEDER.rWindung + R_DRAHT, { name: "feder.vorn" })),
  ],
    { name: "feder.vorn", clip: true, feder: [fa, X_ROHR[1]] });

  ZT.lastschlitten({ x: SPITZE0, hw: LAST_HW, d: LAST_D, h: LAST_H, F: FZ, rStange: RS });
}

// --- Hoses and the supply line -------------------------------------------
const PY_ = VY - V_HW / 2;

const AUF = [0, 0, 1];
const VOR = [0, 1, 0];
const WEGE = {
  A: schlauch([DECKEL / 2, DR + 15, ZC], VOR, [PORT[2] - 20, PY_, VZ + 29], [-1, 0, 0], 40, 100),
  V: schlauch([PORT[1], PY_, VZ + 42], AUF, [PORT[1] - 96, VY + 86, 34], AUF, 190, 170),
};

// --- Compose -------------------------------------------------------------
ZT.grundplatte({ fuss: FUSS, fussZ: FUSS_Z, schiene: SCHIENE, fussGruppe: "fuss" });
zylinderboden();
const FINFO = zylinderrohr();
innereien();
zylinderkopf();
ZT.ventil({
  x: V_X, y: VY, z: VZ, halbbreite: V_HW, rBohrung: R_BOHRUNG, rSchieber: R_SCHIEBER, port: PORT,
  oben: ARBEIT, unten: ABLUFT, winkel: WINKEL, sockelH: SOCKEL_H, scheiben: [95, 124.5, 153.5],
});
const BAHN_PUNKTE = ZT.schlaeuche(WEGE, { radius: R_SCHLAUCH, versorgung: "V" });

A.settle(R, P);

// The front half of the spring goes right after the rod it surrounds.
{
  const stange = R.items.find((it) => it.name === "stange.innen");
  const vorn = R.items.find((it) => it.name === "feder.vorn");
  vorn.key = stange.key + 0.01;
}

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
// A short route from the valve body out through the sub-base.
const SOCKEL_VORN = VY - V_HW - 3 + V_HW + 25;
for (const [name, nr] of [["E3", 3]]) {
  const x = PORT[nr];
  BAHNEN[name] = LU.bahn(
    [[x, VY, VZ], [x, VY, 9], [x, SOCKEL_VORN - 6, 9], [x, SOCKEL_VORN + 24, 9]], P, k.iso,
  );
}

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein einfachwirkender Pneumatikzylinder (Rundzylinder, Bohrung 50 mm, Hub 25 mm) im Schnitt, davor das 3/2-Wegeventil, das ihn schaltet. "
    + "Durch ein Fenster im Zylinderrohr sieht man den Kolben, hinter ihm die Druckkammer und vor ihm die Rückstellfeder um die Kolbenstange. "
    + "Ein Schlauch verbindet das Ventil mit dem Zylinderboden; die Kolbenstange schiebt einen Schlitten auf einer Schiene. "
    + "Die Druckluft ist eingefärbt: das kräftige Blau steht unter Druck, das blasse ist Abluft oder Umgebungsluft.",
  body: [
    `<defs>${FINFO.defs}${STANGEN_CLIP}</defs>`,
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}"${it.feder ? ` data-feder="${it.feder.join(" ")}"` : ""}>${it.svg}</g>`).join(""),
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
const KOLBEN0 = ${KOLBEN0}, KB = ${KB};
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
// bore would otherwise carry it on top of their escape path.
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
  const { qA } = kammerFluesse(zustand, druck);
  kammerFuellen(kammerA, zustand.pA, druck, F);
  kammerFuellen(kammerB, zustand.pB, druck, F);
  const rein = Math.max(0, qA), raus = Math.max(0, -qA);
  stromSchritt(stroeme.A, dt, stromTempo(-qA), stromKraft(qA), qA > 0 ? F.druck : F.abluft);
  stromSchritt(stroeme.V, dt, stromTempo(-rein), stromKraft(rein), F.druck);
  stromSchritt(stroeme.E3, dt, stromTempo(raus), stromKraft(raus), F.abluft);
}

let letzteZeile = "";
function zeichneAnzeige() {
  const a = anzeige(zustand, MASSE, druck);
  const text = a.weg + " von " + HUB + " mm · " + a.kraftAus + " N aus · Feder " + a.federJetzt + " N";
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
    if (auto) automatikTakt(zustand, dt, druck);
    if (!angehalten) schritt(zustand, MASSE, ruhig ? dt * 0.4 : dt, druck);
    zeichneHub();
    zeichneLuft(dt);
    zeichneAnzeige();
  } else {
    for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
  }
}
function vorDemZerlegen() {}

// --- controls -------------------------------------------------------------
const knopfVentil = document.getElementById("btn-ventil");
const knopfAuto = document.getElementById("btn-auto");
const druckRegler = document.getElementById("druck");
const druckWert = document.getElementById("druck-wert");

knopfVentil.addEventListener("click", () => {
  auto = false;
  knopfAuto.setAttribute("aria-pressed", "false");
  angehalten = false;
  zustand.stellung = zustand.stellung === "ausfahren" ? "einfahren" : "ausfahren";
  takteNeu();
  run();
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
  "Der Taster am Ventil füllt die Kammer, die Automatik lässt den Zyklus laufen. "
  + "Das kräftige Blau ist Druckluft, das blasse ist Abluft oder Umgebungsluft. "
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
<h2>Wer bringt den Kolben zurück?</h2>
<p>Ein <strong>einfachwirkender</strong> Zylinder bekommt nur an einer Seite Luft. Zurück schiebt ihn eine Feder.
Das reicht, solange der Rückweg kraftlos sein darf. Die Luft wird nur zum Ausfahren gebraucht.</p>
<p class="formel">
A<sub>Kolben</sub> = π/4 · 50² = <strong>${f.kolben.toFixed(1)} mm²</strong><br>
bei 6 bar: F<sub>aus</sub> = 0,6 N/mm² · ${f.kolben.toFixed(1)} mm² − ${Math.round(PN.federKraft({ weg: HUB }, Z))} N Feder = <strong>${Math.round(PN.kraftAus(6, Z))} N</strong>
</p>
<p class="hinweis">Das sind theoretische Werte. Die Reibung der Dichtungen zieht in der Praxis noch einmal
3 bis 10 Prozent ab.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

writeFileSync(ZIEL, seite({
  titel: "Einfachwirkender Zylinder – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "Einfachwirkender Zylinder mit 3/2-Wegeventil",
  hinweis: "Ventil schalten, Druck einstellen, zerlegen",
  anzeige: `${WEG0} von ${HUB} mm · ${Math.round(PN.kraftAus(6, Z))} N aus · Feder ${Math.round(PN.federKraft({ weg: WEG0 }, Z))} N`,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft auf dem Weg in die Kammer" },
    { mark: "dotted", label: "Blasses Blau: Abluft und Umgebungsluft" },
    { mark: "lit", label: "Kolben, Kolbenstange und Steuerschieber – was sich bewegt" },
    { mark: "dim", label: "Das Zylinderrohr ist aufgeschnitten, das Ventil an der Schieberebene" },
  ],
  caption:
    "Rundzylinder Ø 50 mm, Hub 25 mm, einfachwirkend mit Rückstellfeder, am 3/2-Wegeventil. Die Luft schiebt den Kolben "
    + "gegen die Feder hinaus; ist die Kammer entlüftet, bringt die Feder ihn zurück.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  breite: 1220,
  buehneLabel: "Einfachwirkender Zylinder mit 3/2-Wegeventil: Luftweg, Kolben und Baugruppen",
}).replace("</style>", `${LU.CSS}</style>`));

console.log(`geschrieben: ${ZIEL}`);
console.log(FEDER_TEXT);
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
      ["rohr.wand", "kolben.puffer"],
      ["rohr.wand", "feder.wendel"],
      ["rohr.wand", "stange.innen"],
      ["rohr.wand", "luft.kammern"],
      // Coaxial parts that genuinely interlock: a rod through a gland and through
      // the coil, a spool in its bore. No drawing order is "right" for these.
      ["kopf.deckel", "stange.aussen"],
      ["stange.aussen", "grund.last"],
      ["feder.wendel", "stange.innen"],
      // The two halves of the coil are drawn before and after the rod on purpose
      // (see "feder.vorn" above); the solver measures the whole coil in one place.
      ["feder.vorn", "feder.wendel"],
      ["feder.vorn", "stange.innen"],
      ["feder.vorn", "rohr.wand"],
      ["gehaeuse.koerper", "schieber.kolben"],
      ["boden.anschluss", "leitung.A*"],
      ["gehaeuse.koerper", "leitung.*"],
    ],
    crowd: [
      ["leitung.A", "gehaeuse.oben"],
      ["leitung.A", "leitung.V"],
    ],
    cover: ["stange.aussen", "stange.innen", "feder.vorn"],
  });
}
