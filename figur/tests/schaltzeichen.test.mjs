// The symbol must carry the same facts as ISO 1219-1: two fields, the paths in
// each, the fixed ports under one field, and a runtime that slides the fields.
import test from "node:test";
import assert from "node:assert/strict";
import { VENTIL_5_2, VENTIL_3_2_NC, VENTIL_3_2_NO, wegeventilSymbol, zylinderSymbol, SYMBOL_CSS, SYMBOL_LAUFZEIT } from "../schaltzeichen.mjs";

test("5/2 hat zwei Felder mit je zwei Wegen", () => {
  const { svg } = wegeventilSymbol(VENTIL_5_2);
  assert.equal((svg.match(/data-feld="/g) || []).length, 2);
  for (const w of ["1-4", "2-3", "1-2", "4-5"]) assert.ok(svg.includes(`data-weg="${w}"`));
});

test("Anschlüsse 1–5 und Betätigungen 14/12 sind beschriftet", () => {
  const { svg } = wegeventilSymbol(VENTIL_5_2, { rechts: "pneumatisch" });
  for (const n of ["1", "2", "3", "4", "5", "12", "14"]) assert.match(svg, new RegExp(`>${n}<`));
});

test("Feder rechts zeichnet eine Feder, pneumatisch ein Dreieck", () => {
  assert.match(wegeventilSymbol(VENTIL_5_2, { rechts: "feder" }).svg, /data-seite="rechts"[^>]*data-art="feder"/);
  assert.match(wegeventilSymbol(VENTIL_5_2, { rechts: "pneumatisch" }).svg, /data-seite="rechts"[^>]*data-art="pneumatisch"/);
});

test("Kein NaN, deutsche Beschreibung", () => {
  const { svg } = wegeventilSymbol(VENTIL_5_2);
  assert.ok(!svg.includes("NaN"));
  assert.match(svg, /aria-label="Schaltzeichen 5\/2-Wegeventil/);
});

test("Laufzeit ist gültiges Skript", () => assert.doesNotThrow(() => new Function(SYMBOL_LAUFZEIT)));

test("Laufzeit und Stil enthalten keinen Backtick", () => {
  assert.ok(!SYMBOL_LAUFZEIT.includes("`"));
  assert.ok(!SYMBOL_CSS.includes("`"));
});

test("Das Symbol hat Maße, passende viewBox und nur die erlaubte Schrift", () => {
  const { svg, breite, hoehe } = wegeventilSymbol(VENTIL_5_2, { links: "pneumatisch", rechts: "pneumatisch" });
  assert.ok(breite > 0 && hoehe > 0);
  assert.ok(svg.includes(`viewBox="0 0 ${breite} ${hoehe}"`));
  assert.match(svg, /role="img"/);
  const texte = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).sort();
  assert.deepEqual(texte, ["1", "12", "14", "2", "3", "4", "5"]);
});

test("Anschlüsse stehen fest unter und über einem Feld, außerhalb der Felder-Gruppe", () => {
  const { svg } = wegeventilSymbol(VENTIL_5_2);
  const felder = svg.slice(svg.indexOf("<g data-felder"), svg.indexOf("</g><!--felder-->"));
  assert.ok(felder.length > 0);
  assert.ok(!felder.includes("data-anschluss"), "Anschlüsse gehören nicht in die bewegte Gruppe");
  assert.match(svg, /data-anschluss="5"/);
});

test("Feldgröße steuert die Breite, Größe skaliert ohne NaN", () => {
  const a = wegeventilSymbol(VENTIL_5_2, { feld: 60 });
  const b = wegeventilSymbol(VENTIL_5_2, { feld: 90 });
  assert.ok(b.breite > a.breite && b.hoehe > a.hoehe);
  assert.ok(!b.svg.includes("NaN"));
});

// A tiny stand-in for the DOM: just what the runtime touches.
function fakeSvg(svg, feld) {
  const klassen = (s) => {
    const set = new Set((s || "").split(/\s+/).filter(Boolean));
    return { set, add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) };
  };
  const wege = [...svg.matchAll(/<path [^>]*data-weg="([^"]+)"[^>]*data-rolle="([^"]+)"/g)].map((m, i) => ({
    weg: m[1], rolle: m[2], feld: i < (svg.match(/data-feld="0"[^]*?data-feld="1"/)[0].match(/data-weg=/g) || []).length ? "0" : "1", classList: klassen("sz-weg"),
    getAttribute(n) { return n === "data-weg" ? this.weg : n === "data-rolle" ? this.rolle : null; },
    closest() { return { getAttribute: () => this.feld }; },
  }));
  const gruppe = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute() { return null; } };
  return {
    wege, gruppe,
    getAttribute: (n) => (n === "data-feldbreite" ? String(feld) : null),
    querySelector: (s) => (s === "[data-felder]" ? gruppe : null),
    querySelectorAll: (s) => (s === "[data-weg]" ? wege : []),
  };
}

test("Laufzeit schiebt die Felder und färbt nur offene Wege", () => {
  const { svg } = wegeventilSymbol(VENTIL_5_2, { feld: 60 });
  const el = fakeSvg(svg, 60);
  const stellen = new Function(`${SYMBOL_LAUFZEIT}; return symbolStellen;`)();
  stellen(el, 1, { a: 1, b: 0 });
  assert.match(el.gruppe.attrs.transform, /translate\((-?0|0) 0\)/);
  const k = (w) => [...el.wege.find((x) => x.weg === w).classList.set].join(" ");
  assert.match(k("1-4"), /stark/);
  assert.match(k("2-3"), /blass/);
  assert.ok(!/stark|blass/.test(k("1-2")) && !/stark|blass/.test(k("4-5")));
  stellen(el, 0, { a: 0, b: 1 });
  assert.match(el.gruppe.attrs.transform, /translate\(-60 0\)/);
  assert.ok(!/stark|blass/.test(k("1-4")));
  assert.match(k("1-2"), /stark/);
  assert.match(k("4-5"), /blass/);
  stellen(el, 0.5, { a: 0, b: 0 });
  assert.match(el.gruppe.attrs.transform, /translate\(-30 0\)/);
  for (const w of el.wege) assert.ok(!/stark|blass/.test([...w.classList.set].join(" ")), w.weg);
  stellen(el, 7, { a: 1, b: 1 });   // out of range is clamped, both sets may be open
  assert.match(el.gruppe.attrs.transform, /translate\((-?0) 0\)/);
});

// Horizontal reach of everything inside the sliding group, read from the
// coordinates actually written, at a given shift.
function reichweite(svg, schub) {
  const gruppe = svg.slice(svg.indexOf("<g data-felder"), svg.indexOf("</g><!--felder-->"));
  const xs = [];
  for (const m of gruppe.matchAll(/<rect[^>]*x="([\d.]+)"[^>]*width="([\d.]+)"/g)) xs.push(+m[1], +m[1] + +m[2]);
  for (const m of gruppe.matchAll(/ d="([^"]+)"/g)) for (const p of m[1].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)) xs.push(+p[1]);
  return [Math.min(...xs) + schub, Math.max(...xs) + schub];
}

const VENTIL_3_2 = VENTIL_3_2_NC;

test("Die viewBox fasst das Symbol in beiden Endlagen", () => {
  for (const art of [VENTIL_5_2, VENTIL_3_2]) {
    for (const feld of [60, 90]) {
      const { svg, breite } = wegeventilSymbol(art, { links: "pneumatisch", rechts: "feder", feld });
      const n = art.felder.length;
      const a = reichweite(svg, 0);
      const b = reichweite(svg, -(n - 1) * feld);
      assert.ok(Math.min(a[0], b[0]) >= 0 && Math.max(a[1], b[1]) <= breite, `${feld}: ${a} ${b} in ${breite}`);
      assert.ok(Math.min(a[0], b[0]) < 10 && breite - Math.max(a[1], b[1]) < 10, "kein großer leerer Streifen");
    }
  }
});

test("Starke und blasse Wege richten sich nach dem Zufuhr-Anschluss", () => {
  const { svg } = wegeventilSymbol(VENTIL_3_2);
  assert.match(svg, /data-weg="1-2" data-rolle="druck"/);
  assert.match(svg, /data-weg="2-3" data-rolle="abluft"/);
  const el = fakeSvg(svg, 60);
  const stellen = new Function(`${SYMBOL_LAUFZEIT}; return symbolStellen;`)();
  stellen(el, 1, { a: 1, b: 0 });
  assert.match([...el.wege[0].classList.set].join(" "), /stark/);
  stellen(el, 0, { a: 0, b: 1 });
  assert.match([...el.wege[1].classList.set].join(" "), /blass/);
});

test("3/2 NC: Feld 0 trägt 1→2, Feld 1 trägt 2→3, links 12, rechts Feder ohne Nummer", () => {
  const { svg } = wegeventilSymbol(VENTIL_3_2_NC);
  const f0 = svg.slice(svg.indexOf('data-feld="0"'), svg.indexOf('data-feld="1"'));
  const f1 = svg.slice(svg.indexOf('data-feld="1"'), svg.indexOf("</g><!--felder-->"));
  assert.match(f0, /data-weg="1-2"/); assert.doesNotMatch(f0, /data-weg="2-3"/);
  assert.match(f1, /data-weg="2-3"/); assert.doesNotMatch(f1, /data-weg="1-2"/);
  assert.match(svg, /data-seite="links"[^>]*data-art="pneumatisch"[\s\S]*?>12<\/text>/);
  const rechts = svg.slice(svg.indexOf('data-seite="rechts"'), svg.indexOf("</g><!--felder-->"));
  assert.doesNotMatch(rechts, /<text/);
  assert.doesNotMatch(svg, />1[04]<\/text>/);
});
test("3/2 NO: links 10", () => {
  const { svg } = wegeventilSymbol(VENTIL_3_2_NO);
  assert.match(svg, /data-seite="links"[^>]*data-art="pneumatisch"[\s\S]*?>10<\/text>/);
  assert.match(svg, /data-weg="2-3"/);
});
test("3/2: pneumatisch auf der Federseite bleibt ohne Nummer (steuer null)", () => {
  const { svg } = wegeventilSymbol(VENTIL_3_2_NC, { links: "feder", rechts: "pneumatisch" });
  assert.doesNotMatch(svg, /sz-text" x="[\d.]+" y="[\d.]+" text-anchor="middle" font-size="12" fill="currentColor">null/);
  assert.doesNotMatch(svg, />null<|>undefined</);
});
test("5/2-Symbol byte-gleich zu vorher", async () => {
  // sha256 of the SVG strings as the module produced them before `steuer` existed.
  const { createHash } = await import("node:crypto");
  const h = (o) => createHash("sha256").update(wegeventilSymbol(VENTIL_5_2, o).svg).digest("hex");
  assert.equal(h({}), "637573278cf67f4292340f13587e8e0fe24f78856d65b684ff75bce11264285a");
  assert.equal(h({ rechts: "pneumatisch" }), "c2fcb84e3708513d8c3ada3bf24d3f59976e9742d8d2fc920f7c7101bad30101");
  assert.equal(h({ links: "feder", rechts: "pneumatisch", feld: 90 }), "92940aa95a2355a3db87f2e3a24fda8b990344d0f5f6f9ee4f52871b6c307686");
});
test("steuer der Beschreibungen", () => {
  assert.deepEqual(VENTIL_5_2.steuer, [14, 12]);
  assert.deepEqual(VENTIL_3_2_NC.steuer, [12, null]);
  assert.deepEqual(VENTIL_3_2_NO.steuer, [10, null]);
});

test("Zylinder einfachwirkend: Gehäuse, Kolben, Stange, Feder, ein Luftanschluss und die Entlüftung", () => {
  const { svg, breite, hoehe } = zylinderSymbol();
  for (const klasse of ["sz-rahmen", "sz-kolben", "sz-stange", "sz-feder", "sz-anschluss", "sz-entlueftung"]) {
    assert.equal((svg.match(new RegExp(`class="${klasse}"`, "g")) || []).length, 1, `${klasse} fehlt oder doppelt`);
  }
  assert.ok(!svg.includes("NaN"));
  assert.match(svg, new RegExp(`viewBox="0 0 ${breite} ${hoehe}"`));
  assert.match(svg, /aria-label="Schaltzeichen einfachwirkender Zylinder mit Federrückstellung/);
  // the spring is a zigzag: nine peaks between the piston and the end wall
  assert.equal((svg.match(/class="sz-feder" d="([^"]+)"/)[1].match(/L/g) || []).length, 10);
});

test("Druckknopf als Betätigung: Stummel mit Halbkreis, die Wölbung weg vom Ventil", () => {
  const { svg } = wegeventilSymbol(VENTIL_3_2_NC, { links: "taster", rechts: "feder" });
  assert.match(svg, /data-seite="links" data-art="taster"/);
  assert.match(svg, /links Druckknopf, rechts Feder/);
  const bogen = svg.match(/data-art="taster"><path d="([^"]+)"/)[1];
  assert.match(bogen, /A[\d.]+ [\d.]+ 0 0 0 /, "links: Bogen gegen den Uhrzeigersinn, Wölbung nach links");
  const rechts = wegeventilSymbol(VENTIL_3_2_NC, { links: "feder", rechts: "taster" }).svg;
  assert.match(rechts.match(/data-seite="rechts" data-art="taster"><path d="([^"]+)"/)[1], /A[\d.]+ [\d.]+ 0 0 1 /);
  assert.ok(!svg.includes("NaN"));
});
