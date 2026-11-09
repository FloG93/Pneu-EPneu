// A 3/2 directional valve, spool type, in the size of ISO 5599-1 size 1
// (G1/4) on its sub-base, as an isometric section in the plane of the spool.
// Dimensions in mm, 1 world unit = 1 mm. The width of 42 mm is catalogue
// (Festo VSVA size 1); everything else is an assumption and is listed in the
// README of the figure.
//
// Two spools are drawn in the same bore, as data-variante="nc" and "no": the
// normally closed valve (rest: 2→3, actuated: 1→2) and the normally open one
// (rest: 1→2, actuated: 2→3). The page shows one of them. Both are checked
// against the model's path description (VENTIL_3_2_NC / _NO) and its overlap.
//
// This script holds geometry, data tables and the legend; explode springs,
// depth sorting and the page shell come from ../../figur/. It follows
// ../../Wegeventil-5-2/tests/tools/build-ventil.mjs closely: the same camera,
// the same section tone, the same stepped sub-base.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is
// kept is the one at y ≤ 0, its cut face at y = 0 looks at the viewer, and
// the ports leave the sub-base towards +y.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import * as EX from "../../../figur/explode.mjs";
import * as LEG from "../../../figur/legende.mjs";
import { ISO_5599_GR1, wegeOffen, ventilWege } from "../../../figur/ventil.mjs";
import { VENTIL_3_2_NC, VENTIL_3_2_NO } from "../../../figur/schaltzeichen.mjs";
import { seite, knopf } from "../../../figur/seite.mjs";
import { gehaeuseSchnitt, bogen, nahtlos } from "../../../figur/gehaeuse.mjs";
import { normteile, stummel, sechskant, federPruefen, SCHNITT_CSS } from "../../../figur/normteile.mjs";
import { LEGENDE } from "./legende-ventil-3-2.mjs";

const W = 900;
const H = 800;

// --- Dimensions ----------------------------------------------------------
const M = ISO_5599_GR1;
const HUB = M.hub;                   // 7, spool stroke
const RB = M.bohrung / 2;            // 6.5, spool bore
const RK = M.steuerkolben / 2;       // 10, pilot piston bore
const ZA = 44;                       // spool axis height

const GEH = { x0: 0, x1: 90, y0: -21, z0: 18, z1: 66 };            // housing, back half
const PLATTE = { x0: -6, x1: 96, y0: -24, y1: 24, z0: 0, z1: 17 };  // sub-base
const DICHT = { x0: -1, x1: 91, y0: -22, z0: 17, z1: 18 };          // flat gasket, 1 mm proud all round
const ZP = (PLATTE.z0 + PLATTE.z1) / 2;  // 8.5, port axis; the cut steps down to it in front

const PORT = { 1: 25, 2: 45, 3: 65 };
const FOLGE = [1, 2, 3];             // along the spool
const R_KANAL = 4;                   // channel Ø 8 from the bore down into the sub-base
const R_NUT = 10.5;                  // ring groove in the bore (assumption)
const NUT_HALB = 7;                  // groove 14 wide, so the webs between are 6
const R_GEWINDE = 6.5;               // G1/4, outside Ø 13.2
const R_STUMMEL = R_GEWINDE - 0.2;   // the threaded stub of a fitting, clear of the half-cut thread
const Y_BOHR = -R_KANAL - 0.5;       // where the port drilling ends, just behind the channel

// End caps: a little smaller than the body, so the joint shows.
const KAPPE = { y0: -20, z0: 23, z1: 65 };
const KS = { x0: -22, x1: 0, wand: -17 };    // control cap: chamber from the wall face to the body; the thread sits just inside the wall
const KR = { x0: 90, x1: 112, wand: 107 };   // return cap: closed, with the spring
const R_KAMMER = RK;                 // pilot chamber = piston bore
const R_KOLBEN = RK - 0.2;
const KOLBEN = [-13, -7];            // pilot piston at rest, against the end of the spool
const STEUER_X = -14.5;              // pilot port, over the pilot chamber
const R_STEUER_GEWINDE = 2.5;        // M5
const R_STEUER_BOHRUNG = 1.5;

// Return spring: on a 2 mm plate at the spool's end, against the cap's end
// wall. It must still fit at full stroke: see federPruefen() in figur/normteile.mjs.
const FEDER = { sitz: 2, draht: 1.1, windungen: 4.5, rWindung: 7 };
const FEDER_RESERVE = 1;             // mm the spring must stay above its block length at full stroke

// --- The spool ------------------------------------------------------------
// The lands are placed from the overlap: a web between two grooves opens when
// a land edge leaves it. The set of the actuated position (field 0) must begin
// to open at s_a = (0.5 + ü/2)·hub, the set of the rest position (field 1) at
// s_b = (0.5 − ü/2)·hub.
const S_A = (0.5 + M.ueberdeckung / 2) * HUB;
const S_B = (0.5 - M.ueberdeckung / 2) * HUB;
const NUTEN = FOLGE.map((nr) => [PORT[nr] - NUT_HALB, PORT[nr] + NUT_HALB]);
const STEGE = [
  [GEH.x0, NUTEN[0][0]],
  ...NUTEN.slice(1).map((n, i) => [NUTEN[i][1], n[0]]),
  [NUTEN[2][1], GEH.x1],
];
// STEGE[0] = left end web, [1] = web 1|2, [2] = web 2|3, [3] = right end web
const R_BUND = RB - 0.2;             // land, 0.2 clearance in the bore
const R_HALS = 3.6;                  // neck between the lands
const SP = [-7, 90];                 // spool ends at rest
const RING_B = 2.2;
const R_RINGNUT = R_BUND - 1;
/**
 * The two spools. A land edge that enters a web from the left closes it when
 * the spool moves (+x); a land edge that leaves it to the right opens it.
 *  - NC: rest 2→3, actuated 1→2. One middle land: its left edge sits S_A inside
 *    web 1|2 (shut at rest, opens at s_a), its right edge S_B before web 2|3
 *    (open at rest, shuts after s_b). End lands only seal the ends.
 *  - NO: rest 1→2, actuated 2→3. A long left land (its right edge S_B before
 *    web 1|2) and a long right land (its left edge S_A inside web 2|3).
 * Each ring sits on a web in the position in which it seals. Both spools carry
 * a ring at x = 4 and one at x = 81, in the same place: the legend number of
 * the rings hangs on one of these, so it points at a ring in either variant.
 */
const SPULEN = {
  nc: {
    art: VENTIL_3_2_NC,
    bunde: [[SP[0], 11], [STEGE[1][1] - S_A, STEGE[2][0] - S_B], [64, SP[1]]],
    ringe: [4, 9, STEGE[1][1] - S_A + 2.6, STEGE[2][0] - S_B - 2.6, 76, 81],
  },
  no: {
    art: VENTIL_3_2_NO,
    bunde: [[SP[0], STEGE[1][0] - S_B], [STEGE[2][1] - S_A, SP[1]]],
    ringe: [4, STEGE[1][0] - S_B - 2.6, STEGE[2][1] - S_A + 2.6, 81],
  },
};

// --- Frames ----------------------------------------------------------------
const FX = G.frameOf([0, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]);          // spool axis
const FY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]); // ports
const FZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]); // channels, pilots

// --- Fittings ----------------------------------------------------------------
// Along their own axis, from the face they are screwed into.
const VERSCHRAUBUNG = { gewinde: [12, 24], sechskant: [24, 28.5], rS: 7.6, koerper: [28.5, 35], rK: 6, ring: [35, 36.5], rR: 5.2 };
const DAEMPFER = { gewinde: [12, 24], sechskant: [24, 28], rS: 7.6, hals: [28, 29.5], rH: 5.5, sinter: [29.5, 40], rD: 6.5, kuppe: 2 };
const STEUER_V = { gewinde: [59, 65], sechskant: [65, 69], rS: 5, koerper: [69, 73], rK: 3.6, ring: [73, 74.5], rR: 3 };
const R_SCHLAUCH = 4;                // 8/6 hose
const R_SCHLAUCH_INNEN = 3;
const R_STEUERSCHLAUCH = 2;          // 4/2.5 hose
const R_STEUERSCHLAUCH_INNEN = 1.25;

const Y_SCHLAUCH = VERSCHRAUBUNG.ring[1];
const Z_STEUERSCHLAUCH = STEUER_V.ring[1];
const WEGE = {
  1: stummel([PORT[1], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[1], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  2: stummel([PORT[2], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[2], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  st: stummel([STEUER_X, 0, Z_STEUERSCHLAUCH], [0, 0, 1], [STEUER_X, 13, 88], [0, 0.85, 0.53], 4),
};

// --- Projection --------------------------------------------------------------
const P = k.fitProjection(
  [
    [PLATTE.x0, PLATTE.y0, 0], [PLATTE.x1, PLATTE.y0, 0], [PLATTE.x1, PLATTE.y1, 0], [PLATTE.x0, PLATTE.y1, 0],
    [KS.x0 - 5, KAPPE.y0, KAPPE.z1], [KR.x1 + 5, KAPPE.y0, KAPPE.z1], [KR.x1 + 5, 0, KAPPE.z0],
    [GEH.x0, GEH.y0, GEH.z1 + 5], [GEH.x1, GEH.y0, GEH.z1 + 5],
    ...Object.values(WEGE).flatMap((w) => [w[w.length - 1].map((v, j) => v + (j === 2 ? 6 : 0)), w[w.length - 1].map((v, j) => v - (j === 2 ? 6 : 0))]),
    [PORT[3], PLATTE.y1 + DAEMPFER.sinter[1] + 4, ZP - 8], [PORT[3], PLATTE.y1 + DAEMPFER.sinter[1] + 4, ZP + 8],
  ],
  W, H, { pad: 40, azimuth: 38, elevation: 34 },
);

const at = (p) => k.iso(p, P);
const V = G.viewOf(P);
const SV = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const linie = (punkte) => punkte.map(at).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const ring3 = (punkte) => SCH.pfad(punkte.map(at));
const TAU = Math.PI * 2;

// --- Assemblies: the explode tables (all the maths lives in figur/explode.mjs) --
// Looking from +x/+y/+z: the kept half is y <= 0, ports and fittings point +y, towards the viewer.
const PIECE_OF = {
  grundplatte: "grundplatte", dichtung: "dichtung", gehaeuse: "gehaeuse", schieber: "schieber",
  ringe: "ringe", kappe: "kappe", rueckstell: "rueckstell", schrauben: "schrauben",
  daempfer: "daempfer", leitung: "leitung", steuerleitung: "steuerleitung",
};
// Outside first; closing walks it backwards. Rings sit directly before the spool and leave with it.
const STAGGER = [
  "steuerleitung", "leitung", "daempfer", "schrauben", "rueckstell", "kappe",
  "ringe", "schieber", "gehaeuse", "dichtung", "grundplatte",
];
const MOVE = {
  steuerleitung: [0, 0, 70],      // pilot line straight up out of its cap thread
  leitung: [0, 60, 0],            // hoses and fittings out of the ports, towards the viewer
  daempfer: [0, 80, 0],           // the same way, further: so its number does not sit on the fittings'
  schrauben: [0, 0, 82],          // the two top screws up and clear of the lifted housing
  rueckstell: [106, 0, 0],        // return cap beyond the end of the pulled spool, with its screws
  kappe: [-45, 0, 0],             // control cap with its piston and screws, off to the left
  ringe: [98, 0, 15],             // leaves with the spool, lifted so the rings stay distinct
  schieber: [98, 0, 0],           // out of the bore until clear of the housing
  gehaeuse: [0, 0, 50],           // housing straight up
  dichtung: [0, 0, 22],           // gasket between housing and base
  grundplatte: [0, 0, -35],       // base straight down
};

// --- Recording ------------------------------------------------------------------
const R = A.recorder(P);
const rec = R.solid;
let GRUPPE = "grundplatte";
function put(pos, svg, shapes = [], extra = {}) {
  const { bias = 0, gruppe = GRUPPE, name = gruppe, hub = false, variante = null, ...rest } = extra;
  let inhalt = svg;
  // Parts that ride with the spool sit in an inner group the page shifts;
  // the outer group stays where it is.
  if (hub) inhalt = `<g data-hub="">${inhalt}</g>`;
  if (variante) inhalt = `<g data-variante="${variante}">${inhalt}</g>`;
  R.put({ name: R.nameFor(name), piece: PIECE_OF[gruppe], label: PIECE_OF[gruppe], move: MOVE[PIECE_OF[gruppe]], at: pos, pos, bias, gruppe, svg: inhalt, shapes: shapes.flat(), ...rest });
}
// The shared standard parts (figur/normteile.mjs) draw into this figure's recorder.
const NT = normteile({ P, rec, put, gruppe: (g) => { GRUPPE = g; } });
const { flach, schnitt } = NT;
// The body section helpers (figur/gehaeuse.mjs) draw into this figure's recorder.
const { innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung, kanalInnen, aufNut, aufGewinde, box, boxenOhne, unterLoch, schnittEnde } =
  gehaeuseSchnitt({ P, rec, FX, FZ, NUTEN, RB, R_NUT, ZA, GEH, R_KANAL, ZP, R_GEWINDE });
// --- Sub-base ----------------------------------------------------------------------
// The cut steps: behind the port axis it runs at y = 0 like the body, in front
// it drops to the port axis, so each port is seen as an L — down from the
// groove, then forward to the thread — and the fittings stay whole.
const STUFE = { y0: 0, y1: PLATTE.y1, z1: ZP };
const STUECKE = [PLATTE.x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_GEWINDE, PORT[nr] + R_GEWINDE]), PLATTE.x1];

function grundplatte() {
  GRUPPE = "grundplatte";
  const hinten = { x0: PLATTE.x0, x1: PLATTE.x1, y0: PLATTE.y0, y1: 0, z0: 0, z1: PLATTE.z1 };
  const teile = [
    `<path class="iso-halo" d="${k.haloOf({ x: PLATTE.x0, y: PLATTE.y0, w: PLATTE.x1 - PLATTE.x0, d: PLATTE.y1 - PLATTE.y0, r: 2 }, 0, PLATTE.z1, P)}"/>`,
    flach([[hinten.x0, hinten.y0, hinten.z1], [hinten.x1, hinten.y0, hinten.z1], [hinten.x1, 0, hinten.z1], [hinten.x0, 0, hinten.z1]], [0, 0, 1]),
    flach([[hinten.x1, hinten.y0, 0], [hinten.x1, 0, 0], [hinten.x1, 0, hinten.z1], [hinten.x1, hinten.y0, hinten.z1]], [1, 0, 0]),
  ];
  // Behind the cut: the end of each port drilling and the channel coming down into it.
  const innenTeile = [];
  for (const nr of FOLGE) {
    const x = PORT[nr];
    const F = FY(x, ZP);
    innenTeile.push(flach(Array.from({ length: 37 }, (_, i) => G.pointOf(F, Y_BOHR, R_GEWINDE, (i / 36) * TAU)), [0, 1, 0]));
    innenTeile.push(bohrungInnen(F, Y_BOHR, 0, R_GEWINDE, 0, TAU, 48));
    innenTeile.push(kanalInnen(x, aufGewinde(x), () => PLATTE.z1));
  }
  teile.push(nahtlos(innenTeile.join("")));
  // The cut face behind the step: between the ports, each piece bounded by the
  // channel above and the half-round of the port drilling below.
  const tiefe = Math.sqrt(R_GEWINDE ** 2 - R_KANAL ** 2);
  const kanten = [];
  const halb = (x, von, bis) => bogen(von, bis, 12).map((t) => [x + R_GEWINDE * Math.cos(t), 0, ZP + R_GEWINDE * Math.sin(t)]);
  const grenzen = [PLATTE.x0, ...FOLGE.map((nr) => PORT[nr]), PLATTE.x1];
  for (let i = 0; i < grenzen.length - 1; i += 1) {
    const links = i > 0 ? grenzen[i] : null;
    const rechts = i < grenzen.length - 2 ? grenzen[i + 1] : null;
    const punkte = [];
    if (links === null) punkte.push([PLATTE.x0, 0, ZP]);
    else punkte.push(...halb(links, Math.atan2(tiefe, R_KANAL), 0), [links + R_GEWINDE, 0, ZP]);
    if (rechts === null) punkte.push([PLATTE.x1, 0, ZP], [PLATTE.x1, 0, PLATTE.z1]);
    else punkte.push(...halb(rechts, Math.PI, Math.PI - Math.atan2(tiefe, R_KANAL)), [rechts - R_KANAL, 0, PLATTE.z1]);
    if (links === null) punkte.push([PLATTE.x0, 0, PLATTE.z1]);
    else punkte.push([links + R_KANAL, 0, PLATTE.z1]);
    if (links !== null) punkte.push([links + R_KANAL, 0, ZP + tiefe]);
    // `halb` from the port's right already starts at the channel wall.
    teile.push(schnitt(punkte));
    kanten.push(ring3(punkte));
  }
  teile.push(L(kanten.join(""), { tone: "mid" }));
  teile.push(L(linie([[hinten.x0, hinten.y0, hinten.z1], [hinten.x1, hinten.y0, hinten.z1], [hinten.x1, hinten.y0, 0], [hinten.x1, 0, 0]])
    + linie([[hinten.x1, hinten.y0, hinten.z1], [hinten.x1, 0, hinten.z1]]), { tone: "mid" }));
  put([(PLATTE.x0 + PLATTE.x1) / 2, -12, ZP], teile.join(""), [
    box([hinten.x0, hinten.y0, 0], [hinten.x1, 0, hinten.z1], { name: "grundplatte.hinten", ground: true }),
  ], { name: "grundplatte.hinten" });

  // The step in front, one piece between two ports. Each piece carries the
  // trough of the port to its right: you look into it over this piece, and
  // the next piece covers its near wall.
  for (let i = 0; i < STUECKE.length; i += 2) {
    const [xa, xb] = [STUECKE[i], STUECKE[i + 1]];
    const st = [];
    st.push(schnitt([[xa, 0, ZP], [xb, 0, ZP], [xb, STUFE.y1, ZP], [xa, STUFE.y1, ZP]]));
    if (xb === PLATTE.x1) st.push(flach([[xb, 0, 0], [xb, STUFE.y1, 0], [xb, STUFE.y1, ZP], [xb, 0, ZP]], [1, 0, 0]));
    const nr = FOLGE[i / 2];
    const formen = [box([xa, 0, 0], [xb, STUFE.y1 - 0.1, ZP], { name: "grundplatte.stufe", ground: true })];
    if (nr !== undefined) {
      const x = PORT[nr];
      st.push(nahtlos(bohrungInnen(FY(x, ZP), 0, STUFE.y1, R_GEWINDE, Math.PI, TAU, 48)));
      formen.push(unterLoch(x, ZP, R_GEWINDE, 0, STUFE.y1 - 0.1, 0, { name: "grundplatte.stufe", ground: true }));
    }
    st.push(L(ring3([[xa, 0, ZP], [xb, 0, ZP], [xb, STUFE.y1, ZP], [xa, STUFE.y1, ZP]]), { tone: "mid" }));
    if (xb === PLATTE.x1) st.push(L(linie([[xb, 0, 0], [xb, STUFE.y1, 0], [xb, STUFE.y1, ZP]]), { tone: "mid" }));
    put([(xa + xb) / 2, STUFE.y1 / 2, ZP / 2], st.join(""), formen, { name: "grundplatte.stufe" });
  }

  // The front face with the five threads, cut in half by the step.
  const vorne = [[PLATTE.x0, PLATTE.y1, 0], [PLATTE.x1, PLATTE.y1, 0], [PLATTE.x1, PLATTE.y1, ZP]];
  for (const nr of FOLGE.slice().reverse()) {
    const x = PORT[nr];
    vorne.push(...bogen(0, -Math.PI, 18).map((t) => [x + R_GEWINDE * Math.cos(t), PLATTE.y1, ZP + R_GEWINDE * Math.sin(t)]));
  }
  vorne.push([PLATTE.x0, PLATTE.y1, ZP]);
  const vornFormen = [];
  for (let i = 0; i < STUECKE.length; i += 2) {
    vornFormen.push(box([STUECKE[i], PLATTE.y1 - 0.1, 0], [STUECKE[i + 1], PLATTE.y1, ZP], { name: "grundplatte.front", ground: true }));
    const nr = FOLGE[i / 2];
    if (nr !== undefined) vornFormen.push(unterLoch(PORT[nr], ZP, R_GEWINDE, PLATTE.y1 - 0.1, PLATTE.y1, 0, { name: "grundplatte.front", ground: true }));
  }
  put([(PLATTE.x0 + PLATTE.x1) / 2, PLATTE.y1, ZP / 2], [
    flach(vorne, [0, 1, 0]),
    L(ring3(vorne), { tone: "mid" }),
  ].join(""), vornFormen, { name: "grundplatte.front" });
}

// --- Gasket --------------------------------------------------------------------------
function dichtung() {
  GRUPPE = "dichtung";
  const { x0, x1, y0, z0, z1 } = DICHT;
  const teile = [
    flach([[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [x0, 0, z1]], [0, 0, 1]),
    flach([[x1, y0, z0], [x1, 0, z0], [x1, 0, z1], [x1, y0, z1]], [1, 0, 0]),
  ];
  const innenTeile = FOLGE.map((nr) => kanalInnen(PORT[nr], () => z0, () => z1));
  teile.push(nahtlos(innenTeile.join("")));
  const grenzen = [x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_KANAL, PORT[nr] + R_KANAL]), x1];
  const kanten = [];
  for (let i = 0; i < grenzen.length; i += 2) {
    const q = [[grenzen[i], 0, z0], [grenzen[i + 1], 0, z0], [grenzen[i + 1], 0, z1], [grenzen[i], 0, z1]];
    teile.push(schnitt(q));
    kanten.push(ring3(q));
  }
  // The front edges are the outlines of the cut pieces; a box edge there
  // would run straight across the channels.
  teile.push(L(kanten.join("") + linie([[x0, 0, z1], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, 0, z0]])
    + linie([[x1, y0, z1], [x1, 0, z1]]), { tone: "mid" }));
  put([(x0 + x1) / 2, y0 / 2, (z0 + z1) / 2], teile.join(""),
    [box([x0, y0, z0], [x1, 0, z1], { name: "dichtung.platte" })], { name: "dichtung.platte" });
}

// --- Housing ---------------------------------------------------------------------------
// Two items, because the spool lies between them in depth: the part above the
// bore covers the top of the spool's back half, the spool covers the rest.
function gehaeuse() {
  GRUPPE = "gehaeuse";
  const { x0, x1, y0, z0, z1 } = GEH;
  const stege = STEGE;

  // Below the axis: the bore, the channels and the lower cut face.
  const unten = [];
  const innenTeile = [gehaeuseBohrung()];
  for (const nr of FOLGE) innenTeile.push(nahtlos(kanalInnen(PORT[nr], () => z0, aufNut)));
  unten.push(...innenTeile);
  unten.push(flach([[x1, y0, z0], [x1, 0, z0], [x1, 0, ZA - RB],
    ...bogen((3 * Math.PI) / 2, Math.PI, 12).map((t) => G.pointOf(FX, x1, RB, t)), [x1, y0, ZA]], [1, 0, 0]));
  const schlitze = [x0, ...FOLGE.flatMap((nr) => [PORT[nr] - R_KANAL, PORT[nr] + R_KANAL]), x1];
  const kantenU = [];
  for (let i = 0; i < schlitze.length; i += 2) {
    const [a, b] = [schlitze[i], schlitze[i + 1]];
    const q = [[a, 0, z0], [b, 0, z0], ...bohrungsKante(b, a, -1)];
    unten.push(schnitt(q));
    kantenU.push(ring3(q));
  }
  unten.push(L(kantenU.join("") + linie([[x1, y0, ZA], [x1, y0, z0], [x1, 0, z0]]), { tone: "mid" }));
  const formenU = [
    box([x0, y0, z0], [x1, 0, ZA - R_NUT], { name: "gehaeuse.unten" }),
    box([x0, y0, ZA - R_NUT], [x1, -R_NUT, ZA + R_NUT], { name: "gehaeuse.unten" }),
    ...stege.flatMap(([a, b]) => [
      box([a, -R_NUT, ZA - R_NUT], [b, 0, ZA - RB], { name: "gehaeuse.unten" }),
      box([a, -R_NUT, ZA - RB], [b, -RB, ZA + RB], { name: "gehaeuse.unten" }),
    ]),
  ];
  put([(x0 + x1) / 2, -10, ZA - 12], unten.join(""), formenU, { name: "gehaeuse.unten" });

  // Above the axis: the upper cut face, the top and the port numbers on it,
  // the way they are cast into a real body.
  const oben = [];
  const qOben = [[x0, 0, z1], [x1, 0, z1], ...bohrungsKante(x1, x0, 1)];
  oben.push(flach([[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [x0, 0, z1]], [0, 0, 1]));
  oben.push(flach([[x1, y0, ZA], [x1, -RB, ZA],
    ...bogen(Math.PI, Math.PI / 2, 12).map((t) => G.pointOf(FX, x1, RB, t)), [x1, 0, z1], [x1, y0, z1]], [1, 0, 0]));
  oben.push(schnitt(qOben));
  for (const nr of FOLGE) {
    oben.push(k.faceTextSvg(k.topMatrix([PORT[nr], -9.5], z1, P), String(nr), { size: 8, tone: "mid", anchor: "middle" }));
  }
  oben.push(L(ring3(qOben) + linie([[x0, 0, z1], [x0, y0, z1], [x1, y0, z1], [x1, 0, z1]])
    + linie([[x1, y0, z1], [x1, y0, ZA]]), { tone: "mid" }));
  const formenO = [
    box([x0, y0, ZA + R_NUT], [x1, 0, z1], { name: "gehaeuse.oben" }),
    ...stege.map(([a, b]) => box([a, -R_NUT, ZA + RB], [b, 0, ZA + R_NUT], { name: "gehaeuse.oben" })),
  ];
  put([(x0 + x1) / 2, -10, ZA + 14], oben.join(""), formenO, { name: "gehaeuse.oben" });
}

// --- Spool and its rings ---------------------------------------------------------------
function schieberProfil({ bunde, ringe }) {
  const f = 0.6;                         // chamfer on every land edge
  const p = [];
  bunde.forEach(([a, b], i) => {
    if (i > 0) p.push([a, R_HALS]);
    p.push([a, R_BUND - f], [a + f, R_BUND]);
    for (const x of ringe.filter((x) => x > a && x < b)) {
      p.push([x - RING_B / 2, R_BUND], [x - RING_B / 2, R_RINGNUT], [x + RING_B / 2, R_RINGNUT], [x + RING_B / 2, R_BUND]);
    }
    p.push([b - f, R_BUND], [b, R_BUND - f]);
    if (i < bunde.length - 1) p.push([b, R_HALS]);
  });
  return p;
}

// The two spools fill the same bore on purpose: the page shows one of them. A
// shared owner tells the support check they are not sunk into each other by
// mistake. Each spool alone is audited without this excuse: `--audit --nur=nc`
// and `--audit --nur=no` leave the other one out.
const VARIANTEN = "schieber.variante";

/**
 * One of the two spools with its seal rings. Everything that rides with the
 * spool sits in an inner data-hub group; the variant group around it is what
 * the page shows or hides. The two spools fill the same bore on purpose.
 */
function schieber(variante) {
  const { ringe } = SPULEN[variante];
  GRUPPE = "schieber";
  const profil = schieberProfil(SPULEN[variante]);
  put([(SP[0] + SP[1]) / 2, 0, ZA], [
    // The true silhouette, not the convex hull: the hull would paint paper
    // over the gaps round the necks, which is exactly where the air flows.
    SV(G.solidOf(profil, FX, P, { fill: "surface" }), { tone: "hi" }),
    L(G.circleOf(FX, SP[1], 2.2, P), { tone: "faint" }),
  ].join(""), [rec(A.solid(FX, profil, { name: `${variante}.kolben`, owner: VARIANTEN }))],
  { name: `${variante}.kolben`, hub: true, variante });

  // Each ring wraps the spool, so it is drawn in two halves: the far half
  // before the spool, the near half after it. Rubber: one dark tone.
  GRUPPE = "ringe";
  const m = SCH.naechsterWinkel(FX, P);
  // The near half reaches a little past each limb, so the outline belongs to it.
  const [v0, v1] = [m - Math.PI / 2 - 0.1, m + Math.PI / 2 + 0.1];
  const band = (x0, x1, r, a0, a1) => {
    const w = bogen(a0, a1, 24);
    return [...w.map((t) => G.pointOf(FX, x0, r, t)), ...w.slice().reverse().map((t) => G.pointOf(FX, x1, r, t))];
  };
  const sektoren = (x0, x1, a0, a1, name, rIn = R_RINGNUT) => Array.from({ length: 24 }, (_, i) => {
    const [u, v] = [a0 + ((a1 - a0) * i) / 24, a0 + ((a1 - a0) * (i + 1)) / 24];
    const quad = [[rIn, u], [R_BUND, u], [R_BUND, v], [rIn, v]].map(([r, t]) => [r * Math.cos(t), r * Math.sin(t)]);
    return rec(A.prism(FX, quad, x0, x1, { name, owner: VARIANTEN }));
  });
  const gummi = (punkte) => `<path class="iso-fill" d="${ring3(punkte)}"/><path class="iso-shade" data-shade="0" d="${ring3(punkte)}"/>`;
  for (const x of ringe) {
    const [x0, x1] = [x - RING_B / 2, x + RING_B / 2];
    const kreis = (r) => bogen(0, TAU, 48).map((t) => G.pointOf(FX, x1, r, t));
    const hinten = band(x0, x1, R_BUND, v1, v0 + TAU);
    const innenHinten = band(x0, x1, R_RINGNUT, m - Math.PI / 2, m + Math.PI / 2);
    put([x, 0, ZA], [
      gummi(hinten), gummi(innenHinten),
      `<path class="iso-fill" fill-rule="evenodd" d="${ring3(kreis(R_BUND))}${ring3(kreis(R_RINGNUT))}"/>`,
      `<path class="iso-shade" data-shade="0" fill-rule="evenodd" d="${ring3(kreis(R_BUND))}${ring3(kreis(R_RINGNUT))}"/>`,
      L(ring3(hinten) + ring3(kreis(R_BUND)) + ring3(kreis(R_RINGNUT)), { tone: "hi" }),
    ].join(""), sektoren(x0, x1, v1, v0 + TAU, `${variante}.ring.hinten`),
    { name: `${variante}.ring.hinten`, hub: true, variante });
    const vorn = band(x0, x1, R_BUND, v0, v1);
    put([x, 0, ZA], gummi(vorn) + L(ring3(vorn), { tone: "hi" }),
      // Recorded as the skin that is drawn: the rest of the near half sits in
      // the groove, and its end face is hidden behind the neighbouring land.
      // Recorded whole, that end face would read as "spool in front of ring".
      sektoren(x0, x1, v0, v1, `${variante}.ring.vorn`, R_BUND - 0.05),
      { name: `${variante}.ring.vorn`, hub: true, variante });
  }
}

// --- End caps ---------------------------------------------------------------------------
// The control cap on the left is cut like the body: the pilot chamber, the
// drilling up to the pilot port, and the threaded hole for the fitting (half
// of it is cut away). The cut face is split where the piston and the fitting's
// stub lie between its pieces in depth: what is behind them is one item, what
// is in front of them another.
const zk = ZA + R_KAMMER;
const zu = ZA - R_KAMMER;
const NR_STEUER = { nc: "12", no: "10" };

function steuerkappe() {
  GRUPPE = "kappe";
  const { x0, x1, wand } = KS;
  const { y0, z0, z1 } = KAPPE;
  const steuerX = STEUER_X;
  const [ka, kb] = [wand, x1];        // chamber
  const [wa, wb] = [x0, wand];        // end wall
  const zg = z1 - (STEUER_V.gewinde[1] - STEUER_V.gewinde[0]);  // bottom of the thread
  const [ga, gb] = [steuerX - R_STEUER_GEWINDE, steuerX + R_STEUER_GEWINDE];
  const [ba, bb] = [steuerX - R_STEUER_BOHRUNG, steuerX + R_STEUER_BOHRUNG];
  // Recorded material leaves out the thread (a stub sits in it) and the drilling below it.
  const loecher = [[[ga, y0, zk], [gb, 0, z1]]];
  const bohrung = [[ba, -R_STEUER_BOHRUNG, zk], [bb, 0, zg]];
  const n = (teil) => `kappe.${teil}`;

  // Behind everything inside: the chamber, the drillings, the cut face below.
  const unten = [];
  unten.push(nahtlos([
    bohrungInnen(FX, ka, kb, R_KAMMER, Math.PI / 2, (3 * Math.PI) / 2),
    // The chamber's closed end below the axis; the half above belongs to the end wall item.
    flanke(FX, wand, 0, R_KAMMER, Math.PI, (3 * Math.PI) / 2, [1, 0, 0]),
  ].join("")));
  // The pilot drilling, its far half.
  unten.push(nahtlos(innen(
    (t, e) => { const p = G.pointOf(FZ(steuerX, 0), 0, R_STEUER_BOHRUNG, t); return [p[0], p[1], e ? zg : ZA + Math.sqrt(R_KAMMER ** 2 - p[1] ** 2)]; },
    (t) => G.mul3(G.radialOf(FZ(steuerX, 0), t), -1),
    bogen(Math.PI, TAU, 12),
  )));
  const qU = [[x0, 0, z0], [x1, 0, z0], [x1, 0, zu], [wand, 0, zu], [wand, 0, ZA], [x0, 0, ZA]];
  unten.push(schnitt(qU), L(ring3(qU), { tone: "mid" }));
  put([(ka + kb) / 2, -10, zu - 4], unten.join(""), [
    // Below the chamber, and the wall behind it. The wall behind runs the
    // full length, so no face of this item is buried in the end wall.
    box([x0, y0, z0], [x1, 0, zu], { name: n("unten") }),
    box([x0, y0, zu], [x1, -R_KAMMER, zk], { name: n("unten") }),
    box([wa, -R_KAMMER, zu], [wb, 0, ZA], { name: n("unten") }),
  ], { name: n("unten") });

  // The back wall of the thread lies behind the fitting's stub, while the cut
  // face on either side of it lies in front of the stub's back half: so the
  // material behind the thread is its own item, between the two.
  // It takes the column under the thread down to the chamber, with the two
  // narrow strips of cut face beside the drilling.
  const streifen = [[[ga, 0, zk], [ba, 0, zk], [ba, 0, zg], [ga, 0, zg]], [[bb, 0, zk], [gb, 0, zk], [gb, 0, zg], [bb, 0, zg]]];
  put([steuerX, -R_STEUER_GEWINDE - 1, z1 - 3], [
    nahtlos(bohrungInnen(FZ(steuerX, 0), zg, z1, R_STEUER_GEWINDE, Math.PI, TAU, 16)),
    ...streifen.map(schnitt),
    L(streifen.map(ring3).join(""), { tone: "mid" }),
  ].join(""), [
    box([ga, y0, zg], [gb, -R_STEUER_GEWINDE, z1], { name: n("gewindegrund") }),
    boxenOhne([ga, y0, zk], [gb, 0, zg], [bohrung], { name: n("gewindegrund") }),
  ], { name: n("gewindegrund") });

  const deckel = [[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [gb, 0, z1],
    ...bogen(0, -Math.PI, 16).map((t) => [steuerX + R_STEUER_GEWINDE * Math.cos(t), R_STEUER_GEWINDE * Math.sin(t), z1]),
    [ga, 0, z1], [x0, 0, z1]];
  // The pilot number is cast into the cap's top: 12 on the normally closed
  // valve, 10 on the normally open one. Each belongs to its variant.
  const nummer = Object.entries(NR_STEUER).map(([variante, text]) => `<g data-variante="${variante}">`
    + k.faceTextSvg(k.topMatrix([x0 + 8, y0 + 6], z1, P), text, { size: 6.5, tone: "mid", anchor: "middle" }) + "</g>").join("");

  // The end wall above the axis lies behind the piston and the stub.
  const qW = [[x0, 0, ZA], [wand, 0, ZA], [wand, 0, zk], [ga, 0, zk], [ga, 0, z1], [x0, 0, z1]];
  put([(wa + wb) / 2, -10, zk], flanke(FX, wand, 0, R_KAMMER, Math.PI / 2, Math.PI, [1, 0, 0]) + schnitt(qW) + L(ring3(qW), { tone: "mid" }),
    [...boxenOhne([wa, -R_KAMMER, ZA], [wb, 0, zk], loecher, { name: n("wand") }),
      ...boxenOhne([wa, y0, zk], [wb, 0, z1], loecher, { name: n("wand") })],
    { name: n("wand") });
  // Above the chamber: in front of the piston's top and of the stub's back.
  const qO = [[gb, 0, zk], [x1, 0, zk], [x1, 0, z1], [gb, 0, z1]];
  put([(wb + x1) / 2, -10, z1 - 4], [
    flach(deckel, [0, 0, 1]), schnitt(qO), nummer,
    L(ring3(qO) + ring3(deckel), { tone: "mid" }),
  ].join(""), boxenOhne([wb, y0, zk], [x1, 0, z1], loecher, { name: n("oben") }), { name: n("oben") });
}

/** The return cap on the right: the same chamber, closed, with no pilot port. */
function rueckstellkappe() {
  GRUPPE = "rueckstell";
  const { x0, x1, wand } = KR;
  const { y0, z0, z1 } = KAPPE;
  const n = (teil) => `rueckstell.${teil}`;

  const qU = [[x0, 0, z0], [wand, 0, z0], [wand, 0, zu], [x0, 0, zu]];
  put([(x0 + wand) / 2, -10, zu - 4], [
    nahtlos(bohrungInnen(FX, x0, wand, R_KAMMER, Math.PI / 2, (3 * Math.PI) / 2)),
    schnitt(qU), L(ring3(qU), { tone: "mid" }),
  ].join(""), [
    box([x0, y0, z0], [wand, 0, zu], { name: n("unten") }),
    box([x0, y0, zu], [wand, -R_KAMMER, zk], { name: n("unten") }),
  ], { name: n("unten") });

  // Above the chamber, with the closed top: in front of the spring.
  const deckel = [[x0, y0, z1], [x1, y0, z1], [x1, 0, z1], [x0, 0, z1]];
  const qO = [[x0, 0, zk], [wand, 0, zk], [wand, 0, z1], [x0, 0, z1]];
  put([(x0 + wand) / 2, -10, z1 - 4], [
    flach(deckel, [0, 0, 1]) + L(ring3(deckel), { tone: "mid" }),
    schnitt(qO), L(ring3(qO), { tone: "mid" }),
  ].join(""), boxenOhne([x0, y0, zk], [wand, 0, z1], [], { name: n("oben") }), { name: n("oben") });

  // The end wall and its outer face: in front of all that is inside.
  const qW = [[wand, 0, z0], [x1, 0, z0], [x1, 0, z1], [wand, 0, z1]];
  put([(wand + x1) / 2, -10, ZA], [
    flach([[x1, y0, z0], [x1, 0, z0], [x1, 0, z1], [x1, y0, z1]], [1, 0, 0]),
    schnitt(qW),
    L(ring3(qW) + linie([[x1, y0, z1], [x1, y0, z0], [x1, 0, z0]]), { tone: "mid" }),
  ].join(""), boxenOhne([wand, y0, z0], [x1, 0, z1], [], { name: n("wand") }), { name: n("wand") });
}

/** The pilot piston with its lip seal, built at rest and shifted by the page. */
function steuerkolben() {
  GRUPPE = "kappe";
  const [a, b] = KOLBEN;
  const m = (a + b) / 2;
  put([m, 0, ZA], [
    SV(G.disc(a, b, R_KOLBEN, FX, P), { tone: "hi" }),
    SV(G.ringBand(m - 1.2, m + 1.2, R_KOLBEN - 0.8, R_KOLBEN + 0.01, FX, P), { tone: "hi" }).replace(/data-shade="\d"/g, 'data-shade="0"'),
    L(G.circleOf(FX, b, 3.2, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FX, a, b, R_KOLBEN, { name: "kappe.kolben" }))], { name: "kappe.kolben", hub: true });
}

function rueckstellung() {
  // A spring on a seat at the end of the spool, against the cap's end wall.
  GRUPPE = "rueckstell";
  const sitz = [KR.x0, KR.x0 + FEDER.sitz];
  const R_DRAHT = FEDER.draht / 2, R_WINDUNG = FEDER.rWindung;
  const wendel = NT.druckfeder(FX, sitz[1] + R_DRAHT, KR.wand - R_DRAHT, FEDER);
  put([(sitz[1] + KR.wand) / 2, 0, ZA], [
    `<g data-hub="">${SV(G.disc(sitz[0], sitz[1], 8.2, FX, P), { tone: "hi" })}</g>`,
    // Each piece carries the x of its middle: the page compresses the coil by
    // shifting every piece in proportion to its distance from the end wall.
    ...wendel,
  ].join(""), [
    rec(A.disc(FX, sitz[0], sitz[1], 8.2, { name: "rueckstell.federsitz" })),
    rec(A.ring(FX, sitz[1], KR.wand, R_WINDUNG - R_DRAHT, R_WINDUNG + R_DRAHT, { name: "rueckstell.feder" })),
  ], { name: "rueckstell.feder", feder: [sitz[1], KR.wand] });
}

// --- Screws --------------------------------------------------------------------------------
function schrauben() {
  GRUPPE = "schrauben";
  for (const x of [7, 83]) {
    const F = FZ(x, -12);
    put([x, -12, GEH.z1 + 2], NT.schraubenkopf(F, GEH.z1, GEH.z1 + 4.5, 4.2),
      [rec(A.disc(F, GEH.z1, GEH.z1 + 4.5, 4.2, { name: "schrauben.oben" }))], { name: "schrauben.oben" });
  }
  // The cap screws fasten the end caps: whoever takes a cap off takes its
  // screws with it, so they belong to the cap's assembly, not to this one.
  for (const [x, richtung, kappe] of [[KS.x0, -1, "kappe"], [KR.x1, 1, "rueckstell"]]) {
    for (const z of [KAPPE.z0 + 6, KAPPE.z1 - 6]) {
      const F = G.frameOf([0, -12, z], [richtung, 0, 0], [0, 1, 0], [0, 0, 1]);
      const s0 = richtung * x;
      put([x + richtung * 2, -12, z], NT.schraubenkopf(F, s0, s0 + 4, 3.6),
        [rec(A.disc(F, s0, s0 + 4, 3.6, { name: `${kappe}.schraube` }))], { name: `${kappe}.schraube`, gruppe: kappe });
    }
  }
}

// --- Threads, fittings, silencers -------------------------------------------------------------
function anschluesse() {
  for (const nr of [1, 2]) {
    NT.verschraubung(FY(PORT[nr], ZP), VERSCHRAUBUNG, "leitung", `leitung.verschraubung${nr}`,
      ([a, b]) => [PORT[nr], (a + b) / 2, ZP], R_STUMMEL);
  }
  NT.schalldaempfer(FY(PORT[3], ZP), DAEMPFER, 3, ([a, b]) => [PORT[3], (a + b) / 2, ZP], R_STUMMEL);

  // The pilot fitting in the control cap: M5, a smaller push-in fitting.
  const x = STEUER_X;
  const F = FZ(x, 0);
  const D = STEUER_V;
  GRUPPE = "steuerleitung";
  put([x, 0, (D.gewinde[0] + D.gewinde[1]) / 2], NT.gewinde(F, D.gewinde[0], D.gewinde[1], R_STEUER_GEWINDE - 0.2),
    [rec(A.disc(F, D.gewinde[0], D.gewinde[1], R_STEUER_GEWINDE - 0.2, { name: "steuerleitung.gewinde" }))],
    { name: "steuerleitung.gewinde" });
  const hx = sechskant(D.rS);
  put([x, 0, (D.sechskant[0] + D.ring[1]) / 2], [
    SV(G.prismOf(F, hx, D.sechskant[0], D.sechskant[1], P), { tone: "mid" }),
    SV(G.disc(D.koerper[0], D.koerper[1], D.rK, F, P), { tone: "hi" }),
    SV(G.disc(D.ring[0], D.ring[1], D.rR, F, P), { tone: "hi" }),
  ].join(""), [
    rec(A.prism(F, hx, D.sechskant[0], D.sechskant[1], { name: "steuerleitung.sechskant" })),
    rec(A.disc(F, D.koerper[0], D.koerper[1], D.rK, { name: "steuerleitung.koerper" })),
    rec(A.disc(F, D.ring[0], D.ring[1], D.rR, { name: "steuerleitung.ring" })),
  ], { name: "steuerleitung.verschraubung" });
}

// --- Hoses -----------------------------------------------------------------------------------------
function schlaeuche() {
  for (const [nr, punkte] of Object.entries(WEGE)) {
    const steuer = nr === "st";
    const gruppe = steuer ? "steuerleitung" : "leitung";
    const r = steuer ? R_STEUERSCHLAUCH : R_SCHLAUCH;
    const ri = steuer ? R_STEUERSCHLAUCH_INNEN : R_SCHLAUCH_INNEN;
    GRUPPE = gruppe;
    const name = steuer ? "steuerleitung.schlauch" : `leitung.schlauch${nr}`;
    // The far end is cut off in the air on purpose: it is no tip that must land on a part.
    R.route(name, punkte, r, { piece: PIECE_OF[gruppe], move: MOVE[PIECE_OF[gruppe]], ends: [true, false], free: [true, false] });
    const stuecke = tubePieces(punkte, r, P, { maxLength: 14 });
    stuecke.forEach((teil, i) => {
      const letztes = i === stuecke.length - 1;
      put(teil.mid, tubeSvg(teil, { tone: "mid" }) + (letztes ? schnittEnde(punkte, r, ri) : ""),
        [A.tube(teil.points, teil.radii)],
        { name: `${name}:${i}`, route: name, chunk: i });
    });
  }
}

// --- The overlap, measured on the drawn edges ------------------------------------------------------
/**
 * From the land edges and the groove edges: at which spool travel does each
 * web open? A web is open while no land covers any of it. The figure must
 * show the overlap the model computes with, or the drawing teaches a different
 * valve than the one the page simulates. Checked for BOTH spools, against the
 * path description of that spool (which web belongs to which field) and against
 * wegeOffen: the same number of switch points, at the same spool travel.
 */
function ueberdeckungPruefen(variante) {
  const { art, bunde } = SPULEN[variante];
  const offen = (steg, s) => bunde.every(([a, b]) => b + s <= steg[0] || a + s >= steg[1]);
  const schritte = 7000;
  const fehler = [];
  const wege = ventilWege(art);
  const verlauf = {};   // web -> { geometrie, modell }
  // Every field of the description names the webs it joins: [1,2] is web 1|2, [2,3] is web 2|3.
  art.felder.forEach((paare, feld) => {
    for (const [von, nach] of paare) {
      const steg = von < nach ? `${von}|${nach}` : `${nach}|${von}`;
      const stegIndex = Math.min(von, nach);       // web 1|2 = STEGE[1], web 2|3 = STEGE[2]
      verlauf[steg] = {
        feld,
        geometrie: Array.from({ length: schritte + 1 }, (_, i) => offen(STEGE[stegIndex], (i / schritte) * HUB)),
        modell: Array.from({ length: schritte + 1 }, (_, i) => {
          const o = wegeOffen(i / schritte, M.ueberdeckung);
          return (feld === 0 ? o.a : o.b) > 0;
        }),
      };
    }
  });
  const umschlaege = (v) => v.map((x, i) => (i > 0 && x !== v[i - 1] ? i : -1)).filter((i) => i >= 0);
  for (const [steg, { geometrie, modell }] of Object.entries(verlauf)) {
    if (geometrie[0] !== modell[0] || geometrie[schritte] !== modell[schritte]) {
      fehler.push(`Steg ${steg}: Anfang/Ende ${geometrie[0]}/${geometrie[schritte]} statt ${modell[0]}/${modell[schritte]}`);
    }
    const g = umschlaege(geometrie), m = umschlaege(modell);
    if (g.length !== 1 || m.length !== 1) fehler.push(`Steg ${steg}: ${g.length} Umschlagpunkte gezeichnet, ${m.length} im Modell (verlangt je 1)`);
    else if (Math.abs(g[0] - m[0]) / schritte > 0.05) fehler.push(`Steg ${steg}: öffnet/schließt bei ${(g[0] / schritte).toFixed(3)} gezeichnet, ${(m[0] / schritte).toFixed(3)} im Modell`);
  }
  // Rest position: the supply reaches port 2 exactly when the description says so.
  const ruhe12 = verlauf["1|2"].geometrie[0];
  if (ruhe12 !== wege[2].ruheOffen) fehler.push(`Ruhestellung: 1→2 ist ${ruhe12 ? "offen" : "zu"}, die Beschreibung sagt ${wege[2].ruheOffen ? "offen" : "zu"}`);
  // Exactly one of the two webs is open in rest, and the other one in the actuated position.
  if (verlauf["1|2"].geometrie[0] === verlauf["2|3"].geometrie[0]) fehler.push("Ruhestellung: beide Stege gleich (offen oder zu)");
  if (verlauf["1|2"].geometrie[schritte] === verlauf["2|3"].geometrie[schritte]) fehler.push("Betätigt: beide Stege gleich (offen oder zu)");
  // The end webs must stay sealed over the whole stroke.
  for (const steg of [STEGE[0], STEGE[3]]) {
    if (Array.from({ length: 101 }, (_, i) => offen(steg, (i / 100) * HUB)).some(Boolean)) fehler.push(`Endsteg ${steg} öffnet`);
  }
  // The overlap, as the 5/2 script measures it: the web of field 0 starts to
  // open at s_a, the web of field 1 stops being open at s_b; the difference
  // is the overlap.
  const web0 = Object.values(verlauf).find((v) => v.feld === 0).geometrie;
  const web1 = Object.values(verlauf).find((v) => v.feld === 1).geometrie;
  const oeffnetA = (web0.indexOf(true) / schritte) * HUB;
  const oeffnetB = (web1.lastIndexOf(true) / schritte) * HUB;
  const gemessen = (oeffnetA - oeffnetB) / HUB;
  if (Math.abs(gemessen - M.ueberdeckung) > 0.05) fehler.push(`Überdeckung ${gemessen.toFixed(3)} statt ${M.ueberdeckung}`);
  if (fehler.length) {
    console.error(`Überdeckung (${variante.toUpperCase()}) falsch gezeichnet:\n  ${fehler.join("\n  ")}`);
    process.exit(1);
  }
  return { variante, oeffnetA, oeffnetB, gemessen };
}

// --- Compose ---------------------------------------------------------------------------------------------
const UEBERDECKUNG = [ueberdeckungPruefen("nc"), ueberdeckungPruefen("no")];
const FEDERTEXT = (() => {
  try {
    return federPruefen({ laenge: KR.wand - (KR.x0 + FEDER.sitz), draht: FEDER.draht, windungen: FEDER.windungen }, HUB, FEDER_RESERVE);
  } catch (e) { console.error(e.message); process.exit(1); }
})();

grundplatte();
dichtung();
gehaeuse();
// `--nur=nc` / `--nur=no`: build one spool only, to audit it against the rest without any excuse.
const NUR = process.argv.find((a) => a.startsWith("--nur="))?.slice("--nur=".length);
for (const variante of Object.keys(SPULEN)) if (!NUR || NUR === variante) schieber(variante);
steuerkappe();
steuerkolben();
rueckstellkappe();
rueckstellung();
schrauben();
anschluesse();
schlaeuche();

const LEGENDE_IDS = LEGENDE.map((e) => e.piece);
for (const it of R.items) {
  if (!LEGENDE_IDS.includes(it.piece)) throw new Error(`Teil ${it.name} hat keine Legendennummer (${it.piece})`);
}
if (STAGGER.length !== LEGENDE_IDS.length || !LEGENDE_IDS.every((id) => STAGGER.includes(id))) {
  throw new Error("STAGGER und LEGENDE nennen nicht dieselben Baugruppen");
}

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

// A number hangs on a part that is visible in every variant: a part of one
// variant only is hidden in the other and would leave the leader pointing at
// nothing (or at the other spool's neck). A part counts as visible in both when
// it carries no variant, or when each other variant has a part of the same
// assembly at exactly the same place (the spool's middle, the rings at x = 4 and 81).
const VARIANTEN_NAMEN = Object.keys(SPULEN).filter((v) => !NUR || v === NUR);
const eigeneVariante = (it) => /^<g data-variante="(\w+)"/.exec(it.svg ?? "")?.[1] ?? null;
const gleicherOrt = (a, b) => a.pos.every((v, i) => Math.abs(v - b.pos[i]) < 1e-6);
const inAllenVarianten = (it) => {
  if (!/data-variante=/.test(it.svg ?? "")) return true;
  const eigene = eigeneVariante(it);
  if (!eigene) return false;                    // a variant only inside (the pilot number)
  return VARIANTEN_NAMEN.every((v) => v === eigene
    || R.items.some((o) => o.piece === it.piece && eigeneVariante(o) === v && gleicherOrt(o, it)));
};
const { KEYS, LIFT, VIEW0, VIEW1, MITTE } = EX.vorbereiten(R, P, MOVE, W, H, { anker: inAllenVarianten });

// Proof, for every variant: each number's anchor is the place of a part of its
// assembly that this variant shows.
for (const v of VARIANTEN_NAMEN) {
  for (const [id, c] of Object.entries(MITTE)) {
    const sichtbar = R.items.some((it) => it.piece === id && it.pos && gleicherOrt(it, { pos: c })
      && (!/data-variante=/.test(it.svg ?? "") || eigeneVariante(it) === v));
    if (!sichtbar) throw new Error(`Nummer ${id}: im ${v.toUpperCase()}-Ventil hängt sie an keinem sichtbaren Teil (${c.join(", ")})`);
  }
}

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein 3/2-Wegeventil in Schieberbauart nach ISO 5599-1, Größe 1, auf seiner Grundplatte, in der Ebene des Schiebers aufgeschnitten. "
    + "Man sieht die Bohrung mit drei Ringnuten, den Steuerschieber mit Bunden und Dichtringen, die drei Kanäle hinunter in die Grundplatte "
    + "und die Anschlüsse 1 (Druckluft), 2 (Arbeitsanschluss) und 3 (Abluft) mit Schläuchen und Schalldämpfer. Links sitzt die Steuerkappe "
    + "mit dem Steuerkolben und dem Steueranschluss, rechts die Rückstellkappe mit der Druckfeder. "
    + "Gezeichnet ist die Ruhestellung: beim Ventil mit Ruhestellung gesperrt (NC) ist 2 mit 3 verbunden und 1 gesperrt, "
    + "beim Ventil mit Ruhestellung offen (NO) ist 1 mit 2 verbunden und 3 gesperrt.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}"${it.feder ? ` data-feder="${it.feder.join(" ")}"` : ""}>${it.svg}</g>`).join(""),
  ],
})
  // The page starts with the normally closed valve: the normally open spool and its number are hidden.
  .replaceAll('<g data-variante="no">', '<g data-variante="no" hidden="">');

// --- Preview ---------------------------------------------------------------------------------------------
// The finished page is built in a later step. Until then `--vorschau=<file>`
// writes the drawing with its legend and the take-apart run, so the figure can
// be looked at; add `?variante=no` to the address to see the normally open spool.
const vorschauArg = process.argv.find((a) => a.startsWith("--vorschau="));
if (vorschauArg) {
  const ziel = vorschauArg.slice("--vorschau=".length);
  mkdirSync(dirname(ziel), { recursive: true });
  const vorschauLauf = `
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
window.__vorschau = { offen: offenAnteil, spiele, MITTE, MOVE, P };
const q = new URLSearchParams(location.search).get("variante");
if (q === "no" || q === "nc") for (const el of document.querySelectorAll("[data-variante]")) {
  if (el.dataset.variante === q) el.removeAttribute("hidden");
  else el.setAttribute("hidden", "");
}
`;
  writeFileSync(ziel, seite({
    titel: "3/2-Wegeventil – Vorschau",
    fig: "Bild 1",
    kartenTitel: "3/2-Wegeventil, Längsschieber",
    hinweis: "Vorschau der Geometrie",
    anzeige: "Vorschau",
    schluessel: [
      { mark: "lit", label: "Schieber, Dichtringe und Steuerkolben – was sich bewegt" },
      { mark: "dim", label: "Gehäuse, Kappen und Grundplatte sind in der Ebene des Schiebers aufgeschnitten" },
    ],
    caption: "Längsschieberventil nach ISO 5599-1, Größe 1 (G1/4), in Ruhestellung.",
    svg,
    leiste: knopf("btn-explode", "Zerlegen und zusammenbauen"),
    legende: LEG.knoepfe(LEGENDE),
    infoText: "Vorschau der Legende und des Zerlegens.",
    lesetext: "",
    laufzeit: vorschauLauf,
    breite: 1240,
    buehneLabel: "3/2-Wegeventil im Schnitt",
  }).replace("</style>", `${SCHNITT_CSS}\n[data-variante][hidden] { display: none }\n</style>`));
  console.log(`Vorschau geschrieben: ${ziel}`);
}

console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
for (const u of UEBERDECKUNG) {
  console.log(`Überdeckung ${u.variante.toUpperCase()}: Weg des betätigten Feldes öffnet bei ${u.oeffnetA.toFixed(2)} mm, der der Ruhe schließt bei ${u.oeffnetB.toFixed(2)} mm `
    + `→ ${(u.gemessen * 100).toFixed(1)} % des Hubs (Modell ${M.ueberdeckung * 100} %)`);
}
console.log(FEDERTEXT);
console.log(`Nummern an: ${Object.keys(MITTE).join(", ")}`);

if (process.argv.includes("--apart")) {
  // Everything at the end of its escape path: do the assemblies pass through one another?
  for (const shape of R.solids) shape.move = MOVE[shape.piece] ?? [0, 0, 0];
  const probleme = A.solidClearances(R.solids, { state: 1 });
  for (const p of probleme.slice(0, 20)) {
    console.log(`  ${p.a ?? p.one ?? ""} × ${p.b ?? p.two ?? ""}  ${JSON.stringify(p).slice(0, 150)}`);
  }
  console.log(`Ansicht auseinandergefahren: ${VIEW1.map((v) => v.toFixed(0)).join(" ")}`);
  console.log(probleme.length ? `auseinandergefahren: ${probleme.length} Durchdringungen` : "auseinandergefahren: sauber");
  if (probleme.length) process.exit(1);
}

if (process.argv.includes("--audit")) {
  A.auditOrExit(R, P, {
    allow: NUR ? [] : [
      // The two spools fill the same bore on purpose and the page shows one of
      // them: no drawing order between them is right, and none is ever seen.
      // (They also share the owner "schieber.variante", so the support check
      // does not call them sunk.) Each spool alone passes without this entry:
      // `--audit --nur=nc`, `--audit --nur=no`.
      ["nc.kolben", "no.kolben"],
    ],
    crowd: [],
    cover: [],
  });
}
