# Auftrag klären

Höchstens **10 Fragen**, in einem Rutsch (AskUserQuestion, bis zu 4 je Aufruf), jede mit der **Empfehlung als erster Antwort**. Gefragt wird nur, was die Festlegungen in `SKILL.md` offenlassen. Bilder des Nutzers (Schnittbilder, Explosionszeichnungen mit Stückliste, Symboltabellen) sind Vorlage für Bauteilwahl und Legende, nicht zum Abzeichnen.

## Auftragskarte

Wenn diese Karte gefüllt ist, kann gebaut werden:

```
Fach:          <Pneumatik | Hydraulik | Elektro | Mechanik | …>
Erstes Bauteil: <z. B. doppeltwirkender Zylinder>  + was es braucht, um zu arbeiten (Ventil, Pumpe, Schalter)
Zeigen:        <Medium strömt | Zerlegen | beides>
Bedienen:      <Schalten von Hand | Automatik | beides>
Anzeige:       <welche Größen, aus welcher Formel>    z. B. F = p · A, Druck als Schieber
Maße:          <Norm und Baugröße>                    z. B. ISO 15552, Ø 50, Hub 200
Übersicht:     <Rubriken und je Rubrik die Kacheln>
Symbole:       <jetzt | später (Platz freihalten) | nie>
Seiteninhalt:  <Figur + Erklärtext | zusätzlich Aufgaben>
Repo:          <wo die Daten liegen>, was aus anderen Repos übernommen wird
```

## Fragenkatalog

| # | Frage | Empfehlung | Warum sie zählt |
|---|---|---|---|
| 1 | Welches Bauteil zuerst, und womit arbeitet es zusammen? | Bauteil **plus** sein Stellglied (Zylinder + 5/2-Wegeventil) | Ohne Stellglied gibt es keine Ursache für die Bewegung, und das Medium hat keinen Weg |
| 2 | Medium strömen lassen, zerlegen, oder beides? | Beides | Funktion und Aufbau sind die zwei Fragen jedes Azubis |
| 3 | Wie wird bedient? | Schalten von Hand + Automatik | Von Hand für die Erklärung, Automatik für den Beamer im Hintergrund |
| 4 | Welche Zahlen soll die Seite zeigen? | Eine Kerngröße mit Formel und ein Schieber für die Ursache (Kraft und Druck) | Jede Zahl braucht ein Modell; weniger Zahlen, die stimmen |
| 5 | Welche Norm, welche Baugröße? | Die gängigste Baugröße der Ausbildung | Echte Millimeter; Katalogwerte machen das Modell prüfbar |
| 6 | Welche Rubriken und Kacheln auf der Übersicht? | Nach Funktion gruppiert (Aktoren, Ventile, Versorgung …), 4–6 Kacheln je Rubrik | Die Übersicht ist der Lehrplan; geplante Kacheln zeigen, wohin es geht |
| 7 | Schaltzeichen/Symbole auf den Kacheln? | „Später" – Platz freihalten (`sinnbild`) | Symbole sauber nach Norm zu zeichnen ist ein eigener Durchgang |
| 8 | Leere Rubriken für später (z. B. E-Pneumatik)? | Anlegen, leer lassen | Zeigt den Ausbau, kostet nichts |
| 9 | Was wird aus anderen Repos übernommen? | `shared/` kopieren, Hell/Dunkel- und Kontrastschlüssel teilen, eigene Schlüssel mit Präfix | Gleiches Gefühl über Seiten auf derselben Domain |
| 10 | Nur Figur und Text, oder auch Aufgaben? | Figur + Erklärtext | Aufgaben brauchen Didaktik und Lösungen – eigener Auftrag |

## Nach den Antworten

1. Machbarkeit prüfen und **sagen**, was nicht geht (z. B. „das Kit kann keine Teilkreis-Drehteile → Schnitt über ein Clip-Fenster").
2. Architektur festlegen. Die bewährte ist: gemeinsames `figur/` von Anfang an (die Naht in `SKILL.md`), nicht erst beim zweiten Bauteil herauslösen.
3. Spec schreiben (`docs/superpowers/specs/<datum>-<thema>-design.md`), bestätigen lassen, dann bauen.
