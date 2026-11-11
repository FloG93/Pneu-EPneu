// What `npm test` can say about the built page without starting a browser. The behaviour is checked by
// figur/tests/tools/pruefe-figur.mjs and the module next to it; this catches what would otherwise only show
// as a blank or broken page, and holds every number of the page against the model.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGENDE } from "./tools/legende-wechsel.mjs";
import { OS_1_4 as M, durchfluss, absolut, anzeige, anzeigeZeilen, neuerZustand } from "../../figur/wechselventil.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Wechselventil", "index.html");
const BAU = join(WURZEL, "Wechselventil", "tests", "tools", "build-wechsel.mjs");

execFileSync(process.execPath, [BAU], { cwd: WURZEL });
const html = readFileSync(SEITE, "utf8");

test("Die Seite enthält keine NaN", () => {
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch und trägt ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
  assert.ok(existsSync(join(WURZEL, "Wechselventil", "favicon.svg")));
});

test("Alle Bedienelemente sind da", () => {
  for (const id of ["druck-links", "druck-rechts", "zeitlupe", "btn-auto", "btn-explode", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
  // both pressure sliders from 0 to 8 bar in steps of half a bar, the slow motion starting at 1/10
  for (const id of ["druck-links", "druck-rechts"]) assert.match(html, new RegExp(`id="${id}" min="0" max="8" step="0.5" value="0"`));
  assert.match(html, /id="zeitlupe"[^>]* value="10"/);
  assert.match(html, /id="zeitlupe-wert"[^>]*>1\/10</);
});

test("Die Legende ist vollständig: sieben Einträge, ein Knopf je Eintrag, jede Baugruppe gezeichnet, in der Reihenfolge der Spezifikation", () => {
  assert.equal(LEGENDE.length, 7);
  assert.deepEqual(LEGENDE.map((e) => e.nr), ["01", "02", "03", "04", "05", "06", "07"]);
  assert.deepEqual(LEGENDE.map((e) => e.piece), ["anschluss2", "anschluss1l", "anschluss1r", "stopfen", "oring", "koerper", "gehaeuse"]);
  assert.equal((html.match(/class="pickbtn"/g) || []).length, LEGENDE.length);
  const gezeichnet = new Set([...html.matchAll(/data-piece="([a-z0-9]+)"/g)].map((m) => m[1]));
  for (const e of LEGENDE) assert.ok(gezeichnet.has(e.piece), `Legendeneintrag "${e.piece}" hat keine Teile in der Zeichnung`);
});

test("Jeder Legendensatz hat mindestens zwei Sätze", () => {
  for (const e of LEGENDE) {
    const saetze = e.satz.split(/(?<=[.!?])\s+/).filter(Boolean);
    assert.ok(saetze.length >= 2, `${e.piece}: nur ${saetze.length} Satz`);
  }
});

test("Die Zahlen kommen aus dem Modell: 1170 l/min bei 1 bar über den offenen Eingang, nichts durch den gesperrten", () => {
  const offen = durchfluss({ s: 0, pL: absolut(0), pR: absolut(6), p2: absolut(5) }, M);
  assert.equal(offen.gesamt, 1170);
  assert.equal(offen.links, 0);
  assert.ok(html.includes("<strong>1170 l/min</strong>"), "1170 l/min fehlt im Text");
  assert.match(LEGENDE.map((e) => e.satz).join(" "), /1170 l\/min/);
  // the legend names the model's assumptions with their values
  assert.match(LEGENDE.find((e) => e.piece === "koerper").satz, new RegExp(`${String(M.schaltdruck).replace(".", ",")} bar`));
  assert.match(LEGENDE.find((e) => e.piece === "koerper").satz, new RegExp(`${Math.round(M.schaltzeit * 1000)} ms`));
  // the readout stands in the page without JavaScript: two lines
  const zeilen = anzeigeZeilen(anzeige(neuerZustand(), M));
  for (const z of zeilen) assert.ok(html.includes(z), `Anzeige „${z}“ fehlt`);
  assert.match(html, /data-readout[^>]*>Eingang links 0,0 bar/);
});

test("Der Erklärtext hat die Wahrheitstabelle als echte HTML-Tabelle: vier Fälle, ODER", () => {
  const tabelle = html.match(/<table class="wahrheit">[^]*?<\/table>/)?.[0];
  assert.ok(tabelle, "keine Tabelle");
  assert.match(tabelle, /<caption>/);
  assert.equal((tabelle.match(/<th scope="col">/g) || []).length, 3);
  const zeilen = [...tabelle.matchAll(/<tr><td>([01])<\/td><td>([01])<\/td><td>([01])<\/td><\/tr>/g)].map((m) => m.slice(1).map(Number));
  assert.deepEqual(zeilen, [[0, 0, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]]);
  for (const [l, r, a] of zeilen) assert.equal(a, l | r);
});

test("Der Text sagt: gesperrt ist nicht drucklos, wer zuerst kommt, was angenommen ist und wo der Eingang 1/3 nicht vorkommt", () => {
  assert.match(html, /„Gesperrt“ heißt nicht „drucklos“/);
  assert.match(html, /Signal, das <strong>zuerst<\/strong> kam/);
  assert.match(html, /\(angenommen: Haftreibung und Trägheit\)/);
  assert.match(html, /linear mit dem Druckabfall/);
  assert.match(html, /kleinen Druckstoß/);
  assert.match(html, /Zweidruckventil/);
  assert.ok(!/1\/3/.test(html.replace(/id="zeitlupe-wert"[^>]*>1\/10</, "")), "der Hinweis 1/3 steht nur in der README");
});

test("Das Schaltzeichen trägt nur die Ziffern 1, 1 und 2, und nur die Nummern stehen als Schrift in der Zeichnung", () => {
  const texte = [...html.matchAll(/<text[^>]*class="sz-text"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.deepEqual(texte, ["1", "1", "2"]);
  assert.match(html, /aria-label="Schaltzeichen Wechselventil/);
});

test("Die Anschlussbezeichnungen stehen an den drei Schlauchenden der Zeichnung: 1, 1 und 2", () => {
  const bez = [...html.matchAll(/<text class="anschluss-bez"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.deepEqual(bez, ["1", "1", "2"]);
});

test("Die Teile der Zeichnung: Verschlussstück, O-Ring, Körper und beide Lagen der Drehteile", () => {
  for (const marke of ['data-lage="schnitt"', 'data-lage="ganz"', "data-hub", 'data-raum="L"', 'data-raum="R"', 'data-raum="A"', "data-mass", 'data-schnitt="b"', "data-luftlage-hinten"]) {
    assert.ok(html.includes(marke), `${marke} fehlt in der Zeichnung`);
  }
  assert.equal((html.match(/<g data-teil="kugel"/g) || []).length, 1);
});
