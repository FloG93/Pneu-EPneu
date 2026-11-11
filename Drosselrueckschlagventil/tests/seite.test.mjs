// What `npm test` can say about the built page without starting a browser.
// The behaviour is checked by figur/tests/tools/pruefe-figur.mjs and the module
// next to it; this catches what would otherwise only show as a blank or broken
// page, and holds every number of the page against the model.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGENDE } from "./tools/legende-drossel.mjs";
import { GRA_1_4 as M, durchfluss, DROSSELRICHTUNG, FREIE_RICHTUNG } from "../../figur/stromventil.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Drosselrueckschlagventil", "index.html");
const BAU = join(WURZEL, "Drosselrueckschlagventil", "tests", "tools", "build-drossel.mjs");

execFileSync(process.execPath, [BAU], { cwd: WURZEL });
const html = readFileSync(SEITE, "utf8");

test("Die Seite enthält keine NaN", () => {
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch und trägt ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
  assert.ok(existsSync(join(WURZEL, "Drosselrueckschlagventil", "favicon.svg")));
});

test("Alle Bedienelemente sind da", () => {
  for (const id of ["btn-richtung", "drossel", "btn-auto", "btn-explode", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
});

test("Die Legende ist vollständig: ein Knopf je Eintrag, jede Baugruppe gezeichnet", () => {
  assert.equal(LEGENDE.length, 9);
  assert.equal((html.match(/class="pickbtn"/g) || []).length, LEGENDE.length);
  const gezeichnet = new Set([...html.matchAll(/data-piece="([a-z]+)"/g)].map((m) => m[1]));
  for (const e of LEGENDE) assert.ok(gezeichnet.has(e.piece), `Legendeneintrag "${e.piece}" hat keine Teile in der Zeichnung`);
});

test("Jeder Legendensatz hat mindestens zwei Sätze", () => {
  for (const e of LEGENDE) {
    const saetze = e.satz.split(/(?<=[.!?])\s+/).filter(Boolean);
    assert.ok(saetze.length >= 2, `${e.piece}: nur ${saetze.length} Satz`);
  }
});

test("Die Zahlen kommen aus dem Modell: 420, 210, 0, 780, 360 l/min", () => {
  assert.equal(durchfluss(DROSSELRICHTUNG, M.umdrehungen, 1, M).gesamt, 420);
  assert.equal(durchfluss(DROSSELRICHTUNG, M.umdrehungen / 2, 1, M).gesamt, 210);
  assert.equal(durchfluss(DROSSELRICHTUNG, 0, 1, M).gesamt, 0);
  assert.equal(durchfluss(FREIE_RICHTUNG, M.umdrehungen, 1, M).gesamt, 780);
  assert.equal(durchfluss(FREIE_RICHTUNG, 0, 1, M).gesamt, 360);
  // the readout stands in the page without JavaScript, at the catalogue's conditions
  assert.match(html, /Q 210 l\/min \(Drossel 210 \+ Rückschlag 0\) · Lippe zu\n1 → 2 · 6 bar · Δp 1 bar/);
  // the legend and the prose name the model's numbers
  const legendeText = LEGENDE.map((e) => e.satz).join(" ");
  assert.match(legendeText, /420 l\/min/);
  assert.match(legendeText, /780 l\/min/);
  assert.match(legendeText, /360 l\/min/);
  for (const zahl of ["420 l/min", "780 l/min", "360 l/min", "210 l/min"]) assert.ok(html.includes(zahl), `${zahl} fehlt im Text`);
});

test("Der Text nennt nur die Anschlüsse 1 und 2 und begründet die Abluftdrosselung", () => {
  assert.match(html, /Abluftdrosselung/);
  assert.match(html, /in <strong>einer<\/strong> Richtung/);
  const texte = [...html.matchAll(/<text[^>]*class="sz-text"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.deepEqual(texte, ["1", "2"]);
});

test("Der Text sagt, welcher Anschluss zum Zylinder zeigt, und nennt die Ausnahme der Zuluftdrosselung", () => {
  assert.match(html, /Anschluss 1 zum Zylinder und Anschluss 2 zum Wegeventil/);
  assert.match(html, /einfachwirkende und sehr kleine Zylinder/);
  assert.match(html, /Lösering/);
  assert.ok(!/P, A und R/.test(html), "die alten Buchstaben gehören nicht auf diese Seite");
  // what is an assumption says so
  assert.match(html, /im Modell noch 360 l\/min/);
});

test("Die Seite zeigt die echte Bauform: Lippe und Ringspalt, keine Kugel, keine Feder, keine Nadel", () => {
  assert.match(html, /Dichtmanschette/);
  assert.match(html, /Ringspalt/);
  assert.match(html, /Ventileinsatz/);
  // the page text may say that there is none; no legend entry or label may name a ball, a needle or a spring
  const legendeText = LEGENDE.map((e) => `${e.name} ${e.satz}`).join(" ");
  assert.ok(!/Kugel|Nadel|Feder\b/.test(legendeText), "die Legende nennt Kugel, Nadel oder Feder");
  assert.ok(!/class="sz-feder"/.test(html), "das Schaltzeichen zeichnet eine Feder");
  assert.match(html, /Eine zweite Kammer, einen zweiten Kanal oder eine Feder gibt es nicht/);
});

test("Die Lupe ist da: ein flacher Schnitt des Kerns neben dem Schaltzeichen, mit Text für beide Richtungen", () => {
  assert.match(html, /<svg class="lupe iso-svg"/);
  for (const marke of ["data-lupe-zapfen", 'data-lupe-lippe="zu"', 'data-lupe-lippe="auf"', 'data-lupe-raum="s1"', 'data-lupe-raum="s2"', 'data-lupe-pfeil="drossel"', 'data-lupe-pfeil="lippe"']) {
    assert.ok(html.includes(marke), `${marke} fehlt in der Lupe`);
  }
  assert.match(html, /Von 1 nach 2 spreizt der Druck die Lippe/);
  assert.match(html, /Von 2 nach 1 klappt der Druck die Lippe nach innen/);
});
