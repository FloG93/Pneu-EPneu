// The legend of this component: the only place its texts live. The buttons, the explanation
// line during the take-apart run and the leader-line numbers all read these entries, and the
// page test counts them and the sentences. Every number comes from the model that moves the
// parts (figur/wechselventil.mjs). The entries keep the numbers of the specification; the
// take-apart order is the one in the build script (outside first).
// What the catalogue gives (Festo OS-1/4-B) is said as such; what is derived, assumed or
// redrawn from the Bosch cutaway model says so.
import { OS_1_4 as M } from "../../../figur/wechselventil.mjs";
import { kommaZahl as komma } from "../../../figur/seite.mjs";

const ms = Math.round(M.schaltzeit * 1000);

export const LEGENDE = [
  { nr: "01", piece: "anschluss2", name: "Anschluss 2 oben mit Verschraubung und Schlauch",
    satz: "Der Ausgang liegt oben in der Mitte: eine Steckverschraubung G1/4 mit einem kurzen Schlauchstück, hier nach wenigen Zentimetern abgeschnitten. Von hier geht die Luft weiter zum Verbraucher, zum Beispiel zum Steuerkolben eines Ventils. Der Lösering am Ende der Verschraubung gibt den Schlauch frei, wenn man ihn eindrückt." },
  { nr: "02", piece: "anschluss1l", name: "Anschluss 1 links mit Verschraubung und Schlauch",
    satz: "Der erste Eingang sitzt am linken Ende der Durchgangsbohrung. Die Verschraubung ist ins Verschlussstück geschraubt, daran steckt die Signalleitung von einem Taster oder Ventil. Beide Eingänge tragen die Ziffer 1, denn sie sind gleichwertig: Das Ventil macht keinen Unterschied zwischen links und rechts." },
  { nr: "03", piece: "anschluss1r", name: "Anschluss 1 rechts mit Verschraubung und Schlauch",
    satz: "Der zweite Eingang liegt am rechten Ende der Bohrung; seine Verschraubung sitzt unmittelbar im Gewinde des Gehäuses, ohne Verschlussstück. Auch hier steckt die Signalleitung im Schlauchstück. Alle drei Anschlüsse haben das Gewinde G1/4 (Katalog), und der Durchfluss über jeden Eingang ist gleich groß, denn das Ventil ist spiegelbildlich aufgebaut (angenommen)." },
  { nr: "04", piece: "stopfen", name: "Verschlussstück mit Sitz",
    satz: `Das Verschlussstück ist links in das Gehäuse geschraubt, so wie es das Bosch-Schnittmodell zeigt; durch diese Seite lässt sich der Schaltkörper einlegen. Sein Innenende trägt den linken Sitz, eine Bohrung mit Ø ${komma(M.nennweite)} mm und einer Fase, auf die sich der Körper legt (Nennweite laut Katalog, die Form dem Schnittmodell nachgezeichnet). Außen dichtet ein O-Ring in einer Nut.` },
  { nr: "05", piece: "oring", name: "O-Ring",
    satz: "Der O-Ring aus NBR sitzt in der Nut des Verschlussstücks und dichtet es gegen die Gehäusebohrung ab: Ohne ihn würde die Luft außen am Verschlussstück vorbei ins Freie gehen. Er ist klein und fährt beim Zerlegen mit dem Verschlussstück, hat aber seine eigene Nummer. Im Schnitt sieht man ihn als zwei Kreise." },
  { nr: "06", piece: "koerper", name: "Schaltkörper (Gummi)",
    satz: `Der Schaltkörper ist ein tonnenförmiges Gummiteil, das lose in der Kammer liegt. Der höhere Druck schiebt ihn gegen den Sitz des anderen Eingangs und sperrt ihn; die Luft strömt außen um den Körper herum zum Ausgang. Im Modell wechselt er erst ab ${komma(M.schaltdruck)} bar Druckunterschied (angenommen) und braucht ${ms} ms für den Weg von Sitz zu Sitz (angenommen); die ${M.hub} mm Hub sind in der Zeichnung überhöht.` },
  { nr: "07", piece: "gehaeuse", name: "Gehäuse mit Ausgangsbohrung und Befestigungsbohrungen",
    satz: `Das Gehäuse (Aluminium, 110 g laut Katalog) ist ein Block mit einer durchgehenden Bohrung; der Ausgang zweigt in der Mitte nach oben ab und trägt das große Gewinde G1/4. Zwei Bohrungen quer zum Block dienen der Befestigung. Der Katalog nennt ${M.qn} l/min bei 1 bar Druckabfall und 1 bis 10 bar Betriebsdruck. Die Maße sind dem Bosch-Schnittmodell nachgezeichnet, nicht vermessen.` },
];
