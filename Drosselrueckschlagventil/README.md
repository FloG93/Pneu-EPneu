# Drosselrückschlagventil

Ein einstellbares Drosselrückschlagventil mit G¼-Anschlüssen (Vorbild: **Festo
GRA-1/4-B**, Leitungseinbau, Rändelschraube) – als isometrische Schnittzeichnung in
der Ebene seiner beiden Kanäle, in der die Druckluft sichtbar strömt. Dazu steht das
**Schaltzeichen** nach ISO 1219-1 neben der Figur und färbt den Zweig, durch den gerade
Luft strömt.

Das Ventil hat nur zwei Anschlüsse, **1** und **2**, und **zwei Wege nebeneinander**:

| Richtung | Kugel | Luft strömt durch | Durchfluss bei 6 bar, Δp 1 bar |
| --- | --- | --- | --- |
| **1 → 2** (gedrosselt) | liegt auf dem Sitz, sperrt | nur die Drossel | 420 l/min bei ganz offener Drossel, 210 l/min bei halber, 0 l/min bei zu |
| **2 → 1** (frei) | hebt ab | Drossel **und** Rückschlagweg | 780 l/min bei offener Drossel, 360 l/min bei zugedrehter |

Wozu das gut ist, erklärt die Seite im Text: Man setzt das Ventil an den Zylinder
(Anschluss 1 zum Zylinder, 2 zum Wegeventil) und drosselt so die **Abluft**; die Zuluft
strömt frei hinein. Wie ein Zylinder aufgebaut ist: [doppeltwirkender
Zylinder](../Zylinder-Doppeltwirkend/).

## Was man tun kann

- **Richtung** schaltet zwischen 1 → 2 (gedrosselt) und 2 → 1 (frei). Die Kugel sitzt
  oder hebt ab, die Feder wird zusammengedrückt, die Luft nimmt den anderen Weg.
- **Drosselschraube** (0 bis 6 Umdrehungen, Start 3) dreht die Nadel nach oben oder
  unten. Die Kontermutter bleibt stehen.
- **Automatik** wechselt die Richtung von selbst (alle 3 s).
- **Zerlegen und zusammenbauen** fährt die Baugruppen entlang der Achsen auseinander,
  hält kurz und setzt sie von innen nach außen wieder zusammen. Ein zweiter Druck oder
  Escape bricht ab.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor und blendet
  den Rest zurück.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Druckluft vor der Drossel bzw. vor der Kugel |
| **blasses Blau** | entspannte Luft dahinter |

Die Töne sind dieselben wie in allen Figuren (`figur/luft.mjs`) und unterscheiden sich
in der **Helligkeit**, nicht im Farbton. Die Seite färbt die Seite des Ventils, aus
der die Luft kommt, kräftig und die andere blass: So sieht man den Druckabfall an der
Drossel, auch bei zugedrehter Drossel. Die Teilchen laufen nur dort, wo wirklich Luft
strömt; im gesperrten unteren Weg (1 → 2) steht die Luft still.

## Die Zahlen

Alles, was die Anzeige nennt, kommt aus dem Modell, das auch die Nadel und die Kugel
bewegt (`figur/stromventil.mjs`, `GRA_1_4`). Die Anzeige gilt immer bei den Bedingungen
des Datenblatts: **6 bar am Eingang und 1 bar Druckunterschied**; das steht in ihrer
zweiten Zeile.

- Drosselweg: Durchfluss = 420 l/min · Öffnungsanteil der Drossel · Δp / 1 bar.
- Rückschlagweg (nur 2 → 1): (780 − 420) l/min · Hub der Kugel · Δp / 1 bar.
- Die Kugel öffnet im Modell ab 0,1 bar Druckunterschied und ist bei 0,2 bar ganz
  offen; sie folgt in rund 20 ms.

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
(`python3 -m http.server 8311 --bind 127.0.0.1`) und misst an der Zeichnung: den Hub der
Kugel in Pixeln (gleich `kugelHubMm` mal Maßstab), die Bewegung der Nadel (Umdrehungen
mal Steigung), ob die Nadelspitze bei 0 Umdrehungen auf dem Sitz landet, welche Wege
Teilchen führen und in welche Richtung sie laufen, dass kein Teilchen auf festem
Material liegt, die Töne beider Seiten, den gefärbten Zweig des Schaltzeichens, die
Anzeige (420 / 210 / 0 und 780 / 360 l/min), die Automatik und das Zerlegen.

## Was die Figur nicht zeigt

**Belegt** (Festo-Datenblatt 6509, GRA-1/4-B): Anschlüsse G¼ beidseitig, Rändelschraube
aus Messing, Normalnenndurchfluss in Drosselrichtung **420 l/min** (Drossel ganz offen)
und in Rückschlagrichtung **780 l/min**, Betriebsdruck 0,1 bis 10 bar, Gehäuse aus
Zink-Druckguss, Dichtungen aus NBR, 180 g.

**Alles Übrige ist angenommen:**

- **Der Innenaufbau ist ein Lehrbuchbild.** Das Datenblatt zeigt die echte Innenform
  nicht. Gezeichnet sind eine Kammer hinter jedem Anschluss und zwei gerade Wege
  dazwischen: oben die Drosselnadel über einem Sitzwulst, unten eine Kugel, die eine
  Feder gegen eine Wand mit Sitzloch drückt, eingesetzt von unten durch eine
  Verschlussschraube. Gehäusemaße (86 × 62 mm), Kugel Ø 8,8 mm, Feder, Gewinde der Nadel
  und Lage der Kanäle sind aus den G¼-Anschlüssen geschätzt.
- **360 l/min Rückschlagweg allein** = 780 − 420, unter der Annahme, dass beide Wege
  parallel und unabhängig wirken.
- **Die Drosselkennlinie ist linear:** Durchfluss ∝ Öffnungsanteil der Nadel über
  6 Umdrehungen bei 1 mm Steigung je Umdrehung. Eine echte Nadel verläuft nicht linear
  und lässt auch bei zugedrehter Schraube etwas Luft durch; das Modell nimmt einen
  dichten Sitz an.
- **Linear in Δp:** Das Modell rechnet den Durchfluss linear mit dem Druckunterschied
  (bei Δp = 0,5 bar die Hälfte, bei 6 bar das Sechsfache), ohne Düsengleichung und
  ohne kritisches Druckverhältnis. Der Katalog nennt nur den einen Wert bei Δp 1 bar;
  darum zeigt die Anzeige **nur diesen Betriebspunkt** (6 bar, Δp 1 bar). Für die
  Anschauung stimmt das; zum Auslegen einer Anlage ist es zu grob.
- **Öffnungsdruck der Kugel 0,1 bar** (der kleinste Betriebsdruck), volle Öffnung bei
  0,2 bar; der Hub der Kugel (2 mm) und ihre 20 ms Laufzeit sind angenommen.
- **Die Durchflussrichtung 1 → 2 ist die gedrosselte.** Das Datenblatt nennt die
  Richtung nicht, die Seite legt sie so fest.

**Vereinfachungen in der Zeichnung:**

- Das Ventil ist in der Ebene beider Kanäle **aufgeschnitten**; die vordere Hälfte
  fehlt. Die Kanäle sind als Rechtecke gezeichnet, nicht als runde Bohrungen mit
  Gewinde und Kegelsitz.
- Es gibt **keine Befestigungsmutter und keinen Gewindehals**: Das Gewinde der
  Schraube greift unmittelbar im Gehäuse. Das Datenblatt nennt eine Befestigung für den
  Fronttafeleinbau; sie ist nicht gezeichnet.
- **Dichtungen** (O-Ringe) sind nicht gezeichnet; die Steckverschraubungen sind
  vereinfacht (Gewinde, Sechskant, Körper, Lösering).
- Es ist kein **Zylinder** angeschlossen; ein Schaltungsbeispiel folgt später.
- Die Schläuche sind nach wenigen Zentimetern abgeschnitten.
