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
// shows the model's forces; the drawing really moves (the piston's group, the
// spring's coil is compressed with its piston end following and its head end
// standing still); taking the machine apart ends the signal and the automatic
// cycle, and it stands home when it is together again.
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

  // Slow motion off: the stroke takes 0.08 s and the checks have to be quick.
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

  // Letting go: the spring brings the piston back on its own, step by step, to 0.
  const lupe = (n) => seite.evaluate((w) => { const r = document.getElementById("zeitlupe"); r.value = w; r.dispatchEvent(new Event("input")); }, n);
  await lupe(6);                       // a little slower, so the way back gives enough samples
  const lauf = await seite.evaluate(() => new Promise((fertig) => {
    window.__figur.signal(false);
    const spur = [];
    const start = performance.now();
    const t = setInterval(() => {
      const w = window.__figur.modell().weg;
      spur.push(w);
      if (w < 0.05 || performance.now() - start > 8000) { clearInterval(t); fertig(spur); }
    }, 30);
  }));
  await lupe(1);
  await seite.waitForTimeout(300);
  const los = await fuellung();
  V(`losgelassen kommt der Kolben ohne Unterbrechung auf 0 zurück (${lauf.length} Proben, zuletzt ${lauf[lauf.length - 1].toFixed(2)} mm)`,
    lauf[lauf.length - 1] < 0.05 && lauf.every((w, i) => i === 0 || w <= lauf[i - 1] + 0.01));
  V("losgelassen hat Kammer A wieder den Umgebungston", gleich(los.a, ruhe.a) && gleich(los.b, ruhe.b));
  V("beim Zurückfahren ist der Kolben dabei in Bewegung (mehr als eine Probe)", lauf.length > 2);

  // The readout: the force the piston has right now, p · A − the spring at this position.
  const anzeigeBei = async (bar) => {
    await seite.fill("#druck", String(bar));
    await seite.dispatchEvent("#druck", "input");
    await seite.waitForTimeout(80);
    return text();
  };
  const zustandBei = async (weg, bar) => {
    await anzeigeBei(bar);
    await seite.evaluate((w) => window.__figur.stelle(w, w > 0 ? "ausfahren" : "einfahren"), weg);
    await seite.waitForTimeout(100);
    return text();
  };
  const anfang = await zustandBei(0, 6);
  const ende6 = await zustandBei(25, 6);
  const ende3 = await zustandBei(25, 3);
  V(`bei 6 bar und Hub 0 zeigt die Anzeige 1096 N bei Feder 82 N (${anfang})`, zahl(anfang, /F aus (\d+) N/) === 1096 && zahl(anfang, /Feder jetzt (\d+) N/) === 82);
  V(`bei 6 bar am Hubende zeigt die Anzeige 1073 N bei Feder 105 N (${ende6})`, zahl(ende6, /F aus (\d+) N/) === 1073 && zahl(ende6, /Feder jetzt (\d+) N/) === 105);
  V(`bei 3 bar am Hubende zeigt die Anzeige 484 N (${ende3})`, zahl(ende3, /F aus (\d+) N/) === 484);
  V("die Anzeige rechnet vor: F aus = p · A − Feder jetzt (6 bar: 1178 − 82 = 1096)", Math.abs(0.6 * 1963.4954 - 82 - 1096) < 0.5);
  await anzeigeBei(6);

  // The drawing, not the model: the piston's group moves, the coil is compressed.
  const gestalt = async (weg) => {
    await seite.evaluate((w) => window.__figur.stelle(w, w > 0 ? "ausfahren" : "einfahren"), weg);
    await seite.waitForTimeout(100);
    return seite.evaluate(() => {
      const mitte = (el) => { const r = el.getBoundingClientRect(); return [(r.left + r.right) / 2, (r.top + r.bottom) / 2]; };
      const hub = mitte(document.querySelector("[data-hub]"));
      const teile = [...document.querySelectorAll("[data-federx]")].map((el) => ({ x: Number(el.dataset.federx), r: el.getBoundingClientRect(), m: mitte(el) }));
      const links = Math.min(...teile.map((t) => t.r.left)), rechts = Math.max(...teile.map((t) => t.r.right));
      const kolbenEnde = teile.reduce((a, t) => (t.x < a.x ? t : a));
      const kopfEnde = teile.reduce((a, t) => (t.x > a.x ? t : a));
      return { hub, breite: rechts - links, kolbenEnde: kolbenEnde.m, kopfEnde: kopfEnde.m, n: teile.length };
    });
  };
  const g0 = await gestalt(0);
  const g25 = await gestalt(25);
  const weite = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  V(`die Kolbengruppe wandert beim Hub auf dem Bildschirm (${weite(g0.hub, g25.hub).toFixed(1)} px)`, weite(g0.hub, g25.hub) > 20);
  // The coil's length along its axis on screen (end piece to end piece), not its bounding box,
  // which also holds the coil's diameter and so shrinks less.
  const laenge0 = weite(g0.kolbenEnde, g0.kopfEnde), laenge25 = weite(g25.kolbenEnde, g25.kopfEnde);
  V(`die Feder wird zusammengedrückt: ${laenge0.toFixed(0)} px → ${laenge25.toFixed(0)} px lang (Breite ${g0.breite.toFixed(0)} → ${g25.breite.toFixed(0)} px)`,
    laenge25 < laenge0 * 0.75 && g25.breite < g0.breite);
  V(`das Kolbenende der Feder folgt dem Kolben (${weite(g0.kolbenEnde, g25.kolbenEnde).toFixed(1)} px)`, weite(g0.kolbenEnde, g25.kolbenEnde) > 20 && Math.abs(weite(g0.kolbenEnde, g25.kolbenEnde) - weite(g0.hub, g25.hub)) < 8);
  V(`das Kopfende der Feder bleibt stehen (${weite(g0.kopfEnde, g25.kopfEnde).toFixed(2)} px)`, weite(g0.kopfEnde, g25.kopfEnde) < 1);
  V(`die Wendel besteht aus Stücken (${g0.n})`, g0.n > 40);

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
