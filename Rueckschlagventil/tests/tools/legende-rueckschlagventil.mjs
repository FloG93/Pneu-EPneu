// The legend of this component: the only place its texts live. The buttons, the explanation
// line during the take-apart run and the leader-line numbers all read these entries, and the
// page test counts them and the sentences. Every number comes from the model that moves the
// parts (figur/rueckschlagventil.mjs) or is derived from it here, with the derivation said.
// What the catalogue gives (Festo H-1/4-B, data sheet 11689 and catalogue H/HA/HB) is said as
// such; what is assumed or redrawn after the working principle (the catalogue shows no section)
// says so.
import { H_1_4 as M } from "../../../figur/rueckschlagventil.mjs";
import { kommaZahl as komma } from "../../../figur/seite.mjs";

const ms = Math.round(M.schaltzeit * 1000);
// derived: the force of the opening pressure on the seat bore (Ø 6 mm, assumed): 0,1 bar = 0,01 N/mm² on π · 3² mm²
const SITZ_D = 6;
const KRAFT = M.oeffnungsdruck * 0.1 * Math.PI * (SITZ_D / 2) ** 2;

export const LEGENDE = [
  { nr: "01", piece: "anschluss2", name: "Anschluss 2 rechts mit Verschraubung und Schlauch",
    satz: "Hier verlässt die Luft das Ventil. Das Gehäuse hat an dieser Seite ein Außengewinde G1/4 (Katalog), darauf sitzt eine Steckverschraubung mit Innengewinde; im Schlauchstück steckt die Leitung zum Verbraucher. Wie das Gegenstück gebaut ist, nennt der Katalog nicht: Die Verschraubung ist als aufgeschraubte Hülse nachgezeichnet. Der Lösering gibt den Schlauch frei, wenn man ihn eindrückt." },
  { nr: "02", piece: "anschluss1", name: "Anschluss 1 links mit Verschraubung und Schlauch",
    satz: "Der Eingang liegt links im Innengewinde G1/4 (Katalog). Die Steckverschraubung ist eingeschraubt, im Schlauchstück steckt die Leitung von der Druckquelle. Die Luft darf nur von hier nach rechts strömen, darum wird das Ventil in Pfeilrichtung eingebaut: Anschluss 1 zur Druckquelle, Anschluss 2 zum Verbraucher." },
  { nr: "03", piece: "dichtring", name: "Dichtring",
    satz: "Der Dichtring (NBR, im Lieferumfang laut Katalog) liegt auf dem Außengewinde an der Gehäuseschulter und dichtet die aufgeschraubte Verschraubung ab. Er ist dünn, fährt beim Zerlegen mit der rechten Verschraubung und hat seine eigene Nummer. Am echten Teil ist er blau; hier ist er dunkel gezeichnet, weil Blau in dieser Sammlung nur für Druckluft steht." },
  { nr: "04", piece: "feder", name: "Druckfeder",
    satz: `Die Druckfeder drückt den Teller auf den Sitz. Sie ist sehr schwach: Schon ${komma(M.oeffnungsdruck)} bar Druckunterschied drücken auf die Sitzfläche (Ø ${SITZ_D} mm, angenommen) mit ${komma(Math.round(KRAFT * 100) / 100)} N und überwinden sie (abgeleitet: ${komma(M.oeffnungsdruck * 0.1)} N/mm² mal ${komma(Math.round(Math.PI * (SITZ_D / 2) ** 2 * 10) / 10)} mm²). Beim Öffnen wird sie um ${M.hub} mm zusammengedrückt; das ist überhöht gezeichnet, Maße und Federdaten sind angenommen.` },
  { nr: "05", piece: "teller", name: "Ventilteller mit NBR-Dichtfläche",
    satz: `Der Ventilteller besteht aus einem Metallkern und einer Dichtfläche aus NBR, die auf den Sitz drückt und sperrt. Der Druck von Eingang 1 hebt ihn ab, sobald er den Druck an Ausgang 2 um mehr als ${komma(M.oeffnungsdruck)} bar übersteigt (Öffnungsdruck, angenommen nach der Schwesterreihe H-QS); ab ${komma(M.vollDp)} bar Unterschied ist er im Modell ganz offen (angenommen). Kommt der höhere Druck von Ausgang 2, presst er den Teller nur fester auf den Sitz. Der Weg des Tellers dauert im Modell ${ms} ms (angenommen).` },
  { nr: "06", piece: "gehaeuse", name: "Gehäuse mit Sitzeinsatz",
    satz: `Das Gehäuse (Aluminium eloxiert, das ganze Ventil wiegt ${komma(25.4)} g laut Katalog) hat links das Innengewinde und rechts den Gewindezapfen. Innen sitzt ein eingepresster Sitzeinsatz mit der Kegelsenkung Ø ${SITZ_D} mm; dahinter liegt die Federkammer mit dem Anschlag für die Feder. Der Katalog nennt ${M.qn} l/min bei 1 bar Druckabfall und höchstens 11 Nm Anziehdrehmoment. Der Sechskant (Schlüsselweite 19 mm) ist als Zylinder vereinfacht; der Innenaufbau ist nachgezeichnet, denn der Katalog zeigt keinen Schnitt.` },
];
