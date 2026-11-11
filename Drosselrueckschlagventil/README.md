# Drosselrückschlagventil

Ein einstellbares Drosselrückschlagventil mit G¼-Anschlüssen (Vorbild: **Festo GR/GRA**,
Leitungseinbau, Rändelschraube) – als isometrische Schnittzeichnung durch die Mitte, in der die
Druckluft sichtbar strömt. Dazu steht das **Schaltzeichen** nach ISO 1219-1 neben der Figur und
färbt den Zweig, durch den gerade Luft strömt.

## Wie das Ventil gebaut ist

Der Funktionsschnitt im Katalog „Drossel-Rückschlagventile GR/GRA" zeigt (Abschnitt
Werkstoffe: Positionen 1 Mutter, 2 Regulierschraube, 3 Gehäuse, Dichtungen aus NBR) **keine
Kugel, keine Feder und keinen zweiten Kanal**. Alles sitzt koaxial um die Regulierschraube; die
Figur zeichnet diese Bauform im Stil der Sammlung nach (nichts aus dem Katalogbild ist
übernommen):

- **Gehäuse:** ein Block mit zwei Anschlüssen G¼ auf **versetzter Höhe** und zwei Bohrungen quer
  zur Befestigung.
- **Einschraubbuchse** von oben ins Gehäuse geschraubt, mit O-Ring abgedichtet; sie führt die
  Regulierschraube. Auf ihrem Hals sitzt die **Mutter**.
- **Regulierschraube** mit Rändelkopf; unten ein **kegeliger Zapfen**.
- **Ventileinsatz:** eine Hülse in der Mitte mit der **Drosselbohrung**. Der Zapfen taucht von oben
  hinein; der **Ringspalt** zwischen Zapfen und Bohrung ist die Drossel.
- **Dichtmanschette** (kegeliger Lippenring aus NBR) außen um den Einsatz, mit einer
  **Stützscheibe** darunter. Sie ist das Rückschlagventil: Druck auf ihrer offenen Seite spreizt die
  Lippe an die Gehäusewand, und der Weg ist dicht; Druck von der anderen Seite klappt die Lippe nach
  innen, und die Luft strömt außen vorbei.

Anschluss **1** (links, tiefer) führt über einen Kanal unter die Mitte: in die Drosselbohrung von
unten und in den Raum unter der Manschette. Anschluss **2** (rechts, höher) führt in den Ringraum
um Einsatz und Manschette; über den Spalt zwischen Buchse und Einsatz ist er mit dem Raum um den
Zapfen verbunden. Die Figur spiegelt damit den Katalogschnitt: Die gedrosselte Richtung ist hier
1 → 2.

| Richtung | Lippe | Luft strömt | Durchfluss bei 6 bar, Δp 1 bar |
| --- | --- | --- | --- |
| **1 → 2** (gedrosselt) | gespreizt, sperrt | nur durch den Ringspalt | 420 l/min bei ganz offener Drossel, 210 l/min bei halber, 0 l/min bei zu |
| **2 → 1** (frei) | nach innen geklappt | außen an der Manschette vorbei **und** durch den Spalt | 780 l/min bei offener Drossel, 360 l/min bei zugedrehter |

Wozu das gut ist, erklärt die Seite im Text: Man setzt das Ventil an den Zylinder (Anschluss 1 zum
Zylinder, 2 zum Wegeventil) und drosselt so die **Abluft**; die Zuluft strömt frei hinein. Wie ein
Zylinder aufgebaut ist: [doppeltwirkender Zylinder](../Zylinder-Doppeltwirkend/).

## Was man tun kann

- **Richtung** schaltet zwischen 1 → 2 (gedrosselt) und 2 → 1 (frei). Die Lippe der Manschette
  spreizt sich oder klappt nach innen, die Luft nimmt den anderen Weg.
- **Drosselschraube** (0 bis 6 Umdrehungen, Start 3) fährt den Zapfen nach oben oder unten:
  Der Ringspalt wird weiter oder enger. Die Mutter bleibt stehen.
- **Automatik** wechselt die Richtung von selbst (alle 3 s).
- **Zerlegen und zusammenbauen** fährt die Baugruppen entlang der Achsen auseinander,
  hält kurz und setzt sie von innen nach außen wieder zusammen. Ein zweiter Druck oder
  Escape bricht ab.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor und blendet
  den Rest zurück.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Druckluft unter Druck |
| **blasses Blau** | entspannte Luft hinter der Drossel |

Die Töne sind dieselben wie in allen Figuren (`figur/luft.mjs`) und unterscheiden sich
in der **Helligkeit**, nicht im Farbton. In Drosselrichtung (1 → 2) ist die Seite von Anschluss 1 kräftig und die von Anschluss 2
blass: So sieht man den Druckabfall am Ringspalt, auch bei zugedrehter Drossel. **Bei
freiem Durchgang (2 → 1) mit eingeklappter Lippe sind beide Seiten kräftig**, denn die Luft
wird dort kaum entspannt. Die Teilchen laufen entlang der wirklichen Wege in Strömungsrichtung
und nie über Material; an der Lippe vorbei strömt nur in der freien Richtung etwas.

## Die Zahlen

Alles, was die Anzeige nennt, kommt aus dem Modell, das auch den Zapfen und die Lippe
bewegt (`figur/stromventil.mjs`, `GRA_1_4`). Die Anzeige gilt immer bei den Bedingungen
des Datenblatts: **6 bar am Eingang und 1 bar Druckunterschied**; das steht in ihrer
zweiten Zeile.

- Drosselweg: Durchfluss = 420 l/min · Öffnungsanteil der Drossel · Δp / 1 bar.
- Weg an der Lippe vorbei (nur 2 → 1): (780 − 420) l/min · Klappe der Lippe · Δp / 1 bar.
- Die Lippe klappt im Modell ab 0,1 bar Druckunterschied und ist bei 0,2 bar ganz
  eingeklappt; sie folgt in rund 20 ms.

## Neu erzeugen

Die Seite ist erzeugt, nicht von Hand geschrieben:

```bash
npm run bau:drossel
```

```bash
npm run pruef:drossel
```

Das prüft die Ruhelage (`--audit`) und alle Baugruppen am Ende ihres Fluchtwegs
(`--apart`).

```bash
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Drosselrueckschlagventil/index.html
```

```bash
npm run pruef:browser:drossel
```

Der Browsertest braucht einen laufenden Server auf Port 8311
(`python3 -m http.server 8311 --bind 127.0.0.1`) und misst an der Zeichnung: ob die
Lippe in beiden Richtungen als gespreizt oder eingeklappt gezeichnet ist, die Bewegung
des Zapfens (Umdrehungen mal Steigung), ob der Kegel bei 0 Umdrehungen in der Bohrung
sitzt, welche Wege Teilchen führen und in welche Richtung sie laufen, dass kein Teilchen
auf einer Schnittfläche liegt, die Töne beider Seiten (in der freien Richtung beide
kräftig), den gefärbten Zweig des Schaltzeichens, die Anzeige (420 / 210 / 0 und 780 / 360
l/min), die Automatik und das Zerlegen.

## Was die Figur nicht zeigt

**Belegt** (Festo-Datenblatt 6509 und Katalog GR/GRA, GRA-1/4-B): Anschlüsse G¼ beidseitig,
Rändelschraube aus Messing, Normalnenndurchfluss in Drosselrichtung **420 l/min** (Drossel
ganz offen) und in Rückschlagrichtung **780 l/min**, Betriebsdruck 0,1 bis 10 bar, Gehäuse aus
Zink-Druckguss, Dichtungen aus NBR, 180 g; die Bauform nach dem Funktionsschnitt (Mutter,
Regulierschraube, Gehäuse; Einsatz mit Manschette).

**Alles Übrige ist angenommen oder nachgezeichnet:**

- **Die inneren Wege sind dem Katalogschnitt nachgezeichnet, nicht vermessen.** Gehäusemaße
  (70 × 42 mm), Durchmesser von Buchse, Einsatz, Manschette und Bohrung, Länge des Zapfens, die
  Lage der Querbohrungen und der Befestigungsbohrungen sind aus den G¼-Anschlüssen geschätzt.
- **Der Ringspalt und die Lippe sind überhöht gezeichnet.** In Wirklichkeit ist der Spalt
  Bruchteile eines Millimeters breit und die Lippe dünner; ohne Übertreibung sähe man sie auf dem
  Beamer nicht. Die Drosselbohrung hat in der Zeichnung 3 mm Radius, der Zapfen wächst um 0,4 mm
  je Millimeter Höhe, die Lippe klappt um 1,5 mm.
- **360 l/min an der Lippe vorbei** = 780 − 420, unter der Annahme, dass beide Wege parallel
  und unabhängig wirken.
- **Die Drosselkennlinie ist linear:** Durchfluss ∝ Öffnungsanteil des Zapfens über 6
  Umdrehungen bei 1 mm Steigung je Umdrehung. Ein echter Kegelspalt verläuft nicht linear und
  lässt auch bei zugedrehter Schraube etwas Luft durch; das Modell nimmt einen dichten Sitz an.
- **Linear in Δp:** Das Modell rechnet den Durchfluss linear mit dem Druckunterschied (bei
  Δp = 0,5 bar die Hälfte, bei 6 bar das Sechsfache), ohne Düsengleichung und ohne kritisches
  Druckverhältnis. Der Katalog nennt nur den einen Wert bei Δp 1 bar; darum zeigt die Anzeige
  **nur diesen Betriebspunkt** (6 bar, Δp 1 bar). Für die Anschauung stimmt das; zum Auslegen
  einer Anlage ist es zu grob.
- **Öffnungsdruck der Lippe 0,1 bar** (der kleinste Betriebsdruck), ganz eingeklappt bei
  0,2 bar; ihre 20 ms Laufzeit ist angenommen.
- **Die Durchflussrichtung 1 → 2 ist die gedrosselte.** Das Datenblatt nennt die Richtung nicht;
  die Seite spiegelt den Katalogschnitt so.
- **Die Aufgabe der Mutter** sagt der Katalogschnitt nicht; die Zeichnung nimmt an, dass sie die
  Buchse gegen das Gehäuse spannt.

**Vereinfachungen in der Zeichnung:**

- Alle Drehteile sind **durch die Mitte aufgeschnitten** und schraffiert (jedes Teil in anderer
  Richtung); sobald ein Teil beim Zerlegen seinen Platz verlässt, wird es **ganz** gezeichnet.
  Die Rückseiten der halbierten Teile sind nicht gezeichnet.
- Die Querbohrungen des Einsatzes sind je ein Fenster in der Schnittebene; im ganzen Einsatz
  fehlen sie.
- Die Luft strömt in Wirklichkeit rundherum; die Figur zeigt je einen Weg in der Schnittebene,
  den linken Zweig des Spalts mit halber Menge.
- Es ist kein **Zylinder** angeschlossen; ein Schaltungsbeispiel folgt später.
- Die Schläuche sind nach wenigen Zentimetern abgeschnitten, die Steckverschraubungen
  vereinfacht (Gewinde, Sechskant, Körper, Lösering).
