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
// before it: `P` (projection), `MASSE` (cylinder description), `svg`, and from
// the page the lets `zustand`, `druck`, `angehalten` where the functions below
// read them (only `zustandSetzen` and `figurGrundstock` do).
// It defines:
//   hubTeile, schieberTeile     the elements with data-hub (ride with the piston)
//                               and data-schieber (the valve spool)
//   teileVerschieben(weg, schieber, schieberWeg)
//                               move both groups: weg in mm along the axis; the
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

export const LAUFZEIT = String.raw`
const hubTeile = Array.from(svg.querySelectorAll("[data-hub]"));
const schieberTeile = Array.from(svg.querySelectorAll("[data-schieber]"));

function teileVerschieben(weg, schieber, schieberWeg) {
  const t = translateAlong(P, [weg, 0, 0]);
  for (const el of hubTeile) el.setAttribute("transform", t);
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
