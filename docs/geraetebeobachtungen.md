# FlugDeck-Gerätebeobachtungen · Version 1

Dieses **lokale Importformat** ist ein FlugDeck-Testvertrag, kein DJI-Cloud-API-Payload und keine FlightHub-OpenAPI-Antwort. Der manuelle Import liest keine Geräte oder Zielmandanten aus. Er akzeptiert ausschließlich anonymisierte Kennungen; keine Seriennummern, Projekt-UUIDs, URLs, Tokens oder Kundendaten eingeben. Der Text wird nach dem Prüfen entfernt, nicht gespeichert und nicht an das Backend gesendet. Die Ansicht kennzeichnet Beispiel, Import und den separaten [serverseitigen Live-Pfad](live-anbindung.md) mit ihrer jeweiligen Herkunft.

```json
{
  "schemaVersion": 1,
  "devices": [
    { "key": "demo-rc", "model": "rc-pro", "gatewayKey": null, "online": true, "topologyAt": 1794150000000, "osdAt": null },
    { "key": "demo-m3e", "model": "m3e", "gatewayKey": "demo-rc", "online": true, "topologyAt": 1794150000000, "osdAt": 1794150000000 }
  ]
}
```

`topologyAt` und `osdAt` sind Unix-Millisekunden. Für einen unmittelbaren Test müssen sie zur aktuellen Uhrzeit passen; das obige Beispiel ist nur eine Formatvorlage. `null` bedeutet nicht beobachtet. Erlaubte Modelle: `rc-pro`, `rc-plus-2`, `m3e`, `m3t`, `m3m`, `m4t`. Fluggeräte verweisen mit `gatewayKey` auf einen Controller aus derselben Liste; Controller setzen dieses Feld auf `null`. Der Import akzeptiert 1 bis 20 Geräte und höchstens 16 KiB. Unbekannte Felder werden verworfen. Bei einem Fehler werden auch die zuvor gezeigten Werte gelöscht.

Die Auswertung zeigt Topologie höchstens 60 Sekunden und OSD höchstens 10 Sekunden nach der Meldung als aktuell. Eine fehlende, veraltete oder offline gemeldete Gateway-Topologie macht den Status des verknüpften Fluggeräts unbekannt. OSD ohne frische Online-Topologie bleibt unbekannt. Diese Grenzwerte sind **FlugDeck-Demo-Regeln**, keine DJI-Protokollgarantie. Der DJI-Cloud-API-Statuskanal meldet Änderungen ereignisbasiert; aus einem ausbleibenden State-Event allein wird hier keine Offline-Behauptung abgeleitet. Die M3M wird für FlightHub 2 derzeit nicht als unterstützt behandelt und daher nie als online dargestellt.

Der On-Premises-OpenAPI-Adapter projiziert einen dokumentierten lesenden Topologie-Endpunkt in diesen Vertrag; die konkrete Antwortform und Rechte der installierten DJI-Version müssen im Zielmandanten geprüft werden. `x-user-token` und `X-Project-Uuid` gehören nicht in das Plugin-Frontend oder ein Installationspaket. Der manuelle Import ist keine Abnahme der realen Hardware.
