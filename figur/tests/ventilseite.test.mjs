// The parts every valve page shares: the sliders, the page runtime and the
// shapes of the air rooms. The properties the pages rely on, without a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { reglerLeiste, LAUFZEIT, CSS } from "../ventilseite.mjs";
import { ventilRaeume } from "../ventilraeume.mjs";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";

test("Die Regler: Zeitlupe, Schieber von Hand, Druck, je eine Einheit", () => {
  const html = reglerLeiste();
  for (const id of ["zeitlupe", "hand", "druck"]) {
    assert.ok(html.includes(`id="${id}"`) && html.includes(`id="${id}-wert"`), `Regler ${id} fehlt`);
  }
  assert.equal((html.match(/<span class="regler">/g) || []).length, 3);
  assert.ok(html.includes(">6,0 bar</output>"), "Druck beginnt mit Komma");
  assert.match(reglerLeiste({ handBeschreibung: "Stellung 12 bis 14" }), /aria-label="Stellung 12 bis 14"/);
});

test("Die Laufzeit steht ohne Backtick im klassischen Skript und kennt ihre Haken", () => {
  assert.ok(!LAUFZEIT.includes("`"), "ein Backtick im Laufzeittext");
  for (const name of ["function zeichneHub", "function zeichneAnzeige", "function zeichneSymbol", "function bindeRegler", "zeichneKammern(s)", "schaltzeitOptionen()", "ANSCHLUESSE"]) {
    assert.ok(LAUFZEIT.includes(name), `${name} fehlt`);
  }
  assert.doesNotThrow(() => new Function(LAUFZEIT), "kein gültiges Skript");
});

test("Die Stilregeln: Variantenwechsel, Luftfarben, Schaltzeichen", () => {
  assert.match(CSS, /\[data-variante\]\[hidden\]\s*\{\s*display: none/);
  assert.match(CSS, /--sz-stark/);
});

const P = k.fitProjection([[0, -20, 0], [100, 20, 70]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
const RA = ventilRaeume({
  P, PORT: { 1: 25, 2: 45, 3: 65 }, GEH: { z0: 18 }, PLATTE: { z1: 17 }, DICHT: { z0: 17, z1: 18 }, ZA: 44, ZP: 8.5, RB: 6.5, R_NUT: 10.5,
  NUT_HALB: 7, R_KANAL: 4, R_GEWINDE: 6.5, R_HALS: 3.6, R_BUND: 6.3, GEWINDE_START: 12, R_STEUER_BOHRUNG: 1.5, ZK0: 59, KAMMER_Z: [34, 54],
});

test("Räume tragen ihre Nummer, die Steuerkammer ihre Kennung", () => {
  assert.match(RA.raumUnten("1"), /^<g class="kammer" data-raum="1" fill="none"><path d="M/);
  assert.match(RA.raumSteuer("st", -14.5, [-17, -13]), /data-raum="st"[\s\S]*data-steuerkammer="st"/);
  assert.match(RA.raumUnten("2", RA.halsUnten(30, 40)), /<g data-hub="">/);
});

test("Die Lücke über dem Hals wird nicht größer als der Hals lang ist", () => {
  const zahlen = (d) => [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[1]));
  const x = zahlen(RA.halsOben(30, 40).match(/d="([^"]+)"/)[1]);
  assert.ok(Math.max(...x) - Math.min(...x) < 200, "Pfad entgleist");
  assert.ok(RA.halsOben(30, 40).startsWith('<g data-hub="">'));
});

test("Wege: quer unter dem Steg, von außen bis zum Nutgrund", () => {
  const q = RA.quer(1, 2);
  assert.equal(q.length, 4);
  assert.equal(q[0][2], RA.ZN);
  assert.equal(q[1][2], RA.ZG);
  assert.ok(q[0][0] < q[1][0] && q[2][0] < q[3][0], "von 1 nach 2: x steigt");
  const aussen = RA.vonAussen(1, { wege: { 1: [[25, 40, 8.5], [25, 30, 8.5]] }, daempfer: null, abluft: [3], gewinde: [12, 24] });
  assert.deepEqual(aussen[aussen.length - 1], [25, 0, RA.ZN]);
  const dampf = RA.vonAussen(3, { wege: {}, daempfer: { sinter: [30, 40], kuppe: 2, sechskant: [24, 28] }, abluft: [3], gewinde: [12, 24] });
  assert.equal(dampf[0][1], 50, "beginnt hinter der Kuppe des Schalldämpfers");
});
