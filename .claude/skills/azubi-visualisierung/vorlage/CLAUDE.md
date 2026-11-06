# CLAUDE.md

Lernseite für Auszubildende: {{TITEL}} – Bauteile als interaktive isometrische Figuren. Übersicht und Aufbau: `README.md`.

**Vor jeder Arbeit lesen:** `.claude/skills/azubi-visualisierung/SKILL.md`. Dort stehen Ablauf, Festlegungen, Prüfkanon und Fallstricke; was dort festgelegt ist, wird nicht erneut erfragt.

## Regeln, die überall gelten

- Reines HTML/CSS/JavaScript (ES-Module), **kein Build-Schritt, keine npm-Pakete im Repo**. Hilfsprogramme (Playwright) nur in `*/tests/tools/` und außerhalb des Repos installiert. Ausgenommen ist `.claude/skills/`: Agent Skills, kein Code der Seite — wird weder veröffentlicht noch getestet.
- Code-Kommentare auf **Englisch**, Dokumentation, README und Oberfläche auf **Deutsch**. Commit-Betreff englisch im Imperativ.
- Nur relative Pfade (läuft lokal mit `python3 -m http.server` und auf GitHub Pages).
- Jeder Ordner mit einer `index.html` wird von `pages.yml` veröffentlicht: **`index.html` erst anlegen, wenn die Seite vorzeigbar ist.** `figur/` und `docs/` haben bewusst keine.
- Browser-Speicher: Hell/Dunkel und Kontrast stehen in `3d-druck.theme` und `3d-druck.kontrast` — gemeinsam mit allen Seiten, die `shared/` benutzen. Alles Eigene beginnt mit `{{PAKET}}.`
- Tests: `npm test` (Node ≥ 22, `node --test`), dazu je Bauteil `npm run pruef:<bauteil>` für die Geometrie. Vor jedem Commit laufen lassen.

## Die Naht

`figur/` kennt **kein einziges Bauteil**. Ein Bauteil liefert **nur** Geometrie und vier Datentabellen (`MOVE`, `STAGGER`, `PIECE_OF`, `LEGENDE`), bei beweglichen Bauteilen dazu die Medienwege und das Rechenmodell, das sie treibt. **`build-<bauteil>.mjs` darf keine Zeile Federmathematik, Sortierung oder Seitengerüst enthalten.**

## Medium

{{MEDIUM_ABSATZ}}

## Festlegungen dieses Projekts

{{FESTLEGUNGEN}}
