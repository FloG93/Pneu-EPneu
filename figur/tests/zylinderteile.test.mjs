// The parts every cylinder page shares: the properties they rely on, without a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { zylinderTeile, zylinderMasse, schlauch, VENTIL_STANDARD, MOVE_BASIS } from "../zylinderteile.mjs";
import { LAUFZEIT, RAHMEN } from "../zylinderseite.mjs";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as A from "../../.claude/skills/anatomy/kit/audit.mjs";

const P = k.fitProjection([[0, -60, 0], [300, 160, 120]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });

/** A valve drawn with the factory: the recorded bodies and the items put. */
function zeichne(optionen) {
  const R = A.recorder(P);
  const items = [];
  let gruppeJetzt = "grund";
  const put = (pos, svg, shapes = [], extra = {}) => {
    const { bias = 0, gruppe = gruppeJetzt, name = gruppe, ...rest } = extra;
    items.push({ gruppe, name });
    R.put({ name: R.nameFor(name), piece: gruppe, label: gruppe, move: [0, 0, 0], at: pos, pos, bias, gruppe, svg, shapes, ...rest });
  };
  const ZT = zylinderTeile({ P, R, put, gruppe: (g) => { gruppeJetzt = g; }, MOVE: { leitung: [0, 0, 0] } });
  ZT.ventil(optionen);
  return { R, items };
}

const BASIS = { y: 112, z: 34, halbbreite: 26, rBohrung: 8, rSchieber: 4.6, sockelH: 17 };
const VENTIL_5_2 = {
  ...BASIS, x: [62, 216], port: { 5: 80, 4: 110, 1: 139, 2: 168, 3: 198 },
  oben: [4, 1, 2], unten: [5, 3], winkel: { 4: -1, 2: 1 }, scheiben: [95, 124.5, 153.5, 183],
};
const VENTIL_3_2 = {
  ...BASIS, x: [62, 190], port: { 3: 85, 2: 118, 1: 150 },
  oben: [2, 1], unten: [3], winkel: { 2: 1 }, scheiben: [100, 134],
};

const stutzen = (R) => R.solids.filter((s) => /^gehaeuse\.stutzen\d$/.test(s.name)).map((s) => s.name).sort();

test("Ventil 5/2 und 3/2 erzeugen je Anschluss oben einen Stutzen", () => {
  assert.deepEqual(stutzen(zeichne(VENTIL_5_2).R), ["gehaeuse.stutzen1", "gehaeuse.stutzen2", "gehaeuse.stutzen4"]);
  assert.deepEqual(stutzen(zeichne(VENTIL_3_2).R), ["gehaeuse.stutzen1", "gehaeuse.stutzen2"]);
});

test("Nur Anschlüsse mit Winkel bekommen einen Winkelstück", () => {
  const w = (R) => R.solids.filter((s) => /^gehaeuse\.winkel\d$/.test(s.name)).map((s) => s.name).sort();
  assert.deepEqual(w(zeichne(VENTIL_5_2).R), ["gehaeuse.winkel2", "gehaeuse.winkel4"]);
  assert.deepEqual(w(zeichne(VENTIL_3_2).R), ["gehaeuse.winkel2"]);
});

test("Das Ventil gehört den drei Gruppen Gehäuse, Schieber und Betätigung", () => {
  const gruppen = new Set(zeichne(VENTIL_3_2).items.map((i) => i.gruppe));
  assert.deepEqual([...gruppen].sort(), ["betaetigung", "gehaeuse", "schieber"]);
});

test("Ein Schlauch beginnt und endet genau an den Anschlüssen", () => {
  const p0 = [10, 20, 30];
  const p1 = [100, 80, 40];
  const s = schlauch(p0, [0, 1, 0], p1, [-1, 0, 0], 40, 60);
  assert.deepEqual(s[0], p0);
  assert.deepEqual(s[s.length - 1], p1);
  assert.ok(s.length > 20);
});

test("Die Laufzeit steht ohne Backtick im klassischen Skript und kennt ihre Haken", () => {
  assert.ok(!LAUFZEIT.includes("`"), "ein Backtick im Laufzeittext");
  for (const name of ["function teileVerschieben", "function kammerFuellen", "function kammerFluesse",
    "function automatikTakt", "function zustandSetzen", "function figurGrundstock"]) {
    assert.ok(LAUFZEIT.includes(name), `${name} fehlt`);
  }
  assert.doesNotThrow(() => new Function(LAUFZEIT), "kein gültiges Skript");
});

test("zustandSetzen: beim einfachwirkenden bleibt der Federraum auf Umgebung", () => {
  // Evaluate the runtime with just the names it needs and read back the state it sets.
  const rahmen = new Function("MASSE", "UMGEBUNG", `
    const svg = { querySelectorAll: () => [] };
    ${LAUFZEIT}
    const z = {};
    zustandSetzen(z, 5, "ausfahren", 6);
    const aus = { ...z };
    zustandSetzen(z, 0, "einfahren", 6);
    return [aus, { ...z }];
  `);
  const [ew1, ew2] = rahmen({ einfach: true }, 1);
  assert.equal(ew1.pA, 7); assert.equal(ew1.pB, 1); assert.equal(ew1.schieber, 1);
  assert.equal(ew2.pA, 1); assert.equal(ew2.pB, 1); assert.equal(ew2.schieber, 0);
  const [dw1, dw2] = rahmen({}, 1);
  assert.equal(dw1.pB, 1);
  assert.equal(dw2.pB, 7, "doppeltwirkend: eingefahren steht Kammer B unter Druck");
});

test("Der Rahmen der Seite ist ein gültiges Skript und nennt seine Haken", () => {
  assert.ok(!RAHMEN.includes("`"), "ein Backtick im Rahmentext");
  for (const name of ["function zeichneHub", "function zeichneAnzeige", "function zeichneKammern", "function bildZeichnen", "function stelleZustand", "function seitenStart", "modellSchritt(dt)", "anzeigeText("]) {
    assert.ok(RAHMEN.includes(name), `${name} fehlt`);
  }
  assert.doesNotThrow(() => new Function(RAHMEN), "kein gültiges Skript");
});

test("Die Maße des Zylinders stehen in zylinderMasse: Rohr, Kopf, Kolben, Stangenspitze", () => {
  const M = zylinderMasse({ bohrung: 50, stange: 20, hub: 25, totraum: 6 }, { deckel: 14, rohrEnde: 115, ragt: 44 });
  assert.deepEqual(M.X_ROHR, [14, 115]);
  assert.deepEqual(M.X_KOPF, [115, 129]);
  assert.equal(M.KOLBEN0, 20);
  assert.equal(M.SPITZE0, 173);
  assert.equal(M.RA, 28);
  assert.ok(VENTIL_STANDARD.schieberWeg > 0 && MOVE_BASIS.grund.every((v) => v === 0));
});

test("Ein Anschluss an der Kappe wird als Körper für die Prüfung aufgenommen", () => {
  const M = zylinderMasse({ bohrung: 50, stange: 20, hub: 25, totraum: 6 }, { deckel: 14, rohrEnde: 115, ragt: 44 });
  const aufgenommen = [];
  const R = { solid: (s) => { aufgenommen.push(s.name); return s; }, put: () => {}, nameFor: (n) => n };
  const ZT = zylinderTeile({ P, R, put: () => {}, gruppe: () => {}, MOVE: {}, M });
  ZT.anschluss(7, 31, "boden.anschluss");
  assert.deepEqual(aufgenommen, ["boden.anschluss"]);
});
