// The body section helpers shared by the valve pages: the properties the
// pages rely on, without a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { gehaeuseSchnitt, bogen, hohlTon, nahtlos, ohne } from "../gehaeuse.mjs";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";

const P = k.fitProjection([[0, -20, 0], [100, 20, 70]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
const ZA = 44;
const NUTEN = [[18, 32], [38, 52]];
const FX = G.frameOf([0, 0, ZA], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const aufgenommen = [];
const items = [];
const R = { solid: (s) => { aufgenommen.push(s); return s; }, put: (item) => { items.push(item); return item; }, nameFor: (n) => n };
const GH = gehaeuseSchnitt({
  P, R, PIECE_OF: {}, MOVE: {}, FX, FY: (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), FZ, NUTEN,
  STEGE: [[0, 18], [32, 38], [52, 60]], FOLGE: [1, 2], PORT: { 1: 25, 2: 45 }, RB: 6.5, R_NUT: 10.5, ZA,
  GEH: { x0: 0, x1: 60, y0: -21, z0: 18, z1: 66 }, PLATTE: { x0: -6, x1: 66, y0: -24, y1: 24, z0: 0, z1: 17 },
  DICHT: { x0: -1, x1: 61, y0: -22, z0: 17, z1: 18 }, R_KANAL: 4, ZP: 8.5, R_GEWINDE: 6.5, Y_BOHR: -4.5,
});

test("bogen liefert n + 1 Winkel von Anfang bis Ende", () => {
  const w = bogen(1, 3, 4);
  assert.equal(w.length, 5);
  assert.equal(w[0], 1);
  assert.equal(w[4], 3);
});

test("Hohlraum nimmt nur die zwei dunkelsten Töne", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(hohlTon), [0, 0, 0, 1, 1, 1]);
});

test("nahtlos packt den Inhalt in eine Gruppe mit eigener Strichfarbe", () => {
  assert.match(nahtlos("<path/>"), /^<g class="iso-solid" data-seamless=""><path\/><\/g>$/);
});

test("ohne: Kiste minus Loch bleibt überschneidungsfrei und erhält das Volumen", () => {
  const vol = ([a, b]) => (b[0] - a[0]) * (b[1] - a[1]) * (b[2] - a[2]);
  const teile = ohne([0, 0, 0], [10, 10, 10], [[[3, 0, 3], [6, 10, 6]]]);
  assert.ok(Math.abs(teile.reduce((s, t) => s + vol(t), 0) - (1000 - 3 * 10 * 3)) < 1e-9);
  // a hole outside the box changes nothing
  assert.equal(ohne([0, 0, 0], [10, 10, 10], [[[20, 0, 0], [30, 10, 10]]]).length, 1);
});

test("box teilt lange Blöcke entlang x, damit kein Körper als Stab gilt", () => {
  aufgenommen.length = 0;
  const teile = GH.box([0, -10, 0], [60, 0, 20], { name: "t" });
  assert.equal(teile.length, 3);
  assert.equal(aufgenommen.length, 3);
  assert.equal(GH.box([0, -10, 0], [20, 0, 20], { name: "t" }).length, 1);
});

test("Bohrungsradius: Nutradius in der Nut, sonst Bohrung", () => {
  assert.equal(GH.rBohrung(25), 10.5);
  assert.equal(GH.rBohrung(35), 6.5);
  assert.equal(GH.rBohrung(18), 6.5, "die Nutkante gehört nicht zur Nut");
});

test("Bohrungskante läuft von a nach b und springt an jeder Nutkante", () => {
  const p = GH.bohrungsKante(0, 60, 1);
  assert.deepEqual(p[0], [0, 0, ZA + 6.5]);
  assert.deepEqual(p[p.length - 1], [60, 0, ZA + 6.5]);
  assert.equal(p.length, 2 + 2 * 4);
  const zurueck = GH.bohrungsKante(60, 0, -1);
  assert.deepEqual(zurueck[0], [60, 0, ZA - 6.5]);
  assert.ok(zurueck.every((q, i) => i === 0 || q[0] <= zurueck[i - 1][0]), "x fällt monoton");
});

test("Kanalenden: auf der Nut und auf dem Gewinde", () => {
  assert.ok(Math.abs(GH.aufNut([0, 0, 0]) - (ZA - 10.5)) < 1e-9);
  assert.ok(Math.abs(GH.aufGewinde(25)([25, 0, 0]) - (8.5 + 6.5)) < 1e-9);
});

test("Bohrung, Kanal und Schlauchende liefern Zeichnung", () => {
  assert.match(GH.gehaeuseBohrung(), /^<g class="iso-solid" data-seamless="">.*<path class="iso-shade"/);
  assert.match(GH.kanalInnen(25, () => 0, GH.aufNut), /<path class="iso-shade" data-shade="[01]"/);
  const ende = GH.schnittEnde([[0, 0, 0], [0, 10, 0], [0, 20, 0]], 4, 3);
  const weg = GH.schnittEnde([[0, 20, 0], [0, 10, 0], [0, 0, 0]], 4, 3);
  assert.ok(ende === "" || weg === "", "nur ein Ende zeigt zum Betrachter");
  assert.ok((ende || weg).includes("iso-fill"));
});

test("Grundplatte, Dichtung und Gehäuse legen ihre Teile in die Gruppe ab, die gesetzt ist", () => {
  items.length = 0;
  const PIECE = { grundplatte: "grundplatte", dichtung: "dichtung", gehaeuse: "gehaeuse" };
  const R2 = { ...R };
  const G2 = gehaeuseSchnitt({
    P, R: R2, PIECE_OF: PIECE, MOVE: { grundplatte: [0, 0, -35], dichtung: [0, 0, 22], gehaeuse: [0, 0, 50] }, FX, FY: (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), FZ, NUTEN,
    STEGE: [[0, 18], [32, 38], [52, 60]], FOLGE: [1, 2], PORT: { 1: 25, 2: 45 }, RB: 6.5, R_NUT: 10.5, ZA,
    GEH: { x0: 0, x1: 60, y0: -21, z0: 18, z1: 66 }, PLATTE: { x0: -6, x1: 66, y0: -24, y1: 24, z0: 0, z1: 17 },
    DICHT: { x0: -1, x1: 61, y0: -22, z0: 17, z1: 18 }, R_KANAL: 4, ZP: 8.5, R_GEWINDE: 6.5, Y_BOHR: -4.5,
  });
  G2.grundplatte(); G2.dichtung(); G2.gehaeuse();
  const gruppen = new Set(items.map((i) => i.piece));
  assert.deepEqual([...gruppen].sort(), ["dichtung", "gehaeuse", "grundplatte"]);
  assert.ok(items.filter((i) => i.piece === "grundplatte").length >= 3, "Platte hinten, Stufen, Front");
  assert.deepEqual(items.find((i) => i.piece === "grundplatte").move, [0, 0, -35]);
  assert.ok(items.every((i) => i.shapes.length > 0 && !i.svg.includes("NaN")));
});

test("Schieber, Kolben, Feder und Schrauben: Namen, Naben-Gruppe, Variante, Gruppe der Kappe", () => {
  const items2 = [];
  const R3 = { solid: (s) => s, put: (i) => { items2.push(i); return i; }, nameFor: (n) => n };
  const PIECE = { schieber: "schieber", ringe: "ringe", kappe: "kappe", rueckstell: "rueckstell", schrauben: "schrauben" };
  const H = gehaeuseSchnitt({
    P, R: R3, PIECE_OF: PIECE, MOVE: {}, FX, FY: () => null, FZ, NUTEN, STEGE: [], FOLGE: [], PORT: {}, RB: 6.5, R_NUT: 10.5, ZA,
    GEH: { x0: 0, x1: 60, y0: -21, z0: 18, z1: 66 }, PLATTE: {}, DICHT: {}, R_KANAL: 4, ZP: 8.5, R_GEWINDE: 6.5, Y_BOHR: -4.5,
    R_KAMMER: 10, R_KOLBEN: 9.8, KAPPE: { y0: -20, z0: 23, z1: 65 }, STEUER_V: {}, R_STEUER_GEWINDE: 2.5, R_STEUER_BOHRUNG: 1.5,
    SP: [-7, 60], R_HALS: 3.6, R_BUND: 6.3, R_RINGNUT: 5.3, RING_B: 2.2,
  });
  H.schieber({ bunde: [[-7, 11], [40, 60]], ringe: [4, 50], namen: { kolben: "nc.kolben", hinten: "nc.ring.hinten", vorn: "nc.ring.vorn" }, variante: "nc", owner: "x" });
  const kolben = items2.find((i) => i.name === "nc.kolben");
  assert.ok(kolben.svg.startsWith('<g data-variante="nc"><g data-hub="">'), "Variante außen, Nabe innen");
  assert.equal(kolben.shapes[0].owner, "x");
  assert.equal(items2.filter((i) => i.name === "nc.ring.hinten").length, 2, "ein Ring je Rille");
  assert.ok(items2.every((i) => i.piece === "schieber" || i.piece === "ringe"));
  items2.length = 0;
  H.steuerkolben("kappe", [-13, -7], "kappe.kolben");
  assert.equal(items2[0].piece, "kappe");
  assert.ok(items2[0].svg.startsWith('<g data-hub="">'));
  items2.length = 0;
  H.federsitz({ x0: 90, wand: 107 }, { sitz: 2, draht: 1.1, windungen: 4.5, rWindung: 7 });
  assert.deepEqual(items2[0].feder, [92, 107]);
  assert.ok(items2[0].svg.includes("data-federx"), "die Windungen tragen ihr x");
  items2.length = 0;
  H.schrauben({ oben: [7, 53], kappen: [[-22, -1, "kappe"], [112, 1, "rueckstell"]] });
  assert.deepEqual(items2.map((i) => i.piece), ["schrauben", "schrauben", "kappe", "kappe", "rueckstell", "rueckstell"]);
});
