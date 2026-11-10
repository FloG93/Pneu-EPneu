# Einfachwirkender Zylinder

Ein Rundzylinder nach dem Vorbild **Festo ESNU-50-25-P-A** (Bohrung 50 mm, Hub 25 mm,
drückend, einfachwirkend) zusammen mit dem **3/2-Wegeventil**, das ihn ansteuert – als
isometrische Schnittzeichnung, in der die Druckluft sichtbar strömt.

Das Zylinderrohr ist über ein Fenster aufgeschnitten. Man sieht den Kolben, hinter ihm
die Druckkammer und vor ihm die **Rückstellfeder** um die Kolbenstange. Die Stange
schiebt einen Schlitten auf einer Schiene. Daneben stehen die beiden Schaltzeichen
nach ISO 1219-1: der Zylinder mit Federrückstellung und das Ventil mit Druckknopf.

## Was man tun kann

- **Taster halten**: Solange man den Knopf gedrückt hält, verbindet das Ventil 1 mit 2.
  Die Kammer hinter dem Kolben füllt sich im kräftigen Blau, der Kolben fährt gegen die
  Feder aus. **Loslassen**: Die Feder des Ventils stellt um, 2 ist mit 3 verbunden, die
  Kammer entlüftet, und die Feder des Zylinders schiebt den Kolben zurück – ohne dass
  Druckluft hilft.
- **Automatik** drückt den Taster von selbst im Takt.
- **Zeitlupe** (am Anfang 1/10): Ein Hub dauert in Wirklichkeit nur etwa 0,08 s
  (aus, mit Umschalten des Ventils) und 0,11 s (zurück); erst in Zeitlupe sieht man, wie sich die Kammer füllt.
- **Druck** stellt den Betriebsdruck zwischen 2 und 8 bar ein.
- **Zerlegen und zusammenbauen** fährt die elf Baugruppen entlang der Achsen
  auseinander, hält kurz und setzt sie von innen nach außen wieder zusammen. Wer dabei
  den Taster hält, dessen Signal endet; die Automatik stoppt; nach dem Zusammenbau steht
  der Kolben eingefahren. Ein zweiter Druck oder Escape bricht ab.
- Ein Klick auf einen **Legendeneintrag** hebt die Baugruppe orange hervor.

## Die Farben der Luft

| Ton | Bedeutung |
| --- | --- |
| **kräftiges Blau** | Druckluft unter Druck, auf dem Weg in die Kammer hinter dem Kolben |
| **blasses Blau** | Abluft oder Umgebungsluft |

Die Federkammer ist **immer blass**: Sie ist über einen Filter im Zylinderkopf offen zur
Umgebung. Beim Ausfahren schiebt der Kolben ihre Luft hinaus, beim Einfahren saugt er
Luft herein; die Teilchen im Filter folgen der Kolbengeschwindigkeit. Die Töne sind
dieselben wie auf den anderen Seiten (gerechnet, nicht gewählt; siehe
`figur/tests/luft.test.mjs`).

## Die Zahlen

Alles, was die Anzeige nennt, kommt aus demselben Modell, das den Kolben bewegt
(`figur/pneumatik.mjs`, `ESNU_50_25`). Bei 6 bar:

```
A_Kolben = π/4 · 50²              = 1963,5 mm²     p · A = 0,6 N/mm² · 1963,5 = 1178 N
Feder:  82 N eingefahren, 105,3 N am Hubende (Rate 0,932 N/mm)
F_aus am Hubanfang  = 1178 − 82   = 1096 N
F_aus am Hubende    = 1178 − 105  = 1073 N   (Katalog: 1072,8 N)
bei 3 bar am Hubende: 589 − 105   =  484 N
F_ein (nur die Feder)             =   82 N
```

Die Anzeige rechnet mit der Feder an der Stelle, an der der Kolben gerade steht
(`F aus 1096 N = p · A − Feder jetzt 82 N`). Das sind **theoretische** Werte; die
Reibung der Dichtungen zieht in der Praxis 3 bis 10 Prozent ab. Das steht auch auf der
Seite.

## Neu erzeugen

```bash
npm run bau:zylinder-ew            # erzeugt index.html neu
npm run pruef:zylinder-ew          # Geometrie in Ruhe (--audit) und zerlegt (--apart)
npm run test:zylinder-ew           # Tests der Seite
```

```bash
CHROME_PATH=/opt/pw-browsers/chromium node .claude/skills/anatomy/scripts/lines.mjs Zylinder-Einfachwirkend/index.html
python3 -m http.server 8311 --bind 127.0.0.1   # in einem zweiten Fenster
npm run pruef:browser:zylinder-ew               # Browsertest, Server auf Port 8311 nötig
```

Der Browsertest läuft in beiden Modi. Er prüft zusätzlich zu den Prüfungen aller
Figuren, was nur dieser Zylinder verspricht, **gemessen an der Zeichnung**: gehalten
füllt sich Kammer A, die Federkammer bleibt zu jedem Zeitpunkt blass, die
Kolbengruppe wandert auf dem Bildschirm, die Feder wird zusammengedrückt (Kolbenende
folgt, Kopfende steht), losgelassen kehrt der Kolben schrittweise auf 0 zurück, die
Anzeige zeigt 1096 N, 1073 N und 484 N, und beim Zerlegen enden Signal und Automatik.

## Was die Figur nicht zeigt

**Aus dem Katalog** (Festo, Datenblatt 196383, ESNU-50-25-P-A): Kolbendurchmesser
50 mm, Hub 25 mm, Stangengewinde M16×1,5, Anschluss G¼, Federkraft 82 N bei
eingefahrener Stange, theoretische Kraft 1072,8 N beim Vorlauf mit 6 bar, bewegte
Masse des Zylinders 476 g, Betriebsdruck 1,2 bis 10 bar.

**Abgeleitet:** Die Federkraft am Hubende (105,3 N) und die Federrate (0,932 N/mm)
folgen aus dem Katalogwert 1072,8 N: 0,6 · 1963,5 − 1072,8 = 105,3 N; (105,3 − 82) / 25.

**Alles Übrige ist angenommen**, weil es für die Zeichnung oder das Modell gebraucht
wurde und nicht als Einzelmaß im Katalog steht:

- Kolbenstange Ø 20 mm (passt zu M16×1,5), Wandstärke des Rohrs 3 mm, Deckel 14 mm
  dick, Kolben 18 mm breit, Rohrlänge, Federdraht 3 mm, Windungszahl 8 und Länge der
  freien Feder (das Bild ist für die Sichtbarkeit gewählt, die Kräfte sind die des
  Katalogs)
- **Last 2,5 kg** bewegte Masse (Kolben, Stange und Schlitten zusammen)
- **Dichtungsreibung 40 N** und viskoser Anteil (80 N je m/s); die Grenze, ab der der
  Zylinder nicht mehr ausfährt, hängt daran: (82 + 40) / 1963,5 mm² ≈ 0,62 bar. Der
  Regler beginnt bei 2 bar, sie ist also nicht zu sehen.
- **Leitwerte** von Zuweg (3,5 · 10⁵ mm³/s je bar) und Abweg (10⁷ mm³/s je bar), Totraum
  6 mm, Schlauch- und Anschlussvolumen 11 cm³: sie sind so gestellt, dass ein Hub in
  Wirklichkeit 0,05 bis 0,15 s dauert und der Rückhub merklich länger als der Vorhub.
  Die Hubzeiten stehen nicht im Katalog.
- Schaltzeit des Steuerschiebers 25 ms mit 30 % Überdeckung

**Vereinfachungen im Modell:** Die Luft wird isotherm gerechnet, der Durchfluss ist ein
linearer Leitwert statt der Düsengleichung. Für die Anschauung stimmt das; für die
Auslegung einer Anlage ist es zu grob.

**Vereinfachungen in der Zeichnung:**

- Die **Deckel** sind beim echten Zylinder auf das Rohr **eingerollt**, nicht
  verschraubt. Die Figur zeichnet sie als Scheiben und zerlegt sie trotzdem, um ihre
  Teile zu zeigen.
- Die **Entlüftungsbohrung** im Kopf ist als Weg der Teilchen angedeutet, nicht als
  Bohrung durch den Schnitt.
- Der **Abstreifer und die Stangendichtung** im Kopf sind als Ring angedeutet.
- Die **Dämpfung** besteht beim Katalogtyp aus elastischen Ringen; die Figur zeigt nur
  die Pufferscheibe auf der Rückseite des Kolbens.
- Das **Ventil** ist wie auf der Seite des doppeltwirkenden Zylinders vereinfacht: ein
  Schieber mit Scheiben auf einer Grundplatte, Abluft nach unten. Wie es innen schaltet,
  zeigt die Seite des 3/2-Wegeventils.
- Das **Schaltzeichen des Druckknopfs** ist aus der Norm nachgezeichnet; der Halbkreis am
  Stummel steht für die Betätigung von Hand.
