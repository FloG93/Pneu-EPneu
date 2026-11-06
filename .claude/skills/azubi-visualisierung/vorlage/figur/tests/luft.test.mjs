// The two blues carry meaning, so they have to be told apart — on a projector
// in a bright room, by someone who is red-green colour blind, and in a
// black-and-white print. That is a measurement, not a matter of taste.
import test from "node:test";
import assert from "node:assert/strict";
import { FARBEN, PAPIER, kontrast, leuchtkraft } from "../luft.mjs";

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
