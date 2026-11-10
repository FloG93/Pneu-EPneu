// What `npm test` can say about the built page without starting a browser.
// The behaviour is checked by figur/tests/tools/pruefe-figur.mjs and the
// module next to it; this catches what would otherwise only show as a blank or
// broken page, and holds every number of the page against the model.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGENDE } from "./tools/legende-zylinder-ew.mjs";
import * as PN from "../../figur/pneumatik.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Zylinder-Einfachwirkend", "index.html");
const BAU = join(WURZEL, "Zylinder-Einfachwirkend", "tests", "tools", "build-zylinder-ew.mjs");

execFileSync(process.execPath, [BAU], { cwd: WURZEL });
const html = readFileSync(SEITE, "utf8");
const Z = PN.ESNU_50_25;

test("Die Seite enthält keine NaN", () => {
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch und trägt ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
});

test("Alle Bedienelemente sind da", () => {
  for (const id of ["btn-signal", "btn-auto", "btn-explode", "zeitlupe", "druck", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
});

test("Die Legende hat elf Einträge und genau so viele Knöpfe", () => {
  assert.equal(LEGENDE.length, 11);
  assert.equal((html.match(/class="pickbtn"/g) || []).length, LEGENDE.length);
});

test("Jede Baugruppe der Legende kommt auch in der Zeichnung vor", () => {
  const gezeichnet = new Set([...html.matchAll(/data-piece="([a-z]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/data-pick="([a-z]+)"/g)) {
    assert.ok(gezeichnet.has(m[1]), `Legendeneintrag "${m[1]}" hat keine Teile in der Zeichnung`);
  }
});

test("Beide Fußblöcke gehören zur Baugruppe fuss", () => {
  const gruppen = html.match(/<g data-g="fuss" data-piece="fuss">/g) || [];
  assert.equal(gruppen.length, 2, "die beiden Füße sind nicht dieselbe Baugruppe");
});

test("Die Zahlen der Seite kommen aus dem Modell: 1096 N zu Beginn, 1073 N am Hubende, 82 N, 105 N", () => {
  // Catalogue: 1072,8 N at 6 bar and full stroke; spring 82 N in, 105,3 N out;
  // 0,6 · 1963,5 − 82 = 1096 N at stroke 0; 0,3 · 1963,5 − 105,3 = 484 N at 3 bar and full stroke.
  assert.ok(Math.abs(PN.kraftAus(6, Z) - 1072.8) < 0.2);
  assert.equal(Math.round(PN.kraftJetzt(6, { weg: 0 }, Z)), 1096);
  assert.match(html, /F aus 1096 N = p · A − Feder jetzt 82 N · Hub 0 mm/, "die Anzeige steht nicht ohne JavaScript da");
  assert.match(html, /am Hubanfang: F<sub>aus<\/sub> = 1178 N − 82 N Feder = <strong>1096 N<\/strong>/);
  assert.match(html, /am Hubende: F<sub>aus<\/sub> = 1178 N − 105 N Feder = <strong>1073 N<\/strong>/);
  assert.match(html, /bei 3 bar am Hubende: F<sub>aus<\/sub> = 0,3 N\/mm² · 1963\.5 mm² − 105 N = <strong>484 N<\/strong>/);
  assert.match(LEGENDE.find((e) => e.piece === "feder").satz, /82 N eingefahren, 105 N am Hubende.*Am Hubende bleiben bei 6 bar nur 1073 N/);
});

test("Die Texte nennen die Federkräfte und die Reibungsannahme", () => {
  assert.match(html, /<h2>Warum fährt er langsamer ein, als er ausfährt\?<\/h2>/);
  assert.match(html, /42 bis 65 N/);
  assert.match(html, /mit den angenommenen 40 N Reibung unter etwa 0,6 bar/);
});

test("Das Begleitbild zeigt Zylinder und Ventil als Schaltzeichen, der Druckknopf mit Halbkreis", () => {
  assert.match(html, /class="sz-feder"/);
  assert.match(html, /data-art="taster"><path d="[^"]*A[\d.]+ [\d.]+ 0 0 0 /);
  assert.equal((html.match(/class="sz-symbol"/g) || []).length, 2);
});

test("Das Fenster im Zylinderrohr ist als Clip definiert und wird benutzt", () => {
  assert.ok(html.includes('<clipPath id="fenster-rohr">') && html.includes("url(#fenster-rohr)"));
  assert.ok(html.includes('<clipPath id="stange-clip">'));
});

test("Beide Kammern und der Entlüftungsweg sind angelegt", () => {
  assert.ok(html.includes('data-kammer="a"') && html.includes('data-kammer="b"'));
  assert.match(html, /"F":\{/, "der Weg der Federraumluft durch den Filter fehlt");
});

test("Die Federwendel trägt ihre Enden für die Stauchung", () => {
  assert.equal((html.match(/data-feder="\d+ \d+"/g) || []).length, 2, "die beiden Wendelhälften");
  assert.ok((html.match(/data-federx=/g) || []).length > 40);
});

test("Der Bau ist wiederholbar: dasselbe Skript ergibt dieselbe Seite", () => {
  execFileSync(process.execPath, [BAU], { cwd: WURZEL });
  assert.equal(readFileSync(SEITE, "utf8"), html, "der Bau ist nicht reproduzierbar");
});
