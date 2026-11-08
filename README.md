# Flugdeck für DJI FlightHub 2

Flugdeck ist ein FlightHub-2-Plugin mit Frontend und Backend. Es zeigt im Cockpit Live-Telemetrie und führt automatisch ein Flugbuch. Im Projekt listet es die erfassten Flüge auf. In der Aufgabenplanung ergänzt es ein Notizfeld. Für Meldungen gibt es ein vorbereitetes Popup. Version 0.3.0 ist das Grundgerüst für weitere Funktionen.

**Installationspaket (Stand 0.2.0):** [Flugdeck-FH2-0.2.0-Plugin.zip](packages/Flugdeck-FH2-0.2.0-Plugin.zip). Das Paket für 0.3.0 wird mit `pnpm run pack` erzeugt, sobald es freigegeben ist.

![Das FlugDeck-Panel im DJI-Mock-Cockpit](docs/cockpit-panel.png)

## Funktionen nach Host

| Host | Erweiterungspunkt | Inhalt |
| --- | --- | --- |
| Cockpit | `cockpit.ui.left-panel` | Flugbuch-Status mit Start, maximaler Höhe und Geschwindigkeit. Telemetrie: Höhe, Geschwindigkeiten, Entfernung zum Startpunkt, Position, Flugsteuerung. Backend-Prüfung mit Version und Antwortzeit |
| Project | `project.sidebar-actions` (`/flugdeck-flugbuch`) | Seite **Flugbuch** mit den Flügen des Projekts, neueste zuerst |
| Plan | `plan.form-extensions` (alle Aufgabentypen) | Optionales Feld **Flugbuch-Notiz**. Eine nicht leere Notiz wird als `biz_ext.flugdeck.note` mit der Aufgabe gespeichert |
| Message | `message.alert-popups` | Unsichtbarer Popup-Platzhalter für spätere Hinweise |

Das **Flugbuch** startet automatisch. Meldet `cockpit:context` eine neue `flightId`, legt das Panel einen Eintrag an. Fällt die `flightId` weg oder wechselt sie, schließt es den Eintrag mit der maximalen Höhe und Geschwindigkeit ab. Erfasst wird nur, solange das Cockpit-Panel geladen ist. Wird es mitten im Flug geschlossen, bleibt der Eintrag aktiv. Beim nächsten Öffnen mit derselben `flightId` wird er weitergeführt.

**Medien:** FlightHub 2 hat keinen Erweiterungspunkt für die Mediengalerie. Die SDK-Hosts sind nur `cockpit`, `plan`, `message` und `project`. Deshalb hat jeder Flugbuch-Eintrag das Feld `media_ref`, gesetzt über `flightlog.attachMedia`. Eine automatische Zuordnung, zum Beispiel über die Backend-Fähigkeit `media:read`, steht noch aus.

## Inbetriebnahme

Voraussetzungen sind Git, Node.js ab 20.19 (DJI empfiehlt 22 LTS), Corepack und pnpm 10.15.0. Die relative Anordnung ist wichtig: Die Plugin-Abhängigkeiten verweisen auf die lokal gebaute DJI-Toolchain. Die folgenden Befehle beginnen in einem Entwicklungsverzeichnis, in dem beide Repositories als Nachbarn liegen.

```bash
git clone https://github.com/mason82-dotcom/FlugDeck.git
git clone https://github.com/dji-sdk/FlightHub-2-Plugin.git
git -C FlightHub-2-Plugin checkout --detach f2947c90670c2e3382ead6e8d9ab68c9170c3fa9
cd FlightHub-2-Plugin
corepack enable pnpm
pnpm --version
pnpm install --frozen-lockfile
NODE_OPTIONS=--max-old-space-size=4096 pnpm build:tooling

cd ../FlugDeck
pnpm install --frozen-lockfile
pnpm run generate
pnpm run validate
pnpm run typecheck
pnpm test
pnpm run pack
pnpm run dev
```

Öffne die vom Entwicklungsserver ausgegebene lokale Adresse. Im Mock Host über eine Gerätekarte das virtuelle Cockpit öffnen und links **Flugdeck** auswählen. Erwartet wird **Erreichbar** mit Backend-Version **0.2.0**. Bei einer unterbrochenen Anfrage erscheint eine Fehlermeldung. Nach Wiederherstellung der Verbindung prüft der Button erneut.

## Aufbau

| Bestandteil | Aufgabe |
| --- | --- |
| `frontend/…/src/plugin.ts` | Einstieg; verteilt nach `ctx.host.id` auf `src/hosts/<host>/activate.ts` |
| `src/api/flugdeck-api.ts` | Aufrufe von `/plugin/invoke` mit Zeitlimit, Prüfung der Antwort und deutsche Fehlertexte |
| `src/domain/telemetry.ts`, `src/domain/flight-tracker.ts` | Telemetrie aufbereiten; Flugerkennung über `flightId`, Maximalwerte, geordnete start/finish-Aufrufe |
| `src/views/<view>/` | Vue-Views über typisierte View-Verträge; gemeinsame Farben in `views/shared/theme.css` |
| `backend/…/schema.sql` | Tabelle `plugin_db_flugdeck_flight` (Speichervertrag; vor dem Deployment beim Betreiber ausführen) |
| `backend/…/handlers/` | `flugdeck.status`, `flightlog.start`, `flightlog.finish`, `flightlog.list`, `flightlog.attachMedia` |
| `backend/…/shared/` | Speicherzugriff (`store`), Eingabeprüfung, Zeitformat |

Berechtigungen im Frontend: `platform:http`, `cockpit:context`, `cockpit:telemetry`, `project:context`, `plan:form-context`. Backend-Allowlist: `data:read`, `data:write`. Fehlt im Host eine Capability, bleibt das betroffene Panel trotzdem nutzbar und zeigt einen Hinweis. Authentifizierung und Routing übernimmt der DJI-Host.

## Prüfen und verpacken

`pnpm test` führt 24 Tests aus:

- Cockpit: Backend-Prüfung, Telemetrie und Flugerkennung
- Flugtracker: Wechsel, fehlendes Projekt, Startfehler und Maximalwerte
- Project, Plan und Message
- Vue-Panel
- Backend-Handler gegen einen Speicher im Arbeitsspeicher (`backend/…/tests/`)

`generate`, `validate`, `typecheck` und `build` laufen fehlerfrei durch. Im DJI-Mock-Host (`pnpm run dev`) wurden zwei Ansichten geprüft:

- **Cockpit:** Das Panel zeigt Telemetrie und erfasst den Mock-Flug automatisch.
- **Project:** Die Flugbuch-Seite lädt über das lokale Backend.

Die Plan- und Message-Erweiterungen sind nur durch Tests abgedeckt.

`pnpm run pack` gibt bei Erfolg `UPLOAD_READY` und den Pfad zur ZIP-Datei aus. Offen sind noch:

- Installation im DJI-Zielmandanten
- Ausführung von `schema.sql` in der Plugin-Datenbank
- Prüfung im echten FlightHub 2

[DJI-Plattformarchitektur](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/docs/cn/90.plugin-development/30.detailed-guide/10.concepts/20.platform-architecture.md) · [SDK-Aufruf und Lebenszyklus](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/packages/fh2-plugin-sdk/src/contracts/context.ts) · [SDK-Fehlerstruktur](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/packages/fh2-plugin-sdk/src/contracts/errors.ts)
