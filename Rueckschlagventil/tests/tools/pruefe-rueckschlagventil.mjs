// What only the check valve promises, on top of the checks every figure passes
// (figur/tests/tools/pruefe-figur.mjs) and the checks every section page passes
// (figur/tests/tools/pruefe-schnitt.mjs: the scale, the cycle at the load, the legend's sentences, no particle on
// material or outside the air, the direction of the particles, the measured contrast of pressurised against vented air,
// the readout and sliders on a phone, taking apart):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Rueckschlagventil/ \
//        Rueckschlagventil/tests/tools/pruefe-rueckschlagventil.mjs
//
// Measured on what the browser draws, never on a class alone: where the poppet sits in pixels in each state, that the spring is
// compressed by the lift, the tones of the two rooms (they follow the PRESSURE: the room behind a shut poppet keeps its pressure),
// that particles run only while the poppet is lifted (never against back pressure), the readout, the symbol, the opening pressure
// and the locked-in pressure with the model running, the slow motion, the eight-step cycle, the controls, the text and the size of
// the smallest assembly on a phone while taken apart. No wait is a fixed time: every one waits for a state of the page (or runs
// inside the page, frame by frame).
import { hilfen, schnittPruefungen } from "../../../figur/tests/tools/pruefe-schnitt.mjs";

const NBSP = / /g;

export default async function pruefeRueckschlagventil(ctx) {
  const { seite, V, modus } = ctx;
  const h = hilfen(seite, modus);
  const { staerker, gleich, zeitlupe } = h;
  const MASSE = await seite.evaluate(() => window.__figur.MASSE);
  const text = async () => (await h.text()).replace(NBSP, " ");
  /** The model's own numbers, read from the page: the lift h and the pressures (absolute bar). */
  const modell = () => seite.evaluate(() => { const z = window.__figur.modell(); return { h: z.h, p1: z.p1, p2: z.p2 }; });
  /** A state set by hand and held: lift h (0…1), pressures at 1 and 2 in bar (gauge); the model stands, the particles run. */
  const zeige = async ([hub, p1, p2, ent = false]) => { await seite.evaluate(([a, b, c, d]) => window.__figur.zeige(a, b, c, d), [hub, p1, p2, ent]); await h.nachBildern(4); };
  /** The model settled at once at a pressure at 1 (and the vent), optionally with 2 filled to `p2` first. */
  const stelle = async ([p1, ent = false, p2 = null]) => { await seite.evaluate(([a, b, c]) => window.__figur.stelle(a, b, c), [p1, ent, p2]); await h.nachBildern(4); };
  /** The same as the slider: the pressure at 1 changes and the model runs on. */
  const schalte = async (p1, ent = false) => { await seite.evaluate(([a, b]) => window.__figur.schalte(a, b), [p1, ent]); };
  const warteModell = (bedingung, arg = null, timeout = 8000) => seite.waitForFunction(([src, a]) => new Function("z", "a", `return (${src})(z, a)`)(window.__figur.modell(), a), [String(bedingung), arg], { timeout });
  const raeume = async () => ({ L: await h.hell('[data-raum="L"]'), R: await h.hell('[data-raum="R"]') });
  /** The poppet's screen position: the middle of its drawn half section. */
  const teller = () => seite.evaluate(() => {
    const r = document.querySelector('[data-g="teller"] [data-lage="schnitt"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  /** The spring's drawn extent along the screen (the box of all its pieces). */
  const federBreite = () => seite.evaluate(() => {
    const r = [...document.querySelectorAll('[data-g="feder"] [data-federx]')].map((e) => e.getBoundingClientRect());
    return { w: Math.max(...r.map((b) => b.right)) - Math.min(...r.map((b) => b.left)), h: Math.max(...r.map((b) => b.bottom)) - Math.min(...r.map((b) => b.top)) };
  });
  const symbol = () => seite.evaluate(() => {
    const ton = (n) => document.querySelector(`.beifigur-symbol [data-teil="${n}"]`).getAttribute("class");
    const kugel = document.querySelector('.beifigur-symbol [data-teil="kugel"]').getAttribute("transform");
    return { eingang: ton("eingang"), ausgang: ton("ausgang"), schub: Number(kugel.match(/translate\(([-\d.]+)/)[1]) };
  });
  /** In-page, frame by frame: the largest number of visible particles in `n` frames, and whether any frame showed one with the poppet under `unter`. */
  const beobachte = (n, unter = 0.15) => seite.evaluate(async ([k, grenze]) => {
    let max = 0, zuViele = 0;
    for (let i = 0; i < k; i += 1) {
      await new Promise((r) => requestAnimationFrame(r));
      const sichtbar = [...document.querySelectorAll("[data-strom] circle")].filter((c) => Number(c.getAttribute("opacity")) > 0.05).length;
      max = Math.max(max, sichtbar);
      if (sichtbar > 0 && window.__figur.modell().h < grenze) zuViele += 1;
    }
    return { max, zuViele };
  }, [n, unter]);

  await schnittPruefungen({
    ...ctx,
    h,
    beschreibung: {
      stelle: zeige,
      zeitlupe: true,
      luftwege: true,
      festeTeile: ["teller", "dichtring", "anschluss1", "anschluss2"],
      // states at rest: the poppet on the seat, with and without pressure at 1 or 2 (also against back pressure): no particle
      ruhe: [
        { name: "im Ruhezustand ohne Druck", zustand: [0, 0, 0] },
        { name: "ein Zustand in Ruhe (Teller zu, 2 unter Druck, 1 drucklos)", zustand: [0, 0, 6] },
        { name: "Gegendruck (1 hat 3 bar, 2 hat 6 bar, der Teller liegt auf dem Sitz)", zustand: [0, 3, 6] },
        { name: "Teller zu, 6 bar an beiden Seiten", zustand: [0, 6, 6] },
      ],
      stroemung: [[1, 6, 1], [1, 6, 5], [0.54, 6, 5.7]].map(([hub, p1, p2]) => ({
        name: `Teller bei ${hub} abgehoben, ${p1}/${p2} bar`, mindestens: 6,
        richte: async () => { await zeige([hub, p1, p2]); await h.warteTeilchen("a", 6); },
      })),
      richtung: [
        { name: "bei geöffnetem Teller laufen die Teilchen von Eingang 1 zu Ausgang 2", strom: "a", vorzeichen: 1, optionen: { nurBohrung: true },
          richte: async () => { await zeige([1, 6, 1]); await h.warteTeilchen("a", 6); } },
      ],
      kontrast: {
        leer: [0, 0, 0],
        faelle: [{ name: "Eingang 1", zustand: [0, 6, 0], raum: "L" }, { name: "Ausgang 2", zustand: [0, 0, 6], raum: "R" }],
        mitte: { name: "3 bar", zustand: [0, 3, 0], raum: "L", voll: "Eingang 1" },
      },
      abhebung: { name: "die Dichtfläche des Tellers", zustand: [0, 0, 6], raum: "R", teil: '[data-g="teller"] [data-lage="schnitt"] path[style*="stroke"]', rand: '[data-g="teller"] [data-lage="schnitt"] path[style*="stroke"]' },
      lesetext: ["table.wahrheit th", "table.wahrheit td", "table.wahrheit caption"],
      telefon: {
        zustand: [0, 6, 5.9], regler: ["#druck-eingang", "#zeitlupe"], zeilenMin: 3,
        zusatz: async () => {
          const tab = await seite.evaluate(() => { const t = document.querySelector("table.wahrheit").getBoundingClientRect(); return { l: t.left, r: t.right, w: innerWidth }; });
          V(`die Zustandstabelle liegt bei 390 px im Fenster (${tab.l.toFixed(0)}…${tab.r.toFixed(0)})`, tab.l >= 0 && tab.r <= tab.w);
          const knopf = await seite.evaluate(() => { const b = document.getElementById("btn-entlueften").getBoundingClientRect(); return { l: b.left, r: b.right, w: innerWidth }; });
          V(`der Knopf „Ausgang 2 entlüften“ liegt bei 390 px im Fenster (${knopf.l.toFixed(0)}…${knopf.r.toFixed(0)})`, knopf.l >= 0 && knopf.r <= knopf.w);
        },
      },
      zerlegen: {
        zustand: [1, 6, 1], hubTeile: '[data-g="teller"] [data-hub]', hubName: "der Teller",
        zusatz: async () => {
          const feder = await seite.evaluate(() => [...document.querySelectorAll('[data-g="feder"] [data-federx]')].map((e) => e.getAttribute("transform")));
          V(`zerlegt: die Feder ist nicht zusammengedrückt (${feder.length} Windungsstücke ohne Verschiebung)`, feder.length > 0 && feder.every((t) => t === null));
        },
      },
    },
    spezifisch: async () => {
      const mm = (await h.masstab()).mm;
      await seite.click("#btn-auto");                         // stop the cycle for the measuring
      await zeitlupe(1);

      // --- the poppet: where it sits in pixels, state by state; the spring goes with it ----------------------------------------
      await zeige([0, 0, 0]);
      const zu = await teller();
      const federZu = await federBreite();
      await zeige([1, 6, 1]);
      const offen = await teller();
      const federOffen = await federBreite();
      const dx = offen.x - zu.x, dy = offen.y - zu.y;
      V(`der Teller hebt um den Hub (${MASSE.hub} mm) ab (${dx.toFixed(1)} / ${dy.toFixed(1)} px, erwartet ${(mm.x * MASSE.hub).toFixed(1)} / ${(mm.y * MASSE.hub).toFixed(1)})`,
        Math.abs(dx - mm.x * MASSE.hub) <= 1 && Math.abs(dy - mm.y * MASSE.hub) <= 1);
      V(`offen (Δp ≥ ${MASSE.vollDp} bar) steht der Teller mindestens 3 px vom Sitz (${Math.hypot(dx, dy).toFixed(1)} px)`, Math.hypot(dx, dy) >= 3);
      // the pieces of the coil shift in proportion to their distance from the stop: the box of the whole coil gets shorter by a little less
      // than the lift (the outermost piece's middle is half a piece away from the end)
      const kuerzer = [federZu.w - federOffen.w, federZu.h - federOffen.h], hub = [Math.abs(mm.x * MASSE.hub), Math.abs(mm.y * MASSE.hub)];
      V(`die Feder ist mit dem Teller zusammengedrückt: ${kuerzer[0].toFixed(1)} / ${kuerzer[1].toFixed(1)} px kürzer (Hub ${hub[0].toFixed(1)} / ${hub[1].toFixed(1)} px)`,
        kuerzer.every((k, i) => k >= 0.7 * hub[i] && k <= 1.02 * hub[i]));
      await zeige([0, 0, 6]);
      const gegen = await teller();
      V("bei Gegendruck (2 hat 6 bar, 1 nichts) liegt der Teller auf dem Sitz, genau wie im Ruhezustand", Math.abs(gegen.x - zu.x) <= 0.5 && Math.abs(gegen.y - zu.y) <= 0.5 && (await modell()).h === 0);
      // the model's own half-open state: vent open, 6 bar at 1: the poppet stands where the flow of the vent keeps it (h = 0,54 by hand)
      await stelle([6, true]);
      const halb = await teller();
      const hm = (await modell()).h;
      const sollPx = [mm.x * MASSE.hub * hm, mm.y * MASSE.hub * hm];
      V(`bei offener Entlüftung und 6 bar steht der Teller zwischen zu und offen (Hub ${hm.toFixed(2)}: ${(halb.x - zu.x).toFixed(1)} / ${(halb.y - zu.y).toFixed(1)} px, erwartet ${sollPx[0].toFixed(1)} / ${sollPx[1].toFixed(1)})`,
        hm > 0.3 && hm < 0.8 && Math.abs(halb.x - zu.x - sollPx[0]) <= 1 && Math.abs(halb.y - zu.y - sollPx[1]) <= 1);

      // --- opening pressure and the locked-in pressure, with the model running ---------------------------------------------------
      await stelle([0, false, 0]);
      await schalte(6);
      await warteModell((z) => z.h < 1e-3 && z.p2 > 6.85);
      let t = await text();
      V("6 bar an 1: 2 füllt sich nur bis p1 − 0,1 bar (Anzeige 5,9 bar und Δp 0,1 bar) und der Teller schließt wieder", /Ausgang 2 5,9 bar · Δp 0,1 bar/.test(t) && /^Teller zu · Durchfluss 0 l\/min$/m.test(t));
      await schalte(0);
      await warteModell((z) => z.p1 < 1.001);
      const eingesperrt = await modell();
      await h.nachBildern(30);
      const spaeter = await modell();
      t = await text();
      V("1 fällt auf 0: der Teller bleibt zu und 2 behält seinen Druck (eingesperrt, 5,9 bar)", spaeter.h === 0 && spaeter.p2 === eingesperrt.p2 && /Eingang 1 0,0 bar · Ausgang 2 5,9 bar/.test(t));
      await zeige([0, 0, 0]);
      const leerRaum = await raeume();
      await zeige([0, 0, 5.9]);
      const eingesperrtRaum = await raeume();
      V("der eingesperrte Druck ist gezeichnet: Raum 2 kräftig, Raum 1 blass", staerker(eingesperrtRaum.R, leerRaum.R) && gleich(eingesperrtRaum.L, leerRaum.L));
      await stelle([0, false, 6]);
      await schalte(3);
      await h.nachBildern(30);
      const sperr = await modell();
      const beobGegen = await beobachte(40);
      V(`1 hat 3 bar, 2 hat 6 bar: der Teller bleibt zu, p2 unverändert, kein Teilchen (${beobGegen.max} sichtbar)`, sperr.h === 0 && sperr.p2 > 6.85 && beobGegen.max === 0 && /Teller zu \(Gegendruck\)/.test(await text()));
      // venting 2 through the button: it falls to nothing
      await stelle([0, false, 6]);
      await seite.click("#btn-entlueften");
      V("der Knopf „Ausgang 2 entlüften“ ist gedrückt", (await seite.getAttribute("#btn-entlueften", "aria-pressed")) === "true");
      await warteModell((z) => z.p2 < 1.05, null, 12000);
      V("entlüftet: 2 fällt auf 0 bar, der Teller blieb zu", (await modell()).h === 0 && /Ausgang 2 0,0 bar/.test(await text()));
      await seite.click("#btn-entlueften");
      V("ein zweiter Druck nimmt die Entlüftung wieder weg", (await seite.getAttribute("#btn-entlueften", "aria-pressed")) === "false");

      // --- particles only while the poppet is lifted ---------------------------------------------------------------------------------
      await zeitlupe(10);
      await stelle([0, false, 0]);
      await schalte(6);
      await warteModell((z) => z.h > 0.5, null, 5000).catch(() => {});
      const fuellung = await beobachte(120);
      V(`beim Füllen laufen Teilchen (${fuellung.max}), aber nie bei einem Teller unter 15 % Hub (${fuellung.zuViele} Bilder)`, fuellung.max >= 6 && fuellung.zuViele === 0);
      await warteModell((z) => z.p2 > 6.85, null, 15000);
      V("ist 2 voll, steht kein Teilchen mehr", (await beobachte(20)).max === 0);
      await zeitlupe(1);

      // --- the slow motion: the 8 ms of the opening are seen in flight (at 1/50 they last 400 ms) ---------------------------------------
      await zeitlupe(50);
      await stelle([0, false, 0]);
      const flug = await seite.evaluate(async () => {
        const t0 = performance.now();
        window.__figur.schalte(6, false);
        let unterwegs = 0, ende = null;
        while (performance.now() - t0 < 4000) {
          await new Promise((r) => requestAnimationFrame(r));
          const hh = window.__figur.modell().h;
          if (hh > 0.05 && hh < 0.95) unterwegs += 1;
          if (hh >= 0.999) { ende = performance.now() - t0; break; }
        }
        return { unterwegs, ende };
      });
      V(`Zeitlupe 1/50: der Teller ist ${flug.unterwegs} Bilder lang beim Öffnen zu sehen (${flug.ende === null ? "kommt nicht an" : Math.round(flug.ende)} ms für ${Math.round(MASSE.schaltzeit * 1000)} ms Modellzeit)`,
        flug.unterwegs >= 3 && flug.ende !== null && flug.ende > 200);
      await zeitlupe(1);

      // --- rooms: tones follow the pressure, not fixed sides -------------------------------------------------------------------------------
      await zeige([0, 0, 0]);
      const leer = await raeume();
      await zeige([0, 6, 0]);
      const nurEin = await raeume();
      V("1 hat Druck, 2 nicht: der linke Raum ist kräftig, der rechte blass", staerker(nurEin.L, leer.L) && gleich(nurEin.R, leer.R));
      await zeige([0, 0, 6]);
      const nurAus = await raeume();
      V("2 hat Druck, 1 nicht (gesperrt): der rechte Raum ist kräftig, der linke blass, der Teller liegt fest", staerker(nurAus.R, leer.R) && gleich(nurAus.L, leer.L));
      await zeige([0, 0, 0]);
      V("beide drucklos: beide Räume blass", gleich(leer.L, leer.R));
      await zeige([0, 3, 0]);
      const halbEin = await raeume();
      V(`3 bar ist ein Mischton zwischen blass und kräftig (${halbEin.L.toFixed(3)} zwischen ${leer.L.toFixed(3)} und ${nurEin.L.toFixed(3)})`,
        modus === "light" ? halbEin.L < leer.L - 0.01 && halbEin.L > nurEin.L + 0.01 : halbEin.L > leer.L + 0.01 && halbEin.L < nurEin.L - 0.01);
      await zeige([0, 6, 3]);
      const verschieden = await raeume();
      V("6 bar gegen 3 bar: die Räume haben verschiedene Töne, der von 1 ist der kräftigere", staerker(verschieden.L, verschieden.R));

      // --- the symbol: the ball and the tones of its two parts ---------------------------------------------------------------------------
      await zeige([1, 6, 0]);
      let sy = await symbol();
      V("Symbol, Teller offen: die Kugel ist abgehoben, Eingang kräftig, Ausgang blass", sy.schub > 3 && /stark/.test(sy.eingang) && /blass/.test(sy.ausgang));
      await zeige([0, 0, 6]);
      sy = await symbol();
      V("Symbol, Gegendruck: die Kugel sitzt, der Eingang blass, der Ausgang kräftig", sy.schub === 0 && /blass/.test(sy.eingang) && /stark/.test(sy.ausgang));
      await zeige([0, 0, 0]);
      sy = await symbol();
      V("Symbol, alles drucklos: die Kugel sitzt, beide Teile blass", sy.schub === 0 && /blass/.test(sy.eingang) && /blass/.test(sy.ausgang));
      await zeige([0, 6, 0]);
      const strichTon = (n) => seite.evaluate((nn) => {
        const t = getComputedStyle(document.querySelector(`.beifigur-symbol [data-teil="${nn}"] path`)).stroke;
        const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
        const c = srgb ? [1, 2, 3].map((i) => Number(srgb[i])) : (t.match(/[\d.]+/g) || []).slice(0, 3).map((v) => Number(v) / 255);
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      }, n);
      V("Symbol: die Striche zeigen die zwei Blautöne wirklich", staerker(await strichTon("eingang"), await strichTon("ausgang")));

      // --- the particles on the route: only while open, in the air, never over the poppet ------------------------------------------------
      await zeige([1, 6, 1]);
      await h.warteTeilchen("a", 6);
      const offenTeilchen = await h.luftPruefung(["teller", "dichtring", "anschluss1", "anschluss2"], true);
      V(`Teller offen: ${offenTeilchen.gezaehlt} Teilchen auf dem Weg durch den Sitz, den Ringspalt und den Anschlag, keines über dem Teller${offenTeilchen.falsch.length ? " — " + offenTeilchen.falsch.slice(0, 3).join(", ") : ""}`,
        offenTeilchen.falsch.length === 0 && offenTeilchen.gezaehlt >= 6);
      await zeige([0, 0, 6]);
      V("Gegendruck bei geschlossenem Teller: kein Teilchen", Object.values(await h.teilchen()).every((x) => x.n === 0));
      await zeige([0.1, 6, 5.5]);
      V("Teller kaum abgehoben (10 % Hub): noch kein Teilchen", Object.values(await h.teilchen()).every((x) => x.n === 0));

      // --- readout: the model's numbers, two lines, wrapping ---------------------------------------------------------------------------------
      await zeige([1, 6, 5]);
      V("Anzeige 6/5 bar: 1000 l/min bei 1 bar Druckabfall (Katalog)", (await text()) === "Eingang 1 6,0 bar · Ausgang 2 5,0 bar · Δp 1,0 bar\nTeller offen · Durchfluss 1000 l/min");
      await zeige([1, 6, 1]);
      V("Anzeige 6/1 bar: bei 5 bar Druckabfall steht die Begrenzung da: 2000 l/min (begrenzt)", (await text()) === "Eingang 1 6,0 bar · Ausgang 2 1,0 bar · Δp 5,0 bar\nTeller offen · Durchfluss 2000 l/min (begrenzt)");
      await zeige([0, 0, 6]);
      V("Anzeige bei Gegendruck: Δp negativ mit echtem Minus, Teller zu, 0 l/min", (await text()) === "Eingang 1 0,0 bar · Ausgang 2 6,0 bar · Δp −6,0 bar\nTeller zu (Gegendruck) · Durchfluss 0 l/min");
      await zeige([0.5, 0.3, 0]);
      V("Anzeige halb offen: 0,3 bar Druckabfall und halber Hub: 150 l/min", (await text()) === "Eingang 1 0,3 bar · Ausgang 2 0,0 bar · Δp 0,3 bar\nTeller halb offen · Durchfluss 150 l/min");
      V("der Text sagt, wie die Anzeige begrenzt ist", /\(begrenzt\)/.test(await seite.textContent(".lesetext")) && /2000 l\/min/.test(await seite.textContent(".lesetext")));

      // --- the controls really switch ------------------------------------------------------------------------------------------------------
      await stelle([0, false, 0]);
      await seite.fill("#druck-eingang", "6");
      await seite.dispatchEvent("#druck-eingang", "input");
      await warteModell((z) => z.p2 > 6.85, null, 8000);
      V("der Regler Eingang 1 füllt den Ausgang (Modell und Anzeige)", /Ausgang 2 5,9 bar/.test(await text()) && /Eingang 1 6,0 bar/.test(await text()));
      V("die Anzeige des Reglers nennt den Wert mit Komma", (await seite.textContent("#druck-eingang-wert")) === "6,0 bar");
      V("der Regler geht bis 8 bar in Schritten von 0,5", (await seite.getAttribute("#druck-eingang", "max")) === "8" && (await seite.getAttribute("#druck-eingang", "step")) === "0.5");
      await seite.click("#btn-auto");
      V("die Automatik ist wieder an", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "true");
      await seite.fill("#druck-eingang", "2");
      await seite.dispatchEvent("#druck-eingang", "input");
      V("ein Eingriff am Regler schaltet die Automatik aus", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");
      await seite.click("#btn-entlueften");
      V("der Knopf zum Entlüften schaltet die Automatik aus", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");
      await seite.click("#btn-entlueften");

      // --- the eight-step cycle: the order, the poppet and the locked-in pressure at each step ----------------------------------------------
      await stelle([0, false, 0]);
      await zeitlupe(1);
      await seite.click("#btn-auto");
      const folge = await seite.evaluate(async () => {
        const schritte = [];
        const gesehen = new Set();
        const t0 = performance.now();
        const bereit = [(z) => z.p2 > 6.8, (z) => z.p2 > 6.8, (z) => z.p2 > 6.8, (z) => z.p2 > 6.8, (z) => z.p2 > 6.8, (z) => z.p2 > 6.8, (z) => z.p2 < 1.6, (z) => z.p2 < 1.1];
        while (schritte.length < 8 && performance.now() - t0 < 20000) {
          await new Promise((r) => requestAnimationFrame(r));
          const i = window.__figur.autoSchritt();
          if (!gesehen.has(i)) {
            gesehen.add(i);
            let n = 0;
            while (n < 90 && !bereit[i](window.__figur.modell())) { await new Promise((r) => requestAnimationFrame(r)); n += 1; }
            const z = window.__figur.modell();
            schritte.push({ i, wunsch: window.__figur.wunsch(), ent: window.__figur.entlueften(), h: z.h, p2: z.p2 });
          }
        }
        return schritte;
      });
      const soll = [[6, false], [6, false], [0, false], [0, false], [3, false], [3, false], [0, true], [0, true]];
      V(`die Automatik beginnt bei „6 bar an 1“ und spielt die acht Schritte der Spezifikation (${folge.map((x) => x.i).join("")})`,
        folge.length === 8 && folge.every((x, k) => x.i === k && x.wunsch === soll[k][0] && x.ent === soll[k][1]));
      V(`2 bleibt nach „1 auf 0“ und bei „1 auf 3 bar“ auf seinem Druck (${folge.slice(2, 6).map((x) => (x.p2 - 1).toFixed(1)).join(" ")} bar), der Teller bleibt zu`,
        folge.length === 8 && folge.slice(2, 6).every((x) => x.p2 > 6.85 && x.h < 1e-3));
      V(`erst das Entlüften nimmt den Druck von 2 (${folge.slice(6).map((x) => (x.p2 - 1).toFixed(1)).join(" ")} bar)`, folge.length === 8 && folge[6].p2 < 1.6 && folge[7].p2 < 1.1);
      await seite.click("#btn-auto");
      await seite.click("#btn-auto");
      V("jeder Klick, der die Automatik einschaltet, beginnt wieder bei Schritt 0", (await seite.evaluate(() => window.__figur.autoSchritt())) === 0 && (await seite.evaluate(() => window.__figur.wunsch())) === 6);
      await seite.click("#btn-auto");

      // --- the text: the states, the opening pressure, the assumptions ------------------------------------------------------------------
      const tab = await seite.evaluate(() => {
        const t = document.querySelector("table.wahrheit");
        return t ? [...t.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim())) : null;
      });
      V("der Erklärtext enthält die Zustandstabelle mit den drei Fällen (offen, zu, zu und fester angedrückt)",
        Array.isArray(tab) && tab.length === 3 && /^offen/.test(tab[0][1]) && tab[1][1] === "zu" && /fester/.test(tab[2][1]) && /nichts strömt zurück/.test(tab[2][2]));
      const lese = await seite.textContent(".lesetext");
      V("der Text nennt die Annahmen: Öffnungsdruck 0,1 bar (Schwesterreihe H-QS), nachgezeichnet, Dichtring blau, Zylinder, Hülse",
        /angenommen: von der Schwesterreihe H-QS/.test(lese) && /nachgezeichnet nach dem Funktionsprinzip/.test(lese) && /in Wirklichkeit blau/.test(lese) && /Sechskant[^.]*Zylinder/.test(lese) && /Hülse/.test(lese));
      V("der Text erklärt, warum 2 nur bis 5,9 bar steigt", /steigt der Druck an 2 nur bis 5,9 bar/.test(lese));

      // --- on a phone, apart: no assembly is smaller than 30 px (else it would ride along with its neighbour) ----------------------------
      await seite.setViewportSize({ width: 390, height: 844 });
      await seite.waitForFunction(() => innerWidth === 390);
      await stelle([0, false, 0]);
      await seite.click("#btn-explode");
      await seite.waitForFunction(() => window.__figur.offen() > 0.97, null, { timeout: 15000 }).catch(() => {});
      const groessen = await seite.evaluate(() => {
        const aus = {};
        for (const g of document.querySelectorAll("[data-g]")) {
          const r = g.getBoundingClientRect(), p = g.dataset.piece;
          const o = aus[p] ?? (aus[p] = [1e9, 1e9, -1e9, -1e9]);
          o[0] = Math.min(o[0], r.left); o[1] = Math.min(o[1], r.top); o[2] = Math.max(o[2], r.right); o[3] = Math.max(o[3], r.bottom);
        }
        return Object.entries(aus).map(([p, [l, t, r, b]]) => ({ p, w: r - l, h: b - t }));
      });
      const klein = groessen.filter((g) => Math.max(g.w, g.h) < 30);
      V(`zerlegt bei 390 px ist keine Baugruppe kleiner als 30 px (kleinste: ${groessen.map((g) => `${g.p} ${Math.round(Math.max(g.w, g.h))}`).sort((a, b) => parseInt(a.split(" ")[1]) - parseInt(b.split(" ")[1]))[0]})${klein.length ? " — zu klein: " + klein.map((g) => g.p).join(", ") : ""}`, klein.length === 0);
      await seite.click("#btn-explode");
      await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
      await seite.setViewportSize({ width: 1280, height: 900 });
      await seite.waitForFunction(() => innerWidth === 1280);
      await h.nachBildern(3);
    },
  });
}
