# Architektur

## Datenfluss

```mermaid
flowchart LR
  UI[React / GitHub Pages] -->|Sitzung| Auth[Supabase Auth]
  UI --> Draft[Lokale Textentwürfe]
  Draft --> Queue[Persistente IndexedDB-Outbox]
  Queue -->|UUID + erwartete Version| RPC[PostgreSQL mutate]
  RPC --> Check[Berechtigung + Validierung + Versionsvergleich]
  Check --> TX[Atomare Transaktion]
  TX --> Data[Relationale Teamdaten]
  TX --> Audit[Audit-Log]
  TX --> Receipt[Idempotenzbeleg]
  Audit -->|RLS-gefiltertes Realtime-Ereignis| UI
  UI -->|Admin + gültiger Bearer-Token| Edge[Einladungsfunktion]
  Edge --> Auth
  Edge -->|Serverinterner Schlüssel| Access[Geprüfte Kontoberechtigung]
```

## Tabellen

`teams` umfasst den Workspace. `profiles` gehört zu Supabase-Auth-Konten; `user_permissions` verbindet Konten und Teams samt Modulen. `team_members` beschreibt Roleplay-Teammitglieder und benötigt keinen eigenen Login. `roles` und `member_roles` bilden Mehrfachzuweisungen ab. Ränge, Zusatzrollen und erhaltene Sonderrollen sind getrennte Rollenkategorien.

`meetings`, `meeting_topics` und `meeting_attendance` sind eigenständige Datensätze je Sitzung. Ein Unique-Constraint verhindert doppelte Anwesenheit desselben Mitglieds in einer Sitzung. Name und Rollen werden bei Erstellung als Snapshot erfasst. Archivierte Mitglieder bleiben referenzierbar.

`warnings` enthält alle ursprünglichen Verwarnungen. `warning_status` ist eine RLS-sichere `security_invoker`-View, die Aktivität in Europe/Berlin berechnet. `team_wishes` bildet den vollständigen Wunschlebenszyklus ab. `audit_logs` enthält servergenerierte Änderungen. `mutation_receipts` speichert autorisierte Vorgänge zur sicheren Wiederholung; Browser dürfen diese Tabelle nicht direkt lesen oder ändern.

## Transaktionen und Konflikte

`mutate` whitelisted Tabellen und Felder, prüft `auth.uid()`, Teamrolle und freigegebenes Modul. Ein Advisory Lock serialisiert doppelte Operation-IDs. Ein Zeilenlock plus erwartete Version erkennt parallele Änderungen. Die Datenbank erhöht die Version selbst. Ein Mitglied einschließlich seiner Rollen wird gemeinsam committed oder vollständig zurückgerollt. Dasselbe gilt für die Anlage einer Sitzung samt Themen und Anwesenheitsliste.

Die Outbox sendet in Reihenfolge. Jede Operation liegt separat in IndexedDB, damit neue Vorgänge anderer Tabs nicht durch eine komplette Warteschlangenüberschreibung verschwinden. Die Anwendung bestätigt Erfolg nach Serverantwort und Aktualisierung der Daten. Lokale Fehler und Versionskonflikte behalten die Entwürfe. Es gibt kein automatisches „letzter Schreibvorgang gewinnt“.

## Sicherheitsgrenze

Die Browserumgebung erhält ausschließlich den öffentlichen Supabase-Key. Auth prüft die Sitzung; RLS filtert Leser. Direkte Tabellenwrites sind entzogen. Security-Definer-Funktionen verwenden einen leeren `search_path`, explizite Schemaangaben und eingeschränkte EXECUTE-Grants. Privilegierte Einladungen verwenden eine Edge Function mit geprüfter Auth-Sitzung und aktueller Administratorberechtigung.

Backups und Wiederherstellung wurden vom Auftraggeber zurückgestellt und sind nicht Teil dieser Architekturversion.
