# 5/2-Wegeventil – Entwurf

Stand: 2026-11-06. Zweites Bauteil der Sammlung, gebaut nach dem Skill `azubi-visualisierung` (Ablauf B).

## 1. Ziel

Azubis sehen an einem Längsschieberventil, **wie die Stellung des Schiebers bestimmt, welche Wege offen sind**, und verbinden das mit dem Schaltzeichen. Gelungen ist die Seite, wenn jemand nach dem Ausprobieren erklären kann:

- Stellung „14": 1→4 und 2→3. Stellung „12": 1→2 und 4→5.
- Beim Umschalten sind in der Mitte kurz **alle** Wege zu (positive Überdeckung).
- Ein **monostabiles** Ventil springt beim Wegnehmen des Signals zurück, ein **bistabiles** bleibt, wo es ist (Impulsventil).
- Im Schaltzeichen gleiten die Felder unter den festen Anschlusslinien – genau wie der Schieber in der Bohrung.

## 2. Entscheidungen des Nutzers

| Thema | Entscheidung |
|---|---|
| Bauart | Längsschieber (Kolbenschieber mit Dichtringen) |
| Betätigung | Umschaltbar auf der Seite: monostabil (Federrückstellung) und bistabil (Impulsventil 14/12), pneumatisch |
| Umgebung | Ventil groß; an 2 und 4 kurze Schlauchstücke, abgeschnitten; Schalldämpfer an 3 und 5; Zuleitung an 1 |
| Baugröße | ISO 5599-1 Größe 1, G1/4, auf Grundplatte |
| Anzeige | Druck an 2 und an 4, Schaltzeit |
| Bedienung | Signal 14/12, Zeitlupe, Schieber von Hand, Automatik |
| Schaltzeichen | Jetzt, ISO 1219-1, mitschaltend **neben** der Figur |
| Anschlüsse | In der Zeichnung 1, 2, 3, 4, 5, 12, 14 (ISO 5599-3); im Erklärtext einmal P, A, B, R, S, Z, Y |
| Kachel | Rubrik **Wegeventile**, `zustand: "fertig"`, mit eigenem Vorschaubild; eine **neue** Figur, nicht der Ventil-Ausschnitt der Zylinderseite |

Was der Skill festlegt (Kamera, Zerlegen-Knopf, Blau nur für Luft, Hell als Start, Kontrast 45 %, Orange für Auswahl), gilt unverändert.

## 3. Recherche: belegt und angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Anschlussgewinde | G1/4 | belegt: Größe 1 nach ISO 5599-1 / VDMA 24345, mehrere Hersteller |
| Baubreite | 42 mm | belegt: Festo VSVA Größe 1 (Datenblätter 561367, 8033660) |
| Nenndurchfluss | ≈ 1300 l/min | belegt: Festo VSVA 5/2 Größe 1 (Händlerangabe), 5/3 Datenblatt 561367 |
| Schaltzeiten | 12–52 ms je nach Variante | belegt: Festo 8166595 (12,4 / 18,9 / 37,4 ms), 8033660 (52 ms aus) |
| Baulänge Gehäuse | ≈ 130 mm | **Annahme** |
| Schieberbohrung | Ø 13 mm | **Annahme** |
| Schieberhub | 7 mm | **Annahme** |
| Steuerkolben | Ø 20 mm | **Annahme** |
| Federkraft | ≈ 30 N vorgespannt | **Annahme** |
| Überdeckung | 30 % des Hubs | **Annahme**, wie bisher im Zylindermodell |
| Volumen hinter 2 und 4 | Schlauch 0,5 m × 6/4 mm plus 50 cm³ | **Annahme**: steht für „irgendein Verbraucher" |

Alle Annahmen stehen später in `Wegeventil-5-2/README.md` unter „Was die Figur nicht zeigt".

## 4. Architektur

### 4.1 Rechenmodell: gemeinsames Ventilmodul (Weg A)

Neues Modul **`figur/ventil.mjs`**, reine Funktionen wie `pneumatik.mjs`:

- `oeffnung(schieber, ueberdeckung)` – wie weit die Wege 1→4, 4→5, 1→2, 2→3 offen sind (0…1). Wandert aus `pneumatik.mjs` hierher; `pneumatik.mjs` importiert es. Der Zylinder rechnet danach **bitgleich** wie vorher – seine 34 Tests und der Browsertest (48/48) bewachen das.
- `neuesVentil(baugroesse, { bauart: "monostabil" | "bistabil" })` und `schritt(v, dt, eingang)`: Schieberweg aus Steuerdruck × Kolbenfläche gegen Feder (nur monostabil) und Haftreibung der Dichtringe. Der Steuerdruck baut sich in der Steuerkammer über einen Leitwert auf – **das** bestimmt die Schaltzeit, nicht die Masse des Schiebers (rechnerisch < 2 ms). Testziel: Schaltzeit bei 6 bar im Bereich der Datenblätter, 12–52 ms.
- Drücke an 2 und 4: dieselbe isotherme Kammergleichung wie beim Zylinder, hier mit festem Volumen.
- `vonHand(v, anteil)`: Schieber direkt setzen (0…1); das Modell rechnet die Öffnungen und Drücke dazu.
- `anzeige(v)`: p2, p4 in bar (gerundet), letzte gemessene Schaltzeit in ms.

Die Zylinderseite behält ihren einfachen Schieberdurchgang mit fester Schaltzeit. Ein Test hält beide zusammen: Die Schaltzeit des Zylinders (25 ms) liegt innerhalb ±30 % der Schaltzeit, die `ventil.mjs` bei 6 bar ausrechnet. Sonst wird der Wert am Zylinder angepasst, nicht der Test.

### 4.2 Schaltzeichen: fachneutrales Modul

Neues Modul **`figur/schaltzeichen.mjs`**: zeichnet Wegeventilsymbole nach ISO 1219-1 aus einer Beschreibung (Anzahl Felder, je Feld Pfeile/Sperren zwischen Anschlüssen, Betätigungen links/rechts: Feder, pneumatisch). Es kennt kein bestimmtes Ventil, damit 3/2, 4/2, 5/3 es später benutzen. Liefert SVG und eine kleine Laufzeit, die die Felder um den Schieberanteil verschiebt.

- Die Anschlusslinien (1–5) stehen fest, die Felder gleiten – wie in der Norm gedacht.
- Pfeile im aktiven Feld tragen die zwei Blautöne aus `luft.mjs`: kräftig auf dem Weg 1→, blass auf dem Weg →3/5.
- Strichstärken und Schrift nach den Grautönen des Kits; jeder Text ≥ 4,5:1.

Es kommt in die Vorlage des Skills (fachneutral); `figur/tests/skill.test.mjs` bekommt das Paar dazu.

### 4.3 Seitengerüst

`figur/seite.mjs` bekommt einen optionalen Platz **neben** der Karte (`beiFigur`), auf schmalen Bildschirmen darunter. Das ist allgemein (jede Figur kann ein Begleitbild haben) und keine Ventillogik. Die Kopie im Skill wird nachgezogen.

### 4.4 Das Bauteil

```
Wegeventil-5-2/
  index.html                 erzeugt
  favicon.svg, vorschau.svg  Symbol und Kachelbild
  README.md                  Bedienung, Farben, Zahlen, Annahmen
  tests/seite.test.mjs       Seitentest ohne Browser
  tests/tools/build-ventil.mjs      Geometrie + vier Tabellen + Laufzeit
  tests/tools/legende-ventil.mjs    LEGENDE
  tests/tools/pruefe-ventil.mjs     Zusatzprüfungen Browser
```

Keine Zeile Federmathematik, Sortierung oder Seitengerüst im Bauskript (Naht).

## 5. Die Figur

- **Schnitt**: ebene Schnittfläche senkrecht durch die Schieberachse; die vordere Gehäusehälfte fehlt. Sichtbar: Bohrung mit Ringnuten, Schieber mit Dichtringen, die fünf Kanäle hinunter in die Grundplatte, Anschlüsse 1–5 in der Grundplatte, Steuerkammern an beiden Enden. Schnittflächen deutlich als Schnitt erkennbar (eigene Tönung), weil das Gehäuse ein Quader ist und nicht über das Drehteil-Fenster aus `schnitt.mjs` geht.
- **Links**: Endkappe mit Steuerkolben 14. **Rechts**: Endkappe mit Druckfeder (monostabil) **oder** mit Steuerkolben 12 (bistabil). Beide sind gezeichnet; der Schalter zeigt eine. Die Legende nennt die rechte Seite „Rückstellseite" und erklärt beide Varianten.
- **Leitungen**: Zuleitung an 1, Schlauchstücke an 2 und 4 enden sichtbar abgeschnitten, Schalldämpfer an 3 und 5, Steuerleitungen an 14 und 12. Hermite-Schläuche mit geraden Ein- und Ausläufen.
- **Luft**: kräftig = unter Druck (1, der gerade versorgte Arbeitsanschluss, die beaufschlagte Steuerkammer), blass = Abluft (der entlüftete Arbeitsanschluss bis zum Schalldämpfer). Die Ringräume in der Bohrung füllen sich mit; Partikel laufen durch die offenen Wege, ihr Tempo folgt dem Leitwert.
- **Zerlegen** entlang der Schieberachse, außen zuerst. Baugruppen (Entwurf, je eine Nummer):

| Nr | Baugruppe |
|---|---|
| 01 | Grundplatte mit Anschlüssen 1–5 |
| 02 | Flachdichtung zur Grundplatte |
| 03 | Ventilgehäuse |
| 04 | Steuerschieber |
| 05 | Dichtringe des Schiebers (fahren mit dem Schieber, eigene Nummer) |
| 06 | Endkappe 14 mit Steuerkolben |
| 07 | Rückstellseite: Feder bzw. Steuerkolben 12 |
| 08 | Befestigungsschrauben |
| 09 | Schalldämpfer 3 und 5 |
| 10 | Arbeits- und Zuleitungen 1, 2, 4 |
| 11 | Steuerleitungen 12, 14 |

- Beim Zerlegen: Schieber in die Ausgangsstellung (Stellung 12), Steuersignale aus, Luft ausgeblendet (wie beim Zylinder).

## 6. Bedienung und Anzeige

| Element | Verhalten |
|---|---|
| Schalter **monostabil / bistabil** | wechselt die Rückstellseite in Figur, Modell und Schaltzeichen |
| **Signal 14** | monostabil: solange gedrückt (Maus, Finger, Leertaste); bistabil: ein Druck = Impuls |
| **Signal 12** | nur bistabil; monostabil ausgegraut mit Hinweis „Feder stellt zurück" |
| **Zeitlupe** | Regler 1× … 1/50×; teilt die Uhr, nicht das Modell |
| **Schieber von Hand** | Regler 0–100 %, mit Tastatur bedienbar; setzt das Modell in den Handbetrieb, bis wieder ein Signal kommt |
| **Automatik** | wechselt im Takt 14 / 12 (bzw. 14 an/aus) |
| **Druck** | Versorgungsdruck 2–8 bar, wie beim Zylinder |
| **Anzeige** | `p2 … bar · p4 … bar · Schaltzeit … ms` – steht schon im erzeugten HTML |

## 7. Kachel auf der Übersicht

- `ventil-5-2` in `figur/kacheln.mjs`: `zustand: "fertig"`, `ordner: "Wegeventil-5-2"`, Marken z. B. „ISO 5599-1", „Größe 1", „G1/4", „mono- und bistabil".
- Fertige Kacheln stehen nach der bestehenden Regel oben und breit in ihrer Rubrik (wie der Zylinder bei den Aktoren); die drei geplanten Ventile folgen darunter.
- `vorschau.svg`: schematischer Längsschnitt (Gehäuse, Schieber, fünf Kanäle) mit kräftig/blass gefüllten Wegen, daneben klein das Schaltzeichen – mit den Klassen `v-wand`, `v-teil`, `v-leitung`, `v-hilfslinie`, `v-stark`, `v-blass`.
- Auf der Zylinderseite verlinkt der Legendeneintrag „5/2-Wegeventil" auf die neue Seite.

## 8. Prüfen

Ganzer Prüfkanon des Skills: `npm test`, `--audit`, `--apart`, Linienenden `0 of N`, Browsertest mit `pruefe-ventil.mjs`, live nach dem Push.

Modelltests (von Hand nachgerechnet): Öffnungen an den Endlagen und in der Mitte (alle zu), Kraftbilanz Steuerkolben gegen Feder, monostabil fällt zurück / bistabil hält, Schaltzeit 12–52 ms bei 6 bar, langsamer bei 2 bar, Druck an 2/4 steigt nach dem Umschalten in endlicher Zeit auf Versorgungsdruck, kein NaN, Gleichlauf mit der Zylinderschaltzeit.

Zusatzprüfungen im Browser: gefüllte Kanäle je Stellung, Mitte = alle Wege zu, monostabil fällt beim Loslassen zurück, bistabil bleibt, aktives Feld im Schaltzeichen passt zur Schieberstellung, Anzeige p2/p4 folgt dem Druckregler, Schalter mono/bi tauscht die gezeichnete Rückstellseite.

Rückwirkung: Zylinderseite weiter 48/48, Modelltests unverändert grün, `skill.test.mjs` grün (neue Kopien eingetragen).

## 9. Nicht im Umfang

Magnetbetätigung und Vorsteuerventil (kommt mit der E-Pneumatik), 5/3- und andere Ventile (eigene Kacheln, nutzen dann `schaltzeichen.mjs`), Durchfluss in l/min, Aufgaben/Quiz, Schaltzeichen auf den übrigen Kacheln (der Platz bleibt reserviert).

## 10. Risiken

| Risiko | Umgang |
|---|---|
| Ebene Schnittfläche durch einen Quader ist im Kit nicht vorgesehen | Gehäuse als Platten um Bohrung und Kanäle aufbauen (wie das Ventil am Zylinder), Schnittflächen als eigene Flächen; Audit-Ausnahmen nur mit Begründung |
| Schaltzeichen und Figur laufen auseinander | beide lesen denselben Schieberanteil aus dem Modell; Browserprüfung vergleicht sie |
| `oeffnung` aus `pneumatik.mjs` herauszulösen ändert den Zylinder | gleiches Verhalten, bewacht von den bestehenden Modelltests (Werte unverändert) und dem Browsertest 48/48; die erzeugte Seite darf sich nur dort ändern, wo sie die Funktion einbettet |
| Viele Bedienelemente auf dem Telefon | Bedienleiste bricht um; Prüfung „kein Seitwärtsscrollen bei 390 px" |
