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
