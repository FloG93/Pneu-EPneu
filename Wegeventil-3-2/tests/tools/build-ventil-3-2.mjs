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
import * as LU from "../../../figur/luft.mjs";
import { ISO_5599_GR1, wegeOffen, ventilWege, neuesVentil, ventilAnzeige, ventilSchaltzeit } from "../../../figur/ventil.mjs";
import { VENTIL_3_2_NC, VENTIL_3_2_NO, wegeventilSymbol, SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { seite, knopf, hausBedienung, modulQuelle } from "../../../figur/seite.mjs";
import { ventilRaeume } from "../../../figur/ventilraeume.mjs";
import * as VS from "../../../figur/ventilseite.mjs";
import { LAUFZEIT as BEDIENUNG_LAUFZEIT } from "../../../figur/bedienung.mjs";
import { gehaeuseSchnitt, bogen, nahtlos } from "../../../figur/gehaeuse.mjs";
import { normteile, stummel, sechskant, federPruefen } from "../../../figur/normteile.mjs";
import { LEGENDE } from "./legende-ventil-3-2.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..", "..");

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
// The cut-open body (sub-base, gasket, housing) and the recorder's put() are
// figur/gehaeuse.mjs; this valve says where its bore, grooves and channels lie.
const GH = gehaeuseSchnitt({
  P, R, PIECE_OF, MOVE, FX, FY, FZ, NUTEN, STEGE, FOLGE, PORT, RB, R_NUT, ZA, GEH, PLATTE, DICHT, R_KANAL, ZP, R_GEWINDE, Y_BOHR,
  R_KAMMER, R_KOLBEN, KAPPE, STEUER_V, R_STEUER_GEWINDE, R_STEUER_BOHRUNG, SP, R_HALS, R_BUND, R_RINGNUT, RING_B,
  R_SCHLAUCH, R_SCHLAUCH_INNEN, R_STEUERSCHLAUCH, R_STEUERSCHLAUCH_INNEN,
});
const { put, inGruppe, NT, flach, schnitt, rec, grundplatte, dichtung, gehaeuse,
  schieber, kappe, steuerkolben, federsitz, schrauben, schlaeuche,
  innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung, kanalInnen, aufNut, aufGewinde,
  box, boxenOhne, unterLoch, schnittEnde } = GH;

// The two spools fill the same bore on purpose: the page shows one of them. A
// shared owner tells the support check they are not sunk into each other by
// mistake. Each spool alone is audited without this excuse: `--audit --nur=nc`
// and `--audit --nur=no` leave the other one out.
const VARIANTEN = "schieber.variante";

// --- End caps ---------------------------------------------------------------------------
// The control cap on the left is cut like the body: the pilot chamber, the
// drilling up to the pilot port, and the threaded hole for the fitting (half
// of it is cut away). The cut face is split where the piston and the fitting's
// stub lie between its pieces in depth: what is behind them is one item, what
// is in front of them another.
const zk = ZA + R_KAMMER;
const zu = ZA - R_KAMMER;
const NR_STEUER = { nc: "12", no: "10" };

/** The return cap on the right: the same chamber, closed, with no pilot port. */
function rueckstellkappe() {
  inGruppe("rueckstell");
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
  inGruppe("steuerleitung");
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

// --- Air: the rooms that fill, and the routes the particles take ---------------------------------------
// Every room is drawn on the cut plane y = 0, over the opening of the hollow
// it fills. It is appended to the item that draws that hollow, so it takes
// exactly that item's place in the painter's order: a fittings stub that
// stands in front of a channel stays in front of its air as well. The shapes
// are figur/ventilraeume.mjs; this valve says where its necks lie.
const ZK0 = KAPPE.z1 - (STEUER_V.gewinde[1] - STEUER_V.gewinde[0]);  // bottom of a pilot thread
const KAMMER = { st: [KS.wand, KOLBEN[0]], z: [ZA - R_KAMMER, ZA + R_KAMMER] };
const RA = ventilRaeume({
  P, PORT, GEH, PLATTE, DICHT, ZA, ZP, RB, R_NUT, NUT_HALB, R_KANAL, R_GEWINDE, R_HALS, R_BUND,
  GEWINDE_START: VERSCHRAUBUNG.gewinde[0], R_STEUER_BOHRUNG, ZK0, KAMMER_Z: KAMMER.z,
});
/**
 * The necks of a spool, at rest, and whose air each one holds. A neck's air is
 * the air of the groove it lies in, so the room is named after that port:
 *  - NC: the left neck lies in groove 1 (supply, shut at rest); the right neck
 *    joins 2 and 3 at rest and sits in groove 3 when actuated, so it is the
 *    air of 3 (exhaust: pale while venting, empty once ambient).
 *  - NO: the one neck always holds groove 2 (supply at rest, vented actuated).
 */
const HALS_RAUM = { nc: ["1", "3"], no: ["2"] };
const necks = (variante) => {
  const { bunde } = SPULEN[variante];
  const orte = bunde.slice(1).map((b, i) => [bunde[i][1], b[0]]);
  if (orte.length !== HALS_RAUM[variante].length) throw new Error(`${variante}: Hälse und Räume passen nicht zusammen`);
  return orte.map((ort, i) => ({ raum: HALS_RAUM[variante][i], ort }));
};
/** Air of one variant only: hidden together with its spool. */
const luft = (variante, inhalt) => `<g data-variante="${variante}" data-luft="">${inhalt}</g>`;

function luftEinfuellen() {
  const item = (name) => {
    const it = R.items.find((i) => i.name === name);
    if (!it) throw new Error(`kein Teil ${name} für die Luft`);
    return it;
  };
  item("gehaeuse.unten").svg += FOLGE.map((nr) => RA.raumUnten(nr)).join("");
  item("dichtung.platte").svg += FOLGE.map(RA.raumDichtung).join("");
  item("grundplatte.hinten").svg += FOLGE.map(RA.raumPlatte).join("");
  // The step pieces in the order they were built: piece i carries the trough of FOLGE[i].
  const stufen = R.items.filter((i) => i.name.startsWith("grundplatte.stufe"));
  FOLGE.forEach((nr, i) => { stufen[i].svg += RA.raumRinne(nr); });
  item("kappe.unten").svg += RA.raumSteuer("st", STEUER_X, KAMMER.st);
  for (const variante of Object.keys(SPULEN)) {
    if (NUR && NUR !== variante) continue;
    // Below the axis the gap round a neck lies behind the spool; above it, after the spool.
    item("gehaeuse.unten").svg += luft(variante, necks(variante).map((n) => RA.raumGruppe(n.raum, RA.halsUnten(...n.ort))).join(""));
    item(`${variante}.kolben`).svg += luft(variante, FOLGE.map((nr) => RA.raumOben(nr)).join("")
      + necks(variante).map((n) => RA.raumGruppe(n.raum, RA.halsOben(...n.ort))).join(""));
  }
}

// Particle routes, outside in: from the cut hose end (or the silencer) to the bottom of the groove.
const AUSSEN_WEG = { wege: WEGE, daempfer: DAEMPFER, abluft: [3], gewinde: VERSCHRAUBUNG.gewinde };
const weg = (von, nach) => [...RA.vonAussen(von, AUSSEN_WEG), ...RA.quer(von, nach), ...RA.vonAussen(nach, AUSSEN_WEG).slice().reverse()];
const ROUTEN = {
  "1-2": weg(1, 2),
  "2-3": weg(2, 3),
  st: [...WEGE.st.slice().reverse(), [STEUER_X, 0, ZA + R_KAMMER], [STEUER_X, 0, ZA]],
};

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
for (const [variante, { bunde, ringe }] of Object.entries(SPULEN)) {
  if (NUR && NUR !== variante) continue;
  schieber({
    bunde, ringe, variante, owner: VARIANTEN,
    namen: { kolben: `${variante}.kolben`, hinten: `${variante}.ring.hinten`, vorn: `${variante}.ring.vorn` },
  });
}
// The pilot number is cast into the cap's top: 12 on the normally closed valve, 10 on the normally open one.
// Each belongs to its variant.
kappe("kappe", KS, STEUER_X, true, {
  nummer: (zeichne) => Object.entries(NR_STEUER).map(([variante, text]) => `<g data-variante="${variante}">${zeichne(text)}</g>`).join(""),
});
steuerkolben("kappe", KOLBEN, "kappe.kolben");
rueckstellkappe();
federsitz(KR, FEDER);
schrauben({ oben: [7, 83], kappen: [[KS.x0, -1, "kappe"], [KR.x1, 1, "rueckstell"]] });
anschluesse();
schlaeuche(WEGE, {
  istSteuer: (nr) => nr === "st",
  name: (gruppe, nr) => (nr === "st" ? "steuerleitung.schlauch" : `leitung.schlauch${nr}`),
});
luftEinfuellen();

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
const ohneLuft = (svg) => svg.replace(/<g data-variante="\w+" data-luft="">/g, "<g>");
const inAllenVarianten = (it) => {
  if (!/data-variante=/.test(ohneLuft(it.svg ?? ""))) return true;
  const eigene = eigeneVariante(it);
  if (!eigene) return false;                    // a variant only inside (the pilot number)
  return VARIANTEN_NAMEN.every((v) => v === eigene
    || R.items.some((o) => o.piece === it.piece && eigeneVariante(o) === v && gleicherOrt(o, it)));
};
const { KEYS, LIFT, VIEW0, VIEW1, MITTE } = EX.vorbereiten(R, P, MOVE, W, H, { anker: inAllenVarianten });

// Proof, for every variant: each number's anchor is the place of a part of its
// assembly that this variant shows. It compares places only (the numbers are
// anchored on item positions); that the leader line then ends on something
// drawn is measured on screen by the browser test.
for (const v of VARIANTEN_NAMEN) {
  for (const [id, c] of Object.entries(MITTE)) {
    const sichtbar = R.items.some((it) => it.piece === id && it.pos && gleicherOrt(it, { pos: c })
      && (!/data-variante=/.test(ohneLuft(it.svg ?? "")) || eigeneVariante(it) === v));
    if (!sichtbar) throw new Error(`Nummer ${id}: im ${v.toUpperCase()}-Ventil hängt sie an keinem sichtbaren Teil (${c.join(", ")})`);
  }
}

// The air routes, projected once: the page places particles along them.
const BAHNEN = Object.fromEntries(Object.entries(ROUTEN).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]));

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein 3/2-Wegeventil in Schieberbauart nach ISO 5599-1, Größe 1, auf seiner Grundplatte, in der Ebene des Schiebers aufgeschnitten. "
    + "Man sieht die Bohrung mit drei Ringnuten, den Steuerschieber mit Bunden und Dichtringen, die drei Kanäle hinunter in die Grundplatte "
    + "und die Anschlüsse 1 (Druckluft), 2 (Arbeitsanschluss) und 3 (Abluft) mit Schläuchen und Schalldämpfer. Links sitzt die Steuerkappe "
    + "mit dem Steuerkolben und dem Steueranschluss, rechts die Rückstellkappe mit der Druckfeder. Die Druckluft ist eingefärbt: das kräftige "
    + "Blau steht unter Druck, das blasse ist Abluft auf dem Weg zum Schalldämpfer. "
    + "Ohne Signal ist beim Ventil mit Ruhestellung gesperrt (NC) 2 mit 3 verbunden und 1 gesperrt, "
    + "beim Ventil mit Ruhestellung offen (NO) ist 1 mit 2 verbunden und 3 gesperrt.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}"${it.feder ? ` data-feder="${it.feder.join(" ")}"` : ""}>${it.svg}</g>`).join(""),
    `<g class="luft" data-luftlage=""></g>`,
  ],
})
  // The page starts with the normally closed valve: the normally open spool, its air and its number are hidden.
  .replace(/<g data-variante="no"( data-luft="")?>/g, (m) => m.replace(">", ' hidden="">'));

// --- The symbol beside the card ------------------------------------------------------------------------
const FELD = 60;
const symbol = (art) => wegeventilSymbol(art, { links: "pneumatisch", rechts: "feder", feld: FELD }).svg;
const BEIFIGUR = `<p class="beifigur-titel">Schaltzeichen</p>`
  + `<div class="beifigur-symbol" data-variante="nc">${symbol(VENTIL_3_2_NC)}</div>`
  + `<div class="beifigur-symbol" data-variante="no" hidden="">${symbol(VENTIL_3_2_NO)}</div>`
  + `<p class="beifigur-text">Jedes Kästchen ist eine Stellung: links die betätigte (mit dem Steueranschluss), rechts die Ruhestellung mit der Feder. `
  + `Die Anschlüsse 1, 2 und 3 stehen fest, die Kästchen gleiten darunter – so wie der Schieber in der Bohrung.</p>`;

// --- The page --------------------------------------------------------------------------------------------
const ARTEN = { nc: VENTIL_3_2_NC, no: VENTIL_3_2_NO };
const ms = (zeit) => Math.round(zeit * 1000);
const komma = (x, n = 1) => x.toFixed(n).replace(".", ",");
// The two valves as the model starts them: the page begins with the NC one.
const START = Object.fromEntries(Object.entries(ARTEN).map(([n, art]) => [n, ventilAnzeige(neuesVentil(M, { art }), M, 6)]));
const anzeigeText = (a) => `p2 ${komma(a.drucke[2])} bar · Schaltzeit ${a.schaltzeitMs ?? "–"} ms`;
const ANZEIGE = anzeigeText(START.nc);
if (START.no.drucke[2] !== 6 || START.nc.drucke[2] !== 0) throw new Error("Startdrücke: NO muss mit 6,0 bar an 2 beginnen, NC mit 0,0");

/** What the signal is called and does, per valve: the button, its title and the card's hint. */
const SIGNAL = {
  nc: { nummer: "12", titel: "Gedrückt halten: Steuerluft an 12, 1 wird mit 2 verbunden", hinweis: "Signal 12 halten, Zeitlupe, zerlegen" },
  no: { nummer: "10", titel: "Gedrückt halten: Steuerluft an 10, 2 wird entlüftet und 1 gesperrt", hinweis: "Signal 10 halten, Zeitlupe, zerlegen" },
};
/** s of model time between two automatic signals. */
const AUTO_TAKT = 1.6;

const live = `
const MASSE = ${JSON.stringify(M)};
const ARTEN = ${JSON.stringify(ARTEN)};
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
const HUB = ${HUB};
const KAMMER = ${JSON.stringify(KAMMER)};
const AUTO_TAKT = ${AUTO_TAKT};    // s of model time between two automatic signals
const SIGNAL = ${JSON.stringify(SIGNAL)};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = Array.from(svg.querySelectorAll("[data-g]"));
const readout = document.querySelector("[data-readout]");
const info = document.querySelector(".pickinfo");
const still = matchMedia("(prefers-reduced-motion: reduce)");

${modulQuelle(WURZEL, ["figur/ventil.mjs"])}
${EX.LAUFZEIT}
${LEG.LAUFZEIT}
${EX.ABLAUF}
${LU.LAUFZEIT}
${SYMBOL_LAUFZEIT}
${BEDIENUNG_LAUFZEIT}
${VS.LAUFZEIT}

// --- the model drives everything -----------------------------------------
// One valve state for both variants: switching variant refills it from the
// other path description, so it is always at rest with no signal.
let variante = "nc";
const v = neuesVentil(MASSE, { art: ARTEN.nc, bauart: "monostabil", druckBar: 6 });
const ANSCHLUESSE = ["2"];       // working ports the readout names
const schaltzeitOptionen = () => ({ art: v.art });

const raeume = Array.from(svg.querySelectorAll("[data-raum]"));
const steuerkammer = svg.querySelector('[data-steuerkammer="st"]');
const luftLage = svg.querySelector("[data-luftlage]");
const stroeme = {};
for (const name in BAHNEN) stroeme[name] = stromBauen(luftLage, name, BAHNEN[name], Math.max(5, Math.round(BAHNEN[name].gesamt / 26)));

function kammerD(x0, x1) {
  const z0 = KAMMER.z[0], z1 = KAMMER.z[1];
  return "M" + [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
    .map((q) => iso([q[0], 0, q[1]], P).map((n) => n.toFixed(1)).join(" ")).join("L") + "Z";
}
// The pilot chamber grows with the spool; everything else that slides is figur/ventilseite.mjs.
function zeichneKammern(s) {
  steuerkammer.setAttribute("d", kammerD(KAMMER.st[0], KAMMER.st[1] + s));
}

// The pilot line is thin, so the same flow runs through it faster. The factor
// is the working path's conductance over the pilot filling path's: a filling
// pilot line shows its particles at the speed a working line would at the
// same pressure difference. Drawing only; the model does not read it.
const STEUER_TEMPO = MASSE.leitwertZu / MASSE.leitwertSteuer;
const feldOffen = (o, felder) => felder.reduce((summe, i) => summe + ventilFeldOffen(o, i), 0);

// Strong blue above 0,5 bar, pale blue while a room is being vented, else empty.
function zeichneLuft(dt) {
  const F = luftFarben();
  const quelle = AUSSEN + druck;
  const o = wegeOffen(v.anteil, MASSE.ueberdeckung);
  // The paths of port 2 come from the description: 1 to 2 supplies, 2 to 3 vents.
  const zu = feldOffen(o, v.wege["2"].zu), ab = feldOffen(o, v.wege["2"].ab);
  const q12 = zu * MASSE.leitwertZu * (quelle - v.p[2]);
  const q23 = ab * MASSE.leitwertAb * (v.p[2] - AUSSEN);
  const entlueftet = ab > 0 && v.p[2] - AUSSEN > 0.02;
  const ton = (p, raus) => (p - AUSSEN > 0.5 ? F.druck : raus ? F.abluft : "none");
  const steuerRaus = !v.signal14 && v.p14 - AUSSEN > 0.02;
  const farbe = {
    "1": ton(quelle, false),
    "2": ton(v.p[2], entlueftet),
    "3": entlueftet ? F.abluft : "none",
    "st": ton(v.p14, steuerRaus),
  };
  for (const el of raeume) {
    const f = farbe[el.dataset.raum];
    if (el.getAttribute("fill") !== f) el.setAttribute("fill", f);
  }

  // Speed follows conductance times pressure difference; a shut path shows nothing.
  const tempo = (q) => Math.max(-600, Math.min(600, q * 2.6e-4));
  stromSchritt(stroeme["1-2"], dt, tempo(q12), zu, F.druck);
  stromSchritt(stroeme["2-3"], dt, tempo(q23), ab, F.abluft);
  const leit = v.signal14 ? MASSE.leitwertSteuer : MASSE.leitwertEntlueft;
  const q = leit * ((v.signal14 ? quelle : AUSSEN) - v.p14);
  const staerke = v.signal14 ? 1 : Math.max(0, Math.min(1, (v.p14 - AUSSEN) / 0.3));
  stromSchritt(stroeme.st, dt, tempo(q * STEUER_TEMPO), staerke, v.signal14 ? F.druck : F.abluft);
  for (const name in stroeme) {
    const s = stroeme[name];
    const sichtbar = s.kugeln.some((c) => c.getAttribute("opacity") !== "0");
    s.g.style.opacity = sichtbar ? "" : "0";
  }
}

// --- controls -------------------------------------------------------------
const knopfSignal = document.getElementById("btn-signal");
const knopfBauart = document.getElementById("btn-bauart");
const knopfAuto = document.getElementById("btn-auto");

function zeichneBedienung() {
  if (knopfSignal.getAttribute("aria-pressed") !== String(v.signal14)) knopfSignal.setAttribute("aria-pressed", String(v.signal14));
  zeichneHandRegler();
}

// The signal button (hold, automatic cycle) is figur/bedienung.mjs; this page
// says what the signal does to its valve. The model calls the signal that
// actuates the spool "14", whatever the valve prints on it.
const bed = bedienungSignale({
  namen: ["14"],
  impuls: 0.15,
  autoTakt: AUTO_TAKT,
  autoAn: !still.matches,
  erster: "14",
  haltenModus: () => true,
  setzeSignal: (n, an) => ventilSignal(v, n, an),
  autoSchritt: () => ventilSignal(v, "14", !v.signal14),
  autoEnde: (b) => { if (!b.gehalten["14"]) ventilSignal(v, "14", false); },
  autoAnzeige: (an) => knopfAuto.setAttribute("aria-pressed", String(an)),
  geaendert: () => { angehalten = false; zeichneBedienung(); run(); },
});
const stoppeAuto = () => bed.autoAus();
bed.knopf(knopfSignal, "14");

// The page offers the monostable valve only: a spring brings it back.
// Switching the variant puts the valve at rest at once: no signal, no hand,
// the spool home, the pressures of the new description. Figure, number and
// symbol follow; SVG elements have no hidden property, so the attribute is
// set and a CSS rule gives it effect.
function zeigeVariante(name) {
  variante = name;
  Object.assign(v, neuesVentil(MASSE, { art: ARTEN[name], bauart: "monostabil", druckBar: druck }));
  bed.zuruecksetzen();
  gezeichnet = null;
  for (const el of document.querySelectorAll("[data-variante]")) {
    el.toggleAttribute("hidden", el.dataset.variante !== name);
  }
  knopfBauart.setAttribute("aria-pressed", String(name === "no"));
  knopfSignal.textContent = "Signal " + SIGNAL[name].nummer;
  knopfSignal.title = SIGNAL[name].titel;
  const hinweis = document.querySelector('[data-corner="hint"]');
  if (hinweis) hinweis.textContent = SIGNAL[name].hinweis;
  zeichneHub();
  zeichneLuft(0);
  zeichneAnzeige();
  zeichneBedienung();
  zeichneSymbol();
}
knopfBauart.addEventListener("click", () => {
  zeigeVariante(variante === "nc" ? "no" : "nc");
  angehalten = false;
  run();
});

knopfAuto.addEventListener("click", () => {
  if (bed.auto) stoppeAuto();
  else bed.autoStart("14");
  angehalten = false;
  run();
});
knopfAuto.setAttribute("aria-pressed", String(bed.auto));
bindeRegler();

// --- frame loop -----------------------------------------------------------
function blende(sicht) {
  luftLage.style.opacity = String(sicht);
  for (const el of raeume) {
    if (sicht < 1) el.style.opacity = (0.82 * sicht).toFixed(3);
    else el.style.removeProperty("opacity");
  }
}
// One frame; the loop itself is EX.ABLAUF.
function bildZeichnen(dt, offen, bewegt) {
  blende(Math.max(0, 1 - offen * 3));
  // The valve stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    const dm = angehalten ? 0 : dt / zeitlupe;
    if (dm > 0) {
      bed.takt(dm);
      ventilSchritt(v, MASSE, dm, druck);
    }
    zeichneHub();
    zeichneLuft(dm);
    zeichneAnzeige();
    zeichneBedienung();
  } else {
    for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
  }
  zeichneSymbol();
}

// Before taking it apart: no automatic, no signal, no hand, spool home in
// the rest position — or the spool would leave its bore from somewhere else.
function vorDemZerlegen() {
  stoppeAuto();
  zeigeVariante(variante);
}

// The variant can be asked for in the address (?variante=no), and is then set
// before the first frame: the readout shows the pressure of that valve at once.
const gewuenscht = new URLSearchParams(location.search).get("variante");
zeigeVariante(gewuenscht in ARTEN ? gewuenscht : "nc");
poseExplode();

// A handle for the browser test and for screenshots: it puts the figure into
// a known state instead of waiting and hoping to catch the right moment.
window.__figur = {
  MASSE,
  modell: () => v,
  variante: () => variante,
  offen: () => offenAnteil(),
  zerlegt: () => zerlegt,
  // anteil 0…1 by hand; the second argument names the variant ("nc" or "no").
  stelle(anteil, name) {
    stoppeAuto();
    angehalten = true;
    if (name && name !== variante) zeigeVariante(name);
    vonHand(v, anteil);
    zeichneHub();
    zeichneLuft(0);
    zeichneAnzeige();
    zeichneBedienung();
    zeichneSymbol();
  },
  signal(an) {
    stoppeAuto();
    angehalten = false;
    ventilSignal(v, "14", an);
    zeichneBedienung();
    run();
  },
  weiter: () => { angehalten = false; run(); },
  spiele,
  waehle,
};
`;

const INFO =
  "Das Signal schaltet um, solange man den Knopf hält; lässt man los, stellt die Feder zurück. "
  + "Das kräftige Blau steht unter Druck, das blasse ist Abluft auf dem Weg zum Schalldämpfer. "
  + "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const LEISTE =
  knopf("btn-signal", "Signal 12", { titel: SIGNAL.nc.titel })
  + knopf("btn-bauart", "NO-Ventil", { titel: "Umschalten zwischen Ruhestellung gesperrt (NC) und Ruhestellung offen (NO)" })
  + knopf("btn-auto", "Automatik", { gedrueckt: true })
  + knopf("btn-explode", "Zerlegen und zusammenbauen")
  + `<span class="luecke"></span>`
  + hausBedienung()
  + `<span class="umbruch"></span>`
  + VS.reglerLeiste({ handBeschreibung: "Schieber von Hand: 0 % ist die Ruhestellung, 100 % die betätigte Stellung" });

const A_ST = (Math.PI * M.steuerkolben ** 2) / 4;
const LOS = (M.federVor + M.haftreibung) / (0.1 * A_ST);
// The switching times the prose names, from the model at build time.
const T = {
  nc12: ventilSchaltzeit(M, 6, { art: VENTIL_3_2_NC }),
  nc_zurueck: ventilSchaltzeit(M, 6, { art: VENTIL_3_2_NC, richtung: "12" }),
  nc12bei2: ventilSchaltzeit(M, 2, { art: VENTIL_3_2_NC }),
  no10: ventilSchaltzeit(M, 6, { art: VENTIL_3_2_NO }),
  no_zurueck: ventilSchaltzeit(M, 6, { art: VENTIL_3_2_NO, richtung: "12" }),
};
if (ms(T.nc12) !== ms(T.no10) || ms(T.nc_zurueck) !== ms(T.no_zurueck)) throw new Error("NC und NO schalten verschieden schnell – Text anpassen");
const LESETEXT = `<div class="lesetext">
<h2>Was man sieht</h2>
<p>Das Ventil ist in der Ebene des Schiebers aufgeschnitten; die vordere Hälfte fehlt. In der Mitte liegt die Bohrung
mit drei Ringnuten. Jede Ringnut gehört zu einem Anschluss und führt über einen Kanal hinunter in die Grundplatte, wo
die Anschlüsse <strong>1</strong> (Druckluft), <strong>2</strong> (zum Verbraucher) und <strong>3</strong> (Abluft) sitzen.
In der Bohrung gleitet der Steuerschieber. Seine dicken <strong>Bunde</strong> sperren, die dünnen <strong>Hälse</strong>
dazwischen verbinden zwei benachbarte Ringnuten. Links sitzt die Steuerkappe mit dem Steuerkolben, rechts die
Rückstellkappe mit der Feder.</p>
<p>Wo Luft unter Druck steht, ist der Raum mit <strong>kräftigem Blau</strong> gefüllt. <strong>Blasses Blau</strong>
ist Abluft, die gerade über den Schalldämpfer entweicht. Die Punkte zeigen, welche Wege offen sind: Sie laufen,
solange Luft strömt, und bleiben stehen, wenn sich der Druck ausgeglichen hat.</p>

<h2>Zwei Bauarten: in Ruhe gesperrt oder in Ruhe offen</h2>
<p>Das 3/2-Wegeventil hat drei Anschlüsse und zwei Stellungen. Es gibt es in zwei Bauarten, die sich nur im Schieber
unterscheiden; mit dem Knopf „NO-Ventil“ wechselst du zwischen ihnen.</p>
<p>Beim Ventil mit <strong>Ruhestellung gesperrt</strong> (englisch <em>normally closed</em>, NC) ist ohne Signal
<strong>1 gesperrt</strong>, und <strong>2 ist mit 3 verbunden</strong>: Der Verbraucher ist entlüftet. Kommt Steuerluft an
<strong>12</strong>, schiebt der Steuerkolben den Schieber um ${komma(HUB, 0)} mm nach rechts, und jetzt verbindet er
<strong>1 mit 2</strong>. Die Zahl verrät es: Signal 12 verbindet 1 mit 2.</p>
<p>Beim Ventil mit <strong>Ruhestellung offen</strong> (<em>normally open</em>, NO) ist es umgekehrt: Ohne Signal verbindet
der Schieber <strong>1 mit 2</strong> und sperrt 3. Steuerluft an <strong>10</strong> schaltet um: Jetzt ist 1 gesperrt, und
<strong>2 ist mit 3 verbunden</strong>. Das Signal 10 sperrt also die Zufuhr 1. Beim Umschalten der Bauart steht das Ventil
sofort wieder in Ruhe, damit der Schieber nie in der Mitte hängen bleibt.</p>
<p>Wozu braucht man das? Ein 3/2-Ventil liefert zum Beispiel das Steuersignal für Anschluss 14 des 5/2-Ventils – meist ein
Taster mit Sperr-Grundstellung (NC). Dieses Ventil siehst du auf der <a href="../Wegeventil-5-2/">5/2-Seite</a>.</p>

<h2>Warum in der Mitte kurz alles zu ist</h2>
<p>Die Bunde sind etwas länger, als sie sein müssten. Darum öffnet der neue Weg erst, wenn der alte schon geschlossen
ist: Der Weg der Ruhestellung schließt bei ${komma(S_B, 2)} mm Schieberweg, und der Weg der betätigten Stellung öffnet erst bei
${komma(S_A, 2)} mm. Auf den ${komma(S_A - S_B, 2)} mm dazwischen, ${Math.round(M.ueberdeckung * 100)} % des Hubs, sind <strong>alle
Wege zu</strong>. Das nennt man <strong>positive Überdeckung</strong>. Sie verhindert, dass beim Umschalten Druckluft von 1
geradewegs in die Abluft 3 strömt. Probier es aus: Stell den Schieber von Hand auf 50 %. Kein Punkt ist zu sehen, und
der Druck an 2 bleibt stehen, wo er war.</p>

<h2>Die alten Buchstaben</h2>
<p>Auf älteren Plänen und Ventilen stehen statt der Zahlen Buchstaben: <strong>P</strong> für den Druckluftanschluss
(heute 1), <strong>A</strong> für den Arbeitsanschluss (heute 2), <strong>R</strong> für die Entlüftung (heute 3).
Auch die Steueranschlüsse trugen früher Buchstaben (Z, Y und X); welcher zu welcher Zahl gehört, steht hier bewusst nicht,
denn das hängt von der Ausgabe der Norm ab. Die Zahlen nach ISO 5599-3 haben einen Vorteil: Man liest an der Steuerleitung
ab, was sie bewirkt.</p>

<h2>Wovon die Schaltzeit abhängt</h2>
<p>Die Anzeige nennt die <strong>Schaltzeit</strong>: die Zeit vom Signal, bis der Schieber 98 % seines Weges geschafft
hat. Im Modell hängt sie fast nur an der Steuerkammer. Die Steuerluft kommt durch eine enge Leitung und muss die Kammer erst
füllen. Erst wenn der Druck auf dem Steuerkolben genug Kraft aufbringt, um Feder und Haftreibung zu überwinden, setzt
sich der Schieber in Bewegung. Der Schieber selbst wiegt nur ${Math.round(M.masseSchieber * 1000)} g und wäre ohne das
Füllen der Kammer fast sofort drüben.</p>
<p class="formel">
A<sub>Steuerkolben</sub> = π/4 · ${M.steuerkolben}² = <strong>${komma(A_ST)} mm²</strong><br>
bei 6 bar: F = 0,6 N/mm² · ${komma(A_ST)} mm² = <strong>${Math.round(0.6 * A_ST)} N</strong><br>
Feder ${M.federVor} N + Haftreibung ${M.haftreibung} N = ${M.federVor + M.haftreibung} N → der Schieber löst sich ab
<strong>${komma(LOS, 2)} bar</strong> in der Steuerkammer
</p>
<p>Beide Bauarten brauchen bei 6 bar ${ms(T.nc12)} ms bis in die betätigte Stellung und ${ms(T.nc_zurueck)} ms, bis die Feder sie
zurückgestellt hat. Bei 2 bar sind es ${ms(T.nc12bei2)} ms bis in die betätigte Stellung: Mit weniger Druck füllt sich die
Kammer langsamer, und der Kolben drückt schwächer gegen die Feder. Datenblätter nennen für Ventile dieser Größe 12 bis 52 ms; die Spanne gilt bei 6 bar, bei 2 bar liegt das Modell darüber.
Mit der Zeitlupe (1× bis 1/50) sieht man, wie sich die Steuerkammer erst füllt und der Schieber dann losläuft.</p>
<p class="hinweis">Jede Zahl auf dieser Seite wird aus demselben Modell gerechnet, das auch den Schieber bewegt. Kräfte
sind theoretische Werte; die Reibung der Dichtungen zieht in der Praxis noch einmal 3 bis 10 Prozent ab. Baulänge, Bohrung,
Hub, Steuerkolben, Federkraft, Überdeckung und das Volumen hinter 2 sind Annahmen; sie stehen in der Anleitung zur Figur.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

// What only this page needs on top of the shared sheet.
const EIGENES_CSS = `${VS.CSS}
#btn-signal { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none }
`;

// `--vorschau=<Datei>` writes the page somewhere else (a scratch folder) instead of into the figure's folder.
const vorschauArg = process.argv.find((a) => a.startsWith("--vorschau="));
const ZIEL = vorschauArg ? vorschauArg.slice("--vorschau=".length) : join(HIER, "..", "..", "index.html");
mkdirSync(dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, seite({
  titel: "3/2-Wegeventil – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "3/2-Wegeventil, Längsschieber",
  hinweis: SIGNAL.nc.hinweis,
  anzeige: ANZEIGE,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft unter Druck" },
    { mark: "dotted", label: "Blasses Blau: Abluft auf dem Weg zum Schalldämpfer" },
    { mark: "lit", label: "Schieber, Dichtringe und Steuerkolben – was sich bewegt" },
    { mark: "dim", label: "Gehäuse, Kappen und Grundplatte sind in der Ebene des Schiebers aufgeschnitten" },
  ],
  caption:
    "Längsschieberventil nach ISO 5599-1, Größe 1 (G1/4), auf seiner Grundplatte, in zwei Bauarten. Beim Ventil mit Ruhestellung "
    + "gesperrt (NC) verbindet der Schieber in Ruhe 2 mit 3 und betätigt 1 mit 2; beim Ventil mit Ruhestellung offen (NO) "
    + "in Ruhe 1 mit 2 und betätigt 2 mit 3.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  breite: 1240,
  buehneLabel: "3/2-Wegeventil im Schnitt: Schieber, Luftwege und Baugruppen",
  beiFigur: BEIFIGUR,
  beiFigurLabel: "Schaltzeichen",
}).replace("</style>", `${EIGENES_CSS}</style>`));
console.log(`geschrieben: ${ZIEL}`);

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
      // This pair is the first of TWO excuses. The second is the shared owner
      // "schieber.variante" on the spools and their rings (see VARIANTEN): it
      // switches the support check ("sunk") off between the two spools and, as
      // a side effect, between a spool and its own rings. Each spool alone
      // passes without either excuse: `--audit --nur=nc`, `--audit --nur=no`.
      ["nc.kolben", "no.kolben"],
    ],
    crowd: [],
    cover: [],
  });
}
