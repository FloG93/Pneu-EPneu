// What every directional-valve page has in common besides its drawing: the
// control bar's three sliders, the slide of the spool with its rings, pistons
// and spring, the readout line, the symbol beside the card, and the sliders'
// behaviour. The 5/2 and the 3/2 page both use it; neither keeps a copy.
// It knows no valve: the page says which ports its readout names and how its
// switching time is simulated, and draws its own air and pilot chambers.
//
// Exports:
//   reglerLeiste({ handBeschreibung })  the row of the three sliders (slow motion, spool by hand,
//                    pressure), each one unit with its label, as markup
//   CSS              the style rules the valve pages share (the symbol beside
//                    the card, the control bar, variant switching)
//   LAUFZEIT         page runtime, inlined as source after the model
//                    (figur/ventil.mjs), figur/schaltzeichen.mjs' SYMBOL_LAUFZEIT
//                    and figur/explode.mjs
//
// LAUFZEIT expects, defined before it: `MASSE`, `HUB`, `P`, `svg`, `readout`
// and `still`. It defines `komma`, `druck`, `zeitlupe`, `angehalten`,
// `zeichneHub`, `zeichneAnzeige`, `zeichneHandRegler`, `zeichneSymbol` and
// `bindeRegler`.
// And it expects the page to define, before it calls any of them:
//   v                   the valve state (figur/ventil.mjs)
//   ANSCHLUESSE         working ports the readout names, e.g. ["2", "4"]
//   schaltzeitOptionen()  options for ventilSchaltzeit: { art, bauart, impuls }
//   zeichneKammern(s)   draw the pilot chambers for the spool travel s in mm
//   stoppeAuto(), run() stop the automatic cycle; restart the frame loop
//   raeume, luftLage, stroeme, bed, zeichneLuft(dt), zeichneBedienung()   air and signals
// It defines `bildZeichnen` and `blende` too: the frame the shared loop (EX.ABLAUF) calls,
// and the helpers every page's zeichneLuft uses (`luftTon`, `entlueftet`, `luftTempo`,
// `steuerStrom`, `steuerRaus`; `setzeRaumFarben` and `blendeLeereStroeme` come from figur/luft.mjs).
// The functions are embedded as text into the page's classic script, so the
// text holds no backtick and every top-level name must be unique there.

import { schieber, zeitlupeSchieber, ZEITLUPE_LAUFZEIT } from "./seite.mjs";
import { CSS as LUFT_CSS, FARBEN } from "./luft.mjs";
import { SCHNITT_CSS, FEDER_LAUFZEIT } from "./normteile.mjs";
import { SYMBOL_CSS } from "./schaltzeichen.mjs";

/** The three sliders as one unit each, so a bar that wraps on a phone keeps label, slider and value together. */
export function reglerLeiste({ handBeschreibung = "Schieber von Hand: 0 % ist die Ruhestellung, 100 % die betätigte Stellung" } = {}) {
  return [
    zeitlupeSchieber(),
    schieber("hand", "Schieber von Hand", { min: 0, max: 100, step: 1, wert: 0, einheit: " %", beschreibung: handBeschreibung }),
    schieber("druck", "Druck", { min: 2, max: 8, step: 0.5, wert: 6, einheit: " bar", beschreibung: "Versorgungsdruck in bar" })
      .replace(">6 bar</output>", ">6,0 bar</output>"),
  ].map((r) => `<span class="regler">${r}</span>`).join("");
}

/** The shared style rules of a valve page: air, section tone, symbol, control bar. */
export const CSS = `${LUFT_CSS}${SCHNITT_CSS}${SYMBOL_CSS}
[data-variante][hidden] { display: none }
.iso { --sz-strich: var(--anatomy-strong); --sz-stark: ${FARBEN.dark.druck}; --sz-blass: ${FARBEN.dark.abluft} }
.iso[data-theme="light"] { --sz-stark: ${FARBEN.light.druck}; --sz-blass: ${FARBEN.light.abluft} }
.beifigur-titel { margin: 0; font-size: 12.5px; font-weight: 600; color: var(--anatomy-strong) }
.beifigur-symbol .sz-symbol { display: block; width: 100%; height: auto; margin: 10px 0 12px }
.beifigur-text { margin: 0; font-size: 12.5px; line-height: 1.55 }
.leiste .umbruch { flex-basis: 100%; height: 0 }
.leiste .regler { display: inline-flex; align-items: center; gap: 9px; margin-right: 14px; white-space: nowrap }
.playbtn:disabled { cursor: not-allowed; color: var(--anatomy-text); border-style: dashed; box-shadow: none }
`;

export const LAUFZEIT = `${FEDER_LAUFZEIT}\n${ZEITLUPE_LAUFZEIT}\n` + String.raw`
const komma = (x) => x.toFixed(1).replace(".", ",");
let druck = 6;
let angehalten = false;

const hubTeile = Array.from(svg.querySelectorAll("[data-hub]"));

// The spool with its rings and pistons slides; the spring is compressed piece
// by piece, each in proportion to its distance from the fixed end wall.
let gezeichnet = null;
function zeichneHub() {
  const s = v.anteil * HUB;
  if (gezeichnet !== null && Math.abs(s - gezeichnet) < 1e-4) return;
  gezeichnet = s;
  const t = s > 1e-4 ? translateAlong(P, [s, 0, 0]) : null;
  for (const el of hubTeile) {
    if (t) el.setAttribute("transform", t);
    else el.removeAttribute("transform");
  }
  federnVerschieben(s, "b");
  zeichneKammern(s);
}

// The last measured switching time; until there is one, the time this
// pressure and this type give, computed once per change.
let rechenZeit = { druck: null, schluessel: null, wert: null };
function zeichneAnzeige() {
  let a;
  if (v.schaltzeit === null) {
    const wie = schaltzeitOptionen();
    const schluessel = JSON.stringify(wie);
    if (rechenZeit.druck !== druck || rechenZeit.schluessel !== schluessel) {
      rechenZeit = { druck, schluessel, wert: ventilSchaltzeit(MASSE, druck, wie) };
    }
    a = ventilAnzeige(Object.assign({}, v, { schaltzeit: rechenZeit.wert }), MASSE, druck);
  } else a = ventilAnzeige(v, MASSE, druck);
  const text = ANSCHLUESSE.map((w) => "p" + w + " " + komma(a.drucke[w]) + " bar").join(" · ")
    + " · Schaltzeit " + (a.schaltzeitMs === null ? "–" : a.schaltzeitMs) + " ms";
  schreibeAnzeige(text);
}

// The hand slider follows the spool unless a hand holds it.
const handRegler = document.getElementById("hand");
const handWert = document.getElementById("hand-wert");
function zeichneHandRegler() {
  if (v.hand === null) {
    const w = String(Math.round(v.anteil * 100));
    if (handRegler.value !== w) { handRegler.value = w; handWert.textContent = w + " %"; }
  }
}

const symbole = Array.from(document.querySelectorAll(".beifigur-symbol"));
// Slides the visible symbol with the spool and colours its open paths.
function zeichneSymbol() {
  const sym = symbole.find((el) => !el.hidden);
  if (sym) symbolStellen(sym.querySelector("svg"), v.anteil, wegeOffen(v.anteil, MASSE.ueberdeckung));
}

// Slow motion, the spool by hand, the supply pressure.
function bindeRegler() {
  const druckRegler = document.getElementById("druck");
  const druckWert = document.getElementById("druck-wert");
  zeitlupeBinden();
  handRegler.addEventListener("input", () => {
    stoppeAuto();
    vonHand(v, handRegler.valueAsNumber / 100);
    handWert.textContent = handRegler.value + " %";
    angehalten = false;
    run();
  });
  druckRegler.addEventListener("input", () => {
    druck = druckRegler.valueAsNumber;
    // The last measured time belonged to the old pressure.
    v.schaltzeit = null;
    angehalten = false;
    druckWert.textContent = komma(druck) + " bar";
    zeichneAnzeige();
    run();
  });
}

// --- air and frame loop ----------------------------------------------------
// The page defines raeume (its rooms, [data-raum]), luftLage (the layer of
// particles), stroeme (name -> stream), bed (the signal buttons),
// zeichneLuft(dt) and zeichneBedienung().

// Strong blue above 0,5 bar, pale blue while a room is being vented, else empty.
const luftTon = (F, p, raus) => (p - AUSSEN > 0.5 ? F.druck : raus ? F.abluft : "none");
// A room is vented while a path to the exhaust is open and it still holds air.
const entlueftet = (offen, p) => offen > 0 && p - AUSSEN > 0.02;
// Speed follows conductance times pressure difference; a shut path shows nothing.
const luftTempo = (q) => Math.max(-600, Math.min(600, q * 2.6e-4));

// The pilot lines are thin, so the same flow runs through them faster. The
// factor is the working path's conductance over the pilot filling path's
// (3,2e5 / 8e4 = 4): a filling pilot line shows its particles at the speed a
// working line would at the same pressure difference. Drawing only; the model
// does not read it.
const STEUER_TEMPO = MASSE.leitwertZu / MASSE.leitwertSteuer;
// A pilot chamber is vented while its signal is off and it still holds air.
const steuerRaus = (an, p) => !an && p - AUSSEN > 0.02;
// The stream of a pilot line: filling while the signal is on, venting after it;
// stumm for a line that does not exist in this state of the figure.
function steuerStrom(name, dt, an, p, quelle, F, stumm) {
  const leit = an ? MASSE.leitwertSteuer : MASSE.leitwertEntlueft;
  const q = leit * ((an ? quelle : AUSSEN) - p);
  const staerke = stumm ? 0 : an ? 1 : Math.max(0, Math.min(1, (p - AUSSEN) / 0.3));
  stromSchritt(stroeme[name], dt, luftTempo(q * STEUER_TEMPO), staerke, an ? F.druck : F.abluft);
}

function blende(sicht) {
  luftLage.style.opacity = String(sicht);
  for (const el of raeume) {
    if (sicht < 1) el.style.opacity = (0.82 * sicht).toFixed(3);
    else el.style.removeProperty("opacity");
  }
}
// One frame; the loop itself is EX.ABLAUF.
function bildZeichnen(dt, offen, bewegt) {
  blende(Math.max(0, 1 - offen * 3));
  // The valve stops while it is being taken apart and carries on afterwards.
  if (offen < 0.01 && !bewegt) {
    const dm = angehalten ? 0 : dt / zeitlupe;
    if (dm > 0) {
      bed.takt(dm);
      ventilSchritt(v, MASSE, dm, druck);
    }
    zeichneHub();
    zeichneLuft(dm);
    zeichneAnzeige();
    zeichneBedienung();
  } else {
    haltStroeme(dt);
  }
  zeichneSymbol();
}
`;
