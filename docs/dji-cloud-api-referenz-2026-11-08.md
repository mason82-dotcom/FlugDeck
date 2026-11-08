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

| Zugang | DJI-System und Protokoll | FlugDeck 0.5.0 |
| --- | --- | --- |
| [Cloud API v1.20](https://developer.dji.com/doc/cloud-api-tutorial/en/) | DJI Pilot 2 oder Dock/Ground Station verbinden Gateways mit einer **eigenen Drittanbieter-Cloud** über MQTT, HTTPS und WebSocket. Das [Tutorial](https://developer.dji.com/doc/cloud-api-tutorial/en/tutorial-map.html) ordnet die Funktionen den Protokollen zu. | Lokaler Gerätecheck für Dock-4-Topologie und Mindestversionen mit manuellen Eingaben. Kein MQTT-Broker, keine Pilot-Cloud-Anbindung und keine Cloud-API-Topics oder Thing-Model-Bindung. |
| [FlightHub On-Premises OpenAPI V2.0](https://fh.dji.com/user-manual/de/custom-development/open-api/private-cloud-v2.html) | REST-API einer **bestehenden FlightHub-2-On-Premises-Instanz**. | Serverseitiger, standardmäßig pausierter GET-Adapter für Projekt-Topologie; ohne Verbindung und DDL keine Live-Daten. |
| [FlightHub-2-Plugin-SDK](https://github.com/dji-sdk/FlightHub-2-Plugin) | Plugin innerhalb des FlightHub-Hosts. | Cockpit-Statushandler über `ctx.apiCall('/plugin/invoke')`. |
| [Cloud API 2](https://developer.dji.com/cloud-api-2/) | **Separate Produktlinie** mit PaaS, SDK und Frontend-Komponenten. | Nicht eingebaut; nicht mit Cloud API v1.20 oder FlightHub OpenAPI V2.0 gleichsetzen. |

Das Tutorial erwähnt für Pilot unter anderem JSBridge und für Dock MQTT; Karten-/Medienfunktionen nutzen auch HTTPS und WebSocket. Die dortige „Organization Management“-Funktion für Dock 4 ist **kein** Nachweis eines FlightHub-OpenAPI-V2-REST-Pfades. Der FlightHub-Endpunkt `/openapi/v2.0/drc/health` ist kein Cloud-API-v1.20-Topic.

## Abgleich der Cloud-API-Demo-Quellcodeanleitung

Die [DJI-Anleitung „Source Code Deployment Steps“](https://developer.dji.com/doc/cloud-api-tutorial/en/quick-start/source-code-deployment-steps.html) beziehungsweise ihr [offizieller Dokumentationsquelltext](https://github.com/dji-sdk/Cloud-API-Doc/blob/master/docs/en/20.quick-start/20.source-code-deployment-steps.md) beschreibt die getrennten Beispiel-Repositories [Cloud-API-Demo-Web](https://github.com/dji-sdk/Cloud-API-Demo-Web) und [DJI-Cloud-API-Demo](https://github.com/dji-sdk/DJI-Cloud-API-Demo). Sie ist ein Aufbau für eine **eigene Drittanbieter-Cloud**, keine Anleitung zur Installation des FlugDeck-Pakets in FlightHub 2. Der direkte Webaufruf der DJI-Seite lieferte beim Abgleich keinen lesbaren Seitentext; der offizielle Dokumentationsquelltext und der Suchindex derselben Seite wurden zur Kontrolle herangezogen.

| Demo-Schritt | Einordnung für FlugDeck 0.5.0 |
| --- | --- |
| DJI-Developer-App vom Typ Cloud API anlegen, App ID, App Key und App License erzeugen; im Demo `src/api/http/config.ts` setzen. | Diese Werte gehören zur **Cloud-API-Lizenzierung des Demos**, nicht zum FlightHub-Plugin-SDK oder zum On-Premises-OpenAPI-Token. Keine Demo-Konfigurationsdatei oder realen Schlüssel in dieses Repo übernehmen. |
| Vue/Node-Frontend mit `baseURL` und `websocketURL`; optional Amap-Key und RTMP-Adresse; `npm install` und `npm run serve`. | FlugDeck nutzt den FH2-Plugin-Toolchain-Build und den Host-Entry. Ein eigener Demo-Webserver und Amap-Schlüssel sind für das Cockpit-Panel nicht erforderlich. |
| Java/Spring-Backend mit EMQX, MySQL, Redis und optional Objektspeicher; `cloud_sample.sql` importieren und `application.yml` konfigurieren. | Das sind Dienste des Cloud-API-Beispiels. FlugDecks optionaler V2-Workflow führt einen HTTPS-GET aus und benötigt seine eigene `live_snapshot`-DDL im Plugin-Host; die Demo-Datenbank und MQTT-Konfiguration sind dafür nicht passend. |
| Pilot 2 über „Cloud Services → Open Platforms“ mit der Demo-Login-Seite verbinden; nach Login sendet die Fernsteuerung Daten an den Demo-Broker. | Dies würde Pilot 2 mit einer **anderen Cloud-Plattform** verbinden. Es ist kein Test der FlightHub-2-Plugin-Anbindung oder des V2-Topologie-GET. Keine Controller-Verbindung und keinen Pilot-Login allein aufgrund dieser Anleitung umstellen. |

Die Anleitung zeigt feste Demo-Logins und eine HTTP-Beispieladresse. Diese nur als historische Testbeispiele lesen, nicht für einen erreichbaren Dienst übernehmen. DJI hat am **10. April 2025** [das Ende der Pflege beider Demo-Repositories angekündigt](https://github.com/dji-sdk/DJI-Cloud-API-Demo#readme) und warnt vor ungeprüfter Produktionsnutzung. Aus den dortigen `npm`-, SQL-, MQTT- und Pilot-2-Schritten folgt daher weder eine aktuelle v1.20-Implementierung noch eine Freigabe für FlugDeck. Für eine spätere eigenständige Cloud-API-Integration zuerst aktuelle Protokollverträge und Gerätesupport prüfen und eine getrennte Architektur samt Secret-Verwaltung, Migration und Hardwaretest planen.

### Docker-Variante des Beispiels

Die separate [DJI-Seite „Docker Deployment Steps“](https://developer.dji.com/doc/cloud-api-tutorial/en/quick-start/docker-deployment-steps.html) und der [offizielle Dokumentationsquelltext](https://github.com/dji-sdk/Cloud-API-Doc/blob/master/docs/en/20.quick-start/30.docker-deployment-steps.md) beschreiben ein historisches `cloud_api_sample_docker_1.0.0.zip`. Es enthält `docker-compose.yml`, ein Image-Archiv, Datenverzeichnis, Quellcode und Skripte zum Neubau von Frontend- und Backend-Images. Der Ablauf lädt das Archiv mit `docker load`, setzt im Demo-Backend `application.yml` für MySQL, MQTT, Redis und Objektspeicher, trägt in der Demo-Frontend-Datei `config.ts` Cloud-API-App-Werte und optional Karten-/Streamkonfiguration ein, baut beide Images und startet den Compose-Stack. Pilot 2 wird anschließend mit der Demo-Webanmeldung verbunden.

| Prüfung | Ergebnis für FlugDeck |
| --- | --- |
| Image-Archiv und Compose-Datei | Gehören zum eigenständigen Cloud-API-Demo-Stack, nicht zum FlightHub-Plugin-Paket. Weder `docker load` noch `docker-compose up` ist ein Installationsschritt für FlugDeck. |
| Backend-/Frontend-Konfiguration | Demo-`application.yml` und `config.ts` enthalten andere Verbindungs- und Lizenzwerte als die serverseitige FlugDeck-Verbindung `flugdeck.openapi.v2`. Keine Demo-Defaults oder Credentials übernehmen. |
| Pilot-2-Anmeldung und MQTT-Daten | Bestätigen allenfalls die Verbindung zum Demo-Broker. Sie prüfen weder den FlightHub-Plugin-Host noch den lesenden On-Premises-V2-Endpunkt. |

Die Docker-Anleitung aktualisiert das ungewartete Demo nicht auf Cloud API v1.20. Das Archiv wurde nicht heruntergeladen oder ausgeführt; seine tatsächlichen Images, Abhängigkeiten und Sicherheitseigenschaften sind damit **nicht verifiziert**. FlugDecks eigener 0.5.0-Build und der pausierte V2-Workflow bleiben unverändert.

## Entwicklungsfolgen

1. FlugDecks bisheriger Backend-Status bleibt ein Status des eigenen Plugins. v1.20 ändert keinen bestehenden Plugin-Vertrag und aktiviert keine Gerätesteuerung.
2. Für einen künftigen eigenständigen Cloud-Adapter O4-Gateway, Dock 4, Relay und Matrice 5TD getrennt modellieren. Betriebsmodus und Firmware sind Capability-Voraussetzungen; aus `basestation_work_mode` nur lesen.
3. Nachrichtenformat, Topic und Parameter eines konkreten Moduls in den verlinkten Gerätekapiteln prüfen; die Tutorial-Map und Release Notes allein sind kein vollständiger Contract.
4. Die älteren DJI-Cloud-API-Demo-Projekte werden seit April 2025 nicht mehr gepflegt und sind laut DJI nicht unmittelbar produktionsreif.

Keine Secrets, Produktiv-URLs, Gerätekennungen oder echten Nachrichten-Payloads in das Repo aufnehmen. Der Betrieb in einer realen Umgebung bleibt unbestätigt.
