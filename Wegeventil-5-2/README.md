# 5/2-Wegeventil

Ein Längsschieberventil in der Größe 1 nach **ISO 5599-1** (Anschluss G¼) auf seiner
Grundplatte – als isometrische Schnittzeichnung in der Ebene des Steuerschiebers, in
der die Druckluft sichtbar strömt. Dazu steht das **Schaltzeichen** nach ISO 1219-1
neben der Figur und schaltet mit.

Die Seite gehört zum Zylinder: Dessen Seite nennt das Ventil nur als Zubehör, hier
sieht man, was in ihm passiert.

## Was man tun kann

- **Signal 14** und **Signal 12** geben Steuerluft auf die Endkappen. Beim
  monostabilen Ventil bleibt der Schieber nur in Stellung 14, solange man den Knopf
  hält; beim bistabilen genügt ein kurzer Druck, das Ventil merkt sich die Stellung.
  Kommen beide Signale zugleich, bleibt der Schieber, wo er ist.
- **Monostabil / bistabil** wechselt die Bauart. Das Ventil geht dabei in die
  Ausgangsstellung 12, die Signale sind aus.
- **Automatik** schaltet von selbst hin und her.
- **Zeitlupe** (1× bis 1/50) dehnt die Modellzeit. So sieht man, wie sich die
  Steuerkammer erst füllt und der Schieber danach losläuft.
- **Schieber von Hand** (0 bis 100 %) fährt den Schieber selbst. Auf 50 % sind alle
  Wege zu; die Drücke an 2 und 4 bleiben stehen. Ein Signal beendet den Handbetrieb.
- **Druck** stellt den Versorgungsdruck zwischen 2 und 8 bar ein.
- **Zerlegen und zusammenbauen** fährt die Baugruppen entlang der Schieberachse
  auseinander, hält kurz und setzt sie von innen nach außen wieder zusammen. Ein
  zweiter Druck oder Escape bricht ab.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor und
  blendet den Rest zurück.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Druckluft unter Druck |
| **blasses Blau** | Abluft, die über einen Schalldämpfer entweicht |

Die Töne sind dieselben wie im Zylinder (`figur/luft.mjs`); sie unterscheiden sich in
der **Helligkeit**, nicht im Farbton, und bleiben so auch für Rot-Grün-Blinde und im
Schwarzweiß-Ausdruck trennbar. Das Schaltzeichen benutzt dieselben beiden Töne.

## Die Zahlen

Alles, was die Anzeige nennt (Drücke an 2 und 4, Schaltzeit), kommt aus dem Modell,
das auch den Schieber bewegt (`figur/ventil.mjs`). Bei 6 bar:

```
A_Steuerkolben = π/4 · 20²                 = 314,2 mm²
F_Steuer       = 0,6 N/mm² · 314,2 mm²     = 188 N
Feder 30 N + Haftreibung 8 N = 38 N        → löst sich ab 1,21 bar in der Steuerkammer (monostabil)
nur Haftreibung 8 N                        → löst sich ab 0,25 bar in der Steuerkammer (bistabil)
```

Gemessene Schaltzeiten des Modells (Schieber bei 98 % seines Weges). Das bistabile
Ventil bekommt, wie auf der Seite, einen Impuls von 150 ms; vor dem Impuls 12 hat es in
Stellung 14 geruht, die Kammer 14 ist also entlüftet:

| Bauart | Vorgang | Druck | Zeit |
| --- | --- | --- | --- |
| monostabil | Umschalten auf 14 | 2 bar | 74,2 ms |
| monostabil | Umschalten auf 14 | 6 bar | 22,0 ms |
| monostabil | Umschalten auf 14 | 8 bar | 17,2 ms |
| monostabil | Rückstellung durch die Feder | 2 bar | 12,6 ms |
| monostabil | Rückstellung durch die Feder | 6 bar | 21,8 ms |
| monostabil | Rückstellung durch die Feder | 8 bar | 24,2 ms |
| bistabil | Impuls 14 | 2 bar | 17,8 ms |
| bistabil | Impuls 14 | 6 bar | 9,6 ms |
| bistabil | Impuls 14 | 8 bar | 8,4 ms |
| bistabil | Impuls 12 | 6 bar | 9,6 ms |

Datenblätter nennen für Ventile dieser Größe 12 bis 52 ms. Diese Werte gelten für
Ventile mit Federrückstellung und für magnetbetätigte Ventile. Das bistabile Ventil hat
keine Feder: Sein Steuerkolben muss nur die Haftreibung überwinden, darum schaltet es im
Modell schneller, bei 6 bar in knapp 10 ms. Die Anzeige auf der Seite rundet auf ganze
Millisekunden. `figur/tests/ventil.test.mjs` und `Wegeventil-5-2/tests/seite.test.mjs`
halten diese Tabelle gegen das Modell.

Die Kräfte sind **theoretische** Werte; die Reibung der Dichtungen zieht in der Praxis
noch einmal 3 bis 10 % ab.

## Neu erzeugen

Die Seite ist erzeugt, nicht von Hand geschrieben:

```bash
npm run bau:ventil
```

```bash
npm run pruef:ventil
```

Das prüft die Ruhelage (`--audit`: keine Durchdringung, jedes Teil liegt auf, jede
Leitung endet auf einem Anschluss, vorn liegt das nähere Teil) und alle Baugruppen am
Ende ihres Fluchtwegs (`--apart`).

```bash
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Wegeventil-5-2/index.html
```

```bash
npm run pruef:browser:ventil
```

Der Browsertest braucht einen laufenden Server auf Port 8311
(`python3 -m http.server 8311 --bind 127.0.0.1`) und prüft in beiden Modi unter anderem
die Signale, das gleichzeitige Drücken beider Signale, den Wechsel der Bauart mitten im
Umschalten, den Handbetrieb und das Abbrechen eines gehaltenen Signals.

## Was die Figur nicht zeigt

**Belegt** (Größe 1 nach ISO 5599-1 / VDMA 24345, Festo VSVA): Anschlussgewinde G¼,
Baubreite 42 mm, Nenndurchfluss etwa 1300 l/min und Schaltzeiten von 12 bis 52 ms je
nach Variante. Die Zeichnung bildet das Ventil in diesen Größen nach, nicht ein
bestimmtes Fabrikat.

**Alles Übrige ist angenommen**, weil die Zeichnung es braucht und es nicht als
Einzelmaß im Katalog steht:

- Baulänge des Gehäuses etwa 130 mm
- Schieberbohrung Ø 13 mm, Schieberhub 7 mm
- Steuerkolben Ø 20 mm
- Federkraft etwa 30 N, vorgespannt
- Überdeckung 30 % des Hubs, wie im Zylindermodell
- Volumen hinter 2 und 4: ein Schlauch von 0,5 m (6/4 mm) plus 50 cm³ – es steht für
  „irgendein Verbraucher"
- Masse des Schiebers 30 g, Haftreibung 8 N, Gleitreibung 5 N

**Zwei Leitwerte sind auf die Datenblatt-Schaltzeiten abgestimmt**, nicht gemessen oder
dem Katalog entnommen: `leitwertSteuer` (8·10⁴ mm³/s je bar) für das Füllen der
Steuerkammer und `leitwertEntlueft` (6·10⁵ mm³/s je bar) für das Entlüften der
Steuerkammer über die Abluft des Signalventils. Sie sind so gewählt, dass
Umschalten und Rückstellung des monostabilen Ventils bei 6 bar im Bereich 12 bis 52 ms
liegen. Für das bistabile Ventil ist nichts abgestimmt: Es rechnet mit denselben
Leitwerten und ist ohne Feder schneller. Die Zahlen auf
der Seite folgen also einer Annahme, die sich an Datenblättern orientiert, nicht an
einer Messung am Ventil.

**Vereinfachungen im Modell:** Die Luft wird isotherm gerechnet. Der Durchfluss durch
die Ventilwege ist ein linearer Leitwert statt der Düsengleichung mit ihrem kritischen
Druckverhältnis. Für die Anschauung stimmt das; für die Auslegung einer Anlage ist es
zu grob.

**Vereinfachungen in der Zeichnung:**

- Das Ventil ist in der Ebene des Schiebers **aufgeschnitten**; die vordere Hälfte
  fehlt. Die Anschlüsse 1 bis 5 sitzen an der Grundplatte.
- Das Ventil ist **pneumatisch betätigt**. Die Steuerluft kommt vom **Signalventil**
  (z. B. einem 3/2-Wegeventil), das nicht gezeichnet ist; die Signale 14 und 12 sind
  Knöpfe.
- Die **Dichtringe** am Schieber sind als Ringe angedeutet, nicht als Dichtungsprofile.
- Das **Schaltzeichen** ist eine Vereinfachung nach ISO 1219-1 und zeigt, welches Feld
  gerade wirkt.
