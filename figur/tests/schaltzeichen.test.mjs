// The symbol must carry the same facts as ISO 1219-1: two fields, the paths in
// each, the fixed ports under one field, and a runtime that slides the fields.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VENTIL_5_2, VENTIL_3_2_NC, VENTIL_3_2_NO, wegeventilSymbol, zylinderSymbol, SYMBOL_CSS, SYMBOL_LAUFZEIT,
  drosselRueckschlagSymbol, DROSSEL_SYMBOL_CSS, DROSSEL_SYMBOL_LAUFZEIT,
  wechselventilSymbol, WECHSEL_SYMBOL_CSS, WECHSEL_SYMBOL_LAUFZEIT,
} from "../schaltzeichen.mjs";

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

// --- Drosselrückschlagventil (ISO 1219-1) ---------------------------------

test("Drosselrückschlagventil: zwei parallele Wege, einstellbare Drossel und Rückschlagventil mit Feder", () => {
  const { svg, breite, hoehe } = drosselRueckschlagSymbol();
  assert.ok(!svg.includes("NaN"));
  assert.match(svg, new RegExp(`viewBox="0 0 ${breite} ${hoehe}"`));
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Schaltzeichen Drosselrückschlagventil/);
  assert.equal((svg.match(/data-weg="drossel"/g) || []).length, 1);
  assert.equal((svg.match(/data-weg="rueckschlag"/g) || []).length, 1);
  const drossel = svg.slice(svg.indexOf('data-weg="drossel"'), svg.indexOf('data-weg="rueckschlag"'));
  const rueck = svg.slice(svg.indexOf('data-weg="rueckschlag"'), svg.indexOf("</svg>"));
  // throttle: two facing arcs and the slanted adjusting arrow
  assert.equal((drossel.match(/class="sz-bogen"/g) || []).length, 2);
  assert.equal((drossel.match(/A[\d.]+ [\d.]+ 0 0 [01] /g) || []).length, 2, "Drossel: zwei Bögen");
  assert.match(drossel, /class="sz-verstell"/);
  const pfeil = drossel.match(/class="sz-verstell" d="M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);
  assert.ok(pfeil, "Schrägpfeil");
  assert.ok(+pfeil[1] !== +pfeil[3] && +pfeil[2] !== +pfeil[4], "Pfeil ist schräg");
  assert.ok(!/class="sz-kugel"/.test(drossel));
  // check valve: ball as a circle, V seat, spring
  assert.equal((rueck.match(/<circle class="sz-kugel"/g) || []).length, 1);
  assert.match(rueck, /class="sz-sitz"/);
  assert.match(rueck, /class="sz-feder"/);
  assert.ok((rueck.match(/class="sz-feder" d="([^"]+)"/)[1].match(/L/g) || []).length >= 6, "Feder als Zickzack");
  assert.ok(!/class="sz-bogen"/.test(rueck));
});

test("Drosselrückschlagventil: nur die Anschlüsse 1 und 2 als Schrift, 1 links, 2 rechts", () => {
  const { svg } = drosselRueckschlagSymbol({ feld: 90 });
  const texte = [...svg.matchAll(/<text[^>]*x="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => [+m[1], m[2]]);
  assert.deepEqual(texte.map((t) => t[1]).sort(), ["1", "2"]);
  assert.ok(texte.find((t) => t[1] === "1")[0] < texte.find((t) => t[1] === "2")[0]);
  assert.match(svg, /data-anschluss="1"/); assert.match(svg, /data-anschluss="2"/);
  assert.ok(!drosselRueckschlagSymbol({ feld: 90 }).svg.includes("NaN"));
});

test("Drosselrückschlagventil: alle Koordinaten liegen in der viewBox", () => {
  for (const feld of [60, 90]) {
    const { svg, breite, hoehe } = drosselRueckschlagSymbol({ feld });
    for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
      for (const p of m[1].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)) {
        assert.ok(+p[1] >= 0 && +p[1] <= breite && +p[2] >= 0 && +p[2] <= hoehe, `${feld}: ${p[0]}`);
      }
    }
    for (const m of svg.matchAll(/<circle[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*r="([\d.]+)"/g)) {
      assert.ok(+m[1] - +m[3] >= 0 && +m[1] + +m[3] <= breite && +m[2] - +m[3] >= 0 && +m[2] + +m[3] <= hoehe);
    }
  }
});

test("Drosselrückschlagventil: Laufzeit färbt nur den durchströmten Weg", () => {
  const { svg } = drosselRueckschlagSymbol();
  const klassen = () => { const set = new Set(); return { set, add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) }; };
  const wege = ["drossel", "rueckschlag"].map((w) => ({ w, classList: klassen(), getAttribute: (n) => (n === "data-weg" ? w : null) }));
  const el = { querySelectorAll: (s) => (s === "[data-weg]" ? wege : []) };
  const stellen = new Function(`${DROSSEL_SYMBOL_LAUFZEIT}; return drosselSymbolStellen;`)();
  const k = (w) => [...wege.find((x) => x.w === w).classList.set].join(" ");
  stellen(el, { drossel: 1, rueckschlag: 0, ton: "stark" });
  assert.match(k("drossel"), /stark/); assert.equal(k("rueckschlag"), "");
  stellen(el, { drossel: 0.4, rueckschlag: 1, ton: "blass" });
  assert.match(k("drossel"), /blass/); assert.match(k("rueckschlag"), /blass/);
  stellen(el, { drossel: 0, rueckschlag: 0, ton: "stark" });
  assert.equal(k("drossel"), ""); assert.equal(k("rueckschlag"), "");
  assert.ok(svg.length > 0);
});

test("Drosselrückschlagventil: Laufzeit und Stil ohne Backtick, Laufzeit ist gültig", () => {
  assert.ok(!DROSSEL_SYMBOL_LAUFZEIT.includes("`") && !DROSSEL_SYMBOL_CSS.includes("`"));
  assert.doesNotThrow(() => new Function(DROSSEL_SYMBOL_LAUFZEIT));
  // top-level names must not clash with the directional runtime
  assert.doesNotThrow(() => new Function(`${SYMBOL_LAUFZEIT}\n${DROSSEL_SYMBOL_LAUFZEIT}`));
});

test("Das neue Symbol ändert 3/2 nicht: Ausgabe von 3/2 NC und NO byte-gleich", async () => {
  const { createHash } = await import("node:crypto");
  const h = (art) => createHash("sha256").update(wegeventilSymbol(art, { links: "pneumatisch", rechts: "feder" }).svg).digest("hex");
  assert.equal(h(VENTIL_3_2_NC), "ff4923901b55559e44a706ecff2fde89f05d3940c72d290d00daf31e588608af");
  assert.equal(h(VENTIL_3_2_NO), "71676cac767375e535260c7131341e57834498535cce9450a6496f6f8a565355");
});

test("Drosselrückschlagventil ohne Feder: Kugel auf dem V-Sitz, kein Anschlag, keine Feder; mit Feder bleibt die Ausgabe wie sie war", () => {
  const ohne = drosselRueckschlagSymbol({ feder: false }).svg;
  assert.ok(!ohne.includes("sz-feder") && !ohne.includes("sz-anschlag"));
  assert.match(ohne, /<circle class="sz-kugel"/);
  assert.match(ohne, /class="sz-sitz"/);
  assert.match(ohne, /data-weg="drossel"/);
  assert.match(ohne, /Rückschlagventil ohne Feder/);
  assert.ok(!ohne.includes("NaN"));
  const mit = drosselRueckschlagSymbol().svg;
  assert.ok(mit.includes("sz-feder") && mit.includes("sz-anschlag"));
  assert.equal(drosselRueckschlagSymbol({ feder: true }).svg, mit);
});

// --- Wechselventil (ISO 1219-1) --------------------------------------------
// Drawn after the SMC symbol table (DIN ISO 1219-1): a rectangle, a straight line through it
// with a ball between two V seats that face each other, a dot on the line and the branch
// to port 2. The SMC table numbers 1 / 3 / 2 with 2 below; this page follows Wikipedia and
// the Festo catalogue: 1 – 1 and 2 on top.

test("Wechselventil: Rechteck, eine Kugel, zwei einander zugewandte V-Sitze, ein Knotenpunkt", () => {
  const { svg, breite, hoehe } = wechselventilSymbol();
  assert.ok(!svg.includes("NaN"));
  assert.match(svg, new RegExp(`viewBox="0 0 ${breite} ${hoehe}"`));
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Schaltzeichen Wechselventil/);
  assert.equal((svg.match(/<rect class="sz-rahmen"/g) || []).length, 1);
  assert.equal((svg.match(/<circle class="sz-kugel"/g) || []).length, 1);
  assert.equal((svg.match(/<path class="sz-sitz"/g) || []).length, 2);
  assert.equal((svg.match(/<circle class="sz-knoten"/g) || []).length, 1);
  // seats face each other: the left apex lies left of its arms, the right apex right of its arms
  const sitze = [...svg.matchAll(/<path class="sz-sitz" d="M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  assert.equal(sitze.length, 2);
  const [links, rechts] = sitze.sort((a, b) => a[2] - b[2]);
  assert.ok(links[0] > links[2] && links[4] > links[2], "linker Sitz: Spitze links, Schenkel nach rechts");
  assert.ok(rechts[0] < rechts[2] && rechts[4] < rechts[2], "rechter Sitz: Spitze rechts, Schenkel nach links");
  assert.equal(links[3], rechts[3], "beide Spitzen auf der Leitungshöhe");
  // the ball sits in the left seat at rest: its centre is right of the left apex, the seat's arms reach past it
  const kugel = svg.match(/<circle class="sz-kugel" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/).map(Number);
  assert.ok(kugel[1] > links[2] && kugel[1] < rechts[2]);
  assert.equal(kugel[2], links[3]);
});

test("Wechselventil: nur die Texte 1, 1 und 2; 1 links und rechts, 2 über dem Rechteck", () => {
  const { svg } = wechselventilSymbol({ feld: 90 });
  const texte = [...svg.matchAll(/<text[^>]*x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({ x: +m[1], y: +m[2], t: m[3] }));
  assert.deepEqual(texte.map((t) => t.t).sort(), ["1", "1", "2"]);
  const rahmen = svg.match(/<rect class="sz-rahmen" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/).map(Number);
  const einsen = texte.filter((t) => t.t === "1").sort((a, b) => a.x - b.x);
  assert.ok(einsen[0].x < rahmen[1] && einsen[1].x > rahmen[1] + rahmen[3], "die Ziffern 1 stehen außerhalb links und rechts");
  assert.ok(texte.find((t) => t.t === "2").y < rahmen[2], "die 2 steht über dem Rechteck");
  for (const nr of ["1", "2"]) assert.match(svg, new RegExp(`data-anschluss="${nr}"`));
});

test("Wechselventil: die vier Teile für die Laufzeit tragen data-teil", () => {
  const { svg } = wechselventilSymbol();
  for (const t of ["kugel", "links", "rechts", "ausgang"]) {
    assert.equal((svg.match(new RegExp(`data-teil="${t}"`, "g")) || []).length, 1, t);
  }
  const ausgang = svg.slice(svg.indexOf('data-teil="ausgang"'));
  assert.match(ausgang, /class="sz-knoten"/);                        // dot and branch are the output
});

test("Wechselventil: alle Koordinaten liegen in der viewBox, die Kugel in beiden Sitzen", () => {
  for (const feld of [60, 90]) {
    const { svg, breite, hoehe } = wechselventilSymbol({ feld });
    for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
      for (const p of m[1].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)) {
        assert.ok(+p[1] >= 0 && +p[1] <= breite && +p[2] >= 0 && +p[2] <= hoehe, `${feld}: ${p[0]}`);
      }
    }
    const k = svg.match(/<circle class="sz-kugel" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/).map(Number);
    const weg = Number(svg.match(/data-kugelweg="([\d.]+)"/)[1]);
    assert.ok(k[1] - k[3] >= 0 && k[1] + weg + k[3] <= breite, "Kugel bleibt auch am rechten Sitz im Bild");
  }
});

// A tiny stand-in for the DOM: just what the runtime touches.
function wechselDom(svg) {
  const klassen = () => { const set = new Set(); return { set, add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) }; };
  const attrs = Object.fromEntries([...svg.match(/<svg[^>]*>/)[0].matchAll(/ (data-[a-z0-9-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const teile = ["kugel", "links", "rechts", "ausgang"].map((t) => ({ t, attrs: {}, classList: klassen(),
    getAttribute(n) { return n === "data-teil" ? t : this.attrs[n] ?? null; }, setAttribute(n, v) { this.attrs[n] = v; } }));
  const mitten = ["links", "rechts"].map((m) => ({ m, attrs: {}, getAttribute(n) { return n === "data-mitte" ? m : this.attrs[n] ?? null; }, setAttribute(n, v) { this.attrs[n] = v; } }));
  return {
    teile, mitten,
    getAttribute: (n) => attrs[n] ?? null,
    querySelectorAll: (s) => (s === "[data-teil]" ? teile : s === "[data-mitte]" ? mitten : []),
  };
}

test("Wechselventil: Laufzeit stellt die Kugel und färbt links, rechts und Ausgang nach dem gegebenen Ton", () => {
  const { svg } = wechselventilSymbol({ feld: 60 });
  const el = wechselDom(svg);
  const stellen = new Function(`${WECHSEL_SYMBOL_LAUFZEIT}; return wechselSymbolStellen;`)();
  const weg = Number(svg.match(/data-kugelweg="([\d.]+)"/)[1]);
  const kugel = el.teile[0];
  const ton = (t) => [...el.teile.find((x) => x.t === t).classList.set].join(" ");
  stellen(el, { s: 0, links: null, rechts: "blass", ausgang: "stark" });
  assert.match(kugel.attrs.transform, /translate\(0 0\)/);
  assert.equal(ton("links"), ""); assert.equal(ton("rechts"), "blass"); assert.equal(ton("ausgang"), "stark");
  stellen(el, { s: 1, links: "stark", rechts: null, ausgang: "stark" });
  assert.equal(kugel.attrs.transform, `translate(${Math.round(weg * 100) / 100} 0)`);
  assert.equal(ton("links"), "stark"); assert.equal(ton("rechts"), ""); assert.equal(ton("ausgang"), "stark");
  stellen(el, { s: 0.5, links: "blass", rechts: "blass", ausgang: "blass" });
  assert.equal(kugel.attrs.transform, `translate(${Math.round(weg * 50) / 100} 0)`);
  stellen(el, { s: 7, links: "stark" });                        // out of range is clamped, missing tones clear
  assert.equal(kugel.attrs.transform, `translate(${Math.round(weg * 100) / 100} 0)`);
  assert.equal(ton("rechts"), "");
  stellen(el, { s: Number.NaN });
  assert.match(kugel.attrs.transform, /translate\(0 0\)/);
});

test("Wechselventil: die Leitung links und rechts von der Kugel entsteht erst, wenn sie den Sitz verlassen hat", () => {
  const { svg } = wechselventilSymbol({ feld: 60 });
  const el = wechselDom(svg);
  const stellen = new Function(`${WECHSEL_SYMBOL_LAUFZEIT}; return wechselSymbolStellen;`)();
  const stueck = (m) => el.mitten.find((x) => x.m === m).attrs.d;
  stellen(el, { s: 0 });
  assert.equal(stueck("links"), "", "am linken Sitz: keine Leitung zwischen Spitze und Kugel");
  assert.match(stueck("rechts"), /^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/);
  stellen(el, { s: 1 });
  assert.match(stueck("links"), /^M/); assert.equal(stueck("rechts"), "");
  stellen(el, { s: 0.5 });
  assert.match(stueck("links"), /^M/); assert.match(stueck("rechts"), /^M/);
});

test("Wechselventil: Laufzeit und Stil ohne Backtick, Laufzeit gültig, Namen kollidieren nicht mit den anderen Laufzeiten", () => {
  assert.ok(!WECHSEL_SYMBOL_LAUFZEIT.includes("`") && !WECHSEL_SYMBOL_CSS.includes("`"));
  assert.doesNotThrow(() => new Function(WECHSEL_SYMBOL_LAUFZEIT));
  assert.doesNotThrow(() => new Function(`${SYMBOL_LAUFZEIT}\n${DROSSEL_SYMBOL_LAUFZEIT}\n${WECHSEL_SYMBOL_LAUFZEIT}`));
});

test("Das Wechselventil-Symbol ändert die anderen Symbole nicht: Ausgaben byte-gleich", async () => {
  const { createHash } = await import("node:crypto");
  const h = (s) => createHash("sha256").update(s).digest("hex");
  assert.equal(h(drosselRueckschlagSymbol().svg), "2accc274edc18de7d68066ec356a28231b165bfa10469b9c03f7ffa2df534274");
  assert.equal(h(drosselRueckschlagSymbol({ feder: false, feld: 90 }).svg), "34d9394e4f1a3dde1d7d3027d4a1127c5199564ef82af6e9f3b5031713564c0e");
  assert.equal(h(zylinderSymbol().svg), "ea6d02816f27cc00ff1ee42b9fe10a0548aecbd43bd35c74cafeb1beba322e56");
  assert.equal(h(SYMBOL_CSS + DROSSEL_SYMBOL_CSS + SYMBOL_LAUFZEIT + DROSSEL_SYMBOL_LAUFZEIT), "5b19288f6a576f50d1f8bdb45dc4627b3d4d91abf96e788a3b634fbd2e1506d9");
});
