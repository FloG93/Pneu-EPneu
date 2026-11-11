# Wechselventil (ODER) – Entwurf

Stand: 2026-11-11. Sechstes Bauteil, zweites der Rubrik „Sperr- und Stromventile", gebaut nach dem Skill `azubi-visualisierung` (Ablauf B) mit den Festlegungen der Explosionsfigur (`CLAUDE.md`). Nutzerwunsch: gleicher Aufbau und gleiches Design wie die letzten Seiten, Aufbau gegen die Normdarstellungen und die echte Bauform geprüft. Keine Rückfragen; Entscheidungen sind aus Katalog, Schnittmodell und den vorigen Bauteilen abgeleitet.

## 1. Ziel

Azubis sehen eindeutig, wie ein Wechselventil eine **ODER-Verknüpfung** ausführt:

- Zwei Eingänge (beide mit der Ziffer **1**), ein Ausgang (**2**). Luft an **einem oder beiden** Eingängen kommt am Ausgang an; sind beide drucklos, bleibt der Ausgang drucklos.
- **Ein freibeweglicher Schaltkörper** liegt zwischen zwei Sitzen. Der höhere Druck schiebt ihn auf den Sitz des **anderen** Eingangs und sperrt ihn: Die Luft kann nur zum Ausgang, **nicht** in die andere Steuerleitung entweichen.
- **Wer zuerst kommt:** Liegt an beiden Eingängen gleicher Druck, bleibt der Körper dort, wo er ist; das zuerst angekommene Signal gelangt zum Ausgang. Bei verschiedenem Druck sperrt der niedrigere Eingang.
- **Wozu:** Ein Zylinder soll von zwei Stellen aus (zwei Taster) oder wahlweise von Hand und automatisch gesteuert werden; zwei Signalleitungen laufen in eine zusammen, ohne sich gegenseitig zu belüften.

Gelungen ist die Seite, wenn jemand nach vier Schaltungen (nur links, nur rechts, beide, keiner) die Wahrheitstabelle erklären kann und weiß, warum der Körper die jeweils andere Leitung absperrt.

## 2. Befund: Bauform und Normdarstellung (geprüft)

| Quelle | Aussage |
|---|---|
| Schnittmodell eines Wechselventils (Bosch, Wikimedia Commons `Shuttle_valve_intersection.jpg`; ein Abzug liegt im Scratchpad `…/scratchpad/os/shuttle.jpg`, **nicht** ins Repo kopieren) | Gehäuseblock mit **durchgehender Bohrung**; **zwei Eingänge an den Bohrungsenden** (Gewinde), **Ausgang oben in der Mitte** (großes Gewinde); **zwei Befestigungsbohrungen** quer durch den Block; links ein **eingeschraubtes Verschlussstück mit O-Ring**, das einen Sitz trägt, rechts der Sitz im Gehäuse; dazwischen ein **dunkler Gummi-Schaltkörper** (tonnenförmig, gewölbte Dichtflächen), lose in der Kammer. |
| Wikipedia „Wechselventil" | Gehäuse, zwei Eingänge seitlich, Ausgang oben, (hier kugelförmiger) Schaltkörper; zuerst ankommendes Signal gelangt zum Ausgang; der Eingang mit dem niedrigeren Druck wird gesperrt; beide drucklos → Ausgang drucklos. Schaltzeichen: Eingänge Ziffer 1, Ausgang Ziffer 2. |
| Festo-Katalog OS/ZK 2024 | ODER-Glied OS: Eingänge **1 – 1**, Ausgang **2** (Symbol im Katalog „1 ▭ 1" mit „2" oben); Durchgangsbohrungen zur Befestigung. |
| Festo Datenblatt 6682 (OS-1/4-B) | G1/4 an allen Anschlüssen, **1170 l/min** Normalnenndurchfluss, **1 … 10 bar**, Nennweite **6,5 mm**, Gehäuse Aluminium-Knetlegierung, Dichtungen NBR, 110 g, Durchgangsbohrung. |
| SMC-Symboltabelle (Auszug im Scratchpad `…/scratchpad/os/pn-s2.png`) | Schaltzeichen des Wechselventils (DIN ISO 1219-1): Rechteck, durchgehende Leitung mit **Kugel** und **zwei Sitz-Zeichen**, Anschlüsse seitlich und einer abzweigend. SMC beschriftet 1 / 3 / 2; **wir** beschriften wie Wikipedia und Festo-Katalog **1 – 1 – 2**. Die genaue Strichführung prüft der Implementer an diesen Bildern (siehe §6). |

**Nicht belegt:** Das Festo-Datenblatt zeigt keinen Schnitt; die Innenmaße und die Form des Schaltkörpers sind aus dem Bosch-Schnittmodell nachgezeichnet, nicht vermessen. Das steht in der README.

## 3. Abgeleitete Entscheidungen

| Thema | Entscheidung |
|---|---|
| Vorbild | **Festo OS-1/4-B** (Zahlen); Innenaufbau nach dem Bosch-Schnittmodell |
| Darstellung | Nur das Ventil, **groß** (≥ 80 % der Zeichenbreite), im Längsschnitt durch die Mittelebene (vordere Hälfte abgenommen) wie Drosselrückschlagventil; Block liegt waagerecht, Bohrung in x, Ausgang nach oben; links, rechts und oben je eine **Steckverschraubung mit kurzem Schlauch** (Anschlüsse 1, 1, 2) |
| Bedienung | **Druck links** (0 … 8 bar, Schritt 0,5), **Druck rechts** (0 … 8 bar), **Automatik**, Zeitlupe, Zerlegen, Kontrast. Beide Regler starten auf 0, die Automatik läuft beim Laden (außer bei reduzierter Bewegung) |
| Automatik | Takt 3 s durch 8 Schritte (links/rechts je Eingang): **L an** → **beide an** → **L aus** → **beide aus** → **R an** → **beide an** → **R aus** → **beide aus**. Zeigt Wahrheitstabelle, „wer zuerst kommt" (beide an) und das Umschalten des Körpers |
| Anzeige | Zeile 1: `Eingang links … bar · Eingang rechts … bar · Ausgang 2 … bar`. Zeile 2: `Körper sperrt: links / rechts / – · Durchfluss … l/min`. Umbrechbar, bei 390 px innerhalb des Fensters |
| Schaltzeichen | ISO 1219-1 neben der Figur, **mitschaltend**: Kugel liegt am gesperrten Eingang, durchströmter Weg gefärbt; Ausgang 2 färbt sich nach Druck |
| Kachel | Rubrik „Sperr- und Stromventile", fertig, Marken „OS-1/4-B", „G1/4", „ODER-Funktion"; eigenes Vorschaubild |
| Ordner | `Wechselventil/` |
| Keine Lupe | Der Schnitt ist selbst schon eine ebene Achsenansicht; eine Lupe würde ihn nur doppeln. Fällt die Prüfung der Bilder anders aus, entscheidet der Controller nachträglich. |

## 4. Belegt / abgeleitet / angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Anschlüsse | G1/4 (1, 1, 2) | **belegt** Festo 6682 |
| Normalnenndurchfluss | 1170 l/min | **belegt** Festo 6682 |
| Betriebsdruck | 1 … 10 bar (Seite: Regler 0 … 8 bar, darunter funktioniert das Modell trotzdem) | **belegt** / Seite wählt 8 |
| Nennweite | 6,5 mm → Sitzbohrung Ø 6,5 | **belegt** |
| Gehäuse | Aluminium, Dichtungen NBR, 110 g | **belegt** |
| Durchflusskennlinie | linear in Δp, 1170 l/min bei 1 bar, je Öffnungsanteil | **Annahme** (Katalog nennt nur den Normwert) |
| Schaltdruck | Körper wechselt erst ab Δp > 0,05 bar (Haftung, Massenträgheit) | **Annahme** |
| Schaltzeit | 8 ms für den Weg zwischen den Sitzen | **Annahme** |
| Volumen hinter Ausgang 2 | 50 cm³ (Schlauch + Verbraucher) | **Annahme** |
| Blockmaße, Kammer Ø 12, Körper Ø 9 × 13, Körperhub 6 mm (überhöht), Schaltkörper aus NBR, Befestigungsbohrungen Ø 4,3 | | **Annahme**, nachgezeichnet |

## 5. Architektur

- **`figur/wechselventil.mjs` (neu, Rechenmodell, vierte Ausnahme neben `pneumatik/ventil/stromventil`):** reine Funktionen. `OS_1_4 = { qn: 1170, bezugsDp: 1, schaltdruck: 0.05, schaltzeit: 0.008, volumen2: 50000 /* mm³ */, hub: 6, … }` mit Herkunft je Zeile. `neuerZustand()` → `{ s, pL, pR, p2 }` (`s` 0 = Körper liegt am linken Sitz und sperrt links, 1 = am rechten und sperrt rechts; Start 0), `schritt(z, masse, dt, { pL, pR })`: Körper läuft Richtung niedrigerem Druck, wenn |pL − pR| > Schaltdruck, sonst bleibt er; Öffnung links = `s`, rechts = `1 − s`; `p2` folgt über `kammerSchritt` (aus `figur/ventil.mjs`) den offenen Seiten; ist ein Sitz zu, fließt dort **nichts**. `durchfluss(z, masse, dp…)` → `{ links, rechts, gesamt }` in l/min mit Vorzeichen (negativ = Rückströmen aus dem Ausgang durch den offenen Eingang). `anzeige(z, …)` rundet; `anzeigeZeilen(…)` baut die beiden Textzeilen **einmal** (Build und Seite nutzen sie).
- **`figur/schaltzeichen.mjs`:** `wechselventilSymbol({ feld })` + Laufzeit/CSS wie `drosselRueckschlagSymbol`; andere Symbolausgaben byte-gleich.
- **Gemeinsames (Naht verschieben, Task 2):** Was die Drosselseite zur Laufzeit gebaut hat und die Wechselventilseite wieder braucht (Teilchenströme bauen/schreiten, Raumfarben nach Druck, Tempo-/Stärkefunktionen, Automatik über `bedienung.mjs`, Lesezeilen, `vorDemZerlegen`, Grundstock von `window.__figur`), wandert aus `Drosselrueckschlagventil/tests/tools/build-drossel.mjs` nach `figur/` (in `ventilseite.mjs` oder ein neues Modul, nach Befund im Code); die Drosselseite benutzt es danach, ihre Zeichnung bleibt **byte-gleich**. Dort bleibt nur, was ausschließlich das Drosselventil kennt.
- **Bauteil:**
```
Wechselventil/
  index.html, favicon.svg, vorschau.svg, README.md
  tests/seite.test.mjs
  tests/tools/build-wechsel.mjs, legende-wechsel.mjs, pruefe-wechsel.mjs
```
- Wiederverwendet: `normteile.mjs` (Schnittfläche, Gewinde, Steckverschraubung, Schlauchstummel), `schnitt.mjs`, `luft.mjs`, `explode.mjs`, `legende.mjs`, `seite.mjs`, `bedienung.mjs`.

## 6. Die Figur

- Gehäuse: Block (Halbblock y ≤ 0, Schnittfläche im Schnittton, Material aus Hohlraum-Raster wie bei der Drosselseite). Bohrung in x durch den ganzen Block; **zwei Befestigungsbohrungen** (senkrecht durch den Block, links und rechts der Mitte); **Ausgangsbohrung** senkrecht von der Kammermitte nach oben bis zum G1/4-Gewinde (Gewinde im Schnitt sichtbar).
- **Linke Seite:** Verschlussstück (Einschraubstück) mit Außengewinde, **O-Ring** in der Nut, Innengewinde G1/4 für die Verschraubung, am Innenende der **linke Sitz** (Kegelsenkung Ø 6,5). **Rechte Seite:** Gewinde und **rechter Sitz** im Gehäuse.
- **Schaltkörper:** tonnenförmiger Gummikörper (Ø 9 × 13), zwei gewölbte Dichtflächen; liegt lose in der Kammer (Ø 12) zwischen den Sitzen; die Luft strömt außen in dem Ringspalt um ihn zum Ausgang. **Bewegt sich in der Zeichnung um den Hub** (axial), zeigt am gesperrten Sitz Anlage.
- **Drei Anschlüsse** mit je einer Steckverschraubung (Lösering sichtbar, Dichtring in der Verschraubung) und kurzem Schlauchstück (Ende mit Ring und Bohrung, wie Drosselseite).
- **Legende (7), Zerlegen außen zuerst:**
  01 Anschluss 2 oben (Steckverschraubung mit Schlauch) · 02 Anschluss 1 links (…) · 03 Anschluss 1 rechts (…) · 04 Verschlussstück mit Sitz · 05 O-Ring (fährt mit 04, eigene Nummer, Fallstrick 2) · 06 Schaltkörper · 07 Gehäuse.
  Jeder Satz 2–3 Sätze (was es ist, was es tut, worauf man achtet); Katalogwerte, Ableitungen und Annahmen getrennt benannt („im Modell", „angenommen", „nachgezeichnet").
- **Zerlegen:** je Verschraubung ein eigener Fluchtweg (links −x, rechts +x, oben +z, alle mit Vortrieb zum Betrachter), Verschlussstück nach links (−x), Schaltkörper nach vorn durch den Schnitt, Gehäuse bleibt. Die Ansicht nutzt die Zeichenfläche; Nummern liegen nicht auf fremden Teilen.

## 7. Luft und Farben

- **Raumfarben nach Druck** (keine festen Seiten): linker Eingangsraum nach `pL`, rechter nach `pR`, Kammer um den Körper und Ausgangsbohrung nach `p2`; Ton = Mischung blass → kräftig nach p/pmax der Seite (Kammerfüllung aus `figur/luft.mjs`). Ein Raum mit Druck ist kräftig, ein drucklos entlüfteter blass.
- **Teilchen** laufen nur auf einem Weg mit Durchfluss: vom unter Druck stehenden offenen Eingang durch den Ringspalt um den Körper in die Ausgangsbohrung und zum Ausgangsschlauch; **Richtung nach Vorzeichen** (beim Entlüften des Eingangs strömt der Ausgang durch den offenen Eingang zurück). Am gesperrten Sitz **keine** Teilchen, der gesperrte Eingangsraum behält seinen eigenen Druck. Nie über Material; Schlauchströme enden vor den Verschraubungsringen (Lehre aus der Drosselseite).
- Beide drucklos: alles blass, keine Teilchen, Ausgang bleibt, wo er war, und entlüftet nur über einen offenen Eingang, dessen Leitung drucklos ist (Modell).

## 8. Texte (Erklärtext unter der Figur)

Vier Absätze: (1) ODER-Funktion und Wahrheitstabelle als **echte HTML-Tabelle** (Eingang links | Eingang rechts | Ausgang 2; 0/0→0, 1/0→1, 0/1→1, 1/1→1, mit „1" = Druck, „0" = drucklos); (2) der Schaltkörper: höherer Druck schiebt, sperrt den anderen Eingang, wer zuerst kommt bei gleichem Druck; (3) wozu (zwei Taster, Hand und Automatik, Not-Aus-Wege), und warum der gesperrte Eingang wichtig ist (kein Druck in die andere Leitung, kein Rückfluss in den anderen Taster); (4) Abgrenzung zum Zweidruckventil (UND, kommt später) und Hinweis auf 3/2-Ventil und Zylinder-Seiten. Anschlussziffern: beide Eingänge 1, Ausgang 2; Hinweis, dass Festo Didactic den zweiten Eingang als „1/3" bezeichnet, steht nur in der README.

## 9. Prüfen

Ganzer Prüfkanon (Audit, Zerlegen, Linienenden, Browser ×5 beider Modi, live). Zusätzlich im Browser an der Zeichnung gemessen: Körper-Lage in px je Zustand; Raumfarben nach §7 (insbesondere „L an, R aus": linker Raum kräftig, rechter Eingangsraum blass, Ausgang kräftig); „beide an" behält die Lage; „zuerst kommt"-Regel in der Automatik; Teilchenrichtung und -ort; keine Teilchen auf Schnittflächen; Anzeige; Symbolkugel und gefärbter Weg; Wahrheitstabelle im Text vorhanden; 390 px; Zerlegen beendet die Automatik; RED-Probe (Fehler absichtlich einbauen, Fehlschlag notieren, zurück).

## 10. Nicht im Umfang

Zweidruckventil (UND), Wechselventil mit Plattenbauweise, Hydraulik-Wechselventil, Magnet-Variante, Schaltungsbeispiel mit Zylinder.
