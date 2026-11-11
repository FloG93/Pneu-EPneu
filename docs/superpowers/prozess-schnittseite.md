# Prozess: ein weiteres Ventil als Schnittseite – günstig, gleiche Qualität

Stand: 2026-11-11, nach Drosselrückschlagventil und Wechselventil. Gilt für Bauteile der **Schnitt-Familie** (`figur/schnittteile.mjs`, `figur/schnittseite.mjs`): Rückschlagventil, Schnellentlüftungsventil, Zweidruckventil, weitere Stromventile. Nicht für neue Familien (Zylinder, Schieberventil: eigene Familien, dort gilt der alte Ablauf).

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
`docs/superpowers/specs/2026-11-11-wechselventil-design.md` und der zugehörige Plan sind die Vorlage: Abschnitte lassen, Inhalte ersetzen. Der Entwurf enthält vorab **Abnahmekriterien**, die später gemessen werden (siehe unten), keine Adjektive.

**Phase 2 – ein Implementer (Sonnet), drei Pakete statt sieben Aufgaben**
- **Paket A:** Modell + Tests (RED mit echten Assertions), Symbol; ein Review nur, wenn das Modell neu denkt (Logik, nicht nur Zahlen).
- **Paket B:** Geometrie, Legende, Zerlegen. Endet mit Screenshots (hell/dunkel, zusammen/zerlegt, 390 px) **und** den messbaren Abnahmekriterien. **Controller sieht die Bilder** (ca. 5 k Token) und gibt frei oder nennt konkrete Mängel. Das ersetzt die bisherigen Klarheitsrunden.
- **Paket C:** Luft, Bedienung, Texte, Browsermodul, README, Kachel, CI, Veröffentlichung vorbereiten, `git add -f index.html`.
- Nach **jedem Teilschritt** committen (Container/Limits), nicht pushen.
- Ein Implementer pro Seite, per `SendMessage` fortgesetzt (spart Wiedereinlesen).

**Phase 3 – ein Abschluss-Review (Sonnet) mit Wackel-Suche**
Inhalt: 12 Läufe der Browserprüfung (einer unter `taskset -c 0` + Last), Texte als Lehrer des ersten Lehrjahrs, Bilder ansehen, Regression der anderen Seiten, Frische (`git diff --exit-code`). Eine Korrekturrunde, dann Controller pusht und prüft live.

## Abnahmekriterien (gelernt, gehören in jeden Entwurf; wo möglich schon im gemeinsamen Prüfer)

1. Bauform nach Schnittbild: jedes sichtbare Teil der Quelle ist in der Legende, jede Legende-Nummer an einem eigenen Teil; Block, Bohrungen, Sitze, O-Ringe wie im Schnitt.
2. Luft: Räume nahezu deckend, Wandlinien **darüber**; 6-bar-Raum gegen 0-bar-Raum gemessen ≥ 2,4:1 (Pixel, nicht Attribut), beide Modi; Farbe folgt dem **Druck**, nie einer festen Seite.
3. Teilchen nur auf Wegen mit Durchfluss, in Strömungsrichtung, **nie über Material**; Schlauchströme enden vor den Verschraubungsringen.
4. Alle Texte ≥ 4,5:1; Anzeige bricht um, liegt bei 390 px im Fenster und überlappt nichts (Hinweiszeile unter 640 px ausgeblendet).
5. Zerlegte Ansicht: Zeichenfläche genutzt, kleinste Baugruppe ≥ 30 px (sonst eigene Nummer, fährt mit), Nummern nur auf eigenen Teilen, eigener Fluchtweg je Baugruppe.
6. Annahmen im Text als „im Modell"/„angenommen"/„nachgezeichnet"/„überhöht"; Zahlen aus Datenblatt oder abgeleitet, sonst nicht behaupten.
7. Prüfungen messen die Zeichnung; **jede neue Prüfung mit RED-Probe**; keine festen Wartezeiten (Zustand abwarten oder Bildpaare im selben `evaluate`); Zeitlupe-Prüfungen mit Spielraum.

## Hebel, die Geld sparen, ohne Qualität zu kosten

1. **Gemeinsamer Prüfer statt Seitenprüfer:** Kriterien 2–5 (Kontrast, Wand/Teilchen über Material, Readout im Fenster, Hinweis/Readout ohne Überlappung, Legende/Zerlegen) einmal in `figur/tests/tools/pruefe-figur.mjs` (oder einem zweiten gemeinsamen Modul) lösen, parametriert über die Seiten-API. Das Seitenmodul enthält nur Bauteilspezifisches (ca. 60 statt 160 Prüfungen). Einmalige Investition, danach jede Seite günstiger und einheitlicher.
2. **Seitengerüst-Generator:** `node .claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs <Ordner> <id>` kopiert Bauskript-Gerüst, Legende, Prüfmodul, Seitentest, npm-Skripte, CI-Zeile und Kachel-Eintrag des Wechselventils mit Platzhaltern. Spart das Boilerplate der alten Aufgaben 3, 6 und 7.
3. **Ein Kommando als Tor:** `npm run gate:<seite>` führt Audit, Zerlegen, Linien, Test, Browser ×5 und Neubau-Diff aus und gibt nur eine Zeile je Tor aus (Details in eine Datei). Spart die langen Ausgaben im Kontext.
4. **Brief aus der Vorlage:** der Implementer-Brief (Regeln, Trailer, Prüfkanon, Lehren) steht als Datei; im Auftrag nur Pfad und Paket. Spart wiederholten Text.
5. **Schnitt-Familie nutzen:** neue Seite = Maße, Hohlräume, Teile, Wege, Modell, Texte; alles andere kommt aus `figur/`. Ziel unter 400 Zeilen Bauskript, unter 20 % gleiche Zeilen zur Nachbarseite.
6. **Modellwahl:** Controller (Recherche, Entwurf, Bilder ansehen, Freigabe) auf dem stärksten Modell; Implementer und Reviewer Sonnet; nichts davon auf Haiku (Zeichnung, Texte und Prüfungen sind nicht mechanisch genug).
7. **Reviews bündeln:** Modell-Review nur bei neuer Logik; Bilder-Review entfällt (Controller); ein Abschluss-Review mit Wackel-Suche.

## Was nicht gekürzt wird

Quellenkarte, Bilder ansehen, RED-Proben, Abschluss-Review mit 12 Läufen, Frische-Check, Live-Prüfung nach dem Push, Texte als Lehrer prüfen. Jeder dieser Schritte hat mindestens einen veröffentlichten oder fast veröffentlichten Fehler verhindert oder gefunden.

## Reihenfolge der nächsten Seiten (Schnitt-Familie)

Rückschlagventil (einfachste, Manschette/Kugel aus der Quelle klären), Schnellentlüftungsventil, Zweidruckventil. Vor der ersten dieser Seiten die Hebel 1–3 bauen (ein Paket), weil sie sich über drei Seiten amortisieren.
