# FlugDeck Gestaltung

**Cockpit-Linkspanel.** Das Panel beantwortet drei Fragen in fester Reihenfolge:

1. Läuft ein Flug, und wird er protokolliert?
2. Was meldet die Drohne gerade?
3. Antwortet das Plugin-Backend?

Die große Statuszeile gehört dem Flugbuch. Telemetrie und Backend folgen als Wertelisten. Die Backend-Prüfung ist die einzige Aktion. Ihr Button bleibt am Ende des Panels, ist mindestens 44 Pixel hoch und während der Prüfung gesperrt.

**Project-Flugbuch.** Die Seite folgt dem Muster List/Index:

- Kopf mit der Aktion „Liste aktualisieren“
- beschriftete Suche
- Liste in einem L1-Rahmen mit Trennlinien

Die Flüge stehen neueste zuerst; aktive Flüge sind türkis markiert. Ohne Einträge erklärt der Leerzustand, wie Flüge entstehen. Findet die Suche nichts, bietet ein Leerzustand „Suche zurücksetzen“ an.

**Plan-Notiz.** Ein beschriftetes Textfeld mit Zeichenzähler, höchstens 200 Zeichen. Ist die Notiz zu lang, erscheint der Hinweis erst nach dem Verlassen des Felds und verschwindet sofort, sobald sie kurz genug ist. Ohne Formularkontext ist das Feld gesperrt.

**Farben.** Die Fläche ist schiefergrau (#182128), der Primärtext hell (#edf3f5). Die Zustände haben je eine Farbe:

- Türkis: Erfolg und laufende Protokollierung
- Ocker: laufende Prüfung
- Apricot: Fehler

Jeder Zustand hat zusätzlich eine Textbezeichnung. Fehlende Werte erscheinen als „—“.

**Raster.** Schriftgrößen 20 / 16 / 14 / 12 px, Stärken 400 / 500 / 600. Die Zeilenhöhe beträgt 1,5 für Text und 1,25 für Überschriften. Abstände folgen dem 4er-Raster, Abschnitte dem 8er-Raster.

**Fehlermeldungen** nennen den nächsten Schritt.

**Darstellung.** Zahlen verwenden tabellarische Ziffern im deutschen Format. Lange Texte brechen innerhalb der Panelbreite um. Der Tastaturfokus bleibt sichtbar. Statuswechsel werden über eine Live-Region angekündigt.

**Gemeinsame Styles.** Die Farben liegen in `src/views/shared/theme.css`. Jede View bindet die Datei über `<style src>` ein, damit die Styles in ihrer eigenen ShadowRoot bleiben. Systemschriften und lokal ausgelieferte Assets halten die Views unabhängig von externen Ressourcen.
