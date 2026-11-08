# FlugDeck Gestaltung

**Cockpit-Linkspanel.** Das Panel beantwortet drei Fragen in fester Reihenfolge:

1. Läuft ein Flug, und wird er protokolliert?
2. Was meldet die Drohne gerade?
3. Antwortet das Plugin-Backend?

Die große Statuszeile gehört dem Flugbuch. Telemetrie und Backend folgen als Wertelisten. Die Backend-Prüfung ist die einzige Aktion. Ihr Button bleibt am Ende des Panels, ist mindestens 44 Pixel hoch und während der Prüfung gesperrt.

**Project-Flugbuch.** Die Seite zeigt die Flüge des Projekts, neueste zuerst. Aktive Flüge sind türkis markiert. Ohne Einträge steht dort ein Satz, wie Flüge entstehen.

**Plan-Notiz.** Ein beschriftetes Textfeld mit Zeichenzähler, höchstens 200 Zeichen. Ohne Formularkontext ist es gesperrt.

**Farben.** Die Fläche ist schiefergrau (#182128), der Primärtext hell (#edf3f5). Die Zustände haben je eine Farbe:

- Türkis: Erfolg und laufende Protokollierung
- Ocker: laufende Prüfung
- Apricot: Fehler

Jeder Zustand hat zusätzlich eine Textbezeichnung. Fehlende Werte erscheinen als „—“.

**Darstellung.** Zahlen verwenden tabellarische Ziffern im deutschen Format. Lange Texte brechen innerhalb der Panelbreite um. Der Tastaturfokus bleibt sichtbar. Statuswechsel werden über eine Live-Region angekündigt.

**Gemeinsame Styles.** Die Farben liegen in `src/views/shared/theme.css`. Jede View bindet die Datei über `<style src>` ein, damit die Styles in ihrer eigenen ShadowRoot bleiben. Systemschriften und lokal ausgelieferte Assets halten die Views unabhängig von externen Ressourcen.
