// The air model of a throttle check valve (Drosselrückschlagventil) as Festo builds it
// (GR/GRA): a conical pin in a bore makes the throttle (an annular gap), and a lip
// seal (Dichtmanschette) round the valve insert is the check valve. Pressure on the
// open side of the lip spreads it against the housing wall (shut); pressure from the
// other side folds it inwards (free). No ball, no spring. Pure functions, no drawing. The page and its tests compute with
// this, so the figure can never disagree about the numbers it shows.
//
// Units: mm, bar (pressure difference), standard litres per minute (l/min),
// s, turns of the adjusting screw.
// Origin of every constant: "Katalog" = Festo data sheet 6509 (GRA-1/4-B),
// "abgeleitet" = computed from catalogue values, "Annahme" = assumed.
// Pressure convention: `dpBar` is always the pressure drop in the direction of flow,
// positive. `lippeHub` is only meaningful for the free direction 2 → 1, where that drop
// equals p2 − p1 (the pressure that folds the lip in); in the throttle direction the lip
// is shut by `richtung` and never asks.
// No top-level name here may clash with one in pneumatik.mjs or ventil.mjs:
// pages inline model files into one classic script.

/** Flow directions: 1 → 2 is throttled, 2 → 1 is free (the lip folds in). */
export const DROSSELRICHTUNG = "drossel";
export const FREIE_RICHTUNG = "frei";

export const GRA_1_4 = {
  qnDrossel: 420,        // l/min, throttle direction, throttle fully open – Katalog
  qnFrei: 780,           // l/min, free direction, throttle fully open – Katalog
  umdrehungen: 6,        // turns from shut to fully open – Annahme
  bezugsDp: 1,           // bar, pressure difference of the catalogue flow (6 bar in, 5 bar out) – Annahme (Normbedingung)
  oeffnungsdruck: 0.1,   // bar, the lip folds in above this – Annahme (= smallest working pressure)
  lippeRampe: 0.02,      // s, the lip folds over its whole travel in this time – Annahme
  zapfenTempo: 6,        // turns/s, how fast the pin follows the slider – Annahme
  steigung: 1,           // mm per turn, pitch of the adjusting thread – Annahme
  lippeHubMm: 1.5,       // mm, how far the lip's mouth folds in (drawing) – Annahme
};

const stromBegrenze = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

/** Open share of the throttle gap, 0…1: linear in the turns (Annahme). */
export function drosselAnteil(umdrehungen, masse = GRA_1_4) {
  return stromBegrenze(umdrehungen / masse.umdrehungen, 0, 1);
}

/**
 * Fold of the lip, 0…1 (0 = spread against the wall, 1 = folded in), from the pressure difference `dpBar` = p2 − p1 in
 * bar. Zero up to the opening pressure, full lift at twice that. In throttle
 * direction p1 is the higher pressure, so `dpBar` is ≤ 0 there: always 0.
 */
export function lippeHub(dpBar, masse = GRA_1_4) {
  return stromBegrenze((dpBar - masse.oeffnungsdruck) / masse.oeffnungsdruck, 0, 1);
}

/**
 * Flow through both paths in l/min, linear in the pressure drop `dpBar`
 * (positive, in the direction of flow) and equal to the catalogue value at
 * `bezugsDp`. Throttle path: qnDrossel · open share. Check path (past the lip): only in the
 * free direction, qnFrei − qnDrossel (abgeleitet: 360, both paths parallel
 * and independent) times the lip's fold.
 */
export function durchfluss(richtung, umdrehungen, dpBar, masse = GRA_1_4) {
  const faktor = Math.max(0, dpBar) / masse.bezugsDp;
  const drossel = masse.qnDrossel * drosselAnteil(umdrehungen, masse) * faktor;
  const rueckschlag = richtung === FREIE_RICHTUNG
    ? (masse.qnFrei - masse.qnDrossel) * lippeHub(dpBar, masse) * faktor
    : 0;
  return { drossel, rueckschlag, gesamt: drossel + rueckschlag };
}

/** Fresh state: throttle direction, pin at `umdrehungen`, lip spread. */
export function neuerZustand(masse = GRA_1_4, umdrehungen = masse.umdrehungen / 2) {
  return { zapfen: umdrehungen, lippe: 0 };
}

/**
 * Advance the state by `dt` seconds. The lip follows its target fold within
 * `lippeRampe`, the pin follows the slider (`umdrehungen`) at `zapfenTempo`
 * and never jumps. Mutates and returns `z`.
 */
export function schritt(z, masse, dt, { richtung, umdrehungen, dpBar }) {
  const ziel = richtung === FREIE_RICHTUNG ? lippeHub(dpBar, masse) : 0;
  const k = (dt / masse.lippeRampe);
  z.lippe = stromBegrenze(ziel > z.lippe ? Math.min(ziel, z.lippe + k) : Math.max(ziel, z.lippe - k), 0, 1);
  const s = masse.zapfenTempo * dt;
  const soll = stromBegrenze(umdrehungen, 0, masse.umdrehungen);
  z.zapfen = soll > z.zapfen ? Math.min(soll, z.zapfen + s) : Math.max(soll, z.zapfen - s);
  return z;
}

/** Rounded values for the card's readout (whole l/min, as the data sheet). */
export function anzeige(z, masse, { richtung, dpBar }) {
  const q = durchfluss(richtung, z.zapfen, dpBar, masse);
  return {
    gesamt: Math.round(q.gesamt),
    drossel: Math.round(q.drossel),
    rueckschlag: Math.round(q.rueckschlag),
    lippeOffen: z.lippe > 0.5,
  };
}

/**
 * The readout in two lines: the flow with its two parts and the lip, then the conditions
 * the numbers belong to (catalogue: 6 bar at the inlet, `dpBar` pressure drop).
 */
export function anzeigeZeile(a, richtung, dpBar, eingangBar = 6) {
  return `Q ${a.gesamt} l/min (Drossel ${a.drossel} + Rückschlag ${a.rueckschlag}) · Lippe ${a.lippeOffen ? "offen" : "zu"}\n`
    + `${richtung === FREIE_RICHTUNG ? "2 → 1" : "1 → 2"} · ${eingangBar} bar · Δp ${dpBar} bar`;
}
