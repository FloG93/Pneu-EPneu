// The legend of this component: the only place its texts live. The buttons,
// the explanation line during the take-apart run and the leader-line numbers
// all read these entries, and the page test counts them. Every number comes
// from the same model that moves the parts (figur/pneumatik.mjs, ESNU_50_25).
import * as PN from "../../../figur/pneumatik.mjs";

const Z = PN.ESNU_50_25;
const feder0 = Math.round(PN.federKraft({ weg: 0 }, Z));
const federHub = Math.round(PN.federKraft({ weg: Z.hub }, Z));
const kraft6 = Math.round(PN.kraftAus(6, Z));

export const LEGENDE = [
  { nr: "01", piece: "boden", name: "Zylinderboden mit Anschluss", satz: "Schließt das Rohr hinten ab und trägt den einzigen Luftanschluss. Durch ihn kommt die Druckluft, die den Kolben gegen die Feder hinausschiebt." },
  { nr: "02", piece: "rohr", name: "Zylinderrohr", satz: "Führt den Kolben und hält den Druck. Hier ist es aufgeschnitten: hinter dem Kolben die Druckkammer, davor der Federraum mit der Feder." },
  { nr: "03", piece: "kolben", name: "Kolben mit Dichtung und Puffer", satz: "Trennt die Druckkammer vom Federraum. Auf seine volle Fläche wirkt der Druck; die elastische Scheibe fängt ihn in der hinteren Endlage ab." },
  { nr: "04", piece: "stange", name: "Kolbenstange", satz: "Überträgt die Kraft nach außen und schiebt hier einen Schlitten. Am Ende trägt sie ein Gewinde M16×1,5 für die Last." },
  { nr: "05", piece: "feder", name: "Rückstellfeder", satz: `Bringt den Kolben zurück, sobald die Kammer entlüftet ist: ${feder0} N eingefahren, ${federHub} N am Hubende. Beim Ausfahren zieht sie Kraft ab: Am Hubende bleiben bei 6 bar nur ${kraft6} N statt der vollen Kolbenkraft.` },
  { nr: "06", piece: "kopf", name: "Zylinderkopf mit Filter", satz: "Führt und dichtet die Stange. Der Federraum ist über einen Filter offen zur Umgebung: Die Luft strömt beim Ausfahren hinaus und beim Einfahren wieder herein, sodass dort nie Druck entsteht." },
  { nr: "07", piece: "fuss", name: "Fußbefestigung", satz: "Zwei Füße halten Boden und Kopf auf der Grundplatte, damit der Zylinder die Reaktionskraft der Stange abstützt." },
  { nr: "08", piece: "gehaeuse", name: "Ventilgehäuse mit drei Anschlüssen", satz: "Daher der Name 3/2: drei Anschlüsse (1 Zuluft, 2 zum Zylinder, 3 Abluft) und zwei Schaltstellungen. In Ruhe ist das Ventil geschlossen (NC) und der Zylinder entlüftet." },
  { nr: "09", piece: "schieber", name: "Steuerschieber mit Dichtscheiben", satz: "Gedrückt verbindet er 1→2 und füllt die Kammer, losgelassen 2→3 und entlüftet sie. Beim Umschalten ist kurz alles zu." },
  { nr: "10", piece: "betaetigung", name: "Druckknopf mit Rückstellfeder", satz: "Solange der Taster gedrückt ist, fährt der Zylinder aus. Lässt man ihn los, holt die Feder den Schieber zurück und der Zylinder fährt von selbst ein." },
  { nr: "11", piece: "leitung", name: "Schläuche", satz: "Ein Schlauch führt die Zuluft zum Ventil, ein zweiter vom Ventil in den Zylinderboden. Die Abluft verlässt das Ventil nach unten." },
];
