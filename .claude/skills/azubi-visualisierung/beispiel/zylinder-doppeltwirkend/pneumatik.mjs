// The arithmetic model behind every pneumatic figure.
//
// Pure functions and one small state object: no drawing, no DOM, no timers.
// The figure shows numbers, so those numbers have to come from the same model
// that moves the parts — an unmodelled readout is decoration.
//
// Units: lengths in mm, areas in mm², volumes in mm³, forces in N, time in s,
// pressures in **bar absolute** (ambient is 1, a "6 bar" supply is 7 absolute).
// 1 bar = 0.1 N/mm².
//
// On piston speed: pneumatics has no imposed flow rate the way hydraulics has.
// The speed follows from how freely air gets in and out, so the supply path and
// the exhaust path are modelled separately (`leitwertZu`, `leitwertAb`). Which
// direction ends up faster depends on which of the two is the restriction, and
// the model is left free to say so rather than made to reproduce a rule of
// thumb carried over from hydraulics.

import { AUSSEN, wegeOffen, kammerSchritt } from "./ventil.mjs";

/** Ambient pressure, bar absolute. Teaching value, not 1.01325. */
export const UMGEBUNG = AUSSEN;

/** bar → N/mm² */
const NMM2_JE_BAR = 0.1;

/**
 * Standard cylinder to ISO 15552, bore 50, stroke 200, on a 5/2 valve.
 * Catalogue values (Festo DSBC, Ø 50): bore, rod, port G1/4, tie rods M10.
 * Everything marked "Annahme" is listed in the figure's README.
 */
export const ISO_15552_50 = {
  bohrung: 50,          // mm, piston diameter D              – Normreihe
  stange: 20,           // mm, piston rod diameter d          – Katalog
  hub: 200,             // mm, stroke                         – gewählt
  totraum: 6,           // mm, dead length at each end        – Annahme
  schlauch: 11000,      // mm³, hose + port volume per side   – Annahme, 6 mm × 400 mm
  daempfung: 20,        // mm, cushioning length              – Annahme
  masse: 25.0,          // kg, moving mass incl. the load     – Annahme, kleine Handhabung
  reibung: 40,          // N, seal friction (Coulomb)         – Annahme
  viskos: 400,          // N per (m/s), seal drag + load      – Annahme
  leitwertZu: 3.2e5,    // mm³/s per bar, supply path         – Annahme, auf reale Hubzeit gestellt
  leitwertAb: 3.2e5,    // mm³/s per bar, exhaust path        – Annahme, gleich dem Zuweg
  leitwertDrossel: 5.3e4, // mm³/s per bar, cushioning screw  – Annahme, rund ein Sechstel
  schaltzeit: 0.025,    // s, spool transit                   – Annahme, übliche 5/2-Magnetventile
  ueberdeckung: 0.3,    // share of the transit with both working ports shut (positive overlap)
};

/**
 * Single-acting round cylinder with a return spring in the rod chamber,
 * Festo ESNU-50-25-P-A (data sheet 196383). The spring pushes the piston back;
 * the rod chamber breathes through a filter and is always at ambient.
 * Chamber A (the piston side) is the only one that sees compressed air, so the
 * model needs just two paths: `aZu` (valve 1→2) and `aAb` (valve 2→3).
 */
export const ESNU_50_25 = {
  bohrung: 50,          // mm, piston diameter D              – Katalog
  stange: 20,           // mm, piston rod diameter d          – Annahme, passt zu M16×1,5
  hub: 25,              // mm, stroke                         – Katalog
  totraum: 6,           // mm, dead length at each end        – Annahme, wie ISO_15552_50
  schlauch: 11000,      // mm³, hose + port volume            – Annahme, wie ISO_15552_50
  daempfung: 0,         // mm, no cushioning zone             – Katalog: elastische Dämpfungsringe
  masse: 2.5,           // kg, moving mass incl. the load     – Annahme (Zylinder allein 0,476 kg)
  reibung: 40,          // N, seal friction (Coulomb)         – Annahme, wie ISO_15552_50
  viskos: 80,           // N per (m/s), seal drag + load      – Annahme, kleiner als beim großen Zylinder
  // Conductances are set so a stroke takes 0.05–0.15 s in real time and the return is clearly
  // slower than the advance: at 6 bar about 0.08 s out (spool travel included), 0.11 s back. The exhaust path is the
  // wide one (a valve's Qn of several hundred l/min is some 1e7 mm³/s per bar) because the whole
  // stroke volume plus the hose has to leave through it before the spring can win. The way back
  // is slower anyway: the spring pushes with only 42–65 N net of friction (82 − 40 N in, 105 − 40 N
  // out), not with 1000 N of air, so `viskos` (drag grows with speed) sets the return speed, and
  // the spool, the pressure decay in chamber A and the stroke all come first.
  leitwertZu: 3.5e5,    // mm³/s per bar, supply path         – Annahme, auf Hubzeit gestellt
  leitwertAb: 1.0e7,    // mm³/s per bar, exhaust path        – Annahme, auf Rückhubzeit gestellt
  leitwertDrossel: 1.0e7, // mm³/s per bar, unused here (no cushioning screw)
  schaltzeit: 0.025,    // s, spool transit                   – Annahme, wie ISO_15552_50
  ueberdeckung: 0.3,    // share of the transit with both working ports shut
  einfach: true,        // chamber B is the filter-vented spring chamber, always ambient
  feder: {
    vorspannung: 82,    // N at the retracted end             – Katalog: Federrückstellkraft 82 N
    rate: 0.932,        // N/mm = (105,3 − 82) / 25           – abgeleitet: 0,6·π/4·50² − 1072,8 = 105,3 N
  },
};

// --- Areas and forces ----------------------------------------------------

/** Piston area, annulus area, rod area and the ratio φ, in mm². */
export function flaechen({ bohrung, stange }) {
  const kolben = (Math.PI / 4) * bohrung * bohrung;
  const ring = (Math.PI / 4) * (bohrung * bohrung - stange * stange);
  return { kolben, ring, stange: kolben - ring, verhaeltnis: kolben / ring };
}

/** Return spring force at the piston position in `z`, N. 0 for a cylinder without a spring. */
export function federKraft(z, masse) {
  return masse.feder ? masse.feder.vorspannung + masse.feder.rate * z.weg : 0;
}

/**
 * Theoretical extending force, N. The full piston area is under pressure.
 * A spring takes its force at full stroke off again (catalogue: 1072,8 N at 6 bar).
 */
export function kraftAus(druckBar, masse) {
  const kraft = druckBar * NMM2_JE_BAR * flaechen(masse).kolben;
  return masse.feder ? kraft - federKraft({ weg: masse.hub }, masse) : kraft;
}

/**
 * The extending force the piston has right now, N: the air force on the full piston
 * area minus what the return spring pushes back at this position (so 1096 N at stroke 0
 * and 1073 N at full stroke for the ESNU at 6 bar). `kraftAus` is the value at full stroke.
 */
export function kraftJetzt(druckBar, z, masse) {
  return druckBar * NMM2_JE_BAR * flaechen(masse).kolben - federKraft(z, masse);
}

/**
 * Theoretical retracting force, N. Only the annulus is left — the rod takes area away.
 * A single-acting cylinder has no air on that side: the spring alone brings it back.
 */
export function kraftEin(druckBar, masse) {
  if (masse.einfach) return federKraft({ weg: 0 }, masse);
  return druckBar * NMM2_JE_BAR * flaechen(masse).ring;
}

/** Air needed for one stroke, in litres at atmospheric pressure (Normliter). */
export function luftJeHub(druckBar, masse) {
  const f = flaechen(masse);
  const faktor = (UMGEBUNG + druckBar) / UMGEBUNG / 1e6;   // mm³ at pressure → normal litres
  return {
    aus: f.kolben * masse.hub * faktor,
    ein: masse.einfach ? 0 : f.ring * masse.hub * faktor,   // the spring brings it back, no air
  };
}

// --- State ---------------------------------------------------------------

/**
 * A fresh cylinder, both chambers at ambient, the spool sitting where
 * `stellung` says. `schieber` is the spool: 0 is the "einfahren" position
 * (1→2, 4→5), 1 is the "ausfahren" position (1→4, 2→3).
 */
export function neuerZustand(masse, { weg = 0, stellung = "einfahren" } = {}) {
  return {
    weg: Math.min(Math.max(weg, 0), masse.hub),
    v: 0,
    pA: UMGEBUNG,
    pB: UMGEBUNG,
    stellung,
    schieber: stellung === "ausfahren" ? 1 : 0,
  };
}

/** Chamber volumes, mm³, each with its dead volume and its share of hose. */
export function volumen(z, masse) {
  const f = flaechen(masse);
  return {
    a: f.kolben * (z.weg + masse.totraum) + masse.schlauch,
    b: f.ring * (masse.hub - z.weg + masse.totraum) + masse.schlauch,
  };
}

/**
 * Is the cushioning bush closing the main exhaust path of a chamber?
 * It engages over the last `daempfung` mm of travel towards that chamber's end.
 * Filling is not affected: a real cushioning has a check valve that bypasses
 * the screw, so the cylinder still starts briskly out of its end position.
 */
export function daempftA(z, masse) {
  return z.weg < masse.daempfung;
}
export function daempftB(z, masse) {
  return z.weg > masse.hub - masse.daempfung;
}

/**
 * How far the two sets of valve connections are open, 0…1.
 * `a` is the "ausfahren" set (1→4 and 2→3), `b` the "einfahren" set (1→2, 4→5).
 * With positive overlap both are shut while the spool crosses the middle —
 * that is the moment the piston stands still and both chambers hold their air.
 */
export function oeffnung(z, masse) {
  return wegeOffen(z.schieber, masse.ueberdeckung);
}

/**
 * How freely air can move along each of the four paths right now, mm³/s per bar.
 * `aZu` is 1→4 into chamber A, `aAb` is 4→5 out of it, `bZu` is 1→2, `bAb` is 2→3.
 *
 * Cushioning throttles the **exhaust** of whichever chamber the piston is
 * running into, and never the filling: a real cushioning has a check valve
 * across the screw, so the cylinder still starts out of its end position with
 * the full port open. The figure reads these to size its air streams, and the
 * model uses the same numbers to move the piston.
 */
export function leitwerte(z, masse) {
  const o = oeffnung(z, masse);
  if (masse.einfach) {
    // Valve 1→2 fills chamber A, 2→3 empties it; the spring chamber is a filter, not a valve path.
    return { aZu: o.a * masse.leitwertZu, aAb: o.b * masse.leitwertAb, bZu: 0, bAb: 0 };
  }
  const drossel = Math.min(1, masse.leitwertDrossel / masse.leitwertAb);
  return {
    aZu: o.a * masse.leitwertZu,
    aAb: o.b * masse.leitwertAb * (daempftA(z, masse) ? drossel : 1),
    bZu: o.b * masse.leitwertZu,
    bAb: o.a * masse.leitwertAb * (daempftB(z, masse) ? drossel : 1),
  };
}

/** Net force on the piston, N. Ambient pushes back on the exposed rod face; a spring pushes back too. */
export function kraftNetto(z, masse) {
  const f = flaechen(masse);
  const luft = NMM2_JE_BAR * (z.pA * f.kolben - z.pB * f.ring - UMGEBUNG * f.stange);
  return masse.feder ? luft - federKraft(z, masse) : luft;
}

// --- One step ------------------------------------------------------------

/** Largest internal step, s. The pressure equation is stiff; this keeps it sane. */
const TEILSCHRITT = 1 / 2000;
/** Largest wall-clock time one call may advance. A backgrounded tab must not catch up. */
const SPRUNG_MAX = 0.1;

/**
 * Advance the model by `dt` seconds against a supply of `druckBar` gauge.
 * Mutates `z`. Internally sub-stepped, so any frame rate gives the same motion.
 */
export function schritt(z, masse, dt, druckBar) {
  const gesamt = Math.min(Math.max(dt, 0), SPRUNG_MAX);
  const teile = Math.max(1, Math.ceil(gesamt / TEILSCHRITT));
  const h = gesamt / teile;
  for (let i = 0; i < teile; i += 1) teilschritt(z, masse, h, druckBar);
  return z;
}

function teilschritt(z, masse, h, druckBar) {
  const f = flaechen(masse);
  const quelle = UMGEBUNG + Math.max(0, druckBar);

  // The spool takes time to cross. Until it has, the ports are part open.
  const ziel = z.stellung === "ausfahren" ? 1 : 0;
  const weite = h / Math.max(masse.schaltzeit, 1e-6);
  z.schieber += klemme(ziel - z.schieber, -weite, weite);
  const { aZu, aAb, bZu, bAb } = leitwerte(z, masse);

  // Isothermal chamber: d(p·V)/dt = q  →  dp/dt = (q − p·dV/dt) / V
  const v = volumen(z, masse);
  const dVa = f.kolben * z.v;
  const dVb = -f.ring * z.v;
  const qA = aZu * (quelle - z.pA) + aAb * (UMGEBUNG - z.pA);
  const qB = bZu * (quelle - z.pB) + bAb * (UMGEBUNG - z.pB);
  z.pA = kammerSchritt(z.pA, qA, dVa, v.a, h, quelle);
  // The spring chamber of a single-acting cylinder breathes freely through its filter.
  z.pB = masse.einfach ? UMGEBUNG : kammerSchritt(z.pB, qB, dVb, v.b, h, quelle);

  // Newton on the piston, with Coulomb friction and a little seal drag.
  const treibend = kraftNetto(z, masse) - (masse.viskos * z.v) / 1000;
  let netto;
  if (Math.abs(z.v) < 1) {
    // At rest it takes more than the friction to break away.
    netto = Math.abs(treibend) <= masse.reibung ? 0 : treibend - Math.sign(treibend) * masse.reibung;
    if (netto === 0) z.v = 0;
  } else {
    netto = treibend - Math.sign(z.v) * masse.reibung;
  }
  z.v += (h * netto * 1000) / masse.masse;   // N/kg = m/s² → mm/s²
  z.weg += h * z.v;

  // End stops. The piston does not leave its stroke, and it does not bounce.
  if (z.weg <= 0) {
    z.weg = 0;
    if (z.v < 0) z.v = 0;
  } else if (z.weg >= masse.hub) {
    z.weg = masse.hub;
    if (z.v > 0) z.v = 0;
  }
}

function klemme(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Has the piston arrived at the end it was switched towards and come to rest? */
export function steht(z, masse) {
  const amZiel = z.stellung === "ausfahren" ? z.weg >= masse.hub - 0.01 : z.weg <= 0.01;
  return amZiel && Math.abs(z.v) < 1;
}

/** Is everything settled — piston parked and both chambers at their final pressure? */
export function ruht(z, masse, druckBar) {
  if (masse.einfach) {
    // Chamber A has settled and nothing moves. With too little pressure the spring wins and
    // the piston stays home, which is also a state of rest.
    const luftA = z.stellung === "ausfahren" ? UMGEBUNG + druckBar - z.pA : z.pA - UMGEBUNG;
    return Math.abs(z.v) < 1 && luftA < 0.02 && (z.stellung === "ausfahren" || z.weg <= 0.01);
  }
  if (!steht(z, masse)) return false;
  const quelle = UMGEBUNG + druckBar;
  const [voll, leer] = z.stellung === "ausfahren" ? [z.pA, z.pB] : [z.pB, z.pA];
  return quelle - voll < 0.02 && leer - UMGEBUNG < 0.02;
}

// --- What the figure puts on screen --------------------------------------

/**
 * Rounded values for the card's readout. Forces are theoretical: seal friction
 * takes another 3–10 % off in the real world, and the figure says so.
 */
export function anzeige(z, masse, druckBar) {
  const f = flaechen(masse);
  const luft = luftJeHub(druckBar, masse);
  const feder = masse.feder
    ? {
        federJetzt: runde(federKraft(z, masse), 0),
        kraftJetzt: runde(kraftJetzt(druckBar, z, masse), 0),
        federAus: runde(federKraft({ weg: masse.hub }, masse), 0),
        federEin: runde(federKraft({ weg: 0 }, masse), 0),
      }
    : {};
  return {
    druck: runde(druckBar, 1),
    weg: runde(z.weg, 0),
    hub: masse.hub,
    pA: runde(z.pA - UMGEBUNG, 2),
    pB: runde(z.pB - UMGEBUNG, 2),
    kraftAus: runde(kraftAus(druckBar, masse), 0),
    kraftEin: runde(kraftEin(druckBar, masse), 0),
    kraftNetto: runde(kraftNetto(z, masse), 0),
    flaecheKolben: runde(f.kolben, 1),
    flaecheRing: runde(f.ring, 1),
    verhaeltnis: runde(f.verhaeltnis, 2),
    luftAus: runde(luft.aus, 2),
    luftEin: runde(luft.ein, 2),
    ...feder,
  };
}

function runde(x, stellen) {
  const m = 10 ** stellen;
  return Math.round(x * m) / m;
}
