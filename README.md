# Nexville Roleplay · Teamverwaltung

Eine deutschsprachige Teamverwaltung mit React, TypeScript, Vite, Tailwind CSS, Radix-Dialogen im shadcn-Stil, Lucide und Supabase PostgreSQL/Auth. Das mitgelieferte Nexville-Banner wird unverändert verwendet. Schriftdateien liegen im Build; Google Fonts wird nicht angefragt.

**Aktueller Stand:** Der vollständige Anwendungscode, Datenbankmigrationen, Einladungscode, Tests und GitHub-Pages-Workflows liegen vor. Ein Supabase-Projekt und ein GitHub-Repository wurden noch nicht erstellt. Ohne Verbindung zeigt die Anwendung eine Einrichtungsansicht, keine erfundenen Teamdaten. Der produktive Betrieb ist **noch nicht verifiziert**.

**Backups wurden auf ausdrücklichen Wunsch vorerst zurückgestellt.** Es gibt keinen automatischen Backup-Auftrag, keine externe Sicherung und keine PC-Synchronisierung. Der Menüpunkt erklärt diesen Zustand. CSV-Exporte und lokale Entwürfe sind kein vollständiges Datenbankbackup.

Ansichten aus der lokalen Prüfung: [Desktop](docs/preview/desktop.png), [Smartphone](docs/preview/mobile.png), [Light Mode](docs/preview/light.png).

## Was enthalten ist

- Dashboard mit tatsächlichen Mitglieder-, Rollen-, Verwarnungs- und Wunschzahlen, nächster Sitzung und gespeicherten Aktivitäten.
- Mitglieder anlegen, suchen, filtern, sortieren, mit mehreren Rollen versehen, bearbeiten und archivieren. Detailansichten zeigen Verwarnungen, Teilnahmen und letzte Änderungen.
- Rangfolge: **Projektleitung → Management → Administration → Senior Moderator → Moderator → Senior Supporter → Supporter → Test Supporter**.
- Getrennte Zusatzrollen: **Fraktionsverwaltung, Unternehmensverwaltung, Eventverwaltung, Supportleitung, Teamleitung**. Die Reihenfolge gilt für Rollenauswahl, Listen, Abzeichen, Mitglieder, Teilnehmerlisten und Exporte. Eine explizit gewählte alphabetische Sortierung bleibt möglich.
- Bestehende Sonderrollen aus den Screenshots bleiben erhalten, z. B. Teamverwaltung bei HAZE und Supportverwaltung bei Ivy. Diesen Personen wird kein Hauptrang erfunden. Weitere alte Rollen sind unter „Weitere bestehende Rollen“ sichtbar. Neue Zuweisungen konzentrieren sich auf Ränge und Zusatzrollen.
- Rollen erstellen, Namen/Farbe/Abkürzung/Beschreibung bearbeiten, aktive Mitglieder zählen, Referenzzahlen getrennt anzeigen. Nicht zugewiesene Rollen dürfen Administratoren entfernen.
- Besprechungen mit eigenem Archiv, Termin in Europe/Berlin, Leitung, 13 Themenzeilen, zusätzlichen Themen, Erledigungsstatus, Verantwortlichen, Notizen, Ergebnissen und Beschlüssen.
- Getrennte Anwesenheit je Sitzung: Offen, Anwesend, Angemeldet, Abgemeldet. Namen und Rollen werden als historische Momentaufnahme gespeichert.
- Besprechungen kopieren, nach Datum/Status suchen und über den Druckdialog als PDF speichern.
- Verwarnungen mit drei Stufen, Grund, Beginn, optionalem Ablauf, Informationen, Aufhebung und Historie. Keine aktive Verwarnung wird grün angezeigt.
- Teamwünsche mit Beschreibung, Einreicher, Priorität, Status, Notizen, Archivierung und berechtigter Löschung.
- Automatisches Speichern, dauerhafte lokale Warteschlange, sofort gesicherte Textentwürfe, Wiederholung vorübergehender Fehler, Versionsprüfung und verständliche Konfliktauflösung.
- Login, Passwort-Zurücksetzen, Einladungsannahme, Passwortänderung, Administrator/Bearbeiter/Leser und gezielte Bearbeiterrechte pro Modul.
- Unveränderbares serverseitiges Audit-Log mit Vorher-/Nachher-Werten. Die Gesamtansicht lädt ältere Ereignisse seitenweise nach.
- Globale Suche mit Strg+K, CSV-Export, Dark/Light Mode und mobile Navigation.

## 1. Lokal öffnen

Installiere Node.js 24 LTS. Öffne PowerShell im Projektordner:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Öffne die im Terminal ausgegebene Adresse, normalerweise `http://127.0.0.1:5173/`.

Bis die nächsten Schritte erledigt sind, siehst du die Einrichtungsansicht. Es gibt keinen Produktions-Demozugang und keine lokale Ersatzdatenbank für echte Teamdaten.

## 2. Supabase-Projekt einrichten

1. Konto auf [supabase.com](https://supabase.com/) erstellen, Organisation und neues Projekt anlegen. Eine passende EU-Region wählen. Das Datenbankpasswort sicher außerhalb dieses Repositories verwahren.
2. Im Projekt den **SQL Editor** öffnen.
3. Die folgenden Dateien jeweils vollständig kopieren und **in dieser Reihenfolge genau einmal** ausführen:

   1. `supabase/migrations/202610190001_initial.sql`
   2. `supabase/migrations/202610190002_seed.sql`
   3. `supabase/migrations/202610190003_access_and_copy.sql`
   4. `supabase/migrations/202610190004_rank_order.sql`

4. Unter **Authentication → Providers / Sign In** den E-Mail-Anbieter aktivieren und öffentliche Neuregistrierungen deaktivieren. Die entsprechende Einstellung heißt je nach Dashboard-Version „Allow new users to sign up“. Die lokale Supabase-Konfiguration deaktiviert Registrierungen bereits; das gehostete Projekt muss separat eingestellt werden.
5. Unter **Authentication → URL Configuration** als Site URL zunächst deine Entwicklungsadresse setzen. Die Entwicklungsadresse und später die vollständige GitHub-Pages-Adresse als erlaubte Redirect URLs hinzufügen, inklusive Repository-Pfad und abschließendem `/`.
6. Für Einladungen und Passwort-E-Mails einen eigenen SMTP-Versand einrichten. Versandlimits und Zustellbarkeit des Anbieters prüfen.

Die Datenbank prüft Teamzugriff und Schreibrechte zusätzlich zu den Auth-Einstellungen. Ein Auth-Konto allein erhält keinerlei Teamdaten. RLS bleibt auf allen Anwendungstabellen eingeschaltet. Siehe [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Ersten Administrator anlegen

1. Im Supabase-Dashboard unter **Authentication → Users → Add user** dein eigenes Konto mit E-Mail und einem langen Passwort erstellen. Für dieses vom Administrator angelegte Konto die E-Mail bestätigen lassen oder bewusst als bestätigt anlegen. Das ist keine öffentliche Registrierung.
2. Im SQL Editor die eigene E-Mail in folgendem Befehl einsetzen und ausführen:

```sql
select public.provision_team(id, 'Nexville Roleplay')
from auth.users
where lower(email) = lower('DEINE_EMAIL_ADRESSE');
```

Der Befehl gibt eine Team-UUID zurück. Er legt das Team, deinen Administratorzugriff, neun Ausgangsmitglieder und 21 Rollen an: acht Ränge, fünf Zusatzrollen und acht erhaltene Sonderrollen. Die Screenshot-Referenzzahlen bleiben separat; z. B. hat Administration anfangs tatsächlich keine Zuweisung, auch wenn der alte Referenzwert 2 lautet.

`provision_team` ist nur über den privilegierten SQL Editor ausführbar. Ein bereits eingerichteter Benutzer wird abgewiesen, damit kein versehentliches zweites Team entsteht. Bei zukünftigen Deployments wird der Ausgangsbestand nicht neu eingespielt.

### Öffentliche Verbindung konfigurieren

Im Supabase-Projekt unter **Connect** beziehungsweise **Settings → API Keys** die Projekt-URL und den **Publishable Key** kopieren. Ein vorhandener Legacy-`anon`-Key funktioniert ebenfalls.

In der lokalen Datei `.env` eintragen:

```dotenv
VITE_SUPABASE_URL=https://DEIN_PROJEKT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_DEIN_OEFFENTLICHER_KEY
VITE_BASE_PATH=/
```

Den Entwicklungsserver danach neu starten. Mit dem eben angelegten Konto anmelden.

**Niemals** das Datenbankpasswort, einen `service_role`-JWT oder einen `sb_secret_`-Key als `VITE_`-Variable verwenden. `VITE_`-Werte werden absichtlich Teil des Browser-Bundles. Der Publishable Key ist öffentlich; die eigentliche Datensicherheit entsteht durch die geprüften Berechtigungen in PostgreSQL.

## 3. Einladungen aktivieren

Die Oberfläche unter Einstellungen ruft eine Supabase Edge Function auf. Der privilegierte Auth-Schlüssel liegt dabei ausschließlich serverseitig in Supabase.

1. [Supabase CLI installieren](https://supabase.com/docs/guides/cli/getting-started).
2. Im Projektordner anmelden und das Projekt verbinden:

```powershell
npx supabase login
npx supabase link --project-ref DEINE_PROJEKT_REFERENZ
```

3. Im Supabase-Dashboard unter **Edge Functions → Secrets** `SITE_URL` mit der vollständigen späteren Website-Adresse setzen, z. B. `https://DEINNAME.github.io/nexville-team/`. Die Funktion verlangt HTTPS. Die üblichen Supabase-Runtime-Variablen für Projekt-URL, Anon- und Service-Role-Key werden von Supabase bereitgestellt; sie gehören nicht in `.env` des Frontends.
4. Funktion bereitstellen:

```powershell
npx supabase functions deploy invite-user
```

5. Mit einem Administrator in der Anwendung **Einstellungen → Benutzer einladen** öffnen. Empfänger, Anzeigename und Zugriffsrolle wählen.

`verify_jwt = false` in `supabase/config.toml` bedeutet hier, dass die Funktion den Bearer-Token selbst durch `auth.getUser()` validiert. Anschließend prüft sie die aktuelle Administratorberechtigung serverseitig. Sie vertraut weder einer im Browser behaupteten Rolle noch einer frei übergebenen Weiterleitungsadresse. Für Redirects wird nur die serverseitige `SITE_URL` verwendet.

Beim Öffnen der Einladung setzt der Empfänger ein Passwort mit mindestens 12 Zeichen. Bei bereits bestehenden Auth-Konten kann Supabase eine erneute Einladung ablehnen; bestehende Konten lassen sich durch einen Administrator im SQL Editor dem Team zuordnen. Keine neuen Konten oder bestehenden Berechtigungen werden dabei heimlich überschrieben.

Falls eine Einladungs-E-Mail erfolgreich versendet wurde, aber der anschließende Zugriffseintrag scheitert, den Supabase-Function-Log prüfen und den Zugriff über den SQL Editor nachtragen. Der Benutzer erhält ohne Zugriffseintrag keine Teamdaten.

### Bestehendes Auth-Konto berechtigen oder Zugriff reparieren

Nur im privilegierten SQL Editor verwenden. IDs und E-Mail vorher prüfen:

```sql
select public.grant_invited_access(
  'TEAM_UUID'::uuid,
  'EMPFÄNGER_AUTH_UUID'::uuid,
  'empfaenger@beispiel.de',
  'Anzeigename',
  'viewer',
  'ADMINISTRATOR_AUTH_UUID'::uuid
);
```

Das ist eine Datenbank-Administratoraktion. Die Funktion prüft, dass Empfänger-ID und E-Mail übereinstimmen und der angegebene Administrator zum Team gehört. Bereits vorhandene Rechte werden nicht überschrieben; Änderungen erfolgen in der Anwendung.

## 4. GitHub und GitHub Pages

1. Auf GitHub ein neues Repository anlegen, z. B. `nexville-team`. Für private Repositories kann GitHub Pages einen passenden kostenpflichtigen GitHub-Tarif erfordern.
2. Den Projektordner mit GitHub Desktop hochladen oder im Terminal ausführen. Falls Git schon initialisiert ist, `git init` auslassen:

```powershell
git init -b main
git add .
git commit -m "Build Nexville Roleplay team management"
git remote add origin https://github.com/DEINNAME/nexville-team.git
git push -u origin main
```

3. Im Repository unter **Settings → Secrets and variables → Actions → Variables** anlegen:

| Variable | Wert |
|---|---|
| `VITE_SUPABASE_URL` | öffentliche Supabase-Projekt-URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | öffentlicher Publishable Key oder Legacy-Anon-Key |
| `VITE_BASE_PATH` | optional `/nexville-team/`; wird sonst aus dem Repository-Namen gebildet |

Für eine eigene Domain oder ein Repository `DEINNAME.github.io` muss `VITE_BASE_PATH` auf `/` stehen.

4. Unter **Settings → Pages → Build and deployment** als Quelle **GitHub Actions** auswählen.
5. Für freigegebene Änderungen Branchschutz für `main`, Pull-Request-Reviews und erfolgreiche Checks einrichten. Bei Bedarf das Environment `github-pages` mit einem erforderlichen Reviewer schützen.
6. Unter **Actions** den Pages-Workflow starten oder eine geprüfte Änderung nach `main` pushen. Er führt Datenbank-/Unit-Tests, Browsertests und den Produktionsbuild aus und veröffentlicht nur nach deren Erfolg.
7. Die ausgegebene Pages-URL öffnen. Diese vollständige Adresse zusätzlich in Supabase als Site URL/Redirect URL und als Edge-Function-Secret `SITE_URL` hinterlegen.

Die Anwendung nutzt Hash-Routing, z. B. `/nexville-team/#/mitglieder`. Direkte Links und Neuladen benötigen dadurch keine Server-Rewrite-Regeln auf GitHub Pages. Der Vite-Basispfad gilt auch für das Banner und alle gebauten Assets. Grundlage: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub Pages Deployment Action](https://github.com/actions/deploy-pages).

Es werden weder produktive Migrationen noch Datenbankschlüssel automatisch aus GitHub heraus ausgeführt. Datenbankänderungen werden als neue Migrationen versioniert und zuerst in einer Testumgebung geprüft. Die Website benötigt keinen laufenden privaten PC.

## 5. Speichern, Offlinebetrieb und Konflikte

1. Eine Texteingabe wird unmittelbar im lokalen Browserspeicher als Entwurf gesichert.
2. Nach 650 ms Eingabepause oder beim Feldwechsel wird die Änderung in eine dauerhafte IndexedDB-Warteschlange übernommen. Auswahlfelder werden sofort vorgemerkt.
3. Jeder Vorgang trägt eine UUID und die erwartete Datensatzversion.
4. Die PostgreSQL-Funktion `mutate` prüft Anmeldung, Team, Modulberechtigung, erlaubte Felder und Version. Mutation, Rollenzuweisungen, Audit und Wiederholungsschutz laufen in einer Transaktion.
5. Erst nach erfolgreicher Serverantwort und Aktualisierung der Serverdaten zeigt die Oberfläche „Gespeichert“.
6. Unterbrechungen behalten den Vorgang mit derselben UUID. Vorübergehende Fehler werden mit wachsender Wartezeit erneut versucht. Doppelte Requests erzeugen keine doppelten Mitglieder oder Audit-Ereignisse.
7. Bei Versionskonflikten stoppt die Warteschlange. Unter dem Speicherstatus kann der lokale Entwurf exportiert und die Serverfassung übernommen werden. Abhängige lokale Änderungen an demselben Datensatz werden nur nach ausdrücklicher Entscheidung verworfen.

Textentwürfe, die beim Neuladen von einer inzwischen geänderten Serverfassung abweichen, werden nicht ungefragt darübergeschrieben. Das betroffene Feld zeigt beide Fassungen und bietet eine bewusste Auswahl. Nicht synchronisierte Texte sind über den Speicherstatus wieder auffindbar.

Die App abonniert neue Audit-Ereignisse über [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) und lädt die Teamdaten nach. Zusätzlich werden beim Wiederöffnen des Tabs und alle 60 Sekunden sichtbarer Nutzung aktuelle Daten geholt. Das aktualisiert auch Rechte und abgelaufene Verwarnungen. Das Audit-Log muss im gehosteten Projekt in der Realtime-Publication liegen; die Migration nimmt es auf, wenn die Standard-Publication vorhanden ist.

Lokale Entwürfe sind an Benutzer, Team, Browser und Website-Adresse gebunden. Sie ersetzen keine Serverbestätigung. Der Browser muss lokalen Speicher erlauben. Private Browserfenster, das Löschen von Website-Daten oder ein defektes Gerät können noch nicht synchronisierte Entwürfe entfernen. Die Anwendung warnt beim Verlassen mit ausstehenden Änderungen. Bei einem neuen Gerät werden ausschließlich bestätigte Serverdaten geladen.

## 6. Berechtigungen und Historie

| Kontorolle | Rechte |
|---|---|
| Administrator | Alle Verwaltungsbereiche, Rollenanlegung/-löschung, Einladungen, Benutzerrechte und Workspace-Name |
| Bearbeiter | Freigegebene Module; standardmäßig Mitglieder, Besprechungen, Verwarnungen und Wünsche |
| Leseberechtigt | Teamdaten ansehen und lesende Exporte ausführen |

Die Roleplay-Ränge sind von diesen **Kontorechten** getrennt. Eine Rolle „Projektleitung“ macht einen Account nicht automatisch zum Administrator.

- Anwendungstabellen haben keine direkten Schreibgrants für `anon` oder `authenticated`; Schreiben erfolgt über die geprüfte RPC.
- Alle Fremdschlüssel zu Teamdaten berücksichtigen die Team-ID. Rollen/Teilnehmer können nicht aus einem fremden Team übernommen werden.
- Der letzte Administrator kann weder entfernt noch herabgestuft werden.
- Einträge in `audit_logs` können Browserbenutzer weder einfügen, bearbeiten noch löschen.
- Mitglieder werden archiviert. Historische Sitzungsdaten und Verwarnungen bleiben bestehen.
- Die Ablaufprüfung verwendet das gesamte Ablaufdatum in Europe/Berlin. Serverseitig wird der Aktivstatus beim Lesen berechnet; der Originaleintrag wird nicht gelöscht.
- Ungültige und doppeldeutige lokale Uhrzeiten während der Zeitumstellung werden beim Anlegen von Terminen abgewiesen.
- CSV-Exporte neutralisieren Tabellenformeln in nutzergesteuerten Werten.
- PDF-Export nutzt den Browserdruck mit einer eigenen Druckansicht; im Druckdialog „Als PDF speichern“ wählen.

Administratoren mit direktem Datenbankzugriff können Datenbankregeln und Auditdaten technisch ändern. Dieser privilegierte Zugriff ist außerhalb des Schutzbereichs normaler Anwendungskonten und muss entsprechend beschränkt bleiben.

## 7. Tests und Überprüfung

```powershell
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm test` führt die tatsächlichen SQL-Migrationen in **PGlite**, einer PostgreSQL-Laufzeit als WebAssembly, aus. Es prüft Transaktionen, Constraints, RLS, Auth-Rollen, Modulrechte, Rangfolge, Versionskonflikte, Wiederholungsschutz, Rollenzählung, Archivhistorie und Datumsregeln. Zusätzlich wird die persistente Warteschlange separat geprüft.

Die Playwright-Tests starten unter `127.0.0.1:5174` die reale React-Anwendung und unter `127.0.0.1:54329` einen **ausschließlich für Tests vorgesehenen Transportadapter**, der dieselben SQL-Funktionen und RLS-Regeln ausführt. Nur die Auth-Antworten werden dort als Test-Fixtures simuliert. Dieser Server wird nicht gebaut, nicht ausgeliefert und ist kein Produktionsbackend. Die in Tests enthaltenen `example.test`-Konten funktionieren ausschließlich dort.

Damit sind lokale App-Abläufe und PostgreSQL-Regeln prüfbar, ohne ein fremdes Supabase-Konto zu erzeugen. Das beweist **nicht** den tatsächlichen E-Mail-Versand, die gehostete Supabase-Auth-Konfiguration, WebSocket-Realtime oder ein erfolgreiches GitHub-Deployment. Die müssen nach der Einrichtung zusätzlich geprüft werden.

Testberichte und Screenshots entstehen in `playwright-report/` und `test-results/` und werden nicht eingecheckt. Eine zusätzliche native Python-Playwright-Inspektion ist mit `tests/support/inspect_ui.py` gegen den laufenden isolierten Testserver möglich.

### Abnahme vor produktiver Nutzung

Siehe [docs/ABNAHME.md](docs/ABNAHME.md) für die dokumentierten lokalen Prüfergebnisse und die noch offenen Live-Prüfungen.

## 8. Betrieb und Kosten

Frontend: GitHub Pages. Datenbank, Anmeldung und Einladungsfunktion: Supabase. E-Mail-Versand: eigener SMTP-Anbieter.

Zum geprüften Quellenstand am 19.10.2026 nennt Supabase einen kostenlosen Tarif mit Pausierung nach einer Woche Inaktivität und Pro ab 25 USD/Monat, abhängig von Compute, Verbrauch und Zusatzdiensten. Für den gewünschten dauerhaft verfügbaren Betrieb einen Tarif ohne automatische Inaktivitätspause wählen. Es besteht keine durch diesen Quellcode garantierte Verfügbarkeit. Aktuelle Preise und Kontingente vor Abschluss direkt auf der [Supabase-Preisseite](https://supabase.com/pricing) prüfen. GitHub-Tarif, private Repository-Nutzung, SMTP und etwaige Domains können weitere Kosten verursachen.

Es wurden keine kostenpflichtigen Dienste gebucht und keine externen Konten erstellt.

## 9. Struktur und Grenzen

```text
src/
  components/       Navigation, Dialoge, Formulare, automatische Eingaben
  lib/              Supabase, Datenmodell, Ränge, Zeitlogik, Outbox, Entwürfe
  pages/            Die Verwaltungsbereiche
public/brand/       Unverändertes Nexville-GIF
supabase/
  migrations/       Versioniertes relationales Schema, Rechte und Ausgangsdaten
  functions/        Serverseitige Benutzer-Einladungen
tests/              PostgreSQL-, Unit- und Browsertests
.github/workflows/  Checks und GitHub-Pages-Deployment
docs/               Abnahme und Architektur
```

Das Team wird beim Laden seitenweise aus Supabase abgefragt; die Arbeitsansichten nutzen danach einen gemeinsamen Cache und lokale Listenpagination. Die Audit-Gesamtansicht paginiert serverseitig. Für sehr große Teams beziehungsweise viele Jahre an Besprechungsdaten sollte zusätzlich eine bedarfsgesteuerte serverseitige Suche/Pagination für die übrigen Bereiche eingeführt werden. Die lokalen Tests sind keine Lastprüfung für beliebige Datenmengen.

Mitglieds- und Wunschdetails zeigen die jeweils letzten passenden Ereignisse aus dem aktuellen Audit-Cache (maximal 300 jüngste Teamereignisse). Die vollständige Historie bleibt in der Datenbank und ist über den seitenweise geladenen Änderungsverlauf abrufbar.

Die ursprünglichen Backup-Anforderungen sind auf Wunsch nicht Teil dieser Auslieferung. Ohne ein später eingerichtetes Backup- und Wiederherstellungskonzept kann keine entsprechende Datensicherung zugesagt werden.
