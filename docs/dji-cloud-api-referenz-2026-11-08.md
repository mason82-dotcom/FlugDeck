# DJI Cloud API: aktueller Referenzstand für FlugDeck

Stand: 8. November 2026. Ausgangspunkt ist der [Cloud-API-Tutorial-Einstieg](https://developer.dji.com/doc/cloud-api-tutorial/en/). Der Web-Einstieg liefert beim direkten Abruf keine lesbaren Inhaltszeilen; für die Versionsbestimmung wurden die indizierten [offiziellen chinesischen Versionshinweise](https://developer.dji.com/doc/cloud-api-tutorial/cn/) und die verlinkten thematischen DJI-Seiten verwendet. Keine Verbindung zu Geräten oder einem Zielmandanten wurde getestet.

## Versionsbestimmung

- Der jüngste auffindbare Eintrag im Tutorial ist **Cloud API v1.18 vom 13.10.2026**. Die englische DJI-Entwickler-Startseite zeigt noch v1.14.0 vom 15.04.2025; sie ist für diese Versionsfrage erkennbar nicht gleich aktuell. Eine v1.19 ist dort nicht belegt.
- v1.18 ergänzt Protokolle für die O4-Bodenstation im Roaming-Basisstationsmodus, einschließlich Gerätestatus/Eigenschaften, Remote-Debugging, Logs, Firmware und angebundener RID- beziehungsweise Kamera-Untergeräte. Hinzu kommen O4-Luftraumdaten via RID, FTS-Protokolle für Dock 3 und Einstellungen für Kameraaufnahmequalität bei Dock 2/3.
- DJI nennt für die neuen O4-Funktionen als Mindest-Firmware 17.02.05.33, für Dock 3 und zugehöriges Fluggerät 17.07.04.01. Dies ist keine globale Freigabe aller Funktionen für jedes Modell; die jeweilige Produkt-/Feature-Tabelle ist maßgeblich.
- [Cloud API 2](https://developer.dji.com/cloud-api-2/) ist eine **separate Produktlinie** mit eigenem PaaS-Unterbau, Backend-SDK und eigenständigen Frontend-Komponenten. Das [offizielle Repository](https://github.com/dji-sdk/Cloud-API-2) beschreibt diese Linie. Eine gleichlautende Ziffer „2“ macht sie weder zur FlightHub On-Premises OpenAPI V2.0 noch zum FlightHub-2-Plugin-SDK.

## Architekturabgleich

| Zugang | DJI-System und Protokoll | FlugDeck 0.2.1 |
| --- | --- | --- |
| [Cloud API Tutorial](https://developer.dji.com/doc/cloud-api-tutorial/en/overview/product-architecture.html) | DJI Pilot 2 oder Dock verbinden Gateways mit einer **eigenen Drittanbieter-Cloud** über MQTT, HTTPS und WebSocket; ein eigener Server und teils Objektspeicher sind nötig. Das Pilot-Webview verwendet JSBridge. | Kein MQTT-Broker, keine Pilot-Cloud-Anbindung, keine Cloud-API-v1-Topics oder Thing-Model-Bindung. |
| [FlightHub On-Premises OpenAPI V2.0](https://fh.dji.com/user-manual/de/custom-development/open-api/private-cloud-v2.html) | REST-API an eine **bestehende FlightHub-2-On-Premises-Instanz**, überwiegend mit Token und Projekt-UUID. | Kein OpenAPI-Client. |
| [FlightHub-2-Plugin-SDK](https://github.com/dji-sdk/FlightHub-2-Plugin) | Plugin innerhalb des FlightHub-Hosts; Erweiterungspunkte und Host-Gateway. | Der bestehende Cockpit-Statushandler nutzt nur `ctx.apiCall('/plugin/invoke')`. |
| [Cloud API 2](https://developer.dji.com/cloud-api-2/) | Separater Stack mit SDK, Komponenten und Simulation. | Nicht eingebaut. Eignung, Region, Lizenz, Infrastruktur und Kompatibilität separat untersuchen. |

Die Cloud-API-v1-Dokumentation eignet sich als Referenz für **SkyHub-Next oder einen künftigen eigenständigen Cloud-Adapter**. Aus ihren MQTT-Topics und JSBridge-Funktionen folgen keine FlightHub-Plugin-Berechtigungen oder OpenAPI-V2-Endpunkte. Insbesondere ist `/openapi/v2.0/drc/health` ein FlightHub-On-Premises-REST-Pfad und kein Cloud-API-v1-MQTT-Topic.

## Entwicklungsfolgen

1. Für FlugDeck bleibt der Plugin-Status eng als eigener Backend-Check bezeichnet. Eine zusätzliche Datenquelle benötigt einen benannten Adapter mit eigener Authentifizierung und einem klaren Mandanten- und Produktbezug.
2. Bei Cloud API v1.18 jeden Gerätetyp und jedes Feature gegen die zugehörige Mindest-Firmware prüfen; die O4-Neuerungen nicht pauschal Mavic 3E/3T/3M oder Matrice 4T zuschreiben.
3. Die [Produktarchitektur](https://developer.dji.com/doc/cloud-api-tutorial/en/overview/product-architecture.html), [Pilot-Cloud-Anbindung](https://developer.dji.com/doc/cloud-api-tutorial/en/feature-set/pilot-feature-set/pilot-access-to-cloud.html) und die einzelnen MQTT-/HTTPS-/WebSocket-Spezifikationen sind die passenden Quellen für eine eigenständige Cloud-Integration; die Startseite allein enthält keinen vollständigen Nachrichtenvertrag.
4. DJI hat 2025 die Wartung der älteren Cloud-API-Demo-Projekte beendet und warnt vor dem unmittelbaren Produktionseinsatz des Demo-Codes. Ein Beispielprojekt ist daher kein übernommener Sicherheits- oder Deployment-Nachweis.

Keine Secrets, Produktiv-URLs, Gerätekennungen oder echten Nachrichten-Payloads in das Repo aufnehmen. Die genaue Cloud-API-v1.18-Unterstützung einer realen Umgebung bleibt offen.
