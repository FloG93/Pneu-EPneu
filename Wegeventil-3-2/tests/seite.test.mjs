// What `npm test` can say about the built page without starting a browser.
// The behaviour is checked by figur/tests/tools/pruefe-figur.mjs; this catches
// the things that would otherwise only show as a blank or broken page.
//
// The page is built here first: it is not committed until it is published, so
// a fresh checkout has none to read.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGENDE } from "./tools/legende-ventil-3-2.mjs";
import { ISO_5599_GR1, neuesVentil, ventilAnzeige, ventilSchaltzeit } from "../../figur/ventil.mjs";
import { VENTIL_3_2_NC, VENTIL_3_2_NO } from "../../figur/schaltzeichen.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Wegeventil-3-2", "index.html");
const BAU = join(WURZEL, "Wegeventil-3-2", "tests", "tools", "build-ventil-3-2.mjs");

execFileSync(process.execPath, [BAU], { cwd: WURZEL });
const html = readFileSync(SEITE, "utf8");

test("Die Seite enthält keine NaN – eine falsch aufgerufene Kit-Funktion fällt hier auf", () => {
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch, trägt ihren Titel und ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /<title>3\/2-Wegeventil – Pneumatik<\/title>/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
});

test("Alle Bedienelemente sind da, und es gibt keinen Bistabil-Schalter", () => {
  for (const id of ["btn-signal", "btn-bauart", "btn-auto", "btn-explode",
    "zeitlupe", "hand", "druck", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
  assert.ok(!html.includes('id="btn-12"') && !html.includes('id="btn-14"'), "ein Knopf der 5/2-Seite ist übrig");
  assert.ok(!/bistabil/i.test(html.replace(/<div class="lesetext">[\s\S]*$/, "")), "die Seite bietet nur monostabil an");
});

test("Der Signalknopf und der Kartenhinweis beginnen mit dem NC-Ventil: Signal 12", () => {
  assert.match(html, /id="btn-signal"[^>]*>Signal 12</);
  assert.match(html, /Signal 12 halten, Zeitlupe, zerlegen/);
  assert.match(html, /"no":\{"nummer":"10"/, "für das NO-Ventil heißt das Signal 10");
});

test("Die Legende hat genau so viele Knöpfe wie Einträge", () => {
  const knoepfe = (html.match(/class="pickbtn"/g) || []).length;
  assert.equal(knoepfe, LEGENDE.length);
  assert.equal(knoepfe, 11);
});

test("Jede Baugruppe der Legende kommt auch in der Zeichnung vor", () => {
  const gezeichnet = new Set([...html.matchAll(/data-piece="([a-z0-9]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/data-pick="([a-z0-9]+)"/g)) {
    assert.ok(gezeichnet.has(m[1]), `Legendeneintrag "${m[1]}" hat keine Teile in der Zeichnung`);
  }
});

test("Die Ringräume 1 bis 3 und die Steuerkammer sind angelegt", () => {
  for (const raum of ["1", "2", "3", "st"]) {
    assert.ok(html.includes(`data-raum="${raum}"`), `Raum ${raum} fehlt`);
  }
  assert.ok(html.includes("data-luftlage"), "die Ebene für die Luftteilchen fehlt");
  assert.match(html, /"1-2":/);
  assert.match(html, /"2-3":/);
});

test("Beide Schieber stehen im HTML, genau der NC ist beim Laden sichtbar", () => {
  const svg = html.slice(html.indexOf('class="iso-stage"'), html.indexOf('class="iso-keys"'));
  assert.ok(/<g data-variante="nc">/.test(svg) && /<g data-variante="no" hidden="">/.test(svg));
  assert.ok(!/<g data-variante="nc" hidden/.test(svg), "der NC-Schieber darf beim Laden nicht versteckt sein");
  assert.ok(!/<g data-variante="no">/.test(svg), "jede NO-Gruppe ist beim Laden versteckt");
});

test("Neben der Karte steht das Schaltzeichen, beide Varianten, genau eine sichtbar", () => {
  const aside = html.match(/<aside class="beifigur"[\s\S]*?<\/aside>/);
  assert.ok(aside, "kein aside für das Begleitbild");
  assert.ok(aside[0].includes('aria-label="Schaltzeichen 3/2-Wegeventil'), "das Schaltzeichen fehlt im aside");
  const teile = [...aside[0].matchAll(/<div class="beifigur-symbol" data-variante="(nc|no)"([^>]*)>/g)];
  assert.deepEqual(teile.map((m) => m[1]).sort(), ["nc", "no"]);
  assert.equal(teile.filter((m) => !/hidden/.test(m[2])).length, 1, "genau ein Symbol ohne hidden");
});

test("Das Symbol bekommt seine Farben aus den Luftfarben und folgt dem Modus", () => {
  assert.match(html, /\.iso\s*\{[^}]*--sz-strich: var\(--anatomy-strong\)/);
  assert.match(html, /\.iso\[data-theme="light"\]\s*\{[^}]*--sz-stark/);
});

test("Die Anzeige steht schon ohne JavaScript in der Seite: p2 des NC-Ventils", () => {
  assert.match(html, /p2 0,0 bar · Schaltzeit \d+ ms/);
  // The NO valve starts with supply pressure at 2: the model says so, the page is set to it at load (?variante=no).
  assert.equal(ventilAnzeige(neuesVentil(ISO_5599_GR1, { art: VENTIL_3_2_NO }), ISO_5599_GR1, 6).drucke[2], 6);
  assert.equal(ventilAnzeige(neuesVentil(ISO_5599_GR1, { art: VENTIL_3_2_NC }), ISO_5599_GR1, 6).drucke[2], 0);
});

test("Der Bau ist wiederholbar: dasselbe Skript ergibt dieselbe Seite", () => {
  execFileSync(process.execPath, [BAU], { cwd: WURZEL });
  assert.equal(readFileSync(SEITE, "utf8"), html, "der Bau ist nicht reproduzierbar");
});

test("Keine fremde Laufzeit-Kopie: die gemeinsamen Teile stehen in figur/, nicht im Bauskript", () => {
  const bau = readFileSync(BAU, "utf8");
  for (const name of ["function halte", "function erzaehle", "function zeichneHub", "function zeichneAnzeige", "function bindeRegler"]) {
    assert.ok(!bau.includes(name), `${name} steht im Bauskript`);
  }
});

test("Der Text nennt die Schaltzeit, wie die Anzeige sie rundet", () => {
  const ms = Math.round(ventilSchaltzeit(ISO_5599_GR1, 6, { art: VENTIL_3_2_NC }) * 1000);
  assert.match(html, new RegExp(`brauchen bei 6 bar ${ms} ms bis in die betätigte Stellung`));
  assert.match(html, /12 bis 52 ms/);
  assert.match(html, /href="\.\.\/Wegeventil-5-2\/"/, "Hinweis auf die 5/2-Seite fehlt");
});
