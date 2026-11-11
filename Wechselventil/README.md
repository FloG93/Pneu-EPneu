# Wechselventil (ODER)

Ein Wechselventil mit G¼-Anschlüssen (Zahlen vom **Festo OS-1/4-B**, Innenaufbau nach einem **Schnittmodell von Bosch**) als
isometrische Schnittzeichnung durch die Mitte, in der die Druckluft sichtbar strömt. Dazu steht das **Schaltzeichen** nach
ISO 1219-1 neben der Figur: Seine Kugel liegt am gesperrten Eingang, und jeder Teil der Leitung hat den Ton seines Drucks.

## Wie das Ventil gebaut ist

Das Wechselventil macht eine **ODER-Verknüpfung**: Luft an *einem* oder an *beiden* Eingängen kommt am Ausgang an; sind beide
drucklos, bleibt der Ausgang drucklos.

- **Gehäuse:** ein Block mit **durchgehender Bohrung**. Die zwei **Eingänge** (beide mit der Ziffer **1**) sitzen an den Enden,
  der **Ausgang 2** zweigt in der Mitte nach oben ab und trägt das große Gewinde G¼. Zwei Bohrungen quer durch den Block dienen
  der Befestigung.
- **Verschlussstück** links, eingeschraubt, mit **O-Ring** in der Nut und dem linken **Sitz** an seinem Innenende. Den rechten
  Sitz bildet das Gehäuse selbst. In der Schnittfläche ist das Verschlussstück bräunlich und gegenläufig schraffiert, damit man es
  vom Block unterscheidet.
- **Schaltkörper:** ein tonnenförmiges Gummiteil mit zwei gewölbten Dichtflächen, das **lose** in der Kammer liegt. Der höhere
  Druck schiebt ihn auf den Sitz des **anderen** Eingangs und sperrt ihn. Die Luft des offenen Eingangs strömt durch den
  **Ringspalt** um den Körper zum Ausgang.
- **Drei Steckverschraubungen** mit kurzen Schlauchstücken an 1, 1 und 2.

**Wer zuerst kommt:** Liegt an beiden Eingängen derselbe Druck an, bleibt der Körper, wo er ist; das zuerst angekommene Signal
behält den Ausgang. Bei verschiedenem Druck sperrt der niedrigere Eingang. Ein gesperrter Eingang bekommt nichts vom
Ausgang; der Ausgang entlüftet nur über einen offenen Eingang.

| Eingang links 1 | Eingang rechts 1 | Ausgang 2 |
| --- | --- | --- |
| 0 | 0 | 0 |
| 1 | 0 | 1 |
| 0 | 1 | 1 |
| 1 | 1 | 1 |

Wozu das gut ist, erklärt die Seite im Text: Zwei Taster oder Hand und Automatik führen in eine Signalleitung zusammen, ohne
dass sie sich gegenseitig belüften. Das Zweidruckventil (UND) folgt später; wie ein Ventil von einem Signal geschaltet wird:
[3/2-Wegeventil](../Wegeventil-3-2/), und was am Ausgang meist hängt: [doppeltwirkender Zylinder](../Zylinder-Doppeltwirkend/).

## Was man tun kann

- **Eingang links** und **Eingang rechts** (0 bis 8 bar in Schritten von 0,5) stellen jeden Fall ein. Der Körper wandert zum
  Sitz des niedrigeren Drucks; ein Eingriff schaltet die Automatik aus.
- **Automatik:** acht Schritte in der Reihenfolge links an, beide an, links aus, beide aus, rechts an, beide an, rechts aus,
  beide aus. Sie zeigt die Wahrheitstabelle, die Regel „wer zuerst kommt" (beide an) und das Umschalten des Körpers. Jedes
  Einschalten beginnt wieder bei Schritt 0. **Takt:** 0,3 s Modellzeit je Schritt; weil die **Zeitlupe mit 1/10** beginnt,
  sind das 3 s auf dem Bildschirm (ohne Zeitlupe wären es 0,3 s).
- **Zeitlupe** (1× bis 50-fach langsamer, Start 1/10): Mit ihr sind die 8 ms des Umschaltens zu sehen.
- **Zerlegen und zusammenbauen** beendet die Automatik, fährt die Baugruppen entlang der Achsen auseinander, hält kurz und
  setzt sie von innen nach außen wieder zusammen. Ein zweiter Druck oder Escape bricht ab.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor und blendet den Rest zurück.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Raum unter Druck (ab 6 bar voll kräftig, darunter ein Mischton) |
| **blasses Blau** | drucklos |

Die Töne sind dieselben wie in allen Figuren (`figur/luft.mjs`) und unterscheiden sich in der **Helligkeit**. Sie folgen dem
**Druck**, nicht festen Seiten: Mit „links an, rechts aus" sind der linke Eingang und der Ausgang kräftig, der rechte Eingang
blass. **Gesperrt ist nicht drucklos:** Ein gesperrter Eingang kann unter Druck stehen (links 6 bar, rechts 3 bar), seine Leitung
behält dann ihren Ton; der Körper zeigt nur, dass er nichts zum Ausgang durchlässt.

**Gemessen:** Im Browsertest ist das gezeichnete Bild eines 6-bar-Raums gegen einen 0-bar-Raum mindestens 2,4 : 1 verschieden
(Pixel des Bildschirmfotos), in beiden Modi; **gemessen: 2,76 : 1 hell, 2,49 : 1 dunkel** (die Drosselseite erreicht mit demselben Verfahren 2,87 : 1 und 2,42 : 1).

**Teilchen** laufen nur auf einem Weg, durch den das Modell Luft strömen lässt, in Strömungsrichtung (beim Entlüften über den
offenen Eingang rückwärts) und nie über Material; am gesperrten Sitz steht keines. Das Füllen der 50 cm³ hinter dem Ausgang
dauert im Modell nur wenige Millisekunden, darum lässt die Zeichnung die Teilchen nach dem Spitzenwert **0,5 s lang
nachleuchten**; im Ruhezustand strömt nichts und die Seite zeigt keine Teilchen.

## Die Zahlen

Alles, was die Anzeige nennt, kommt aus dem Modell, das auch den Körper und die Farben bewegt (`figur/wechselventil.mjs`,
`OS_1_4`). Die Anzeige hat zwei Zeilen: die Drücke der Eingänge und des Ausgangs, dann der gesperrte Eingang und der Durchfluss.

- Durchfluss über einen offenen Eingang = 1170 l/min · Δp / 1 bar (nur der **1-bar-Wert** ist Katalog).
- Ein gesperrter Eingang führt 0 l/min, auch rückwärts.
- Der Körper wechselt ab **0,05 bar** Druckunterschied und braucht **8 ms** von Sitz zu Sitz; die Kammer hinter dem Ausgang
  fasst **50 cm³**.

## Neu erzeugen

```bash
npm run bau:wechsel
npm run pruef:wechsel
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Wechselventil/index.html
npm run pruef:browser:wechsel
```

`pruef:wechsel` prüft die Ruhelage (`--audit`) und alle Baugruppen am Ende ihres Fluchtwegs (`--apart`). Der Browsertest braucht
einen laufenden Server auf Port 8311 (`python3 -m http.server 8311 --bind 127.0.0.1`) und misst an der Zeichnung: die Lage des
Körpers in Pixeln in jedem Zustand (Hub), die Töne der drei Räume, das gezeichnete Helligkeitsverhältnis 6 bar gegen 0 bar,
das Schaltzeichen (Kugel und Töne), welcher Weg Teilchen führt und in welche Richtung, dass jedes Teilchen in der Luft und unter
keinem Teil liegt, die Anzeige, die Zeitlupe (der Körper ist in Bildern unterwegs zu sehen), die acht Schritte der Automatik mit der
Lage des Körpers, die Regler, die Wahrheitstabelle, 390 px Breite und das Zerlegen.

## Was die Figur nicht zeigt

**Belegt** (Festo-Datenblatt 6682, OS-1/4-B; Katalog OS/ZK 2024): Anschlüsse **G¼** an allen drei Stellen, Normalnenndurchfluss
**1170 l/min**, Betriebsdruck **1 bis 10 bar** (die Regler gehen bis 8 bar), Nennweite **6,5 mm**, Gehäuse aus Aluminium-Knetlegierung,
Dichtungen aus NBR, 110 g, Durchgangsbohrung zur Befestigung; Ziffern 1 – 1 – 2. Der Aufbau (Block mit durchgehender Bohrung,
Eingänge an den Bohrungsenden, Ausgang oben, Verschlussstück mit O-Ring, Gummikörper, zwei Befestigungsbohrungen) folgt dem
Schnittmodell von Bosch (Wikimedia Commons, *Shuttle valve intersection*).

**Alles Übrige ist angenommen oder nachgezeichnet:**

- **Das Datenblatt zeigt keinen Schnitt.** Innenmaße und Form des Körpers sind dem Bosch-Schnittmodell nachgezeichnet, nicht
  vermessen. Blockmaße (60 × 28 × 35 mm), der Körper aus NBR und die Befestigungsbohrungen (Ø 4,3) sind angenommen.
- **Überhöht gezeichnet:** Die Kammer hat Ø 13,2 mm (im Entwurf 12) und der Körper Ø 8,8 × 13 mm (im Entwurf 9 × 13), damit man den
  **Ringspalt** um ihn sieht. Der Hub von **6 mm** ist größer als im echten Ventil. Der **O-Ring ist dicker** gezeichnet (Schnur
  2,5 mm) als ein Ring dieser Größe, damit man ihn in der Nut sieht. Die Sitzkegel sind aus dem Kappenradius des Körpers
  abgeleitet, nicht gemessen.
- **Durchflusskennlinie linear in Δp:** Katalog ist nur der Normwert bei 1 bar. Die Zeichnung rechnet 1170 l/min je bar; bei 6 bar
  Druckabfall wären das 7020 l/min, ein echtes Ventil drosselt dort ab. Der Wert ist eine **Extrapolation**, kein Katalogwert.
- **Schaltdruck 0,05 bar** (Haftreibung und Trägheit) und **Schaltzeit 8 ms** sind angenommen, ebenso das **Volumen 50 cm³** hinter
  Ausgang 2.
- **Kein Druckstoß:** Ein echtes Wechselventil zeigt beim Umschalten einen kleinen Druckstoß. Im Modell nimmt ein Eingang, zu
  dem der Körper unterwegs ist, keine Luft aus der Kammer (angenommen: Die Strömung zöge den Körper in den Sitz); dadurch gibt
  es beim Wechsel keinen Druckeinbruch.
- **Der Körper in Mittelstellung:** Ein Körper unterwegs, dessen Druckunterschied verschwindet, läuft zum näheren Sitz.
- **Nachleuchten der Teilchen** (0,5 s) ist eine Darstellungsentscheidung, kein Messwert.
- **Das Schaltzeichen** beschriftet die Eingänge wie Wikipedia und der Festo-Katalog mit **1 – 1** und den Ausgang mit **2**. In
  Unterlagen von Festo Didactic heißt der zweite Eingang **1/3** (so auch in der SMC-Symboltabelle: 1 / 3 / 2 mit dem Ausgang unten); hier
  tragen beide Eingänge die 1. Die Kugel liegt nur in der Zeitlupe über dem Knotenpunkt des Symbols.
- **Der Strom** in der Zeichnung ist die Luft in der Schnittebene, in Wirklichkeit strömt sie rundherum durch den Spalt.
- Es ist kein **Verbraucher** angeschlossen; ein Schaltungsbeispiel mit Zylinder und das Zweidruckventil (UND) folgen später.

**Vereinfachungen in der Zeichnung:** Alle Drehteile sind **durch die Mitte aufgeschnitten**; sobald ein Teil beim Zerlegen seinen
Platz verlässt, wird es **ganz** gezeichnet. Die Steckverschraubungen sind kompakt und vereinfacht (Gewinde, Sechskant, Körper,
Lösering), die Schlauchstücke nach wenigen Millimetern abgeschnitten. Von den Rückhälften sind die Bohrungswände nur als Schattierung
angedeutet; das Gewinde der Bohrungen zeigt die Zeichnung als Ringe, wenn die Verschraubung fehlt.
