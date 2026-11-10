// The shared drawing parts and the signal-button runtime: the properties the
// pages rely on, without a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { hermite, stummel, federPruefen, normteile, sechskant } from "../normteile.mjs";
import { LAUFZEIT } from "../bedienung.mjs";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";

test("Druckfeder: Blocklänge passt – zu viele Windungen werfen", () => {
  // 15 mm in Ruhe, 7 mm Hub: 8 mm bei vollem Hub
  const text = federPruefen({ laenge: 15, draht: 1.1, windungen: 4.5 }, 7, 1);
  assert.match(text, /Reserve 1\.95 mm/);
  assert.throws(() => federPruefen({ laenge: 15, draht: 1.1, windungen: 6.5 }, 7, 1), /Feder geht auf Block/);
});

test("Hermite-Schlauch beginnt und endet an den Anschlusspunkten", () => {
  const p0 = [10, 20, 30], p1 = [12, 40, 25];
  const w = hermite(p0, [0, 5, 0], p1, [0, 4, -1], 20);
  assert.equal(w.length, 21);
  w[0].forEach((v, j) => assert.ok(Math.abs(v - p0[j]) < 1e-9));
  w[20].forEach((v, j) => assert.ok(Math.abs(v - p1[j]) < 1e-9));
});

test("Schlauchstummel startet im Anschluss und endet am Schnitt", () => {
  const w = stummel([0, 0, 0], [0, 1, 0], [0, 13, -1.5], [0, 0.95, -0.3], 4);
  assert.deepEqual(w[0], [0, 0, 0]);
  w[w.length - 1].forEach((v, j) => assert.ok(Math.abs(v - [0, 13, -1.5][j]) < 1e-9));
});

test("Sechskant hat sechs Ecken auf dem Radius", () => {
  const h = sechskant(5);
  assert.equal(h.length, 6);
  for (const [u, v] of h) assert.ok(Math.abs(Math.hypot(u, v) - 5) < 1e-9);
});

test("Schnittfläche trägt den gemeinsamen Ton und die Markierung", () => {
  const P = k.fitProjection([[0, 0, 0], [10, 10, 10]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
  const NT = normteile({ P, rec: (s) => s, put: () => {}, gruppe: () => {} });
  const svg = NT.schnitt([[0, 0, 0], [5, 0, 0], [5, 0, 5]]);
  assert.match(svg, /data-schnitt=""/);
  assert.match(svg, /data-shade="3"/);
});

test("Laufzeit der Bedienung ist gültiges Skript", () => {
  assert.ok(!LAUFZEIT.includes("`"), "Backtick im Laufzeittext");
  assert.doesNotThrow(() => new Function(LAUFZEIT));
  const bedienungSignale = new Function(`${LAUFZEIT}; return bedienungSignale;`)();
  assert.equal(typeof bedienungSignale, "function");
});

test("Bedienung: Halten setzt das Signal, Loslassen nimmt es zurück, Impuls läuft in Modellzeit ab", () => {
  const bedienungSignale = new Function(`${LAUFZEIT}; return bedienungSignale;`)();
  const signal = { "14": false, "12": false };
  let geaendert = 0, autoAn = true;
  const bed = bedienungSignale({
    namen: ["14", "12"], impuls: 0.15, autoTakt: 1.6, autoAn: true, erster: "14",
    haltenModus: () => true,
    setzeSignal: (n, an) => { signal[n] = an; },
    autoSchritt: (b) => { signal["14"] = !signal["14"]; },
    autoEnde: (b) => { if (!b.gehalten["14"]) signal["14"] = false; },
    autoAnzeige: (an) => { autoAn = an; },
    geaendert: () => { geaendert += 1; },
  });
  bed.halte("14", true);
  assert.equal(signal["14"], true);
  assert.equal(bed.auto, false, "Halten stoppt die Automatik");
  assert.equal(autoAn, false);
  bed.halte("14", false);
  assert.equal(signal["14"], false);
  assert.equal(geaendert, 2);
  bed.impuls("12");
  assert.equal(signal["12"], true);
  bed.takt(0.1);
  assert.equal(signal["12"], true);
  bed.takt(0.06);
  assert.equal(signal["12"], false);
  // automatic step after autoTakt of model time
  bed.autoStart("14");
  bed.takt(1.5);
  assert.equal(signal["14"], false);
  bed.takt(0.2);
  assert.equal(signal["14"], true);
  bed.autoAus();
  assert.equal(signal["14"], false, "autoEnde lässt los");
});

test("Druckfeder mit teilen: hinten und vorn zusammen sind genau die ganze Wendel, beide nicht leer", () => {
  const P2 = k.fitProjection([[0, -40, 0], [100, 40, 80]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
  const NT = normteile({ P: P2, rec: (s) => s, put: () => {}, gruppe: () => {} });
  const F = { o: [0, 0, 40], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  const feder = { draht: 3, windungen: 6, rWindung: 12 };
  const ganz = NT.druckfeder(F, 10, 70, feder);
  const { hinten, vorn } = NT.druckfeder(F, 10, 70, feder, { teilen: true });
  assert.equal(hinten.length + vorn.length, ganz.length);
  assert.ok(hinten.length > 10 && vorn.length > 10, `hinten ${hinten.length}, vorn ${vorn.length}`);
  assert.ok([...hinten, ...vorn].every((s) => s.startsWith("<g data-federx=")));
});
