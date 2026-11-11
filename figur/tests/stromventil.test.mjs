import test from "node:test";
import assert from "node:assert/strict";
import {
  GRA_1_4, anzeigeZeile, drosselAnteil, lippeHub, durchfluss, neuerZustand, schritt, anzeige,
  DROSSELRICHTUNG as D, FREIE_RICHTUNG as F,
} from "../stromventil.mjs";

const U = GRA_1_4.umdrehungen;

test("Drossel ganz offen, 1 → 2: 420 l/min bei 1 bar", () => {
  assert.equal(durchfluss(D, U, 1).gesamt, 420);
});
test("Drossel halb offen, 1 → 2: 210 l/min", () => {
  assert.equal(durchfluss(D, U / 2, 1).gesamt, 210);
});
test("Drossel zu, 1 → 2: 0 l/min", () => {
  assert.equal(durchfluss(D, 0, 1).gesamt, 0);
});
test("2 → 1, Drossel offen: 780 l/min (420 Drossel + 360 Rückschlag)", () => {
  const q = durchfluss(F, U, 1);
  assert.equal(q.gesamt, 780); assert.equal(q.drossel, 420); assert.equal(q.rueckschlag, 360);
});
test("2 → 1, Drossel zu: 360 l/min über den Rückschlagweg allein", () => {
  const q = durchfluss(F, 0, 1);
  assert.equal(q.gesamt, 360); assert.equal(q.drossel, 0);
});
test("Lippe bleibt in Drosselrichtung zu (gespreizt)", () => {
  // there p1 > p2, so p2 − p1 ≤ 0
  assert.equal(lippeHub(-1), 0);
  assert.equal(durchfluss(D, U, 1).rueckschlag, 0);
});
test("Lippe klappt erst über 0,1 bar nach innen", () => {
  assert.equal(lippeHub(0.1), 0);
  assert.equal(lippeHub(0.05), 0);
  assert.ok(lippeHub(0.11) > 0);
  assert.equal(lippeHub(0.2), 1);   // (0,2 − 0,1) / 0,1
  assert.equal(durchfluss(F, 0, 0.1).rueckschlag, 0);
});
test("Δp 0,5 bar halbiert den Durchfluss", () => {
  assert.equal(durchfluss(D, U, 0.5).gesamt, 210);
  assert.equal(durchfluss(F, U, 0.5).gesamt, 390);
});
test("Ohne Druckunterschied fließt nichts", () => {
  assert.equal(durchfluss(F, U, 0).gesamt, 0);
  assert.equal(durchfluss(F, U, -1).gesamt, 0);
});
test("drosselAnteil ist linear über 6 Umdrehungen und begrenzt", () => {
  assert.equal(drosselAnteil(3), 0.5);
  assert.equal(drosselAnteil(-2), 0);
  assert.equal(drosselAnteil(9), 1);
});
test("schritt: Lippe folgt in unter 50 ms, in Drosselrichtung bleibt sie zu", () => {
  const z = neuerZustand();
  schritt(z, GRA_1_4, 0.05, { richtung: F, umdrehungen: 3, dpBar: 1 });
  assert.equal(z.lippe, 1);
  schritt(z, GRA_1_4, 0.05, { richtung: D, umdrehungen: 3, dpBar: 1 });
  assert.equal(z.lippe, 0);
  schritt(z, GRA_1_4, 0.01, { richtung: F, umdrehungen: 3, dpBar: 1 });
  assert.ok(z.lippe > 0 && z.lippe < 1);   // 10 ms of a 20 ms ramp: half
  assert.ok(Math.abs(z.lippe - 0.5) < 1e-12);
});
test("schritt: Zapfen folgt dem Regler ohne Sprung", () => {
  const z = neuerZustand(GRA_1_4, 0);
  const vor = z.zapfen;
  schritt(z, GRA_1_4, 0.1, { richtung: D, umdrehungen: 6, dpBar: 1 });
  assert.ok(Math.abs(z.zapfen - vor - 0.6) < 1e-12);   // 6 turns/s · 0,1 s
  for (let i = 0; i < 20; i += 1) schritt(z, GRA_1_4, 0.1, { richtung: D, umdrehungen: 6, dpBar: 1 });
  assert.equal(z.zapfen, 6);
});
test("anzeige rundet auf ganze l/min", () => {
  const z = neuerZustand(GRA_1_4, 1);   // 1/6 open → 70 l/min
  const a = anzeige(z, GRA_1_4, { richtung: D, dpBar: 0.333 });
  assert.deepEqual(a, { gesamt: 23, drossel: 23, rueckschlag: 0, lippeOffen: false });   // 70 · 0,333 = 23,31
  assert.ok(Number.isInteger(a.gesamt));
});
test("anzeige: freie Richtung bei offener Drossel zeigt 780 und Lippe offen", () => {
  const z = { zapfen: U, lippe: 1 };
  assert.deepEqual(anzeige(z, GRA_1_4, { richtung: F, dpBar: 1 }), { gesamt: 780, drossel: 420, rueckschlag: 360, lippeOffen: true });
});
test("anzeigeZeile: Durchfluss mit beiden Teilen in der ersten, die Bedingungen in der zweiten Zeile", () => {
  const z = { zapfen: 6, lippe: 1 };
  assert.equal(anzeigeZeile(anzeige(z, GRA_1_4, { richtung: F, dpBar: 1 }), F, 1),
    "Q 780 l/min (Drossel 420 + Rückschlag 360) · Lippe offen\n2 → 1 · 6 bar · Δp 1 bar");
  assert.equal(anzeigeZeile(anzeige({ zapfen: 3, lippe: 0 }, GRA_1_4, { richtung: D, dpBar: 1 }), D, 1),
    "Q 210 l/min (Drossel 210 + Rückschlag 0) · Lippe zu\n1 → 2 · 6 bar · Δp 1 bar");
});
