// The rooms of air in a spool valve's section, as shapes on the cut plane
// y = 0: the lower and upper part of a ring groove, the channel under it, the
// gap round a neck of the spool, the port drilling in the sub-base, the slot
// in the gasket, the trough in the step and the pilot chamber, plus the routes
// the particles take from a port into its groove and through a web. The page
// colours each room by its number (data-raum); where a room lies in the
// drawing's depth order is the build script's business, it appends the
// strings to the item that draws the hollow it fills.
//
// It knows no valve: the build script hands in the bore, the grooves and
// the channels, and says which neck lies where.
//
//   const R = ventilRaeume({ P, PORT, GEH, PLATTE, DICHT, ZA, ZP, RB, R_NUT, NUT_HALB,
//                            R_KANAL, R_GEWINDE, R_HALS, R_BUND, GEWINDE_START,
//                            R_STEUER_BOHRUNG, ZK0, KAMMER_Z });
//     PORT     { port number: x of its channel }
//     GEH      housing { z0 }, PLATTE sub-base { z1 }, DICHT gasket { z0, z1 }
//     ZA, ZP   height of the spool axis and of the port axis
//     RB, R_NUT, NUT_HALB   bore radius, groove radius, half groove width
//     R_KANAL, R_GEWINDE    channel radius, thread radius of a port
//     R_HALS, R_BUND        neck and land radius of the spool
//     GEWINDE_START         where a fitting's thread starts on its axis (y)
//     R_STEUER_BOHRUNG, ZK0, KAMMER_Z  pilot drilling radius, its bottom, and
//                           the chamber's [z0, z1]
//   R.kz, R.flaeche, R.raumGruppe     drawing helpers
//   R.ZN, R.ZG                        groove bottom, gap under a web (z)
//   R.raumUnten(nr, hals)             groove below the axis + channel, + gap
//   R.halsUnten(h0, h1)               the gap under a neck from x = h0 to h1
//   R.raumOben(nr, hals)              groove above the axis, + gap
//   R.halsOben(h0, h1)                the gap above a neck (ends at the next land)
//   R.raumPlatte(nr), R.raumDichtung(nr), R.raumRinne(nr)
//   R.raumSteuer(name, x, [x0, x1])   pilot drilling at x and the chamber x0…x1
//   R.vonAussen(nr, { wege, daempfer, abluft })   route from outside to the groove bottom
//   R.quer(a, b)                      route from groove a under the web to groove b

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as SCH from "./schnitt.mjs";
import { bogen } from "./gehaeuse.mjs";

export function ventilRaeume({ P, PORT, GEH, PLATTE, DICHT, ZA, ZP, RB, R_NUT, NUT_HALB, R_KANAL, R_GEWINDE, R_HALS, R_BUND, GEWINDE_START, R_STEUER_BOHRUNG, ZK0, KAMMER_Z }) {
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const ring3 = (punkte) => SCH.pfad(punkte.map(at));
  const ZN = ZA - 9;                   // groove bottom: still visible under a land
  const ZG = ZA - 5.6;                 // gap under a web: visible under a neck, not under a land
  const kz = (punkte) => ring3(punkte.map(([x, z]) => [x, 0, z]));
  const raumGruppe = (nr, inhalt) => `<g class="kammer" data-raum="${nr}" fill="none">${inhalt}</g>`;
  const flaeche = (d, extra = "") => `<path${extra} d="${d}"/>`;

  /**
   * Below the axis: the lower part of the groove, the channel under it and
   * (`hals`) the lower gap round a neck. These lie behind the spool's front
   * half, so they are drawn before the spool and the spool covers what it covers.
   */
  function raumUnten(nr, hals = "") {
    const x = PORT[nr];
    const [a, b] = [x - NUT_HALB, x + NUT_HALB];
    const unten = kz([[x - R_KANAL, GEH.z0], [x - R_KANAL, ZA - R_NUT], [a, ZA - R_NUT], [a, ZA - RB], [b, ZA - RB],
      [b, ZA - R_NUT], [x + R_KANAL, ZA - R_NUT], [x + R_KANAL, GEH.z0]]);
    return raumGruppe(nr, flaeche(unten) + hals);
  }
  const halsUnten = (h0, h1) => `<g data-hub="">${flaeche(kz([[h0, ZA - RB], [h1, ZA - RB], [h1, ZA - R_HALS], [h0, ZA - R_HALS]]))}</g>`;

  /**
   * Above the axis it is the other way round: the spool's BACK half lies behind
   * the cut plane there, yet is painted after the housing. So the upper part of
   * the groove and the gap above the neck are drawn right after the spool. Only
   * the next land to the right can stand in front of that gap (the camera looks
   * from +x); the gap ends where a sight line from it would enter that land.
   */
  function raumOben(nr, hals = "") {
    const x = PORT[nr];
    const oben = kz([[x - NUT_HALB, ZA + RB], [x + NUT_HALB, ZA + RB], [x + NUT_HALB, ZA + R_NUT], [x - NUT_HALB, ZA + R_NUT]]);
    return raumGruppe(nr, flaeche(oben) + hals);
  }
  function halsOben(h0, h1) {
    // Sight line from (x, 0, ZA + h) towards the camera: how far along x until it is R_BUND from the axis.
    const quer2 = V[1] ** 2 + V[2] ** 2;
    const vorlauf = (h) => {
      if (h >= R_BUND) return 0;
      const t = (-h * V[2] + Math.sqrt(h * h * V[2] ** 2 - quer2 * (h * h - R_BUND ** 2))) / quer2;
      return V[0] * t;
    };
    const kante = bogen(R_HALS, R_BUND, 8).map((h) => [h1 - vorlauf(h), ZA + h]);
    return `<g data-hub="">${flaeche(kz([[h0, ZA + R_HALS], ...kante, [h1, ZA + RB], [h0, ZA + RB]]))}</g>`;
  }

  /** Sub-base behind the cut: the upper half of the port drilling and the channel up to the gasket. */
  function raumPlatte(nr) {
    const x = PORT[nr];
    const knick = Math.atan2(Math.sqrt(R_GEWINDE ** 2 - R_KANAL ** 2), R_KANAL);
    const bogenPunkte = (von, bis) => bogen(von, bis, 10).map((t) => [x + R_GEWINDE * Math.cos(t), ZP + R_GEWINDE * Math.sin(t)]);
    return raumGruppe(nr, flaeche(kz([
      ...bogenPunkte(0, knick), [x + R_KANAL, PLATTE.z1], [x - R_KANAL, PLATTE.z1], ...bogenPunkte(Math.PI - knick, Math.PI),
    ])));
  }
  /** Gasket: the slot of each channel. */
  const raumDichtung = (nr) => raumGruppe(nr, flaeche(kz([[PORT[nr] - R_KANAL, DICHT.z0], [PORT[nr] + R_KANAL, DICHT.z0],
    [PORT[nr] + R_KANAL, DICHT.z1], [PORT[nr] - R_KANAL, DICHT.z1]])));
  /** The trough in the step, seen from above, up to where the fitting's stub begins. */
  const raumRinne = (nr) => raumGruppe(nr, flaeche(ring3([[PORT[nr] - R_GEWINDE, 0, ZP], [PORT[nr] + R_GEWINDE, 0, ZP],
    [PORT[nr] + R_GEWINDE, GEWINDE_START, ZP], [PORT[nr] - R_GEWINDE, GEWINDE_START, ZP]])));
  /** A pilot chamber: its drilling and the space between end wall and piston, which the page redraws. */
  function raumSteuer(name, x, kammer) {
    const bohrung = kz([[x - R_STEUER_BOHRUNG, KAMMER_Z[1]], [x + R_STEUER_BOHRUNG, KAMMER_Z[1]],
      [x + R_STEUER_BOHRUNG, ZK0], [x - R_STEUER_BOHRUNG, ZK0]]);
    const [x0, x1] = kammer;
    const rechteck = kz([[x0, KAMMER_Z[0]], [x1, KAMMER_Z[0]], [x1, KAMMER_Z[1]], [x0, KAMMER_Z[1]]]);
    return raumGruppe(name, flaeche(bohrung) + flaeche(rechteck, ` data-steuerkammer="${name}"`));
  }

  /** Particle route, outside in: from the cut hose end (or the silencer) to the bottom of the groove. */
  function vonAussen(nr, { wege, daempfer, abluft, gewinde }) {
    const x = PORT[nr];
    const innen = [[x, GEWINDE_START, ZP], [x, 0, ZP], [x, 0, ZN]];
    if (abluft.includes(nr)) {
      // Out through the silencer and a little way into the open air.
      const spitze = daempfer.sinter[1] + daempfer.kuppe;
      return [[x, spitze + 8, ZP], [x, spitze, ZP], [x, daempfer.sechskant[0], ZP], ...innen];
    }
    return [...wege[nr].slice().reverse(), [x, gewinde[1], ZP], ...innen];
  }
  /** From the bottom of groove a, under the web, to the bottom of groove b. */
  function quer(a, b) {
    const [xa, xb] = [PORT[a], PORT[b]];
    const r = Math.sign(xb - xa);
    const steg = [xa + r * NUT_HALB, xb - r * NUT_HALB];
    return [[xa + r * 3, 0, ZN], [steg[0] - r * 1.5, 0, ZG], [steg[1] + r * 1.5, 0, ZG], [xb - r * 3, 0, ZN]];
  }

  return { kz, flaeche, raumGruppe, ZN, ZG, raumUnten, halsUnten, raumOben, halsOben, raumPlatte, raumDichtung, raumRinne, raumSteuer, vonAussen, quer };
}
