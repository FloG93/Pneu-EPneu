// The gate command (figur/tests/tools/gate.mjs): how it finds a page, the shape of its output, that it stops at the
// first red gate, and that the server it starts is gone again. The gates themselves (audit, browser) are not run here;
// they have their own tests and checks. Nothing in this file names a page of this repo (it travels with the skill's
// template); what holds the gate to this repo's pages and canon is gate-repo.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { alleSeiten, befehle, browserErgebnis, browserSkript, erkenne, formatiere, fuehreTore, kanonZahl, starteServer, tabelle, tapSumme, tore } from "./tools/gate.mjs";

test("Eine Seite wird an den Namen ihrer Skripte erkannt, sonst nicht", () => {
  const w = mkdtempSync(join(tmpdir(), "gate-"));
  try {
    mkdirSync(join(w, "Gut", "tests", "tools"), { recursive: true });
    for (const d of ["build-gut.mjs", "legende-gut.mjs", "pruefe-gut.mjs"]) writeFileSync(join(w, "Gut", "tests", "tools", d), "");
    mkdirSync(join(w, "OhnePruefung", "tests", "tools"), { recursive: true });
    writeFileSync(join(w, "OhnePruefung", "tests", "tools", "build-x.mjs"), "");
    mkdirSync(join(w, "Leer"), { recursive: true });
    assert.deepEqual(erkenne(w, "Gut"), { ordner: "Gut", bau: "Gut/tests/tools/build-gut.mjs", pruefe: "Gut/tests/tools/pruefe-gut.mjs" });
    assert.equal(erkenne(w, "OhnePruefung"), null);
    assert.equal(erkenne(w, "Leer"), null);
    assert.equal(erkenne(w, "GibtEsNicht"), null);
    assert.deepEqual(alleSeiten(w), ["Gut"]);
  } finally { rmSync(w, { recursive: true, force: true }); }
});

test("Die Zahl der Browserprüfung aus CLAUDE.md wird gelesen (nur als Warnung gedacht)", () => {
  assert.equal(kanonZahl("| … Wechselventil | `npm run pruef:browser:wechsel` (dazu …) | `all checks passed (168)`, fünfmal |", "pruef:browser:wechsel"), 168);
  assert.equal(kanonZahl("nichts", "pruef:browser:wechsel"), null);
  assert.equal(browserSkript({ scripts: { "pruef:browser:x": "node a http://127.0.0.1:8311/Ordn/ b", "bau:x": "node c" } }, "Ordn"), "pruef:browser:x");
  assert.equal(browserSkript({ scripts: {} }, "Ordn"), null);
});

test("Die Befehle einer Seite sind die des Prüfkanons", () => {
  const B = befehle({ ordner: "Ordn", bau: "Ordn/tests/tools/build-o.mjs", pruefe: "Ordn/tests/tools/pruefe-o.mjs" });
  assert.deepEqual(B.audit, ["node", "Ordn/tests/tools/build-o.mjs", "--audit"]);
  assert.deepEqual(B.apart, ["node", "Ordn/tests/tools/build-o.mjs", "--apart"]);
  assert.deepEqual(B.browser, ["node", "figur/tests/tools/pruefe-figur.mjs", "http://127.0.0.1:8311/Ordn/", "Ordn/tests/tools/pruefe-o.mjs"]);
  assert.deepEqual(B.linien, ["node", ".claude/skills/anatomy/scripts/lines.mjs", "Ordn/index.html"]);
});

test("Er liest, was die Befehle ausgeben", () => {
  assert.deepEqual(tapSumme("# pass 10\n# fail 0\nx\n# pass 5\n# fail 1\n"), { pass: 15, fail: 1 });
  assert.deepEqual(browserErgebnis("a\nall checks passed (168)\n"), { ok: true, n: 168 });
  const rot = browserErgebnis("  FEHLT light: eine Prüfung\n\n3 von 172 Prüfungen fehlgeschlagen\n");
  assert.equal(rot.ok, false);
  assert.equal(rot.fehler, 3);
  assert.equal(rot.von, 172);
  assert.equal(rot.erste, "FEHLT light: eine Prüfung");
});

test("Eine Zeile je Tor, das rote nennt die Logdatei; die Tabelle hat eine Zeile je Seite", () => {
  assert.equal(formatiere("ok", "audit", "audit passed"), "ok    audit    audit passed");
  assert.equal(formatiere("FEHLT", "browser", "3 von 172 fehlgeschlagen", "/tmp/x.log"), "FEHLT browser  3 von 172 fehlgeschlagen – Details: /tmp/x.log");
  assert.ok(!formatiere("ok", "audit", "x", "/tmp/x.log").includes("Details"));
  const t = tabelle([
    { ordner: "A", tore: [{ name: "audit", status: "ok", text: "" }, { name: "browser", status: "ok", text: "168 ×1" }] },
    { ordner: "Bb", tore: [{ name: "audit", status: "FEHLT", text: "" }, { name: "browser", status: "-", text: "" }] },
  ]).split("\n");
  assert.equal(t.length, 4);
  assert.match(t[0], /^Seite\s+audit\s+browser$/);
  assert.match(t[2], /^A\s+ok\s+ok 168$/);
  assert.match(t[3], /^Bb\s+FEHLT\s+-$/);
});

test("Die Tore einer Seite stehen in der Reihenfolge des Plans; ohne Test und mit Wackelprüfung ändert sich die Liste", () => {
  const seite = { ordner: "Ordn", bau: "Ordn/tests/tools/build-o.mjs", pruefe: "Ordn/tests/tools/pruefe-o.mjs" };
  const ids = (opt) => tore("/nirgends", seite, opt).map((t) => t.id);
  assert.deepEqual(ids({ lauefe: 5 }), ["test", "audit", "apart", "frisch", "linien", "browser"]);
  assert.deepEqual(ids({ lauefe: 5, ohneTest: true }), ["audit", "apart", "frisch", "linien", "browser"]);
  assert.deepEqual(ids({ lauefe: 5, wackel: true }), ["test", "audit", "apart", "frisch", "linien", "browser", "wackel", "last"]);
  assert.equal(tore("/nirgends", seite, { lauefe: 5 }).find((t) => t.id === "browser").braucht, "server");
});

/** A gate that is only a record: it says what it was told and notes that it ran. */
const attrappe = (id, ok, ran) => ({ id, name: id, lauf: () => { ran.push(id); return { ok, text: ok ? "fein" : "kaputt" }; } });

test("Beim ersten roten Tor bricht er ab; die übrigen laufen nicht", async () => {
  const ran = [], zeilen = [];
  const erg = await fuehreTore([attrappe("a", true, ran), attrappe("b", false, ran), attrappe("c", true, ran), attrappe("d", true, ran)], { zeile: (...z) => zeilen.push(z) });
  assert.deepEqual(ran, ["a", "b"]);
  assert.deepEqual(erg.map((e) => e.status), ["ok", "FEHLT", "-", "-"]);
  assert.deepEqual(zeilen, [["ok", "a", "fein"], ["FEHLT", "b", "kaputt"]]);
});

test("Mit --weiter laufen alle Tore, das rote bleibt rot", async () => {
  const ran = [];
  const erg = await fuehreTore([attrappe("a", false, ran), attrappe("b", true, ran), attrappe("c", false, ran)], { weiter: true });
  assert.deepEqual(ran, ["a", "b", "c"]);
  assert.deepEqual(erg.map((e) => e.status), ["FEHLT", "ok", "FEHLT"]);
});

test("Ein Tor, das eine Ausnahme wirft, ist rot und bricht nichts anderes mit", async () => {
  const erg = await fuehreTore([{ id: "x", name: "x", lauf: () => { throw new Error("hin"); } }, { id: "y", name: "y", lauf: () => ({ ok: true, text: "" }) }], { weiter: true });
  assert.equal(erg[0].status, "FEHLT");
  assert.match(erg[0].text, /hin/);
  assert.equal(erg[1].status, "ok");
});

// --- the server -----------------------------------------------------------------------------------------------
const lebt = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const mini = (port) => [process.execPath, ["-e", `require("http").createServer((q, s) => s.end("x")).listen(${port}, "127.0.0.1")`]];
const freierPort = () => 20000 + Math.floor(Math.random() * 20000);

test("Der Server wird gestartet und über seine PID wieder beendet", async () => {
  const port = freierPort();
  const s = await starteServer({ port, befehl: mini(port) });
  assert.ok(s.pid > 0 && !s.vorhanden);
  assert.ok(lebt(s.pid));
  await s.stoppe();
  assert.ok(!lebt(s.pid), "der Server läuft nach stoppe() noch");
});

test("Antwortet auf dem Port schon ein Server, wird er benutzt und nicht beendet", async () => {
  const port = freierPort();
  const erster = await starteServer({ port, befehl: mini(port) });
  const zweiter = await starteServer({ port, befehl: mini(port) });
  assert.ok(zweiter.vorhanden && zweiter.pid === null);
  await zweiter.stoppe();
  assert.ok(lebt(erster.pid), "der fremde Server wurde beendet");
  await erster.stoppe();
});

test("Auch wenn ein Tor fehlschlägt oder wirft, ist der Server danach weg", async () => {
  for (const tor of [{ id: "b", name: "b", braucht: "server", lauf: () => ({ ok: false, text: "rot" }) },
    { id: "b", name: "b", braucht: "server", lauf: () => { throw new Error("hin"); } }]) {
    const port = freierPort();
    let pid = null;
    await fuehreTore([tor], { mitServer: async () => { const s = await starteServer({ port, befehl: mini(port) }); pid = s.pid; return s; } });
    assert.ok(pid > 0);
    assert.ok(!lebt(pid), "der Server läuft nach dem Lauf noch");
  }
});

test("Kommt der Server nicht hoch, gibt es eine Fehlermeldung und keinen liegengebliebenen Prozess", async () => {
  const port = freierPort();
  await assert.rejects(() => starteServer({ port, versuche: 5, befehl: [process.execPath, ["-e", "setTimeout(() => {}, 60000)"]] }), /kam nicht hoch/);
});
