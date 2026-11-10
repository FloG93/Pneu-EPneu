// The air model of a throttle check valve (Drosselrückschlagventil): a needle
// throttle and a spring-loaded ball check valve side by side between port 1
// and port 2. Pure functions, no drawing. The page and its tests compute with
// this, so the figure can never disagree about the numbers it shows.
//
// Units: mm, bar (pressure difference), standard litres per minute (l/min),
// s, turns of the adjusting screw.
// Origin of every constant: "Katalog" = Festo data sheet 6509 (GRA-1/4-B),
// "abgeleitet" = computed from catalogue values, "Annahme" = assumed.
// No top-level name here may clash with one in pneumatik.mjs or ventil.mjs:
// pages inline model files into one classic script.

/** Flow directions: 1 → 2 is throttled, 2 → 1 is free (ball lifts). */
export const DROSSELRICHTUNG = "drossel";
export const FREIE_RICHTUNG = "frei";

export const GRA_1_4 = {
  qnDrossel: 420,        // l/min, throttle direction, throttle fully open – Katalog
  qnFrei: 780,           // l/min, free direction, throttle fully open – Katalog
  umdrehungen: 6,        // turns from shut to fully open – Annahme
  bezugsDp: 1,           // bar, pressure difference of the catalogue flow (6 bar in, 5 bar out) – Annahme (Normbedingung)
  oeffnungsdruck: 0.1,   // bar, the ball lifts above this – Annahme (= smallest working pressure)
  kugelRampe: 0.02,      // s, the ball travels its whole lift in this time – Annahme
  nadelTempo: 6,         // turns/s, how fast the needle follows the slider – Annahme
  steigung: 1,           // mm per turn, pitch of the adjusting thread – Annahme
  kugelHub: 2,           // mm, lift of the ball off its seat – Annahme
};

const stromBegrenze = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

/** Open share of the throttle gap, 0…1: linear in the turns (Annahme). */
export function drosselAnteil(umdrehungen, masse = GRA_1_4) {
  return stromBegrenze(umdrehungen / masse.umdrehungen, 0, 1);
}

/**
 * Lift of the ball, 0…1, from the pressure difference `dpBar` = p2 − p1 in
 * bar. Zero up to the opening pressure, full lift at twice that. In throttle
 * direction p1 is the higher pressure, so `dpBar` is ≤ 0 there: always 0.
 */
export function kugelHub(dpBar, masse = GRA_1_4) {
  return stromBegrenze((dpBar - masse.oeffnungsdruck) / masse.oeffnungsdruck, 0, 1);
}

/**
 * Flow through both paths in l/min, linear in the pressure drop `dpBar`
 * (positive, in the direction of flow) and equal to the catalogue value at
 * `bezugsDp`. Throttle path: qnDrossel · open share. Check path: only in the
 * free direction, qnFrei − qnDrossel (abgeleitet: 360, both paths parallel
 * and independent) times the ball lift.
 */
export function durchfluss(richtung, umdrehungen, dpBar, masse = GRA_1_4) {
  const faktor = Math.max(0, dpBar) / masse.bezugsDp;
  const drossel = masse.qnDrossel * drosselAnteil(umdrehungen, masse) * faktor;
  const rueckschlag = richtung === FREIE_RICHTUNG
    ? (masse.qnFrei - masse.qnDrossel) * kugelHub(dpBar, masse) * faktor
    : 0;
  return { drossel, rueckschlag, gesamt: drossel + rueckschlag };
}

/** Fresh state: throttle direction, needle at `umdrehungen`, ball seated. */
export function neuerZustand(masse = GRA_1_4, umdrehungen = masse.umdrehungen / 2) {
  return { nadel: umdrehungen, kugel: 0 };
}

/**
 * Advance the state by `dt` seconds. The ball follows its target lift within
 * `kugelRampe`, the needle follows the slider (`umdrehungen`) at `nadelTempo`
 * and never jumps. Mutates and returns `z`.
 */
export function schritt(z, masse, dt, { richtung, umdrehungen, dpBar }) {
  const ziel = richtung === FREIE_RICHTUNG ? kugelHub(dpBar, masse) : 0;
  const k = (dt / masse.kugelRampe);
  z.kugel = stromBegrenze(ziel > z.kugel ? Math.min(ziel, z.kugel + k) : Math.max(ziel, z.kugel - k), 0, 1);
  const s = masse.nadelTempo * dt;
  const soll = stromBegrenze(umdrehungen, 0, masse.umdrehungen);
  z.nadel = soll > z.nadel ? Math.min(soll, z.nadel + s) : Math.max(soll, z.nadel - s);
  return z;
}

/** Rounded values for the card's readout (whole l/min, as the data sheet). */
export function anzeige(z, masse, { richtung, dpBar }) {
  const q = durchfluss(richtung, z.nadel, dpBar, masse);
  return {
    gesamt: Math.round(q.gesamt),
    drossel: Math.round(q.drossel),
    rueckschlag: Math.round(q.rueckschlag),
    kugelOffen: z.kugel > 0.5,
  };
}
