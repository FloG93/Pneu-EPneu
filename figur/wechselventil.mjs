// The air model of a shuttle valve (Wechselventil, OR element) as Festo builds it
// (OS-1/4-B): a loose rubber body between two seats, two inputs (both "1") at the ends
// of a through bore and one output "2" in the middle. The higher pressure pushes the
// body onto the seat of the OTHER input and shuts it; the output takes the air of the
// open input. Pure functions, no drawing. The page and its tests compute with this, so
// the figure can never disagree about the numbers it shows.
//
// Units: mm³ (chamber), bar, standard litres per minute (l/min), s.
// Origin of every constant: "Katalog" = Festo data sheet 6682 (OS-1/4-B),
// "abgeleitet" = computed from catalogue values, "Annahme" = assumed.
//
// Conventions, stated once:
// - Pressures (`pL`, `pR`, `p2`) are ABSOLUTE bar, ambient = AUSSEN = 1 (as in
//   ventil.mjs). The page's sliders show gauge pressure; `absolut(bar)` converts.
//   `pL`/`pR` in the state are the pressures of the two input lines as last given to
//   `schritt` (the lines are held by their sources), `p2` is the chamber and the
//   volume behind output 2.
// - `s` is the position of the body, 0…1: 0 = on the LEFT seat (shuts the left
//   input), 1 = on the RIGHT seat (shuts the right input). The opening of the left
//   input is `s`, that of the right input `1 − s`.
// - Flow signs: positive = from an input into the chamber, negative = from the chamber
//   back out through that input (venting).
// No top-level name here may clash with one in pneumatik.mjs, ventil.mjs or
// stromventil.mjs: pages inline model files into one classic script. This file
// needs `AUSSEN` and `kammerSchritt` from ventil.mjs; pages inline that file first.
import { AUSSEN, kammerSchritt } from "./ventil.mjs";

export const OS_1_4 = {
  qn: 1170,              // l/min at bezugsDp, body fully clear of the open seat – Katalog
  bezugsDp: 1,           // bar, pressure drop of the catalogue flow – Annahme (norm condition)
  nennweite: 6.5,        // mm, seat bore – Katalog
  schaltdruck: 0.05,     // bar, the body only changes seat above this pressure difference – Annahme (stiction, inertia)
  schaltzeit: 0.008,     // s, travel from one seat to the other – Annahme
  volumen2: 50000,       // mm³ = 50 cm³, hose and consumer behind output 2 – Annahme
  hub: 6,                // mm, travel of the body between the seats (drawing, exaggerated) – Annahme
};

const wechselLminMm3s = 1e6 / 60;   // 1 l/min in mm³/s (abgeleitet)
const wechselSprungMax = 0.1;       // s, a longer frame is cut, not integrated
const wechselTeilH = 0.0005;        // s, fixed sub-step: the chamber's time constant is
                                    // V / (qn in mm³/s per bar) = 50000 / 19.5e6 = 2,6 ms (abgeleitet)

/** Gauge pressure of the page's slider → absolute pressure of the model. */
export function absolut(bar) {
  return AUSSEN + bar;
}

/** Fresh state: body on the left seat (shuts left), everything at ambient. */
export function neuerZustand() {
  return { s: 0, pL: AUSSEN, pR: AUSSEN, p2: AUSSEN };
}

/** "links" / "rechts" while the body sits on a seat, `null` while it is on its way. */
export function sperrSeite(z) {
  return z.s <= 0 ? "links" : z.s >= 1 ? "rechts" : null;
}

/**
 * Flow through both inputs in l/min, linear in the pressure drop and equal to the
 * catalogue value at `bezugsDp` (Annahme: the catalogue gives only this one point).
 * A shut seat carries nothing. An input to which the body is travelling (its line is
 * lower than the other by more than `schaltdruck`) does not take air out of the chamber
 * either: the stream would pull the body into that seat (Annahme).
 */
export function durchfluss(z, masse = OS_1_4) {
  const unterschied = z.pL - z.pR;
  const links = wechselSeite(z.s, z.pL, z.p2, unterschied < -masse.schaltdruck, masse);
  const rechts = wechselSeite(1 - z.s, z.pR, z.p2, unterschied > masse.schaltdruck, masse);
  return { links, rechts, gesamt: links + rechts };
}

function wechselSeite(oeffnung, pEingang, p2, zielSitz, masse) {
  const dp = pEingang - p2;
  if (dp < 0 && zielSitz) return 0;
  return (masse.qn * oeffnung * dp) / masse.bezugsDp || 0;   // `|| 0` drops a negative zero
}

/**
 * Advance the state by `dt` seconds with the input line pressures `pL`, `pR` (absolute).
 * The body runs to the seat of the lower input when the difference exceeds
 * `schaltdruck`; below it, it stays where it is (whoever came first keeps the output).
 * A body in flight whose difference has vanished finishes its way to the nearer seat.
 * The chamber follows through `kammerSchritt`. Fixed sub-steps, any frame rate gives
 * the same motion. Mutates and returns `z`.
 */
export function schritt(z, masse, dt, { pL, pR }) {
  z.pL = pL;
  z.pR = pR;
  const gesamt = dt > 0 ? Math.min(dt, wechselSprungMax) : 0;
  const teile = Math.max(1, Math.ceil(gesamt / wechselTeilH - 1e-9));
  const h = gesamt / teile;
  for (let i = 0; i < teile; i += 1) wechselTeilschritt(z, masse, h);
  return z;
}

function wechselTeilschritt(z, masse, h) {
  const unterschied = z.pL - z.pR;
  let ziel = null;
  if (unterschied > masse.schaltdruck) ziel = 1;
  else if (unterschied < -masse.schaltdruck) ziel = 0;
  else if (z.s > 0 && z.s < 1) ziel = z.s >= 0.5 ? 1 : 0;
  if (ziel !== null) {
    const weg = h / masse.schaltzeit;
    z.s = Math.abs(ziel - z.s) <= weg + 1e-9 ? ziel : z.s + Math.sign(ziel - z.s) * weg;
  }
  const q = durchfluss(z, masse).gesamt * wechselLminMm3s;   // mm³/s
  z.p2 = kammerSchritt(z.p2, q, 0, masse.volumen2, h, Math.max(z.pL, z.pR, z.p2));
}

const wechselBar = (x) => Math.max(0, Math.round(x * 10) / 10);

/** Rounded values for the card's readout: gauge bar to 0,1, flow to whole l/min. */
export function anzeige(z, masse = OS_1_4) {
  const q = durchfluss(z, masse);
  return {
    pL: wechselBar(z.pL - AUSSEN),
    pR: wechselBar(z.pR - AUSSEN),
    p2: wechselBar(z.p2 - AUSSEN),
    sperrt: sperrSeite(z),
    links: Math.round(q.links) || 0,
    rechts: Math.round(q.rechts) || 0,
    gesamt: Math.round(q.gesamt) || 0,
  };
}

/** The readout in two lines (German decimal comma, a proper minus), built once for build and page. */
export function anzeigeZeilen(a) {
  const bar = (x) => x.toFixed(1).replace(".", ",");
  const q = a.gesamt < 0 ? `−${-a.gesamt}` : String(a.gesamt);
  return [
    `Eingang links ${bar(a.pL)} bar · Eingang rechts ${bar(a.pR)} bar · Ausgang 2 ${bar(a.p2)} bar`,
    `Körper sperrt: ${a.sperrt ?? "–"} · Durchfluss ${q} l/min`,
  ];
}
