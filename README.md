# Flugdeck für DJI FlightHub 2

Das Cockpit-Panel **Flugdeck** prüft beim Öffnen und über **Verbindung prüfen**, ob sein Backend erreichbar ist. Bei Erfolg zeigt es die vom Handler gemeldete Version sowie Uhrzeit und Dauer der Prüfung. Nach acht Sekunden meldet der DJI-Aufruf eine Zeitüberschreitung. Bei einem Fehler kann die Prüfung wiederholt werden. Die angezeigte Version beschreibt ausschließlich das Plugin.

**Installationspaket:** [Flugdeck-FH2-0.2.0-Plugin.zip](packages/Flugdeck-FH2-0.2.0-Plugin.zip).

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
| `packages.json` und `exp_flugdeck/capabilities.json` | Paket und zugehörige Capability deklarieren |
| `frontend/exp_flugdeck_frontend/src/plugin.ts` | Cockpit-Erweiterung anmelden, Status halten und den Gateway-Aufruf ausführen |
| `src/views/status-panel/` im Frontend | Vue-Panel über den typisierten View-Vertrag anbinden |
| `backend/exp_flugdeck_backend/handlers/flugdeck/status.ts` | Versionsauskunft für `flugdeck.status` liefern |

Die Member liegen unter `exp_flugdeck/`. Der Entry ruft `ctx.apiCall('/plugin/invoke', …)` mit der Backend-ID `exp_flugdeck_backend` auf. Das Frontend deklariert ausschließlich `platform:http`. Das Backend hat eine leere Allowlist und enthält weder Ereignisabonnements noch Workflows. Authentifizierung und Routing übernimmt der DJI-Host.

## Prüfen und verpacken

Die Tests decken Host-Auswahl, Doppelklick, Zeitüberschreitung, Gatewayfehler, Wiederholung und das Entladen während einer Anfrage ab. Ein Vue-Test montiert das Panel und prüft Zustandswechsel, deaktivierte Bedienelemente und das Aufräumen beim Schließen. Uhrzeit und Anfragedauer beziehen sich auf den letzten abgeschlossenen Aufruf, einschließlich Fehlerantworten.

`pnpm run pack` gibt bei Erfolg `UPLOAD_READY` und den Pfad zur ZIP-Datei aus. Die Installation im DJI-Zielmandanten und die visuelle Prüfung im echten Cockpit stehen aus.

[DJI-Plattformarchitektur](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/docs/cn/90.plugin-development/30.detailed-guide/10.concepts/20.platform-architecture.md) · [SDK-Aufruf und Lebenszyklus](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/packages/fh2-plugin-sdk/src/contracts/context.ts) · [SDK-Fehlerstruktur](https://github.com/dji-sdk/FlightHub-2-Plugin/blob/f2947c90670c2e3382ead6e8d9ab68c9170c3fa9/packages/fh2-plugin-sdk/src/contracts/errors.ts)
