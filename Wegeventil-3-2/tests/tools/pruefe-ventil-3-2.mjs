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

  // --- rooms: "stronger" is the fill of room 1, which always holds the supply --
  const raum = (n) => seite.evaluate((nr) => {
    const el = document.querySelector(`[data-raum="${nr}"]:not([hidden])`) ?? document.querySelector(`[data-raum="${nr}"]`);
    // Rooms of the hidden variant are hidden themselves; take one that is drawn.
    const alle = [...document.querySelectorAll(`[data-raum="${nr}"]`)].filter((e) => e.getBoundingClientRect().width > 0);
    const f = getComputedStyle(alle[0] ?? el).fill;
    return f && f !== "none" ? f : "none";
  }, String(n));
  const bei = async (name, stellung) => {
    await seite.evaluate(([n, s]) => { window.__figur.stelle(s, n); window.__figur.weiter(); }, [name, stellung]);
    await seite.waitForTimeout(1200);      // > 0,8 s of model time at Zeitlupe 1
    return { r1: await raum(1), r2: await raum(2) };
  };
  const erwartung = { nc: { ruhe: false, betaetigt: true }, no: { ruhe: true, betaetigt: false } };
  for (const name of ["nc", "no"]) {
    const ruhe = await bei(name, 0);
    V(`${tag(name)} in Ruhe: Raum 2 ${erwartung[name].ruhe ? "kräftig" : "nicht kräftig"} (${ruhe.r2} / Zufuhr ${ruhe.r1})`,
      (ruhe.r2 === ruhe.r1 && ruhe.r1 !== "none") === erwartung[name].ruhe);
    const akt = await bei(name, 1);
    V(`${tag(name)} betätigt: Raum 2 ${erwartung[name].betaetigt ? "kräftig" : "nicht kräftig"} (${akt.r2} / Zufuhr ${akt.r1})`,
      (akt.r2 === akt.r1 && akt.r1 !== "none") === erwartung[name].betaetigt);
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
  for (const name of ["nc", "no"]) {
    await seite.evaluate((n) => { window.__figur.stelle(0.5, n); window.__figur.weiter(); }, name);
    await seite.waitForTimeout(500);
    const s = await stroemeAn(["1-2", "2-3", "st"]);
    const offen = s.filter((x) => x.kugeln === 0 || x.gruppe >= 0.05 || x.kugel >= 0.05)
      .map((x) => `${x.n} (${x.kugeln} Teilchen, Gruppe ${x.gruppe.toFixed(2)}, Teilchen ${x.kugel.toFixed(2)})`);
    V(`${tag(name)}, Schieber auf 50 %: kein Weg strömt${offen.length ? " — " + offen.join(", ") : ""}`, offen.length === 0);
    // The same measurement sees flow where there is some.
    const weg = name === "nc" ? "1-2" : "2-3";
    await seite.evaluate((n) => { window.__figur.stelle(1, n); window.__figur.weiter(); }, name);
    await seite.waitForTimeout(250);
    const fluss = await sichtbarkeit(weg);
    V(`${tag(name)} betätigt: ${weg} strömt sichtbar (${fluss.toFixed(2)})`, fluss > 0.3);
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
  await seite.waitForTimeout(1300);       // > 1 s of model time
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
    await seite.waitForTimeout(600);
    const los = await anteil();
    V(`${tag(name)}: Maus verlässt den gehaltenen Knopf, die Feder stellt zurück (${los.toFixed(3)})`, los < 0.02);
    await seite.mouse.up();
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
    await seite.waitForFunction(() => { const a = window.__figur.modell().anteil; return a > 0.05 && a < 0.95; },
      null, { timeout: 4000, polling: "raf" }).catch(() => {});
    const unterwegs = await anteil();
    await seite.click("#btn-bauart");
    const nach1 = await seite.evaluate(() => ({ a: window.__figur.modell().anteil, s: window.__figur.modell().signal14, v: window.__figur.variante() }));
    await seite.waitForTimeout(400);
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

  // --- the leader lines end on the anchor itself, in both variants ---------
  // Stricter than the shared check: not "some sample point on the leader hits
  // the assembly's box" but the point the leader points at lies on a part of
  // its assembly that this variant draws.
  const streng = async () => {
    await seite.waitForFunction(() => window.__figur.offen() > 0.99, null, { timeout: 20000 }).catch(() => {});
    await seite.waitForTimeout(2500);
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
        const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((a) => Number(line.getAttribute(a)));
        const z = 16 / 30;                               // the leader stops 16 px short of its anchor, runs 30 px
        const pt = line.ownerSVGElement.createSVGPoint();
        pt.x = x1 - (x2 - x1) * z; pt.y = y1 - (y2 - y1) * z;
        const q = pt.matrixTransform(ctm);
        const teile = [...document.querySelectorAll(`[data-g][data-piece="${piece[nr]}"]`)]
          .map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
        const abstand = Math.min(...teile.map((r) => Math.hypot(Math.max(r.left - q.x, 0, q.x - r.right), Math.max(r.top - q.y, 0, q.y - r.bottom))));
        gezaehlt += 1;
        if (!(abstand <= 4)) daneben.push(`${nr} ${Number.isFinite(abstand) ? Math.round(abstand) : "kein Teil"} px`);
      }
      return { gezaehlt, daneben };
    });
  };
  for (const name of ["nc", "no"]) {
    if ((await seite.evaluate(() => window.__figur.variante())) !== name) await seite.click("#btn-bauart");
    await seite.click("#btn-explode");
    const r = await streng();
    V(`${tag(name)} zerlegt: jede Nummer endet streng auf einem sichtbaren Teil ihrer Baugruppe (${r.gezaehlt})${r.daneben.length ? " — daneben: " + r.daneben.join(", ") : ""}`,
      r.gezaehlt === 11 && r.daneben.length === 0);
    await seite.keyboard.press("Escape");
    await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  }
  if ((await seite.evaluate(() => window.__figur.variante())) !== "nc") await seite.click("#btn-bauart");

  // --- taking apart stops the automatic -----------------------------------
  if ((await seite.getAttribute("#btn-auto", "aria-pressed")) !== "true") await seite.click("#btn-auto");
  await seite.click("#btn-explode");
  V("Zerlegen stoppt die Automatik", (await seite.getAttribute("#btn-auto", "aria-pressed")) === "false");
  V("beim Zerlegen ist kein Signal aktiv", !(await seite.evaluate(() => window.__figur.modell().signal14)));
  // Back together, so the shared take-apart check that follows starts from rest.
  await seite.keyboard.press("Escape");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});

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
