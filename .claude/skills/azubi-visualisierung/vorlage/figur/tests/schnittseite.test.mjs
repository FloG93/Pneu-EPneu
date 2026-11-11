// What every section page shares at runtime and in its frame. The behaviour in the
// browser is checked by the pages' own browser modules; this holds what would otherwise
// show only as a blank page: a script that does not parse, a name defined twice, a hook
// that the runtime calls and nobody documents.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as EX from "../explode.mjs";
import * as LEG from "../legende.mjs";
import * as LU from "../luft.mjs";
import { LAUFZEIT as BEDIENUNG } from "../bedienung.mjs";
import { SYMBOL_LAUFZEIT, DROSSEL_SYMBOL_LAUFZEIT, WECHSEL_SYMBOL_LAUFZEIT } from "../schaltzeichen.mjs";
import { LUFTLAGE_HINTEN } from "../schnittteile.mjs";
import { LAUFZEIT, CSS, leiste, schaltzeichenBlock, lebendSkript, seiteSchreiben } from "../schnittseite.mjs";

const WURZEL = join(import.meta.dirname, "..", "..");

test("Die Laufzeit steht ohne Backtick im klassischen Skript", () => {
  assert.ok(!LAUFZEIT.includes("`"));
  assert.ok(!CSS.includes("`"));
  assert.doesNotThrow(() => new Function(LAUFZEIT));
});

test("Die Laufzeit nennt jeden Haken, den sie von der Seite erwartet, und jeden Namen, den sie bereitstellt", () => {
  for (const haken of ["seiteAutoSchritt()", "zeichneBedienung()", "modellSchritt(dm)", "zeichneModell(dm)", "zeichneStets()", "hubMarke(hubAnteil)", "hubStellen(hubAnteil)", "anzeigeText()"]) {
    assert.ok(LAUFZEIT.includes(haken), `${haken} wird nicht gerufen`);
  }
  for (const name of ["function bildZeichnen", "function vorDemZerlegen", "function schnittStart", "function figurGrundstock", "function stelleFest",
    "function bedient", "function zeichneHub", "function zeichneAnzeige", "function zeichneLagen", "function setzeRaumFarben", "function luftStroeme", "const stoppeAuto", "const bed ="]) {
    assert.ok(LAUFZEIT.includes(name), `${name} fehlt`);
  }
});

test("Mit dem Rest der Seite in einem Skript: keine doppelte Definition", () => {
  const alles = [EX.LAUFZEIT, LEG.LAUFZEIT, EX.ABLAUF, LU.LAUFZEIT, SYMBOL_LAUFZEIT, DROSSEL_SYMBOL_LAUFZEIT, WECHSEL_SYMBOL_LAUFZEIT, BEDIENUNG, LAUFZEIT].join("\n");
  assert.doesNotThrow(() => new Function(alles), "Namen doppelt oder Skript ungültig");
});

test("Tempo und Stärke der Teilchen: vorzeichenrichtig, begrenzt, ohne Durchfluss still", () => {
  const f = new Function("SKALA", `${LAUFZEIT.match(/const tempoVon[^\n]*\nconst staerkeVon[^\n]*/)[0]}; return { tempoVon, staerkeVon };`);
  const { tempoVon, staerkeVon } = f({ tempo: 0.25, tempoMax: 160, bezug: 420 });
  assert.equal(tempoVon(0), 0);
  assert.equal(tempoVon(100), 25);
  assert.equal(tempoVon(-100), -25);
  assert.equal(tempoVon(1e6), 160);
  assert.equal(tempoVon(-1e6), -160);
  assert.equal(staerkeVon(0), 0);
  assert.equal(staerkeVon(0.4), 0);
  assert.equal(staerkeVon(420), 1);
  assert.equal(staerkeVon(-420), 1, "ein Rückstrom zählt mit seiner Größe");
  assert.ok(Math.abs(staerkeVon(210) - 0.65) < 1e-12);   // 0,3 + 0,7 · 210 / 420
});

test("Die Leiste: die Knöpfe der Seite, Automatik, Zerlegen, Kontrast und Thema", () => {
  const html = leiste('<button id="eigen">x</button>');
  assert.ok(html.startsWith('<button id="eigen">x</button>'));
  for (const id of ["btn-auto", "btn-explode", "kontrast", "btn-theme"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /id="btn-auto"[^>]*aria-pressed="true"/);
  assert.match(html, /Zerlegen und zusammenbauen/);
});

test("Der Block neben der Karte: Titel, Symbol, Text", () => {
  const html = schaltzeichenBlock({ svg: "<svg></svg>", text: "Erklärung" });
  assert.match(html, /<p class="beifigur-titel">Schaltzeichen<\/p><div class="beifigur-symbol"><svg><\/svg><\/div><p class="beifigur-text">Erklärung<\/p>/);
});

const ANSICHT = { KEYS: [1, 2], LIFT: { a: 0.5 }, VIEW0: [0, 0, 900, 800], VIEW1: [-10.04, -8.06, 920.14, 816.07], MITTE: { a: [1.04, 2.06, 3.01] } };
const ARGS = {
  wurzel: WURZEL, P: { s: 1 }, MOVE: { a: [0, 0, 1] }, STAGGER: ["a"], ansicht: ANSICHT,
  LEGENDE: [{ piece: "a", nr: "01", titel: "A", satz: "Ein Satz. Noch einer." }],
  BAHNEN: { x: { punkte: [[0, 0], [1, 1]], laenge: [0, 1.4], gesamt: 1.4 } }, SEITE_VON: { x: "s1" }, ANZAHL: { x: 3 }, VORNE: ["x"],
  SKALA: { tempo: 0.25, tempoMax: 160, bezug: 420 }, AUTO_TAKT: 3, modelle: [], symbole: [DROSSEL_SYMBOL_LAUFZEIT],
  konstanten: "const MEINS = 7;", eigenes: "const meins = MEINS;",
};

test("Das Skript: Konstanten gerundet, in der Reihenfolge Konstanten, Elemente, Laufzeiten, Seite", () => {
  const s = lebendSkript(ARGS);
  assert.match(s, /const VIEW1 = \[-10,-8.1,920.1,816.1\];/);
  assert.match(s, /const MITTE = \{"a":\[1,2.1,3\]\};/);
  assert.match(s, /const AUTO_TAKT = 3;/);
  assert.match(s, /const ANZAHL = \{"x":3\};/);
  assert.match(s, /const VORNE = \["x"\];/);
  const reihe = ["const P =", "const MEINS = 7;", 'const stage = document.querySelector(".iso-stage")', "const byPiece", "const NSL", "function drosselSymbolStellen", "function bedienungSignale", "const komma", "const meins = MEINS;"];
  let von = -1;
  for (const stueck of reihe) {
    const i = s.indexOf(stueck);
    assert.ok(i > von, `${stueck} steht nicht an seiner Stelle`);
    von = i;
  }
  assert.doesNotThrow(() => new Function(s), "das Skript ist ungültig");
});

test("Die Seite wird geschrieben: Skript, eigene Stilregeln und Schnittton in der Seite", () => {
  const ordner = mkdtempSync(join(tmpdir(), "schnitt-"));
  try {
    const ziel = join(ordner, "teil", "index.html");
    seiteSchreiben({
      ziel, css: ".eigene-regel { color: red }\n", titel: "Test – Pneumatik", fig: "Bild 1", kartenTitel: "Test", hinweis: "x", anzeige: "Anzeige",
      caption: "Eine Bildunterschrift.", svg: "<svg viewBox=\"0 0 10 10\"></svg>", leiste: leiste(""), laufzeit: "window.__probe = 1;",
    });
    const html = readFileSync(ziel, "utf8");
    assert.match(html, /<html lang="de">/);
    assert.match(html, /\.eigene-regel \{ color: red \}/);
    assert.match(html, /window\.__probe = 1;/);
    assert.match(html, /rel="icon"[^>]*favicon\.svg/);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test("Die Schicht für die Teilchen im Gehäuse hat die Kennung, die die Laufzeit sucht", () => {
  assert.match(LUFTLAGE_HINTEN, /data-luftlage-hinten/);
  assert.ok(LAUFZEIT.includes('"[data-luftlage-hinten]"'));
});
