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
  if (art === "taster") {
    // Push button (ISO 1219-1 Druckknopf): a short stub out of the field that ends in a
    // half circle, the flat side at the stub's end, the bulge pointing away from the valve.
    const stub = lang * 0.55, rad = f * 0.14;
    const xe = xKante + r * stub;
    const d = `M${zahl(xKante)} ${zahl(yMitte)}L${zahl(xe)} ${zahl(yMitte)}`
      + `M${zahl(xe)} ${zahl(yMitte - rad)}A${zahl(rad)} ${zahl(rad)} 0 0 ${r > 0 ? 1 : 0} ${zahl(xe)} ${zahl(yMitte + rad)}Z`;
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

  const text = (a) => (a === "feder" ? "Feder" : a === "taster" ? "Druckknopf" : "pneumatisch");
  const beschr = `Schaltzeichen ${alle.length}/${n}-Wegeventil, links ${text(links)}${links === "pneumatisch" && nummer[0] != null ? ` (${nummer[0]})` : ""}, rechts ${text(rechts)}${rechts === "pneumatisch" && nummer[1] != null ? ` (${nummer[1]})` : ""}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="sz-symbol" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}" role="img" aria-label="${beschr}" data-feldbreite="${f}" color="currentColor">`
    + `<g data-felder>${feldTeile.join("")}${seitlich}</g><!--felder-->`
    + feste(art.unten, true) + feste(art.oben, false)
    + "</svg>";
  return { svg, breite, hoehe };
}

/**
 * The symbol of a single-acting cylinder with spring return: the housing, the
 * piston, the rod through the spring side, the one air port on the piston side
 * and the vent on the spring side. `feld` is the height of the housing in px.
 * Static; the viewBox holds all of it.
 */
export function zylinderSymbol({ feld = 60 } = {}) {
  const f = feld;
  const rand = 4, hoeheKasten = f * 0.7, laenge = f * 2.3;
  const x0 = rand + f * 0.35;                 // housing's left edge, the port stub stands left of it
  const y0 = rand + f * 0.2, ym = y0 + hoeheKasten / 2;
  const xKolben = x0 + laenge * 0.28, xEnde = x0 + laenge, xStange = xEnde + f * 0.55;
  const zick = 9, h = hoeheKasten * 0.2;
  let feder = `M${zahl(xKolben)} ${zahl(ym)}`;
  const a = xKolben + 3, b = xEnde - 3;
  for (let i = 0; i < zick; i += 1) feder += `L${zahl(a + ((b - a) * (i + 0.5)) / zick)} ${zahl(ym + (i % 2 === 0 ? -h : h))}`;
  feder += `L${zahl(xEnde)} ${zahl(ym)}`;
  const yAnschluss = y0 + hoeheKasten * 0.5, yEntl = y0 + hoeheKasten * 0.18;
  const breite = Math.ceil(xStange + rand), hoehe = Math.ceil(y0 + hoeheKasten + rand + 2);
  const strich = `fill="none" stroke="currentColor" stroke-width="${STRICH}"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="sz-symbol" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}" role="img" `
    + `aria-label="Schaltzeichen einfachwirkender Zylinder mit Federrückstellung: ein Luftanschluss auf der Kolbenseite, Feder und Entlüftung auf der Stangenseite" color="currentColor">`
    + `<rect class="sz-rahmen" x="${zahl(x0)}" y="${zahl(y0)}" width="${zahl(laenge)}" height="${zahl(hoeheKasten)}" ${strich}/>`
    + `<path class="sz-kolben" d="M${zahl(xKolben)} ${zahl(y0)}L${zahl(xKolben)} ${zahl(y0 + hoeheKasten)}" ${strich} stroke-width="${STRICH * 1.6}"/>`
    + `<path class="sz-stange" d="M${zahl(xKolben)} ${zahl(ym)}L${zahl(xStange)} ${zahl(ym)}" ${strich}/>`
    + `<path class="sz-feder" d="${feder}" ${strich} stroke-linejoin="round"/>`
    + `<path class="sz-anschluss" d="M${zahl(rand)} ${zahl(yAnschluss)}L${zahl(x0)} ${zahl(yAnschluss)}" ${strich}/>`
    + `<path class="sz-entlueftung" d="M${zahl(xEnde)} ${zahl(yEntl)}L${zahl(xEnde + f * 0.16)} ${zahl(yEntl)}" ${strich}/>`
    + `</svg>`;
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

/**
 * The symbol of an adjustable throttle check valve (ISO 1219-1): port 1 on the
 * left, port 2 on the right, two parallel branches between them.
 * Upper branch = adjustable throttle: two facing arcs (the constriction) that
 * the line passes between, crossed by a slanted arrow (adjustable).
 * Lower branch = check valve with spring: a ball (circle) pressed by a spring
 * against a V seat. The seat lies on the 2 side, so flow 1→2 presses the ball
 * onto it (blocked) and flow 2→1 lifts it (free).
 * Each branch is one group with `data-weg` ("drossel" / "rueckschlag") for the
 * runtime to colour. `feld` is the scale in px (distance of the two branches
 * is 0,9 · feld). `feder: false` draws the check valve without its spring (ball against
 * the V seat, no stop bar): the lip seal of a Festo GR/GRA has none.
 */
export function drosselRueckschlagSymbol({ feld = 60, feder = true } = {}) {
  const f = feld;
  const rand = 4, tH = f * 0.2;
  const anschl = f * 0.5;                       // port stub length
  const xL = rand + anschl, xR = xL + f * 1.8;  // the two junctions
  const xm = (xL + xR) / 2;
  const yOben = rand + f * 0.3;                 // throttle line
  const ym = yOben + f * 0.45;                  // port line
  const yUnten = ym + f * 0.45;                 // check valve line
  const strich = `fill="none" stroke="currentColor" stroke-width="${STRICH}"`;

  // Throttle: line through the gap of two arcs, slanted arrow across.
  const a = f * 0.2, b = f * 0.17, s = f * 0.11;
  const rb = (a * a + s * s) / (2 * s);          // radius of an arc with chord 2a and sagitta s
  const bogenOben = `M${zahl(xm - a)} ${zahl(yOben - b)}A${zahl(rb)} ${zahl(rb)} 0 0 0 ${zahl(xm + a)} ${zahl(yOben - b)}`;
  const bogenUnten = `M${zahl(xm - a)} ${zahl(yOben + b)}A${zahl(rb)} ${zahl(rb)} 0 0 1 ${zahl(xm + a)} ${zahl(yOben + b)}`;
  const pa = { x: xm - f * 0.3, y: yOben + f * 0.24 }, pe = { x: xm + f * 0.3, y: yOben - f * 0.24 };
  const drossel = `<g class="sz-zweig" data-weg="drossel">`
    + `<path class="sz-leitung" d="M${zahl(xL)} ${zahl(yOben)}L${zahl(xR)} ${zahl(yOben)}" ${strich}/>`
    + `<path class="sz-bogen" d="${bogenOben}" ${strich}/>`
    + `<path class="sz-bogen" d="${bogenUnten}" ${strich}/>`
    + `<path class="sz-verstell" d="M${zahl(pa.x)} ${zahl(pa.y)}L${zahl(pe.x)} ${zahl(pe.y)}${spitze(pe.x, pe.y, pe.x - pa.x, pe.y - pa.y, f * 0.15, f * 0.055)}" fill="currentColor" stroke="currentColor" stroke-width="${STRICH}" stroke-linejoin="miter"/>`
    + `</g>`;

  // Check valve: stop, spring, ball, V seat opening towards the ball.
  const r = f * 0.1, d = f * 0.17;
  const xb = xm - f * 0.02;                     // ball centre
  const xSpitze = xb + r * Math.SQRT2;          // seat apex, arms at 45° touch the ball
  const xStop = xb - r - f * 0.3;
  const zick = 6, h = f * 0.065;
  let federPfad = `M${zahl(xStop)} ${zahl(yUnten)}`;
  const fa = xStop + f * 0.03, fe = xb - r - f * 0.02;
  for (let i = 0; i < zick; i += 1) federPfad += `L${zahl(fa + ((fe - fa) * (i + 0.5)) / zick)} ${zahl(yUnten + (i % 2 === 0 ? -h : h))}`;
  federPfad += `L${zahl(xb - r)} ${zahl(yUnten)}`;
  const leitungUnten = feder
    ? `M${zahl(xL)} ${zahl(yUnten)}L${zahl(xStop)} ${zahl(yUnten)}M${zahl(xSpitze)} ${zahl(yUnten)}L${zahl(xR)} ${zahl(yUnten)}`
    : `M${zahl(xL)} ${zahl(yUnten)}L${zahl(xb - r)} ${zahl(yUnten)}M${zahl(xSpitze)} ${zahl(yUnten)}L${zahl(xR)} ${zahl(yUnten)}`;
  const rueck = `<g class="sz-zweig" data-weg="rueckschlag">`
    + `<path class="sz-leitung" d="${leitungUnten}" ${strich}/>`
    + (feder
      ? `<path class="sz-anschlag" d="M${zahl(xStop)} ${zahl(yUnten - d * 0.7)}L${zahl(xStop)} ${zahl(yUnten + d * 0.7)}" ${strich}/>`
        + `<path class="sz-feder" d="${federPfad}" ${strich} stroke-linejoin="round"/>`
      : "")
    + `<circle class="sz-kugel" cx="${zahl(xb)}" cy="${zahl(yUnten)}" r="${zahl(r)}" ${strich}/>`
    + `<path class="sz-sitz" d="M${zahl(xSpitze - d)} ${zahl(yUnten - d)}L${zahl(xSpitze)} ${zahl(yUnten)}L${zahl(xSpitze - d)} ${zahl(yUnten + d)}" ${strich} stroke-linejoin="miter"/>`
    + `</g>`;

  // Fixed parts: the two junction lines and the ports with their numbers.
  const fest = `<path class="sz-knoten" d="M${zahl(xL)} ${zahl(yOben)}L${zahl(xL)} ${zahl(yUnten)}M${zahl(xR)} ${zahl(yOben)}L${zahl(xR)} ${zahl(yUnten)}" ${strich}/>`
    + [[1, rand, xL], [2, xR, xR + anschl]].map(([nr, x0, x1]) =>
      `<g data-anschluss="${nr}"><path d="M${zahl(x0)} ${zahl(ym)}L${zahl(x1)} ${zahl(ym)}" ${strich}/>`
      + `<text class="sz-text" x="${zahl((x0 + x1) / 2)}" y="${zahl(ym - 3)}" text-anchor="middle" font-size="${zahl(tH)}" fill="currentColor">${nr}</text></g>`).join("");

  const breite = Math.ceil(xR + anschl + rand);
  const hoehe = Math.ceil(yUnten + f * 0.2 + rand);
  const beschr = `Schaltzeichen Drosselrückschlagventil: oben die einstellbare Drossel, unten parallel das ${feder ? "federbelastete " : ""}Rückschlagventil${feder ? "" : " ohne Feder"}, von Anschluss 1 nach Anschluss 2`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="sz-symbol" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}" role="img" aria-label="${beschr}" color="currentColor">`
    + drossel + rueck + fest + "</svg>";
  return { svg, breite, hoehe };
}

/** Styles for the throttle check valve symbol; add to SYMBOL_CSS on the page. */
export const DROSSEL_SYMBOL_CSS = `
.sz-symbol .sz-zweig { color: var(--sz-strich, currentColor); }
.sz-symbol .sz-zweig.stark { color: var(--sz-stark, #123f87); }
.sz-symbol .sz-zweig.blass { color: var(--sz-blass, #5a8cbf); }
`;

/**
 * Runtime, inlined as a classic script. `drosselSymbolStellen(svgEl, offen)`
 * colours the branches that carry air: `offen` is { drossel, rueckschlag, ton }
 * with the share of each branch in use (0 = none) and the tone of the air,
 * "stark" or "blass". A branch with no flow takes no tone.
 */
export const DROSSEL_SYMBOL_LAUFZEIT = String.raw`
function drosselSymbolStellen(svgEl, offen) {
  var zweige = svgEl.querySelectorAll("[data-weg]");
  for (var i = 0; i < zweige.length; i += 1) {
    var z = zweige[i];
    var mass = Number(offen && offen[z.getAttribute("data-weg")]) || 0;
    z.classList.remove("stark");
    z.classList.remove("blass");
    if (mass > 0) z.classList.add(offen.ton === "blass" ? "blass" : "stark");
  }
}
`;
