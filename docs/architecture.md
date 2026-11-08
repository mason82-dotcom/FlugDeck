# FlugDeck – Systementwurf

Stand: Version 0.3.0. Grundlage sind das DJI-Toolchain-Repo `dji-sdk/FlightHub-2-Plugin` (Commit `f2947c9`) und der Code in diesem Repo.

**Kennzeichnung der Quellen:**
- *[SDK]*: im SDK, in den Schemas oder in den generierten Typen nachgewiesen
- *[Annahme]*: eigene Annahme
- *[verifizieren]*: im öffentlichen Vertrag nicht eindeutig, vor der Umsetzung prüfen

## 1. Anforderungen

### Funktional
| # | Anforderung | Status |
| --- | --- | --- |
| F1 | Live-Telemetrie im Cockpit: Höhe, Geschwindigkeiten, Entfernung zum Startpunkt, Position, Flugsteuerung | umgesetzt |
| F2 | Flüge automatisch über die Cockpit-`flightId` erfassen, mit Start, Ende, maximaler Höhe und Geschwindigkeit | umgesetzt (nur bei geöffnetem Panel, siehe 4.2) |
| F3 | Flugbuch pro Projekt anzeigen | umgesetzt (die neuesten 50 Flüge) |
| F4 | Notiz zur Aufgabe im Planformular (`biz_ext.flugdeck`) | umgesetzt |
| F5 | Medien eines Flugs zuordnen | nur ein manueller Verweis (`media_ref`) |
| F6 | Hinweis-Popup im Message-Host | Platzhalter |

### Nicht funktional
- **Latenz:** Jeder Backend-Aufruf ist auf 8 s begrenzt. Die Telemetrie wird nur lokal angezeigt und nicht über das Netz geschickt.
- **Last:** Gering, siehe Abschnitt 5. Das Flugbuch ist kein Hochlastsystem.
- **Datentreue:** Ein Flug darf nie doppelt vorkommen. Ein fehlender Abschluss ist eher hinnehmbar als ein falscher.
- **Isolation:** Views laufen in ihrer ShadowRoot und dürfen den Host nicht verändern (DJI-Regeln FV1–FV8). Das Backend sieht nur die Fähigkeiten aus seiner Allowlist. *[SDK]*

### Randbedingungen
- Plattformgrenzen *[SDK]*:
  - Es gibt nur die Hosts `cockpit`, `plan`, `message` und `project`.
  - Der Speicher hat nur sechs Operationen und speichert alle Werte als Text.
  - `schema.sql` erlaubt nur TEXT- und TIMESTAMPTZ-Spalten, ohne DEFAULT und ohne Fremdschlüssel.
  - Backend-Handler laufen synchron in einer Sandbox.
- Team und Betrieb *[Annahme]*: Ein kleines Team ohne eigene Server. Betrieb und Deployment übernimmt der FH2-Mandant.

## 2. Überblick

```
 FlightHub 2 (Browser)                                          FH2-Plattform
┌─────────────────────────────────────────────────────┐      ┌──────────────────────────────┐
│ Cockpit-Host                                        │      │  Plugin-Gateway              │
│  cockpit:telemetry ──► telemetry.ts ──┐             │      │  /plugin/invoke              │
│  cockpit:context ──► flight-tracker ──┼─► API-Client├─────►│  (Auth, Routing, Timeout)    │
│                       (flightId)      │             │      └─────────────┬────────────────┘
│  View status-panel ◄── ViewState ◄────┘             │                    │
├─────────────────────────────────────────────────────┤      ┌─────────────▼────────────────┐
│ Project-Host: project:context ─► View flightlog-page├─────►│  Backend exp_flugdeck_backend│
├─────────────────────────────────────────────────────┤      │  handlers/flightlog/*        │
│ Plan-Host: plan:form-context ─► plan-note ─► biz_ext│      │  handlers/flugdeck/status    │
│            (wird ohne Backend mit der Aufgabe gesp.)│      │        │ store (data:r/w)    │
├─────────────────────────────────────────────────────┤      │        ▼                     │
│ Message-Host: alert-popup (unsichtbar)              │      │  plugin_db_flugdeck_flight   │
└─────────────────────────────────────────────────────┘      └──────────────────────────────┘
```

- **Frontend** (`exp_flugdeck_frontend`): Ein Einstieg (`plugin.ts`) verteilt die Aktivierung nach Host. Logik und Zustand liegen im Plugin-Realm. Die Views sind reine Darstellung und sprechen über typisierte View-Verträge mit dem Realm.
- **Backend** (`exp_flugdeck_backend`): Zustandslose HTTP-Handler. Einzige Datenquelle ist `plugin_db_flugdeck_flight`.
- **Plan-Notiz:** Sie läuft absichtlich nicht über das Backend. Der Host speichert `biz_ext` zusammen mit der Aufgabe.

### Datenfluss: Flug erfassen
```
cockpit:context {flightId: null → "F1"}   ──► tracker.begin("F1")
   ├─ Startwerte = letzte Telemetrieprobe
   └─ Warteschlange: flightlog.start {flightKey:F1, projectId, droneSn, startedAt}
cockpit:telemetry onStateChanged          ──► tracker.sample() → Maximalwerte
cockpit:context {flightId: "F1" → null}   ──► tracker.end()
   └─ Warteschlange: flightlog.finish {flightKey:F1, finishedAt, maxHeightM, maxSpeedMs}
```
Die Warteschlange stellt sicher, dass ein `finish` nie vor dem zugehörigen `start` ankommt.

## 3. Details

### 3.1 Datenmodell (`schema.sql`)
| Spalte | Typ | Bedeutung |
| --- | --- | --- |
| `id`, `tenant_id`, `created_at`, `updated_at` | Plattformfelder | werden von der Plattform gesetzt *[SDK]* |
| `flight_key` | TEXT UNIQUE | `flightId` aus dem Cockpit, fachlicher Idempotenzschlüssel |
| `project_id` | TEXT, Index | Filter für die Liste |
| `drone_sn` | TEXT | Seriennummer der Drohne |
| `status` | TEXT | `active` oder `finished` |
| `started_at_ms`, `finished_at_ms` | TEXT, 13-stellig | feste Breite, damit Textvergleiche richtig sortieren; Index auf dem Start |
| `max_height_m`, `max_speed_ms` | TEXT | Dezimalzahlen mit einer Nachkommastelle |
| `media_ref` | TEXT | Medienverweis (F5) |

**Zustände:** `(kein Eintrag) ─start→ active ─finish→ finished`. Ein `finish` aktualisiert nur Zeilen mit `status = active`. Ein zweiter Abschluss ändert deshalb nichts.

### 3.2 API (`POST /plugin/invoke`, `pluginId = exp_flugdeck_backend`)
| Handler | Eingabe | Antwort | Idempotenz |
| --- | --- | --- | --- |
| `flugdeck.status` | – | `{service, version}` | lesend |
| `flightlog.start` | `flightKey*`, `projectId*`, `droneSn`, `startedAt` | Eintrag + `created` | `createIfAbsent` über `flight_key` |
| `flightlog.finish` | `flightKey*`, `finishedAt`, `maxHeightM`, `maxSpeedMs` | Eintrag | nur `active → finished` |
| `flightlog.list` | `projectId*`, `limit` (1–100) | `{items, total}` | lesend |
| `flightlog.attachMedia` | `flightKey*`, `mediaRef*` | Eintrag | überschreibt den Verweis |

**Fehler:**
- `INVALID_ARGUMENT`: Eingabe ungültig
- `NOT_FOUND`: Flug unbekannt
- `INTERNAL`: Speicherfehler, mit dem Code des Speichers

Der Client übersetzt Zeitüberschreitung, Gateway-Fehler und Fehlercodes in deutsche Meldungen.

### 3.3 Caching
Keins. Das Flugbuch wird selten gelesen, die Telemetrie kommt per Push vom Host. `cache` und `setnx` wären nur bei einer Liste im Sekundentakt sinnvoll. *[SDK: `cache:read/write` vorhanden]*

### 3.4 Fehlerbehandlung heute
- Schlägt `start` fehl, wechselt das Panel auf `error`. Der Flug wird dann auch nicht abgeschlossen, damit kein `NOT_FOUND` folgt.
- Schlägt `finish` fehl, wird der Fehler angezeigt. Der Eintrag bleibt aber `active`.
- **Lücke:** Es gibt keine Wiederholungsversuche. `apiCall` bietet `idempotencyKey` an *[SDK: contracts/context.ts]*, wird aber noch nicht genutzt.

## 4. Zuverlässigkeit: bekannte Lücken und Vorschläge

### 4.1 Mehrere Cockpits beobachten dieselbe Drohne
- **Anlegen:** Unkritisch, weil die Eindeutigkeit über `flight_key` gesichert ist.
- **Abschluss:** Der erste Client, der `finish` schickt, gewinnt. Seine Maximalwerte stammen nur aus den Proben, die er selbst gesehen hat.
- **Vorschlag:** `finish` übernimmt das Maximum aus gespeichertem und gemeldetem Wert. Dazu den Datensatz lesen und dann bedingt aktualisieren. Das ist nicht atomar, reicht für Maximalwerte aber aus.

### 4.2 Panel wird während des Flugs geschlossen (wichtigste Lücke)

*Stand nach dem Code-Review:* Der Tracker gleicht jetzt alle Übergänge nacheinander mit dem zuletzt gemeldeten Kontext ab. Ein Flug, der endet, während sein `start` noch läuft, wird danach abgeschlossen. Wird das Projekt erst später bekannt, wird der Flug nachgetragen. Kommen mehrere Kontextwechsel im selben Abgleich-Durchlauf an, gilt nur der letzte. Ein Flug, der kürzer ist als eine `start`-Antwort, wird deshalb nicht erfasst.
Der Eintrag bleibt `active`, solange niemand das Cockpit mit derselben `flightId` wieder öffnet. Drei Wege, das zu lösen:

| Option | Ablauf | Vorteile | Nachteile |
| --- | --- | --- | --- |
| A. Aufräumen im Client | Beim Öffnen des Cockpits ältere `active`-Einträge derselben Drohne abschließen | wenig Aufwand, kein neuer Plattformteil | hängt davon ab, dass jemand das Cockpit wieder öffnet; Endzeit ungenau |
| B. Zeitgesteuerter Workflow | Workflow mit `trigger.schedule` (z. B. alle 15 min) und `run_script`. Einträge, die länger als X Stunden `active` sind, werden als `finished` markiert *[SDK: workflow.schema]* | arbeitet unabhängig vom Client | neue Bausteine (Workflow, Adapter), Endzeit nur geschätzt |
| C. Server-seitige Flugdaten | Plattform-Aktion `query_flight_task` oder Ereignisstrom (`trigger.stream`) für Flugende-Ereignisse | genaue Endzeit, auch ohne geöffnetes Cockpit | Inhalt der Ereignisse und Bezug zu `flightId` *[verifizieren]* |

**Empfehlung:** Jetzt A umsetzen, weil es billig ist. Danach C prüfen; falls C nicht trägt, B als Sicherheitsnetz.

### 4.3 Abschluss schlägt wegen des Netzes fehl
Der Client wiederholt den Aufruf bis zu 3-mal mit 1 s, 2 s und 4 s Wartezeit. `idempotencyKey` ist dabei `finish:<flightKey>`. Danach bleibt Option A aus 4.2 als Rückfallebene.

### 4.4 Eindeutigkeit von `flight_key` über Mandanten *[verifizieren]*
Die physische Tabelle teilen sich alle Mandanten. `flight_key` ist global `UNIQUE`, und `createIfAbsent` prüft per `ON CONFLICT` genau diese Spalte. So machen es auch die DJI-Beispiele. Ein Index über `(tenant_id, flight_key)` würde `createIfAbsent` brechen, weil der Plugin-Code `tenant_id` nicht verwenden darf. Das ist nur sicher, wenn die `flightId` des Cockpits global eindeutig ist, zum Beispiel eine UUID. Vor dem Produktivbetrieb klären. Falls nicht: `flight_key` aus `projectId/flightId` bilden, denn Projekt-IDs sind global eindeutig.

### 4.5 Berechtigungen und Datenschutz *[verifizieren]*
`flightlog.list` filtert nach der `projectId`, die der Client schickt. Zu klären ist, ob das Gateway den Projektbezug erzwingt oder nur den Mandanten über `tenant_id`. Erzwingt es den Projektbezug nicht, können Nutzer desselben Mandanten fremde Projekt-Flugbücher abfragen. Mögliche Maßnahmen: projektbezogenen Request-Kontext im Backend prüfen, falls die Plattform einen liefert. Sonst das Risiko dokumentieren und akzeptieren. `drone_sn` ist ein Gerätebezug und nicht personenbezogen *[Annahme]*.

## 5. Last und Skalierung

**Annahmen** *[Annahme]*: 50 Drohnen pro Mandant, je 10 Flüge pro Tag, 20 Abrufe des Flugbuchs pro Tag und Projekt.

| Vorgang | Volumen |
| --- | --- |
| `start` + `finish` | 50 × 10 × 2 = 1.000 Aufrufe pro Tag, also unter 0,1 pro Sekunde |
| `list` | zu vernachlässigen |
| Speicher | 500 Zeilen pro Tag, rund 180.000 pro Jahr bei etwa 300 Byte pro Zeile, also etwa 55 MB pro Jahr |

**Folgen:**
- **Nicht nötig:** Die Last braucht weder Warteschlangen noch Caches oder Sharding.
- **Engpass:** Die Liste wächst. Die neuesten 50 Einträge sind schnell, weil es einen Index auf `project_id` und einen auf `started_at_ms` gibt.
- **Nächster Schritt bei Bedarf:** Blättern mit Cursor über `started_at_ms < x` statt über `offset`. Außerdem einen gemeinsamen Index auf `(project_id, started_at_ms)`, wenn `schema.sql` das per `CREATE INDEX` erlaubt.

**Telemetrie:** Sie wird bewusst nicht gespeichert. Einzelne Telemetriepunkte zu speichern (1 Hz × Flugdauer) würde die Datenmenge etwa 1.000-fach erhöhen. Dafür wäre eine eigene Lösung nötig: Proben bündeln, eine Zeile pro Minute, eventuell als Objekt-Upload.

**Ausfallsicherheit:** Die übernimmt die Plattform. FlugDeck selbst hat keinen Server.

## 6. Monitoring
- **Backend:** `log` ist immer verfügbar *[SDK]*. Geloggt werden sollte `flightKey`, Ergebnis und Laufzeit pro Handler, aber keine Positionsdaten.
- **Frontend:** `ctx.logger` gibt Warnungen aus, wenn Capabilities fehlen. Im Mock-Host erscheinen sie in der Diagnoseansicht.
- **Kennzahl für das Flugbuch:** Anzahl der Einträge, die länger als 12 h `active` sind. Steigt sie, bleiben Flüge offen (4.2).

## 7. Abwägungen

| Entscheidung | Gewählt | Alternative | Grund |
| --- | --- | --- | --- |
| Wer erkennt Flüge? | Client über `flightId` | Server über Ereignisse | belegter Vertrag, sofort verfügbar; Server-Weg noch unklar (4.2 C) |
| Maximalwerte | Client-Proben | Telemetrie speichern, Server rechnet | keine Datenflut; Preis: Werte unvollständig, wenn Proben fehlen |
| Notiz-Speicherung | `biz_ext` am Host | eigene Tabelle | kein Backend-Aufruf, Kopieren von Aufgaben funktioniert von selbst; Preis: nur ein Plugin pro Aufgabe darf Zusatzdaten speichern |
| Medien | manueller `media_ref` | `media.list/attach` *[SDK: backend/media.ts]* | Bedeutung von `ownerType`/`ownerID` *[verifizieren]* |
| Zahlen als Text | ja | – | vom Speicher vorgegeben *[SDK]* |

## 8. Später überprüfen
1. **Mehr als ~10.000 Flüge pro Projekt:** Blättern mit Cursor und Filter nach Zeitraum oder Drohne.
2. **Bei Medien-Integration:** Medien über `media:read` nach Drohne und Zeitfenster zuordnen. Eventuell ein Flug-Ordner pro Eintrag über `media.ensureFolder` *[verifizieren]*.
3. **Wenn Auswertungen gefragt sind** (z. B. Flugstunden pro Drohne): Kennzahlen bei `finish` mitschreiben, nicht bei jedem Abruf berechnen.
4. **Wenn Plattform-Ereignisse zum Flugende belegt sind:** Erfassung auf den Server verlagern. Das Panel zeigt dann nur noch an.
5. **Wenn mehrere Plugins `biz_ext` beanspruchen:** Die Notiz in die eigene Tabelle verschieben, mit Bezug zur Aufgabe.
