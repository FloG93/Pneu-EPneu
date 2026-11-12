# Rückschlagventil – Entwurf

Stand: 2026-11-12. Siebtes Bauteil, dritte Seite der Rubrik „Sperr- und Stromventile", die erste mit den gebauten Werkzeugen (`npm run neu:schnittseite`, `npm run gate`), nach dem Skill `azubi-visualisierung` (`references/schnittseite.md`) mit den Festlegungen der Explosionsfigur (`CLAUDE.md`). Nutzerwunsch („leg los"): wie die letzten Seiten, gleiche Qualität, günstig gebaut. Keine Rückfragen; Entscheidungen sind aus Katalog und Datenblatt abgeleitet, die Lücke bei der Bauform steht offen in §2.

## 1. Ziel

Azubis sehen eindeutig, was ein Rückschlagventil tut und warum:

- **Eine Richtung frei, die andere gesperrt.** Von **1 nach 2** hebt der Druck den Ventilteller gegen eine schwache Feder vom Sitz ab, die Luft strömt durch den Ringspalt. Von **2 nach 1** drückt der Druck des Ausgangs den Teller **fester** auf den Sitz: Es strömt nichts zurück.
- **Öffnungsdruck:** Die Feder hält den Teller auf dem Sitz; erst ein Druckunterschied von **mehr als 0,1 bar** (1 größer als 2) öffnet. Darunter bleibt das Ventil zu, auch wenn vorn schon etwas Druck anliegt.
- **Der Druck hinter dem Ventil bleibt „eingesperrt":** Fällt der Druck bei 1 auf 0, schließt das Ventil, und der Ausgang 2 behält seinen Druck (Verbraucher bleibt gehalten), bis er anderweitig entlüftet wird.
- **Wozu:** Druck halten (Spannvorrichtung bei Druckabfall), Rückströmen verhindern (Behälter, Kompressor, zweiter Zweig), Grundbaustein von Drossel- und Wechselventil.

Gelungen ist die Seite, wenn jemand nach vier Schritten (Druck an 1 anlegen, Druck wegnehmen, Ausgang entlüften, gegen den Sperrdruck von 2 her drücken) erklären kann, warum der Teller offen oder zu ist und warum der Druck an 2 stehen bleibt.

## 2. Quellenkarte (geprüft)

| Quelle | Aussage | Status |
|---|---|---|
| Festo Datenblatt **11689** (H-1/4-B), `ftp.festo.com/…/DataSheet/DE_DE/11689.pdf`, gelesen | Rückschlagfunktion, G1/4 an 1 und 2, **einschraubbar**, 0,4 … 12 bar, **1000 l/min** (1 → 2, 6 → 5 bar), Gehäuse Aluminium-Knetlegierung eloxiert, Dichtungen **NBR**, **25,4 g**, max. Anziehdrehmoment **11 Nm**, Einbaulage beliebig, geölter Betrieb möglich | **belegt** |
| Festo Katalog **H/HA/HB** 2021/10, `…/Documentation/2021/DE/H-HA-HB_DE.PDF`, S. 4–5, Bild angesehen | Maße H-1/4-B: **L1 48, L2 32, L3 8, Schlüsselweite 19 mm**; Dichtring für Außengewinde im Lieferumfang; Bild: **Sechskantkörper** mit **Außengewinde und blauem Dichtring** an einem Ende, **Innengewinde** am anderen; Schaltzeichen: **Kugel auf Sitz mit Feder** (ISO 1219-1, Rückschlagventil mit Feder) | **belegt** |
| Festo Katalog, Steckanschluss-Reihe H-QS (S. 3) | Mindest-Differenzdruck **öffnen > 0,1 bar**, schließen > 0,2 bar | **belegt für die Schwesterreihe**, für H-1/4-B **übernommen (Annahme)** |
| Legris „Non-Return Valves" (Katalogseite, Schnitt der Steckausführung angesehen) | Rückschlagventile gibt es auch mit **Elastomerhülse**; die Steckausführung ist **keine** Vorlage für die G-Ausführung | **nur Abgrenzung** |
| **Funktionsschnitt der H-…-B** | **nicht gefunden**: das Datenblatt und der Katalog zeigen keinen Schnitt; Wikimedia (Commons) lieferte nach der Drosselung durch den Dienst kein Bild (`Brass-Spring-Check-Valve…` – zerlegtes Tellerrückschlagventil – ist als Kandidat vermerkt, noch nicht angesehen) | **offen** |

**Folge:** Die Figur heißt in README und Erklärtext **„nachgezeichnet nach dem Funktionsprinzip des Tellerrückschlagventils mit Feder (Schaltzeichen, Datenblatt, Katalogmaße)"**. Innenmaße, Tellerform und die Zerlegbarkeit in der Zeichnung sind **Annahmen**. Findet der Controller vor der Freigabe der Geometrie einen echten Schnitt (Wikimedia, Katalog), wird die Geometrie danach korrigiert, bevor die Seite erscheint; Texte tragen bis dahin „angenommen"/„nachgezeichnet".

## 3. Abgeleitete Entscheidungen

| Thema | Entscheidung |
|---|---|
| Vorbild | **Festo H-1/4-B** (Zahlen, Außenmaße); Innenaufbau nach Funktionsprinzip |
| Darstellung | Nur das Ventil, **groß** (≥ 80 % der Zeichenbreite), im **Längsschnitt** (vordere Hälfte abgenommen); Körper **waagerecht**, Anschluss **1 links**, **2 rechts**; der **Sechskant wird als Zylinder gezeichnet** (vereinfacht, steht in der README); links und rechts je **Steckverschraubung mit kurzem Schlauch** (wie die anderen Seiten) |
| Bedienung | Regler **Druck am Eingang 1** (0 … 8 bar, Schritt 0,5, Start 0), Knopf **„Ausgang 2 entlüften"** (hält, solange gedrückt/eingeschaltet), **Automatik**, Zeitlupe, Zerlegen, Kontrast. Automatik läuft beim Laden (außer bei reduzierter Bewegung) |
| Automatik | 8 Schritte à 3 s: **1 auf 6 bar** (Teller öffnet, 2 füllt sich) → **halten** → **1 auf 0** (Teller schließt, 2 bleibt auf ~6 bar) → **halten** (Sperrung zeigen) → **1 auf 3 bar** (3 < 6: Teller bleibt zu, nichts strömt zurück) → **halten** → **Ausgang 2 entlüften** (2 fällt auf 0) → **halten**. Zeigt Öffnen, Halten und Sperren in einem Zyklus |
| Anzeige | Zeile 1: `Eingang 1 … bar · Ausgang 2 … bar · Δp … bar`. Zeile 2: `Teller offen/zu · Durchfluss … l/min`. Umbrechbar, bei 390 px im Fenster |
| Schaltzeichen | ISO 1219-1 Rückschlagventil **mit Feder**, **mitschaltend**: Kugel hebt sich bei offenem Teller, durchströmter Weg gefärbt; Anschlussziffern 1 und 2 |
| Kachel | Rubrik „Sperr- und Stromventile", fertig, Marken „H-1/4-B", „G1/4", „sperrt eine Richtung"; eigenes Vorschaubild |
| Ordner / id | `Rueckschlagventil/`, id `rueckschlagventil` |
| Reihenfolge der Seiten | Rückschlagventil vor Schnellentlüftungs- und Zweidruckventil (einfachste Seite der Familie, Grundbaustein der übrigen) |

## 4. Belegt / abgeleitet / angenommen

| Größe | Wert | Herkunft |
|---|---|---|
| Anschlüsse | G1/4 (1 und 2) | **belegt** Festo 11689 |
| Normalnenndurchfluss 1 → 2 | 1000 l/min bei 6 → 5 bar (Δp = 1 bar) | **belegt** |
| Betriebsdruck | 0,4 … 12 bar (Seite: Regler 0 … 8 bar; das Modell läuft auch darunter) | **belegt** / Seite wählt 8 |
| Gehäuse, Dichtungen, Masse | Aluminium eloxiert, NBR, 25,4 g | **belegt** |
| Länge 48, Gewindelänge 8, Schlüsselweite 19 | | **belegt** Katalog |
| Öffnungsdruck | 0,1 bar | **Annahme** (Schwesterreihe H-QS) |
| Vollöffnung | Teller ganz offen ab Δp ≥ 0,5 bar (linear zwischen 0,1 und 0,5) | **Annahme** |
| Durchflusskennlinie | Q = qn · Öffnungsanteil · Δp / 1 bar (linear in Δp bis 1 bar, danach unbegrenzt linear für die Anzeige gekappt bei 2 · qn, Hinweis „Anzeige begrenzt") | **Annahme** (Katalog nennt nur den Normwert) |
| Schließen | Teller schließt, sobald Δp ≤ 0,1 bar; **Gegendruck** (p2 > p1) drückt ihn zu, Leckage 0 | **Annahme** (ideal dicht, steht in der README) |
| Schaltzeit Teller | 8 ms | **Annahme** |
| Volumen hinter 2 | 50 cm³ (Schlauch + Verbraucher) | **Annahme** |
| Entlüftung des Ausgangs | feste Entlüftungsblende, Zeitkonstante ~1 s | **Annahme** |
| Innenmaße (Bohrung Ø 9, Tellerdurchmesser Ø 8 × 6, Sitz Ø 6, Feder Ø 7 × 12 frei, Tellerhub 3 mm, überhöht), Aufbau aus Gehäuse + Sitzeinsatz | | **Annahme**, nachgezeichnet |

## 5. Architektur

- **`figur/rueckschlagventil.mjs` (neu, Rechenmodell, fünfte Ausnahme neben `pneumatik/ventil/stromventil/wechselventil`):** reine Funktionen. `H_1_4 = { qn: 1000, bezugsDp: 1, oeffnungsdruck: 0.1, vollDp: 0.5, schaltzeit: 0.008, volumen2: 50000, hub: 3, … }` mit Herkunft je Zeile. `neuerZustand()` → `{ h, p1, p2 }` (`h` 0 = Teller auf Sitz, 1 = ganz offen), `schritt(z, masse, dt, { p1, entlueften })`: Soll-Hub aus Δp (nur bei p1 > p2 + Öffnungsdruck), `h` folgt mit Schaltzeit; `p2` folgt über `kammerSchritt` (aus `figur/ventil.mjs`) nur bei offenem Teller, entlüftet mit der Blende; **geschlossener Teller führt nichts**. `durchfluss(…)` → l/min (nie negativ). `anzeigeZeilen(…)` baut beide Textzeilen **einmal** (Build und Seite nutzen sie). Herkunft jeder Konstante im Kommentar.
- **`figur/schaltzeichen.mjs`:** `rueckschlagventilSymbol({ feld })` + Laufzeit/CSS wie `wechselventilSymbol`; alle anderen Symbolausgaben byte-gleich.
- **Seite:** vom Generator angelegt (`npm run neu:schnittseite -- Rueckschlagventil rueckschlagventil "Rückschlagventil"`), abgeleitet vom Wechselventil; alle Stellen mit `TODO(rueckschlagventil)` ersetzt (siehe `grep -rn "TODO(rueckschlagventil)" Rueckschlagventil figur`). Struktur wie `Wechselventil/`.
- Wiederverwendet: alles aus `figur/schnittteile.mjs` und `figur/schnittseite.mjs`, `normteile.mjs`, `luft.mjs`, `explode.mjs`, `legende.mjs`, `bedienung.mjs`, gemeinsamer Prüfer `figur/tests/tools/pruefe-schnitt.mjs`.

## 6. Die Figur

- **Körper:** Zylinder (Sechskant vereinfacht) Ø 19 × 48, **Längsschnitt** in der Mittelebene (Halbblock, Schnittton aus dem Hohlraum-Raster). Links **Innengewinde G1/4** (Anschluss 1, Steckverschraubung eingeschraubt), rechts **Außengewinde G1/4** (8 mm) mit **Dichtring (blau)** und eingeschraubter Steckverschraubung am Anschluss 2 (die rechte Verschraubung wird auf das Außengewinde aufgesetzt gezeichnet, siehe Implementer-Befund).
- **Innen:** Bohrung von links bis zum **Sitz** (Sitzeinsatz, eingepresst/eingeschraubt, Kegelsenkung Ø 6), dahinter die **Federkammer** mit **Ventilteller** (Metallkern mit **NBR-Dichtfläche**, zum Sitz hin gewölbt), **Druckfeder** (`druckfeder` aus `normteile.mjs`, Blocklängenprüfung) zwischen Teller und **Federanschlag** (Gehäusestufe), Luft strömt bei offenem Teller **im Ringspalt um den Teller** und durch Bohrungen der Stufe nach rechts.
- **Teile außen zuerst (Legende, 6):**
  01 Anschluss 2 rechts (Steckverschraubung mit Schlauch) · 02 Anschluss 1 links (Steckverschraubung mit Schlauch) · 03 Dichtring (Außengewinde; fährt mit 01, eigene Nummer, Fallstrick 2) · 04 Feder · 05 Ventilteller (Kern und NBR-Dichtfläche) · 06 Gehäuse mit Sitzeinsatz.
  Jeder Satz 2–3 Sätze (was es ist, was es tut, worauf man achtet); Katalogwerte, Ableitungen und Annahmen getrennt („im Modell", „angenommen", „nachgezeichnet", „überhöht").
- **Zerlegen:** je Verschraubung eigener Fluchtweg (links −x, rechts +x, mit Vortrieb zum Betrachter), Feder und Teller nach vorn durch den Schnitt (Teller zuerst, sonst die Feder zuerst – Reihenfolge nach Messung), Dichtring mit der rechten Verschraubung; Gehäuse bleibt. Ansicht nutzt die Zeichenfläche; Nummern nur auf eigenen Teilen.

## 7. Luft und Farben

- **Raumfarben nach Druck** (nie nach fester Seite): linker Raum und Anschlussleitung nach `p1`, rechter Raum und Anschlussleitung nach `p2` (Volumen hinter dem Ventil, Verbraucher); die Federkammer folgt dem rechten Druck, der Raum vor dem Sitz dem linken. Kräftig = hoher Druck, blass = drucklos; 6 bar gegen 0 bar gemessen ≥ 2,4:1 (gemeinsamer Prüfer).
- **Teilchen** nur bei offenem Teller: von links durch den Sitz, im Ringspalt um den Teller, durch die Stufenbohrungen nach rechts; **nie** bei geschlossenem Teller (auch nicht bei Gegendruck); Dichte nach Durchfluss; nie über Material; Schlauchströme enden vor den Verschraubungsringen.
- **Gesperrter Zustand sichtbar:** bei p2 > p1 liegt der Teller sichtbar **fest** auf dem Sitz (Lage in px), die Räume haben verschiedene Töne.

## 8. Texte (Erklärtext unter der Figur)

Vier Absätze: (1) Aufbau und Wirkung: Teller, Sitz, Feder, Öffnungsdruck 0,1 bar (angenommen, Schwesterreihe belegt), Richtung 1 → 2 frei, 2 → 1 gesperrt; Hinweis auf den Pfeil/das Schaltzeichen. (2) **Wahrheitstabelle als echte HTML-Tabelle** (Δp > 0,1 bar: offen; Δp ≤ 0,1 bar: zu; p2 > p1: zu und zusätzlich gedrückt). (3) Wozu: Druck halten, Rückströmen verhindern, Bausteine in Drossel- und Wechselventil; Einbau in Pfeilrichtung beachten. (4) Abgrenzung: Drosselrückschlagventil (Seite verlinkt), entsperrbares Rückschlagventil (nicht Teil dieser Seite).

## 9. Abnahmekriterien (messbar, in den Prüfungen)

1. Teile und Legende stimmen mit §6 überein, jede Nummer sitzt auf einem eigenen Teil; kleinste Baugruppe ≥ 30 px oder fährt mit eigener Nummer.
2. Tellerlage in px je Zustand: offen (Δp ≥ 0,5 bar) ≥ 3 px vom Sitz, zu auf dem Sitz; bei 0,3 bar Zwischenlage; bei Gegendruck auf dem Sitz.
3. Raumfarben nach §7 und Kontrast ≥ 2,4:1 in beiden Modi (gemeinsamer Prüfer, `kontrast`).
4. Teilchen: keine bei geschlossenem Teller; bei offenem nur auf den Luftwegen, Richtung 1 → 2, nie über Material.
5. Anzeige: Zahlen aus dem Modell (1000 l/min bei Δp = 1 bar, 0 l/min bei zu); bricht um und liegt bei 390 px im Fenster.
6. Automatik: acht Schritte; 2 bleibt nach „1 auf 0" auf seinem Druck (Haltezustand im Browser gemessen), fällt erst beim Entlüften.
7. Zerlegen beendet die Automatik, Teile kehren zurück; Annahmen als „angenommen/nachgezeichnet/überhöht" im Text.
8. Jede neue seitenspezifische Prüfung mit RED-Probe; keine festen Wartezeiten.

## 10. Prüfen

Der Weg ist das Tor: `npm run gate -- Rueckschlagventil` (Test, Audit, Zerlegen, Neubau mit `git diff`, Linien, Browser × 5), vorher alle `TODO(rueckschlagventil)` ersetzt, Marke `.generiert.json` gelöscht, `index.html` mit `git add -f`. Abschluss-Review mit 12 Läufen (einer unter Last), Texte als Lehrer des ersten Lehrjahrs, alle anderen Seiten unverändert (`gate:alle`).

## 11. Nicht im Umfang

Entsperrbares Rückschlagventil, Rückschlagventil mit Elastomerhülse (Steckausführung), Sechskant als echte Fläche, Hydraulik-Rückschlagventil, Schaltungsbeispiel mit Zylinder und Zweidruckventil.
