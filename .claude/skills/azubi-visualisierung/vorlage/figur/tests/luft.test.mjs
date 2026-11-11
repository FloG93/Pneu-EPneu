// The two blues carry meaning, so they have to be told apart — on a projector
// in a bright room, by someone who is red-green colour blind, and in a
// black-and-white print. That is a measurement, not a matter of taste.
import test from "node:test";
import assert from "node:assert/strict";
import { FARBEN, PAPIER, kontrast, leuchtkraft, LAUFZEIT } from "../luft.mjs";

for (const modus of ["light", "dark"]) {
  test(`${modus}: beide Lufttöne heben sich vom Papier ab`, () => {
    for (const [name, farbe] of Object.entries(FARBEN[modus])) {
      if (name === "rand") continue;
      const v = kontrast(farbe, PAPIER[modus]);
      // 3:1 is what a coloured area has to hold to be seen as an area at all.
      assert.ok(v >= 3, `${name} ${farbe} hält nur ${v.toFixed(2)}:1 gegen ${PAPIER[modus]}`);
    }
  });

  test(`${modus}: Druckluft und Abluft sind voneinander zu unterscheiden`, () => {
    const v = kontrast(FARBEN[modus].druck, FARBEN[modus].abluft);
    assert.ok(v >= 2, `die beiden Blautöne liegen nur ${v.toFixed(2)}:1 auseinander`);
  });

  test(`${modus}: der Unterschied liegt in der Helligkeit, nicht nur im Farbton`, () => {
    // Printed in black and white, or seen by someone colour blind, only the
    // lightness is left. It has to carry the difference on its own.
    const a = leuchtkraft(FARBEN[modus].druck);
    const b = leuchtkraft(FARBEN[modus].abluft);
    assert.ok(Math.abs(a - b) > 0.12, `Helligkeiten ${a.toFixed(3)} und ${b.toFixed(3)} liegen zu dicht`);
  });

  test(`${modus}: Druckluft ist der kräftigere Ton`, () => {
    // "Stronger" is what carries the meaning, and against paper that is the
    // darker tone while against a dark ground it is the lighter one — the same
    // way round as the kit's own tones. Otherwise the figure would mean the
    // opposite at night.
    const dunkler = leuchtkraft(FARBEN[modus].druck) < leuchtkraft(FARBEN[modus].abluft);
    assert.ok(modus === "light" ? dunkler : !dunkler, `in ${modus} ist Druckluft nicht der kräftigere Ton`);
  });
}

test("Die Kontrastrechnung selbst stimmt", () => {
  // Known values: white against black is 21:1, a colour against itself 1:1.
  assert.ok(Math.abs(kontrast("#ffffff", "#000000") - 21) < 0.01);
  assert.ok(Math.abs(kontrast("#777777", "#777777") - 1) < 1e-9);
});

// The three helpers every page's runtime shares: run against a stand-in for the page's own `stroeme` and `raeume`.
const helfer = (stroeme, raeume, stromSchritt = () => {}) =>
  new Function("stroeme", "raeume", "stromSchritt", `${LAUFZEIT.match(/function haltStroeme[^]*$/)[0]}; return { haltStroeme, blendeLeereStroeme, setzeRaumFarben };`)(stroeme, raeume, stromSchritt);

test("Laufzeit: setzeRaumFarben malt jeden Raum in den Ton seiner Nummer und fasst Gleiches nicht an", () => {
  const raum = (nr) => ({ dataset: { raum: nr }, f: null, n: 0, getAttribute() { return this.f; }, setAttribute(_, v) { this.f = v; this.n += 1; } });
  const a = raum("L"), b = raum("R");
  const h = helfer({}, [a, b]);
  h.setzeRaumFarben({ L: "#123", R: "none" });
  assert.deepEqual([a.f, b.f], ["#123", "none"]);
  h.setzeRaumFarben({ L: "#123", R: "#456" });
  assert.deepEqual([a.n, b.n], [1, 2], "ein unveränderter Ton wird nicht neu geschrieben");
});

test("Laufzeit: blendeLeereStroeme blendet einen Strom aus, dessen Teilchen alle durchsichtig sind", () => {
  const strom = (ops) => ({ kugeln: ops.map((o) => ({ getAttribute: () => o })), g: { style: {} } });
  const s = { leer: strom(["0", "0"]), voll: strom(["0", "0.5"]) };
  helfer(s, []).blendeLeereStroeme();
  assert.equal(s.leer.g.style.opacity, "0");
  assert.equal(s.voll.g.style.opacity, "");
});

test("Laufzeit: haltStroeme lässt jeden Strom stillstehen und ausblenden", () => {
  const aufrufe = [];
  const h = helfer({ a: { n: 1 }, b: { n: 2 } }, [], (s, dt, tempo, staerke, farbe) => aufrufe.push([s.n, dt, tempo, staerke, farbe]));
  h.haltStroeme(0.016);
  assert.deepEqual(aufrufe, [[1, 0.016, 0, 0, "#000"], [2, 0.016, 0, 0, "#000"]]);
});
