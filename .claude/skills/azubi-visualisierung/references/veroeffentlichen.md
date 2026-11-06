# Veröffentlichen

GitHub Pages über Actions, ohne Build-Schritt. `pages.yml` aus der Vorlage:

- läuft bei jedem Push, veröffentlicht aber nur vom **Standard-Branch**;
- **schaltet Pages selbst ein** (`POST repos/{repo}/pages` mit `build_type=workflow`; das Token des Workflows hat `pages: write`). Klappt das nicht, bleibt der Lauf grün und nennt den Weg: Settings → Pages → Source „GitHub Actions";
- veröffentlicht `index.html`, `shared/` (ohne Tests und README) und **jeden Ordner mit einer `index.html`** (ohne `tests/`, `docs/`, `README.md`). `figur/` und `docs/` haben keine `index.html` und erscheinen nie.

## Fertig heißt live und geprüft

1. Push auf den Standard-Branch. Bei einem leeren Repo ist der erste gepushte Branch der Standard-Branch – dann gibt es nichts zu mergen.
2. Workflow-Lauf ansehen: **alle** Schritte ausgeführt, nicht übersprungen. Ein grüner Lauf mit übersprungenen Schritten hat nichts veröffentlicht.
3. `https://<konto>.github.io/<repo>/` und `/<Ordner>/` liefern HTTP 200, `shared/css/kontrast.css` auch (relative Pfade stimmen).
4. Browsertest gegen die Live-Adresse: `all checks passed`.

Erst dann dem Nutzer „live" melden – mit den Adressen.

## Regeln

- `index.html` eines Bauteils erst committen, wenn die Seite vorzeigbar ist: sie geht beim Push sofort live.
- Keine Pull Requests, kein Branchwechsel ohne ausdrücklichen Auftrag.
- Nur relative Pfade; die Seite läuft lokal (`python3 -m http.server`) genauso wie auf Pages.
