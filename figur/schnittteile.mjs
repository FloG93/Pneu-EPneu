// What every page that shows a housing in a longitudinal section has in common in its
// build script: the cut face of the block built from a grid of hollows, the hatching,
// the turned parts that are drawn twice (as a half section while they sit in place, as a
// whole part once they have left), the cut of a fitting with its hose stub, the hoses,
// the depth order of the cut parts, the field of view with everything out, the drawing as
// SVG and the end of the build (report, --apart, --audit).
// It knows the build "section through a housing with fittings and turned parts", not one
// particular valve: the hollows, the dimensions, the ports and the parts come from the
// build script, together with the four data tables.
//
// Everything that draws needs the projection and the recorder, so it comes from a factory
// without global state:
//   const ST = schnittTeile({ P, MOVE, R, rec, put, gruppe, NT });
//     P        projection of the figure (k.fitProjection)
//     MOVE     escape path of each assembly
//     R, rec, put, gruppe   the recorder of the build script (figur/zylinderteile.mjs `zeichner`)
//     NT       the standard parts of figur/normteile.mjs (`NT.schnitt` is the cut face)
//   ST.at, ST.L, ST.SV, ST.ring3   projection of a point, line, solid and polygon helpers
//   ST.hohlraum(h)           one hollow on the cut face; h = [[x0, x1, z0, z1], "h" | "v" | "loch"]
//   ST.materialKoerper(...)  the material of the half block as axis boxes, from the hollows
//   ST.gehaeuseBlock({...})  the whole housing block: cut face, hollows, round walls, rooms of air, edges
//   ST.loecher({ x, z, r })  the two mounting holes as hollows
//   ST.raumPfade({...}), ST.rahmen(x0, x1, z0, z1)   the rooms of air as empty paths; a rectangle's outline
//   ST.schnittFlaeche(punkte, richtung, {ton, strich})   a cut face in the section tone with 45° hatching (`ton`: a variant of the tone for a neighbouring part)
//   ST.hohlraumUmriss({...}), ST.materialKeil(punkte)   the walls of the hollows as lines over the air; a wedge of material
//   ST.zweiLagen(schnitt, ganz)   the two drawings of a turned part, blended by the page
//   ST.drehachse({ richtung, mitte })     (radius, s) profile → both sides of the axis
//   ST.obenFlaeche(punkte)   the top face of a part that stands above the housing
//   ST.schnittEnde(punkte, rAussen, rInnen)   the cut end of a hose
//   ST.anschlussSchnitt({...})  the standard fitting with its hose stub cut in the plane, and its air room
//   ST.anschluesse({ ports, wege })  fittings, hoses and their sections from one table of ports
//   ST.schnittLage(traeger, svg)  hang a half section on an item
//   ST.schlaeuche(wege, {...})  the hoses in pieces, with their route for the escape
//   ST.anordnen({...})       depth order: the housing as back drop, the turned parts in mounting order
//   ST.pruefeBaugruppen(LEGENDE, STAGGER)   every part has a legend number, legend and order agree
//   ST.ansicht({ W, H, ... })   KEYS, LIFT, VIEW0, VIEW1, MITTE
//   ST.figur({ W, H, label })   the drawing; ST.ende({...})   report, --apart and --audit

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import * as SCH from "./schnitt.mjs";
import { STECKVERSCHRAUBUNG_G14 as G14 } from "./normteile.mjs";
import * as EX from "./explode.mjs";

const TAU = Math.PI * 2;

/** The canvas of every section page. */
export const LEINWAND = { W: 900, H: 800 };

/** The layer of the particles in the housing's own drawing (behind the parts that stand in the hollows); the page runtime looks for it. */
export const LUFTLAGE_HINTEN = `<g class="luft" data-luftlage-hinten=""></g>`;

/**
 * The hatching of a polygon of (x, z) points: parallel 45° lines, each cut with the polygon's
 * edges and kept between pairs of crossings. `richtung` 1 or -1 turns the lines the other way
 * for the neighbouring part.
 */
export function hatchSegmente(poly, richtung = 1) {
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const segmente = [];
  // every line x - r·z = c (r = ±1) is cut with the polygon's edges; between each pair of crossings it lies inside the face
  for (let c = x0 - richtung * (richtung > 0 ? z1 : z0) - 1; c <= x1 - richtung * (richtung > 0 ? z0 : z1) + 1; c += 2.2) {
    const treffer = [];
    for (let i = 0; i < poly.length; i += 1) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      const fa = ax - richtung * az - c, fb = bx - richtung * bz - c;
      if ((fa < 0) === (fb < 0) || fa === fb) continue;
      const t = fa / (fa - fb);
      treffer.push(az + (bz - az) * t);
    }
    treffer.sort((u, v) => u - v);
    for (let i = 0; i + 1 < treffer.length; i += 2) segmente.push([[c + richtung * treffer[i], treffer[i]], [c + richtung * treffer[i + 1], treffer[i + 1]]]);
  }
  return segmente;
}

/**
 * A point on a port's axis in the cut plane: `s` out from the housing's face, `q` across the axis (in x for a vertical
 * port, in z for a horizontal one). A port is `{ flaeche: [x, 0, z], aus: [dx, 0, dz] }`, `aus` the unit direction out of the housing.
 */
export function anschlussPunkt(port, s, q = 0) {
  const [x, , z] = port.flaeche;
  return port.aus[2] !== 0 ? [x + q, 0, z + port.aus[2] * s] : [x + port.aus[0] * s, 0, z + q];
}

export function schnittTeile({ P, MOVE, R, rec, put, gruppe, NT }) {
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const SV = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const ring3 = (punkte) => SCH.pfad(punkte.map(at));
  const umriss = ring3;

  // --- The cut face ---------------------------------------------------------------------------------
  const flaeche = (x0, x1, z0, z1, band) => `<path class="iso-shade" data-shade="${band}" d="${ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])}"/>`;

  /** One hollow on the cut face: the far half of a round bore, dark where the light does not reach, lit on the far side. */
  function hohlraum([[x0, x1, z0, z1], art]) {
    const h = z1 - z0, b = x1 - x0;
    if (art === "h") return flaeche(x0, x1, z0, z1, 0) + flaeche(x0, x1, z0, z0 + h * 0.62, 1) + flaeche(x0, x1, z0, z0 + h * 0.28, 2);
    if (art === "loch") {
      // a round hole across the block, seen as an ellipse on the cut face: its far wall shows as a lit crescent
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, r = b / 2;
      const kreis = (rr, dz = 0) => ring3(Array.from({ length: 41 }, (_, i) => [mx + rr * Math.cos((i / 40) * TAU), 0, mz + dz + rr * Math.sin((i / 40) * TAU)]));
      return `<path class="iso-shade" data-shade="0" d="${kreis(r)}"/><path class="iso-shade" data-shade="1" d="${kreis(r * 0.8, -r * 0.14)}"/>`;
    }
    return flaeche(x0, x1, z0, z1, 0) + flaeche(x0 + b * 0.4, x1, z0, z1, 1) + flaeche(x0 + b * 0.72, x1, z0, z1, 2);
  }

  /**
   * The material of the half block as axis boxes: the grid of all hollow edges, empty cells left out,
   * runs merged. `hohlraeume` as for `hohlraum`; the block is `laenge` long (x) and `hoehe` high (z) and
   * its kept half reaches from y = -tiefe to 0.
   */
  function materialKoerper({ hohlraeume, laenge, hoehe, tiefe, name = "gehaeuse.material", teilLaenge = 24 }) {
    const innen = (x, z) => hohlraeume.some(([[a, b, c, d]]) => x > a + 1e-9 && x < b - 1e-9 && z > c + 1e-9 && z < d - 1e-9);
    const xs = [...new Set([0, laenge, ...hohlraeume.flatMap(([[a, b]]) => [a, b])])].sort((a, b) => a - b);
    const zs = [...new Set([0, hoehe, ...hohlraeume.flatMap(([[, , c, d]]) => [c, d])])].sort((a, b) => a - b);
    const boxen = [];
    for (let j = 0; j < zs.length - 1; j += 1) {
      let start = null;
      for (let i = 0; i <= xs.length - 1; i += 1) {
        const voll = i < xs.length - 1 && !innen((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
        if (voll && start === null) start = xs[i];
        if (!voll && start !== null) { boxen.push([start, xs[i], zs[j], zs[j + 1]]); start = null; }
      }
    }
    // A long block is split along x: the crowding check reads anything four times longer than thick as a rod.
    return boxen.flatMap(([x0, x1, z0, z1]) => {
      const n = Math.max(1, Math.ceil((x1 - x0) / teilLaenge - 1e-9));
      return Array.from({ length: n }, (_, i) => rec(A.box(
        [x0 + ((x1 - x0) * i) / n, -tiefe, z0], [x0 + ((x1 - x0) * (i + 1)) / n, 0, z1], { name, ground: true })));
    });
  }

  /** The outline of a rectangle (x0, x1, z0, z1) in the cut plane, as a projected path. */
  const rahmen = (x0, x1, z0, z1) => ring3([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]);

  /**
   * The rooms of air as empty paths the page paints by side (`data-raum`): rectangles `[seite, [x0, x1, z0, z1]]`
   * and wedges `[seite, profil]` of (radius, s) points, once on each side of the axis (`beideSeiten`).
   */
  function raumPfade({ rechtecke, keile = [], beideSeiten }) {
    return [
      ...rechtecke.map(([seite, [x0, x1, z0, z1]]) => `<path class="kammer" data-raum="${seite}" fill="none" d="${rahmen(x0, x1, z0, z1)}"/>`),
      ...keile.flatMap(([seite, pt]) => beideSeiten(pt).map((q) => `<path class="kammer" data-raum="${seite}" fill="none" d="${ring3(q)}"/>`)),
    ];
  }

  /** The two mounting holes across the block as hollows: `{ x: [x0, x1], z, r }`. */
  const loecher = ({ x, z, r }) => x.map((xm) => [[xm - r, xm + r, z - r, z + r], "loch"]);

  /**
   * The housing block, cut in half: the halo, the top and the right end (the two outer faces the camera
   * sees besides the cut face), the cut face with its hollows (all outlines first, then all fills over
   * them, so the lines inside a junction of two hollows are covered and only the outline of the union
   * stays), the round walls behind the cut, the rooms of air, the outlines of the holes and the edges.
   * The block is `laenge` (x) long, `hoehe` (z) high and kept from y = -`tiefe` to 0. Group "gehaeuse".
   *   hohlraeume  [[[x0, x1, z0, z1], "h" | "v" | "loch"], ...]
   *   rundeWaende rectangles whose far half is a round wall behind the cut (drawn as "v" hollows, or as
   *               [rect, art] for another kind)
   *   raeume      the markup of `raumPfade`
   *   oben        more markup drawn over the rooms (the thread's rings on a bore's wall)
   *   mitte       where the housing's recorded bodies stand (default the middle of the block)
   * The particles of the passages run in a layer of their own at the end of the housing's drawing: in
   * front of the cut face, behind the parts that stand in the hollows and are drawn after it.
   */
  function gehaeuseBlock({ laenge, hoehe, tiefe, hohlraeume, rundeWaende = [], raeume = [], oben = [], name = "gehaeuse.koerper" }) {
    gruppe("gehaeuse");
    const plan = { x: 0, y: -tiefe, w: laenge, d: tiefe, r: 0 };
    const loecher = hohlraeume.filter(([, art]) => art === "loch");
    const teile = [
      `<path class="iso-halo" d="${k.haloOf(plan, 0, hoehe, P)}"/>`,
      // top and the right end: the two outer faces the camera sees besides the cut face
      NT.flach([[0, -tiefe, hoehe], [laenge, -tiefe, hoehe], [laenge, 0, hoehe], [0, 0, hoehe]], [0, 0, 1]),
      NT.flach([[laenge, -tiefe, 0], [laenge, 0, 0], [laenge, 0, hoehe], [laenge, -tiefe, hoehe]], [1, 0, 0]),
      // the cut face
      NT.schnitt([[0, 0, 0], [laenge, 0, 0], [laenge, 0, hoehe], [0, 0, hoehe]]).replace("<path ", '<path data-mass="" '),   // data-mass: the browser test reads the scale from it
      L(hohlraeume.filter(([, art]) => art !== "loch").map(([[x0, x1, z0, z1]]) => rahmen(x0, x1, z0, z1)).join(""), { tone: "mid" }),
      ...hohlraeume.map(hohlraum),
      ...rundeWaende.map((r) => hohlraum(Array.isArray(r[0]) ? r : [r, "v"])),
      ...raeume,
      ...oben,
      L(loecher.map(([[x0, x1, z0, z1]]) => ring3(Array.from({ length: 41 }, (_, i) => [(x0 + x1) / 2 + ((x1 - x0) / 2) * Math.cos((i / 40) * TAU), 0, (z0 + z1) / 2 + ((z1 - z0) / 2) * Math.sin((i / 40) * TAU)]))).join(""), { tone: "mid" }),
      L(rahmen(0, laenge, 0, hoehe), { tone: "mid" }),
      L(k.segment([laenge, 0, hoehe], [laenge, -tiefe, hoehe], P) + k.segment([laenge, -tiefe, hoehe], [0, -tiefe, hoehe], P) + k.segment([0, -tiefe, hoehe], [0, 0, hoehe], P)
        + k.segment([laenge, -tiefe, hoehe], [laenge, -tiefe, 0], P) + k.segment([laenge, -tiefe, 0], [laenge, 0, 0], P), { tone: "mid" }),
      LUFTLAGE_HINTEN,
    ];
    put([laenge / 2, -tiefe / 2, hoehe / 2], teile.join(""), materialKoerper({ hohlraeume, laenge, hoehe, tiefe }), { name });
  }

  /**
   * A cut face in the section tone with the hatching of technical drawings: parallel lines at 45° in the
   * cut plane, clipped to the face, so the cut parts that lie one against the other can be told apart.
   */
  function schnittFlaeche(punkte, richtung = 1, { ton = null, strich = "faint" } = {}) {
    const d = hatchSegmente(punkte.map((p) => [p[0], p[2]]), richtung)
      .map(([a, b]) => `M${at([a[0], 0, a[1]]).map((v) => v.toFixed(1)).join(" ")}L${at([b[0], 0, b[1]]).map((v) => v.toFixed(1)).join(" ")}`);
    // `ton` gives the face its own variant of the section tone (data-schnitt="ton"), so that two parts that lie one against the other differ
    const flaeche = ton ? NT.schnitt(punkte).replace('data-schnitt=""', `data-schnitt="${ton}"`) : NT.schnitt(punkte);
    return flaeche + L(d.join(""), { tone: strich });
  }

  /**
   * The walls of the hollows on the cut face as lines: the outline of the union of all hollows (the round
   * holes left out) where it borders material of the block, no line across a junction of two hollows and none
   * along the block's own edge. Drawn over the rooms of air, so that the bores, the chamber and the seats read
   * through the air's tint.
   */
  function hohlraumUmriss({ hohlraeume, laenge, hoehe, ton = "mid" }) {
    const eckig = hohlraeume.filter(([, art]) => art !== "loch");
    const xs = [...new Set([0, laenge, ...eckig.flatMap(([[a, b]]) => [a, b])])].sort((a, b) => a - b);
    const zs = [...new Set([0, hoehe, ...eckig.flatMap(([[, , c, d]]) => [c, d])])].sort((a, b) => a - b);
    const hohl = (i, j) => i >= 0 && j >= 0 && i < xs.length - 1 && j < zs.length - 1
      && eckig.some(([[a, b, c, d]]) => (xs[i] + xs[i + 1]) / 2 > a && (xs[i] + xs[i + 1]) / 2 < b && (zs[j] + zs[j + 1]) / 2 > c && (zs[j] + zs[j + 1]) / 2 < d);
    const innen = (i, j) => i >= 0 && j >= 0 && i < xs.length - 1 && j < zs.length - 1;
    const waagerecht = new Map(), senkrecht = new Map();       // by z (or x): the [from, to] pieces
    const merke = (karte, schluessel, a, b) => { if (!karte.has(schluessel)) karte.set(schluessel, []); karte.get(schluessel).push([a, b]); };
    for (let i = 0; i < xs.length - 1; i += 1) {
      for (let j = 0; j < zs.length - 1; j += 1) {
        if (!hohl(i, j)) continue;
        if (innen(i, j - 1) && !hohl(i, j - 1)) merke(waagerecht, zs[j], xs[i], xs[i + 1]);
        if (innen(i, j + 1) && !hohl(i, j + 1)) merke(waagerecht, zs[j + 1], xs[i], xs[i + 1]);
        if (innen(i - 1, j) && !hohl(i - 1, j)) merke(senkrecht, xs[i], zs[j], zs[j + 1]);
        if (innen(i + 1, j) && !hohl(i + 1, j)) merke(senkrecht, xs[i + 1], zs[j], zs[j + 1]);
      }
    }
    const verbinden = (stuecke) => {
      const sortiert = stuecke.slice().sort((a, b) => a[0] - b[0]);
      const aus = [];
      for (const [a, b] of sortiert) {
        const letztes = aus[aus.length - 1];
        if (letztes && a <= letztes[1] + 1e-9) letztes[1] = Math.max(letztes[1], b); else aus.push([a, b]);
      }
      return aus;
    };
    const strecken = [];
    for (const [z, stuecke] of waagerecht) for (const [a, b] of verbinden(stuecke)) strecken.push([[a, 0, z], [b, 0, z]]);
    for (const [x, stuecke] of senkrecht) for (const [a, b] of verbinden(stuecke)) strecken.push([[x, 0, a], [x, 0, b]]);
    const d = strecken.map(([a, b]) => `M${at(a).map((v) => v.toFixed(1)).join(" ")}L${at(b).map((v) => v.toFixed(1)).join(" ")}`).join("");
    return L(d, { tone: ton });
  }

  /**
   * A wedge of material in the cut plane (a seat's cone, a shoulder) drawn over the rooms: the section tone
   * and its outline. `punkte` are (x, z) pairs.
   */
  function materialKeil(punkte, { ton = null } = {}) {
    const p3 = punkte.map(([x, z]) => [x, 0, z]);
    const flaeche = ton ? NT.schnitt(p3).replace('data-schnitt=""', `data-schnitt="${ton}"`) : NT.schnitt(p3);
    return flaeche + L(ring3(p3), { tone: "mid" });
  }

  // --- Turned parts, cut in half --------------------------------------------------------------------
  /**
   * Profiles of (radius, s) points mirrored about an axis in the cut plane. `richtung` "z": a vertical
   * axis at x = `mitte`, s is the height; "x": a horizontal axis at height `mitte`, s is the x position.
   * `beideSeiten(profil)` is the closed profile once on each side of the axis.
   */
  function drehachse({ richtung = "z", mitte }) {
    const unten = richtung === "z" ? (pt) => pt.map(([r, s]) => [mitte - r, 0, s]) : (pt) => pt.map(([r, s]) => [s, 0, mitte - r]);
    const oben = richtung === "z" ? (pt) => pt.map(([r, s]) => [mitte + r, 0, s]) : (pt) => pt.map(([r, s]) => [s, 0, mitte + r]);
    return { spiegel: unten, rechts: oben, beideSeiten: (profil) => [unten(profil), oben(profil)] };
  }

  /**
   * Every turned part is drawn twice, once as its half section (while the valve is together) and once
   * whole (once it flies apart); the page blends the two by how far that part has left its place.
   * A half section floating in the air would be a flat strip, not a part.
   */
  const zweiLagen = (schnitt, ganz) => `<g data-lage="schnitt">${schnitt}</g><g data-lage="ganz">${ganz}</g>`;

  /** The top face of a turned part that stands above the housing: a mid-light tone and an outline, so it does not melt into the white top of the block. */
  const obenFlaeche = (punkte) => `<path class="iso-shade" data-shade="2" d="${ring3(punkte)}"/>` + L(ring3(punkte), { tone: "mid" });

  /** The cut end of a hose: its wall as a ring and the dark bore inside. */
  function schnittEnde(punkte, rAussen, rInnen) {
    const ende = punkte[punkte.length - 1];
    const vor = punkte[punkte.length - 2];
    const F = G.frameAlong(ende, G.unit3(G.sub3(ende, vor)));
    const band = G.toneOf(F.a, P);
    const ringPfad = (r) => Array.from({ length: 41 }, (_, i) => at(G.pointOf(F, 0, r, (i / 40) * TAU)));
    if (G.dot3(F.a, V) <= 0) return "";
    return [
      `<path class="iso-fill" d="${SCH.pfad(ringPfad(rAussen))}"/>`,
      band >= 4 ? `<path class="iso-top" d="${SCH.pfad(ringPfad(rAussen))}"/>` : `<path class="iso-shade" data-shade="${band}" d="${SCH.pfad(ringPfad(rAussen))}"/>`,
      `<path class="iso-shade" data-shade="0" d="${SCH.pfad(ringPfad(rInnen))}"/>`,
      L(SCH.pfad(ringPfad(rAussen)), { tone: "mid" }),
      L(SCH.pfad(ringPfad(rInnen)), { tone: "mid" }),
    ].join("");
  }

  // --- Fittings and hoses ---------------------------------------------------------------------------
  /**
   * The hoses of `wege` = { nr: points }: each in pieces of at most `maxLaenge`, group "leitung", with the
   * cut end on the last piece. `frei` says which ends of the route come free when the valve is taken apart.
   */
  function schlaeuche(wege, { radius, innen, piece = "leitung", name = "leitung", maxLaenge = 14, ends = [true, false], frei = [true, false] }) {
    for (const nr of Object.keys(wege)) {
      const punkte = wege[nr];
      // `piece` may be a function of the port: each port's hose then rides with its own fitting
      const teil = typeof piece === "function" ? piece(nr) : piece;
      gruppe(teil);
      // The far end is cut off in the air on purpose: it is no tip that must land on a part.
      R.route(`${name}.${nr}`, punkte, radius, { piece: teil, move: MOVE[teil], ends, free: frei });
      const stuecke = tubePieces(punkte, radius, P, { maxLength: maxLaenge });
      stuecke.forEach((teil, i) => {
        const letztes = i === stuecke.length - 1;
        put(teil.mid, tubeSvg(teil, { tone: "mid" }) + (letztes ? schnittEnde(punkte, radius, innen) : ""),
          [A.tube(teil.points, teil.radii)],
          { name: `${name}.schlauch${nr}:${i}`, route: `${name}.${nr}`, chunk: i });
      });
    }
  }

  /**
   * The fitting and the hose stub of one port cut in the same plane as the block: walls in the section tone,
   * the bore free, so the way of the air from the hose to the core can be followed. While they leave the
   * valve the whole parts are shown. Hung on the fitting's first item (an item without a recorded body
   * would not pass the audit) and drawn before it.
   *
   *   streifen(s0, s1, q0, q1) → [xa, xb, za0, za1]: the rectangle (x range, then z range of its first and
   *        second edge) that lies between s0 and s1 along the port axis (s from the housing's face outward)
   *        and between q0 and q1 across it; the port knows where its axis runs
   *   hohl     [[x0, x1, z0, z1], art]  the bore outside the block, with its far wall; `raum` its room of air
   *   teile    [[[s0, s1], rIn, rAus, richtung], ...]  the walls of the fitting (rIn/rAus radii, richtung of the hatching); default: the walls of `fitting` (the standard fitting `STECKVERSCHRAUBUNG_G14` or its compact variant, both of normteile.mjs)
   *   schlauch { s: [s0, s1], rIn, rAus }  the hose stub; default: the standard one, `schlauchLaenge` long
   *   traeger  name of the fitting's first item
   */
  function anschlussSchnitt({ streifen, hohl, raum, traeger, bezeichnung = null, fitting = G14, teile = fitting.schnitt, schlauchLaenge = fitting.schlauchLaenge, schlauch = { s: [fitting.masse.ring[1], fitting.masse.ring[1] + schlauchLaenge], rIn: fitting.rSchlauchInnen, rAus: fitting.rSchlauch } }) {
    const b = hohl[0];
    const flaechen = [`<g data-hohl="">${hohlraum(hohl)}`, `<path class="kammer" data-raum="${raum}" fill="none" d="${ring3([[b[0], 0, b[2]], [b[1], 0, b[2]], [b[1], 0, b[3]], [b[0], 0, b[3]]])}"/></g>`];
    const linien = [];
    const rechteck = ([xa, xb, za0, za1]) => [[xa, 0, za0], [xb, 0, za0], [xb, 0, za1], [xa, 0, za1]];
    for (const [[s0, s1], rIn, rAus, richtung] of teile) {
      for (const [q0, q1] of [[rIn, rAus], [-rAus, -rIn]]) {
        const poly = rechteck(streifen(s0, s1, q0, q1));
        flaechen.push(schnittFlaeche(poly, richtung));
        linien.push(ring3(poly));
      }
    }
    for (const [q0, q1] of [[schlauch.rIn, schlauch.rAus], [-schlauch.rAus, -schlauch.rIn]]) {
      const poly = rechteck(streifen(schlauch.s[0], schlauch.s[1], q0, q1));
      linien.push(ring3(poly));
      flaechen.push(`<path class="iso-shade" data-shade="0" d="${ring3(poly)}"/>`);
    }
    // the port's designation (1, 2) at the hose's cut end, a little beyond it, drawn with the section (it fades when the part leaves)
    const schrift = bezeichnung ? (() => {
      const p = at(bezeichnung.punkt), q = at(bezeichnung.vorn);
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const x = p[0] + ((q[0] - p[0]) / l) * 17, y = p[1] + ((q[1] - p[1]) / l) * 17;
      return `<text class="anschluss-bez" x="${x.toFixed(1)}" y="${(y + 6.5).toFixed(1)}" text-anchor="middle" font-size="19" font-weight="600" style="fill:var(--anatomy-strong)">${bezeichnung.text}</text>`;
    })() : "";
    schnittLage(traeger, `${flaechen.join("")}${L(linien.join(""), { tone: "mid" })}${schrift}`);
  }

  /**
   * Hang the half section of a part on one of its items (an item without a recorded body would not pass the
   * audit) and draw it before the item's own whole drawing: `traeger` is that item's name.
   */
  function schnittLage(traeger, schnittSvg) {
    const trager = R.items.find((it) => it.name === traeger);
    trager.svg = `<g data-lage="schnitt">${schnittSvg}</g><g data-lage="ganz">${trager.svg}</g>`;
  }

  /**
   * The three kinds of part a port brings, from one table: the fitting (figur/normteile.mjs), the hose stub and the section of both.
   * `ports` is a table of
   *   { nr, gruppe, name, flaeche, aus, raum, hohl, schlauchGruppe? }
   * `nr` is the key of its hose in `wege` (points of the hose's route), `gruppe` the drawing group and assembly of the fitting,
   * `bezeichnung` the port's number as the drawing writes it ("1", "2"; optional), `name` the prefix of its bodies, `flaeche`/`aus` the port's face and outward direction (see `anschlussPunkt`), `raum` the air
   * room of its bore, `hohl` the bore outside the block, `schlauchGruppe` the hose's assembly (default "leitung").
   * The fitting is `fitting` (default the standard one) with a hose stub of `schlauchLaenge`; its frame has the axis `aus`, `u` along y for a horizontal port and along x for a vertical one.
   */
  function anschluesse({ ports, wege, fitting = G14, schlauchLaenge = fitting.schlauchLaenge }) {
    const rahmenVon = (p) => (p.aus[2] !== 0
      ? G.frameOf(p.flaeche, p.aus, [1, 0, 0], [0, 1, 0])
      : G.frameOf(p.flaeche, p.aus, [0, 1, 0], [0, 0, 1]));
    for (const p of ports) {
      NT.verschraubung(rahmenVon(p), fitting.masse, p.gruppe, p.name, (rng) => anschlussPunkt(p, (rng[0] + rng[1]) / 2), fitting.rStummel);
    }
    const nachNr = Object.fromEntries(ports.map((p) => [p.nr, p]));
    schlaeuche(wege, { radius: fitting.rSchlauch, innen: fitting.rSchlauchInnen, piece: (nr) => nachNr[nr].schlauchGruppe ?? "leitung" });
    for (const p of ports) {
      anschlussSchnitt({
        // the rectangle between s0 and s1 along the port and q0 and q1 across it
        streifen: (s0, s1, q0, q1) => {
          const a = anschlussPunkt(p, s0, q0), b = anschlussPunkt(p, s1, q1);
          return p.aus[2] !== 0
            ? [p.flaeche[0] + q0, p.flaeche[0] + q1, Math.min(a[2], b[2]), Math.max(a[2], b[2])]
            : [...[a[0], b[0]].sort((u, v) => u - v), p.flaeche[2] + q0, p.flaeche[2] + q1];
        },
        hohl: p.hohl, raum: p.raum, fitting, schlauchLaenge, traeger: `${p.name}.gewinde`,
        bezeichnung: p.bezeichnung ? {
          text: p.bezeichnung,
          punkt: anschlussPunkt(p, fitting.masse.ring[1] + schlauchLaenge),
          vorn: anschlussPunkt(p, fitting.masse.ring[1] + schlauchLaenge + 1),
        } : null,
      });
    }
  }

  // --- Order, view, drawing, end ----------------------------------------------------------------------
  /** Every part has a legend number, and the legend and the order name the same assemblies. */
  function pruefeBaugruppen(LEGENDE, STAGGER) {
    const ids = LEGENDE.map((e) => e.piece);
    for (const it of R.items) {
      if (!ids.includes(it.piece)) throw new Error(`Teil ${it.name} hat keine Legendennummer (${it.piece})`);
    }
    if (STAGGER.length !== ids.length || !ids.every((id) => STAGGER.includes(id))) {
      throw new Error("STAGGER und LEGENDE nennen nicht dieselben Baugruppen");
    }
  }

  /**
   * The depth order of the cut parts. The housing is the back drop of everything inside it. The turned
   * parts are drawn flat in the cut plane and share one axis, so no depth order tells them apart: they are
   * drawn in the order of their mounting, `reihe` (names of their first items), from the inside out. The
   * whole fittings and hoses (`ganzStuecke`, names of assemblies) are what is seen once they have left; in
   * place the cut ones are.
   */
  function anordnen({ hintergrund = "gehaeuse.koerper", reihe = [], ganzStuecke = [] }) {
    A.settle(R, P);
    const eintrag = (name) => R.items.find((it) => it.name === name);
    const unten = Math.min(...R.items.filter((it) => it.name !== hintergrund).map((it) => it.key));
    eintrag(hintergrund).key = unten - 1;
    const teile = reihe.map(eintrag);
    const basis = Math.min(...teile.map((it) => it.key));
    teile.forEach((it, i) => { it.key = basis + i * 0.01; });
    for (const it of R.items) if (ganzStuecke.includes(it.piece) && !it.svg.startsWith("<g data-lage=\"schnitt\">")) it.svg = `<g data-lage="ganz">${it.svg}</g>`;
    R.items.sort((a, b) => a.key - b.key);
  }

  /**
   * The view and the order the page needs, measured at build time (figur/explode.mjs `vorbereiten`).
   * `mitte` overrides where a number hangs (the housing's number on the left edge of its cut face, where
   * its label stands clear of the parts that left). The view with everything out is widened by `weite`
   * about its centre (same aspect ratio): vorbereiten measures the parts' places, not their extent.
   */
  function ansicht({ W, H, mitte = {}, weite = 0.03 }) {
    const { KEYS, LIFT, VIEW0, VIEW1: roh, MITTE } = EX.vorbereiten(R, P, MOVE, W, H);
    Object.assign(MITTE, mitte);
    const VIEW1 = (([x, y, w, h]) => [x - w * weite, y - h * weite, w * (1 + 2 * weite), h * (1 + 2 * weite)])(roh);
    return { KEYS, LIFT, VIEW0, VIEW1, MITTE };
  }

  /** The drawing: every item in its group, and the empty layer the page puts the particles of the hoses in. */
  function figur({ W, H, label }) {
    return k.figureSvg({
      width: W,
      height: H,
      label,
      body: [
        R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}">${it.svg}</g>`).join(""),
        `<g class="luft" data-luftlage=""></g>`,
      ],
    });
  }

  /** The report and the two checks: --apart (everything at the end of its way) and --audit. */
  function ende({ ziel, mitte, view1, allow = [], crowd = [], cover = [] }) {
    console.log(`geschrieben: ${ziel}`);
    console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
    console.log(`Nummern an: ${Object.keys(mitte).join(", ")}`);
    if (process.argv.includes("--apart")) {
      for (const shape of R.solids) shape.move = MOVE[shape.piece] ?? [0, 0, 0];
      const probleme = A.solidClearances(R.solids, { state: 1 });
      for (const p of probleme.slice(0, 20)) console.log(`  ${p.a ?? p.one ?? ""} × ${p.b ?? p.two ?? ""}  ${JSON.stringify(p).slice(0, 150)}`);
      console.log(`Ansicht auseinandergefahren: ${view1.map((v) => v.toFixed(0)).join(" ")}`);
      console.log(probleme.length ? `auseinandergefahren: ${probleme.length} Durchdringungen` : "auseinandergefahren: sauber");
      if (probleme.length) process.exit(1);
    }
    if (process.argv.includes("--audit")) A.auditOrExit(R, P, { allow, crowd, cover });
  }

  return {
    R, at, L, SV, ring3, umriss, flaeche, rahmen, loecher, hohlraum, hohlraumUmriss, materialKeil, materialKoerper, raumPfade, gehaeuseBlock, schnittFlaeche, drehachse, zweiLagen, obenFlaeche,
    schnittEnde, schlaeuche, anschlussSchnitt, anschluesse, schnittLage, pruefeBaugruppen, anordnen, ansicht, figur, ende,
  };
}
