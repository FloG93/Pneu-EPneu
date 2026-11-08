import test from "node:test";
import assert from "node:assert/strict";
import {
  AUSSEN, wegeOffen, kammerSchritt, ISO_5599_GR1, neuesVentil, ventilSchritt, ventilSignal,
  bauartWechseln, vonHand, ventilSchaltzeit, ventilAnzeige,
} from "../ventil.mjs";
import * as PN from "../pneumatik.mjs";

test("Endlagen: Stellung 14 öffnet nur Satz a, Stellung 12 nur Satz b", () => {
  assert.deepEqual(wegeOffen(1, 0.3), { a: 1, b: 0 });
  assert.deepEqual(wegeOffen(0, 0.3), { a: 0, b: 1 });
});
test("Mitte mit positiver Überdeckung: alle Wege zu", () => {
  for (const x of [0.36, 0.5, 0.64]) assert.deepEqual(wegeOffen(x, 0.3), { a: 0, b: 0 });
});
test("wegeOffen ist dieselbe Rechnung wie pneumatik.oeffnung", () => {
  for (const s of [0, 0.2, 0.5, 0.7, 0.9, 1]) {
    assert.deepEqual(PN.oeffnung({ schieber: s }, PN.ISO_15552_50), wegeOffen(s, 0.3));
  }
});
test("kammerSchritt: fester Raum füllt sich, nie über Quelle, nie unter Umgebung", () => {
  // 1 bar abs, q = 1e5 mm³/s·bar · (7 − 1) bar, V = 1e5 mm³, h = 1e-3 s → +0,006 bar
  assert.ok(Math.abs(kammerSchritt(1, 6e5, 0, 1e5, 1e-3, 7) - 1.006) < 1e-12);
  assert.equal(kammerSchritt(6.999, 1e9, 0, 1e5, 1e-3, 7), 7);
  assert.equal(kammerSchritt(1.001, -1e9, 0, 1e5, 1e-3, 7), AUSSEN);
});
test("AUSSEN ist die Umgebung des Zylindermodells", () => assert.equal(AUSSEN, PN.UMGEBUNG));

const M = ISO_5599_GR1;
const lauf = (v, s, p = 6) => { for (let t = 0; t < s; t += 0.01) ventilSchritt(v, M, 0.01, p); return v; };

test("Kraftbilanz: 6 bar auf Ø 20 schlägt Feder + Haftreibung", () => {
  // 0,1 · 6 · 314,16 = 188,5 N  >  30 + 8 = 38 N
  assert.ok(0.1 * 6 * Math.PI * 100 > M.federVor + M.haftreibung);
});
test("Schaltzeit bei 6 bar liegt im Bereich der Datenblätter (12–52 ms)", () => {
  const t = ventilSchaltzeit(M, 6);
  assert.ok(t >= 0.012 && t <= 0.052, `${(t * 1000).toFixed(1)} ms`);
});
test("Bei 2 bar schaltet es noch, aber langsamer", () => {
  // 0,1 · 2 · 314,16 = 62,8 N > 38 N
  const t2 = ventilSchaltzeit(M, 2), t6 = ventilSchaltzeit(M, 6);
  assert.ok(Number.isFinite(t2) && t2 > t6);
});
test("Monostabil: Signal weg → Feder stellt zurück", () => {
  const v = neuesVentil(M); ventilSignal(v, "14", true); lauf(v, 0.2);
  assert.ok(v.anteil > 0.98); ventilSignal(v, "14", false); lauf(v, 0.3);
  assert.ok(v.anteil < 0.02);
});
test("Bistabil: Impuls genügt, Stellung bleibt ohne Signal", () => {
  const v = neuesVentil(M, { bauart: "bistabil" }); ventilSignal(v, "14", true); lauf(v, 0.2);
  ventilSignal(v, "14", false); lauf(v, 0.5);
  assert.ok(v.anteil > 0.98);
});
test("Bistabil: 14 und 12 zugleich – der Schieber bleibt und pendelt nicht", () => {
  const v = neuesVentil(M, { bauart: "bistabil" }); ventilSignal(v, "14", true); lauf(v, 0.2);
  ventilSignal(v, "12", true); const spur = [];
  for (let i = 0; i < 50; i++) { ventilSchritt(v, M, 0.01, 6); spur.push(v.anteil); }
  assert.ok(spur.every((x) => x > 0.98));
});
test("Monostabil ignoriert Signal 12", () => {
  const v = neuesVentil(M); ventilSignal(v, "12", true); assert.equal(v.signal12, false);
});
test("Umschalten: Druck an 4 steigt auf Versorgung, 2 fällt auf Umgebung", () => {
  const v = lauf(neuesVentil(M), 0.1); assert.ok(Math.abs(v.p2 - 7) < 0.05 && Math.abs(v.p4 - 1) < 0.05);
  ventilSignal(v, "14", true); lauf(v, 1);
  assert.ok(Math.abs(v.p4 - 7) < 0.05 && Math.abs(v.p2 - 1) < 0.05);
});
test("Von Hand auf 50 %: alle Wege zu, Drücke halten", () => {
  const v = lauf(neuesVentil(M), 0.1); vonHand(v, 0.5); const p2 = v.p2, p4 = v.p4; lauf(v, 0.5);
  assert.ok(Math.abs(v.p2 - p2) < 1e-9 && Math.abs(v.p4 - p4) < 1e-9 && v.anteil === 0.5);
});
test("Ein Signal beendet den Handbetrieb", () => {
  const v = neuesVentil(M); vonHand(v, 0.5); ventilSignal(v, "14", true); assert.equal(v.hand, null);
});
test("Bauart wechseln mitten im Schalten: zurück in Stellung 12, Signale aus", () => {
  const v = neuesVentil(M); ventilSignal(v, "14", true); ventilSchritt(v, M, 0.01, 6);
  bauartWechseln(v, M, "bistabil", 6);
  assert.deepEqual([v.bauart, v.anteil, v.signal14, v.signal12, v.hand], ["bistabil", 0, false, false, null]);
});
test("Die gemessene Schaltzeit steht in der Anzeige", () => {
  const v = neuesVentil(M); ventilSignal(v, "14", true); lauf(v, 1.5);   // τ = 59 000 / 3,2e5 ≈ 0,18 s; 1,5 s ≈ 8 τ
  const a = ventilAnzeige(v, M, 6);
  assert.equal(a.schaltzeitMs, Math.round(v.schaltzeit * 1000)); assert.equal(a.p4, 6);
});
test("Kein NaN bei dt = 0, Druck 0 und riesigem dt", () => {
  const v = neuesVentil(M); ventilSchritt(v, M, 0, 6); ventilSchritt(v, M, 5, 0); ventilSignal(v, "14", true); ventilSchritt(v, M, 99, 8);
  for (const w of Object.values(v)) if (typeof w === "number") assert.ok(Number.isFinite(w));
});
test("Gleichlauf: Schaltzeit des Zylinders ±30 % der Ventilrechnung bei 6 bar", () => {
  const t = ventilSchaltzeit(M, 6);
  assert.ok(Math.abs(PN.ISO_15552_50.schaltzeit - t) <= 0.3 * t, `Zylinder 25 ms, Ventil ${(t * 1000).toFixed(1)} ms`);
});
