# Das Rechenmodell

Jede Zahl, die die Seite zeigt, und jede Bewegung, die man sieht, kommen aus **einem** Modul `figur/<fach>.mjs` (Beispiel: `beispiel/zylinder-doppeltwirkend/pneumatik.mjs`). Die Figur rechnet nicht selbst – sie fragt das Modell.

## Form

- **Reine Funktionen** und ein kleines Zustandsobjekt. Kein DOM, keine Zeichnung, keine Uhr.
- **Einheiten im Kopfkommentar** festlegen und durchhalten (mm, mm², N, s, bar *absolut* – 6 bar Überdruck sind 7 absolut; 1 bar = 0,1 N/mm²).
- **Ein Baugrößen-Objekt** mit Katalogwerten (`ISO_15552_50`). Jeder Wert ist entweder *Katalog* (mit Quelle) oder *Annahme* – Annahmen stehen in der README der Figur unter „Was die Figur nicht zeigt".
- `schritt(z, masse, dt, …)` mit **festen Unterschritten** (z. B. 1/2000 s, `dt` gedeckelt auf 0,1 s): jede Bildrate ergibt dieselbe Bewegung, ein Tab im Hintergrund springt nicht.
- `anzeige(…)` liefert die **gerundeten** Werte für die Karte; die Seite formatiert nur.
- Kein `NaN`: Divisionen gegen 0 abfangen, ein Test prüft es.

## Fachlich richtig, nicht plausibel

Das teuerste Fehlerbild ist eine **Faustregel aus dem Nachbarfach**. Beispiel aus dem Zylinder: „Einfahren ist schneller als Ausfahren" stimmt in der **Hydraulik**, weil dort ein Volumenstrom aufgeprägt ist und die Ringfläche kleiner ist. In der **Pneumatik** gibt es keinen aufgeprägten Strom; welche Richtung schneller ist, hängt davon ab, ob die Zuluft oder die Abluft die Engstelle ist. Ein Test, der die Faustregel erzwang, war falsch – nicht das Modell.

Darum:

1. Jede Regel, die ein Test festschreibt, an einer **Quelle des eigenen Fachs** prüfen (Herstellerkatalog, Fachbuch, Norm).
2. Hängt das Ergebnis von einer Bedingung ab, wird **die Bedingung** getestet: „ist die Abluft die Engstelle, fährt X schneller", nicht „X ist schneller".
3. Den Befund in der Spec nachtragen, damit ihn niemand „repariert".

## Eichen

Erst Struktur, dann Zahlen. Ein Modell, das 3 m/s Kolbengeschwindigkeit liefert, ist strukturell richtig und trotzdem falsch. Mit Katalogwerten eichen (bewegte Masse, Reibung, Leitwerte) und die Größenordnung testen: Geschwindigkeit, Hubzeit, Totzeit nach dem Schalten.

Was der Zylinder als Ziel hatte: Ausfahren ~1,2 s, Einfahren ~1,45 s, Spitze ~0,45 m/s, F_aus 1178 N bei 6 bar (π · 25² · 0,6), Flächenverhältnis 1,19.

## Tests von Hand nachgerechnet

Jeder Erwartungswert im Test steht mit seiner Rechnung im Kommentar. Gute Testarten:

| Art | Beispiel |
|---|---|
| Formel | Flächen, Kräfte, Luftverbrauch je Hub |
| Proportionalität | halber Druck → halbe Kraft |
| Grenzfall | Endlage, Dämpfung greift nur auf den letzten 20 mm, Rückschlagventil umgeht die Drossel beim Füllen |
| Ablauf | nach dem Umschalten erst Totzeit, dann Bewegung; positive Überdeckung: beide Wege kurz zu |
| Bedingung statt Faustregel | Zuluft eng → …; Abluft eng → … |
| Robustheit | kein NaN bei dt = 0, Druck 0, riesigem dt |

Hilfsfunktionen in Tests messen **bis zum Ereignis** (Ankunft in der Endlage), nicht nach fester Zeit.

## Anschluss an die Figur

- Die Seite hält **einen** Zustand und ruft je Bild `schritt()`; ein Pause-Schalter (`angehalten`) lässt den Prüfhaken einen Zustand setzen, ohne dass das Modell ihn sofort überschreibt.
- Kammerfüllung, Partikeltempo und Anzeige lesen dieselben Größen (`leitwerte`, Drücke, Weg).
- Beim Zerlegen den Hub auf 0 zurückführen und das Medium ausblenden – eine zerlegte Maschine arbeitet nicht.
