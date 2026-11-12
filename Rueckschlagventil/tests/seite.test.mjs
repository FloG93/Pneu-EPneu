// What `npm test` can say about the built page without starting a browser. The behaviour is checked by
// figur/tests/tools/pruefe-figur.mjs and the module next to it; this catches what would otherwise only show
// as a blank or broken page, and holds every number of the page against the model.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGENDE } from "./tools/legende-rueckschlagventil.mjs";
import { H_1_4 as M, durchfluss, absolut, anzeige, anzeigeZeilen, neuerZustand } from "../../figur/rueckschlagventil.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Rueckschlagventil", "index.html");
const BAU = join(WURZEL, "Rueckschlagventil", "tests", "tools", "build-rueckschlagventil.mjs");

execFileSync(process.execPath, [BAU], { cwd: WURZEL });
const html = readFileSync(SEITE, "utf8");

test("Die Seite enthält keine NaN", () => {
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch und trägt ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
  assert.ok(existsSync(join(WURZEL, "Rueckschlagventil", "favicon.svg")));
});

test("Alle Bedienelemente sind da", () => {
  for (const id of ["druck-eingang", "btn-entlueften", "zeitlupe", "btn-auto", "btn-explode", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
  // the slider from 0 to 8 bar in steps of half a bar, the slow motion starting at 1/10
  assert.match(html, /id="druck-eingang" min="0" max="8" step="0.5" value="0"/);
  assert.match(html, /id="zeitlupe"[^>]* value="10"/);
  assert.match(html, /id="zeitlupe-wert"[^>]*>1\/10</);
  assert.match(html, /id="btn-entlueften" aria-pressed="false"[^>]*>Ausgang 2 entlüften</);
});

test("Die Legende ist vollständig: sechs Einträge, ein Knopf je Eintrag, jede Baugruppe gezeichnet, in der Reihenfolge der Spezifikation", () => {
  assert.equal(LEGENDE.length, 6);
  assert.deepEqual(LEGENDE.map((e) => e.nr), ["01", "02", "03", "04", "05", "06"]);
  assert.deepEqual(LEGENDE.map((e) => e.piece), ["anschluss2", "anschluss1", "dichtring", "feder", "teller", "gehaeuse"]);
  assert.equal((html.match(/class="pickbtn"/g) || []).length, LEGENDE.length);
  const gezeichnet = new Set([...html.matchAll(/data-piece="([a-z0-9]+)"/g)].map((m) => m[1]));
  for (const e of LEGENDE) assert.ok(gezeichnet.has(e.piece), `Legendeneintrag "${e.piece}" hat keine Teile in der Zeichnung`);
});

test("Jeder Legendensatz hat mindestens zwei Sätze, höchstens drei bis vier", () => {
  for (const e of LEGENDE) {
    const saetze = e.satz.split(/(?<=[.!?])\s+/).filter(Boolean);
    assert.ok(saetze.length >= 2 && saetze.length <= 5, `${e.piece}: ${saetze.length} Sätze`);
  }
});

test("Die Zahlen kommen aus dem Modell: 1000 l/min bei 1 bar über den offenen Teller, nichts bei zu, Deckel 2000 l/min", () => {
  assert.equal(durchfluss({ h: 1, p1: absolut(6), p2: absolut(5) }, M), 1000);
  assert.equal(durchfluss({ h: 0, p1: absolut(6), p2: absolut(0) }, M), 0);
  assert.ok(html.includes("<strong>1000 l/min</strong>"), "1000 l/min fehlt im Text");
  assert.ok(html.includes("<strong>2000 l/min</strong>"), "die Begrenzung 2000 l/min fehlt im Text");
  assert.match(LEGENDE.map((e) => e.satz).join(" "), /1000 l\/min/);
  // the legend names the model's assumptions with their values
  const teller = LEGENDE.find((e) => e.piece === "teller").satz;
  assert.match(teller, new RegExp(`${String(M.oeffnungsdruck).replace(".", ",")} bar`));
  assert.match(teller, new RegExp(`${String(M.vollDp).replace(".", ",")} bar`));
  assert.match(teller, new RegExp(`${Math.round(M.schaltzeit * 1000)} ms`));
  assert.match(LEGENDE.find((e) => e.piece === "feder").satz, new RegExp(`${M.hub} mm`));
  // the readout stands in the page without JavaScript: two lines
  const zeilen = anzeigeZeilen(anzeige(neuerZustand(), M));
  for (const z of zeilen) assert.ok(html.includes(z), `Anzeige „${z}“ fehlt`);
  assert.match(html, /data-readout[^>]*>Eingang 1 0,0\u00a0bar/);
});

test("Der Erklärtext hat die Zustandstabelle als echte HTML-Tabelle: offen, zu, zu und fester angedrückt", () => {
  const tabelle = html.match(/<table class="wahrheit">[^]*?<\/table>/)?.[0];
  assert.ok(tabelle, "keine Tabelle");
  assert.match(tabelle, /<caption>/);
  assert.equal((tabelle.match(/<th scope="col">/g) || []).length, 3);
  const zeilen = [...tabelle.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => m.slice(1));
  assert.equal(zeilen.length, 3);
  assert.deepEqual(zeilen.map((z) => z[1]), ["offen", "zu", "zu, fester angedrückt"]);
  assert.match(zeilen[0][0], /Δp &gt; 0,1 bar/);
  assert.match(zeilen[2][2], /nichts strömt zurück/);
});

test("Der Text sagt die Annahmen: Öffnungsdruck, 5,9 bar, begrenzte Anzeige, nachgezeichnet, blauer Dichtring, Zylinder, Hülse", () => {
  assert.match(html, /angenommen: von der Schwesterreihe H-QS des Katalogs übernommen/);
  assert.match(html, /steigt der Druck an 2 nur bis 5,9 bar/);
  assert.match(html, /<strong>2000 l\/min<\/strong>, und schreibt dann „\(begrenzt\)“ dazu/);
  assert.match(html, /nachgezeichnet nach dem Funktionsprinzip/);
  assert.match(html, /der in Wirklichkeit blau ist, ist dunkel gezeichnet/);
  assert.match(html, /ein <strong>Zylinder<\/strong>/);
  assert.match(html, /aufgeschraubte <strong>Hülse<\/strong> \(angenommen/);
  assert.match(html, /href="\.\.\/Drosselrueckschlagventil\/"/);
  assert.match(html, /href="\.\.\/Wechselventil\/"/);
  assert.match(html, /Eingebaut wird es <strong>in Pfeilrichtung<\/strong>/);
});

test("Das Schaltzeichen trägt nur die Ziffern 1 und 2, und nur die Nummern stehen als Schrift in der Zeichnung", () => {
  const texte = [...html.matchAll(/<text[^>]*class="sz-text"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.deepEqual(texte, ["1", "2"]);
  assert.match(html, /aria-label="Schaltzeichen Rückschlagventil/);
});

test("Die Anschlussbezeichnungen stehen an den zwei Schlauchenden der Zeichnung: 1 und 2", () => {
  const bez = [...html.matchAll(/<text class="anschluss-bez"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.deepEqual(bez, ["1", "2"]);
});

test("Die Teile der Zeichnung: Sitzeinsatz, Teller, Feder, Dichtring, beide Lagen der Drehteile, die zwei Räume", () => {
  for (const marke of ['data-lage="schnitt"', 'data-lage="ganz"', "data-hub", 'data-raum="L"', 'data-raum="R"', "data-mass", 'data-schnitt="b"', "data-luftlage-hinten", 'data-feder="']) {
    assert.ok(html.includes(marke), `${marke} fehlt in der Zeichnung`);
  }
  assert.ok(!html.includes('data-raum="A"'), "ein Rückschlagventil hat nur zwei Räume");
  assert.equal((html.match(/<g data-teil="kugel"/g) || []).length, 1);
  for (const piece of ["gehaeuse", "teller", "feder", "dichtring", "anschluss1", "anschluss2"]) assert.ok(html.includes(`data-piece="${piece}"`), piece);
});

test("Das Gehäuse trägt Maße des Katalogs: 48 mm lang, Schlüsselweite 19 mm als Zylinder Ø 19, Gewinde 8 mm", () => {
  const bau = readFileSync(BAU, "utf8");
  assert.match(bau, /const RA = 9\.5, HOEHE = 2 \* RA/);
  assert.match(bau, /const X_HEX = 40, X_ENDE = 48/);
});
