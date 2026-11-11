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
import { schnittTeile, LEINWAND } from "../../../figur/schnittteile.mjs";
import { OS_1_4 as M, neuerZustand, anzeige, anzeigeZeilen } from "../../../figur/wechselventil.mjs";
import { wechselventilSymbol, WECHSEL_SYMBOL_CSS, WECHSEL_SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { TAU } from "../../../figur/schnitt.mjs";
import { zeichner, ort, MOVE_BASIS } from "../../../figur/zylinderteile.mjs";
import { normteile, stummel, STECKVERSCHRAUBUNG_G14 as G14 } from "../../../figur/normteile.mjs";
import { LEGENDE } from "./legende-wechsel.mjs";

const { ZIEL, WURZEL } = ort(import.meta.url);
const { W, H } = LEINWAND;

// --- Dimensions ----------------------------------------------------------
const LAENGE = 60, TIEFE = 14, HOEHE = 34;       // housing block; the half y in [-14, 0] is kept
const XC = LAENGE / 2;                           // the outlet's axis
const ZA = 14;                                   // height of the through bore's axis
const { rPort: R_PORT } = G14;                   // G1/4 thread bore, outside Ø 13.2
const R_KAM = 6;                                 // chamber Ø 12 (spec)
const R_SITZ = M.nennweite / 2;                  // seat bore Ø 6,5 (catalogue: nominal width)
const R_KOERPER = 4.5, L_KOERPER = 13;           // the rubber body Ø 9 × 13 (spec)
const R_KAPPE = 7;                               // radius of the body's domed ends
// The dome meets the seat's edge (radius R_SITZ) at this distance from the body's tip: the tip itself reaches into the seat bore.
const T_KAPPE = R_KAPPE - Math.sqrt(R_KAPPE ** 2 - R_SITZ ** 2);
const X_SITZ_L = XC - (L_KOERPER - 2 * T_KAPPE + M.hub) / 2;   // the left seat's face: the chamber is as long as the body, less the tips in the bores, plus its travel
const X_SITZ_R = XC + (L_KOERPER - 2 * T_KAPPE + M.hub) / 2;
const X_GEW_R = LAENGE - 12;                     // the right thread bore starts here
const Z_HALS = ZA + R_KAM;                       // the chamber's top, where the outlet's neck starts
const Z_GEW = ZA + 8;                            // the outlet's thread bore starts here
const R_HALS = 4;                                // the neck between chamber and outlet thread
const LOCH = { x: [8, LAENGE - 8], z: 27, r: 2.15 };   // the two mounting holes across the block (Ø 4,3, spec)
// The plug (Verschlussstück): outer thread, an O-ring groove, internal thread for the left fitting, the seat at its inner end.
const STOPFEN = { x0: -4, rAussen: 8.5, rGewinde: R_PORT, xAbsatz: 8, nut: [11, 13], rNut: 7.4 };
const PROFIL_STOPFEN = [                         // (radius, x) of the upper half of its wall
  [STOPFEN.rGewinde, STOPFEN.x0], [STOPFEN.rAussen, STOPFEN.x0], [STOPFEN.rAussen, STOPFEN.nut[0]], [STOPFEN.rNut, STOPFEN.nut[0]],
  [STOPFEN.rNut, STOPFEN.nut[1]], [STOPFEN.rAussen, STOPFEN.nut[1]], [STOPFEN.rAussen, X_SITZ_L], [R_SITZ, X_SITZ_L],
  [R_SITZ, STOPFEN.xAbsatz], [STOPFEN.rGewinde, STOPFEN.xAbsatz],
];
const ORING = { x: (STOPFEN.nut[0] + STOPFEN.nut[1]) / 2, r: 8.4, rSchnur: 1.05 };   // centre line of the ring, radius of its cord
// The rubber body, barrel-shaped with domed sealing faces: (radius, s) of its upper edge, s from its middle.
const KOERPER_X0 = X_SITZ_L + L_KOERPER / 2 - T_KAPPE;     // its middle at rest: its left dome on the left seat
const PROFIL_KOERPER = (() => {
  const kappe = [0, 1, 2, 3, 3.6, 4.1].map((r) => [r, -L_KOERPER / 2 + R_KAPPE - Math.sqrt(R_KAPPE ** 2 - r * r)]);
  const links = [...kappe, [4.4, -4.5], [4.5, -3.8]];
  const rechts = links.slice().reverse().map(([r, sp]) => [r, -sp]);
  return [...links, ...rechts].map(([r, sp]) => [Math.round(r * 1000) / 1000, Math.round(sp * 1000) / 1000]);
})();

// Fittings and hoses along each port axis, s from the face outward.
const VERSCHRAUBUNG = G14.masse;
const { rSchlauch: R_SCHLAUCH, rSchlauchInnen: R_SCHLAUCH_INNEN, schlauchLaenge: SCHLAUCH_LAENGE } = G14;   // the hose stubs drawn in the section
// The three ports: face position, direction, name of the assembly.
const ANSCHLUESSE = {
  "1l": { piece: "anschluss1l", raum: "L", flaeche: [STOPFEN.x0, 0, ZA], aus: [-1, 0, 0] },
  "1r": { piece: "anschluss1r", raum: "R", flaeche: [LAENGE, 0, ZA], aus: [1, 0, 0] },
  "2": { piece: "anschluss2", raum: "A", flaeche: [XC, 0, HOEHE], aus: [0, 0, 1] },
};
const punktAn = (nr, s, q = 0) => {
  const a = ANSCHLUESSE[nr];
  return nr === "2" ? [XC + q, 0, HOEHE + s] : [a.flaeche[0] + a.aus[0] * s, 0, ZA + q];
};
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
  oring: [-36, 0, 12],
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
  [[X_SITZ_R, X_GEW_R, ZA - R_SITZ, ZA + R_SITZ], "h"],                        // the right seat's bore
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
  ["L", [STOPFEN.x0, STOPFEN.xAbsatz, ZA - R_PORT, ZA + R_PORT]], ["L", [STOPFEN.xAbsatz, X_SITZ_L, ZA - R_SITZ, ZA + R_SITZ]],
  ["A", [X_SITZ_L, X_SITZ_R, ZA - R_KAM, ZA + R_KAM]], ["A", [XC - R_HALS, XC + R_HALS, Z_HALS, Z_GEW]], ["A", [XC - R_PORT, XC + R_PORT, Z_GEW, HOEHE]],
  ["R", [X_SITZ_R, X_GEW_R, ZA - R_SITZ, ZA + R_SITZ]], ["R", [X_GEW_R, LAENGE, ZA - R_PORT, ZA + R_PORT]],
];

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
    oben: gewindeStriche(),
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
    ...flaechen.map((f) => schnittFlaeche(f, 1)),
    L(flaechen.map(umriss).join(""), { tone: "mid" }),
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
    rec(A.ring(F, S.nut[1], X_SITZ_L, R_SITZ, S.rAussen, { name: "stopfen.bund" })),
  ], { name: "stopfen.gewinde" });
}

// --- The O-ring: two cords in the section, a torus once the plug is out ------------------------------------
function oring() {
  gruppe("oring");
  const O = ORING;
  const kreis = (cz, dz) => ring3(Array.from({ length: 25 }, (_, i) => [O.x + O.rSchnur * Math.cos((i / 24) * TAU), 0, cz + dz + O.rSchnur * Math.sin((i / 24) * TAU)]));
  const schnitt = [ZA + O.r, ZA - O.r].map((z) => `<path class="iso-shade" data-shade="0" style="fill:var(--anatomy-strong)" d="${kreis(z, 0)}"/>`
    + L(kreis(z, 0), { tone: "mid" })).join("");
  // the whole ring: a tube round the bore's axis, in pieces so that it can be put in order
  const punkte = Array.from({ length: 33 }, (_, i) => [O.x, O.r * Math.cos((i / 32) * TAU), ZA + O.r * Math.sin((i / 32) * TAU)]);
  const stuecke = tubePieces(punkte, O.rSchnur, P, { maxLength: 14 });
  stuecke.forEach((teil, i) => put(teil.mid, `<g class="gummi">${tubeSvg(teil, { tone: "lo" })}</g>`, [A.tube(teil.points, teil.radii)], { name: `oring.schnur:${i}` }));
  ST.schnittLage("oring.schnur:0", schnitt);
}

// --- The rubber body between the seats; it moves with the model (data-hub) -------------------------------------
function koerper() {
  gruppe("koerper");
  const F = FX(KOERPER_X0);
  const obere = PROFIL_KOERPER.map(([r, s]) => [KOERPER_X0 + s, 0, ZA + r]);
  const untere = PROFIL_KOERPER.slice().reverse().map(([r, s]) => [KOERPER_X0 + s, 0, ZA - r]);
  const umrissKoerper = [...obere, ...untere.slice(1, -1)];
  const ganz = PROFIL_KOERPER.map(([r, s], i) => [s, r, i > 0 && i < PROFIL_KOERPER.length - 1 ? 1 : 0]);
  put([KOERPER_X0, 0, ZA], zweiLagen([
    // the rubber is drawn dark, like the black rings of the cutaway
    `<path class="iso-shade" data-shade="0" style="fill:var(--anatomy-strong)" d="${ring3(umrissKoerper)}"/>`,
    L(ring3(umrissKoerper), { tone: "mid" }),
  ].join(""), `<g class="gummi">${SV(G.solidOf(ganz, F, P), { tone: "lo" })}</g>`), [
    rec(A.solid(F, PROFIL_KOERPER.map(([r, s]) => [s, r]), { name: "koerper.rumpf" })),
  ], { name: "koerper.rumpf", hub: true });
}

// --- Fittings and hoses ---------------------------------------------------------------------------------------
function anschluesse() {
  for (const [nr, a] of Object.entries(ANSCHLUESSE)) {
    const F = G.frameOf(a.flaeche, a.aus, nr === "2" ? [1, 0, 0] : [0, 1, 0], nr === "2" ? [0, 1, 0] : [0, 0, 1]);
    NT.verschraubung(F, VERSCHRAUBUNG, a.piece, a.piece, (rng) => punktAn(nr, (rng[0] + rng[1]) / 2), G14.rStummel);
  }
  ST.schlaeuche(WEGE, { radius: R_SCHLAUCH, innen: R_SCHLAUCH_INNEN, piece: (nr) => ANSCHLUESSE[nr].piece });
}

// The fittings and the hose stubs cut in the same plane as the block: walls in the section tone, the bore free.
function anschlussSchnitte() {
  for (const [nr, a] of Object.entries(ANSCHLUESSE)) {
    ST.anschlussSchnitt({
      // the rectangle between s0 and s1 along the port and q0 and q1 across it
      streifen: (s0, s1, q0, q1) => {
        const p = punktAn(nr, s0, q0), q = punktAn(nr, s1, q1);
        return nr === "2" ? [XC + q0, XC + q1, Math.min(p[2], q[2]), Math.max(p[2], q[2])] : [...[p[0], q[0]].sort((u, v) => u - v), ZA + q0, ZA + q1];
      },
      hohl: AUSSEN_HOHL[nr],
      raum: a.raum,
      traeger: `${a.piece}.gewinde`,
    });
  }
}

// --- Compose ----------------------------------------------------------------------------------------------------
gehaeuse();
anschluesse();
anschlussSchnitte();
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

// --- The page ------------------------------------------------------------------------
// The state at the start of the page and what the browser needs of the model. The air (the streams in the
// hoses and the passages), the controls and the explanation follow in the next steps.
const ANZEIGE = anzeigeZeilen(anzeige(neuerZustand(), M)).join("\n");

const KONSTANTEN = `
const HUB = ${M.hub};
`;

// What only the shuttle valve knows: the body's slide, the tones of the three rooms. The frame, the readout,
// the automatic cycle, the half sections and the handle of the browser test are figur/schnittseite.mjs.
const eigenes = `
// --- the model drives everything -------------------------------------------
const zustand = neuerZustand();

const koerperTeile = Array.from(svg.querySelectorAll("[data-hub]"));
function seiteAutoSchritt() {}
function seiteBedienung() {}

// The body slides between the seats; it stands home while the valve is taken apart.
const hubMarke = (anteil) => (zustand.s * HUB * anteil).toFixed(3);
function hubStellen(anteil) {
  const dx = zustand.s * HUB * anteil;
  const t = Math.abs(dx) > 1e-4 ? translateAlong(P, [dx, 0, 0]) : null;
  for (const el of koerperTeile) { if (t) el.setAttribute("transform", t); else el.removeAttribute("transform"); }
}

// A room is strong blue under pressure, pale blue when it is vented.
const raumTon = (F, p) => (p - AUSSEN > 0.5 ? F.druck : F.abluft);
function zeichneLuft(dt) {
  const F = luftFarben();
  setzeRaumFarben({ L: raumTon(F, zustand.pL), R: raumTon(F, zustand.pR), A: raumTon(F, zustand.p2) });
}

const anzeigeText = () => anzeigeZeilen(anzeige(zustand, OS_1_4)).join("\\n");
function modellSchritt(dm) {}
function zeichneStets() {}

figurStarten({
  MASSE: OS_1_4,
  modell: () => zustand,
  // the two input pressures in bar (gauge), the model settled at once
  stelle(pL, pR) {
    stelleFest();
    zustand.pL = AUSSEN + pL;
    zustand.pR = AUSSEN + pR;
    for (let i = 0; i < 60; i += 1) schritt(zustand, OS_1_4, 0.05, { pL: zustand.pL, pR: zustand.pR });
    zeichneModell(0);
    run();
  },
});
`;

const live = SS.lebendSkript({
  wurzel: WURZEL, P, MOVE, STAGGER, ansicht: ANSICHT, LEGENDE, BAHNEN: {}, SEITE_VON: {}, ANZAHL: {}, VORNE: [],
  SKALA: { tempo: 0.25, tempoMax: 160, bezug: M.qn },
  AUTO_TAKT: 3,
  modelle: ["figur/ventil.mjs", "figur/wechselventil.mjs"],
  symbole: [WECHSEL_SYMBOL_LAUFZEIT],
  konstanten: KONSTANTEN,
  eigenes,
});

const LEISTE = SS.leiste("");

const INFO = "Der Schnitt zeigt, was im Wechselventil sitzt: den Gummikörper zwischen den beiden Sitzen, das Verschlussstück mit dem O-Ring und die Ausgangsbohrung. "
  + "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const BEIFIGUR = SS.schaltzeichenBlock({
  svg: wechselventilSymbol({ feld: 60 }).svg,
  text: "Das Rechteck ist das Gehäuse, die Leitung die durchgehende Bohrung, die Kugel der Schaltkörper zwischen zwei Sitzen. Die beiden Eingänge tragen die 1, der Ausgang die 2.",
});

const LESETEXT = `<div class="lesetext">
<h2>Was man sieht</h2>
<p>Der Text folgt mit der Bedienung.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

const EIGENES_CSS = `${VS.CSS}\n${WECHSEL_SYMBOL_CSS}\n${SS.CSS}\n${SS.GUMMI_CSS}`;
SS.seiteSchreiben({
  ziel: ZIEL,
  css: EIGENES_CSS,
  titel: "Wechselventil – Pneumatik",
  kartenTitel: "Wechselventil",
  hinweis: "Eingänge, Automatik, zerlegen",
  anzeige: ANZEIGE,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft unter Druck" },
    { mark: "dotted", label: "Blasses Blau: drucklose Luft" },
    { mark: "lit", label: "Schaltkörper – was sich bewegt" },
    { mark: "dim", label: "Alle Teile sind durch die Mitte aufgeschnitten; der Hub ist überhöht" },
  ],
  caption: "Wechselventil, G1/4 (Vorbild Festo OS-1/4-B), im Schnitt durch die Mitte: Der Gummikörper liegt lose zwischen zwei Sitzen. Der höhere Druck an einem Eingang schiebt ihn auf den Sitz des anderen und sperrt ihn.",
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
