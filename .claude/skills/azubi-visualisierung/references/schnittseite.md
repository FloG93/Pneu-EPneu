# Ablauf für eine weitere Schnittseite – günstig, gleiche Qualität

Gelernt am Drosselrückschlagventil und am Wechselventil (Stand 2026-11-11). Gilt für Bauteile der **Schnitt-Familie** (`figur/schnittteile.mjs`, `figur/schnittseite.mjs`): Rückschlagventil, Schnellentlüftungsventil, Zweidruckventil, weitere Stromventile. Nicht für neue Familien (Zylinder, Schieberventil: eigene Familien, dort gilt der alte Ablauf).

## Wo das Geld bisher geblieben ist (Näherung aus den Meldungen der Agenten, keine Abrechnung)

| Posten | Anteil | Ursache |
|---|---|---|
| Nacharbeit nach falscher Bauform | ca. ein Viertel bis ein Drittel einer Seite | Drosselventil: Lehrbuchbild statt echter Bauform; Katalog-Schnitt wurde erst nach der Veröffentlichung gesucht |
| Klarheitsrunden nach dem Zeichnen | je 1 Runde je Seite | „übersichtlich" war nicht als messbares Kriterium vorgegeben; Bilder wurden erst danach beurteilt |
| Zwischenprüfungen | ca. 30 % | 3–4 Reviews je Seite, vieles davon fand Mechanisches (Telefonbreite, Wackelprüfung, Kommentare) |
| Doppelter Code, nachträglich zusammengeführt | eine Runde je Seite | Kopien wurden erst im Review gefunden; seit der Schnitt-Familie nur noch ~16 % gleiche Zeilen |
| Nutzungslimits mitten in der Arbeit | 3 Unterbrechungen | lange Pakete ohne Zwischen-Commits; Agent musste Kontext neu lesen |
| Lange Ausgaben im Kontext | laufend | Browser-/Audit-Läufe ohne Kurzfassung |

## Der Ablauf (Soll)

**Phase 0 – Quellenkarte (Controller, ca. 10 Aufrufe, vor jedem Entwurf; einziger Schritt, der nicht delegiert wird)**
Pflicht, drei Quellen, jede mit dem Read-Werkzeug **angesehen**, nicht nur zusammengefasst:
1. **Schnittbild/Funktionsschnitt** der echten Bauform: Herstellerkatalog (Festo `…/Documentation/<Jahr>/DE/<Baureihe>.PDF`, Abschnitt „Funktionsschnitt"/„Werkstoffe") oder Schnittmodell-Foto (Wikimedia). Nie das Lehrbuchschaltbild als Bauform nehmen. Fehlt der Schnitt, steht das im Entwurf, und die Figur heißt „nachgezeichnet nach …".
2. **Datenblatt** (Festo `…/DataSheet/DE_DE/<Teilenummer>.pdf`, mit `pdftotext -layout`): Anschlüsse, Normdurchfluss, Druck, Werkstoffe.
3. **Schaltzeichen** (ISO 1219-1): SMC-/Festo-Symboltabelle als Bild.
Ergebnis: eine Datei `Quellenkarte` im Entwurf (Tabelle „belegt / abgeleitet / angenommen") und die drei Bilder im Scratchpad.
Zugriffsfallen: `festo.com/net/…`, `pdf_flip` und `didacticonline` liefern 403/503; `ftp.festo.com` und `commons.wikimedia.org/wiki/Special:FilePath/<Datei>?width=900` gehen.

**Phase 1 – Entwurf und Plan aus der Vorlage (Controller)**
`docs/superpowers/specs/2026-11-11-wechselventil-design.md` und `docs/superpowers/plans/2026-11-11-wechselventil.md` sind die Vorlage: Abschnitte lassen, Inhalte ersetzen. Der Entwurf enthält vorab **Abnahmekriterien**, die später gemessen werden (siehe unten), keine Adjektive.

**Phase 2 – ein Implementer (ein günstigeres Modell), drei Pakete statt sieben Aufgaben**
- **Paket A:** Modell + Tests (RED mit echten Assertions), Symbol; ein Review nur, wenn das Modell neu denkt (Logik, nicht nur Zahlen).
- **Paket B:** Geometrie, Legende, Zerlegen. Endet mit Screenshots (hell/dunkel, zusammen/zerlegt, 390 px) **und** den messbaren Abnahmekriterien. **Controller sieht die Bilder** (ca. 5 k Token) und gibt frei oder nennt konkrete Mängel. Das ersetzt die bisherigen Klarheitsrunden.
- **Paket C:** Luft, Bedienung, Texte, Browsermodul, README, Kachel, CI, Veröffentlichung vorbereiten, `git add -f index.html`.
- Nach **jedem Teilschritt** committen (Container/Limits), nicht pushen.
- Ein Implementer pro Seite, per `SendMessage` fortgesetzt (spart Wiedereinlesen).

**Phase 3 – ein Abschluss-Review (ein günstigeres Modell) mit Wackel-Suche**
Inhalt: 12 Läufe der Browserprüfung (einer unter `taskset -c 0` + Last), Texte als Lehrer des ersten Lehrjahrs, Bilder ansehen, Regression der anderen Seiten, Frische (`git diff --exit-code`). Eine Korrekturrunde, dann Controller pusht und prüft live.

## Abnahmekriterien (gelernt, gehören in jeden Entwurf; wo möglich schon im gemeinsamen Prüfer)

1. Bauform nach Schnittbild: jedes sichtbare Teil der Quelle ist in der Legende, jede Legende-Nummer an einem eigenen Teil; Block, Bohrungen, Sitze, O-Ringe wie im Schnitt.
2. Luft: Räume nahezu deckend, Wandlinien **darüber**; 6-bar-Raum gegen 0-bar-Raum gemessen ≥ 2,4:1 (Pixel, nicht Attribut), beide Modi; Farbe folgt dem **Druck**, nie einer festen Seite.
3. Teilchen nur auf Wegen mit Durchfluss, in Strömungsrichtung, **nie über Material**; Schlauchströme enden vor den Verschraubungsringen.
4. Alle Texte ≥ 4,5:1; Anzeige bricht um, liegt bei 390 px im Fenster und überlappt nichts (Hinweiszeile unter 640 px ausgeblendet).
5. Zerlegte Ansicht: Zeichenfläche genutzt, kleinste Baugruppe ≥ 30 px (sonst eigene Nummer, fährt mit), Nummern nur auf eigenen Teilen, eigener Fluchtweg je Baugruppe.
6. Annahmen im Text als „im Modell"/„angenommen"/„nachgezeichnet"/„überhöht"; Zahlen aus Datenblatt oder abgeleitet, sonst nicht behaupten.
7. Prüfungen messen die Zeichnung; **jede neue Prüfung mit RED-Probe**; keine festen Wartezeiten (Zustand abwarten oder Bildpaare im selben `evaluate`); Zeitlupe-Prüfungen mit Spielraum.

## Die Werkzeuge (gebaut) und die übrigen Hebel

1. **Gemeinsamer Prüfer** `figur/tests/tools/pruefe-schnitt.mjs`: Maßstab, Zeitlupe/Automatik beim Laden, Legendensätze, kein Teilchen auf Material oder außerhalb der Luft, Laufrichtung der Teilchen, gemessener Kontrast 6 bar gegen 0 bar (≥ 2,4:1), Abhebung eines Teils, Erklärtext 4,5:1, Anzeige und Regler bei 390 px, Zerlegen (Automatik aus, bewegte Teile zu Hause, nichts strömt). Das Seitenmodul `<Ordner>/tests/tools/pruefe-<id>.mjs` ruft `schnittPruefungen({ …ctx, h, beschreibung, spezifisch })` und enthält nur Bauteilspezifisches (ca. zwei Drittel der früheren Zeilen). Die Schnittstelle (was die Seite liefern muss) steht im Kopfkommentar des Prüfers; die wahlfreien Abschnitte (`zeitlupe`, `luftwege`, `kontrast`, `abhebung`) sind an oder ausdrücklich `{ aus: "Grund" }`, nie still ausgelassen; `beschreibungPruefen` nennt Fehlendes beim Namen. **Jede neue gemeinsame Prüfung bekommt eine RED-Probe an jeder Seite, die sie nutzt.**
2. **Seitengerüst-Generator:** `npm run neu:schnittseite -- <Ordner> <id> "<Name>" [--rubrik sperr-und-stromventile]` (z. B. `Rueckschlagventil rueckschlagventil "Rückschlagventil"`). Legt eine **sofort bau- und prüfbare** Seite an, abgeleitet vom Wechselventil: Bauskript, Legende, Prüfmodul, `seite.test.mjs`, Modell `figur/<id>.mjs` mit Test, README-Gerüst, favicon, `package.json`-Skripte (`test:`, `bau:`, `pruef:`, `pruef:browser:`), CI-Schritt, Eintrag in `figur/tests/schnitt-seiten.test.mjs`. Jede zu ersetzende Stelle trägt `TODO(<id>)`, die Prüfungen und Tests der Kopie tragen es im Namen (nichts ist still grün): `grep -rn "TODO(<id>)" <Ordner> figur`. `<Ordner>/index.html` steht in `.git/info/exclude` (pages.yml veröffentlicht jeden Ordner mit index.html – erst bei vorzeigbarer Seite `git add -f`). Überschreibt nichts; `… <Ordner> --entfernen` nimmt eine nur generierte, unveränderte Seite wieder weg. Die Kachel in `figur/kacheln.mjs` bleibt „geplant“, bis die Seite fertig ist; `<Ordner>/.generiert.json` am Ende löschen.
3. **Ein Kommando als Tor:** `npm run gate -- <Ordner> [--lauefe 5] [--wackel] [--weiter]` fährt `npm test`, Audit, Zerlegen, Neubau + `git diff`, Linien, Browserprüfung × N (mit `--wackel` 8 Läufe und einer unter `taskset -c 0` + Last) mit eigenem Server (PID, wird beendet) und gibt **eine Zeile je Tor** aus (`ok` / `FEHLT … – Details: <Log>` / `WARN`); alles Übrige steht in der Logdatei, deren Pfad am Ende steht. `npm run gate:alle` fährt alle Seiten und druckt die Tabelle Seite × Tor. Die Befehle sind die des Prüfkanons (ein Test vergleicht sie mit `package.json`).
4. **Brief aus der Vorlage:** der Implementer-Brief (Regeln, Trailer, Prüfkanon, Lehren) steht als Datei; im Auftrag nur Pfad und Paket. Spart wiederholten Text.
5. **Schnitt-Familie nutzen:** neue Seite = Maße, Hohlräume, Teile, Wege, Modell, Texte; alles andere kommt aus `figur/`. Ziel unter 400 Zeilen Bauskript, unter 20 % gleiche Zeilen zur Nachbarseite.
6. **Modellwahl:** Controller (Recherche, Entwurf, Bilder ansehen, Freigabe) auf dem stärksten Modell; Implementer und Reviewer auf einem günstigeren Modell; nichts davon auf dem kleinsten (Zeichnung, Texte und Prüfungen sind nicht mechanisch genug).
7. **Reviews bündeln:** Modell-Review nur bei neuer Logik; Bilder-Review entfällt (Controller); ein Abschluss-Review mit Wackel-Suche.

## Was nicht gekürzt wird

Quellenkarte, Bilder ansehen, RED-Proben, Abschluss-Review mit 12 Läufen, Frische-Check, Live-Prüfung nach dem Push, Texte als Lehrer prüfen. Jeder dieser Schritte hat mindestens einen veröffentlichten oder fast veröffentlichten Fehler verhindert oder gefunden.

## Reihenfolge der nächsten Seiten (Schnitt-Familie)

Rückschlagventil (einfachste, Manschette/Kugel aus der Quelle klären), Schnellentlüftungsventil, Zweidruckventil. Die Werkzeuge 1–3 sind gebaut; jede dieser Seiten beginnt mit dem Generator und endet mit dem Tor.
