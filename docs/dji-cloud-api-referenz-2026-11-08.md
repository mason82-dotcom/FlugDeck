# DJI Cloud API v1.20: Referenzstand für FlugDeck

Stand: 8. November 2026. Direkt im [DJI Tutorial Reading Guide](https://developer.dji.com/doc/cloud-api-tutorial/en/tutorial-map.html) und in den [englischen Release Notes](https://developer.dji.com/doc/cloud-api-tutorial/en/) geprüft. Die live gerenderte DJI-Seite zeigt v1.20 vom **5. November 2026**. Mein vorheriger Abgleich nannte irrtümlich v1.18, weil der Suchindex nur den älteren Stand lieferte; diese Angabe ist hiermit korrigiert. Keine Verbindung zu Geräten oder einem Zielmandanten wurde getestet.

## Neu in v1.20

- **DJI Dock 4 und Matrice 5TD** werden unterstützt. Im beschriebenen Aufbau ist die **O4 Ground Station das Cloud-Gateway**; Dock 4, Relay und Fluggerät hängen als Untergeräte daran. Dock 4 selbst ist nicht das Videoübertragungs-Gateway.
- Die O4-Betriebsunterart wird über die Eigenschaft `basestation_work_mode` gemeldet. Wert `1` bezeichnet den externen Dock-Modus. DJI beschreibt die Umschaltung ausdrücklich **nicht** als Cloud-Schnittstelle; sie erfolgt über DJI Pilot 2, DJI Industrial App oder am Gerät.
- Für Dock 4 und Matrice 5TD nennt DJI Geräteeigenschaften, Geräte-/Organisationsverwaltung, Konfigurationsaktualisierung, Livestream, Medien, Wegpunktaufgaben, FlyTo/DRC, Payload und Fernsteuerung, AI-Erkennung, Firmware, Logs, Debugging, HMS, Entsperrung, benutzerdefinierte Flugbereiche und AirSense. Diese Liste beschreibt **mögliche Protokollfunktionen**, keine in FlugDeck implementierten Module.
- Beim Medien-Upload unterscheidet das Feld `module` Medien, Flugaufzeichnungen und An-/Abflug-Wegpunkte. Firmware-Aktualisierungen können Ground Station, Dock, Relay und Fluggerät umfassen; `upgrade_stage` nennt 2 für „nur herunterladen“ und 3 für „nur aktualisieren“.
- Mindestversionen laut v1.20-Release-Notes für **diese neuen Funktionen**: O4 Ground Station (externer Dock-Modus) `19.01.00.58`, Dock 4 `19.01.00.07`, Matrice 5TD `19.01.00.07`, DJI Industrial App `1.2.0`. Diese Werte gelten nicht pauschal für andere Hardware oder Betriebsarten.

Die vorherigen [v1.18-Hinweise](https://developer.dji.com/doc/cloud-api-tutorial/en/#cloud-api-v1-18-release-notes) vom 13. Oktober 2026 behandeln die O4-Bodenstation im **Roaming-Basisstationsmodus** sowie Dock 2/3. Dieser Modus und seine älteren Mindestversionen dürfen nicht als Freigabe für Dock 4 im externen Dock-Modus gelesen werden.

## Architekturabgleich

| Zugang | DJI-System und Protokoll | FlugDeck 0.4.0 |
| --- | --- | --- |
| [Cloud API v1.20](https://developer.dji.com/doc/cloud-api-tutorial/en/) | DJI Pilot 2 oder Dock/Ground Station verbinden Gateways mit einer **eigenen Drittanbieter-Cloud** über MQTT, HTTPS und WebSocket. Das [Tutorial](https://developer.dji.com/doc/cloud-api-tutorial/en/tutorial-map.html) ordnet die Funktionen den Protokollen zu. | Lokaler Gerätecheck für Dock-4-Topologie und Mindestversionen mit manuellen Eingaben. Kein MQTT-Broker, keine Pilot-Cloud-Anbindung und keine Cloud-API-Topics oder Thing-Model-Bindung. |
| [FlightHub On-Premises OpenAPI V2.0](https://fh.dji.com/user-manual/de/custom-development/open-api/private-cloud-v2.html) | REST-API einer **bestehenden FlightHub-2-On-Premises-Instanz**. | Kein OpenAPI-Client. |
| [FlightHub-2-Plugin-SDK](https://github.com/dji-sdk/FlightHub-2-Plugin) | Plugin innerhalb des FlightHub-Hosts. | Cockpit-Statushandler über `ctx.apiCall('/plugin/invoke')`. |
| [Cloud API 2](https://developer.dji.com/cloud-api-2/) | **Separate Produktlinie** mit PaaS, SDK und Frontend-Komponenten. | Nicht eingebaut; nicht mit Cloud API v1.20 oder FlightHub OpenAPI V2.0 gleichsetzen. |

Das Tutorial erwähnt für Pilot unter anderem JSBridge und für Dock MQTT; Karten-/Medienfunktionen nutzen auch HTTPS und WebSocket. Die dortige „Organization Management“-Funktion für Dock 4 ist **kein** Nachweis eines FlightHub-OpenAPI-V2-REST-Pfades. Der FlightHub-Endpunkt `/openapi/v2.0/drc/health` ist kein Cloud-API-v1.20-Topic.

## Entwicklungsfolgen

1. FlugDecks bisheriger Backend-Status bleibt ein Status des eigenen Plugins. v1.20 ändert keinen bestehenden Plugin-Vertrag und aktiviert keine Gerätesteuerung.
2. Für einen künftigen eigenständigen Cloud-Adapter O4-Gateway, Dock 4, Relay und Matrice 5TD getrennt modellieren. Betriebsmodus und Firmware sind Capability-Voraussetzungen; aus `basestation_work_mode` nur lesen.
3. Nachrichtenformat, Topic und Parameter eines konkreten Moduls in den verlinkten Gerätekapiteln prüfen; die Tutorial-Map und Release Notes allein sind kein vollständiger Contract.
4. Die älteren DJI-Cloud-API-Demo-Projekte werden seit April 2025 nicht mehr gepflegt und sind laut DJI nicht unmittelbar produktionsreif.

Keine Secrets, Produktiv-URLs, Gerätekennungen oder echten Nachrichten-Payloads in das Repo aufnehmen. Der Betrieb in einer realen Umgebung bleibt unbestätigt.
