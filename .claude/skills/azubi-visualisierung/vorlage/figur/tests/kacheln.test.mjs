// The overview page is generated from this table, so the table has to hold up:
// no duplicate ids, no tile promising a page that does not exist, no missing
// text. A broken entry would otherwise only show as a dead card on the page.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUBRIKEN, SEITE, alleKacheln, fertige } from "../kacheln.mjs";
import { kontrast, PAPIER } from "../luft.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("Die Seite hat Titel, Beschreibung und Einleitung", () => {
  assert.ok(SEITE.titel.length > 3, "ohne Titel");
  assert.ok(SEITE.beschreibung.length > 40, "die Beschreibung (für Suchmaschinen) sagt zu wenig");
  assert.ok(SEITE.lead.length > 40, "die Einleitung sagt zu wenig");
});

test("Jede Rubrik hat Titel, Einleitung und mindestens eine Kachel", () => {
  assert.ok(RUBRIKEN.length >= 1, "keine Rubrik");
  for (const r of RUBRIKEN) {
    assert.match(r.id, /^[a-z0-9-]+$/, `Rubrik-Kennung "${r.id}" taugt nicht als Anker`);
    assert.ok(r.titel.length > 2, `Rubrik ${r.id} ohne Titel`);
    assert.ok(r.einleitung.length > 20, `Rubrik ${r.id} ohne brauchbare Einleitung`);
    assert.ok(r.kacheln.length > 0, `Rubrik ${r.id} ist leer`);
  }
});

test("Jede Kennung kommt nur einmal vor", () => {
  const ids = alleKacheln().map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, `doppelte Kennung: ${ids.filter((v, i) => ids.indexOf(v) !== i)}`);
});

test("Jede Kachel hat Name und einen erklärenden Satz", () => {
  for (const k of alleKacheln()) {
    assert.match(k.id, /^[a-z0-9-]+$/, `Kennung "${k.id}"`);
    assert.ok(k.name.length > 3, `${k.id} ohne Namen`);
    assert.ok(k.satz.length > 30, `${k.id}: der Satz erklärt zu wenig`);
    if (k.sinnbild !== undefined) assert.ok(k.sinnbild.length > 3, `${k.id}: leeres Sinnbild`);
    assert.ok(["fertig", "geplant"].includes(k.zustand), `${k.id}: Zustand "${k.zustand}"`);
  }
});

test("Kein Satz endet ohne Punkt – die Kacheln sind ganze Sätze", () => {
  for (const k of alleKacheln()) {
    assert.match(k.satz.trim(), /[.!?]$/, `${k.id}: "${k.satz.slice(-40)}"`);
  }
});

test("Jede fertige Kachel zeigt auf einen Ordner, den es wirklich gibt", () => {
  for (const k of fertige()) {
    assert.ok(k.ordner, `${k.id} ist fertig, nennt aber keinen Ordner`);
    const seite = join(WURZEL, k.ordner, "index.html");
    assert.ok(existsSync(seite), `${k.id} verspricht ${k.ordner}/index.html, die es nicht gibt`);
  }
});

test("Eine geplante Kachel verlinkt nichts – niemand soll ins Leere laufen", () => {
  for (const k of alleKacheln()) {
    if (k.zustand === "geplant" && k.ordner) {
      assert.ok(
        !existsSync(join(WURZEL, k.ordner, "index.html")),
        `${k.id} ist als geplant markiert, die Seite ${k.ordner}/ gibt es aber schon`,
      );
    }
  }
});

for (const modus of ["light", "dark"]) {
  test(`${modus}: die Vorschautöne der Kacheln heben sich vom Papier ab`, () => {
    for (const ton of ["stark", "blass"]) {
      const v = kontrast(SEITE.toene[modus][ton], PAPIER[modus]);
      assert.ok(v >= 3, `${ton} hält nur ${v.toFixed(2)}:1`);
    }
  });
}
