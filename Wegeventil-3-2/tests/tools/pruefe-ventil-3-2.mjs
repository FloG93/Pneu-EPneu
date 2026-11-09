// What only the 3/2 valve promises, on top of the checks every figure passes
// (figur/tests/tools/pruefe-figur.mjs):
//
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Wegeventil-3-2/ \
//        Wegeventil-3-2/tests/tools/pruefe-ventil-3-2.mjs
//
// Everything is read from what the browser draws (fills, opacities, the
// symbol's applied matrix, drawn boxes, the readout text) or from the model
// that drives it. Both variants are measured: NC (rest 2-3, actuated 1-2) and
// NO (rest 1-2, actuated 2-3).
export default async function pruefeVentil32({ seite, V, modus }) {
  const zweiBilder = () => seite.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const anteil = () => seite.evaluate(() => window.__figur.modell().anteil);
  const tag = (n) => n.toUpperCase();
  // Waiting for a state of the page: a timeout is a failed check, never a silent
  // continuation (the checks after it would measure a state that never came).
  const erwarte = async (was, fn, arg, opt) => {
    const ok = await seite.waitForFunction(fn, arg, opt).then(() => true, () => false);
    if (!ok) V(`Zeitüberschreitung beim Warten auf: ${was}`, false);
    return ok;
  };

  // --- the legend stays under the pointer ---------------------------------
  await seite.mouse.move(5, 5);
  await seite.evaluate(() => document.querySelector(".pickbtn").scrollIntoView({ block: "center" }));
  await zweiBilder();
  const lage = () => seite.evaluate(() => ({ oben: document.querySelector(".pickbtn").getBoundingClientRect().top }));
  const vorPick = await lage();
  await seite.evaluate(() => document.querySelector(".pickbtn").click());
  await zweiBilder();
  const nachPick = await lage();
  await seite.evaluate(() => document.querySelector(".pickbtn").click());
  await zweiBilder();
  const sprung = Math.max(Math.abs(nachPick.oben - vorPick.oben), Math.abs((await lage()).oben - vorPick.oben));
  V(`ein Klick in der Legende verschiebt die Seite nicht (${sprung.toFixed(1)} px)`, sprung < 1);
  await seite.evaluate(() => scrollTo(0, 0));

  // --- rooms: what the model draws, once its pressure has settled ----------
  // "Strong" is the fill of room 1, which always holds the supply. A room that
  // is vented draws the pale tone while it still holds air and nothing once it
  // is ambient, so both count as "not strong"; what it must never be is strong.
  const paar = (n) => seite.evaluate((nr) => {
    const alle = [...document.querySelectorAll(`[data-raum="${nr}"]`)].filter((e) => e.getBoundingClientRect().width > 0);
    const f = alle.length ? getComputedStyle(alle[0]).fill : null;
    return f && f !== "none" ? f : "none";
  }, String(n));
  const blasseFarbe = () => seite.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sz-blass)";      // the CSS gives the symbol the same pale tone the air is drawn in
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  const gauge = () => seite.evaluate(() => window.__figur.modell().p[2] - 1);
  // The model's own state: p2 settles at the supply (1 → 2 open) or at ambient (2 → 3 open).
  const warte = (ziel) => seite.waitForFunction((z) => Math.abs(window.__figur.modell().p[2] - 1 - z) < 0.03,
    ziel, { timeout: 6000, polling: 50 }).then(() => true, () => false);
  const bei = async (name, stellung, ziel) => {
    await seite.evaluate(([n, s]) => { window.__figur.stelle(s, n); window.__figur.weiter(); }, [name, stellung]);
    const erreicht = await warte(ziel);
    await zweiBilder();
    return { erreicht, r1: await paar(1), r2: await paar(2), p2: await gauge() };
  };
  const erwartung = { nc: { ruhe: false, betaetigt: true }, no: { ruhe: true, betaetigt: false } };
  for (const name of ["nc", "no"]) {
    for (const [stellung, wort] of [[0, "in Ruhe"], [1, "betätigt"]]) {
      const kraeftig = erwartung[name][stellung === 0 ? "ruhe" : "betaetigt"];
      const r = await bei(name, stellung, kraeftig ? 6 : 0);
      const istStark = r.r2 === r.r1 && r.r1 !== "none";
      if (kraeftig) {
        V(`${tag(name)} ${wort}: p2 steht auf der Versorgung (${r.p2.toFixed(2)} bar) und Raum 2 ist kräftig (${r.r2})`, r.erreicht && istStark);
      } else {
        const blass = await blasseFarbe();
        V(`${tag(name)} ${wort}: p2 entlüftet (${r.p2.toFixed(2)} bar), Raum 2 ist blass oder leer (${r.r2}), nicht kräftig`,
          r.erreicht && !istStark && (r.r2 === "none" || r.r2 === blass));
      }
    }
  }

  // --- the spool held halfway keeps p2: display and room, over time ---------
  // Every working path is shut at 50 %, so the pressure stays where it was.
  // Measured before and after at least 0,8 s of model time (at slow motion 1:
  // 0,9 s on the clock and 40 drawn frames), from four starting states.
  const rahmen = () => seite.evaluate(() => new Promise((r) => {
    const t0 = performance.now();
    let n = 0;
    const lauf = () => { n += 1; if (n >= 40 && performance.now() - t0 >= 900) r(n); else requestAnimationFrame(lauf); };
    requestAnimationFrame(lauf);
  }));
  const zustand = async () => ({
    p2: await gauge(),
    anzeige: (await seite.textContent("[data-readout]")).trim().split(" · ")[0],
    raum: await paar(2),
  });
  for (const name of ["nc", "no"]) {
    for (const [von, wort, ziel] of [[1, "vorher betätigt", name === "nc" ? 6 : 0], [0, "vorher in Ruhe", name === "nc" ? 0 : 6]]) {
      await bei(name, von, ziel);
      await seite.evaluate((n) => { window.__figur.stelle(0.5, n); window.__figur.weiter(); }, name);
      await zweiBilder();
      const vorher = await zustand();
      await rahmen();
      const nachher = await zustand();
      V(`${tag(name)}, ${wort}, Schieber von Hand auf 50 %: p2 bleibt ${vorher.anzeige} (${vorher.p2.toFixed(3)} → ${nachher.p2.toFixed(3)} bar), Anzeige und Raum unverändert`,
        Math.abs(vorher.p2 - ziel) < 0.1 && Math.abs(nachher.p2 - vorher.p2) < 1e-6
        && vorher.anzeige === nachher.anzeige && vorher.raum === nachher.raum);
    }
  }

  // --- halfway every working path is shut and nothing flows ---------------
  const stroemeAn = (namen) => seite.evaluate((ns) => ns.map((n) => {
    const g = document.querySelector(`[data-strom="${n}"]`);
    if (!g) return { n, kugeln: 0, gruppe: 1, kugel: 1 };
    const kugeln = [...g.querySelectorAll("circle")];
    return { n, kugeln: kugeln.length, gruppe: Number(getComputedStyle(g).opacity),
      kugel: Math.max(0, ...kugeln.map((c) => Number(getComputedStyle(c).opacity))) };
  }), namen);
  const sichtbarkeit = (n) => seite.evaluate((name) => {
    const g = document.querySelector(`[data-strom="${name}"]`);
    return Number(getComputedStyle(g).opacity) * Math.max(0, ...[...g.querySelectorAll("circle")].map((c) => Number(getComputedStyle(c).opacity)));
  }, n);
  const stille = () => seite.waitForFunction(() => ["1-2", "2-3", "st"].every((n) => {
    const g = document.querySelector(`[data-strom="${n}"]`);
    return g && Number(getComputedStyle(g).opacity) < 0.05;
  }), null, { timeout: 4000, polling: 50 }).then(() => true, () => false);
  for (const name of ["nc", "no"]) {
    await seite.evaluate((n) => { window.__figur.stelle(0.5, n); window.__figur.weiter(); }, name);
    const still = await stille();
    await zweiBilder();
    const s = await stroemeAn(["1-2", "2-3", "st"]);
    // Not vacuous: every stream must exist and carry particles, and both the
    // group and every particle in it must be transparent.
    const offen = s.filter((x) => x.kugeln === 0 || x.gruppe >= 0.05 || x.kugel >= 0.05)
      .map((x) => `${x.n} (${x.kugeln} Teilchen, Gruppe ${x.gruppe.toFixed(2)}, Teilchen ${x.kugel.toFixed(2)})`);
    V(`${tag(name)}, Schieber auf 50 %: kein Weg strömt${offen.length ? " — " + offen.join(", ") : ""}`, still && offen.length === 0);
    // The same measurement sees flow where there is some.
    const weg = name === "nc" ? "1-2" : "2-3";
    await seite.evaluate((n) => { window.__figur.stelle(1, n); window.__figur.weiter(); }, name);
    const fliesst = await seite.waitForFunction((w) => {
      const g = document.querySelector(`[data-strom="${w}"]`);
      return Number(getComputedStyle(g).opacity) * Math.max(0, ...[...g.querySelectorAll("circle")].map((c) => Number(getComputedStyle(c).opacity))) > 0.3;
    }, weg, { timeout: 4000, polling: 50 }).then(() => true, () => false);
    V(`${tag(name)} betätigt: ${weg} strömt sichtbar (${(await sichtbarkeit(weg)).toFixed(2)})`, fliesst);
  }

  // --- symbol beside the card follows the spool ---------------------------
  const symbol = (wegName, rolle) => seite.evaluate(([w, r]) => {
    const svg = document.querySelector(".beifigur-symbol:not([hidden]) svg");
    const felder = svg.querySelector("[data-felder]");
    const m = felder.transform.baseVal.consolidate();
    const weg = svg.querySelector(`[data-feld="0"] [data-weg="${w}"]`);
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "g");
    probe.style.color = `var(--sz-${r})`;
    svg.append(probe);
    const gesucht = getComputedStyle(probe).color;
    probe.remove();
    return {
      x: m ? m.matrix.e : 0,
      feld: Number(svg.getAttribute("data-feldbreite")),
      farbeWeg: weg ? getComputedStyle(weg).fill : null,
      gesucht,
      farbeRahmen: getComputedStyle(svg.querySelector(".sz-rahmen")).stroke,
    };
  }, [wegName, rolle]);
  for (const [name, weg, rolle] of [["nc", "1-2", "stark"], ["no", "2-3", "blass"]]) {
    await seite.evaluate((n) => window.__figur.stelle(1, n), name);
    await zweiBilder();
    const a = await symbol(weg, rolle);
    V(`${tag(name)}: Symbol betätigt steht auf dem ersten Feld (x ${a.x})`, Math.abs(a.x) < 0.01);
    V(`${tag(name)}: im aktiven Feld ist ${weg} ${rolle === "stark" ? "kräftig" : "blass"} blau gezeichnet (${a.farbeWeg})`,
      a.farbeWeg === a.gesucht && a.farbeWeg !== a.farbeRahmen);
    await seite.evaluate(() => window.__figur.stelle(0));
    await zweiBilder();
    const r = await symbol(weg, rolle);
    V(`${tag(name)}: Symbol in Ruhe um ein Feld verschoben (x ${r.x}, Feld ${r.feld})`, r.feld > 0 && Math.abs(r.x + r.feld) < 0.01);
  }

  // --- readout from the model ---------------------------------------------
  await seite.fill("#druck", "3");
  await seite.dispatchEvent("#druck", "input");
  await seite.evaluate(() => { window.__figur.stelle(1, "nc"); window.__figur.weiter(); });
  await erwarte("die Anzeige p2 3,0 bar", () => document.querySelector("[data-readout]").textContent.startsWith("p2 3,0 bar"),
    null, { timeout: 5000, polling: 50 });
  const anzeige = (await seite.textContent("[data-readout]")).trim();
  V(`NC betätigt bei 3 bar zeigt die Anzeige p2 3,0 bar (${anzeige})`, anzeige.startsWith("p2 3,0 bar · Schaltzeit"));
  await seite.fill("#druck", "6");
  await seite.dispatchEvent("#druck", "input");

  // --- the signal lasts while the button is held --------------------------
  for (const name of ["nc", "no"]) {
    await seite.evaluate((n) => { window.__figur.stelle(0, n); window.__figur.weiter(); }, name);
    await seite.hover("#btn-signal");
    await seite.mouse.down();
    await seite.waitForTimeout(400);
    const gehalten = await anteil();
    V(`${tag(name)}: Signal gehalten, der Schieber steht in der betätigten Stellung (${gehalten.toFixed(3)})`, gehalten > 0.98);
    await seite.mouse.move(5, 5);
    await erwarte("die Rückstellung nach dem Loslassen", () => window.__figur.modell().anteil < 0.02, null, { timeout: 3000, polling: 50 });
    const los = await anteil();
    V(`${tag(name)}: Maus verlässt den gehaltenen Knopf, die Feder stellt zurück (${los.toFixed(3)})`, los < 0.02);
    await seite.mouse.up();
  }

  // --- taking apart while the signal is held ends it ------------------------
  // The pointer stays down on the signal button; "Zerlegen" is clicked from
  // the page, so nothing but the take-apart can end the signal. Afterwards the
  // signal is off, the spool is home (the spring has set it back), the button
  // is not pressed, and the held pointer does not bring the signal back.
  for (const name of ["nc", "no"]) {
    await seite.evaluate((n) => { window.__figur.stelle(0, n); window.__figur.weiter(); }, name);
    await seite.hover("#btn-signal");
    await seite.mouse.down();
    await erwarte("den gehaltenen Schieber in der betätigten Hälfte", () => window.__figur.modell().anteil > 0.5 && window.__figur.modell().signal14, null, { timeout: 3000, polling: 50 });
    const davor = await seite.evaluate(() => ({ s: window.__figur.modell().signal14, a: window.__figur.modell().anteil }));
    await seite.evaluate(() => document.getElementById("btn-explode").click());
    const zustandHalten = () => seite.evaluate(() => ({
      s: window.__figur.modell().signal14, a: window.__figur.modell().anteil,
      knopf: document.getElementById("btn-signal").getAttribute("aria-pressed"), zerlegt: window.__figur.zerlegt(),
    }));
    const sofort = await zustandHalten();
    await erwarte("das Auseinanderfahren", () => window.__figur.offen() > 0.3, null, { timeout: 8000, polling: 50 });
    await rahmen();
    const spaeter = await zustandHalten();
    V(`${tag(name)}: Zerlegen während des Haltens (vorher Signal ${davor.s}, Schieber ${davor.a.toFixed(2)}): Signal aus, Feder hat zurückgestellt, Knopf nicht gedrückt, bleibt so`,
      davor.s === true && davor.a > 0.5 && sofort.zerlegt === true
      && !sofort.s && sofort.a === 0 && sofort.knopf === "false"
      && !spaeter.s && spaeter.a === 0 && spaeter.knopf === "false");
    await seite.mouse.up();
    await seite.keyboard.press("Escape");
    await erwarte("den Zusammenbau", () => window.__figur.offen() < 0.02, null, { timeout: 30000 });
    const zusammen = await zustandHalten();
    V(`${tag(name)}: nach dem Zusammenbau ist der Schieber in Ruhe und kein Signal aktiv (${zusammen.a})`, !zusammen.s && zusammen.a === 0);
  }

  // --- the variant switch swaps what is drawn -----------------------------
  // Measured as drawn boxes: the spool and its air, the pilot number, the
  // symbol, the button text and the card's hint.
  const gezeigt = () => seite.evaluate(() => {
    const flaeche = (sel) => [...document.querySelectorAll(sel)]
      .map((el) => el.getBoundingClientRect()).reduce((s, r) => s + r.width * r.height, 0);
    return {
      nc: flaeche('.iso-stage [data-variante="nc"]'),
      no: flaeche('.iso-stage [data-variante="no"]'),
      symbolNc: flaeche('.beifigur-symbol[data-variante="nc"] svg'),
      symbolNo: flaeche('.beifigur-symbol[data-variante="no"] svg'),
      knopf: document.getElementById("btn-signal").textContent,
      titel: document.getElementById("btn-signal").title,
      pressed: document.getElementById("btn-bauart").getAttribute("aria-pressed"),
      hinweis: document.querySelector('[data-corner="hint"]').textContent,
    };
  });
  const zeigeNur = (g, name) => {
    const anderer = name === "nc" ? "no" : "nc";
    const Name = (s) => s[0].toUpperCase() + s.slice(1);
    return g[name] > 0 && g[anderer] === 0 && g["symbol" + Name(name)] > 0 && g["symbol" + Name(anderer)] === 0;
  };
  await seite.evaluate(() => { window.__figur.stelle(0, "nc"); window.__figur.weiter(); });
  const alsNc = await gezeigt();
  V(`NC: Schieber, Luft, Nummer und Symbol des NC gezeichnet, die des NO nicht (${Math.round(alsNc.nc)} / ${Math.round(alsNc.no)} px²)`, zeigeNur(alsNc, "nc"));
  V(`NC: Knopf „${alsNc.knopf}“, Hinweis „${alsNc.hinweis}“`, alsNc.knopf === "Signal 12" && /Signal 12/.test(alsNc.hinweis + alsNc.titel) && alsNc.pressed === "false");
  await seite.click("#btn-bauart");
  const alsNo = await gezeigt();
  V(`NO: Schieber, Luft, Nummer und Symbol des NO gezeichnet, die des NC nicht (${Math.round(alsNo.no)} / ${Math.round(alsNo.nc)} px²)`, zeigeNur(alsNo, "no"));
  V(`NO: Knopf „${alsNo.knopf}“, Hinweis „${alsNo.hinweis}“, Schalter gedrückt`,
    alsNo.knopf === "Signal 10" && /Signal 10/.test(alsNo.hinweis + alsNo.titel) && alsNo.pressed === "true");
  V("das 3/2 bietet nur monostabil an: kein Bistabil-Schalter", (await seite.evaluate(() => !document.getElementById("btn-12") && !document.getElementById("btn-14"))));
  await seite.click("#btn-bauart");

  // --- changing the variant mid-switch ------------------------------------
  for (const [von, nach] of [["nc", "no"], ["no", "nc"]]) {
    await seite.evaluate((n) => { window.__figur.stelle(0, n); window.__figur.weiter(); }, von);
    await seite.fill("#zeitlupe", "50");
    await seite.dispatchEvent("#zeitlupe", "input");
    await seite.evaluate(() => window.__figur.signal(true));
    await erwarte("den Schieber unterwegs", () => { const a = window.__figur.modell().anteil; return a > 0.05 && a < 0.95; },
      null, { timeout: 4000, polling: "raf" });
    const unterwegs = await anteil();
    await seite.click("#btn-bauart");
    const nach1 = await seite.evaluate(() => ({ a: window.__figur.modell().anteil, s: window.__figur.modell().signal14, v: window.__figur.variante() }));
    await rahmen();
    const ruhig = await anteil();
    const g = await gezeigt();
    V(`${tag(von)} mitten im Umschalten (${unterwegs.toFixed(2)}) nach ${tag(nach)} gewechselt: in Ruhe, kein Signal (${nach1.a}, danach ${ruhig})`,
      unterwegs > 0.05 && unterwegs < 0.95 && nach1.a === 0 && ruhig === 0 && !nach1.s && nach1.v === nach);
    V(`${tag(nach)} nach dem Wechsel: gezeichneter Schieber, Nummer, Symbol und Knopf gehören zur neuen Bauart`,
      zeigeNur(g, nach) && g.knopf === (nach === "nc" ? "Signal 12" : "Signal 10"));
    V("nach dem Wechsel ist das Signal nicht gedrückt", (await seite.getAttribute("#btn-signal", "aria-pressed")) === "false");
    await seite.fill("#zeitlupe", "1");
    await seite.dispatchEvent("#zeitlupe", "input");
  }
  // Back to NC.
  if ((await seite.evaluate(() => window.__figur.variante())) !== "nc") await seite.click("#btn-bauart");

  // --- the leader lines end on a drawn part of their assembly, in both variants --
  // Stricter than the shared check, which sums up boxes: here the page's own
  // hit test decides. The leader is read from the drawn <line> of each number
  // (its end towards the part, in screen coordinates). It stops short of its
  // anchor by design, so the probe goes on along the line's own direction for
  // the line's own length; at every step a ring of points within 4 px is
  // looked at, and one of the elements drawn there has to belong to the
  // number's assembly and be visible (not hidden, opacity above 0). The
  // number of numbers is the number of legend entries.
  const streng = async () => {
    await erwarte("die zerlegte Figur", () => window.__figur.offen() > 0.99, null, { timeout: 20000 });
    await seite.waitForTimeout(2500);        // the last springs settle, as in the shared check
    return seite.evaluate(() => {
      document.querySelector(".iso-stage").scrollIntoView({ block: "center" });
      const piece = {};
      for (const b of document.querySelectorAll(".pickbtn")) piece[b.querySelector(".picknr").textContent.trim()] = b.dataset.pick;
      const eintraege = Object.keys(piece).length;
      const sichtbar = (el, id) => {
        const g = el.closest("[data-g]");
        if (!g || g.dataset.piece !== id) return false;
        for (let e = el; e && e !== document.body; e = e.parentElement) {
          if (e.hasAttribute("hidden")) return false;
          const cs = getComputedStyle(e);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) <= 0) return false;
        }
        return true;
      };
      const daneben = [];
      let gezaehlt = 0;
      for (const g of document.querySelectorAll(".iso-nums > g")) {
        if (Number(g.getAttribute("opacity")) <= 0.5) continue;
        const nr = g.querySelector("text").textContent.trim();
        const line = g.querySelector("line");
        const ctm = line.getScreenCTM();
        const auf = (x, y) => { const pt = line.ownerSVGElement.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(ctm); };
        const teil = auf(Number(line.getAttribute("x1")), Number(line.getAttribute("y1")));
        const fern = auf(Number(line.getAttribute("x2")), Number(line.getAttribute("y2")));
        const laenge = Math.hypot(teil.x - fern.x, teil.y - fern.y);
        const ux = (teil.x - fern.x) / laenge, uy = (teil.y - fern.y) / laenge;
        let treffer = null;
        for (let t = 0; t <= laenge && treffer === null; t += 1) {
          for (const [dx, dy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) {
            const q = { x: teil.x + ux * t + dx, y: teil.y + uy * t + dy };
            if (document.elementsFromPoint(q.x, q.y).some((el) => sichtbar(el, piece[nr]))) { treffer = t; break; }
          }
        }
        gezaehlt += 1;
        if (treffer === null) daneben.push(`${nr} ${piece[nr]}`);
      }
      return { gezaehlt, eintraege, daneben };
    });
  };
  for (const name of ["nc", "no"]) {
    if ((await seite.evaluate(() => window.__figur.variante())) !== name) await seite.click("#btn-bauart");
    await seite.click("#btn-explode");
    const r = await streng();
    V(`${tag(name)} zerlegt: jede Nummer trifft ein sichtbar gezeichnetes Teil ihrer Baugruppe (${r.gezaehlt} von ${r.eintraege})${r.daneben.length ? " — daneben: " + r.daneben.join(", ") : ""}`,
      r.gezaehlt === r.eintraege && r.eintraege > 0 && r.daneben.length === 0);
    await seite.keyboard.press("Escape");
    await erwarte("den Zusammenbau", () => window.__figur.offen() < 0.02, null, { timeout: 30000 });
  }
  if ((await seite.evaluate(() => window.__figur.variante())) !== "nc") await seite.click("#btn-bauart");

  // --- taking apart stops the automatic -----------------------------------
  if ((await seite.getAttribute("#btn-auto", "aria-pressed")) !== "true") await seite.click("#btn-auto");
  await seite.click("#btn-explode");
  V("Zerlegen stoppt die Automatik", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");
  V("beim Zerlegen ist kein Signal aktiv", !(await seite.evaluate(() => window.__figur.modell().signal14)));
  // Back together, so the shared take-apart check that follows starts from rest.
  await seite.keyboard.press("Escape");
  await erwarte("den Zusammenbau", () => window.__figur.offen() < 0.02, null, { timeout: 30000 });

  // --- a fresh load with ?variante=no: the valve is the NO one from the start --
  // Last, because it reloads the page; the shared check goes on with a fresh
  // NC page (the mode is kept in the browser's storage).
  {
    const adresse = seite.url();
    const url = new URL(adresse);
    url.search = "?variante=no";
    await seite.goto(url.href, { waitUntil: "domcontentloaded" });
    const g = await seite.evaluate(() => {
      const flaeche = (sel) => [...document.querySelectorAll(sel)].map((el) => el.getBoundingClientRect()).reduce((s, r) => s + r.width * r.height, 0);
      return {
        anzeige: document.querySelector("[data-readout]").textContent.trim(),
        knopf: document.getElementById("btn-signal").textContent,
        no: flaeche('.iso-stage [data-variante="no"]'), nc: flaeche('.iso-stage [data-variante="nc"]'),
        symbolNo: flaeche('.beifigur-symbol[data-variante="no"] svg'), symbolNc: flaeche('.beifigur-symbol[data-variante="nc"] svg'),
      };
    });
    V(`?variante=no: die Anzeige zeigt beim Laden sofort p2 6,0 bar (${g.anzeige})`, g.anzeige.startsWith("p2 6,0 bar"));
    V("?variante=no: sichtbarer Schieber und Symbol sind die des NO, der Knopf heißt „Signal 10“",
      g.knopf === "Signal 10" && g.no > 0 && g.nc === 0 && g.symbolNo > 0 && g.symbolNc === 0);
    await seite.goto(adresse, { waitUntil: "networkidle" });
  }
}
