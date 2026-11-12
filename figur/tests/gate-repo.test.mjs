// The gate against THIS repo: it finds every page, and the commands it runs are the strings of the package.json scripts
// (the canon), so there is no second truth. Does not travel with the skill's template.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { alleSeiten, befehle, browserSkript, erkenne, kanonZahl } from "./tools/gate.mjs";

const WURZEL = join(import.meta.dirname, "..", "..");
const paketJson = JSON.parse(readFileSync(join(WURZEL, "package.json"), "utf8"));
const claudeMd = readFileSync(join(WURZEL, "CLAUDE.md"), "utf8");

test("Im Repo findet er mindestens die sechs fertigen Seiten", () => {
  const sechs = ["Drosselrueckschlagventil", "Wechselventil", "Wegeventil-3-2", "Wegeventil-5-2", "Zylinder-Doppeltwirkend", "Zylinder-Einfachwirkend"];
  const alle = alleSeiten(WURZEL);
  for (const s of sechs) assert.ok(alle.includes(s), `${s} wird nicht gefunden`);
});

test("Keine zweite Wahrheit: die Befehle sind die Zeichenfolgen der package.json-Skripte (Audit, Zerlegen, Browser)", () => {
  for (const ordner of alleSeiten(WURZEL)) {
    const seite = erkenne(WURZEL, ordner);
    const B = befehle(seite);
    const geometrie = Object.values(paketJson.scripts).find((v) => v.includes(`${seite.bau} --audit`));
    assert.equal(geometrie, `${B.audit.join(" ")} && ${B.apart.join(" ")}`, `${ordner}: Audit/Zerlegen weichen von package.json ab`);
    const skript = browserSkript(paketJson, ordner);
    assert.ok(skript, `${ordner}: kein Browser-Skript in package.json`);
    assert.equal(paketJson.scripts[skript], B.browser.join(" "), `${ordner}: Browserprüfung weicht von ${skript} ab`);
  }
});

test("CLAUDE.md nennt für das Wechselventil eine Zahl der Browserprüfung (weicht sie ab, ist es nur eine Warnung des Gates)", () => {
  const skript = browserSkript(paketJson, "Wechselventil");
  assert.equal(skript, "pruef:browser:wechsel");
  assert.ok(Number.isInteger(kanonZahl(claudeMd, skript)), "CLAUDE.md nennt keine Zahl für das Wechselventil");
});
