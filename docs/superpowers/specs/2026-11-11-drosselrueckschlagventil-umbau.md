# Drosselrückschlagventil – Umbau auf die echte Bauform

Stand: 2026-11-11. Ersetzt in `2026-11-10-drosselrueckschlagventil-design.md` die Abschnitte Innenaufbau (§2), Figur (§5) und Luft (§6). Anlass: Rückmeldung des Nutzers (Luftstrom merkwürdig, Farben passen nicht zur Stromrichtung, Aufbau prüfen).

## 1. Befund

Der Funktionsschnitt im Festo-Katalog „Drossel-Rückschlagventile GR/GRA" (Abschnitt Werkstoffe, Positionen [1] Mutter, [2] Regulierschraube, [3] Gehäuse, Dichtungen NBR) zeigt **keine Kugel, keine Feder und keinen zweiten Kanal**. Die veröffentlichte Figur (Kugel-Rückschlagventil in einem Parallelkanal mit Verschlussschraube) entspricht nicht der Bauform. Echt ist alles **koaxial um die Regulierschraube**:

- **Gehäuse** (Quader) mit zwei Anschlüssen G1/4 auf **versetzter Höhe** und zwei Befestigungsbohrungen quer.
- **Einschraubbuchse** von oben ins Gehäuse geschraubt, mit O-Ring abgedichtet; sie führt die Regulierschraube (Gewinde, O-Ring an der Schraube).
- **Regulierschraube** mit Rändelkopf, unten ein **kegeliger Zapfen**.
- **Mutter** (Kontermutter) auf der Regulierschraube, sichert die Einstellung.
- **Ventileinsatz** (Hülse) in der Mitte mit der **Drosselbohrung**: der Zapfen taucht hinein, der **Ringspalt** zwischen Zapfen und Bohrung ist die Drossel.
- **Dichtmanschette** (kegeliger Lippenring aus NBR) außen um den Einsatz, darunter eine **Stützscheibe**. Sie ist das Rückschlagventil: Druck in ihrer offenen Seite spreizt die Lippe an die Gehäusewand (dicht), Druck von der anderen Seite klappt die Lippe nach innen (frei).

## 2. Wege (Anschlussnummern wie im Modell: gedrosselt 1 → 2)

- **Anschluss 1** (links, tiefere Achse) führt über einen Kanal **unter die Mitte**: in die Drosselbohrung von unten **und** in den Raum unter der Manschette (ihre offene Seite).
- **Anschluss 2** (rechts, höhere Achse) führt in den **Ringraum außen um Einsatz und Manschette** (oberhalb der Lippe); über den Spalt zwischen Buchse und Einsatz ist er mit dem Raum um den Zapfen verbunden.
- **1 → 2 (gedrosselt):** Der Druck von 1 spreizt die Lippe an die Wand – zu. Die Luft kann nur durch den Ringspalt am Zapfen nach oben, über den Einsatz in den Ringraum und zu 2.
- **2 → 1 (frei):** Der Druck im Ringraum klappt die Lippe nach innen. Die Luft strömt außen an der Manschette vorbei nach unten zu 1; durch den Ringspalt fließt zusätzlich der Drosselanteil.

## 3. Farben (Regel der Sammlung: kräftig = unter Druck, blass = entspannt)

- 1 → 2: Räume der Seite 1 (Kanal, unter der Manschette, Drosselbohrung bis zum Spalt) **kräftig**; Seite 2 (um den Zapfen, Ringraum, Anschluss 2) **blass**. Auch bei zugedrehter Drossel.
- 2 → 1 mit offener Lippe: **beide Seiten kräftig** – die Luft wird kaum entspannt, das ist der Sinn der freien Richtung. (Bisher war die Abströmseite blass: falsch.) Solange die Lippe noch geschlossen ist (Δp unter Öffnungsdruck) wie gedrosselt mit vertauschten Seiten.
- Teilchen laufen **in Strömungsrichtung** entlang echter Wege (nie über Material, nie über Einbauteile), Ton der Seite, auf der sie gerade sind. Schläuche: Zustrom kräftig; Abstrom blass nur in Drosselrichtung.

## 4. Modell

`figur/stromventil.mjs`: „Kugel" wird zur **Lippe** (`lippe` 0…1, `lippeHubMm` ≈ 1,5 mm Annahme, `oeffnungsdruck` 0,1 bar Annahme, `lippeRampe`); keine Feder. Zahlen unverändert (420 / 780 / 360 l/min). Anzeige: „Lippe zu / offen".

## 5. Schaltzeichen

Rückschlagventil **ohne Feder** (die Manschette hat keine): `drosselRueckschlagSymbol({ feder: false })` als Standard dieser Seite.

## 6. Figur

- Schnitt durch die Mittelebene: Gehäuse wie bisher als Halbblock; **alle Drehteile halbiert** (Buchse, Einsatz, Manschette, Stützscheibe als halbe Drehkörper mit Schnittflächen im Schnittton), die Regulierschraube ganz (wie bisher) oder halb – so, dass der Ringspalt am Zapfen sichtbar bleibt. Spalte und Lippe **leicht überhöht** zeichnen (README sagt es), damit man sie auf dem Beamer sieht.
- Befestigungsbohrungen als zwei Querbohrungen im Block.
- Legende (9): leitung, verschraubung, schraube (Regulierschraube mit Rändelkopf, Zapfen, O-Ring), kontermutter, buchse (Einschraubbuchse mit O-Ring), manschette (Dichtmanschette), scheibe (Stützscheibe; fährt mit der Manschette, wenn < 30 px, eigene Nummer), einsatz (Ventileinsatz mit Drosselbohrung), gehaeuse. Je 2–3 Sätze; was Katalog ist und was Annahme, getrennt.
- Zerlegen entlang der Schraubachse nach oben in Montagefolge: Schraube, Mutter, Buchse, Einsatz, Manschette, Scheibe; Verschraubungen und Schläuche seitlich.
- Bewegung: Zapfen fährt mit dem Regler (Ringspalt wird sichtbar enger/weiter); Lippe klappt in freier Richtung sichtbar nach innen (zwei gezeichnete Lagen überblenden oder Form je Bild).

## 7. Texte

Erklärtext, Legende, README, Kachelsatz und Vorschau auf die Bauform umschreiben: Ringspalt statt Nadelsitz-Steg, Dichtmanschette statt Kugel und Feder. „Was die Figur nicht zeigt": Maße geschätzt, Spalte überhöht, Lippenhub und Öffnungsdruck angenommen, innere Wege nach dem Katalogschnitt nachgezeichnet (nicht vermessen).

## 8. Prüfen

Wie bisher (Audit, Zerlegen, Linien, Browser ×5, live). Browsermodul neu: Lippe gezeichnet zu/offen je Richtung; Zapfenweg = Umdrehungen × Steigung; Raumfarben nach §3 (insbesondere 2 → 1: beide Seiten kräftig); Teilchen nie über Material, Laufrichtung je Richtung; Anzeige 420/210/0, 780/360.
