// What only the throttle check valve promises, on top of the checks every
// figure passes (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Drosselrueckschlagventil/ \
//        Drosselrueckschlagventil/tests/tools/pruefe-drossel.mjs
//
// Measured on what the browser draws, never on a class alone: where the ball
// stands on screen in each direction, whether the needle and the knurled head
// move with the regulator while the lock nut stays, which passages carry
// particles, the tones of the two sides, the readout (420 / 210 / 0 and
// 780 / 360 l/min), and which branch of the symbol is coloured.
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

  // The scale and the seat, measured on the drawing: the ridge in the upper passage is 9 mm long and
  // 3,5 mm high (the page marks it data-sitz); its top edge is where the needle's tip has to land.
  const sitz = await seite.evaluate(() => {
    const pfad = document.querySelector("[data-sitz]");
    const zahlen = pfad.getAttribute("d").match(/-?[\d.]+/g).map(Number);
    const ctm = pfad.getScreenCTM();
    const punkte = [0, 2, 4, 6].map((i) => { const q = pfad.ownerSVGElement.createSVGPoint(); q.x = zahlen[i]; q.y = zahlen[i + 1]; const r = q.matrixTransform(ctm); return { x: r.x, y: r.y }; });
    return punkte;   // bottom left, bottom right, top right, top left
  });
  const pxX = abstand(sitz[0], sitz[1]) / 9;
  const pxZ = abstand(sitz[0], sitz[3]) / 3.5;
  const obenMitte = { x: (sitz[2].x + sitz[3].x) / 2, y: (sitz[2].y + sitz[3].y) / 2 };
  const MASSE = await seite.evaluate(() => window.__figur.MASSE);

  // --- the ball: on its seat in the throttle direction, lifted in the free one ----------
  await stelle("drossel", 3);
  const kugelZu = mitte(await kasten('[data-g="kugel"]'));
  const federZu = await kasten('[data-g="feder"]');
  await stelle("frei", 3);
  const kugelAuf = mitte(await kasten('[data-g="kugel"]'));
  const federAuf = await kasten('[data-g="feder"]');
  const hub = abstand(kugelZu, kugelAuf);
  V(`die Kugel hebt um kugelHubMm ab: ${hub.toFixed(1)} px gemessen, ${(MASSE.kugelHubMm * pxX).toFixed(1)} px erwartet`, Math.abs(hub - MASSE.kugelHubMm * pxX) <= 1);
  V("beim Abheben geht die Kugel nach links, weg vom Sitz", kugelAuf.x < kugelZu.x - 1);
  V("die Feder wird mit der Kugel zusammengedrückt (Breite)", (federAuf.r - federAuf.l) < (federZu.r - federZu.l) - 1);
  await stelle("drossel", 3);
  V("zurück in Drosselrichtung sitzt die Kugel wieder auf", abstand(mitte(await kasten('[data-g="kugel"]')), kugelZu) < 1);

  // --- needle and head follow the regulator, the lock nut stays ---------------------------
  await stelle("drossel", 0);
  const nadel0 = await kasten('[data-g="schraube"]');
  const mutter0 = await kasten('[data-g="kontermutter"]');
  await stelle("drossel", 3);
  const nadel3 = await kasten('[data-g="schraube"]');
  await stelle("drossel", 6);
  const nadel6 = await kasten('[data-g="schraube"]');
  const mutter6 = await kasten('[data-g="kontermutter"]');
  const erwartet = 3 * MASSE.steigung * pxZ;
  V(`die Schraube fährt je 3 Umdrehungen um Umdrehungen × Steigung nach oben (${(nadel0.t - nadel3.t).toFixed(1)} / ${(nadel3.t - nadel6.t).toFixed(1)} px, erwartet ${erwartet.toFixed(1)})`,
    Math.abs((nadel0.t - nadel3.t) - erwartet) <= 1 && Math.abs((nadel3.t - nadel6.t) - erwartet) <= 1);
  V(`bei 0 Umdrehungen sitzt die Nadelspitze auf dem Sitz (Abstand ${(nadel0.b - obenMitte.y).toFixed(1)} px)`, Math.abs(nadel0.b - obenMitte.y) <= 1.5);
  V("die Kontermutter bleibt beim Einstellen stehen", Math.abs(mutter0.t - mutter6.t) < 0.5 && Math.abs(mutter0.l - mutter6.l) < 0.5);

  // --- readout: the model's numbers at the catalogue's conditions --------------------------
  const faelle = [["drossel", 6, 420], ["drossel", 3, 210], ["drossel", 0, 0], ["frei", 6, 780], ["frei", 0, 360]];
  for (const [r, u, soll] of faelle) {
    await stelle(r, u);
    const t = await text();
    V(`Anzeige ${r === "frei" ? "2 → 1" : "1 → 2"}, ${u} Umdrehungen: ${soll} l/min`, new RegExp(`^Q ${soll} l/min \\(`).test(t) && /\n(1 → 2|2 → 1) · 6 bar · Δp 1 bar$/.test(t));
  }

  // --- particles: which passages carry air ---------------------------------------------
  await stelle("drossel", 3);
  let t = await teilchen();
  V(`1 → 2: Luft strömt durch den oberen Weg (${summe(t, ["a1", "a2"])} Teilchen), der untere Weg bleibt leer (${summe(t, ["b1", "b2"])})`,
    summe(t, ["a1", "a2"]) >= 4 && summe(t, ["b1", "b2"]) === 0);
  await stelle("frei", 3);
  t = await teilchen();
  const oben = summe(t, ["a1", "a2"]), unten = summe(t, ["b1", "b2"]);
  V(`2 → 1: Teilchen in beiden Wegen (${oben} / ${unten}), im unteren kräftiger (${mittel(t, ["b1", "b2"]).toFixed(2)} gegen ${mittel(t, ["a1", "a2"]).toFixed(2)})`,
    oben >= 4 && unten >= 4 && mittel(t, ["b1", "b2"]) > mittel(t, ["a1", "a2"]));
  await stelle("drossel", 0);
  t = await teilchen();
  V("Drossel zu in Drosselrichtung: gar keine Teilchen", Object.values(t).every((x) => x.n === 0));
  await stelle("frei", 0);
  t = await teilchen();
  V("2 → 1 bei zugedrehter Drossel: nur der untere Weg führt Luft", summe(t, ["a1", "a2"]) === 0 && summe(t, ["b1", "b2"]) >= 4);

  // --- tones: strong blue before the throttle, pale behind it ---------------------------
  await stelle("drossel", 0);
  const d1 = await hell('[data-raum="s1"]'), d2 = await hell('[data-raum="s2"]');
  V("1 → 2: vor der Drossel kräftiges Blau, dahinter blasses (auch bei zugedrehter Drossel)", staerker(d1, d2));
  await stelle("frei", 3);
  const f1 = await hell('[data-raum="s1"]'), f2 = await hell('[data-raum="s2"]');
  V("2 → 1: die Töne tauschen die Seiten", staerker(f2, f1));

  // --- the symbol colours the branch that carries air -----------------------------------
  await stelle("drossel", 3);
  V("Schaltzeichen 1 → 2: nur der Drosselzweig ist gefärbt", (await zweig("drossel")) && !(await zweig("rueckschlag")));
  await stelle("frei", 3);
  V("Schaltzeichen 2 → 1: beide Zweige sind gefärbt", (await zweig("drossel")) && (await zweig("rueckschlag")));
  await stelle("drossel", 0);
  V("Schaltzeichen: Drossel zu, 1 → 2: kein Zweig gefärbt", !(await zweig("drossel")) && !(await zweig("rueckschlag")));

  // --- no particle over solid material, and they run in the direction of the flow -----------
  const ueberMaterial = () => seite.evaluate(() => {
    const feste = ["verschraubung", "kugel", "feder", "verschluss", "schraube", "kontermutter"];
    const treffer = [];
    for (const c of document.querySelectorAll("[data-strom] circle")) {
      if (Number(c.getAttribute("opacity")) < 0.3) continue;
      const r = c.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      for (const el of document.elementsFromPoint(x, y)) {
        const g = el.closest("[data-piece]");
        // a solid that comes BEFORE the dot in the drawing order lies under it: the dot is painted over the material
        if (g && feste.includes(g.dataset.piece) && (c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) {
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
    // Both samples are read inside the page, one frame apart: a round trip per sample let a loaded
    // machine stretch the gap until the particles of this short stream wrapped round and the sign flipped.
    const [a, b] = await seite.evaluate(async (n) => {
      const lies = () => [...document.querySelectorAll(`[data-strom="${n}"] circle`)]
        .map((c) => [Number(c.getAttribute("opacity")), Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
      const bild = () => new Promise((r) => requestAnimationFrame(r));
      // One frame apart, and only a pair whose frames really were close together counts: after a long
      // frame the particles have run far enough to alias.
      for (let i = 0; i < 40; i += 1) {
        const t0 = await bild(); const eins = lies(); const t1 = await bild(); const zwei = lies();
        if (t1 - t0 < 30) return [eins, zwei];
      }
      return [[], []];
    }, name);
    // along the upper passage both screen coordinates grow in the direction 1 → 2; a particle that wrapped round jumps, so it is left out
    const d = a.map((p, i) => (p[0] > 0.3 && b[i][0] > 0.3 ? (b[i][1] - p[1]) + (b[i][2] - p[2]) : null)).filter((v) => v !== null && Math.abs(v) < 25).sort((x, y) => x - y);
    return d.length ? d[Math.floor(d.length / 2)] : 0;
  };
  await seite.evaluate(() => window.__figur.stelle("drossel", 6)); await seite.evaluate(() => { window.__figur.weiter(); });
  await seite.waitForTimeout(120);
  const vor = await lauf("a2");
  await seite.evaluate(() => { window.__figur.stelle("frei", 6); window.__figur.weiter(); });
  await seite.waitForTimeout(120);
  const zurueck = await lauf("a2");
  V(`die Teilchen laufen in Strömungsrichtung (1 → 2: ${vor.toFixed(1)} px, 2 → 1: ${zurueck.toFixed(1)} px)`, vor > 0.3 && zurueck < -0.3);

  // --- the controls really switch -------------------------------------------------------
  await stelle("drossel", 3);
  await seite.click("#btn-richtung");
  await seite.waitForTimeout(250);
  V("der Richtungsknopf schaltet auf 2 → 1 um", (await seite.evaluate(() => window.__figur.richtung())) === "frei" && /Kugel offen/.test(await text()));
  await seite.fill("#drossel", "6");
  await seite.dispatchEvent("#drossel", "input");
  await seite.waitForTimeout(700);
  V("der Drosselregler stellt die Nadel nach (Modell folgt dem Regler)", (await seite.evaluate(() => window.__figur.modell().nadel)) > 5.9);
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
    kugel: document.querySelector("[data-schieber]").getAttribute("transform"),
    nadel: [...document.querySelectorAll('[data-g="schraube"] [data-hub]')].map((e) => e.getAttribute("transform")),
  }));
  V("zerlegt: Kugel und Schraube stehen auf ihrem Ausgangsplatz", lage.kugel === null && lage.nadel.every((x) => x === null));
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  await seite.waitForTimeout(300);
}
