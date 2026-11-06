// What `npm test` can say about the built page without starting a browser.
// The behaviour is checked by figur/tests/tools/pruefe-figur.mjs; this catches
// the things that would otherwise only show as a blank or broken page.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGENDE } from "./tools/legende-zylinder.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const SEITE = join(WURZEL, "Zylinder-Doppeltwirkend", "index.html");
const BAU = join(WURZEL, "Zylinder-Doppeltwirkend", "tests", "tools", "build-zylinder.mjs");

const html = readFileSync(SEITE, "utf8");

test("Die Seite enthält keine NaN – eine falsch aufgerufene Kit-Funktion fällt hier auf", () => {
  // k.coil once took 3D points where it wanted scalars; the whole spring came
  // out as "MNaN NaN…" and only the browser console noticed.
  assert.ok(!html.includes("NaN"), "irgendwo steht NaN in einem Pfad");
});

test("Die Seite steht auf Deutsch und trägt ihr Symbol", () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
});

test("Alle Bedienelemente sind da", () => {
  for (const id of ["btn-ventil", "btn-auto", "btn-explode", "druck", "kontrast", "btn-theme"]) {
    assert.ok(html.includes(`id="${id}"`), `Bedienelement ${id} fehlt`);
  }
});

test("Die Legende hat genau so viele Knöpfe wie Einträge", () => {
  const knoepfe = (html.match(/class="pickbtn"/g) || []).length;
  assert.equal(knoepfe, LEGENDE.length);
  assert.ok(LEGENDE.length >= 12, `nur ${LEGENDE.length} Einträge`);
});

test("Jede Baugruppe der Legende kommt auch in der Zeichnung vor", () => {
  const gezeichnet = new Set([...html.matchAll(/data-piece="([a-z]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/data-pick="([a-z]+)"/g)) {
    assert.ok(gezeichnet.has(m[1]), `Legendeneintrag "${m[1]}" hat keine Teile in der Zeichnung`);
  }
});

test("Das Fenster im Zylinderrohr ist als Clip definiert und wird benutzt", () => {
  assert.ok(html.includes('<clipPath id="fenster-rohr">'), "der Clip fehlt");
  assert.ok(html.includes("url(#fenster-rohr)"), "der Clip wird nicht benutzt");
  assert.ok(html.includes('<clipPath id="stange-clip">'), "der Clip der Kolbenstange fehlt");
});

test("Beide Kammern sind angelegt", () => {
  assert.ok(html.includes('data-kammer="a"') && html.includes('data-kammer="b"'));
});

test("Die angezeigte Kraft steht schon ohne JavaScript in der Seite", () => {
  // Without it the card would be empty until the first frame.
  assert.match(html, /1178 N aus \/ 990 N ein/);
});

test("Der Bau ist wiederholbar: dasselbe Skript ergibt dieselbe Seite", () => {
  execFileSync(process.execPath, [BAU], { cwd: WURZEL });
  assert.equal(readFileSync(SEITE, "utf8"), html, "der Bau ist nicht reproduzierbar");
});
