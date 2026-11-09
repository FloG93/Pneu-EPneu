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
const GH = gehaeuseSchnitt({
  P, rec: (s) => { aufgenommen.push(s); return s; }, FX, FZ, NUTEN, RB: 6.5, R_NUT: 10.5, ZA,
  GEH: { x0: 0, x1: 60 }, R_KANAL: 4, ZP: 8.5, R_GEWINDE: 6.5,
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
