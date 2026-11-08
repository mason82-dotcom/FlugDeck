# Flugdeck für DJI FlightHub 2

Das Cockpit-Panel **Flugdeck** prüft beim Öffnen und über **Verbindung prüfen**, ob sein Backend erreichbar ist. Bei Erfolg zeigt es die vom Handler gemeldete Version. Bei einem Fehler kann die Prüfung wiederholt werden. Die angezeigte Version beschreibt ausschließlich das Plugin.

## Inbetriebnahme

Voraussetzungen sind Git, Node.js ab 20.19 (DJI empfiehlt 22 LTS), Corepack und pnpm 10.15.0. Die relative Anordnung ist wichtig: Die Plugin-Abhängigkeiten verweisen auf die lokal gebaute DJI-Toolchain. Die folgenden Befehle beginnen im Elternverzeichnis des entpackten Ordners `flugdeck-fh2`.

```bash
git clone https://github.com/dji-sdk/FlightHub-2-Plugin.git
git -C FlightHub-2-Plugin checkout --detach f2947c90670c2e3382ead6e8d9ab68c9170c3fa9
cd FlightHub-2-Plugin
corepack enable pnpm
pnpm --version
pnpm install --frozen-lockfile
NODE_OPTIONS=--max-old-space-size=4096 pnpm build:tooling

cd ../flugdeck-fh2
pnpm install --frozen-lockfile
pnpm run generate
pnpm run validate
pnpm run typecheck
pnpm test
pnpm run pack
pnpm run dev
```

Öffne die vom Entwicklungsserver ausgegebene lokale Adresse. Im Mock Host über eine Gerätekarte das virtuelle Cockpit öffnen und links **Flugdeck** auswählen. Erwartet wird **Backend erreichbar · Version 0.1.0**. Bei einer unterbrochenen Anfrage erscheint eine Fehlermeldung. Nach Wiederherstellung der Verbindung prüft der Button erneut.

## Aufbau

| Bestandteil | Aufgabe |
| --- | --- |
| `packages.json` und `exp_flugdeck/capabilities.json` | Paket und zugehörige Capability deklarieren |
| `frontend/exp_flugdeck_frontend/src/plugin.ts` | Cockpit-Erweiterung anmelden, Status halten und den Gateway-Aufruf ausführen |
| `src/views/status-panel/` im Frontend | Vue-Panel über den typisierten View-Vertrag anbinden |
| `backend/exp_flugdeck_backend/handlers/flugdeck/status.ts` | Versionsauskunft für `flugdeck.status` liefern |

Die Member liegen unter `exp_flugdeck/`. Der Entry ruft `ctx.apiCall('/plugin/invoke', …)` mit der Backend-ID `exp_flugdeck_backend` auf. Das Frontend deklariert ausschließlich `platform:http`. Das Backend hat eine leere Allowlist und enthält weder Ereignisabonnements noch Workflows. Authentifizierung und Routing übernimmt der DJI-Host.

## Spätere Übernahme in Flugdeck

Den Quellordner als eigenständigen pnpm-Workspace übernehmen. Am einfachsten bleibt `FlightHub-2-Plugin/` als Nachbarordner von `flugdeck-fh2/` bestehen. Bei einer anderen SDK-Position die lokalen `file:`-Verweise in beiden `package.json` und in `pnpm-workspace.yaml` gemeinsam anpassen und die Sperrdatei neu erzeugen. `pnpm run pack` gibt bei Erfolg `UPLOAD_READY` und den Pfad zum Installationspaket aus. Der spätere Upload und die Prüfung im DJI-Zielmandanten sind separate Schritte.

[DJI-Plattformarchitektur](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/docs/cn/90.plugin-development/30.detailed-guide/10.concepts/20.platform-architecture.md)
