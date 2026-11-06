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

/** Ambient pressure, bar absolute. Teaching value, not 1.01325. */
export const UMGEBUNG = 1;

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

// --- Areas and forces ----------------------------------------------------

/** Piston area, annulus area, rod area and the ratio φ, in mm². */
export function flaechen({ bohrung, stange }) {
  const kolben = (Math.PI / 4) * bohrung * bohrung;
  const ring = (Math.PI / 4) * (bohrung * bohrung - stange * stange);
  return { kolben, ring, stange: kolben - ring, verhaeltnis: kolben / ring };
}

/** Theoretical extending force, N. The full piston area is under pressure. */
export function kraftAus(druckBar, masse) {
  return druckBar * NMM2_JE_BAR * flaechen(masse).kolben;
}

/** Theoretical retracting force, N. Only the annulus is left — the rod takes area away. */
export function kraftEin(druckBar, masse) {
  return druckBar * NMM2_JE_BAR * flaechen(masse).ring;
}

/** Air needed for one stroke, in litres at atmospheric pressure (Normliter). */
export function luftJeHub(druckBar, masse) {
  const f = flaechen(masse);
  const faktor = (UMGEBUNG + druckBar) / UMGEBUNG / 1e6;   // mm³ at pressure → normal litres
  return {
    aus: f.kolben * masse.hub * faktor,
    ein: f.ring * masse.hub * faktor,
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
  const rand = (1 - masse.ueberdeckung) / 2;
  return {
    a: rampe(z.schieber, 0.5 + masse.ueberdeckung / 2, 0.5 + masse.ueberdeckung / 2 + rand),
    b: rampe(1 - z.schieber, 0.5 + masse.ueberdeckung / 2, 0.5 + masse.ueberdeckung / 2 + rand),
  };
}

function rampe(x, von, bis) {
  if (x <= von) return 0;
  if (x >= bis) return 1;
  return (x - von) / (bis - von);
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
  const drossel = Math.min(1, masse.leitwertDrossel / masse.leitwertAb);
  return {
    aZu: o.a * masse.leitwertZu,
    aAb: o.b * masse.leitwertAb * (daempftA(z, masse) ? drossel : 1),
    bZu: o.b * masse.leitwertZu,
    bAb: o.a * masse.leitwertAb * (daempftB(z, masse) ? drossel : 1),
  };
}

/** Net force on the piston, N. Ambient pushes back on the exposed rod face. */
export function kraftNetto(z, masse) {
  const f = flaechen(masse);
  return NMM2_JE_BAR * (z.pA * f.kolben - z.pB * f.ring - UMGEBUNG * f.stange);
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
  z.pA += (h * (qA - z.pA * dVa)) / Math.max(v.a, 1);
  z.pB += (h * (qB - z.pB * dVb)) / Math.max(v.b, 1);

  // A chamber is never pushed past the supply nor sucked below ambient: the
  // one-way nature of the seats, which a linear conductance does not carry.
  z.pA = klemme(z.pA, UMGEBUNG, quelle);
  z.pB = klemme(z.pB, UMGEBUNG, quelle);

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
  };
}

function runde(x, stellen) {
  const m = 10 ** stellen;
  return Math.round(x * m) / m;
}
