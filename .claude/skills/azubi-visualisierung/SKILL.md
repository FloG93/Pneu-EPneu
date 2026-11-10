---
name: azubi-visualisierung
description: Benutzen, wenn technische Bauteile für Auszubildende, Ausbilder oder den Berufsschulunterricht anschaulich erklärt werden sollen – als Lernseite, Schnittzeichnung, Explosionsdarstellung, „wie funktioniert ein …", interaktive Figur, in der ein Medium sichtbar strömt (Druckluft, Hydrauliköl, Kühlmittel, Strom) – in jedem Fach (Pneumatik, Hydraulik, Elektro, Mechanik, Kälte, Kfz). Auch bei „Azubi Visualisierung", „Übersichtsseite mit Kacheln für Bauteile", „wie der doppeltwirkende Zylinder", „neues Bauteil in die Sammlung" oder wenn ein Projekt einen Ordner figur/ mit kacheln.mjs hat.
---

# Azubi Visualisierung

Eine Lernsammlung im Browser: eine **Übersichtsseite mit Kacheln**, je Bauteil eine **isometrische Schnitt- und Explosionsfigur**, in der man sieht, was innen passiert. Für Auszubildende gebaut, für den Beamer im hellen Raum gemessen.

**Drei Grundsätze, die alles andere tragen:**

1. **Jede angezeigte Zahl kommt aus dem Modell, das auch die Teile bewegt.** Eine Anzeige ohne Modell ist Dekoration.
2. **Jede Farbe und jeder Text ist gemessen**, nicht angesehen: Text ≥ 4,5:1, Flächen ≥ 3:1, in Hell und Dunkel.
3. **Geprüft wird, was der Browser zeichnet**, nie „Klasse gesetzt". Ein Bild, das fast richtig aussieht, ist der Normalfall.

Gezeichnet wird mit dem Skill **anatomy** (**REQUIRED SUB-SKILL**, liegt daneben in `.claude/skills/anatomy/`). Dieser Skill sagt, **was** gebaut wird, **in welcher Reihenfolge** und **woran man merkt, dass es stimmt**.

## Wo stehe ich?

| Lage | Erkennbar an | Weiter mit |
|---|---|---|
| Neues Fach, nichts da | kein `figur/kacheln.mjs` | **A. Projekt anlegen** |
| Sammlung existiert | `figur/kacheln.mjs`, `figur/explode.mjs` | **B. Ein Bauteil bauen** |
| Bauteil existiert, soll besser werden | `<Ordner>/tests/tools/build-*.mjs` | Prüfkanon laufen lassen, dann ändern |

## A. Projekt anlegen

1. **Auftrag klären** – höchstens 10 Fragen, gebündelt, mit Empfehlung als erster Antwort. Fragenkatalog und Vorgaben: [references/auftrag.md](references/auftrag.md). Was unter „Festlegungen" steht, wird **nicht** gefragt.
2. `projekt.json` schreiben (Muster: `scripts/projekt.beispiel.json` – Hydraulik mit eigenen Öltönen).
3. Anlegen:
   ```bash
   node .claude/skills/azubi-visualisierung/scripts/anlegen.mjs <zielordner> projekt.json
   ```
   Legt `figur/` (fachneutral), `shared/`, Tests, `pages.yml`, `CLAUDE.md`, `README.md` an und kopiert beide Skills mit. Überschreibt nichts.
4. `npm test` muss grün sein – auch die gemessenen Medientöne. Schlägt ein Ton fehl: **Ton ändern, nie die Schwelle** ([references/farben.md](references/farben.md)).
5. `npm run bau:uebersicht` → `index.html`. Alle Kacheln stehen auf „in Arbeit", bis ihre Seite existiert.

## B. Ein Bauteil bauen

Reihenfolge ist verbindlich – jeder Schritt hat ein Prüftor.

| # | Schritt | Tor |
|---|---|---|
| 1 | **Recherche**: Norm- und Katalogmaße, Fachregeln an einer Quelle prüfen. Was nicht belegt ist, wird Annahme und steht später in der README. | Liste „belegt / angenommen" |
| 2 | **Spec** (superpowers:brainstorming), vom Nutzer bestätigt | „ja" |
| 3 | **Rechenmodell** in `figur/<fach>.mjs`: reine Funktionen, Tests von Hand nachgerechnet ([references/modell.md](references/modell.md)) | `npm run test:figur` |
| 4 | **Geometrie** in `<Ordner>/tests/tools/build-<name>.mjs`: nur Körper + `MOVE`, `STAGGER`, `PIECE_OF`, `LEGENDE` ([references/zeichnen.md](references/zeichnen.md)) | `--audit` → `audit passed` |
| 5 | **Zerlegen**: Wege entlang der Maschinenachsen, außen zuerst | `--apart` → `auseinandergefahren: sauber` |
| 6 | **Medium**: Wege als 3D-Pfade, Partikel, Kammerfüllung, vom Modell getrieben | Linienenden `0 of N` |
| 7 | **Seite**: `seite()` aus `figur/seite.mjs`, `favicon.svg` und `vorschau.svg` in den Ordner, `window.__figur` als Prüfhaken | Browsertest `all checks passed` |
| 8 | **Kachel** in `figur/kacheln.mjs` auf `fertig`, `npm run bau:uebersicht`, Bauteil in `package.json` und `tests.yml` | `npm test` |
| 9 | **Veröffentlichen**: Push auf den Standard-Branch ([references/veroeffentlichen.md](references/veroeffentlichen.md)) | HTTP 200 **und** Browsertest gegen die Live-Adresse |

Das ausgearbeitete Beispiel liegt in `beispiel/zylinder-doppeltwirkend/` (Zylinder ISO 15552 mit 5/2-Wegeventil, ~1000 Zeilen Geometrie, Modell mit 34 Tests). **Lesen, bevor das erste eigene Bauteil entsteht**; die Importpfade stimmen erst, wenn die Dateien wie im Ordner-README beschrieben im Projekt liegen.

## Die Naht

`figur/` kennt **kein einziges Bauteil**. Ein Bauteil liefert nur Geometrie, die vier Tabellen und bei beweglichen Teilen Medienwege und Modell.

| Modul | trägt |
|---|---|
| `explode.mjs` | Federn, Staffelung, Tiefensortierung je Bild, Nummern |
| `legende.mjs` | Legende, Nummern mit Führungslinie, Erklärzeile, Auswahl |
| `luft.mjs` | Medienschicht: Wege, Partikel, Kammerfüllung, die zwei Töne (Name bleibt, auch bei Öl oder Strom) |
| `schnitt.mjs` | Schnittfenster in Drehteilen |
| `normteile.mjs` | Zeichenhelfer für Normteile (Schnittfläche, Schraube, Gewinde, Verschraubung, Schalldämpfer, Feder) |
| `bedienung.mjs` | Signalknöpfe als Laufzeit: Halten, Impuls, Automatik auf Modellzeit |
| `gehaeuse.mjs`, `ventilraeume.mjs`, `ventilseite.mjs` | Schieberventil-Familie: aufgeschnittenes Gehäuse, Lufträume und Teilchenwege, Regler, Anzeige und Schaltzeichen. Kennen den Aufbau der Bauart, kein bestimmtes Ventil |
| `zylinderteile.mjs`, `zylinderseite.mjs` | Zylinder-Familie: Füße, Schiene, Lastschlitten, Ventil auf Grundplatte und Schläuche; Laufzeit für Hub, Kammerfüllung, Luftströme und Automatik. Kennen den Aufbau „Zylinder auf Schiene mit Ventil", keinen bestimmten Zylinder |
| `seite.mjs` | Karte, Bedienleiste, Hell/Dunkel, Kontrast, Startskript |
| `toene.mjs` | Grautöne und Kontraststufen |
| `kacheln.mjs` | Inhalt der Übersicht (`SEITE`, `RUBRIKEN`) |

**`build-<bauteil>.mjs` enthält keine Zeile Federmathematik, Sortierung oder Seitengerüst.** Braucht das nächste Bauteil etwas davon, wandert es nach `figur/` – die Naht wird verschoben, nicht umgangen.

## Festlegungen – nicht erneut fragen

| Thema | Festlegung |
|---|---|
| Sprache | Oberfläche und Doku Deutsch, Code-Kommentare Englisch, Commit-Betreff englisch im Imperativ |
| Technik | Reines HTML/CSS/ES-Module, kein Build-Schritt zur Laufzeit, keine npm-Pakete im Repo; erzeugt wird von Node-Skripten unter `*/tests/tools/` |
| Start | **Hell.** Beamer im hellen Raum ist der Maßstab. Kontrastregler 0–100 %, Start 45 %, vor dem ersten Zeichnen gesetzt |
| Kamera | Azimut 38°, Höhe 34°, 1 Welteinheit = 1 mm, echte Maße |
| Knopf | „Zerlegen und zusammenbauen": auseinander, halten, wieder zusammen; zweiter Druck oder Escape bricht ab |
| Richtung | Entlang der Maschinenachsen wie eine Demontage, nicht strahlenförmig. Außen zuerst, Zusammenbau innen zuerst |
| Tempo | 300 ms Staffelung beim Zerlegen, 950 ms beim Zusammenbau |
| Hervorhebung | Hausorange (`--accent`), Rest auf 16 % – deshalb ist **Orange als Medienfarbe verboten** |
| Medium | **Ein Farbton, zwei Helligkeiten**: kräftig = unter Druck/aktiv, blass = entspannt/Rücklauf. Im Dunkeln dreht die Helligkeit, die Bedeutung bleibt – im Text „kräftig/blass" sagen, nie „dunkel/hell" |
| Zeichnung | Keine Schrift außer Nummern und Anschlussbezeichnungen |
| Inhalt je Seite | Figur + Erklärtext. Keine Aufgaben, keine Quizze, sofern nicht bestellt |
| Speicher | `3d-druck.theme`, `3d-druck.kontrast` gemeinsam mit `shared/`; Eigenes mit Projektpräfix |
| `index.html` | erst committen, wenn die Seite vorzeigbar ist – sie geht beim Push live |

## Prüfkanon

```bash
npm test                                                   # Modell, Kacheln, Töne, Seite
node <Ordner>/tests/tools/build-<name>.mjs --audit         # audit passed
node <Ordner>/tests/tools/build-<name>.mjs --apart         # auseinandergefahren: sauber
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs <Ordner>/index.html   # line ends: 0 of N
python3 -m http.server 8311 --bind 127.0.0.1 &
node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/<Ordner>/ <Ordner>/tests/tools/pruefe-<name>.mjs
```

Der Browsertest prüft für jede Figur in beiden Modi: Prüfhaken, Start zusammengebaut, Kontrast 45 %, eine Nummer je Legendeneintrag, Zeigen ≠ Merken, Abblenden wirklich gezeichnet, Zerlegen, alle Nummern sichtbar, Legende springt nicht, Medium ruht beim Zerlegen, Themenwechsel im Lauf, Zusammenbau, jeder Text ≥ 4,5:1, kein Seitwärtsscrollen bei 390 px, keine Konsolenfehler. Was nur ein Bauteil verspricht (welche Kammer füllt sich, welche Zahl steht in der Anzeige), kommt als zweites Argument dazu.

Alle Fallstricke mit Ursache und Gegenmittel: [references/pruefen.md](references/pruefen.md).

## Die häufigsten Fehler

| Fehler | Gegenmittel |
|---|---|
| Fachregel aus dem Nachbarfach übernommen („Einfahren ist schneller" gilt in der Hydraulik, nicht allgemein in der Pneumatik) | Regel an einer Quelle des **eigenen** Fachs prüfen; im Modell als Bedingung testen, nicht als Behauptung |
| Modell liefert unrealistische Werte (3 m/s Kolben) | Masse, Reibung, Leitwerte an Katalogwerten eichen; Grenzfälle testen |
| Ton „sieht gut aus", fällt im Test durch | Ton rechnen, nicht die Schwelle senken ([farben.md](references/farben.md)) |
| Schnitt zeigt das Rohr vor dem Kolben | Rohr-Tiefenschlüssel hinter die geschnittenen Teile, im Audit erlauben ([zeichnen.md](references/zeichnen.md)) |
| Nummern zeigen ins Leere, sobald zerlegt | Clip auf innerer Gruppe, beim Zerlegen abschalten; Hub vorher auf 0 |
| Schläuche knicken oder laufen durch Teile | Hermite-Kurven mit geraden Ein- und Auslaufstücken; Lage des Geräts per Messreihe wählen |
| Workflow grün, Seite trotzdem nicht online | Pages war nie eingeschaltet – `pages.yml` aus der Vorlage schaltet es selbst ein |
| Übersicht zeigt alten Text | `npm run bau:uebersicht` nach **jeder** Änderung an `kacheln.mjs` |
| Bauteilseite: 404 in der Konsole | `favicon.svg` fehlt im Bauteilordner |
