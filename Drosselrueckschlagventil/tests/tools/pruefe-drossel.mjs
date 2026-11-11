// What only the throttle check valve promises, on top of the checks every
// figure passes (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Drosselrueckschlagventil/ \
//        Drosselrueckschlagventil/tests/tools/pruefe-drossel.mjs
//
// Measured on what the browser draws, never on a class alone: how far the lip of the seal is
// spread or folded in each direction (the drawn shapes and their blend), whether the screw's pin
// moves with the regulator by turns × pitch and lands in its bore at 0 turns, which ways carry
// particles and in which direction they run, that no particle lies on a cut face, the tones of the
// two sides (in the free direction BOTH strong), the readout (420 / 210 / 0 and 780 / 360 l/min),
// and which branch of the symbol is coloured.
export default async function pruefeDrossel({ seite, V, modus }) {
  const stelle = async (richtung, u) => {
    await seite.evaluate(([r, w]) => window.__figur.stelle(r, w), [richtung, u]);
    await seite.waitForTimeout(160);
  };
  /** Union box of every element that matches, in screen pixels. */
  const kasten = (sel) => seite.evaluate((s) => {
    const r = [...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
    return { l: Math.min(...r.map((b) => b.left)), t: Math.min(...r.map((b) => b.top)), r: Math.max(...r.map((b) => b.right)), b: Math.max(...r.map((b) => b.bottom)) };
  }, sel);
  const mitte = (k) => ({ x: (k.l + k.r) / 2, y: (k.t + k.b) / 2 });
  const abstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const text = () => seite.textContent("[data-readout]");
  /** Visible particles per route: how many, and their mean opacity. */
  const teilchen = () => seite.evaluate(() => {
    const aus = {};
    for (const g of document.querySelectorAll("[data-strom]")) {
      const op = [...g.querySelectorAll("circle")].map((c) => Number(c.getAttribute("opacity"))).filter((v) => v > 0.05);
      aus[g.dataset.strom] = { n: op.length, mittel: op.length ? op.reduce((a, b) => a + b, 0) / op.length : 0 };
    }
    return aus;
  });
  const summe = (t, namen) => namen.reduce((s, n) => s + t[n].n, 0);
  const mittel = (t, namen) => { const n = summe(t, namen); return n ? namen.reduce((s, x) => s + t[x].n * t[x].mittel, 0) / n : 0; };
  /** Luminance of the drawn fill of a room (computed style: floats too). */
  const hell = (sel) => seite.evaluate((s) => {
    const t = getComputedStyle(document.querySelector(s)).fill;
    const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const c = srgb ? [1, 2, 3].map((i) => Number(srgb[i])) : (t.match(/[\d.]+/g) || []).slice(0, 3).map((v) => Number(v) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }, sel);
  // Under pressure is the stronger tone: darker on paper, lighter at night.
  const staerker = (voll, leer) => (modus === "light" ? voll < leer - 0.05 : voll > leer + 0.05);
  const zweig = (name) => seite.evaluate((n) => document.querySelector(`.beifigur-symbol [data-weg="${n}"]`).classList.contains("stark")
    || document.querySelector(`.beifigur-symbol [data-weg="${n}"]`).classList.contains("blass"), name);

  // The scale, measured on the drawing: the housing's cut face is LAENGE × HOEHE mm (the page marks it data-mass).
  const mass = await seite.evaluate(() => {
    const pfad = document.querySelector("[data-mass]");
    const zahlen = pfad.getAttribute("d").match(/-?[\d.]+/g).map(Number);
    const ctm = pfad.getScreenCTM();
    const punkte = [0, 2, 4, 6].map((i) => { const q = pfad.ownerSVGElement.createSVGPoint(); q.x = zahlen[i]; q.y = zahlen[i + 1]; const r = q.matrixTransform(ctm); return { x: r.x, y: r.y }; });
    return punkte;   // bottom left, bottom right, top right, top left
  });
  const MASSE = await seite.evaluate(() => window.__figur.MASSE);
  const GEO = await seite.evaluate(() => window.__figur.geometrie);
  const pxX = abstand(mass[0], mass[1]) / GEO.LAENGE;
  const pxZ = abstand(mass[0], mass[3]) / GEO.HOEHE;

  // --- the lip: spread against the wall in 1 → 2, folded in in 2 → 1 -----------------------
  const lippe = () => seite.evaluate(() => {
    const dichte = (art) => Math.max(...[...document.querySelectorAll(`[data-lippe="${art}"]`)].map((e) => Number(getComputedStyle(e).opacity)));
    const kasten = (art) => {
      const r = [...document.querySelectorAll(`[data-lippe="${art}"]`)].map((e) => e.getBoundingClientRect());
      return { l: Math.min(...r.map((b) => b.left)), r: Math.max(...r.map((b) => b.right)) };
    };
    return { zu: dichte("zu"), auf: dichte("auf"), breiteZu: kasten("zu").r - kasten("zu").l, breiteAuf: kasten("auf").r - kasten("auf").l };
  });
  await stelle("drossel", 3);
  const lippeZu = await lippe();
  await stelle("frei", 3);
  const lippeOffen = await lippe();
  V(`die Lippe ist in 1 → 2 gespreizt gezeichnet (gespreizt ${lippeZu.zu.toFixed(2)}, eingeklappt ${lippeZu.auf.toFixed(2)})`, lippeZu.zu > 0.95 && lippeZu.auf < 0.05);
  V(`die Lippe ist in 2 → 1 eingeklappt gezeichnet (gespreizt ${lippeOffen.zu.toFixed(2)}, eingeklappt ${lippeOffen.auf.toFixed(2)})`, lippeOffen.zu < 0.05 && lippeOffen.auf > 0.95);
  // The mouth really moves: the folded shape is narrower than the spread one by twice the fold, in pixels.
  const soll = 2 * (GEO.LIPPE_ZU - GEO.LIPPE_AUF) * pxX;
  V(`die Mündung wandert um ${((lippeZu.breiteZu - lippeZu.breiteAuf) / 2).toFixed(1)} px je Seite (erwartet etwa ${(soll / 2).toFixed(1)})`,
    lippeZu.breiteZu - lippeZu.breiteAuf > soll * 0.5);

  // --- the pin follows the regulator, the lip's blend follows the model ---------------------
  await stelle("drossel", 0);
  const zapfen0 = await kasten('[data-g="schraube"]');
  const mund = await seite.evaluate(() => { const r = document.querySelector("[data-mund]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await stelle("drossel", 3);
  const zapfen3 = await kasten('[data-g="schraube"]');
  await stelle("drossel", 6);
  const zapfen6 = await kasten('[data-g="schraube"]');
  const erwartet = 3 * MASSE.steigung * pxZ;
  V(`der Zapfen fährt je 3 Umdrehungen um Umdrehungen × Steigung nach oben (${(zapfen0.t - zapfen3.t).toFixed(1)} / ${(zapfen3.t - zapfen6.t).toFixed(1)} px, erwartet ${erwartet.toFixed(1)})`,
    Math.abs((zapfen0.t - zapfen3.t) - erwartet) <= 1 && Math.abs((zapfen3.t - zapfen6.t) - erwartet) <= 1);
  // At 0 turns the cone's base sits in the bore's mouth: its tip hangs one cone length below it.
  // (the tip is a flat end of radius R_SPITZE: its right corner lies a little lower on the screen)
  const pxXy = (mass[1].y - mass[0].y) / GEO.LAENGE;
  const spitze = GEO.L_KONUS * pxZ + GEO.R_SPITZE * pxXy;
  V(`bei 0 Umdrehungen sitzt der Kegel in der Bohrung: Spitze ${(zapfen0.b - mund.y).toFixed(1)} px unter der Mündung (erwartet ${spitze.toFixed(1)})`,
    Math.abs((zapfen0.b - mund.y) - spitze) <= 1);

  // --- readout: the model's numbers at the catalogue's conditions --------------------------
  const faelle = [["drossel", 6, 420], ["drossel", 3, 210], ["drossel", 0, 0], ["frei", 6, 780], ["frei", 0, 360]];
  for (const [r, u, soll] of faelle) {
    await stelle(r, u);
    const t = await text();
    V(`Anzeige ${r === "frei" ? "2 → 1" : "1 → 2"}, ${u} Umdrehungen: ${soll} l/min`, new RegExp(`^Q ${soll} l/min \\(`).test(t) && /\n(1 → 2|2 → 1) · 6 bar · Δp 1 bar$/.test(t));
  }

  // --- particles: which ways carry air -----------------------------------------------------
  // b, g: through the ring gap (and its left leg bl, gl); k1, z1, z2: the channels and hoses; w, l: round the lip.
  await stelle("drossel", 3);
  let t = await teilchen();
  V(`1 → 2: Luft strömt durch den Ringspalt (${summe(t, ["b", "g"])} Teilchen), an der Lippe vorbei bleibt es leer (${summe(t, ["w", "l"])})`,
    summe(t, ["b", "g"]) >= 6 && summe(t, ["w", "l"]) === 0 && summe(t, ["k1", "z1", "z2"]) >= 6);
  await stelle("frei", 3);
  t = await teilchen();
  V(`2 → 1: Teilchen im Spalt (${summe(t, ["b", "g"])}) und an der Lippe vorbei (${summe(t, ["w", "l"])}), dort kräftiger (${mittel(t, ["w", "l"]).toFixed(2)} gegen ${mittel(t, ["b", "g"]).toFixed(2)})`,
    summe(t, ["b", "g"]) >= 6 && summe(t, ["w", "l"]) >= 6 && mittel(t, ["w", "l"]) > mittel(t, ["b", "g"]));
  await stelle("drossel", 0);
  t = await teilchen();
  V("Drossel zu in Drosselrichtung: gar keine Teilchen", Object.values(t).every((x) => x.n === 0));
  await stelle("frei", 0);
  t = await teilchen();
  V("2 → 1 bei zugedrehter Drossel: nur an der Lippe vorbei", summe(t, ["b", "g"]) === 0 && summe(t, ["w", "l"]) >= 6);

  // --- tones (Rule: strong = under pressure, pale = relaxed) --------------------------------
  await stelle("drossel", 0);
  const d1 = await hell('[data-raum="s1"]'), d2 = await hell('[data-raum="s2"]');
  V("1 → 2: Seite 1 kräftiges Blau, Seite 2 blasses (auch bei zugedrehter Drossel)", staerker(d1, d2));
  await stelle("drossel", 3);
  const starkRef = await hell('[data-raum="s1"]');
  await stelle("frei", 3);
  const f1 = await hell('[data-raum="s1"]'), f2 = await hell('[data-raum="s2"]');
  V(`2 → 1 mit eingeklappter Lippe: BEIDE Seiten kräftig (${f1.toFixed(2)} / ${f2.toFixed(2)}, kräftig = ${starkRef.toFixed(2)})`,
    Math.abs(f1 - starkRef) < 0.02 && Math.abs(f2 - starkRef) < 0.02);

  // --- the symbol colours the branch that carries air -----------------------------------
  await stelle("drossel", 3);
  V("Schaltzeichen 1 → 2: nur der Drosselzweig ist gefärbt", (await zweig("drossel")) && !(await zweig("rueckschlag")));
  await stelle("frei", 3);
  V("Schaltzeichen 2 → 1: beide Zweige sind gefärbt", (await zweig("drossel")) && (await zweig("rueckschlag")));
  await stelle("drossel", 0);
  V("Schaltzeichen: Drossel zu, 1 → 2: kein Zweig gefärbt", !(await zweig("drossel")) && !(await zweig("rueckschlag")));

  // --- no particle over solid material, and they run in the direction of the flow -----------
  const ueberMaterial = () => seite.evaluate(() => {
    const feste = ["verschraubung", "einsatz", "scheibe", "manschette", "buchse", "kontermutter", "schraube"];
    const treffer = [];
    for (const c of document.querySelectorAll("[data-strom] circle")) {
      if (Number(c.getAttribute("opacity")) < 0.3) continue;
      const r = c.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      for (const el of document.elementsFromPoint(x, y)) {
        // a drawn layer that is blended out (the lip's other shape, the whole-part layer) is not there
        const lage = el.closest("[data-lippe], [data-lage]");
        if (lage && Number(getComputedStyle(lage).opacity) < 0.1) continue;
        if (el.closest("[data-hohl]")) continue;   // the air's own bore (shading and room) of a cut fitting
        const g = el.closest("[data-piece]");
        // A dot on a cut face or a fitting: either it is painted over the material (the solid comes before it
        // in the drawing order) or the route runs through the material and the part hides it.
        if (g && feste.includes(g.dataset.piece)) {
          treffer.push(`${c.closest("[data-strom]").dataset.strom} über ${g.dataset.piece}`); break;
        }
      }
    }
    return treffer;
  });
  for (const [r, u] of [["drossel", 3], ["frei", 3], ["frei", 6], ["drossel", 6]]) {
    await stelle(r, u);
    const treffer = await ueberMaterial();
    V(`${r === "frei" ? "2 → 1" : "1 → 2"}, ${u} Umdrehungen: kein Teilchen liegt auf festem Material${treffer.length ? " — " + treffer.slice(0, 3).join(", ") : ""}`, treffer.length === 0);
  }
  // Direction: the first particle of a stream moves right in 1 → 2 (along the upper passage's second half)
  // and left in 2 → 1. Two samples of one stream one frame apart.
  const lauf = async (name) => {
    // Read inside the page, frame after frame: a round trip per sample let a loaded machine stretch the gap
    // until the short streams wrapped round and the sign flipped. A stream's particles all jump by one spacing
    // when its phase wraps (in one frame of about four): such a jump is left out (a step is under 6 px) and
    // the median of the pairs counts.
    return seite.evaluate(async (n) => {
      const lies = () => [...document.querySelectorAll(`[data-strom="${n}"] circle`)]
        .map((c) => [Number(c.getAttribute("opacity")), Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
      const bild = () => new Promise((r) => requestAnimationFrame(r));
      const mitteVon = (liste) => { const l = liste.slice().sort((x, y) => x - y); return l.length ? l[Math.floor(l.length / 2)] : 0; };
      const paare = [];
      for (let versuch = 0; versuch < 60 && paare.length < 7; versuch += 1) {
        const t0 = await bild(); const a = lies(); const t1 = await bild(); const b = lies();
        if (t1 - t0 >= 20) continue;
        // along the channel both screen coordinates grow in the direction 1 → 2
        const d = a.map((p, i) => (p[0] > 0.3 && b[i][0] > 0.3 ? (b[i][1] - p[1]) + (b[i][2] - p[2]) : null)).filter((v) => v !== null && Math.abs(v) < 6);   // the wrap jump is a whole spacing (about 11 px)
        if (d.length) paare.push(mitteVon(d));
      }
      return mitteVon(paare);
    }, name);
  };
  await seite.evaluate(() => window.__figur.stelle("drossel", 6)); await seite.evaluate(() => { window.__figur.weiter(); });
  await seite.waitForTimeout(120);
  const vor = await lauf("k1");
  await seite.evaluate(() => { window.__figur.stelle("frei", 6); window.__figur.weiter(); });
  await seite.waitForTimeout(120);
  const zurueck = await lauf("k1");
  V(`die Teilchen laufen in Strömungsrichtung (1 → 2: ${vor.toFixed(1)} px, 2 → 1: ${zurueck.toFixed(1)} px)`, vor > 0.3 && zurueck < -0.3);

  // --- the controls really switch -------------------------------------------------------
  await stelle("drossel", 3);
  await seite.click("#btn-richtung");
  await seite.waitForTimeout(250);
  V("der Richtungsknopf schaltet auf 2 → 1 um", (await seite.evaluate(() => window.__figur.richtung())) === "frei" && /Lippe offen/.test(await text()));
  await seite.fill("#drossel", "6");
  await seite.dispatchEvent("#drossel", "input");
  await seite.waitForTimeout(700);
  V("der Drosselregler stellt den Zapfen nach (Modell folgt dem Regler)", (await seite.evaluate(() => window.__figur.modell().zapfen)) > 5.9);
  V("die Automatik ist nach einem Eingriff aus", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");

  // --- the automatic cycle turns the direction by itself within its takt (3 s) -------------------
  await stelle("drossel", 3);
  await seite.evaluate(() => { window.__figur.weiter(); });
  await seite.click("#btn-auto");
  const r0 = await seite.evaluate(() => window.__figur.richtung());
  V("Automatik an", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "true");
  await seite.waitForFunction((r) => window.__figur.richtung() !== r, r0, { timeout: 5000 }).catch(() => {});
  V("die Automatik wechselt die Richtung von selbst", (await seite.evaluate(() => window.__figur.richtung())) !== r0);
  await seite.click("#btn-auto");

  // --- the readout stays inside the card on a phone ----------------------------------------------
  await stelle("frei", 6);
  await seite.setViewportSize({ width: 390, height: 844 });
  await seite.waitForTimeout(250);
  const zeile = await seite.evaluate(() => { const r = document.querySelector("[data-readout]").getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
  V(`die Anzeige liegt bei 390 px im Fenster (${zeile.l.toFixed(0)}…${zeile.r.toFixed(0)})`, zeile.l >= 0 && zeile.r <= zeile.w);
  await seite.setViewportSize({ width: 1280, height: 900 });
  await seite.waitForTimeout(250);

  // --- taking apart: everything stands home, nothing flows ------------------------------
  await stelle("frei", 6);
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() > 0.9, null, { timeout: 15000 }).catch(() => {});
  await seite.waitForTimeout(400);
  const lage = await seite.evaluate(() => ({
    zapfen: [...document.querySelectorAll('[data-g="schraube"] [data-hub]')].map((e) => e.getAttribute("transform")),
    lippe: Number(getComputedStyle(document.querySelector('[data-lippe="zu"]')).opacity),
  }));
  V("zerlegt: Zapfen und Lippe stehen auf ihrem Ausgangsplatz", lage.zapfen.every((x) => x === null) && lage.lippe > 0.95);
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  await seite.waitForTimeout(300);
}
