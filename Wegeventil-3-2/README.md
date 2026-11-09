# 3/2-Wegeventil

Ein Längsschieberventil in der Größe 1 nach **ISO 5599-1** (Anschluss G¼) auf seiner
Grundplatte – als isometrische Schnittzeichnung in der Ebene des Steuerschiebers, in
der die Druckluft sichtbar strömt. Dazu steht das **Schaltzeichen** nach ISO 1219-1
neben der Figur und schaltet mit.

Das 3/2-Ventil hat drei Anschlüsse (1 Druckluft, 2 Verbraucher, 3 Abluft) und zwei
Stellungen. Die Seite zeigt es in **zwei Bauarten**, die sich nur im Schieber
unterscheiden:

| Bauart | Ruhestellung | betätigt (Steuerluft) |
| --- | --- | --- |
| **NC**, in Ruhe gesperrt (Steueranschluss 12) | 1 gesperrt, 2 mit 3 verbunden | 1 mit 2 verbunden, 3 gesperrt |
| **NO**, in Ruhe offen (Steueranschluss 10) | 1 mit 2 verbunden, 3 gesperrt | 1 gesperrt, 2 mit 3 verbunden |

Es ist das Ventil, das auf der Seite des 5/2-Ventils als Signalgeber für die Steuerluft
gemeint ist: [zur 5/2-Seite](../Wegeventil-5-2/). Die Seite des Zylinders nennt das
Ventil nur als Zubehör, hier sieht man, was in ihm passiert.

## Was man tun kann

- **Signal 12** (beim NO-Ventil **Signal 10**) gibt Steuerluft auf die Steuerkappe. Der
  Schieber bleibt nur in der betätigten Stellung, solange man den Knopf hält; lässt man
  los, stellt die Feder zurück. Das 3/2-Ventil der Seite ist monostabil, einen
  Bistabil-Schalter gibt es nicht.
- **NO-Ventil** wechselt die Bauart. Das Ventil geht dabei sofort in die Ruhestellung,
  das Signal ist aus, der Schieber hängt nie in der Mitte. Beim NO-Ventil steht p2 in
  Ruhe schon auf dem Versorgungsdruck. Mit `?variante=no` in der Adresse beginnt die
  Seite mit dem NO-Ventil.
- **Automatik** schaltet von selbst hin und her.
- **Zeitlupe** (1× bis 1/50) dehnt die Modellzeit. So sieht man, wie sich die
  Steuerkammer erst füllt und der Schieber danach losläuft.
- **Schieber von Hand** (0 bis 100 %) fährt den Schieber selbst. Auf 50 % sind alle
  Wege zu; der Druck an 2 bleibt stehen. Ein Signal beendet den Handbetrieb.
- **Druck** stellt den Versorgungsdruck zwischen 2 und 8 bar ein.
- **Zerlegen und zusammenbauen** fährt die Baugruppen entlang der Achsen auseinander,
  hält kurz und setzt sie von innen nach außen wieder zusammen. Ein zweiter Druck oder
  Escape bricht ab; ein gehaltenes Signal endet dabei.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor und
  blendet den Rest zurück.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Druckluft unter Druck |
| **blasses Blau** | Abluft, die über den Schalldämpfer entweicht |

Die Töne sind dieselben wie im Zylinder und im 5/2-Ventil (`figur/luft.mjs`); sie
unterscheiden sich in der **Helligkeit**, nicht im Farbton, und bleiben so auch für
Rot-Grün-Blinde und im Schwarzweiß-Ausdruck trennbar. Das Schaltzeichen benutzt
dieselben beiden Töne.

## Die Zahlen

Alles, was die Anzeige nennt (Druck an 2, Schaltzeit), kommt aus dem Modell, das auch
den Schieber bewegt (`figur/ventil.mjs`); dieses liest die Wege aus derselben
Beschreibung, aus der das Schaltzeichen gezeichnet wird (`VENTIL_3_2_NC`,
`VENTIL_3_2_NO` in `figur/schaltzeichen.mjs`). Bei 6 bar:

```
A_Steuerkolben = π/4 · 20²                 = 314,2 mm²
F_Steuer       = 0,6 N/mm² · 314,2 mm²     = 188 N
Feder 30 N + Haftreibung 8 N = 38 N        → löst sich ab 1,21 bar in der Steuerkammer
```

Gemessene Schaltzeiten des Modells (Schieber bei 98 % seines Weges), für beide
Bauarten gleich, denn die Zeit hängt an der Steuerkammer und nicht am Schieber:

| Vorgang | Druck | Zeit |
| --- | --- | --- |
| Umschalten in die betätigte Stellung | 2 bar | 74,2 ms |
| Umschalten in die betätigte Stellung | 6 bar | 22,0 ms |
| Umschalten in die betätigte Stellung | 8 bar | 17,2 ms |
| Rückstellung durch die Feder | 2 bar | 12,6 ms |
| Rückstellung durch die Feder | 6 bar | 21,8 ms |
| Rückstellung durch die Feder | 8 bar | 24,2 ms |

Datenblätter nennen für Ventile dieser Größe 12 bis 52 ms. Die Anzeige auf der Seite
rundet auf ganze Millisekunden. `figur/tests/ventil.test.mjs` und
`Wegeventil-3-2/tests/seite.test.mjs` halten Modell und Seite zusammen.

Die Kräfte sind **theoretische** Werte; die Reibung der Dichtungen zieht in der Praxis
noch einmal 3 bis 10 % ab.

## Die Überdeckung ist gezeichnet, nicht nur gerechnet

Beide Schieber sind aus der Überdeckung des Modells (30 % des Hubs) gebaut: Das Bauskript
misst an den gezeichneten Bundkanten, bei welchem Schieberweg jeder Steg öffnet und
schließt, und bricht ab, wenn das nicht zum Modell und zur Wegebeschreibung passt
(Abweichung über 0,05 des Hubs). So lehrt die Zeichnung dasselbe Ventil, das die Seite
rechnet.

## Neu erzeugen

Die Seite ist erzeugt, nicht von Hand geschrieben:

```bash
npm run bau:ventil32
```

```bash
npm run pruef:ventil32
```

Das prüft die Ruhelage (`--audit`: keine Durchdringung, jedes Teil liegt auf, jede
Leitung endet auf einem Anschluss, vorn liegt das nähere Teil) und alle Baugruppen am
Ende ihres Fluchtwegs (`--apart`). Mit `--audit --nur=nc` oder `--nur=no` wird je ein
Schieber allein geprüft, ohne die Ausnahme für das Paar.

```bash
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Wegeventil-3-2/index.html
```

```bash
npm run pruef:browser:ventil32
```

Der Browsertest braucht einen laufenden Server auf Port 8311
(`python3 -m http.server 8311 --bind 127.0.0.1`) und prüft in beiden Modi unter anderem
die Räume und Ströme beider Bauarten, den Wechsel der Bauart mitten im Umschalten, den
Handbetrieb, das Zerlegen während eines gehaltenen Signals und die Führungslinien.

## Was die Figur nicht zeigt

**Belegt** (Größe 1 nach ISO 5599-1 / VDMA 24345, Festo VSVA): Anschlussgewinde G¼,
Baubreite 42 mm, Nenndurchfluss etwa 1100 l/min (Festo, 3/2 Größe 1, Händlerangabe
Tameson) und Schaltzeiten von 12 bis 52 ms je nach Variante. Die Zeichnung bildet das
Ventil in diesen Größen nach, nicht ein bestimmtes Fabrikat.

**Alles Übrige ist angenommen**, weil die Zeichnung es braucht und es nicht als
Einzelmaß im Katalog steht:

- Baulänge des Gehäuses etwa 90 mm (drei Kanäle)
- Schieberbohrung Ø 13 mm, Schieberhub 7 mm, Steuerkolben Ø 20 mm, Federkraft etwa
  30 N vorgespannt, Überdeckung 30 % des Hubs, Leitwerte: alle wie im 5/2-Ventil
  (`ISO_5599_GR1`)
- Volumen hinter 2: wie im 5/2-Ventil, ein Schlauch von 0,5 m (6/4 mm) plus 50 cm³ – es
  steht für „irgendein Verbraucher"
- Masse des Schiebers 30 g, Haftreibung 8 N, Gleitreibung 5 N

**Zwei Leitwerte sind auf die Datenblatt-Schaltzeiten abgestimmt**, nicht gemessen oder
dem Katalog entnommen: `leitwertSteuer` (8·10⁴ mm³/s je bar) und `leitwertEntlueft`
(6·10⁵ mm³/s je bar), siehe die Anleitung zum 5/2-Ventil. Die Zahlen auf der Seite
folgen also einer Annahme, die sich an Datenblättern orientiert, nicht an einer Messung
am Ventil.

**Vereinfachungen im Modell:** Die Luft wird isotherm gerechnet. Der Durchfluss durch
die Ventilwege ist ein linearer Leitwert statt der Düsengleichung mit ihrem kritischen
Druckverhältnis. Für die Anschauung stimmt das; für die Auslegung einer Anlage ist es
zu grob.

**Vereinfachungen in der Zeichnung:**

- Das Ventil ist in der Ebene des Schiebers **aufgeschnitten**; die vordere Hälfte
  fehlt. Die Anschlüsse 1, 2 und 3 sitzen an der Grundplatte.
- Das Ventil ist **pneumatisch betätigt**. Die Steuerluft kommt von einem Signalgeber
  (z. B. einem Taster-Ventil), der nicht gezeichnet ist; das Signal ist ein Knopf.
  Andere Betätigungen (Taster, Rolle, Magnet) zeigt die Seite nicht.
- Die **Dichtringe** am Schieber sind als Ringe angedeutet, nicht als Dichtungsprofile.
- Die beiden Schieber liegen in derselben Zeichnung übereinander; die Seite zeigt
  immer nur einen.
- Das **Schaltzeichen** ist eine Vereinfachung nach ISO 1219-1 und zeigt, welches Feld
  gerade wirkt.
