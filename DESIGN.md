# FlugDeck Gestaltung

**Cockpit-Linkspanel.** Das Panel folgt dem Dashboard-Schema Status → Kennzahlen → Details → Systemzeile.

- **Status:** Eine Flugbuch-Karte nennt den Zustand und seit wann geflogen wird. Ohne Flug zeigt sie den letzten Flug.
- **Kennzahlen:** Vier Kacheln zeigen Höhe, Geschwindigkeit, Steigen/Sinken und die Entfernung zum Startpunkt. Die Zahlen sind groß und tabellarisch gesetzt, die Einheit klein und gedämpft. Während eines Flugs zeigen Höhe und Geschwindigkeit darunter ihr Maximum in Akzentfarbe.
- **Details:** Position und Flugsteuerung als Werteliste.
- **Systemzeile:** Sie steht am Ende, abgesetzt durch eine Linie. Sie zeigt den Backend-Status mit Version, Uhrzeit und Antwortzeit. Die Prüfung ist eine sekundäre Aktion mit Umrandung, mindestens 44 px hoch und während der Prüfung gesperrt.

**Project-Flugbuch.** Die Seite folgt dem Muster List/Index:

- Kopf mit der Aktion „Liste aktualisieren“
- beschriftete Suche
- Liste in einem L1-Rahmen mit Trennlinien

Die Flüge stehen neueste zuerst; aktive Flüge sind türkis markiert. Ohne Einträge erklärt der Leerzustand, wie Flüge entstehen. Findet die Suche nichts, bietet ein Leerzustand „Suche zurücksetzen“ an.

**Plan-Notiz.** Ein beschriftetes Textfeld mit Zeichenzähler, höchstens 200 Zeichen. Ist die Notiz zu lang, erscheint der Hinweis erst nach dem Verlassen des Felds und verschwindet sofort, sobald sie kurz genug ist. Ohne Formularkontext ist das Feld gesperrt.

**Farben.** Die Farben sind Tailwind-Tokens, aufgeteilt nach 60-30-10:

- Fläche: slate-900
- Kacheln und Listen: slate-800 mit 1-px-Rahmen in slate-700
- Text: slate-100
- Sekundärtext: slate-400
- Akzent für Erfolg, laufende Protokollierung und Fokus: teal-300
- laufende Prüfung: amber-300
- Fehler: rose-300

Jeder Zustand hat zusätzlich eine Textbezeichnung. Fehlende Werte erscheinen als „—“. Radien: 6 px für Bedienelemente, 8 px für Flächen. Übergänge dauern höchstens 150 ms und entfallen bei `prefers-reduced-motion`.

**Raster.** Schriftgrößen 24 (Kennzahlen) / 16 / 14 / 12 px, Stärken 400 / 500 / 600. Die Zeilenhöhe beträgt 1,5 für Text und 1,25 für Überschriften. Abstände folgen dem 4er-Raster, Abschnitte dem 8er-Raster.

**Fehlermeldungen** nennen den nächsten Schritt.

**Darstellung.** Zahlen verwenden tabellarische Ziffern im deutschen Format. Lange Texte brechen innerhalb der Panelbreite um. Der Tastaturfokus bleibt sichtbar. Statuswechsel werden über eine Live-Region angekündigt.

**Gemeinsame Styles.** Die Farben liegen in `src/views/shared/theme.css`. Jede View bindet die Datei über `<style src>` ein, damit die Styles in ihrer eigenen ShadowRoot bleiben. Systemschriften und lokal ausgelieferte Assets halten die Views unabhängig von externen Ressourcen.
