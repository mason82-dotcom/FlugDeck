# FlugDeck Cockpit

Das linke Cockpit-Panel beantwortet eine Frage: Hat das Plugin-Backend auf die letzte Prüfung geantwortet? Die große Statuszeile nennt das Ergebnis. Darunter stehen Backend-Version, lokale Uhrzeit und Dauer der Anfrage. Ein neuer Versuch entfernt die Werte des vorherigen Aufrufs.

Die Fläche ist schiefergrau (#182128), der Primärtext hell (#edf3f5). Türkis kennzeichnet eine erfolgreiche Antwort, Ocker eine laufende Prüfung und Apricot einen Fehler. Jeder Zustand hat eine Textbezeichnung. Die Zahlen verwenden tabellarische Ziffern. Lange Fehlermeldungen brechen innerhalb der Panelbreite um.

Die einzige Aktion bleibt am gleichen Platz und hat mindestens 44 Pixel Höhe. Während der Prüfung ist sie gesperrt. Tastaturfokus bleibt sichtbar. Der Status wird über eine Live-Region angekündigt. Systemschriften und lokal ausgelieferte Assets halten das Panel unabhängig von externen Ressourcen.
