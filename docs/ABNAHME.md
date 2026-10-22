# Abnahmeprotokoll · Nexville Roleplay

Stand: 22.10.2026. Im verbundenen Supabase-Projekt wurden alle elf Migrationen angewendet, der Nexville-Teamraum mit neun Ausgangsmitgliedern angelegt und Administratorrechte sowie Anzeigename „Smok“ für Discord-ID `470653391094415362` per Datenbankabfrage bestätigt. ApX und Soon haben ihre geschützten Ränge und keine unaufgehobenen Verwarnungen. Die vollständige produktive Konfiguration wurde nicht geprüft. Die lokalen Ergebnisse beziehen sich auf den ausgelieferten Code und die PostgreSQL-Testumgebung.

Migration 011 ergänzt endgültiges Löschen für Administratoren bei Mitgliedern und Besprechungen. Sie entfernt selbst keine bestehenden Einträge. Abhängigkeiten werden in derselben Transaktion entfernt beziehungsweise gelöst; Audit-Protokolle bleiben erhalten. Lokal bestanden 69 Tests, der Produktionsbuild und ein Browsertest für Bestätigung, Abbrechen und Beständigkeit nach Neuladen. Die Datenbanktests prüfen zusätzlich archivierte Einträge, abhängige Daten, Rechte, Versionskonflikte und wiederholte Operationen.

## Lokal überprüft

| Prüfung | Ergebnis |
|---|---|
| TypeScript-Prüfung und Vite-Produktionsbuild | Erfolgreich |
| PostgreSQL-Migrationen ausführen | Erfolgreich mit PGlite/PostgreSQL |
| Einmaliger Ausgangsbestand, neun Mitglieder, 22 Rollen | Erfolgreich |
| Neun Hauptränge in der vorgegebenen Reihenfolge | Erfolgreich |
| Sechs getrennte Zusatzrollen einschließlich Head-Analyst | Erfolgreich |
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

Reproduzieren mit `npm test`, `npm run test:e2e` und `npm run build`. Die Suite umfasst 66 Unit-/Datenbanktests und 14 Browsertests, einschließlich sofortigem Neuladen vor Ablauf der Speicherpause und einem konkurrierenden Serverwrite. Konfliktantworten werden als `PT409` geprüft; auch alte `40001`-Antworten stoppen die lokale Warteschlange. Der Browserbericht dokumentiert die Szenarien und ihre Screenshots. Auth-Antworten und Discord-Weiterleitungen sind lokale Test-Fixtures; diese Tests ersetzen keine Prüfung an Discord und dem echten Supabase-Projekt.

## Behobener API-Timeout am 19.10.2026

Die direkten SQL-Abfragen funktionierten, während die öffentliche Daten-API nach 20 Sekunden abgebrochen werden musste. PostgREST 14.18 wiederholte `mutate`-Aufrufe mit dem bisherigen fachlichen Fehlercode `40001` fortlaufend. Migration 009 ersetzt ausschließlich diesen Code in `mutate` und `review_access_request` durch `PT409`. Nach Anwendung antworteten die REST-Leseendpunkte in etwa 70–80 ms mit dem erwarteten HTTP 401 für anonyme Aufrufer; die blockierten PostgREST-Verbindungen waren frei. Die Website und ihr JavaScript-Bundle lieferten HTTP 200. Es wurden keine Nutzerdatensätze gelöscht oder lokale Entwürfe verworfen.

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

Am 22.10.2026 wurden Head-Analyst (lila, #a78bfa) und HighTeam (hellblau, #7dd3fc) ergänzt. Die vorhandene High-Team-Rollen-ID bleibt erhalten. 66 Unit-/Datenbanktests, der Produktionsbuild und der gezielte Browsertest für Rollenauswahl, Speicherung sowie Mitgliedersortierung unter Management und über Administration waren erfolgreich.
