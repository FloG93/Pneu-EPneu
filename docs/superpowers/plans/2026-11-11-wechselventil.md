# Wechselventil – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Bauteilseite `Wechselventil/` (Festo OS-1/4-B als Zahlenvorbild, Innenaufbau nach dem Bosch-Schnittmodell) mit mitschaltendem Schaltzeichen, ODER-Verhalten aus einem Modell, sichtbarem Luftstrom, ausführlicher Legende und fertiger Kachel.

**Architecture:** Neues Rechenmodell `figur/wechselventil.mjs`, neues Symbol in `figur/schaltzeichen.mjs`, gemeinsame Laufzeit der Drosselseite nach `figur/` (Naht verschieben), dann das Bauteil nach dem Muster `Drosselrueckschlagventil/`.

**Tech Stack:** Node ≥ 22 (`node --test`), ES-Module ohne Pakete, anatomy-Kit, Playwright `import pw from "/opt/node-tools/node_modules/playwright/index.js"; const { chromium } = pw;`, Chromium `/opt/pw-browsers/chromium`.

**Spec:** `docs/superpowers/specs/2026-11-11-wechselventil-design.md` (verbindlich, vor allem §2, §5–§8).

## Global Constraints

- Alles aus `CLAUDE.md` gilt (Naht, Festlegungen, Prüfkanon, Fallstricke 1–17). Vor jeder Figurarbeit `.claude/skills/anatomy/SKILL.md` + `references/kit.md` und `.claude/skills/azubi-visualisierung/references/zeichnen.md` lesen.
- Vorbild in Stil, Aufbau und Prüfungen: `Drosselrueckschlagventil/` (Schnitt aus Hohlraum-Raster, Schnittton, Legende, Prüfmodul, README, Vorschau, Raumfarben, Teilchenströme).
- **Lehren aus der Drosselseite, verbindlich:**
  1. Bauform zuerst gegen die Quellen prüfen (Spec §2): das Bosch-Schnittbild liegt unter `/tmp/claude-0/-home-user/b82c6352-8203-5703-84fc-c97ce254f361/scratchpad/os/shuttle.jpg`, die SMC-Symbolzeile unter `…/scratchpad/os/pn-s2.png` – **mit dem Read-Werkzeug ansehen**, nicht ins Repo kopieren.
  2. **Jede Zeichenaufgabe endet mit eigenem Blick auf Screenshots** (hell, deviceScaleFactor 1, Scratchpad) und ehrlicher Meldung, was unklar bleibt.
  3. Farben folgen dem **Druck**, nicht festen Seiten; Teilchen laufen nur auf Wegen mit Durchfluss, in Strömungsrichtung, **nie über Material**; Schlauchströme enden vor den Verschraubungsringen.
  4. Die Anzeige bricht um und liegt bei 390 px im Fenster (gemessen).
  5. Browser-Prüfungen messen die **Zeichnung** (px, berechnete Farben), nicht Modellwerte oder Klassen; Zeitprüfungen ohne feste Wartezeit (`waitForFunction` auf Zustand oder Bildpaare im selben `evaluate`); jede neue Prüfung bekommt eine RED-Probe.
  6. Annahmen im Text als „im Modell", „angenommen", „nachgezeichnet" kennzeichnen; keine Behauptung ohne Quelle.
  7. Laufzeit steht **nicht** im Bauskript, wenn die Drosselseite dasselbe schon braucht (Task 2).
  8. Zerlegte Ansicht nutzt die Zeichenfläche, Nummern liegen auf eigenen Teilen, kleinste Baugruppe ≥ 30 px (sonst Fallstrick 2 mit eigener Nummer).
- Einheiten: mm, bar (Überdruck in der Anzeige), l/min, s; Modell rechnet absolut mit Umgebung 1 wie `ventil.mjs`.
- Luft nur Blau aus `figur/luft.mjs` `FARBEN`; Text sagt „kräftiges/blasses Blau". Keine Schrift in der Zeichnung außer Nummern und „1", „2".
- Jede angezeigte Zahl aus dem Modell; Legenden- und README-Zahlen aus `OS_1_4` (im Seitentest nachgerechnet).
- Code-Kommentare Englisch; UI, Doku, Testnamen Deutsch; Commit-Betreff englisch im Imperativ, **jeder Commit endet mit genau diesen zwei Zeilen** (nach Leerzeile):
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01UzRMsA8PMV6oBLiCSKW6UT`
  Keine Modellnamen sonst irgendwo. **Vor jedem Commit `git status` prüfen** (frühere Läufe legten versehentlich Dateien im Wurzelordner an).
- Laufzeit-Strings ohne Backticks; Top-Level-Namen eindeutig (Fallstrick 12). Geänderte Originale, die der Skill kopiert, nachziehen (`figur/tests/skill.test.mjs` nennt sie).
- Nach **jedem** Task: `npm test` grün; alle `pruef:*` sauber. Browserprüfungen aller bestehenden Seiten (Zylinder 50, einfachwirkend 90, 5/2 90, 3/2 132, Drossel 114) nach jedem Task, der gemeinsame Module ändert (Task 2, ggf. 5) und vor Task 7 abschließend.
- `Wechselventil/index.html` wird erst in Task 7 committet (vorher in `.git/info/exclude`, in Task 7 `git add -f` und Zeile entfernen).
- Immer nur ein Build, Audit oder Browser gleichzeitig; Server `python3 -m http.server 8311 --bind 127.0.0.1` über die PID beenden.
- Nach jedem Teilschritt committen (Container können neu starten). **Nicht pushen** – das macht der Controller.

## Review Focus

1. **ODER-Logik im Modell:** 4 Fälle, „wer zuerst kommt", höherer Druck sperrt den niedrigeren, gesperrter Eingang bekommt nichts vom Ausgang, Ausgang entlüftet nur über einen offenen Eingang. → Task 1.
2. **Drosselseite nach der Verschiebung:** Zeichnung byte-gleich, 114/114. → Task 2.
3. **Zeichnung gegen Schnittmodell:** Block, durchgehende Bohrung, Eingänge an den Enden, Ausgang oben, Verschlussstück + O-Ring, Gummikörper, Befestigungsbohrungen; Körper bewegt sich gezeichnet. → Task 3, 5.
4. **Farben/Luft** nach Spec §7 in allen vier Fällen und beim Umschalten. → Task 5, 6.
5. **Symbol** gegen die Normdarstellung (Bild ansehen). → Task 2.

---

### Task 1: Rechenmodell `figur/wechselventil.mjs`

**Files:** Create `figur/wechselventil.mjs`, `figur/tests/wechselventil.test.mjs`.

**Produces:** wie Spec §5 (`OS_1_4`, `neuerZustand`, `schritt`, `durchfluss`, `anzeige`, `anzeigeZeilen`). Jede Konstante mit Herkunft „Katalog" / „abgeleitet" / „Annahme" im Kommentar; Vorzeichen- und Zustandskonvention (`s`, Druck absolut vs. Überdruck) im Kopfkommentar **einmal** erklärt.

- [ ] Step 1 (RED zuerst, Fehlschlag der Assertions notieren, nicht nur „Modul fehlt"): Tests, von Hand nachgerechnet: „beide drucklos: p2 bleibt 0, Körper bleibt", „nur links 6 bar: Körper sperrt rechts (s = 1) innerhalb 8 ms, p2 → 6 bar", „nur rechts: sperrt links, p2 → 6", „beide 6 bar, links zuerst: Körper bleibt rechts (zuerst kommt)", „beide 6, rechts zuerst: bleibt links", „links 6, rechts 3: sperrt rechts; links 3, rechts 6: sperrt links", „Δp unter 0,05 bar: kein Wechsel", „Eingang links fällt auf 0, rechts 6: Körper wechselt, p2 bleibt 6 (keine Druckspitze nach unten)", „beide aus: p2 entlüftet über den offenen Eingang, innerhalb von 0,5 s unter 0,1 bar", „gesperrter Eingang: Durchfluss 0 dorthin", „Normwert: Δp 1 bar offene Seite → 1170 l/min", „Anzeigezeilen runden und nennen den gesperrten Eingang". Dann umsetzen. Commit `Add the shuttle valve model`.

### Task 2: Schaltzeichen und gemeinsame Laufzeit nach `figur/`

**Files:** Modify `figur/schaltzeichen.mjs`, `figur/tests/schaltzeichen.test.mjs`, `Drosselrueckschlagventil/tests/tools/build-drossel.mjs`, `figur/ventilseite.mjs` (oder neues `figur/…`-Modul), zugehörige Tests, `CLAUDE.md` (Nahttabelle), Skill-Kopien (`vorlage/figur/…`, Paare).

- [ ] Step 1 Symbol: `wechselventilSymbol({ feld })` nach ISO 1219-1 (Spec §2/§6: Rechteck, durchgehende Leitung, Kugel in der Mitte, zwei Sitz-Zeichen, Eingänge „1" links und rechts, Ausgang „2" abzweigend nach oben), Elemente mit `data-teil="kugel|links|rechts|ausgang"`, damit die Laufzeit Kugel und Wege stellen/färben kann (Muster `DROSSEL_SYMBOL_LAUFZEIT`); **Symbol rendern und ansehen**, mit der Bildzeile vergleichen, Abweichungen im Bericht nennen. Tests: Rechteck, Kreis, zwei Sitze, nur die Texte „1", „1", „2"; andere Symbolausgaben per Hash unverändert. Commit `Draw the shuttle valve symbol`.
- [ ] Step 2 Naht: die Teile der Drossel-Laufzeit, die die Wechselventilseite wieder braucht (Spec §5), nach `figur/` ziehen, parametriert (Wege/Räume/Ton-Funktion als Eingabe, kein Drossel-Wissen); Drosselseite benutzt sie. **Zeichnung `Drosselrueckschlagventil/index.html` byte-gleich** (alle `<svg>`-Blöcke vorher/nachher vergleichen, nur das eingebettete Skript darf sich ändern); `figur/tests`-Test für die neuen Funktionen (gültiges Skript, Parameter). Browser: Drossel 114 ×2, Zylinder 50, einfachwirkend 90, 5/2 90, 3/2 132. Skill-Kopien + Paare. Commit `Move the flow-valve page runtime into figur/`.

### Task 3: Geometrie in Ruhe + Legende

**Files:** Create `Wechselventil/tests/tools/build-wechsel.mjs`, `legende-wechsel.mjs`, `favicon.svg`; `.git/info/exclude` + `Wechselventil/index.html`.

- Spec §6. Kamera, Leinwand, Seitenverhältnis nach `CLAUDE.md`; Ventil füllt ≥ 80 % der Zeichenbreite (fitProjection auf die echten Extremwerte).
- Schnittmodell **ansehen** und nachzeichnen: Block mit durchgehender Bohrung, Verschlussstück + O-Ring links, Sitze, Gummikörper, Kammer, Ausgangsbohrung mit Gewinde, zwei Befestigungsbohrungen; drei Verschraubungen mit kurzen Schläuchen.
- `LEGENDE` (7 Einträge, Spec §6), ausführlich; Zahlen aus `OS_1_4`.
- [ ] `--audit` → `audit passed`; Linien `0 of N`; Screenshot hell **angesehen**: Block, Bohrung, Körper, Sitze und Ausgang auf einen Blick erkennbar? Commit `Draw the shuttle valve at rest`.

### Task 4: Zerlegen

- `MOVE`, `STAGGER`, `PIECE_OF` nach Messung (Snippet in `.claude/skills/explosionsfigur/SKILL.md`); Spec §6 „Zerlegen". Leitlinien ohne Überlappung, Zeichenfläche genutzt.
- [ ] `--apart` → `auseinandergefahren: sauber`; Screenshot zerlegt **angesehen**; kleinste Baugruppe in px messen und melden. Commit `Take the shuttle valve apart`.

### Task 5: Luft, Laufzeit, Bedienung, Seite

- Spec §3, §7, §8. Raumfarben nach Druck, Teilchen nach Vorzeichen des Durchflusses, Körper bewegt sich gezeichnet um den Hub, Symbol schaltet mit.
- Bedienung: Regler „Eingang links", „Eingang rechts" (0 … 8 bar, Schritt 0,5), Automatik (8 Schritte, Spec §3, über `figur/bedienung.mjs`), Zeitlupe (Start 1/10 wie die anderen), Zerlegen beendet die Automatik. Anzeige zweizeilig, umbrechend, aus `anzeigeZeilen`.
- Erklärtext mit Wahrheitstabelle als HTML-Tabelle (Spec §8, Kontrast ≥ 4,5:1 in beiden Modi, bei 390 px ohne Seitwärtsscrollen).
- `window.__figur` mit `stelle(pL, pR)` und `modell()`.
- `tests/seite.test.mjs`: Zahlen aus dem Modell (1170 …), Favicon, Legende vollständig und je Satz ≥ 2 Sätze, Tabelle vorhanden.
- [ ] Linien `0 of N`; Screenshots hell/dunkel für „L an", „R an", „beide an" (nach L zuerst), „beide aus nach Rückstrom" **angesehen**. Commit `Let air through the shuttle valve`.

### Task 6: Browserprüfung

**Files:** Create `Wechselventil/tests/tools/pruefe-wechsel.mjs`; `package.json` (`test:wechsel` in `test`, `bau:wechsel`, `pruef:wechsel`, `pruef:browser:wechsel`).

- Prüft gemessen (Spec §9). RED-Probe: einen Fehler absichtlich einbauen (z. B. Raumfarben folgen festen Seiten oder Körper wechselt nicht), Fehlschlag notieren, zurück.
- [ ] `all checks passed (N)` ×5, danach 8 weitere Läufe ohne Fehler (Wackler suchen). Commit `Check the shuttle valve in the browser`.

### Task 7: Kachel, Vorschau, README, CI, Doku

- `figur/kacheln.mjs`: `wechselventil` → `fertig`, `ordner: "Wechselventil"`, `marken` (Spec §3); `npm run bau:uebersicht`.
- `vorschau.svg` (Längsschnitt, Körper am einen Sitz, kräftig/blass, Stil der anderen Vorschauen).
- `README.md` der Figur nach Muster der Drosselseite: Was man tun kann, Farben, Zahlen, Neu erzeugen, Was die Figur nicht zeigt (alle Annahmen aus Spec §4, Quellen aus Spec §2, Hinweis „1/3" bei Festo Didactic).
- `package.json`, `tests.yml` (Geometrieschritt `pruef:wechsel`), `CLAUDE.md` (Nahttabelle `wechselventil.mjs`, Ausnahmen-Satz um das vierte Modell, Prüfkanon-Zeile mit der echten Prüfzahl), Haupt-`README.md`.
- `index.html` aufnehmen (`git add -f`, Zeile aus `.git/info/exclude` entfernen).
- [ ] Voller Neubau aller Seiten, `git diff --exit-code -- '*/index.html' index.html`; `npm test`; alle `pruef:*`; Browser aller sieben Seiten (neue ×5). Commit `Publish the shuttle valve`.
