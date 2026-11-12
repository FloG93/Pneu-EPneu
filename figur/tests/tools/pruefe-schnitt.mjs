// The shared browser checks of the section pages (the Schnitt family: figur/schnittseite.mjs).
//
// Everything that does not depend on the valve lives here once: the scale of the drawing, the slow
// motion and the automatic cycle at the load, what a legend entry says, that no particle runs over
// material (or outside the air), in which direction the particles run, the measured contrast of
// pressurised against vented air, the readout and the controls on a phone, the colour of the text, and
// what taking apart does (the cycle stops, the moving parts stand home, nothing flows). A page module
// (`<Ordner>/tests/tools/pruefe-<name>.mjs`, run by figur/tests/tools/pruefe-figur.mjs) keeps only what
// its valve alone promises and describes itself to this checker:
//
//   import { hilfen, schnittPruefungen } from "../../../figur/tests/tools/pruefe-schnitt.mjs";
//   export default async function pruefeNeu(ctx) {            // ctx = { seite, V, modus, fuehrungen }
//     const h = hilfen(ctx.seite, ctx.modus);                 // the toolbox (below)
//     await schnittPruefungen({ ...ctx, h, beschreibung: {…}, spezifisch: async () => { …the valve's own checks… } });
//   }
//
// Order: the checks at the load, then `spezifisch`, then the rest. Every shared check sets its own state
// first (through the description), so none of them depends on what `spezifisch` left behind.
//
// What the page's `window.__figur` must offer: `geometrie` (with LAENGE; HOEHE for the scale on the other
// axis), `offen()`, `weiter()`; for the pixel contrast `messpunkte` ({ raum: [x, z] } in mm) and
// `bildPunkt(x, z)`; with `luftwege: true` also `luftwege` (boxes [x0, x1, z0, z1] in mm) and `zuMm(x, y)`;
// with `nurBohrung` in a direction step `bahn(name)`. The page's drawing carries `data-mass` (the housing's
// cut face, bottom left, bottom right, top right, top left), `data-raum`, `data-strom`, `data-piece`,
// `data-lage`, `data-hub`, `[data-corner="hint"]`, `.leiste .regler`, `.lesetext`.
//
// The description (`beschreibung`), all functions run in the Node side with the page's `seite`:
//   stelle(zustand)            REQUIRED  settle the page in a state at rest (no particles); `zustand` is the
//                              page's own value (an array, usually)
//   zeitlupe                   true when the page has the slow-motion slider: it must start at 1/10
//   ruhe        [{ name, zustand }]                   REQUIRED  states at rest in which no particle may stand
//   stroemung   [{ name, richte, mindestens }]        REQUIRED  states WITH flow: `richte()` brings the page there and
//                              waits until particles are drawn; at least `mindestens` (default 0) must be visible
//   festeTeile  ["data-piece", …]                     REQUIRED  the solid parts no particle may lie over
//   luftwege    true         also check that every particle lies inside `__figur.luftwege`
//   richtung    [{ name, strom, richte, vorzeichen, schwelle, optionen }]  REQUIRED  `richte()` puts the stream in motion;
//                              the particles of `strom` must run `vorzeichen` (+1 / -1) at more than `schwelle` px
//                              per frame; `optionen` goes to `hilfen().lauf` (nurBohrung, dtMax, paare, versuche, deckkraft)
//   kontrast    { leer, faelle: [{ name, zustand, raum }], mitte: { name, zustand, raum, voll }, min }   optional
//                              6 bar against 0 bar, measured on a screenshot pixel in the middle of the room
//   abhebung    { name, zustand, raum, teil, rand, min }   optional  a part stands out of the strong air by `min`:1
//   telefon     { zustand, regler, zeilenMin, zusatz }   REQUIRED  at 390 px: the readout (breaks into at least
//                              `zeilenMin` lines when given) lies inside the window and on no hint, every slider of the
//                              list `regler` (css selectors; the house contrast slider is always added) lies inside, with
//                              its label when it has one (`.regler`); `zusatz()` adds the page's own measurements
//   lesetext    ["css selector", …]   further elements of the explanatory text that must hold 4,5:1
//   zerlegen    { zustand, hubTeile, hubName, zusatz }   REQUIRED  taking apart: the cycle stops, the elements of the
//                              selector `hubTeile` stand home (no transform) and nothing flows; `zusatz()` while apart
import { inflateSync } from "node:zlib";

/** Relative luminance of an sRGB byte triple. */
export function leucht([r, g, b]) {
  const k = (v) => { const t = v / 255; return t <= 0.03928 ? t / 12.92 : ((t + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * k(r) + 0.7152 * k(g) + 0.0722 * k(b);
}

/** WCAG contrast of two sRGB byte triples. */
export function kontrastVon(a, b) {
  const la = leucht(a);
  const lb = leucht(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Read a computed colour as bytes. getComputedStyle also returns `color(srgb 0.64 0.64 0.64 / 0.7)`: floats, not
 * bytes — read as bytes that once came out as 1.13:1.
 */
export function farbeAus(text) {
  const srgb = text.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (srgb) return [1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255));
  const zahlen = text.match(/[\d.]+/g);
  return zahlen ? zahlen.slice(0, 3).map(Number) : null;
}

/** The colour of the one pixel of a 1×1 PNG (a screenshot of a clip of one pixel). */
export function pixelAusPng(png) {
  let o = 8;
  const idat = [];
  while (o < png.length) {
    const laenge = png.readUInt32BE(o);
    if (png.toString("ascii", o + 4, o + 8) === "IDAT") idat.push(png.subarray(o + 8, o + 8 + laenge));
    o += 12 + laenge;
  }
  const roh = inflateSync(Buffer.concat(idat));
  return [roh[1], roh[2], roh[3]];     // roh[0] is the filter byte of the single row
}

/** Sentences of a text: a full stop, ! or ? followed by a space ends one (decimal commas do not). */
export const satzZahl = (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean).length;

/** What is wrong with a page's description (a list of sentences; empty when it is complete). */
export function beschreibungPruefen(b) {
  const p = [];
  const funktion = (v) => typeof v === "function";
  const liste = (v) => Array.isArray(v) && v.length > 0;
  if (!b || !funktion(b.stelle)) p.push("stelle(zustand) fehlt");
  if (!b) return p;
  if (!Array.isArray(b.ruhe)) p.push("ruhe fehlt (Liste von { name, zustand })");
  else if (b.ruhe.some((r) => !r.name || !r.zustand)) p.push("ruhe: jeder Eintrag braucht name und zustand");
  if (!liste(b.stroemung)) p.push("stroemung fehlt (Liste von { name, richte })");
  else if (b.stroemung.some((s) => !s.name || !funktion(s.richte))) p.push("stroemung: jeder Eintrag braucht name und richte()");
  if (!liste(b.festeTeile)) p.push("festeTeile fehlt (Liste der data-piece-Namen)");
  if (!liste(b.richtung)) p.push("richtung fehlt (Liste von { name, strom, richte, vorzeichen })");
  else {
    for (const r of b.richtung) {
      if (!r.name || !r.strom || !funktion(r.richte)) p.push("richtung: jeder Eintrag braucht name, strom und richte()");
      if (r.vorzeichen !== 1 && r.vorzeichen !== -1) p.push(`richtung ${r.name}: vorzeichen ist +1 oder -1`);
    }
  }
  if (!b.telefon || !b.telefon.zustand || !Array.isArray(b.telefon.regler)) p.push("telefon fehlt ({ zustand, regler: [Selektoren] })");
  if (!b.zerlegen || !b.zerlegen.zustand || !b.zerlegen.hubTeile || !b.zerlegen.hubName) p.push("zerlegen fehlt ({ zustand, hubTeile, hubName })");
  if (b.kontrast && (!b.kontrast.leer || !liste(b.kontrast.faelle))) p.push("kontrast: leer und faelle fehlen");
  return p;
}

/** The toolbox the page modules and the shared checks use; it holds nothing about a valve. */
export function hilfen(seite, modus) {
  /** n animation frames (a state wait that does not depend on how loaded the machine is). */
  const nachBildern = (n = 3) => seite.evaluate((k) => new Promise((fertig) => {
    let i = 0;
    const schritt = () => (++i >= k ? fertig() : requestAnimationFrame(schritt));
    requestAnimationFrame(schritt);
  }), n);
  const text = () => seite.textContent("[data-readout]");
  /** Luminance of the drawn fill of a room (computed style: floats too). */
  const hell = (sel) => seite.evaluate((s) => {
    const t = getComputedStyle(document.querySelector(s)).fill;
    const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const c = srgb ? [1, 2, 3].map((i) => Number(srgb[i])) : (t.match(/[\d.]+/g) || []).slice(0, 3).map((v) => Number(v) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }, sel);
  // Under pressure is the stronger tone: darker on paper, lighter at night.
  const staerker = (voll, leer, d = 0.04) => (modus === "light" ? voll < leer - d : voll > leer + d);
  const gleich = (a, b, d = 0.01) => Math.abs(a - b) < d;
  /** Union box of every element that matches, in screen pixels. */
  const kasten = (sel) => seite.evaluate((s) => {
    const r = [...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
    return { l: Math.min(...r.map((b) => b.left)), t: Math.min(...r.map((b) => b.top)), r: Math.max(...r.map((b) => b.right)), b: Math.max(...r.map((b) => b.bottom)) };
  }, sel);
  /**
   * The scale, measured on the drawing: the housing's cut face is LAENGE × HOEHE mm (the page marks it data-mass).
   * `mm` is the screen vector of one millimetre along the bore, `pxX` its length, `pxZ` the pixels per mm upwards.
   */
  const masstab = async () => {
    const GEO = await seite.evaluate(() => window.__figur.geometrie);
    return seite.evaluate((G) => {
      const pfad = document.querySelector("[data-mass]");
      const zahlen = pfad.getAttribute("d").match(/-?[\d.]+/g).map(Number);
      const ctm = pfad.getScreenCTM();
      const punkte = [0, 2, 4, 6].filter((i) => i + 1 < zahlen.length).map((i) => {
        const q = pfad.ownerSVGElement.createSVGPoint(); q.x = zahlen[i]; q.y = zahlen[i + 1];
        const r = q.matrixTransform(ctm);
        return { x: r.x, y: r.y };
      });
      const mm = { x: (punkte[1].x - punkte[0].x) / G.LAENGE, y: (punkte[1].y - punkte[0].y) / G.LAENGE };
      const pxZ = G.HOEHE && punkte[3] ? Math.hypot(punkte[3].x - punkte[0].x, punkte[3].y - punkte[0].y) / G.HOEHE : null;
      return { punkte, mm, pxX: Math.hypot(mm.x, mm.y), pxZ };
    }, GEO);
  };
  /** Visible particles per route: how many, and their mean opacity. */
  const teilchen = () => seite.evaluate(() => {
    const aus = {};
    for (const g of document.querySelectorAll("[data-strom]")) {
      const op = [...g.querySelectorAll("circle")].map((c) => Number(c.getAttribute("opacity"))).filter((v) => v > 0.05);
      aus[g.dataset.strom] = { n: op.length, mittel: op.length ? op.reduce((a, b) => a + b, 0) / op.length : 0 };
    }
    return aus;
  });
  /** Wait until some route shows at least n particles (an afterglow lasts half a second). */
  const warteIrgendwoTeilchen = (n) => seite.waitForFunction((k) => [...document.querySelectorAll("[data-strom] circle")]
    .filter((c) => Number(c.getAttribute("opacity")) > 0.05).length >= k, n, { timeout: 4000 }).then(() => true, () => false);
  const warteTeilchen = (name, n) => seite.waitForFunction(([nm, k]) => [...document.querySelectorAll(`[data-strom="${nm}"] circle`)]
    .filter((c) => Number(c.getAttribute("opacity")) > 0.05).length >= k, [name, n], { timeout: 4000 }).then(() => true, () => false);
  /** Slow-motion factor 1/n through the slider. */
  const zeitlupe = async (n) => {
    await seite.fill("#zeitlupe", String(n));
    await seite.dispatchEvent("#zeitlupe", "input");
  };
  const pixelAnClient = async ([px, py]) => pixelAusPng(await seite.screenshot({ clip: { x: Math.floor(px), y: Math.floor(py), width: 1, height: 1 }, type: "png" }));
  /** The colour at a point of the cut plane (mm: x along the bore, z up), composited as the screen shows it. */
  const pixelAnBild = async ([x, z]) => pixelAnClient(await seite.evaluate(([a, b]) => window.__figur.bildPunkt(a, b), [x, z]));
  /**
   * The direction a stream's particles run: two samples one frame apart, read inside the page (a round trip per
   * sample let a loaded machine stretch the gap until the short streams wrapped round and the sign flipped). A stream's
   * particles all jump by one spacing when its phase wraps: such a jump is left out (a step is under 6 px) and the
   * median of the pairs counts. Returns the median step in px per frame (both screen coordinates grow along the
   * route's first stretch in the direction of the flow) and how many pairs it is made of.
   *   nurBohrung  count only particles on the first stretch of the route (`__figur.bahn(name)`)
   *   dtMax       a pair whose frames are further apart than this many ms is dropped
   */
  const lauf = (name, { nurBohrung = false, dtMax = 35, paare = 5, versuche = 40, deckkraft = 0.1 } = {}) => seite.evaluate(async ([n, o]) => {
    const lies = () => [...document.querySelectorAll(`[data-strom="${n}"] circle`)]
      .map((c) => [Number(c.getAttribute("opacity")), Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
    const bild = () => new Promise((r) => requestAnimationFrame(r));
    const mitteVon = (liste) => { const l = liste.slice().sort((x, y) => x - y); return l.length ? l[Math.floor(l.length / 2)] : 0; };
    let xMin = -Infinity, xMax = Infinity;
    if (o.nurBohrung) {
      const bahn = window.__figur.bahn(n);
      xMax = Math.max(bahn.punkte[0][0], bahn.punkte[1][0]) + 2;
      xMin = Math.min(bahn.punkte[0][0], bahn.punkte[1][0]) - 2;
    }
    const ergebnis = [];
    for (let versuch = 0; versuch < o.versuche && ergebnis.length < o.paare; versuch += 1) {
      const t0 = await bild(); const a = lies(); const t1 = await bild(); const b = lies();
      if (t1 - t0 >= o.dtMax) continue;
      const d = a.map((p, i) => (p[0] > o.deckkraft && b[i][0] > o.deckkraft && p[1] >= xMin && p[1] <= xMax ? (b[i][1] - p[1]) + (b[i][2] - p[2]) : null))
        .filter((v) => v !== null && Math.abs(v) < 6);
      if (d.length) ergebnis.push(mitteVon(d));
    }
    return { n: ergebnis.length, schritt: mitteVon(ergebnis) };
  }, [name, { nurBohrung, dtMax, paare, versuche, deckkraft }]);
  /**
   * Every visible particle: it lies on no solid part (the part's `data-piece` is in `feste`; a layer that is blended
   * out and the air's own bore of a cut fitting are not there), and with `mitWegen` also inside an air passage of the
   * page's `luftwege` (converted back from the drawing to the cut plane).
   */
  const luftPruefung = (feste, mitWegen = false) => seite.evaluate(([f, wegen]) => {
    const falsch = [];
    let gezaehlt = 0;
    for (const cc of document.querySelectorAll("[data-strom] circle")) {
      if (Number(cc.getAttribute("opacity")) < 0.2) continue;
      gezaehlt += 1;
      const name = cc.closest("[data-strom]").dataset.strom;
      if (wegen) {
        const [mx, mz] = window.__figur.zuMm(Number(cc.getAttribute("cx")), Number(cc.getAttribute("cy")));
        const tol = 0.4;
        if (!window.__figur.luftwege.some(([x0, x1, z0, z1]) => mx >= x0 - tol && mx <= x1 + tol && mz >= z0 - tol && mz <= z1 + tol)) {
          falsch.push(`${name} außerhalb der Luftwege bei ${mx.toFixed(1)} / ${mz.toFixed(1)} mm`);
          continue;
        }
      }
      const r = cc.getBoundingClientRect();
      for (const el of document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)) {
        // a drawn layer that is blended out (the whole-part layer, the lip's other shape) is not there
        const lage = el.closest("[data-lippe], [data-lage]");
        if (lage && Number(getComputedStyle(lage).opacity) < 0.1) continue;
        if (el.closest("[data-hohl]")) continue;      // the air's own bore (shading and room) of a cut fitting
        const g = el.closest("[data-piece]");
        if (g && f.includes(g.dataset.piece)) { falsch.push(`${name} über ${g.dataset.piece}`); break; }
      }
    }
    return { gezaehlt, falsch };
  }, [feste, mitWegen]);
  return { nachBildern, text, hell, staerker, gleich, kasten, masstab, teilchen, warteIrgendwoTeilchen, warteTeilchen, zeitlupe,
    pixelAnClient, pixelAnBild, lauf, luftPruefung };
}

/**
 * The shared checks. `V(name, bedingung)` records one check (both colour modes are run by the caller);
 * `spezifisch(h)` is the page's own part, run after the checks at the load.
 */
export async function schnittPruefungen({ seite, V, modus, beschreibung: b, spezifisch = null, h = null }) {
  const probleme = beschreibungPruefen(b);
  if (probleme.length) throw new Error(`Beschreibung der Seite unvollständig: ${probleme.join("; ")}`);
  h = h ?? hilfen(seite, modus);
  const MESS_MIN = b.kontrast?.min ?? 2.4;
  const aria = (id) => seite.getAttribute(id, "aria-pressed");

  // --- at the load: the scale, the slow motion, the cycle, the legend ----------------------------------------
  const m = await h.masstab();
  V(`die Zeichnung hat einen Maßstab (${m.mm.x.toFixed(2)} / ${m.mm.y.toFixed(2)} px je mm längs der Bohrung)`, m.pxX > 3);
  if (b.zeitlupe) V("Zeitlupe beginnt bei 1/10", (await seite.inputValue("#zeitlupe")) === "10" && (await seite.textContent("#zeitlupe-wert")) === "1/10");
  V("die Automatik läuft beim Laden", (await aria("#btn-auto")) === "true");
  const knoepfe = await seite.evaluate(() => document.querySelectorAll(".pickbtn").length);
  const duenn = [];
  for (let i = 1; i <= knoepfe; i += 1) {
    await seite.click(`.pickbtn:nth-child(${i})`);
    const [nr, t] = await seite.evaluate((k) => [document.querySelector(`.pickbtn:nth-child(${k}) .picknr`).textContent.trim(), document.querySelector(".pickinfo").textContent], i);
    if (satzZahl(t) < 2) duenn.push(`${nr}: ${satzZahl(t)} Satz`);
    await seite.click(`.pickbtn:nth-child(${i})`);
  }
  V(`jeder Legendeneintrag erklärt sich beim Anklicken in mindestens zwei Sätzen (${knoepfe})${duenn.length ? " — " + duenn.join(", ") : ""}`, knoepfe >= 3 && duenn.length === 0);

  // --- what only this valve promises ----------------------------------------------------------------------------
  if (spezifisch) await spezifisch(h);

  // --- particles: none at rest; none on material, none outside the air --------------------------------------
  for (const r of b.ruhe) {
    await b.stelle(r.zustand);
    V(`${r.name}: es steht kein Teilchen`, Object.values(await h.teilchen()).every((x) => x.n === 0));
  }
  const vorhanden = await seite.evaluate(() => [...new Set([...document.querySelectorAll("[data-piece]")].map((e) => e.dataset.piece))]);
  const fehlen = b.festeTeile.filter((n) => !vorhanden.includes(n));
  V(`die festen Teile der Prüfung gibt es in der Zeichnung${fehlen.length ? " — fehlen: " + fehlen.join(", ") : ""}`, fehlen.length === 0);
  for (const z of b.stroemung) {
    await z.richte();
    const t = await h.luftPruefung(b.festeTeile, Boolean(b.luftwege));
    const noetig = z.mindestens ?? 0;
    V(`${z.name} mit Strömung: alle ${t.gezaehlt} Teilchen liegen ${b.luftwege ? "in den Luftwegen und " : ""}auf keinem festen Teil${t.falsch.length ? " — " + t.falsch.slice(0, 3).join(", ") : ""}`,
      t.falsch.length === 0 && t.gezaehlt >= noetig);
  }
  for (const s of b.richtung) {
    await s.richte();
    const l = await h.lauf(s.strom, s.optionen);
    const schwelle = s.schwelle ?? 0.2;
    V(`${s.name} (Schritt ${l.schritt.toFixed(2)} px, ${l.n} Paare)`, l.n > 0 && (s.vorzeichen > 0 ? l.schritt > schwelle : l.schritt < -schwelle));
  }

  // --- the drawn colour: pressurised and vented air can be told apart at a glance -----------------------
  // Measured on the composited picture: a pixel of the screenshot in the middle of each room (the air's tint over the
  // cut face and the bore's shading under it), pressure against none: at least 2,4:1 in both modes.
  if (b.kontrast) {
    const k = b.kontrast;
    const punkte = await seite.evaluate(() => window.__figur.messpunkte);
    await b.stelle(k.leer);
    const leer = {};
    for (const raum of Object.keys(punkte)) leer[raum] = await h.pixelAnBild(punkte[raum]);
    const voll = {};
    for (const f of k.faelle) {
      await b.stelle(f.zustand);
      voll[f.name] = await h.pixelAnBild(punkte[f.raum]);
    }
    const r = k.faelle.map((f) => kontrastVon(voll[f.name], leer[f.raum]));
    V(`Druck gegen drucklos, gezeichnet: ${k.faelle.map((f, i) => `${f.name} ${r[i].toFixed(2)}:1`).join(", ")} (mindestens ${MESS_MIN}:1)`, r.every((v) => v >= MESS_MIN));
    V("kräftig ist die gezeichnete Seite des Drucks: nachts heller, am Tag dunkler als die drucklose",
      k.faelle.every((f) => (modus === "light" ? leucht(voll[f.name]) < leucht(leer[f.raum]) : leucht(voll[f.name]) > leucht(leer[f.raum]))));
    if (k.mitte) {
      await b.stelle(k.mitte.zustand);
      const l = leucht(await h.pixelAnBild(punkte[k.mitte.raum]));
      const a = leucht(leer[k.mitte.raum]), c = leucht(voll[k.mitte.voll]);
      V(`${k.mitte.name} liegt gezeichnet zwischen drucklos und voll`, l > Math.min(a, c) && l < Math.max(a, c));
    }
  }
  if (b.abhebung) {
    // a part stands out of the strong air: either its fill or its edge differs from the room by 3:1
    const a = b.abhebung;
    const punkte = await seite.evaluate(() => window.__figur.messpunkte);
    await b.stelle(a.zustand);
    const t = await seite.evaluate(([teil, rand]) => {
      const r = document.querySelector(teil).getBoundingClientRect();
      return { mitte: [r.left + r.width / 2, r.top + r.height / 2], rand: getComputedStyle(document.querySelector(rand)).stroke };
    }, [a.teil, a.rand]);
    const fuellung = kontrastVon(await h.pixelAnClient(t.mitte), await h.pixelAnBild(punkte[a.raum]));
    const randFarbe = farbeAus(t.rand);              // `none` has no colour: then the edge does not count
    const kante = randFarbe ? kontrastVon(randFarbe, await h.pixelAnBild(punkte[a.raum])) : 0;
    V(`${a.name} hebt sich vom kräftigen Blau ab (Füllung ${fuellung.toFixed(2)}:1, Rand ${kante.toFixed(2)}:1)`, Math.max(fuellung, kante) >= (a.min ?? 3));
  }

  // --- the explanatory text is readable ------------------------------------------------------------------
  const lese = [".lesetext strong", ".lesetext em", ...(b.lesetext ?? [])].join(", ");
  const schwach = await seite.evaluate((sel) => {
    const kanal = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const leucht = ([r, g, b]) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
    const lies = (t) => { const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i); if (srgb) return [1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255)); const n = t.match(/[\d.]+/g); return n ? n.slice(0, 3).map(Number) : null; };
    const grund = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return lies(c); } return lies(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255]; };
    const schlecht = [];
    const alle = document.querySelectorAll(sel);
    for (const el of alle) {
      const vorn = lies(getComputedStyle(el).color), hinten = grund(el);
      const v = (Math.max(leucht(vorn), leucht(hinten)) + 0.05) / (Math.min(leucht(vorn), leucht(hinten)) + 0.05);
      if (v < 4.5) schlecht.push(`${el.textContent.trim().slice(0, 20)} ${v.toFixed(2)}:1`);
    }
    return { schlecht, n: alle.length };
  }, lese);
  V(`die hervorgehobenen Wörter und Tabellen des Erklärtexts halten 4,5:1 (${schwach.n} Elemente)${schwach.schlecht.length ? " — " + schwach.schlecht.join(", ") : ""}`,
    schwach.n > 0 && schwach.schlecht.length === 0);

  // --- the readout and the sliders stay inside the card on a phone ------------------------------------------
  const t = b.telefon;
  await b.stelle(t.zustand);
  await seite.setViewportSize({ width: 390, height: 844 });
  await seite.waitForFunction(() => innerWidth === 390);
  await h.nachBildern(3);
  const zeile = await seite.evaluate((reglerSel) => {
    const r = document.querySelector("[data-readout]").getBoundingClientRect();
    const hoehe = parseFloat(getComputedStyle(document.querySelector("[data-readout]")).lineHeight) || 14;
    // the readout grows upwards from its corner: it must not lie on the card's hint (when that is shown)
    const hint = document.querySelector('[data-corner="hint"]');
    const hr = hint && getComputedStyle(hint).display !== "none" ? hint.getBoundingClientRect() : null;
    const schneidet = hr ? !(r.right <= hr.left || r.left >= hr.right || r.bottom <= hr.top || r.top >= hr.bottom) : false;
    const regler = reglerSel.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const q = (el.closest(".regler") ?? el).getBoundingClientRect();
      return q.width > 0 && q.left >= 0 && q.right <= innerWidth;
    });
    return { l: r.left, r: r.right, w: innerWidth, zeilen: Math.round(r.height / hoehe), schneidet, hinweis: Boolean(hr), regler };
  }, [...t.regler, "#kontrast"]);
  V(`die Anzeige ${t.zeilenMin ? "bricht um und " : ""}liegt bei 390 px im Fenster (${zeile.l.toFixed(0)}…${zeile.r.toFixed(0)}${t.zeilenMin ? `, ${zeile.zeilen} Zeilen` : ""})`,
    zeile.l >= 0 && zeile.r <= zeile.w && zeile.zeilen >= (t.zeilenMin ?? 0));
  V(`die Anzeige liegt bei 390 px auf keinem Text der Karte (Hinweis ${zeile.hinweis ? "sichtbar" : "ausgeblendet"})`, !zeile.schneidet);
  V(`bei 390 px liegen alle ${zeile.regler.length} Regler im Fenster (${t.regler.join(", ")} und der Kontrastregler)`, zeile.regler.every(Boolean));
  if (t.zusatz) await t.zusatz();
  await seite.setViewportSize({ width: 1280, height: 900 });
  await seite.waitForFunction(() => innerWidth === 1280);
  await h.nachBildern(3);

  // --- taking apart: the cycle stops, everything stands home, nothing flows -----------------------------------
  const z = b.zerlegen;
  await b.stelle(z.zustand);
  if ((await aria("#btn-auto")) !== "true") await seite.click("#btn-auto");
  V("die Automatik ist vor dem Zerlegen an", (await aria("#btn-auto")) === "true");
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() > 0.9, null, { timeout: 15000 }).catch(() => {});
  V("Zerlegen beendet die Automatik", (await aria("#btn-auto")) === "false");
  // the parts go home within the first moments of taking apart: wait for that state, not for a time
  await seite.waitForFunction((sel) => [...document.querySelectorAll(sel)].every((e) => e.getAttribute("transform") === null)
    && [...document.querySelectorAll(".luft[data-luftlage]")].every((e) => Number(getComputedStyle(e).opacity) < 0.1), z.hubTeile, { timeout: 3000 }).catch(() => {});
  const lage = await seite.evaluate((sel) => ({
    hub: [...document.querySelectorAll(sel)].map((e) => e.getAttribute("transform")),
    strom: [...document.querySelectorAll(".luft[data-luftlage]")].map((e) => getComputedStyle(e).opacity),
  }), z.hubTeile);
  V(`zerlegt: ${z.hubName} steht auf dem Ausgangsplatz und nichts strömt (${lage.hub.length} bewegte Elemente)`,
    lage.hub.length > 0 && lage.hub.every((x) => x === null) && lage.strom.every((o) => Number(o) < 0.1));
  if (z.zusatz) await z.zusatz();
  await seite.click("#btn-explode");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  await h.nachBildern(3);
}
