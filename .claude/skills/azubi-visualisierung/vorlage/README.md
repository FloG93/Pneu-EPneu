# {{TITEL}}

{{LEAD}}

**Online:** wird von [`pages.yml`](.github/workflows/pages.yml) bei jedem Push auf den Standard-Branch veröffentlicht, unter `https://<konto>.github.io/<repo>/`.

## Bauteile

| Rubrik | Bauteil | Was es zeigt |
| --- | --- | --- |
{{BAUTEILE}}

Die Übersichtsseite (`index.html`) wird aus `figur/kacheln.mjs` erzeugt: `npm run bau:uebersicht`.

## Aufbau

```
index.html                  Übersichtsseite (erzeugt)
figur/                      Gemeinsames Gerüst aller Figuren, kennt kein Bauteil
  kacheln.mjs               Rubriken und Kacheln der Übersicht
  explode.mjs               Zerlegen: Wege, Federn, Tiefensortierung
  legende.mjs               Legende, Nummern, Erklärzeile
  luft.mjs                  Medienschicht: Wege, Partikel, Kammerfüllung, die zwei Töne
  schnitt.mjs               Schnittfenster in Drehteilen
  seite.mjs                 Karte, Bedienleiste, Hell/Dunkel, Kontrast
  toene.mjs                 Grautöne und Kontraststufen
shared/                     Kontrastregler der Übersicht
.claude/skills/             anatomy (Zeichen-Kit) und azubi-visualisierung (Vorgehen)
.github/workflows/          Tests und Veröffentlichung
```

## Lokal starten und testen

```bash
python3 -m http.server 8080   # oder: npm start
```

```bash
npm test
```
