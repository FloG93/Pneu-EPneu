# Pneumatik-Bauteilsammlung – Entwurf

**Stand:** 2026-11-02 · **Zustand:** zur Durchsicht

Eine Lernseite für Auszubildende, die über die Zeit zu einer Sammlung erklärter
Pneumatik-Bauteile wächst. Den Anfang macht ein doppeltwirkender Zylinder nach
ISO 15552 zusammen mit dem 5/2-Wegeventil, das ihn umschaltet – als
interaktive isometrische Schnittfigur, in der die Druckluft sichtbar strömt.

---

## 1 Ziel und Zielgruppe

**Wer.** Auszubildende in Metall- und Elektroberufen, die Pneumatik lernen.
Vorkenntnisse: Grundrechnen, erste Begegnung mit Druck und Kraft. Kein
Fachwissen über Dichtungen, Normen oder Schaltpläne.

**Was sie danach können sollen.**

1. Die Teile eines doppeltwirkenden Zylinders benennen und sagen, wozu jedes da ist.
2. Erklären, warum er in **beide** Richtungen Kraft erzeugt – anders als ein
   einfachwirkender mit Federrückstellung.
3. Den Weg der Druckluft nachvollziehen: woher sie kommt, wohin sie geht und
   warum eine Kammer immer entlüftet werden muss, bevor sich etwas bewegt.
4. F = p · A ausrechnen und begründen, warum die **Einfahrkraft kleiner** ist
   als die Ausfahrkraft.
5. Sagen, was die Endlagendämpfung tut und warum es sie braucht.

**Wo es benutzt wird.** Im Unterrichtsraum am Beamer (heller Raum, deshalb ist
Hell der Startzustand und der Kontrast einstellbar), auf Schullaptops und auf
dem Telefon zum Nachschlagen. Kein Login, keine Installation, reine Webseite.

**Woran wir merken, dass es stimmt.** Eine Ausbilderin kann die Seite ohne
Erklärung öffnen und damit unterrichten; ein Azubi kann den Luftweg an der
Figur nachfahren und die beiden Kräfte selbst ausrechnen und mit der Anzeige
vergleichen.

### Was ausdrücklich **nicht** dazugehört

- Kein Schaltplan-Editor, kein Simulator ganzer Steuerungen (FluidSIM o. Ä.).
- Keine Dimensionierung realer Anlagen; die Zahlen sind Lehrbeispiele.
- Keine Benutzerkonten, kein Fortschritt, keine Auswertung.
- Übungsaufgaben mit Lösungen sind **nicht** Teil dieses Entwurfs (bewusst
  abgewählt); jede Bauteilseite bekommt Figur und Erklärtext.

---

## 2 Entscheidungen, die schon gefallen sind

Aus der Abstimmung vom 2026-11-02. Diese Punkte sind **nicht erneut zu erfragen**.

| Thema | Festlegung |
|---|---|
| Erste Figur | Zylinder **und** 5/2-Wegeventil zusammen, beide im Schnitt, durch zwei Schläuche verbunden |
| Explosion | Ja, zusätzlich zum Luftfluss: Knopf „Zerlegen und zusammenbauen“ wie bei der Drucker-Figur in `3D-Druck/Anatomie/` |
| Bedienung | Taster am Ventil schaltet um; dazu ein Automatik-Knopf, der den Zyklus von selbst laufen lässt |
| Anzeige | Druck (Schieber 2–8 bar, Start 6) sowie F = p · A getrennt für Ausfahren und Einfahren |
| Bauform | ISO 15552, Ø 50 mm, Hub 200 mm, mit Zugankern (die Bauform aus dem ersten Vorlagenbild) |
| Rubriken | Aktoren · Wegeventile · Sperr- und Stromventile · E-Pneumatik (vierte Rubrik angelegt, Inhalte später) |
| Schaltzeichen | Platz auf jeder Kachel vorgesehen, gezeichnet wird im **zweiten** Durchgang |
| Gemeinsamer Code | `shared/` aus `3D-Druck` kopiert; `3d-druck.theme` und `3d-druck.kontrast` bleiben gemeinsam, Eigenes beginnt mit `pneumatik.` |
| Seiteninhalt | Figur plus Erklärtext in Azubi-Sprache, keine Übungsaufgaben |
| Architektur | Gerüst von Anfang an als Modul (`figur/`), nicht je Figur kopiert |

Vom Figuren-Stil (`explosionsfigur`-Rezept) wird **eine** Vorgabe bewusst
gebrochen: dort heißt es „keine Farbe außer Hausorange“. Hier ist die Luft das
Thema, also bekommt sie Farbe. Orange bleibt der Hervorhebung gewidmet
(gewählte Baugruppe), Blau gehört ausschließlich der Luft. Alles andere –
Knopf, Richtung, Reihenfolge, Tempo, Hell/Dunkel, Kontrast, 4,5:1, Nummern in
Bildschirmpixeln – gilt unverändert.

---

## 3 Architektur

### 3.1 Warum ein Modul und keine Kopie

Die Drucker-Figur in `3D-Druck/Anatomie/` ist aus einem einzigen Skript von
1489 Zeilen erzeugt. Davon sind rund 370 Zeilen allgemeine Laufzeit – Federn,
Staffelung, Tiefensortierung je Bild, Legende, Nummern, Erklärzeile, Thema,
Kontrast –, der Rest ist Drucker-Geometrie. Das `explosionsfigur`-Rezept nennt
genau das als offene Baustelle und empfiehlt, das Allgemeine „beim Start der
zweiten Figur“ herauszuziehen.

Hier wird es **sofort** herausgezogen, aus zwei Gründen:

1. Die zweite Figur ist faktisch schon da – Zylinder und Ventil sind zwei
   Maschinen in einer Zeichnung.
2. Der Luftfluss und der Ventil-Schaltzustand sind Laufzeit, die der Drucker
   **nicht hat**. Dieser Teil wird ohnehin neu geschrieben; ihn gleich als
   Modul zu schreiben kostet fast nichts zusätzlich.

Die Sammlung soll auf 15 und mehr Bauteile wachsen. 15 Kopien einer
370-Zeilen-Laufzeit zu pflegen wäre der teuerste denkbare Weg.

### 3.2 Ordner

```
Pneu-EPneu/
  index.html                   Übersicht: vier Rubriken als Kachelraster
  README.md                    Anleitung (Deutsch)
  CLAUDE.md                    Regeln für die Arbeit am Repo
  package.json                 npm start / npm test, Node >= 22
  .github/workflows/
    pages.yml                  Veröffentlichung (aus 3D-Druck übernommen)
    tests.yml                  Tests bei jedem Push
  .claude/skills/anatomy/      Zeichen-Kit, kopiert; weder veröffentlicht noch getestet
  shared/                      aus 3D-Druck kopiert
    css/ui.css  css/kontrast.css
    js/kontrast.js  js/util.js  js/controls.js
    tests/kontrast.test.mjs
  figur/                       NEU – das Allgemeine aller Figuren
    explode.mjs                Federn, Staffelung, Tiefensortierung je Bild
    legende.mjs                Legende, Nummern mit Führungslinie, Erklärzeile
    luft.mjs                   Luftwege, Partikel, Kammerfüllung
    pneumatik.mjs              Das Rechenmodell (Druck, Fläche, Kraft, Bewegung)
    seite.mjs                  Karte, Bedienleiste, Thema, Kontrast, Startskript
    tests/*.test.mjs           Rechenmodell und Farbtöne, ohne Browser
    tests/tools/
      pruefe-figur.mjs         Browsertest, den jede Figur der Sammlung benutzt
  Zylinder-Doppeltwirkend/
    index.html                 erzeugt, nicht von Hand geschrieben
    favicon.svg
    README.md
    tests/
      tools/build-zylinder.mjs Geometrie + vier Datentabellen, sonst nichts
      *.test.mjs
```

`figur/` hat **keine** `index.html` und wird deshalb von `pages.yml` nicht
veröffentlicht – geprüft an der Schleife in der übernommenen Workflow-Datei,
die nur Ordner mit `index.html` kopiert. `shared/` wird unverändert
veröffentlicht, weil der Browser es lädt.

### 3.3 Die Naht: was ist allgemein, was gehört zum Bauteil

**`figur/` kennt kein einziges Pneumatik-Bauteil.** Es kennt nur:

| Modul | Verantwortung | Schnittstelle nach außen |
|---|---|---|
| `explode.mjs` | Wege, Federn, Staffelung, Sortierung nach echter Tiefe je Bild | nimmt `MOVE`, `STAGGER`, `PIECE_OF`, `SPRING`; gibt Laufzeit-Quelltext |
| `legende.mjs` | Legendenliste, Nummern mit Führungslinie, Erklärzeile, Auswahl | nimmt `LEGENDE` (Nummer, Name, Satz, Baugruppe) |
| `luft.mjs` | Luftwege als 3D-Pfade, Partikel darauf, Kammerfüllung, Farbzuordnung | nimmt `WEGE` (Pfad, Querschnitt) und je Bild einen Druck je Weg |
| `pneumatik.mjs` | das Rechenmodell: Flächen, Kräfte, Kammerdrücke, Kolbenbewegung | reine Funktionen, keine Zeichnung, einzeln testbar |
| `seite.mjs` | Seitengerüst: Karte, Bedienleiste, Hell/Dunkel, Kontrast, Startskript | nimmt Titel, SVG, Legende, Bedienelemente |

**Ein Bauteil liefert nur**: seine Geometrie und vier Datentabellen
(`MOVE`, `STAGGER`, `PIECE_OF`, `LEGENDE`), bei beweglichen Bauteilen dazu die
Luftwege und welches Modell aus `pneumatik.mjs` sie treibt.

Prüfung dieser Grenze: `build-zylinder.mjs` darf **keine** Zeile Federmathematik,
Sortierung oder Seitengerüst enthalten. Wenn beim zweiten Bauteil etwas nach
`figur/` wandern muss, war die Naht an dieser Stelle falsch – das wird dann
dort behoben, nicht im Bauteil umgangen.

### 3.4 Warum `pneumatik.mjs` vom Zeichnen getrennt ist

Die Figur zeigt Zahlen. Die `anatomy`-Regel dazu ist eindeutig: *jede Zahl, die
die Figur zeigt, kommt aus demselben Modell, das die Teile bewegt – eine
Anzeige ohne Modell ist Dekoration.* Als reines Modul ohne Zeichnung lässt sich
das Modell gegen die Formeln aus dem Lehrbuch testen, ohne einen Browser zu
starten. Das ist der Teil, bei dem ein Fehler Azubis etwas Falsches beibringen
würde, also ist es der Teil mit Tests.

---

## 4 Das Rechenmodell

### 4.1 Maße des Zylinders

ISO 15552, Ø 50 mm, Hub 200 mm. Die Zahlen stammen aus dem Festo-Katalog zum
Normzylinder DSBC (ISO 15552).

| Größe | Wert | Herkunft |
|---|---|---|
| Kolbendurchmesser D | 50 mm | gewählt (Normreihe) |
| Kolbenstangendurchmesser d | 20 mm | DSBC-Tabelle, Ø 50 |
| Kolbenstangengewinde KK | M16×1,5 | DSBC-Tabelle, Ø 50 |
| Hub | 200 mm | gewählt |
| Anschlussgewinde | G ¼ | DSBC-Tabelle, Ø 50 |
| Zugankergewinde | M10 | DSBC-Tabelle, Ø 50 |
| Grundlänge ZJ (bei Hub 0) | 141,8 mm | DSBC-Tabelle, Ø 50 |
| Baulänge bei Hub 200 | 341,8 mm | ZJ + Hub, gerechnet |

**Annahmen**, weil sie im Katalog nicht als einzelne Maße stehen und die
Zeichnung sie braucht. Jede steht so auch in der README der Figur unter „Was
die Figur nicht zeigt“:

- Wandstärke des Zylinderrohrs 3 mm, Außendurchmesser damit 56 mm.
- Zylinderboden und Zylinderkopf 24 mm dick, Deckelbreite 64 mm.
- Vier Zuganker M10 auf einem Quadrat von 46 × 46 mm um die Rohrachse.
- Kolben 22 mm breit, Dichtung und Führungsring darauf nach Augenmaß der
  Vorlagenzeichnung.
- Dämpfungsbuchse 18 mm lang, Durchmesser 24 mm.
- Drosselquerschnitt der Endlagendämpfung 1/30 des Hauptquerschnitts –
  frei gewählt, damit die Dämpfung sichtbar wird; keine Katalogangabe.

### 4.2 Flächen und Kräfte

```
A_Kolben = π/4 · D²            = π/4 · 50²           = 1963,50 mm²
A_Ring   = π/4 · (D² − d²)     = π/4 · (2500 − 400)  = 1649,34 mm²
φ        = A_Kolben / A_Ring                         = 1,19
```

Bei 6 bar Betriebsdruck (6 bar = 0,6 N/mm²), theoretisch und ohne Reibung:

```
F_aus = 0,6 · 1963,50 = 1178,1 N
F_ein = 0,6 · 1649,34 =  989,6 N
```

Die Figur zeigt beide Werte und rechnet sie bei jeder Änderung des Schiebers
neu. Sie zeigt sie als **theoretische** Kräfte und sagt das auch: die
Dichtungsreibung zieht in Wirklichkeit etwa 3–10 % ab. Lieber ein ehrlicher
Hinweis als eine Zahl, die der Azubi später im Betrieb nicht wiederfindet.

### 4.3 Bewegung und Kammerdruck

Der Kolben wird nicht „animiert“, sondern gerechnet. Je Kammer ein Druck, der
sich über den Ventilweg dem Versorgungs- bzw. Umgebungsdruck annähert; die
Kraftdifferenz beschleunigt die Masse von Kolben und Stange, begrenzt durch die
Endlagen.

```
p_A, p_B      Druck in Kammer A (Boden) und B (Stangenseite)
F_netto       = p_A · A_Kolben − p_B · A_Ring
Bewegung      F_netto gegen die bewegte Masse, gedämpft
Endlage       Dämpfungsbuchse schließt den Hauptweg, Abluft nur durch die Drossel
```

Das ergibt von selbst die drei Dinge, die Azubis verstehen sollen:

- Nach dem Umschalten passiert **kurz nichts**, bis sich der Druck aufgebaut
  und die Gegenkammer entlüftet hat.
- Das **Einfahren ist schneller** als das Ausfahren, weil die Ringfläche
  kleiner ist und bei gleichem Volumenstrom eher gefüllt ist.
- Vor der Endlage **wird der Kolben langsamer**, weil die Abluft nur noch durch
  die Drosselschraube abfließen kann.

Keiner dieser drei Effekte wird eigens programmiert. Sie fallen aus dem Modell.
Das ist die Probe darauf, dass das Modell stimmt.

**Grenzen des Modells**, die so in der README stehen: die Luft wird als
inkompressibel gerechnet, soweit es den Volumenstrom betrifft, und der
Druckaufbau über eine einfache Annäherung statt über die Gasgleichung. Das ist
für die Anschauung richtig und für die Auslegung einer Anlage zu grob.

---

## 5 Die Figur

### 5.1 Aufbau und Kamera

Zylinder liegend auf der x-Achse, Zylinderrohr und Zylinderkopf oben
aufgeschnitten, sodass Kolben, beide Dichtungen, Führungsring und
Dämpfungsbuchse sichtbar sind – der Schnitt aus der ersten Vorlage. Das
5/2-Wegeventil steht davor, ebenfalls aufgeschnitten, sodass der Steuerschieber
und seine Dichtscheiben zu sehen sind. Zwei Schläuche verbinden beide.

Kamera Azimut 38°, Höhe 34°, 1 Welteinheit = 1 mm, Leinwand 900 × 800 –
dieselben Werte wie bei der Drucker-Figur, damit die Figuren der Sammlung
zueinander passen.

Größe: **Hero** nach der `anatomy`-Einteilung, 80–150 Teile.

### 5.2 Baugruppen der Explosion

Zwölf, entlang der Zylinderachse auseinander; Zusammenbau von innen nach außen.

| Nr. | Baugruppe | Wozu sie da ist (Kurzform der Erklärzeile) |
|---|---|---|
| 01 | Zylinderboden | schließt das Rohr hinten und trägt den Anschluss der Bodenkammer |
| 02 | Zylinderrohr | führt den Kolben und hält den Druck |
| 03 | Kolben mit Dichtung und Führungsring | trennt die beiden Kammern; auf ihn wirkt der Druck |
| 04 | Dämpfungsbuchse mit Dämpfungsdichtung | schließt vor der Endlage den Hauptweg der Abluft |
| 05 | Kolbenstange | überträgt die Kraft nach außen |
| 06 | Zylinderkopf mit Abstreifer, Führungsring und Stangendichtung | führt und dichtet die Stange, hält Schmutz draußen |
| 07 | Zuganker mit Muttern | pressen Boden, Rohr und Kopf zu einem Körper |
| 08 | Drosselschrauben der Endlagendämpfung | stellen ein, wie stark gedämpft wird |
| 09 | Ventilgehäuse mit fünf Anschlüssen | daher der Name 5/2: fünf Anschlüsse, zwei Stellungen |
| 10 | Steuerschieber mit Dichtscheiben | verbindet in jeder Stellung andere Anschlüsse miteinander |
| 11 | Betätigung mit Rückstellfeder | schaltet den Schieber um |
| 12 | Schalldämpfer und Schläuche | die Abluft geht ins Freie, der Schalldämpfer macht sie leise |

Teile unter etwa 30 px im zerlegten Zustand (Dichtungen, Abstreifer) fahren mit
ihrer Baugruppe mit, behalten aber ihre eigene Nummer – wie die Düse bei der
Drucker-Figur.

### 5.3 Die strömende Luft

Zwei Töne mit **verschiedener Bedeutung**, nicht bloß zwei Farben:

- **Dunkelblau – Druckluft unter Druck.** Von Anschluss 1 durch das Ventil über
  den Arbeitsanschluss (4 oder 2) in die Kammer, die gefüllt wird.
- **Hellblau – Abluft, schon entspannt.** Aus der anderen Kammer zurück durch
  das Ventil, über Anschluss 3 oder 5 zum Schalldämpfer und ins Freie.

Umgesetzt wird das in drei Lagen, alles in SVG, ohne WebGL – damit es auf einem
Schullaptop am Beamer flüssig läuft:

1. **Kammerfüllung**: ein durchscheinender Körper je Kammer, dessen Länge der
   Kolbenposition folgt und dessen Ton dem gerechneten Kammerdruck.
2. **Partikel**: kleine Scheiben, die auf dem projizierten 3D-Pfad laufen, mit
   Abstand und Tempo aus dem Volumenstrom. Wo der Querschnitt enger wird
   (Drosselschraube, Anschluss), rücken sie zusammen und werden schneller.
3. **Richtungspfeil** an jedem Schlauch, dessen Spitze die Strömungsrichtung
   zeigt und bei Stillstand verschwindet.

Beim Umschalten wechseln die Farben nicht hart. Beide Kammern sind kurz
mittelblau – genau der Moment, in dem sich der Druck aufbaut und der Kolben
noch stillsteht. Dieser Moment ist lehrreich und soll sichtbar sein.

**Farbwahl:** vier Blautöne (Druck/Abluft × hell/dunkel) werden **gerechnet**,
nicht gewählt: jeder Ton muss gegen seinen Untergrund 3:1 halten (Fläche), jede
blaue Beschriftung 4,5:1 (Text). Die Werte stehen im Modul und werden von
`shared/tests/kontrast.test.mjs` geprüft. Dazu müssen die beiden Töne
**untereinander** unterscheidbar bleiben, auch bei 0 % und 100 % am
Kontrastregler. Die vier Töne stehen in `figur/luft.mjs` und werden von
`figur/tests/luft.test.mjs` gerechnet geprüft – nicht erst im Browser, sondern
schon beim Bauen. Fällt ein Ton durch, wird er geändert, nicht die Schwelle.

**Farbfehlsichtigkeit:** Hell- und Dunkelblau unterscheiden sich in der
Helligkeit, nicht im Farbton – damit bleiben sie auch für Rot-Grün-Blinde und in
einem Schwarzweiß-Ausdruck auseinanderzuhalten. Die Richtungspfeile tragen die
Information zusätzlich in der Form.

### 5.4 Bedienung

In der Leiste über der Zeichnung, links nach rechts:

- **Ventil schalten** – der Taster am Ventil; ein Klick auf den gezeichneten
  Taster tut dasselbe.
- **Automatik** – lässt den Zyklus laufen, hält an, sobald jemand selbst schaltet.
- **Zerlegen und zusammenbauen** – wie bei der Drucker-Figur; hält den Zyklus
  an und lässt ihn danach weiterlaufen.
- **Betriebsdruck** – Schieber 2–8 bar, Start 6 bar.
- **Hell/Dunkel** und **Kontrast** – wie auf allen Seiten des Hauses.

Unten rechts die Anzeige: aktueller Druck je Kammer, Kolbenweg in mm und die
beiden Kräfte. Unten links der Hinweis, was man anfassen kann.

### 5.5 Erklärtext unter der Figur

Fließtext in Azubi-Sprache, keine Aufgaben: Aufbau, Funktion, wofür man einen
doppeltwirkenden Zylinder nimmt und wann ein einfachwirkender reicht; die
beiden Formeln mit dem durchgerechneten Beispiel; ein Absatz zur
Endlagendämpfung und einer dazu, warum die Abluft gedrosselt wird und nicht die
Zuluft.

---

## 6 Die Übersichtsseite

Kachelraster wie in `3D-Druck/index.html`, gleiche Kopfleiste mit Hell/Dunkel
und Kontrastregler, vier Rubriken als Abschnitte mit Überschrift.

| Rubrik | Kacheln |
|---|---|
| **Aktoren** | **Doppeltwirkender Zylinder** (fertig) · Einfachwirkender Zylinder mit Federrückstellung · Zylinder mit beidseitiger Kolbenstange · Teleskopzylinder · Tandemzylinder · Kolbenstangenloser Zylinder |
| **Wegeventile** | 3/2-Wegeventil · 5/2-Wegeventil · 5/3-Wegeventil mit Mittelstellung · 4/2-Wegeventil |
| **Sperr- und Stromventile** | Rückschlagventil · Drosselrückschlagventil · Schnellentlüftungsventil · Wechselventil (ODER) · Zweidruckventil (UND) |
| **E-Pneumatik** | Magnetspule · Taster und Schalter · Relais · Stromlaufplan · Sensoren |

**Fertige Kacheln** tragen eine gezeichnete Vorschau, einen Satz, worum es
geht, Schlagwörter und den Knopf „Ansehen“.

**Noch nicht gebaute Kacheln** sind ruhig gehalten, tragen den Namen, einen
Satz dazu, was dort entstehen wird, und die Kennzeichnung „in Arbeit“. Sie sind
**nicht klickbar** und nicht in der Tastaturreihenfolge – niemand soll ins Leere
laufen. Jede hat bereits den Platz für das Schaltzeichen nach ISO 1219-1
freigehalten; gezeichnet werden die Symbole im zweiten Durchgang.

Eine neue Kachel hinzuzufügen heißt: einen Eintrag in einer Datentabelle
ergänzen. Die Rubriken selbst stehen in derselben Tabelle, sodass eine fünfte
später nichts aufbricht.

---

## 7 Prüfung

| Tor | Befehl | Erwartet |
|---|---|---|
| Rechenmodell | `node --test "figur/tests/*.test.mjs"` | Flächen, Kräfte, Flächenverhältnis gegen die Formeln von Hand; Endlagen; Druckaufbau monoton |
| Geometrie in Ruhe | `node Zylinder-Doppeltwirkend/tests/tools/build-zylinder.mjs --audit` | `audit passed` |
| Geometrie zerlegt | `… --apart` | `auseinandergefahren: sauber` |
| Linienenden | `node .claude/skills/anatomy/scripts/lines.mjs Zylinder-Doppeltwirkend/index.html` | `line ends: 0 of N` |
| Verhalten im Browser | `node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/Zylinder-Doppeltwirkend/` | `all checks passed` |
| Kontrast | `node --test "shared/tests/*.test.mjs"` | jeder Text ≥ 4,5:1, jede Fläche ≥ 3:1, beide Modi, beide Reglerenden |
| Alles | `npm test` | grün |

Der Browsertest übernimmt die Prüfungen aus `pruefe-figur.mjs` (Start
zusammengebaut, eine Nummer je Legendeneintrag, Legendenklick wählt und hält,
Zerlegen und Rückbau, Legende springt nicht, Thema- und Kontrastwechsel mitten
im Flug, Abbruch mitten im Lauf, keine Konsolenfehler, Telefonbreite) und
**ergänzt die Luft**:

- Nach dem Umschalten strömt dunkelblaue Luft in die **richtige** Kammer – die,
  in die sich der Kolben bewegt.
- Die Abluft verlässt das Ventil über den **richtigen** Schalldämpfer.
- In der Endlage steht die Luft still und der Kolben steht.
- Während des Zerlegens strömt keine Luft.
- Der Druckschieber verändert die angezeigten Kräfte im richtigen Verhältnis.

**Gemessen, nicht angesehen.** Geprüft wird nie „Klasse gesetzt“, sondern was
der Browser danach zeichnet – das ist die Lehre aus den Fallstricken der
Drucker-Figur.

---

## 8 Reihenfolge des Baus

Jeder Schritt endet mit einem grünen Tor und einem Commit.

1. **Repo-Gerüst**: `package.json`, `CLAUDE.md`, `README.md`, beide Workflows,
   `shared/` und das `anatomy`-Kit kopiert. Tor: `npm test` läuft (noch leer),
   `python3 -m http.server` zeigt eine Seite.
2. **`figur/pneumatik.mjs` mit Tests zuerst**: Flächen, Kräfte, Kammerdrücke,
   Bewegung. Tor: Tests grün, von Hand nachgerechnet.
3. **Übersichtsseite** mit allen vier Rubriken und allen Kacheln. Zu diesem
   Zeitpunkt ist **jede** Kachel „in Arbeit“ und damit nicht klickbar, auch die
   des doppeltwirkenden Zylinders – seine Figur gibt es noch nicht. Scharf
   geschaltet wird sie erst in Schritt 8. Tor: Kontrast grün, kein
   Seitwärtsscrollen bei 390 px.
4. **Geometrie des Zylinders**, Abschnitt für Abschnitt. Tor: `--audit`.
5. **Geometrie des Ventils und der Schläuche**. Tor: `--audit`, `lines.mjs`.
6. **`figur/explode.mjs` + `legende.mjs`** und die Explosion eingehängt. Achsen
   und Tiefen **messen**, nicht raten. Tor: `--apart`.
7. **`figur/luft.mjs`** und der Luftfluss. Tor: der erweiterte Browsertest.
8. **`figur/seite.mjs`**, Erklärtext, README der Figur, Kachel scharf schalten.
   Tor: alle Tore zusammen, `npm test`.
9. **Veröffentlichen**: Push, GitHub Pages einmalig einschalten.

`index.html` einer Figur wird erst committet, wenn die Seite vorzeigbar ist –
die Seite geht beim Push sofort live.

**Grobe Dauer:** Schritte 1–3 rund eine Stunde, danach steht eine Seite im
Browser. Schritte 4–8 drei bis vier Stunden. Läuft ein Schritt über das
Doppelte seines Anteils, melde ich den Stand, statt still weiterzumachen.

---

## 9 Offene Punkte und bekannte Grenzen

- **Die Naht in `figur/` ist eine Vermutung.** Sie stammt aus der Analyse einer
  einzigen fremden Figur. Beim zweiten Bauteil wird sich zeigen, wo sie falsch
  liegt; dann wird sie dort verschoben, nicht im Bauteil umgangen.
- **Die Drucker-Figur bleibt auf ihrer Kopie.** Verbesserungen an `figur/`
  kommen nicht von selbst bei ihr an. Das wird bewusst in Kauf genommen: es
  sind zwei Repos, und `3D-Druck` hat seine eigene Prüfung.
- **Durchdringung im Flug** ist nicht geprüft – `--audit` und `--apart` decken
  Ruhelage und zerlegten Zustand ab, nicht die Sekunden dazwischen. Das ist
  eine bekannte Grenze des Prüfers, keine neue.
- **Schaltzeichen nach ISO 1219-1** sind für den zweiten Durchgang vorgesehen;
  der Platz ist freigehalten, gezeichnet ist noch nichts.
- **Echte Beamer und echte Berührungsbildschirme** sind nicht geprüft. Der
  Kontrastregler ist die Antwort darauf, aber eine gemessene ist es nicht.
- **E-Pneumatik ist nur als Rubrik da.** Ob eine Figur Strom und Luft zugleich
  zeigen kann, ohne unübersichtlich zu werden, ist offen und wird beim ersten
  E-Pneumatik-Bauteil entschieden.

---

## Quellen

- [Festo: Normzylinder DSBC, ISO 15552](https://www.festo.com/media/catalog/201384_documentation.pdf) – Maßtabellen für Ø 50 (Kolbenstange, Gewinde, Anschluss, Zuganker, Grundlänge)
- [Festo Didactic: Datenblatt doppeltwirkender Zylinder](https://ip.festo-didactic.com/InfoPortal/TP/Components/Part152888/Documentation/DataSheet.pdf) – beidseitige, über zwei Schrauben einstellbare Endlagendämpfung
- [Tameson: Pneumatische Wegeventile für Pneumatikzylinder](https://tameson.de/pages/richtungssteuerventil-pneumatischer-zylinder) – Funktion des 5/2-Wegeventils am doppeltwirkenden Zylinder
- [DIN ISO 15552](https://www.austrian-standards.at/en/shop/din-iso-15552-2005-12~p3109949) – Normbereich der metrischen Maßreihe
