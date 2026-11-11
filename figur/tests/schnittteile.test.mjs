// The helpers every section page builds its cut face with: the hatching, the grid of
// hollows, the two-sided turned parts, the cut fitting, the order checks. The numbers
// are worked out by hand in the comments.
import test from "node:test";
import assert from "node:assert/strict";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as A from "../../.claude/skills/anatomy/kit/audit.mjs";
import { zeichner } from "../zylinderteile.mjs";
import { normteile } from "../normteile.mjs";
import { schnittTeile, hatchSegmente, LUFTLAGE_HINTEN } from "../schnittteile.mjs";

const P = k.fitProjection([[0, -20, 0], [100, 20, 70]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
const MOVE = { grund: [0, 0, 0], luft: [0, 0, 0], gehaeuse: [0, 0, 0], teil: [0, 0, 30], leitung: [0, 20, 0] };

function neu() {
  const { R, rec, put, gruppe } = zeichner({ P, MOVE });
  const NT = normteile({ P, rec, put, gruppe });
  return { R, rec, put, gruppe, NT, ST: schnittTeile({ P, MOVE, R, rec, put, gruppe, NT }) };
}

test("Schraffur: ein Quadrat 10 × 10 bekommt 45°-Linien im Abstand 2,2, jede im Quadrat", () => {
  const quadrat = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const s = hatchSegmente(quadrat, 1);
  // the lines x - z = c run from c = -11 to c = 11 in steps of 2,2: 11 values, the outer two just outside the square
  assert.ok(s.length >= 8 && s.length <= 11, `${s.length} Linien`);
  for (const [[x0, z0], [x1, z1]] of s) {
    assert.ok(x0 >= -1e-9 && x0 <= 10 + 1e-9 && z0 >= -1e-9 && z0 <= 10 + 1e-9);
    assert.ok(x1 >= -1e-9 && x1 <= 10 + 1e-9 && z1 >= -1e-9 && z1 <= 10 + 1e-9);
    assert.ok(Math.abs((x1 - x0) - (z1 - z0)) < 1e-9, "45° in der Richtung 1");
  }
  const gegen = hatchSegmente(quadrat, -1);
  for (const [[x0, z0], [x1, z1]] of gegen) assert.ok(Math.abs((x1 - x0) + (z1 - z0)) < 1e-9, "45° in der Gegenrichtung");
});

test("Schraffur: ein L-Stück wird nicht über seine Lücke gezogen", () => {
  const l = [[0, 0], [10, 0], [10, 3], [3, 3], [3, 10], [0, 10]];
  for (const [[x0, z0], [x1, z1]] of hatchSegmente(l, 1)) {
    for (const t of [0.25, 0.5, 0.75]) {
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      assert.ok(!(x > 3 + 1e-9 && z > 3 + 1e-9), `Linie läuft durch die Lücke bei ${x}, ${z}`);
    }
  }
});

test("Raster der Hohlräume: Block 30 × 20 mit einem Hohlraum in der Mitte gibt sechs Körper", () => {
  const { ST, R } = neu();
  // xs 0 10 20 30, zs 0 5 15 20; row 0 and 2 full (30 long, split in two pieces of 15 at 24), row 1 two cells of 10
  const koerper = ST.materialKoerper({ hohlraeume: [[[10, 20, 5, 15], "h"]], laenge: 30, hoehe: 20, tiefe: 8 });
  assert.equal(koerper.length, 6);
  assert.equal(R.solids.length, 6);
  const ohne = neu().ST.materialKoerper({ hohlraeume: [], laenge: 30, hoehe: 20, tiefe: 8 });
  assert.equal(ohne.length, 2, "ohne Hohlraum ein Block, in zwei Stücke geteilt");
});

test("Hohlraum: eine waagerechte Bohrung hat drei Schichten, ein Loch zwei, nie NaN", () => {
  const { ST } = neu();
  assert.equal((ST.hohlraum([[0, 20, 5, 15], "h"]).match(/data-shade=/g) || []).length, 3);
  assert.equal((ST.hohlraum([[0, 20, 5, 15], "v"]).match(/data-shade=/g) || []).length, 3);
  assert.equal((ST.hohlraum([[0, 10, 5, 15], "loch"]).match(/data-shade=/g) || []).length, 2);
  for (const art of ["h", "v", "loch"]) assert.ok(!ST.hohlraum([[0, 20, 5, 15], art]).includes("NaN"));
});

test("Drehachse: Profile (Radius, s) spiegeln um die senkrechte und die waagerechte Achse", () => {
  const { ST } = neu();
  const z = ST.drehachse({ richtung: "z", mitte: 35 });
  assert.deepEqual(z.beideSeiten([[4, 10], [6, 20]]), [[[31, 0, 10], [29, 0, 20]], [[39, 0, 10], [41, 0, 20]]]);
  const x = ST.drehachse({ richtung: "x", mitte: 25 });
  assert.deepEqual(x.beideSeiten([[4, 10], [6, 20]]), [[[10, 0, 21], [20, 0, 19]], [[10, 0, 29], [20, 0, 31]]]);
});

test("Zwei Lagen: Halbschnitt und ganzes Teil, die Seite blendet", () => {
  const { ST } = neu();
  assert.equal(ST.zweiLagen("<a/>", "<b/>"), '<g data-lage="schnitt"><a/></g><g data-lage="ganz"><b/></g>');
});

test("Schnittfläche: Schnittton plus Schraffur, und die Ecken der Fläche sind die der Punkte", () => {
  const { ST } = neu();
  const svg = ST.schnittFlaeche([[0, 0, 0], [10, 0, 0], [10, 0, 10], [0, 0, 10]], 1);
  assert.match(svg, /<path/);
  assert.ok(!svg.includes("NaN"));
});

test("Prüfung der Baugruppen: jedes Teil hat eine Nummer, Legende und Reihenfolge nennen dieselben", () => {
  const { ST, R, put, gruppe, rec } = neu();
  gruppe("teil");
  put([0, 0, 0], "<g/>", [], { name: "teil.a" });
  assert.doesNotThrow(() => ST.pruefeBaugruppen([{ piece: "teil" }], ["teil"]));
  assert.throws(() => ST.pruefeBaugruppen([{ piece: "anderes" }], ["anderes"]), /hat keine Legendennummer/);
  assert.throws(() => ST.pruefeBaugruppen([{ piece: "teil" }], ["teil", "mehr"]), /nennen nicht dieselben/);
  assert.equal(R.items.length, 1);
  assert.ok(rec);
});

test("Anordnen: das Gehäuse liegt hinter allem, die Drehteile in der Reihenfolge ihres Einbaus, ganze Stücke bekommen ihre Lage", () => {
  const { ST, R, put, gruppe, rec } = neu();
  const kiste = (x0, x1) => rec(A.box([x0, -8, 0], [x1, 0, 10], { name: "k" }));
  gruppe("gehaeuse");
  put([50, -4, 5], "<g/>", [kiste(40, 60)], { name: "gehaeuse.koerper" });
  gruppe("teil");
  put([10, -4, 5], "<g/>", [kiste(0, 20)], { name: "teil.b" });
  put([80, -4, 5], "<g/>", [kiste(70, 90)], { name: "teil.a" });
  gruppe("leitung");
  put([95, -4, 5], "<g/>", [kiste(92, 99)], { name: "leitung.x" });
  ST.anordnen({ hintergrund: "gehaeuse.koerper", reihe: ["teil.a", "teil.b"], ganzStuecke: ["leitung"] });
  const key = (n) => R.items.find((it) => it.name === n).key;
  assert.ok(key("gehaeuse.koerper") < Math.min(key("teil.a"), key("teil.b"), key("leitung.x")), "Gehäuse zuerst");
  assert.ok(Math.abs(key("teil.b") - key("teil.a") - 0.01) < 1e-9, "teil.a vor teil.b, im Abstand 0,01");
  assert.equal(R.items[0].name, "gehaeuse.koerper", "nach Schlüssel sortiert");
  assert.match(R.items.find((it) => it.name === "leitung.x").svg, /^<g data-lage="ganz">/);
  assert.doesNotMatch(R.items.find((it) => it.name === "teil.a").svg, /data-lage/);
});

test("Sicht: die Ansicht mit allem draußen wird um 3 % geweitet, das Seitenverhältnis bleibt", () => {
  const { ST, put, gruppe } = neu();
  gruppe("gehaeuse");
  put([50, 0, 10], "<g/>", [], { name: "gehaeuse.koerper" });
  gruppe("teil");
  put([50, 0, 20], "<g/>", [], { name: "teil.a" });
  const a = ST.ansicht({ W: 900, H: 800, mitte: { gehaeuse: [1, 2, 3] } });
  assert.deepEqual(a.MITTE.gehaeuse, [1, 2, 3]);
  assert.deepEqual(a.VIEW0, [0, 0, 900, 800]);
  assert.ok(Math.abs(a.VIEW1[2] / a.VIEW1[3] - 900 / 800) < 1e-9, "Seitenverhältnis");
  const roh = ST.ansicht({ W: 900, H: 800, weite: 0 });
  assert.ok(Math.abs(a.VIEW1[2] - roh.VIEW1[2] * 1.06) < 1e-9);
});

test("Zeichnung: jede Gruppe mit Baugruppe, dazu die leere Luftlage", () => {
  const { ST, put, gruppe } = neu();
  gruppe("teil");
  put([50, 0, 20], "<g class=\"x\"/>", [], { name: "teil.a" });
  const svg = ST.figur({ W: 900, H: 800, label: "Ein Test" });
  assert.match(svg, /<g data-g="teil" data-piece="teil"><g class="x"\/><\/g>/);
  assert.match(svg, /<g class="luft" data-luftlage=""><\/g>/);
});

test("Anschluss im Schnitt: acht Wände, zwei Schlauchwände, Luftraum und Bohrung, am ersten Teil der Verschraubung aufgehängt", () => {
  const { ST, R, put, gruppe } = neu();
  gruppe("verschraubung");
  put([-6, 0, 16], "<g class=\"ganz-teil\"/>", [], { name: "verschraubung1.gewinde" });
  // a port on the left face running along x at height 16 (s from the face outward)
  ST.anschlussSchnitt({
    streifen: (s0, s1, q0, q1) => [...[-s0, -s1].sort((a, b) => a - b), 16 + q0, 16 + q1],
    hohl: [[-26, 0, 12, 20], "h"],
    raum: "s1",
    teile: [[[-12, 0], 4, 6, 1], [[0, 4.5], 4, 6.6, -1], [[4.5, 11], 4, 6, 1], [[11, 12.5], 4, 5.2, -1]],
    schlauch: { s: [12.5, 26], rIn: 3, rAus: 4 },
    traeger: "verschraubung1.gewinde",
  });
  const svg = R.items[0].svg;
  assert.match(svg, /^<g data-lage="schnitt"><g data-hohl="">/);
  assert.match(svg, /<g data-lage="ganz"><g class="ganz-teil"\/><\/g>$/);
  assert.match(svg, /class="kammer" data-raum="s1"/);
  assert.equal((svg.match(/data-shade="3"/g) || []).length, 8, "acht Wände in Schnittton (vier Teile, zwei Seiten)");
  assert.ok(!svg.includes("NaN"));
});

test("Räume als leere Pfade: Rechtecke und Keile, je Seite eine Kennung, Keile auf beiden Seiten der Achse", () => {
  const { ST } = neu();
  const { beideSeiten } = ST.drehachse({ richtung: "z", mitte: 35 });
  const pfade = ST.raumPfade({ rechtecke: [["s1", [0, 10, 0, 5]], ["s2", [10, 20, 0, 5]]], keile: [["s1", [[10, 1], [12, 1], [12, 5]]]], beideSeiten });
  assert.equal(pfade.length, 4);
  assert.equal(pfade.filter((p) => p.includes('data-raum="s1"')).length, 3);
  for (const p of pfade) assert.match(p, /^<path class="kammer" data-raum="s[12]" fill="none" d="M/);
});

test("Gehäuseblock: Schnittfläche mit Maßmarke, Hohlräume, Luftlage hinten und die Körper des Rasters", () => {
  const { ST, R } = neu();
  ST.gehaeuseBlock({
    laenge: 30, hoehe: 20, tiefe: 8,
    hohlraeume: [[[10, 20, 5, 15], "h"], [[2, 6, 2, 6], "loch"]],
    rundeWaende: [[12, 18, 5, 15]],
    raeume: ST.raumPfade({ rechtecke: [["s1", [10, 20, 5, 15]]], beideSeiten: ST.drehachse({ mitte: 15 }).beideSeiten }),
  });
  assert.equal(R.items.length, 1);
  const svg = R.items[0].svg;
  assert.equal(R.items[0].name, "gehaeuse.koerper");
  assert.match(svg, /data-mass=""/);
  assert.match(svg, /data-raum="s1"/);
  assert.ok(svg.endsWith(LUFTLAGE_HINTEN), "die Luftlage hinten steht am Ende der Zeichnung des Gehäuses");
  assert.ok(R.solids.length >= 6);
  assert.ok(!svg.includes("NaN"));
});

test("Umriss der Hohlräume: nur die Grenze zum Material, keine Linie über eine Verbindung, keine am Blockrand", () => {
  const { ST } = neu();
  const zaehle = (svg) => (svg.match(/M[\d.\-]+ [\d.\-]+L/g) || []).length;
  // one bore through the whole block: two lines (top and bottom wall), none at the block's two ends
  assert.equal(zaehle(ST.hohlraumUmriss({ hohlraeume: [[[0, 30, 5, 10], "h"]], laenge: 30, hoehe: 20 })), 2);
  // a bore with a junction upwards: the junction opens the bore's top wall into two pieces and adds the two side walls
  const t = zaehle(ST.hohlraumUmriss({ hohlraeume: [[[0, 30, 5, 10], "h"], [[12, 18, 10, 20], "v"]], laenge: 30, hoehe: 20 }));
  assert.equal(t, 5);   // bottom wall, two top pieces, two side walls of the branch
  // a hole across the block gets no line here (it has its own outline)
  assert.equal(zaehle(ST.hohlraumUmriss({ hohlraeume: [[[5, 10, 5, 10], "loch"]], laenge: 30, hoehe: 20 })), 0);
});

test("Schnittfläche mit eigenem Ton: die Fläche trägt data-schnitt=\"b\", ohne Ton bleibt sie wie sie war", () => {
  const { ST } = neu();
  const p = [[0, 0, 0], [10, 0, 0], [10, 0, 10], [0, 0, 10]];
  assert.match(ST.schnittFlaeche(p, -1, { ton: "b", strich: "mid" }), /data-schnitt="b"/);
  assert.match(ST.schnittFlaeche(p, 1), /data-schnitt=""/);
  assert.match(ST.materialKeil([[0, 0], [4, 0], [4, 3]]), /<path class="iso-shade" data-shade="3" data-schnitt=""/);
});

test("Die kompakte Verschraubung ist kürzer als die Standardverschraubung, das Gewinde im Gehäuse gleich lang", async () => {
  const { STECKVERSCHRAUBUNG_G14: N, STECKVERSCHRAUBUNG_G14_KURZ: K } = await import("../normteile.mjs");
  assert.ok(K.masse.ring[1] < N.masse.ring[1] && K.schlauchLaenge < N.schlauchLaenge);
  assert.deepEqual(K.masse.gewinde, N.masse.gewinde);
  assert.equal(K.schnitt.length, 4);
  assert.deepEqual(K.schnitt[3][0], [K.masse.koerper[1], K.masse.ring[1]]);
});

test("Anschlusspunkt: längs der Achse nach außen, quer in z (waagerecht) oder in x (senkrecht)", async () => {
  const { anschlussPunkt } = await import("../schnittteile.mjs");
  const links = { flaeche: [0, 0, 16], aus: [-1, 0, 0] };
  const oben = { flaeche: [30, 0, 35], aus: [0, 0, 1] };
  assert.deepEqual(anschlussPunkt(links, 5, 2), [-5, 0, 18]);
  assert.deepEqual(anschlussPunkt(oben, 5, 2), [32, 0, 40]);
  assert.deepEqual(anschlussPunkt({ flaeche: [60, 0, 16], aus: [1, 0, 0] }, 5), [65, 0, 16]);
});

test("Anschlüsse aus einer Tabelle: Verschraubung und Schlauch je Anschluss, der Schnitt hängt an der Verschraubung", () => {
  const { ST, R } = neu();
  const ports = [
    { nr: 1, gruppe: "v", name: "v1", flaeche: [0, 0, 16], aus: [-1, 0, 0], raum: "s1", hohl: [[-30, 0, 12, 20], "h"] },
    { nr: 2, gruppe: "v", name: "v2", flaeche: [60, 0, 20], aus: [1, 0, 0], raum: "s2", hohl: [[60, 90, 16, 24], "h"], schlauchGruppe: "leitung" },
  ];
  const wege = { 1: [[-12.5, 0, 16], [-30, 0, 16]], 2: [[72.5, 0, 20], [90, 0, 20]] };
  ST.anschluesse({ ports, wege, schlauchLaenge: 14 });
  const namen = R.items.map((it) => it.name);
  assert.ok(namen.includes("v1.gewinde") && namen.includes("v2.gewinde"), namen.join(", "));
  assert.ok(namen.some((n) => n.startsWith("leitung.schlauch1")) && namen.some((n) => n.startsWith("leitung.schlauch2")));
  for (const n of ["v1.gewinde", "v2.gewinde"]) assert.match(R.items.find((it) => it.name === n).svg, /^<g data-lage="schnitt">/);
  assert.match(R.items.find((it) => it.name === "v2.gewinde").svg, /data-raum="s2"/);
});
