// Where an assembly's number hangs. A centroid of parts that lie apart is a
// point in empty space, and a leader line into nothing explains nothing.
import test from "node:test";
import assert from "node:assert/strict";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { vorbereiten, LAUFZEIT, ABLAUF } from "../explode.mjs";
import { LAUFZEIT as LEG_LAUFZEIT } from "../legende.mjs";

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

// The page's run is shared: legend runtime, explode runtime and ABLAUF are
// inlined into one classic script, so their top-level names must not clash.

test("Laufzeiten von Legende, Explosion und Ablauf ergeben zusammen ein gültiges Skript", () => {
  const code = LAUFZEIT + LEG_LAUFZEIT + ABLAUF + "function bildZeichnen() {}\nfunction vorDemZerlegen() {}";
  assert.doesNotThrow(() => new Function(code));   // duplicate let/const → SyntaxError
});

test("Ablauf: der Knopf setzt erst zurück, dann zerlegt er; Escape baut wieder zusammen", () => {
  const hoerer = {};
  const knopf = { attrs: {}, setAttribute(n, w) { this.attrs[n] = w; },
    addEventListener(t, f) { hoerer["knopf:" + t] = f; } };
  const dokument = {
    getElementById: (id) => (id === "btn-explode" ? knopf : null),
    querySelectorAll: () => [],
    addEventListener: (t, f) => { hoerer["doc:" + t] = f; },
  };
  const spur = [];
  const info = { textContent: "Ruhe" };
  const lauf = new Function("document", "info", "spur", "IntersectionObserver", "requestAnimationFrame",
    "setTimeout", "clearTimeout", `
    const groups = [], STEP = {}, ORDER = ["a", "b"], TAKT = { auseinander: 300, zusammen: 950 };
    const stage = {};
    function schedule(on) { spur.push("schedule " + on); }
    function springStep() { return false; }
    function poseExplode() { return 0; }
    function bildZeichnen() {}
    function vorDemZerlegen() { spur.push("zurück"); }
    ${LEG_LAUFZEIT}
    ${ABLAUF}
    return { zerlegt: () => zerlegt };`);
  const io = class { observe() {} };
  const h = lauf(dokument, info, spur, io, () => 1, () => 0, () => {});
  hoerer["knopf:click"]();
  assert.deepEqual(spur, ["zurück", "schedule true"]);
  assert.equal(h.zerlegt(), true);
  assert.equal(knopf.attrs["aria-pressed"], "true");
  hoerer["doc:keydown"]({ key: "Escape" });
  assert.deepEqual(spur, ["zurück", "schedule true", "schedule false"]);
  assert.equal(h.zerlegt(), false);
  // Escape while assembled does nothing.
  hoerer["doc:keydown"]({ key: "Escape" });
  assert.equal(spur.length, 3);
});
