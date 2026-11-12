// The check valve model (spring-loaded poppet, Festo H-1/4-B data). Every expected number is worked out by hand in the
// comment next to it. Pressures are ABSOLUTE bar, ambient 1, as in ventil.mjs: `b(6)` is the 6 bar gauge pressure of the
// page's slider.
import test from "node:test";
import assert from "node:assert/strict";
import { AUSSEN } from "../ventil.mjs";
import {
  H_1_4 as M, neuerZustand, schritt, sollHub, durchfluss, tellerZustand, anzeige, anzeigeZeilen, absolut,
} from "../rueckschlagventil.mjs";

const b = (bar) => AUSSEN + bar;
const nahe = (a, e, tol, was) => assert.ok(Math.abs(a - e) <= tol, `${was ?? ""}: ${a} statt ${e} (±${tol})`);

/** Run `sek` seconds in steps of `h` with the input held (and the vent open or shut); returns the state. */
function lauf(z, sek, p1, entlueften = false, h = 0.001) {
  const n = Math.round(sek / h);
  for (let i = 0; i < n; i += 1) schritt(z, M, h, { p1, entlueften });
  return z;
}
const zustand = (hub, p1, p2) => ({ h: hub, p1, p2 });

test("Katalogwerte und Annahmen: 1000 l/min bei 1 bar, 0,1 bar Öffnungsdruck, 8 ms, 50 cm³, 3 mm", () => {
  assert.equal(M.qn, 1000);              // Festo 11689: 1000 l/min (6 -> 5 bar)
  assert.equal(M.bezugsDp, 1);           // 6 - 5 bar
  assert.equal(M.oeffnungsdruck, 0.1);   // assumed from the sister series H-QS
  assert.equal(M.vollDp, 0.5);
  assert.equal(M.schaltzeit, 0.008);
  assert.equal(M.volumen2, 50000);       // 50 cm³ in mm³
  assert.equal(M.hub, 3);
  assert.equal(M.entlueftZeit, 0.1);
});

test("Startzustand: Teller auf dem Sitz, alles drucklos; absolut(6) = 7", () => {
  assert.deepEqual(neuerZustand(), { h: 0, p1: AUSSEN, p2: AUSSEN });
  assert.equal(absolut(6), 7);
});

test("sollHub: unter 0,1 bar zu, ab 0,5 bar ganz offen, dazwischen linear", () => {
  assert.equal(sollHub(0.1, M), 0);        // exactly the opening pressure: still shut ("more than 0,1 bar")
  assert.equal(sollHub(0, M), 0);
  assert.equal(sollHub(-2, M), 0);         // back pressure
  assert.equal(sollHub(0.5, M), 1);
  assert.equal(sollHub(3, M), 1);
  nahe(sollHub(0.3, M), 0.5, 1e-12);       // (0,3 - 0,1) / (0,5 - 0,1) = 0,2 / 0,4
  nahe(sollHub(0.2, M), 0.25, 1e-12);      // 0,1 / 0,4
  nahe(sollHub(0.4, M), 0.75, 1e-12);      // 0,3 / 0,4
});

test("durchfluss: 1000 l/min bei 1 bar offen, 500 bei 0,5 bar, 0 bei geschlossenem Teller, nie negativ", () => {
  assert.equal(durchfluss(zustand(1, b(6), b(5)), M), 1000);          // the catalogue point
  assert.equal(durchfluss(zustand(1, b(6), b(5.5)), M), 500);          // linear: half the drop, half the flow
  assert.equal(durchfluss(zustand(0, b(6), b(0)), M), 0);              // shut
  nahe(durchfluss(zustand(0.5, b(0.3), b(0)), M), 150, 1e-9);          // 1000 · 0,5 · 0,3
  assert.equal(durchfluss(zustand(1, b(0), b(6)), M), 0);              // back pressure: nothing flows back, even with the poppet lifted
  assert.ok(Object.is(durchfluss(zustand(1, b(0), b(6)), M), 0), "kein negatives Null");
});

test("durchfluss: bei grossem Druckabfall auf das Doppelte des Katalogwertes begrenzt (2000 l/min)", () => {
  // 6 bar drop would be 6000 l/min linear; a real valve chokes, the display is capped at 2 · qn
  assert.equal(durchfluss(zustand(1, b(7), b(1)), M), 2000);
  assert.equal(durchfluss(zustand(1, b(3), b(1)), M), 2000);           // 1000 · 2 = 2000: the cap is reached at 2 bar
  assert.equal(durchfluss(zustand(1, b(2.5), b(1)), M), 1500);         // 1000 · 1,5, below the cap
});

test("Teller öffnet in 8 ms: nach 4 ms halb, nach 8 ms ganz offen (Druckunterschied bleibt groß)", () => {
  const z = neuerZustand();
  for (let i = 0; i < 8; i += 1) schritt(z, M, 0.0005, { p1: b(8), entlueften: false });   // 4 ms
  nahe(z.h, 0.5, 1e-9, "h nach 4 ms");        // rate 1 / 0,008 s = 125 per s · 0,004 s
  for (let i = 0; i < 8; i += 1) schritt(z, M, 0.0005, { p1: b(8), entlueften: false });   // 8 ms
  nahe(z.h, 1, 1e-9, "h nach 8 ms");
});

test("Öffnungsdruck: bei Δp = 0,1 bar und darunter bleibt der Teller zu, p2 ändert sich nicht", () => {
  const a = lauf(zustand(0, b(3) + 0.1, b(3)), 0.2, b(3) + 0.1);
  assert.equal(a.h, 0);
  assert.equal(a.p2, b(3));
  const c = lauf(zustand(0, b(3) + 0.09, b(3)), 0.2, b(3) + 0.09);
  assert.equal(c.h, 0);
  assert.equal(c.p2, b(3));
});

test("Öffnungsdruck: bei Δp = 0,11 bar öffnet er ein wenig; p2 steigt bis auf p1 − 0,1 bar und nicht weiter", () => {
  // soll = (0,11 - 0,1) / 0,4 = 0,025; the flow stops when the drop is back at 0,1 bar: p2 → p1 - 0,1 = b(3) + 0,01
  const z = lauf(zustand(0, b(3) + 0.11, b(3)), 0.5, b(3) + 0.11);
  assert.ok(z.p2 > b(3) + 0.009, `p2 = ${z.p2}`);
  assert.ok(z.p2 <= b(3) + 0.0105, `p2 = ${z.p2}`);
  assert.ok(z.h < 1e-3, `h = ${z.h}`);
});

test("Eingang 1 auf 6 bar: Teller öffnet, Ausgang 2 füllt sich bis p1 − 0,1 bar, dann ist der Teller wieder zu", () => {
  // at the end the drop is the opening pressure: p2 -> 7 - 0,1 = 6,9 bar abs (5,9 bar gauge). The time constant near that
  // point is V / (qn · 0,25 per bar) = 50000 / (16,67e6 · 0,25) = 12 ms, so 0,5 s are 40 of them.
  const z = lauf(neuerZustand(), 0.5, b(6));
  nahe(z.p2, b(6) - 0.1, 0.01, "p2");
  assert.ok(z.p2 >= b(6) - 0.1 - 1e-9, "p2 unter p1 - 0,1");
  assert.ok(z.h < 1e-3);
  assert.equal(tellerZustand(z, M), "zu");
});

test("Der Teller bleibt beim Füllen nie weiter offen, als der Druckunterschied erlaubt, und p2 überholt p1 nie", () => {
  const z = neuerZustand();
  let hMax = 0;
  for (let i = 0; i < 400; i += 1) {
    schritt(z, M, 0.0005, { p1: b(6), entlueften: false });
    hMax = Math.max(hMax, z.h);
    assert.ok(z.p2 <= z.p1 + 1e-12, `p2 ${z.p2} über p1 ${z.p1}`);
    assert.ok(z.h >= 0 && z.h <= 1);
  }
  assert.ok(hMax > 0.9, `hMax = ${hMax}`);   // it did open fully at the start (drop 6 bar)
});

test("Eingang 1 fällt auf 0: der Teller schließt, p2 bleibt stehen (eingesperrt)", () => {
  const z = lauf(neuerZustand(), 0.5, b(6));
  const vorher = z.p2;
  lauf(z, 5, b(0));
  assert.equal(z.h, 0);
  assert.equal(z.p2, vorher);              // not a bit lost: no flow back, no vent
  assert.equal(durchfluss(z, M), 0);
});

test("Gegendruck: p1 3 bar gegen p2 6 bar: zu und kein Rückfluss, p2 und p1 bleiben", () => {
  const z = zustand(0, b(3), b(6));
  for (let i = 0; i < 4000; i += 1) {
    schritt(z, M, 0.0025, { p1: b(3), entlueften: false });
    assert.equal(z.p2, b(6));
    assert.equal(durchfluss(z, M), 0);
  }
  assert.equal(z.h, 0);
});

test("Gegendruck, der kommt während der Teller offen ist: er schließt in 8 ms und lässt nichts zurück", () => {
  const z = zustand(1, b(6), b(5));       // open
  // the line behind drops to 0 bar at once: the drop is negative, the poppet runs shut in 8 ms (rate 125 per s)
  schritt(z, M, 0.004, { p1: b(0), entlueften: false });
  nahe(z.h, 0.5, 1e-9);
  assert.equal(z.p2, b(5));
  schritt(z, M, 0.004, { p1: b(0), entlueften: false });
  assert.equal(z.h, 0);
  assert.equal(z.p2, b(5));
});

test("Entlüften des Ausgangs: p2 fällt mit der Zeitkonstante 0,1 s (6 bar · e^-1 = 2,21 bar nach 0,1 s)", () => {
  const z = zustand(0, b(0), b(6));
  lauf(z, 0.1, b(0), true, 0.0005);
  nahe(z.p2 - AUSSEN, 6 * Math.exp(-1), 0.01, "nach 0,1 s");      // 2,207
  lauf(z, 0.4, b(0), true, 0.0005);
  nahe(z.p2 - AUSSEN, 6 * Math.exp(-5), 0.01, "nach 0,5 s");      // 0,040
  assert.ok(z.p2 >= AUSSEN, "p2 unter Umgebung");
  assert.equal(z.h, 0);                                          // with p1 at 0 bar the poppet stays shut
});

test("Entlüften bei anliegendem Eingang: der Teller öffnet gerade so weit, dass p2 bei p1 − 0,316 bar steht", () => {
  // steady state: the flow through the poppet equals the flow out of the vent. Vent: V / tau = 500000 mm³/s per bar = 30 l/min
  // per bar; at p2 about 5,68 bar gauge: 170,5 l/min = 1000 · h · dp with h = (dp - 0,1) / 0,4:
  // dp² - 0,1 · dp - 0,06816 = 0 -> dp = (0,1 + sqrt(0,01 + 0,27264)) / 2 = 0,3158; p2 = 7 - 0,3158 = 6,684 abs
  const z = lauf(zustand(0, b(6), b(6)), 1, b(6), true, 0.0005);
  nahe(z.p2, b(6) - 0.3158, 0.003, "p2");
  nahe(z.h, (0.3158 - 0.1) / 0.4, 0.01, "h");
});

test("p2 bleibt immer zwischen Umgebung und dem höchsten je gegebenen Eingangsdruck", () => {
  const z = neuerZustand();
  const folge = [[6, false], [0, false], [3, false], [0, true], [8, false], [2, true], [0, true]];
  for (const [bar, ent] of folge) {
    for (let i = 0; i < 400; i += 1) {
      schritt(z, M, 0.001, { p1: b(bar), entlueften: ent });
      assert.ok(z.p2 >= AUSSEN - 1e-12 && z.p2 <= b(8) + 1e-12, `${bar}/${ent}: ${z.p2}`);
      assert.ok(z.h >= 0 && z.h <= 1);
    }
  }
});

test("Schritt ist vom Bildtakt weitgehend unabhängig, ein riesiges dt wird gekürzt statt explodiert", () => {
  const a = lauf(neuerZustand(), 0.02, b(6), false, 1 / 60);
  const c = lauf(neuerZustand(), 0.02, b(6), false, 1 / 120);
  nahe(a.p2, c.p2, 0.05, "p2 bei 60 und 120 Hz");
  const z = neuerZustand();
  schritt(z, M, 5, { p1: b(6), entlueften: false });
  assert.ok(Number.isFinite(z.p2) && z.p2 <= b(6) + 1e-12);
});

test("tellerZustand: zu unter 2 %, offen über 98 %, dazwischen halb", () => {
  assert.equal(tellerZustand(zustand(0, 1, 1), M), "zu");
  assert.equal(tellerZustand(zustand(0.019, 1, 1), M), "zu");
  assert.equal(tellerZustand(zustand(0.5, 1, 1), M), "halb");
  assert.equal(tellerZustand(zustand(0.981, 1, 1), M), "offen");
  assert.equal(tellerZustand(zustand(1, 1, 1), M), "offen");
});

test("anzeige rundet: Überdruck und Δp auf 0,1 bar, Durchfluss auf ganze l/min", () => {
  // h 0,6666, p1 4,04 bar, p2 3,04 bar gauge: drop 1,0 bar -> 1000 · 0,6666 · 1 = 666,6 -> 667
  const a = anzeige(zustand(0.6666, b(4.04), b(3.04)), M);
  assert.deepEqual(a, { p1: 4, p2: 3, dp: 1, teller: "halb", q: 667, begrenzt: false, gegendruck: false });
  assert.ok(Number.isInteger(a.q));
  // venting to ambient shows 0,0 and never a negative gauge pressure
  assert.equal(anzeige(zustand(0, AUSSEN, AUSSEN - 0.0004), M).p2, 0);
});

test("anzeige: Gegendruck zeigt negatives Δp, Teller zu, Durchfluss 0; Begrenzung wird gemeldet", () => {
  const g = anzeige(zustand(0, b(3), b(6)), M);
  assert.deepEqual(g, { p1: 3, p2: 6, dp: -3, teller: "zu", q: 0, begrenzt: false, gegendruck: true });
  const w = anzeige(zustand(1, b(6), b(0)), M);
  assert.deepEqual(w, { p1: 6, p2: 0, dp: 6, teller: "offen", q: 2000, begrenzt: true, gegendruck: false });
});

test("anzeigeZeilen: zwei Zeilen, deutsches Komma, echtes Minus, feste Leerzeichen zwischen Zahl und Einheit, nennt Gegendruck und Begrenzung", () => {
  assert.deepEqual(anzeigeZeilen(anzeige(zustand(1, b(6), b(5)), M)), [
    "Eingang 1 6,0 bar · Ausgang 2 5,0 bar · Δp 1,0 bar",
    "Teller offen · Durchfluss 1000 l/min",
  ]);
  assert.deepEqual(anzeigeZeilen(anzeige(zustand(0, b(3), b(6)), M)), [
    "Eingang 1 3,0 bar · Ausgang 2 6,0 bar · Δp −3,0 bar",
    "Teller zu (Gegendruck) · Durchfluss 0 l/min",
  ]);
  assert.deepEqual(anzeigeZeilen(anzeige(zustand(0.5, b(0.3), b(0)), M)), [
    "Eingang 1 0,3 bar · Ausgang 2 0,0 bar · Δp 0,3 bar",
    "Teller halb offen · Durchfluss 150 l/min",
  ]);
  assert.match(anzeigeZeilen(anzeige(zustand(1, b(6), b(0)), M))[1], /^Teller offen · Durchfluss 2000\u00a0l\/min \(begrenzt\)$/);
});
