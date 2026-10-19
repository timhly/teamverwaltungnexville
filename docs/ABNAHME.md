# Abnahmeprotokoll · Nexville Roleplay

Stand: 19.10.2026. Im verbundenen Supabase-Projekt wurden alle acht Migrationen angewendet, der Nexville-Teamraum mit neun Ausgangsmitgliedern angelegt und Administratorrechte sowie Anzeigename „Smok“ für Discord-ID `470653391094415362` per Datenbankabfrage bestätigt. ApX und Soon haben ihre geschützten Ränge und keine unaufgehobenen Verwarnungen. Die vollständige produktive Konfiguration wurde nicht geprüft. Die lokalen Ergebnisse beziehen sich auf den ausgelieferten Code und die PostgreSQL-Testumgebung.

## Lokal überprüft

| Prüfung | Ergebnis |
|---|---|
| TypeScript-Prüfung und Vite-Produktionsbuild | Erfolgreich |
| PostgreSQL-Migrationen ausführen | Erfolgreich mit PGlite/PostgreSQL |
| Einmaliger Ausgangsbestand, neun Mitglieder, 21 Rollen | Erfolgreich |
| Acht Hauptränge in der vorgegebenen Reihenfolge | Erfolgreich |
| Fünf getrennte Zusatzrollen einschließlich Supportleitung und Teamleitung | Erfolgreich |
| Mehrfachrollen, tatsächliche Zählung und getrennte Referenzzahlen | Erfolgreich |
| Anonyme und fremde Konten ausschließen | Datenbanktests erfolgreich |
| Leser darf lesen, aber weder RPC noch Tabellenwrite ausführen | Erfolgreich |
| Modulrechte für Bearbeiter, kein eigenes Hochstufen | Erfolgreich |
| Letzten Administrator vor Entfernung/Herabstufung schützen | Erfolgreich |
| Teamübergreifende Rollenreferenzen ablehnen | Erfolgreich |
| Rollenzuweisungen und Mitglied atomar speichern/zurückrollen | Erfolgreich |
| Doppelte Vorgänge mit identischer UUID nur einmal verarbeiten | Erfolgreich |
| Veraltete Datensatzversion mit Konflikt ablehnen | Erfolgreich |
| Je Sitzung 13 Themen und eigene Teilnehmerstatuswerte | Erfolgreich |
| Historische Namen und Rollen bei Umbenennung/Archivierung erhalten | Erfolgreich |
| Sitzung kopieren, Themen übernehmen, Anwesenheit und Erledigung zurücksetzen | Erfolgreich |
| Verwarnungsdaten validieren, Ablauf berechnen, Aufhebung historisieren | Erfolgreich |
| Berliner Tagesgrenzen und Sommer-/Winterzeit | Erfolgreich |
| Audit unveränderbar für Anwendungskonten, tatsächlicher Akteur | Erfolgreich |
| Persistenz vor Versand, Bestätigung erst nach Antwort, Outbox-Wiederaufnahme | Erfolgreich |
| Stopp bei Konflikt, keine unkontrollierte Folgeänderung | Erfolgreich |
| Neue Mitglieder und Wünsche über die echte React-Oberfläche bearbeiten | Im lokalen Browser geprüft |
| Bestätigte Änderungen nach Neuladen weiterhin vorhanden | Im lokalen Browser geprüft |
| Besprechungsthemen, Anwesenheit und Kopien über die Oberfläche | Im lokalen Browser geprüft |
| Verwarnung und Wunschstatus nach Neuladen erhalten | Im lokalen Browser geprüft |
| Reader-Oberfläche und manipulierten Write ablehnen | Im lokalen Browser geprüft |
| Netzwerkabbruch, erhaltene Outbox, erfolgreiche spätere Synchronisierung | Im lokalen Browser geprüft |
| Desktop, 390-px-Mobilansicht, Navigation, kein globales Überlaufen | Im lokalen Browser geprüft |
| Light Mode und Dark Mode | Im lokalen Browser geprüft |
| Ausschließlich Discord als Anmeldeoption, OAuth-Rückkehr und verständlicher Abbruch | Im lokalen Browser mit simuliertem Auth-Anbieter geprüft |
| Zugangsanfrage, Admin-Freigabe und Zugang im zweiten Browserkontext | Im lokalen Browser mit tatsächlichen PostgreSQL-Funktionen geprüft |
| Bestätigte Discord-ID statt manipulierbarer Profilmetadaten | Datenbanktests erfolgreich |
| Alle fünf freigegebenen Discord-IDs direkt als Administrator, wiederholbar ohne doppelte Änderung | Datenbanktests erfolgreich |
| Automatische Administratorfreigabe im Browser, nach Neuladen erhalten | Mit verknüpfter Discord-Testidentität geprüft |
| Keine Freigabe durch fremde Provider, eigene Rechtevergabe oder bearbeitbare Metadaten | Datenbanktests erfolgreich |
| Verwarnungen für Projektleitung und Management, auch durch Administratoren und mit manipulierten Requests, ablehnen | Datenbanktests erfolgreich |
| Bei Beförderung bestehende/future Verwarnungen aufheben und Wiederaktivierung verhindern | Datenbanktests erfolgreich |
| Administration und sonstige Ränge bleiben verwarnbar, Website-Adminrecht ist keine Ausnahme | Datenbanktests erfolgreich |
| Verwarnungsmenü mit Tastatur, geschützten Mitgliedern und 390-px-Mobilansicht | Im lokalen Browser geprüft |
| Alle fünf festen Discord-Anzeigenamen und Autorenangaben neuer/geänderter Logs | Datenbanktests erfolgreich |
| Gemeinsames Profil-GIF mit 320 × 320 Pixeln und 171 Frames | Originaldatei und Browserabruf geprüft |

Reproduzieren mit `npm test`, `npm run test:e2e` und `npm run build`. Die Suite umfasst 65 Unit-/Datenbanktests und 14 Browsertests, einschließlich sofortigem Neuladen vor Ablauf der Speicherpause und einem konkurrierenden Serverwrite. Der Browserbericht dokumentiert die Szenarien und ihre Screenshots. Auth-Antworten und Discord-Weiterleitungen sind lokale Test-Fixtures; diese Tests ersetzen keine Prüfung an Discord und dem echten Supabase-Projekt.

## Noch nicht verifiziert

Diese Schritte benötigen die vom Eigentümer anzulegenden Dienste:

- Tatsächlicher Login und Session-Erneuerung an gehostetem Supabase Auth.
- Discord-Anwendung, Callback-URLs, Provider-Geheimnis, erste Discord-Anmeldung und bestehende Kontoverknüpfung am gehosteten Dienst.
- Abschaltung des E-Mail-Anbieters im gehosteten Supabase-Dashboard.
- Gehostete RLS-/RPC-Endpunkte hinter PostgREST mit echten Benutzer-JWTs. Dieselben SQL-Regeln wurden lokal getestet; die externe Konfiguration wurde noch nicht geprüft.
- Realtime-Verbindung und Aktualisierung zwischen zwei tatsächlichen Geräten.
- GitHub-Actions-Ausführung im eigenen Repository und tatsächliche GitHub-Pages-Veröffentlichung.
- Render-Deployment unter der endgültigen Domain.
- Richtiger Basispfad, Auth-Redirect und Bannerabruf unter der endgültigen Domain.
- Tatsächlicher PDF-Druckdialog und Ergebnis im Zielbrowser.
- Lastprüfung mit sehr großen Datenmengen und Langzeitbetrieb.

## Bewusst zurückgestellt

Auf ausdrücklichen Wunsch sind automatische Backups, verschlüsselte externe Kopien, PC-Synchronisierung, Backup-Verwaltung und Testwiederherstellung vorerst nicht eingerichtet. Diese ursprünglichen Kriterien gelten deshalb nicht als bestanden.

## Empfohlener Live-Abnahmedurchlauf

1. Als Administrator anmelden, ein Testmitglied mit Supporter und Unternehmensverwaltung anlegen.
2. Information bearbeiten, Serverbestätigung abwarten, neu laden und mit einem zweiten Gerät kontrollieren.
3. Dasselbe Mitglied gleichzeitig auf zwei Geräten bearbeiten und den angezeigten Konflikt prüfen.
4. Neue Besprechung anlegen, Thema und Anwesenheit ändern, eine zweite Besprechung erstellen und die getrennten Listen kontrollieren.
5. Verwarnung mit Ablaufdatum anlegen; Aufhebung und Historie kontrollieren.
6. Wunsch anlegen, Status ändern und im Audit die Vorher-/Nachher-Werte prüfen.
7. Leser und Bearbeiter nach Discord-Anmeldung freigeben; mit deren eigenen Konten die zulässigen und unzulässigen Aktionen prüfen.
8. Browser kurz offline schalten, bearbeiten, schließen beziehungsweise neu laden, online gehen und den erhaltenen Entwurf synchronisieren.
9. Sitzung als PDF speichern und CSV-Export in der verwendeten Tabellenkalkulation öffnen.
10. Nach GitHub-Deployment dieselben grundlegenden Schritte unter der endgültigen URL wiederholen.
11. Mit einer der fünf freigegebenen Discord-IDs anmelden und direkten Administratorzugriff prüfen. Mit einem anderen Discord-Konto Zugang anfragen, als Leser freigeben und die Rechte prüfen.
