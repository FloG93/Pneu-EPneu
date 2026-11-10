// The legend of this component: the only place its texts live. The buttons,
// the explanation line during the take-apart run and the leader-line numbers
// all read these entries, and the page test counts them and the sentences.
// Every number comes from the model that moves the parts (figur/stromventil.mjs).
// The order is the take-apart order: outside first.
import { GRA_1_4 as M } from "../../../figur/stromventil.mjs";

const frei = M.qnFrei - M.qnDrossel;
const komma = (x) => String(x).replace(".", ",");

export const LEGENDE = [
  { nr: "01", piece: "leitung", name: "Schläuche",
    satz: "Zwei Schlauchstücke führen die Druckluft zum Ventil und weiter zum Zylinder; hier sind sie nach wenigen Zentimetern abgeschnitten. Sie stecken ohne Werkzeug in den Steckverschraubungen. Der Schnitt muss rechtwinklig sein, sonst dichtet der Schlauch nicht." },
  { nr: "02", piece: "verschraubung", name: "Steckverschraubungen G1/4",
    satz: "Beide Verschraubungen sitzen mit dem G1/4-Gewinde im Gehäuse und nehmen den Schlauch auf. Am Sechskant setzt man den Schraubenschlüssel an. Der Ring am Ende ist der Lösering: Man drückt ihn hinein, dann gibt die Klemme den Schlauch frei. Der Anschluss links ist 1, der rechts 2." },
  { nr: "03", piece: "schraube", name: "Regulierschraube mit Rändelkopf und Drosselnadel",
    satz: `Am Rändelkopf stellt man den Luftdurchgang ein. Im Modell hebt oder senkt eine Umdrehung die Nadel um ${komma(M.steigung)} mm, und ${M.umdrehungen} Umdrehungen gehen von ganz zu bis ganz offen (angenommene Werte). Die kegelige Spitze sitzt über dem Drosselsitz: Je tiefer sie sitzt, desto enger ist der Spalt und desto weniger Luft kommt durch.` },
  { nr: "04", piece: "kontermutter", name: "Kontermutter",
    satz: "Die Kontermutter spannt sich gegen das Gehäuse und sichert die Regulierschraube. Ohne sie könnten Erschütterungen die eingestellte Drosselung mit der Zeit verstellen. Zum Einstellen löst man sie, dreht am Rändelkopf und zieht sie danach wieder fest." },
  { nr: "05", piece: "verschluss", name: "Verschlussschraube mit Dichtring",
    satz: "Sie verschließt die Bohrung des Rückschlagventils von unten. In diesem Lehrbuchbild lassen sich Kugel und Feder nur von hier einsetzen; der Zapfen der Schraube trägt zugleich die Feder. Der Dichtring unter dem Kopf dichtet das Gewinde ab." },
  { nr: "06", piece: "feder", name: "Rückschlagfeder",
    satz: `Eine schwache Druckfeder drückt die Kugel auf ihren Sitz. Im Modell öffnet die Kugel erst bei ${komma(M.oeffnungsdruck)} bar Druckunterschied, danach hebt der Druck sie gegen die Feder ab. In Drosselrichtung kommt der Luftdruck der Feder zu Hilfe und presst die Kugel noch fester an.` },
  { nr: "07", piece: "kugel", name: "Kugel des Rückschlagventils",
    satz: `Die Kugel sperrt den Rückschlagweg, wenn die Luft von 1 nach 2 strömt; dann muss alles durch die Drossel (höchstens ${M.qnDrossel} l/min). Strömt sie von 2 nach 1, hebt die Kugel ab, und über den Rückschlagweg fließen zusätzlich ${frei} l/min: zusammen ${M.qnFrei} l/min bei offener Drossel. In Drosselrichtung presst der Luftdruck die Kugel zusätzlich auf den Sitz.` },
  { nr: "08", piece: "gehaeuse", name: "Gehäuse mit zwei Wegen",
    satz: "Das Zink-Druckguss-Gehäuse ist in der Ebene beider Kanäle aufgeschnitten. Zwischen den Anschlüssen 1 und 2 liegen zwei Wege nebeneinander: oben der Drosselweg mit dem Nadelsitz, unten der Rückschlagweg mit der Kugel. Der Aufbau innen ist ein Lehrbuchbild, denn das Datenblatt zeigt die echte Innenform nicht." },
];
