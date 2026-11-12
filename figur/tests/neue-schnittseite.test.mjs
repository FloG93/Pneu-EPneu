// The generator of new section pages (.claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs).
// It is run on a copy of the repo (without .git and node_modules), never on the repo itself: the copy is where the new
// page must build and pass its audit, where a second run must stop, and where --entfernen must give back exactly what was there.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const WURZEL = join(import.meta.dirname, "..", "..");
const ORDNER = "ZZTest", ID = "zztest", NAME = "Zett-Test-Ventil";
let kopie;

const generator = (...args) => spawnSync(process.execPath, [join(kopie, ".claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs"), ...args],
  { cwd: kopie, encoding: "utf8" });
const gen = () => generator(ORDNER, ID, NAME, "--rubrik", "sperr-und-stromventile");
const lies = (p) => readFileSync(join(kopie, p), "utf8");
/** Every file of the copy with its hash: the state to compare before and after. */
function zustand() {
  const aus = {};
  const geh = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) geh(p); else aus[relative(kopie, p)] = createHash("sha1").update(readFileSync(p)).digest("hex");
    }
  };
  geh(kopie);
  return aus;
}

before(() => {
  kopie = mkdtempSync(join(tmpdir(), "schnittseite-"));
  cpSync(WURZEL, kopie, { recursive: true, filter: (q) => !/(^|\/)(\.git|node_modules|\.superpowers)(\/|$)/.test(relative(WURZEL, q)) });
});
after(() => rmSync(kopie, { recursive: true, force: true }));

test("Ohne Angaben oder mit falschen Namen schreibt der Generator nichts", () => {
  const vorher = zustand();
  assert.equal(generator().status, 2);
  const umlaut = generator("Rückschlag", ID, NAME);
  assert.equal(umlaut.status, 1);
  assert.match(umlaut.stderr, /Ordner/);
  assert.equal(generator(ORDNER, "Gross", NAME).status, 1);
  assert.equal(generator(ORDNER, ID, NAME, "--rubrik", "gibt-es-nicht").status, 1);
  assert.deepEqual(zustand(), vorher);
});

test("Er legt die Seite an: Dateien, Skripte, CI-Schritt, Liste der Seiten", () => {
  const l = gen();
  assert.equal(l.status, 0, l.stderr);
  for (const p of [`${ORDNER}/tests/tools/build-${ID}.mjs`, `${ORDNER}/tests/tools/legende-${ID}.mjs`, `${ORDNER}/tests/tools/pruefe-${ID}.mjs`,
    `${ORDNER}/tests/seite.test.mjs`, `${ORDNER}/README.md`, `${ORDNER}/favicon.svg`, `${ORDNER}/vorschau.svg`, `${ORDNER}/.generiert.json`,
    `figur/${ID}.mjs`, `figur/tests/${ID}.test.mjs`]) assert.ok(existsSync(join(kopie, p)), `${p} fehlt`);
  const pj = JSON.parse(lies("package.json"));
  for (const k of [`test:${ID}`, `bau:${ID}`, `pruef:${ID}`, `pruef:browser:${ID}`]) assert.ok(pj.scripts[k], `${k} fehlt`);
  assert.ok(pj.scripts.test.endsWith(` && npm run test:${ID}`));
  assert.match(pj.scripts[`pruef:browser:${ID}`], new RegExp(`${ORDNER}/ ${ORDNER}/tests/tools/pruefe-${ID}\\.mjs`));
  assert.match(lies(".github/workflows/tests.yml"), new RegExp(`name: Geometrie des ${NAME} prüfen\\n\\s+run: npm run pruef:${ID}\\n`));
  assert.match(lies("figur/tests/schnitt-seiten.test.mjs"), new RegExp(`\\["${ORDNER}", "pruefe-${ID}\\.mjs"\\],`));
});

test("Keine ungesetzten Platzhalter, jede Marke heißt TODO(id), nichts nennt mehr das Wechselventil", () => {
  const dateien = [`${ORDNER}/tests/tools/build-${ID}.mjs`, `${ORDNER}/tests/tools/legende-${ID}.mjs`, `${ORDNER}/tests/tools/pruefe-${ID}.mjs`,
    `${ORDNER}/tests/seite.test.mjs`, `${ORDNER}/README.md`, `figur/${ID}.mjs`, `figur/tests/${ID}.test.mjs`];
  let marken = 0;
  for (const p of dateien) {
    const t = lies(p);
    assert.ok(!t.includes("{{"), `${p}: {{ steht noch drin`);
    for (const m of t.matchAll(/TODO\(([^)]*)\)/g)) { assert.equal(m[1], ID, `${p}: ${m[0]}`); marken += 1; }
    assert.ok(!/Wechselventil/.test(t), `${p} nennt noch das Wechselventil`);
  }
  assert.ok(marken >= 30, `nur ${marken} Marken`);
  // the build script has a mark at every place the shuttle valve's own parts stand
  const bau = lies(`${ORDNER}/tests/tools/build-${ID}.mjs`);
  for (const anker of ["const HOHLRAUM = [", "const ROUTEN = {", "const LUFTWEGE = [", "const MESSPUNKTE = {", "const LESETEXT =", "function stopfen()"]) {
    const i = bau.indexOf(anker);
    assert.ok(i > 0 && /TODO\(zztest\)[^\n]*\n[^\n]*$/.test(bau.slice(0, i + anker.length).split("\n").slice(-2).join("\n")), `keine Marke vor ${anker}`);
  }
});

test("Die Prüfungen der Seite tragen TODO im Namen: keine ist still grün", () => {
  const pruefe = lies(`${ORDNER}/tests/tools/pruefe-${ID}.mjs`);
  const aufrufe = [...pruefe.matchAll(/\bV\((?:"|`)(.{0,20})/g)];
  assert.ok(aufrufe.length > 20, "zu wenige Prüfungen gefunden");
  for (const a of aufrufe) assert.match(a[1], /^TODO\(zztest\): /, `Prüfung ohne TODO: ${a[0]}`);
  assert.match(pruefe, /schnittPruefungen\(/);
  assert.match(pruefe, /from "\.\.\/\.\.\/\.\.\/figur\/tests\/tools\/pruefe-schnitt\.mjs"/);
  for (const t of [lies(`${ORDNER}/tests/seite.test.mjs`), lies(`figur/tests/${ID}.test.mjs`)]) {
    const namen = [...t.matchAll(/\btest\((?:"|`)(.{0,20})/g)];
    assert.ok(namen.length > 3);
    for (const n of namen) assert.match(n[1], /^TODO\(zztest\): /, `Test ohne TODO: ${n[0]}`);
  }
});

test("Die Modell-Probe der neuen Seite läuft und ist grün", () => {
  const l = spawnSync(process.execPath, ["--test", `figur/tests/${ID}.test.mjs`], { cwd: kopie, encoding: "utf8" });
  assert.equal(l.status, 0, l.stdout.slice(-800));
});

test("Die neue Seite baut, und die Geometrie besteht den Audit", () => {
  const l = spawnSync(process.execPath, [`${ORDNER}/tests/tools/build-${ID}.mjs`, "--audit"], { cwd: kopie, encoding: "utf8" });
  assert.equal(l.status, 0, (l.stdout + l.stderr).slice(-1200));
  assert.match(l.stdout + l.stderr, /audit passed/);
  assert.ok(existsSync(join(kopie, ORDNER, "index.html")));
});

test("Ein zweiter Lauf bricht ab und überschreibt nichts", () => {
  const vorher = zustand();
  const l = gen();
  assert.equal(l.status, 1);
  assert.match(l.stderr, /gibt es schon/);
  assert.deepEqual(zustand(), vorher);
});

test("--entfernen weigert sich, sobald die Seite verändert wurde", () => {
  const readme = join(kopie, ORDNER, "README.md");
  const alt = readFileSync(readme, "utf8");
  writeFileSync(readme, alt + "\nschon bearbeitet\n");
  const l = generator(ORDNER, "--entfernen");
  assert.equal(l.status, 1);
  assert.match(l.stderr, /README\.md ist verändert/);
  assert.ok(existsSync(join(kopie, ORDNER)));
  writeFileSync(readme, alt);
  writeFileSync(join(kopie, ORDNER, "fremd.txt"), "x");
  const m = generator(ORDNER, "--entfernen");
  assert.equal(m.status, 1);
  assert.match(m.stderr, /fremde Dateien: fremd\.txt/);
  rmSync(join(kopie, ORDNER, "fremd.txt"));
});

test("--entfernen gibt den Stand vor dem Anlegen zurück (bis auf die gebaute Seite)", () => {
  const l = generator(ORDNER, "--entfernen");
  assert.equal(l.status, 0, l.stderr);
  assert.ok(!existsSync(join(kopie, ORDNER)));
  assert.ok(!existsSync(join(kopie, "figur", `${ID}.mjs`)));
  const pj = JSON.parse(lies("package.json"));
  assert.ok(!Object.keys(pj.scripts).some((k) => k.includes(ID)));
  assert.ok(!pj.scripts.test.includes(ID));
  assert.ok(!lies(".github/workflows/tests.yml").includes(ID));
  assert.ok(!lies("figur/tests/schnitt-seiten.test.mjs").includes(ORDNER));
  // exactly the original files again
  const original = {};
  const geh = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (/(^|\/)(\.git|node_modules|\.superpowers)$/.test(relative(WURZEL, p))) continue; if (statSync(p).isDirectory()) geh(p); else original[relative(WURZEL, p)] = createHash("sha1").update(readFileSync(p)).digest("hex"); } };
  geh(WURZEL);
  assert.deepEqual(zustand(), original);
});
