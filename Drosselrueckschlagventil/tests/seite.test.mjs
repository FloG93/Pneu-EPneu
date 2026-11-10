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
  assert.equal(LEGENDE.length, 8);
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
  assert.match(html, /Q 210 l\/min · Drossel 210 · Rückschlag 0 · Kugel zu \(1 → 2, 6 bar, Δp 1 bar\)/);
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
