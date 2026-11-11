// The legend of this component: the only place its texts live. The buttons,
// the explanation line during the take-apart run and the leader-line numbers
// all read these entries, and the page test counts them and the sentences.
// Every number comes from the model that moves the parts (figur/stromventil.mjs).
// The order is the take-apart order: outside first (a nut cannot leave over the screw's
// head, so the screw goes before it; the lip slides off the insert before the insert goes).
// What the catalogue's section drawing shows (Festo GR/GRA: nut, regulating screw, housing)
// is said as such; what is assumed or redrawn says so.
import { GRA_1_4 as M } from "../../../figur/stromventil.mjs";

const frei = M.qnFrei - M.qnDrossel;
const komma = (x) => String(x).replace(".", ",");

export const LEGENDE = [
  { nr: "01", piece: "leitung", name: "Schläuche",
    satz: "Zwei Schlauchstücke führen die Druckluft zum Ventil und weiter zum Zylinder; hier sind sie nach wenigen Zentimetern abgeschnitten. Sie stecken ohne Werkzeug in den Steckverschraubungen. Der Schnitt muss rechtwinklig sein, sonst dichtet der Schlauch nicht." },
  { nr: "02", piece: "verschraubung", name: "Steckverschraubungen G1/4",
    satz: "Beide Verschraubungen sitzen mit dem G1/4-Gewinde im Gehäuse und nehmen den Schlauch auf. Am Sechskant setzt man den Schraubenschlüssel an. Der Ring am Ende ist der Lösering: Man drückt ihn hinein, dann gibt die Klemme den Schlauch frei." },
  { nr: "03", piece: "schraube", name: "Regulierschraube mit Rändelkopf und Zapfen",
    satz: `Am Rändelkopf stellt man den Durchfluss ein. Der kegelige Zapfen taucht von oben in die Drosselbohrung des Ventileinsatzes: Der Ringspalt zwischen Zapfen und Bohrung ist die Drossel, und je tiefer der Zapfen sitzt, desto enger ist er. Im Modell ändert eine Umdrehung die Höhe um ${komma(M.steigung)} mm, und ${M.umdrehungen} Umdrehungen gehen von ganz zu bis ganz offen (angenommene Werte); der Spalt ist in der Zeichnung überhöht.` },
  { nr: "04", piece: "kontermutter", name: "Mutter",
    satz: "Die Mutter sitzt auf dem Gewindehals der Einschraubbuchse; im Schnitt des Katalogs trägt sie die Nummer 1. Die Zeichnung nimmt an, dass sie die Buchse gegen das Gehäuse spannt und so die Einstellung sichert; was sie im Katalogventil genau tut, sagt der Schnitt nicht." },
  { nr: "05", piece: "buchse", name: "Einschraubbuchse mit O-Ring",
    satz: "Die Buchse ist von oben ins Gehäuse geschraubt und führt die Regulierschraube in ihrem Innengewinde. Der O-Ring unter dem Bund dichtet sie nach außen ab. Zwischen ihrem unteren Ende und dem Ventileinsatz bleibt der schmale Spalt, durch den die Luft vom Zapfen zum Anschluss 2 weiterströmt." },
  { nr: "06", piece: "manschette", name: "Dichtmanschette (Lippenring)",
    satz: `Die Manschette aus NBR ist das eigentliche Rückschlagventil. Von 1 nach 2 spreizt der Druck ihre Lippe an die Gehäusewand, und der Weg ist dicht; von 2 nach 1 klappt der Druck die Lippe nach innen, und die Luft strömt außen an ihr vorbei. Dann kommen zu den ${M.qnDrossel} l/min der offenen Drossel im Modell ${frei} l/min (${M.qnFrei} − ${M.qnDrossel}, abgeleitet) hinzu.` },
  { nr: "07", piece: "scheibe", name: "Stützscheibe",
    satz: "Die Scheibe liegt unter der Lippe auf dem Ventileinsatz und stützt sie, wenn der Druck von oben sie nach innen klappt. Sie ist so klein, dass sie beim Zerlegen als eigene Baugruppe nur knapp lesbar bleibt; im Katalogschnitt erscheint sie als schmales Plättchen unter der Manschette." },
  { nr: "08", piece: "einsatz", name: "Ventileinsatz mit Drosselbohrung",
    satz: "Der Einsatz ist eine Hülse in der Mitte des Gehäuses. In seiner Bohrung sitzt der Zapfen der Regulierschraube; Querbohrungen unten lassen die Luft von Anschluss 1 hinein. Außen trägt er die Manschette und die Stützscheibe." },
  { nr: "09", piece: "gehaeuse", name: "Gehäuse mit zwei Anschlüssen",
    satz: "Das Gehäuse (im Schnitt des Katalogs die Nummer 3) ist ein Block mit den zwei Anschlüssen G1/4 auf versetzter Höhe und zwei Bohrungen quer zur Befestigung. In der Mitte liegt die Bohrung für Buchse und Einsatz; Anschluss 1 öffnet unter ihr, Anschluss 2 seitlich über der Manschette. Die Maße sind geschätzt und der Schnitt dem Katalogbild nachgezeichnet, nicht vermessen." },
];
