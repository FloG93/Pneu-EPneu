import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { modulQuelle } from "../seite.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("modulQuelle: ventil + pneumatik ergeben gültiges Skript ohne doppelte Namen", () => {
  const code = modulQuelle(WURZEL, ["figur/ventil.mjs", "figur/pneumatik.mjs"]);
  assert.doesNotMatch(code, /^import |^export /m);
  assert.doesNotThrow(() => new Function(code));   // duplicate const/function → SyntaxError
});

// The required fields of a page; everything else has a default.
const PFLICHT = {
  titel: "T", fig: "Bild 1", kartenTitel: "K", hinweis: "H", anzeige: "A",
  svg: "<svg></svg>", leiste: "", laufzeit: "",
};

test("seite: ein Begleitbild steht in einem eigenen aside neben der Karte", async () => {
  const { seite } = await import("../seite.mjs");
  const html = seite({ ...PFLICHT, beiFigur: "<p>x</p>" });
  assert.match(html, /<aside class="beifigur"[^>]*>[\s\S]*<p>x<\/p>[\s\S]*<\/aside>/);
  // Card and aside sit in one flex row, so they stand side by side.
  assert.match(html, /<div class="mitbeifigur"><figure class="iso-figure">/);
});

test("seite: ohne Begleitbild bleibt die Seite wie bisher", async () => {
  const { seite } = await import("../seite.mjs");
  assert.doesNotMatch(seite(PFLICHT), /beifigur/);
});

test("komma schreibt mit Dezimalkomma, kommaZahl lässt die Zahl wie sie ist", async () => {
  const { komma, kommaZahl } = await import("../seite.mjs");
  assert.equal(komma(6), "6,0");
  assert.equal(komma(6.25, 2), "6,25");
  assert.equal(komma(3, 0), "3");
  assert.equal(kommaZahl(1.5), "1,5");
  assert.equal(kommaZahl(6), "6");
});

test("schieber: mit stellen steht der erste Wert mit Komma im Ausgabefeld, der Wert des Reglers bleibt eine Zahl", async () => {
  const { schieber } = await import("../seite.mjs");
  const mit = schieber("druck", "Druck", { min: 0, max: 8, step: 0.5, wert: 6, einheit: " bar", stellen: 1 });
  assert.match(mit, /value="6"/);
  assert.match(mit, />6,0 bar<\/output>/);
  const ohne = schieber("druck", "Druck", { min: 0, max: 8, step: 0.5, wert: 6, einheit: " bar" });
  assert.match(ohne, />6 bar<\/output>/);
});
