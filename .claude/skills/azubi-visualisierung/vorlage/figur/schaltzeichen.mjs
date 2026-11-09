// Directional-valve symbols after ISO 1219-1, drawn as SVG.
//
// The module knows nothing about one particular valve: it draws whatever the
// `art` description says — how many fields, which ports are joined in each
// field, which ports sit below and above. A 3/2 or 5/3 is a different
// description, not different code.
//
// How to read the symbol: every field is one switching position. The ports
// are fixed to the housing and stand under and over ONE field — the one that
// is active. Switching slides the whole row of fields (with the actuations
// attached to it) until the other field stands over the ports.
//
// The only writing in the drawing: the port numbers and the pilot numbers.

/**
 * 5/2 valve. Field 0 (left) is position 14, field 1 (right) position 12.
 * A pair is `[from, to]`: the arrow runs from the first port to the second.
 * `unten` and `oben` list the ports along the bottom and top edge; `zufuhr`
 * is the supply port: paths leaving it are drawn strong, all others pale.
 */
export const VENTIL_5_2 = { felder: [[[1, 4], [2, 3]], [[1, 2], [4, 5]]], unten: [5, 1, 3], oben: [4, 2], zufuhr: 1, steuer: [14, 12] };

/**
 * 3/2 valves. Field 0 is the actuated position, field 1 the rest position
 * (spring side). `steuer` lists the pilot numbers left and right of the row:
 * `null` = no pilot number there (the spring side).
 * NC: closed in rest (2 vented), signal 12 connects 1→2.
 * NO: open in rest (1→2), signal 10 vents 2.
 */
export const VENTIL_3_2_NC = { felder: [[[1, 2]], [[2, 3]]], unten: [1, 3], oben: [2], zufuhr: 1, steuer: [12, null] };
export const VENTIL_3_2_NO = { felder: [[[2, 3]], [[1, 2]]], unten: [1, 3], oben: [2], zufuhr: 1, steuer: [10, null] };

const STRICH = 1.6;

const zahl = (x) => String(Math.round(x * 100) / 100);

/** Horizontal position of a port inside a field, as a fraction of the field. */
function anschlussBruchteil(art, nr) {
  for (const reihe of [art.unten, art.oben]) {
    const i = reihe.indexOf(nr);
    if (i >= 0) return { x: (i + 0.5) / reihe.length, unten: reihe === art.unten };
  }
  throw new Error(`Anschluss ${nr} steht weder unten noch oben`);
}

/** A filled arrow head at (x, y) pointing along (dx, dy). */
function spitze(x, y, dx, dy, l, b) {
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n, uy = dy / n;
  const bx = x - ux * l, by = y - uy * l;
  return `M${zahl(x)} ${zahl(y)}L${zahl(bx - uy * b)} ${zahl(by + ux * b)}L${zahl(bx + uy * b)} ${zahl(by - ux * b)}Z`;
}

function pfeil(art, paar, x0, yUnten, yOben, f) {
  const [von, nach] = paar;
  const a = anschlussBruchteil(art, von), b = anschlussBruchteil(art, nach);
  const ax = x0 + a.x * f, ay = a.unten ? yUnten : yOben;
  const bx = x0 + b.x * f, by = b.unten ? yUnten : yOben;
  const rolle = von === art.zufuhr ? "druck" : "abluft";
  const d = `M${zahl(ax)} ${zahl(ay)}L${zahl(bx)} ${zahl(by)}${spitze(bx, by, bx - ax, by - ay, f * 0.17, f * 0.06)}`;
  return `<path class="sz-weg" data-weg="${von}-${nach}" data-rolle="${rolle}" d="${d}" fill="currentColor" stroke="currentColor" stroke-width="${STRICH}" stroke-linejoin="miter"/>`;
}

/** A blocked port: a short stub with a bar across it, the "T". */
function sperre(art, nr, x0, yUnten, yOben, f) {
  const p = anschlussBruchteil(art, nr);
  const x = x0 + p.x * f;
  const richtung = p.unten ? -1 : 1;
  const y0 = p.unten ? yUnten : yOben;
  const y1 = y0 + richtung * f * 0.14;
  const w = f * 0.09;
  return `<path class="sz-sperre" data-sperre="${nr}" d="M${zahl(x)} ${zahl(y0)}L${zahl(x)} ${zahl(y1)}M${zahl(x - w)} ${zahl(y1)}L${zahl(x + w)} ${zahl(y1)}" fill="none" stroke="currentColor" stroke-width="${STRICH}"/>`;
}

/**
 * One actuation, attached to the outer edge of a field. `seite` is "links" or
 * "rechts"; `xKante` is the x of that edge, `yMitte` the height of its middle.
 */
function betaetigung(seite, art, xKante, yMitte, f, nummer) {
  const r = seite === "links" ? -1 : 1;
  const lang = f * 0.8;
  const attr = `class="sz-betaetigung" data-seite="${seite}" data-art="${art}"`;
  if (art === "feder") {
    // Zigzag with four peaks between two straight stubs.
    const stub = lang * 0.15, zick = lang - 2 * stub, h = f * 0.11;
    let d = `M${zahl(xKante)} ${zahl(yMitte)}L${zahl(xKante + r * stub)} ${zahl(yMitte)}`;
    for (let i = 0; i < 8; i += 1) {
      const x = xKante + r * (stub + (zick * (i + 0.5)) / 8);
      d += `L${zahl(x)} ${zahl(yMitte + (i % 2 === 0 ? -h : h))}`;
    }
    d += `L${zahl(xKante + r * (lang - stub))} ${zahl(yMitte)}L${zahl(xKante + r * lang)} ${zahl(yMitte)}`;
    return `<g ${attr}><path d="${d}" fill="none" stroke="currentColor" stroke-width="${STRICH}" stroke-linejoin="round"/></g>`;
  }
  // Pneumatic: a filled triangle pointing at the field, a dashed pilot line out.
  const tl = f * 0.2, tb = f * 0.1;
  const tri = `M${zahl(xKante)} ${zahl(yMitte)}L${zahl(xKante + r * tl)} ${zahl(yMitte - tb)}L${zahl(xKante + r * tl)} ${zahl(yMitte + tb)}Z`;
  const linie = `M${zahl(xKante + r * tl)} ${zahl(yMitte)}L${zahl(xKante + r * lang)} ${zahl(yMitte)}`;
  const tx = xKante + r * lang * 0.62;
  const beschriftung = nummer == null ? ""
    : `<text class="sz-text" x="${zahl(tx)}" y="${zahl(yMitte - f * 0.1)}" text-anchor="middle" font-size="${zahl(f * 0.2)}" fill="currentColor">${nummer}</text>`;
  return `<g ${attr}><path d="${tri}" fill="currentColor" stroke="currentColor" stroke-width="${STRICH}" stroke-linejoin="miter"/>`
    + `<path d="${linie}" fill="none" stroke="currentColor" stroke-width="${STRICH}" stroke-dasharray="${zahl(f * 0.08)} ${zahl(f * 0.06)}"/>`
    + `${beschriftung}</g>`;
}

/**
 * The symbol of a directional valve as an SVG string.
 * `links`/`rechts`: "pneumatisch" or "feder". `feld`: edge of one field in px.
 * The viewBox is wide enough for both end positions of the sliding row.
 */
export function wegeventilSymbol(art, { links = "pneumatisch", rechts = "feder", feld = 60 } = {}) {
  const f = feld;
  const n = art.felder.length;
  const anschl = f / 3;                 // length of a port line
  const rand = 4;
  const lang = f * 0.8;                 // length of an actuation
  const nummer = art.steuer ?? [];      // pilot numbers, left and right; null = none
  const tH = f * 0.2;                   // text height
  const yOben = rand + tH + 2 + anschl;
  const yUnten = yOben + f;
  const hoehe = Math.ceil(yUnten + anschl + tH + 2 + rand);
  // The ports stand over the slot at x0. At anteil 1 (no shift) field 0 is in
  // the slot and the row reaches to x0 + n·f + lang on the right; at anteil 0
  // the row is shifted left by (n−1)·f and reaches to x0 − (n−1)·f − lang on
  // the left. The viewBox spans both reaches plus a margin, so it holds the
  // whole symbol in either end position — and before the first symbolStellen.
  const x0 = rand + (n - 1) * f + lang;
  const breite = Math.ceil(x0 + n * f + lang + rand);

  const alle = [...art.unten, ...art.oben].sort((a, b) => a - b);
  const feldTeile = art.felder.map((paare, i) => {
    const fx = x0 + i * f;
    const benutzt = new Set(paare.flat());
    const gesperrt = alle.filter((p) => !benutzt.has(p));
    return `<g data-feld="${i}"><rect class="sz-rahmen" x="${zahl(fx)}" y="${zahl(yOben)}" width="${zahl(f)}" height="${zahl(f)}" fill="none" stroke="currentColor" stroke-width="${STRICH}"/>`
      + paare.map((p) => pfeil(art, p, fx, yUnten, yOben, f)).join("")
      + gesperrt.map((p) => sperre(art, p, fx, yUnten, yOben, f)).join("")
      + "</g>";
  });
  const mitteY = yOben + f / 2;
  const seitlich = betaetigung("links", links, x0, mitteY, f, nummer[0])
    + betaetigung("rechts", rechts, x0 + n * f, mitteY, f, nummer[1]);

  // Fixed ports: lines and numbers, not part of the sliding group.
  const feste = (reihe, unten) => reihe.map((nr, i) => {
    const x = x0 + ((i + 0.5) / reihe.length) * f;
    const y0 = unten ? yUnten : yOben;
    const y1 = unten ? yUnten + anschl : yOben - anschl;
    const ty = unten ? y1 + tH : y1 - 2;
    return `<g data-anschluss="${nr}"><path d="M${zahl(x)} ${zahl(y0)}L${zahl(x)} ${zahl(y1)}" fill="none" stroke="currentColor" stroke-width="${STRICH}"/>`
      + `<text class="sz-text" x="${zahl(x)}" y="${zahl(ty)}" text-anchor="middle" font-size="${zahl(tH)}" fill="currentColor">${nr}</text></g>`;
  }).join("");

  const text = (a) => (a === "feder" ? "Feder" : "pneumatisch");
  const beschr = `Schaltzeichen ${alle.length}/${n}-Wegeventil, links ${text(links)}${links === "pneumatisch" && nummer[0] != null ? ` (${nummer[0]})` : ""}, rechts ${text(rechts)}${rechts === "pneumatisch" && nummer[1] != null ? ` (${nummer[1]})` : ""}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="sz-symbol" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}" role="img" aria-label="${beschr}" data-feldbreite="${f}" color="currentColor">`
    + `<g data-felder>${feldTeile.join("")}${seitlich}</g><!--felder-->`
    + feste(art.unten, true) + feste(art.oben, false)
    + "</svg>";
  return { svg, breite, hoehe };
}

/**
 * Styles for the symbol. Colours come only through CSS variables; the
 * fallbacks keep a bare page readable. The page sets --sz-stark and --sz-blass
 * to the two blues of figur/luft.mjs, so the symbol and the drawing agree.
 */
export const SYMBOL_CSS = `
.sz-symbol { color: var(--sz-strich, currentColor); overflow: visible; }
.sz-symbol .sz-rahmen, .sz-symbol .sz-sperre { stroke: var(--sz-strich, currentColor); }
.sz-symbol .sz-betaetigung { color: var(--sz-strich, currentColor); }
.sz-symbol .sz-weg { color: var(--sz-strich, currentColor); stroke: currentColor; fill: currentColor; }
.sz-symbol .sz-weg.stark { color: var(--sz-stark, #123f87); }
.sz-symbol .sz-weg.blass { color: var(--sz-blass, #5a8cbf); }
.sz-symbol .sz-text { fill: var(--sz-strich, currentColor); font-family: inherit; font-weight: 600; }
.sz-symbol [data-felder] { transition: none; }
`;

/**
 * Runtime, inlined as a classic script. `symbolStellen(svgEl, anteil, offen)`
 * slides the row of fields: anteil 1 = field 0 over the ports, 0 = field 1.
 * `offen` is { a, b } as wegeOffen() gives it: a = how far the paths of field
 * 0 are open, b those of field 1, 0…1. An open path takes the strong tone when
 * it carries supply air, the pale tone when it carries exhaust air; a closed
 * one takes none.
 */
export const SYMBOL_LAUFZEIT = String.raw`
function symbolKlasse(weg, an, rolle) {
  weg.classList.remove("stark");
  weg.classList.remove("blass");
  if (an) weg.classList.add(rolle === "druck" ? "stark" : "blass");
}

function symbolStellen(svgEl, anteil, offen) {
  var gruppe = svgEl.querySelector("[data-felder]");
  if (!gruppe) return;
  var feld = Number(svgEl.getAttribute("data-feldbreite")) || 0;
  var t = Number(anteil);
  t = t > 1 ? 1 : t >= 0 ? t : 0;     // also catches a value that is not a number
  var schub = (-(1 - t) * feld) || 0; // no negative zero
  gruppe.setAttribute("transform", "translate(" + Math.round(schub * 100) / 100 + " 0)");
  var wege = svgEl.querySelectorAll("[data-weg]");
  for (var i = 0; i < wege.length; i += 1) {
    var weg = wege[i];
    var f = weg.closest("[data-feld]").getAttribute("data-feld");
    var mass = offen ? (f === "0" ? offen.a : offen.b) : 0;
    symbolKlasse(weg, mass > 0, weg.getAttribute("data-rolle"));
  }
}
`;
