# DJI FlightHub 2 On-Premises: Referenzabgleich

Stand: 8. November 2026. Abgleich der drei unten genannten DJI-Handbuchseiten, ergänzt um Organisationsseiten und die verlinkte Schnittstellendokumentation mit FlugDeck 0.5.0. Das Handbuch beschreibt Funktionen des DJI-Produkts; daraus folgt keine Freigabe für eine konkrete Installation. Den getrennten [OpenAPI-V1.0-Vertrag](dji-fh2-openapi-v1-referenz-2026-11-08.md) nicht mit On-Premises V2.0 vermischen.

Für den separaten DJI-Cloud-API-Tutorial-Stand siehe [Cloud API v1.20 und Cloud API 2 im Abgleich](dji-cloud-api-referenz-2026-11-08.md).

## Primärquellen

1. [Versionshinweise On-Premises, V1.0 bis V2.0.1](https://fh.dji.com/user-manual/de/release-notes/release-notes-private.html) – insbesondere Abschnitte V2.0.1 (21.10.2026), V2.0 (14.10.2026), V1.7.1 und V1.6.
2. [Registrierung und Anmeldung](https://fh.dji.com/user-manual/de/registration-and-login.html) – Kontoanmeldung, SSO und Grenzen.
3. [On-Premises OpenAPI V2.0](https://fh.dji.com/user-manual/de/custom-development/open-api/private-cloud-v2.html) – Zweck, Funktionsliste, Authentifizierung, Beispiele.

Die OpenAPI-Seite verlinkt für konkrete Schemata und Berechtigungen auf eine [separate Apifox-Schnittstellendokumentation](https://41b04hdzmc.apifox.cn/) mit [Authentifizierungsanleitung](https://41b04hdzmc.apifox.cn/9022450m0). Diese drei Handbuchseiten allein sind kein vollständiger Endpoint-Contract. Für den vorhandenen lesenden Adapter sind Operation und Authentifizierung zusätzlich gegen die installierte DJI-Version zu prüfen.

## Ergänzung: Organisationsseiten und konkrete API-Pfade

Die Seiten [Organisation erstellen](https://fh.dji.com/user-manual/de/organization-management/create-an-organization.html) und [Organisationseinstellungen](https://fh.dji.com/user-manual/de/organization-management/organization-settings.html) sind Bedienungsanleitungen. Sie enthalten selbst **keine HTTP-Pfade für die OpenAPI**. Die erste beschreibt die UI-Erstellung einer Organisation und die Superadministratorrolle des Erstellers; daraus folgt kein dokumentierter `POST`-Endpunkt zum Erstellen einer Organisation. Die zweite nennt eine Karte zum Anzeigen und Generieren von OpenAPI-Schlüsseln, bezeichnet diesen Abschnitt aber ausdrücklich als **Public-Cloud OpenAPI V2.0**. Dieser Schlüsselweg ist daher nicht als On-Premises-Authentifizierung belegt. Die Zwei-Faktor-Authentifizierung betrifft die Kontoanmeldung und ersetzt keinen API-Vertrag.

Konkrete Pfade finden sich in der von DJI separat verlinkten [On-Premises-V2.0-Schnittstellendokumentation](https://41b04hdzmc.apifox.cn/):

| Zweck | Methode und Pfad | Beleg |
| --- | --- | --- |
| Organisationsdetails abrufen | `GET /openapi/v2.0/manage/api/v1/organizations/{uuid}` | [Get Organization Details](https://41b04hdzmc.apifox.cn/473847920e0) |
| Projekte einer Organisation abfragen | `GET /openapi/v2.0/manage/api/v1/organizations/{uuid}/projects` | [Query Organization Project List](https://41b04hdzmc.apifox.cn/473847918e0) |
| Eigene Mitglieds- und Konfigurationsdaten zur Organisation abfragen | `GET /openapi/v2.0/manage/api/v1/organizations/{uuid}/users/current` | [Query Current User's Identity](https://41b04hdzmc.apifox.cn/473847932e0) |
| Organisationsinformationen ändern | `PUT /openapi/v2.0/manage/api/v1/organizations/{uuid}` | [Update Organization Info](https://41b04hdzmc.apifox.cn/473847921e0) |

Für einen ersten lesenden Adapter eignen sich nur die drei GET-Operationen als Kandidaten; die PUT-Operation verändert Organisationsdaten. Bei `GET .../projects` nennt DJI unter anderem `page`, `page_size`, `usage`, `sort_column` und `sort_type`, mit unterschiedlicher Antwortform für `usage=simple`. `GET .../organizations/{uuid}` kann `mfa_enabled` zurückliefern; der Geräte-Bindecode wird bei bestimmten Mitgliedsrollen zu `null`. Der Beispiel-Response der `users/current`-Seite zeigt allerdings lediglich `result` und `path` statt der beschriebenen Mitgliedsfelder: Response-Schema vor Implementierung zusätzlich prüfen. Apifox-generierte cURL-Beispiele enthalten leere Platzhalter und doppelte Header; sie sind keine unmittelbar lauffähigen Testkommandos.

Für die On-Premises-API nennt DJI überwiegend `x-user-token` und `X-Project-Uuid`; `{uuid}` im Pfad ist hier die Organisations-UUID und nicht mit der Projekt-UUID gleichzusetzen. Benötigte Rechte, Tokenbeschaffung und reale Antwortformen müssen gegen den Zielmandanten validiert werden. FlugDeck 0.5.0 ruft keinen der vier oben aufgelisteten Organisationsendpunkte auf; sein pausierter Workflow liest einen separaten Projekt-Topologie-Endpunkt.

## Versions- und Architekturabgleich

| DJI-Aussage | Abgleich mit FlugDeck 0.5.0 | Konsequenz |
| --- | --- | --- |
| Das integrierte Plugin-Rahmenwerk wurde mit **On-Premises V2.0.1** eingeführt, zunächst nur als Beta in China; weitere Regionen wurden für spätere Versionen angekündigt. | FlugDeck baut ein Paket mit dem DJI-Plugin-SDK und dem Extension Point `cockpit.ui.left-panel`. Der Mock-Host-Test und `UPLOAD_READY` belegen keinen Betrieb in einem echten, regional verfügbaren Mandanten. | Vor Installation Produktversion, Region, Plugin-Freischaltung und Ziel-Cockpit prüfen. Eine V2.0-OpenAPI-Verfügbarkeit beweist keine Plugin-Verfügbarkeit. |
| Die **On-Premises OpenAPI V2.0** ist eine REST-Schnittstelle für externe Systemintegration. V2.0 erschien mit der On-Premises-Version V1.6 und ergänzt über 300 Schnittstellen gegenüber 67 in V1.0. | FlugDeck besitzt einen pausierten, serverseitigen GET-Workflow für Projekt-Topologien; `flugdeck.status` und `flugdeck.devices` laufen über das Plugin-Gateway. | Plugin-Gateway und externe OpenAPI als getrennte Adapter und Berechtigungswege behandeln. Kein OpenAPI-Token in Plugin-Frontend oder ZIP einbetten. |
| Die meisten OpenAPI-V2-Aufrufe erwarten `x-user-token` und `X-Project-Uuid`; die Beispiele zeigen zusätzlich `X-Request-Id` und `X-Language`. | Der Plugin-Handler verwendet keine OpenAPI-Header; der pausierte Adapter setzt Token und Projekt-UUID serverseitig für seinen GET. | Vor Aktivierung projektgebundene Rechte, Token-Lebenszyklus, Secret-Verwaltung und echte Antwort gegen den Mandanten prüfen. Credentials werden später getrennt übergeben. |
| `GET /openapi/v2.0/drc/health` liefert bei `code: 0` einen gesunden **Echtzeitsteuerungsdienst**. | Die Anzeige „Erreichbar“ bezieht sich derzeit nur auf die Antwort des eigenen `flugdeck.status`-Handlers. | Weder „FlightHub insgesamt gesund“ noch „DRC bereit“ aus dem Plugin-Status ableiten. Einen DRC-Check später als separaten, eindeutig benannten Status ausweisen. |
| Der Schnellstart zeigt einen Projektlisten-GET und einen Livestream-Start-POST als OpenAPI-Beispiele. | FlugDeck hat weder Projektlisten noch Livestream, Steuerung, Missionen oder Mediendaten implementiert. | Die DJI-Funktionsliste ist eine Roadmap-Quelle, kein Nachweis vorhandener Funktionen. Schreibende Aufrufe erst nach separatem Entwurf, Berechtigungsprüfung und Tests. |
| V2.0 nennt neue Cluster- und HTTPS-Eigenschaften sowie geänderte Upgrade-, Backup- und Wartungsverfahren. Dock 4 unterstützt dort nur HTTPS. | FlugDeck betreibt keine eigene FlightHub-On-Premises-Instanz und konfiguriert keinen DJI-Server. | Integrations- und Deploymentschritte auf die reale Host-Version abstimmen; keine V1.x-Upgrade-Anweisungen auf V2.0 übertragen. |

## Anmeldung und Identität

Die allgemeine Anmeldeseite beschreibt ein DJI-Konto und SSO mit Unternehmensdomain; beim ersten SSO-Login ist ein DJI-Konto zu verknüpfen. Sie erlaubt die gleichzeitige Anmeldung desselben Kontos bei FlightHub 2 und Pilot 2, aber nicht mehrere Anmeldungen auf derselben Plattform. Die beschriebenen SSO-Einstellungen sind laut Seite auf die Enterprise-Version begrenzt. Die Versionshinweise zur On-Premises V1.0 nennen dagegen lokales Kontosystem oder OAuth2. **Die allgemeine SSO-Seite belegt deshalb nicht, dass ein konkreter On-Premises-Mandant SAML-SSO unterstützt.** Identitätsanbieter und SSO-Modus sind am Zielsystem zu prüfen.

Für On-Premises V2.0 vermerken die Versionshinweise außerdem, dass die Anpassung der Anmeldeseite vorübergehend nicht verfügbar ist. FlugDeck ändert keine Login-Seite und verlangt keine eigenen Login-Daten; ein Plugin-Status darf keine Aussage über SSO-Erfolg oder OpenAPI-Berechtigung machen.

## Abgleich der Versionshistorie

- V1.0 bis V1.5: On-Premises-Grundfunktionen, FlightHub Sync, Komponenten und zunehmend Medien-/Karten-/Aufgabenfunktionen; die Hinweise beschreiben teils historische Möglichkeiten, die später geändert wurden.
- V1.6: On-Premises OpenAPI V2.0; Public Cloud und On-Premises werden getrennt dokumentiert. Für API-Verträge diese Linie verwenden statt der als „keine weiteren Updates“ markierten V1.0-Dokumentation.
- V1.7 und V1.7.1: Änderungen an MQTT Bridge und Fehlerbehebungen, unter anderem für zeitweise offline gehende Geräte. Die Versionsangaben sind für Bestandsmandanten relevant, belegen keine Plugin-Unterstützung.
- V2.0: Cluster und geänderte Wartung, Backup und Upgrade; für MQTT-Konfigurationsvorgänge kann `x-user-token`-Authentifizierung aktiviert werden; die OpenAPI bleibt ein eigener Zugang. Die Anpassung der Anmeldeseite ist vorübergehend ausgesetzt.
- V2.0.1: integriertes Plugin-Rahmenwerk mit der genannten regionalen Beta-Einschränkung. Für FlugDeck ist dies die wichtigste Release-Voraussetzung; tatsächliche Freigabe und Host-Kompatibilität sind offen.

## Nachweise vor einem echten Mandantentest

| Prüffrage | Gegenwärtiger Nachweis | Offen |
| --- | --- | --- |
| Funktioniert der Plugin-Build im DJI-Mock-Host? | Frühere Paketprüfung und Browser-Smoke-Test aus [Prüfung 0.2.1](pruefung-0.2.1.md); der aktuelle 0.5.0-Workflow ist damit nicht im Zielmandanten geprüft. | Installation und Verhalten im echten FlightHub-2-Cockpit. |
| Unterstützt der Zielmandant das Plugin-Rahmenwerk? | DJI nennt V2.0.1 und China-Beta. | Installierte Version, Region, Lizenz/Freischaltung und Extension Point im realen Mandanten. |
| Ist ein OpenAPI-V2-Adapter lauffähig? | Lesender Topologie-Adapter implementiert und mit Mock-Daten getestet; Workflow ausgeliefert, aber pausiert. | Rechte, Token-Beschaffung und sichere Aufbewahrung, reale Antwort und projektgebundener Test. |
| Sind Login und SSO geklärt? | Allgemeine DJI-Anmeldung und historische On-Premises-Kontomodi dokumentiert. | Konfiguration und Berechtigungen des konkreten Zielsystems. |

Keine Zugangsdaten, echten Projekt-UUIDs, Geräte-Seriennummern oder Session-URLs in dieses Dokument oder in Beispieltests übernehmen.
