# Drosselrückschlagventil – Entwurf

Stand: 2026-11-10. Fünftes Bauteil, erstes der Rubrik „Sperr- und Stromventile", gebaut nach dem Skill `azubi-visualisierung` (Ablauf B) mit den Festlegungen der Explosionsfigur (`CLAUDE.md`). Der Nutzer wünscht: übersichtliche Darstellung, sichtbarer Luftstrom, Bauteile mit ausführlicher Beschreibung. Keine Rückfragen; die Entscheidungen unten sind aus Katalog und vorigen Bauteilen abgeleitet.

## 1. Ziel

Azubis sehen eindeutig, dass im Drosselrückschlagventil **zwei Wege nebeneinander** liegen:

- **Drosselrichtung (1 → 2):** Der Luftdruck drückt die Kugel des Rückschlagventils auf ihren Sitz. Alle Luft muss durch den engen Spalt an der Drosselnadel. Wie viel durchkommt, stellt die Rändelschraube ein.
- **Freie Richtung (2 → 1):** Die Luft hebt die Kugel gegen die schwache Feder ab und strömt zusätzlich durch den weiten Rückschlagweg – fast ungebremst, egal wie die Drossel steht.
- **Wozu:** Man stellt damit die Geschwindigkeit eines Zylinders in **einer** Richtung ein. Üblich ist die **Abluftdrosselung**: das Ventil sitzt am Zylinderanschluss, die Zuluft strömt frei hinein, die Abluft wird gedrosselt – der Kolben wird zwischen zwei Luftpolstern eingespannt und läuft ruhig.

Gelungen ist die Seite, wenn jemand nach zwei Umschaltungen erklären kann, warum die Drossel nur in einer Richtung wirkt und was beim Zudrehen der Rändelschraube passiert.

## 2. Abgeleitete Entscheidungen

| Thema | Entscheidung | Abgeleitet aus |
|---|---|---|
| Vorbild | **Festo GRA-1/4-B** (Leitungseinbau, Rändelschraube, G1/4 beidseitig) | Katalog; gleiche Anschlussgröße wie Zylinder und Ventile der Sammlung |
| Innenaufbau | Lehrbuchform: Drosselnadel im Hauptkanal, **parallel** darunter Rückschlagventil mit **Kugel und Feder**, verschlossen von einer Verschlussschraube | Bauart der Lernmittel; die echte Innenform ist im Datenblatt nicht gezeigt (README) |
| Darstellung | **Nur das Ventil, groß**, im Schnitt durch die Ebene beider Kanäle (vordere Gehäusehälfte abgenommen), links und rechts je eine Steckverschraubung mit Schlauchstück; kein Zylinder, keine Schiene | „übersichtlich"; das Thema sind die zwei Wege |
| Bedienung | **Richtung** (Umschalter „1 → 2 drosseln" / „2 → 1 frei"), **Drosselschraube** (Regler 0 … 6 Umdrehungen offen), **Automatik** (Richtung wechselt im Takt wie beim Aus- und Einfahren eines Zylinders) | Zylinderseiten (Automatik) |
| Anzeige | `Q … l/min · davon Drossel … / Rückschlag … · Kugel zu/offen` bei Normbedingung (6 bar, Δp 1 bar) | Modell |
| Schaltzeichen | ISO 1219-1 „Drosselrückschlagventil, einstellbar" als Begleitbild; der durchströmte Weg färbt sich mit | 5/2- und 3/2-Seite (mitschaltend) |
| Erklärtext | Zwei Wege, Abluft- vs. Zuluftdrosselung (warum Abluft üblich ist), Einbau am Zylinder, Verweis auf doppeltwirkenden Zylinder | Rubriksatz der Kachel |
| Kachel | Rubrik „Sperr- und Stromventile", fertig, eigenes Vorschaubild, Marken „G1/4", „Leitungseinbau", „einstellbar" | wie andere |
| Ordner | `Drosselrueckschlagventil/` | Kachel-id |

## 3. Belegt / angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Anschlüsse | G1/4 Innengewinde, beidseitig | **belegt:** Festo Datenblatt 6509 (GRA-1/4-B) |
| Einstellelement | Rändelschraube, Werkstoff Messing | **belegt** |
| Normalnenndurchfluss Drosselrichtung | 420 l/min (Drossel ganz offen) | **belegt** |
| Normalnenndurchfluss Rückschlagrichtung | 780 l/min | **belegt** |
| Betriebsdruck | 0,1 … 10 bar | **belegt** |
| Gehäuse | Zink-Druckguss, Dichtungen NBR, 180 g | **belegt** |
| Rückschlagweg allein | 780 − 420 = 360 l/min | **abgeleitet**, Annahme: beide Wege parallel und unabhängig |
| Drosselkennlinie | Durchfluss ∝ Ringspalt der Nadel, linear über 6 Umdrehungen | **Annahme** |
| Öffnungsdruck der Kugel | 0,1 bar (= kleinster Betriebsdruck) | **Annahme** |
| Gehäusemaße, Kugel Ø, Feder, Gewinde der Nadel | aus den Anschlüssen G1/4 geschätzt | **Annahme** |
| Durchflussrichtung 1 → 2 gedrosselt | | **Annahme**, steht in der README |

## 4. Architektur

- **`figur/stromventil.mjs` (neu, Rechenmodell, Ausnahme wie `pneumatik.mjs`):** reine Funktionen. `GRA_1_4 = { qnDrossel: 420, qnFrei: 780, umdrehungen: 6, oeffnungsdruck: 0.1, … }`; `drosselAnteil(umdrehungen)`, `kugelHub(dp, masse)` (0 … 1 aus Druckdifferenz gegen Öffnungsdruck, nur in freier Richtung), `durchfluss(richtung, umdrehungen, dpBar, masse)` → `{ drossel, rueckschlag, gesamt }` in Normliter/min (linear in Δp, bei Δp = 1 bar = Nennwert), `zustand`/`schritt` für weiches Folgen von Nadel und Kugel (Kugel hebt in ~20 ms, Nadel folgt dem Regler), `anzeige`.
- **`figur/schaltzeichen.mjs`:** `drosselRueckschlagSymbol({ feld })` mit Markierungen für die beiden Wege (Laufzeit färbt den aktiven Weg).
- **Bauteil:**
```
Drosselrueckschlagventil/
  index.html, favicon.svg, vorschau.svg, README.md
  tests/seite.test.mjs
  tests/tools/build-drossel.mjs, legende-drossel.mjs, pruefe-drossel.mjs
```
- Wiederverwendet: `normteile.mjs` (Schnittfläche, Gewinde, Steckverschraubung, Druckfeder + Blocklängenprüfung, Schlauchstummel), `schnitt.mjs`, `luft.mjs`, `explode.mjs`, `legende.mjs`, `seite.mjs`. Was nur diese Seite braucht, bleibt im Bauskript; wandert erst mit dem zweiten Stromventil (Rückschlag-, Schnellentlüftungsventil) nach `figur/`.

## 5. Die Figur

- Gehäuse als Quader mit gerundeten Kanten, Schnitt in der Ebene beider Kanäle; Schnittflächen im Schnittton (`SCHNITT_CSS`).
- Hauptkanal 1 ↔ 2 mit **Drosselsitz**; darüber senkrecht die **Regulierschraube** (Gewinde, O-Ring, Nadelspitze im Sitz), außen **Rändelkopf** und **Kontermutter**.
- Parallel darunter der **Rückschlagkanal** mit **Kugelsitz**, **Kugel**, **Druckfeder** und **Verschlussschraube** mit Dichtring.
- Links und rechts **Steckverschraubungen** G1/4 mit Schlauchstücken; Anschlussnummern „1" und „2" als einzige Schrift.
- **Befestigungsmutter** für den Fronttafeleinbau auf dem Gewindehals der Regulierschraube.
- Legende (10, Zerlegen außen zuerst): schlauch, verschraubung, mutter, kontermutter, schraube (Regulierschraube mit Rändelkopf und O-Ring), verschluss (Verschlussschraube mit Dichtring), feder, kugel, sitz (Drosselsitz/Ventilsitz-Einsatz – nur wenn als eigenes Teil gezeichnet, sonst entfällt), gehaeuse. Jeder Satz **ausführlich** (2–3 Sätze: was es ist, was es tut, worauf man achtet), Zahlen aus dem Modell.
- Zerlegen entlang der Montagerichtung: Schrauben nach oben bzw. unten heraus, Kugel und Feder aus ihrer Bohrung, Verschraubungen seitlich; jede Nummer am eigenen Teil (Kugel und Kontermutter ≥ 30 px prüfen, sonst Fallstrick 2).

## 6. Luft

- Drosselrichtung: kräftiges Blau strömt von 1 durch den Drosselspalt nach 2; Teilchendichte ∝ Durchfluss, im Spalt sichtbar enger/schneller; Rückschlagkanal bleibt leer (Kugel auf dem Sitz).
- Freie Richtung: von 2 nach 1 durch **beide** Wege, der Rückschlagweg sichtbar breiter; Kugel abgehoben.
- Drossel zu (0 Umdrehungen) in Drosselrichtung: kein Strom, Anzeige 0 l/min – Kammer vor dem Sitz kräftig, dahinter blass.
- Farben: vor der Engstelle kräftig (unter Druck), hinter der Drossel blass (entspannt) – so wird der Druckabfall an der Drossel sichtbar.

## 7. Prüfen

Ganzer Prüfkanon (Audit, Zerlegen, Linienenden, Browser ×5 in beiden Modi, live). Zusatzprüfungen (gemessen an der Zeichnung): Drosselrichtung → Kugel liegt auf dem Sitz (gezeichnete Lage), Teilchen nur im Hauptkanal; freie Richtung → Kugel um ≥ 3 px verschoben, Teilchen in beiden Kanälen; Drosselregler 0 → Anzeige 0 l/min und keine Teilchen hinter dem Sitz; Regler ganz auf → 420 l/min; freie Richtung → 780 l/min (Drossel offen) bzw. 360 l/min (Drossel zu); Nadel bewegt sich gezeichnet mit dem Regler; Symbolweg färbt sich passend.

## 8. Nicht im Umfang

Einschraub-Drosselrückschlagventil (Banjo, GRLA), Zuluft- vs. Abluftvariante als eigene Figuren, Düsengleichung/kritisches Druckverhältnis, angeschlossener Zylinder (kommt als Schaltungsbeispiel später).
