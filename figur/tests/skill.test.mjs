// The skill .claude/skills/azubi-visualisierung carries a copy of this repo's
// scaffold (vorlage/) and of the cylinder (beispiel/), so that it can start a
// collection in any other subject. A copy that drifts from the original teaches
// the old mistakes again, so every copy is held byte for byte against its
// source here: change the original, then copy it over.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(WURZEL, ".claude", "skills", "azubi-visualisierung");

/** [copy in the skill, original in the repo] */
const PAARE = [
  ...["explode", "legende", "schnitt", "toene", "seite", "luft"]
    .map((m) => [`vorlage/figur/${m}.mjs`, `figur/${m}.mjs`]),
  ["vorlage/figur/schaltzeichen.mjs", "figur/schaltzeichen.mjs"],
  ["vorlage/figur/normteile.mjs", "figur/normteile.mjs"],
  ["vorlage/figur/bedienung.mjs", "figur/bedienung.mjs"],
  ["vorlage/figur/gehaeuse.mjs", "figur/gehaeuse.mjs"],
  ["vorlage/figur/tests/gehaeuse.test.mjs", "figur/tests/gehaeuse.test.mjs"],
  ["vorlage/figur/ventilseite.mjs", "figur/ventilseite.mjs"],
  ["vorlage/figur/ventilraeume.mjs", "figur/ventilraeume.mjs"],
  ["vorlage/figur/tests/ventilseite.test.mjs", "figur/tests/ventilseite.test.mjs"],
  ["vorlage/figur/schnittteile.mjs", "figur/schnittteile.mjs"],
  ["vorlage/figur/schnittseite.mjs", "figur/schnittseite.mjs"],
  ["vorlage/figur/tests/schnittteile.test.mjs", "figur/tests/schnittteile.test.mjs"],
  ["vorlage/figur/tests/schnittseite.test.mjs", "figur/tests/schnittseite.test.mjs"],
  ["vorlage/figur/zylinderteile.mjs", "figur/zylinderteile.mjs"],
  ["vorlage/figur/zylinderseite.mjs", "figur/zylinderseite.mjs"],
  ["vorlage/figur/tests/zylinderteile.test.mjs", "figur/tests/zylinderteile.test.mjs"],
  ["vorlage/figur/tests/normteile.test.mjs", "figur/tests/normteile.test.mjs"],
  ["vorlage/figur/tests/luft.test.mjs", "figur/tests/luft.test.mjs"],
  ["vorlage/figur/tests/tools/build-uebersicht.mjs", "figur/tests/tools/build-uebersicht.mjs"],
  ["vorlage/figur/tests/tools/pruefe-figur.mjs", "figur/tests/tools/pruefe-figur.mjs"],
  ["vorlage/figur/tests/tools/pruefe-schnitt.mjs", "figur/tests/tools/pruefe-schnitt.mjs"],
  ["vorlage/figur/tests/pruefe-schnitt.test.mjs", "figur/tests/pruefe-schnitt.test.mjs"],
  ["vorlage/figur/tests/tools/gate.mjs", "figur/tests/tools/gate.mjs"],
  ["vorlage/figur/tests/gate.test.mjs", "figur/tests/gate.test.mjs"],
  ["vorlage/figur/tests/publish-wachter.test.mjs", "figur/tests/publish-wachter.test.mjs"],
  ["vorlage/shared/css/kontrast.css", "shared/css/kontrast.css"],
  ["vorlage/shared/js/kontrast.js", "shared/js/kontrast.js"],
  ["vorlage/shared/js/util.js", "shared/js/util.js"],
  ["vorlage/shared/tests/kontrast.test.mjs", "shared/tests/kontrast.test.mjs"],
  ["vorlage/.github/workflows/pages.yml", ".github/workflows/pages.yml"],
  ["beispiel/zylinder-doppeltwirkend/pneumatik.mjs", "figur/pneumatik.mjs"],
  ["beispiel/zylinder-doppeltwirkend/ventil.mjs", "figur/ventil.mjs"],
  ["beispiel/zylinder-doppeltwirkend/pneumatik.test.mjs", "figur/tests/pneumatik.test.mjs"],
  ...["build-zylinder", "legende-zylinder", "pruefe-zylinder"].map((d) =>
    [`beispiel/zylinder-doppeltwirkend/${d}.mjs`, `Zylinder-Doppeltwirkend/tests/tools/${d}.mjs`]),
  ["beispiel/zylinder-doppeltwirkend/seite.test.mjs", "Zylinder-Doppeltwirkend/tests/seite.test.mjs"],
  ["beispiel/zylinder-doppeltwirkend/vorschau.svg", "Zylinder-Doppeltwirkend/vorschau.svg"],
  ["beispiel/zylinder-doppeltwirkend/favicon.svg", "Zylinder-Doppeltwirkend/favicon.svg"],
  ["beispiel/zylinder-doppeltwirkend/figur-README.md", "Zylinder-Doppeltwirkend/README.md"],
];

for (const [kopie, original] of PAARE) {
  test(`Skill-Kopie stimmt mit dem Original: ${original}`, () => {
    const a = readFileSync(join(SKILL, kopie));
    const b = readFileSync(join(WURZEL, original));
    assert.ok(a.equals(b), `${kopie} weicht von ${original} ab – Original nach .claude/skills/azubi-visualisierung/${kopie} kopieren`);
  });
}

test("Jeder Verweis in SKILL.md und den Referenzen zeigt auf eine Datei, die es gibt", () => {
  const texte = ["SKILL.md", "references/auftrag.md", "references/farben.md", "references/modell.md",
    "references/zeichnen.md", "references/pruefen.md", "references/veroeffentlichen.md", "references/schnittseite.md", "beispiel/README.md"];
  for (const t of texte) {
    const md = readFileSync(join(SKILL, t), "utf8");
    for (const [, ziel] of md.matchAll(/\]\(((?!https?:)[^)#]+)\)/g)) {
      assert.ok(existsSync(join(SKILL, dirname(t), ziel)), `${t} verweist auf ${ziel}, das es nicht gibt`);
    }
  }
});

test("Die Beschreibung des Skills passt in die Grenze für Skill-Köpfe", () => {
  const kopf = readFileSync(join(SKILL, "SKILL.md"), "utf8").split("---")[1];
  assert.match(kopf, /^name: azubi-visualisierung$/m);
  assert.ok(kopf.length <= 1024, `Kopf hat ${kopf.length} Zeichen`);
});

test("anlegen.mjs legt ein Projekt in einem anderen Fach an, und dessen Tests sind grün", () => {
  const ziel = mkdtempSync(join(tmpdir(), "azubi-"));
  try {
    const skript = join(SKILL, "scripts", "anlegen.mjs");
    const beispiel = join(SKILL, "scripts", "projekt.beispiel.json");
    execFileSync(process.execPath, [skript, ziel, beispiel], { stdio: "pipe" });

    const claude = readFileSync(join(ziel, "CLAUDE.md"), "utf8");
    assert.ok(!/\{\{/.test(claude + readFileSync(join(ziel, "README.md"), "utf8")), "Platzhalter nicht ersetzt");
    assert.match(claude, /Hydrauliköl/);
    assert.ok(existsSync(join(ziel, ".claude", "skills", "anatomy", "kit", "iso-kit.mjs")), "Zeichen-Kit fehlt");

    // The new project's own tests, including its measured medium tones.
    // Without NODE_TEST_CONTEXT removed, a nested node --test exits 0 even when a test in it fails.
    const sauber = { ...process.env };
    delete sauber.NODE_TEST_CONTEXT;
    const lauf = spawnSync(process.execPath, ["--test", "figur/tests/*.test.mjs", "shared/tests/*.test.mjs"], { cwd: ziel, encoding: "utf8", env: sauber });
    assert.equal(lauf.status, 0, lauf.stdout.slice(-1500));

    execFileSync(process.execPath, ["figur/tests/tools/build-uebersicht.mjs"], { cwd: ziel, stdio: "pipe" });
    const html = readFileSync(join(ziel, "index.html"), "utf8");
    assert.match(html, /<h1>Hydraulik<\/h1>/);
    assert.match(html, /--ton-stark: #0b5d5a/);

    // A second run must not overwrite a project that exists.
    const nochmal = spawnSync(process.execPath, [skript, ziel, beispiel], { encoding: "utf8" });
    assert.equal(nochmal.status, 1);
    assert.match(nochmal.stderr, /gibt es schon/);
  } finally {
    rmSync(ziel, { recursive: true, force: true });
  }
});
