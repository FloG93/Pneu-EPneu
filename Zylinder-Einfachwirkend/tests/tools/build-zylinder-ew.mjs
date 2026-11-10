// A single-acting round cylinder (Festo ESNU-50-25-P-A, Ø 50, stroke 25, return
// spring in the rod chamber, vented through a filter) on the 3/2 valve that
// switches it, as an isometric cutaway with the compressed air visible.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are Festo ESNU Ø 50;
// everything else is an assumption and is listed in the README.
//
// This script holds geometry and four data tables and nothing else: springs,
// depth sorting, legend, air and page shell all come from ../../figur/.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as PN from "../../../figur/pneumatik.mjs";
import * as LU from "../../../figur/luft.mjs";
import { normteile, federPruefen } from "../../../figur/normteile.mjs";
import { zylinderTeile, zylinderMasse, schlauch, ort, MOVE_BASIS, LEINWAND, AUF, VOR, VENTIL_STANDARD } from "../../../figur/zylinderteile.mjs";
import * as ZS from "../../../figur/zylinderseite.mjs";
import * as VS from "../../../figur/ventilseite.mjs";
import { LAUFZEIT as BEDIENUNG_LAUFZEIT } from "../../../figur/bedienung.mjs";
import { wegeventilSymbol, zylinderSymbol, VENTIL_3_2_NC, SYMBOL_LAUFZEIT } from "../../../figur/schaltzeichen.mjs";
import { knopf, schieber } from "../../../figur/seite.mjs";
import { LEGENDE } from "./legende-zylinder-ew.mjs";

const { ZIEL, WURZEL } = ort(import.meta.url);
const { W, H } = LEINWAND;

// --- Dimensions ----------------------------------------------------------
const Z = PN.ESNU_50_25;
const DECKEL = 14;                 // cap thickness (assumption)
const DR = 31;                     // cap radius: round caps, rolled onto the tube (assumption)
const RAGT = 44;                   // rod out of the head at stroke 0, enough for the carriage to clear the head
// 115: a long, soft spring (0,932 N/mm) with room at full stroke
const M = zylinderMasse(Z, { deckel: DECKEL, rohrEnde: 115, ragt: RAGT });
const { RB, RS, RA, HUB, ZC, X_BODEN, X_ROHR, X_KOPF, KOLBEN0, SPITZE0, FZ, quer } = M;
const KB = 18;                     // piston width (assumption)

// Return spring: wire 3 mm, 8 coils, free length 77 mm. At full stroke 52 mm are
// left (block length (8 + 1) * 3 = 27 mm), force 82 N in, 105,3 N out (catalogue).
const FEDER = { draht: 3, windungen: 8, rWindung: 15, laenge: X_ROHR[1] - (KOLBEN0 + KB) };
const FEDER_TEXT = federPruefen(FEDER, HUB, 3);

const FUSS_Z = ZC - DR;
const FUSS = [X_BODEN[0] + DECKEL / 2, X_KOPF[1] - DECKEL / 2];
const LAST_HW = 24;
const LAST_D = 56;
const LAST_H = 38;
const SCHIENE = { x: SPITZE0 - 18, y: -26, w: HUB + LAST_HW * 2 + 44, d: 52, r: 3 };

const { y: VY, z: VZ, halbbreite: V_HW, rSchlauch: R_SCHLAUCH } = VENTIL_STANDARD;
const V_X = [62, 168];
const PORT = { 3: 80, 2: 110, 1: 139 };
const ARBEIT = [2, 1];             // bosses on top: to the cylinder and the supply
const ABLUFT = [3];                // down through the sub-base
const WINKEL = { 2: -1 };          // the working port's elbow faces the cylinder

const P = k.fitProjection(
  [
    [-30, -52, 0], [SPITZE0 + HUB + LAST_HW * 2 + 40, 0, 0],
    [SPITZE0 + HUB + LAST_HW * 2 + 40, 0, ZC + 36],
    [-30, 0, ZC + RA + 14], [0, 0, ZC + RA + 14],
    [V_X[0] - 28, VY + V_HW + 34, 0], [V_X[1] + 30, VY + V_HW + 34, VZ + 46],
    [PORT[1] - 96 - 20, VY + 86 + 24, 0],
  ],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
);


// --- Assemblies ----------------------------------------------------------
const STAGGER = [
  "leitung", "betaetigung", "schieber", "gehaeuse", "fuss",
  "kopf", "stange", "feder", "kolben", "rohr", "boden",
];
// Escape path of each assembly in mm, along the machine's axes like a dismantling
// (x along the cylinder, y towards the viewer, z up). Measured with --apart:
// nothing passes through anything on the way out. The spring leaves forwards and up
// (out of the head side, it was compressed against the head), the piston sideways.
const MOVE = {
  ...MOVE_BASIS,
  boden: [-120, 20, 50],
  rohr: [0, 20, 190],
  kolben: [0, 150, 90],
  feder: [60, 110, 150],
  stange: [110, 190, 70],
  kopf: [90, 110, 120],
  fuss: [0, -120, 0],
  gehaeuse: [0, 190, -12],
  schieber: [-120, 150, 66],
  betaetigung: [190, 130, 28],
  leitung: [14, 118, 260],
};

const ZT = zylinderTeile({ P, MOVE, M });
const { R, rec, put, gruppe, SV, L } = ZT;
const BUCHSE = ZT.buchse();
const NT = normteile({ P, rec, put, gruppe });

// --- Caps ----------------------------------------------------------------
function zylinderboden() {
  gruppe("boden");
  put([DECKEL / 2, 0, ZC], [
    SV(G.disc(X_BODEN[0], X_BODEN[1], DR, FZ, P), { tone: "mid" }),
    L(G.circleOf(FZ, X_BODEN[1], RB, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_BODEN[0], DR - 4, P), { tone: "faint" }),
    L(G.arcOf(FZ, X_BODEN[1] - 3, DR, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FZ, X_BODEN[0], X_BODEN[1], DR, { name: "boden.deckel" }))],
    { name: "boden.deckel" });
  ZT.anschluss(DECKEL / 2, DR, "boden.anschluss");
}

/** The head: gland for the rod and, on top of it, the vent with its sintered filter. */
function zylinderkopf() {
  gruppe("kopf");
  put([X_KOPF[0] + DECKEL / 2, 0, ZC], [
    SV(G.disc(X_KOPF[0], X_KOPF[1], DR, FZ, P), { tone: "mid" }),
    ...BUCHSE.svg,
    L(G.circleOf(FZ, X_KOPF[0], RB - 3, P), { tone: "faint" }),
    L(G.arcOf(FZ, X_KOPF[1] - 3, DR, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(FZ, X_KOPF[0], X_KOPF[1], DR, { name: "kopf.deckel" })),
    ...BUCHSE.koerper(),
  ], { name: "kopf.deckel" });
  // The vent: the rod chamber breathes through a sintered filter.
  const x = X_KOPF[0] + DECKEL / 2;
  const F = quer(x, ZC);
  put([x, DR + 8, ZC], [
    SV(G.disc(DR, DR + 5, 5.5, F, P, { steps: 6 }), { tone: "mid" }),
    SV(G.disc(DR + 5, DR + 15, 7.5, F, P), { tone: "lo" }),
    L(G.arcOf(F, DR + 11, 7.5, P), { tone: "faint" }),
    L(G.circleOf(F, DR + 15, 7.5, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(F, DR, DR + 15, 7.5, { name: "kopf.filter" })),
  ], { name: "kopf.filter" });
}

// --- The parts inside, built at stroke 0 and translated by the runtime ---
function innereien() {
  gruppe("kolben");
  put([KOLBEN0 + KB / 2, 0, ZC], [
    SV(G.disc(KOLBEN0, KOLBEN0 + KB, RB, FZ, P), { tone: "hi" }),
    SV(G.ringBand(KOLBEN0 + 4, KOLBEN0 + 7.5, RB - 2.6, RB, FZ, P), { tone: "lo" }),
    SV(G.ringBand(KOLBEN0 + KB - 7, KOLBEN0 + KB - 4, RB - 1.8, RB, FZ, P), { tone: "lo" }),
    L(G.arcOf(FZ, KOLBEN0 + 11, RB, P), { tone: "faint" }),
    // the elastic disc on the rear face, the end-position buffer
    SV(G.disc(KOLBEN0 - 2.5, KOLBEN0, 19, FZ, P), { tone: "lo" }),
    L(G.circleOf(FZ, KOLBEN0 - 2.5, 19, P), { tone: "faint" }),
  ].join(""), [
    rec(A.disc(FZ, KOLBEN0, KOLBEN0 + KB, RB, { name: "kolben.scheibe" })),
    rec(A.disc(FZ, KOLBEN0 - 2.5, KOLBEN0, 19, { name: "kolben.puffer" })),
  ], { name: "kolben.scheibe", clip: true, hub: true });

  // The return spring around the rod, between the piston and the head. Each
  // piece of the coil carries its x; the page compresses it with the stroke.
  gruppe("feder");
  const fa = KOLBEN0 + KB;
  const R_DRAHT = FEDER.draht / 2;
  // The coil is cut in two at the rod: the half behind the axis is drawn before
  // the rod, the half in front of it after, so the rod really stands inside the spring.
  const wendel = NT.druckfeder(FZ, fa + R_DRAHT, X_ROHR[1] - R_DRAHT, FEDER, { teilen: true });
  put([(fa + X_ROHR[1]) / 2, 0, ZC], wendel.hinten.join(""), [
    rec(A.ring(FZ, fa + 0.5, X_ROHR[1], FEDER.rWindung - R_DRAHT, FEDER.rWindung + R_DRAHT, { name: "feder.wendel" })),
  ], { name: "feder.wendel", clip: true, feder: [fa, X_ROHR[1]] });

  ZT.stange({ ab: KOLBEN0 + KB });

  // The front half of the coil: the half millimetre at the piston end stands for it as a
  // body; its place in the drawing order is set after the depth solver has run.
  gruppe("feder");
  put([(fa + X_ROHR[1]) / 2, 0, ZC], wendel.vorn.join(""), [
    rec(A.ring(FZ, fa, fa + 0.5, FEDER.rWindung - R_DRAHT, FEDER.rWindung + R_DRAHT, { name: "feder.vorn" })),
  ],
    { name: "feder.vorn", clip: true, feder: [fa, X_ROHR[1]] });

  ZT.lastschlitten({ x: SPITZE0, hw: LAST_HW, d: LAST_D, h: LAST_H, F: FZ, rStange: RS });
}

// --- Hoses and the supply line -------------------------------------------
const PY_ = VY - V_HW / 2;
const WEGE = {
  A: schlauch([DECKEL / 2, DR + 15, ZC], VOR, [PORT[2] - 20, PY_, VZ + 29], [-1, 0, 0], 40, 100),
  V: ZT.versorgung(PORT),
};

// --- Compose -------------------------------------------------------------
ZT.grundplatte({ fuss: FUSS, fussZ: FUSS_Z, schiene: SCHIENE, fussGruppe: "fuss" });
zylinderboden();
const FINFO = ZT.rohr();
innereien();
zylinderkopf();
ZT.ventil({
  ...VENTIL_STANDARD, x: V_X, port: PORT, oben: ARBEIT, unten: ABLUFT, winkel: WINKEL, scheiben: [95, 124.5, 153.5],
});

const ansicht = ZT.abschluss({
  FINFO, bahnen: ZT.schlaeuche(WEGE, { radius: R_SCHLAUCH, versorgung: "V" }), abluft: ABLUFT, W, H,
  // The front half of the spring goes right after the rod it surrounds.
  nachSettle: () => {
    const stange = R.items.find((it) => it.name === "stange.innen");
    R.items.find((it) => it.name === "feder.vorn").key = stange.key + 0.01;
  },
});
// The vent of the spring chamber: from the chamber through the head's drilling out
// to the filter. Particles run along it outwards while the piston extends.
{
  const xf = X_KOPF[0] + DECKEL / 2;
  ansicht.BAHNEN.F = LU.bahn(
    [[X_KOPF[0] - 9, 19, ZC], [xf, 19, ZC], [xf, DR + 4, ZC], [xf, DR + 24, ZC]], P, k.iso,
  );
}

const svg = ZT.figur({
  W, H, FINFO,
  label:
    "Ein einfachwirkender Pneumatikzylinder (Rundzylinder, Bohrung 50 mm, Hub 25 mm) im Schnitt, davor das 3/2-Wegeventil, das ihn schaltet. "
    + "Durch ein Fenster im Zylinderrohr sieht man den Kolben, hinter ihm die Druckkammer und vor ihm die Rückstellfeder um die Kolbenstange. "
    + "Ein Schlauch verbindet das Ventil mit dem Zylinderboden; die Kolbenstange schiebt einen Schlitten auf einer Schiene. "
    + "Die Druckluft ist eingefärbt: das kräftige Blau steht unter Druck, das blasse ist Abluft oder Umgebungsluft.",
});

// --- The page ------------------------------------------------------------
const AUTO_TAKT = 0.5;              // s of model time between two automatic signals
const ZEITLUPE0 = 10;              // the page starts in slow motion: the stroke takes 0.08 s

// What only this page does on top of the shared frame (figur/zylinderseite.mjs): the push
// button (figur/bedienung.mjs), slow motion, the vent filter and the symbols beside the card.
const eigenes = `
let zeitlupe = ZEITLUPE0;
const RING = flaechen(MASSE).ring;
// The exhaust path is about 30 times wider than the supply path; drawn as it is it would sit at
// full strength for the whole stroke, so its flow is scaled down to the supply's range.
const AB_SKALA = MASSE.leitwertZu / MASSE.leitwertAb;

function zeichneLuft(dt) {
  // Chamber A takes the pressure tone, the spring chamber stays at ambient: always pale.
  const F = zeichneKammern();
  const { qA } = kammerFluesse(zustand, druck);
  const q = qA > 0 ? qA : qA * AB_SKALA;
  const rein = Math.max(0, q), raus = Math.max(0, -q);
  stromSchritt(stroeme.A, dt, stromTempo(-q), stromKraft(q), qA > 0 ? F.druck : F.abluft);
  stromSchritt(stroeme.V, dt, stromTempo(-rein), stromKraft(rein), F.druck);
  stromSchritt(stroeme.E3, dt, stromTempo(raus), stromKraft(raus), F.abluft);
  // The vent filter: what the piston pushes out of (or draws into) the spring chamber.
  const qF = zustand.v * RING;
  stromSchritt(stroeme.F, dt, stromTempo(qF), stromKraft(qF), F.abluft);
}

const anzeigeText = (a) => "F aus " + a.kraftJetzt + " N = p · A − Feder jetzt " + a.federJetzt + " N · Hub " + a.weg + " mm";

function modellSchritt(dt) {
  const dm = angehalten ? 0 : dt / zeitlupe;
  if (dm > 0) {
    bed.takt(dm);
    schritt(zustand, MASSE, dm, druck);
  }
  return dm;
}

const symbole = Array.from(document.querySelectorAll(".beifigur-symbol svg[data-feldbreite]"));
function zeichneSymbol() {
  const o = oeffnung(zustand, MASSE);
  for (const sym of symbole) symbolStellen(sym, zustand.schieber, o);
}
function nachBild() {
  zeichneBedienung();
  zeichneSymbol();
}

// --- controls -------------------------------------------------------------
const knopfSignal = document.getElementById("btn-signal");
const lupeRegler = document.getElementById("zeitlupe");
const lupeWert = document.getElementById("zeitlupe-wert");

function zeichneBedienung() {
  const an = zustand.stellung === "ausfahren";
  if (knopfSignal.getAttribute("aria-pressed") !== String(an)) knopfSignal.setAttribute("aria-pressed", String(an));
}

// The button is figur/bedienung.mjs: the signal lasts as long as it is held, the
// automatic cycle presses on its own. What the signal does is this page's business:
// held, the valve fills chamber A; released, the spring-loaded valve vents it.
const bed = bedienungSignale({
  namen: ["T"],
  impuls: 0.15,
  autoTakt: AUTO_TAKT,
  autoAn: !still.matches,
  erster: "T",
  haltenModus: () => true,
  setzeSignal: (n, an) => { zustand.stellung = an ? "ausfahren" : "einfahren"; },
  autoSchritt: () => { zustand.stellung = zustand.stellung === "ausfahren" ? "einfahren" : "ausfahren"; },
  autoEnde: (b) => { if (!b.gehalten.T) zustand.stellung = "einfahren"; },
  autoAnzeige: (an) => knopfAuto.setAttribute("aria-pressed", String(an)),
  geaendert: () => { angehalten = false; zeichneBedienung(); run(); },
});
bed.knopf(knopfSignal, "T");
const stoppeAuto = () => bed.autoAus();

knopfAuto.addEventListener("click", () => {
  if (bed.auto) stoppeAuto();
  else bed.autoStart("T");
  angehalten = false;
  run();
});
knopfAuto.setAttribute("aria-pressed", String(bed.auto));

lupeRegler.addEventListener("input", () => {
  zeitlupe = lupeRegler.valueAsNumber;
  lupeWert.textContent = zeitlupe === 1 ? "1×" : "1/" + zeitlupe;
});

// Before taking it apart: no signal, no automatic, everything at rest. Whoever
// held the button ends the signal; after reassembly the piston stands home.
function vorDemZerlegen() {
  stoppeAuto();
  bed.zuruecksetzen();
  Object.assign(zustand, neuerZustand(MASSE, ZUSTAND0));
  // The chambers take the rest tone now, not when the springs have settled: the air
  // layer comes back into view long before that.
  zeichneLuft(0);
  zeichneBedienung();
}

lupeRegler.value = String(zeitlupe);
lupeWert.textContent = "1/" + zeitlupe;
zeichneBedienung();
zeichneSymbol();

// The piston at weg mm and the valve in the given position, everything settled (the frame's own stelle).
const vorStelle = stoppeAuto;
const nachStelle = nachBild;

seitenStart({
  modell: () => zustand,
  taster: () => bed.gehalten.T,
  automatik: () => bed.auto,
  // The button as a hand holds it.
  signal(an) {
    stoppeAuto();
    angehalten = false;
    bed.halte("T", an);
    run();
  },
});
`;

const live = ZS.seitenSkript({
  wurzel: WURZEL, STAGGER, LEGENDE, ansicht, KB,
  zustand0: { weg: 0, stellung: "einfahren" },
  konstanten: `const AUTO_TAKT = ${AUTO_TAKT};     // s of model time between two automatic signals\nconst ZEITLUPE0 = ${ZEITLUPE0};`,
  zusatzLaufzeit: `${SYMBOL_LAUFZEIT}\n${BEDIENUNG_LAUFZEIT}`,
  seite: eigenes,
});

const INFO =
  "Halte den Taster am Ventil gedrückt: Die Luft füllt die Kammer hinter dem Kolben und schiebt ihn gegen die Feder hinaus. "
  + "Lass los: Die Kammer entlüftet, die Feder bringt den Kolben zurück. "
  + "Das kräftige Blau ist Druckluft, das blasse ist Abluft oder Umgebungsluft. Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const LEISTE = ZS.leiste({
  vorn: knopf("btn-signal", "Taster halten", { titel: "Gedrückt halten: Das Ventil verbindet 1 mit 2 und füllt die Kammer. Loslassen: Die Feder stellt zurück." }),
  zeitlupe: schieber("zeitlupe", "Zeitlupe", { min: 1, max: 50, step: 1, wert: ZEITLUPE0, einheit: "×", beschreibung: "Zeitlupe: Modellzeit geteilt durch diesen Wert" })
    .replace(`>${ZEITLUPE0}×</output>`, `>1/${ZEITLUPE0}</output>`),
});

// The symbols beside the card: the cylinder and the valve that switches it.
const SYM_FELD = 60;
const BEIFIGUR = `<p class="beifigur-titel">Schaltzeichen</p>`
  + `<div class="beifigur-symbol">${zylinderSymbol({ feld: SYM_FELD }).svg}</div>`
  + `<div class="beifigur-symbol">${wegeventilSymbol(VENTIL_3_2_NC, { links: "taster", rechts: "feder", feld: SYM_FELD }).svg}</div>`
  + `<p class="beifigur-text">Oben der einfachwirkende Zylinder mit Federrückstellung: ein Luftanschluss auf der Kolbenseite, auf der Stangenseite Feder und Entlüftung. `
  + `Darunter das 3/2-Wegeventil in Ruhestellung gesperrt (NC), mit Druckknopf (der Halbkreis) und Rückstellfeder. Die Kästchen gleiten wie der Schieber in der Zeichnung.</p>`;

const f = PN.flaechen(Z);
const kraft = (bar) => Math.round(PN.kraftAus(bar, Z));
const F0 = Math.round(PN.federKraft({ weg: 0 }, Z));
const F1 = Math.round(PN.federKraft({ weg: HUB }, Z));
const START = Math.round(PN.kraftJetzt(6, { weg: 0 }, Z));
const LESETEXT = `
<h2>Wer bringt den Kolben zurück?</h2>
<p>Ein <strong>einfachwirkender</strong> Zylinder bekommt nur an einer Seite Luft, hier hinter dem Kolben. Zurück schiebt ihn eine <strong>Feder</strong>:
Sie drückt auf der Stangenseite gegen den Kolben und wird beim Ausfahren zusammengedrückt. Das reicht, solange der Rückweg kraftlos sein darf
– beim Spannen, Auswerfen oder Prägen. Dafür braucht man nur einen Schlauch und ein einfaches
<a href="../Wegeventil-3-2/">3/2-Wegeventil</a>, und fällt der Druck aus, fährt der Zylinder von selbst ein.</p>
<p>Das Ventil: Anschluss 1 bekommt die Druckluft, 2 geht zum Zylinder, 3 ist die Abluft (früher P, A und R). In Ruhe ist es gesperrt (NC): 2 ist mit 3
verbunden, die Kammer ist entlüftet. Solange man den Taster hält, verbindet es 1 mit 2 – die Kammer füllt sich im <strong>kräftigen Blau</strong>.
Lässt man los, stellt die Feder des Ventils um und die Luft entweicht im <strong>blassen Blau</strong> durch den Anschluss 3.</p>

<h2>Warum bleibt die Federkammer blass?</h2>
<p>Die Kammer mit der Feder ist über einen Filter offen zur Umgebung. Beim Ausfahren schiebt der Kolben ihre Luft durch den Filter hinaus, beim
Einfahren saugt er Luft wieder an. Dort entsteht nie Druck, darum ist sie immer im blassen Blau. Der Filter hält Staub und Späne draußen.
Mehr zum Aufbau mit zwei Anschlüssen steht beim <a href="../Zylinder-Doppeltwirkend/">doppeltwirkenden Zylinder</a>.</p>

<h2>Warum ist die Ausfahrkraft kleiner als p · A?</h2>
<p>Die Feder drückt dem Kolben entgegen, und zwar um so stärker, je weiter er ausgefahren ist: ${F0} N eingefahren, ${F1} N am Hubende.
Die Anzeige rechnet mit der Feder an der Stelle, an der der Kolben gerade steht.</p>
<p class="formel">
A<sub>Kolben</sub> = π/4 · D² = π/4 · 50² = <strong>${f.kolben.toFixed(1)} mm²</strong><br>
bei 6 bar: p · A = 0,6 N/mm² · ${f.kolben.toFixed(1)} mm² = ${Math.round(0.6 * f.kolben)} N<br>
am Hubanfang: F<sub>aus</sub> = ${Math.round(0.6 * f.kolben)} N − ${F0} N Feder = <strong>${START} N</strong><br>
am Hubende: F<sub>aus</sub> = ${Math.round(0.6 * f.kolben)} N − ${F1} N Feder = <strong>${kraft(6)} N</strong> (Katalogwert)<br>
bei 3 bar am Hubende: F<sub>aus</sub> = 0,3 N/mm² · ${f.kolben.toFixed(1)} mm² − ${F1} N = <strong>${kraft(3)} N</strong><br>
Zurück: nur die Feder, <strong>${F0} N</strong> eingefahren
</p>
<p class="hinweis">Das sind theoretische Werte. Die Reibung der Dichtungen zieht in der Praxis noch einmal 3 bis 10 Prozent ab.
Bei sehr kleinem Druck reicht die Kraft nicht, um Feder und Reibung zu überwinden (mit den angenommenen 40 N Reibung unter etwa 0,6 bar):
Der Kolben bleibt stehen.</p>

<h2>Warum fährt er langsamer ein, als er ausfährt?</h2>
<p>Beim Ausfahren schiebt die Druckluft mit rund tausend Newton. Beim Einfahren bleibt nur die Feder: ${F0} N eingefahren, ${F1} N am Hubende, und davon geht
noch die Reibung ab – mit den angenommenen 40 N bleiben 42 bis 65 N für den Kolben und seine Last. Diese kleine Kraft muss die Dichtungsreibung überwinden,
die mit der Geschwindigkeit wächst; sie begrenzt, wie schnell der Kolben zurückläuft. Die Zeitlupe (am Anfang 1/10) macht den Unterschied sichtbar.</p>

<p class="hinweis">Jede Zahl auf dieser Seite wird aus demselben Modell gerechnet, das auch den Kolben bewegt. Welche Maße aus dem Katalog stammen
und welche angenommen sind, steht in der Anleitung zur Figur.</p>
`;

const EIGENES_CSS = `${VS.CSS}
#btn-signal { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none }
`;

ZS.schreibe(ZIEL, ZS.seitenHtml({
  titel: "Einfachwirkender Zylinder – Pneumatik",
  kartenTitel: "Einfachwirkender Zylinder mit 3/2-Wegeventil",
  hinweis: "Taster halten, Zeitlupe, zerlegen",
  anzeige: `F aus ${START} N = p · A − Feder jetzt ${F0} N · Hub 0 mm`,
  blass: "Blasses Blau: Abluft und Umgebungsluft",
  LEGENDE,
  css: EIGENES_CSS,
  caption:
    "Rundzylinder Ø 50 mm, Hub 25 mm, einfachwirkend mit Rückstellfeder (Vorbild Festo ESNU-50-25-P-A), am 3/2-Wegeventil mit Druckknopf. "
    + "Die Luft schiebt den Kolben gegen die Feder hinaus; ist die Kammer entlüftet, bringt die Feder ihn zurück.",
  svg,
  leiste: LEISTE,
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  breite: 1240,
  buehneLabel: "Einfachwirkender Zylinder mit 3/2-Wegeventil: Luftweg, Kolben und Baugruppen",
  beiFigur: BEIFIGUR,
  beiFigurLabel: "Schaltzeichen",
}));

ZT.ende({
  ziel: ZIEL,
  zusatz: [FEDER_TEXT],
  allow: [
    ["rohr.wand", "kolben.puffer"],
    ["rohr.wand", "feder.wendel"],
    ["feder.wendel", "stange.innen"],
    // The two halves of the coil are drawn before and after the rod on purpose
    // (see "feder.vorn" above); the solver measures the whole coil in one place.
    ["feder.vorn", "feder.wendel"],
    ["feder.vorn", "stange.innen"],
    ["feder.vorn", "rohr.wand"],
  ],
  cover: ["feder.vorn"],
});
