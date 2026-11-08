// The symbol must carry the same facts as ISO 1219-1: two fields, the paths in
// each, the fixed ports under one field, and a runtime that slides the fields.
import test from "node:test";
import assert from "node:assert/strict";
import { VENTIL_5_2, wegeventilSymbol, SYMBOL_CSS, SYMBOL_LAUFZEIT } from "../schaltzeichen.mjs";

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

const VENTIL_3_2 = { felder: [[[1, 2]], [[2, 3]]], unten: [1, 3], oben: [2], zufuhr: 1 };

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
