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
import { LEGENDE } from "./tools/legende-ventil.mjs";
import { ISO_5599_GR1, ventilSchaltzeit } from "../../figur/ventil.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Wegeventil-5-2", "index.html");
const BAU = join(WURZEL, "Wegeventil-5-2", "tests", "tools", "build-ventil.mjs");

execFileSync(process.execPath, [BAU], { cwd: WURZEL });
const html = readFileSync(SEITE, "utf8");

test("Die Seite enthält keine NaN – eine falsch aufgerufene Kit-Funktion fällt hier auf", () => {
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch, trägt ihren Titel und ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /<title>5\/2-Wegeventil – Pneumatik<\/title>/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
});

test("Alle Bedienelemente sind da", () => {
  for (const id of ["btn-14", "btn-12", "btn-bauart", "btn-auto", "btn-explode",
    "zeitlupe", "hand", "druck", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
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

test("Die Ringräume 1 bis 5 und die Steuerkammern 12 und 14 sind angelegt", () => {
  for (const raum of ["1", "2", "3", "4", "5", "12", "14"]) {
    assert.ok(html.includes(`data-raum="${raum}"`), `Raum ${raum} fehlt`);
  }
});

test("Neben der Karte steht das Schaltzeichen", () => {
  const aside = html.match(/<aside class="beifigur"[\s\S]*?<\/aside>/);
  assert.ok(aside, "kein aside für das Begleitbild");
  assert.ok(aside[0].includes('aria-label="Schaltzeichen 5/2-Wegeventil'), "das Schaltzeichen fehlt im aside");
});

test("Beide Symbolvarianten stehen im HTML, genau eine ist sichtbar", () => {
  const aside = html.match(/<aside class="beifigur"[\s\S]*?<\/aside>/)[0];
  const teile = [...aside.matchAll(/<div class="beifigur-symbol" data-variante="(feder|kolben12)"([^>]*)>/g)];
  assert.deepEqual(teile.map((m) => m[1]).sort(), ["feder", "kolben12"]);
  assert.equal(teile.filter((m) => !/hidden/.test(m[2])).length, 1, "genau ein Symbol ohne hidden");
});

test("Das Symbol bekommt seine Farben aus den Luftfarben und folgt dem Modus", () => {
  assert.match(html, /\.iso\s*\{[^}]*--sz-strich: var\(--anatomy-strong\)/);
  assert.match(html, /\.iso\[data-theme="light"\]\s*\{[^}]*--sz-stark/);
});

test("Das Symbol wird in jedem Bild nachgeführt, nicht nur beim Bauartwechsel", () => {
  // The shared loop (EX.ABLAUF) calls bildZeichnen once per frame.
  assert.match(html.match(/function tick\(now\) \{[\s\S]*?\n\}\n/)[0], /bildZeichnen\(/);
  const bild = html.match(/function bildZeichnen\(dt, offen, bewegt\) \{[\s\S]*?\n\}\n/)[0];
  assert.match(bild, /zeichneSymbol\(\)/);
  assert.equal((html.match(/function symbolStellen/g) || []).length, 1, "symbolStellen ist doppelt eingebettet");
});

test("Die Anzeige steht schon ohne JavaScript in der Seite", () => {
  assert.match(html, /p2 6,0 bar · p4 0,0 bar · Schaltzeit \d+ ms/);
});

test("Der Bau ist wiederholbar: dasselbe Skript ergibt dieselbe Seite", () => {
  execFileSync(process.execPath, [BAU], { cwd: WURZEL });
  assert.equal(readFileSync(SEITE, "utf8"), html, "der Bau ist nicht reproduzierbar");
});

// The README's table of switching times is prose a person reads, so it is held
// against the model here: every row, rounded as printed.
test("Die Schaltzeiten in der README sind die des Modells", () => {
  const md = readFileSync(join(WURZEL, "Wegeventil-5-2", "README.md"), "utf8");
  const zeilen = [...md.matchAll(/^\| (monostabil|bistabil) \| ([^|]+) \| (\d) bar \| ([\d,]+) ms \|$/gm)];
  assert.ok(zeilen.length >= 8, `nur ${zeilen.length} Zeilen gefunden`);
  for (const [, bauart, vorgang, bar, ms] of zeilen) {
    const richtung = /12|Feder/.test(vorgang) ? "12" : "14";
    const wie = bauart === "bistabil" ? { bauart, richtung, impuls: 0.15 } : { bauart, richtung };
    const t = ventilSchaltzeit(ISO_5599_GR1, Number(bar), wie);
    assert.equal(ms, (t * 1000).toFixed(1).replace(".", ","), `${bauart} ${vorgang} ${bar} bar`);
  }
});

test("Der Text nennt die Schaltzeit beider Bauarten, wie die Anzeige sie rundet", () => {
  const ms = (t) => Math.round(t * 1000);
  const mono = ms(ventilSchaltzeit(ISO_5599_GR1, 6));
  const bi = ms(ventilSchaltzeit(ISO_5599_GR1, 6, { bauart: "bistabil", impuls: 0.15 }));
  assert.match(html, new RegExp(`braucht bei 6 bar ${mono} ms bis in die Stellung 14`));
  assert.match(html, new RegExp(`Impuls von 150 ms in\\s+${bi} ms`));
  assert.match(html, /12 bis 52 ms\. Diese Werte gelten für Ventile mit Federrückstellung/);
});
