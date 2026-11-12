// What only the throttle check valve promises, on top of the checks every figure passes
// (figur/tests/tools/pruefe-figur.mjs) and the checks every section page passes
// (figur/tests/tools/pruefe-schnitt.mjs: the scale, the cycle at the load, the legend's sentences, no particle on
// material, the direction of the particles, the readout and sliders on a phone, taking apart):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Drosselrueckschlagventil/ \
//        Drosselrueckschlagventil/tests/tools/pruefe-drossel.mjs
//
// Measured on what the browser draws, never on a class alone: how far the lip of the seal is spread or folded in each
// direction (the drawn shapes and their blend), whether the screw's pin moves with the regulator by turns × pitch and
// lands in its bore at 0 turns, which ways carry particles, the tones of the two sides (in the free direction BOTH
// strong), the readout (420 / 210 / 0 and 780 / 360 l/min), the detail panel, and which branch of the symbol is coloured.
import { hilfen, schnittPruefungen } from "../../../figur/tests/tools/pruefe-schnitt.mjs";

export default async function pruefeDrossel(ctx) {
  const { seite, V } = ctx;
  const h = hilfen(seite, ctx.modus);
  const { staerker, text } = h;
  /** A state at rest: direction ("drossel" | "frei") and turns; the drawing settled. */
  const stelle = async ([richtung, u]) => {
    await seite.evaluate(([r, w]) => window.__figur.stelle(r, w), [richtung, u]);
    await h.nachBildern(8);
  };
  const wege = [["drossel", "1 → 2"], ["frei", "2 → 1"]];
  const name = (r) => wege.find((w) => w[0] === r)[1];
  const summe = (t, namen) => namen.reduce((s, n) => s + t[n].n, 0);
  const mittel = (t, namen) => { const n = summe(t, namen); return n ? namen.reduce((s, x) => s + t[x].n * t[x].mittel, 0) / n : 0; };
  const zweig = (n) => seite.evaluate((w) => document.querySelector(`.beifigur-symbol [data-weg="${w}"]`).classList.contains("stark")
    || document.querySelector(`.beifigur-symbol [data-weg="${w}"]`).classList.contains("blass"), n);
  const MASSE = await seite.evaluate(() => window.__figur.MASSE);
  const GEO = await seite.evaluate(() => window.__figur.geometrie);

  await schnittPruefungen({
    ...ctx,
    h,
    beschreibung: {
      stelle,
      ruhe: [{ name: "Drossel zu in Drosselrichtung", zustand: ["drossel", 0] }],
      stroemung: [["drossel", 3], ["frei", 3], ["frei", 6], ["drossel", 6]].map(([r, u]) => ({
        name: `${name(r)}, ${u} Umdrehungen`, mindestens: 4,
        richte: async () => { await stelle([r, u]); await h.warteIrgendwoTeilchen(4); },
      })),
      festeTeile: ["verschraubung", "einsatz", "scheibe", "manschette", "buchse", "kontermutter", "schraube"],
      richtung: [["drossel", 1, "1 → 2: die Teilchen laufen vom Anschluss 1 zum Anschluss 2"], ["frei", -1, "2 → 1: die Teilchen laufen zurück"]].map(([r, vorzeichen, n]) => ({
        name: n, strom: "k1", vorzeichen, schwelle: 0.3, optionen: { dtMax: 20, paare: 7, versuche: 60, deckkraft: 0.3 },
        richte: async () => { await seite.evaluate((a) => { window.__figur.stelle(a, 6); window.__figur.weiter(); }, r); await h.warteTeilchen("k1", 3); },
      })),
      telefon: { zustand: ["frei", 6], regler: ["#drossel"], zeilenMin: 3 },
      zerlegen: {
        zustand: ["frei", 6], hubTeile: '[data-g="schraube"] [data-hub]', hubName: "der Zapfen",
        zusatz: async () => V("zerlegt: die Lippe steht auf ihrem Ausgangsplatz (gespreizt)",
          (await seite.evaluate(() => Number(getComputedStyle(document.querySelector('[data-lippe="zu"]')).opacity))) > 0.95),
      },
    },
    spezifisch: async () => {
      const m = await h.masstab();
      const { pxX, pxZ } = m;

      // --- the lip: spread against the wall in 1 → 2, folded in in 2 → 1 -----------------------
      const lippe = () => seite.evaluate(() => {
        const dichte = (art) => Math.max(...[...document.querySelectorAll(`[data-lippe="${art}"]`)].map((e) => Number(getComputedStyle(e).opacity)));
        const kasten = (art) => {
          const r = [...document.querySelectorAll(`[data-lippe="${art}"]`)].map((e) => e.getBoundingClientRect());
          return { l: Math.min(...r.map((b) => b.left)), r: Math.max(...r.map((b) => b.right)) };
        };
        return { zu: dichte("zu"), auf: dichte("auf"), breiteZu: kasten("zu").r - kasten("zu").l, breiteAuf: kasten("auf").r - kasten("auf").l };
      });
      await stelle(["drossel", 3]);
      const lippeZu = await lippe();
      await stelle(["frei", 3]);
      const lippeOffen = await lippe();
      V(`die Lippe ist in 1 → 2 gespreizt gezeichnet (gespreizt ${lippeZu.zu.toFixed(2)}, eingeklappt ${lippeZu.auf.toFixed(2)})`, lippeZu.zu > 0.95 && lippeZu.auf < 0.05);
      V(`die Lippe ist in 2 → 1 eingeklappt gezeichnet (gespreizt ${lippeOffen.zu.toFixed(2)}, eingeklappt ${lippeOffen.auf.toFixed(2)})`, lippeOffen.zu < 0.05 && lippeOffen.auf > 0.95);
      // The mouth really moves: the folded shape is narrower than the spread one by twice the fold, in pixels.
      const soll = 2 * (GEO.LIPPE_ZU - GEO.LIPPE_AUF) * pxX;
      V(`die Mündung wandert um ${((lippeZu.breiteZu - lippeZu.breiteAuf) / 2).toFixed(1)} px je Seite (erwartet etwa ${(soll / 2).toFixed(1)})`,
        lippeZu.breiteZu - lippeZu.breiteAuf > soll * 0.5);

      // --- the pin follows the regulator, the lip's blend follows the model ---------------------
      await stelle(["drossel", 0]);
      const zapfen0 = await h.kasten('[data-g="schraube"]');
      const mund = await seite.evaluate(() => { const r = document.querySelector("[data-mund]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await stelle(["drossel", 3]);
      const zapfen3 = await h.kasten('[data-g="schraube"]');
      await stelle(["drossel", 6]);
      const zapfen6 = await h.kasten('[data-g="schraube"]');
      const erwartet = 3 * MASSE.steigung * pxZ;
      V(`der Zapfen fährt je 3 Umdrehungen um Umdrehungen × Steigung nach oben (${(zapfen0.t - zapfen3.t).toFixed(1)} / ${(zapfen3.t - zapfen6.t).toFixed(1)} px, erwartet ${erwartet.toFixed(1)})`,
        Math.abs((zapfen0.t - zapfen3.t) - erwartet) <= 1 && Math.abs((zapfen3.t - zapfen6.t) - erwartet) <= 1);
      // At 0 turns the cone's base sits in the bore's mouth: its tip hangs one cone length below it.
      // (the tip is a flat end of radius R_SPITZE: its right corner lies a little lower on the screen)
      const spitze = GEO.L_KONUS * pxZ + GEO.R_SPITZE * m.mm.y;
      V(`bei 0 Umdrehungen sitzt der Kegel in der Bohrung: Spitze ${(zapfen0.b - mund.y).toFixed(1)} px unter der Mündung (erwartet ${spitze.toFixed(1)})`,
        Math.abs((zapfen0.b - mund.y) - spitze) <= 1);

      // --- readout: the model's numbers at the catalogue's conditions --------------------------
      const faelle = [["drossel", 6, 420], ["drossel", 3, 210], ["drossel", 0, 0], ["frei", 6, 780], ["frei", 0, 360]];
      for (const [r, u, erg] of faelle) {
        await stelle([r, u]);
        const t = await text();
        V(`Anzeige ${name(r)}, ${u} Umdrehungen: ${erg} l/min`, new RegExp(`^Q ${erg} l/min \\(`).test(t) && /\n(1 → 2|2 → 1) · 6 bar · Δp 1 bar$/.test(t));
      }

      // --- particles: which ways carry air -----------------------------------------------------
      // b, g: through the ring gap (and its left leg bl, gl); k1, z1, z2: the channels and hoses; w, l: round the lip.
      await stelle(["drossel", 3]);
      await h.warteIrgendwoTeilchen(6);
      let t = await h.teilchen();
      V(`1 → 2: Luft strömt durch den Ringspalt (${summe(t, ["b", "g"])} Teilchen), an der Lippe vorbei bleibt es leer (${summe(t, ["w", "l"])})`,
        summe(t, ["b", "g"]) >= 6 && summe(t, ["w", "l"]) === 0 && summe(t, ["k1", "z1", "z2"]) >= 6);
      await stelle(["frei", 3]);
      await h.warteIrgendwoTeilchen(6);
      t = await h.teilchen();
      V(`2 → 1: Teilchen im Spalt (${summe(t, ["b", "g"])}) und an der Lippe vorbei (${summe(t, ["w", "l"])}), dort kräftiger (${mittel(t, ["w", "l"]).toFixed(2)} gegen ${mittel(t, ["b", "g"]).toFixed(2)})`,
        summe(t, ["b", "g"]) >= 6 && summe(t, ["w", "l"]) >= 6 && mittel(t, ["w", "l"]) > mittel(t, ["b", "g"]));
      await stelle(["frei", 0]);
      await h.warteIrgendwoTeilchen(6);
      t = await h.teilchen();
      V("2 → 1 bei zugedrehter Drossel: nur an der Lippe vorbei", summe(t, ["b", "g"]) === 0 && summe(t, ["w", "l"]) >= 6);

      // --- tones (Rule: strong = under pressure, pale = relaxed) --------------------------------
      await stelle(["drossel", 0]);
      const d1 = await h.hell('[data-raum="s1"]'), d2 = await h.hell('[data-raum="s2"]');
      V("1 → 2: Seite 1 kräftiges Blau, Seite 2 blasses (auch bei zugedrehter Drossel)", staerker(d1, d2, 0.05));
      await stelle(["drossel", 3]);
      const starkRef = await h.hell('[data-raum="s1"]');
      await stelle(["frei", 3]);
      const f1 = await h.hell('[data-raum="s1"]'), f2 = await h.hell('[data-raum="s2"]');
      V(`2 → 1 mit eingeklappter Lippe: BEIDE Seiten kräftig (${f1.toFixed(2)} / ${f2.toFixed(2)}, kräftig = ${starkRef.toFixed(2)})`,
        Math.abs(f1 - starkRef) < 0.02 && Math.abs(f2 - starkRef) < 0.02);

      // --- the detail panel follows the same state --------------------------------------------------
      const lupe = () => seite.evaluate(() => {
        const dichte = (art) => Number(getComputedStyle(document.querySelector(`[data-lupe-lippe="${art}"]`)).opacity);
        const breite = (art) => document.querySelector(`[data-lupe-lippe="${art}"]`).getBoundingClientRect().width;
        const farbe = (sel) => getComputedStyle(document.querySelector(sel)).fill;
        const rahmen = document.querySelector("[data-lupe-mass]").getBoundingClientRect();
        return {
          zu: dichte("zu"), auf: dichte("auf"), breiteZu: breite("zu"), breiteAuf: breite("auf"),
          zapfen: document.querySelector("[data-lupe-zapfen]").getBoundingClientRect().top,
          pxProMm: rahmen.width / 38,
          s1: farbe('[data-lupe-raum="s1"]'), s2: farbe('[data-lupe-raum="s2"]'),
          haupt1: farbe('[data-raum="s1"]'), haupt2: farbe('[data-raum="s2"]'),
          pfeilDrossel: Number(getComputedStyle(document.querySelector('[data-lupe-pfeil="drossel"]')).opacity),
          pfeilLippe: Number(getComputedStyle(document.querySelector('[data-lupe-pfeil="lippe"]')).opacity),
          text: document.querySelector("[data-lupe-text]").textContent,
        };
      });
      await stelle(["drossel", 3]);
      const l12 = await lupe();
      await stelle(["frei", 3]);
      const l21 = await lupe();
      V(`Lupe: die Lippe ist in 1 → 2 gespreizt, in 2 → 1 eingeklappt (Breite ${l12.breiteZu.toFixed(0)} px gegen ${l21.breiteAuf.toFixed(0)} px)`,
        l12.zu > 0.95 && l12.auf < 0.05 && l21.zu < 0.05 && l21.auf > 0.95 && l12.breiteZu - l21.breiteAuf > 2 * (GEO.LIPPE_ZU - GEO.LIPPE_AUF) * l12.pxProMm * 0.5);
      V("Lupe: die Töne der Räume sind dieselben wie im Schnitt", l12.s1 === l12.haupt1 && l12.s2 === l12.haupt2 && l21.s1 === l21.haupt1 && l21.s2 === l21.haupt2);
      V("Lupe: die Pfeile folgen den Wegen (1 → 2 nur durch den Spalt, 2 → 1 auch an der Lippe vorbei)", l12.pfeilDrossel === 1 && l12.pfeilLippe === 0 && l21.pfeilDrossel === 1 && l21.pfeilLippe === 1);
      V("Lupe: der Text nennt die Richtung", /Von 1 nach 2/.test(l12.text) && /Von 2 nach 1/.test(l21.text));
      await stelle(["drossel", 0]);
      const p0 = await lupe();
      await stelle(["drossel", 6]);
      const p6 = await lupe();
      V(`Lupe: der Zapfen fährt mit dem Regler (${(p0.zapfen - p6.zapfen).toFixed(1)} px für 6 Umdrehungen, erwartet ${(6 * MASSE.steigung * p0.pxProMm).toFixed(1)})`,
        Math.abs((p0.zapfen - p6.zapfen) - 6 * MASSE.steigung * p0.pxProMm) <= 1);

      // --- the symbol colours the branch that carries air -----------------------------------
      await stelle(["drossel", 3]);
      V("Schaltzeichen 1 → 2: nur der Drosselzweig ist gefärbt", (await zweig("drossel")) && !(await zweig("rueckschlag")));
      await stelle(["frei", 3]);
      V("Schaltzeichen 2 → 1: beide Zweige sind gefärbt", (await zweig("drossel")) && (await zweig("rueckschlag")));
      await stelle(["drossel", 0]);
      V("Schaltzeichen: Drossel zu, 1 → 2: kein Zweig gefärbt", !(await zweig("drossel")) && !(await zweig("rueckschlag")));

      // --- the controls really switch -------------------------------------------------------
      await stelle(["drossel", 3]);
      await seite.click("#btn-richtung");
      await seite.waitForFunction(() => window.__figur.richtung() === "frei" && /Lippe offen/.test(document.querySelector("[data-readout]").textContent), null, { timeout: 5000 }).catch(() => {});
      V("der Richtungsknopf schaltet auf 2 → 1 um", (await seite.evaluate(() => window.__figur.richtung())) === "frei" && /Lippe offen/.test(await text()));
      await seite.fill("#drossel", "6");
      await seite.dispatchEvent("#drossel", "input");
      await seite.waitForFunction(() => window.__figur.modell().zapfen > 5.9, null, { timeout: 5000 }).catch(() => {});
      V("der Drosselregler stellt den Zapfen nach (Modell folgt dem Regler)", (await seite.evaluate(() => window.__figur.modell().zapfen)) > 5.9);
      V("die Automatik ist nach einem Eingriff aus", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");

      // --- the automatic cycle turns the direction by itself within its takt (3 s) -------------------
      await stelle(["drossel", 3]);
      await seite.evaluate(() => { window.__figur.weiter(); });
      await seite.click("#btn-auto");
      const r0 = await seite.evaluate(() => window.__figur.richtung());
      V("Automatik an", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "true");
      await seite.waitForFunction((r) => window.__figur.richtung() !== r, r0, { timeout: 5000 }).catch(() => {});
      V("die Automatik wechselt die Richtung von selbst", (await seite.evaluate(() => window.__figur.richtung())) !== r0);
      await seite.click("#btn-auto");
    },
  });
}
