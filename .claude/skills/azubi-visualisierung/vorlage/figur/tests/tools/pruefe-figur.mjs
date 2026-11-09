// The browser test every figure in the collection has to pass.
//
//   python3 -m http.server 8311 --bind 127.0.0.1 &
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/<Ordner>/ [<Ordner>/tests/tools/pruefe-<name>.mjs]
//
// It checks what the browser actually draws, never "is the class set": a class
// nobody styled does nothing, and that mistake has been shipped before. Every
// check runs in both colour modes.
//
// The checks here hold for any figure. What only one component can promise
// (which chamber fills, which number the readout shows) lives in an optional
// second module: its default export is called once per colour mode as
// `await extra({ seite, V, modus, fuehrungen })`, after the legend checks and
// before the figure is taken apart. `fuehrungen(seite)` is the leader-line
// measurement below, for a module that takes the figure apart in a state of
// its own (another variant) and wants the same rule checked there.
//
// Playwright lives outside the repo (repo rule: no npm packages here).
// PLAYWRIGHT and CHROME_PATH override where it is looked for.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const pwRaw = (await import(process.env.PLAYWRIGHT ?? "/opt/node-tools/node_modules/playwright/index.js")).default;
const { chromium } = pwRaw;
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const URL = process.argv[2];
if (!URL) {
  console.error("Aufruf: node pruefe-figur.mjs <url> [zusatzpruefungen.mjs]");
  process.exit(2);
}
const extra = process.argv[3]
  ? (await import(pathToFileURL(resolve(process.argv[3])).href)).default
  : null;

const fehler = [];
const ok = [];
const pruefe = (bedingung, was) => (bedingung ? ok : fehler).push(was);

/** WCAG contrast between two sRGB triples. */
function kontrast(a, b) {
  const kanal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const leucht = ([r, g, b2]) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b2);
  const la = leucht(a);
  const lb = leucht(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Parse a computed colour. getComputedStyle also returns
 * `color(srgb 0.64 0.64 0.64 / 0.7)` — floats, not bytes. Read as bytes that
 * once came out as 1.13:1 and hid a text nobody could read.
 */
function farbe(text) {
  const srgb = text.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (srgb) return [1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255));
  const zahlen = text.match(/[\d.]+/g);
  if (!zahlen) return null;
  return zahlen.slice(0, 3).map(Number);
}

/**
 * Every visible number, taken apart, must point at a part of its own assembly
 * that is actually drawn. A number hung on the centroid of parts that lie
 * apart points into empty space (pitfall 2); explode.mjs hangs it on the
 * nearest own part, and `anker` keeps it off parts a variant hides. Measured
 * on screen: each leader line is continued from its near end back to the point
 * it hangs on, and that stretch must meet (within a few px) the box of a drawn
 * part of the assembly (hidden parts have no box). Waits until the figure is
 * fully apart and its springs have settled.
 */
async function fuehrungen(seite) {
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
}

async function laufe(modus) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const konsole = [];
  seite.on("console", (m) => m.type() === "error" && konsole.push(m.text()));
  seite.on("pageerror", (e) => konsole.push(String(e)));
  await seite.addInitScript((m) => {
    try { localStorage.setItem("3d-druck.theme", m); localStorage.removeItem("3d-druck.kontrast"); } catch (e) { /* ignore */ }
  }, modus);
  await seite.goto(URL, { waitUntil: "networkidle" });
  const V = (name, wert) => pruefe(wert, `${modus}: ${name}`);

  // --- the figure must be there and assembled -----------------------------
  const haken = await seite.evaluate(() => Boolean(window.__figur));
  V("die Figur bietet einen Prüfhaken", haken);
  if (!haken) { await browser.close(); return; }

  V("startet zusammengebaut", (await seite.evaluate(() => window.__figur.offen())) < 0.01);
  V("der Kontrastregler startet bei 45 %", (await seite.inputValue("#kontrast")) === "45");

  // --- legend: one number per entry ---------------------------------------
  const zahlen = await seite.evaluate(() => ({
    knoepfe: document.querySelectorAll(".pickbtn").length,
    nummern: document.querySelectorAll(".iso-nums > g").length,
  }));
  V(`eine Nummer je Legendeneintrag (${zahlen.knoepfe}/${zahlen.nummern})`, zahlen.knoepfe === zahlen.nummern && zahlen.knoepfe >= 3);

  // --- hovering shows, clicking remembers; they are not the same ----------
  const ersterKnopf = ".pickbtn:first-child";
  await seite.hover(ersterKnopf);
  const beimZeigen = await seite.evaluate(() => document.querySelectorAll("[data-g].mark").length);
  V("Darüberfahren hebt hervor", beimZeigen > 0);
  await seite.mouse.move(5, 5);
  V("Darüberfahren merkt sich nichts", (await seite.evaluate(() => document.querySelectorAll("[data-g].mark").length)) === 0);

  await seite.click(ersterKnopf);
  await seite.waitForTimeout(320);          // the fade has a 0.2 s transition
  const nachKlick = await seite.evaluate(() => ({
    markiert: document.querySelectorAll("[data-g].mark").length,
    gedimmt: document.querySelectorAll("[data-g].dim").length,
    gedrueckt: document.querySelector(".pickbtn:first-child").getAttribute("aria-pressed"),
  }));
  V("ein Klick wählt aus und hält", nachKlick.markiert > 0 && nachKlick.gedimmt > 0 && nachKlick.gedrueckt === "true");

  // Not "is the class set" but what the browser draws with it.
  const gezeichnet = await seite.evaluate(() => {
    const m = document.querySelector("[data-g].mark");
    const d = document.querySelector("[data-g].dim");
    return { markDeckkraft: getComputedStyle(m).opacity, dimDeckkraft: getComputedStyle(d).opacity,
      markTon: getComputedStyle(m).getPropertyValue("--anatomy-mid").trim() };
  });
  V("die gewählte Baugruppe bleibt voll sichtbar", Number(gezeichnet.markDeckkraft) > 0.9);
  V("der Rest tritt wirklich zurück", Number(gezeichnet.dimDeckkraft) < 0.3);
  V("die Hervorhebung ändert die Töne wirklich", /^#|rgb/.test(gezeichnet.markTon));

  await seite.click(ersterKnopf);
  V("ein zweiter Klick hebt die Auswahl auf", (await seite.evaluate(() => document.querySelectorAll("[data-g].mark").length)) === 0);

  // --- what only this component can promise -----------------------------
  if (extra) await extra({ seite, V, modus, fuehrungen });

  // --- take apart and rebuild --------------------------------------------
  // Measured on the page, not in the viewport: a click scrolls its button into
  // view, and on a page taller than the window that scroll is no jump.
  const legendeOben = async () => (await (await seite.$(".iso-keys")).boundingBox()).y
    + (await seite.evaluate(() => scrollY));
  const vorher = await legendeOben();
  await seite.click("#btn-explode");
  await seite.waitForTimeout(2600);
  const offen = await seite.evaluate(() => window.__figur.offen());
  V(`zerlegt sich wirklich (offen ${offen.toFixed(2)})`, offen > 0.8);
  V("die Legende springt beim Zoomen nicht", Math.abs((await legendeOben()) - vorher) < 2);
  // A medium layer (air, oil, current) must not flow through a machine that
  // lies in pieces. Only checked where the figure has one.
  const medium = await seite.evaluate(() => {
    const m = document.querySelector("[data-luftlage]");
    return m ? Number(getComputedStyle(m).opacity) : null;
  });
  if (medium !== null) V("beim Zerlegen strömt nichts", medium < 0.1);
  // Outside first, 300 ms apart: the innermost assembly only starts moving
  // after (n - 1) * 300 ms. Wait for that rather than a time tuned to one figure.
  const sichtbar = () => [...document.querySelectorAll(".iso-nums > g")]
    .filter((g) => Number(g.getAttribute("opacity")) > 0.5).length;
  await seite.waitForFunction((n) => [...document.querySelectorAll(".iso-nums > g")]
    .filter((g) => Number(g.getAttribute("opacity")) > 0.5).length >= n, zahlen.knoepfe,
  { timeout: zahlen.knoepfe * 300 + 3000 }).catch(() => {});
  const nummernSichtbar = await seite.evaluate(sichtbar);
  V(`im zerlegten Zustand tragen die Baugruppen Nummern (${nummernSichtbar}/${zahlen.knoepfe})`, nummernSichtbar === zahlen.knoepfe);
  const fl = await fuehrungen(seite);
  V(`zerlegt zeigt jede Nummer auf ein Teil ihrer Baugruppe (${fl.gezaehlt})${fl.daneben.length ? " — daneben: " + fl.daneben.join(", ") : ""}`,
    fl.gezaehlt === zahlen.knoepfe && fl.daneben.length === 0);

  // Theme and contrast may change mid-flight without anything springing back.
  await seite.click("#btn-theme");
  await seite.fill("#kontrast", "80");
  await seite.dispatchEvent("#kontrast", "input");
  await seite.waitForTimeout(120);
  V("Themenwechsel mitten im Lauf wirft nichts um",
    (await seite.evaluate(() => window.__figur.offen())) > 0.5);
  await seite.click("#btn-theme");
  await seite.fill("#kontrast", "45");
  await seite.dispatchEvent("#kontrast", "input");

  // Escape breaks off and rebuilds: one assembly every 950 ms, plus the springs
  // settling. Waited for, not guessed, with a ceiling for a figure that hangs.
  await seite.keyboard.press("Escape");
  await seite.waitForFunction(() => window.__figur.offen() < 0.02, null, { timeout: 30000 }).catch(() => {});
  V(`setzt sich wieder zusammen (offen ${(await seite.evaluate(() => window.__figur.offen())).toFixed(2)})`,
    (await seite.evaluate(() => window.__figur.offen())) < 0.02);

  // --- every text readable ------------------------------------------------
  const schwach = await seite.evaluate(() => {
    const kanal = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const leucht = ([r, g, b]) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
    const lies = (t) => {
      const srgb = t.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
      if (srgb) return [1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255));
      const n = t.match(/[\d.]+/g);
      return n ? n.slice(0, 3).map(Number) : null;
    };
    const grund = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return lies(c);
      }
      return lies(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255];
    };
    const schlecht = [];
    for (const el of document.querySelectorAll("button, label, output, p, h2, a, .picknr, text")) {
      const t = (el.textContent || "").trim();
      if (!t || el.offsetParent === null) continue;
      const vorn = lies(getComputedStyle(el).color);
      const hinten = grund(el);
      if (!vorn || !hinten) continue;
      const v = (Math.max(leucht(vorn), leucht(hinten)) + 0.05) / (Math.min(leucht(vorn), leucht(hinten)) + 0.05);
      if (v < 4.5) schlecht.push(`${t.slice(0, 28)} ${v.toFixed(2)}:1`);
    }
    return schlecht;
  });
  V(`jeder Text hält 4,5:1${schwach.length ? " — " + schwach.slice(0, 4).join(", ") : ""}`, schwach.length === 0);

  // --- phone --------------------------------------------------------------
  await seite.setViewportSize({ width: 390, height: 844 });
  await seite.waitForTimeout(250);
  const quer = await seite.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  V(`kein Seitwärtsscrollen bei 390 px (${quer})`, quer <= 1);

  V(`keine Konsolenfehler${konsole.length ? " — " + konsole[0].slice(0, 80) : ""}`, konsole.length === 0);
  await browser.close();
}

await laufe("light");
await laufe("dark");

for (const z of ok) console.log("  ok   ", z);
for (const z of fehler) console.log("  FEHLT", z);
console.log(fehler.length ? `\n${fehler.length} von ${ok.length + fehler.length} Prüfungen fehlgeschlagen` : `\nall checks passed (${ok.length})`);
process.exit(fehler.length ? 1 : 0);
void kontrast;
void farbe;
