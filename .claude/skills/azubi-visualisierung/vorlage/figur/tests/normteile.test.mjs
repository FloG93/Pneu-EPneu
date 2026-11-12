// The shared drawing parts and the signal-button runtime: the properties the
// pages rely on, without a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { hermite, stummel, federPruefen, normteile, sechskant } from "../normteile.mjs";
import { LAUFZEIT } from "../bedienung.mjs";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";

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

test("Verschraubung mit Muffe: statt des Gewindezapfens eine glatte Hülse um ein Außengewinde, ohne Gewindestriche", () => {
  const P = k.fitProjection([[-20, -10, 0], [20, 10, 20]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
  const gebaut = (D, r) => {
    const items = [];
    const NT = normteile({ P, rec: (s) => s, put: (pos, svg, shapes, extra) => items.push({ svg, shapes, extra }), gruppe: () => {} });
    NT.verschraubung(G.frameOf([48, 0, 9.5], [1, 0, 0], [0, 1, 0], [0, 0, 1]), D, "a", "a", ([a, b]) => [48 + (a + b) / 2, 0, 9.5], r);
    return items;
  };
  const D = { gewinde: [-6.5, 0], sechskant: [0, 3.5], rS: 7.6, koerper: [3.5, 8], rK: 6, ring: [8, 9.5], rR: 5.2 };
  const stummel = gebaut(D, 6.3);
  const muffe = gebaut({ ...D, muffe: { rIn: 6.5 } }, 7.6);
  assert.equal(muffe.length, stummel.length, "gleich viele Teile");
  assert.equal(muffe[0].extra.name, "a.gewinde", "die Hülse trägt den Namen des Gewindeteils (daran hängt der Schnitt)");
  const radien = (teil) => teil.shapes[0].poly.map(([, r]) => r);
  assert.equal(Math.min(...radien(stummel[0])), 0, "der Zapfen ist ein voller Zylinder");
  assert.equal(Math.min(...radien(muffe[0])), 6.5, "die Hülse ist ein Ring um das Außengewinde (Innenradius 6,5)");
  assert.equal(Math.max(...radien(muffe[0])), 7.6);
  const striche = (svg) => (svg.match(/<path class="iso-line"/g) || []).length;   // the thread rings are one line path
  assert.equal(striche(stummel[0].svg), 1);
  assert.equal(striche(muffe[0].svg), 0, "keine Gewindestriche auf der Hülse");
  assert.equal(muffe[1].svg, stummel[1].svg, "Sechskant, Körper und Ring sind dieselben");
});

test("Druckfeder: ein kleines Stück je Wendel macht eine kleine Feder glatt (feder.stueck), der Standard bleibt 4 mm", () => {
  const P = k.fitProjection([[-20, -10, 0], [20, 10, 20]], 900, 800, { pad: 40, azimuth: 38, elevation: 34 });
  const NT = normteile({ P, rec: (s) => s, put: () => {}, gruppe: () => {} });
  const F = G.frameOf([0, 0, 9.5], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const feder = { draht: 0.8, windungen: 6, rWindung: 3.1 };
  const standard = NT.druckfeder(F, 1, 10, feder);
  const fein = NT.druckfeder(F, 1, 10, { ...feder, stueck: 1.2 });
  assert.equal(NT.druckfeder(F, 1, 10, { ...feder, stueck: 4 }).length, standard.length, "stueck 4 ist der Standard");
  assert.ok(fein.length > 2 * standard.length, `${fein.length} feine gegen ${standard.length} grobe Stücke`);
  // the wire is also sampled finer (the default spacing of 2,2 mm would make a coil of radius 3 an octagon)
  const punkte = (teile) => teile.join("").match(/ L/g)?.length ?? teile.join("").length;
  assert.ok(punkte(fein) > 2 * punkte(standard));
});
