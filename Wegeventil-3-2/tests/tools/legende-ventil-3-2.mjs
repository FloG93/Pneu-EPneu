// The legend of this component: the only place its texts live. The buttons,
// the explanation line during the take-apart run and the leader-line numbers
// all read these entries, and the page test counts them. Dimensions come
// from the model, so the legend cannot drift from the drawing. Every sentence
// holds for both spools: the normally closed one (NC) and the normally open
// one (NO).
import { ISO_5599_GR1 as M } from "../../../figur/ventil.mjs";

const prozent = Math.round(M.ueberdeckung * 100);

export const LEGENDE = [
  { nr: "01", piece: "grundplatte", name: "Grundplatte mit Anschlüssen 1, 2 und 3", satz: "Trägt das Ventil und seine drei Anschlüsse: 1 für die Druckluft, 2 für den Verbraucher, 3 für die Abluft. Die Schläuche bleiben hier angeschraubt, wenn man das Ventil zum Tauschen abnimmt." },
  { nr: "02", piece: "dichtung", name: "Flachdichtung", satz: "Liegt zwischen Ventil und Grundplatte und dichtet die drei Kanäle gegeneinander und nach außen ab." },
  { nr: "03", piece: "gehaeuse", name: "Ventilgehäuse mit Bohrung und Ringnuten", satz: "In der Bohrung gleitet der Schieber. Jede der drei Ringnuten gehört zu einem Anschluss und führt über einen Kanal hinunter in die Grundplatte." },
  { nr: "04", piece: "schieber", name: "Steuerschieber, NC oder NO", satz: `Die dicken Bunde sperren, die dünnen Hälse dazwischen verbinden. Verschiebt man ihn um ${M.hub} mm, wechselt das Ventil die Stellung: Beim NC-Ventil (in Ruhe gesperrt) verbindet er in Ruhe 2 mit 3 und betätigt 1 mit 2, beim NO-Ventil (in Ruhe offen) in Ruhe 1 mit 2 und betätigt 2 mit 3.` },
  { nr: "05", piece: "ringe", name: "Dichtringe des Schiebers", satz: `Sitzen auf den Bunden und dichten gegen die Bohrung. Weil die Bunde etwas länger sind als nötig (Überdeckung ${prozent} % des Hubs), ist beim Umschalten kurz alles zu.` },
  { nr: "06", piece: "kappe", name: "Steuerkappe mit Steuerkolben", satz: `Kommt Druckluft am Steueranschluss an, drückt sie auf den Steuerkolben (Ø ${M.steuerkolben} mm), und der schiebt den Schieber gegen die Feder. Beim NC-Ventil heißt der Anschluss 12 und verbindet 1 mit 2, beim NO-Ventil heißt er 10 und sperrt die Zufuhr 1 ab.` },
  { nr: "07", piece: "rueckstell", name: "Rückstellkappe mit Druckfeder", satz: `Die Feder (Vorspannung ${M.federVor} N) schiebt den Schieber zurück in die Ruhestellung, sobald die Steuerluft weg ist. Diese Seite hat keinen Steueranschluss: Hier wirkt nur die Feder.` },
  { nr: "08", piece: "schrauben", name: "Befestigungsschrauben", satz: "Zwei lange Schrauben halten das Ventil auf der Grundplatte. Zum Tauschen löst man nur diese beiden; die Kappen bleiben mit ihren eigenen Schrauben am Gehäuse." },
  { nr: "09", piece: "daempfer", name: "Schalldämpfer an Anschluss 3", satz: "Die Abluft entweicht durch gesintertes Metall. Das bremst sie ab und macht aus dem lauten Knall ein leises Zischen." },
  { nr: "10", piece: "leitung", name: "Zuleitung 1 und Arbeitsleitung 2", satz: "An 1 kommt die Druckluft an, 2 führt zum Verbraucher, zum Beispiel zu einem Zylinder. Die Schläuche stecken in Steckverschraubungen und sind hier abgeschnitten gezeichnet." },
  { nr: "11", piece: "steuerleitung", name: "Steuerleitung 12 oder 10", satz: "Ein dünner Schlauch vom Signalgeber, etwa einem Taster. Wer hier Druck gibt, schaltet das Ventil – daher der Name Steuerluft." },
];
