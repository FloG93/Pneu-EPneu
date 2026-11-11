# Werkzeuge für die nächsten Schnittseiten – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Die drei Investitionen aus `.claude/skills/azubi-visualisierung/references/schnittseite.md` bauen, damit die nächsten Ventile der Schnitt-Familie (Rückschlag-, Schnellentlüftungs-, Zweidruckventil) deutlich weniger kosten – bei **gleicher** Prüfstärke:
1. **Gemeinsamer Schnitt-Prüfer** – die bauteilfreien Browserprüfungen stehen einmal in `figur/`, die Seitenmodule enthalten nur Bauteilspezifisches.
2. **Seitengerüst-Generator** – `neue-schnittseite.mjs` legt eine **sofort baubare und prüfbare** neue Seite an.
3. **Ein Tor-Befehl** – `npm run gate -- <Ordner>` fährt alle Tore und gibt je Tor **eine** Zeile aus.

**Architecture:** Neue Dateien in `figur/tests/tools/` (Prüfer, Tor) und `.claude/skills/azubi-visualisierung/scripts/` (Generator); die Seiten `Drosselrueckschlagventil/` und `Wechselventil/` stellen auf den gemeinsamen Prüfer um. Keine Zeichnung ändert sich.

**Tech Stack:** Node ≥ 22, ES-Module, `node --test`, Playwright `import pw from "/opt/node-tools/node_modules/playwright/index.js"; const { chromium } = pw;`, Chromium `/opt/pw-browsers/chromium`.

## Global Constraints

- `CLAUDE.md` gilt (Naht, Prüfkanon, Fallstricke). Lies außerdem `.claude/skills/azubi-visualisierung/references/schnittseite.md` (Ablauf, Abnahmekriterien, Hebel) und `figur/tests/tools/pruefe-figur.mjs` (der bestehende gemeinsame Prüfer aller Seiten, 268 Zeilen).
- **Keine Zeichnung darf sich ändern:** alle `<svg>`-Blöcke aller sieben Seiten byte-gleich vor/nach (vorher sichern: Skript im Scratchpad, das alle `index.html` in `<svg>…</svg>`-Blöcke zerlegt und vergleicht; nach jedem Paket laufen lassen). Es darf sich nur eingebetteter Skript-/CSS-Text ändern, wenn nötig.
- **Prüfstärke darf nicht sinken.** Vor Paket A: je Seite die vollständige Liste der Prüfungsnamen (`ok`/`FEHLT`-Zeilen der Läufe in beiden Modi) in eine Datei im Scratchpad sichern. Nach der Umstellung muss jede alte Prüfung entweder in den gemeinsamen Prüfer gewandert sein (erscheint dort in beiden Seiten) oder in der Seite geblieben sein. Eine Tabelle „alte Prüfung → neuer Ort" im Bericht; **keine** wird gestrichen ohne Begründung. Jede in den gemeinsamen Prüfer verschobene Prüfung bekommt eine **RED-Probe an beiden Seiten** (Fehler absichtlich einbauen, Fehlschlag mit Zahl notieren, zurück).
- Wackelsicherheit: keine festen Wartezeiten (auf Zustand warten oder Bildpaare im selben `evaluate`), Zeitprüfungen mit Spielraum. Am Ende je Seite 8 Läufe ohne Ausfall, ein Lauf unter `taskset -c 0` mit `yes > /dev/null &` als Last.
- Code-Kommentare Englisch; Doku, Testnamen, Ausgaben Deutsch. Commit-Betreff englisch im Imperativ; jeder Commit endet nach Leerzeile mit genau diesen zwei Zeilen:
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01UzRMsA8PMV6oBLiCSKW6UT`
  Vor jedem Commit `git status` (keine verirrten Dateien im Wurzelordner). **Nicht pushen.** Nach jedem Teilschritt committen.
- Immer nur ein Build/Audit/Browser gleichzeitig (2 Kerne); Server `python3 -m http.server 8311 --bind 127.0.0.1` über die PID beenden.
- Wo `.claude/skills/azubi-visualisierung/vorlage/` Kopien von `figur/`-Dateien trägt (siehe `figur/tests/skill.test.mjs` `PAARE`), neue/geänderte Originale nachziehen und ins `PAARE` aufnehmen; neue Skripte des Skills im Skill-Test berücksichtigen.
- Am Ende: `npm test` grün; alle `pruef:*` sauber; Browserprüfung aller sieben Seiten mit unveränderten Zahlen **außer** den bewusst umgestellten Seiten (Zahl ändert sich, weil die gemeinsamen Prüfungen jetzt anders gezählt werden – melden); `git diff --exit-code -- '*/index.html' index.html` nach vollem Neubau.

---

### Paket A: Gemeinsamer Schnitt-Prüfer

**Files:** Create `figur/tests/tools/pruefe-schnitt.mjs` (und Hilfen), `figur/tests/pruefe-schnitt.test.mjs` (Schnittstelle, Importe); Modify `Drosselrueckschlagventil/tests/tools/pruefe-drossel.mjs`, `Wechselventil/tests/tools/pruefe-wechsel.mjs`, Skill-Kopie + `PAARE`.

- [ ] A1: Inventur. Beide Prüfmodule lesen; die Prüfungen in drei Gruppen einteilen: **bauteilfrei** (gleich oder fast gleich in beiden: z. B. Zeitlupe startet 1/10, Automatik läuft beim Laden, Anzeige bricht um und liegt bei 390 px im Fenster, Anzeige überlappt die Hinweiszeile nicht, alle Regler liegen bei 390 px im Fenster, Zerlegen beendet die Automatik und das bewegte Teil steht auf dem Ausgangsplatz, kein Teilchen über Material in Zuständen mit Strömung, Teilchenrichtung beim Füllen/Entlüften soweit parametrierbar, gemessener Kontrast zwischen 6-bar-Raum und 0-bar-Raum ≥ 2,4:1, Körper/Teil hebt sich vom kräftigen Raum ab, Erklärtext-Kontrast ≥ 4,5:1, Legendentexte ≥ 2 Sätze), **parametrierbar** (gleiche Logik, andere Selektoren/Zustände: über eine kleine Beschreibung der Seite), **bauteilspezifisch**. Tabelle im Bericht.
- [ ] A2: `schnittPruefungen({ seite, V, modus, beschreibung })` – `beschreibung` nennt die Selektoren und Zustände der Seite (Räume mit Zustand→Druck, Strömen, bewegtes Teil, Regler, Anzeige, Hinweis, Symbol), der Prüfer liefert die bauteilfreien Prüfungen. Die Seitenmodule rufen ihn auf und behalten nur das Spezifische. Schnittstelle im Kopfkommentar dokumentieren (was die Seite liefern muss, damit eine **neue** Seite den Prüfer ohne Änderung bekommt).
- [ ] A3: RED-Proben (siehe Constraints), Vorher/Nachher-Namenstabelle, 8 Läufe je Seite ohne Ausfall + 1 Lauf unter Last. Prüfmodule dürfen danach deutlich kürzer sein (Ziel: Seitenmodul ≤ 60 % der heutigen Zeilen); die **Gesamtprüfung je Seite bleibt gleich stark**.
- Commits: `Add the shared section-page checker`, `Switch the throttle check valve's browser module to it`, `Switch the shuttle valve's browser module to it`.

### Paket B: Seitengerüst-Generator

**Files:** Create `.claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs`, Vorlage-Dateien (wo nötig) unter `.claude/skills/azubi-visualisierung/vorlage-schnitt/`, `figur/tests/neue-schnittseite.test.mjs`; Modify `package.json` (`neu:schnittseite`), Skill-Doku.

- Aufruf: `node .claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs <Ordner> <id> "<Name>" [--rubrik sperr-und-stromventile]`, z. B. `Rueckschlagventil rueckschlagventil "Rückschlagventil"`.
- Ergebnis: eine **sofort baubare und prüfbare** neue Seite, abgeleitet vom Wechselventil (Bauskript, Legende, Prüfmodul auf Basis des gemeinsamen Prüfers, `tests/seite.test.mjs`, README-Gerüst, favicon), mit durchgängig umbenannten Bezeichnern, Platzhaltern `TODO(<id>)` an jeder Stelle, die bauteilspezifisch zu ersetzen ist (Modell `figur/<id>.mjs`-Stub mit der API-Form des Wechselventilmodells, Maße, Hohlräume, Teile, Legende, Texte, Schaltzeichen); `package.json`-Skripte (`test:`, `bau:`, `pruef:`, `pruef:browser:`), CI-Schritt in `.github/workflows/tests.yml`; Kachel-Eintrag in `figur/kacheln.mjs` bleibt **geplant**; `<Ordner>/index.html` wird in `.git/info/exclude` eingetragen (Fallstrick „erst committen, wenn vorzeigbar"). Überschreibt nichts Vorhandenes (bricht ab wie `anlegen.mjs`). Option `--entfernen` nimmt eine nur generierte, noch nicht veränderte Seite wieder weg.
- Die generierte Seite muss ohne weiteres Zutun bestehen: `--audit`, `--apart`, Linien, `npm test`, gemeinsamer Schnitt-Prüfer (die bauteilspezifischen Prüfungen der Kopie dürfen als `TODO`-markierte Platzhalterprüfungen bleiben, aber **nicht still grün**: sie prüfen den Platzhalterzustand und tragen `TODO` im Namen, damit sie beim Anpassen auffallen).
- Test `figur/tests/neue-schnittseite.test.mjs`: Generator in ein temporäres Verzeichnis (Kopie des Repos ohne `node_modules`/`.git`) laufen lassen, prüfen: Dateien vorhanden, keine ungesetzten Platzhalter außer `TODO(...)`, `build-… --audit` meldet `audit passed`, zweiter Lauf bricht ab. Dauer sinnvoll halten.
- [ ] B1 Generator + Vorlage + Test, B2 Probelauf im echten Repo mit Wegwerf-Seite (`ZZTest`), Gates fahren, danach per `--entfernen` zurückbauen; Repo danach sauber. Commits: `Add the section-page generator`, `Test the section-page generator`.

### Paket C: Ein Tor-Befehl

**Files:** Create `figur/tests/tools/gate.mjs`, `figur/tests/gate.test.mjs`; Modify `package.json` (`gate`, `gate:alle`), `CLAUDE.md` (Prüfkanon-Hinweis), Skill-Kopie.

- `npm run gate -- <Ordner> [--lauefe 5] [--wackel]`: erkennt per Namenskonvention `<Ordner>/tests/tools/build-*.mjs`, `pruefe-*.mjs`; fährt der Reihe nach: `npm test` (nur einmal je Aufruf), `--audit`, `--apart`, Linien (`lines.mjs`), Neubau + `git diff --exit-code` der Seite und der Übersicht, Server starten (Port 8311, PID merken und am Ende beenden), Browserprüfung × N (Standard 5), mit `--wackel` zusätzlich 8 Läufe und ein Lauf unter `taskset -c 0` + Last. Ausgabe: **eine Zeile je Tor** (`ok  audit passed`, `ok  browser 168 ×5`, `FEHLT … – Details: <Pfad>`), vollständige Ausgaben in eine Logdatei (Pfad am Ende), Exit-Code ≠ 0 bei Fehler; bricht beim ersten roten Tor ab (Option `--weiter`). `npm run gate:alle` fährt alle Seiten (Regression), Ausgabe als Tabelle Seite × Tor.
- Nutzt dieselben Befehle wie der Prüfkanon (keine zweite Wahrheit): Zahlen der Browserprüfung nicht fest einprogrammieren, sondern ausgeben; der Test vergleicht gegen die Zahl in `CLAUDE.md` nur als Warnzeile.
- `gate.test.mjs`: Befehlserkennung, Ausgabeformat, Abbruch bei rotem Tor (mit Attrappe), PID-Aufräumen.
- [ ] C1 Werkzeug + Test, C2 Probelauf `gate -- Wechselventil` und `gate:alle` (melden: Dauer, Zeilen im Kontext statt vorher), Kanon-Doku. Commit: `Add one gate command for every page`.

### Abschluss

- [ ] `.claude/skills/azubi-visualisierung/references/schnittseite.md`: „Hebel"-Abschnitt auf die gebauten Befehle umstellen (Aufrufe, was sie tun), `SKILL.md` Verweis; `CLAUDE.md` (Prüfkanon, neue Befehle, Generator); Skill-Test und `npm test` grün.
- [ ] Vollständiger Lauf: `gate:alle`. Bericht `report.md` im Ledger mit: Namenstabelle (Paket A), Zeilen vorher/nachher je Prüfmodul, Dauer des Gates, ehrliche Liste von Schwächen. Commit `Describe the new tools in the skill and the canon`.
