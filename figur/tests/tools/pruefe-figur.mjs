// The browser test every figure in the collection has to pass.
//
//   python3 -m http.server 8311 --bind 127.0.0.1 &
//   node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Zylinder-Doppeltwirkend/
//
// It checks what the browser actually draws, never "is the class set": a class
// nobody styled does nothing, and that mistake has been shipped before. Every
// check runs in both colour modes.
//
// Playwright lives outside the repo (repo rule: no npm packages here).
import pwRaw from "/opt/node-tools/node_modules/playwright/index.js";

const { chromium } = pwRaw;
const URL = process.argv[2];
if (!URL) {
  console.error("Aufruf: node pruefe-figur.mjs <url>");
  process.exit(2);
}

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

async function laufe(modus) {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
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
  V(`eine Nummer je Legendeneintrag (${zahlen.knoepfe}/${zahlen.nummern})`, zahlen.knoepfe === zahlen.nummern && zahlen.knoepfe >= 8);

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

  // --- the air ------------------------------------------------------------
  const luft = async (stellung) => {
    await seite.evaluate((st) => window.__figur.stelle(100, st), stellung);
    await seite.waitForTimeout(120);
    return seite.evaluate(() => {
      const f = (s) => document.querySelector(s).getAttribute("fill");
      const sicht = (name) => {
        const g = document.querySelector(`[data-strom="${name}"]`);
        return Math.max(...[...g.querySelectorAll("circle")].map((c) => Number(c.getAttribute("opacity") || 0)));
      };
      return { a: f('[data-kammer="a"]'), b: f('[data-kammer="b"]'), e5: sicht("E5"), e3: sicht("E3") };
    });
  };
  const hell = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const aus = await luft("ausfahren");
  const ein = await luft("einfahren");
  const dunkelIstDruck = modus === "light";
  const unterDruck = (voll, leer) => (dunkelIstDruck ? hell(voll) < hell(leer) : hell(voll) > hell(leer));
  V("beim Ausfahren steht Kammer A unter Druck", unterDruck(aus.a, aus.b));
  V("beim Einfahren steht Kammer B unter Druck", unterDruck(ein.b, ein.a));

  // --- the display -------------------------------------------------------
  const anzeigeBei = async (bar) => {
    await seite.fill("#druck", String(bar));
    await seite.dispatchEvent("#druck", "input");
    await seite.waitForTimeout(60);
    return seite.textContent("[data-readout]");
  };
  const bei6 = await anzeigeBei(6);
  const bei3 = await anzeigeBei(3);
  const zahl = (t) => Number((t.match(/(\d+) N aus/) || [])[1]);
  V(`bei 6 bar zeigt die Anzeige 1178 N (${zahl(bei6)})`, zahl(bei6) === 1178);
  V(`halber Druck, halbe Kraft (${zahl(bei3)})`, Math.abs(zahl(bei3) * 2 - zahl(bei6)) <= 1);
  await anzeigeBei(6);

  // --- take apart and rebuild --------------------------------------------
  const legendeOben = async () => (await (await seite.$(".iso-keys")).boundingBox()).y;
  const vorher = await legendeOben();
  await seite.click("#btn-explode");
  await seite.waitForTimeout(2600);
  const offen = await seite.evaluate(() => window.__figur.offen());
  V(`zerlegt sich wirklich (offen ${offen.toFixed(2)})`, offen > 0.8);
  V("die Legende springt beim Zoomen nicht", Math.abs((await legendeOben()) - vorher) < 2);
  V("beim Zerlegen strömt keine Luft", (await seite.evaluate(() =>
    Number(getComputedStyle(document.querySelector("[data-luftlage]")).opacity))) < 0.1);
  const nummernSichtbar = await seite.evaluate(() =>
    [...document.querySelectorAll(".iso-nums > g")].filter((g) => Number(g.getAttribute("opacity")) > 0.5).length);
  V(`im zerlegten Zustand tragen die Baugruppen Nummern (${nummernSichtbar})`, nummernSichtbar >= 8);

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

  // Escape breaks off and rebuilds. Twelve assemblies at 950 ms is a good
  // eleven seconds, plus the springs settling.
  await seite.keyboard.press("Escape");
  await seite.waitForTimeout(14000);
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
