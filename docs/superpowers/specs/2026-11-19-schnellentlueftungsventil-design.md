# Schnellentlüftungsventil – Entwurf

Stand: 2026-11-19. Achtes Bauteil, vierte Seite der Rubrik „Sperr- und Stromventile", die zweite mit den gebauten Werkzeugen (`npm run neu:schnittseite`, `npm run gate`), nach dem Skill `azubi-visualisierung` (`references/schnittseite.md`, mit den Lehren vom Rückschlagventil) und den Festlegungen der Explosionsfigur (`CLAUDE.md`). Nutzerwunsch („Schnellentlüftungsventil als Nächstes, leg los"): wie die letzten Seiten, gleiche Qualität, günstig gebaut. Keine Rückfragen; Entscheidungen sind aus Katalog, Datenblatt und Funktionsschnitt abgeleitet.

## 1. Ziel

Azubis sehen eindeutig, **warum ein Zylinder mit Schnellentlüftungsventil schneller ausfährt**, und was im Ventil dabei passiert:

- **Belüften (1 → 2):** Druck am Eingang 1 drückt die **Manschette** (Dichtscheibe) nach oben gegen die Düse des Anschlusses 3 und schließt die Entlüftung. Die Luft strömt über die Lippen der Manschette weiter zu Anschluss 2 (zum Zylinder).
- **Entlüften (2 → 3):** Fällt der Druck an 1 unter den Druck an 2, drückt die Luft aus dem Zylinder die Manschette **auf den Sitz des Eingangs 1**. Der Eingang ist zu, die Luft entweicht **direkt** durch die Düse und den **Schalldämpfer** ins Freie (Anschluss 3), nicht erst durch Schlauch und Steuerventil zurück.
- **Druck an 2 folgt dem Druck an 1 nach unten:** Das Ventil entlüftet nur, bis p2 den Druck an 1 erreicht hat (bei 1 = 0 bar bis zum Umgebungsdruck); bei p1 = p2 steht die Manschette in der Mitte, beide Wege sind zu.
- **Wozu:** kurze Entlüftungswege am Zylinder (schnelle Kolbengeschwindigkeit beim Einfahren des einfachwirkenden bzw. beim Ausfahren des doppeltwirkenden Zylinders), Schalldämpfer gleich am Ventil.

Gelungen ist die Seite, wenn jemand nach vier Schritten (Druck an 1 anlegen, Druck wegnehmen, auf einen kleineren Druck zurückgehen, wieder anlegen) erklären kann, welche Seite der Manschette gerade zu ist, woher die Luft kommt und wohin sie geht.

## 2. Quellenkarte (geprüft, alle drei Quellen angesehen)

| Quelle | Aussage | Status |
|---|---|---|
| Festo Datenblatt **6753** (SEU-1/4), `ftp.festo.com/Public/PNEUMATIC/SOFTWARE_SERVICE/DataSheet/DE_DE/6753.pdf`, mit `pdftotext` gelesen | Ventilfunktion Schnellentlüftung, **mit Schalldämpfer**, Anschlüsse **1 und 2 G1/4**, **einschraubbar**, Nennweite **7 mm**, Normalnenndurchfluss **Entlüftung 6 → 5 bar: 1100 l/min**, **Belüftung 6 → 5 bar: 960 l/min**, Normaldurchfluss **Entlüftung 6 → 0 bar: 2300 l/min**, Betriebsdruck **0,5 … 10 bar**, Gehäuse **Zink-Druckguss**, Dichtungen **NBR**, **120 g**, Schalldruckpegel **95 dB(A)**, Einbaulage beliebig, geölter Betrieb möglich, −20 … 75 °C | **belegt** |
| Festo Katalog **SE, SEU** (2019/11 und 2025/11), `…/Documentation/2019/DE/SEU_DE.PDF`, **S. 3 (SE) und S. 6 (SEU): „Funktionsschnitt", Bild angesehen** (Scratchpad `cut3-3.png`, `cut6b-6.png`) | Aufbau im Schnitt: **Gehäuse** mit seitlichem **Gewindezapfen** (Anschluss 2, Außengewinde, Sechskant), **unterem Stutzen** (Anschluss 1, Innengewinde G1/4, im Schnitt blau gefüllt = Zuluft) und **oben offenem Entlüftungsanschluss 3**; im Innenraum eine **schwarze NBR-Manschette** (flache Scheibe mit nach außen aufgeweiteten Lippen) über dem Sitz des unteren Stutzens, darüber ein **trichterförmiger Einsatz** (Entlüftungsdüse, Hals nach unten, mit **O-Ring** am Rand gegen das Gehäuse), beim **SEU** darauf ein **Schalldämpfer** (V-förmiges, kreuzschraffiertes poröses Element) unter einem **Haltering** am Gehäuserand. Werkstoffe (Katalog): „1 Gehäuse", „Dichtungen NBR" | **belegt** |
| Festo Katalog 2025/11 S. 14, Maßzeichnung SEU-1/4, Bild angesehen (Scratchpad `d14-14.png`) | **B1 42,5** (Gesamthöhe), **B2 30** (Höhe des Gehäuses über dem Untergestell), **B3 27** (Achse 2 über Unterkante), **B4 9,5** (Stutzen 1), **D3 Ø33** (Gehäuse oben), **D5 Ø29** (Gehäuse unten), **L1 28** (Achse bis Ende Zapfen 2), **L2 10** (Gewindelänge), **Schlüsselweiten 19**; Anschlüsse: **1 = Eingang** (unten), **2 = Ausgang** (seitlich), **3 = Entlüftung** (oben) | **belegt** |
| Festo Datenblatt SE/SEU S. 5, Schaltzeichen, Bild angesehen (Scratchpad `sym-05.png`) | ISO-1219-1-Schaltzeichen: Kasten, **Eingang 1 links**, **Ausgang 2 oben** (Knoten), links ein Weg 1 → 2, rechts ein gesteuerter Sperrweg nach **3**, daran das **Schalldämpfersymbol** außerhalb des Kastens, die **Steuerleitung (gestrichelt)** von 2 zum Sperrweg | **belegt** (nachgezeichnet) |
| Welcher Anschluss Innen- und welcher Außengewinde hat | Maßzeichnung: Stutzen 1 mit **schraffiertem Innengewinde**, Zapfen 2 **Außengewinde mit Sechskant**; ob das jeder Ausführung (SEU-1/4) entspricht, nennt das Datenblatt nicht | Zeichnung **belegt**, Zuordnung in der Seite als **angenommen** gekennzeichnet |

**Folge:** Die Figur ist **nach dem Funktionsschnitt des Katalogs** gezeichnet (Bauform belegt). Innenmaße (Wandstärken, Lippenform, Düsendurchmesser, Hub, Werkstoff des Schalldämpfers) sind aus dem Bild abgemessen und **Annahmen**; der Text sagt „nachgezeichnet nach dem Funktionsschnitt des Katalogs". Findet der Controller keine Maße, bleiben die Katalogmaße (außen) und die Verhältnisse des Schnitts (innen) maßgeblich.

## 3. Abgeleitete Entscheidungen

| Thema | Entscheidung |
|---|---|
| Vorbild | **Festo SEU-1/4** (Katalogmaße, Zahlen, Schnitt); die SE-Ausführung (ohne Schalldämpfer) kommt nur im Text vor |
| Darstellung | Nur das Ventil, **groß**, im **Längsschnitt** durch die Achse des Gehäuses und die Achse des Zapfens 2 (vordere Hälfte abgenommen); **Körper senkrecht**, **3 oben**, **1 unten**, **2 links** wie im Katalog; unten Steckverschraubung mit kurzem Schlauch an **1** (Innengewinde), links **Muffe** mit kurzem Schlauch an **2** (Außengewinde, siehe Lehre „Keine Verschraubung passt auf einen Zapfen" in `schnittseite.md`); Sechskant am Gehäuse als Zylinder/Block vereinfacht (steht in der README) |
| Bedienung | Regler **Druck am Eingang 1** (0 … 8 bar, Schritt 0,5, Start 0), **Automatik**, Zeitlupe, Zerlegen, Kontrast. Kein Entlüftungsknopf: das Ventil entlüftet allein über den Druckunterschied. Automatik läuft beim Laden (außer bei reduzierter Bewegung) |
| Automatik | 8 Schritte à 3 s: **1 auf 6 bar** (Manschette oben, Düse zu, 2 füllt sich) → **halten** → **1 auf 0** (Manschette fällt auf den Sitz, 2 entlüftet über den Schalldämpfer) → **halten** (beide 0) → **1 auf 3 bar** (Manschette hebt, 2 füllt sich auf 3) → **halten** → **1 auf 1 bar** (Manschette fällt, 2 entlüftet **nur bis 1 bar**: p2 folgt p1 nach unten) → **halten** |
| Anzeige | Zeile 1: `Eingang 1 … bar · Ausgang 2 … bar · Δp … bar`. Zeile 2: `Manschette oben · Belüften 1 → 2 · Durchfluss … l/min` bzw. `Manschette unten · Entlüften 2 → 3 · Durchfluss … l/min` bzw. `Manschette in der Mitte · beide Wege zu · Durchfluss 0 l/min`. Umbrechbar, bei 390 px im Fenster; Zahl und Einheit mit geschütztem Leerzeichen |
| Schaltzeichen | Festo-Schaltzeichen (§2) **mitschaltend**: der Weg 1 → 2 färbt sich beim Belüften, der Sperrweg zu 3 öffnet und färbt sich beim Entlüften, Schalldämpfersymbol an 3; Anschlussziffern 1, 2, 3 |
| Kachel | Rubrik „Sperr- und Stromventile", fertig, Marken „SEU-1/4", „G1/4", „entlüftet schnell"; eigenes Vorschaubild |
| Ordner / id | `Schnellentlueftungsventil/`, id `schnellentlueftungsventil` |

## 4. Belegt / abgeleitet / angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Anschlüsse | G1/4 (1 und 2), 3 mit Schalldämpfer | **belegt** Festo 6753 |
| Nennweite | 7 mm | **belegt** |
| Normalnenndurchfluss Belüften 1 → 2 | 960 l/min bei 6 → 5 bar (Δp = 1 bar) | **belegt** |
| Normalnenndurchfluss Entlüften 2 → 3 | 1100 l/min bei 6 → 5 bar (Δp = 1 bar) | **belegt** |
| Normaldurchfluss Entlüften 6 → 0 bar | 2300 l/min | **belegt** |
| Betriebsdruck | 0,5 … 10 bar (Regler 0 … 8 bar; das Modell läuft auch darunter) | **belegt** / Seite wählt 8 |
| Gehäuse, Dichtungen, Masse, Schalldruckpegel | Zink-Druckguss, NBR, 120 g, 95 dB(A) | **belegt** |
| Außenmaße | B1 42,5, B2 30, B3 27, B4 9,5, D3 Ø33, D5 Ø29, L1 28, L2 10, Schlüsselweite 19 | **belegt** Katalog |
| Durchflusskennlinie Belüften | Q12 = qBel · Öffnung · Δp / 1 bar (linear), gekappt bei 2 · qBel (Anzeige „begrenzt") | **abgeleitet** aus einem Normpunkt / **Annahme** (Katalog nennt nur den Normwert) |
| Durchflusskennlinie Entlüften | Q23 = min(qEnt · Öffnung · Δp / 1 bar, 2300 l/min); Δp = p2 − Umgebung. Beide Katalogpunkte stimmen: 1100 bei Δp = 1, 2300 bei Δp = 6 (Kappung) | **abgeleitet** aus zwei Normpunkten |
| Lage der Manschette | `s` ∈ [−1, 1]: +1 oben an der Düse (3 zu, 1 → 2 frei), −1 unten auf dem Sitz (1 zu, 2 → 3 frei), 0 Mitte (beide zu); Sollwert `clamp(Δp / 0,3 bar, −1, 1)` mit Δp = p1 − p2, Lauf mit der Schaltzeit | **Annahme** (Umstelldruck, Schaltzeit 8 ms) |
| Öffnung der Wege | Weg 1 → 2 offen mit `max(0, s)`, Weg 2 → 3 offen mit `max(0, −s)` | **Annahme** |
| Volumen hinter 2 | 200 cm³ (Zylinder Ø50 × 100 mm ≈ 196 cm³ + Schlauch) | **Annahme** |
| Hub der Manschette in der Zeichnung | 3 mm (überhöht) | **Annahme** |
| Innenmaße, Lippenform, Düse, Schalldämpfer-Werkstoff | aus dem Schnittbild abgemessen | **Annahme**, nachgezeichnet |
| Umstelldruck 0,3 bar (Vollausschlag) / 0,05 bar Reibung | | **Annahme** |

## 5. Architektur

- **`figur/schnellentlueftungsventil.mjs` (neu, Rechenmodell, sechste Ausnahme neben `pneumatik/ventil/stromventil/wechselventil/rueckschlagventil`):** reine Funktionen, absolute Drücke (`absolut(bar)`), `SEU_1_4 = { qBel: 960, qEnt: 1100, qEntMax: 2300, bezugsDp: 1, bandDp: 0.3, schaltzeit: 0.008, volumen2: 200000, hub: 3, qMaxFaktor: 2, … }` mit Herkunft je Zeile. `neuerZustand()` → `{ s, p1, p2 }`, `schritt(z, masse, dt, { p1 })` (feste Teilschritte wie die anderen Modelle, Kammerdruck über `kammerSchritt` aus `ventil.mjs`; beim Entlüften fließt die Luft nach `AUSSEN`; **kein** Fluss in die verbotene Richtung, ein Weg trägt nur mit seiner Öffnung), `durchfluss(z, masse)` → `{ q12, q23 }` in l/min (nie negativ), `manschettenZustand(z)` → `"oben" | "unten" | "mitte" | "unterwegs"`, `anzeige(z, masse)`, `anzeigeZeilen(a)` (einmal für Build und Seite). Kein Name darf mit denen in `pneumatik.mjs`, `ventil.mjs`, `stromventil.mjs`, `wechselventil.mjs`, `rueckschlagventil.mjs` kollidieren (Seiten binden alle Modelle in ein Skript).
- **`figur/schaltzeichen.mjs`:** `schnellentlueftungsSymbol({ feld })` + Laufzeit/CSS wie `wechselventilSymbol`; alle anderen Symbolausgaben **byte-gleich**.
- **Seite:** `npm run neu:schnittseite -- Schnellentlueftungsventil schnellentlueftungsventil "Schnellentlüftungsventil"`, abgeleitet vom Wechselventil; alle `TODO(schnellentlueftungsventil)` ersetzen. Wiederverwendet: alles aus `figur/schnittteile.mjs`, `figur/schnittseite.mjs`, `normteile.mjs` (`NT.verschraubung` mit `D.muffe` für Zapfen 2), `luft.mjs`, `explode.mjs`, `legende.mjs`, `bedienung.mjs`, gemeinsamer Prüfer `figur/tests/tools/pruefe-schnitt.mjs`.
- **Nicht neu bauen, wenn schon da:** die Hilfen für „Drehkörper im Halbschnitt" und die Muffe stehen seit dem Rückschlagventil (siehe die Lehren in `schnittseite.md`). Was dabei in `figur/` verallgemeinert wird (z. B. `bildPunkt`, `zuMm`, die Entlüftungsrichtung der Teilchen, senkrechter Körper), steht in `figur/`, nicht im Bauskript; jede Änderung an `figur/` lässt die sechs anderen Seiten byte-gleich.

## 6. Die Figur

- **Körper:** Drehkörper Ø33 (oben, B2 30 hoch) auf Ø29 (unten), **senkrechte Achse**, **Längsschnitt** in der Mittelebene (Halbblock, Schnittton aus dem Hohlraum-Raster); Zapfen 2 links mit Sechskant; Stutzen 1 unten (B4 9,5, Innengewinde); Entlüftung 3 oben, offen.
- **Innen (nachgezeichnet nach dem Katalogschnitt):** Raum unter der Manschette (Zuluft 1), **Sitzring** im Gehäuse, **Manschette** (schwarz, NBR; Scheibe mit nach außen aufgeweiteten Lippen, **Hub überhöht**), darüber die **Entlüftungsdüse** (trichterförmiger Einsatz, Hals nach unten, **O-Ring** am Rand), darüber der **Schalldämpfer** (poröses Element, im Schnitt kreuzschraffiert, **angenommen**: Werkstoff) unter dem **Haltering** (Sprengring). Der **Ringraum um den Düsenhals** verbindet Manschette, Seitenbohrung (2) und Düse (3).
- **Teile außen zuerst (Legende, 8):**
  01 Anschluss 2 links (Steckverschraubung als Muffe, mit Schlauch) · 02 Anschluss 1 unten (Steckverschraubung, mit Schlauch) · 03 Haltering (klein, fährt mit 04, eigene Nummer, Fallstrick 2) · 04 Schalldämpfer · 05 O-Ring der Düse (klein, fährt mit 06, eigene Nummer) · 06 Entlüftungsdüse (Einsatz) · 07 Manschette · 08 Gehäuse mit Sitzring.
  Jeder Satz 2–3 Sätze (was es ist, was es tut, worauf man achtet); Katalogwerte, Ableitungen und Annahmen getrennt („im Modell", „angenommen", „nachgezeichnet", „überhöht"). Die Muffe/Zapfen-Zuordnung steht als **angenommen** (nicht aus dem Datenblatt) im Text; der echte Einsatz (der Zapfen 2 wird in den Zylinder oder in einen Anschluss geschraubt, hier steht eine Verschraubung) steht in Legende und README.
- **Zerlegen:** je Verschraubung eigener Fluchtweg (2 nach −x, 1 nach −z, jeweils mit Vortrieb zum Betrachter), der Schalldämpfer mit dem Haltering nach oben (+z), dann die Düse mit O-Ring nach oben, die Manschette nach vorn durch den Schnitt (Reihenfolge nach Messung), das Gehäuse bleibt. Ansicht nutzt die Zeichenfläche; Nummern nur auf eigenen Teilen.

## 7. Luft und Farben

- **Raumfarben nach Druck** (nie nach fester Seite): Zuluftraum unter der Manschette und Anschlussleitung 1 nach `p1`; Ringraum, Seitenbohrung und Anschlussleitung 2 nach `p2`; Düsenhals und Raum über der Manschette folgen `p2`, solange 2 → 3 offen ist, sonst Umgebung. Kräftig = hoher Druck, blass = drucklos; 6 bar gegen 0 bar gemessen ≥ 2,4:1 (gemeinsamer Prüfer, beide Modi).
- **Teilchen** nur auf Wegen mit Durchfluss: beim **Belüften** von unten durch den Sitz, an der Manschette vorbei in den Ringraum und nach links in die Seitenbohrung (Richtung 1 → 2, auf dem Weg nie über Material); beim **Entlüften** vom Zapfen/Ringraum durch die Düse und den **Schalldämpfer nach oben ins Freie** (Richtung 2 → 3, Abluftton, am Austritt verblassend); **nie** bei Stellung Mitte; Dichte nach Durchfluss; Schlauchströme enden vor den Verschraubungsringen.
- **Gesperrte Seite sichtbar:** bei Entlüften liegt die Manschette sichtbar **auf dem Sitz** (Lage in px), bei Belüften **an der Düse**; die Räume haben verschiedene Töne.

## 8. Texte (Erklärtext unter der Figur)

Vier Absätze: (1) Aufbau und Wirkung: Manschette zwischen Eingang 1 und Düse 3, Belüften über die Lippen, Entlüften über Düse und Schalldämpfer; Schalldruckpegel 95 dB(A) (Datenblatt). (2) **Wahrheitstabelle als echte HTML-Tabelle**: p1 > p2 → Manschette oben, 1 → 2 frei, 3 zu; p1 < p2 → Manschette unten, 1 zu, 2 → 3 frei (Luft entweicht bis p2 = p1); p1 = p2 → Mitte, beide zu (Werte als „im Modell" gekennzeichnet). (3) Wozu: kurze Entlüftungswege am Zylinder, hohe Geschwindigkeit, Schalldämpfer, Einbau **direkt am Zylinder**; der Text sagt nicht, dass die Entlüftung schneller als jede andere sei. (4) Abgrenzung: Wechselventil, Drosselrückschlagventil (Seiten verlinkt); Einbaulage beliebig (Datenblatt). Keine Zahl mit sechs oder mehr Nachkommastellen im sichtbaren Text (Test).

## 9. Abnahmekriterien (messbar, in den Prüfungen)

1. Teile und Legende stimmen mit §6 überein, jede Nummer sitzt auf einem eigenen Teil; kleinste Baugruppe ≥ 30 px oder fährt mit eigener Nummer.
2. Manschette in px je Zustand: **oben** ≥ 3 px über der Lage „unten", **unten** auf dem Sitz, **Mitte** dazwischen (Zwischenlage bei p1 = p2 nach Umstellung); jeder Zustand im Browser gemessen.
3. Raumfarben nach §7 und Kontrast ≥ 2,4:1 in beiden Modi (gemeinsamer Prüfer, `kontrast`).
4. Teilchen: keine bei Mitte; beim Belüften nur auf den Luftwegen von 1 nach 2, beim Entlüften von 2 nach 3 (Austritt über dem Schalldämpfer); nie über Material (gemeinsamer Prüfer, `luftwege`; eine neue Richtung gehört in den gemeinsamen Prüfer, mit RED-Probe an jeder Seite, die ihn nutzt).
5. Anzeige: Zahlen aus dem Modell (960 l/min bei Δp = 1 bar belüften, 1100 l/min bei Δp = 1 bar entlüften, 2300 l/min bei 6 → 0 bar, 0 in Mitte); bricht um und liegt bei 390 px im Fenster, Hinweiszeile und Anzeige überlappen sich bei 1280 px nicht.
6. Automatik: acht Schritte; **nach „1 auf 0" geht 2 auf 0, nach „1 auf 1 bar" geht 2 auf 1 bar, nicht auf 0** (im Browser gemessen).
7. Zerlegen beendet die Automatik, bewegtes Teil (Manschette) kehrt zurück, nichts strömt; Annahmen als „angenommen/nachgezeichnet/überhöht" im Text.
8. Jede neue seitenspezifische Prüfung mit RED-Probe; keine festen Wartezeiten; **jeder Timeout in `warteModell`/`warteSeite` ist ein benannter Fehler** (nie `.catch(() => {})`).
9. **Lehren vom Rückschlagventil** (siehe `schnittseite.md`): Zahlen im Text runden, kein Fließkommarest; Katalogfakt und Annahme getrennt; Lauf unter Last (`taskset -c 0` plus Last) einmal vor „fertig"; „Pfeilrichtung" nur, wenn ein Pfeil zu sehen ist; die Legendenreihenfolge „außen zuerst"; Bauskript möglichst unter 400 Zeilen (Ziel zuletzt verfehlt: 594): `bildPunkt`/`zuMm`/`TABELLE_CSS` zuerst nach `figur/schnittseite.mjs` verschieben, wenn die Seite sie braucht.

## 10. Prüfen

Der Weg ist das Tor: `npm run gate -- Schnellentlueftungsventil` (Test, Audit, Zerlegen, Neubau mit `git diff`, Linien, Browser × 5), vorher alle `TODO(schnellentlueftungsventil)` ersetzt, Marke `.generiert.json` gelöscht, `index.html` mit `git add -f`. Abschluss-Review mit 12 Läufen (einer unter Last), Texte als Lehrer des ersten Lehrjahrs, alle anderen Seiten unverändert (`gate:alle`).

## 11. Nicht im Umfang

SE-Ausführung ohne Schalldämpfer als eigene Variante, SEU-NPT, Hydraulik, Schaltungsbeispiel mit Zylinder und Steuerventil, Schalldruckmessung. Zweidruckventil folgt als eigene Seite, nur auf Ihr Go.
