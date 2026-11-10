// What the cylinder pages have in common at run time besides their drawing:
// sliding the parts that ride with the piston (and the valve's spool), the
// chamber fill by pressure, the air-stream sizes from the model's conductances,
// the automatic cycle's clock, setting the model into a known state and the
// base of the browser test's handle `window.__figur`. The double-acting and the
// single-acting cylinder both use it; neither keeps a copy.
// It knows no cylinder: the page owns its state (`zustand`, `druck`, `angehalten`),
// its chambers and its readout, and says in each call what it needs.
//
// LAUFZEIT is inlined as source after the models (figur/ventil.mjs,
// figur/pneumatik.mjs) and the runtimes of figur/explode.mjs, figur/legende.mjs
// and figur/luft.mjs, and before the page's own script. It expects, defined
// before it:
//   `P` (projection), `MASSE` (cylinder description), `svg`
//   from the model (figur/pneumatik.mjs, figur/ventil.mjs): `UMGEBUNG`, `leitwerte`, `ruht`
//   from figur/luft.mjs: `mische`
//   from figur/explode.mjs: `translateAlong`, `offenAnteil`, `zerlegt`, `spiele`
//   from figur/legende.mjs: `waehle`
//   from the page: the lets `zustand`, `druck`, `angehalten` (read by `zustandSetzen` and
//   `figurGrundstock` only; they are called after the page has defined them)
// It defines:
//   hubTeile, schieberTeile     the elements with data-hub (ride with the piston)
//                               and data-schieber (the valve spool)
//   (federTeile, federnVerschieben: figur/normteile.mjs FEDER_LAUFZEIT) the pieces of a return spring that is compressed
//                               with the stroke: the piston end follows, the head end stands
//   teileVerschieben(weg, schieber, schieberWeg)
//                               move both groups (and compress a spring): weg in mm along the axis; the
//                               spool by (schieber - 0.5) * 2 * schieberWeg
//   druckAnteil(p, druck)       0…1, how far above ambient chamber pressure p is
//   kammerFuellen(el, p, druck, F)   colour a chamber path between exhaust and pressure blue
//   kammerFluesse(z, druck)     { qA, qB }, the air flow into each chamber in mm³/s
//                               from the model's conductances (negative = out)
//   stromTempo(q), stromKraft(q)    particle speed and strength for a flow q
//   takteNeu(), automatikTakt(z, dt, druck)
//                               the automatic cycle: after a rest of 0.8 s throw the valve
//   zustandSetzen(z, weg, stellung, druck)   put the model into a settled state
//   figurGrundstock(zusatz)     the object for `window.__figur`; `zusatz` adds the page's own
// The functions are embedded as text into the page's classic script, so the
// text holds no backtick and every top-level name must be unique there.

import { writeFileSync } from "node:fs";
import { seite, knopf, schieber, hausBedienung, modulQuelle } from "./seite.mjs";
import * as EX from "./explode.mjs";
import * as LEG from "./legende.mjs";
import * as LU from "./luft.mjs";
import { VENTIL_STANDARD } from "./zylinderteile.mjs";
import { FEDER_LAUFZEIT } from "./normteile.mjs";

export const LAUFZEIT = `${FEDER_LAUFZEIT}\n` + String.raw`
const hubTeile = Array.from(svg.querySelectorAll("[data-hub]"));
const schieberTeile = Array.from(svg.querySelectorAll("[data-schieber]"));

// The return spring between the piston and the head is compressed by federnVerschieben
// (figur/normteile.mjs): the piston end follows the piston, the head end stands still.
function teileVerschieben(weg, schieber, schieberWeg) {
  const t = translateAlong(P, [weg, 0, 0]);
  for (const el of hubTeile) el.setAttribute("transform", t);
  federnVerschieben(weg, "b");
  const ts = translateAlong(P, [(schieber - 0.5) * 2 * schieberWeg, 0, 0]);
  for (const el of schieberTeile) el.setAttribute("transform", ts);
}

const druckAnteil = (p, druck) => Math.max(0, Math.min(1, (p - UMGEBUNG) / Math.max(0.2, druck)));
function kammerFuellen(el, p, druck, F) {
  el.setAttribute("fill", mische(F.abluft, F.druck, druckAnteil(p, druck)));
}

function kammerFluesse(z, druck) {
  const q = UMGEBUNG + druck;
  const l = leitwerte(z, MASSE);
  return {
    qA: l.aZu * (q - z.pA) + l.aAb * (UMGEBUNG - z.pA),
    qB: l.bZu * (q - z.pB) + l.bAb * (UMGEBUNG - z.pB),
  };
}
// Particle speed and strength for a flow q, tuned for conductances near 3.2e5 mm³/s per bar
// (the 5/2 page's cylinder). A path that is far wider, like the ESNU's exhaust (1e7), would
// sit at the clamp for the whole stroke: such a page scales q down itself and must not reuse
// these constants as they are. Streams that do not come from a conductance (the vent filter
// of a single-acting cylinder) take their flow from the piston: z.v · annulus area.
const stromTempo = (x) => Math.max(-260, Math.min(260, x * 2.4e-4));
const stromKraft = (x) => Math.max(0, Math.min(1, Math.abs(x) / 2.2e5));

let zyklus = 0;
function takteNeu() { zyklus = 0; }
function automatikTakt(z, dt, druck) {
  zyklus += dt;
  if (zyklus > (ruht(z, MASSE, druck) ? 0.8 : 1e9)) {
    z.stellung = z.stellung === "ausfahren" ? "einfahren" : "ausfahren";
    zyklus = 0;
  }
}

function zustandSetzen(z, weg, stellung, druck) {
  z.weg = weg;
  z.v = 0;
  if (stellung) {
    z.stellung = stellung;
    z.schieber = stellung === "ausfahren" ? 1 : 0;
    const voll = UMGEBUNG + druck;
    z.pA = stellung === "ausfahren" ? voll : UMGEBUNG;
    z.pB = stellung === "ausfahren" || MASSE.einfach ? UMGEBUNG : voll;
  }
}

function figurGrundstock(zusatz) {
  return {
    zustand, MASSE,
    druck: () => druck,
    offen: () => offenAnteil(),
    zerlegt: () => zerlegt,
    spiele,
    waehle,
    weiter: () => { angehalten = false; },
    ...zusatz,
  };
}
`;

/**
 * The frame of a cylinder page: the model's state, the two chambers and the air layer,
 * the stroke, the readout, the frame the shared loop (EX.ABLAUF) calls and the pressure
 * slider. Embedded after LAUFZEIT. It expects from the page's script, which comes after it:
 *   modellSchritt(dt)    advance the model by what this frame is worth; returns the model time
 *                        the air is drawn with
 *   zeichneLuft(dm)      colour the chambers, move the particles
 *   anzeigeText(a)       the readout line from the model's `anzeige`
 *   vorStelle()          the page stops what would move the model (the automatic cycle)
 *   nachStelle()         (optional) whatever else the page draws after the model was put in a state
 *   nachBild(dt, offen)  (optional) whatever else a frame draws
 * and from the build (seitenSkript): ZUSTAND0, SCHIEBER_WEG, KOLBEN0, KB, X_ROHR, BAHNEN.
 * It defines `zustand`, `druck`, `angehalten`, `kammerA`, `kammerB`, `luftLage`, `stroeme`,
 * `knopfAuto`, `zeichneHub`, `zeichneKammern`, `zeichneAnzeige`, `stelleZustand`, `seitenStart`.
 */
export const RAHMEN = String.raw`
const zustand = neuerZustand(MASSE, ZUSTAND0);
let druck = 6;
let angehalten = false;

const kammerA = svg.querySelector('[data-kammer="a"]');
const kammerB = svg.querySelector('[data-kammer="b"]');
const luftLage = svg.querySelector("[data-luftlage]");
const stroeme = {};
for (const name in BAHNEN) stroeme[name] = stromBauen(luftLage, name, BAHNEN[name], name === "V" ? 5 : 9);

// While the machine comes apart the stroke runs back to zero: the parts in the
// bore would otherwise carry it on top of their escape path, and their numbers
// would point at where they are not.
let hubAnteil = 1;
function zeichneHub() {
  const weg = zustand.weg * hubAnteil;
  teileVerschieben(weg, zustand.schieber, SCHIEBER_WEG);
  const vorn = KOLBEN0 + weg;
  kammerA.setAttribute("d", kammerPfad(X_ROHR[0] + 1, vorn));
  kammerB.setAttribute("d", kammerPfad(vorn + KB, X_ROHR[1] - 1));
}

let letzteZeile = "";
function zeichneAnzeige() {
  const text = anzeigeText(anzeige(zustand, MASSE, druck));
  if (text !== letzteZeile) { readout.textContent = text; letzteZeile = text; }
}

// The two chambers in the tone of their pressure; returns the colours for the streams.
function zeichneKammern() {
  const F = luftFarben();
  kammerFuellen(kammerA, zustand.pA, druck, F);
  kammerFuellen(kammerB, zustand.pB, druck, F);
  return F;
}

// One frame (the loop itself is EX.ABLAUF).
function bildZeichnen(dt, offen, bewegt) {
  const willHub = Math.max(0, 1 - offen * 2);
  if (Math.abs(willHub - hubAnteil) > 1e-4) { hubAnteil = willHub; zeichneHub(); }
  luftLage.style.opacity = String(Math.max(0, 1 - offen * 3));
  for (const el of [kammerA, kammerB]) el.style.opacity = String(Math.max(0, 1 - offen * 3));
  // The machine stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    const dm = modellSchritt(dt);
    zeichneHub();
    zeichneLuft(dm);
    zeichneAnzeige();
  } else {
    for (const s of Object.values(stroeme)) stromSchritt(s, dt, 0, 0, "#000");
  }
  if (typeof nachBild === "function") nachBild(dt, offen);
}

const knopfAuto = document.getElementById("btn-auto");
const druckRegler = document.getElementById("druck");
const druckWert = document.getElementById("druck-wert");
druckRegler.addEventListener("input", () => {
  druck = druckRegler.valueAsNumber;
  angehalten = false;
  druckWert.textContent = druck.toFixed(1).replace(".", ",") + " bar";
  zeichneAnzeige();
  run();
});

// The model put into a known state and drawn at once.
function stelleZustand(weg, stellung) {
  angehalten = true;
  zustandSetzen(zustand, weg, stellung, druck);
  zeichneHub();
  zeichneLuft(0.016);
  zeichneAnzeige();
}

// First drawing, and the handle for the browser test and for screenshots: it can put the
// figure into a known state instead of waiting and hoping to catch the right moment.
function seitenStart(zusatz) {
  zeichneHub();
  zeichneAnzeige();
  poseExplode();
  window.__figur = figurGrundstock({
    stelle(weg, stellung) {
      vorStelle();
      stelleZustand(weg, stellung);
      if (typeof nachStelle === "function") nachStelle();
    },
    ...zusatz,
  });
}
`;

/**
 * The page's script: the constants of the build, the model files and the shared runtimes,
 * LAUFZEIT and RAHMEN, then `seite` (the page's own code). `ansicht` is what
 * `abschluss` of figur/zylinderteile.mjs returns (view, air routes, projection, dimensions).
 *   zusatzLaufzeit  more runtimes the page's own code uses (before LAUFZEIT)
 *   konstanten      more `const` lines for the page
 */
export function seitenSkript({ wurzel, STAGGER, LEGENDE, ansicht, KB, zustand0, zusatzLaufzeit = "", konstanten = "", seite: eigenes }) {
  const { KEYS, LIFT, VIEW0, VIEW1, MITTE, BAHNEN, P, MOVE, M } = ansicht;
  const Z = M.Z;
  return `
const MASSE = ${JSON.stringify(Z)};
const P = ${JSON.stringify(P)};
const MOVE = ${JSON.stringify(MOVE)};
const ORDER = ${JSON.stringify(STAGGER)};
const SPR = ${JSON.stringify(EX.SPRING)};
const TAKT = ${JSON.stringify(EX.TAKT)};
const KEYS = ${JSON.stringify(KEYS)};
const LIFT = ${JSON.stringify(LIFT)};
const VIEW0 = ${JSON.stringify(VIEW0)};
const VIEW1 = ${JSON.stringify(VIEW1.map((v) => Math.round(v * 10) / 10))};
const MITTE = ${JSON.stringify(Object.fromEntries(Object.entries(MITTE).map(([a, b]) => [a, b.map((v) => Math.round(v * 10) / 10)])))};
const STEP = ${JSON.stringify(LEG.tabelle(LEGENDE))};
const FARBEN = ${JSON.stringify(LU.FARBEN)};
const BAHNEN = ${JSON.stringify(BAHNEN)};
const RB = ${M.RB}, RS = ${M.RS}, ZC = ${M.ZC}, HUB = ${M.HUB};
const KOLBEN0 = ${M.KOLBEN0}, KB = ${KB};
const X_ROHR = ${JSON.stringify(M.X_ROHR)}, X_KOPF = ${JSON.stringify(M.X_KOPF)};
const SCHIEBER_WEG = ${VENTIL_STANDARD.schieberWeg};
const ZUSTAND0 = ${JSON.stringify(zustand0)};
${konstanten}

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = Array.from(svg.querySelectorAll("[data-g]"));
const readout = document.querySelector("[data-readout]");
const info = document.querySelector(".pickinfo");
const still = matchMedia("(prefers-reduced-motion: reduce)");

${modulQuelle(wurzel, ["figur/ventil.mjs", "figur/pneumatik.mjs"])}
${EX.LAUFZEIT}
${LEG.LAUFZEIT}
${EX.ABLAUF}
${LU.LAUFZEIT}
${zusatzLaufzeit}
${LAUFZEIT}
${RAHMEN}
${eigenes}
`;
}

/** The control bar every cylinder page has: its own first buttons, automatic, take apart, sliders. */
export function leiste({ vorn, zeitlupe = "" }) {
  return vorn
    + knopf("btn-auto", "Automatik", { gedrueckt: true })
    + knopf("btn-explode", "Zerlegen und zusammenbauen")
    + `<span class="luecke"></span>`
    + zeitlupe
    + schieber("druck", "Druck", { min: 2, max: 8, step: 0.5, wert: 6, einheit: " bar", beschreibung: "Betriebsdruck in bar" })
      .replace(">6 bar</output>", ">6,0 bar</output>")
    + hausBedienung();
}

/** The card's key to the colours, the one line that differs being the pale blue's. */
export const schluessel = (blass) => [
  { mark: "blue", label: "Kräftiges Blau: Druckluft auf dem Weg in die Kammer" },
  { mark: "dotted", label: blass },
  { mark: "lit", label: "Kolben, Kolbenstange und Steuerschieber – was sich bewegt" },
  { mark: "dim", label: "Das Zylinderrohr ist aufgeschnitten, das Ventil an der Schieberebene" },
];

/** The page around the drawing; `css` is the style the page adds to the shared sheet, `lesetext` the text below the card. */
export function seitenHtml({ blass, LEGENDE, css = LU.CSS, lesetext, ...rest }) {
  const text = `<div class="lesetext">${lesetext}\n<a class="zurueck" href="../">← Zurück zur Übersicht</a>\n</div>`;
  return seite({ fig: "Bild 1", schluessel: schluessel(blass), legende: LEG.knoepfe(LEGENDE), lesetext: text, ...rest })
    .replace("</style>", `${css}</style>`);
}

/** Write the page. */
export const schreibe = (ziel, html) => writeFileSync(ziel, html);
