// The shared checker of the section pages (figur/tests/tools/pruefe-schnitt.mjs). The browser run needs Playwright,
// which lives outside the repo; what `npm test` can hold is the interface (what a page has to hand over), the small
// pure helpers (contrast, colour parsing, reading a pixel out of a PNG). That the pages use the checker is held by
// figur/tests/schnitt-seiten.test.mjs (it names the pages, so it does not travel with the skill's template).
import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { leucht, kontrastVon, farbeAus, pixelAusPng, satzZahl, beschreibungPruefen, hilfen, schnittPruefungen } from "./tools/pruefe-schnitt.mjs";

/** A description that satisfies the interface. */
const GUT = () => ({
  stelle: async () => {},
  zerlegen: { zustand: [6, 0], hubTeile: '[data-g="x"] [data-hub]', hubName: "das Teil" },
  stroemung: [{ name: "Zustand A", richte: async () => {} }],
  festeTeile: ["gehaeuse"],
  ruhe: [{ name: "Ruhe", zustand: [0, 0] }],
  telefon: { zustand: [6, 3], regler: ["#a", "#b", "#c"] },
  richtung: [{ name: "vor", strom: "l", richte: async () => {}, vorzeichen: 1 }],
});

test("Kontrast: Schwarz gegen Weiß ist 21:1, gleiches ist 1:1", () => {
  assert.ok(Math.abs(kontrastVon([0, 0, 0], [255, 255, 255]) - 21) < 1e-9);
  assert.ok(Math.abs(kontrastVon([10, 20, 30], [10, 20, 30]) - 1) < 1e-9);
  assert.ok(Math.abs(leucht([255, 255, 255]) - 1) < 1e-9);
});

test("Farben: auch Fließkomma-Angaben (color(srgb …)) werden als Bytes gelesen", () => {
  assert.deepEqual(farbeAus("rgb(10, 20, 30)"), [10, 20, 30]);
  assert.deepEqual(farbeAus("color(srgb 0.5 1 0 / 0.7)"), [128, 255, 0]);
  assert.equal(farbeAus("keine Farbe"), null);
});

test("Pixel: ein 1×1-PNG wird zu seinen drei Bytes", () => {
  const crc = Buffer.alloc(4);
  const chunk = (typ, daten) => { const l = Buffer.alloc(4); l.writeUInt32BE(daten.length); return Buffer.concat([l, Buffer.from(typ), daten, crc]); };
  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(1, 0); kopf.writeUInt32BE(1, 4); kopf[8] = 8; kopf[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", kopf),
    chunk("IDAT", deflateSync(Buffer.from([0, 12, 34, 56]))), chunk("IEND", Buffer.alloc(0))]);
  assert.deepEqual(pixelAusPng(png), [12, 34, 56]);
});

test("Sätze: gezählt werden Satzenden, Kommazahlen und Abkürzungen zählen nicht", () => {
  assert.equal(satzZahl("Das Ventil sperrt. Es braucht 0,5 bar!"), 2);
  assert.equal(satzZahl("Ein Satz mit 6,0 bar und Ø 4,5 mm"), 1);
  assert.equal(satzZahl(""), 0);
});

test("Schnittstelle: eine vollständige Beschreibung hat keine Beanstandung", () => {
  assert.deepEqual(beschreibungPruefen(GUT()), []);
});

test("Schnittstelle: was fehlt, wird beim Namen genannt", () => {
  for (const [feld, wert] of [["stelle", undefined], ["zerlegen", undefined], ["stroemung", []], ["festeTeile", undefined], ["ruhe", undefined], ["richtung", []]]) {
    const b = GUT();
    b[feld] = wert;
    const probleme = beschreibungPruefen(b);
    assert.ok(probleme.length >= 1 && probleme.some((p) => p.includes(feld)), `${feld}: ${JSON.stringify(probleme)}`);
  }
  const b = GUT();
  b.stroemung = [{ name: "ohne richte" }];
  assert.ok(beschreibungPruefen(b).some((p) => p.includes("richte")));
  const c = GUT();
  c.richtung = [{ name: "x", strom: "l", richte: async () => {}, vorzeichen: 2 }];
  assert.ok(beschreibungPruefen(c).some((p) => p.includes("vorzeichen")));
});

test("Der Prüfer weist eine unvollständige Beschreibung ab, bevor er den Browser anfasst", async () => {
  const V = () => { throw new Error("V darf nicht aufgerufen werden"); };
  await assert.rejects(() => schnittPruefungen({ seite: {}, V, modus: "light", beschreibung: {} }), /stelle/);
});

test("Die Werkzeugkiste bietet, was die Seitenmodule brauchen", () => {
  const h = hilfen({}, "light");
  for (const n of ["hell", "staerker", "gleich", "teilchen", "warteTeilchen", "warteIrgendwoTeilchen", "kasten", "masstab",
    "zeitlupe", "nachBildern", "pixelAnBild", "pixelAnClient", "lauf", "luftPruefung", "text"]) {
    assert.equal(typeof h[n], "function", `hilfen().${n} fehlt`);
  }
  assert.equal(h.staerker(0.2, 0.5), true);          // light mode: darker is stronger
  assert.equal(hilfen({}, "dark").staerker(0.5, 0.2), true);
  assert.equal(h.staerker(0.2, 0.21), false);
  assert.equal(h.gleich(0.2, 0.205), true);
});
