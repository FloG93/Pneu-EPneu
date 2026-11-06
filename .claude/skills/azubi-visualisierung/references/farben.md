# Medientöne wählen und messen

Das Medium ist das **einzige**, was in der Figur Farbe tragen darf. Alles andere sind die Grautöne des Kits; Orange ist für die Hervorhebung reserviert.

## Regeln

1. **Ein Farbton, zwei Helligkeiten.** Kräftig = unter Druck / aktiv / Vorlauf. Blass = entspannt / Abluft / Rücklauf / stromlos. Der Unterschied muss in der **Helligkeit** liegen, damit er rot-grün-blind und im Schwarzweißdruck trägt.
2. **Kräftig ist im Hellen dunkel, im Dunkeln hell.** Die Bedeutung bleibt, die Helligkeit folgt dem Grund – wie alle Töne des Kits. Darum steht im Text „kräftiges Blau", nie „dunkelblau".
3. **Kein Orange, kein Rot neben Orange.** Die Hervorhebung ist Hausorange; ein oranges Medium wäre eine ausgewählte Baugruppe.
4. **Gemessen, nicht angesehen.** Die Tests in `figur/tests/luft.test.mjs` und `figur/tests/kacheln.test.mjs` sind die Wahrheit:

| Prüfung | Schwelle |
|---|---|
| jeder Ton gegen Papier (`#f4f4f1` hell, `#121212` dunkel) | ≥ 3:1 |
| kräftig gegen blass | ≥ 2:1 |
| Unterschied der relativen Leuchtdichte | > 0,12 |
| kräftig ist im Hellen dunkler, im Dunkeln heller | Richtung stimmt |

## Das Fenster ist schmal

Im hellen Modus muss der **blasse** Ton dunkel genug fürs Papier (3:1) und trotzdem hell genug für den Abstand zum kräftigen Ton sein. Für Petrol (`#0b5d5a`) gab es zwischen `#4f9693` (3,12 : 1 gegen Papier, 2,24 : 1 gegen kräftig) und `#4a8f8c` (Abstand nur noch 2,05 : 1) kaum Spielraum. Darum:

```bash
node --input-type=module -e '
const { kontrast, leuchtkraft, PAPIER } = await import("./figur/luft.mjs");
const stark = "#0b5d5a";
for (const c of ["#5fa3a0", "#4f9693", "#4a8f8c"]) console.log(c,
  kontrast(c, PAPIER.light).toFixed(2), kontrast(c, stark).toFixed(2),
  (leuchtkraft(c) - leuchtkraft(stark)).toFixed(3));'
```

Kandidaten rechnen, den ersten nehmen, der alle Schwellen hält. **Nie die Schwelle senken.**

## Erprobte Paare

| Medium | Modus | kräftig | blass | Rand |
|---|---|---|---|---|
| Druckluft (Blau) | hell | `#123f87` | `#5a8cbf` | `#0b2a5c` |
| | dunkel | `#7cb8f5` | `#3f6e9e` | `#bcd9f7` |
| Hydrauliköl (Petrol) | hell | `#0b5d5a` | `#4f9693` | `#06403e` |
| | dunkel | `#7fd6cf` | `#3a7d78` | `#c4efeb` |

Die Töne stehen in `figur/luft.mjs` unter `FARBEN` mit den Schlüsseln `druck` (kräftig) und `abluft` (blass) – unabhängig vom Medium; `anlegen.mjs` trägt sie aus `projekt.json` ein. Die Übersicht übernimmt sie über `SEITE.toene` für die Kachelbilder (`v-stark`, `v-blass`).
