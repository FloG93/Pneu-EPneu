// The section pages use the shared checker (figur/tests/tools/pruefe-schnitt.mjs) instead of keeping a copy of its
// checks. This test names the pages of this repo; a page that is added to the family is added to the list.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join(import.meta.dirname, "..", "..");
const SEITEN = [
  ["Drosselrueckschlagventil", "pruefe-drossel.mjs"],
];

for (const [ordner, modul] of SEITEN) {
  test(`${ordner}: das Seitenmodul ruft den gemeinsamen Prüfer und hält keine Kopie seiner Prüfungen`, () => {
    const q = readFileSync(join(WURZEL, ordner, "tests", "tools", modul), "utf8");
    assert.match(q, /from "\.\.\/\.\.\/\.\.\/figur\/tests\/tools\/pruefe-schnitt\.mjs"/);
    assert.match(q, /schnittPruefungen\(/);
    // what the shared checker owns must not stand here a second time
    assert.ok(!/inflateSync/.test(q), "PNG-Pixel lesen gehört in den gemeinsamen Prüfer");
    assert.ok(!/elementsFromPoint/.test(q), "die Prüfung auf Material gehört in den gemeinsamen Prüfer");
    assert.ok(!/getAttribute\("cx"\)/.test(q), "die Laufrichtung der Teilchen gehört in den gemeinsamen Prüfer");
  });
}
