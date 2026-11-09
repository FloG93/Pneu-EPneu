// What only the 5/2 valve promises, on top of the checks every figure passes
// (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Wegeventil-5-2/ \
//        Wegeventil-5-2/tests/tools/pruefe-ventil.mjs
//
// Everything is read from what the browser draws (fills, opacities, the
// symbol's applied matrix, the readout text) or from the model that drives it.
export default async function pruefeVentil({ seite, V, modus }) {
  const zweiBilder = () => seite.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  // --- the legend stays under the pointer ---------------------------------
  // The legend lies below the fold here. A pick changes the length of the
  // line under it; the page must not scroll for that, or the pointer that
  // just clicked rests on the neighbouring entry and shows it.
  await seite.mouse.move(5, 5);
  await seite.evaluate(() => document.querySelector(".pickbtn").scrollIntoView({ block: "center" }));
  await zweiBilder();
  const lage = () => seite.evaluate(() => ({
    scroll: scrollY, oben: document.querySelector(".pickbtn").getBoundingClientRect().top,
  }));
  const vorPick = await lage();
  await seite.evaluate(() => document.querySelector(".pickbtn").click());
  await zweiBilder();
  const nachPick = await lage();
  await seite.evaluate(() => document.querySelector(".pickbtn").click());
  await zweiBilder();
  const nachAbwahl = await lage();
  const sprung = Math.max(Math.abs(nachPick.oben - vorPick.oben), Math.abs(nachAbwahl.oben - vorPick.oben));
  V(`ein Klick in der Legende verschiebt die Seite nicht (${sprung.toFixed(1)} px)`, sprung < 1);
  V("die Legende ist danach wieder ohne Auswahl",
    (await seite.evaluate(() => document.querySelectorAll("[data-g].mark").length)) === 0);

  // From here on the figure itself is watched: its frame loop only runs while
  // the stage is on screen.
  await seite.evaluate(() => scrollTo(0, 0));
  const anteil = () => seite.evaluate(() => window.__figur.modell().anteil);
  const signale = () => seite.evaluate(() => {
    const v = window.__figur.modell();
    return { s14: v.signal14, s12: v.signal12 };
  });

  // --- rooms: "stronger" is darker on paper and lighter at night ----------
  const luminanz = (rgb) => {
    const k = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * k(rgb[0]) + 0.7152 * k(rgb[1]) + 0.0722 * k(rgb[2]);
  };
  // An unpainted room shows the paper behind it, so "none" is measured as paper.
  const raum = (n) => seite.evaluate((nr) => {
    const lies = (t) => {
      const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
      if (srgb) return [1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255));
      const z = t.match(/[\d.]+/g);
      return z ? z.slice(0, 3).map(Number) : null;
    };
    const el = document.querySelector(`[data-raum="${nr}"]`);
    const f = getComputedStyle(el).fill;
    if (!f || f === "none") {
      for (let e = el.parentElement; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return { fill: "none", rgb: lies(c) };
      }
      return { fill: "none", rgb: lies(getComputedStyle(document.body).backgroundColor) };
    }
    return { fill: f, rgb: lies(f) };
  }, String(n));
  const kraeftiger = (a, b) => (modus === "light" ? luminanz(a.rgb) < luminanz(b.rgb) : luminanz(a.rgb) > luminanz(b.rgb));
  const raeumeBei = async (stellung) => {
    await seite.evaluate((s) => { window.__figur.stelle(s); window.__figur.weiter(); }, stellung);
    await seite.waitForTimeout(1200);      // > 0,8 s of model time at Zeitlupe 1
    return { r2: await raum(2), r4: await raum(4) };
  };
  const bei14 = await raeumeBei(1);
  V(`Stellung 14: Raum 4 kräftiger als Raum 2 (${bei14.r4.fill} / ${bei14.r2.fill})`, kraeftiger(bei14.r4, bei14.r2));
  const bei12 = await raeumeBei(0);
  V(`Stellung 12: Raum 2 kräftiger als Raum 4 (${bei12.r2.fill} / ${bei12.r4.fill})`, kraeftiger(bei12.r2, bei12.r4));

  // --- halfway every working path is shut and nothing flows ---------------
  await seite.evaluate(() => { window.__figur.stelle(0.5); window.__figur.weiter(); });
  await seite.waitForTimeout(500);
  // Not vacuous: every stream must exist and carry particles, and both the
  // group and every particle in it must be transparent.
  const stroeme = await seite.evaluate(() => ["1-4", "2-3", "1-2", "4-5"].map((n) => {
    const g = document.querySelector(`[data-strom="${n}"]`);
    if (!g) return { n, kugeln: 0, gruppe: 1, kugel: 1 };
    const kugeln = [...g.querySelectorAll("circle")];
    return { n, kugeln: kugeln.length, gruppe: Number(getComputedStyle(g).opacity),
      kugel: Math.max(0, ...kugeln.map((c) => Number(getComputedStyle(c).opacity))) };
  }));
  const offenBei50 = stroeme.filter((x) => x.kugeln === 0 || x.gruppe >= 0.05 || x.kugel >= 0.05)
    .map((x) => `${x.n} (${x.kugeln} Teilchen, Gruppe ${x.gruppe.toFixed(2)}, Teilchen ${x.kugel.toFixed(2)})`);
  V(`Schieber auf 50 %: kein Weg strömt${offenBei50.length ? " — " + offenBei50.join(", ") : ""}`, offenBei50.length === 0);
  // The same measurement sees flow where there is some: 1→4 in position 14.
  await seite.evaluate(() => { window.__figur.stelle(1); window.__figur.weiter(); });
  await seite.waitForTimeout(250);
  const in14 = await seite.evaluate(() => {
    const g = document.querySelector('[data-strom="1-4"]');
    return Number(getComputedStyle(g).opacity) * Math.max(0, ...[...g.querySelectorAll("circle")].map((c) => Number(getComputedStyle(c).opacity)));
  });
  V(`in Stellung 14 strömt 1→4 sichtbar (${in14.toFixed(2)})`, in14 > 0.3);

  // --- symbol beside the card follows the spool ---------------------------
  const symbol = () => seite.evaluate(() => {
    const svg = document.querySelector(".beifigur-symbol:not([hidden]) svg");
    const felder = svg.querySelector("[data-felder]");
    const m = felder.transform.baseVal.consolidate();
    const weg = svg.querySelector('[data-feld="0"] [data-weg="1-4"]');
    // The colour --sz-stark resolves to, read through a probe in the same place.
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "g");
    probe.style.color = "var(--sz-stark)";
    svg.append(probe);
    const farbeStark = getComputedStyle(probe).color;
    probe.remove();
    return {
      x: m ? m.matrix.e : 0,
      feld: Number(svg.getAttribute("data-feldbreite")),
      farbeWeg: getComputedStyle(weg).fill,
      farbeStark,
      farbeRahmen: getComputedStyle(svg.querySelector(".sz-rahmen")).stroke,
    };
  });
  await seite.evaluate(() => window.__figur.stelle(1));
  await zweiBilder();
  const sym14 = await symbol();
  V(`Symbol in Stellung 14 steht auf Feld 14 (x ${sym14.x})`, Math.abs(sym14.x) < 0.01);
  V(`im aktiven Feld ist 1→4 kräftig blau gezeichnet (${sym14.farbeWeg})`,
    sym14.farbeWeg === sym14.farbeStark && sym14.farbeWeg !== sym14.farbeRahmen);
  await seite.evaluate(() => window.__figur.stelle(0));
  await zweiBilder();
  const sym12 = await symbol();
  V(`Symbol in Stellung 12 um ein Feld verschoben (x ${sym12.x}, Feld ${sym12.feld})`,
    sym12.feld > 0 && Math.abs(sym12.x + sym12.feld) < 0.01);

  // --- readout from the model ---------------------------------------------
  await seite.fill("#druck", "3");
  await seite.dispatchEvent("#druck", "input");
  await seite.evaluate(() => { window.__figur.stelle(1); window.__figur.weiter(); });
  await seite.waitForTimeout(1300);       // > 1 s of model time
  const anzeige = (await seite.textContent("[data-readout]")).trim();
  V(`bei 3 bar zeigt die Anzeige p4 3,0 bar (${anzeige})`, anzeige.includes("p4 3,0 bar"));
  await seite.fill("#druck", "6");
  await seite.dispatchEvent("#druck", "input");

  // --- monostable: the signal lasts while the button is held --------------
  await seite.evaluate(() => { window.__figur.stelle(0); window.__figur.weiter(); });
  await seite.hover("#btn-14");
  await seite.mouse.down();
  await seite.waitForTimeout(400);
  const gehalten = await anteil();
  V(`Signal 14 gehalten: der Schieber steht in 14 (${gehalten.toFixed(3)})`, gehalten > 0.98);
  // Leave the pressed button: pointerleave must end the signal (Review Focus 5).
  await seite.mouse.move(5, 5);
  await seite.waitForTimeout(600);
  const losgelassen = await anteil();
  V(`Maus verlässt den gehaltenen Knopf: die Feder stellt zurück (${losgelassen.toFixed(3)})`, losgelassen < 0.02);
  await seite.mouse.up();

  // --- bistable: one press, and it stays ----------------------------------
  await seite.click("#btn-bauart");
  await seite.click("#btn-14");
  await seite.waitForTimeout(600);
  const impuls = await anteil();
  await seite.waitForTimeout(600);
  const spaeter = await anteil();
  V(`bistabil: ein Druck auf 14 schaltet (${impuls.toFixed(3)}) und es bleibt (${spaeter.toFixed(3)})`,
    impuls > 0.98 && spaeter > 0.98);

  // --- changing the type mid-switch (Review Focus 3) ----------------------
  await seite.click("#btn-14");            // nothing: already there; then back home
  await seite.click("#btn-12");
  await seite.waitForFunction(() => window.__figur.modell().anteil < 0.02, null, { timeout: 3000 }).catch(() => {});
  await seite.fill("#zeitlupe", "50");
  await seite.dispatchEvent("#zeitlupe", "input");
  await seite.evaluate(() => window.__figur.signal("14", true));
  await seite.waitForTimeout(200);
  // Make sure the spool is caught on its way, not before it set off.
  await seite.waitForFunction(() => { const a = window.__figur.modell().anteil; return a > 0.05 && a < 0.95; },
    null, { timeout: 4000, polling: "raf" }).catch(() => {});
  const unterwegs = await anteil();
  await seite.click("#btn-bauart");
  const nachWechsel = { anteil: await anteil(), ...(await signale()) };
  await seite.waitForTimeout(400);
  const ruhig = await anteil();
  V(`Bauart mitten im Umschalten (${unterwegs.toFixed(2)}) gewechselt: Stellung 12, kein Signal (${nachWechsel.anteil}, danach ${ruhig})`,
    unterwegs > 0.05 && unterwegs < 0.95 && nachWechsel.anteil === 0 && ruhig === 0
    && !nachWechsel.s14 && !nachWechsel.s12);
  V("nach dem Wechsel ist Signal 14 nicht gedrückt",
    (await seite.getAttribute("#btn-14", "aria-pressed")) === "false");
  await seite.fill("#zeitlupe", "1");
  await seite.dispatchEvent("#zeitlupe", "input");

  // --- taking apart stops the automatic (Review Focus 5) ------------------
  if ((await seite.getAttribute("#btn-auto", "aria-pressed")) !== "true") await seite.click("#btn-auto");
  await seite.click("#btn-explode");
  const beimZerlegen = await signale();
  V("Zerlegen stoppt die Automatik",
    (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");
  V("beim Zerlegen ist kein Signal aktiv", !beimZerlegen.s14 && !beimZerlegen.s12);

  // --- every number points at its own assembly, in both variants ----------
  // A number hung on the centroid of parts that lie apart points into empty
  // space (pitfall 2). Measured on screen: each visible leader line, from its
  // near end back to the point it hangs on, must meet (within a few px) a part
  // of its own assembly that is actually drawn (hidden variants have no box).
  const fuehrungen = async () => {
    await seite.waitForFunction(() => window.__figur.offen() > 0.99, null, { timeout: 15000 }).catch(() => {});
    await seite.waitForTimeout(2500);         // the last springs settle
    return seite.evaluate(() => {
      const piece = {};
      for (const b of document.querySelectorAll(".pickbtn")) piece[b.querySelector(".picknr").textContent.trim()] = b.dataset.pick;
      const daneben = [];
      let gezaehlt = 0;
      for (const g of document.querySelectorAll(".iso-nums > g")) {
        if (Number(g.getAttribute("opacity")) <= 0.5) continue;
        const nr = g.querySelector("text").textContent.trim();
        const line = g.querySelector("line");
        const ctm = line.getScreenCTM();
        const auf = (x, y) => { const pt = line.ownerSVGElement.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(ctm); };
        const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((a) => Number(line.getAttribute(a)));
        // The leader stops 16 px short of its anchor (and runs 30 px): continue
        // it back to where it points and look along that stretch.
        const zurueck = 16 / 30;
        const proben = Array.from({ length: 9 }, (_, i) => auf(x1 - (x2 - x1) * zurueck * (i / 8), y1 - (y2 - y1) * zurueck * (i / 8)));
        const toleranz = 4;
        const teile = [...document.querySelectorAll(`[data-g][data-piece="${piece[nr]}"]`)]
          .map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
        const drin = (q, r) => q.x >= r.left - toleranz && q.x <= r.right + toleranz && q.y >= r.top - toleranz && q.y <= r.bottom + toleranz;
        const trifft = proben.some((q) => teile.some((r) => drin(q, r)));
        const q = proben[0];
        gezaehlt += 1;
        if (!trifft) {
          const abstand = Math.min(...teile.map((r) => Math.hypot(Math.max(r.left - q.x, 0, q.x - r.right), Math.max(r.top - q.y, 0, q.y - r.bottom))));
          daneben.push(`${nr} ${Math.round(abstand)} px`);
        }
      }
      return { gezaehlt, daneben };
    });
  };
  const mono = await fuehrungen();
  V(`monostabil zerlegt: jede Nummer zeigt auf ein Teil ihrer Baugruppe (${mono.gezaehlt})${mono.daneben.length ? " — daneben: " + mono.daneben.join(", ") : ""}`,
    mono.gezaehlt === 11 && mono.daneben.length === 0);
  await seite.keyboard.press("Escape");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  await seite.click("#btn-bauart");
  await seite.click("#btn-explode");
  const bi = await fuehrungen();
  V(`bistabil zerlegt: jede Nummer zeigt auf ein Teil ihrer Baugruppe (${bi.gezaehlt})${bi.daneben.length ? " — daneben: " + bi.daneben.join(", ") : ""}`,
    bi.gezaehlt === 11 && bi.daneben.length === 0);
  // Back together and monostable for the checks that follow.
  await seite.keyboard.press("Escape");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  await seite.click("#btn-bauart");
}
