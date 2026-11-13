# Rückschlagventil

Ein federbelastetes **Rückschlagventil** mit G¼-Anschlüssen (Zahlen und Außenmaße vom **Festo H-1/4-B**, Datenblatt 11689 und
Katalog H/HA/HB) als isometrische Schnittzeichnung durch die Mitte, in der die Druckluft sichtbar strömt. Dazu steht das
**Schaltzeichen** nach ISO 1219-1 neben der Figur: Seine Kugel hebt sich, wenn der Teller abhebt, und jeder Teil der Leitung hat den Ton
seines Drucks. **Das Innere ist nachgezeichnet nach dem Funktionsprinzip** eines federbelasteten Tellerrückschlagventils: Weder das
Datenblatt noch der Katalog zeigen einen Schnitt.

## Wie das Ventil gebaut ist

Das Rückschlagventil lässt die Luft nur **von 1 nach 2** durch. Von 2 nach 1 sperrt es, und der Druck am Ausgang presst den Teller
sogar fester auf den Sitz.

- **Gehäuse** (Aluminium eloxiert, Katalog): links das Innengewinde G¼ (Anschluss 1), rechts ein Gewindezapfen G¼ von 8 mm (Anschluss 2; welches Ende innen und welches außen ist und welches der Eingang, nennt das Datenblatt nicht: **angenommen**, im Katalogbild hat ein Ende Außengewinde mit Dichtring und das andere Innengewinde),
  innen eine Bohrung mit dem **Federanschlag** und dem Durchgang zum Ausgang. Der Sechskant (Schlüsselweite 19 mm) ist in der Zeichnung ein
  **Zylinder** Ø 19.
- **Sitzeinsatz**, eingepresst, mit der Kegelsenkung Ø 6 mm. In der Schnittfläche ist er bräunlich und gegenläufig schraffiert, damit man
  ihn vom Gehäuse unterscheidet. Er gehört zur Baugruppe „Gehäuse mit Sitzeinsatz“.
- **Ventilteller** mit einem Metallkern und einer Dichtfläche aus **NBR** (schwarz mit hellem Rand, wie alle Gummiteile der Sammlung), der
  auf dem Sitz liegt. Er hebt ab, wenn der Druck an 1 den Druck an 2 um mehr als **0,1 bar** übersteigt, und ist ab **0,5 bar** Unterschied ganz offen.
- **Druckfeder**, schwach, zwischen Teller und Anschlag. Sie wird mit dem Teller zusammengedrückt.
- **Dichtring** auf dem Außengewinde, an der Schulter zwischen Gehäuse und Verschraubung.
- **Zwei Steckverschraubungen** mit kurzen Schlauchstücken an 1 und 2; die Anschlussziffern stehen an den Schlauchenden der Zeichnung (beim
  Zerlegen blenden sie aus und die Nummern der Legende übernehmen). Die rechte sitzt als **Hülse** auf dem Außengewinde.

Wozu es gut ist, erklärt die Seite im Text: Druck halten (eine Spannvorrichtung bleibt gespannt), Rückströmen verhindern und als Baustein
in anderen Ventilen ([Drosselrückschlagventil](../Drosselrueckschlagventil/), [Wechselventil](../Wechselventil/)).

| Druckunterschied Δp = p1 − p2 | Teller | Luft |
| --- | --- | --- |
| Δp > 0,1 bar (angenommen) | offen (zwischen 0,1 und 0,5 bar erst teilweise, ab 0,5 bar ganz) | strömt von 1 nach 2 |
| Δp ≤ 0,1 bar | zu | nichts strömt |
| p2 > p1 (Gegendruck) | zu, fester angedrückt | nichts strömt zurück |

**In Wirklichkeit eingeschraubt:** Das Ventil ist laut Katalog einschraubbar; sein Außengewinde wird in einen Anschluss geschraubt, und der Dichtring dichtet dagegen ab. Die Zeichnung zeigt statt dieses Anschlusses eine Verschraubung (als Hülse auf dem Gewindezapfen). Eingebaut wird es in **Durchflussrichtung**: Eingang 1 zur Druckquelle, Ausgang 2 zum Verbraucher.

**Der Druck bleibt eingesperrt:** Fällt der Druck an 1 auf null, schließt der Teller, und 2 behält seinen Druck. Mit 6 bar an 1 steigt der Druck
an 2 nur bis **5,9 bar** (p1 − Öffnungsdruck): Dann ist der Unterschied nur noch 0,1 bar, der Teller schließt wieder, und die Anzeige zeigt
„Δp 0,1 bar“. Das ist der angenommene Öffnungsdruck, kein Fehler.

## Was man tun kann

- **Eingang 1** (0 bis 8 bar in Schritten von 0,5) stellt den Druck an 1 ein; ein Eingriff schaltet die Automatik aus.
- **Ausgang 2 entlüften** öffnet eine Entlüftungsblende am Ausgang, solange der Knopf gedrückt ist (ein zweiter Druck nimmt sie weg).
  Damit fällt der eingesperrte Druck, und man kann gegen den Sperrdruck von 2 her drücken.
- **Automatik:** acht Schritte: 6 bar an 1 (der Teller öffnet, 2 füllt sich), halten, 1 auf 0 (der Teller schließt, 2 bleibt auf seinem Druck),
  halten, 3 bar an 1 (weniger als an 2: der Teller bleibt zu, nichts strömt zurück), halten, Ausgang 2 entlüften, halten. Jedes Einschalten
  beginnt wieder bei Schritt 0. **Takt:** 0,3 s Modellzeit je Schritt; weil die **Zeitlupe mit 1/10** beginnt, sind das 3 s auf dem Bildschirm.
- **Zeitlupe** (1× bis 50-fach langsamer, Start 1/10): Mit ihr sind die 8 ms des Öffnens zu sehen.
- **Zerlegen und zusammenbauen** beendet die Automatik, fährt die Baugruppen entlang der Achsen auseinander (Feder und Teller nach vorn
  durch den Schnitt), hält kurz und setzt sie von innen nach außen wieder zusammen. Ein zweiter Druck oder Escape bricht ab.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor und blendet den Rest zurück.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Raum unter Druck (ab 6 bar voll kräftig, darunter ein Mischton) |
| **blasses Blau** | drucklos |

Die Töne sind dieselben wie in allen Figuren (`figur/luft.mjs`) und unterscheiden sich in der **Helligkeit**. Sie folgen dem **Druck**, nicht festen
Seiten: Mit „Teller zu, 2 unter Druck, 1 drucklos“ ist der Raum hinter dem Sitz kräftig und der davor blass.

**Gemessen:** Im Browsertest ist das gezeichnete Bild eines 6-bar-Raums gegen einen 0-bar-Raum mindestens 2,4 : 1 verschieden (Pixel des
Bildschirmfotos), in beiden Modi; gemessen: **2,76 : 1 hell, 2,49 : 1 dunkel** (Eingang 1 wie Ausgang 2).

**Teilchen** laufen nur, solange der Teller sichtbar abgehoben ist (ab 15 % Hub, unter einem halben Millimeter in der Zeichnung ist er so gut wie
zu), nur auf dem einen Weg durch den Sitz, den Ringspalt um Teller und Feder und den Durchgang, in Strömungsrichtung (1 nach 2) und nie über
Material. Bei geschlossenem Teller steht keines, auch nicht bei Gegendruck.

## Die Zahlen

Alles, was die Anzeige nennt, kommt aus dem Modell, das auch den Teller und die Farben bewegt (`figur/rueckschlagventil.mjs`, `H_1_4`). Die
Anzeige hat zwei Zeilen: Eingang 1, Ausgang 2 und Δp, dann der Zustand des Tellers (zu, halb offen, offen; bei Gegendruck mit dem Zusatz) und der Durchfluss.

- Durchfluss = 1000 l/min · Hub · Δp / 1 bar (nur der **1-bar-Wert bei ganz offenem Teller** ist Katalog), nie negativ, **höchstens 2000 l/min**.
  Erreicht er diese Grenze (ab 2 bar Druckabfall bei ganz offenem Teller), schreibt die Anzeige „(begrenzt)“ dahinter: Ein echtes Ventil drosselt bei
  großem Druckabfall ab, die lineare Extrapolation wäre dort falsch. Die Grenze ist angenommen (das Doppelte des Katalogwerts).
- Ein geschlossener Teller führt 0 l/min, in beide Richtungen (das Modell ist ideal dicht).
- Der Teller läuft in **8 ms** von zu auf offen; das Volumen hinter dem Ausgang ist **50 cm³**; die Entlüftungsblende hat die Zeitkonstante **0,1 s**.

## Neu erzeugen

```bash
npm run bau:rueckschlagventil
npm run pruef:rueckschlagventil
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Rueckschlagventil/index.html
npm run pruef:browser:rueckschlagventil
npm run gate -- Rueckschlagventil
```

`pruef:rueckschlagventil` prüft die Ruhelage (`--audit`) und alle Baugruppen am Ende ihres Fluchtwegs (`--apart`). Der Browsertest braucht einen
laufenden Server auf Port 8311 (`python3 -m http.server 8311 --bind 127.0.0.1`) und misst an der Zeichnung: die Lage des Tellers in Pixeln in jedem
Zustand (Hub, Gegendruck, halb offen) und dass die Feder mitgeht, die Töne der zwei Räume, das gezeichnete Helligkeitsverhältnis 6 bar gegen 0 bar,
das Schaltzeichen (Kugel und Töne), dass Teilchen nur bei abgehobenem Teller laufen, in die richtige Richtung und nie über Material, die Anzeige mit
ihren Zahlen (1000 l/min, die Begrenzung, Gegendruck), den Öffnungsdruck und den eingesperrten Druck bei laufendem Modell, die Zeitlupe, die acht
Schritte der Automatik mit dem Druck an 2 bei jedem Schritt, die Regler, die Zustandstabelle, 390 px Breite (auch dass zerlegt keine Baugruppe
kleiner als 30 px ist) und das Zerlegen.

## Was die Figur nicht zeigt

**Belegt** (Festo-Datenblatt 11689 und Katalog H/HA/HB, H-1/4-B): Rückschlagfunktion, Anschlüsse **G¼** an 1 und 2, einschraubbar, Betriebsdruck
**0,4 bis 12 bar** (die Regler gehen bis 8 bar und beginnen bei 0 bar; **unter 0,4 bar gilt das nur im Modell**, dafür gibt der Katalog keinen Betrieb an), Normnenndurchfluss **1000 l/min** (6 → 5 bar), Gehäuse aus Aluminium-Knetlegierung eloxiert, Dichtungen
aus NBR, **25,4 g**, größtes Anziehdrehmoment **11 Nm**, Einbaulage beliebig; Länge **48 mm**, Gewindelänge **8 mm**, Schlüsselweite **19 mm**; Dichtring
für das Außengewinde im Lieferumfang; Außengewinde mit blauem Dichtring an einem, Innengewinde am anderen Ende; Schaltzeichen: Kugel auf Sitz mit Feder.

**Alles Übrige ist angenommen oder nachgezeichnet:**

- **Der Katalog zeigt keinen Schnitt.** Das Innere ist nachgezeichnet nach dem Funktionsprinzip eines federbelasteten Tellerrückschlagventils. Sitzeinsatz,
  Bohrung Ø 9, Teller Ø 8 × 6 mm mit NBR-Dichtfläche, Sitz Ø 6 mm, Kegel, Federanschlag und Durchgang Ø 4,8 mm sind angenommen. Die Länge L2 = 32 mm des
  Katalogs ist nicht verwendet: Die Zeichnung nimmt 40 mm Gehäuse und 8 mm Gewinde, zusammen die 48 mm von L1.
- **Der Sechskant ist ein Zylinder** (Ø 19, die Schlüsselweite); die Schlüsselflächen fehlen.
- **Die rechte Verschraubung ist eine Hülse**, die auf das Außengewinde geschraubt wird (6,5 mm überdeckt): Der Katalog nennt das Gegenstück nicht. Die Hülse hat
  den Radius des Sechskants der Verschraubung und kein Gewinde in der Zeichnung.
- **Der Dichtring** ist in Wirklichkeit **blau**; in der Zeichnung ist er dunkel (Gummi), weil Blau in dieser Sammlung der Druckluft vorbehalten ist. Sein
  Profil ist als runde Schnur angenommen.
- **Öffnungsdruck 0,1 bar:** für die Schwesterreihe H-QS belegt (öffnen > 0,1 bar, schließen > 0,2 bar), für den H-1/4-B **übernommen**. Das Modell schließt, sobald
  Δp ≤ 0,1 bar; die zweite Zahl der Schwesterreihe (Schließen erst ab 0,2 bar) hat das Modell nicht. **Vollöffnung ab 0,5 bar** und der lineare Weg dazwischen sind angenommen.
- **Kennlinie und Grenze:** Katalog ist nur der Normwert. Die Zeichnung rechnet linear in Δp und mit dem Hub; die Grenze bei **2000 l/min** ist angenommen.
- **Ideal dicht:** Ein geschlossener Teller führt nichts, ein echtes Ventil leckt etwas. **Schaltzeit 8 ms**, **Volumen 50 cm³** hinter 2 und die **Entlüftungsblende** (Zeitkonstante
  0,1 s, damit man das Entlüften in der Zeitlupe sieht) sind angenommen.
- **Überhöht gezeichnet:** Der **Hub von 3 mm** und damit der Federweg sind größer als im echten Ventil; die Feder (Draht 0,8 mm, 6 Windungen, Ø 7, eingebaut 9,5 mm) ist
  angenommen. Die Kraft, mit der 0,1 bar auf die Sitzfläche drücken, steht abgeleitet in der Legende (0,28 N).
- **Der Strom** in der Zeichnung ist die Luft in der Schnittebene, in Wirklichkeit strömt sie rundherum durch den Spalt. Der Weg ist für den ganz offenen Teller gezeichnet.
- Es ist kein **Verbraucher** angeschlossen; das **entsperrbare** Rückschlagventil, das Rückschlagventil mit Elastomerhülse (Steckausführung), ein Sechskant als echte Fläche und ein
  Schaltungsbeispiel mit Zylinder gehören nicht zu dieser Seite.

**Vereinfachungen in der Zeichnung:** Alle Drehteile sind **durch die Mitte aufgeschnitten**; sobald ein Teil beim Zerlegen seinen Platz verlässt, wird es **ganz** gezeichnet. Die
Steckverschraubungen sind kompakt und vereinfacht (Gewinde, Sechskant, Körper, Lösering), die Schlauchstücke nach wenigen Millimetern abgeschnitten. Von der Rückhälfte der Bohrung
ist nur die Schattierung der Wand angedeutet; das Gewinde der Bohrung zeigt die Zeichnung als Ringe, wenn die Verschraubung fehlt.

## Dateien

```
Rueckschlagventil/
  tests/tools/build-rueckschlagventil.mjs     Geometrie + vier Datentabellen, die Seite
  tests/tools/legende-rueckschlagventil.mjs   Legende
  tests/tools/pruefe-rueckschlagventil.mjs    nur Bauteilspezifisches der Browserprüfung (das Gemeinsame: figur/tests/tools/pruefe-schnitt.mjs)
  tests/seite.test.mjs            Tests der gebauten Seite
  favicon.svg, vorschau.svg (Kachelbild), README.md
figur/rueckschlagventil.mjs                   Rechenmodell
figur/tests/rueckschlagventil.test.mjs        Tests des Modells
```
