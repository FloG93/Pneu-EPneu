// A shuttle valve (Wechselventil, OR element) after the Festo OS-1/4-B (G1/4 at all three ports),
// its inside redrawn from the Bosch cutaway model: a block with a through bore, a screwed-in
// plug with the left seat and an O-ring, the right seat in the housing, a loose rubber body
// between the two seats, the outlet bore with its thread on top and two mounting holes across
// the block. Dimensions in mm, 1 world unit = 1 mm. The bore runs along x at the height ZA,
// the outlet along z at x = XC. The sizes are estimates (the figure's README says so); the
// body's travel is drawn larger than it is.
//
// This script holds geometry and the four data tables; everything a section page shares
// (the cut face, the hatching, the two layers of a turned part, the fittings in section,
// the order, the live script, the page) comes from ../../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is kept is the one at
// y <= 0 and its cut face at y = 0 looks at the viewer.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../../.claude/skills/anatomy/kit/tube.mjs";
import * as LU from "../../../figur/luft.mjs";
import * as VS from "../../../figur/ventilseite.mjs";
import * as SS from "../../../figur/schnittseite.mjs";
import { schnittTeile, anschlussPunkt, LEINWAND } from "../../../figur/schnittteile.mjs";
import { OS_1_4 as M, neuerZustand, anzeige, anzeigeZeilen, durchfluss, absolut } from "../../../figur/wechselventil.mjs";
import { wechselventilSymbol, WECHSEL_SYMBOL_CSS, WECHSEL_SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { TAU } from "../../../figur/schnitt.mjs";
import { schieber, komma } from "../../../figur/seite.mjs";
import { zeichner, ort, MOVE_BASIS } from "../../../figur/zylinderteile.mjs";
import { normteile, stummel, STECKVERSCHRAUBUNG_G14_KURZ as G14 } from "../../../figur/normteile.mjs";
import { LEGENDE } from "./legende-wechsel.mjs";

const { ZIEL, WURZEL } = ort(import.meta.url);
const { W, H } = LEINWAND;

// --- Dimensions ----------------------------------------------------------
const LAENGE = 60, TIEFE = 14, HOEHE = 35;       // housing block; the half y in [-14, 0] is kept
const XC = LAENGE / 2;                           // the outlet's axis
const ZA = 14;                                   // height of the through bore's axis
const { rPort: R_PORT } = G14;                   // G1/4 thread bore, outside Ø 13.2
const R_KAM = 6.6;                               // chamber: Ø 13,2 (the spec's Ø 12, drawn wider so that the gap round the body can be seen)
const R_SITZ = M.nennweite / 2;                  // seat bore Ø 6,5 (catalogue: nominal width)
const R_KOERPER = 4.4, L_KOERPER = 13;           // the rubber body Ø 8,8 × 13 (the spec's Ø 9, a little thinner for the same reason)
// The body's domes are spherical caps. A cap of radius R_KAPPE sits tangent in the seat's cone where it has the radius R_KONTAKT;
// the cone's slope there is the cap's, so the body touches the cone along a circle and never cuts into it.
const R_KAPPE = 7, R_KONTAKT = 3.9, R_FASE = 4.7;
const STEIGUNG = Math.sqrt(R_KAPPE ** 2 - R_KONTAKT ** 2) / R_KONTAKT;        // dr/dx of the cone
const L_FASE = (R_FASE - R_SITZ) / STEIGUNG;                                     // the cone's length along the axis
const S_KONTAKT = -L_KOERPER / 2 + R_KAPPE - Math.sqrt(R_KAPPE ** 2 - R_KONTAKT ** 2);   // the contact circle's place on the body, from its middle
const KX_ABSTAND = -S_KONTAKT - (L_FASE - (R_KONTAKT - R_SITZ) / STEIGUNG);     // from the seat's face to the body's middle, body on the seat
const HALB = M.hub / 2 + KX_ABSTAND;                                             // half the chamber's length: the body's travel is the hub
const X_SITZ_L = XC - HALB;                      // the left seat's face (where the cone meets the chamber's wall)
const X_SITZ_R = XC + HALB;
const X_GEW_R = LAENGE - 12;                     // the right thread bore starts here
const Z_HALS = ZA + R_KAM;                       // the chamber's top, where the outlet's neck starts
const Z_GEW = ZA + 8.5;                          // the outlet's thread bore starts here
const R_HALS = 4;                                // the neck between chamber and outlet thread
const LOCH = { x: [8, LAENGE - 8], z: 28, r: 2.15 };   // the two mounting holes across the block (Ø 4,3, spec)
// The plug (Verschlussstück): outer thread, an O-ring groove, internal thread for the left fitting, the seat at its inner end.
const STOPFEN = { x0: -4, rAussen: 8.5, rGewinde: R_PORT, xAbsatz: 8, nut: [10.75, 13.25], rNut: 7.2 };
const PROFIL_STOPFEN = [                         // (radius, x) of the upper half of its wall
  [STOPFEN.rGewinde, STOPFEN.x0], [STOPFEN.rAussen, STOPFEN.x0], [STOPFEN.rAussen, STOPFEN.nut[0]], [STOPFEN.rNut, STOPFEN.nut[0]],
  [STOPFEN.rNut, STOPFEN.nut[1]], [STOPFEN.rAussen, STOPFEN.nut[1]], [STOPFEN.rAussen, X_SITZ_L], [R_FASE, X_SITZ_L], [R_SITZ, X_SITZ_L - L_FASE],
  [R_SITZ, STOPFEN.xAbsatz], [STOPFEN.rGewinde, STOPFEN.xAbsatz],
];
// The O-ring: its cord (radius 1,25, drawn a little thicker than a Ø 14 ring would be) lies on the groove's bottom
const ORING = { x: (STOPFEN.nut[0] + STOPFEN.nut[1]) / 2, r: STOPFEN.rNut + 1.25, rSchnur: 1.25 };
// The rubber body, barrel-shaped with domed sealing faces: (radius, s) of its upper edge, s from its middle.
const KOERPER_X0 = X_SITZ_L + KX_ABSTAND;        // its middle at rest: its left dome on the left seat
const PROFIL_KOERPER = (() => {
  const kappe = [0, 1, 2, 3, 3.6, 4.1].map((r) => [r, -L_KOERPER / 2 + R_KAPPE - Math.sqrt(R_KAPPE ** 2 - r * r)]);
  const links = [...kappe, [4.3, -L_KOERPER / 2 + 1.95], [R_KOERPER, -L_KOERPER / 2 + 2.6]];
  const rechts = links.slice().reverse().map(([r, sp]) => [r, -sp]);
  return [...links, ...rechts].map(([r, sp]) => [Math.round(r * 1000) / 1000, Math.round(sp * 1000) / 1000]);
})();

// Fittings and hoses along each port axis, s from the face outward.
const VERSCHRAUBUNG = G14.masse;   // the compact fitting: the fittings frame the valve and do not dominate it
const { rSchlauch: R_SCHLAUCH, rSchlauchInnen: R_SCHLAUCH_INNEN, schlauchLaenge: SCHLAUCH_LAENGE } = G14;   // the hose stubs drawn in the section
// The three ports: face position, direction, name of the assembly.
const ANSCHLUESSE = {
  "1l": { piece: "anschluss1l", raum: "L", flaeche: [STOPFEN.x0, 0, ZA], aus: [-1, 0, 0] },
  "1r": { piece: "anschluss1r", raum: "R", flaeche: [LAENGE, 0, ZA], aus: [1, 0, 0] },
  "2": { piece: "anschluss2", raum: "A", flaeche: [XC, 0, HOEHE], aus: [0, 0, 1] },
};
const punktAn = (nr, s, q = 0) => anschlussPunkt(ANSCHLUESSE[nr], s, q);
const WEGE = Object.fromEntries(Object.keys(ANSCHLUESSE).map((nr) => {
  const p0 = punktAn(nr, VERSCHRAUBUNG.ring[1]);
  // seen whole (while the valve is taken apart) the left one bends towards the viewer, so that its cut end faces us
  if (nr === "1l") return [nr, stummel(p0, [-1, 0, 0], [p0[0] - 12, 15, p0[2] - 2], [-0.35, 0.92, -0.1], 6)];
  if (nr === "1r") return [nr, stummel(p0, [1, 0, 0], [p0[0] + 12, 0, p0[2]], [1, 0, 0], 8)];
  return [nr, stummel(p0, [0, 0, 1], [p0[0], 0, p0[2] + 12], [0, 0, 1], 8)];
}));

// The extreme points of what is drawn at rest: the block and the cut ends of the three hose stubs, a hose's radius to each side
// (the whole, bent hose only shows while the valve is taken apart, and the view widens by itself then).
const ENDE_SCHLAUCH = Object.keys(ANSCHLUESSE).map((nr) => punktAn(nr, VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE));
const P = k.fitProjection(
  [[0, -TIEFE, 0], [LAENGE, -TIEFE, 0], [0, 0, 0], [LAENGE, 0, 0], [0, -TIEFE, HOEHE], [LAENGE, -TIEFE, HOEHE], [0, 0, HOEHE], [LAENGE, 0, HOEHE],
    ...ENDE_SCHLAUCH.flatMap((q) => [[q[0] - R_SCHLAUCH, q[1], q[2]], [q[0] + R_SCHLAUCH, q[1], q[2]], [q[0], q[1], q[2] + R_SCHLAUCH], [q[0], q[1], q[2] - R_SCHLAUCH]])],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
);

// --- Assemblies ----------------------------------------------------------
// Outside first. The O-ring leaves just before the plug and on the plug's way (it rides with it, lifted a little so that the
// two stay distinct); the body leaves towards the viewer through the cut once the plug is out of its way.
const STAGGER = ["anschluss2", "anschluss1r", "anschluss1l", "oring", "stopfen", "koerper", "gehaeuse"];
// Escape paths in mm along the machine's axes (x along the bore, y towards the viewer, z up).
const MOVE = {
  ...MOVE_BASIS,
  anschluss2: [0, 8, 46],
  anschluss1r: [34, 26, 0],
  anschluss1l: [-50, 22, 0],
  oring: [-36, 0, 17],
  stopfen: [-36, 0, 0],
  koerper: [0, 28, 14],
  gehaeuse: [0, 0, 0],
};

const { R, rec, put, gruppe } = zeichner({ P, MOVE });
const NT = normteile({ P, rec, put, gruppe });
const ST = schnittTeile({ P, MOVE, R, rec, put, gruppe, NT });
const { at, L, SV, ring3, umriss, schnittFlaeche, zweiLagen } = ST;
const { beideSeiten } = ST.drehachse({ richtung: "x", mitte: ZA });   // (radius, x) profiles, once on each side of the axis
const FX = (x0) => G.frameOf([x0, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]);   // the bore's axis

// --- The hollows of the housing: rectangles (x0, x1, z0, z1) in the cut plane ----------------------
// kind "h": horizontal bore (lit from below), "v": vertical bore (lit from the right)
const HOHLRAUM = [
  [[0, X_SITZ_L, ZA - STOPFEN.rAussen, ZA + STOPFEN.rAussen], "h"],            // the plug's thread bore (the plug fills it)
  [[X_SITZ_L, X_SITZ_R, ZA - R_KAM, ZA + R_KAM], "h"],                         // the chamber
  [[X_SITZ_R, X_SITZ_R + L_FASE, ZA - R_FASE, ZA + R_FASE], "h"],              // the right seat's cone (a wedge of material goes over it)
  [[X_SITZ_R + L_FASE, X_GEW_R, ZA - R_SITZ, ZA + R_SITZ], "h"],               // the right seat's bore
  [[X_GEW_R, LAENGE, ZA - R_PORT, ZA + R_PORT], "h"],                          // port 1 right (thread bore)
  [[XC - R_HALS, XC + R_HALS, Z_HALS, Z_GEW], "v"],                            // the outlet's neck
  [[XC - R_PORT, XC + R_PORT, Z_GEW, HOEHE], "v"],                             // port 2 (thread bore)
  ...ST.loecher(LOCH),                                                         // the two mounting holes, across the block
];
/** The bores of the cut fittings and hoses outside the block (the air inside them is part of the figure). */
const AUSSEN_HOHL = {
  "1l": [[punktAn("1l", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0], STOPFEN.x0, ZA - 4, ZA + 4], "h"],
  "1r": [[LAENGE, punktAn("1r", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0], ZA - 4, ZA + 4], "h"],
  "2": [[XC - 4, XC + 4, HOEHE, HOEHE + VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE], "v"],
};

// --- Rooms of air: rectangles painted over the hollows, by what is connected ------------------------------
// L is the left input (the plug's interior), R the right input, A the output: chamber, neck and outlet.
// The page paints them by their pressure; the outer bores of the fittings belong to the same rooms.
const RAUM_RECHTECKE = [
  ["L", [STOPFEN.x0, STOPFEN.xAbsatz, ZA - R_PORT, ZA + R_PORT]], ["L", [STOPFEN.xAbsatz, X_SITZ_L - L_FASE, ZA - R_SITZ, ZA + R_SITZ]],
  ["L", [X_SITZ_L - L_FASE, X_SITZ_L, ZA - R_FASE, ZA + R_FASE]],               // the left seat's cone (the plug's wall covers its upper part)
  ["A", [X_SITZ_L, X_SITZ_R, ZA - R_KAM, ZA + R_KAM]], ["A", [XC - R_HALS, XC + R_HALS, Z_HALS, Z_GEW]], ["A", [XC - R_PORT, XC + R_PORT, Z_GEW, HOEHE]],
  ["R", [X_SITZ_R, X_SITZ_R + L_FASE, ZA - R_FASE, ZA + R_FASE]], ["R", [X_SITZ_R + L_FASE, X_GEW_R, ZA - R_SITZ, ZA + R_SITZ]],
  ["R", [X_GEW_R, LAENGE, ZA - R_PORT, ZA + R_PORT]],
];

/** The right seat: the wedges of material that make the cone, above and below the axis. */
function rechterSitz() {
  return [1, -1].map((v) => ST.materialKeil([[X_SITZ_R, ZA + v * R_FASE], [X_SITZ_R + L_FASE, ZA + v * R_FASE], [X_SITZ_R + L_FASE, ZA + v * R_SITZ]]));
}

/** The thread of the two bores that carry one, as faint rings on their far wall (the fittings' stubs hide them while the valve is together). */
function gewindeStriche() {
  // The rings lie on the far wall; only the part seen through the opening in the cut face is drawn.
  const innen = (id, F, s0, s1, r, [x0, x1, z0, z1]) => {
    const bogen = [];
    for (let s = s0 + 1; s < s1 - 0.4; s += 1.3) bogen.push(G.arcOf(F, s, r, P, { inward: true }));
    return `<clipPath id="${id}"><path d="${ST.rahmen(x0, x1, z0, z1)}"/></clipPath><g clip-path="url(#${id})">${L(bogen.join(""), { tone: "faint" })}</g>`;
  };
  return [
    innen("gewinde-aus", G.frameOf([XC, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), Z_GEW, HOEHE, R_PORT, [XC - R_PORT, XC + R_PORT, Z_GEW, HOEHE]),
    innen("gewinde-rechts", G.frameOf([0, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]), X_GEW_R, LAENGE, R_PORT, [X_GEW_R, LAENGE, ZA - R_PORT, ZA + R_PORT]),
  ];
}

// --- The housing ---------------------------------------------------------------------------------------
function gehaeuse() {
  ST.gehaeuseBlock({
    laenge: LAENGE, hoehe: HOEHE, tiefe: TIEFE,
    hohlraeume: HOHLRAUM,
    // the round walls behind the cut inside the plug: the far half of its thread bore and of its seat bore
    rundeWaende: [[[0, STOPFEN.xAbsatz, ZA - R_PORT, ZA + R_PORT], "h"], [[STOPFEN.xAbsatz, X_SITZ_L, ZA - R_SITZ, ZA + R_SITZ], "h"]],
    raeume: ST.raumPfade({ rechtecke: RAUM_RECHTECKE, beideSeiten }),
    // over the air: the threads' rings, the walls of every bore and of the chamber, the right seat's cone
    oben: [...gewindeStriche(), ST.hohlraumUmriss({ hohlraeume: HOHLRAUM, laenge: LAENGE, hoehe: HOEHE }), ...rechterSitz()],
  });
}

// --- The plug with the left seat --------------------------------------------------------------------------
function stopfen() {
  gruppe("stopfen");
  const F = FX(0);
  const flaechen = beideSeiten(PROFIL_STOPFEN);
  const S = STOPFEN;
  const ringe = [];
  for (let x = S.x0 + 1; x < S.nut[0] - 0.4; x += 1.3) ringe.push(G.arcOf(F, x, S.rAussen, P));
  put([(S.x0 + X_SITZ_L) / 2, 0, ZA], zweiLagen([
    ...flaechen.map((f) => schnittFlaeche(f, -1, { ton: "b", strich: "mid" })),
    L(flaechen.map(umriss).join(""), { tone: "hi" }),
  ].join(""), [
    SV(G.ringBand(S.x0, S.xAbsatz, S.rGewinde, S.rAussen, F, P), { tone: "mid", inner: L(ringe.join(""), { tone: "faint" }) }),
    SV(G.ringBand(S.xAbsatz, S.nut[0], R_SITZ, S.rAussen, F, P), { tone: "mid" }),
    SV(G.ringBand(S.nut[0], S.nut[1], R_SITZ, S.rNut, F, P), { tone: "lo" }),
    SV(G.ringBand(S.nut[1], X_SITZ_L, R_SITZ, S.rAussen, F, P), { tone: "hi" }),
    L(G.circleOf(F, S.x0, S.rGewinde, P), { tone: "mid" }),
  ].join("")), [
    rec(A.ring(F, S.x0, S.xAbsatz, S.rGewinde, S.rAussen, { name: "stopfen.gewinde" })),
    rec(A.ring(F, S.xAbsatz, S.nut[0], R_SITZ, S.rAussen, { name: "stopfen.boden" })),
    rec(A.ring(F, S.nut[0], S.nut[1], R_SITZ, S.rNut, { name: "stopfen.nut" })),
    rec(A.ring(F, S.nut[1], X_SITZ_L - L_FASE, R_SITZ, S.rAussen, { name: "stopfen.bund" })),
    rec(A.ring(F, X_SITZ_L - L_FASE, X_SITZ_L, R_FASE - 0.1, S.rAussen, { name: "stopfen.sitz" })),   // the cone, taken as a step of the face
  ], { name: "stopfen.gewinde" });
}

// --- The O-ring: two cords in the section, a torus once the plug is out ------------------------------------
function oring() {
  gruppe("oring");
  const O = ORING;
  const kreis = (cz, dz) => ring3(Array.from({ length: 25 }, (_, i) => [O.x + O.rSchnur * Math.cos((i / 24) * TAU), 0, cz + dz + O.rSchnur * Math.sin((i / 24) * TAU)]));
  // the cord fills its groove (squeezed against the bore's wall): a circle and the groove's rectangle under it
  const nut = (v) => ring3([[STOPFEN.nut[0], 0, ZA + v * STOPFEN.rNut], [STOPFEN.nut[1], 0, ZA + v * STOPFEN.rNut], [STOPFEN.nut[1], 0, ZA + v * STOPFEN.rAussen], [STOPFEN.nut[0], 0, ZA + v * STOPFEN.rAussen]]);
  const schnitt = [1, -1].map((v) => `<path class="iso-shade" data-shade="0" style="fill:#1a1a1c" d="${nut(v)}"/>`
    + `<path class="iso-shade" data-shade="0" style="${RUBBER_SCHNITT}" d="${kreis(ZA + v * O.r, 0)}"/>`).join("");
  // the whole ring: a tube round the bore's axis, in pieces so that it can be put in order
  const punkte = Array.from({ length: 33 }, (_, i) => [O.x, O.r * Math.cos((i / 32) * TAU), ZA + O.r * Math.sin((i / 32) * TAU)]);
  const stuecke = tubePieces(punkte, O.rSchnur, P, { maxLength: 14 });
  stuecke.forEach((teil, i) => put(teil.mid, `<g class="gummi">${tubeSvg(teil, { tone: "lo" })}</g>`, [A.tube(teil.points, teil.radii)], { name: `oring.schnur:${i}` }));
  ST.schnittLage("oring.schnur:0", schnitt);
}

// --- The rubber body between the seats; it moves with the model (data-hub) -------------------------------------
/** Rubber in a section: black, with a light edge, in light and dark mode alike (it must stand out of the strong blue and the tan of the plug). */
const RUBBER_SCHNITT = "fill:#1a1a1c;stroke:#f2f2ee;stroke-width:2.2;stroke-linejoin:round;paint-order:stroke";
/** A soft highlight on the dark rubber: an open line a little lighter than the rubber (`staerke` 0…1 of the way to the paper). */
function glanz(punkte3, staerke) {
  const d = punkte3.map((q, i) => `${i ? "L" : "M"}${at(q).map((v) => v.toFixed(1)).join(" ")}`).join("");
  return `<path d="${d}" fill="none" style="stroke:color-mix(in srgb, #f2f2ee ${Math.round(staerke * 70)}%, #1a1a1c); stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round"/>`;
}
function koerper() {
  gruppe("koerper");
  const F = FX(KOERPER_X0);
  const obere = PROFIL_KOERPER.map(([r, s]) => [KOERPER_X0 + s, 0, ZA + r]);
  const untere = PROFIL_KOERPER.slice().reverse().map(([r, s]) => [KOERPER_X0 + s, 0, ZA - r]);
  const umrissKoerper = [...obere, ...untere.slice(1, -1)];
  const ganz = PROFIL_KOERPER.map(([r, s], i) => [s, r, i > 0 && i < PROFIL_KOERPER.length - 1 ? 1 : 0]);
  put([KOERPER_X0, 0, ZA], zweiLagen([
    // the rubber is drawn dark, like the black rings of the cutaway, with a lighter highlight along its barrel and its domes
    // black rubber with a light edge all round, so that the body stands out of the air's strong blue in both modes
    `<path class="iso-shade" data-shade="0" style="${RUBBER_SCHNITT}" d="${ring3(umrissKoerper)}"/>`,
    glanz(PROFIL_KOERPER.filter(([r]) => r > 0.4).map(([r, sp]) => [KOERPER_X0 + sp, 0, ZA + r * 0.74]), 0.5),
    glanz(PROFIL_KOERPER.filter(([r]) => r > 0.4).map(([r, sp]) => [KOERPER_X0 + sp, 0, ZA - r * 0.78]), 0.22),
  ].join(""), `<g class="gummi">${SV(G.solidOf(ganz, F, P), { tone: "lo" })}</g>`), [
    rec(A.solid(F, PROFIL_KOERPER.map(([r, s]) => [s, r]), { name: "koerper.rumpf" })),
  ], { name: "koerper.rumpf", hub: true });
}

// --- Fittings and hoses ---------------------------------------------------------------------------------------
// The three ports as a table: the fitting, its hose stub and the section of both (the hoses ride with their own fitting).
const PORTS = Object.entries(ANSCHLUESSE).map(([nr, a]) => ({ nr, gruppe: a.piece, name: a.piece, flaeche: a.flaeche, aus: a.aus, raum: a.raum, hohl: AUSSEN_HOHL[nr], schlauchGruppe: a.piece, bezeichnung: nr === "2" ? "2" : "1" }));

// --- Compose ----------------------------------------------------------------------------------------------------
gehaeuse();
ST.anschluesse({ ports: PORTS, wege: WEGE, fitting: G14 });
stopfen();
oring();
koerper();

ST.pruefeBaugruppen(LEGENDE, STAGGER);
ST.anordnen({
  hintergrund: "gehaeuse.koerper",
  reihe: ["stopfen.gewinde", "oring.schnur:0", "koerper.rumpf"],
  ganzStuecke: ["anschluss2", "anschluss1l", "anschluss1r", "oring"],
});
const ANSICHT = ST.ansicht({ W, H, weite: 0.06 });

const svg = ST.figur({
  W,
  H,
  label:
    "Ein Wechselventil mit G1/4-Anschlüssen im Schnitt durch die Mitte: ein Block mit durchgehender Bohrung, links ein eingeschraubtes Verschlussstück mit O-Ring und dem linken Sitz, rechts der zweite Sitz im Gehäuse. "
    + "Zwischen den Sitzen liegt lose ein tonnenförmiger Schaltkörper aus Gummi. Die beiden Eingänge 1 sitzen an den Enden der Bohrung, der Ausgang 2 zweigt in der Mitte nach oben ab; "
    + "zwei Bohrungen quer durch den Block dienen der Befestigung.",
});

// --- Air: the ways the particles take, in the cut plane -----------------------------------------------------------
// One route for each input: through the plug or the thread bore, the seat bore, a little curve out of the seat into the gap round the
// body (the body is Ø 8,8, the chamber Ø 13,2: the gap lies between them), along the gap to the middle, up the neck and the outlet bore
// to the hose end of port 2. A route carries the flow of its own input (signed: when the outlet vents through an open input the
// particles run backwards); a shut seat carries none, so no particle stands at it. The routes run through free space only.
const GAP_Z = ZA + (R_KOERPER + R_KAM) / 2;
const ENDE_L = punktAn("1l", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0] + 1;
const ENDE_R = punktAn("1r", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0] - 1;
const ENDE_O = HOEHE + VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE - 1;
const ROUTEN = {
  l: [[ENDE_L, 0, ZA], [X_SITZ_L - 0.3, 0, ZA], [X_SITZ_L + 1, 0, ZA + 1.6], [X_SITZ_L + 2.4, 0, GAP_Z], [XC, 0, GAP_Z], [XC, 0, ZA + R_KAM + 1], [XC, 0, ENDE_O]],
  r: [[ENDE_R, 0, ZA], [X_SITZ_R + 0.3, 0, ZA], [X_SITZ_R - 1, 0, ZA + 1.6], [X_SITZ_R - 2.4, 0, GAP_Z], [XC, 0, GAP_Z], [XC, 0, ZA + R_KAM + 1], [XC, 0, ENDE_O]],
};
const BAHNEN = Object.fromEntries(Object.entries(ROUTEN).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]));

// --- The page ------------------------------------------------------------------------
const ANZEIGE = anzeigeZeilen(anzeige(neuerZustand(), M)).join("\n");
const P_AUTO = 6;                                    // bar: what the automatic cycle gives an input that is on
const P_MAX = 8;                                     // bar: the sliders' top
const P_VOLL = 6;                                    // bar: from here on a room shows the full strong blue
// The automatic cycle, eight steps (the spec's order): [left, right] in bar. Whoever comes first keeps the output.
const AUTO_SCHRITTE = [[1, 0], [1, 1], [0, 1], [0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];

// Where there is air, in mm in the cut plane (x0, x1, z0, z1): what the particles may run through. The browser test reads it.
const LUFTWEGE = [
  [ENDE_L, STOPFEN.x0, ZA - R_SCHLAUCH_INNEN, ZA + R_SCHLAUCH_INNEN], [STOPFEN.x0, STOPFEN.xAbsatz, ZA - 4, ZA + 4],        // the left hose and fitting, the thread's bore
  [STOPFEN.xAbsatz, X_SITZ_L - L_FASE, ZA - R_SITZ, ZA + R_SITZ], [X_SITZ_L - L_FASE, X_SITZ_L, ZA - R_FASE, ZA + R_FASE],   // the plug's seat bore and its cone
  [X_SITZ_L, X_SITZ_R, ZA - R_KAM, ZA + R_KAM],                                                                             // the chamber
  [X_SITZ_R, X_SITZ_R + L_FASE, ZA - R_FASE, ZA + R_FASE], [X_SITZ_R + L_FASE, X_GEW_R, ZA - R_SITZ, ZA + R_SITZ],         // the right seat
  [X_GEW_R, LAENGE, ZA - 4, ZA + 4], [LAENGE, ENDE_R, ZA - R_SCHLAUCH_INNEN, ZA + R_SCHLAUCH_INNEN],                        // the right fitting's bore and hose
  [XC - R_HALS, XC + R_HALS, Z_HALS, Z_GEW], [XC - 4, XC + 4, Z_GEW, HOEHE], [XC - R_SCHLAUCH_INNEN, XC + R_SCHLAUCH_INNEN, HOEHE, ENDE_O + 1],   // the neck, the outlet's fitting, the hose
];

// Where the browser test reads the drawn colour of each room: a point of air in the cut plane (mm), clear of every part.
const MESSPUNKTE = {
  L: [(STOPFEN.xAbsatz + X_SITZ_L - L_FASE) / 2, ZA],
  R: [(X_SITZ_R + L_FASE + X_GEW_R) / 2, ZA],
  A: [XC + 1.5, (Z_HALS + Z_GEW) / 2],
};

const KONSTANTEN = `
const HUB = ${M.hub};
const MESSPUNKTE = ${JSON.stringify(MESSPUNKTE)};
const GEO = ${JSON.stringify({ LAENGE, HOEHE, HUB: M.hub, ZA })};
const LUFTWEGE = ${JSON.stringify(LUFTWEGE)};
const P_AUTO = ${P_AUTO};
const P_VOLL = ${P_VOLL};
const AUTO_SCHRITTE = ${JSON.stringify(AUTO_SCHRITTE)};
const NACHLEUCHTEN = 0.5;   // s: a stream that has fallen silent fades out in this time, so that the short filling of the 50 cm³ can be seen`;

// What only the shuttle valve knows: the body's slide, the tones of the three rooms, the two routes of the particles, the
// two sliders and the eight-step cycle. The frame, the readout, the automatic button, the slow motion, the half sections and
// the handle of the browser test are figur/schnittseite.mjs.
const eigenes = `
// --- the model drives everything -------------------------------------------
const zustand = neuerZustand();
let wunschL = 0;                      // bar, what the sliders say
let wunschR = 0;
let autoIndex = 0;

const koerperTeile = Array.from(svg.querySelectorAll("[data-hub]"));
const reglerL = document.getElementById("druck-links");
const reglerR = document.getElementById("druck-rechts");
const wertL = document.getElementById("druck-links-wert");
const wertR = document.getElementById("druck-rechts-wert");

// The automatic cycle: step 0 is "left on"; every click that switches it on starts there.
function autoSetzen(i) {
  autoIndex = i;
  wunschL = AUTO_SCHRITTE[i][0] * P_AUTO;
  wunschR = AUTO_SCHRITTE[i][1] * P_AUTO;
}
function seiteAutoStart() { autoSetzen(0); }
function seiteAutoSchritt() { autoSetzen((autoIndex + 1) % AUTO_SCHRITTE.length); zeichneBedienung(); }

function seiteBedienung() {
  if (reglerL.value !== String(wunschL)) reglerL.value = String(wunschL);
  if (reglerR.value !== String(wunschR)) reglerR.value = String(wunschR);
  wertL.textContent = komma(wunschL.toFixed(1)) + " bar";
  wertR.textContent = komma(wunschR.toFixed(1)) + " bar";
}
reglerL.addEventListener("input", () => { wunschL = reglerL.valueAsNumber; bedient(true); });
reglerR.addEventListener("input", () => { wunschR = reglerR.valueAsNumber; bedient(true); });

// The body slides between the seats; it stands home while the valve is taken apart.
const hubMarke = (anteil) => (zustand.s * HUB * anteil).toFixed(3);
function hubStellen(anteil) {
  const dx = zustand.s * HUB * anteil;
  const t = Math.abs(dx) > 1e-4 ? translateAlong(P, [dx, 0, 0]) : null;
  for (const el of koerperTeile) { if (t) el.setAttribute("transform", t); else el.removeAttribute("transform"); }
}

// A room's tone follows its pressure: pale blue when it is vented, the strong blue from P_VOLL on, a mixture between.
const rauTon = (F, p) => mische(F.abluft, F.druck, Math.min(1, Math.max(0, (p - AUSSEN) / P_VOLL)));
// A stream is shown by the model's flow through its input (u: its share of the catalogue flow, vz: its direction); when the flow has
// died away the picture lets it fade out in NACHLEUCHTEN, because the 50 cm³ fill within a few milliseconds.
const nachFluss = { l: { u: 0, vz: 1 }, r: { u: 0, vz: 1 } };
const nachGlanz = (a, q, dt) => {
  const abgeklungen = Math.max(0, a.u - dt / NACHLEUCHTEN);
  const u = Math.min(1, Math.abs(q) / OS_1_4.qn);
  if (u > 0 && u >= abgeklungen) { a.u = u; a.vz = q < 0 ? -1 : 1; } else a.u = abgeklungen;
};
function zeichneLuft(dm, dt) {
  const F = luftFarben();
  const q = durchfluss(zustand, OS_1_4);
  // the largest flow of this frame's slices counts: the chamber fills within 2,6 ms, a frame is longer
  nachGlanz(nachFluss.l, Math.abs(spitze.l) > Math.abs(q.links) ? spitze.l : q.links, dt);
  nachGlanz(nachFluss.r, Math.abs(spitze.r) > Math.abs(q.rechts) ? spitze.r : q.rechts, dt);
  spitze.l = 0;
  spitze.r = 0;
  const ton = { L: rauTon(F, zustand.pL), R: rauTon(F, zustand.pR), A: rauTon(F, zustand.p2) };
  // a stream shows the pressure of where its air comes from: its input, or the chamber while the outlet vents through the input
  const farbe = Object.assign({}, ton, { l: nachFluss.l.vz >= 0 ? ton.L : ton.A, r: nachFluss.r.vz >= 0 ? ton.R : ton.A });
  setzeRaumFarben(farbe);
  luftStroeme(dt, farbe, { l: nachFluss.l.vz * OS_1_4.qn * nachFluss.l.u, r: nachFluss.r.vz * OS_1_4.qn * nachFluss.r.u });
}

const anzeigeText = () => anzeigeZeilen(anzeige(zustand, OS_1_4)).join("\\n");
const spitze = { l: 0, r: 0 };         // l/min, signed: the largest flow through each input in the frame's slices
function modellSchritt(dm) {
  const teile = 8;
  for (let i = 0; i < teile; i += 1) {
    schritt(zustand, OS_1_4, dm / teile, { pL: absolut(wunschL), pR: absolut(wunschR) });
    const q = durchfluss(zustand, OS_1_4);
    if (Math.abs(q.links) > Math.abs(spitze.l)) spitze.l = q.links;
    if (Math.abs(q.rechts) > Math.abs(spitze.r)) spitze.r = q.rechts;
  }
}

// The symbol beside the card: the ball, and every part in the tone of its pressure.
const symbolTon = (p) => (p - AUSSEN > 0.5 ? "stark" : "blass");
function zeichneStets() {
  for (const sym of symbole) wechselSymbolStellen(sym, { s: zustand.s, links: symbolTon(zustand.pL), rechts: symbolTon(zustand.pR), ausgang: symbolTon(zustand.p2) });
}

// A handle for the browser test and for screenshots.
figurStarten({
  MASSE: OS_1_4,
  geometrie: GEO,
  luftwege: LUFTWEGE,
  messpunkte: MESSPUNKTE,
  bahn: (name) => stroeme[name].bahn,
  // where a point of the cut plane (x along the bore, z up, in mm) is on the screen, in client pixels
  bildPunkt(x, z) {
    const q = iso([x, 0, z], P);
    const pt = svg.createSVGPoint();
    pt.x = q[0];
    pt.y = q[1];
    const r = pt.matrixTransform(svg.getScreenCTM());
    return [r.x, r.y];
  },
  // the cut plane's millimetres (x along the bore, z up) from a position in the drawing: the inverse of the projection there
  zuMm(x, y) {
    const o = iso([0, 0, 0], P), ex = iso([1, 0, 0], P), ez = iso([0, 0, 1], P);
    const a = ex[0] - o[0], b = ez[0] - o[0], c = ex[1] - o[1], d = ez[1] - o[1];
    const det = a * d - b * c;
    return [((x - o[0]) * d - b * (y - o[1])) / det, (a * (y - o[1]) - (x - o[0]) * c) / det];
  },
  P_AUTO,
  modell: () => zustand,
  wunsch: () => [wunschL, wunschR],
  zeitlupe: () => zeitlupe,
  autoSchritt: () => autoIndex,
  // the two input pressures in bar (gauge), the model settled at once: the picture of a state at rest, no particles
  stelle(pL, pR) {
    stelleFest();
    wunschL = pL;
    wunschR = pR;
    zustand.pL = absolut(pL);
    zustand.pR = absolut(pR);
    for (let i = 0; i < 60; i += 1) schritt(zustand, OS_1_4, 0.05, { pL: zustand.pL, pR: zustand.pR });
    nachFluss.l.u = 0;
    nachFluss.r.u = 0;
    spitze.l = 0;
    spitze.r = 0;
    zeichneBedienung();
    zeichneModell(0, 0);
    zeichneStets();
    run();
  },
  // the same as the sliders do: the pressures change and the model runs on (the cycle stops)
  schalte(pL, pR) {
    stoppeAuto();
    wunschL = pL;
    wunschR = pR;
    bedient(false);
  },
});
`;

const live = SS.lebendSkript({
  wurzel: WURZEL, P, MOVE, STAGGER, ansicht: ANSICHT, LEGENDE, BAHNEN, SEITE_VON: { l: "l", r: "r" },
  ANZAHL: Object.fromEntries(Object.entries(BAHNEN).map(([name, b]) => [name, Math.max(6, Math.round(b.gesamt / 24))])),
  VORNE: Object.keys(BAHNEN),                          // the streams run in front of everything: the fittings' bores are painted over the housing
  SKALA: { tempo: 0.25, tempoMax: 160, bezug: M.qn },
  AUTO_TAKT: 0.3,                                      // model seconds: at the start's slow motion 1/10 that is 3 s a step
  raumDeckung: 0.97,
  modelle: ["figur/ventil.mjs", "figur/wechselventil.mjs"],
  symbole: [WECHSEL_SYMBOL_LAUFZEIT],
  konstanten: KONSTANTEN,
  eigenes,
});

const regler = (id, text, beschreibung) => SS.regler(schieber(id, text, { min: 0, max: P_MAX, step: 0.5, wert: 0, einheit: " bar", beschreibung, stellen: 1 }));
const LEISTE = SS.leiste(
  regler("druck-links", "Eingang links", "Druck am linken Eingang 1 in bar") + regler("druck-rechts", "Eingang rechts", "Druck am rechten Eingang 1 in bar"),
  { zeitlupe: 10 });

const INFO = "Stelle die beiden Eingänge ein oder lass die Automatik laufen: Der Gummikörper wandert zum Sitz des Eingangs mit dem niedrigeren Druck und sperrt ihn. "
  + "Das kräftige Blau steht unter Druck, das blasse ist drucklos. Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const BEIFIGUR = SS.schaltzeichenBlock({
  svg: wechselventilSymbol({ feld: 60 }).svg,
  text: "Das Rechteck ist das Gehäuse, die Leitung die durchgehende Bohrung, die Kugel der Schaltkörper zwischen zwei Sitzen: Sie liegt am gesperrten Eingang. "
    + "Beide Eingänge tragen die 1, der Ausgang die 2. Die Teile der Leitung zeigen nur zwei Töne: kräftig ab 0,5 bar, sonst blass; die Zeichnung daneben mischt die Töne nach dem Druck, darum sieht 3 bar dort anders aus als 6 bar. Eine Seite, die gesperrt ist, kann trotzdem unter Druck stehen.",
});

// --- The prose underneath ---------------------------------------------------------------------------
const bar = (x) => absolut(x);
const Q1 = durchfluss({ s: 0, pL: bar(0), pR: bar(6), p2: bar(5) }, M).gesamt;      // 1 bar over the open input: the catalogue's point
const ms = Math.round(M.schaltzeit * 1000);
const LESETEXT = `<div class="lesetext">
<h2>Was man sieht</h2>
<p>Das Wechselventil ist durch seine Mitte aufgeschnitten, nach dem Vorbild eines Schnittmodells von Bosch und mit den Daten des Festo-Ventils OS-1/4-B.
Ein Block aus Aluminium hat eine <strong>durchgehende Bohrung</strong>. An ihren beiden Enden sitzen die zwei <strong>Eingänge</strong>, beide mit der Ziffer <strong>1</strong>; in der Mitte zweigt nach oben der <strong>Ausgang 2</strong> ab.
Links steckt ein eingeschraubtes <strong>Verschlussstück</strong> mit einem <strong>O-Ring</strong> in der Bohrung (in der Schnittfläche bräunlich, anders schraffiert als der Block); es trägt den linken Sitz, den rechten Sitz bildet das Gehäuse selbst.
Zwischen den Sitzen liegt lose der <strong>Schaltkörper</strong> aus Gummi, und um ihn herum bleibt ein Ringspalt frei, durch den die Luft zum Ausgang strömt.
Quer durch den Block gehen zwei Bohrungen zur Befestigung. Das Gewinde G1/4 an allen drei Anschlüssen ist Katalogwert; die Maße der Zeichnung sind geschätzt und nachgezeichnet, die Kammer ist etwas weiter, der Körper etwas schlanker als beim Original, damit man den Spalt sieht.</p>

<h2>ODER: die Wahrheitstabelle</h2>
<p>Luft an <em>einem</em> Eingang oder an <em>beiden</em> kommt am Ausgang an; sind beide Eingänge drucklos, bleibt der Ausgang drucklos. „1“ heißt unter Druck, „0“ drucklos.</p>
<table class="wahrheit">
<caption>Wahrheitstabelle des Wechselventils (ODER)</caption>
<thead><tr><th scope="col">Eingang links 1</th><th scope="col">Eingang rechts 1</th><th scope="col">Ausgang 2</th></tr></thead>
<tbody>
<tr><td>0</td><td>0</td><td>0</td></tr>
<tr><td>1</td><td>0</td><td>1</td></tr>
<tr><td>0</td><td>1</td><td>1</td></tr>
<tr><td>1</td><td>1</td><td>1</td></tr>
</tbody>
</table>
<p>Die Automatik spielt diese vier Fälle in acht Schritten durch: links an, beide an, links aus, beide aus, rechts an, beide an, rechts aus, beide aus. Mit den zwei Reglern stellst du jeden Fall selbst ein.</p>

<h2>Der Schaltkörper: wer zuerst kommt</h2>
<p>Der höhere Druck schiebt den Körper auf den Sitz des <strong>anderen</strong> Eingangs und sperrt ihn. So kann die Luft nur zum Ausgang und nicht in die andere Leitung entweichen. Im Modell wechselt der Körper erst ab ${komma(M.schaltdruck, 2)} bar Druckunterschied
(angenommen: Haftreibung und Trägheit) und braucht ${ms} ms von Sitz zu Sitz (angenommen); in der Zeichnung ist sein Weg mit ${M.hub} mm größer als er ist, und die Zeitlupe, die mit ${komma(1 / 10, 1)}-facher Geschwindigkeit beginnt, macht die ${ms} ms sichtbar.</p>
<p>Liegt an beiden Eingängen derselbe Druck an, bleibt der Körper, wo er ist: Das Signal, das <strong>zuerst</strong> kam, hat den anderen Eingang gesperrt und behält den Ausgang. Bei verschiedenem Druck sperrt der niedrigere Eingang. <strong>„Gesperrt“ heißt nicht „drucklos“:</strong> Ein gesperrter Eingang kann unter Druck stehen, zum Beispiel links 6 bar und rechts 3 bar; die Farbe der Leitung zeigt seinen Druck, der Körper zeigt, dass er nichts zum Ausgang durchlässt.
Fallen beide Eingänge auf null, entlüftet der Ausgang über den offenen Eingang, der an einer drucklosen Leitung hängt.</p>

<h2>Wozu das gut ist</h2>
<p>Ein Zylinder soll oft von zwei Stellen aus bedient werden (zwei Taster) oder wahlweise von Hand und automatisch. Das Wechselventil führt die zwei Signalleitungen in eine zusammen, <strong>ohne dass sie sich gegenseitig belüften</strong>: Der gesperrte Eingang verhindert, dass Druckluft in die andere Leitung und von dort zurück in deren Taster oder Ventil strömt.
Mit dem Zweidruckventil (UND, kommt später in dieser Sammlung) bildet es die Grundverknüpfungen der Pneumatik; wie ein Ventil von einem Signal geschaltet wird, zeigt die Seite zum <a href="../Wegeventil-3-2/">3/2-Wegeventil</a>, und was am Ausgang meist hängt, ein Zylinder, die Seite zum <a href="../Zylinder-Doppeltwirkend/">doppeltwirkenden Zylinder</a>.</p>
<p class="formel">
Offener Eingang, ${komma(1, 0)} bar Druckabfall zum Ausgang: <strong>${Q1} l/min</strong> (Katalog: Normnenndurchfluss)<br>
gesperrter Eingang: <strong>0 l/min</strong> in beide Richtungen
</p>
<p class="hinweis">Alle Zahlen kommen aus dem Modell, das auch den Körper und die Farben bewegt. Katalogwerte sind nur ${M.qn} l/min bei ${komma(M.bezugsDp, 0)} bar Druckabfall, G1/4, ${komma(M.nennweite, 1)} mm Nennweite und 1 bis 10 bar Betriebsdruck (die Regler gehen bis ${P_MAX} bar).
Alles andere ist angenommen: Der Durchfluss wächst im Modell linear mit dem Druckabfall (bei 6 bar Druckabfall wären das ${durchfluss({ s: 0, pL: bar(0), pR: bar(6), p2: bar(0) }, M).gesamt} l/min, ein echtes Ventil drosselt dann ab), die ${komma(M.volumen2 / 1000, 0)} cm³ hinter dem Ausgang, der Schaltdruck und die Schaltzeit.
Ein echtes Wechselventil kann beim Umschalten einen kleinen Druckstoß zeigen (nicht belegt); das Modell hat keinen. Die Teilchen sind nur beim Füllen und Entlüften zu sehen, das im Modell nach wenigen Millisekunden vorbei ist; die Zeichnung lässt sie ${komma(0.5, 1)} s nachleuchten. Die Anleitung zur Figur nennt alles einzeln.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

const TABELLE_CSS = `.lesetext table.wahrheit { border-collapse: collapse; margin: 0 0 11px; max-width: 100%; font-variant-numeric: tabular-nums }
.lesetext table.wahrheit caption { text-align: left; font-size: 12.5px; padding-bottom: 5px; color: color-mix(in srgb, currentColor 80%, transparent) }
.lesetext table.wahrheit th, .lesetext table.wahrheit td { border: 1px solid color-mix(in srgb, currentColor 30%, transparent); padding: 6px 12px; text-align: center }
.lesetext table.wahrheit th { background: var(--anatomy-card); color: var(--anatomy-strong); font-weight: 600; line-height: 1.3 }`;
const EIGENES_CSS = `${VS.CSS}\n.kammer { opacity: .97 }\n${WECHSEL_SYMBOL_CSS}\n${SS.CSS}\n${SS.GUMMI_CSS}\n${TABELLE_CSS}`;
SS.seiteSchreiben({
  ziel: ZIEL,
  css: EIGENES_CSS,
  titel: "Wechselventil – Pneumatik",
  kartenTitel: "Wechselventil",
  hinweis: "Eingänge, Automatik, Zeitlupe, zerlegen",
  anzeige: ANZEIGE,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft unter Druck" },
    { mark: "dotted", label: "Blasses Blau: drucklos; dazwischen Mischtöne nach dem Druck" },
    { mark: "lit", label: "Schaltkörper – er liegt am gesperrten Eingang" },
    { mark: "dim", label: "Alle Teile sind durch die Mitte aufgeschnitten; Hub, Spalt und O-Ring sind überhöht" },
  ],
  caption: "Wechselventil, G1/4 (Vorbild Festo OS-1/4-B), im Schnitt durch die Mitte: Der Gummikörper liegt lose zwischen zwei Sitzen. Der höhere Druck an einem Eingang schiebt ihn auf den Sitz des anderen und sperrt ihn; die Luft des anderen Eingangs strömt durch den Spalt um den Körper zum Ausgang.",
  svg,
  leiste: LEISTE,
  legende: LEGENDE,
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  buehneLabel: "Wechselventil im Schnitt: Sitze, Schaltkörper, Verschlussstück und Baugruppen",
  beiFigur: BEIFIGUR,
});

ST.ende({
  ziel: ZIEL,
  mitte: ANSICHT.MITTE,
  view1: ANSICHT.VIEW1,
  allow: [
    // Parts that stand in a half-cut hole of the housing: the cut face is in front of their back half
    // and behind their front half, so no drawing order is right. The housing is drawn first and its
    // hollows are painted over the cut face, which is what the eye expects.
    ["gehaeuse.koerper", "stopfen.*"], ["gehaeuse.koerper", "oring.*"], ["gehaeuse.koerper", "koerper.*"],
    ["stopfen.*", "oring.*"], ["oring.*", "oring.*"], ["gehaeuse.koerper", "anschluss1l.*"], ["gehaeuse.koerper", "anschluss1r.*"], ["gehaeuse.koerper", "anschluss2.*"],
  ],
  crowd: [],
  // The section of a whole fitting with its hose stub hangs on the stub's item; the other parts of the fitting
  // and the hose have bodies of their own.
  cover: ["anschluss1l.gewinde", "anschluss1r.gewinde", "anschluss2.gewinde", "oring.schnur:0"],
});
