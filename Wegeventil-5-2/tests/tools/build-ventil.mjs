// A 5/2 directional valve, spool type, in the size of ISO 5599-1 size 1
// (G1/4) on its sub-base, as an isometric section in the plane of the spool.
// Dimensions in mm, 1 world unit = 1 mm. The width of 42 mm is catalogue
// (Festo VSVA size 1); everything else is an assumption and is listed in the
// README of the figure.
//
// This script holds geometry, data tables and the component's own runtime
// (what the signals do, which room is under pressure) and nothing else:
// explode springs, depth sorting, legend, air particles and page shell all
// come from ../../figur/.
//
// The kit's camera looks from +x, +y, +z, so the half of the valve that is
// kept is the one at y ≤ 0, its cut face at y = 0 looks at the viewer, and
// the ports leave the sub-base towards +y.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import * as EX from "../../../figur/explode.mjs";
import * as LU from "../../../figur/luft.mjs";
import * as LEG from "../../../figur/legende.mjs";
import { ISO_5599_GR1, wegeOffen, neuesVentil, ventilAnzeige, ventilSchaltzeit } from "../../../figur/ventil.mjs";
import { VENTIL_5_2, wegeventilSymbol, SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { seite, knopf, hausBedienung, modulQuelle } from "../../../figur/seite.mjs";
import { gehaeuseSchnitt } from "../../../figur/gehaeuse.mjs";
import { normteile, stummel, sechskant, federPruefen } from "../../../figur/normteile.mjs";
import { LAUFZEIT as BEDIENUNG_LAUFZEIT } from "../../../figur/bedienung.mjs";
import { ventilRaeume } from "../../../figur/ventilraeume.mjs";
import * as VS from "../../../figur/ventilseite.mjs";
import { LEGENDE } from "./legende-ventil.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, "..", "..", "index.html");
const WURZEL = join(HIER, "..", "..", "..");

const W = 900;
const H = 800;

// --- Dimensions ----------------------------------------------------------
const M = ISO_5599_GR1;
const HUB = M.hub;                   // 7, spool stroke
const RB = M.bohrung / 2;            // 6.5, spool bore
const RK = M.steuerkolben / 2;       // 10, pilot piston bore
const ZA = 44;                       // spool axis height

const GEH = { x0: 0, x1: 130, y0: -21, z0: 18, z1: 66 };          // housing, back half
const PLATTE = { x0: -6, x1: 136, y0: -24, y1: 24, z0: 0, z1: 17 }; // sub-base
const DICHT = { x0: -1, x1: 131, y0: -22, z0: 17, z1: 18 };         // flat gasket, 1 mm proud all round
const ZP = (PLATTE.z0 + PLATTE.z1) / 2;  // 8.5, port axis; the cut steps down to it in front

const PORT = { 5: 25, 4: 45, 1: 65, 2: 85, 3: 105 };
const FOLGE = [5, 4, 1, 2, 3];       // along the spool
const R_KANAL = 4;                   // channel Ø 8 from the bore down into the sub-base
const R_NUT = 10.5;                  // ring groove in the bore (assumption)
const NUT_HALB = 7;                  // groove 14 wide, so the webs between are 6
const R_GEWINDE = 6.5;               // G1/4, outside Ø 13.2
const R_STUMMEL = R_GEWINDE - 0.2;  // the threaded stub of a fitting, clear of the half-cut thread
const Y_BOHR = -R_KANAL - 0.5;       // where the port drilling ends, just behind the channel

// End caps: a little smaller than the body, so the joint shows.
const KAPPE = { y0: -20, z0: 23, z1: 65 };
const K14 = { x0: -22, x1: 0, wand: -17 };     // chamber from the wall face to the body; the thread sits just inside the wall
const K12 = { x0: 130, x1: 152, wand: 147 };
const R_KAMMER = RK;                 // pilot chamber = piston bore
const R_KOLBEN = RK - 0.2;
const KOLBEN14 = [-13, -7];          // pilot piston 14 at rest (position 12)
const KOLBEN12 = [130, 136];         // pilot piston 12 at rest, against the body
const STEUER = { 14: -14.5, 12: 144.5 };  // pilot ports, over the pilot chambers
const R_STEUER_GEWINDE = 2.5;        // M5
const R_STEUER_BOHRUNG = 1.5;

// Return spring (monostable variant): on a 2 mm plate at the spool's end,
// against the cap's end wall. It must still fit at full stroke: see federPruefen() in figur/normteile.mjs.
const FEDER = { sitz: 2, draht: 1.1, windungen: 4.5, rWindung: 7 };
const FEDER_RESERVE = 1;             // mm the spring must stay above its block length at full stroke

// --- The spool ------------------------------------------------------------
// The lands are placed from the overlap: a web between two grooves opens when
// a land edge leaves it. Set a (1→4, 2→3) must begin to open at
// s_a = (0.5 + ü/2)·hub, set b (1→2, 4→5) at s_b = (0.5 − ü/2)·hub.
const S_A = (0.5 + M.ueberdeckung / 2) * HUB;
const S_B = (0.5 - M.ueberdeckung / 2) * HUB;
const NUTEN = FOLGE.map((nr) => [PORT[nr] - NUT_HALB, PORT[nr] + NUT_HALB]);
const STEGE = [
  [GEH.x0, NUTEN[0][0]],
  ...NUTEN.slice(1).map((n, i) => [NUTEN[i][1], n[0]]),
  [NUTEN[4][1], GEH.x1],
];
// STEGE[1] = web 5|4 (set b), [2] = 4|1 (set a), [3] = 1|2 (set b), [4] = 2|3 (set a)
const R_BUND = RB - 0.2;             // land, 0.2 clearance in the bore
const R_HALS = 3.6;                  // neck between the lands
const SP = [-7, 130];                // spool ends at rest
const BUNDE = [
  [SP[0], STEGE[1][0] - S_B],        // land A: shuts 5|4 in position 14
  [STEGE[2][1] - S_A, STEGE[3][0] - S_B],  // land B: shuts 4|1 at rest and 1|2 in position 14
  [STEGE[4][1] - S_A, SP[1]],        // land C: shuts 2|3 at rest
];
// One seal ring next to every sealing edge, and one at each end towards the
// pilot chambers. Each sits on a web in the position in which it seals.
const RING_B = 2.2;
const R_RINGNUT = R_BUND - 1;
const RINGE = [
  4, BUNDE[0][1] - 2.6,
  BUNDE[1][0] + 2.6, BUNDE[1][1] - 2.6,
  BUNDE[2][0] + 2.6, 122,
];

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
  4: stummel([PORT[4], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[4], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  1: stummel([PORT[1], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[1], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  2: stummel([PORT[2], Y_SCHLAUCH, ZP], [0, 1, 0], [PORT[2], Y_SCHLAUCH + 13, ZP - 1.5], [0, 0.95, -0.3], 4),
  14: stummel([STEUER[14], 0, Z_STEUERSCHLAUCH], [0, 0, 1], [STEUER[14], 13, 88], [0, 0.85, 0.53], 4),
  12: stummel([STEUER[12], 0, Z_STEUERSCHLAUCH], [0, 0, 1], [STEUER[12], 13, 88], [0, 0.85, 0.53], 4),
};

// --- Projection --------------------------------------------------------------
const P = k.fitProjection(
  [
    [PLATTE.x0, PLATTE.y0, 0], [PLATTE.x1, PLATTE.y0, 0], [PLATTE.x1, PLATTE.y1, 0], [PLATTE.x0, PLATTE.y1, 0],
    [K14.x0 - 5, KAPPE.y0, KAPPE.z1], [K12.x1 + 5, KAPPE.y0, KAPPE.z1], [K12.x1 + 5, 0, KAPPE.z0],
    [GEH.x0, GEH.y0, GEH.z1 + 5], [GEH.x1, GEH.y0, GEH.z1 + 5],
    ...Object.values(WEGE).flatMap((w) => [w[w.length - 1].map((v, j) => v + (j === 2 ? 6 : 0)), w[w.length - 1].map((v, j) => v - (j === 2 ? 6 : 0))]),
    [PORT[3], PLATTE.y1 + DAEMPFER.sinter[1] + 4, ZP - 8], [PORT[5], PLATTE.y1 + DAEMPFER.sinter[1] + 4, ZP + 8],
  ],
  W, H, { pad: 40, azimuth: 38, elevation: 34 },
);

const at = (p) => k.iso(p, P);
const L = (d, style) => k.lineSvg(d, style);

// --- Assemblies: the three explode tables (all the maths lives in figur/explode.mjs) --
// Looking from +x/+y/+z: the kept half is y <= 0, ports and fittings point +y, towards the viewer.
const PIECE_OF = {
  grundplatte: "grundplatte", dichtung: "dichtung", gehaeuse: "gehaeuse", schieber: "schieber",
  ringe: "ringe", kappe14: "kappe14", rueckstell: "rueckstell", schrauben: "schrauben",
  daempfer: "daempfer", leitung: "leitung", steuerleitung: "steuerleitung",
};
// Outside first; closing walks it backwards. Rings sit directly before the spool and leave with it.
const STAGGER = [
  "steuerleitung", "leitung", "daempfer", "schrauben", "rueckstell", "kappe14",
  "ringe", "schieber", "gehaeuse", "dichtung", "grundplatte",
];
const MOVE = {
  steuerleitung: [0, 0, 70],      // pilot lines straight up out of their cap threads
  leitung: [0, 60, 0],            // hoses and fittings out of the ports, towards the viewer
  daempfer: [0, 80, 0],           // the same way, further: same centroid as the fittings, so their numbers would sit on each other
  schrauben: [0, 0, 82],          // the two top screws up and clear of the lifted housing, high enough that their number clears the housing's
  rueckstell: [146, 0, 0],        // return side beyond the end of the pulled spool
  kappe14: [-45, 0, 0],           // cap 14 with its piston, off to the left
  ringe: [138, 0, 15],            // leaves with the spool, lifted so the rings stay distinct
  schieber: [138, 0, 0],          // out of the bore until clear of the housing
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
  schieber, kappe, steuerkolben, federsitz, schrauben, schlaeuche, steuerverschraubung,
  innen, bohrungInnen, flanke, rBohrung, bohrungsKante, gehaeuseBohrung, kanalInnen, aufNut, aufGewinde,
  box, boxenOhne, unterLoch, schnittEnde } = GH;

// --- End caps ---------------------------------------------------------------------------
// The two right-hand variants fill the same space on purpose: the page shows
// one of them. A shared owner tells the support check they are not sunk into
// each other by mistake.
const VARIANTEN = "rueckstell.variante";

function rueckstellung() {
  // Monostable: a spring on a seat at the end of the spool.
  federsitz(K12, FEDER, { variante: "feder", owner: VARIANTEN });
  // Bistable: a second pilot piston instead.
  steuerkolben("rueckstell", KOLBEN12, "rueckstell.kolben12", "kolben12", VARIANTEN);
}

// --- Threads, fittings, silencers -------------------------------------------------------------
function verschraubung(F, D, gruppe, name, ort) {
  NT.verschraubung(F, D, gruppe, name, ort, D === STEUER_V ? R_STEUER_GEWINDE - 0.2 : R_STUMMEL);
}

function anschluesse() {
  for (const nr of [4, 1, 2]) {
    verschraubung(FY(PORT[nr], ZP), VERSCHRAUBUNG, "leitung", `leitung.verschraubung${nr}`,
      ([a, b]) => [PORT[nr], (a + b) / 2, ZP]);
  }
  for (const nr of [5, 3]) {
    NT.schalldaempfer(FY(PORT[nr], ZP), DAEMPFER, nr, ([a, b]) => [PORT[nr], (a + b) / 2, ZP], R_STUMMEL);
  }
  for (const [nr, variante] of [[14, null], [12, "kolben12"]]) steuerverschraubung(STEUER[nr], String(nr), variante);
}

// --- The overlap, measured on the drawn edges ------------------------------------------------------
/**
 * From the land edges and the groove edges: at which spool travel does each
 * web open? A web is open while no land covers any of it. The figure must
 * show the overlap the model computes with, or the drawing teaches a different
 * valve than the one the page simulates.
 */
function ueberdeckungPruefen() {
  const offen = (steg, s) => BUNDE.every(([a, b]) => b + s <= steg[0] || a + s >= steg[1]);
  const schritte = 7000;
  const wege = { "5|4": STEGE[1], "4|1": STEGE[2], "1|2": STEGE[3], "2|3": STEGE[4] };
  const verlauf = Object.fromEntries(Object.entries(wege).map(([n, steg]) => [n,
    Array.from({ length: schritte + 1 }, (_, i) => offen(steg, (i / schritte) * HUB))]));
  const erstesOffen = (v) => (v.indexOf(true) / schritte) * HUB;
  const letztesOffen = (v) => (v.lastIndexOf(true) / schritte) * HUB;
  const fehler = [];
  // Position 12 (s = 0): 1→2 and 4→5 open, 1→4 and 2→3 shut; position 14 the other way round.
  for (const [n, soll12] of [["5|4", true], ["4|1", false], ["1|2", true], ["2|3", false]]) {
    if (verlauf[n][0] !== soll12) fehler.push(`Stellung 12: Weg ${n} ist ${verlauf[n][0] ? "offen" : "zu"}`);
    if (verlauf[n][schritte] !== !soll12) fehler.push(`Stellung 14: Weg ${n} ist ${verlauf[n][schritte] ? "offen" : "zu"}`);
  }
  for (const steg of [STEGE[0], STEGE[5]]) {
    if (Array.from({ length: 101 }, (_, i) => offen(steg, (i / 100) * HUB)).some(Boolean)) fehler.push(`Endsteg ${steg} öffnet`);
  }
  const oeffnetA = erstesOffen(verlauf["4|1"]);      // 1→4 begins to open
  const oeffnetB = letztesOffen(verlauf["1|2"]);     // 1→2 begins to open, coming back
  const oeffnetA2 = erstesOffen(verlauf["2|3"]);
  const oeffnetB2 = letztesOffen(verlauf["5|4"]);
  const gemessen = (oeffnetA - oeffnetB) / HUB;
  if (Math.abs(gemessen - M.ueberdeckung) > 0.05) fehler.push(`Überdeckung ${gemessen.toFixed(3)} statt ${M.ueberdeckung}`);
  if (Math.abs(oeffnetA2 - oeffnetA) / HUB > 0.05 || Math.abs(oeffnetB2 - oeffnetB) / HUB > 0.05) {
    fehler.push(`2→3 öffnet bei ${oeffnetA2.toFixed(2)}, 1→4 bei ${oeffnetA.toFixed(2)}; 4→5 bei ${oeffnetB2.toFixed(2)}, 1→2 bei ${oeffnetB.toFixed(2)}`);
  }
  // The same points from the model: where wegeOffen first lets air through.
  const modellA = Array.from({ length: 1001 }, (_, i) => i / 1000).find((t) => wegeOffen(t, M.ueberdeckung).a > 0);
  const modellB = Array.from({ length: 1001 }, (_, i) => 1 - i / 1000).find((t) => wegeOffen(t, M.ueberdeckung).b > 0);
  if (Math.abs(modellA - oeffnetA / HUB) > 0.05 || Math.abs(modellB - oeffnetB / HUB) > 0.05) {
    fehler.push(`Modell öffnet bei ${modellA.toFixed(3)} / ${modellB.toFixed(3)}, Zeichnung bei ${(oeffnetA / HUB).toFixed(3)} / ${(oeffnetB / HUB).toFixed(3)}`);
  }
  if (fehler.length) {
    console.error(`Überdeckung falsch gezeichnet:\n  ${fehler.join("\n  ")}`);
    process.exit(1);
  }
  return { oeffnetA, oeffnetB, gemessen };
}

// --- Air: the rooms that fill, and the routes the particles take ---------------------------------------
// Every room is drawn on the cut plane y = 0, over the opening of the hollow
// it fills. It is appended to the item that draws that hollow, so it takes
// exactly that item's place in the painter's order: a fittings stub that
// stands in front of a channel stays in front of its air as well.
const NAEHE = { 4: [BUNDE[0][1], BUNDE[1][0]], 2: [BUNDE[1][1], BUNDE[2][0]] };   // necks at rest
const ZK0 = KAPPE.z1 - (STEUER_V.gewinde[1] - STEUER_V.gewinde[0]);  // bottom of a pilot thread
const KAMMER = { 14: [K14.wand, KOLBEN14[0]], 12: [KOLBEN12[1], K12.wand], z: [ZA - R_KAMMER, ZA + R_KAMMER] };
// The shapes of the rooms are figur/ventilraeume.mjs; this valve says where its necks lie.
const RA = ventilRaeume({
  P, PORT, GEH, PLATTE, DICHT, ZA, ZP, RB, R_NUT, NUT_HALB, R_KANAL, R_GEWINDE, R_HALS, R_BUND,
  GEWINDE_START: VERSCHRAUBUNG.gewinde[0], R_STEUER_BOHRUNG, ZK0, KAMMER_Z: KAMMER.z,
});
// The neck between two lands always opens onto groove 4 (A–B) or groove 2 (B–C): its air is that port's air.
const raumGehaeuse = (nr) => RA.raumUnten(nr, NAEHE[nr] ? RA.halsUnten(...NAEHE[nr]) : "");
const raumUeberSchieber = (nr) => RA.raumOben(nr, NAEHE[nr] ? RA.halsOben(...NAEHE[nr]) : "");
const { raumPlatte, raumDichtung, raumRinne } = RA;

function luftEinfuellen() {
  const item = (name) => {
    const it = R.items.find((i) => i.name === name);
    if (!it) throw new Error(`kein Teil ${name} für die Luft`);
    return it;
  };
  item("gehaeuse.unten").svg += FOLGE.map(raumGehaeuse).join("");
  item("schieber.kolben").svg += FOLGE.map(raumUeberSchieber).join("");
  item("dichtung.platte").svg += FOLGE.map(raumDichtung).join("");
  item("grundplatte.hinten").svg += FOLGE.map(raumPlatte).join("");
  // The step pieces in the order they were built: piece i carries the trough of FOLGE[i].
  const stufen = R.items.filter((i) => i.name.startsWith("grundplatte.stufe"));
  FOLGE.forEach((nr, i) => { stufen[i].svg += raumRinne(nr); });
  item("kappe14.unten").svg += RA.raumSteuer(14, STEUER[14], KAMMER[14]);
  item("rueckstell.unten").svg += RA.raumSteuer(12, STEUER[12], KAMMER[12]);
}

// Particle routes, outside in: from the cut hose end (or the silencer) to the bottom of the groove.
const AUSSEN_WEG = { wege: WEGE, daempfer: DAEMPFER, abluft: [3, 5], gewinde: VERSCHRAUBUNG.gewinde };
const weg = (von, nach) => [...RA.vonAussen(von, AUSSEN_WEG), ...RA.quer(von, nach), ...RA.vonAussen(nach, AUSSEN_WEG).slice().reverse()];
const steuerWeg = (nr) => [...WEGE[nr].slice().reverse(), [STEUER[nr], 0, ZA + R_KAMMER], [STEUER[nr], 0, ZA]];
const ROUTEN = { "1-4": weg(1, 4), "2-3": weg(2, 3), "1-2": weg(1, 2), "4-5": weg(4, 5), st14: steuerWeg(14), st12: steuerWeg(12) };

// --- Compose ---------------------------------------------------------------------------------------------
const UEBERDECKUNG = ueberdeckungPruefen();
const FEDERTEXT = (() => {
  try {
    return federPruefen({ laenge: K12.wand - (K12.x0 + FEDER.sitz), draht: FEDER.draht, windungen: FEDER.windungen }, HUB, FEDER_RESERVE);
  } catch (e) { console.error(e.message); process.exit(1); }
})();

grundplatte();
dichtung();
gehaeuse();
schieber({ bunde: BUNDE, ringe: RINGE, namen: { kolben: "schieber.kolben", hinten: "ringe.hinten", vorn: "ringe.vorn" } });
kappe("kappe14", K14, STEUER[14], true, { nummer: (zeichne) => zeichne("14") });
steuerkolben("kappe14", KOLBEN14, "kappe14.kolben");
// On the right the pilot port only exists in the bistable variant: the spring variant shows a closed cap.
kappe("rueckstell", K12, STEUER[12], false, {
  nummer: (zeichne) => zeichne("12"),
  mitPort: (svg) => `<g data-variante="kolben12">${svg}</g>`,
  ohnePort: (svg) => `<g data-variante="feder">${svg}</g>`,
});
rueckstellung();
schrauben({ oben: [7, 123], kappen: [[K14.x0, -1, "kappe14"], [K12.x1, 1, "rueckstell"]] });
anschluesse();
schlaeuche(WEGE, {
  istSteuer: (nr) => nr === "12" || nr === "14",
  name: (gruppe, nr) => `${gruppe}.schlauch${nr}`,
  variante: (nr) => (nr === "12" ? "kolben12" : null),
});
luftEinfuellen();

const LEGENDE_IDS = LEGENDE.map((e) => e.piece);
for (const it of R.items) {
  if (!LEGENDE_IDS.includes(it.piece)) throw new Error(`Teil ${it.name} hat keine Legendennummer (${it.piece})`);
}

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

// A number hangs on a part that is drawn in both variants: the parts of one
// variant only are hidden in the other and would leave the leader pointing at nothing.
const { KEYS, LIFT, VIEW0, VIEW1, MITTE } = EX.vorbereiten(R, P, MOVE, W, H, {
  anker: (it) => !/data-variante=/.test(it.svg ?? ""),
});
if (STAGGER.length !== LEGENDE_IDS.length || !LEGENDE_IDS.every((id) => STAGGER.includes(id))) {
  throw new Error("STAGGER und LEGENDE nennen nicht dieselben Baugruppen");
}

// The air routes, projected once: the page places particles along them.
const BAHNEN = Object.fromEntries(Object.entries(ROUTEN).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]));

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "Ein 5/2-Wegeventil in Schieberbauart nach ISO 5599-1, Größe 1, auf seiner Grundplatte, in der Ebene des Schiebers aufgeschnitten. "
    + "Man sieht die Bohrung mit fünf Ringnuten, den Steuerschieber mit drei Bunden und Dichtringen, die fünf Kanäle hinunter in die Grundplatte "
    + "und die Anschlüsse 1 bis 5 mit Schläuchen und Schalldämpfern. Links sitzt die Endkappe mit dem Steuerkolben 14, rechts die Rückstellseite "
    + "mit Feder oder zweitem Steuerkolben 12. Die Druckluft ist eingefärbt: das kräftige Blau steht unter Druck, das blasse ist Abluft "
    + "auf dem Weg zum Schalldämpfer. In der Ausgangsstellung 12 ist 1 mit 2 verbunden und 4 mit 5.",
  body: [
    R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}"${it.feder ? ` data-feder="${it.feder.join(" ")}"` : ""}>${it.svg}</g>`).join(""),
    `<g class="luft" data-luftlage=""></g>`,
  ],
})
  // The page starts monostable: the second pilot piston and its port are hidden.
  .replaceAll('<g data-variante="kolben12">', '<g data-variante="kolben12" hidden="">');

// --- The symbol beside the card ------------------------------------------------------------------------
const FELD = 60;
const symbol = (rechts) => wegeventilSymbol(VENTIL_5_2, { links: "pneumatisch", rechts, feld: FELD }).svg;
const BEIFIGUR = `<p class="beifigur-titel">Schaltzeichen</p>`
  + `<div class="beifigur-symbol" data-variante="feder">${symbol("feder")}</div>`
  + `<div class="beifigur-symbol" data-variante="kolben12" hidden="">${symbol("pneumatisch")}</div>`
  + `<p class="beifigur-text">Jedes Kästchen ist eine Stellung: links 14, rechts 12. Die Anschlüsse 1 bis 5 stehen fest, `
  + `die Kästchen gleiten darunter – so wie der Schieber in der Bohrung.</p>`;

// --- The page --------------------------------------------------------------------------------------------
const M_ANZEIGE = ventilAnzeige(neuesVentil(M, { art: VENTIL_5_2 }), M, 6);
/** s of model time a pulse lasts (bistable); the prose times its switch with the same pulse. */
const IMPULS = 0.15;
/** Button title and card hint per type: held on the monostable valve, one press on the bistable. */
const BEDIENTEXT = {
  mono: { titel14: "Gedrückt halten: Steuerluft an 14", hinweis: "Signal 14 halten, Zeitlupe, zerlegen" },
  bi: { titel14: "Kurz drücken: ein Impuls Steuerluft an 14", hinweis: "Signal 14 oder 12 kurz drücken, Zeitlupe, zerlegen" },
};
const komma = (x, n = 1) => x.toFixed(n).replace(".", ",");
const ANZEIGE = `p2 ${komma(M_ANZEIGE.drucke[2])} bar · p4 ${komma(M_ANZEIGE.drucke[4])} bar · Schaltzeit ${M_ANZEIGE.schaltzeitMs ?? "–"} ms`;

const live = `
const MASSE = ${JSON.stringify(M)};
const ART = ${JSON.stringify(VENTIL_5_2)};
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
const AUTO_TAKT = 1.6;    // s of model time between two automatic signals
const IMPULS = ${IMPULS};      // s of model time a pulse lasts (bistable)
const BEDIENTEXT = ${JSON.stringify(BEDIENTEXT)};

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
const v = neuesVentil(MASSE, { art: ART, bauart: "monostabil", druckBar: 6 });
const ANSCHLUESSE = ["2", "4"];   // working ports the readout names
const schaltzeitOptionen = () => (v.bauart === "bistabil"
  ? { art: ART, bauart: v.bauart, impuls: IMPULS } : { art: ART, bauart: v.bauart });   // bistable with the page's own pulse, as a press of the button gives it
const raeume = Array.from(svg.querySelectorAll("[data-raum]"));
const steuerkammer = {
  "14": svg.querySelector('[data-steuerkammer="14"]'),
  "12": svg.querySelector('[data-steuerkammer="12"]'),
};
const luftLage = svg.querySelector("[data-luftlage]");
const stroeme = {};
for (const name in BAHNEN) stroeme[name] = stromBauen(luftLage, name, BAHNEN[name], Math.max(5, Math.round(BAHNEN[name].gesamt / 26)));

function kammerD(x0, x1) {
  const z0 = KAMMER.z[0], z1 = KAMMER.z[1];
  return "M" + [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
    .map((q) => iso([q[0], 0, q[1]], P).map((n) => n.toFixed(1)).join(" ")).join("L") + "Z";
}

// The pilot chambers grow and shrink with the spool; everything else that
// slides is figur/ventilseite.mjs.
function zeichneKammern(s) {
  steuerkammer["14"].setAttribute("d", kammerD(KAMMER["14"][0], KAMMER["14"][1] + s));
  steuerkammer["12"].setAttribute("d", kammerD(KAMMER["12"][0] + s, KAMMER["12"][1]));
}

// The air: figur/ventilseite.mjs says how a room and a stream are drawn; this valve says which are which.
function zeichneLuft(dt) {
  const F = luftFarben();
  const quelle = AUSSEN + druck;
  const o = wegeOffen(v.anteil, MASSE.ueberdeckung);
  const q14 = o.a * MASSE.leitwertZu * (quelle - v.p[4]);
  const q12 = o.b * MASSE.leitwertZu * (quelle - v.p[2]);
  const q23 = o.a * MASSE.leitwertAb * (v.p[2] - AUSSEN);
  const q45 = o.b * MASSE.leitwertAb * (v.p[4] - AUSSEN);
  const ton = (p, raus) => luftTon(F, p, raus);
  const farbe = {
    "1": ton(quelle, false),
    "2": ton(v.p[2], entlueftet(o.a, v.p[2])),
    "4": ton(v.p[4], entlueftet(o.b, v.p[4])),
    "3": entlueftet(o.a, v.p[2]) ? F.abluft : "none",
    "5": entlueftet(o.b, v.p[4]) ? F.abluft : "none",
    "14": ton(v.p14, steuerRaus(v.signal14, v.p14)),
    "12": ton(v.p12, steuerRaus(v.signal12, v.p12)),
  };
  setzeRaumFarben(farbe);

  stromSchritt(stroeme["1-4"], dt, luftTempo(q14), o.a, F.druck);
  stromSchritt(stroeme["1-2"], dt, luftTempo(q12), o.b, F.druck);
  stromSchritt(stroeme["2-3"], dt, luftTempo(q23), o.a, F.abluft);
  stromSchritt(stroeme["4-5"], dt, luftTempo(q45), o.b, F.abluft);
  steuerStrom("st14", dt, v.signal14, v.p14, quelle, F, false);
  steuerStrom("st12", dt, v.signal12, v.p12, quelle, F, v.bauart === "monostabil");
  blendeLeereStroeme();
}

// --- controls -------------------------------------------------------------
const knopf14 = document.getElementById("btn-14");
const knopf12 = document.getElementById("btn-12");
const knopfBauart = document.getElementById("btn-bauart");
const knopfAuto = document.getElementById("btn-auto");

const mono = () => v.bauart === "monostabil";
function zeichneBedienung() {
  if (knopf14.getAttribute("aria-pressed") !== String(v.signal14)) knopf14.setAttribute("aria-pressed", String(v.signal14));
  if (knopf12.getAttribute("aria-pressed") !== String(v.signal12)) knopf12.setAttribute("aria-pressed", String(v.signal12));
  zeichneHandRegler();
}

// The signal buttons (hold, pulse, automatic cycle) are figur/bedienung.mjs;
// this page says what a signal does to its valve.
const bed = bedienungSignale({
  namen: ["14", "12"],
  impuls: IMPULS,
  autoTakt: AUTO_TAKT,
  autoAn: !still.matches,
  erster: "14",
  haltenModus: mono,
  setzeSignal: (n, an) => ventilSignal(v, n, an),
  autoSchritt: (b) => {
    if (mono()) ventilSignal(v, "14", !v.signal14);
    else { b.impuls(b.naechstes); b.naechstes = b.naechstes === "14" ? "12" : "14"; }
  },
  // Monostable: the automatic cycle releases the signal it holds.
  autoEnde: (b) => { if (mono() && !b.gehalten["14"]) ventilSignal(v, "14", false); },
  autoAnzeige: (an) => knopfAuto.setAttribute("aria-pressed", String(an)),
  geaendert: () => { angehalten = false; zeichneBedienung(); run(); },
});
const stoppeAuto = () => bed.autoAus();
bed.knopf(knopf14, "14");
bed.knopf(knopf12, "12");

function zeigeBauart() {
  const bi = !mono();
  knopfBauart.setAttribute("aria-pressed", String(bi));
  // Figure and symbol: one right-hand side per type. SVG elements have no
  // hidden property, so the attribute is set; a CSS rule gives it effect.
  for (const el of document.querySelectorAll("[data-variante]")) {
    el.toggleAttribute("hidden", el.dataset.variante !== (bi ? "kolben12" : "feder"));
  }
  knopf12.disabled = !bi;
  knopf12.title = bi ? "Signal an 12: zurück in die Stellung 12" : "Feder stellt zurück";
  // Signal 14 is held on the monostable valve and pressed once on the bistable one.
  knopf14.title = bi ? BEDIENTEXT.bi.titel14 : BEDIENTEXT.mono.titel14;
  const hinweis = document.querySelector('[data-corner="hint"]');
  if (hinweis) hinweis.textContent = bi ? BEDIENTEXT.bi.hinweis : BEDIENTEXT.mono.hinweis;
  zeichneSymbol();
}
function wechsleBauart(bauart) {
  bauartWechseln(v, MASSE, bauart, druck);
  bed.zuruecksetzen();
  zeigeBauart();
}
knopfBauart.addEventListener("click", () => {
  wechsleBauart(mono() ? "bistabil" : "monostabil");
  angehalten = false;
  zeichneBedienung();
  run();
});

knopfAuto.addEventListener("click", () => {
  if (bed.auto) stoppeAuto();
  else bed.autoStart(v.anteil > 0.5 ? "12" : "14");
  angehalten = false;
  run();
});
knopfAuto.setAttribute("aria-pressed", String(bed.auto));

bindeRegler();

// Before taking it apart: no automatic, no signal, no hand, spool home in
// position 12 — or the spool would leave its bore from somewhere else.
function vorDemZerlegen() {
  stoppeAuto();
  wechsleBauart(v.bauart);
  zeichneHub();
  zeichneBedienung();
}

zeigeBauart();
zeichneHub();
zeichneLuft(0);
zeichneAnzeige();
poseExplode();

// A handle for the browser test and for screenshots: it puts the figure into
// a known state instead of waiting and hoping to catch the right moment.
window.__figur = {
  MASSE,
  modell: () => v,
  offen: () => offenAnteil(),
  zerlegt: () => zerlegt,
  stelle(anteil, bauart) {
    stoppeAuto();
    angehalten = true;
    if (bauart && bauart !== v.bauart) wechsleBauart(bauart);
    vonHand(v, anteil);
    zeichneHub();
    zeichneLuft(0);
    zeichneAnzeige();
    zeichneBedienung();
    zeichneSymbol();
  },
  signal(name, an) {
    stoppeAuto();
    angehalten = false;
    ventilSignal(v, String(name), an);
    zeichneBedienung();
    run();
  },
  weiter: () => { angehalten = false; run(); },
  spiele,
  waehle,
};
`;

const INFO =
  "Signal 14 schaltet um: beim monostabilen Ventil, solange man den Knopf hält, beim bistabilen mit einem kurzen Druck. "
  + "Das kräftige Blau steht unter Druck, das blasse ist Abluft auf dem Weg zum Schalldämpfer. "
  + "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const LEISTE =
  knopf("btn-14", "Signal 14", { titel: BEDIENTEXT.mono.titel14 })
  + knopf("btn-12", "Signal 12", { titel: "Feder stellt zurück" }).replace('id="btn-12"', 'id="btn-12" disabled')
  + knopf("btn-bauart", "Bistabil", { titel: "Umschalten zwischen Federrückstellung (monostabil) und Impulsventil (bistabil)" })
  + knopf("btn-auto", "Automatik", { gedrueckt: true })
  + knopf("btn-explode", "Zerlegen und zusammenbauen")
  + `<span class="luecke"></span>`
  + hausBedienung()
  + `<span class="umbruch"></span>`
  // Each slider stays one unit with its label and value when the bar wraps on a phone.
  + VS.reglerLeiste({ handBeschreibung: "Schieber von Hand: 0 % ist Stellung 12, 100 % ist Stellung 14" });

const ms = (zeit) => Math.round(zeit * 1000);
const A_ST = (Math.PI * M.steuerkolben ** 2) / 4;
const LOS = (M.federVor + M.haftreibung) / (0.1 * A_ST);
const LOS_BI = M.haftreibung / (0.1 * A_ST);
// The switching times the prose names, per type, from the model at build time.
const T = {
  mono14: ventilSchaltzeit(M, 6, { art: VENTIL_5_2 }),
  mono12: ventilSchaltzeit(M, 6, { art: VENTIL_5_2, richtung: "12" }),
  mono14bei2: ventilSchaltzeit(M, 2, { art: VENTIL_5_2 }),
  bi14: ventilSchaltzeit(M, 6, { art: VENTIL_5_2, bauart: "bistabil", impuls: IMPULS }),
  bi12: ventilSchaltzeit(M, 6, { art: VENTIL_5_2, bauart: "bistabil", richtung: "12", impuls: IMPULS }),
};
if (ms(T.bi14) !== ms(T.bi12)) throw new Error("bistabil: 14 und 12 schalten verschieden schnell – Text anpassen");
const LESETEXT = `<div class="lesetext">
<h2>Was man sieht</h2>
<p>Das Ventil ist in der Ebene des Schiebers aufgeschnitten; die vordere Hälfte fehlt. In der Mitte liegt die Bohrung
mit fünf Ringnuten. Jede Ringnut gehört zu einem Anschluss und führt über einen Kanal hinunter in die Grundplatte, wo
die Anschlüsse 1 bis 5 sitzen. In der Bohrung gleitet der Steuerschieber. Seine drei dicken <strong>Bunde</strong>
sperren, die dünnen <strong>Hälse</strong> dazwischen verbinden zwei benachbarte Ringnuten. Links und rechts sitzen die
Endkappen mit den Steuerkammern 14 und 12.</p>
<p>Wo Luft unter Druck steht, ist der Raum mit <strong>kräftigem Blau</strong> gefüllt. <strong>Blasses Blau</strong>
ist Abluft, die gerade über einen Schalldämpfer entweicht. Die Punkte zeigen, welche Wege offen sind: Sie laufen,
solange Luft strömt, und bleiben stehen, wenn sich der Druck ausgeglichen hat.</p>

<h2>Zwei Stellungen</h2>
<p>In der <strong>Stellung 12</strong>, der Ausgangsstellung, liegt der Schieber links. Der Hals zwischen dem mittleren
und dem rechten Bund verbindet <strong>1 mit 2</strong>, der linke Hals verbindet <strong>4 mit 5</strong>. An 2 steht
also Druck an, und 4 ist über den Schalldämpfer entlüftet.</p>
<p>Kommt Steuerluft an 14, schiebt der Steuerkolben den Schieber um ${komma(HUB, 0)} mm nach rechts in die
<strong>Stellung 14</strong>. Jetzt verbindet der linke Hals <strong>1 mit 4</strong> und der rechte <strong>2 mit 3</strong>.
Die Zahlen verraten das selbst: Das Signal 14 verbindet 1 mit 4, das Signal 12 verbindet 1 mit 2.</p>

<h2>Warum in der Mitte kurz alles zu ist</h2>
<p>Die Bunde sind etwas länger, als sie sein müssten. Darum öffnet der neue Weg erst, wenn der alte schon geschlossen
ist: In diesem Ventil schließt 1→2 bei ${komma(S_B, 2)} mm Schieberweg, und 1→4 öffnet erst bei ${komma(S_A, 2)} mm.
Auf den ${komma(S_A - S_B, 2)} mm dazwischen, ${Math.round(M.ueberdeckung * 100)} % des Hubs, sind <strong>alle Wege
zu</strong>. Das nennt man <strong>positive Überdeckung</strong>. Sie verhindert, dass beim Umschalten Druckluft von 1
geradewegs in die Abluft strömt. Probier es aus: Stell den Schieber von Hand auf 50 %. Kein Punkt ist zu sehen, und die
Drücke an 2 und 4 bleiben stehen, wo sie waren.</p>

<h2>Monostabil oder bistabil?</h2>
<p>Beim <strong>monostabilen</strong> Ventil drückt rechts eine Feder gegen den Schieber. Es hat nur eine stabile Lage,
die Stellung 12. Solange Signal 14 anliegt, bleibt es in Stellung 14; fällt das Signal weg, schiebt die Feder den
Schieber zurück. Deshalb muss man den Knopf „Signal 14“ gedrückt halten.</p>
<p>Beim <strong>bistabilen</strong> Ventil sitzt statt der Feder ein zweiter Steuerkolben. Ein kurzer Druckstoß an 14
oder an 12 genügt, und das Ventil bleibt in der neuen Stellung, auch wenn das Signal wieder weg ist. Es merkt sich also
die letzte Stellung; man nennt es darum auch <strong>Impulsventil</strong>. Kommen beide Signale zugleich, bleibt der
Schieber, wo er ist.</p>

<h2>Die alten Buchstaben</h2>
<p>Auf älteren Plänen und Ventilen stehen statt der Zahlen Buchstaben: <strong>P</strong> für den Druckluftanschluss
(heute 1), <strong>A</strong> und <strong>B</strong> für die Arbeitsanschlüsse (heute 2 und 4), <strong>R</strong> und
<strong>S</strong> für die Entlüftungen (heute 3 und 5). Auch die Steueranschlüsse trugen früher Buchstaben (Z, Y und X);
welcher zu welcher Zahl gehört, steht hier bewusst nicht, denn das hängt von der Ausgabe der Norm ab. Die Zahlen nach
ISO 5599-3 haben einen Vorteil: Man liest an der Steuerleitung ab, was sie bewirkt.</p>

<h2>Wovon die Schaltzeit abhängt</h2>
<p>Die Anzeige nennt die <strong>Schaltzeit</strong>: die Zeit vom Signal, bis der Schieber 98 % seines Weges geschafft
hat. Im Modell hängt sie fast nur an der Steuerkammer. Die Steuerluft kommt durch eine enge Leitung und muss die Kammer erst
füllen. Erst wenn der Druck auf dem Steuerkolben genug Kraft aufbringt, um Feder und Haftreibung zu überwinden, setzt
sich der Schieber in Bewegung. Der Schieber selbst wiegt nur ${Math.round(M.masseSchieber * 1000)} g und wäre ohne das
Füllen der Kammer fast sofort drüben. Darum schalten die beiden Bauarten verschieden schnell.</p>
<p class="formel">
A<sub>Steuerkolben</sub> = π/4 · ${M.steuerkolben}² = <strong>${komma(A_ST)} mm²</strong><br>
bei 6 bar: F = 0,6 N/mm² · ${komma(A_ST)} mm² = <strong>${Math.round(0.6 * A_ST)} N</strong><br>
Feder ${M.federVor} N + Haftreibung ${M.haftreibung} N = ${M.federVor + M.haftreibung} N → der Schieber löst sich ab
<strong>${komma(LOS, 2)} bar</strong> in der Steuerkammer (monostabil)<br>
ohne Feder nur Haftreibung ${M.haftreibung} N → der Schieber löst sich schon ab <strong>${komma(LOS_BI, 2)} bar</strong> (bistabil)
</p>
<p>Das <strong>monostabile</strong> Ventil braucht bei 6 bar ${ms(T.mono14)} ms bis in die Stellung 14 und
${ms(T.mono12)} ms, bis die Feder es zurückgestellt hat. Bei 2 bar sind es ${ms(T.mono14bei2)} ms bis in die Stellung 14:
Mit weniger Druck füllt sich die Kammer langsamer, und der Kolben drückt schwächer gegen die Feder.</p>
<p>Das <strong>bistabile</strong> Ventil schaltet bei 6 bar mit einem Impuls von ${ms(IMPULS)} ms in
${ms(T.bi14)} ms, in beide Richtungen gleich schnell. Ihm fehlt die Feder: Der Steuerkolben muss nur die Haftreibung
überwinden, und dafür genügt schon ein wenig Druck in der Kammer.</p>
<p>Datenblätter nennen für Ventile dieser Größe 12 bis 52 ms. Diese Werte gelten für Ventile mit Federrückstellung und
für magnetbetätigte Ventile; ohne Feder schaltet das Impulsventil schneller. Die Spanne gilt bei 6 bar: bei 2 bar liegt das
Modell mit ${ms(T.mono14bei2)} ms darüber. Mit der Zeitlupe (1× bis 1/50) sieht man,
wie sich die Steuerkammer erst füllt und der Schieber dann losläuft.</p>
<p class="hinweis">Jede Zahl auf dieser Seite wird aus demselben Modell gerechnet, das auch den Schieber bewegt. Kräfte
sind theoretische Werte; die Reibung der Dichtungen zieht in der Praxis noch einmal 3 bis 10 Prozent ab. Baulänge, Bohrung, Hub, Steuerkolben, Federkraft, Überdeckung und das Volumen hinter 2 und 4
sind Annahmen; sie stehen in der Anleitung zur Figur.</p>
<a class="zurueck" href="../">← Zurück zur Übersicht</a>
</div>`;

// What only this page needs on top of the shared sheet.
const EIGENES_CSS = `${VS.CSS}
#btn-14, #btn-12 { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none }
`;

writeFileSync(ZIEL, seite({
  titel: "5/2-Wegeventil – Pneumatik",
  fig: "Bild 1",
  kartenTitel: "5/2-Wegeventil, Längsschieber",
  hinweis: BEDIENTEXT.mono.hinweis,
  anzeige: ANZEIGE,
  schluessel: [
    { mark: "blue", label: "Kräftiges Blau: Druckluft unter Druck" },
    { mark: "dotted", label: "Blasses Blau: Abluft auf dem Weg zum Schalldämpfer" },
    { mark: "lit", label: "Schieber, Dichtringe und Steuerkolben – was sich bewegt" },
    { mark: "dim", label: "Gehäuse, Kappen und Grundplatte sind in der Ebene des Schiebers aufgeschnitten" },
  ],
  caption:
    "Längsschieberventil nach ISO 5599-1, Größe 1 (G1/4), auf seiner Grundplatte. Wo der Schieber steht, bestimmt, "
    + "welche Ringnuten verbunden sind: in Stellung 12 strömt die Luft von 1 nach 2, und 4 entlüftet über 5; in Stellung 14 "
    + "strömt sie von 1 nach 4, und 2 entlüftet über 3.",
  svg,
  leiste: LEISTE,
  legende: LEG.knoepfe(LEGENDE),
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  breite: 1240,
  buehneLabel: "5/2-Wegeventil im Schnitt: Schieber, Luftwege und Baugruppen",
  beiFigur: BEIFIGUR,
  beiFigurLabel: "Schaltzeichen",
}).replace("</style>", `${EIGENES_CSS}</style>`));

console.log(`geschrieben: ${ZIEL}`);
console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
console.log(`Überdeckung: 1→4 öffnet bei ${UEBERDECKUNG.oeffnetA.toFixed(2)} mm, 1→2 bei ${UEBERDECKUNG.oeffnetB.toFixed(2)} mm `
  + `→ ${(UEBERDECKUNG.gemessen * 100).toFixed(1)} % des Hubs (Modell ${M.ueberdeckung * 100} %)`);
console.log(FEDERTEXT);

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
    allow: [
      // The two variants of the return side fill the same space on purpose:
      // spring and second pilot piston are both drawn, the page shows one.
      // No drawing order between them is right, and none is ever seen.
      // (Spring, its plate and piston 12 also share the owner
      // "rueckstell.variante", so the support check does not call them sunk.)
      ["rueckstell.feder", "rueckstell.kolben12"],
    ],
    crowd: [],
    cover: [],
  });
}
