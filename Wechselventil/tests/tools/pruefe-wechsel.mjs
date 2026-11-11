// What only the shuttle valve promises, on top of the checks every figure passes
// (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Wechselventil/ \
//        Wechselventil/tests/tools/pruefe-wechsel.mjs
//
// Measured on what the browser draws, never on a class alone: where the body sits in pixels in each state, the
// tones of the three rooms (they follow the PRESSURE, not fixed sides, and a blocked input that holds pressure keeps
// its tone), which route carries particles and in which direction they run, that no particle lies outside the air
// (every one is converted back to the cut plane and must lie in an air passage, and under no part), the readout,
// the ball and the tones of the symbol, the truth table's text, the slow motion (the body is seen in flight at 1/10),
// the eight-step cycle with the body's place at each step, the controls, and that taking apart stops everything.
// No wait is a fixed time: every one waits for a state of the page (or runs inside the page, frame by frame).
export default async function pruefeWechsel({ seite, V, modus }) {
  const GEO = await seite.evaluate(() => window.__figur.geometrie);
  const MASSE = await seite.evaluate(() => window.__figur.MASSE);
  /** The model's own numbers, read from the page: s and p2 (absolute bar). */
  const modell = () => seite.evaluate(() => { const z = window.__figur.modell(); return { s: z.s, p2: z.p2, pL: z.pL, pR: z.pR }; });
  const text = () => seite.textContent("[data-readout]");
  /** A state at rest, the drawing settled (no particles). */
  const stelle = async (l, r) => { await seite.evaluate(([a, b]) => window.__figur.stelle(a, b), [l, r]); await seite.waitForTimeout(60); };
  /** The same as the sliders: pressures change and the model runs on; waits until the body and the output have arrived. */
  const schalte = async (l, r, { s = null, p2 = null } = {}) => {
    await seite.evaluate(([a, b]) => window.__figur.schalte(a, b), [l, r]);
    await seite.waitForFunction(([ss, pp]) => {
      const z = window.__figur.modell();
      return (ss === null || Math.abs(z.s - ss) < 1e-6) && (pp === null || Math.abs(z.p2 - (1 + pp)) < 0.02);
    }, [s, p2], { timeout: 8000 });
  };
  /** Real time at 1× so that the model's 8 ms are done within a frame or two. */
  const zeitlupe = async (n) => {
    await seite.fill("#zeitlupe", String(n));
    await seite.dispatchEvent("#zeitlupe", "input");
  };
  /** Luminance of the drawn fill of a room (computed style: floats too). */
  const hell = (sel) => seite.evaluate((s) => {
    const t = getComputedStyle(document.querySelector(s)).fill;
    const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const c = srgb ? [1, 2, 3].map((i) => Number(srgb[i])) : (t.match(/[\d.]+/g) || []).slice(0, 3).map((v) => Number(v) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }, sel);
  const raeume = async () => ({ L: await hell('[data-raum="L"]'), R: await hell('[data-raum="R"]'), A: await hell('[data-raum="A"]') });
  // Under pressure is the stronger tone: darker on paper, lighter at night.
  const staerker = (voll, leer) => (modus === "light" ? voll < leer - 0.04 : voll > leer + 0.04);
  const gleich = (a, b) => Math.abs(a - b) < 0.01;
  /** The ball's screen position: the middle of the body's drawn half section. */
  const koerper = () => seite.evaluate(() => {
    const r = document.querySelector('[data-g="koerper"] [data-lage="schnitt"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  /** The screen vector of one millimetre along the bore (measured on the housing's cut face, which the page marks data-mass). */
  const mm = await seite.evaluate((G) => {
    const pfad = document.querySelector("[data-mass]");
    const zahlen = pfad.getAttribute("d").match(/-?[\d.]+/g).map(Number);
    const ctm = pfad.getScreenCTM();
    const pt = (i) => { const q = pfad.ownerSVGElement.createSVGPoint(); q.x = zahlen[i]; q.y = zahlen[i + 1]; const r = q.matrixTransform(ctm); return { x: r.x, y: r.y }; };
    const a = pt(0), b = pt(2);
    return { x: (b.x - a.x) / G.LAENGE, y: (b.y - a.y) / G.LAENGE };
  }, GEO);
  /** Visible particles per route: how many, their mean opacity. */
  const teilchen = () => seite.evaluate(() => {
    const aus = {};
    for (const g of document.querySelectorAll("[data-strom]")) {
      const op = [...g.querySelectorAll("circle")].map((c) => Number(c.getAttribute("opacity"))).filter((v) => v > 0.05);
      aus[g.dataset.strom] = { n: op.length, mittel: op.length ? op.reduce((a, b) => a + b, 0) / op.length : 0 };
    }
    return aus;
  });
  /** Wait until a route shows at least n particles (the afterglow of the short filling lasts half a second). */
  const wartePartikelIrgendwo = (n) => seite.waitForFunction((k) => [...document.querySelectorAll("[data-strom] circle")]
    .filter((c) => Number(c.getAttribute("opacity")) > 0.05).length >= k, n, { timeout: 4000 }).then(() => true, () => false);
  const wartePartikel = (name, n) => seite.waitForFunction(([nm, k]) => [...document.querySelectorAll(`[data-strom="${nm}"] circle`)]
    .filter((c) => Number(c.getAttribute("opacity")) > 0.05).length >= k, [name, n], { timeout: 4000 }).then(() => true, () => false);

  // --- the scale and the geometry the page gives ---------------------------------------------------------
  V(`die Zeichnung hat einen Maßstab (${mm.x.toFixed(2)} / ${mm.y.toFixed(2)} px je mm längs der Bohrung)`, Math.hypot(mm.x, mm.y) > 3);
  V("Zeitlupe beginnt bei 1/10", (await seite.inputValue("#zeitlupe")) === "10" && (await seite.textContent("#zeitlupe-wert")) === "1/10");
  V("die Automatik läuft beim Laden", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "true");

  // --- body: where it sits in pixels, state by state -----------------------------------------------------
  await seite.click("#btn-auto");                         // stop the cycle for the measuring
  await zeitlupe(1);
  await stelle(6, 0);
  const rechts = await koerper();                         // L only: the body shuts the right input
  await stelle(0, 6);
  const links = await koerper();                          // R only: it shuts the left one
  const dx = (rechts.x - links.x), dy = (rechts.y - links.y);
  V(`der Körper wandert um den Hub (${MASSE.hub} mm) von Sitz zu Sitz (${dx.toFixed(1)} / ${dy.toFixed(1)} px, erwartet ${(mm.x * MASSE.hub).toFixed(1)} / ${(mm.y * MASSE.hub).toFixed(1)})`,
    Math.abs(dx - mm.x * MASSE.hub) <= 1 && Math.abs(dy - mm.y * MASSE.hub) <= 1);
  V("nur rechts 6 bar: der Körper liegt am linken Sitz und sperrt links (Modell und Anzeige)", (await modell()).s === 0 && /Körper sperrt: links/.test(await text()));
  await stelle(6, 0);
  V("nur links 6 bar: der Körper liegt am rechten Sitz und sperrt rechts (Modell und Anzeige)", (await modell()).s === 1 && /Körper sperrt: rechts/.test(await text()));

  // --- the four cases and first-come-first-served, with the model running --------------------------------
  await schalte(6, 0, { s: 1, p2: 6 });
  const l1 = await koerper();
  V("nur links an: der Körper liegt rechts (so wie im ruhenden Bild)", Math.abs(l1.x - rechts.x) <= 1 && Math.abs(l1.y - rechts.y) <= 1);
  await schalte(6, 6, { s: 1, p2: 6 });
  const beide1 = await koerper();
  V("links zuerst, dann beide: der Körper bleibt rechts (wer zuerst kommt)", Math.abs(beide1.x - rechts.x) <= 1 && Math.abs(beide1.y - rechts.y) <= 1);
  await schalte(0, 6, { s: 0, p2: 6 });
  const lOff = await koerper();
  V("links aus, rechts an: der Körper wechselt nach links, der Ausgang bleibt unter Druck", Math.abs(lOff.x - links.x) <= 1 && (await modell()).p2 > 6.9);
  await schalte(0, 0, { p2: 0 });
  V("beide aus: Ausgang 2 entlüftet (Anzeige 0,0 bar), der Körper bleibt liegen", /Ausgang 2 0,0 bar/.test(await text()) && (await modell()).s === 0);
  await schalte(0, 6, { s: 0, p2: 6 });
  await schalte(6, 6, { s: 0, p2: 6 });
  const beide2 = await koerper();
  V("rechts zuerst, dann beide: der Körper bleibt links", Math.abs(beide2.x - links.x) <= 1 && Math.abs(beide2.y - links.y) <= 1);
  await schalte(6, 3, { s: 1, p2: 6 });
  V("links 6, rechts 3: der niedrigere Eingang (rechts) wird gesperrt", /Körper sperrt: rechts/.test(await text()));

  // --- rooms: tones follow the pressure, not fixed sides ------------------------------------------------
  await stelle(0, 0);
  const leer = await raeume();
  await stelle(6, 0);
  const nurL = await raeume();
  V("L an, R aus: linker Raum kräftig, rechter Eingangsraum blass, Ausgang kräftig",
    staerker(nurL.L, leer.L) && gleich(nurL.R, leer.R) && staerker(nurL.A, leer.A) && gleich(nurL.L, nurL.A));
  await stelle(0, 6);
  const nurR = await raeume();
  V("R an, L aus: die Töne folgen dem Druck – rechter Raum und Ausgang kräftig, linker blass", staerker(nurR.R, leer.R) && gleich(nurR.L, leer.L) && staerker(nurR.A, leer.A));
  await stelle(6, 6);
  const beide = await raeume();
  V("beide an: alle drei Räume kräftig", staerker(beide.L, leer.L) && staerker(beide.R, leer.R) && staerker(beide.A, leer.A));
  V("beide aus: alle drei Räume blass", gleich(leer.L, leer.R) && gleich(leer.R, leer.A));
  await stelle(3, 0);
  const halb = await raeume();
  V(`3 bar ist ein Mischton zwischen blass und kräftig (${halb.L.toFixed(3)} zwischen ${leer.L.toFixed(3)} und ${nurL.L.toFixed(3)})`,
    (modus === "light" ? halb.L < leer.L - 0.01 && halb.L > nurL.L + 0.01 : halb.L > leer.L + 0.01 && halb.L < nurL.L - 0.01));
  await stelle(6, 3);
  const gesperrtMitDruck = await raeume();
  V("gesperrt ist nicht drucklos: der gesperrte Eingang rechts (3 bar) behält seinen Ton, der Körper sperrt ihn", staerker(gesperrtMitDruck.R, leer.R) && /Körper sperrt: rechts/.test(await text()));
  V("der Ton richtet sich nach der Höhe des Drucks: 3 bar blasser als 6 bar", modus === "light" ? gesperrtMitDruck.R > nurR.R + 0.01 : gesperrtMitDruck.R < nurR.R - 0.01);

  // --- the symbol: the ball and the tones of its three parts ---------------------------------------------
  const symbol = () => seite.evaluate(() => {
    const ton = (n) => document.querySelector(`.beifigur-symbol [data-teil="${n}"]`).getAttribute("class");
    const k = document.querySelector('.beifigur-symbol [data-teil="kugel"] circle').getBoundingClientRect();
    const punkt = document.querySelector(".beifigur-symbol .sz-knoten").getBoundingClientRect();
    return { links: ton("links"), rechts: ton("rechts"), ausgang: ton("ausgang"), kugelRechts: k.left + k.width / 2 > punkt.left + punkt.width / 2 };
  });
  await stelle(6, 0);
  let sy = await symbol();
  V("Symbol, nur links an: Kugel rechts, links und Ausgang kräftig, rechts blass", sy.kugelRechts && /stark/.test(sy.links) && /stark/.test(sy.ausgang) && /blass/.test(sy.rechts));
  await stelle(0, 6);
  sy = await symbol();
  V("Symbol, nur rechts an: Kugel links, rechts und Ausgang kräftig, links blass", !sy.kugelRechts && /stark/.test(sy.rechts) && /stark/.test(sy.ausgang) && /blass/.test(sy.links));
  await stelle(0, 0);
  sy = await symbol();
  V("Symbol, beide aus: alle drei Teile blass", /blass/.test(sy.links) && /blass/.test(sy.rechts) && /blass/.test(sy.ausgang));
  // the tone is drawn, not only named: the strong and the pale part really differ
  await stelle(6, 0);
  const strichTon = (n) => seite.evaluate((nn) => {
    const t = getComputedStyle(document.querySelector(`.beifigur-symbol [data-teil="${nn}"] path`)).stroke;
    const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const c = srgb ? [1, 2, 3].map((i) => Number(srgb[i])) : (t.match(/[\d.]+/g) || []).slice(0, 3).map((v) => Number(v) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }, n);
  V("Symbol: die Striche zeigen die zwei Blautöne wirklich", staerker(await strichTon("links"), await strichTon("rechts")));

  // --- particles: which route carries air, in which direction -------------------------------------------------
  await stelle(0, 0);
  let t = await teilchen();
  V("im Ruhezustand ohne Druck steht kein Teilchen", Object.values(t).every((x) => x.n === 0));
  await stelle(6, 6);
  t = await teilchen();
  V("ein Zustand in Ruhe zeigt keine Teilchen (nichts strömt)", Object.values(t).every((x) => x.n === 0));
  await schalte(0, 0, { p2: 0 });
  await seite.evaluate(() => { window.__figur.stelle(0, 0); });
  await schalte(6, 0);
  V("L wird belüftet: Teilchen auf dem Weg von Eingang 1 links zum Ausgang", await wartePartikel("l", 6));
  t = await teilchen();
  V(`der gesperrte Eingang rechts bekommt nichts (rechter Weg ${t.r.n} Teilchen)`, t.r.n === 0 && t.l.n >= 6);
  // blocked from the other side
  await seite.evaluate(() => { window.__figur.stelle(0, 0); });
  await schalte(0, 6, { s: 0 });
  V("R wird belüftet: Teilchen auf dem rechten Weg, links keine", await wartePartikel("r", 6));
  t = await teilchen();
  V(`der gesperrte Eingang links bekommt nichts (linker Weg ${t.l.n} Teilchen)`, t.l.n === 0 && t.r.n >= 6);

  // direction: inside the page, frame by frame (see the throttle check valve's module for why)
  const lauf = (name) => seite.evaluate(async (n) => {
    const lies = () => [...document.querySelectorAll(`[data-strom="${n}"] circle`)]
      .map((c) => [Number(c.getAttribute("opacity")), Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
    const bild = () => new Promise((r) => requestAnimationFrame(r));
    const mitteVon = (liste) => { const l = liste.slice().sort((x, y) => x - y); return l.length ? l[Math.floor(l.length / 2)] : 0; };
    const bahn = window.__figur.bahn(n);
    // the first stretch of the route is the bore along the axis: both screen coordinates grow with x there
    const xMax = Math.max(bahn.punkte[0][0], bahn.punkte[1][0]), xMin = Math.min(bahn.punkte[0][0], bahn.punkte[1][0]);
    const paare = [];
    for (let versuch = 0; versuch < 40 && paare.length < 5; versuch += 1) {
      const t0 = await bild(); const a = lies(); const t1 = await bild(); const b = lies();
      if (t1 - t0 >= 25) continue;
      const d = a.map((p, i) => (p[0] > 0.1 && b[i][0] > 0.1 && p[1] >= xMin - 2 && p[1] <= xMax + 2 ? (b[i][1] - p[1]) + (b[i][2] - p[2]) : null))
        .filter((v) => v !== null && Math.abs(v) < 6);      // a jump of a whole spacing (the phase wraps) is left out
      if (d.length) paare.push(mitteVon(d));
    }
    return { n: paare.length, schritt: mitteVon(paare) };
  }, name);
  await seite.evaluate(() => { window.__figur.stelle(0, 0); });
  await seite.evaluate(() => window.__figur.schalte(6, 0));
  await wartePartikel("l", 6);
  const vorwaerts = await lauf("l");
  V(`beim Füllen laufen die Teilchen von Eingang 1 links zum Ausgang (Schritt ${vorwaerts.schritt.toFixed(2)} px, ${vorwaerts.n} Paare)`, vorwaerts.n > 0 && vorwaerts.schritt > 0.2);
  await seite.waitForFunction(() => window.__figur.modell().p2 > 6.9, null, { timeout: 4000 });
  await seite.evaluate(() => window.__figur.schalte(0, 0));
  await wartePartikel("l", 6);
  const rueck = await lauf("l");
  V(`beim Entlüften über den offenen Eingang laufen sie rückwärts (Schritt ${rueck.schritt.toFixed(2)} px, ${rueck.n} Paare)`, rueck.n > 0 && rueck.schritt < -0.2);

  // every particle lies in the air, and under no part
  const luft = () => seite.evaluate(() => {
    const wege = window.__figur.luftwege;
    const feste = ["stopfen", "oring", "koerper", "anschluss1l", "anschluss1r", "anschluss2"];
    const falsch = [];
    let gezaehlt = 0;
    for (const cc of document.querySelectorAll("[data-strom] circle")) {
      if (Number(cc.getAttribute("opacity")) < 0.2) continue;
      gezaehlt += 1;
      const x = Number(cc.getAttribute("cx")), y = Number(cc.getAttribute("cy"));
      const [mx, mz] = window.__figur.zuMm(x, y);
      const tol = 0.4;
      if (!wege.some(([x0, x1, z0, z1]) => mx >= x0 - tol && mx <= x1 + tol && mz >= z0 - tol && mz <= z1 + tol)) {
        falsch.push(`${cc.closest("[data-strom]").dataset.strom} außerhalb der Luftwege bei ${mx.toFixed(1)} / ${mz.toFixed(1)} mm`);
        continue;
      }
      const r = cc.getBoundingClientRect();
      for (const el of document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)) {
        const lage = el.closest("[data-lage]");
        if (lage && Number(getComputedStyle(lage).opacity) < 0.1) continue;     // the layer that is blended out is not there
        if (el.closest("[data-hohl]")) continue;                                // the air's own bore of a cut fitting
        const g = el.closest("[data-piece]");
        if (g && feste.includes(g.dataset.piece)) { falsch.push(`${cc.closest("[data-strom]").dataset.strom} über ${g.dataset.piece}`); break; }
      }
    }
    return { gezaehlt, falsch };
  });
  for (const [l, r] of [[6, 0], [0, 6], [6, 6], [0, 0]]) {
    await seite.evaluate(() => { window.__figur.stelle(0, 0); });
    await seite.evaluate(([a, b]) => window.__figur.schalte(a, b), [l, r]);
    if (l + r > 0) await wartePartikelIrgendwo(4);
    const m = await luft();
    V(`Zustand ${l}/${r} bar mit Strömung: alle ${m.gezaehlt} Teilchen liegen in den Luftwegen und unter keinem Teil${m.falsch.length ? " — " + m.falsch.slice(0, 3).join(", ") : ""}`,
      m.falsch.length === 0 && (l + r === 0 || m.gezaehlt >= 4));
  }
  // and while the body is on its way (slow motion 1/10: the filling and the changeover can be caught)
  await zeitlupe(10);
  await seite.evaluate(() => { window.__figur.stelle(6, 0); });
  await seite.evaluate(() => window.__figur.schalte(0, 6));
  await seite.waitForFunction(() => { const z = window.__figur.modell(); return z.s > 0.1 && z.s < 0.9; }, null, { timeout: 3000 }).catch(() => {});
  const mitte = await luft();
  V(`der Körper ist im Zeitlupen-Lauf unterwegs zu sehen (Teilchen: ${mitte.gezaehlt}) und nichts liegt ausserhalb der Luft${mitte.falsch.length ? " — " + mitte.falsch.slice(0, 3).join(", ") : ""}`, mitte.falsch.length === 0);
  await seite.waitForFunction(() => window.__figur.modell().s === 0, null, { timeout: 5000 });
  await zeitlupe(1);

  // --- slow motion: the 8 ms of the changeover are seen in flight at 1/10 --------------------------------------
  await zeitlupe(10);
  await seite.evaluate(() => { window.__figur.stelle(6, 0); });
  const flug = await seite.evaluate(async () => {
    const t0 = performance.now();
    window.__figur.schalte(0, 6);
    let sichtbarUnterwegs = 0, ende = null;
    while (performance.now() - t0 < 3000) {
      await new Promise((r) => requestAnimationFrame(r));
      const s = window.__figur.modell().s;
      if (s > 0.05 && s < 0.95) sichtbarUnterwegs += 1;
      if (s === 0) { ende = performance.now() - t0; break; }
    }
    return { sichtbarUnterwegs, ende };
  });
  V(`Zeitlupe 1/10: der Körper ist ${flug.sichtbarUnterwegs} Bilder lang unterwegs (${flug.ende === null ? "kommt nicht an" : Math.round(flug.ende)} ms für 8 ms Modellzeit)`,
    flug.sichtbarUnterwegs >= 3 && flug.ende !== null && flug.ende > 40);
  await zeitlupe(1);

  // --- readout: the model's numbers, two lines, wrapping --------------------------------------------------------
  await stelle(6, 0);
  V("Anzeige: zwei Zeilen mit beiden Eingängen, dem Ausgang, dem gesperrten Eingang und dem Durchfluss",
    (await text()) === "Eingang links 6,0 bar · Eingang rechts 0,0 bar · Ausgang 2 6,0 bar\nKörper sperrt: rechts · Durchfluss 0 l/min");
  await stelle(0, 6);
  V("Anzeige nach dem Umschalten: links gesperrt", (await text()) === "Eingang links 0,0 bar · Eingang rechts 6,0 bar · Ausgang 2 6,0 bar\nKörper sperrt: links · Durchfluss 0 l/min");
  await stelle(6, 3);
  V("Anzeige 6/3 bar: Eingang rechts gesperrt, Ausgang 6,0", /Eingang rechts 3,0 bar/.test(await text()) && /Körper sperrt: rechts/.test(await text()));
  // the flow in the readout while the chamber fills: a number from the model (at 1/10 the 2,6 ms constant lasts a few frames)
  await seite.evaluate(() => { window.__figur.stelle(0, 0); });
  await zeitlupe(50);
  await seite.evaluate(() => window.__figur.schalte(6, 0));
  const fluss = await seite.waitForFunction(() => { const m = document.querySelector("[data-readout]").textContent.match(/Durchfluss (−?\d+) l\/min/); return m && Number(m[1]) !== 0; }, null, { timeout: 3000 }).then(() => true, () => false);
  V("beim Füllen zeigt die Anzeige einen Durchfluss über 0 l/min (aus dem Modell)", fluss);
  await zeitlupe(1);
  await seite.waitForFunction(() => window.__figur.modell().p2 > 6.9, null, { timeout: 5000 });

  // --- the controls really switch ------------------------------------------------------------------------------
  await stelle(0, 0);
  await seite.fill("#druck-links", "6");
  await seite.dispatchEvent("#druck-links", "input");
  await seite.waitForFunction(() => window.__figur.modell().p2 > 6.9, null, { timeout: 5000 });
  V("der Regler Eingang links schaltet den Ausgang durch (Modell und Anzeige)", /Ausgang 2 6,0 bar/.test(await text()) && /Eingang links 6,0 bar/.test(await text()));
  V("die Anzeige des Reglers nennt den Wert mit Komma", (await seite.textContent("#druck-links-wert")) === "6,0 bar");
  await seite.fill("#druck-rechts", "8");
  await seite.dispatchEvent("#druck-rechts", "input");
  await seite.waitForFunction(() => window.__figur.modell().s === 0 && window.__figur.modell().p2 > 8.9, null, { timeout: 5000 });
  V("Eingang rechts 8 bar gegen links 6 bar: der höhere Druck gewinnt, der Körper sperrt links", /Körper sperrt: links/.test(await text()) && /Ausgang 2 8,0 bar/.test(await text()));
  V("der Regler geht bis 8 bar in Schritten von 0,5", (await seite.getAttribute("#druck-rechts", "max")) === "8" && (await seite.getAttribute("#druck-rechts", "step")) === "0.5");
  await seite.click("#btn-auto");
  V("die Automatik ist wieder an", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "true");
  await seite.fill("#druck-links", "2");
  await seite.dispatchEvent("#druck-links", "input");
  V("ein Eingriff am Regler schaltet die Automatik aus", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");

  // --- the eight-step cycle: the order, and where the body is at each step --------------------------------------
  await stelle(0, 0);
  await zeitlupe(1);
  await seite.click("#btn-auto");
  const folge = await seite.evaluate(async () => {
    const schritte = [];
    const gesehen = new Set();
    const t0 = performance.now();
    while (schritte.length < 8 && performance.now() - t0 < 12000) {
      await new Promise((r) => requestAnimationFrame(r));
      const i = window.__figur.autoSchritt();
      if (!gesehen.has(i)) {
        gesehen.add(i);
        // the model needs a moment after the step: wait until the output has arrived
        const ziel = window.__figur.wunsch();
        const pMax = Math.max(ziel[0], ziel[1]);
        let n = 0;
        while (n < 60) {
          await new Promise((r) => requestAnimationFrame(r));
          const z = window.__figur.modell();
          if (Math.abs(z.p2 - (1 + pMax)) < 0.05 && (z.s === 0 || z.s === 1)) break;
          n += 1;
        }
        const z = window.__figur.modell();
        schritte.push({ i, wunsch: ziel, s: z.s, p2: z.p2 });
      }
    }
    return schritte;
  });
  const soll = [[6, 0, 1], [6, 6, 1], [0, 6, 0], [0, 0, 0], [0, 6, 0], [6, 6, 0], [6, 0, 1], [0, 0, 1]];
  V(`die Automatik beginnt bei links an und spielt die acht Schritte in der Reihenfolge der Spezifikation (${folge.map((x) => x.i).join("")})`,
    folge.length === 8 && folge.every((x, k) => x.i === k && x.wunsch[0] === soll[k][0] && x.wunsch[1] === soll[k][1]));
  V(`der Körper liegt bei jedem Schritt, wo wer-zuerst-kommt es verlangt (${folge.map((x) => x.s).join("")})`, folge.length === 8 && folge.every((x, k) => x.s === soll[k][2]));
  // a click that switches it off and on again starts over at step 0
  await seite.click("#btn-auto");
  await seite.click("#btn-auto");
  V("jeder Klick, der die Automatik einschaltet, beginnt wieder bei Schritt 0 (links an)", (await seite.evaluate(() => window.__figur.autoSchritt())) === 0
    && (await seite.evaluate(() => window.__figur.wunsch())).join() === "6,0");
  await seite.click("#btn-auto");

  // --- the text: truth table, readable ----------------------------------------------------------------------------
  const tabelle = await seite.evaluate(() => {
    const t = document.querySelector("table.wahrheit");
    return t ? [...t.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim()).join("")) : null;
  });
  V("der Erklärtext enthält die Wahrheitstabelle als Tabelle mit den vier Fällen", JSON.stringify(tabelle) === JSON.stringify(["000", "101", "011", "111"]));
  const schwach = await seite.evaluate(() => {
    const kanal = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const leucht = ([r, g, b]) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
    const lies = (t) => { const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i); if (srgb) return [1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255)); const n = t.match(/[\d.]+/g); return n ? n.slice(0, 3).map(Number) : null; };
    const grund = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return lies(c); } return lies(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255]; };
    const schlecht = [];
    for (const el of document.querySelectorAll("table.wahrheit th, table.wahrheit td, table.wahrheit caption, .lesetext strong, .lesetext em")) {
      const vorn = lies(getComputedStyle(el).color), hinten = grund(el);
      const v = (Math.max(leucht(vorn), leucht(hinten)) + 0.05) / (Math.min(leucht(vorn), leucht(hinten)) + 0.05);
      if (v < 4.5) schlecht.push(`${el.textContent.trim().slice(0, 20)} ${v.toFixed(2)}:1`);
    }
    // the table's lines: a 3:1 face
    const rand = lies(getComputedStyle(document.querySelector("table.wahrheit td")).borderTopColor);
    return { schlecht, rand };
  });
  V(`die Tabelle und die hervorgehobenen Wörter halten 4,5:1${schwach.schlecht.length ? " — " + schwach.schlecht.join(", ") : ""}`, schwach.schlecht.length === 0);

  // --- the readout and the table stay inside the card on a phone ----------------------------------------------
  await stelle(6, 3);
  await seite.setViewportSize({ width: 390, height: 844 });
  await seite.waitForTimeout(250);
  const zeile = await seite.evaluate(() => {
    const r = document.querySelector("[data-readout]").getBoundingClientRect();
    const t = document.querySelector("table.wahrheit").getBoundingClientRect();
    const hoehe = parseFloat(getComputedStyle(document.querySelector("[data-readout]")).lineHeight) || 14;
    return { l: r.left, r: r.right, w: innerWidth, zeilen: Math.round(r.height / hoehe), tabR: t.right, tabL: t.left };
  });
  V(`die Anzeige bricht um und liegt bei 390 px im Fenster (${zeile.l.toFixed(0)}…${zeile.r.toFixed(0)}, ${zeile.zeilen} Zeilen)`, zeile.l >= 0 && zeile.r <= zeile.w && zeile.zeilen >= 3);
  V(`die Wahrheitstabelle liegt bei 390 px im Fenster (${zeile.tabL.toFixed(0)}…${zeile.tabR.toFixed(0)})`, zeile.tabL >= 0 && zeile.tabR <= zeile.w);
  const regler = await seite.evaluate(() => [...document.querySelectorAll(".leiste .regler")].map((r) => { const b = r.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; }));
  V(`bei 390 px liegen alle drei Regler im Fenster (${regler.length})`, regler.length === 3 && regler.every(Boolean));
  await seite.setViewportSize({ width: 1280, height: 900 });
  await seite.waitForTimeout(250);

  // --- taking apart: the body stands home, nothing flows, the cycle stops ----------------------------------------
  await stelle(6, 0);
  await seite.click("#btn-auto");
  V("Automatik wieder an", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "true");
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() > 0.9, null, { timeout: 15000 }).catch(() => {});
  V("Zerlegen beendet die Automatik", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");
  await seite.waitForTimeout(400);
  const lage = await seite.evaluate(() => ({
    korper: [...document.querySelectorAll('[data-g="koerper"] [data-hub]')].map((e) => e.getAttribute("transform")),
    strom: [...document.querySelectorAll(".luft[data-luftlage]")].map((e) => getComputedStyle(e).opacity),
  }));
  V("zerlegt: der Körper steht auf seinem Ausgangsplatz und nichts strömt", lage.korper.every((x) => x === null) && lage.strom.every((o) => Number(o) < 0.1));
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  await seite.waitForTimeout(300);
}
