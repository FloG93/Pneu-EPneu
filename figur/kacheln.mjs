// The overview page's contents as data, not as markup.
//
// Adding a component means adding one entry here and switching its `zustand`
// to "fertig" once its page exists. Nothing else on the overview changes.
// A finished tile shows `<ordner>/vorschau.svg` as its picture if there is one.
//
// `sinnbild` names the symbol a tile will carry once the symbols are drawn
// (here: ISO 1219-1); the slot is reserved now so adding them later does not
// disturb the layout.
import { FARBEN } from "./luft.mjs";

/** @typedef {{ id: string, name: string, satz: string, zustand: "fertig" | "geplant", ordner?: string, sinnbild: string, marken?: string[] }} Kachel */
/** @typedef {{ id: string, titel: string, einleitung: string, kacheln: Kachel[] }} Rubrik */

/**
 * Everything on the overview page that is not a tile. `toene` are the two
 * medium tones the previews use, the same measured pair the figures draw with.
 */
export const SEITE = {
  titel: "Pneumatik und E-Pneumatik",
  beschreibung:
    "Pneumatik-Bauteile für Auszubildende: Zylinder, Wegeventile und E-Pneumatik als interaktive Schnittzeichnungen, "
    + "in denen die Druckluft sichtbar strömt. Ohne Installation im Browser.",
  lead:
    "Bauteile zum Anschauen: jedes als Schnittzeichnung, in der man sieht, was im Inneren passiert und wohin die Druckluft strömt. "
    + "Für Auszubildende in Metall- und Elektroberufen – ohne Anmeldung, ohne Installation.",
  sinnbildName: "Schaltzeichen",
  quelle: "https://github.com/FloG93/Pneu-EPneu",
  toene: {
    light: { stark: FARBEN.light.druck, blass: FARBEN.light.abluft },
    dark: { stark: FARBEN.dark.druck, blass: FARBEN.dark.abluft },
  },
};

/** @type {Rubrik[]} */
export const RUBRIKEN = [
  {
    id: "aktoren",
    titel: "Aktoren",
    einleitung: "Bauteile, die aus Druckluft eine Bewegung machen.",
    kacheln: [
      {
        id: "zylinder-doppeltwirkend",
        name: "Doppeltwirkender Zylinder",
        satz:
          "Schnitt durch einen Normzylinder nach ISO 15552 mit dem 5/2-Wegeventil, das ihn umschaltet. "
          + "Die Druckluft strömt sichtbar: kräftiges Blau steht unter Druck, blasses ist Abluft. "
          + "Ein Knopf zerlegt ihn in seine Baugruppen, die Kraft nach F = p · A wird live gerechnet.",
        zustand: "fertig",
        ordner: "Zylinder-Doppeltwirkend",
        sinnbild: "Zylinder doppelt wirkend mit beidseitiger Endlagendämpfung",
        marken: ["ISO 15552", "Ø 50 mm", "Hub 200 mm", "mit 5/2-Wegeventil"],
      },
      {
        id: "zylinder-einfachwirkend",
        name: "Einfachwirkender Zylinder",
        satz: "Druckluft schiebt nur in eine Richtung, zurück drückt eine Feder. Warum das Kraft kostet und wann es trotzdem reicht.",
        zustand: "fertig",
        ordner: "Zylinder-Einfachwirkend",
        sinnbild: "Zylinder einfach wirkend mit Federrückstellung",
        marken: ["Rundzylinder", "Ø 50 mm", "Hub 25 mm", "mit 3/2-Wegeventil"],
      },
      {
        id: "zylinder-durchgehend",
        name: "Zylinder mit beidseitiger Kolbenstange",
        satz: "Die Stange geht durch den ganzen Zylinder. Dadurch ist die Fläche auf beiden Seiten gleich – und damit auch die Kraft.",
        zustand: "geplant",
        sinnbild: "Zylinder doppelt wirkend mit zweiseitiger Kolbenstange",
      },
      {
        id: "zylinder-teleskop",
        name: "Teleskopzylinder",
        satz: "Mehrere Stufen ineinander: ein langer Hub aus einem kurzen Gehäuse. Jede Stufe hat ihre eigene Fläche und damit ihre eigene Kraft.",
        zustand: "geplant",
        sinnbild: "Teleskopzylinder doppelt wirkend",
      },
      {
        id: "zylinder-tandem",
        name: "Tandemzylinder",
        satz: "Zwei Kolben auf einer Stange, hintereinander. Bei gleichem Durchmesser fast die doppelte Kraft.",
        zustand: "geplant",
        sinnbild: "Tandemzylinder doppelt wirkend",
      },
      {
        id: "zylinder-kolbenstangenlos",
        name: "Kolbenstangenloser Zylinder",
        satz: "Der Schlitten läuft außen mit, magnetisch oder mechanisch gekoppelt. Langer Hub, halbe Baulänge.",
        zustand: "geplant",
        sinnbild: "Kolbenstangenloser Zylinder mit magnetischer Kupplung",
      },
    ],
  },
  {
    id: "wegeventile",
    titel: "Wegeventile",
    einleitung:
      "Bauteile, die bestimmen, welchen Weg die Luft nimmt. Die erste Zahl sagt, wie viele Anschlüsse das Ventil hat, die zweite, wie viele Stellungen.",
    kacheln: [
      {
        id: "ventil-3-2",
        name: "3/2-Wegeventil",
        satz:
          "Drei Anschlüsse, zwei Stellungen: das Ventil für den einfachwirkenden Zylinder und für jeden Taster, im Schnitt an der Ebene des Schiebers. "
          + "Kräftiges Blau steht unter Druck, blasses ist Abluft, und das Schaltzeichen schaltet mit. "
          + "In Ruhe gesperrt oder in Ruhe offen, mit Zeitlupe, Handbetrieb und Zerlegen.",
        zustand: "fertig",
        ordner: "Wegeventil-3-2",
        sinnbild: "3/2-Wegeventil, monostabil",
        marken: ["ISO 5599-1", "Größe 1", "G1/4", "NC und NO"],
      },
      {
        id: "ventil-4-2",
        name: "4/2-Wegeventil",
        satz: "Vier Anschlüsse, zwei Stellungen. Steuert einen doppeltwirkenden Zylinder mit nur einem gemeinsamen Abluftweg.",
        zustand: "geplant",
        sinnbild: "4/2-Wegeventil",
      },
      {
        id: "ventil-5-2",
        name: "5/2-Wegeventil",
        satz:
          "Das Standardventil für den doppeltwirkenden Zylinder, im Schnitt an der Ebene des Schiebers. "
          + "Kräftiges Blau steht unter Druck, blasses ist Abluft, und das Schaltzeichen schaltet mit. "
          + "Mit Zeitlupe, Handbetrieb und Zerlegen, monostabil und bistabil.",
        zustand: "fertig",
        ordner: "Wegeventil-5-2",
        sinnbild: "5/2-Wegeventil, Impulsventil",
        marken: ["ISO 5599-1", "Größe 1", "G1/4", "mono- und bistabil"],
      },
      {
        id: "ventil-5-3",
        name: "5/3-Wegeventil",
        satz: "Mit Mittelstellung: der Zylinder bleibt stehen, wo er ist – gesperrt oder entlüftet, je nach Bauart.",
        zustand: "geplant",
        sinnbild: "5/3-Wegeventil mit Mittelstellung",
      },
    ],
  },
  {
    id: "sperr-und-stromventile",
    titel: "Sperr- und Stromventile",
    einleitung: "Bauteile, die die Luft bremsen, sperren oder miteinander verknüpfen.",
    kacheln: [
      {
        id: "rueckschlagventil",
        name: "Rückschlagventil",
        satz: "Lässt die Luft nur in eine Richtung durch. Das einfachste Bauteil der Pneumatik und in fast jedem anderen eingebaut.",
        zustand: "geplant",
        sinnbild: "Rückschlagventil",
      },
      {
        id: "drosselrueckschlagventil",
        name: "Drosselrückschlagventil",
        satz:
          "Von 1 nach 2 muss die Luft durch den Ringspalt am Zapfen der Rändelschraube, die Lippe einer Dichtmanschette sperrt den Weg außen herum; von 2 nach 1 klappt die Lippe nach innen, und die Luft strömt frei vorbei. "
          + "Damit stellt man die Geschwindigkeit eines Zylinders ein, meist über die Abluft. Kräftiges Blau steht unter Druck, blasses Blau ist entspannt.",
        zustand: "fertig",
        ordner: "Drosselrueckschlagventil",
        sinnbild: "Drosselrückschlagventil, einstellbar",
        marken: ["G1/4", "Leitungseinbau", "einstellbar", "420 / 780 l/min"],
      },
      {
        id: "schnellentlueftungsventil",
        name: "Schnellentlüftungsventil",
        satz: "Lässt die Abluft direkt am Zylinder ins Freie, statt den Weg zurück durchs Ventil zu nehmen. Macht den Rückhub deutlich schneller.",
        zustand: "geplant",
        sinnbild: "Schnellentlüftungsventil",
      },
      {
        id: "wechselventil",
        name: "Wechselventil (ODER)",
        satz: "Zwei Eingänge, ein Ausgang: Luft kommt durch, wenn an mindestens einem Eingang Druck anliegt.",
        zustand: "geplant",
        sinnbild: "Wechselventil, ODER-Funktion",
      },
      {
        id: "zweidruckventil",
        name: "Zweidruckventil (UND)",
        satz: "Zwei Eingänge, ein Ausgang: Luft kommt nur durch, wenn an beiden Eingängen Druck anliegt. Die Zweihandsicherung an jeder Presse.",
        zustand: "geplant",
        sinnbild: "Zweidruckventil, UND-Funktion",
      },
    ],
  },
  {
    id: "e-pneumatik",
    titel: "E-Pneumatik",
    einleitung: "Wie der Strom die Luft schaltet – und wie aus einem Schaltplan eine Bewegung wird.",
    kacheln: [
      {
        id: "magnetspule",
        name: "Magnetspule",
        satz: "Strom erzeugt ein Magnetfeld, das Magnetfeld bewegt den Steuerschieber. Das Bindeglied zwischen Elektrik und Pneumatik.",
        zustand: "geplant",
        sinnbild: "Magnetbetätigung",
      },
      {
        id: "taster-schalter",
        name: "Taster und Schalter",
        satz: "Schließer, Öffner und Wechsler – und warum ein Taster nur schaltet, solange man drückt.",
        zustand: "geplant",
        sinnbild: "Taster, Schließer",
      },
      {
        id: "relais",
        name: "Relais",
        satz: "Ein kleiner Strom schaltet einen großen. Mit Selbsthaltung wird daraus ein Speicher.",
        zustand: "geplant",
        sinnbild: "Relais mit Schließerkontakt",
      },
      {
        id: "stromlaufplan",
        name: "Stromlaufplan",
        satz: "Wie der Schaltplan gelesen wird: Strompfade, Betriebsmittelkennzeichen und was wo hingehört.",
        zustand: "geplant",
        sinnbild: "Stromlaufplan in aufgelöster Darstellung",
      },
      {
        id: "sensoren",
        name: "Sensoren",
        satz: "Näherungsschalter am Zylinder, Druckschalter in der Leitung: woher die Steuerung weiß, was die Mechanik gerade tut.",
        zustand: "geplant",
        sinnbild: "Näherungsschalter, magnetisch betätigt",
      },
    ],
  },
];

/** Every tile, flattened, in the order the page shows them. */
export function alleKacheln() {
  return RUBRIKEN.flatMap((r) => r.kacheln.map((k) => ({ ...k, rubrik: r.id })));
}

/** The tiles whose page exists. */
export function fertige() {
  return alleKacheln().filter((k) => k.zustand === "fertig");
}
