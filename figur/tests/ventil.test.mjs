import test from "node:test";
import assert from "node:assert/strict";
import {
  AUSSEN, wegeOffen, kammerSchritt, ISO_5599_GR1, neuesVentil, ventilSchritt, ventilSignal,
  bauartWechseln, vonHand, ventilSchaltzeit, ventilAnzeige,
} from "../ventil.mjs";
import * as PN from "../pneumatik.mjs";
import { VENTIL_5_2, VENTIL_3_2_NC, VENTIL_3_2_NO } from "../schaltzeichen.mjs";

const A = VENTIL_5_2;

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
  const t = ventilSchaltzeit(M, 6, { art: A });
  assert.ok(t >= 0.012 && t <= 0.052, `${(t * 1000).toFixed(1)} ms`);
});
test("Bei 2 bar schaltet es noch, aber langsamer", () => {
  // 0,1 · 2 · 314,16 = 62,8 N > 38 N
  const t2 = ventilSchaltzeit(M, 2, { art: A }), t6 = ventilSchaltzeit(M, 6, { art: A });
  assert.ok(Number.isFinite(t2) && t2 > t6);
});
test("Monostabil: Signal weg → Feder stellt zurück", () => {
  const v = neuesVentil(M, { art: A }); ventilSignal(v, "14", true); lauf(v, 0.2);
  assert.ok(v.anteil > 0.98); ventilSignal(v, "14", false); lauf(v, 0.3);
  assert.ok(v.anteil < 0.02);
});
test("Bistabil: Impuls genügt, Stellung bleibt ohne Signal", () => {
  const v = neuesVentil(M, { art: A, bauart: "bistabil" }); ventilSignal(v, "14", true); lauf(v, 0.2);
  ventilSignal(v, "14", false); lauf(v, 0.5);
  assert.ok(v.anteil > 0.98);
});
test("Bistabil: 14 und 12 zugleich – der Schieber bleibt und pendelt nicht", () => {
  const v = neuesVentil(M, { art: A, bauart: "bistabil" }); ventilSignal(v, "14", true); lauf(v, 0.2);
  ventilSignal(v, "12", true); const spur = [];
  for (let i = 0; i < 50; i++) { ventilSchritt(v, M, 0.01, 6); spur.push(v.anteil); }
  assert.ok(spur.every((x) => x > 0.98));
});
test("Monostabil ignoriert Signal 12", () => {
  const v = neuesVentil(M, { art: A }); ventilSignal(v, "12", true); assert.equal(v.signal12, false);
});
test("Umschalten: Druck an 4 steigt auf Versorgung, 2 fällt auf Umgebung", () => {
  const v = lauf(neuesVentil(M, { art: A }), 0.1); assert.ok(Math.abs(v.p[2] - 7) < 0.05 && Math.abs(v.p[4] - 1) < 0.05);
  ventilSignal(v, "14", true); lauf(v, 1);
  assert.ok(Math.abs(v.p[4] - 7) < 0.05 && Math.abs(v.p[2] - 1) < 0.05);
});
test("Von Hand auf 50 %: alle Wege zu, Drücke halten", () => {
  const v = lauf(neuesVentil(M, { art: A }), 0.1); vonHand(v, 0.5); const p2 = v.p[2], p4 = v.p[4]; lauf(v, 0.5);
  assert.ok(Math.abs(v.p[2] - p2) < 1e-9 && Math.abs(v.p[4] - p4) < 1e-9 && v.anteil === 0.5);
});
test("Ein Signal beendet den Handbetrieb", () => {
  const v = neuesVentil(M, { art: A }); vonHand(v, 0.5); ventilSignal(v, "14", true); assert.equal(v.hand, null);
});
test("Bauart wechseln mitten im Schalten: zurück in Stellung 12, Signale aus", () => {
  const v = neuesVentil(M, { art: A }); ventilSignal(v, "14", true); ventilSchritt(v, M, 0.01, 6);
  bauartWechseln(v, M, "bistabil", 6);
  assert.deepEqual([v.bauart, v.anteil, v.signal14, v.signal12, v.hand], ["bistabil", 0, false, false, null]);
});
test("Die gemessene Schaltzeit steht in der Anzeige", () => {
  const v = neuesVentil(M, { art: A }); ventilSignal(v, "14", true); lauf(v, 1.5);   // τ = 59 000 / 3,2e5 ≈ 0,18 s; 1,5 s ≈ 8 τ
  const a = ventilAnzeige(v, M, 6);
  assert.equal(a.schaltzeitMs, Math.round(v.schaltzeit * 1000)); assert.equal(a.drucke[4], 6);
});
test("Kein NaN bei dt = 0, Druck 0 und riesigem dt", () => {
  const v = neuesVentil(M, { art: A }); ventilSchritt(v, M, 0, 6); ventilSchritt(v, M, 5, 0); ventilSignal(v, "14", true); ventilSchritt(v, M, 99, 8);
  for (const w of Object.values(v)) if (typeof w === "number") assert.ok(Number.isFinite(w));
});
test("Gleichlauf: Schaltzeit des Zylinders ±30 % der Ventilrechnung bei 6 bar", () => {
  const t = ventilSchaltzeit(M, 6, { art: A });
  assert.ok(Math.abs(PN.ISO_15552_50.schaltzeit - t) <= 0.3 * t, `Zylinder 25 ms, Ventil ${(t * 1000).toFixed(1)} ms`);
});

test("Monostabil: Rückstellung durch die Feder bei 6 bar im Bereich der Datenblätter (12–52 ms)", () => {
  // The chamber must vent from 7 bar abs to where 0,1·(p − 1)·314,16 = 30 + 8 N gives way,
  // p ≈ 2,2 bar; the spool then crosses 7 mm in a few ms. Venting is faster than filling.
  const t = ventilSchaltzeit(M, 6, { art: A, richtung: "12" });
  assert.ok(t >= 0.012 && t <= 0.052, `${(t * 1000).toFixed(1)} ms`);
});
// The page gives the bistable valve pulses of 150 ms (IMPULS in build-ventil.mjs).
// Without a spring the pilot force only has to beat the breakaway friction:
// 0,1 · Δp · 314,16 mm² > 8 N  →  Δp > 0,255 bar. Chamber 14 fills with
// τ = 5000 mm³ / 8e4 mm³/(s·bar) = 62,5 ms, so it gets there after
// −τ · ln(1 − 0,255/6) ≈ 2,7 ms. The force then grows by about
// 0,1 · (6 bar / τ) · 314 ≈ 3000 N/s; on 30 g the spool covers 7 mm in
// ≈ (6 · 0,007 · 0,03 / 3000)^(1/3) ≈ 7,5 ms. Together ≈ 10 ms, the model says 9,65.
// No spring to overcome: faster than the 12–52 ms data sheets give for
// spring-return or solenoid valves, and the page says so.
const IMPULS = 0.15;
test("Bistabil: Impuls 14 aus der Ruhe schaltet bei 6 bar in 9,65 ms", () => {
  const t = ventilSchaltzeit(M, 6, { art: A, bauart: "bistabil", impuls: IMPULS });
  assert.ok(Math.abs(t - 0.00965) < 0.0003, `${(t * 1000).toFixed(2)} ms`);
});
test("Bistabil: Impuls 12 nach einer Ruhe in Stellung 14 schaltet genauso schnell zurück", () => {
  // After the 14 pulse chamber 14 has vented; chamber 12 fills exactly as 14
  // did, against the same friction, so the time is the same 9,65 ms.
  const t12 = ventilSchaltzeit(M, 6, { art: A, bauart: "bistabil", richtung: "12", impuls: IMPULS });
  const t14 = ventilSchaltzeit(M, 6, { art: A, bauart: "bistabil", impuls: IMPULS });
  assert.ok(Math.abs(t12 - 0.00965) < 0.0003, `${(t12 * 1000).toFixed(2)} ms`);
  assert.ok(Math.abs(t12 - t14) < 1e-4);
});
test("Bistabil: der Impuls ist länger als das Schalten, auch bei 2 bar", () => {
  // Otherwise the pulse would end mid-travel and the page would time nothing.
  const t = ventilSchaltzeit(M, 2, { art: A, bauart: "bistabil", impuls: IMPULS });
  assert.ok(Number.isFinite(t) && t < IMPULS, `${(t * 1000).toFixed(2)} ms`);
});
test("Bistabil ohne Feder schaltet schneller als monostabil (6 bar)", () => {
  // The spring's 30 N have to be overcome first: monostable needs 1,21 bar
  // in the chamber, bistable 0,25 bar.
  assert.ok(ventilSchaltzeit(M, 6, { art: A, bauart: "bistabil", impuls: IMPULS }) < ventilSchaltzeit(M, 6, { art: A }));
});
test("Bistabil: 12 im selben Moment, in dem 14 wegfällt, ist langsamer (Kammer 14 noch voll)", () => {
  // Not a case the page produces (its pulses end long before the next one);
  // it shows why the chamber that has to vent matters: 20,6 ms instead of 9,65.
  const sofort = ventilSchaltzeit(M, 6, { art: A, bauart: "bistabil", richtung: "12" });
  const ausRuhe = ventilSchaltzeit(M, 6, { art: A, bauart: "bistabil", richtung: "12", impuls: IMPULS });
  assert.ok(Math.abs(sofort - 0.0206) < 0.0005 && sofort > ausRuhe, `${(sofort * 1000).toFixed(2)} ms`);
});
test("Ein wiederholtes Signal startet die Zeitmessung nicht neu", () => {
  // Auto-repeat of a held key calls the same signal again: the clock keeps running.
  const v = neuesVentil(M, { art: A }); ventilSignal(v, "14", true);
  for (let i = 0; i < 100; i++) ventilSchritt(v, M, 0.0001, 6);   // 10 ms
  const vorher = v.schaltStart; assert.ok(vorher > 0.0099 && vorher < 0.0101);
  ventilSignal(v, "14", true);
  assert.equal(v.schaltStart, vorher);
});
test("Anzeige: ohne Messung und ohne Schalten (0 bar) steht null, nie Infinity", () => {
  // 0 bar: no pilot force at all, the valve never switches, ventilSchaltzeit = Infinity.
  const v = neuesVentil(M, { art: A, druckBar: 0 });
  assert.equal(ventilAnzeige(v, M, 0).schaltzeitMs, null);
});

// --- 3/2 aus der Wegebeschreibung ------------------------------------------

const NC = VENTIL_3_2_NC, NO = VENTIL_3_2_NO;
const v32 = (art) => neuesVentil(M, { art });

test("3/2 NC: in Ruhe p2 = Umgebung, Signal → p2 = Versorgung", () => {
  // Rest = field 1 = 2→3: 2 vented. Signal: field 0 = 1→2: τ = 59 000 / 3,2e5 ≈ 0,18 s; 1,5 s ≈ 8 τ.
  const v = lauf(v32(NC), 1.5);
  assert.ok(Math.abs(v.p[2] - AUSSEN) < 0.05, `${v.p[2]}`);
  ventilSignal(v, "14", true); lauf(v, 1.5);
  assert.ok(Math.abs(v.p[2] - 7) < 0.05, `${v.p[2]}`);
  assert.deepEqual(Object.keys(v.p), ["2"]);
});
test("3/2 NO: in Ruhe p2 = Versorgung, Signal → p2 = Umgebung", () => {
  const v = v32(NO);
  assert.equal(v.p[2], 7);   // already at start, not only after the first frames
  lauf(v, 1.5); assert.ok(Math.abs(v.p[2] - 7) < 0.05);
  ventilSignal(v, "14", true); lauf(v, 1.5);
  assert.ok(Math.abs(v.p[2] - AUSSEN) < 0.05, `${v.p[2]}`);
});
test("3/2 NC: Signal weg → Feder stellt zurück, p2 fällt wieder", () => {
  const v = v32(NC); ventilSignal(v, "14", true); lauf(v, 1.5);
  ventilSignal(v, "14", false); lauf(v, 1.5);
  assert.ok(v.anteil < 0.02 && Math.abs(v.p[2] - AUSSEN) < 0.05);
});
test("3/2 von Hand auf 50 %: alle Wege zu, p2 hält", () => {
  for (const art of [NC, NO]) {
    const v = lauf(v32(art), 0.1); vonHand(v, 0.5); const p2 = v.p[2]; lauf(v, 0.5);
    assert.ok(Math.abs(v.p[2] - p2) < 1e-9 && v.anteil === 0.5);
  }
});
test("3/2 NC und NO: gleiche Schaltzeit wie das monostabile 5/2", () => {
  // Same spool, same pilot piston, same spring: the path description only
  // routes the air, it does not change the mechanics.
  const t52 = ventilSchaltzeit(M, 6, { art: A });
  for (const art of [NC, NO]) assert.ok(Math.abs(ventilSchaltzeit(M, 6, { art }) - t52) < 1e-4);
});
test("3/2: die Anzeige trägt nur p2", () => {
  assert.deepEqual(Object.keys(ventilAnzeige(v32(NO), M, 6).drucke), ["2"]);
  assert.equal(ventilAnzeige(v32(NO), M, 6).drucke[2], 6);
});
test("Ohne art wirft neuesVentil und ventilSchaltzeit", () => {
  assert.throws(() => neuesVentil(M), /art/);
  assert.throws(() => neuesVentil(M, { bauart: "bistabil" }), /art/);
  assert.throws(() => ventilSchaltzeit(M, 6), /art/);
});
test("Bauart wechseln behält die Wegebeschreibung", () => {
  const v = v32(NO); bauartWechseln(v, M, "monostabil", 6);
  assert.equal(v.art, NO); assert.equal(v.p[2], 7);
});
