// What only the single-acting cylinder promises, on top of the checks every
// figure passes (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Zylinder-Einfachwirkend/ \
//        Zylinder-Einfachwirkend/tests/tools/pruefe-zylinder-ew.mjs
//
// Measured on what the browser draws (the computed fill of the two chambers),
// never on a class: holding the button fills chamber A with the strong tone
// and moves the piston; letting go brings the piston home and chamber A back to
// the ambient tone; the spring chamber is pale at every moment; the readout
// shows the model's forces; taking the machine apart ends the signal and the
// automatic cycle, and it stands home when it is together again.
export default async function pruefeZylinderEw({ seite, V, modus }) {
  /** Luminance of the drawn fill of a chamber (computed style: floats too). */
  const hell = (sel) => seite.evaluate((s) => {
    const text = getComputedStyle(document.querySelector(s)).fill;
    const srgb = text.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const c = srgb ? [1, 2, 3].map((i) => Number(srgb[i])) : (text.match(/[\d.]+/g) || []).slice(0, 3).map((v) => Number(v) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }, sel);
  const fuellung = async () => ({ a: await hell('[data-kammer="a"]'), b: await hell('[data-kammer="b"]') });
  const weg = () => seite.evaluate(() => window.__figur.modell().weg);
  const text = () => seite.textContent("[data-readout]");
  const zahl = (t, re) => Number((t.match(re) || [])[1]);
  const gleich = (x, y) => Math.abs(x - y) < 0.01;
  // "Under pressure" is the stronger tone: darker on paper, lighter at night.
  const staerker = (voll, leer) => (modus === "light" ? voll < leer - 0.05 : voll > leer + 0.05);

  // Slow motion off: the stroke takes 0,06 s and the checks have to be quick.
  await seite.evaluate(() => { const r = document.getElementById("zeitlupe"); r.value = 1; r.dispatchEvent(new Event("input")); });

  // Rest: no signal, the piston home, chamber A at the ambient tone.
  await seite.evaluate(() => window.__figur.stelle(0, "einfahren"));
  await seite.waitForTimeout(150);
  const ruhe = await fuellung();
  V("in Ruhe sind beide Kammern im blassen Ton", gleich(ruhe.a, ruhe.b));

  // Holding the button: chamber A fills, the piston goes out, the spring chamber stays pale.
  await seite.evaluate(() => window.__figur.signal(true));
  const proben = [];
  for (let i = 0; i < 6; i += 1) { await seite.waitForTimeout(60); proben.push(await fuellung()); }
  await seite.waitForFunction(() => window.__figur.modell().weg > 24.5, null, { timeout: 8000 }).catch(() => {});
  await seite.waitForTimeout(400);
  const gehalten = await fuellung();
  V(`gehalten steht Kammer A unter Druck, der Federraum nicht (${gehalten.a.toFixed(2)} gegen ${gehalten.b.toFixed(2)})`, staerker(gehalten.a, gehalten.b));
  V(`der Kolben fährt aus (${(await weg()).toFixed(1)} mm)`, (await weg()) > 24.5);
  V("der Federraum bleibt zu jedem Zeitpunkt im blassen Ton", [...proben, gehalten].every((p) => gleich(p.b, ruhe.b)));
  const imHub = await text();
  V(`bei vollem Hub zeigt die Anzeige 105 N Feder und 25 mm (${imHub})`, zahl(imHub, /Feder jetzt (\d+) N/) === 105 && zahl(imHub, /Hub (\d+) mm/) === 25);

  // Letting go: the spring brings the piston back, chamber A gives up its air.
  await seite.evaluate(() => window.__figur.signal(false));
  await seite.waitForFunction(() => window.__figur.modell().weg < 0.05 && window.__figur.modell().pA < 1.05, null, { timeout: 8000 }).catch(() => {});
  await seite.waitForTimeout(250);
  const los = await fuellung();
  V(`losgelassen ist der Kolben wieder bei 0 (${(await weg()).toFixed(2)} mm)`, (await weg()) < 0.1);
  V("losgelassen hat Kammer A wieder den Umgebungston", gleich(los.a, ruhe.a) && gleich(los.b, ruhe.b));
  V("ohne Druck in A kommt der Kolben allein durch die Feder zurück", await seite.evaluate(() => window.__figur.modell().pA < 1.05));

  // The readout: the model's forces, the spring's two values.
  const anzeigeBei = async (bar) => {
    await seite.fill("#druck", String(bar));
    await seite.dispatchEvent("#druck", "input");
    await seite.waitForTimeout(80);
    return text();
  };
  const bei6 = await anzeigeBei(6);
  const bei3 = await anzeigeBei(3);
  V(`bei 6 bar zeigt die Anzeige 1073 N (${zahl(bei6, /F aus (\d+) N/)})`, zahl(bei6, /F aus (\d+) N/) === 1073);
  V(`bei 3 bar zeigt die Anzeige 484 N (${zahl(bei3, /F aus (\d+) N/)})`, zahl(bei3, /F aus (\d+) N/) === 484);
  V(`eingefahren zeigt die Feder 82 N (${bei6})`, zahl(bei6, /Feder jetzt (\d+) N/) === 82);
  await anzeigeBei(6);

  // Taking it apart while the automatic cycle runs: it stops.
  const auto = () => seite.evaluate(() => window.__figur.automatik());
  if (!(await auto())) await seite.click("#btn-auto");
  V("die Automatik läuft vor dem Zerlegen", await auto());
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() > 0.2, null, { timeout: 8000 }).catch(() => {});
  V("beim Zerlegen steht die Automatik", !(await auto()));
  await seite.keyboard.press("Escape");
  await seite.waitForFunction(() => window.__figur.offen() < 0.005 && !window.__figur.zerlegt(), null, { timeout: 25000 }).catch(() => {});
  await seite.waitForTimeout(300);

  // Taking it apart while the button is held: the signal ends, the piston stands home afterwards.
  await seite.evaluate(() => window.__figur.signal(true));
  await seite.waitForTimeout(250);
  V("der Taster ist gehalten, der Kolben fährt aus", (await weg()) > 1);
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() > 0.2, null, { timeout: 8000 }).catch(() => {});
  V("beim Zerlegen endet das Signal des Tasters", await seite.evaluate(() => window.__figur.taster() === false && window.__figur.modell().stellung === "einfahren"));
  // Back together without waiting out the whole run: the second press aborts.
  await seite.keyboard.press("Escape");
  await seite.waitForFunction(() => window.__figur.offen() < 0.005 && !window.__figur.zerlegt(), null, { timeout: 25000 }).catch(() => {});
  await seite.waitForTimeout(300);
  V(`nach dem Zusammenbau steht der Kolben eingefahren (${(await weg()).toFixed(2)} mm)`, (await weg()) < 0.1);
  const danach = await fuellung();
  V(`nach dem Zusammenbau ist Kammer A im Umgebungston (${danach.a.toFixed(3)} gegen ${ruhe.a.toFixed(3)})`, gleich(danach.a, ruhe.a));
  V("nach dem Zusammenbau ist der Taster nicht gedrückt", await seite.evaluate(() => window.__figur.taster() === false));

  // Leave the page as the generic checks expect it: slow motion back on.
  await seite.evaluate(() => { const r = document.getElementById("zeitlupe"); r.value = 10; r.dispatchEvent(new Event("input")); });
}
