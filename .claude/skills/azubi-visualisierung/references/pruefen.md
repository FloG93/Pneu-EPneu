# Prüfen und Fallstricke

## Prüfkanon

| Tor | Befehl | Erwartet |
|---|---|---|
| Rechenmodell, Kacheln, Töne, Seite | `npm test` | alles grün |
| Geometrie in Ruhe | `node <Ordner>/tests/tools/build-<name>.mjs --audit` | `audit passed` |
| Geometrie zerlegt | `… --apart` | `auseinandergefahren: sauber` |
| Linienenden | `CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs <Ordner>/index.html` | `line ends: 0 of N` |
| Verhalten im Browser | `node figur/tests/tools/pruefe-figur.mjs <url> [<Ordner>/tests/tools/pruefe-<name>.mjs]` | `all checks passed` |
| Live | Browsertest gegen die veröffentlichte Adresse | `all checks passed` |

Immer nur **einen** Build oder Audit gleichzeitig; Server und Prozesse über die PID beenden.

Ein Seitentest je Bauteil (`<Ordner>/tests/seite.test.mjs`, Muster im Beispiel) hält ohne Browser fest: kein `NaN` im HTML, `lang="de"`, Favicon, alle Bedienelemente, so viele Legendenknöpfe wie Einträge, Clips definiert **und** benutzt, Anzeige ohne JavaScript gefüllt, Bau wiederholbar (zweimal bauen ergibt dieselbe Datei).

## Zusatzprüfungen je Bauteil

Ein Modul mit `export default async function ({ seite, V, modus })`, das als zweites Argument an `pruefe-figur.mjs` geht. Es wird je Farbmodus einmal aufgerufen, nach den Legendenprüfungen und vor dem Zerlegen; `V(name, bedingung)` meldet eine Prüfung. Vorbild: `beispiel/zylinder-doppeltwirkend/pruefe-zylinder.mjs` (Kammerdruck je Ventilstellung, 1178 N bei 6 bar, halber Druck → halbe Kraft).

Geprüft wird am gezeichneten Ergebnis (`getAttribute("fill")`, `getComputedStyle`), nicht an Klassen. „Unter Druck" heißt: im Hellen dunkler, im Dunkeln heller als die Gegenkammer.

## Fallstricke

Jeder ist einmal veröffentlicht worden.

| # | Fallstrick | Gegenmittel |
|---|---|---|
| 1 | Zeichengruppe ≠ Baugruppe | Baugruppe = was man als Ganzes ausbauen würde; Zuordnung über Teilenamen |
| 2 | Winziges Teil als eigene Baugruppe → Führungslinie ins Leere | fährt mit der Nachbarin, behält die Nummer |
| 3 | Maschine setzt sich nicht zusammen | nach jedem `schedule()` ein `run()` |
| 4 | Legende springt beim Zoomen, Klick landet eine Zeile zu hoch | Seitenverhältnis in `VIEW1` festnageln |
| 5 | Darüberfahren merkt sich die Auswahl | Zeigen (`show`) und Merken (`picked`) trennen |
| 6 | Klasse gesetzt, nichts passiert | jede Klasse braucht eine CSS-Regel; geprüft wird, was gezeichnet wird |
| 7 | Feste Tiefe beim Zerlegen | je Bild nach echter Tiefe sortieren (`resort`) |
| 8 | Schlauchenden hängen beim Zerlegen | `free: [start, end]` an der Route |
| 9 | Nummern auf dem Telefon 6 px | Größen aus der gemessenen Bildschirmbreite, nicht aus dem `viewBox` |
| 10 | Text zu blass | Orange hell `#9a4c05`, dunkel `#f2912f`; jeder Text ≥ 4,5:1 gemessen |
| 11 | Kontrast 1,13:1 „gemessen" | `getComputedStyle` liefert auch `color(srgb 0.64 …)` – als Fließkomma lesen; `getBBox()` ignoriert die eigene Transformation |
| 12 | Eingebettete Funktion findet ihre Variable nicht | `toString()`-Funktionen nehmen freie Variablen nicht mit; Reihenfolge der Definitionen zählt |
| 13 | Zeichnung blitzt in falscher Stufe | Thema und Kontrast im Startskript **vor** dem ersten Zeichnen |
| 14 | Kontrast startet bei 0 | `Number(null)` ist 0 – leeren Speicher abfangen |
| 15 | Zwei Builds gleichzeitig hängen | einer nach dem anderen |
| 16 | Spule hinter dem eigenen Gehäuse | Gehäuse auf die Seite der Bohrung legen, die vom Betrachter weg zeigt |
| 17 | `k.coil(von, nach, …)` ergibt `MNaN` | nimmt Skalare, keine Punkte; Seitentest sucht `NaN` |
| 18 | Backticks in Kommentaren in `String.raw` | brechen das Template – im Laufzeitcode keine Backticks in Kommentaren |
| 19 | Nummern zeigen nach dem Zerlegen ins Leere | Clip auf innerer Gruppe abschalten, Hub auf 0 |
| 20 | Browsertest prüft zu früh | auf das Ereignis warten (`waitForFunction`), nicht auf eine Zeit, die zu einer Figur passte |
| 21 | Prüfhaken setzt Zustand, Modell überschreibt ihn | Pause-Schalter in der Laufzeit |
| 22 | Kachel „geplant", Seite existiert schon (oder umgekehrt) | `kacheln.test.mjs` fängt es – Zustand umstellen |
| 23 | Übersicht mit altem Text veröffentlicht | nach jeder Änderung an `kacheln.mjs` neu bauen und mitcommitten |
| 24 | 404 in der Konsole | `favicon.svg` im Bauteilordner |
