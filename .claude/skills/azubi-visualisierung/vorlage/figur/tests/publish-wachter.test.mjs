// A draft page must not be published. The generator (neue-schnittseite.mjs) lets a new page say ENTWURF and carry
// `TODO(<id>)` into its index.html; pages.yml refuses to deploy such a page, and this test fails for a COMMITTED one
// (an index.html that is only on disk, like a page being worked on, is not published and not judged here).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const WURZEL = join(import.meta.dirname, "..", "..");
const git = (...a) => spawnSync("git", a, { cwd: WURZEL, encoding: "utf8" });
const imRepo = git("rev-parse", "--is-inside-work-tree").stdout.trim() === "true";

test("Keine eingecheckte index.html enthält TODO( – ein Entwurf wird nicht veröffentlicht", { skip: imRepo ? false : "kein Git-Repository" }, () => {
  const dateien = git("ls-files", "--", "index.html", "*/index.html").stdout.split("\n").filter(Boolean);
  assert.ok(dateien.length >= 1, "keine index.html im Index gefunden");
  const entwuerfe = dateien.filter((d) => readFileSync(join(WURZEL, d), "utf8").includes("TODO("));
  assert.deepEqual(entwuerfe, [], `Entwurf eingecheckt (TODO( in der Seite): ${entwuerfe.join(", ")}`);
});

test("pages.yml bricht ab, wenn die index.html einer Seite TODO( enthält", () => {
  const yml = readFileSync(join(WURZEL, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(yml, /grep -q 'TODO\(' "\$page\/index\.html"/, "der Wächter fehlt in pages.yml");
  assert.match(yml, /::error[^\n]*TODO/, "der Wächter meldet nicht laut");
  assert.match(yml, /exit 1/);
  // the guard comes before the page is copied into the site
  assert.ok(yml.indexOf("grep -q 'TODO('") < yml.indexOf('cp -r "$page" "_site/$page"'), "der Wächter muss vor dem Kopieren stehen");
  // the generator's record is never published
  assert.match(yml, /\.generiert\.json/);
});

test("Der Wächter in pages.yml hält wirklich: ein Beispiel läuft in der Shell durch", () => {
  const yml = readFileSync(join(WURZEL, ".github", "workflows", "pages.yml"), "utf8");
  const zeilen = yml.split("\n");
  const von = zeilen.findIndex((z) => z.includes("grep -q 'TODO(' \"$page/index.html\""));
  // the guard is an if-block of 4 lines; run it in a scratch folder with and without a TODO
  const block = zeilen.slice(von - 0, von + 4).map((z) => z.replace(/^\s{12}/, "")).join("\n");
  const lauf = (inhalt) => {
    const dir = spawnSync("mktemp", ["-d"], { encoding: "utf8" }).stdout.trim();
    spawnSync("bash", ["-c", `mkdir -p "${dir}/Seite" && printf '%s' '${inhalt}' > "${dir}/Seite/index.html"`]);
    const r = spawnSync("bash", ["-c", `cd "${dir}"; page=Seite; ${block}\necho durch`], { encoding: "utf8" });
    spawnSync("rm", ["-r", dir]);
    return r;
  };
  const gut = lauf("<html>fertig</html>");
  assert.equal(gut.status, 0);
  assert.match(gut.stdout, /durch/);
  const schlecht = lauf("<html>ENTWURF TODO(x)</html>");
  assert.equal(schlecht.status, 1);
  assert.match(schlecht.stdout, /::error/);
  assert.ok(!/durch/.test(schlecht.stdout));
});
