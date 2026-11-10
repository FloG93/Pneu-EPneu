# Einfachwirkender Zylinder – Entwurf

Stand: 2026-11-10. Viertes Bauteil, gebaut nach dem Skill `azubi-visualisierung` (Ablauf B) mit den Festlegungen der Explosionsfigur. **Alle Festlegungen des doppeltwirkenden Zylinders (`2026-11-02-pneumatik-bauteilsammlung-design.md`, `Zylinder-Doppeltwirkend/`) gelten unverändert**, soweit hier nichts anderes steht. Der Nutzer hat keine Rückfragen verlangt („/goal"); die Entscheidungen unten sind aus den vorigen Bauteilen und dem Katalog abgeleitet.

## 1. Ziel

Azubis sehen eindeutig, wie ein einfachwirkender Zylinder arbeitet:

- **Ausfahren:** Druckluft strömt über das 3/2-Ventil (1→2) in die **eine** Kammer hinter dem Kolben und schiebt ihn gegen die Feder hinaus. Die Feder wird dabei zusammengedrückt.
- **Einfahren:** Ventil los, 2→3 entlüftet die Kammer, **die Feder** schiebt den Kolben zurück. Keine Druckluft hilft dabei.
- **Federraum atmet:** Die Kammer mit der Feder ist über einen Filter offen zur Umgebung. Beim Ausfahren wird ihre Luft hinausgeschoben, beim Einfahren angesaugt – sie steht nie unter Druck.
- **Was das kostet:** Die Feder zieht beim Ausfahren Kraft ab (bei 6 bar 1178 N − 105 N = 1073 N), und zurück drückt nur die Feder (82–105 N). Deshalb kurzer Hub und Anwendungen, bei denen der Rückweg keine Kraft braucht (Spannen, Auswerfen, Prägen) – dafür halbe Luft, ein Schlauch, ein einfaches 3/2-Ventil, und bei Druckausfall fährt er sicher ein.

Gelungen ist die Seite, wenn jemand nach einem Hub erklären kann, wer den Kolben zurückbringt, warum die Federkammer blass bleibt und warum die Ausfahrkraft kleiner ist als p · A.

## 2. Abgeleitete Entscheidungen

| Thema | Entscheidung | Abgeleitet aus |
|---|---|---|
| Vorbild | Rundzylinder **Festo ESNU-50-25-P-A** (drückend, einfachwirkend, Feder im Stangenraum) | Katalog; Ø 50 wie der doppeltwirkende, damit die Kräfte vergleichbar sind |
| Ansteuerung | **3/2-Wegeventil NC** mit Taster und Rückstellfeder, auf Grundplatte, vereinfacht gezeichnet wie das 5/2 auf der Seite des doppeltwirkenden Zylinders | 3/2-Seite: NC = in Ruhe entlüftet |
| Umgebung | Kolbenstange schiebt einen Schlitten auf einer Schiene (wie doppeltwirkend); Zuleitung an 1, Schlauch 2→Zylinderboden, Schalldämpfer an 3, Filter an der Entlüftungsbohrung des Kopfes | doppeltwirkender Zylinder |
| Bedienung | **Taster halten** (loslassen → Feder stellt zurück; über `figur/bedienung.mjs`), **Automatik**, **Druck** 2–8 bar, **Zeitlupe** (Start an, 25 mm Hub sind in Echtzeit unter 0,1 s) | 3/2-Seite (halten), Ventilseiten (Zeitlupe) |
| Anzeige | `F aus … N = p · A − Feder · F Feder jetzt … N · Hub … mm` | Modell |
| Schaltzeichen | ISO 1219-1 „Zylinder einfach wirkend mit Federrückstellung" und das 3/2-NC-Zeichen, als Begleitbild neben der Figur (statisch) | Kachel `sinnbild` |
| Kachel | Rubrik Aktoren, fertig, eigenes Vorschaubild, Marken „Rundzylinder", „Ø 50 mm", „Hub 25 mm", „mit 3/2-Wegeventil" | wie doppeltwirkend |
| Ordner | `Zylinder-Einfachwirkend/` | wie `Zylinder-Doppeltwirkend/` |

## 3. Belegt / angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Kolben-Ø, Hub | 50 mm, 25 mm | **belegt:** Festo Datenblatt 196383 (ESNU-50-25-P-A) |
| Stangengewinde, Anschluss | M16×1,5, G1/4 | **belegt:** dito |
| Federkraft eingefahren | 82 N | **belegt:** „Federrückstellkraft bei eingefahrener Kolbenstange 82 N" |
| Vorlaufkraft 6 bar | 1072,8 N | **belegt:** „Theoretische Kraft bei 0,6 MPa, Vorlauf" |
| Federkraft ausgefahren | 105,3 N, Rate 0,932 N/mm | **abgeleitet:** 0,6 · π/4 · 50² − 1072,8 = 105,3 N; (105,3 − 82)/25 |
| Bewegte Masse Zylinder | 476 g | **belegt** |
| Betriebsdruck | 1,2–10 bar | **belegt** |
| Stange | Ø 20 mm | **Annahme** (passt zu M16×1,5, wie DSNU/DSBC Ø 50) |
| Last (Schlitten) | 2,5 kg gesamt | **Annahme** |
| Reibung, Leitwerte, Totraum, Schlauchvolumen, Wand, Deckel | wie `ISO_15552_50`, Leitwerte für die kleinere Kammer neu gestellt | **Annahme** |
| Bauweise | Deckel echt eingerollt (nicht zerlegbar); die Figur zerlegt ihn trotzdem, um die Teile zu zeigen | **steht in der README** |

## 4. Architektur

### 4.1 Naht verschieben (zweiter Zylinder)

CLAUDE.md verlangt: Was der zweite Zylinder vom ersten braucht, wandert nach `figur/`. Neu als **Zylinder-Familie** (zweite dokumentierte Ausnahme neben der Schieberventil-Familie: kennt den Aufbau „Zylinder auf Schiene mit Ventil auf Grundplatte", kein bestimmtes Bauteil; Maße und Anschlüsse als Parameter):

- **`figur/zylinderteile.mjs`**: Schiene mit Schlitten/Last, das vereinfachte Ventil auf Grundplatte (Anschlüsse, Stutzen, Abluft nach unten, Schieber mit Scheiben, Taster, Rückstellfeder – parametriert über Anschlussliste und Scheibenpositionen), Schläuche zwischen Ventil und Zylinder.
- **`figur/zylinderseite.mjs`**: was beide Zylinderseiten zur Laufzeit gemeinsam haben (Kolben/Stange/Schlitten verschieben, Kammerfüllung, Teilchen auf den Bahnen nach Leitwert, Anzeige-Haken, `window.__figur`-Grundstock, Automatik-Takt).
- **Doppeltwirkend bleibt in der Zeichnung byte-gleich**, Browserprüfung 50/50.

### 4.2 Rechenmodell

`figur/pneumatik.mjs` bekommt die Feder als Option der Zylinderbeschreibung statt eines zweiten Modells:

- `ESNU_50_25 = { …, einfach: true, feder: { vorspannung: 82, rate: 0.932 } }` (Rate aus den Katalogwerten gerechnet, Kommentar).
- `einfach: true`: Kammer B ist über den Filter **immer** Umgebung (`pB = UMGEBUNG`), das Ventil hat nur Zuweg 1→2 (Stellung „ausfahren") und Abweg 2→3 (Stellung „einfahren") für Kammer A.
- `federKraft(z, masse) = vorspannung + rate · weg`; `kraftNetto` zieht sie ab; `kraftAus(druckBar, masse)` = p · A − Feder bei vollem Hub; `kraftEin` = Federkraft eingefahren (ohne Druck).
- `anzeige` liefert zusätzlich `federJetzt`, `federAus`, `federEin`.
- **Doppeltwirkend rechnet bitgleich weiter**: alle bestehenden Tests unverändert grün.

### 4.3 Das Bauteil

```
Zylinder-Einfachwirkend/
  index.html, favicon.svg, vorschau.svg, README.md
  tests/seite.test.mjs
  tests/tools/build-zylinder-ew.mjs, legende-zylinder-ew.mjs, pruefe-zylinder-ew.mjs
```

## 5. Die Figur

- Rundes Zylinderrohr über ein Fenster aufgeschnitten (`figur/schnitt.mjs`), sodass Kolben, Druckkammer, **Feder um die Stange** und Federraum zu sehen sind.
- Boden mit Anschluss G1/4 (Schlauch von 2), Kopf mit Stangendichtung und **Entlüftungsbohrung mit Sinterfilter**; Kolben mit Dichtung und elastischer Dämpfungsscheibe.
- Feder über `figur/normteile.mjs` (Wendel + Blocklängenprüfung bei vollem Hub).
- Befestigung: zwei Fußwinkel an den Deckeln auf der Grundplatte.
- Legende (11, Zerlegen außen zuerst): boden, rohr, kolben, stange, feder, kopf, fuss, gehaeuse, schieber, betaetigung, leitung.
- Zerlegen entlang der Achsen; jede Nummer am eigenen Teil.

## 6. Luft

- Ausfahren: kräftiges Blau 1→2→Boden→Kammer A; Federraum: blasse Teilchen hinaus durch den Filter.
- Einfahren: blasses Blau Kammer A→2→3→Schalldämpfer; Federraum: blasse Teilchen durch den Filter herein.
- Federraum ist immer blass gefüllt (Umgebung); Kammer A kräftig nach Druck.
- Teilchenmenge folgt dem Leitwert und der Kolbengeschwindigkeit aus dem Modell.

## 7. Prüfen

Ganzer Prüfkanon (Audit, Zerlegen, Linienenden, Browser ×5 in beiden Modi, live). Zusatzprüfungen: Taster gehalten → Kammer A kräftig, Kolben fährt aus; losgelassen → Kolben zurück auf 0 ohne Druck in A; Federraum zu jeder Zeit blass; Anzeige bei 6 bar `1073 N`, bei 3 bar `484 N` (0,3 · 1963,5 − 105,3); Federkraft-Anzeige 82 N eingefahren, 105 N ausgefahren; Druck unter p_min fährt nicht aus (Modelltest).

## 8. Nicht im Umfang

Ziehender einfachwirkender Zylinder (Feder im Bodenraum), Membranzylinder, Magnetventil (E-Pneumatik), Näherungsschalter.
