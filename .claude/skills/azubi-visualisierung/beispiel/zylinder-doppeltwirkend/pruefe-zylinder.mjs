// What only the double-acting cylinder promises, on top of the checks every
// figure passes (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Zylinder-Doppeltwirkend/ \
//        Zylinder-Doppeltwirkend/tests/tools/pruefe-zylinder.mjs
//
// The right chamber is under pressure for each valve position, and the
// readout shows the force the model computes, F = p · A.
export default async function pruefeZylinder({ seite, V, modus }) {
  const luft = async (stellung) => {
    await seite.evaluate((st) => window.__figur.stelle(100, st), stellung);
    await seite.waitForTimeout(120);
    return seite.evaluate(() => {
      const f = (s) => document.querySelector(s).getAttribute("fill");
      return { a: f('[data-kammer="a"]'), b: f('[data-kammer="b"]') };
    });
  };
  const hell = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const aus = await luft("ausfahren");
  const ein = await luft("einfahren");
  // "Under pressure" is the stronger tone: darker on paper, lighter at night.
  const dunkelIstDruck = modus === "light";
  const unterDruck = (voll, leer) => (dunkelIstDruck ? hell(voll) < hell(leer) : hell(voll) > hell(leer));
  V("beim Ausfahren steht Kammer A unter Druck", unterDruck(aus.a, aus.b));
  V("beim Einfahren steht Kammer B unter Druck", unterDruck(ein.b, ein.a));

  const anzeigeBei = async (bar) => {
    await seite.fill("#druck", String(bar));
    await seite.dispatchEvent("#druck", "input");
    await seite.waitForTimeout(60);
    return seite.textContent("[data-readout]");
  };
  const bei6 = await anzeigeBei(6);
  const bei3 = await anzeigeBei(3);
  const zahl = (t) => Number((t.match(/(\d+) N aus/) || [])[1]);
  V(`bei 6 bar zeigt die Anzeige 1178 N (${zahl(bei6)})`, zahl(bei6) === 1178);
  V(`halber Druck, halbe Kraft (${zahl(bei3)})`, Math.abs(zahl(bei3) * 2 - zahl(bei6)) <= 1);
  await anzeigeBei(6);
}
