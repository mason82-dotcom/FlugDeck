# FlightHub 2 OpenAPI V1.0: Abgleich mit FlugDeck

Stand: 8. November 2026. Quelle: [DJI FlightHub 2 OpenAPI V1.0](https://fh2-api.apifox.cn/). Die Versionsbezeichnung der Dokumentation ist **V1.0**; die dort gezeigten HTTP-Pfade beginnen mit **`/openapi/v0.1`**. Die [On-Premises OpenAPI V2.0](https://41b04hdzmc.apifox.cn/) hat einen anderen Vertrag. Die [DJI Cloud API](https://developer.dji.com/doc/cloud-api-tutorial/en/) beschreibt wiederum die Anbindung von Geräten an eine eigene Cloud-Plattform. Diese drei Verträge sind getrennt zu prüfen.

## Geprüfte V1-Endpunkte

| Funktion | V1.0-Pfad und Antwort | Bedeutung für FlugDeck |
| --- | --- | --- |
| [Projektgeräte](https://fh2-api.apifox.cn/api-221842028) | `GET /openapi/v0.1/project/device`; `data.list[]` enthält je Eintrag `gateway` und `drone` mit `sn`, `device_model`, `device_online_status`, `mode_code` und gegebenenfalls `camera_list`. Maximal 1000 Geräte laut Seite. | Eine andere Topologieform als der aktuell verwendete V2-Pfad. Nicht mit dem vorhandenen V2-Parser verarbeiten. Leere oder fehlende Felder und Offline-Geräte müssen separat geprüft werden. |
| [Geräte-Thing-Model](https://fh2-api.apifox.cn/api-221898285) | `GET /openapi/v0.1/device/{device_sn}/state`; Beispiel `data.device_sn`, `data.device_model`, `data.device_state`. | Potenzielle ergänzende Momentaufnahme pro Gerät; nicht als nachgewiesener OSD-Stream oder Event-Zeitstempel behandeln. In der Beispielantwort stehen sensible Details, die nicht in einen Frontend-Snapshot übernommen werden dürfen. |

Die [Authentifizierungsanleitung](https://fh2-api.apifox.cn/) verlangt `X-User-Token` und für projektbezogene Aufrufe `X-Project-Uuid`. Sie beschreibt einen Organisationsschlüssel für den Token. Die [Public-Cloud-Zugangspunkte](https://fh2-api.apifox.cn/doc-6282018) nennen regionale Hosts für China und Übersee; ein konkreter Zielhost und seine API-Version müssen im Zielmandanten bestätigt werden. V1-Schlüssel oder Basisadressen nicht ungeprüft für die On-Premises-V2-Verbindung übernehmen. Die Dokumentation enthält auch einzelne Funktionen für Private Cloud; der Titel allein legt den Betriebsmodus nicht fest.

## Geräte und Funktionsumfang

Der V1-Katalog enthält Datenmodelle für [Mavic 3 Enterprise Series](https://fh2-api.apifox.cn/schema-144246668) (Modellschlüssel `0-77-0` und `0-77-1`), RC Pro Enterprise, RC Plus 2 und Matrice 4 Series. Er führt Dock 1, Dock 2 und Dock 3 auf. Daraus folgt weder M3M-Unterstützung noch eine Aussage zur Dock-4-Unterstützung anderer API-Versionen. Die V1-Navigation listet außerdem Steuerbefehle; FlugDeck verwendet diese nicht und bleibt beim lesenden Geräteabruf.

## Ergebnis für Version 0.5.0

FlugDeck ruft serverseitig ausschließlich `GET /openapi/v2.0/manage/api/v1/projects/{projectUuid}/topologies` aus der [On-Premises-V2-Dokumentation](https://41b04hdzmc.apifox.cn/473847970e0) ab und projiziert einen begrenzten Snapshot. Die V1-Antwort `data.list[].gateway/drone` ist **nicht** die V2-Antwort `data.list[].host/parents`. Daher ist keine Änderung des bestehenden Adapters durch diese V1-Quelle gerechtfertigt. Ein zusätzlicher V1-Adapter bräuchte eine eigene Versionswahl, Response-Validierung, Berechtigungsprüfung und Tests mit einem tatsächlich berechtigten Mandanten. Ohne Secrets und reale Antwort bleibt dieser Teil offen.

Der gelieferte Workflow ist pausiert. Weder die V1-Dokumentationsbeispiele noch der Mock-Build belegen eine Live-Verbindung oder Gerätefreigabe. Keine Tokens, echten Seriennummern, Projekt-UUIDs oder vollständigen Thing-Models in Beispielen, Logs und Ansichten speichern.
