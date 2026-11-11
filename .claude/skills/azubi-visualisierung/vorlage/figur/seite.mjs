// The page every component figure is served on: the control bar, the card,
// the legend, the explanation line and the prose underneath — plus the boot
// script that sets theme and contrast *before* the first paint, so the drawing
// never flashes once in the wrong step.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import { TONE_CSS, TONE_TABELLE, K_DEFAULT } from "./toene.mjs";
import { CSS as LEGENDE_CSS } from "./legende.mjs";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const SONNE =
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4'
  + 'M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOND = '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>';
const themaBild = (dunkel) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"`
  + ` stroke-linejoin="round" aria-hidden="true">${dunkel ? SONNE : MOND}</svg>`
  + `<span>${dunkel ? "Hell" : "Dunkel"}</span>`;

/** A push button in the control bar. */
export const knopf = (id, text, { gedrueckt = false, titel } = {}) =>
  `<button type="button" class="playbtn" id="${esc(id)}" aria-pressed="${gedrueckt}"`
  + `${titel ? ` title="${esc(titel)}"` : ""}>${esc(text)}</button>`;

/** A labelled slider in the control bar. */
export const schieber = (id, text, { min, max, step, wert, einheit = "", beschreibung }) =>
  `<label class="ctrlab" for="${esc(id)}">${esc(text)}</label>`
  + `<input class="ctrrange" type="range" id="${esc(id)}" min="${min}" max="${max}" step="${step}"`
  + ` value="${wert}" aria-label="${esc(beschreibung ?? text)}" aria-describedby="${esc(id)}-wert">`
  + `<output class="ctrwert" id="${esc(id)}-wert" for="${esc(id)}">${wert}${esc(einheit)}</output>`;

/** The slow-motion slider: 1 = real time, n = model time at 1/n (`start` is the factor the page begins with). */
export const zeitlupeSchieber = (start = 1) => {
  const html = schieber("zeitlupe", "Zeitlupe", { min: 1, max: 50, step: 1, wert: start, einheit: "×", beschreibung: "Zeitlupe: Modellzeit geteilt durch diesen Wert" });
  return start === 1 ? html : html.replace(`>${start}×</output>`, `>1/${start}</output>`);
};

/**
 * Runtime of the slow-motion slider, inlined as source: `zeitlupe` is the factor the page divides its model
 * time by; `zeitlupeBinden()` reads the slider (when the page has one) and follows it.
 */
export const ZEITLUPE_LAUFZEIT = String.raw`
let zeitlupe = 1;
function zeitlupeBinden() {
  const regler = document.getElementById("zeitlupe");
  if (!regler) return;
  const wert = document.getElementById("zeitlupe-wert");
  const zeige = () => {
    zeitlupe = regler.valueAsNumber;
    wert.textContent = zeitlupe === 1 ? "1×" : "1/" + zeitlupe;
  };
  regler.addEventListener("input", zeige);
  zeige();
}
`;

const KN = Math.round(K_DEFAULT * 100);

/** Contrast slider and light/dark button: the two every page of the house has. */
export const hausBedienung = () =>
  schieber("kontrast", "Kontrast", { min: 0, max: 100, step: 5, wert: KN, einheit: " %", beschreibung: "Kontrast der Zeichnung" })
  + `<button type="button" class="themebtn" id="btn-theme" aria-label="Auf dunklen Modus umschalten">${themaBild(false)}</button>`;

const SEITEN_CSS = `
${TONE_CSS}
${LEGENDE_CSS}
.leiste { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; margin: 0 0 14px }
.leiste .luecke { margin-left: auto }
.playbtn, .themebtn { font: inherit; font-size: 13px; line-height: 1; min-height: 40px;
  padding: 0 15px; cursor: pointer; border-radius: 9px; color: var(--anatomy-strong);
  background: var(--anatomy-card); border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  box-shadow: var(--anatomy-lift) }
.themebtn { display: inline-flex; align-items: center; gap: 8px; padding: 0 14px }
.themebtn svg { display: block; width: 17px; height: 17px }
.playbtn:hover, .themebtn:hover { border-color: color-mix(in srgb, currentColor 38%, transparent) }
.playbtn:focus-visible, .themebtn:focus-visible { outline: 2px solid var(--anatomy-strong); outline-offset: 2px }
.playbtn[aria-pressed="true"] { color: #f2912f; border-color: color-mix(in srgb, #f2912f 45%, transparent) }
.iso[data-theme="light"] .playbtn[aria-pressed="true"] { color: #9a4c05; border-color: color-mix(in srgb, #9a4c05 45%, transparent) }
.ctrlab, .ctrwert { font-size: 12.5px; color: color-mix(in srgb, currentColor 88%, transparent) }
.ctrwert { min-width: 3.8em; text-align: right; font-variant-numeric: tabular-nums }
.ctrrange { width: clamp(96px, 16vw, 164px); height: 40px; margin: 0; cursor: pointer;
  accent-color: var(--anatomy-strong) }
.ctrrange:focus-visible { outline: 2px solid var(--anatomy-strong); outline-offset: 3px; border-radius: 5px }
@media (max-width: 560px) { .leiste .luecke { margin-left: 0 } }
.lesetext { max-width: 66ch; margin: 26px auto 0; font-size: 14.5px; line-height: 1.68;
  color: color-mix(in srgb, currentColor 90%, transparent) }
.lesetext h2 { font-size: 16px; margin: 22px 0 7px; color: var(--anatomy-strong) }
.lesetext p { margin: 0 0 11px }
.lesetext .formel { font-variant-numeric: tabular-nums; background: var(--anatomy-card);
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 8px;
  padding: 11px 13px; margin: 0 0 11px; font-size: 13.5px; line-height: 1.7 }
.lesetext .hinweis { font-size: 13px; color: color-mix(in srgb, currentColor 72%, transparent) }
.zurueck { display: inline-block; margin: 26px 0 0; font-size: 13px;
  color: color-mix(in srgb, currentColor 80%, transparent) }
/* The corner marks span the whole card, so Chrome's scroll anchoring picks a
   bottom corner as its anchor. When the line under the legend changes length
   the card's bottom moves, the page scrolls by the same amount, and the legend
   jumps under the pointer that just clicked it. A decoration is no anchor. */
.iso-plate-corners { overflow-anchor: none }
`;

/**
 * A companion picture beside the card (a circuit symbol, a table): card and
 * aside share one flex row and stack below 900 px of page width. Only pages
 * that have one carry these rules, so the others stay byte for byte the same.
 */
const BEIFIGUR_CSS = `
.mitbeifigur { display: flex; align-items: flex-start; gap: 18px; margin: 32px 0 36px }
.mitbeifigur > .iso-figure { flex: 1 1 0; min-width: 0; margin: 0 }
.beifigur { flex: 0 0 auto; width: clamp(220px, 24vw, 300px); position: sticky; top: 16px;
  padding: 16px 16px 14px; background: var(--anatomy-card); box-shadow: 0 0 0 1px var(--anatomy-mid);
  color: var(--anatomy-text) }
@media (max-width: 900px) {
  .mitbeifigur { flex-direction: column; align-items: stretch }
  .beifigur { position: static; width: auto; max-width: 300px }
}
`;

/** Runs in the document before the drawing is painted. */
const bootSkript = () => `<script>
(function () {
  var Q = ${JSON.stringify(TONE_TABELLE.quiet)}, S = ${JSON.stringify(TONE_TABELLE.strong)};
  function mix(a, b, t) {
    var out = "#";
    for (var i = 1; i < 7; i += 2) {
      var von = parseInt(a.substr(i, 2), 16);
      var v = Math.round(von + (parseInt(b.substr(i, 2), 16) - von) * t);
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      out += (v < 16 ? "0" : "") + v.toString(16);
    }
    return out;
  }
  // On the body, not in the stylesheet: one step applies to both themes and
  // survives a switch, without loading rules afterwards.
  window.figurKontrast = function (t) {
    var modus = document.body.dataset.theme === "light" ? "light" : "dark";
    for (var n in Q[modus]) document.body.style.setProperty("--anatomy-" + n, mix(Q[modus][n], S[modus][n], t));
  };
  try {
    // Light is the default, like the overview: a machine set to dark showed a
    // page nobody can read in a bright room on a projector.
    if (localStorage.getItem("3d-druck.theme") !== "dark") document.body.dataset.theme = "light";
  } catch (e) { /* ignore */ }
  var t = ${K_DEFAULT};
  try {
    // Number(null) is 0, which once put the slider at 0 instead of 45.
    var gespeichert = parseFloat(localStorage.getItem("3d-druck.kontrast"));
    if (gespeichert >= 0 && gespeichert <= 100) t = gespeichert / 100;
  } catch (e) { /* ignore */ }
  window.figurKontrastWert = t;
  window.figurKontrast(t);
})();
</script>`;

/** Theme and contrast behaviour, shared by every figure. Inlined as source. */
export const HAUS_LAUFZEIT = `
// Writes the readout, only when the text has changed (the page's own readout element).
let anzeigeLetzte = "";
function schreibeAnzeige(text) {
  if (text !== anzeigeLetzte) { readout.textContent = text; anzeigeLetzte = text; }
}
const kontrast = document.getElementById("kontrast");
const kontrastWert = document.getElementById("kontrast-wert");
if (kontrast) {
  kontrast.value = String(Math.round(window.figurKontrastWert * 100));
  kontrastWert.textContent = kontrast.value + " %";
  const stell = (sichern) => {
    window.figurKontrast(kontrast.valueAsNumber / 100);
    kontrastWert.textContent = kontrast.value + " %";
    if (sichern) { try { localStorage.setItem("3d-druck.kontrast", kontrast.value); } catch (e) {} }
  };
  kontrast.addEventListener("input", () => stell(false));
  kontrast.addEventListener("change", () => stell(true));
}
const themaKnopf = document.getElementById("btn-theme");
// Defined before it is used: a function embedded with toString() does not
// carry its free variables, and the order of definitions counts.
const SONNE = ${JSON.stringify(SONNE)};
const MOND = ${JSON.stringify(MOND)};
const themaBild = (dunkel) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'
  + ' stroke-linejoin="round" aria-hidden="true">' + (dunkel ? SONNE : MOND) + '</svg>'
  + '<span>' + (dunkel ? "Hell" : "Dunkel") + '</span>';
function zeigeThema() {
  const dunkel = document.body.dataset.theme !== "light";
  themaKnopf.innerHTML = themaBild(dunkel);
  themaKnopf.setAttribute("aria-label", dunkel ? "Auf hellen Modus umschalten" : "Auf dunklen Modus umschalten");
}
if (themaKnopf) {
  zeigeThema();
  themaKnopf.addEventListener("click", () => {
    const nun = document.body.dataset.theme === "light" ? "dark" : "light";
    document.body.dataset.theme = nun;
    try { localStorage.setItem("3d-druck.theme", nun); } catch (e) {}
    // Recompute the tones: they sit as inline values on the body and would
    // otherwise survive the switch in the wrong mode.
    window.figurKontrast(kontrast ? kontrast.valueAsNumber / 100 : window.figurKontrastWert);
    zeigeThema();
  });
}
`;

/**
 * Assemble the page. `laufzeit` is the component's own JavaScript source; the
 * shared behaviour above is prepended. `beiFigur` is optional markup that
 * stands beside the card in an aside labelled `beiFigurLabel`.
 */
export function seite({
  titel, fig, kartenTitel, hinweis, anzeige, schluessel = [], caption,
  svg, leiste, legende = "", infoText = "", lesetext = "", laufzeit, breite = 1180, buehneLabel,
  beiFigur = "", beiFigurLabel = "Begleitbild",
}) {
  const koerper = k.plateHtml({
    fig, title: kartenTitel, hint: hinweis, readout: anzeige, keys: schluessel, caption,
    body:
      `<div class="iso-stage" tabindex="0" role="application" aria-label="${esc(buehneLabel ?? kartenTitel)}">${svg}</div>`
      + (legende ? `<div class="iso-keys" role="group" aria-label="Legende">${legende}</div>` : "")
      + (infoText ? `<p class="pickinfo" aria-live="polite">${infoText}</p>` : ""),
  });
  const karte = beiFigur
    ? `<div class="mitbeifigur">${koerper}<aside class="beifigur" aria-label="${esc(beiFigurLabel)}">${beiFigur}</aside></div>`
    : koerper;
  return k
    .pageHtml({
      title: titel,
      theme: "dark",
      width: breite,
      body: `<style>${SEITEN_CSS}${beiFigur ? BEIFIGUR_CSS : ""}</style><div class="leiste">${leiste}</div>${karte}${lesetext}`,
      script: kitScript() + HAUS_LAUFZEIT + laufzeit,
    })
    .replace('<html lang="en">', '<html lang="de">')
    .replace("</head>", '<link rel="icon" type="image/svg+xml" href="favicon.svg"></head>')
    .replace(/(<body class="iso" data-theme="dark">)/, `$1${bootSkript()}`);
}

/**
 * Model files as one classic-script text: `import` lines and the `export `
 * prefix are stripped, the files are joined in the order given. The files must
 * therefore not share a top-level name, and list their dependencies first.
 */
export function modulQuelle(wurzel, dateien) {
  return dateien
    .map((datei) => readFileSync(join(wurzel, datei), "utf8")
      .replace(/^import .*;$/gm, "")
      .replace(/^export /gm, ""))
    .join("\n");
}
