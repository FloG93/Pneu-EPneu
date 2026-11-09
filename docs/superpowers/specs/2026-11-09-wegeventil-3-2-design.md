# 3/2-Wegeventil – Entwurf

Stand: 2026-11-09. Drittes Bauteil, gebaut nach dem Skill `azubi-visualisierung` (Ablauf B). **Alle Festlegungen des 5/2-Wegeventils (`2026-11-06-wegeventil-5-2-design.md`) gelten unverändert**, soweit hier nichts anderes steht. Der Nutzer hat keine neuen Fragen gewünscht; die Entscheidungen unten sind aus den vorigen Bauteilen abgeleitet.

## 1. Ziel

Azubis sehen, dass ein 3/2-Ventil nur **einen** Arbeitsanschluss hat, der entweder Druck bekommt oder entlüftet wird, und dass es **zwei Grundstellungen** gibt:

- **Sperr-Grundstellung (NC):** in Ruhe 2→3 entlüftet, 1 gesperrt; Signal **12** schaltet 1→2.
- **Durchfluss-Grundstellung (NO):** in Ruhe 1→2; Signal **10** sperrt 1 und entlüftet 2→3.

Gelungen ist die Seite, wenn jemand nach dem Umschalten NC/NO erklären kann, warum dasselbe Gehäuse mit einem anderen Schieber das Gegenteil tut – und das Schaltzeichen dazu passt.

## 2. Abgeleitete Entscheidungen

| Thema | Entscheidung | Abgeleitet aus |
|---|---|---|
| Bauart | Längsschieber, monostabil, Druckfeder als Rückstellung | 5/2: Längsschieber; 3/2-Kachel „monostabil" |
| Umschalter | **NC / NO** (statt mono/bi): tauscht den Schieber (zwei Schiebervarianten), die Steueranschluss-Nummer (12 ↔ 10) und das Schaltzeichen | 5/2: Umschalter für den wichtigsten Lernunterschied |
| Baugröße | ISO 5599-1 Größe 1, G1/4, Grundplatte, Baubreite 42 mm | wie 5/2 (Festo VSVA führt 3/2 NC/NO in Größe 1) |
| Umgebung | Ventil groß; Zuleitung an 1, Schlauchstück an 2, Schalldämpfer an 3, Steuerleitung an 12/10 | wie 5/2 |
| Anzeige | Druck an 2, Schaltzeit | wie 5/2 (ein Arbeitsanschluss) |
| Bedienung | Signal halten, Zeitlupe, Schieber von Hand, Automatik, Druck 2–8 bar | wie 5/2 |
| Schaltzeichen | ISO 1219-1, mitschaltend neben der Figur | wie 5/2 |
| Anschlüsse | 1, 2, 3, 10, 12; alte Buchstaben (P, A, R, Z, Y) einmal im Text | wie 5/2 |
| Kachel | Rubrik Wegeventile, fertig, eigenes Vorschaubild (Längsschnitt NC betätigt + Symbol) | wie 5/2 |

## 3. Belegt / angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Anschluss, Baubreite | G1/4, 42 mm | belegt: Festo VSVA Größe 1 (wie 5/2) |
| Nenndurchfluss 3/2 Gr. 1 | ≈ 1100 l/min | belegt: Festo 3/2 Größe 1, Händlerangabe (Tameson, 561369/561361) |
| Gehäuselänge | ≈ 90 mm (drei Kanäle) | **Annahme** |
| Bohrung, Hub, Steuerkolben, Feder, Überdeckung, Leitwerte | wie `ISO_5599_GR1` | **Annahme**, wie 5/2 |
| Volumen hinter 2 | wie 5/2 (`volumen2`) | **Annahme** |

## 4. Architektur

### 4.1 Naht verschieben (zweites Ventil)

CLAUDE.md verlangt: Was das zweite Ventil vom ersten braucht, wandert nach `figur/`.

- **`figur/normteile.mjs` (neu):** die bauteilfreien Zeichenhelfer aus `build-ventil.mjs`: Schnittfläche/Schnittton (`SCHNITT_CSS`), Hermite-Schlauch und Schlauchstummel, Gewinde, Verschraubung, Schalldämpfer, Druckfeder (Wendel + Blocklängenprüfung), Schraubenkopf. Die 5/2-Seite bleibt byte-gleich.
- **`figur/bedienung.mjs` (neu):** die Laufzeit der Signalknöpfe (halten/loslassen, Impuls, Takt der Automatik, `e.repeat`-Schutz) aus `build-ventil.mjs`. 5/2-Seite verhaltensgleich (90/90).

### 4.2 Rechenmodell: Ventil aus der Wegebeschreibung

`figur/ventil.mjs` rechnet bisher fest mit den Anschlüssen 2 und 4. Neu nimmt es die **Wegebeschreibung** (`art`, dieselbe, aus der das Schaltzeichen gezeichnet wird) und leitet daraus je Arbeitsanschluss den Zu- und Abluftweg ab:

- Arbeitsanschlüsse = `art.oben`; Zufuhr = `art.zufuhr`; Abluft = übrige Anschlüsse in `art.unten`.
- Feld 0 ist die betätigte Stellung (Steuersignal „14"-Seite im Modell), Feld 1 die Ruhestellung.
- Für Anschluss w: Zuweg offen = Summe der Felder, die `[zufuhr, w]` enthalten (Öffnung a für Feld 0, b für Feld 1); Abweg = Felder mit `[w, abluft]`.
- Drücke als `v.p = { 2: …, 4: … }`; `ventilAnzeige` liefert `drucke` je Arbeitsanschluss.
- Signalnamen im Modell bleiben `"14"` (Feld-0-Steuerseite) und `"12"` (Feld-1-Steuerseite); die Seite beschriftet sie nach Ventil (3/2: 12 bzw. 10).
- **5/2 rechnet bitgleich weiter**: bestehende Ventil- und Zylindertests unverändert grün, beide Seiten bestehen ihre Browserprüfungen.

Beschreibungen in `figur/schaltzeichen.mjs`:
- `VENTIL_3_2_NC = { felder: [[[1, 2]], [[2, 3]]], unten: [1, 3], oben: [2], zufuhr: 1, steuer: [12, null] }`
- `VENTIL_3_2_NO = { felder: [[[2, 3]], [[1, 2]]], unten: [1, 3], oben: [2], zufuhr: 1, steuer: [10, null] }`
- `VENTIL_5_2` bekommt `steuer: [14, 12]`; `wegeventilSymbol` beschriftet die Betätigungen aus `art.steuer` statt fester 14/12 (Ausgabe für 5/2 byte-gleich).

### 4.3 Das Bauteil

```
Wegeventil-3-2/
  index.html, favicon.svg, vorschau.svg, README.md
  tests/seite.test.mjs
  tests/tools/build-ventil-3-2.mjs, legende-ventil-3-2.mjs, pruefe-ventil-3-2.mjs
```

## 5. Die Figur

- Längsschnitt wie 5/2 (gespiegelte y-Achse, Schnittton, gestufter Grundplattenschnitt), drei Kanäle in der Reihenfolge **1 – 2 – 3** entlang der Schieberachse.
- Links Steuerkappe mit Steuerkolben (Beschriftung 12 bzw. 10 je Variante), rechts Rückstellkappe mit Druckfeder.
- **Zwei Schieber** als `data-variante="nc"|"no"`: NC verbindet in Ruhe 2–3, betätigt 1–2; NO umgekehrt. Beide mit Überdeckung aus dem Modell, im Bauskript geprüft wie beim 5/2.
- Legende (11, Reihenfolge = Zerlegen außen zuerst rückwärts): grundplatte, dichtung, gehaeuse, schieber, ringe, kappe, rueckstell, schrauben, daempfer, leitung, steuerleitung.
- Zerlegen entlang der Achsen; Deckelschrauben fahren mit ihren Kappen; jede Nummer am eigenen Teil.

## 6. Bedienung und Anzeige

| Element | Verhalten |
|---|---|
| Schalter **NC / NO** | `bauartWechseln`-Gegenstück: Ausgangsstellung, Signale aus; tauscht Schieber, Steuernummer und Symbol |
| **Signal 12 / 10** | gedrückt halten (Feder stellt zurück) |
| Zeitlupe, Schieber von Hand, Automatik, Druck | wie 5/2 |
| Anzeige | `p2 … bar · Schaltzeit … ms` |

## 7. Prüfen

Ganzer Prüfkanon (Audit, Zerlegen, Linienenden, Browser ×5, live). Zusatzprüfungen: NC in Ruhe p2 = 0 und betätigt p2 = Versorgung, NO umgekehrt; Mitte alle Wege zu; Signal loslassen → Rückstellung; NC/NO tauscht gezeichneten Schieber, Steuernummer und Symbol; Symbolfeld passt zur Stellung; Anzeige folgt dem Druckregler.

## 8. Nicht im Umfang

Sitzventil-Bauart, Handhebel/Taster-Betätigung als Figur, Magnet (E-Pneumatik), 4/2 und 5/3.
