# Rückschlagventil

TODO(rueckschlagventil): Ein Satz, was die Figur zeigt, und die Quelle (Datenblatt, Schnittbild, Schaltzeichen) mit Teilenummer.

## Wie das Bauteil gebaut ist

TODO(rueckschlagventil): Die Baugruppen der Legende, Werkstoffe, Anschlüsse. Belegt, abgeleitet und angenommen getrennt nennen.

## Was die Figur zeigt

TODO(rueckschlagventil): Bedienung (Regler, Automatik, Zeitlupe, Zerlegen), die Farben (kräftiges Blau = unter Druck, blasses Blau = drucklos), das Schaltzeichen.

## Was die Figur nicht zeigt

TODO(rueckschlagventil): Jedes Maß, das nicht aus Katalog oder Norm stammt, steht hier als Annahme; ebenso Überhöhungen (Hub, Spalt).

## Prüfen

```sh
npm run test:rueckschlagventil            # nur die Tests dieser Seite
npm run bau:rueckschlagventil             # erzeugt Rueckschlagventil/index.html neu
npm run pruef:rueckschlagventil           # Geometrie in Ruhe und zerlegt
npm run pruef:browser:rueckschlagventil   # Browserprüfung, Server auf Port 8311 nötig
npm run gate -- Rueckschlagventil     # alle Tore auf einmal, eine Zeile je Tor
```

## Dateien

```
Rueckschlagventil/
  tests/tools/build-rueckschlagventil.mjs     Geometrie + vier Datentabellen
  tests/tools/legende-rueckschlagventil.mjs   Legende
  tests/tools/pruefe-rueckschlagventil.mjs    nur Bauteilspezifisches der Browserprüfung (das Gemeinsame: figur/tests/tools/pruefe-schnitt.mjs)
  tests/seite.test.mjs            Tests der gebauten Seite
figur/rueckschlagventil.mjs                   Rechenmodell
figur/tests/rueckschlagventil.test.mjs        Tests des Modells
```

## Noch zu tun (vor der Veröffentlichung)

- [ ] Quellenkarte: Schnittbild, Datenblatt, Schaltzeichen angesehen (references/schnittseite.md, Phase 0)
- [ ] Alle `TODO(rueckschlagventil)` ersetzt: `grep -rn "TODO(rueckschlagventil)" Rueckschlagventil figur`
- [ ] Schaltzeichen des Bauteils in `figur/schaltzeichen.mjs` (Test dort)
- [ ] Kachel in `figur/kacheln.mjs` auf `fertig` mit `ordner: "Rueckschlagventil"`, Übersicht neu bauen
- [ ] Wurzel-`README.md` und `CLAUDE.md` (Prüfkanon, Zahl der Browserprüfung) ergänzen
- [ ] `Rueckschlagventil/.generiert.json` löschen (die Marke des Generators), `git add -f Rueckschlagventil/index.html`
