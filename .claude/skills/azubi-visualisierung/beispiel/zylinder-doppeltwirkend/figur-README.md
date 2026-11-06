# Doppeltwirkender Zylinder

Ein Normzylinder nach **ISO 15552**, Bohrung 50 mm, Hub 200 mm, zusammen mit dem
**5/2-Wegeventil**, das ihn umschaltet – als isometrische Schnittzeichnung, in der
die Druckluft sichtbar strömt.

Das Zylinderrohr ist über ein Fenster aufgeschnitten, das Ventil an der Ebene
seines Steuerschiebers. Dadurch sieht man beides zugleich: den Kolben, der das
Rohr in zwei Kammern teilt, und den Schieber, der entscheidet, welche Kammer
gerade Luft bekommt. Die Kolbenstange schiebt einen Schlitten auf einer Schiene –
die bewegte Masse, von der das Rechenmodell spricht, bewegt in der Zeichnung
auch wirklich etwas.

## Was man tun kann

- **Ventil schalten** verschiebt den Steuerschieber in die andere Stellung. Danach
  passiert erst einmal nichts: der Schieber braucht Zeit, in der Mitte sind beide
  Arbeitsanschlüsse zu, und die Gegenkammer muss entlüften, bevor sich der Kolben
  bewegt. Genau dieser Moment ist zu sehen, weil dann beide Kammern mittelblau sind.
- **Automatik** lässt den Zyklus von selbst laufen.
- **Zerlegen und zusammenbauen** fährt die zwölf Baugruppen entlang der
  Zylinderachse auseinander, hält kurz und setzt sie von innen nach außen wieder
  zusammen. Jede einfahrende Baugruppe wird unter der Zeichnung benannt und erklärt.
  Ein zweiter Druck oder Escape bricht ab.
- **Druck** stellt den Betriebsdruck zwischen 2 und 8 bar ein. Die angezeigten
  Kräfte rechnen mit.
- Ein Klick auf einen **Legendeneintrag** hebt diese Baugruppe orange hervor und
  blendet den Rest zurück.

## Die Farben der Luft

Zwei Töne mit zwei Bedeutungen, nicht bloß zwei Farben:

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Druckluft unter Druck, auf dem Weg in eine Kammer |
| **blasses Blau** | Abluft, schon entspannt, auf dem Weg zum Schalldämpfer |

Im hellen Modus ist „kräftig" das dunklere Blau, im dunklen das hellere – genauso
herum wie alle anderen Töne der Zeichnung. Die Bedeutung bleibt, die Helligkeit
folgt dem Untergrund. Die vier Töne sind **gerechnet, nicht gewählt**: jeder hält
mindestens 3:1 gegen das Papier, die beiden liegen mindestens 2:1 auseinander, und
ihr Unterschied steckt in der **Helligkeit**, nicht im Farbton – damit sie auch für
Rot-Grün-Blinde und in einem Schwarzweiß-Ausdruck zu trennen sind. Geprüft von
`figur/tests/luft.test.mjs`.

## Die Zahlen

Alles, was die Anzeige nennt, kommt aus demselben Modell, das den Kolben bewegt
(`figur/pneumatik.mjs`). Bei 6 bar:

```
A_Kolben = π/4 · 50²        = 1963,5 mm²     F_aus = 0,6 N/mm² · 1963,5 = 1178 N
A_Ring   = π/4 · (50² − 20²) = 1649,3 mm²    F_ein = 0,6 N/mm² · 1649,3 =  990 N
Flächenverhältnis φ = 1,19
```

Das sind **theoretische** Werte; die Reibung der Dichtungen zieht in der Praxis
3 bis 10 Prozent ab. Das steht auch auf der Seite.

## Neu erzeugen

Die Seite ist erzeugt, nicht von Hand geschrieben:

```bash
node Zylinder-Doppeltwirkend/tests/tools/build-zylinder.mjs
```

```bash
node Zylinder-Doppeltwirkend/tests/tools/build-zylinder.mjs --audit
```

```bash
node Zylinder-Doppeltwirkend/tests/tools/build-zylinder.mjs --apart
```

`--audit` prüft die Ruhelage – dass sich keine Teile durchdringen, dass jedes auf
etwas steht, dass jede Leitung auf einem Anschluss endet, dass kein Schlauch sich
auf dem Bildschirm umknickt und dass überall das nähere Teil vorn liegt.
`--apart` prüft dasselbe mit allen Baugruppen am Ende ihres Fluchtwegs.

```bash
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Zylinder-Doppeltwirkend/index.html
```

```bash
node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Zylinder-Doppeltwirkend/
```

Der Browsertest läuft in beiden Modi und prüft 24 Dinge je Modus, darunter: startet
zusammengebaut, eine Nummer je Legendeneintrag, Darüberfahren merkt sich nichts,
der Rest tritt beim Auswählen wirklich zurück (gemessen an der Deckkraft, nicht an
der gesetzten Klasse), beim Zerlegen strömt keine Luft, Themen- und Kontrastwechsel
mitten im Lauf werfen nichts um, jeder Text hält 4,5:1, und bei 390 px gibt es kein
Seitwärtsscrollen.

## Was die Figur nicht zeigt

**Maße aus dem Katalog** (Festo DSBC, Ø 50): Kolbendurchmesser 50 mm,
Kolbenstange 20 mm, Stangengewinde M16×1,5, Anschluss G ¼, Zuganker M10,
Grundlänge 141,8 mm. Der Hub von 200 mm ist gewählt.

**Alles Übrige ist angenommen**, weil es für die Zeichnung gebraucht wurde und
nicht als Einzelmaß im Katalog steht:

- Wandstärke des Zylinderrohrs 3 mm, Deckel 24 mm dick, Deckelbreite 64 mm
- Kolben 22 mm breit, Dämpfungsbuchse 20 mm lang bei Ø 26 mm
- Totraum 6 mm je Seite, Schlauch- und Anschlussvolumen 11 cm³ je Seite
- bewegte Masse 25 kg (Kolben, Stange und Schlitten zusammen)
- Dichtungsreibung 40 N, Leitwerte von Ventil und Dämpfungsdrossel
- Schaltzeit des Steuerschiebers 25 ms mit 30 % Überdeckung

**Vereinfachungen im Modell:** Die Luft wird isotherm gerechnet – die Erwärmung
beim Verdichten fehlt. Der Durchfluss durch Ventil und Drossel ist ein linearer
Leitwert statt der Düsengleichung mit ihrem kritischen Druckverhältnis. Für die
Anschauung stimmt das; für die Auslegung einer Anlage ist es zu grob.

**Vereinfachungen in der Zeichnung:**

- Die beiden **oberen Zuganker** sind über die Länge des Schnitts weggenommen, wie
  die Rohrwand auch – sonst liefen sie quer durch die offene Kammer. An beiden
  Enden sind sie vollständig gezeichnet.
- Die Abluft verlässt das Ventil **nach unten durch die Grundplatte** zu den
  Schalldämpfern an deren Vorderseite. So bauen Ventile auf Grundplatte wirklich,
  und die Oberseite bleibt für die Arbeitsanschlüsse frei.
- Der **Abstreifer, die Stangendichtung und der Führungsring** im Zylinderkopf sind
  als Ringe angedeutet, nicht als einzelne Dichtungsprofile gezeichnet.
- Die **Magnetringe** für Näherungsschalter fehlen; sie kommen mit dem Bauteil
  „Sensoren" in der Rubrik E-Pneumatik.
