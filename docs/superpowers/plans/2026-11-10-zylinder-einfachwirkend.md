# Einfachwirkender Zylinder – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Bauteilseite `Zylinder-Einfachwirkend/` (Rundzylinder nach Festo ESNU-50-25-P-A, Feder im Stangenraum, Entlüftungsfilter, angesteuert von einem 3/2-NC-Ventil mit Taster) mit Modell aus `figur/pneumatik.mjs`, fertiger Kachel unter Aktoren.

**Architecture:** Zuerst wandert, was der zweite Zylinder mit dem ersten teilt, nach `figur/` (`zylinderteile.mjs`, `zylinderseite.mjs`), und `pneumatik.mjs` lernt die Feder als Option. Dann folgt das Bauteil nach dem Muster `Zylinder-Doppeltwirkend/`.

**Tech Stack:** Node ≥ 22 (`node --test`), ES-Module ohne Pakete, anatomy-Kit, Playwright `/opt/node-tools/node_modules/playwright/index.js`, Chromium `/opt/pw-browsers/chromium`.

**Spec:** `docs/superpowers/specs/2026-11-10-zylinder-einfachwirkend-design.md`.

## Global Constraints

- Alles aus `CLAUDE.md` gilt (Naht, Festlegungen, Prüfkanon, Fallstricke 1–17). Vor jeder Figurarbeit `.claude/skills/anatomy/SKILL.md` + `references/kit.md` und `.claude/skills/azubi-visualisierung/references/zeichnen.md` lesen.
- Vorbild in Aufbau und Stil ist `Zylinder-Doppeltwirkend/` (Bauskript, Legende, Prüfmodul, README, Vorschau, Kamera, Schiene, Ventil auf Grundplatte).
- Einheiten wie `pneumatik.mjs` (mm, N, s, kg, bar absolut, Umgebung 1).
- Luft nur Blau aus `figur/luft.mjs` `FARBEN`; Text sagt „kräftiges/blasses Blau".
- Keine Schrift in der Zeichnung außer Nummern und 1, 2, 3.
- Jede angezeigte Zahl aus dem Modell; Legenden- und README-Zahlen aus `ESNU_50_25` (im Seitentest nachgerechnet).
- Code-Kommentare Englisch; UI, Doku, Testnamen Deutsch; Commit-Betreff englisch im Imperativ, Commit endet mit den Attributionszeilen, die der Controller im Brief mitgibt. Keine Modellnamen in Commits oder Dateien.
- Laufzeit-Strings ohne Backticks; Top-Level-Namen eindeutig über alles, was zusammen eingebettet wird (Fallstrick 12).
- Jede geänderte Datei, die der Skill kopiert, wird nachgezogen (`figur/tests/skill.test.mjs` nennt sie); neue `figur/`-Module bekommen Kopie + Paar.
- Nach **jedem** Task: `npm test` grün; `npm run pruef:zylinder`, `pruef:ventil`, `pruef:ventil32` sauber; Browser Zylinder `(50)`, 5/2 `(90)`, 3/2 `(132)` je ×1 (ab Task 6 zusätzlich das neue Bauteil).
- `Zylinder-Einfachwirkend/index.html` wird erst in Task 7 committet (vorher in `.git/info/exclude`, in Task 7 `git add -f` und Zeile entfernen).
- Immer nur ein Build, Audit oder Browser gleichzeitig; Server `python3 -m http.server 8311 --bind 127.0.0.1` über die PID beenden.
- Nach jedem Teilschritt committen (Container können neu starten). Nicht pushen; das macht der Controller.

## Review Focus

1. **Doppeltwirkend nach dem Umbau:** Zeichnung byte-gleich, Modell bitgleich, 50/50. → Task 1, 2.
2. **Federmodell gegen den Katalog:** F_aus(6 bar) = 1072,8 N, Feder 82 / 105,3 N, Federraum nie über Umgebung. → Task 1.
3. **Taster halten/wegziehen, Zerlegen während des Haltens:** Signal endet, Feder fährt zurück, Automatik stoppt. → Task 5, 6.
4. **Federwendel bei vollem Hub** nicht unter Blocklänge; Feder zeichnet sich mit dem Kolben (gestaucht), nicht nur verschoben. → Task 3, 5.

---

### Task 1: Feder im Rechenmodell

**Files:** Modify `figur/pneumatik.mjs`, `figur/tests/pneumatik.test.mjs`; Skill-Kopien `beispiel/zylinder-doppeltwirkend/pneumatik.mjs` und `pneumatik.test.mjs`.

**Produces:**
- `export const ESNU_50_25` (Werte und Herkunft wie Spec §3, je Zeile Kommentar „Katalog"/„abgeleitet"/„Annahme"): `bohrung 50, stange 20, hub 25, totraum, schlauch, daempfung 0, masse 2.5, reibung, viskos, leitwerte, schaltzeit, ueberdeckung, einfach: true, feder: { vorspannung: 82, rate: 0.932 }`. Leitwerte so stellen, dass ein Hub in Echtzeit 0,05–0,15 s dauert und der Rückhub merklich langsamer ist als der Vorhub; im Kommentar begründen.
- `federKraft(z, masse)` (0 ohne `feder`), `kraftNetto` zieht sie ab; mit `einfach` bleibt `pB` = `UMGEBUNG` und es gibt nur `aZu` (Stellung ausfahren) und `aAb` (einfahren). `kraftAus` = p·A − Feder bei Hub; `kraftEin` = Vorspannung bei `einfach`. `ruht`/`steht` für `einfach` sinnvoll. `anzeige` + `federJetzt`, `federAus`, `federEin`.
- Ohne `einfach`/`feder` **bitgleich** wie bisher.

- [ ] Step 1 (RED): Tests „F aus bei 6 bar ist der Katalogwert 1072,8 N (±0,2)", „bei 3 bar 484 N", „Federkraft 82 N eingefahren, 105,3 N ausgefahren", „Federraum bleibt über einen ganzen Zyklus auf Umgebung", „Taster los: Kolben kehrt ohne Druck in A auf 0 zurück", „Rückhub langsamer als Vorhub", „bei 0,5 bar fährt er nicht aus" (p·A < Feder + Reibung), „doppeltwirkend unverändert" (bestehende Tests). Laufen lassen, Fehlschlag notieren.
- [ ] Step 2 (GREEN): umsetzen; alle Tests grün; Zylinder-Seite neu gebaut → `git diff --stat Zylinder-Doppeltwirkend/index.html` zeigt höchstens das eingebettete Modell (Zeichnung gleich), Browser 50.
- [ ] Step 3: Skill-Kopien; Commit `Teach the cylinder model a return spring`.

### Task 2: Zylinder-Familie nach `figur/`

**Files:** Create `figur/zylinderteile.mjs`, `figur/zylinderseite.mjs`, `figur/tests/zylinderteile.test.mjs`; Modify `Zylinder-Doppeltwirkend/tests/tools/build-zylinder.mjs`, `CLAUDE.md` (Nahttabelle + Ausnahme „Zylinder-Familie"), Skill (`vorlage/figur/…`, `beispiel/…/build-zylinder.mjs`, Paare).

**Produces:**
- `zylinderteile.mjs` (Fabrik wie `gehaeuse.mjs`: nimmt `P`, `rec`, `put`, Gruppensetzer; kein globaler Zustand): Grundplatte/Schiene, Lastschlitten, das vereinfachte Ventil auf Grundplatte **parametriert** über `{ x, y, z, halbbreite, anschluesse: { nr: x }, oben: [...], unten: [...], winkel, scheiben: [x...], schieberWeg }` (5/2 und 3/2), Schlauchverlauf Ventil→Zylinder. Was nur der doppeltwirkende kennt (Zuganker, Drosseln, Deckel) bleibt im Bauskript.
- `zylinderseite.mjs`: die Laufzeit-Bausteine beider Zylinderseiten als Text (wie `ventilseite.mjs`): Teile entlang der Achse verschieben, Kammerfüllung nach Druck, Teilchen nach Leitwert, Automatik-Takt, `window.__figur`-Grundstock (`stelle`, Zustand). Schnittstelle über Parameter/Rückrufe; der Implementer wählt Namen und dokumentiert sie im Kopf.
- Test: „Ventil 3/2 und 5/2 erzeugen je Anschluss einen Stutzen", „Laufzeit ist gültiges Skript".

- [ ] Step 1: Stand sichern: `npm run bau:zylinder` und die `<svg …>`-Zeichnung aus `Zylinder-Doppeltwirkend/index.html` nach `/tmp/…/vorher.svg` (Scratchpad) ziehen.
- [ ] Step 2 (RED→GREEN): Test, verschieben, Bauskript benutzt die Module. Zeichnung **byte-gleich** zu `vorher.svg`; `pruef:zylinder`, Linien `0 of N` wie vorher, Browser 50 ×2.
- [ ] Step 3: CLAUDE.md, Skill-Kopien und Paare, `skill.test` grün. Commit `Move the rail, the sub-base valve and the cylinder runtime into figur/`.

### Task 3: Geometrie in Ruhe + Legende

**Files:** Create `Zylinder-Einfachwirkend/tests/tools/build-zylinder-ew.mjs`, `legende-zylinder-ew.mjs`, `favicon.svg` (Kopie des Zylinder-Favicons, angepasst: Feder angedeutet); `.git/info/exclude` + `Zylinder-Einfachwirkend/index.html`.

- Kamera, Leinwand, `W/H`, Schiene, Last wie doppeltwirkend; Zylinder Ø 50 (Rohr Ø 50 + Wand), Boden/Kopf rund (Rundzylinder: Deckel wenig größer als das Rohr, mit Fußwinkeln), Kopf mit Hals, Stangendichtung, Entlüftungsbohrung + Sinterfilter (Normteil Schalldämpfer klein), Stange mit M16-Gewinde zum Schlitten, Kolben mit Dichtung und elastischer Scheibe, **Druckfeder um die Stange** zwischen Kolben und Kopf (`figur/normteile.mjs`, `federPruefen` bei vollem Hub), Schnittfenster wie doppeltwirkend.
- 3/2-NC-Ventil über `zylinderteile.mjs` (Anschlüsse 1, 2 oben, 3 nach unten mit Schalldämpfer; Taster rechts, Rückstellfeder links), Schlauch 2→Boden, Zuleitung an 1.
- `LEGENDE` 11 Einträge wie Spec §5, Sätze aus Spec §1 abgeleitet, Zahlen aus `ESNU_50_25` (82 N, 105 N, 1073 N).
- [ ] `--audit` → `audit passed`; Linien `0 of N`. Commit `Draw the single-acting cylinder at rest`.

### Task 4: Zerlegen

- `MOVE`, `STAGGER`, `PIECE_OF` nach Messung (Snippet in `.claude/skills/explosionsfigur/SKILL.md` „Achsen und Tiefen messen"); Feder fährt entlang der Achse heraus (nach dem Kopf, vor der Stange). Nummern an eigenen Teilen.
- [ ] `--apart` → `auseinandergefahren: sauber`. Commit `Take the single-acting cylinder apart along its axis`.

### Task 5: Luft, Laufzeit, Bedienung, Seite

- Luftwege (Spec §6) als 3D-Pfade; Federraum dauerhaft blass, Kammer A nach Druck; Filter-Teilchen je Kolbengeschwindigkeit hinaus/herein.
- Feder **staucht** sich mit dem Weg (Wendel je Bild neu oder Skalierung entlang der Achse – Endwindungen bleiben an Kolben und Kopf).
- Bedienung: **Taster halten** über `figur/bedienung.mjs`, Automatik, Druck 2–8 bar, Zeitlupe (Start an, Faktor wie Ventilseiten). Anzeige `F aus … N = p · A − Feder · Feder jetzt … N · Hub … mm`, Hinweis auf 3–10 % Reibung.
- Begleitbild (`beiFigur`): Schaltzeichen Zylinder einfachwirkend mit Federrückstellung + 3/2 NC (statisch, aus `figur/schaltzeichen.mjs` wo möglich; Zylinderzeichen als neue bauteilfreie Funktion dort, mit Test).
- Erklärtext unter der Figur (Spec §1, kräftig/blass, Verweis auf doppeltwirkenden Zylinder und 3/2-Ventil, alte Bezeichnungen P/A/R einmal).
- `window.__figur` mit `stelle(prozent, stellung)` wie doppeltwirkend.
- `tests/seite.test.mjs`: Seite enthält Zahlen aus dem Modell (1073, 82, 105), Favicon, Legende 11.
- [ ] Linien `0 of N`; Seite im Browser von Hand angesehen (Screenshot im Scratchpad, beide Modi). Commit `Let air and the spring move the single-acting cylinder`.

### Task 6: Browserprüfung

**Files:** Create `Zylinder-Einfachwirkend/tests/tools/pruefe-zylinder-ew.mjs`; `package.json` (`test:zylinder-ew`, `bau:`, `pruef:zylinder-ew`, `pruef:browser:zylinder-ew`).

- Prüft (gemessen, nicht Klasse): Taster gehalten → Kammer A kräftiger als Federraum, Weg steigt; losgelassen → Weg 0 und A auf Umgebungston; Federraum zu jedem Zeitpunkt blass; Anzeige 6 bar `1073 N`, 3 bar `484 N`; Feder jetzt 82 N bei 0 und 105 N bei Hub; Taster halten + Zerlegen → Signal endet, nach dem Zusammenbau eingefahren; Automatik stoppt beim Zerlegen.
- [ ] Neue RED-Probe: eine Prüfung gegen einen absichtlich eingebauten Fehler laufen lassen und Fehlschlag notieren, Fehler zurück.
- [ ] `all checks passed (N)` ×5 hintereinander; die drei anderen Seiten ×1. Commit `Check the single-acting cylinder in the browser`.

### Task 7: Kachel, Vorschau, README, CI, Doku

- `figur/kacheln.mjs`: `zylinder-einfachwirkend` → `fertig`, `ordner`, `marken` (Spec §2); `npm run bau:uebersicht`.
- `vorschau.svg` (Schnitt ausgefahren, Feder gestaucht, kräftige Kammer; Stil wie die anderen Vorschauen).
- `README.md` der Figur nach Muster doppeltwirkend: Was man tun kann, Farben, Zahlen (Rechnung 1178 − 105 = 1073 N), Neu erzeugen, Was die Figur nicht zeigt (Annahmen aus Spec §3, eingerollte Deckel).
- `tests.yml`: Geometrieschritt `pruef:zylinder-ew`; `test` in `package.json` um `test:zylinder-ew` erweitern.
- `CLAUDE.md` Prüfkanon-Zeile, Haupt-`README.md` Bauteilliste.
- `index.html` aufnehmen (`git add -f`, Zeile aus `.git/info/exclude`).
- [ ] `npm test`, alle `pruef:*`, Browser alle vier Seiten. Commit `Publish the single-acting cylinder`.
