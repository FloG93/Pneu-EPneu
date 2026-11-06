# Die Figur zeichnen

Grundlage ist das Kit des Skills **anatomy** (`kit.md` dort lesen: Kamera, Körper, `lathe` für Drehteile, `tube` für Leitungen, Audit). Hier steht nur, was für Lernfiguren dazukommt. Das ausgearbeitete Beispiel: `beispiel/zylinder-doppeltwirkend/build-zylinder.mjs`.

## Aufbau eines Bauskripts

```
Maße (Konstanten mit Kommentar, Katalog oder Annahme)
Rahmen (G.frameOf) und Projektion (k.fitProjection mit allen Extrempunkten, Azimut 38°, Höhe 34°)
Baugruppen: PIECE_OF, STAGGER (außen zuerst), MOVE (Weg je Baugruppe in mm)
Körper je Baugruppe → R.put / R.solid / R.route
A.settle(R, P)  → Tiefenschlüssel
Korrekturen, die der Löser nicht wissen kann (Schnitt, Medium)
EX.vorbereiten(R, P, MOVE, W, H)  → KEYS, LIFT, VIEW0, VIEW1, MITTE
Medienwege: LU.bahn(punkte3, P, k.iso)
seite({...}) mit LEG.knoepfe(LEGENDE), EX.LAUFZEIT, LU.LAUFZEIT, eigener Laufzeit
--apart und --audit am Ende
```

Leinwand: 900×800 ist der Normalfall; für lange Bauteile mit Gerät daneben breiter (Zylinder: 1160×660). Das Seitenverhältnis wird in `VIEW1` festgenagelt.

## Schnitt durch Drehteile

Das Kit dreht nur volle Körper und kennt keine Teilkreise; `prismOf` ist nur konvex. Der Schnitt entsteht deshalb als **Fenster**: `SCH.fenster(rahmen, s0, s1, rAussen, rInnen, a0, a1, P, {name})` liefert Clip-Pfad, Schnittkanten, sichtbare Bohrung und Saum.

- Fensterwinkel um `SCH.naechsterWinkel(rahmen, P)` legen (Zylinder: −1,52 … +1,10 rad).
- **Zwei Gruppen ineinander**: außen statisch `<g data-clip clip-path>`, innen `<g data-hub transform>`. Sonst wandert das Fenster mit dem Kolben.
- Schnittkanten **ohne** Clip zeichnen, sonst schneidet das Fenster seine eigenen Kanten ab.
- Das Rohr hinter alle geclippten Teile sortieren (der Löser hat recht, dass die ungeschnittene Wand vorn liegt) und das Paar im Audit erlauben.
- Teile, die über den Schnitt laufen (obere Zuganker), über dem Fenster kappen.
- Flächen: `iso-shade`/`iso-top` je nach Neigung – `iso-face` gibt es nicht.

## Leitungen

- `schlauch(p0, aus, p1, ein, k0, k1)`: kurzes **gerades** Stück aus dem Anschluss heraus und hinein, dazwischen eine Hermite-Kurve. Kein Knick enger als der Schlauch dick ist.
- Winkelstücke an Geräteanschlüssen, damit der Schlauch nicht hochkant aus dem Gerät kommt.
- Abluft nach unten durch den Sockel, nicht durch Schalldämpfer oder Nachbarteile.
- Lage des Geräts **messen statt schätzen**: Positionen durchprobieren und die nehmen, bei der Audit und Linienenden sauber sind (das Ventil wanderte so von VY 92 auf 112).
- `R.route(…, { free: [true, true] })` – beim Zerlegen werden beide Enden frei.

## Medium in der Figur

- Medienwege als 3D-Punktlisten; `LU.bahn` projiziert sie einmal, die Laufzeit setzt Partikel nach Länge darauf.
- Die Kammerfüllung hängt als eigenes Element zwischen Rohr-Rückwand und Kolben (`LUFT_KEY` = kleinster Schlüssel der geclippten Teile − 0,2) und im selben Fenster-Clip.
- Partikel blenden an Weganfang und -ende ein und aus; Stärke 0 bei Stillstand, damit nichts blinkt.

## Zerlegen

- Wege entlang der Maschinenachsen, so weit, dass nichts durch etwas fährt (`--apart`).
- Last, die an der Stange hängt, fährt mit ihr (`A.disc` an der Stangenfläche statt eines Schlittens auf Abstand).
- Winzige Teile (< ~30 px) fahren mit der Nachbarin, behalten aber ihre Nummer.
- Clip der inneren Gruppen beim Zerlegen abschalten (`explode.mjs` macht das), Hub vorher auf 0.

## Audit lesen

`A.auditOrExit(R, P, { allow, crowd, cover })`:

| Liste | wofür | Beispiel |
|---|---|---|
| `allow` | Paare, bei denen keine Zeichenreihenfolge „richtig" ist oder der Schnitt den Löser bewusst überstimmt | Stange durch Deckel, Rohrwand gegen Kolben |
| `crowd` | Stellen, an denen sich Teile berühren sollen | Schlauchende im Anschluss |
| `cover` | geclippte Teile, deren Markup größer ist als das Sichtbare | Kolbenstange innen und außen |

Jeder Eintrag bekommt einen Kommentar, **warum**. Ein Eintrag, um eine Meldung loszuwerden, ist ein versteckter Fehler. Versunkene Paare löst man an der Geometrie (Ringe statt Vollkörper, Zuganker enden an der Deckelfläche, Gehäuse als zwei Platten um die Bohrung).

## Die Seite

- `seite({ titel, … })` aus `figur/seite.mjs` liefert Karte, Bedienleiste, Startskript und `<link rel="icon" href="favicon.svg">` – das Bauteil legt **`favicon.svg`** und **`vorschau.svg`** (Kachelbild 240×135 mit den Klassen `v-wand`, `v-teil`, `v-leitung`, `v-hilfslinie`, `v-stark`, `v-blass`) in seinen Ordner.
- Die Anzeige steht schon im erzeugten HTML (ohne JavaScript nicht leer).
- `window.__figur = { offen(), zerlegt(), stelle(…), … }` als Prüfhaken – der Browsertest setzt Zustände, statt auf den richtigen Moment zu hoffen.
- Erklärtext (`LESETEXT`) in ganzen deutschen Sätzen: was man sieht, warum es so ist, was man ausprobieren kann.
