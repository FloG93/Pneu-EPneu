// A spring-loaded check valve (Rückschlagventil) after the Festo H-1/4-B: a hexagon body (drawn here as a cylinder, Ø 19 = the
// width across the flats) with the internal thread G1/4 at port 1 on the left and an external thread G1/4 with a sealing ring at
// port 2 on the right. The catalogue (H/HA/HB) gives the outside, the symbol and the data, but no section: the inside is REDRAWN
// after the working principle of the spring-loaded poppet valve (assumed): a seat insert pressed into the bore with a conical
// countersink, a poppet with a sealing face of NBR on a metal core, a compression spring between the poppet and a stop in the
// housing. Dimensions in mm, 1 world unit = 1 mm. The axis runs along x at the height ZA. The sizes are estimates (the figure's
// README says so); the poppet's travel is drawn larger than it is.
//
// This script holds geometry and the four data tables; everything a section page shares (the cut face, the hatching, the two
// layers of a turned part, the fittings in section, the order, the live script, the page) comes from ../../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is kept is the one at y <= 0 and its cut face at y = 0
// looks at the viewer.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../../.claude/skills/anatomy/kit/tube.mjs";
import * as LU from "../../../figur/luft.mjs";
import * as VS from "../../../figur/ventilseite.mjs";
import * as SS from "../../../figur/schnittseite.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import { schnittTeile, anschlussPunkt, LEINWAND, LUFTLAGE_HINTEN } from "../../../figur/schnittteile.mjs";
import { H_1_4 as M, neuerZustand, anzeige, anzeigeZeilen, durchfluss, absolut } from "../../../figur/rueckschlagventil.mjs";
import { rueckschlagventilSymbol, RUECK_SYMBOL_CSS, RUECK_SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { TAU } from "../../../figur/schnitt.mjs";
import { schieber, knopf, komma } from "../../../figur/seite.mjs";
import { zeichner, ort, MOVE_BASIS } from "../../../figur/zylinderteile.mjs";
import { normteile, stummel, federPruefen, FEDER_LAUFZEIT, STECKVERSCHRAUBUNG_G14_KURZ as G14 } from "../../../figur/normteile.mjs";
import { LEGENDE } from "./legende-rueckschlagventil.mjs";

const { ZIEL, WURZEL } = ort(import.meta.url);
const { W, H } = LEINWAND;

// --- Dimensions ----------------------------------------------------------
const RA = 9.5, HOEHE = 2 * RA, ZA = RA;         // the body: Ø 19 (the hexagon's width across the flats), the axis at its middle
const X_HEX = 40, X_ENDE = 48;                   // the body to x = 40, the external thread (Katalog: 8 mm) to x = 48
const R_GEWINDE = G14.rPort;                     // G1/4: thread bore and external thread, outside Ø 13
const X_GEW = 12;                                // the internal thread's depth (the fitting's stub is 12 mm long)
const R_BOHR = 4.5;                              // the bore Ø 9 behind the thread (assumed)
const R_SITZ = 3;                                // the seat bore Ø 6 (assumed)
const X_SITZ0 = X_GEW, X_KEGEL = 15.5, X_SITZ1 = 17;   // the seat insert reaches from X_SITZ0 to X_SITZ1; its cone grows from R_SITZ to R_BOHR at 45°
const R_TELLER = 4;                              // the poppet Ø 8 (assumed), a gap of 0,5 to the bore Ø 9
const TELLER = { spitze: 15.9, rSpitze: 3.4, kegelEnde: 16.5, nbrEnde: 17.1, hinten: 21.9 };   // x of the poppet's tip, the end of its cone, of its sealing face and of its back
const X_ANSCHLAG = 31.4;                         // the spring's stop: the step from the bore to the passage
const R_DURCH = 2.4;                             // the passage behind the stop
const X_DICHTRING = [X_HEX, X_HEX + 1.5], R_DICHTRING = 8.5;   // the sealing ring on the external thread
const X_MUFFE = 6.5;                             // the sleeve of the right fitting reaches 6,5 mm over the thread
const R_SCHLAUCH = G14.rSchlauch, R_SCHLAUCH_INNEN = G14.rSchlauchInnen, SCHLAUCH_LAENGE = G14.schlauchLaenge;
// The spring (assumed): wire 0,8, 6 coils, mean radius 3,1 (Ø 7 outside); installed between the poppet and the stop with a preload.
const FEDER = { draht: 0.8, windungen: 6, rWindung: 3.1, stueck: 1.2, laenge: X_ANSCHLAG - TELLER.hinten };
const FEDER_TEXT = federPruefen(FEDER, M.hub, 0.5);   // at the full travel it must not go solid
const R_DRAHT = FEDER.draht / 2;

// Fittings and hoses along each port axis, s from the face outward.
const VERSCHRAUBUNG = G14.masse;
// The left fitting is the standard one; the right one is a sleeve that is screwed onto the external thread (Annahme: the catalogue
// does not say what the counterpart looks like): the same body, a plain sleeve of the hexagon's radius instead of the threaded stub.
const G14_MUFFE = {
  ...G14,
  rStummel: VERSCHRAUBUNG.rS,
  masse: { ...VERSCHRAUBUNG, gewinde: [-X_MUFFE, 0], muffe: { rIn: R_GEWINDE } },
  schnitt: [
    [[-X_MUFFE, 0], R_GEWINDE, VERSCHRAUBUNG.rS, 1],            // the sleeve's wall over the external thread
    ...G14.schnitt.slice(1),
  ],
};
// The two ports: face position, direction, name of the assembly.
const ANSCHLUESSE = {
  "1": { piece: "anschluss1", raum: "L", flaeche: [0, 0, ZA], aus: [-1, 0, 0] },
  "2": { piece: "anschluss2", raum: "R", flaeche: [X_ENDE, 0, ZA], aus: [1, 0, 0] },
};
const punktAn = (nr, s, q = 0) => anschlussPunkt(ANSCHLUESSE[nr], s, q);
const WEGE = Object.fromEntries(Object.keys(ANSCHLUESSE).map((nr) => {
  const p0 = punktAn(nr, VERSCHRAUBUNG.ring[1]);
  // seen whole (while the valve is taken apart) the left one bends towards the viewer, so that its cut end faces us
  if (nr === "1") return [nr, stummel(p0, [-1, 0, 0], [p0[0] - 12, 15, p0[2] - 2], [-0.35, 0.92, -0.1], 6)];
  return [nr, stummel(p0, [1, 0, 0], [p0[0] + 12, 0, p0[2]], [1, 0, 0], 8)];
}));

// The extreme points of what is drawn at rest: the body and the cut ends of the two hose stubs, a hose's radius to each side
// (the whole, bent hose only shows while the valve is taken apart, and the view widens by itself then).
const ENDE_SCHLAUCH = Object.keys(ANSCHLUESSE).map((nr) => punktAn(nr, VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE));
const P = k.fitProjection(
  [[0, -RA, 0], [X_ENDE, -RA, 0], [0, 0, 0], [X_ENDE, 0, 0], [0, -RA, HOEHE], [X_ENDE, -RA, HOEHE], [0, 0, HOEHE], [X_ENDE, 0, HOEHE],
    ...ENDE_SCHLAUCH.flatMap((q) => [[q[0] - R_SCHLAUCH, q[1], q[2]], [q[0] + R_SCHLAUCH, q[1], q[2]], [q[0], q[1], q[2] + R_SCHLAUCH], [q[0], q[1], q[2] - R_SCHLAUCH]])],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
);

// --- Assemblies ----------------------------------------------------------
// Outside first. The right fitting leaves towards +x, the sealing ring after it (it rides with it, lifted a little so that the two stay
// distinct), the left fitting towards -x; then the spring and the poppet leave towards the viewer through the cut (the spring first:
// it rests on the poppet); the housing with its seat insert stays. Put together again from the inside out.
const STAGGER = ["anschluss2", "anschluss1", "dichtring", "feder", "teller", "gehaeuse"];
// Escape paths in mm along the machine's axes (x along the valve, y towards the viewer, z up).
const MOVE = {
  ...MOVE_BASIS,
  anschluss2: [34, 14, 0],
  anschluss1: [-20, 12, 0],
  dichtring: [24, 0, 20],
  feder: [0, 36, 8],
  teller: [0, 24, 26],
  gehaeuse: [0, 0, 0],
};

const { R, rec, put, gruppe } = zeichner({ P, MOVE });
const NT = normteile({ P, rec, put, gruppe });
const ST = schnittTeile({ P, MOVE, R, rec, put, gruppe, NT });
const { at, L, SV, ring3, umriss, schnittFlaeche, zweiLagen } = ST;
const { beideSeiten } = ST.drehachse({ richtung: "x", mitte: ZA });   // (radius, x) profiles, once on each side of the axis
const FX = (x0) => G.frameOf([x0, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]);   // the axis

// --- The hollows of the housing: rectangles (x0, x1, z0, z1) in the cut plane ----------------------
const HOHLRAUM = [
  [[0, X_GEW, ZA - R_GEWINDE, ZA + R_GEWINDE], "h"],                  // the internal thread (the fitting's stub fills it)
  [[X_GEW, X_ANSCHLAG, ZA - R_BOHR, ZA + R_BOHR], "h"],               // the bore Ø 9: seat insert, poppet and spring chamber
  [[X_ANSCHLAG, X_ENDE, ZA - R_DURCH, ZA + R_DURCH], "h"],            // the passage behind the spring's stop, through the external thread
];
/** The bores of the cut fittings and hoses outside the body (the air inside them is part of the figure). */
const AUSSEN_HOHL = {
  "1": [[punktAn("1", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0], 0, ZA - 4, ZA + 4], "h"],
  "2": [[X_ENDE, punktAn("2", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0], ZA - 4, ZA + 4], "h"],
};

// --- Rooms of air: rectangles and wedges painted over the hollows, by what is connected ------------------------------
// L is everything on the side of port 1 (up to the seat's contact), R everything behind it up to port 2; the page paints them by
// their pressure; the outer bores of the fittings belong to the same rooms.
const RAUM_RECHTECKE = [
  ["L", [0, X_GEW, ZA - R_GEWINDE, ZA + R_GEWINDE]], ["L", [X_SITZ0, X_KEGEL, ZA - R_SITZ, ZA + R_SITZ]],
  ["R", [X_SITZ1, X_ANSCHLAG, ZA - R_BOHR, ZA + R_BOHR]], ["R", [X_ANSCHLAG, X_ENDE, ZA - R_DURCH, ZA + R_DURCH]],
];
// the seat's cone (R_SITZ at X_KEGEL growing to R_BOHR at X_SITZ1): the air inside it, once on each side of the axis, belongs to the inlet
const RAUM_KEILE = [["L", [[0, X_KEGEL], [R_SITZ, X_KEGEL], [R_BOHR, X_SITZ1], [0, X_SITZ1]]]];

/** The thread of the bore that carries one, as faint rings on its far wall (the fitting's stub hides them while the valve is together). */
function gewindeStriche() {
  const F = FX(0);
  const bogen = [];
  for (let s = 1; s < X_GEW - 0.4; s += 1.3) bogen.push(G.arcOf(F, s, R_GEWINDE, P, { inward: true, from: Math.PI / 2, to: 1.5 * Math.PI }));   // only the kept half: the arcs end on the cut plane's edge
  return `<clipPath id="gewinde-links"><path d="${ST.rahmen(0, X_GEW, ZA - R_GEWINDE, ZA + R_GEWINDE)}"/></clipPath><g clip-path="url(#gewinde-links)">${L(bogen.join(""), { tone: "faint" })}</g>`;
}

// --- The housing -------------------------------------------------------------------------------------------
// The outer shell: the body is a cylinder (the hexagon simplified), kept as its half y <= 0. The kit draws a whole turned body, so
// the whole cylinder is drawn and clipped to the silhouette of its kept half; the cut face is drawn over it afterwards.
const halbHuelle = (x0, x1, r) => {
  const punkte = [x0, x1].flatMap((x) => Array.from({ length: 25 }, (_, i) => {
    const w = (Math.PI * i) / 24;
    return at([x, -r * Math.sin(w), ZA + r * Math.cos(w)]);
  }));
  return SCH.pfad(G.hullOf(punkte));
};
const UMRISS = [[0, 0], [X_HEX, 0], [X_HEX, ZA - R_GEWINDE], [X_ENDE, ZA - R_GEWINDE], [X_ENDE, ZA + R_GEWINDE], [X_HEX, ZA + R_GEWINDE], [X_HEX, HOEHE], [0, HOEHE]];
function gehaeuse() {
  gruppe("gehaeuse");
  const F = FX(0);
  // two convex turned bodies, so that each has its own silhouette: the body and, on its end face, the external thread
  const rumpf = G.lathe([[0, 0], [0, RA], [X_HEX, RA], [X_HEX, 0]], F, P);
  const zapfen = G.lathe([[X_HEX, 0], [X_HEX, R_GEWINDE], [X_ENDE, R_GEWINDE], [X_ENDE, 0]], F, P, { hole: [X_ENDE, R_DURCH] });
  // the external thread as rings on the stub (the sleeve hides them while the valve is together)
  const ringe = [];
  for (let s = X_HEX + 2; s < X_ENDE - 0.4; s += 1.3) ringe.push(G.arcOf(F, s, R_GEWINDE, P, { from: Math.PI / 2, to: 1.5 * Math.PI }));
  const teile = [
    `<path class="iso-halo" d="${k.haloOf({ x: 0, y: -RA, w: X_ENDE, d: RA, r: 0 }, 0, HOEHE, P)}"/>`,
    `<clipPath id="huelle-gehaeuse"><path d="${halbHuelle(0, X_HEX, RA)}"/><path d="${halbHuelle(X_HEX, X_ENDE, R_GEWINDE)}"/></clipPath>`,
    `<g clip-path="url(#huelle-gehaeuse)">${SV(rumpf, { tone: "mid" })}${SV(zapfen, { tone: "mid", inner: L(ringe.join(""), { tone: "faint" }) })}</g>`,
    L(`${SCH.pfad(G.hullOf(Array.from({ length: 25 }, (_, i) => [0, -RA * Math.sin((Math.PI * i) / 24), ZA + RA * Math.cos((Math.PI * i) / 24)]).map(at)))}`, { tone: "faint" }),
    // the cut face, the outline of the hollows over it (all outlines first, then the fills, so that a junction shows no line)
    // the body's rectangle (the browser test reads the scale from it: bottom left, bottom right, top right, top left) and the stub's, a little
    // overlapped so that the two show no seam
    NT.schnitt([[0, 0, 0], [X_HEX, 0, 0], [X_HEX, 0, HOEHE], [0, 0, HOEHE]]).replace("<path ", '<path data-mass="" '),
    NT.schnitt([[X_HEX - 0.3, 0, ZA - R_GEWINDE], [X_ENDE, 0, ZA - R_GEWINDE], [X_ENDE, 0, ZA + R_GEWINDE], [X_HEX - 0.3, 0, ZA + R_GEWINDE]]),
    L(HOHLRAUM.map(([[x0, x1, z0, z1]]) => ST.rahmen(x0, x1, z0, z1)).join(""), { tone: "mid" }),
    ...HOHLRAUM.map(ST.hohlraum),
    ...ST.raumPfade({ rechtecke: RAUM_RECHTECKE, keile: RAUM_KEILE, beideSeiten }),
    // over the air: the thread's rings, the walls of the bores
    gewindeStriche(),
    ST.hohlraumUmriss({ hohlraeume: HOHLRAUM, laenge: X_ENDE, hoehe: HOEHE }),
    L(ring3(UMRISS.map(([x, z]) => [x, 0, z])), { tone: "mid" }),
    LUFTLAGE_HINTEN,
  ];
  put([X_HEX / 2, -RA / 2, ZA], teile.join(""), [
    rec(A.ring(F, 0, X_GEW, R_GEWINDE, RA, { name: "gehaeuse.gewinde", ground: true })),
    rec(A.ring(F, X_GEW, X_ANSCHLAG, R_BOHR, RA, { name: "gehaeuse.bohrung", ground: true })),
    rec(A.ring(F, X_ANSCHLAG, X_HEX, R_DURCH, RA, { name: "gehaeuse.anschlag", ground: true })),
    rec(A.ring(F, X_HEX, X_ENDE, R_DURCH, R_GEWINDE, { name: "gehaeuse.zapfen", ground: true })),
  ], { name: "gehaeuse.koerper" });
}

/** The seat insert, pressed into the bore: two walls in the cut, the cone on its right face. A part of the housing's assembly. */
function sitzeinsatz() {
  gruppe("gehaeuse");
  const F = FX(0);
  const profil = [[R_SITZ, X_SITZ0], [R_SITZ, X_KEGEL], [R_BOHR, X_SITZ1], [R_BOHR, X_SITZ0]];
  const flaechen = beideSeiten(profil);
  put([(X_SITZ0 + X_SITZ1) / 2, 0, ZA], [
    ...flaechen.map((f) => schnittFlaeche(f, -1, { ton: "b", strich: "mid" })),
    L(flaechen.map(umriss).join(""), { tone: "hi" }),
  ].join(""), [
    rec(A.lathe(F, [[X_SITZ0, R_SITZ], [X_KEGEL, R_SITZ], [X_SITZ1, R_BOHR], [X_SITZ0, R_BOHR]], { name: "gehaeuse.sitz", ground: true })),
  ], { name: "gehaeuse.sitz" });
}

// --- The poppet: a metal core with a sealing face of NBR; it moves with the model (data-hub) ----------------------
/** Rubber in a section: black, with a light edge, in light and dark mode alike (it must stand out of the strong blue and the grey of the cut). */
const RUBBER_SCHNITT = "fill:#1a1a1c;stroke:#f2f2ee;stroke-width:2.2;stroke-linejoin:round;paint-order:stroke";
function teller() {
  gruppe("teller");
  const T = TELLER;
  const F = FX(0);
  const nbr = [[T.spitze, T.rSpitze], [T.kegelEnde, R_TELLER], [T.nbrEnde, R_TELLER]];   // the upper edge of the sealing face (x, r)
  const umrissNbr = [...nbr.map(([x, r]) => [x, 0, ZA + r]), ...nbr.slice().reverse().map(([x, r]) => [x, 0, ZA - r])];
  const kern = [[T.nbrEnde, ZA - R_TELLER], [T.hinten, ZA - R_TELLER], [T.hinten, ZA + R_TELLER], [T.nbrEnde, ZA + R_TELLER]].map(([x, z]) => [x, 0, z]);
  // One part: a light metal core (its own section tone "k", so that it differs from the grey housing and the tan seat insert), the black
  // NBR face in front of it, and one strong outline round the whole poppet.
  const schnitt = [
    schnittFlaeche(kern, -1, { ton: "k", strich: "mid" }),
    L(ring3(kern), { tone: "hi" }),
    `<path class="iso-shade" data-shade="0" style="${RUBBER_SCHNITT}" d="${ring3(umrissNbr)}"/>`,
    L(ring3(umrissNbr), { tone: "hi" }),
  ].join("");
  const ganz = [
    `<g class="gummi">${SV(G.solidOf([[T.spitze, T.rSpitze], [T.kegelEnde, R_TELLER], [T.nbrEnde, R_TELLER]], F, P), { tone: "lo" })}</g>`,
    SV(G.disc(T.nbrEnde, T.hinten, R_TELLER, F, P), { tone: "hi" }),
    L(G.circleOf(F, T.hinten, R_TELLER - 1.1, P), { tone: "faint" }),
  ].join("");
  put([(T.spitze + T.hinten) / 2, 0, ZA], zweiLagen(schnitt, ganz), [
    rec(A.solid(F, [[T.spitze, T.rSpitze], [T.kegelEnde, R_TELLER], [T.hinten, R_TELLER]], { name: "teller.kern" })),
  ], { name: "teller.kern", hub: true });
}

// --- The spring: a whole coil between the poppet and the stop (the page compresses it with the lift) -----------------
function feder() {
  gruppe("feder");
  const F = FX(0);
  const fa = TELLER.hinten + R_DRAHT, fb = X_ANSCHLAG - R_DRAHT;
  const wendel = NT.druckfeder(F, fa, fb, FEDER);
  put([(fa + fb) / 2, 0, ZA], wendel.join(""), [
    rec(A.ring(F, TELLER.hinten, X_ANSCHLAG, FEDER.rWindung - R_DRAHT, FEDER.rWindung + R_DRAHT, { name: "feder.wendel" })),
  ], { name: "feder.wendel", feder: [TELLER.hinten, X_ANSCHLAG] });
}

// --- The sealing ring on the external thread: two cords in the cut, a ring of rubber once the sleeve is off ----------------
// Drawn as a ring of round cord (the catalogue's picture shows a ring of this size on the thread; its profile is assumed).
const DICHTRING = { x: (X_DICHTRING[0] + X_DICHTRING[1]) / 2, r: (R_GEWINDE + R_DICHTRING) / 2, rSchnur: (X_DICHTRING[1] - X_DICHTRING[0]) / 2 };
function dichtring() {
  gruppe("dichtring");
  const O = DICHTRING;
  const kreis = (cz) => ring3(Array.from({ length: 25 }, (_, i) => [O.x + O.rSchnur * Math.cos((i / 24) * TAU), 0, cz + O.rSchnur * Math.sin((i / 24) * TAU)]));
  const schnitt = [1, -1].map((v) => `<path class="iso-shade" data-shade="0" style="${RUBBER_SCHNITT}" d="${kreis(ZA + v * O.r)}"/>`).join("");
  // the whole ring: a tube round the axis, in pieces so that it can be put in order
  const punkte = Array.from({ length: 33 }, (_, i) => [O.x, O.r * Math.cos((i / 32) * TAU), ZA + O.r * Math.sin((i / 32) * TAU)]);
  const stuecke = tubePieces(punkte, O.rSchnur, P, { maxLength: 14 });
  stuecke.forEach((teil, i) => put(teil.mid, `<g class="gummi">${tubeSvg(teil, { tone: "lo" })}</g>`, [A.tube(teil.points, teil.radii)], { name: `dichtring.schnur:${i}` }));
  ST.schnittLage("dichtring.schnur:0", schnitt);
}

// --- Fittings and hoses ---------------------------------------------------------------------------------------
// The two ports as a table: the fitting, its hose stub and the section of both (the hoses ride with their own fitting).
const portEintrag = (nr) => {
  const a = ANSCHLUESSE[nr];
  return { nr, gruppe: a.piece, name: a.piece, flaeche: a.flaeche, aus: a.aus, raum: a.raum, hohl: AUSSEN_HOHL[nr], schlauchGruppe: a.piece, bezeichnung: nr };
};

// --- Compose ----------------------------------------------------------------------------------------------------
gehaeuse();
sitzeinsatz();
ST.anschluesse({ ports: [portEintrag("1")], wege: { 1: WEGE["1"] }, fitting: G14 });
ST.anschluesse({ ports: [portEintrag("2")], wege: { 2: WEGE["2"] }, fitting: G14_MUFFE });
dichtring();
teller();
feder();

ST.pruefeBaugruppen(LEGENDE, STAGGER);
ST.anordnen({
  hintergrund: "gehaeuse.koerper",
  reihe: ["gehaeuse.sitz", "teller.kern", "feder.wendel"],
  ganzStuecke: ["anschluss1", "anschluss2", "dichtring"],
});
const ANSICHT = ST.ansicht({ W, H, weite: 0.03 });
{
  // The view with everything out is computed from the parts' middles; a hose that bends towards the viewer reaches further than its
  // middle does. The view grows until every point of every hose, moved to the end of its way, lies inside it (same aspect ratio).
  const punkte = Object.entries(WEGE).flatMap(([nr, route]) => {
    const m = MOVE[ANSCHLUESSE[nr].piece];
    return route.map((q) => k.iso([q[0] + m[0], q[1] + m[1], q[2] + m[2]], P));
  });
  const rand = 16 + R_SCHLAUCH * 8;
  const [x, y, w, h] = ANSICHT.VIEW1;
  const x0 = Math.min(x, ...punkte.map((q) => q[0] - rand)) - 8, x1 = Math.max(x + w, ...punkte.map((q) => q[0] + rand)) + 14;
  const y0 = Math.min(y, ...punkte.map((q) => q[1] - rand)), y1 = Math.max(y + h, ...punkte.map((q) => q[1] + rand));
  const breit = Math.max(x1 - x0, ((y1 - y0) * W) / H), hoch = (breit * H) / W;
  ANSICHT.VIEW1 = [x0 - (breit - (x1 - x0)) / 2, y0 - (hoch - (y1 - y0)) / 2, breit, hoch];
}

const svg = ST.figur({
  W,
  H,
  label:
    "Ein Rückschlagventil mit G1/4-Anschlüssen im Schnitt durch die Mitte, nachgezeichnet nach dem Funktionsprinzip: ein zylindrischer Körper mit Innengewinde links (Anschluss 1) und Außengewinde mit Dichtring rechts (Anschluss 2). "
    + "Innen sitzt ein Sitzeinsatz mit Kegelsenkung, dahinter ein Ventilteller mit Dichtfläche aus Gummi, den eine schwache Druckfeder auf den Sitz drückt. "
    + "Luft von links hebt den Teller ab und strömt durch den Ringspalt nach rechts; Luft von rechts presst ihn auf den Sitz.",
});

// --- The page ------------------------------------------------------------------------
const ANZEIGE = anzeigeZeilen(anzeige(neuerZustand(), M)).join("\n");
const P_MAX = 8;                                     // bar: the slider's top
const P_VOLL = 6;                                    // bar: from here on a room shows the full strong blue
const OFFEN_AB = 0.15;                               // lift: from here on the poppet counts as open and the particles show (below it, the lift is under half a millimetre)
// The automatic cycle, eight steps (the spec's order): [pressure at 1 in bar, vent of 2 open]. Open, hold, shut, hold (2 keeps its
// pressure), a lower pressure at 1 than at 2 (the poppet stays shut), hold, vent 2, hold.
const AUTO_SCHRITTE = [[6, 0], [6, 0], [0, 0], [0, 0], [3, 0], [3, 0], [0, 1], [0, 1]];

// --- Air: the way the particles take, in the cut plane ---------------------------------------------------------------------
// One route from the hose of port 1 to the hose of port 2, only through free space: along the axis through the fitting and the seat's
// hole, out through the gap between the seat's cone and the lifted poppet, along the annular gap round the poppet and the spring
// (the bore is Ø 9, the poppet Ø 8, the spring Ø 7: the gap lies between them), then down to the axis at the stop and through the
// passage and the right fitting to the hose of port 2. It is drawn for the FULLY lifted poppet; the page shows particles only while the
// model lets air flow, that is, while the poppet is lifted. A shut poppet carries nothing, so no particle stands at it.
const ENDE_1 = punktAn("1", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0] + 1;
const ENDE_2 = punktAn("2", VERSCHRAUBUNG.ring[1] + SCHLAUCH_LAENGE)[0] - 1;
const R_SPALT = (R_TELLER + R_BOHR) / 2;            // the annular gap round the poppet
const ROUTEN = {
  a: [[ENDE_1, 0, ZA], [X_KEGEL - 0.5, 0, ZA], [X_KEGEL + 0.8, 0, ZA + 2.9], [X_SITZ1 + 0.6, 0, ZA + R_SPALT], [X_ANSCHLAG - 1.2, 0, ZA + R_SPALT],
    [X_ANSCHLAG - 0.4, 0, ZA + 1.4], [X_ANSCHLAG + 0.8, 0, ZA], [ENDE_2, 0, ZA]],
};
const BAHNEN = Object.fromEntries(Object.entries(ROUTEN).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]));

// Where there is air, in mm in the cut plane (x0, x1, z0, z1): what the particles may run through. The browser test reads it.
const LUFTWEGE = [
  [ENDE_1, 0, ZA - R_SCHLAUCH_INNEN, ZA + R_SCHLAUCH_INNEN], [0, X_GEW, ZA - 4, ZA + 4],                  // the hose and the bore of the left fitting
  [X_SITZ0, X_KEGEL, ZA - R_SITZ, ZA + R_SITZ], [X_KEGEL, X_SITZ1, ZA - R_BOHR, ZA + R_BOHR],            // the seat's hole and its cone
  [X_SITZ1, X_ANSCHLAG, ZA - R_BOHR, ZA + R_BOHR],                                                       // the chamber with the poppet and the spring
  [X_ANSCHLAG, X_ENDE, ZA - R_DURCH, ZA + R_DURCH], [X_ENDE, ENDE_2 + 1, ZA - 4, ZA + 4],               // the passage and the bore of the right fitting and its hose
];

// Where the browser test reads the drawn colour of each room: a point of air in the cut plane (mm), clear of every part.
const MESSPUNKTE = {
  L: [(X_SITZ0 + X_KEGEL) / 2, ZA],
  R: [(X_ANSCHLAG + X_HEX) / 2, ZA],
};

const KONSTANTEN = `
const HUB = ${M.hub};
const MESSPUNKTE = ${JSON.stringify(MESSPUNKTE)};
const GEO = ${JSON.stringify({ LAENGE: X_HEX, HOEHE, HUB: M.hub, ZA })};
const LUFTWEGE = ${JSON.stringify(LUFTWEGE)};
const P_AUTO = 6;
const OFFEN_AB = ${OFFEN_AB};
const P_VOLL = ${P_VOLL};
const AUTO_SCHRITTE = ${JSON.stringify(AUTO_SCHRITTE)};`;

// What only the check valve knows: the poppet's lift with the spring, the tones of the two rooms, the slider, the vent button and
// the eight-step cycle. The frame, the readout, the automatic button, the slow motion, the half sections and the handle of the
// browser test are figur/schnittseite.mjs.
const eigenes = `
${FEDER_LAUFZEIT}
// --- the model drives everything -------------------------------------------
const zustand = neuerZustand();
let wunsch = 0;                       // bar, what the slider says
let entlueften = false;               // the vent of output 2
let autoIndex = 0;

const tellerTeile = Array.from(svg.querySelectorAll("[data-hub]"));
const regler = document.getElementById("druck-eingang");
const wertAnzeige = document.getElementById("druck-eingang-wert");
const knopfEntlueften = document.getElementById("btn-entlueften");

// The automatic cycle: step 0 is "6 bar at 1"; every click that switches it on starts there.
function autoSetzen(i) {
  autoIndex = i;
  wunsch = AUTO_SCHRITTE[i][0];
  entlueften = AUTO_SCHRITTE[i][1] === 1;
}
function seiteAutoStart() { autoSetzen(0); }
function seiteAutoSchritt() { autoSetzen((autoIndex + 1) % AUTO_SCHRITTE.length); zeichneBedienung(); }

function seiteBedienung() {
  if (regler.value !== String(wunsch)) regler.value = String(wunsch);
  wertAnzeige.textContent = komma(wunsch.toFixed(1)) + " bar";
  knopfEntlueften.setAttribute("aria-pressed", String(entlueften));
}
regler.addEventListener("input", () => { wunsch = regler.valueAsNumber; bedient(true); });
knopfEntlueften.addEventListener("click", () => { entlueften = !entlueften; bedient(true); });

// The poppet lifts off the seat and compresses the spring; it stands home while the valve is taken apart.
const hubMarke = (anteil) => (zustand.h * HUB * anteil).toFixed(3);
function hubStellen(anteil) {
  const dx = zustand.h * HUB * anteil;
  const t = Math.abs(dx) > 1e-4 ? translateAlong(P, [dx, 0, 0]) : null;
  for (const el of tellerTeile) { if (t) el.setAttribute("transform", t); else el.removeAttribute("transform"); }
  federnVerschieben(dx, "b");
}

// A room's tone follows its pressure: pale blue when it is vented, the strong blue from P_VOLL on, a mixture between.
const rauTon = (F, p) => mische(F.abluft, F.druck, Math.min(1, Math.max(0, (p - AUSSEN) / P_VOLL)));
function zeichneLuft(dm, dt) {
  const F = luftFarben();
  const ton = { L: rauTon(F, zustand.p1), R: rauTon(F, zustand.p2) };
  setzeRaumFarben(ton);
  // The one stream carries the model's flow (never negative: a shut poppet carries nothing, even against back pressure) in the tone of
  // the air it comes from, the pressure at 1. It shows only while the poppet is visibly lifted: the way it takes is drawn for the open poppet.
  luftStroeme(dt, { a: ton.L }, { a: zustand.h >= OFFEN_AB ? durchfluss(zustand, H_1_4) : 0 });
}

const anzeigeText = () => anzeigeZeilen(anzeige(zustand, H_1_4)).join("\\n");
function modellSchritt(dm) {
  schritt(zustand, H_1_4, dm, { p1: absolut(wunsch), entlueften });
}

// The symbol beside the card: the ball, and the lines in the tone of their pressure.
const symbolTon = (p) => (p - AUSSEN > 0.5 ? "stark" : "blass");
function zeichneStets() {
  for (const sym of symbole) rueckSymbolStellen(sym, { h: zustand.h, eingang: symbolTon(zustand.p1), ausgang: symbolTon(zustand.p2) });
}

// A handle for the browser test and for screenshots.
figurStarten({
  MASSE: H_1_4,
  geometrie: GEO,
  luftwege: LUFTWEGE,
  messpunkte: MESSPUNKTE,
  bahn: (name) => stroeme[name].bahn,
  // where a point of the cut plane (x along the valve, z up, in mm) is on the screen, in client pixels
  bildPunkt(x, z) {
    const q = iso([x, 0, z], P);
    const pt = svg.createSVGPoint();
    pt.x = q[0];
    pt.y = q[1];
    const r = pt.matrixTransform(svg.getScreenCTM());
    return [r.x, r.y];
  },
  // the cut plane's millimetres (x along the valve, z up) from a position in the drawing: the inverse of the projection there
  zuMm(x, y) {
    const o = iso([0, 0, 0], P), ex = iso([1, 0, 0], P), ez = iso([0, 0, 1], P);
    const a = ex[0] - o[0], b = ez[0] - o[0], c = ex[1] - o[1], d = ez[1] - o[1];
    const det = a * d - b * c;
    return [((x - o[0]) * d - b * (y - o[1])) / det, (a * (y - o[1]) - (x - o[0]) * c) / det];
  },
  P_AUTO,
  modell: () => zustand,
  wunsch: () => wunsch,
  entlueften: () => entlueften,
  zeitlupe: () => zeitlupe,
  autoSchritt: () => autoIndex,
  // the pressure at 1 in bar (gauge) and the vent, the model settled at once: the picture of a state at rest, no particles.
  // p2 (gauge, optional) sets the pressure behind the valve first, as if it had been filled earlier.
  stelle(p1, ent = false, p2 = null) {
    stelleFest();
    wunsch = p1;
    entlueften = ent;
    zustand.p1 = absolut(p1);
    if (p2 !== null) zustand.p2 = absolut(p2);
    for (let i = 0; i < 60; i += 1) schritt(zustand, H_1_4, 0.05, { p1: zustand.p1, entlueften: ent });
    zeichneBedienung();
    zeichneModell(0, 0);
    zeichneStets();
    run();
  },
  // a state set by hand, for screenshots and tests: lift h (0…1), pressures at 1 and 2 in bar (gauge); the model stands still
  zeige(h, p1, p2, ent = false) {
    stelleFest();
    wunsch = p1;
    entlueften = ent;
    zustand.h = h;
    zustand.p1 = absolut(p1);
    zustand.p2 = absolut(p2);
    zeichneBedienung();
    zeichneModell(0, 0);
    zeichneStets();
    run();
  },
  // the same as the controls do: the pressure and the vent change and the model runs on (the cycle stops)
  schalte(p1, ent = false) {
    stoppeAuto();
    wunsch = p1;
    entlueften = ent;
    bedient(false);
  },
});
`;

const live = SS.lebendSkript({
  wurzel: WURZEL, P, MOVE, STAGGER, ansicht: ANSICHT, LEGENDE, BAHNEN, SEITE_VON: { a: "a" },
  ANZAHL: Object.fromEntries(Object.entries(BAHNEN).map(([name, b]) => [name, Math.max(6, Math.round(b.gesamt / 24))])),
  VORNE: Object.keys(BAHNEN),                          // the stream runs in front of everything: the fittings' bores are painted over the housing
  SKALA: { tempo: 0.25, tempoMax: 160, bezug: M.qn },
  AUTO_TAKT: 0.3,                                      // model seconds: at the start's slow motion 1/10 that is 3 s a step
  raumDeckung: 0.97,
  modelle: ["figur/ventil.mjs", "figur/rueckschlagventil.mjs"],
  symbole: [RUECK_SYMBOL_LAUFZEIT],
  konstanten: KONSTANTEN,
  eigenes,
});

const regler = (id, text, beschreibung) => SS.regler(schieber(id, text, { min: 0, max: P_MAX, step: 0.5, wert: 0, einheit: " bar", beschreibung, stellen: 1 }));
const LEISTE = SS.leiste(
  regler("druck-eingang", "Eingang 1", "Druck am Eingang 1 in bar")
  + SS.regler(knopf("btn-entlueften", "Ausgang 2 entlüften", { titel: "Öffnet eine Entlüftungsblende am Ausgang 2, solange der Knopf gedrückt ist" })),
  { zeitlupe: 10 });

const INFO = "Stelle den Druck am Eingang 1 ein oder lass die Automatik laufen: Der Teller hebt ab, sobald der Druck an 1 den Druck an 2 um mehr als 0,1 bar (angenommen) übersteigt. "
  + "Drückt der Ausgang 2 stärker, liegt er fest auf dem Sitz und nichts strömt zurück. Das kräftige Blau steht unter Druck, das blasse ist drucklos. Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const BEIFIGUR = SS.schaltzeichenBlock({
  svg: rueckschlagventilSymbol({ feld: 60 }).svg,
  text: "Die Kugel ist der Ventilteller, die Feder drückt sie in den V-Sitz. Von 1 nach 2 hebt der Druck die Kugel vom Sitz ab (frei), von 2 nach 1 presst er sie hinein (gesperrt). "
    + "Die Teile der Leitung zeigen nur zwei Töne: kräftig ab 0,5 bar, sonst blass; die Zeichnung daneben mischt die Töne nach dem Druck, darum sieht 3 bar dort anders aus als 6 bar. Der Raum hinter dem Sitz kann unter Druck stehen, während die Leitung vor dem Sitz drucklos ist.",
});

// --- The prose underneath ---------------------------------------------------------------------------
const bar = (x) => absolut(x);
const Q1 = durchfluss({ h: 1, p1: bar(6), p2: bar(5) }, M);                       // 1 bar over the open poppet: the catalogue's point
const QMAX = M.qn * M.qMaxFaktor;
const ms = Math.round(M.schaltzeit * 1000);
const ENDE_P2 = komma(6 - M.oeffnungsdruck, 1);                                    // what 2 reaches with 6 bar at 1: p1 minus the opening pressure
const LESETEXT = `<div class="lesetext">
<h2>Was man sieht</h2>
<p>Das Rückschlagventil ist durch seine Mitte aufgeschnitten. Die Zahlen und die Außenmaße stammen vom Festo-Ventil H-1/4-B; <strong>der Katalog zeigt aber keinen Schnitt</strong>, darum ist das Innere <strong>nachgezeichnet nach dem Funktionsprinzip</strong> eines federbelasteten Tellerrückschlagventils: ein eingepresster <strong>Sitzeinsatz</strong> mit Kegelsenkung, ein <strong>Ventilteller</strong> mit Dichtfläche aus Gummi (NBR) und eine schwache <strong>Druckfeder</strong>, die den Teller auf den Sitz drückt.
In der Zeichnung liegt links der Eingang <strong>1</strong> im Innengewinde, rechts der Ausgang <strong>2</strong> am Außengewinde mit Dichtring. Aus dem Katalog stammt nur das Gewinde G1/4; <strong>welches Ende das Innengewinde hat und welches der Eingang ist</strong>, nennt das Datenblatt nicht und ist <strong>angenommen</strong> (das Katalogbild zeigt ein Ende mit Außengewinde und Dichtring und eines mit Innengewinde). In Wirklichkeit wird das Außengewinde in einen Anschluss <strong>eingeschraubt</strong> (der Katalog nennt das Ventil „einschraubbar“) und der Dichtring dichtet gegen diesen Anschluss ab; die Zeichnung zeigt statt des Anschlusses eine Verschraubung. Der Sechskant des Gehäuses ist in der Zeichnung ein <strong>Zylinder</strong>, die rechte Verschraubung eine aufgeschraubte <strong>Hülse</strong> (angenommen: der Katalog zeigt das Gegenstück nicht), und der Dichtring, der in Wirklichkeit blau ist, ist dunkel gezeichnet, weil Blau in dieser Sammlung der Luft gehört.
Hub und Federweg sind überhöht, alle Innenmaße angenommen.</p>

<h2>Offen, zu, fester zu</h2>
<p>Das Ventil lässt die Luft nur <strong>von 1 nach 2</strong> durch. Es öffnet, sobald der Druck am Eingang den Druck am Ausgang um mehr als ${komma(M.oeffnungsdruck, 1)} bar übersteigt (<strong>Öffnungsdruck</strong>, angenommen: von der Schwesterreihe H-QS des Katalogs übernommen); ab ${komma(M.vollDp, 1)} bar Unterschied ist der Teller im Modell ganz offen. Drückt dagegen der Ausgang stärker als der Eingang, presst dieser Druck den Teller <strong>fester</strong> auf den Sitz: Es strömt nichts zurück.</p>
<table class="wahrheit">
<caption>Zustände des Rückschlagventils (Δp = Druck an 1 minus Druck an 2)</caption>
<thead><tr><th scope="col">Druckunterschied</th><th scope="col">Teller</th><th scope="col">Luft</th></tr></thead>
<tbody>
<tr><td>Δp &gt; ${komma(M.oeffnungsdruck, 1)} bar (angenommen)</td><td>offen (zwischen ${komma(M.oeffnungsdruck, 1)} und ${komma(M.vollDp, 1)} bar erst teilweise, ab ${komma(M.vollDp, 1)} bar ganz)</td><td>strömt von 1 nach 2</td></tr>
<tr><td>Δp ≤ ${komma(M.oeffnungsdruck, 1)} bar</td><td>zu</td><td>nichts strömt</td></tr>
<tr><td>p2 &gt; p1 (Gegendruck)</td><td>zu, fester angedrückt</td><td>nichts strömt zurück</td></tr>
</tbody>
</table>
<p>Die Automatik spielt das in acht Schritten durch: 6 bar an 1 (der Teller öffnet, 2 füllt sich), halten, 1 auf 0 (der Teller schließt), halten, 3 bar an 1 (weniger als an 2: der Teller bleibt zu), halten, den Ausgang 2 entlüften, halten. Mit dem Regler und dem Knopf „Ausgang 2 entlüften“ stellst du jeden Fall selbst ein.</p>

<h2>Der Druck bleibt eingesperrt</h2>
<p>Fällt der Druck an 1 auf null, schließt die Feder den Teller, und der Ausgang 2 behält seinen Druck, bis er auf anderem Weg entlüftet wird: Ein Spannzylinder bleibt gespannt, auch wenn die Leitung abfällt. Das Modell ist dabei ideal dicht, ein echtes Ventil verliert etwas.
<strong>Achtung bei der Anzeige:</strong> Mit ${komma(6, 0)} bar an 1 steigt der Druck an 2 nur bis ${ENDE_P2} bar. Dann beträgt der Unterschied nur noch ${komma(M.oeffnungsdruck, 1)} bar, der Teller schließt wieder, und die Anzeige zeigt „${ENDE_P2} bar“ und „Δp ${komma(M.oeffnungsdruck, 1)} bar“. Das ist der Öffnungsdruck (angenommen), kein Fehler. Der Teller braucht im Modell ${ms} ms bis ganz offen (angenommen); mit der Zeitlupe siehst du ihn auf dem Weg.</p>
<p class="formel">
Teller ganz offen, ${komma(1, 0)} bar Druckabfall: <strong>${Q1} l/min</strong> (Katalog: Normnenndurchfluss)<br>
Teller zu, in beide Richtungen: <strong>0 l/min</strong>
</p>

<h2>Wozu das gut ist</h2>
<p>Das Rückschlagventil <strong>hält Druck</strong> (eine Spannvorrichtung bleibt gespannt, wenn der Druck abfällt) und <strong>verhindert das Rückströmen</strong> (aus einem Behälter in den Kompressor, aus einem Zweig in den anderen). Es steckt als Baustein in anderen Ventilen: in der Rückschlagklappe des <a href="../Drosselrueckschlagventil/">Drosselrückschlagventils</a>; das <a href="../Wechselventil/">Wechselventil</a> arbeitet nach demselben Prinzip. Eingebaut wird es <strong>in Durchflussrichtung</strong>: Eingang 1 zur Druckquelle, Ausgang 2 zum Verbraucher; das Schaltzeichen zeigt die Richtung, in der die Kugel frei ist.
Das <em>entsperrbare</em> Rückschlagventil, das sich von außen öffnen lässt, ist nicht Teil dieser Seite.</p>
<p class="hinweis">Alle Zahlen kommen aus dem Modell, das auch den Teller und die Farben bewegt. Katalog sind nur ${M.qn} l/min bei ${komma(M.bezugsDp, 0)} bar Druckabfall, G1/4 an beiden Anschlüssen, der Betriebsdruck von 0,4 bis 12 bar (die Regler gehen bis ${P_MAX} bar und beginnen bei 0 bar; unter 0,4 bar gilt das nur im Modell, ein echtes Ventil ist dafür nicht angegeben) und die Maße 48 mm lang, Schlüsselweite 19 mm, Gewinde 8 mm.
Alles andere ist angenommen: Der Durchfluss wächst im Modell linear mit dem Druckabfall; ein echtes Ventil drosselt bei großem Druckabfall ab. Die Anzeige begrenzt ihn deshalb auf das Doppelte des Katalogwerts, <strong>${QMAX} l/min</strong>, und schreibt dann „(begrenzt)“ dazu (zum Beispiel bei ${komma(5, 0)} bar Druckabfall, wo linear ${5 * M.qn} l/min herauskämen). Angenommen sind außerdem die ${komma(M.volumen2 / 1000, 0)} cm³ hinter dem Ausgang, die Entlüftungsblende (Zeitkonstante ${komma(M.entlueftZeit, 1)} s, damit man das Entlüften in der Zeitlupe sieht) und alle Maße im Inneren. Die Teilchen zeigen die Luft in der Schnittebene und nur, solange der Teller sichtbar abgehoben ist.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

const TABELLE_CSS = `.lesetext table.wahrheit { border-collapse: collapse; margin: 0 0 11px; max-width: 100%; font-variant-numeric: tabular-nums }
.lesetext table.wahrheit caption { text-align: left; font-size: 12.5px; padding-bottom: 5px; color: color-mix(in srgb, currentColor 80%, transparent) }
.lesetext table.wahrheit th, .lesetext table.wahrheit td { border: 1px solid color-mix(in srgb, currentColor 30%, transparent); padding: 6px 12px; text-align: left }
.lesetext table.wahrheit th { background: var(--anatomy-card); color: var(--anatomy-strong); font-weight: 600; line-height: 1.3 }`;
const KERN_CSS = `.iso { --schnitt-k: #d6d2c6 }\n.iso-svg .iso-shade[data-schnitt="k"][data-shade] { fill: var(--schnitt-k) }`;
const EIGENES_CSS = `${KERN_CSS}\n${VS.CSS}\n.kammer { opacity: .97 }\n${RUECK_SYMBOL_CSS}\n${SS.CSS}\n${SS.GUMMI_CSS}\n${TABELLE_CSS}`;
SS.seiteSchreiben({
  ziel: ZIEL,
  css: EIGENES_CSS,
  titel: "Rückschlagventil – Pneumatik",
  kartenTitel: "Rückschlagventil",
  hinweis: "Eingang 1, Entlüften, Automatik, Zeitlupe, zerlegen",
  anzeige: ANZEIGE,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft unter Druck" },
    { mark: "dotted", label: "Blasses Blau: drucklos; dazwischen Mischtöne nach dem Druck" },
    { mark: "lit", label: "Ventilteller – er hebt ab, wenn 1 höher ist als 2" },
    { mark: "dim", label: "Alles ist durch die Mitte aufgeschnitten; Hub und Federweg sind überhöht, der Sechskant ist ein Zylinder" },
  ],
  caption: "Rückschlagventil, G1/4 (Vorbild Festo H-1/4-B), im Schnitt durch die Mitte, das Innere nachgezeichnet nach dem Funktionsprinzip: Die Feder drückt den Teller auf den Sitz. Der Druck von links hebt ihn ab, und die Luft strömt durch den Ringspalt nach rechts; der Druck von rechts presst ihn fester auf den Sitz und sperrt.",
  svg,
  leiste: LEISTE,
  legende: LEGENDE,
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  buehneLabel: "Rückschlagventil im Schnitt: Sitz, Ventilteller, Feder und Baugruppen",
  beiFigur: BEIFIGUR,
});

console.log(FEDER_TEXT);
ST.ende({
  ziel: ZIEL,
  mitte: ANSICHT.MITTE,
  view1: ANSICHT.VIEW1,
  allow: [
    // Parts that stand in a half-cut hole of the housing: the cut face is in front of their back half
    // and behind their front half, so no drawing order is right. The housing is drawn first and its
    // hollows are painted over the cut face, which is what the eye expects.
    ["gehaeuse.koerper", "gehaeuse.sitz"], ["gehaeuse.koerper", "teller.*"], ["gehaeuse.koerper", "feder.*"], ["gehaeuse.sitz", "teller.*"],
    ["gehaeuse.koerper", "anschluss1.*"], ["gehaeuse.koerper", "anschluss2.*"], ["gehaeuse.koerper", "leitung.*"], ["gehaeuse.koerper", "dichtring.*"],
    ["teller.*", "feder.*"], ["dichtring.*", "anschluss2.*"], ["dichtring.*", "dichtring.*"],
  ],
  crowd: [],
  // The section of a whole fitting with its hose stub hangs on the stub's item; the other parts of the fitting
  // and the hose have bodies of their own.
  cover: ["anschluss1.gewinde", "anschluss2.gewinde", "dichtring.schnur:0"],
});
