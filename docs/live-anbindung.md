# Lesende Live-Anbindung · FlightHub 2 On-Premises

Stand: 8. November 2026. FlugDeck 0.5.0 bindet die Geräteansicht an einen **serverseitigen Snapshot-Pfad**. Die Quelle ist die [DJI-Dokumentation Get Project Device Thing Model](https://41b04hdzmc.apifox.cn/473847970e0): `GET /openapi/v2.0/manage/api/v1/projects/{proj_uuid}/topologies`. Die Antwort enthält `host`, `parents`, `device_online_status`, `is_device_pending_offline` und `device_state`. Sie kann reine Controller-Topologien sowie bestimmte Offline-Geräte ausfiltern. Eine leere Antwort ist deshalb kein Nachweis, dass keine Hardware existiert. Die [OpenAPI V2.0 Übersicht](https://fh.dji.com/user-manual/de/custom-development/open-api/private-cloud-v2.html) fordert für die meisten Aufrufe `x-user-token` und `X-Project-Uuid`.

Die separat dokumentierte [FlightHub 2 OpenAPI V1.0](dji-fh2-openapi-v1-referenz-2026-11-08.md) nutzt `/openapi/v0.1/project/device` und eine andere Geräteantwort. Diese Quelle ist kein Ersatz für den V2-Vertrag dieses Adapters.

## Datenfluss

1. Der Workflow `flugdeck-read-devices` wird nach Freischaltung alle 30 Sekunden ausgelöst. Er ist im ausgelieferten Paket **pausiert**.
2. `platform.getConfig()` erhält die für `flugdeck.openapi.v2` gebundene serverseitige Verbindung. Nur der Adapter verwendet Token, Projekt-UUID und HTTPS-Basisadresse. `connector.fetch` führt **einen GET** aus; das Ziel muss in der Deployment-Allowlist stehen.
3. Die Projektion nimmt höchstens 20 erkannte Geräte auf und ordnet Seriennummern nur während des Abrufs anonymen Aliasen zu. Seriennummern, Token, Projekt-UUID und vollständige Thing-Model-Werte werden nicht gespeichert oder an die View weitergegeben. `schema.sql` enthält die einzelne Snapshot-Tabelle. Der Deployment-Prozess muss die DDL tatsächlich ausführen; das Paket legt die Tabelle nicht selbst an.
4. Der Handler `flugdeck.devices` liefert ausschließlich einen Snapshot, der höchstens 60 Sekunden alt ist. Sonst lautet die Antwort `stale` beziehungsweise `unconfigured` und die Ansicht zeigt keine alten Gerätewerte. Die Schaltfläche in der View fordert den aktuellen gespeicherten Stand an, sie löst **keinen Flug- oder Gerätebefehl** aus.

Die API liefert bei diesem Aufruf keinen separat verifizierten OSD-Zeitstempel. Deshalb wird OSD im Live-Snapshot **UNBEKANNT** angezeigt. `topologyAt` bezeichnet die erfolgreiche Abfragezeit der OpenAPI und nicht den Zeitpunkt eines Geräte-Events. Eine als online markierte Topologie ist keine Flugfreigabe. Die M3M ist für FlightHub 2 in diesem Projekt derzeit nicht unterstützt und wird vom Adapter ausgelassen.

## Vor Freischaltung im Zielsystem

- Installierte FlightHub-On-Premises-Version, Plugin-Freischaltung und Projektmitgliedschaft prüfen. Das Plugin-Rahmenwerk wurde mit V2.0.1 zunächst als regionale Beta angekündigt.
- Die Verbindung `flugdeck.openapi.v2` in der Deployment-Konfiguration mit `baseUrl` (HTTPS, ohne Pfad), `projectUuid` und `userToken` hinterlegen. Keine Werte in Manifest, ZIP, Browser, Mock-Fixture oder Workflow-Historie schreiben. Das SDK markiert `secret: true` nur für redigierte Startlogs; die Deployment-Plattform muss die Verbindung selbst angemessen schützen.
- Ausgehenden Host für den lesenden GET freigeben und `schema.sql` in der Zielumgebung anwenden. Den standardmäßig pausierten Workflow **erst nach** kontrollierter Konfiguration aktivieren. Eine Konfigurationsänderung kann einen Neustart des Backend-Runtimes erfordern.
- Mit einem projektgebundenen, nur lesenden Token echte Antworten für RC Pro/M3E oder M3T und RC Plus 2/Matrice 4T prüfen. Modellnamen und Antwortform können von Beispielen abweichen; unbekannte Modelle werden ausgelassen. Fehler, fehlende Topologie, Pending-Offline, Tokenablauf und Stale-Snapshot separat testen.

Weder ein echter Mandant noch Zugangsdaten standen beim Bau zur Verfügung. `validate`, Unit-Tests und `pack` bestätigen die Paket- und Quellstruktur, **nicht** den Live-Betrieb oder die Berechtigungen im Zielsystem. Die [Gerätebeobachtungen](geraetebeobachtungen.md) beschreiben das lokale, getrennt gekennzeichnete Importformat.
