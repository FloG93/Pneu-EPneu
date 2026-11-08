// The part of the air model that every valve shares: how far the two sets of
// connections of a 5/2 spool are open, and how the pressure in a closed-off
// volume changes. The cylinder and the valve page both compute with this, so
// the two figures can never disagree about the same physics.
//
// Units as in pneumatik.mjs: mm³, s, pressures in bar absolute (ambient 1).
// No top-level name here may clash with one in pneumatik.mjs: the cylinder
// page inlines both files into one classic script.

/** Ambient pressure, bar absolute. */
export const AUSSEN = 1;

/**
 * How far the two sets of connections are open, 0…1.
 * `anteil` is the spool position, 1 = position 14, 0 = position 12.
 * `a` is the set of position 14 (1→4 and 2→3), `b` the set of position 12
 * (1→2 and 4→5). With positive overlap both are shut while the spool crosses
 * the middle — then the connected volumes hold their air.
 */
export function wegeOffen(anteil, ueberdeckung) {
  const von = 0.5 + ueberdeckung / 2;
  return {
    a: ventilRampe(anteil, von, 1),
    b: ventilRampe(1 - anteil, von, 1),
  };
}

function ventilRampe(x, von, bis) {
  if (x <= von) return 0;
  if (x >= bis) return 1;
  return (x - von) / (bis - von);
}

/**
 * One explicit step of an isothermal volume: d(p·V)/dt = q  →
 * dp/dt = (q − p·dV/dt) / V. `q` is the net inflow as the caller built it
 * from conductances (mm³/s per bar times a pressure difference), `dV` the
 * volume change rate in mm³/s, `V` the volume in mm³, `h` the step in s.
 * The result stays between ambient and the supply `quelle`: the one-way
 * nature of the seats, which a linear conductance does not carry.
 */
export function kammerSchritt(p, q, dV, V, h, quelle) {
  return ventilBegrenze(p + (h * (q - p * dV)) / Math.max(V, 1), AUSSEN, quelle);
}

function ventilBegrenze(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}
