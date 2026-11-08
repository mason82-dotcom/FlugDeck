# FlugDeck 0.2.1 · Projektprüfung

Ausgangspunkt war `521e35b` mit 36 versionierten Dateien. Geprüft wurden Plugin-Einstieg, Vue-Panel, Handler, Manifeste, Build-Konfiguration, Tests, Sperrdatei, Dokumentation sowie die Paketstruktur und ZIP-Integrität der Versionen 0.1.0 und 0.2.0.

## Abhängigkeiten

Ergebnis von `pnpm audit --json` am 8. November 2026. Die Zahlen zählen gemeldete Advisories je Sperrdatei.

| Sperrdatei | Kritisch | Hoch | Mittel | Niedrig |
|---|---:|---:|---:|---:|
| FlugDeck 0.2.0 | 4 | 5 | 11 | 1 |
| FlugDeck 0.2.1 | 0 | 0 | 0 | 0 |
| DJI-Quellcheckout bei `f2947c9` | 4 | 7 | 28 | 8 |

Die vier kritischen Advisories betreffen Happy DOM, Vitest und zweimal Tinypool. In FlugDeck wurde der Test- und Build-Stack einschließlich Vue aktualisiert. Die separaten DJI-Abhängigkeiten dienen zum Bauen der SDK- und Toolchain-Pakete. Der erneute Scan ihres eigenen Lockfiles bleibt beim angegebenen Befund. Für die Bewertung einer neuen DJI-Version diesen Scan und die Plugin-Tests wiederholen.

[Happy DOM](https://github.com/advisories/GHSA-37j7-fg3j-429f) · [Vitest](https://github.com/advisories/GHSA-5xrq-8626-4rwp) · [Tinypool 1](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) · [Tinypool 2](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)

## Bedienzustand

Beim erneuten Prüfen war die Taste bereits gesperrt, während der letzte Erfolg mit der alten Backend-Version noch sichtbar sein konnte. Der Host meldet den neuen Zustand asynchron. Das Panel verwendet jetzt vom Klick bis zum Abschluss der Anfrage denselben sichtbaren Ladezustand für Status, Messwerte und Taste. Bei einem Fehler bietet es **Erneut prüfen** an.

## Geltungsbereich

Die Abnahme im realen FlightHub-2-Mandanten ist offen. Der Quellstand enthält keine Verarbeitung von WPML oder KMZ. DJIs gemeinsame WPML-Elemente betreffen Missionsdateien wie `template.kml` und `waylines.wpml`.

[DJI Common Elements](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dji-wpml/common-element.html)

## Verifikation

Die Neuinstallation mit gesperrten Abhängigkeiten, die DJI-Manifestprüfung, beide Typprüfungen und sieben automatisierte Tests waren erfolgreich. Der neue Regressionstest schlug vor der Panelkorrektur mit „Erreichbar“ statt „Prüfung läuft“ fehl. Im DJI-Mock-Cockpit wurden verzögerte Antwort, abgebrochener Aufruf, Acht-Sekunden-Timeout und erfolgreiche Wiederholung geprüft. Der Paketbau meldete `UPLOAD_READY`. Beide Plugin-Manifeste und das Frontend-Dist-Manifest tragen Version 0.2.1.
