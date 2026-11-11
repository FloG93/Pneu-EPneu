// What every section page has in common besides its drawing: the control bar, the
// companion block with the symbol, the page's own style rules, the live script
// (constants, includes, the frame, the readout, the automatic cycle, the particles of the
// hoses, the half sections that become whole parts, the hub of the moving part that goes
// home while the valve is taken apart, the handle for the browser test) and the
// writing of the file. The throttle check valve page and the shuttle valve page use it;
// neither keeps a copy. It knows no valve: the page says what moves, which rooms and
// streams there are, how a frame of its model is drawn and what the readout says.
//
// Node side:
//   leiste(vorn, { zeitlupe })  the control bar: `vorn` (the page's own buttons and sliders), the
//                           slow-motion slider (when `zeitlupe`, the start factor, is given), the automatic
//                           button, "Zerlegen und zusammenbauen", the house controls
//   regler(html)            one slider as a unit that stays together when the bar wraps
//   schaltzeichenBlock({ svg, text })   the companion block "Schaltzeichen" beside the card
//   lebendSkript({...})     the live script as source (see below)
//   seiteSchreiben({...})   page, style, file
//   CSS                     style rules every section page needs
//
// The live script (`lebendSkript`) lays out, in this order: the constants, the elements, the
// model files, figur/explode.mjs, figur/legende.mjs, figur/luft.mjs, the symbol runtimes,
// figur/bedienung.mjs, LAUFZEIT below, then the page's own code (`eigenes`).
//
// LAUFZEIT expects, defined by the constants: `P MOVE ORDER SPR TAKT KEYS LIFT VIEW0 VIEW1 MITTE
// STEP FARBEN BAHNEN SEITE_VON ANZAHL VORNE SKALA AUTO_TAKT RAUM_DECKUNG`, and the elements `stage svg groups
// readout info still`. It defines `komma`, `angehalten`, `lagen`, `raeume`, `luftLage`, `luftHinten`,
// `stroeme`, `symbole`, `bed`, `knopfAuto`, `zeitlupe`, `hubAnteil`, `zeichneHub`, `zeichneAnzeige`, `zeichneLagen`,
// `setzeRaumFarben`, `luftStroeme`, `zeichneBedienung`, `zeichneModell`, `bildZeichnen`, `stoppeAuto`, `bedient`,
// `stelleFest`, `vorDemZerlegen` and `figurStarten`.
// And it expects the page to define, before it calls any of them:
//   seiteAutoSchritt()        one automatic step (the page flips what the cycle flips)
//   seiteAutoStart()          optional: the automatic cycle starts (at the load, when the cycle is on, and at every
//                             click that switches it on): the page puts its cycle back to its first step
//   seiteBedienung()          the page's own buttons and sliders show the state (the automatic button is drawn here)
//   modellSchritt(dm)         advance the model by dm s of model time
//   zeichneLuft(dm, dt)       the rooms' tones and the streams (setzeRaumFarben, luftStroeme): dm is the model's time of
//                             this frame (0 while it stands), dt the frame's real time (a page that wants its particles to
//                             run in slow motion uses dm, one that wants them to be seen uses dt)
//   zeichneStets()            what is drawn in every frame, apart or together (symbol, detail panel)
//   hubMarke(anteil)          a string that changes when the moving part has to be drawn again;
//                             `anteil` 0…1 is how much of its travel it still shows (0 while apart)
//   hubStellen(anteil)        put the moving part where the model says, times `anteil`
//   anzeigeText()             the readout text
// The functions are embedded as text into the page's classic script, so the text holds no
// backtick and every top-level name must be unique there.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as EX from "./explode.mjs";
import * as LEG from "./legende.mjs";
import * as LU from "./luft.mjs";
import { LAUFZEIT as BEDIENUNG_LAUFZEIT } from "./bedienung.mjs";
import { SCHNITT_CSS } from "./normteile.mjs";
import { seite, knopf, hausBedienung, modulQuelle, zeitlupeSchieber, ZEITLUPE_LAUFZEIT } from "./seite.mjs";

/** One slider as a unit with its label, so a bar that wraps on a phone keeps label, slider and value together. */
export const regler = (html) => `<span class="regler">${html}</span>`;

/**
 * The control bar: the page's own controls, the slow-motion slider when `zeitlupe` (the factor the page
 * starts with) is given, then automatic, take apart, and the house controls.
 */
export const leiste = (vorn, { zeitlupe = null } = {}) => vorn
  + (zeitlupe ? regler(zeitlupeSchieber(zeitlupe)) : "")
  + knopf("btn-auto", "Automatik", { gedrueckt: true })
  + knopf("btn-explode", "Zerlegen und zusammenbauen")
  + `<span class="luecke"></span>` + hausBedienung();

/** The block beside the card: the symbol with its explanation. */
export const schaltzeichenBlock = ({ svg, text }) => `<p class="beifigur-titel">Schaltzeichen</p>`
  + `<div class="beifigur-symbol">${svg}</div>`
  + `<p class="beifigur-text">${text}</p>`;

/** The readout of two lines, and the two views of a turned part: the half section blends out when it has left. */
export const CSS = `[data-readout] { white-space: pre-line; text-align: left }
[data-lage="ganz"] { opacity: 0; pointer-events: none }
.iso { --schnitt-b: #9a8e78 }
.iso[data-theme="light"] { --schnitt-b: #968a74 }
.iso-svg .iso-shade[data-schnitt="b"][data-shade] { fill: var(--schnitt-b) }
/* The readout has two lines and wraps on a phone: it grows upwards from the corner and would lie on the hint there */
@media (max-width: 640px) { .iso-plate-corner[data-corner="hint"] { display: none } }`;

/**
 * A part of rubber, drawn whole (a ring, a body): every shade of the solid takes the strong ink colour
 * in steps, so it reads as black rubber in the light mode like the half section's dark fill does.
 * Put the part in a group of the class `gummi`.
 */
export const GUMMI_CSS = [0, 1, 2, 3].map((n, i) => {
  const f = `color-mix(in srgb, var(--anatomy-strong) ${100 - i * 9}%, var(--anatomy-paper))`;
  return `.gummi .iso-shade[data-shade="${n}"], .gummi .iso-solid[data-seamless]>.iso-shade[data-shade="${n}"] { fill: ${f}; stroke: ${f} }`;
}).join("\n")
  + `\n.gummi .tb-body { fill: color-mix(in srgb, var(--anatomy-strong) 82%, var(--anatomy-paper)) }`
  + `\n.gummi .tb-shine { fill: color-mix(in srgb, var(--anatomy-strong) 62%, var(--anatomy-paper)) }`
  + `\n.gummi .tb-shade { fill: var(--anatomy-strong) }`
  + `\n.gummi .iso-top, .gummi .iso-fill, .gummi .iso-solid[data-seamless]>.iso-top { fill: color-mix(in srgb, var(--anatomy-strong) 58%, var(--anatomy-paper)); stroke: none }`;

const runde = (v) => Math.round(v * 10) / 10;

/**
 * The live script as source. `ansicht` is what `schnittTeile().ansicht` returned; `modelle` the model
 * files the page computes with (as for `modulQuelle`), `symbole` the runtimes of its symbols,
 * `konstanten` its own constants as source, `eigenes` its own code.
 *   raumDeckung  how opaque the air in a room is (default 0,82; the page's style says the same)
 *   SKALA  { tempo, tempoMax, bezug }: a stream's speed is `tempo` per l/min up to `tempoMax`, its
 *          strength 0,3 … 1 reaches full at `bezug` l/min
 */
export function lebendSkript({
  wurzel, P, MOVE, STAGGER, ansicht, LEGENDE, BAHNEN, SEITE_VON, ANZAHL, VORNE, SKALA, AUTO_TAKT, raumDeckung = 0.82,
  modelle, symbole = [], konstanten = "", eigenes,
}) {
  const { KEYS, LIFT, VIEW0, VIEW1, MITTE } = ansicht;
  return `
const P = ${JSON.stringify(P)};
const MOVE = ${JSON.stringify(MOVE)};
const ORDER = ${JSON.stringify(STAGGER)};
const SPR = ${JSON.stringify(EX.SPRING)};
const TAKT = ${JSON.stringify(EX.TAKT)};
const KEYS = ${JSON.stringify(KEYS)};
const LIFT = ${JSON.stringify(LIFT)};
const VIEW0 = ${JSON.stringify(VIEW0)};
const VIEW1 = ${JSON.stringify(VIEW1.map(runde))};
const MITTE = ${JSON.stringify(Object.fromEntries(Object.entries(MITTE).map(([a, b]) => [a, b.map(runde)])))};
const STEP = ${JSON.stringify(LEG.tabelle(LEGENDE))};
const FARBEN = ${JSON.stringify(LU.FARBEN)};
const BAHNEN = ${JSON.stringify(BAHNEN)};
const SEITE_VON = ${JSON.stringify(SEITE_VON)};
const ANZAHL = ${JSON.stringify(ANZAHL)};
const VORNE = ${JSON.stringify(VORNE)};
const SKALA = ${JSON.stringify(SKALA)};
const AUTO_TAKT = ${AUTO_TAKT};    // s between two automatic steps
const RAUM_DECKUNG = ${raumDeckung};    // how opaque the air in a room is
${konstanten}

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = Array.from(svg.querySelectorAll("[data-g]"));
const readout = document.querySelector("[data-readout]");
const info = document.querySelector(".pickinfo");
const still = matchMedia("(prefers-reduced-motion: reduce)");

${modulQuelle(wurzel, modelle)}
${EX.LAUFZEIT}
${LEG.LAUFZEIT}
${EX.ABLAUF}
${LU.LAUFZEIT}
${symbole.join("\n")}
${BEDIENUNG_LAUFZEIT}
${ZEITLUPE_LAUFZEIT}
${LAUFZEIT}
${eigenes}
`;
}

export const LAUFZEIT = String.raw`
const komma = (x) => String(x).replace(".", ",");
let angehalten = false;
let hubAnteil = 1;                    // goes to 0 while the valve is taken apart: the moving parts stand home

const lagen = Array.from(svg.querySelectorAll("[data-lage]"));
const raeume = Array.from(svg.querySelectorAll("[data-raum]"));
const luftLage = svg.querySelector("[data-luftlage]");
const luftHinten = svg.querySelector("[data-luftlage-hinten]");
const stroeme = {};
for (const name in BAHNEN) stroeme[name] = stromBauen(VORNE.includes(name) ? luftLage : luftHinten, name, BAHNEN[name], ANZAHL[name]);
const symbole = Array.from(document.querySelectorAll(".beifigur-symbol svg"));
const knopfAuto = document.getElementById("btn-auto");

// The automatic cycle is figur/bedienung.mjs: every AUTO_TAKT s of model time one step.
const bed = bedienungSignale({
  namen: [],
  impuls: 0,
  autoTakt: AUTO_TAKT,
  autoAn: !still.matches,
  erster: "R",
  haltenModus: () => false,
  setzeSignal: () => {},
  autoSchritt: () => seiteAutoSchritt(),
  autoEnde: () => {},
  autoAnzeige: (an) => knopfAuto.setAttribute("aria-pressed", String(an)),
  geaendert: () => { angehalten = false; zeichneBedienung(); run(); },
});
// The automatic button, then whatever else the page shows of its controls.
function zeichneBedienung() {
  knopfAuto.setAttribute("aria-pressed", String(bed.auto));
  seiteBedienung();
}
const stoppeAuto = () => { bed.autoAus(); };
// The cycle starts from the page's first step.
function autoStarten() {
  bed.autoStart("R");
  if (typeof seiteAutoStart === "function") seiteAutoStart();
}

// A hand on a control: optionally stops the cycle, wakes the model, draws the controls, restarts the loop.
function bedient(autoStoppen) {
  if (autoStoppen) stoppeAuto();
  angehalten = false;
  zeichneBedienung();
  run();
}
// A known state for the browser test: the cycle stops, the model stands still, the moving part is drawn again.
function stelleFest() {
  stoppeAuto();
  angehalten = true;
  gezeichnet = "";
}
knopfAuto.addEventListener("click", () => {
  if (bed.auto) bed.autoAus(); else autoStarten();
  bedient(false);
});

// The moving part: drawn only when its mark changes.
let gezeichnet = "";
function zeichneHub() {
  const marke = hubMarke(hubAnteil);
  if (marke === gezeichnet) return;
  gezeichnet = marke;
  hubStellen(hubAnteil);
}

// Every turned part: its half section while it sits in place, the whole part once it has left.
function zeichneLagen() {
  for (const el of lagen) {
    const x = spr[el.closest("[data-g]").dataset.piece]?.x ?? 0;
    const ganz = Math.min(1, Math.max(0, x * 6));
    const wert = el.dataset.lage === "ganz" ? ganz : 1 - ganz;
    if (el.dataset.stand !== String(wert)) { el.style.opacity = String(wert); el.dataset.stand = String(wert); }
  }
}

function zeichneAnzeige() {
  schreibeAnzeige(anzeigeText());
}
// The model's frame: the moving part, the air, the readout.
function zeichneModell(dm, dt = dm) {
  zeichneHub();
  zeichneLuft(dm, dt);
  zeichneAnzeige();
}

// Particle speed and strength follow the flow of the way they run on (l/min, signed: a negative flow runs
// the other way and counts with its size).
const tempoVon = (q) => Math.sign(q) * Math.min(SKALA.tempoMax, Math.abs(q) * SKALA.tempo);
const staerkeVon = (q) => (Math.abs(q) > 0.5 ? Math.min(1, 0.3 + (0.7 * Math.abs(q)) / SKALA.bezug) : 0);
// Move every stream by its own flow in strecke[name]; lauf is -1 to run them all backwards. A stream whose
// particles are all transparent is hidden as a whole.
function luftStroeme(dt, farbe, strecke, lauf = 1) {
  for (const name in stroeme) {
    stromSchritt(stroeme[name], dt, lauf * tempoVon(strecke[name]), staerkeVon(strecke[name]), farbe[SEITE_VON[name]]);
  }
  blendeLeereStroeme();
}

// One frame (the loop itself is EX.ABLAUF).
function bildZeichnen(dt, offen, bewegt) {
  luftLage.style.opacity = String(Math.max(0, 1 - offen * 3));
  luftHinten.style.opacity = String(Math.max(0, 1 - offen * 3));
  for (const el of raeume) {
    if (offen > 0.001) el.style.opacity = (RAUM_DECKUNG * Math.max(0, 1 - offen * 3)).toFixed(3);
    else el.style.removeProperty("opacity");
  }
  const willHub = Math.max(0, 1 - offen * 2);
  if (Math.abs(willHub - hubAnteil) > 1e-4) { hubAnteil = willHub; gezeichnet = ""; }
  // The valve stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    const dm = angehalten ? 0 : dt / zeitlupe;
    if (dm > 0) {
      bed.takt(dm);
      modellSchritt(dm);
    }
    zeichneModell(dm, dt);
  } else {
    zeichneHub();
    haltStroeme(dt);
  }
  zeichneLagen();
  zeichneStets();
}

// Before taking it apart: no automatic cycle; the moving parts go home by themselves (hubAnteil).
function vorDemZerlegen() { stoppeAuto(); }

// The first picture, once the page has defined its own functions, and the handle for the browser test and
// for screenshots; eigenes are the page's own entries.
function figurStarten(eigenes) {
  zeitlupeBinden();
  if (bed.auto && typeof seiteAutoStart === "function") seiteAutoStart();
  zeichneBedienung();
  zeichneModell(0);
  zeichneLagen();
  zeichneStets();
  poseExplode();
  window.__figur = Object.assign({
    zerlegt: () => zerlegt,
    offen: () => offenAnteil(),
    weiter: () => { angehalten = false; run(); },
    spiele,
    waehle,
  }, eigenes);
}
`;

/**
 * Page, style, file. `css` is the page's own style rules; `SCHNITT_CSS` (the section tone) comes after.
 * `ziel` is the file; `legende` the legend's entries (the buttons are made here); every other key is passed on to
 * `seite()` of figur/seite.mjs. Default: "Bild 1", 1240 px wide, the aside labelled "Schaltzeichen".
 */
export function seiteSchreiben({ ziel, css, legende, fig = "Bild 1", breite = 1240, beiFigurLabel = "Schaltzeichen", ...optionen }) {
  mkdirSync(dirname(ziel), { recursive: true });
  const html = seite({ fig, breite, beiFigurLabel, legende: LEG.knoepfe(legende), ...optionen }).replace("</style>", `${css}${SCHNITT_CSS}</style>`);
  writeFileSync(ziel, html);
}
