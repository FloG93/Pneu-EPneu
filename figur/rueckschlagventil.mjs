// The air model of a check valve (Rückschlagventil) with a spring-loaded poppet, after the
// Festo H-1/4-B: G1/4 at both ends, input 1 on the left, output 2 on the right. The pressure
// at 1 lifts the poppet off its seat against a weak spring; the air flows round the poppet
// to 2. The pressure at 2 presses the poppet harder onto the seat: nothing flows back, and
// the pressure behind the valve stays "locked in". Pure functions, no drawing. The page and
// its tests compute with this, so the figure can never disagree about the numbers it shows.
//
// Units: mm³ (volume behind 2), bar, standard litres per minute (l/min), s, mm.
// Origin of every constant: "Katalog" = Festo data sheet 11689 (H-1/4-B) and the catalogue
// H/HA/HB, "Schwesterreihe" = the catalogue's H-QS series, "Annahme" = assumed.
//
// Conventions, stated once:
// - Pressures (`p1`, `p2`) are ABSOLUTE bar, ambient = AUSSEN = 1 (as in ventil.mjs). The
//   page's slider shows gauge pressure; `absolut(bar)` converts. `p1` in the state is the
//   pressure of the input line as last given to `schritt` (the line is held by its source),
//   `p2` is the volume behind output 2 (hose and consumer).
// - `h` is the lift of the poppet, 0…1: 0 = on the seat (shut), 1 = fully open.
// - The valve is ideally tight: a shut poppet carries nothing, in either direction.
// No top-level name here may clash with one in pneumatik.mjs, ventil.mjs, stromventil.mjs or
// wechselventil.mjs: pages inline model files into one classic script. This file needs
// `AUSSEN` and `kammerSchritt` from ventil.mjs; pages inline that file first.
import { AUSSEN, kammerSchritt } from "./ventil.mjs";

export const H_1_4 = {
  qn: 1000,              // l/min at bezugsDp, poppet fully open – Katalog (data sheet 11689: 6 -> 5 bar)
  bezugsDp: 1,           // bar, pressure drop of the catalogue flow – Katalog (6 -> 5 bar)
  oeffnungsdruck: 0.1,   // bar, the poppet lifts only above this drop p1 - p2 – Schwesterreihe H-QS (open > 0,1 bar), for the H-1/4-B Annahme
  vollDp: 0.5,           // bar, from this drop on the poppet is fully open, linear from oeffnungsdruck – Annahme
  qMaxFaktor: 2,         // the flow is capped at this multiple of qn (a real valve chokes; the display stays honest) – Annahme
  schaltzeit: 0.008,     // s, travel from the seat to fully open and back – Annahme
  volumen2: 50000,       // mm³ = 50 cm³, hose and consumer behind output 2 – Annahme
  entlueftZeit: 0.1,     // s, time constant of the fixed vent orifice at 2 (the button "Ausgang 2 entlüften"); chosen small so that the venting
                         // can be seen within a step of the automatic cycle in the page's slow motion (1/10) – Annahme
  hub: 3,                // mm, lift of the poppet in the drawing (exaggerated) – Annahme
};

const rueckLminMm3s = 1e6 / 60;   // 1 l/min in mm³/s (abgeleitet)
const rueckSprungMax = 0.1;       // s, a longer frame is cut, not integrated
const rueckTeilH = 0.0005;        // s, fixed sub-step: near the opening pressure the chamber's time constant is
                                  // V / (qn in mm³/s per bar · 0,25) = 50000 / (16,67e6 · 0,25) = 12 ms (abgeleitet)

/** Gauge pressure of the page's slider → absolute pressure of the model. */
export function absolut(bar) {
  return AUSSEN + bar;
}

/** Fresh state: poppet on the seat, everything at ambient. */
export function neuerZustand() {
  return { h: 0, p1: AUSSEN, p2: AUSSEN };
}

/**
 * The lift the pressure drop `dp` = p1 - p2 asks for: 0 up to and including the opening pressure,
 * 1 from `vollDp` on, linear between (Annahme: the spring's rate).
 */
export function sollHub(dp, masse = H_1_4) {
  if (dp <= masse.oeffnungsdruck) return 0;
  if (dp >= masse.vollDp) return 1;
  return (dp - masse.oeffnungsdruck) / (masse.vollDp - masse.oeffnungsdruck);
}

/**
 * Flow from 1 to 2 in l/min: linear in the pressure drop and equal to the catalogue value at
 * `bezugsDp` with the poppet fully open (Annahme: the catalogue gives only this one point),
 * proportional to the lift, capped at `qMaxFaktor · qn`. Never negative: with back pressure
 * (p2 above p1) or a shut poppet nothing flows.
 */
export function durchfluss(z, masse = H_1_4) {
  const dp = z.p1 - z.p2;
  if (dp <= 0 || z.h <= 0) return 0;
  return Math.min((masse.qn * z.h * dp) / masse.bezugsDp, masse.qn * masse.qMaxFaktor) + 0;
}

/**
 * Advance the state by `dt` seconds with the input line pressure `p1` (absolute) and the vent
 * of output 2 open or shut. The poppet runs towards the lift the drop asks for (`sollHub`) at
 * the rate 1 / schaltzeit. Output 2 is filled through the poppet and, while `entlueften` is on,
 * drained through a fixed orifice towards ambient. A shut poppet carries nothing: p2 stays
 * where it is. Fixed sub-steps, any frame rate gives the same motion. Mutates and returns `z`.
 */
export function schritt(z, masse, dt, { p1, entlueften = false }) {
  z.p1 = p1;
  const gesamt = dt > 0 ? Math.min(dt, rueckSprungMax) : 0;
  const teile = Math.max(1, Math.ceil(gesamt / rueckTeilH - 1e-9));
  const h = gesamt / teile;
  for (let i = 0; i < teile; i += 1) rueckTeilschritt(z, masse, h, entlueften);
  return z;
}

function rueckTeilschritt(z, masse, h, entlueften) {
  const ziel = sollHub(z.p1 - z.p2, masse);
  const weg = h / masse.schaltzeit;
  z.h = Math.abs(ziel - z.h) <= weg + 1e-9 ? ziel : z.h + Math.sign(ziel - z.h) * weg;
  const zu = durchfluss(z, masse) * rueckLminMm3s;   // mm³/s into the volume
  // the vent: a fixed orifice whose conductance gives the time constant V / entlueftZeit (abgeleitet)
  const ab = entlueften ? ((masse.volumen2 / masse.entlueftZeit) * (z.p2 - AUSSEN)) : 0;
  z.p2 = kammerSchritt(z.p2, zu - ab, 0, masse.volumen2, h, Math.max(z.p1, z.p2));
}

/** "zu" on the seat (under 2 % lift), "offen" (over 98 %), else "halb": what the readout and the page call the poppet. */
export function tellerZustand(z, masse = H_1_4) {
  void masse;
  return z.h < 0.02 ? "zu" : z.h > 0.98 ? "offen" : "halb";
}

const rueckBar = (x) => Math.round(x * 10) / 10 + 0;

/** Rounded values for the card's readout: gauge bar to 0,1 (the drop may be negative), flow to whole l/min. */
export function anzeige(z, masse = H_1_4) {
  const q = durchfluss(z, masse);
  const dp = rueckBar(z.p1 - z.p2);
  return {
    p1: Math.max(0, rueckBar(z.p1 - AUSSEN)),
    p2: Math.max(0, rueckBar(z.p2 - AUSSEN)),
    dp,
    teller: tellerZustand(z, masse),
    q: Math.round(q) + 0,
    begrenzt: q >= masse.qn * masse.qMaxFaktor,
    gegendruck: dp < 0,
  };
}

/**
 * The readout in two lines (German decimal comma, a proper minus), built once for build and page. A number and its unit are joined
 * by a no-break space, so that a line that wraps on a phone never leaves "bar" alone.
 */
export function anzeigeZeilen(a) {
  const bar = (x) => (x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".", ",") + "\u00a0bar";
  const wort = a.teller === "halb" ? "halb offen" : a.teller;
  return [
    `Eingang 1 ${bar(a.p1)} · Ausgang 2 ${bar(a.p2)} · Δp\u00a0${bar(a.dp)}`,
    `Teller ${wort}${a.gegendruck ? " (Gegendruck)" : ""} · Durchfluss ${a.q}\u00a0l/min${a.begrenzt ? " (begrenzt)" : ""}`,
  ];
}
