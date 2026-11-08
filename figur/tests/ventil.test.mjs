import test from "node:test";
import assert from "node:assert/strict";
import { AUSSEN, wegeOffen, kammerSchritt } from "../ventil.mjs";
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
