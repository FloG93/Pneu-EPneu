// The part of the air model that every valve shares: how far the two sets of
// connections of a 2-position spool are open, and how the pressure in a closed-off
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

// --- The valve: spool, pilot chambers, working ports ----------------------

/**
 * The air paths of every working port, read from the path description `art`
 * (the same one the symbol is drawn from, see schaltzeichen.mjs; this module
 * does not import it, the page hands `art` in).
 * Working ports are `art.oben`, the supply is `art.zufuhr`, the exhaust is
 * the rest of `art.unten`. Field 0 is the actuated position (opening `a` of
 * wegeOffen), field 1 the rest position (opening `b`).
 * Per port: `zu` = the fields that join supply and port, `ab` = the fields
 * that join port and exhaust, and `ruheOffen` = supply reaches the port in
 * the rest position.
 */
export function ventilWege(art) {
  const abluft = art.unten.filter((n) => n !== art.zufuhr);
  const wege = {};
  for (const w of art.oben) {
    const felder = (test) => art.felder.map((paare, i) => (paare.some(test) ? i : -1)).filter((i) => i >= 0);
    const zu = felder(([von, nach]) => von === art.zufuhr && nach === w);
    const ab = felder(([von, nach]) => von === w && abluft.includes(nach));
    wege[w] = { zu, ab, ruheOffen: zu.includes(1) };
  }
  return wege;
}

/** Opening of field `i` out of wegeOffen's { a, b }: field 0 = a, field 1 = b. */
function ventilFeldOffen(o, i) {
  return i === 0 ? o.a : i === 1 ? o.b : 0;
}


/**
 * Dimensions of a 5/2 valve in the size of ISO 5599-1 size 1 (spool Ø 13,
 * pilot piston Ø 20). Assumptions unless noted otherwise.
 * `leitwertSteuer` is an assumption, set so the switching time at 6 bar lands
 * in the data-sheet range (12–52 ms): the pilot air comes through a thin line
 * from a signal valve (e.g. a 3/2 directional valve), so it fills slowly
 * compared with the working ports. The valve itself is actuated by air only.
 */
export const ISO_5599_GR1 = {
  hub: 7,               // mm, spool stroke
  bohrung: 13,          // mm, spool bore
  steuerkolben: 20,     // mm, pilot piston
  masseSchieber: 0.03,  // kg
  federVor: 30,         // N, return spring preload
  federRate: 1.5,       // N/mm
  haftreibung: 8,       // N
  gleitreibung: 5,      // N
  viskos: 2,            // N·s/m
  leitwertSteuer: 8e4,  // mm³/s per bar, pilot filling path
  leitwertEntlueft: 6e5,  // mm³/s per bar, pilot venting path (via the signal valve exhaust) – Annahme, set so the spring return at 6 bar lands in 12–52 ms
  volumenSteuer: 5000,  // mm³, one pilot chamber
  leitwertZu: 3.2e5,    // mm³/s per bar, supply path 1→2 / 1→4
  leitwertAb: 3.2e5,    // mm³/s per bar, exhaust path 2→3 / 4→5
  volumen2: 59000,      // mm³, hose 0,5 m Ø 4 (≈ 6 300) + 50 000 + annulus, rounded
  volumen4: 59000,      // mm³
  ueberdeckung: 0.3,    // overlap in the middle, 0…1
};

/** Largest internal step, s. */
const ventilTeilschrittH = 1 / 20000;
/** Largest wall-clock time one call may advance. */
const ventilSprungMax = 0.1;
/** The spool counts as arrived at 98 % of its stroke. */
const ventilAnkunft = 0.98;

/**
 * Fresh valve in the rest position (field 1) with the supply `druckBar` gauge.
 * `art` (path description) is required: it says which port the supply
 * reaches in rest (that one starts at supply pressure, all others at ambient).
 * `anteil` 0 = rest position (5/2: position 12), 1 = actuated (5/2: position 14).
 * Signal "14" pushes towards field 0 (the actuated position), signal "12"
 * towards field 1; the page labels them by valve (3/2: 12 or 10).
 * `masse` is not read: the fresh state needs no dimension. It stays in the
 * signature so every model function takes (state or masse) first, as in
 * pneumatik.mjs (`neuerZustand(masse, …)`), and a later valve whose rest
 * state does depend on its dimensions needs no new call shape.
 */
export function neuesVentil(masse, { art, bauart = "monostabil", druckBar = 6 } = {}) {
  if (!art) throw new Error("neuesVentil: art (Wegebeschreibung) fehlt");
  const wege = ventilWege(art);
  const p = {};
  for (const w of Object.keys(wege)) p[w] = wege[w].ruheOffen ? AUSSEN + druckBar : AUSSEN;
  return {
    art, wege, bauart, anteil: 0, geschw: 0,
    p12: AUSSEN, p14: AUSSEN, p,
    signal12: false, signal14: false, hand: null,
    schaltStart: null,   // s since the signal change while a switch is being timed
    schaltzeit: null,    // s, last measured
  };
}

/** Back to the rest position 12, signals off. Values are replaced in place. */
export function bauartWechseln(v, masse, bauart, druckBar) {
  return Object.assign(v, neuesVentil(masse, { art: v.art, bauart, druckBar }));
}

/** Hold the spool by hand at `anteil`. A signal ends this again. */
export function vonHand(v, anteil) {
  v.hand = ventilBegrenze(anteil, 0, 1);
  v.anteil = v.hand;
  v.geschw = 0;
  return v;
}

/** The position the signals ask for, or null when they ask for none. */
function ventilZiel(v) {
  if (v.bauart === "monostabil") return v.signal14 ? 1 : 0;
  if (v.signal14 && !v.signal12) return 1;
  if (v.signal12 && !v.signal14) return 0;
  return null;
}

/** Set a pilot signal. A monostable valve has no pilot 12. Ends manual mode. */
export function ventilSignal(v, name, an) {
  if (name === "12" && v.bauart === "monostabil") return v;
  v.hand = null;
  const alt = name === "12" ? v.signal12 : v.signal14;
  if (name === "12") v.signal12 = an; else v.signal14 = an;
  if (alt === an) return v;   // key auto-repeat: keep the running timing
  const ziel = ventilZiel(v);
  const unterwegs = ziel === 1 ? v.anteil < ventilAnkunft : ziel === 0 && v.anteil > 1 - ventilAnkunft;
  v.schaltStart = unterwegs ? 0 : null;
  return v;
}

/**
 * Advance the valve by `dt` seconds against a supply of `druckBar` gauge.
 * Mutates `v`. Fixed sub-steps, so any frame rate gives the same motion.
 */
export function ventilSchritt(v, masse, dt, druckBar) {
  const gesamt = dt > 0 ? Math.min(dt, ventilSprungMax) : 0;
  const teile = Math.max(1, Math.ceil(gesamt / ventilTeilschrittH));
  const h = gesamt / teile;
  for (let i = 0; i < teile; i += 1) ventilTeilschritt(v, masse, h, Math.max(0, druckBar));
  return v;
}

function ventilTeilschritt(v, masse, h, druckBar) {
  const quelle = AUSSEN + druckBar;

  // 1. Pilot chambers: filled from the supply while the signal is on,
  //    otherwise vented through the pilot valve.
  const q14 = v.signal14 ? quelle : AUSSEN;
  const q12 = v.signal12 ? quelle : AUSSEN;
  //    Venting runs through a different path than filling.
  const leit14 = q14 < v.p14 ? masse.leitwertEntlueft : masse.leitwertSteuer;
  const leit12 = q12 < v.p12 ? masse.leitwertEntlueft : masse.leitwertSteuer;
  v.p14 = kammerSchritt(v.p14, leit14 * (q14 - v.p14), 0, masse.volumenSteuer, h, Math.max(q14, v.p14));
  v.p12 = kammerSchritt(v.p12, leit12 * (q12 - v.p12), 0, masse.volumenSteuer, h, Math.max(q12, v.p12));

  if (v.hand !== null) {
    // 5. Held by hand: no dynamics.
    v.anteil = v.hand;
    v.geschw = 0;
  } else {
    // 2. Forces on the spool in N, positive towards position 14.
    const aSt = (Math.PI * masse.steuerkolben ** 2) / 4;
    let kraft = 0.1 * (v.p14 - AUSSEN) * aSt - 0.1 * (v.p12 - AUSSEN) * aSt;
    if (v.bauart === "monostabil") kraft -= masse.federVor + masse.federRate * v.anteil * masse.hub;

    // 3. Friction, as on the piston: breakaway first, then sliding + drag.
    let netto;
    if (Math.abs(v.geschw) < 1) {
      netto = Math.abs(kraft) <= masse.haftreibung ? 0 : kraft - Math.sign(kraft) * masse.gleitreibung;
      if (netto === 0) v.geschw = 0;
    } else {
      netto = kraft - Math.sign(v.geschw) * masse.gleitreibung - (masse.viskos * v.geschw) / 1000;
    }

    // 4. Motion; N/kg = m/s² → mm/s². The stops do not bounce.
    v.geschw += (h * netto * 1000) / masse.masseSchieber;
    v.anteil += (h * v.geschw) / masse.hub;
    if (v.anteil <= 0) {
      v.anteil = 0;
      if (v.geschw < 0) v.geschw = 0;
    } else if (v.anteil >= 1) {
      v.anteil = 1;
      if (v.geschw > 0) v.geschw = 0;
    }
  }

  // 6. Working ports.
  const o = wegeOffen(v.anteil, masse.ueberdeckung);
  //    Per port: supply through the open fields of `zu`, exhaust through those
  //    of `ab`. The volumes are per port: volumen2, volumen4 (names as ports).
  for (const w of Object.keys(v.wege)) {
    const zu = v.wege[w].zu.reduce((s, i) => s + ventilFeldOffen(o, i), 0);
    const ab = v.wege[w].ab.reduce((s, i) => s + ventilFeldOffen(o, i), 0);
    const q = zu * masse.leitwertZu * (quelle - v.p[w]) + ab * masse.leitwertAb * (AUSSEN - v.p[w]);
    v.p[w] = kammerSchritt(v.p[w], q, 0, masse["volumen" + w], h, quelle);
  }

  // 7. Time the switch: from the signal change to arrival.
  if (v.schaltStart !== null) {
    v.schaltStart += h;
    const ziel = ventilZiel(v);
    if (ziel === 1 ? v.anteil >= ventilAnkunft : ziel === 0 && v.anteil <= 1 - ventilAnkunft) {
      v.schaltzeit = v.schaltStart;
      v.schaltStart = null;
    }
  }
}

/**
 * Seconds from the signal until the spool is 98 % across (or 2 % from home),
 * simulated on a copy. `richtung` "14" starts from rest; "12" first drives to
 * position 14, then takes the signal away (monostable) or gives 12 (bistable).
 * Infinity if it has not arrived after 1 s.
 *
 * `impuls` (s) makes every signal a pulse of that length, as the page gives
 * them to the bistable valve. Then "12" waits 1 s in position 14 after the
 * pulse 14, so chamber 14 has vented before the pulse 12 comes — the case the
 * page produces. Without `impuls` the bistable "12" gives 12 the moment 14 is
 * taken away, while chamber 14 is still full.
 */
export function ventilSchaltzeit(masse, druckBar, { art, bauart = "monostabil", richtung = "14", impuls = null } = {}) {
  const v = neuesVentil(masse, { art, bauart, druckBar });
  let puls = null, rest = 0;
  const gib = (n) => { ventilSignal(v, n, true); if (impuls !== null) { puls = n; rest = impuls; } };
  const schritt = () => {
    ventilSchritt(v, masse, 0.001, druckBar);
    if (puls !== null && (rest -= 0.001) <= 1e-9) { ventilSignal(v, puls, false); puls = null; }
  };
  const schritte = (s) => { for (let t = 0; t < s; t += 0.001) schritt(); };
  gib("14");
  if (richtung === "12") {
    schritte(1);
    if (bauart === "bistabil") {
      if (impuls === null) ventilSignal(v, "14", false);
      gib("12");
    } else ventilSignal(v, "14", false);
    v.schaltzeit = null;
  }
  for (let t = 0; t < 1 && v.schaltzeit === null; t += 0.001) schritt();
  return v.schaltzeit === null ? Infinity : v.schaltzeit;
}

/** Rounded values for the card's readout; `drucke` = gauge pressure per working port, in bar. */
export function ventilAnzeige(v, masse, druckBar) {
  const bar = (p) => Math.round((p - AUSSEN) * 10) / 10;
  const zeit = v.schaltzeit ?? ventilSchaltzeit(masse, druckBar, { art: v.art });
  const drucke = {};
  for (const w of Object.keys(v.p)) drucke[w] = bar(v.p[w]);
  return {
    drucke,
    schaltzeitMs: Number.isFinite(zeit) ? Math.round(zeit * 1000) : null,   // never Infinity on the card
  };
}
