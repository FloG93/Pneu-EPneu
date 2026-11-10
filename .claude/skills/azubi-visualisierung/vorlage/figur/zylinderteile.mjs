// The parts every cylinder page of the collection shares besides the cylinder
// itself: the feet and the rail the machine stands on, the load carriage the
// rod pushes, the valve on its sub-base (drawn simplified, cut at the plane
// of its spool) and the hoses that lead from the valve to the cylinder.
// It knows the build "cylinder on a rail with a valve beside it", not one
// particular cylinder or valve: the build script hands in the ports, the
// spool lands and the dimensions, and keeps its own tables and everything
// that belongs to one cylinder (caps, tie rods, cushioning, window).
//
// Pure helpers, exported by name:
//   schlauch(p0, aus, p1, ein, k0, k1)   hose path between two ports: a short
//        straight piece along each port axis, a smooth curve between them
//
// Also here, because every cylinder page needs it identically:
//   VENTIL_STANDARD               the valve's common dimensions (spool plane, axis height, width, bore ...)
//   zylinderMasse(Z, {deckel, rohrEnde, ragt})   the cylinder's common dimensions and frames
//   zeichner({ P, PIECE_OF, MOVE })              the recorder, `put` and `gruppe` of a build script
// And the end of every build script, through the factory below: `rohr`, `stange` (the window tube
// and the rod), `abschluss` (depth order, the air layer, view, air routes), `figur` (the drawing
// as SVG) and `ende` (report, --apart and --audit).
//
// Everything that draws needs the projection and the recorder, so it comes
// from a factory without global state:
//   const ZT = zylinderTeile({ P, MOVE, M });
//     P        projection of the figure; R the recorder (audit kit)
//     put      put(pos, svg, shapes, extra) of the build script
//     gruppe   gruppe(name) sets the drawing group the next put belongs to
//     MOVE     escape path of each assembly (the hoses' route takes it)
//     M        zylinderMasse(...) of this page
//   ZT.grundplatte({ fuss, fussZ, schiene, fussGruppe })
//        the feet (x of each, height fussZ) in group fussGruppe (default
//        "grund") and the rail in group "grund"
//   ZT.lastschlitten({ x, hw, d, h, F, rStange })
//        the load carriage at stroke 0 (it rides with the rod: data-hub);
//        x is the rod tip, hw/d/h half width, depth and height, F the frame on
//        the cylinder axis
//   ZT.ventil({ x, y, z, halbbreite, rBohrung, rSchieber, port, oben, unten,
//        winkel, sockelH, scheiben })
//        the valve on its sub-base. x = [x0, x1] along the spool, y the spool
//        plane, z the spool axis height, port = { nr: x } the x of each port,
//        oben = the ports with a boss on top, unten = the ones that leave
//        through the sub-base (exhaust), winkel = { nr: ±1 } the ports whose
//        boss carries an elbow (the others stand straight), scheiben = the x
//        of each sealing disc on the spool. Any number of ports and discs:
//        the 5/2 and the 3/2 differ only in these lists. Groups "gehaeuse",
//        "schieber" (data-schieber) and "betaetigung" (push button, spring).
//   ZT.schlaeuche(wege, { radius, versorgung })
//        every hose of wege = { name: points } in 60 mm pieces, group
//        "leitung"; the end of wege[versorgung] gets a coupling on a post.
//        Returns the points by name for the air routes.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "./schnitt.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import * as EX from "./explode.mjs";
import * as LU from "./luft.mjs";
import { hermite } from "./normteile.mjs";

/**
 * A hose between two ports. It leaves and enters along the port axis on a
 * short straight piece, so its end face sits flush in the fitting; the curve
 * between them is smooth, with no corner tighter than the hose is thick.
 */
export function schlauch(p0, aus, p1, ein, k0, k1) {
  const weiter = (p, d, t) => [0, 1, 2].map((j) => p[j] + d[j] * t);
  const a0 = weiter(p0, aus, 18);
  const a1 = weiter(p1, ein, 26);
  const kurve = hermite(a0, aus.map((v) => v * k0), a1, ein.map((v) => -v * k1), 34);
  return [p0, ...kurve, p1];
}

/** Where a build script's page goes and where the repository's root is, from its `import.meta.url`. */
export function ort(url) {
  const hier = dirname(fileURLToPath(url));
  return { ZIEL: join(hier, "..", "..", "index.html"), WURZEL: join(hier, "..", "..", "..") };
}

/** The canvas every cylinder figure is drawn on. */
export const LEINWAND = { W: 1160, H: 660 };

/** Hose directions: up out of a boss, out of a cylinder's port towards the viewer. */
export const AUF = [0, 0, 1];
export const VOR = [0, 1, 0];

/** What the valve on its sub-base has the same on every cylinder page. */
export const VENTIL_STANDARD = {
  y: 112,               // spool plane — measured: closer and no hose can turn between valve and cylinder
  z: 34,                // spool axis height
  halbbreite: 26,
  rBohrung: 8,
  rSchieber: 4.6,
  sockelH: 17,          // the sub-base carries the exhaust way(s)
  schieberWeg: 14,      // spool travel between the two positions
  rSchlauch: 4.2,
};

/** The cylinder's dimensions and frames; `Z` is the model's description (figur/pneumatik.mjs). */
export function zylinderMasse(Z, { deckel, rohrEnde, ragt, zc = 62 }) {
  const RB = Z.bohrung / 2;                  // bore
  const RS = Z.stange / 2;                   // rod
  const RA = RB + 3;                         // tube outside (wall 3, assumption)
  const X_BODEN = [0, deckel];
  const X_ROHR = [deckel, rohrEnde];
  const X_KOPF = [rohrEnde, rohrEnde + deckel];
  return {
    Z, RB, RS, RA, ZC: zc, HUB: Z.hub, TOT: Z.totraum, DECKEL: deckel, X_BODEN, X_ROHR, X_KOPF,
    KOLBEN0: X_ROHR[0] + Z.totraum,          // piston rear face at stroke 0
    SPITZE0: X_KOPF[1] + ragt,               // rod tip at stroke 0
    FZ: G.frameOf([0, 0, zc], [1, 0, 0], [0, 1, 0], [0, 0, 1]),
    quer: (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
  };
}

/** The two assemblies that never move. */
export const MOVE_BASIS = { grund: [0, 0, 0], luft: [0, 0, 0] };

/**
 * The recorder of a build script with its `put` (the group set last owns the next part) and `gruppe`.
 * A group belongs to the assembly of the same name unless `PIECE_OF` says another.
 */
export function zeichner({ P, PIECE_OF = {}, MOVE, fensterId = "fenster-rohr" }) {
  const R = A.recorder(P);
  let GRUPPE = "grund";
  const gruppe = (g) => { GRUPPE = g; };
  function put(pos, svg, shapes = [], extra = {}) {
    const { bias = 0, gruppe: gr = GRUPPE, name = gr, clip = false, hub = false, schieber: istSchieber = false, ...rest } = extra;
    const piece = PIECE_OF[gr] ?? gr;
    let inhalt = svg;
    if (hub) inhalt = `<g data-hub>${inhalt}</g>`;
    if (istSchieber) inhalt = `<g data-schieber>${inhalt}</g>`;
    if (clip) inhalt = `<g data-clip="1" clip-path="url(#${clip === true ? fensterId : clip})">${inhalt}</g>`;
    R.put({
      name: R.nameFor(name), piece, label: piece, move: MOVE[piece],
      at: pos, pos, bias, gruppe: gr, clip, svg: inhalt, shapes, ...rest,
    });
  }
  return { R, rec: R.solid, put, gruppe };
}

/** What every cylinder page leaves unexplained on purpose in the audit. */
export const AUDIT_BASIS = {
  allow: [
    ["rohr.wand", "kolben.scheibe"],
    ["rohr.wand", "stange.innen"],
    ["rohr.wand", "luft.kammern"],
    // Coaxial parts that genuinely interlock: a rod through a gland, a spool in its bore.
    // No drawing order is "right" for these; they are cut, not biased.
    ["kopf.deckel", "stange.aussen"],
    ["stange.aussen", "grund.last"],
    ["gehaeuse.koerper", "schieber.kolben"],
    ["boden.anschluss", "leitung.A*"],
    // A hose plugged into a fitting is a joint, and the fitting sits on the body.
    ["gehaeuse.koerper", "leitung.*"],
  ],
  // Where a hose ends IS a joint — it plugs into the fitting on the body.
  crowd: [["leitung.A", "gehaeuse.oben"], ["leitung.A", "leitung.V"]],
  // Both rod drawings are clipped to what is actually visible — the markup box is the
  // whole rod, the recorded shape only the part on screen.
  cover: ["stange.aussen", "stange.innen"],
};

export function zylinderTeile({ P, MOVE, M, PIECE_OF, ...eigener }) {
  const { R, put, gruppe } = eigener.R ? eigener : zeichner({ P, PIECE_OF, MOVE });
  const rec = R.solid;
  const at = (p) => k.iso(p, P);
  const SV = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);

  // --- Feet and rail: the machine stands on its own mounts ---------------
  function grundplatte({ fuss, fussZ, schiene, fussGruppe = "grund" }) {
    gruppe(fussGruppe);
    for (const x of fuss) {
      const bett = { x: x - 17, y: -50, w: 34, d: 100, r: 3 };
      const steg = { x: x - 12, y: -42, w: 24, d: 84, r: 2 };
      put([x, 0, fussZ / 2], [
        `<path class="iso-halo" d="${k.haloOf(bett, 0, 9, P)}"/>`,
        SV(k.slabOf(bett, 0, 9, P, 3, 0.7), { tone: "lo" }),
        L(k.planOutline(k.insetPlan(bett, 6), 9, P), { tone: "faint" }),
        D(k.corners(bett, 8).map(([cx, cy]) => at([cx, cy, 9])), { size: 0.5 }),
        SV(k.slabOf(steg, 9, fussZ - 9, P, 3, 0.6), { tone: "mid" }),
        L(k.planOutline(k.insetPlan(steg, 5), fussZ, P), { tone: "faint" }),
        D([at([x, -32, fussZ]), at([x, 32, fussZ])], { size: 0.5 }),
      ].join(""), [
        rec(A.slab(bett, 0, 9, { name: "grund.bett", ground: true })),
        rec(A.slab(steg, 9, fussZ - 9, { name: "grund.steg" })),
      ], { name: "grund.fuss", bias: -500 });
    }

    gruppe("grund");
    const bett = { x: schiene.x - 8, y: schiene.y - 10, w: schiene.w + 16, d: schiene.d + 20, r: 4 };
    put([schiene.x + schiene.w / 2, 0, 5], [
      `<path class="iso-halo" d="${k.haloOf(bett, 0, 8, P)}"/>`,
      SV(k.slabOf(bett, 0, 8, P, 4, 0.7), { tone: "lo" }),
      SV(k.slabOf(schiene, 8, 9, P, 3, 0.5), { tone: "mid" }),
      L(k.planOutline(k.insetPlan(schiene, 7), 17, P), { tone: "faint" }),
      D([schiene.x + 26, schiene.x + schiene.w / 2, schiene.x + schiene.w - 26]
        .flatMap((x) => [at([x, -22, 17]), at([x, 22, 17])]), { size: 0.45, tone: "lo" }),
    ].join(""), [
      rec(A.slab(bett, 0, 8, { name: "grund.schienenbett", ground: true })),
      rec(A.slab(schiene, 8, 9, { name: "grund.schiene" })),
    ], { name: "grund.schiene", bias: -500 });
  }

  // --- The load: built at stroke 0 and translated by the runtime ---------
  function lastschlitten({ x, hw, d, h, F, rStange }) {
    const plan = { x, y: -d / 2, w: hw * 2, d, r: 4 };
    const block = [
      `<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 4), 17, 0.1, P)}" style="filter:blur(5px)"/>`,
      SV(G.disc(x - 15, x, 13, F, P, { steps: 6 }), { tone: "mid" }),
      SV(k.slabOf(plan, 17, h, P, 4, 0.9), { tone: "hi" }),
      L(k.planOutline(k.insetPlan(plan, 8), 17 + h, P), { tone: "faint" }),
      L(k.sideSeam(plan, 17 + h - 15, P, 4), { tone: "faint" }),
      D(k.corners(plan, 11).map(([cx, cy]) => at([cx, cy, 17 + h])), { size: 0.55 }),
    ].join("");
    gruppe("grund");
    put([x + hw, 0, 17 + h / 2], block,
      [rec(A.slab({ x, y: -d / 2, w: hw * 2, d, r: 4 }, 17, h, { name: "grund.last" })),
        rec(A.ring(F, x - 15, x, rStange, 13, { name: "grund.mutter" }))],
      { name: "grund.last", hub: true, bias: 40 });
  }

  // --- The valve on its sub-base ----------------------------------------
  // Cut at the plane of its spool: the half towards the viewer is taken off, so
  // the spool and its sealing discs sit on the cut face where they can be seen.
  function ventil({ x: VX, y: VY, z: VZ, halbbreite: V_HW, rBohrung: R_BOHRUNG, rSchieber: R_SCHIEBER,
    port: PORT, oben: ARBEIT, unten: ABLUFT, winkel: WINKEL, sockelH: SOCKEL_H, scheiben: mitten }) {
    ventilLage = { y: VY, z: VZ, halbbreite: V_HW, port: PORT };
    const FV = G.frameOf([0, VY, VZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const hoch = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    gruppe("gehaeuse");
    const koerper = { x: VX[0], y: VY - V_HW, w: VX[1] - VX[0], d: V_HW, r: 3 };
    const sockel = { x: VX[0] - 6, y: VY - V_HW - 3, w: VX[1] - VX[0] + 12, d: V_HW + 25, r: 2 };
    const PY_ = VY - V_HW / 2;          // centre line of the half that is left
    const teile = [
      `<path class="iso-halo" d="${k.haloOf(sockel, 0, SOCKEL_H, P)}"/>`,
      SV(k.slabOf(sockel, 0, SOCKEL_H, P, 4, 0.8), { tone: "lo" }),
      L(k.planOutline(k.insetPlan(sockel, 6), SOCKEL_H, P), { tone: "faint" }),
      SV(k.slabOf(koerper, SOCKEL_H, VZ + 20 - SOCKEL_H, P, 3, 0.9), { tone: "mid" }),
      L(k.planOutline(k.insetPlan(koerper, 5), VZ + 20, P), { tone: "faint" }),
      // The bore, seen end-on on the cut face at both ends of the body.
      L(SCH.bogenPfad(FV, VX[0], R_BOHRUNG, Math.PI / 2, (3 * Math.PI) / 2, P, 20), { tone: "faint" }),
      L(SCH.bogenPfad(FV, VX[1], R_BOHRUNG, Math.PI / 2, (3 * Math.PI) / 2, P, 20), { tone: "faint" }),
      // The bore as a channel: the far inner half of the cylinder, shaded, so
      // the spool sits in it instead of being stuck on the outside.
      SCH.flaeche(
        SCH.flaechenstueck(FV, VX[0], VX[1], R_BOHRUNG, SCH.naechsterWinkel(FV, P) + Math.PI / 2,
          SCH.naechsterWinkel(FV, P) + (3 * Math.PI) / 2, P, 20),
        [0, -1, 0], P,
      ),
      L(k.segment([VX[0], VY, VZ + R_BOHRUNG], [VX[1], VY, VZ + R_BOHRUNG], P), { tone: "lo" }),
      L(k.segment([VX[0], VY, VZ - R_BOHRUNG], [VX[1], VY, VZ - R_BOHRUNG], P), { tone: "lo" }),
    ];
    // Only the working ports and the supply get a boss on top. The exhaust
    // ways run down through the sub-base, the way a sub-base valve really does
    // it — which also keeps the top clear for the hoses.
    const gerade = (nr) => !(nr in WINKEL);       // a port without an elbow stands straight
    for (const nr of ARBEIT) {
      const x = PORT[nr];
      const F = hoch(x, PY_);
      const hoehe = gerade(nr) ? 42 : 38;
      teile.push(SV(G.disc(VZ + 20, VZ + hoehe, 7, F, P), { tone: "mid" }));
      teile.push(L(G.arcOf(F, VZ + 26, 7, P), { tone: "faint" }));
      teile.push(k.faceTextSvg(k.topMatrix([x - 5, PY_ - 15], VZ + 20.2, P), String(nr), { size: 11, tone: "mid" }));
      teile.push(L(k.segment([x, VY, VZ + R_BOHRUNG], [x, VY, VZ + 20], P), { tone: "faint", free: true }));
      if (gerade(nr)) {
        teile.push(L(G.circleOf(F, VZ + 42, 4.4, P), { tone: "faint" }));
        continue;
      }
      // An elbow: the hose leaves along the valve, not towards the viewer.
      const FW = G.frameOf([x, PY_, VZ + 29], [WINKEL[nr], 0, 0], [0, 1, 0], [0, 0, 1]);
      teile.push(SV(G.disc(6.6, 20, 6, FW, P), { tone: "mid" }));
      teile.push(L(G.circleOf(FW, 20, 4.2, P), { tone: "faint" }));
      teile.push(L(G.arcOf(FW, 15, 6, P), { tone: "faint" }));
    }
    for (const nr of ABLUFT) {
      const x = PORT[nr];
      // The drilling from the bore down into the sub-base, on the cut face.
      teile.push(L(k.segment([x, VY, VZ - R_BOHRUNG], [x, VY, SOCKEL_H / 2], P), { tone: "faint", free: true }));
      teile.push(k.faceTextSvg(k.sideMatrix([x - 5, VY], VZ - R_BOHRUNG - 4, P, "right"), String(nr), { size: 10, tone: "mid" }));
    }
    // The bosses are drawn, so they are recorded: a hose has to end on a part.
    const stutzen = ARBEIT.flatMap((nr) => {
      const x = PORT[nr];
      if (gerade(nr)) return [rec(A.disc(hoch(x, PY_), VZ + 20, VZ + 42, 7, { name: `gehaeuse.stutzen${nr}` }))];
      const FW = G.frameOf([x, PY_, VZ + 29], [WINKEL[nr], 0, 0], [0, 1, 0], [0, 0, 1]);
      return [
        rec(A.disc(hoch(x, PY_), VZ + 20, VZ + 38, 7, { name: `gehaeuse.stutzen${nr}` })),
        rec(A.disc(FW, 6.6, 20, 6, { name: `gehaeuse.winkel${nr}` })),
      ];
    });
    put([(VX[0] + VX[1]) / 2, PY_, VZ], teile.join(""), [
      ...stutzen,
      rec(A.slab(sockel, 0, SOCKEL_H, { name: "gehaeuse.sockel", ground: true })),
      rec(A.slab(koerper, SOCKEL_H, VZ - (R_BOHRUNG - 0.3) - SOCKEL_H, { name: "gehaeuse.unten" })),
      rec(A.slab(koerper, VZ + R_BOHRUNG - 0.3, 20 - R_BOHRUNG + 0.3, { name: "gehaeuse.oben" })),
    ], { name: "gehaeuse.koerper" });

    // The spool: a shaft with sealing discs, one between each pair of
    // neighbouring ports. Sliding it by one port width swaps every connection.
    gruppe("schieber");
    put([(VX[0] + VX[1]) / 2, VY, VZ], [
      SV(G.disc(VX[0] + 4, VX[1] - 4, R_SCHIEBER, FV, P), { tone: "hi" }),
      ...mitten.map((x) => SV(G.disc(x - 5.5, x + 5.5, R_BOHRUNG - 0.3, FV, P), { tone: "hi" })),
      ...mitten.map((x) => L(G.arcOf(FV, x, R_BOHRUNG - 0.3, P), { tone: "faint" })),
      ...mitten.map((x) => L(G.circleOf(FV, x - 5.5, R_BOHRUNG - 0.3, P), { tone: "faint" })),
    ].join(""), [rec(A.disc(FV, VX[0] + 4, VX[1] - 4, R_BOHRUNG - 0.3, { name: "schieber.kolben" }))],
      { name: "schieber.kolben", bias: 40, schieber: true });

    // Push button one end, return spring the other.
    gruppe("betaetigung");
    const FB = G.frameOf([0, VY, VZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put([VX[1] + 16, VY, VZ], [
      SV(G.disc(VX[1], VX[1] + 10, 13, FB, P), { tone: "mid" }),
      SV(G.disc(VX[1] + 10, VX[1] + 24, 10, FB, P), { tone: "hi" }),
      L(G.ribsOf(FB, VX[1] + 11, VX[1] + 23, 10, 18, P, { seams: true }), { tone: "faint" }),
      L(G.circleOf(FB, VX[1] + 24, 10, P), { tone: "lo" }),
    ].join(""), [rec(A.disc(FB, VX[1], VX[1] + 24, 13, { name: "betaetigung.taster" }))],
      { name: "betaetigung.taster", bias: 40 });
    // The cap is short enough for the spring to show: a spring buried in its own
    // housing is drawn over it and its ends land on nothing.
    const feder = k.coil(VX[0] - 18, VX[0], [VY, VZ], 8, 6, "x", P);
    put([VX[0] - 14, VY, VZ], [
      SV(G.disc(VX[0] - 30, VX[0] - 18, 12, FB, P), { tone: "mid" }),
      L(G.ribsOf(FB, VX[0] - 29, VX[0] - 19, 12, 16, P, { seams: true }), { tone: "faint" }),
      L(G.circleOf(FB, VX[0] - 18, 8, P), { tone: "faint" }),
      L(feder.back, { tone: "lo" }),
      SV(G.disc(VX[0] - 18, VX[0] + 4, R_SCHIEBER, FB, P), { tone: "mid" }),
      L(feder.front, { tone: "lo" }),
      L(G.circleOf(FB, VX[0], 8, P), { tone: "faint" }),
    ].join(""), [
      rec(A.disc(FB, VX[0] - 30, VX[0] - 18, 12, { name: "betaetigung.kappe" })),
      rec(A.disc(FB, VX[0] - 18, VX[0] + 4, R_SCHIEBER, { name: "betaetigung.stift" })),
    ], { name: "betaetigung.feder", bias: 40 });
  }

  // --- Hoses and the supply line -----------------------------------------
  function schlaeuche(wege, { radius, versorgung = "V" }) {
    const bahnen = {};
    gruppe("leitung");
    for (const [name, punkte] of Object.entries(wege)) {
      bahnen[name] = punkte;
      R.route(`leitung.${name}`, punkte, radius, { piece: "leitung", move: MOVE.leitung, free: [true, true] });
      tubePieces(punkte, radius, P, { maxLength: 60 }).forEach((teil, i) => {
        put(teil.mid, tubeSvg(teil, { tone: "lo" }), [A.tube(teil.points, teil.radii)],
          { name: `leitung.${name}:${i}`, route: `leitung.${name}`, chunk: i });
      });
    }
    // Where the figure's air comes from: a coupling on a post, so the supply
    // line ends on a real part instead of in mid-air.
    const ende = wege[versorgung][wege[versorgung].length - 1];
    const fuss = { x: ende[0] - 20, y: ende[1] - 20, w: 40, d: 40, r: 3 };
    const F = G.frameOf([ende[0], ende[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put([ende[0], ende[1], 16], [
      `<path class="iso-halo" d="${k.haloOf(fuss, 0, 7, P)}"/>`,
      SV(k.slabOf(fuss, 0, 7, P, 3, 0.6), { tone: "lo" }),
      SV(G.disc(7, 22, 9, F, P), { tone: "mid" }),
      SV(G.disc(22, 34, 12, F, P), { tone: "hi" }),
      L(G.ribsOf(F, 23, 33, 12, 16, P, { seams: true }), { tone: "faint" }),
      L(G.circleOf(F, 34, 12, P), { tone: "lo" }),
      L(G.circleOf(F, 34, 5, P), { tone: "faint" }),
    ].join(""), [
      rec(A.slab(fuss, 0, 7, { name: "leitung.kupplungsfuss", ground: true })),
      rec(A.disc(F, 7, 34, 12, { name: "leitung.kupplung" })),
    ], { name: "leitung.kupplung", bias: 40 });
    return bahnen;
  }

  // --- Window tube, rod, end of the build ---------------------------------
  const NAH = M ? SCH.naechsterWinkel(M.FZ, P) : 0;
  const FENSTER = [NAH - 1.52, NAH + 1.10];
  let ventilLage = null;
  let STANGEN_CLIP = "";

  /** The tube, cut open over a window: the window's clip, edges and the bore as seen through it. */
  function rohr() {
    gruppe("rohr");
    const { FZ, X_ROHR, RA, RB, ZC } = M;
    const f = SCH.fenster(FZ, X_ROHR[0], X_ROHR[1], RA, RB, FENSTER[0], FENSTER[1], P, { name: "rohr" });
    const profil = [[X_ROHR[0], RB], [X_ROHR[0], RA], [X_ROHR[1], RA], [X_ROHR[1], RB]];
    put([(X_ROHR[0] + X_ROHR[1]) / 2, 0, ZC], [
      SV(G.lathe(profil, FZ, P, { rims: "all" }), { tone: "mid" }),
      `<g clip-path="url(#${f.id})">${f.bohrung}</g>`,
      f.kanten,
      f.saum,
    ].join(""), [rec(A.ring(FZ, X_ROHR[0], X_ROHR[1], RB, RA, { name: "rohr.wand" }))],
      { name: "rohr.wand" });
    return f;
  }

  /**
   * The rod: one body, seen inside the tube through the window, free outside the head,
   * and the load carriage on its tip. `ab` is where the rod starts (the piston's front face).
   */
  function stange({ ab, last }) {
    const { FZ, X_ROHR, X_KOPF, RS, ZC, HUB, SPITZE0 } = M;
    gruppe("stange");
    put([(ab + X_ROHR[1]) / 2, 0, ZC],
      SV(G.disc(ab, X_ROHR[1] + HUB, RS, FZ, P), { tone: "hi" }),
      [rec(A.disc(FZ, ab, X_ROHR[1], RS, { name: "stange.innen" }))],
      { name: "stange.innen", clip: true, hub: true });
    const stab = G.rodOut(FZ, X_KOPF[1], SPITZE0, RS, P, { stroke: HUB });
    STANGEN_CLIP = `<clipPath id="stange-clip"><path d="${stab.clip}"/></clipPath>`;
    put([(X_KOPF[1] + SPITZE0) / 2, 0, ZC], [
      SV(stab.paths, { tone: "hi" }),
      L(G.arcOf(FZ, SPITZE0 - 24, RS, P), { tone: "faint" }),
    ].join(""), [rec(A.disc(FZ, X_KOPF[1], SPITZE0, RS, { name: "stange.aussen" }))],
      { name: "stange.aussen", bias: 30, hub: true, clip: "stange-clip" });
    if (last) lastschlitten({ x: SPITZE0, hw: last.hw, d: last.d, h: last.h, F: FZ, rStange: RS });
  }

  /**
   * Depth order, the air layer, the exploded view and the air routes. `FINFO` is the window
   * (from `rohr`), `bahnen` the hoses' points (from `schlaeuche`), `nachSettle` what a page
   * has to put right after the depth solver has run, `abluft` the numbers of the ports that
   * leave through the sub-base.
   */
  function abschluss({ FINFO, bahnen, abluft, W, H, nachSettle = () => {} }) {
    A.settle(R, P);
    nachSettle();

    // A cutaway the depth solver cannot know about: the tube's near wall really is
    // in front of the piston, so `settle` paints it over everything inside — right
    // for an uncut tube, wrong here, because that wall is what the window removes.
    // The tube is therefore pushed behind every item clipped to the window; outside
    // the window those items are clipped away, so the wall still covers what it should.
    {
      const innen = R.items.filter((it) => it.clip);
      const rohrItem = R.items.find((it) => it.name === "rohr.wand");
      if (rohrItem && innen.length) rohrItem.key = Math.min(rohrItem.key, ...innen.map((it) => it.key)) - 0.5;
    }

    // The air sits in the bore: in front of the tube's far wall, behind the piston
    // and the rod. Its key is set from those, not from the tube's.
    const LUFT_KEY = Math.min(...R.items.filter((it) => it.clip).map((it) => it.key)) - 0.2;
    R.items.push({
      key: LUFT_KEY, piece: "luft", gruppe: "luft", label: "luft", name: "luft.kammern", pos: null,
      svg: `<g data-clip="1" clip-path="url(#${FINFO.id})">`
        + `<path class="kammer" data-kammer="a" d=""/><path class="kammer" data-kammer="b" d=""/></g>`,
    });

    R.items.sort((a, b) => a.key - b.key);

    const ansicht = EX.vorbereiten(R, P, MOVE, W, H);

    // The air routes, projected once: the page places particles along them.
    const BAHNEN = Object.fromEntries(
      Object.entries(bahnen).map(([name, punkte]) => [name, LU.bahn(punkte, P, k.iso)]),
    );
    // Short routes from the valve body out through the sub-base.
    const { y: VY, z: VZ, halbbreite: V_HW, port: PORT } = ventilLage;
    const SOCKEL_VORN = VY - V_HW - 3 + V_HW + 25;
    for (const nr of abluft) {
      const x = PORT[nr];
      BAHNEN[`E${nr}`] = LU.bahn(
        [[x, VY, VZ], [x, VY, 9], [x, SOCKEL_VORN - 6, 9], [x, SOCKEL_VORN + 24, 9]], P, k.iso,
      );
    }
    return { ...ansicht, BAHNEN, P, MOVE, M };
  }

  /** The drawing: every item in its group, the window's and the rod's clip in the defs. */
  function figur({ W, H, label, FINFO }) {
    return k.figureSvg({
      width: W,
      height: H,
      label,
      body: [
        `<defs>${FINFO.defs}${STANGEN_CLIP}</defs>`,
        R.items.map((it) => `<g data-g="${it.gruppe}" data-piece="${it.piece}"${it.feder ? ` data-feder="${it.feder.join(" ")}"` : ""}>${it.svg}</g>`).join(""),
        `<g class="luft" data-luftlage></g>`,
      ],
    });
  }

  /** The report and the two checks: --apart (everything at the end of its way) and --audit. */
  function ende({ ziel, zusatz = [], allow = [], crowd = [], cover = [] }) {
    console.log(`geschrieben: ${ziel}`);
    for (const zeile of zusatz) console.log(zeile);
    console.log(`Teile: ${R.items.length}, Körper: ${R.solids.length}, Rohre: ${R.tubes.length}`);
    console.log(`Fenster ${(FENSTER[0] * 57.3).toFixed(0)}°…${(FENSTER[1] * 57.3).toFixed(0)}° (nächster Winkel ${(NAH * 57.3).toFixed(0)}°)`);

    if (process.argv.includes("--apart")) {
      // Everything at the end of its escape path: do the assemblies pass through
      // one another on the way out? The explode is not handed to the depth solver
      // (it cannot order a body this dense), so this is checked on its own.
      for (const shape of R.solids) shape.move = MOVE[shape.piece] ?? [0, 0, 0];
      const probleme = A.solidClearances(R.solids, { state: 1 });
      for (const p of probleme.slice(0, 20)) {
        console.log(`  ${p.a ?? p.one ?? ""} × ${p.b ?? p.two ?? ""}  ${JSON.stringify(p).slice(0, 150)}`);
      }
      console.log(probleme.length ? `auseinandergefahren: ${probleme.length} Durchdringungen` : "auseinandergefahren: sauber");
      if (probleme.length) process.exit(1);
    }

    if (process.argv.includes("--audit")) {
      A.auditOrExit(R, P, {
        allow: [...AUDIT_BASIS.allow, ...allow],
        crowd: [...AUDIT_BASIS.crowd, ...crowd],
        cover: [...AUDIT_BASIS.cover, ...cover],
      });
    }
  }

  /** The supply hose: from the valve's port 1 up, over to a coupling in front of the valve. */
  function versorgung(PORT) {
    const { y: VY, z: VZ, halbbreite: V_HW } = VENTIL_STANDARD;
    return schlauch([PORT[1], VY - V_HW / 2, VZ + 42], AUF, [PORT[1] - 96, VY + 86, 34], AUF, 190, 170);
  }

  /**
   * The rod's gland in the head: a bush of radius 17 and 9 mm that the rod goes through. Returns
   * the lines to put into the head's `put` (`svg`) and a function that records its body (`koerper`).
   */
  function buchse() {
    const { FZ, X_KOPF, RS } = M;
    return {
      svg: [
        SV(G.disc(X_KOPF[1], X_KOPF[1] + 9, 17, FZ, P), { tone: "mid" }),
        L(G.circleOf(FZ, X_KOPF[1] + 9, RS + 1.4, P), { tone: "faint" }),
        L(G.circleOf(FZ, X_KOPF[1] + 9, 13, P), { tone: "faint" }),
      ],
      // recorded when called, so the bodies keep the order the build script lists them in
      koerper: () => [rec(A.ring(FZ, X_KOPF[1], X_KOPF[1] + 9, RS, 17, { name: "kopf.buchse" }))],
    };
  }

  /**
   * An air port on a cap: the boss out of the cap's rim (radius `rand`) along y at x, where the hose
   * plugs in. The current group owns it; `name` is the body's name for the audit.
   */
  function anschluss(x, rand, name) {
    const F = M.quer(x, M.ZC);
    put([x, rand + 8, M.ZC], [
      SV(G.disc(rand, rand + 8, 8, F, P), { tone: "mid" }),
      SV(G.disc(rand + 8, rand + 15, 6.5, F, P, { steps: 6 }), { tone: "mid" }),
      L(G.arcOf(F, rand + 4, 8, P), { tone: "faint" }),
      L(G.circleOf(F, rand + 15, 4.4, P), { tone: "faint" }),
    ].join(""), [
      rec(A.disc(F, rand, rand + 15, 8, { name })),
    ], { name });
  }

  return { R, rec, put, gruppe, grundplatte, lastschlitten, ventil, schlaeuche, rohr, stange, abschluss, figur, ende, versorgung, buchse, anschluss, NAH, FENSTER, SV, L };
}
