// The legend under a figure: one entry per assembly, with its number, its name
// and the sentence that says what it does.
//
// Every figure in the collection shares this, so the texts live in one table
// per component and nothing is written twice: the buttons, the explanation
// line during the take-apart run and the leader-line numbers all read the
// same entries.

/** @typedef {{ nr: string, name: string, satz: string, piece: string }} Eintrag */

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * The legend as a row of buttons. One click flies that assembly out on its own
 * and holds it in orange; hovering only shows it and remembers nothing — those
 * are two different things, and conflating them once made a click undo itself.
 */
export function knoepfe(eintraege) {
  return eintraege
    .map(
      (e) =>
        `<button type="button" class="pickbtn" data-pick="${esc(e.piece)}" aria-pressed="false">`
        + `<span class="picknr">${esc(e.nr)}</span> ${esc(e.name)}</button>`,
    )
    .join("");
}

/** The table the page's runtime reads: number, name and sentence per assembly. */
export function tabelle(eintraege) {
  return Object.fromEntries(eintraege.map((e) => [e.piece, { nr: e.nr, name: e.name, satz: e.satz }]));
}

/**
 * Which legend entry a part counts towards for its number. A part too small to
 * stand on its own rides with its neighbour but keeps its own number, so the
 * legend can have more entries than the explode has assemblies.
 */
export function nummern(eintraege) {
  return Object.fromEntries(eintraege.map((e, i) => [e.piece, i]));
}

export const CSS = `
.iso-keys { display: grid; gap: 7px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); margin: 14px 0 0 }
.pickbtn { font: inherit; font-size: 12px; line-height: 1.3; text-align: left; min-height: 38px;
  padding: 7px 11px; cursor: pointer; border-radius: 8px; color: var(--anatomy-strong);
  background: var(--anatomy-card); border: 1px solid color-mix(in srgb, currentColor 14%, transparent) }
.pickbtn:hover { border-color: color-mix(in srgb, currentColor 36%, transparent) }
.pickbtn:focus-visible { outline: 2px solid var(--anatomy-strong); outline-offset: 2px }
.picknr { font-variant-numeric: tabular-nums; font-weight: 700; margin-right: 5px;
  color: color-mix(in srgb, currentColor 72%, transparent) }
.pickbtn[aria-pressed="true"] { color: #f2912f; border-color: color-mix(in srgb, #f2912f 48%, transparent) }
.pickbtn[aria-pressed="true"] .picknr { color: inherit }
.iso[data-theme="light"] .pickbtn[aria-pressed="true"] { color: #9a4c05; border-color: color-mix(in srgb, #9a4c05 48%, transparent) }
.iso-nums { pointer-events: none }
/* The numbers lie over the drawing, not in it: the outline keeps them readable
   even in front of a light part. Sized from the measured screen width, not
   from the viewBox, or they are 6 px on a phone. */
.iso-nums text { font: 600 20px/1 system-ui, sans-serif; fill: var(--anatomy-hi);
  paint-order: stroke; stroke: var(--anatomy-paper); stroke-width: 4px; stroke-linejoin: round }
.iso-nums line { stroke: var(--anatomy-mid); stroke-width: 1; vector-effect: non-scaling-stroke }
.pickinfo { font-size: 12.5px; line-height: 1.55; margin: 11px 3px 0; min-height: 3.1em; max-width: 68ch;
  color: color-mix(in srgb, currentColor 88%, transparent) }
.iso-stage svg [data-g] { transition: opacity .2s ease }
.iso-stage svg [data-g].dim { opacity: .16 }
/* Chosen parts in the house orange. Fading alone was not enough on a
   projector; the four tones keep their gradient so the form stays readable. */
.iso-stage svg [data-g].mark {
  --anatomy-shade-0: #6b2e04; --anatomy-shade-1: #93400a;
  --anatomy-shade-2: #bb5310; --anatomy-shade-3: #e26a19;
  --anatomy-top: #f98b33; --anatomy-face: #a8490c;
  --anatomy-lit-top: #ffb067; --anatomy-lit-shade: #d1600f;
  --anatomy-faint: #a8551e; --anatomy-lo: #d27b3a;
  --anatomy-mid: #f6a365; --anatomy-hi: #ffd9b8;
}
.iso[data-theme="light"] .iso-stage svg [data-g].mark {
  --anatomy-shade-0: #c25e0a; --anatomy-shade-1: #d86f12;
  --anatomy-shade-2: #ee8322; --anatomy-shade-3: #fb9a42;
  --anatomy-top: #ffb673; --anatomy-face: #f08722;
  --anatomy-lit-top: #ffcd9e; --anatomy-lit-shade: #ee8322;
  --anatomy-faint: #d4813f; --anatomy-lo: #b25f14;
  --anatomy-mid: #8a460a; --anatomy-hi: #4e2605;
}
@media (max-width: 460px) { .iso-keys { grid-template-columns: 1fr } }
`;
