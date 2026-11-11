// The shuttle valve model. Every expected number is worked out by hand in the comment
// next to it. Pressures are ABSOLUTE bar, ambient 1, as in ventil.mjs: `b(6)` is the
// 6 bar gauge pressure of the page's slider.
import test from "node:test";
import assert from "node:assert/strict";
import { AUSSEN } from "../ventil.mjs";
import {
  OS_1_4 as M, neuerZustand, schritt, durchfluss, anzeige, anzeigeZeilen, sperrSeite, absolut,
} from "../wechselventil.mjs";

const b = (bar) => AUSSEN + bar;
const nahe = (a, e, tol, was) => assert.ok(Math.abs(a - e) <= tol, `${was ?? ""}: ${a} statt ${e} (±${tol})`);

/** Run `sek` seconds in steps of `h` with the inputs held; returns the state. */
function lauf(z, sek, pL, pR, h = 0.001) {
  const n = Math.round(sek / h);
  for (let i = 0; i < n; i += 1) schritt(z, M, h, { pL, pR });
  return z;
}
const zustand = (s, pL, pR, p2) => ({ s, pL, pR, p2 });

test("Katalogwerte: 1170 l/min bei 1 bar, 6,5 mm Nennweite, 8 ms, 0,05 bar", () => {
  assert.equal(M.qn, 1170);
  assert.equal(M.bezugsDp, 1);
  assert.equal(M.schaltzeit, 0.008);
  assert.equal(M.schaltdruck, 0.05);
  assert.equal(M.volumen2, 50000);   // 50 cm³ in mm³
});

test("Startzustand: Körper links (sperrt links), alles drucklos", () => {
  assert.deepEqual(neuerZustand(), { s: 0, pL: AUSSEN, pR: AUSSEN, p2: AUSSEN });
  assert.equal(absolut(6), 7);
});

test("beide drucklos: p2 bleibt 0 bar, der Körper bleibt", () => {
  const z = lauf(neuerZustand(), 0.5, b(0), b(0));
  assert.equal(z.p2, AUSSEN);
  assert.equal(z.s, 0);
  const y = lauf(zustand(1, b(0), b(0), b(0)), 0.5, b(0), b(0));
  assert.equal(y.s, 1);
});

test("nur links 6 bar: Körper sperrt rechts (s = 1) innerhalb 8 ms, p2 → 6 bar", () => {
  // 8 ms is the whole travel; 16 steps of 0.5 ms
  const z = neuerZustand();
  schritt(z, M, 0.008, { pL: b(6), pR: b(0) });
  assert.equal(z.s, 1);
  assert.equal(sperrSeite(z), "rechts");
  // the time constant of the 50 cm³ chamber is V / (qn in mm³/s per bar) = 50000 / 19.5e6 = 2,56 ms:
  // after 0,1 s (39 time constants) the chamber has the supply pressure
  lauf(z, 0.1, b(6), b(0));
  nahe(z.p2, b(6), 1e-6, "p2");
  assert.equal(z.s, 1);
});

test("nur rechts 6 bar: Körper sperrt links (aus der anderen Lage), p2 → 6 bar", () => {
  const z = zustand(1, b(0), b(0), b(0));
  schritt(z, M, 0.008, { pL: b(0), pR: b(6) });
  assert.equal(z.s, 0);
  assert.equal(sperrSeite(z), "links");
  lauf(z, 0.1, b(0), b(6));
  nahe(z.p2, b(6), 1e-6, "p2");
});

test("beide 6 bar, links zuerst: Körper bleibt rechts (zuerst kommt)", () => {
  const z = lauf(neuerZustand(), 0.05, b(6), b(0));
  assert.equal(z.s, 1);
  lauf(z, 1, b(6), b(6));
  assert.equal(z.s, 1);
  assert.equal(sperrSeite(z), "rechts");
  nahe(z.p2, b(6), 1e-6);
});

test("beide 6 bar, rechts zuerst: Körper bleibt links", () => {
  const z = lauf(zustand(1, b(0), b(0), b(0)), 0.05, b(0), b(6));
  assert.equal(z.s, 0);
  lauf(z, 1, b(6), b(6));
  assert.equal(z.s, 0);
  assert.equal(sperrSeite(z), "links");
  nahe(z.p2, b(6), 1e-6);
});

test("links 6, rechts 3: sperrt rechts; links 3, rechts 6: sperrt links", () => {
  const a = lauf(zustand(0, b(0), b(0), b(0)), 0.1, b(6), b(3));
  assert.equal(a.s, 1);
  nahe(a.p2, b(6), 1e-6);          // the higher pressure wins, the lower line gets nothing
  const c = lauf(zustand(1, b(0), b(0), b(0)), 0.1, b(3), b(6));
  assert.equal(c.s, 0);
  nahe(c.p2, b(6), 1e-6);
});

test("Δp unter 0,05 bar: kein Wechsel; darüber: Wechsel", () => {
  // 0,04 bar towards the right would push the ball to the right seat; it must stay
  const z = lauf(zustand(0, b(0), b(0), b(0)), 0.1, b(3) + 0.04, b(3));
  assert.equal(z.s, 0);
  const y = lauf(zustand(1, b(0), b(0), b(0)), 0.1, b(3), b(3) + 0.04);
  assert.equal(y.s, 1);
  // 0,06 bar: it goes
  assert.equal(lauf(zustand(0, b(0), b(0), b(0)), 0.1, b(3) + 0.06, b(3)).s, 1);
  assert.equal(lauf(zustand(1, b(0), b(0), b(0)), 0.1, b(3), b(3) + 0.06).s, 0);
});

test("Der Körper kommt nie zwischen den Sitzen zur Ruhe, auch wenn der Druckunterschied unterwegs verschwindet", () => {
  const z = zustand(0, b(0), b(0), b(0));
  schritt(z, M, 0.002, { pL: b(6), pR: b(0) });      // 2 ms of 8 ms: s = 0,25
  nahe(z.s, 0.25, 1e-9);
  lauf(z, 0.1, b(6), b(6));                            // the difference is gone: the ball finishes its way
  assert.ok(z.s === 0 || z.s === 1, `Körper bei ${z.s}`);
  assert.equal(z.s, 0);                                // 0,25 is nearer to the seat it came from
});

test("Eingang links fällt auf 0, rechts 6: Körper wechselt, p2 bleibt 6 (keine Druckspitze nach unten)", () => {
  // before: left 6 bar, right drucklos, ball at the right seat, chamber full
  const z = lauf(zustand(0, b(0), b(0), b(0)), 0.1, b(6), b(0));
  assert.equal(z.s, 1);
  let tief = z.p2;
  for (let i = 0; i < 100; i += 1) {                   // 50 ms of 0,5 ms steps
    schritt(z, M, 0.0005, { pL: b(0), pR: b(6) });
    tief = Math.min(tief, z.p2);
  }
  assert.equal(z.s, 0);
  assert.ok(tief >= b(6) - 1e-9, `p2 fiel auf ${tief}`);
  nahe(z.p2, b(6), 1e-6);
  // and the same with the right line already at 6 (both on, then left off)
  const y = lauf(zustand(0, b(0), b(0), b(0)), 0.1, b(6), b(0));
  lauf(y, 0.1, b(6), b(6));
  assert.equal(y.s, 1);
  let tief2 = y.p2;
  for (let i = 0; i < 100; i += 1) { schritt(y, M, 0.0005, { pL: b(0), pR: b(6) }); tief2 = Math.min(tief2, y.p2); }
  assert.equal(y.s, 0);
  assert.ok(tief2 >= b(6) - 1e-9, `p2 fiel auf ${tief2}`);
});

test("beide aus: p2 entlüftet über den offenen Eingang, innerhalb von 50 ms unter 0,1 bar", () => {
  const z = lauf(zustand(1, b(0), b(0), b(0)), 0.1, b(6), b(0));   // ball right: the LEFT input is the open one
  nahe(z.p2, b(6), 1e-6);
  let letzt = z.p2;
  // the chamber's time constant is 2,6 ms (50 cm³ over 19,5 l/s per bar): 50 ms are 19 of them, 7 bar · e^-19 ≈ 0
  for (let i = 0; i < 50; i += 1) {                   // 50 ms
    schritt(z, M, 0.001, { pL: b(0), pR: b(0) });
    assert.ok(z.p2 <= letzt + 1e-12, "p2 steigt wieder");
    letzt = z.p2;
  }
  assert.ok(z.p2 - AUSSEN < 0.1, `p2 = ${z.p2 - AUSSEN} bar Überdruck`);
  assert.ok(z.p2 >= AUSSEN);
  // the venting runs through the open input (left), never through the shut one
  const q = durchfluss(zustand(1, b(0), b(0), b(6)), M);
  assert.equal(q.rechts, 0);
  assert.ok(q.links < 0, "Rückströmen links hat negatives Vorzeichen");
});

test("p2 bleibt immer zwischen Umgebung und dem höchsten je gegebenen Eingangsdruck", () => {
  const z = neuerZustand();
  const folge = [[6, 0], [6, 6], [0, 6], [0, 0], [3, 8], [8, 3], [0, 0]];
  for (const [l, r] of folge) {
    for (let i = 0; i < 100; i += 1) {
      schritt(z, M, 0.001, { pL: b(l), pR: b(r) });
      assert.ok(z.p2 >= AUSSEN - 1e-12 && z.p2 <= b(8) + 1e-12, `${l}/${r}: ${z.p2}`);
      assert.ok(z.s >= 0 && z.s <= 1);
    }
  }
});

test("gesperrter Eingang: Durchfluss 0 dorthin", () => {
  // ball right (s = 1) shuts the right input, whatever the pressures are
  const a = durchfluss(zustand(1, b(6), b(6), b(3)), M);
  assert.equal(a.rechts, 0);
  assert.equal(a.links, 1170 * 3);                     // open left side, 3 bar drop
  // ball left shuts the left input, even though the chamber is above the left line
  const c = durchfluss(zustand(0, b(0), b(6), b(3)), M);
  assert.equal(c.links, 0);
  assert.equal(c.rechts, 1170 * 3);
  // a line at higher pressure behind a shut seat still gets nothing from the chamber
  const d = durchfluss(zustand(0, b(8), b(6), b(3)), M);
  assert.equal(d.links, 0);
});

test("Normwert: Δp 1 bar über die offene Seite → 1170 l/min", () => {
  const q = durchfluss(zustand(0, b(0), b(6), b(5)), M);
  assert.equal(q.rechts, 1170);
  assert.equal(q.links, 0);
  assert.equal(q.gesamt, 1170);
  // linear in Δp: half the drop, half the flow
  assert.equal(durchfluss(zustand(0, b(0), b(6), b(5.5)), M).gesamt, 585);
});

test("Rückströmen aus dem Ausgang hat negatives Vorzeichen und zählt in gesamt", () => {
  // both lines drucklos, ball left (left shut): the chamber at 2 bar abs drains through the right input
  const q = durchfluss(zustand(0, b(0), b(0), b(0) + 1), M);
  assert.equal(q.links, 0);
  assert.equal(q.rechts, -1170);
  assert.equal(q.gesamt, -1170);
});

test("Ein Eingang, zu dem der Körper unterwegs ist, entlüftet den Ausgang nicht", () => {
  // mid-flight (s = 0,5), left line lower than the right by 6 bar, chamber at 6 bar: no flow out to the left
  const q = durchfluss(zustand(0.5, b(0), b(6), b(6)), M);
  assert.equal(q.links, 0);
  assert.equal(q.rechts, 0);
});

test("Schritt ist vom Bildtakt weitgehend unabhängig", () => {
  const a = lauf(neuerZustand(), 0.02, b(6), b(0), 1 / 60);
  const c = lauf(neuerZustand(), 0.02, b(6), b(0), 1 / 120);
  nahe(a.p2, c.p2, 0.05, "p2 bei 60 und 120 Hz");
  assert.equal(a.s, c.s);
  // a huge dt is cut, not exploded
  const z = neuerZustand();
  schritt(z, M, 5, { pL: b(6), pR: b(0) });
  assert.ok(Number.isFinite(z.p2) && z.p2 <= b(6) + 1e-12);
});

test("sperrSeite: links, rechts oder keiner, solange der Körper unterwegs ist", () => {
  assert.equal(sperrSeite(zustand(0, 1, 1, 1)), "links");
  assert.equal(sperrSeite(zustand(1, 1, 1, 1)), "rechts");
  assert.equal(sperrSeite(zustand(0.5, 1, 1, 1)), null);
});

test("anzeige rundet: Überdruck auf 0,1 bar, Durchfluss auf ganze l/min", () => {
  const z = zustand(1, b(6), b(0), b(5.96));
  const a = anzeige(z, M);
  // left open, drop 7 − 6,96 = 0,04 bar: 1170 · 0,04 = 46,8 → 47; the right input is shut
  assert.deepEqual(a, { pL: 6, pR: 0, p2: 6, sperrt: "rechts", links: 47, rechts: 0, gesamt: 47 });
  assert.ok(Number.isInteger(a.links) && Number.isInteger(a.gesamt));
});

test("anzeigeZeilen: zwei Zeilen, deutsches Komma, nennt den gesperrten Eingang", () => {
  const z = zustand(1, b(6), b(0), b(6));
  assert.deepEqual(anzeigeZeilen(anzeige(z, M)), [
    "Eingang links 6,0 bar · Eingang rechts 0,0 bar · Ausgang 2 6,0 bar",
    "Körper sperrt: rechts · Durchfluss 0 l/min",
  ]);
  const y = zustand(0, b(6.5), b(8), b(5));
  // right open, drop 8 − 5 = 3 bar → 3510 l/min
  assert.deepEqual(anzeigeZeilen(anzeige(y, M)), [
    "Eingang links 6,5 bar · Eingang rechts 8,0 bar · Ausgang 2 5,0 bar",
    "Körper sperrt: links · Durchfluss 3510 l/min",
  ]);
  const w = zustand(0.4, b(0), b(0), b(0));
  assert.match(anzeigeZeilen(anzeige(w, M))[1], /^Körper sperrt: – · /);
  // venting: the sign shows as a proper minus
  const v = zustand(0, b(0), b(0), b(1));
  assert.match(anzeigeZeilen(anzeige(v, M))[1], /Durchfluss −1170 l\/min$/);
});
