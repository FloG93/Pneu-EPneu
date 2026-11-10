// A double-acting cylinder to ISO 15552 (bore 50, stroke 200) on the 5/2 valve
// that switches it, as an isometric cutaway with the compressed air visible.
// Dimensions in mm, 1 world unit = 1 mm. Catalogue values are Festo DSBC Ø 50;
// everything else is an assumption and is listed in the README.
//
// This script holds geometry and four data tables and nothing else: springs,
// depth sorting, legend, air and page shell all come from ../../figur/.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.claude/skills/anatomy/kit/audit.mjs";
import * as SCH from "../../../figur/schnitt.mjs";
import * as PN from "../../../figur/pneumatik.mjs";
import { zylinderTeile, zylinderMasse, schlauch, ort, MOVE_BASIS, LEINWAND, AUF, VOR, VENTIL_STANDARD } from "../../../figur/zylinderteile.mjs";
import * as ZS from "../../../figur/zylinderseite.mjs";
import { knopf } from "../../../figur/seite.mjs";
import { LEGENDE } from "./legende-zylinder.mjs";

const { ZIEL, WURZEL } = ort(import.meta.url);
const { W, H } = LEINWAND;

// --- Dimensions ----------------------------------------------------------
const Z = PN.ISO_15552_50;
const DECKEL = 24;                 // cap thickness (assumption)
const RAGT = 64;                   // rod out of the head at stroke 0, enough for the
                                   // carriage to clear the head (the audit caught 6 mm of overlap)
const M = zylinderMasse(Z, { deckel: DECKEL, rohrEnde: DECKEL + 240, ragt: RAGT });
const { RB, RS, HUB, ZC, TOT, X_BODEN, X_ROHR, X_KOPF, KOLBEN0, SPITZE0, FZ, quer } = M;
const DHW = 32;                    // cap half width, 64 square (assumption)
const KB = 22;                     // piston width (assumption)
const RD = 13;                     // cushioning bush radius (assumption)
const DL = Z.daempfung;            // 20, cushioning length
const ANKER = 23;                  // tie rods on a 46 x 46 square
const R_ANKER = 5;                 // M10

const FUSS_Z = ZC - DHW;
const FUSS = [X_BODEN[0] + 12, X_KOPF[1] - 12];
const SCHIENE = { x: 312, y: -32, w: 300, d: 64, r: 3 };
const LAST_HW = 34;
const LAST_D = 72;
const LAST_H = 54;

const { y: VY, z: VZ, halbbreite: V_HW, rSchlauch: R_SCHLAUCH } = VENTIL_STANDARD;
const V_X = [62, 216];
const PORT = { 5: 80, 4: 110, 1: 139, 2: 168, 3: 198 };
const ARBEIT = [4, 1, 2];          // bosses on top: to the cylinder and the supply
const ABLUFT = [5, 3];             // down through the sub-base, out through a silencer
const WINKEL = { 4: -1, 2: 1 };    // which way each working port elbow faces

/** At rest the figure stands at mid-stroke, so both chambers are visible. */
const WEG0 = Math.round(HUB * 0.42);

const P = k.fitProjection(
  [
    [-30, -52, 0], [SPITZE0 + HUB + LAST_HW + 8, 0, 0],
    [SPITZE0 + HUB + LAST_HW + 8, 0, ZC + 36],
    [-30, 0, ZC + M.RA + 14], [0, 0, ZC + M.RA + 14],
    [V_X[0] - 28, VY + V_HW + 34, 0], [V_X[1] + 30, VY + V_HW + 34, VZ + 46],
  ],
  W, H, { pad: 24, azimuth: 38, elevation: 34 },
);

const D = (points, style) => k.dotsSvg(points, style);

// --- Assemblies ----------------------------------------------------------
const STAGGER = [
  "leitung", "betaetigung", "schieber", "gehaeuse", "drossel",
  "anker", "kopf", "stange", "daempfung", "kolben", "rohr", "boden",
];
const MOVE = {
  ...MOVE_BASIS,
  boden: [-190, 30, 60],
  rohr: [0, 20, 262],
  kolben: [0, 176, 118],
  daempfung: [78, 214, 64],
  stange: [150, 250, 96],
  kopf: [196, 26, 150],
  anker: [0, -126, 222],
  drossel: [-74, -232, 118],
  gehaeuse: [0, 252, -12],
  schieber: [-164, 176, 66],
  betaetigung: [226, 162, 28],
  leitung: [14, 118, 304],
};


const ZT = zylinderTeile({ P, MOVE, M });
const { R, rec, put, gruppe, SV, L } = ZT;
const BUCHSE = ZT.buchse();
const { NAH } = ZT;

// --- Caps ----------------------------------------------------------------
function deckelRing(hw, r = 6, n = 5) {
  const punkte = [];
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const cx = sx * (hw - r);
    const cy = sy * (hw - r);
    const a0 = Math.atan2(sy, sx) - Math.PI / 4;
    for (let i = 0; i <= n; i += 1) {
      const a = a0 + (Math.PI / 2) * (i / n);
      punkte.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return punkte;
}
const RING_DECKEL = deckelRing(DHW);

function zylinderboden() {
  gruppe("boden");
  put([DECKEL / 2, 0, ZC], [
    SV(G.prismOf(FZ, RING_DECKEL, X_BODEN[0], X_BODEN[1], P), { tone: "mid" }),
    L(G.circleOf(FZ, X_BODEN[1], RD + 1, P), { tone: "faint" }),
    L(G.circleOf(FZ, X_BODEN[1], RB, P), { tone: "faint" }),
    L(SCH.bogenPfad(FZ, X_BODEN[0] + 4, DHW - 5, NAH - 1.2, NAH + 1.2, P), { tone: "faint" }),
  ].join(""), [rec(A.prism(FZ, RING_DECKEL, X_BODEN[0], X_BODEN[1], { name: "boden.deckel" }))],
    { name: "boden.deckel" });
  ZT.anschluss(12, DHW, "boden.anschluss");
}

function zylinderkopf() {
  gruppe("kopf");
  put([X_KOPF[0] + DECKEL / 2, 0, ZC], [
    SV(G.prismOf(FZ, RING_DECKEL, X_KOPF[0], X_KOPF[1], P), { tone: "mid" }),
    ...BUCHSE.svg,
    L(G.circleOf(FZ, X_KOPF[0], RD + 1, P), { tone: "faint" }),
    L(SCH.bogenPfad(FZ, X_KOPF[1] - 4, DHW - 5, NAH - 1.2, NAH + 1.2, P), { tone: "faint" }),
  ].join(""), [
    rec(A.prism(FZ, RING_DECKEL, X_KOPF[0], X_KOPF[1], { name: "kopf.deckel" })),
    ...BUCHSE.koerper(),
  ], { name: "kopf.deckel" });
  ZT.anschluss(276, DHW, "kopf.anschluss");
}

/** The two cushioning screws, one per cap, on the upper front corner. */
function drosselschrauben() {
  gruppe("drossel");
  for (const [name, x] of [["boden", X_BODEN[0] + 7], ["kopf", X_KOPF[1] - 7]]) {
    const F = quer(x, ZC + 21);
    put([x, DHW + 6, ZC + 21], [
      SV(G.disc(DHW, DHW + 4, 6.5, F, P, { steps: 6 }), { tone: "mid" }),
      SV(G.disc(DHW + 4, DHW + 10, 5, F, P), { tone: "hi" }),
      L(G.ribsOf(F, DHW + 4.5, DHW + 9.5, 5, 14, P, { seams: true }), { tone: "faint" }),
      L(G.circleOf(F, DHW + 10, 5, P), { tone: "lo" }),
      L(k.segment(G.pointOf(F, DHW + 10, 3.4, 0.6), G.pointOf(F, DHW + 10, -3.4, 0.6), P), { tone: "lo" }),
    ].join(""), [rec(A.disc(F, DHW, DHW + 10, 6.5, { name: `drossel.${name}` }))],
      { name: `drossel.${name}`, bias: 20 });
  }
}

function zuganker() {
  gruppe("anker");
  for (const [u, v] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const y = u * ANKER;
    const z = ZC + v * ANKER;
    const F = G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const nah = v > 0;                 // the two upper rods graze the open section
    // The shaft runs between the inner faces of the two caps; where it passes
    // through them it is inside the material and is neither drawn nor recorded.
    const muttern = [
      SV(G.disc(-7, 0, 8, F, P, { steps: 6 }), { tone: "mid" }),
      SV(G.disc(X_KOPF[1], X_KOPF[1] + 7, 8, F, P, { steps: 6 }), { tone: "mid" }),
    ];
    const mutterKoerper = [
      rec(A.disc(F, -7, 0, 8, { name: "anker.mutter" })),
      rec(A.disc(F, X_KOPF[1], X_KOPF[1] + 7, 8, { name: "anker.mutter" })),
    ];
    if (nah) {
      // Cut away over the section, like the tube wall: whole at both ends,
      // absent where it would run straight across the open chamber.
      const bis = X_ROHR[0] + 16;
      const ab = X_ROHR[1] - 16;
      put([X_KOPF[1] / 2, y, z], [
        SV(G.disc(X_ROHR[0], bis, R_ANKER, F, P), { tone: "lo" }),
        SV(G.disc(ab, X_ROHR[1], R_ANKER, F, P), { tone: "lo" }),
        L(G.circleOf(F, bis, R_ANKER, P), { tone: "faint" }),
        L(G.circleOf(F, ab, R_ANKER, P), { tone: "faint" }),
        ...muttern,
      ].join(""), [
        rec(A.disc(F, X_ROHR[0], bis, R_ANKER, { name: "anker.stab" })),
        rec(A.disc(F, ab, X_ROHR[1], R_ANKER, { name: "anker.stab" })),
        ...mutterKoerper,
      ], { name: "anker.stab", bias: v > 0 ? 6 : -6 });
    } else {
      put([X_KOPF[1] / 2, y, z], [
        SV(G.disc(X_ROHR[0], X_ROHR[1], R_ANKER, F, P), { tone: "lo" }),
        ...muttern,
      ].join(""), [
        rec(A.disc(F, X_ROHR[0], X_ROHR[1], R_ANKER, { name: "anker.stab" })),
        ...mutterKoerper,
      ], { name: "anker.stab", bias: v > 0 ? 6 : -6 });
    }
  }
}

// --- The parts inside, built at stroke 0 and translated by the runtime ---
function innereien() {
  gruppe("kolben");
  put([KOLBEN0 + KB / 2, 0, ZC], [
    SV(G.disc(KOLBEN0, KOLBEN0 + KB, RB, FZ, P), { tone: "hi" }),
    SV(G.ringBand(KOLBEN0 + 5.5, KOLBEN0 + 9, RB - 2.6, RB, FZ, P), { tone: "lo" }),
    SV(G.ringBand(KOLBEN0 + KB - 8, KOLBEN0 + KB - 5, RB - 1.8, RB, FZ, P), { tone: "lo" }),
    L(G.arcOf(FZ, KOLBEN0 + 13, RB, P), { tone: "faint" }),
    SV(G.disc(KOLBEN0 - DL, KOLBEN0, RD, FZ, P), { tone: "mid" }),
    L(G.circleOf(FZ, KOLBEN0 - DL, RD, P), { tone: "faint" }),
  ].join(""), [rec(A.disc(FZ, KOLBEN0, KOLBEN0 + KB, RB, { name: "kolben.scheibe" }))],
    { name: "kolben.scheibe", clip: true, hub: true });

  gruppe("daempfung");
  put([KOLBEN0 + KB + DL / 2, 0, ZC], [
    SV(G.disc(KOLBEN0 + KB, KOLBEN0 + KB + DL, RD, FZ, P), { tone: "mid" }),
    L(G.arcOf(FZ, KOLBEN0 + KB + DL - 4, RD, P), { tone: "faint" }),
    L(G.circleOf(FZ, KOLBEN0 + KB + DL, RD, P), { tone: "faint" }),
  ].join(""), [rec(A.ring(FZ, KOLBEN0 + KB, KOLBEN0 + KB + DL, RS, RD, { name: "daempfung.buchse" }))],
    { name: "daempfung.buchse", clip: true, hub: true });

  ZT.stange({ ab: KOLBEN0 + KB, last: { hw: LAST_HW, d: LAST_D, h: LAST_H } });
}

// --- Hoses and the supply line -------------------------------------------
const PY_ = VY - V_HW / 2;
const WEGE = {
  A: schlauch([12, DHW + 15, ZC], VOR, [PORT[4] - 20, PY_, VZ + 29], [-1, 0, 0], 40, 100),
  B: schlauch([276, DHW + 15, ZC], VOR, [PORT[2] + 20, PY_, VZ + 29], [1, 0, 0], 120, 40),
  V: ZT.versorgung(PORT),
};
// --- Compose -------------------------------------------------------------
ZT.grundplatte({ fuss: FUSS, fussZ: FUSS_Z, schiene: SCHIENE });
zylinderboden();
zuganker();
const FINFO = ZT.rohr();
innereien();
zylinderkopf();
drosselschrauben();
ZT.ventil({
  ...VENTIL_STANDARD, x: V_X, port: PORT, oben: ARBEIT, unten: ABLUFT, winkel: WINKEL, scheiben: [95, 124.5, 153.5, 183],
});
const ansicht = ZT.abschluss({ FINFO, bahnen: ZT.schlaeuche(WEGE, { radius: R_SCHLAUCH, versorgung: "V" }), abluft: ABLUFT, W, H });

const svg = ZT.figur({
  W, H, FINFO,
  label:
    "Ein doppeltwirkender Pneumatikzylinder nach ISO 15552 im Schnitt, davor das 5/2-Wegeventil, das ihn umschaltet. "
    + "Durch ein Fenster im Zylinderrohr sieht man den Kolben, der das Rohr in zwei Kammern teilt, die Dämpfungsbuchse und die Kolbenstange. "
    + "Zwei Schläuche verbinden die Anschlüsse der Zylinderdeckel mit dem Ventil; die Kolbenstange schiebt einen Schlitten auf einer Schiene. "
    + "Die Druckluft ist eingefärbt: das kräftige Blau steht unter Druck, das blasse ist Abluft auf dem Weg zum Schalldämpfer.",
});

// --- The page ------------------------------------------------------------

// What only this page does on top of the shared frame (figur/zylinderseite.mjs): the valve
// is thrown by hand or by the automatic cycle, the air streams follow the model.
const eigenes = `
let auto = true;

function modellSchritt(dt) {
  const ruhig = still.matches;
  // The machine stops while it is being taken apart and carries on afterwards.
  if (auto) automatikTakt(zustand, dt, druck);
  if (!angehalten) schritt(zustand, MASSE, ruhig ? dt * 0.4 : dt, druck);
  return dt;
}

function zeichneLuft(dt) {
  const F = zeichneKammern();
  const { qA, qB } = kammerFluesse(zustand, druck);

  const tempo = stromTempo, kraft = stromKraft;
  stromSchritt(stroeme.A, dt, tempo(-qA), kraft(qA), qA > 0 ? F.druck : F.abluft);
  stromSchritt(stroeme.B, dt, tempo(-qB), kraft(qB), qB > 0 ? F.druck : F.abluft);
  stromSchritt(stroeme.V, dt, tempo(-(Math.max(0, qA) + Math.max(0, qB))), kraft(Math.max(0, qA) + Math.max(0, qB)), F.druck);
  stromSchritt(stroeme.E5, dt, tempo(Math.max(0, -qA)), kraft(Math.max(0, -qA)), F.abluft);
  stromSchritt(stroeme.E3, dt, tempo(Math.max(0, -qB)), kraft(Math.max(0, -qB)), F.abluft);
}

const anzeigeText = (a) => a.weg + " von " + HUB + " mm · " + a.kraftAus + " N aus / " + a.kraftEin + " N ein";

// The stroke runs back to zero on its own while the machine comes apart
// (hubAnteil in the frame), so nothing has to be reset first.
function vorDemZerlegen() {}

// --- controls -------------------------------------------------------------
const knopfVentil = document.getElementById("btn-ventil");

knopfVentil.addEventListener("click", () => {
  auto = false;
  knopfAuto.setAttribute("aria-pressed", "false");
  angehalten = false;
  zustand.stellung = zustand.stellung === "ausfahren" ? "einfahren" : "ausfahren";
  takteNeu();
  run();
});
knopfAuto.addEventListener("click", () => {
  auto = !auto;
  angehalten = false;
  knopfAuto.setAttribute("aria-pressed", String(auto));
  takteNeu();
  run();
});
knopfAuto.setAttribute("aria-pressed", "true");

function vorStelle() {
  auto = false;
  knopfAuto.setAttribute("aria-pressed", "false");
}

seitenStart({});
`;

const live = ZS.seitenSkript({
  wurzel: WURZEL, STAGGER, LEGENDE, ansicht, KB,
  zustand0: { weg: WEG0, stellung: "ausfahren" }, seite: eigenes,
});

const INFO =
  "Der Taster am Ventil schaltet um, die Automatik lässt den Zyklus laufen. "
  + "Das kräftige Blau ist Druckluft, das blasse ist Abluft auf dem Weg zum Schalldämpfer. "
  + "Ein Klick auf einen Legendeneintrag hebt die Baugruppe hervor.";

const LEISTE = ZS.leiste({
  vorn: knopf("btn-ventil", "Ventil schalten", { titel: "Den Steuerschieber in die andere Stellung schieben" }),
});

const f = PN.flaechen(Z);
const LESETEXT = `
<h2>Wozu zwei Anschlüsse?</h2>
<p>Ein <strong>einfachwirkender</strong> Zylinder bekommt nur an einer Seite Luft; zurück schiebt ihn eine Feder.
Das reicht, solange der Rückweg kraftlos sein darf. Der <strong>doppeltwirkende</strong> Zylinder hat an beiden
Deckeln einen Anschluss: welche Kammer gefüllt wird, bestimmt das Ventil, und er drückt in beide Richtungen
mit voller Kraft.</p>
<p>Damit sich überhaupt etwas bewegt, muss die <em>andere</em> Kammer gleichzeitig entlüften. Genau das ist die
Aufgabe des <a href="../Wegeventil-5-2/">5/2-Wegeventils</a> (eigene Seite: wie es innen schaltet): ein Anschluss für die Zuluft (1), zwei zum Zylinder (2 und 4) und zwei für die
Abluft (3 und 5). In der einen Stellung verbindet es 1→4 und 2→3, in der anderen 1→2 und 4→5.</p>

<h2>Wie viel Kraft?</h2>
<p>Die Kraft ist Druck mal Fläche. Beim Ausfahren drückt die Luft auf die ganze Kolbenfläche, beim Einfahren
nur noch auf die Ringfläche – die Kolbenstange nimmt ihren Querschnitt weg.</p>
<p class="formel">
A<sub>Kolben</sub> = π/4 · D² = π/4 · 50² = <strong>${f.kolben.toFixed(1)} mm²</strong><br>
A<sub>Ring</sub> = π/4 · (D² − d²) = π/4 · (50² − 20²) = <strong>${f.ring.toFixed(1)} mm²</strong><br>
bei 6 bar: F<sub>aus</sub> = 0,6 N/mm² · ${f.kolben.toFixed(1)} mm² = <strong>${Math.round(PN.kraftAus(6, Z))} N</strong><br>
bei 6 bar: F<sub>ein</sub> = 0,6 N/mm² · ${f.ring.toFixed(1)} mm² = <strong>${Math.round(PN.kraftEin(6, Z))} N</strong>
</p>
<p class="hinweis">Das sind theoretische Werte. Die Reibung der Dichtungen zieht in der Praxis noch einmal
3 bis 10 Prozent ab.</p>

<h2>Warum wird er vor dem Anschlag langsam?</h2>
<p>Kurz vor der Endlage taucht die Dämpfungsbuchse in den Deckel und sperrt den breiten Weg der Abluft. Die
Luft kann nur noch durch die Drosselschraube entweichen, staut sich auf und bremst den Kolben. Ohne diese
<strong>Endlagendämpfung</strong> würde der Kolben mit voller Geschwindigkeit auf den Deckel schlagen. Beim
Anfahren stört sie nicht: ein Rückschlagventil führt die Luft an der Drossel vorbei.</p>

<h2>Was ist schneller, Aus- oder Einfahren?</h2>
<p>Die bekannte Faustregel sagt „Einfahren", weil die Ringfläche kleiner ist. Sie stammt aber aus der Hydraulik,
wo der Volumenstrom fest vorgegeben ist. In der Pneumatik ist er das nicht – die Geschwindigkeit hängt davon ab,
wie frei die Luft hinein <em>und wieder hinaus</em> kommt. Ist die <strong>Zuluft</strong> die Engstelle, fährt er
schneller ein; ist die <strong>Abluft</strong> die Engstelle – der Normalfall, wenn man mit Drosselrückschlag­ventilen
abluftseitig drosselt –, fährt er schneller aus, weil beim Einfahren die große Kolbenkammer geleert werden muss.</p>

<p class="hinweis">Jede Zahl auf dieser Seite wird aus demselben Modell gerechnet, das auch den Kolben bewegt.
Welche Maße aus dem Katalog stammen und welche angenommen sind, steht in der Anleitung zur Figur.</p>
`;

ZS.schreibe(ZIEL, ZS.seitenHtml({
  titel: "Doppeltwirkender Zylinder – Pneumatik",
  kartenTitel: "Doppeltwirkender Zylinder mit 5/2-Wegeventil",
  hinweis: "Ventil schalten, Druck einstellen, zerlegen",
  anzeige: `${WEG0} von ${HUB} mm · ${Math.round(PN.kraftAus(6, Z))} N aus / ${Math.round(PN.kraftEin(6, Z))} N ein`,
  blass: "Blasses Blau: Abluft auf dem Weg zum Schalldämpfer",
  LEGENDE,
  caption:
    "Normzylinder nach ISO 15552, Bohrung 50 mm, Hub 200 mm, am 5/2-Wegeventil. Das Ventil legt eine Kammer "
    + "an die Zuluft und entlüftet gleichzeitig die andere; erst dadurch bewegt sich der Kolben. Beim Ausfahren "
    + "drückt die Luft auf die volle Kolbenfläche, beim Einfahren nur auf die Ringfläche – daher die kleinere Kraft.",
  svg,
  leiste: LEISTE,
  infoText: INFO,
  lesetext: LESETEXT,
  laufzeit: live,
  breite: 1220,
  buehneLabel: "Doppeltwirkender Zylinder mit 5/2-Wegeventil: Luftweg, Kolben und Baugruppen",
}));

ZT.ende({
  ziel: ZIEL,
  allow: [
      ["rohr.wand", "daempfung.buchse"],
      ["rohr.wand", "anker.stab*"],
      ["daempfung.buchse", "stange.innen"],
      ["kopf.deckel", "anker.stab*"],
      ["boden.deckel", "anker.stab*"],
      ["kopf.anschluss", "leitung.B*"],
      ["gehaeuse.daempfer*", "leitung.*"],
    ],
    crowd: [["leitung.B", "gehaeuse.oben"]],
});
