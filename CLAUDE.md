# CLAUDE.md

Lernseite für Auszubildende: Pneumatik- und E-Pneumatik-Bauteile als interaktive isometrische Figuren. Übersicht und Aufbau: `README.md`. Entwurf: `docs/superpowers/specs/2026-11-02-pneumatik-bauteilsammlung-design.md`.

Das Vorgehen dieses Repos steht allgemein im Skill **`azubi-visualisierung`** (`.claude/skills/azubi-visualisierung/`). Er trägt Kopien von `figur/`, `shared/`, `pages.yml` und dem Zylinder; **wer eines dieser Originale ändert, kopiert es in den Skill** – `figur/tests/skill.test.mjs` schlägt sonst fehl und nennt die Datei.

## Regeln, die überall gelten

- Reines HTML/CSS/JavaScript (ES-Module), **kein Build-Schritt, keine npm-Pakete im Repo**. Hilfsprogramme (Playwright) nur in `*/tests/tools/` und außerhalb des Repos installiert. Ausgenommen ist `.claude/skills/`: Agent Skills, kein Code der Seite — wird weder veröffentlicht noch getestet.
- Code-Kommentare auf **Englisch**, Dokumentation, README und Oberfläche auf **Deutsch**. Commit-Betreff englisch im Imperativ.
- Nur relative Pfade (läuft lokal mit `python3 -m http.server` und auf GitHub Pages). Design und Bedienelemente aus `shared/`.
- Jeder Ordner mit einer `index.html` wird von `pages.yml` veröffentlicht: **`index.html` erst anlegen, wenn die Seite vorzeigbar ist.** `figur/` und `docs/` haben bewusst keine.
- Browser-Speicher: Hell/Dunkel und Kontrast stehen in `3d-druck.theme` und `3d-druck.kontrast` — **gemeinsam mit dem Repo 3D-Druck**, weil beide Seiten auf derselben Domain liegen und sich gleich anfühlen sollen. Alles Eigene beginnt mit `pneumatik.`
- Tests: `npm test` (Node ≥ 22, `node --test`), dazu `npm run pruef:zylinder`, `pruef:zylinder-ew`, `pruef:ventil` und `pruef:ventil32` für die Geometrie. Vor jedem Commit laufen lassen.

## Die Figuren

**Vor jeder Arbeit an einer Figur lesen:** `.claude/skills/anatomy/SKILL.md` und `references/kit.md`. Dort stehen Kamera, Körper, Lathe für Drehteile, Rohre, Audit. Die Beispiele unter `.claude/skills/anatomy/examples/` sind nur als Quelltext da; die erzeugten Seiten und PDFs wurden nicht mitkopiert.

### Die Naht: was gehört wohin

`figur/` kennt **kein einziges Pneumatik-Bauteil**. Es trägt das Allgemeine aller Figuren:

| Modul | Verantwortung |
|---|---|
| `figur/pneumatik.mjs` | Das Rechenmodell des Zylinders: Flächen, Kräfte, Kammerdrücke, Kolbenbewegung. Reine Funktionen, keine Zeichnung. |
| `figur/ventil.mjs` | Das Rechenmodell der Wegeventile aus der Wegebeschreibung (5/2 und 3/2, NC und NO): Öffnung der Wegesätze, Kammerdruck-Schritt (beides nutzt auch der Zylinder), Schieber, Steuerkammern, Schaltzeit. Reine Funktionen, keine Zeichnung. |
| `figur/stromventil.mjs` | Das Rechenmodell des Drosselrückschlagventils: Öffnungsanteil der Drossel, Hub der Kugel, Durchfluss beider Wege in l/min, Folgen von Nadel und Kugel, Anzeigezeile. Reine Funktionen, keine Zeichnung. |
| `figur/schaltzeichen.mjs` | Schaltzeichen nach ISO 1219-1 aus einer Beschreibung der Wege (`VENTIL_5_2`, `VENTIL_3_2_NC`, `VENTIL_3_2_NO`), dazu die Laufzeit, die das Symbol mit dem Schieber gleiten lässt und offene Wege färbt; das Symbol des Drosselrückschlagventils (`drosselRueckschlagSymbol`) mit seiner Laufzeit, die den durchströmten Zweig färbt |
| `figur/explode.mjs` | Wege, Federn, Staffelung, Sortierung nach echter Tiefe je Bild, Nummern am nächsten eigenen Teil (`anker`); `ABLAUF`: Bildschleife, Knopf „Zerlegen und zusammenbauen", Escape |
| `figur/legende.mjs` | Legendenliste, Nummern mit Führungslinie, Erklärzeile, Auswahl; `LAUFZEIT`: Zeigen/Merken, Erzählung beim Zusammenbau |
| `figur/normteile.mjs` | Zeichenhelfer für Normteile (Schnittfläche, Schraubenkopf, Gewinde, Steckverschraubung, Schalldämpfer, Druckfeder, Schlauchstummel) und die Blocklängenprüfung der Feder; Schnittton `SCHNITT_CSS`; `FEDER_LAUFZEIT`, die eine gezeichnete Feder mit dem Hub zusammendrückt (alle Seiten) |
| `figur/gehaeuse.mjs` | Der aufgeschnittene Körper eines Schieberventils: Grundplatte, Dichtung, Gehäuse mit Bohrung, Ringnuten und Kanälen, Schieber mit Bunden und Dichtringen, Kappen mit Steuerkolben, Feder, Schrauben, Schläuche, dazu das `put` des Recorders und die aufgenommenen Körper (`box`, `boxenOhne`); Bohrung, Nuten, Bunde und Maße kommen als Parameter |
| `figur/ventilraeume.mjs` | Die Lufträume im Schnitt eines Schieberventils (Nut, Kanal, Hals, Platte, Dichtung, Steuerkammer) und die Wege der Teilchen; das Bauteil sagt, wo seine Hälse liegen |
| `figur/ventilseite.mjs` | Was jede Ventilseite neben der Zeichnung gemeinsam hat: die drei Regler, das Gleiten von Schieber und Feder, die Anzeige, das Schaltzeichen, die Stilregeln, das Bild der Bildschleife (`bildZeichnen`) und die Hilfen der Luftzeichnung (Töne, Tempo, Räume, Steuerstrom) |
| `figur/zylinderteile.mjs` | Was jede Zylinderseite neben dem Zylinder selbst zeichnet: Füße und Schiene, der Lastschlitten, das vereinfachte Ventil auf Grundplatte (Anschlüsse, Abluftwege und Scheiben als Parameter, 5/2 wie 3/2) und die Schläuche vom Ventil zum Zylinder |
| `figur/zylinderseite.mjs` | Was beide Zylinderseiten zur Laufzeit gemeinsam haben: Teile und Schieber verschieben, Kammerfüllung nach Druck, Luftströme aus den Leitwerten, Takt der Automatik, Zustand setzen, Grundstock von `window.__figur` |
| `figur/bedienung.mjs` | Die Signalknöpfe als Laufzeit: Halten, Impuls und Automatik, alles auf Modellzeit; das Ventil sagt nur, was ein Signal bewirkt |
| `figur/luft.mjs` | Luftwege als 3D-Pfade, Partikel darauf, Kammerfüllung, die vier Blautöne |
| `figur/seite.mjs` | Seitengerüst: Karte, Bedienleiste, Hell/Dunkel, Kontrast, Startskript, Begleitbild (`beiFigur`), Modelldateien als Skripttext (`modulQuelle`) |

**Bekannte Ausnahmen:** Die drei Rechenmodelle `pneumatik.mjs`, `ventil.mjs` und `stromventil.mjs` kennen ihr Bauteil – ein Modell ohne Bauteil gibt es nicht. Sie liegen in `figur/`, weil mehrere Seiten mit ihnen rechnen (der Zylinder auch mit `ventil.mjs`; das Modell des Drosselrückschlagventils wird von seiner Seite, den Tests und dem Schaltzeichen geteilt) und dieselbe Physik nicht zweimal stehen darf. Die zweite Ausnahme ist die **Schieberventil-Familie**: `gehaeuse.mjs`, `ventilraeume.mjs` und `ventilseite.mjs` kennen den Aufbau eines Längsschieberventils (Bohrung mit Ringnuten, Kanäle nach unten, Schieber mit Bunden, Steuerkappe und Feder), aber kein bestimmtes Ventil: Anschlüsse, Nuten, Bunde und Maße kommen als Parameter vom Bauskript. Die dritte Ausnahme ist die **Zylinder-Familie**: `zylinderteile.mjs` und `zylinderseite.mjs` kennen den Aufbau „Zylinder auf Schiene mit einem Ventil auf Grundplatte daneben" (Füße, Schiene, Lastschlitten, Ventilkörper, Schläuche; Takt, Kammerfüllung, Luftströme), aber keinen bestimmten Zylinder und kein bestimmtes Ventil: Anschlüsse, Scheiben, Maße und Zylinderteile (Deckel, Zuganker, Dämpfung, Fenster) kommen vom Bauskript. Alles andere in `figur/` bleibt bauteilfrei.

Ein Bauteil liefert **nur** Geometrie und vier Datentabellen (`MOVE`, `STAGGER`, `PIECE_OF`, `LEGENDE`), bei beweglichen Bauteilen dazu die Luftwege und das Modell, das sie treibt. Seine Laufzeit gibt `EX.ABLAUF` genau zwei Funktionen: `bildZeichnen(dt, offen, bewegt)` und `vorDemZerlegen()`.

**`build-<bauteil>.mjs` darf keine Zeile Federmathematik, Sortierung oder Seitengerüst enthalten.** Muss beim nächsten Bauteil etwas nach `figur/` wandern, war die Naht falsch — dann wird sie dort verschoben, nicht im Bauteil umgangen.

### Festlegungen, die nicht erneut zu erfragen sind

| Thema | Festlegung |
|---|---|
| Knopf | **„Zerlegen und zusammenbauen"**: auseinander, kurz halten, wieder zusammensetzen. Zweiter Druck oder Escape bricht ab. |
| Richtung | Entlang der Maschinenachsen, wie eine Demontage. Nicht strahlenförmig. |
| Reihenfolge | Zerlegen außen zuerst, Zusammenbau von innen nach außen. |
| Tempo | Rund 14 s gesamt: 300 ms Staffelung beim Zerlegen, 950 ms beim Zusammenbau. |
| Hervorhebung | **Hausorange** (`--accent`). Gewählte Teile orange, Rest auf 16 % abgeblendet. |
| Luft | **Blau, und nur Blau.** Dunkelblau = Druckluft unter Druck, Hellblau = Abluft. Die Töne unterscheiden sich in der **Helligkeit**, nicht im Farbton, damit sie auch rot-grün-blind und im Schwarzweiß-Ausdruck trennbar bleiben. |
| Start | **Hell.** Beamer im hellen Schulraum ist der Maßstab. |
| Kontrast | Regler 0–100 %, Start 45 %. Wird **vor** dem ersten Zeichnen gesetzt. |
| Lesbarkeit | Jeder Text mindestens **4,5:1**, jede Fläche **3:1**, in beiden Modi, **gemessen**. |
| Maße | Echte Millimeter, 1 Welteinheit = 1 mm. Kamera Azimut 38°, Höhe 34°, Leinwand 900×800. |
| Zeichnung | Keine Schrift in der Zeichnung außer den Nummern und den Anschlussbezeichnungen. |

### Zahlen

Jede Zahl, die eine Figur anzeigt, kommt aus demselben Modell, das die Teile bewegt. **Eine Anzeige ohne Modell ist Dekoration.** Angezeigte Kräfte sind theoretische Werte; dass die Dichtungsreibung 3–10 % abzieht, steht dabei.

Maße, die nicht aus einem Katalog oder einer Norm stammen, sind Annahmen und stehen als solche in der README der Figur unter „Was die Figur nicht zeigt".

### Der Prüfkanon

| Tor | Befehl | Erwartet |
|---|---|---|
| Rechenmodell | `npm run test:figur` | grün, von Hand nachgerechnet |
| Geometrie in Ruhe | `node <Ordner>/tests/tools/build-<name>.mjs --audit` | `audit passed` |
| Geometrie zerlegt | `… --apart` | `auseinandergefahren: sauber` |
| Linienenden | `CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs <Ordner>/index.html` | `line ends: 0 of N` |
| Verhalten im Browser | `node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/<Ordner>/ <Ordner>/tests/tools/pruefe-<name>.mjs` | `all checks passed` |
| … Zylinder | `npm run pruef:browser` | `all checks passed (50)` |
| … einfachwirkender Zylinder | `npm run pruef:browser:zylinder-ew` (dazu `npm run pruef:zylinder-ew` für Audit und Zerlegen) | `all checks passed (90)`, fünfmal hintereinander |
| … 5/2-Wegeventil | `npm run pruef:browser:ventil` (dazu `npm run pruef:ventil` für Audit und Zerlegen) | `all checks passed (90)`, fünfmal hintereinander |
| … 3/2-Wegeventil | `npm run pruef:browser:ventil32` (dazu `npm run pruef:ventil32` für Audit und Zerlegen) | `all checks passed (132)`, fünfmal hintereinander |
| … Drosselrückschlagventil | `npm run pruef:browser:drossel` (dazu `npm run pruef:drossel` für Audit und Zerlegen) | `all checks passed (108)`, fünfmal hintereinander |
| Rest | `npm test` | alles grün |

Die Browserprüfungen laufen **nicht** in der CI: Playwright ist außerhalb des Repos installiert (keine npm-Pakete im Repo). Sie sind ein manueller Schritt vor jeder Veröffentlichung.

**Messen statt ansehen.** Geprüft wird nie „Klasse gesetzt", sondern was der Browser danach zeichnet. Ein Bild, das „fast richtig" aussieht, ist der Normalfall.

## Fallstricke (aus der Drucker-Figur im Repo 3D-Druck übernommen)

Jeder dieser Punkte ist dort einmal veröffentlicht worden.

1. **Zeichengruppe ≠ Baugruppe.** Eine Baugruppe ist, was man als Ganzes ausbauen würde. Zuordnung über Teilenamen, nicht über die Zeichengruppe.
2. **Ein winziges Teil als eigene Baugruppe** bekommt eine Führungslinie ins Leere. Unter etwa 30 px fährt es mit seiner Nachbarin mit, behält aber seine eigene Nummer.
3. **Nach jedem `schedule()` ein `run()`** — sonst startet die Bildschleife nicht neu und die Maschine setzt sich nicht zusammen.
4. **Seitenverhältnis festnageln**, sonst springt die Legende beim Herauszoomen und ein Klick landet eine Zeile zu hoch.
5. **Darüberfahren darf nichts merken.** Zeigen (`show`) und Merken (`picked`) sind getrennt.
6. **Jede gesetzte Klasse braucht eine CSS-Regel.** Geprüft wird, was der Browser zeichnet.
7. **Kein fester Tiefenschlüssel für die Explosion** bei einem dichten Körper: die Seite sortiert in jedem Bild nach echter Tiefe.
8. **Enden, die absichtlich frei werden** (Schläuche beim Zerlegen): `free: [start, end]` an der Route.
9. **Größen aus der gemessenen Bildschirmbreite**, nicht aus dem `viewBox` — sonst sind Nummern auf dem Telefon 6 px groß.
10. **Zu blasser Text.** Ein Orange für beide Modi reicht nicht: dunkel `#f2912f`, hell `#9a4c05`.
11. **`getComputedStyle` liefert auch Fließkommawerte** (`color(srgb 0.64 …)`); als Bytes gelesen ergibt das Unsinn. Und `getBBox()` ignoriert die eigene Transformation.
12. **Mit `toString()` eingebettete Funktionen** nehmen ihre freien Variablen nicht mit, und die Reihenfolge der Definitionen zählt.
13. **Thema und Kontrast vor dem ersten Zeichnen** setzen (Startskript im `<body>`), sonst blitzt die Zeichnung einmal in der falschen Stufe.
14. **`Number(null)` ist 0.** Ein leerer Speicher setzte den Regler auf 0 statt 45.
15. **Immer nur einen Build oder Audit gleichzeitig** (zwei Kerne), und Prozesse über die PID beenden.

Aus dem 5/2-Wegeventil:

16. **Scroll-Verankerung.** Ändert sich die Erklärzeile unter der Legende, wandert der Kartenrand; Chrome verankert das Scrollen an den Eckmarken der Karte und scrollt mit, die Legende springt unter dem Zeiger, der nächste Klick trifft den Nachbarn. `overflow-anchor: none` auf `.iso-plate-corners` (steht in `figur/seite.mjs`). Zeigt sich nur auf Seiten, die länger als das Fenster sind – der Test flackerte.
17. **Nummern am nächsten eigenen Teil.** Der Schwerpunkt einer Baugruppe aus getrennten Teilen liegt im Leeren. `EX.vorbereiten` hängt die Nummer an das Teil, das dem Schwerpunkt am nächsten liegt; mit `anker` werden Teile ausgeschlossen, die eine Variante verbirgt (`data-variante`). Der gemeinsame Browsertest misst jede Führungslinie.
