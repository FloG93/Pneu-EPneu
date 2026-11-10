# Drosselrückschlagventil – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Bauteilseite `Drosselrueckschlagventil/` (Festo GRA-1/4-B als Vorbild, Lehrbuch-Innenaufbau mit Drosselnadel und Kugel-Rückschlagventil parallel) mit sichtbarem Luftstrom in beiden Richtungen, ausführlicher Legende, mitschaltendem Schaltzeichen und fertiger Kachel.

**Architecture:** Neues Rechenmodell `figur/stromventil.mjs`, neues Symbol in `figur/schaltzeichen.mjs`, dann das Bauteil nach dem Muster der Ventilseiten.

**Tech Stack:** Node ≥ 22 (`node --test`), ES-Module ohne Pakete, anatomy-Kit, Playwright `/opt/node-tools/node_modules/playwright/index.js`, Chromium `/opt/pw-browsers/chromium`.

**Spec:** `docs/superpowers/specs/2026-11-10-drosselrueckschlagventil-design.md`.

## Global Constraints

- Alles aus `CLAUDE.md` gilt (Naht, Festlegungen, Prüfkanon, Fallstricke 1–17). Vor jeder Figurarbeit `.claude/skills/anatomy/SKILL.md` + `references/kit.md` und `.claude/skills/azubi-visualisierung/references/zeichnen.md` lesen.
- Vorbild in Stil und Aufbau: `Wegeventil-3-2/` (Schnitt, Schnittton, Legende, Prüfmodul, README, Vorschau) und `Zylinder-Einfachwirkend/` (Feder mit `druckfeder`, Zerlegen).
- Einheiten: mm, bar, Normliter/min (l/min); Text sagt „l/min".
- Luft nur Blau aus `figur/luft.mjs` `FARBEN`; Text sagt „kräftiges/blasses Blau".
- Keine Schrift in der Zeichnung außer Nummern und „1", „2".
- Jede angezeigte Zahl aus dem Modell; Legenden- und README-Zahlen aus `GRA_1_4` (im Seitentest nachgerechnet).
- **Legendensätze ausführlich**: je 2–3 Sätze (was, wozu, worauf achten), verständlich für Azubis im ersten Jahr, kein Satz ohne Grundlage.
- Code-Kommentare Englisch; UI, Doku, Testnamen Deutsch; Commit-Betreff englisch im Imperativ, Commit endet mit den Attributionszeilen aus dem Brief. Keine Modellnamen in Commits oder Dateien.
- Laufzeit-Strings ohne Backticks; Top-Level-Namen eindeutig (Fallstrick 12).
- Geänderte Originale, die der Skill kopiert, nachziehen (`figur/tests/skill.test.mjs`).
- Nach **jedem** Task: `npm test` grün; alle `pruef:*` sauber; Browser der vier bestehenden Seiten nur nach Tasks, die gemeinsame Module ändern (Task 2, ggf. 5), sonst nach Task 7.
- `Drosselrueckschlagventil/index.html` erst in Task 7 committen (vorher in `.git/info/exclude`).
- Immer nur ein Build, Audit oder Browser gleichzeitig; Server über die PID beenden.
- Nach jedem Teilschritt committen. Nicht pushen; das macht der Controller.

## Review Focus

1. **Modell gegen Katalog:** 420 / 780 l/min, 360 l/min Rückschlagweg allein, 0 l/min bei zugedrehter Drossel in Drosselrichtung; Kugel nur in freier Richtung offen. → Task 1.
2. **Kugel und Nadel gezeichnet**, nicht nur im Modell: Lage folgt dem Zustand. → Task 5, 6.
3. **Luftstrom erklärt den Druckabfall:** vor der Drossel kräftig, dahinter blass. → Task 5.
4. **Ausführliche, richtige Texte** (Abluftdrosselung begründet). → Task 3, 5.

---

### Task 1: Rechenmodell `figur/stromventil.mjs`

**Files:** Create `figur/stromventil.mjs`, `figur/tests/stromventil.test.mjs`; `package.json` nur falls nötig (test:figur deckt `figur/tests` ab). Skill: nur wenn `skill.test` ein Paar verlangt.

**Produces:** wie Spec §4 (`GRA_1_4`, `drosselAnteil`, `kugelHub`, `durchfluss`, `neuerZustand`, `schritt`, `anzeige`). Jede Konstante mit Herkunft „Katalog"/„abgeleitet"/„Annahme" im Kommentar.

- [ ] Step 1 (RED): Tests, von Hand nachgerechnet: „Drossel ganz offen, 1 → 2: 420 l/min", „halb offen: 210 l/min", „zu: 0 l/min", „2 → 1 Drossel offen: 780 l/min", „2 → 1 Drossel zu: 360 l/min", „Kugel bleibt in Drosselrichtung zu", „Kugel öffnet erst über 0,1 bar", „Δp 0,5 bar halbiert den Durchfluss", „schritt: Kugel folgt in < 50 ms, Nadel folgt dem Regler ohne Sprung", „anzeige rundet auf ganze l/min". Fehlschlag notieren.
- [ ] Step 2 (GREEN): umsetzen. Commit `Add the flow-control valve model`.

### Task 2: Schaltzeichen

**Files:** Modify `figur/schaltzeichen.mjs`, `figur/tests/schaltzeichen.test.mjs`; Skill-Kopien.

- `drosselRueckschlagSymbol({ feld })` nach ISO 1219-1: einstellbare Drossel (zwei Bögen mit Schrägpfeil) und parallel Rückschlagventil (Kugel auf Sitz, mit Feder), Anschlusslinien 1 und 2; Wege als Elemente mit `data-weg="drossel"` / `"rueckschlag"`, damit die Laufzeit sie färben kann (Muster `SYMBOL_LAUFZEIT`).
- Tests: Pfade vorhanden, Schrägpfeil, Kugel als Kreis, Feder, beide `data-weg`, 5/2- und 3/2-Ausgabe byte-gleich.
- [ ] Browser 5/2 (90) und 3/2 (132) ×1. Commit `Draw the throttle check valve symbol`.

### Task 3: Geometrie in Ruhe + Legende

**Files:** Create `Drosselrueckschlagventil/tests/tools/build-drossel.mjs`, `legende-drossel.mjs`, `favicon.svg`; `.git/info/exclude` + `Drosselrueckschlagventil/index.html`.

- Wie Spec §5. Kamera und Leinwand nach `CLAUDE.md`; das Ventil füllt die Zeichnung (fitProjection), Schläuche kurz.
- `federPruefen` für die Kugelfeder bei vollem Kugelhub.
- `LEGENDE` ausführlich (Global Constraints), Reihenfolge = Zerlegen außen zuerst.
- [ ] `--audit` → `audit passed`; Linien `0 of N`; Screenshot (Scratchpad, deviceScaleFactor 1) hell. Commit `Draw the throttle check valve at rest`.

### Task 4: Zerlegen

- `MOVE`, `STAGGER`, `PIECE_OF` nach Messung (Snippet in `.claude/skills/explosionsfigur/SKILL.md`): Regulierschraube mit Kontermutter nach oben (Mutter zuerst), Verschlussschraube nach unten, dann Feder, dann Kugel; Verschraubungen und Schläuche seitlich; Befestigungsmutter nach oben vor der Schraube. Kleinste Baugruppe auf dem Bildschirm messen (≥ 30 px oder mitfahren mit eigener Nummer).
- [ ] `--apart` → `auseinandergefahren: sauber`; Screenshot zerlegt. Commit `Take the throttle check valve apart`.

### Task 5: Luft, Laufzeit, Bedienung, Seite

- Luftwege als 3D-Pfade: Hauptkanal mit Engstelle an der Nadel, Rückschlagkanal um die Kugel; Teilchendichte und -tempo aus `durchfluss`; Kammer vor der Drossel kräftig, dahinter blass (Spec §6).
- Nadel fährt mit dem Regler (Gewindesteigung aus dem Modell), Rändelkopf mit; Kugel hebt mit `kugelHub`, Feder staucht (Muster `data-federx` aus `figur/zylinderseite.mjs` – wenn wiederverwendbar, sonst bauteilfrei nach `figur/` ziehen, nicht kopieren).
- Bedienung: Richtungsschalter, Drosselregler (0–6 Umdrehungen, Start 3), Automatik. Anzeige wie Spec §2, Hinweis „bei 6 bar und 1 bar Druckunterschied (Normbedingung)".
- Begleitbild: Symbol aus Task 2, aktiver Weg gefärbt.
- Erklärtext (ausführlich, Spec §1): zwei Wege, Kugel, Rändelschraube, Abluft- vs. Zuluftdrosselung mit Begründung, alte Bezeichnungen, Verweis auf doppeltwirkenden Zylinder.
- `window.__figur` mit `stelle(richtung, umdrehungen)` und `modell()`.
- `tests/seite.test.mjs`: Zahlen aus dem Modell (420, 780, 360), Favicon, Legende vollständig, jeder Legendensatz ≥ 2 Sätze.
- [ ] Linien `0 of N`; Screenshots hell/dunkel in beiden Richtungen. Commit `Let air through the throttle check valve`.

### Task 6: Browserprüfung

**Files:** Create `Drosselrueckschlagventil/tests/tools/pruefe-drossel.mjs`; `package.json` (`test:drossel`, `bau:drossel`, `pruef:drossel`, `pruef:browser:drossel`).

- Prüft gemessen (Spec §7). RED-Probe: einen Fehler absichtlich einbauen (z. B. Kugel hebt auch in Drosselrichtung), Fehlschlag notieren, zurück.
- [ ] `all checks passed (N)` ×5; Commit `Check the throttle check valve in the browser`.

### Task 7: Kachel, Vorschau, README, CI, Doku

- `figur/kacheln.mjs`: `drosselrueckschlagventil` → `fertig`, `ordner`, `marken`; `npm run bau:uebersicht`.
- `vorschau.svg` (Schnitt, beide Kanäle, Kugel, Nadel, kräftig vor / blass hinter der Drossel).
- `README.md` der Figur nach Muster: Was man tun kann, Farben, Zahlen, Neu erzeugen, Was die Figur nicht zeigt (alle Annahmen aus Spec §3, Lehrbuch-Innenaufbau).
- `package.json` `test` + `test:drossel`; `tests.yml` Geometrieschritt; `CLAUDE.md` (Nahttabelle `stromventil.mjs`, Ausnahmen-Satz um das dritte Rechenmodell ergänzt, Prüfkanon-Zeile); Haupt-`README.md`.
- `index.html` aufnehmen (`git add -f`, Zeile aus `.git/info/exclude` entfernen).
- [ ] Voller Neubau aller Seiten, `git diff --exit-code -- '*/index.html' index.html`; `npm test`; alle `pruef:*`; Browser alle fünf Seiten (neue ×5). Commit `Publish the throttle check valve`.
