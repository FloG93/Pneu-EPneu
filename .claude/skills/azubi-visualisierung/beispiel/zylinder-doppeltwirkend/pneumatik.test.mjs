// The arithmetic model is what the figure shows as numbers and what moves its
// parts. Every expectation here is worked out by hand in the comment above it,
// from the formulas an apprentice is taught — not read back off the code.
import test from "node:test";
import assert from "node:assert/strict";
import * as P from "../pneumatik.mjs";

const Z = P.ISO_15552_50;
const DT = 1 / 2000;

// --- Areas ---------------------------------------------------------------

test("Kolbenfläche ist π/4 · D²", () => {
  // π/4 · 50² = 0.785398… · 2500 = 1963.4954 mm²
  const { kolben } = P.flaechen(Z);
  assert.ok(Math.abs(kolben - 1963.4954) < 0.001, `Kolbenfläche ${kolben}`);
});

test("Ringfläche ist π/4 · (D² − d²), die Kolbenstange nimmt Fläche weg", () => {
  // π/4 · (2500 − 400) = 0.785398… · 2100 = 1649.3361 mm²
  const { ring } = P.flaechen(Z);
  assert.ok(Math.abs(ring - 1649.3361) < 0.001, `Ringfläche ${ring}`);
});

test("Kolbenfläche = Ringfläche + Stangenquerschnitt", () => {
  // π/4 · 20² = 314.159 mm²
  const f = P.flaechen(Z);
  assert.ok(Math.abs(f.stange - 314.1593) < 0.001, `Stangenfläche ${f.stange}`);
  assert.ok(Math.abs(f.kolben - (f.ring + f.stange)) < 1e-9);
});

test("Flächenverhältnis φ = Kolbenfläche / Ringfläche", () => {
  // 1963.4954 / 1649.3361 = 25/21 = 1.19047…
  const { verhaeltnis } = P.flaechen(Z);
  assert.ok(Math.abs(verhaeltnis - 25 / 21) < 1e-9, `φ ${verhaeltnis}`);
});

// --- Forces --------------------------------------------------------------

test("Ausfahrkraft bei 6 bar: F = p · A_Kolben", () => {
  // 6 bar = 0.6 N/mm²;  0.6 · 1963.4954 = 1178.097 N
  const f = P.kraftAus(6, Z);
  assert.ok(Math.abs(f - 1178.097) < 0.01, `F_aus ${f}`);
});

test("Einfahrkraft bei 6 bar: F = p · A_Ring", () => {
  // 0.6 · 1649.3361 = 989.602 N
  const f = P.kraftEin(6, Z);
  assert.ok(Math.abs(f - 989.602) < 0.01, `F_ein ${f}`);
});

test("Die Einfahrkraft ist kleiner, und zwar genau um das Flächenverhältnis", () => {
  const { verhaeltnis } = P.flaechen(Z);
  for (const p of [2, 4, 6, 8]) {
    const aus = P.kraftAus(p, Z);
    const ein = P.kraftEin(p, Z);
    assert.ok(ein < aus, `bei ${p} bar ist F_ein ${ein} nicht kleiner als F_aus ${aus}`);
    assert.ok(Math.abs(aus / ein - verhaeltnis) < 1e-9, `Verhältnis bei ${p} bar stimmt nicht`);
  }
});

test("Kraft ist dem Druck proportional: doppelter Druck, doppelte Kraft", () => {
  assert.ok(Math.abs(P.kraftAus(8, Z) - 2 * P.kraftAus(4, Z)) < 1e-9);
  assert.equal(P.kraftAus(0, Z), 0);
});

test("Ausfahren braucht mehr Luft als Einfahren – dieselbe Länge, größere Fläche", () => {
  // Ausfahren 1963.5 mm² · 200 mm = 392.7 cm³ bei Betriebsdruck,
  // bei 6 bar also 7-fach als Normvolumen: 2.75 Nl.  Einfahren: 2.31 Nl.
  const l = P.luftJeHub(6, Z);
  assert.ok(Math.abs(l.aus - 2.749) < 0.01, `${l.aus} Nl`);
  assert.ok(Math.abs(l.ein - 2.309) < 0.01, `${l.ein} Nl`);
  assert.ok(l.ein < l.aus);
});

// --- Helpers for the motion tests ----------------------------------------

/** Run until the piston has arrived, then a while longer so pressures settle. */
function fahre(stellung, { von, druck = 6, masse = Z } = {}) {
  const z = P.neuerZustand(masse, { weg: von, stellung });
  z.schieber = stellung === "ausfahren" ? 1 : 0;   // Schieber steht schon
  return laufe(z, masse, druck);
}

/** Settle in one direction, then throw the valve and measure what follows. */
function wechsle(nach, { druck = 6, masse = Z } = {}) {
  const vorher = nach === "ausfahren" ? "einfahren" : "ausfahren";
  const z = P.neuerZustand(masse, { weg: vorher === "ausfahren" ? masse.hub : 0, stellung: vorher });
  for (let t = 0; t < 4; t += DT) {
    P.schritt(z, masse, DT, druck);
    if (P.ruht(z, masse, druck)) break;
  }
  z.stellung = nach;
  return laufe(z, masse, druck);
}

function laufe(z, masse, druck) {
  const spur = [];
  let dauer = null;
  for (let t = DT; t < 8; t += DT) {
    P.schritt(z, masse, DT, druck);
    spur.push({ t, weg: z.weg, v: Math.abs(z.v), pA: z.pA, pB: z.pB, schieber: z.schieber });
    if (dauer === null && P.steht(z, masse)) dauer = t;
    if (dauer !== null && P.ruht(z, masse, druck)) break;
  }
  return { z, spur, dauer };
}

// --- Motion --------------------------------------------------------------

test("Ausfahren: der Kolben erreicht die vordere Endlage", () => {
  const { z, dauer } = fahre("ausfahren", { von: 0 });
  assert.ok(Math.abs(z.weg - Z.hub) < 0.5, `steht bei ${z.weg} statt ${Z.hub} mm`);
  assert.ok(dauer > 0.1 && dauer < 3, `${dauer.toFixed(2)} s ist keine glaubhafte Hubzeit`);
});

test("Einfahren: der Kolben erreicht die hintere Endlage", () => {
  const { z, dauer } = fahre("einfahren", { von: Z.hub });
  assert.ok(z.weg < 0.5, `steht bei ${z.weg} statt 0 mm`);
  assert.ok(dauer > 0.1 && dauer < 3, `${dauer.toFixed(2)} s ist keine glaubhafte Hubzeit`);
});

test("Der Kolben verlässt seinen Hub nie", () => {
  for (const [stellung, von] of [["ausfahren", 0], ["einfahren", Z.hub]]) {
    const { spur } = fahre(stellung, { von });
    for (const s of spur) {
      assert.ok(s.weg >= -1e-6 && s.weg <= Z.hub + 1e-6, `Weg ${s.weg} außerhalb 0…${Z.hub}`);
    }
  }
});

// --- The effects that must FALL OUT of the model, not be programmed -------

test("Nach dem Umschalten steht der Kolben erst einmal still", () => {
  // Der Schieber braucht Zeit, in der Mitte sind beide Arbeitsanschlüsse zu,
  // und danach muss die Gegenkammer erst entlüften. Erst dann fährt er los.
  const { spur } = wechsle("einfahren");
  const los = spur.findIndex((s) => s.weg < Z.hub - 0.1);
  assert.ok(los > 0, "der Kolben fährt ohne jede Verzögerung los");
  const totzeit = spur[los].t;
  assert.ok(totzeit > 0.01, `Totzeit ${(totzeit * 1000).toFixed(1)} ms ist nicht zu sehen`);
  assert.ok(totzeit < 0.5, `Totzeit ${(totzeit * 1000).toFixed(0)} ms ist unglaubhaft lang`);
});

test("Mitten im Umschalten sind beide Kammern zu und halten ihre Luft", () => {
  // Das ist der Moment, den die Figur in Mittelblau zeigt.
  const { spur } = wechsle("einfahren");
  const mitten = spur.filter((s) => s.schieber > 0.4 && s.schieber < 0.6);
  assert.ok(mitten.length > 0, "der Schieber springt ohne Zwischenzustand um");
  for (const s of mitten) {
    assert.ok(s.v < 60, `der Kolben läuft mit ${s.v.toFixed(0)} mm/s, während beide Anschlüsse zu sind`);
  }
});

test("Vor der Endlage wird der Kolben langsamer – die Abluft muss durch die Drossel", () => {
  const { spur } = fahre("ausfahren", { von: 0 });
  const mitte = spur.filter((s) => s.weg > Z.hub * 0.4 && s.weg < Z.hub * 0.6);
  const ende = spur.filter((s) => s.weg > Z.hub - Z.daempfung * 0.4 && s.weg < Z.hub - 0.01);
  const vMitte = Math.max(...mitte.map((s) => s.v));
  const vEnde = Math.max(...ende.map((s) => s.v));
  assert.ok(
    vEnde < vMitte * 0.6,
    `in der Endlage noch ${vEnde.toFixed(0)} mm/s gegen ${vMitte.toFixed(0)} mm/s in der Mitte`,
  );
});

test("Ohne Endlagendämpfung schlägt der Kolben schneller auf", () => {
  const offen = { ...Z, leitwertDrossel: Z.leitwertAb };
  const ohne = fahre("ausfahren", { von: 0, masse: offen });
  const mit = fahre("ausfahren", { von: 0 });
  const vom = (lauf, masse) =>
    Math.max(
      ...lauf.spur
        .filter((s) => s.weg > masse.hub - masse.daempfung * 0.4 && s.weg < masse.hub - 0.01)
        .map((s) => s.v),
    );
  assert.ok(vom(ohne, offen) > vom(mit, Z), "die Dämpfung macht in der Endlage keinen Unterschied");
});

test("Die Dämpfung drosselt nur die Abluft – ein Rückschlagventil umgeht sie beim Füllen", () => {
  // In der vorderen Endlage greift die Dämpfung der Kammer B. Fährt der
  // Zylinder dort hinein, ist B gedrosselt. Fährt er von dort wieder los,
  // wird B gefüllt und muss den vollen Weg haben.
  const hinein = P.neuerZustand(Z, { weg: Z.hub - 1, stellung: "ausfahren" });
  const l1 = P.leitwerte(hinein, Z);
  assert.ok(l1.bAb < Z.leitwertAb * 0.3, `Abluft aus B ist mit ${l1.bAb.toExponential(1)} nicht gedrosselt`);

  const heraus = P.neuerZustand(Z, { weg: Z.hub - 1, stellung: "einfahren" });
  const l2 = P.leitwerte(heraus, Z);
  assert.equal(l2.bZu, Z.leitwertZu, "die Dämpfung bremst auch das Füllen – das Rückschlagventil fehlt");

  // Und spiegelbildlich in der hinteren Endlage für Kammer A.
  const hinten = P.neuerZustand(Z, { weg: 1, stellung: "einfahren" });
  assert.ok(P.leitwerte(hinten, Z).aAb < Z.leitwertAb * 0.3, "Abluft aus A ist nicht gedrosselt");
  assert.equal(P.leitwerte(P.neuerZustand(Z, { weg: 1, stellung: "ausfahren" }), Z).aZu, Z.leitwertZu);
});

test("Die Drossel kann den Weg nur verengen, nie weiten", () => {
  // Wäre der Abluftweg ohnehin enger als die Drossel, dürfte sie ihn nicht
  // aufziehen. Das ist einmal passiert und hat die Dämpfung umgekehrt.
  const eng = { ...Z, leitwertAb: Z.leitwertDrossel / 4 };
  const z = P.neuerZustand(eng, { weg: eng.hub - 1, stellung: "ausfahren" });
  assert.ok(P.leitwerte(z, eng).bAb <= eng.leitwertAb + 1e-9, "die Dämpfung öffnet den Abluftweg");
});

test("Mitten im Umschalten sind alle vier Wege fast zu", () => {
  const z = P.neuerZustand(Z, { weg: 100, stellung: "einfahren" });
  z.schieber = 0.5;
  const l = P.leitwerte(z, Z);
  for (const [name, k] of Object.entries(l)) {
    assert.equal(k, 0, `Weg ${name} ist mitten im Umschalten offen (${k})`);
  }
});

// --- Which direction is faster depends on where the restriction sits ------

/** Peak speed on the free stroke, mm/s — outside both cushioning zones. */
function freieGeschwindigkeit(lauf, masse) {
  const frei = lauf.spur.filter((s) => s.weg > masse.daempfung && s.weg < masse.hub - masse.daempfung);
  return Math.max(...frei.map((s) => s.v));
}

test("Ist die ZUluft die Engstelle, läuft der Zylinder beim EINfahren schneller", () => {
  // Die Faustregel v = Q / A aus der Hydraulik: bei vorgegebenem Volumenstrom
  // ist die kleinere Ringfläche eher gefüllt. Sie gilt genau dann, wenn der
  // Zuweg die Engstelle ist – und sie spricht über die Geschwindigkeit auf
  // dem freien Hub, nicht über die Gesamtzeit samt Endlagendämpfung.
  const eng = { ...Z, leitwertZu: Z.leitwertZu / 10 };
  const vAus = freieGeschwindigkeit(fahre("ausfahren", { von: 0, masse: eng }), eng);
  const vEin = freieGeschwindigkeit(fahre("einfahren", { von: eng.hub, masse: eng }), eng);
  assert.ok(vEin > vAus, `Einfahren ${vEin.toFixed(0)} mm/s gegen Ausfahren ${vAus.toFixed(0)} mm/s`);
});

test("Ist die ABluft die Engstelle, läuft der Zylinder beim AUSfahren schneller", () => {
  // Der Normalfall in der Industrie (Abluftdrosselung): dann zählt, wie viel
  // Luft hinaus muss. Beim Einfahren ist das die große Kolbenkammer.
  const eng = { ...Z, leitwertAb: Z.leitwertAb / 10 };
  const vAus = freieGeschwindigkeit(fahre("ausfahren", { von: 0, masse: eng }), eng);
  const vEin = freieGeschwindigkeit(fahre("einfahren", { von: eng.hub, masse: eng }), eng);
  assert.ok(vAus > vEin, `Ausfahren ${vAus.toFixed(0)} mm/s gegen Einfahren ${vEin.toFixed(0)} mm/s`);
});

test("Die Endlagendämpfung kostet beim Einfahren mehr Zeit – mehr Luft durch dieselbe Drossel", () => {
  // Die gedämpfte Strecke ist gleich lang, aber hinter der Kolbenfläche steht
  // mehr Luft als hinter der Ringfläche. Darum ist die Gesamtzeit beim
  // Einfahren länger, obwohl der freie Hub schneller sein kann.
  // Nur bis zur Ankunft messen: danach steht der Kolben und die Kammern
  // beruhigen sich noch sekundenlang, was die Messung sonst verschluckt.
  const inDaempfung = (lauf, vonWeg, bisWeg) => {
    const treffer = lauf.spur.filter(
      (s) => s.t <= lauf.dauer && s.weg >= Math.min(vonWeg, bisWeg) && s.weg <= Math.max(vonWeg, bisWeg),
    );
    return treffer[treffer.length - 1].t - treffer[0].t;
  };
  const aus = fahre("ausfahren", { von: 0 });
  const ein = fahre("einfahren", { von: Z.hub });
  const tAus = inDaempfung(aus, Z.hub - Z.daempfung, Z.hub);
  const tEin = inDaempfung(ein, 0, Z.daempfung);
  assert.ok(tEin > tAus, `Dämpfung einfahren ${tEin.toFixed(3)} s, ausfahren ${tAus.toFixed(3)} s`);
});

test("Bei gleich weiten Wegen liegen beide Hubzeiten in derselben Größenordnung", () => {
  const aus = fahre("ausfahren", { von: 0 });
  const ein = fahre("einfahren", { von: Z.hub });
  const q = aus.dauer / ein.dauer;
  assert.ok(q > 0.5 && q < 2, `Hubzeiten ${aus.dauer.toFixed(3)} s und ${ein.dauer.toFixed(3)} s`);
});

// --- Pressures -----------------------------------------------------------

test("Kein Druck übersteigt die Versorgung oder fällt unter die Umgebung", () => {
  for (const [stellung, von] of [["ausfahren", 0], ["einfahren", Z.hub]]) {
    const { spur } = fahre(stellung, { von, druck: 6 });
    for (const s of spur) {
      for (const [name, p] of [["A", s.pA], ["B", s.pB]]) {
        assert.ok(p >= P.UMGEBUNG - 1e-6, `Kammer ${name}: ${p} bar unter Umgebungsdruck`);
        assert.ok(p <= 6 + P.UMGEBUNG + 1e-6, `Kammer ${name}: ${p} bar über Versorgungsdruck`);
      }
    }
  }
});

test("Ausgefahren und beruhigt steht Kammer A unter vollem Druck, Kammer B drucklos", () => {
  const { z } = fahre("ausfahren", { von: 0 });
  assert.ok(Math.abs(z.pA - 7) < 0.05, `A steht bei ${z.pA.toFixed(2)} bar abs statt 7`);
  assert.ok(Math.abs(z.pB - 1) < 0.05, `B steht bei ${z.pB.toFixed(2)} bar abs statt 1`);
});

test("Eingefahren und beruhigt ist es umgekehrt", () => {
  const { z } = fahre("einfahren", { von: Z.hub });
  assert.ok(Math.abs(z.pB - 7) < 0.05, `B steht bei ${z.pB.toFixed(2)} bar abs statt 7`);
  assert.ok(Math.abs(z.pA - 1) < 0.05, `A steht bei ${z.pA.toFixed(2)} bar abs statt 1`);
});

test("In der gedämpften Endlage staut sich die Abluft kurz auf", () => {
  // Genau das tut die Dämpfung: sie baut Gegendruck auf, der den Kolben bremst.
  const { spur } = fahre("ausfahren", { von: 0 });
  const inDaempfung = spur.filter((s) => s.weg > Z.hub - Z.daempfung && s.weg < Z.hub - 0.01);
  assert.ok(
    Math.max(...inDaempfung.map((s) => s.pB)) > P.UMGEBUNG + 0.5,
    "in der Dämpfung baut sich kein Gegendruck auf",
  );
});

test("Mehr Versorgungsdruck heißt kürzere Hubzeit", () => {
  const langsam = fahre("ausfahren", { von: 0, druck: 3 });
  const schnell = fahre("ausfahren", { von: 0, druck: 8 });
  assert.ok(
    schnell.dauer < langsam.dauer,
    `8 bar (${schnell.dauer.toFixed(3)} s) ist nicht schneller als 3 bar (${langsam.dauer.toFixed(3)} s)`,
  );
});

test("Zu wenig Druck bewegt den Kolben nicht gegen die Reibung", () => {
  const schwach = { ...Z, reibung: 2000 };
  const z = P.neuerZustand(schwach, { weg: 0, stellung: "ausfahren" });
  for (let t = 0; t < 2; t += DT) P.schritt(z, schwach, DT, 6);
  assert.ok(z.weg < 0.5, `der Kolben fährt gegen 2000 N Reibung auf ${z.weg.toFixed(1)} mm`);
});

// --- Numerical soundness --------------------------------------------------

test("Keine Zahl wird NaN oder unendlich, auch bei groben Zeitschritten nicht", () => {
  for (const dt of [1 / 2000, 1 / 240, 1 / 60, 1 / 20]) {
    const z = P.neuerZustand(Z, { weg: 0, stellung: "ausfahren" });
    for (let t = 0; t < 3; t += dt) {
      P.schritt(z, Z, dt, 6);
      for (const [name, v] of Object.entries({ weg: z.weg, v: z.v, pA: z.pA, pB: z.pB })) {
        assert.ok(Number.isFinite(v), `${name} ist ${v} bei dt=${dt}`);
      }
    }
    assert.ok(Math.abs(z.weg - Z.hub) < 2, `bei dt=${dt} landet der Kolben bei ${z.weg.toFixed(1)} mm`);
  }
});

test("Ein Zeitsprung (Tab im Hintergrund) lässt die Figur nicht explodieren", () => {
  const z = P.neuerZustand(Z, { weg: 0, stellung: "ausfahren" });
  P.schritt(z, Z, 30, 6);
  assert.ok(Number.isFinite(z.weg) && z.weg >= 0 && z.weg <= Z.hub, `Weg ${z.weg}`);
});

test("Druck 0 bar lässt alles in Ruhe", () => {
  const z = P.neuerZustand(Z, { weg: 0, stellung: "ausfahren" });
  for (let t = 0; t < 1; t += DT) P.schritt(z, Z, DT, 0);
  assert.equal(z.weg, 0);
  assert.ok(Math.abs(z.pA - P.UMGEBUNG) < 1e-6 && Math.abs(z.pB - P.UMGEBUNG) < 1e-6);
});

// --- What the figure displays --------------------------------------------

test("Die Anzeige liefert gerundete Werte, die zum Zustand passen", () => {
  const z = P.neuerZustand(Z, { weg: 0 });
  const a = P.anzeige(z, Z, 6);
  assert.equal(a.kraftAus, 1178);
  assert.equal(a.kraftEin, 990);
  assert.equal(a.weg, 0);
  assert.equal(a.flaecheKolben, 1963.5);
  assert.equal(a.flaecheRing, 1649.3);
  assert.equal(a.verhaeltnis, 1.19);
});

test("Die angezeigte Kraft folgt dem Druckschieber", () => {
  const z = P.neuerZustand(Z, { weg: 0 });
  assert.equal(P.anzeige(z, Z, 3).kraftAus, 589);
  assert.equal(P.anzeige(z, Z, 8).kraftAus, 1571);
});

// --- Single-acting cylinder with a return spring (Festo ESNU-50-25-P-A) ----

const E = P.ESNU_50_25;

/** Run the single-acting cylinder: hold the button (ausfahren) or let go (einfahren). */
function laufeEinfach(z, druck, dauer = 3) {
  const spur = [];
  for (let t = DT; t < dauer; t += DT) {
    P.schritt(z, E, DT, druck);
    spur.push({ t, weg: z.weg, v: z.v, pA: z.pA, pB: z.pB });
  }
  return spur;
}

/** Time until the piston has covered the stroke, from the moment the valve is thrown. */
function hubZeit(nach, druck = 6) {
  const z = P.neuerZustand(E, { weg: nach === "ausfahren" ? 0 : E.hub, stellung: nach });
  if (nach === "einfahren") {
    z.pA = P.UMGEBUNG + druck;   // chamber A still full when the button is released
    z.schieber = 1;
  }
  const ziel = nach === "ausfahren" ? (s) => s.weg >= E.hub - 0.01 : (s) => s.weg <= 0.01;
  const spur = laufeEinfach(z, druck, 4);
  const treffer = spur.find(ziel);
  assert.ok(treffer, `der Kolben kommt beim ${nach} nicht an`);
  return treffer.t;
}

test("Einfachwirkend: F aus bei 6 bar ist der Katalogwert 1072,8 N", () => {
  // Katalog: 0,6 N/mm² · 1963,495 mm² − 105,3 N Feder bei vollem Hub = 1072,8 N
  const f = P.kraftAus(6, E);
  assert.ok(Math.abs(f - 1072.8) < 0.2, `F_aus ${f}`);
});

test("Einfachwirkend: bei 3 bar bleiben 484 N", () => {
  // 0,3 · 1963,495 − 105,3 = 589,05 − 105,3 = 483,75 N
  assert.ok(Math.abs(P.kraftAus(3, E) - 483.75) < 0.2);
  assert.equal(P.anzeige(P.neuerZustand(E), E, 3).kraftAus, 484);
});

test("Einfachwirkend: die Feder drückt 82 N eingefahren und 105,3 N ausgefahren", () => {
  // 82 + 0,932 · 25 = 105,3 N
  assert.equal(P.federKraft(P.neuerZustand(E, { weg: 0 }), E), 82);
  assert.ok(Math.abs(P.federKraft(P.neuerZustand(E, { weg: E.hub }), E) - 105.3) < 0.01);
  assert.equal(P.kraftEin(6, E), 82, "zurück drückt nur die Feder, der Druck hilft nicht");
  assert.equal(P.federKraft(P.neuerZustand(Z), Z), 0, "der doppeltwirkende Zylinder hat keine Feder");
});

test("Einfachwirkend: die Anzeige nennt die Federkräfte", () => {
  const a = P.anzeige(P.neuerZustand(E, { weg: 0 }), E, 6);
  assert.equal(a.kraftAus, 1073);
  assert.equal(a.federEin, 82);
  assert.equal(a.federAus, 105);
  assert.equal(a.federJetzt, 82);
  assert.equal(P.anzeige(P.neuerZustand(E, { weg: E.hub }), E, 6).federJetzt, 105);
  assert.ok(!("federJetzt" in P.anzeige(P.neuerZustand(Z), Z, 6)), "doppeltwirkend zeigt keine Feder");
});

test("Einfachwirkend: der Federraum bleibt über einen ganzen Zyklus auf Umgebung", () => {
  const z = P.neuerZustand(E, { weg: 0, stellung: "ausfahren" });
  const aus = laufeEinfach(z, 6, 1);
  z.stellung = "einfahren";
  const ein = laufeEinfach(z, 6, 1);
  for (const s of [...aus, ...ein]) assert.equal(s.pB, P.UMGEBUNG, `Federraum bei ${s.pB} bar`);
  assert.ok(aus.some((s) => s.weg > E.hub - 0.5), "der Kolben ist nie ausgefahren");
  assert.ok(ein[ein.length - 1].weg < 0.5, "der Kolben ist nicht zurück");
});

test("Einfachwirkend: Taster los, der Kolben kehrt ohne Druck in A auf 0 zurück", () => {
  const z = P.neuerZustand(E, { weg: 0, stellung: "ausfahren" });
  laufeEinfach(z, 6, 1);
  assert.ok(z.weg > E.hub - 0.5 && z.pA > 6.9, "nicht ausgefahren und voll");
  z.stellung = "einfahren";
  const spur = laufeEinfach(z, 6, 1.5);
  assert.ok(z.weg < 0.1, `Kolben steht bei ${z.weg} mm`);
  assert.ok(Math.abs(z.pA - P.UMGEBUNG) < 0.02, `Kammer A bei ${z.pA} bar`);
  // The way back is the spring's alone: A never goes above its start value while returning.
  assert.ok(spur.every((s) => s.pA <= 7.0001));
  assert.ok(P.ruht(z, E, 6));
});

test("Einfachwirkend: der Rückhub ist langsamer als der Vorhub, beide gut sichtbar kurz", () => {
  const aus = hubZeit("ausfahren");
  const ein = hubZeit("einfahren");
  assert.ok(aus >= 0.05 && aus <= 0.15, `Vorhub ${aus.toFixed(3)} s`);
  assert.ok(ein >= 0.05 && ein <= 0.15, `Rückhub ${ein.toFixed(3)} s`);
  assert.ok(ein > aus * 1.3, `Rückhub ${ein.toFixed(3)} s nicht merklich langsamer als Vorhub ${aus.toFixed(3)} s`);
});

test("Einfachwirkend: bei 0,5 bar fährt er nicht aus, bei 2 bar schon", () => {
  // 0,05 N/mm² · 1963,5 mm² = 98 N < 82 N Feder + 40 N Reibung
  const z = P.neuerZustand(E, { weg: 0, stellung: "ausfahren" });
  laufeEinfach(z, 0.5, 1);
  assert.ok(z.weg < 0.5, `fährt bei 0,5 bar auf ${z.weg} mm`);
  assert.ok(P.ruht(z, E, 0.5), "beruhigt, aber nicht ausgefahren");
  const y = P.neuerZustand(E, { weg: 0, stellung: "ausfahren" });
  laufeEinfach(y, 2, 1);
  assert.ok(y.weg > E.hub - 0.5);
});

test("Einfachwirkend: keine Zahl wird NaN, Kammer A bleibt zwischen Umgebung und Versorgung", () => {
  const z = P.neuerZustand(E, { weg: 0, stellung: "ausfahren" });
  for (const s of laufeEinfach(z, 8, 1)) {
    assert.ok(Number.isFinite(s.weg) && s.pA >= P.UMGEBUNG - 1e-6 && s.pA <= 9 + 1e-6);
  }
});
