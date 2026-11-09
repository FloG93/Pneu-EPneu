// Where an assembly's number hangs. A centroid of parts that lie apart is a
// point in empty space, and a leader line into nothing explains nothing.
import test from "node:test";
import assert from "node:assert/strict";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { vorbereiten } from "../explode.mjs";

const P = k.fitProjection([[0, 0, 0], [200, 0, 0], [0, 100, 50]], 900, 800, { pad: 24, azimuth: 38, elevation: 34 });
const teil = (label, pos, svg = "<path/>") => ({ label, piece: label, pos, key: 0, svg });

test("die Nummer hängt an einem Teil, nicht zwischen zwei getrennten Teilen", () => {
  const R = { items: [teil("schrauben", [0, 0, 50]), teil("schrauben", [120, 0, 50])] };
  const { MITTE } = vorbereiten(R, P, { schrauben: [0, 0, 80] }, 900, 800);
  assert.ok(R.items.some((it) => it.pos.every((v, i) => v === MITTE.schrauben[i])),
    `MITTE ${MITTE.schrauben} ist kein Teil der Baugruppe`);
});

test("bei einem dichten Körper bleibt sie nahe der Mitte", () => {
  const R = { items: [0, 10, 20, 30, 40].map((x) => teil("rohr", [x, 0, 0])) };
  const { MITTE } = vorbereiten(R, P, { rohr: [0, 0, 0] }, 900, 800);
  assert.deepEqual(MITTE.rohr, [20, 0, 0]);
});

test("Teile, die nicht halten dürfen, tragen die Nummer nicht", () => {
  const R = { items: [
    teil("leitung", [0, 0, 0]), teil("leitung", [10, 0, 0]),
    teil("leitung", [100, 0, 0], '<g data-variante="b"><path/></g>'),
    teil("leitung", [110, 0, 0], '<g data-variante="b"><path/></g>'),
  ] };
  const { MITTE } = vorbereiten(R, P, { leitung: [0, 0, 50] }, 900, 800, {
    anker: (it) => !it.svg.includes("data-variante"),
  });
  assert.ok(MITTE.leitung[0] <= 10, `MITTE ${MITTE.leitung} hängt an einem Teil der Variante`);
});

test("darf kein Teil halten, gilt wieder jedes", () => {
  const R = { items: [teil("kappe", [5, 0, 0], "<g data-variante=\"b\"/>")] };
  const { MITTE } = vorbereiten(R, P, { kappe: [0, 0, 0] }, 900, 800, { anker: () => false });
  assert.deepEqual(MITTE.kappe, [5, 0, 0]);
});
