# Discord-Anmeldung für Nexville Roleplay

Die Anmeldung ist im Code vorbereitet. Diese Schritte einmal im eigenen Supabase-Projekt und im Discord Developer Portal ausführen. Ein Bot oder ein Bot-Token wird dafür nicht benötigt.

## 1. Neue Datenbankmigrationen ausführen

Im bereits mit Supabase verbundenen Projektordner:

```powershell
npx supabase db push
```

Damit werden alle noch ausstehenden Migrationen ausgeführt. Neu sind `202610190005_discord_access.sql` und `202610190006_discord_admins.sql`. Falls die bisherigen Migrationen manuell im SQL Editor ausgeführt wurden und die CLI nicht verknüpft ist, stattdessen nur diese beiden neuen Dateien vollständig und in dieser Reihenfolge im Supabase SQL Editor ausführen. Bereits angewendete Dateien nicht erneut ausführen.

## 2. Discord-Anwendung erstellen

1. Im [Discord Developer Portal](https://discord.com/developers/applications) **New Application** wählen, beispielsweise „Nexville Teamverwaltung“ nennen und erstellen.
2. In Supabase **Authentication → Sign In / Providers → Discord** öffnen und die dort angezeigte **Callback URL** kopieren. Sie hat dieses Format:

   ```text
   https://DEINE_PROJEKT_REFERENZ.supabase.co/auth/v1/callback
   ```

3. Im Discord Developer Portal unter **OAuth2 → Redirects → Add Redirect** genau diese Supabase-Callback-Adresse eintragen und speichern.
4. Unter **OAuth2 → Client information** die **Client ID** und das **Client Secret** kopieren. Falls nötig, über „Reset Secret“ ein neues Secret erzeugen und sicher verwahren.
5. Zurück in Supabase den Discord-Anbieter aktivieren, Client ID und Client Secret eintragen und speichern.

Das Discord Client Secret gehört ausschließlich in die Supabase-Providerkonfiguration. Es gehört weder in GitHub noch in eine `VITE_`-Variable bei Render. Die Discord-Redirect-Adresse ist die Supabase-Callback-Adresse. Die Render-Adresse wird im folgenden Schritt bei Supabase eingetragen.

Grundlage: [Offizielle Supabase-Anleitung für Discord](https://supabase.com/docs/guides/auth/social-login/auth-discord).

## 3. Anmeldung und Rückkehr zur Website erlauben

Unter **Authentication → Sign In / Providers** beziehungsweise der allgemeinen Auth-Konfiguration **Allow new users to sign up** aktivieren. Supabase muss für die erste Discord-Anmeldung ein Auth-Konto erstellen dürfen. Unfreigegebene Konten erhalten dadurch keine Teamdaten; normale Nutzer können Zugang anfragen.

Unter **Authentication → URL Configuration**:

| Feld | Wert |
|---|---|
| Site URL | Die tatsächliche Render-Adresse mit `/`, z. B. `https://teamverwaltungnexville.onrender.com/` |
| Redirect URLs | Dieselbe vollständige Render-Adresse mit `/` hinzufügen |

Zum lokalen Testen mit gehostetem Supabase zusätzlich die tatsächliche Entwicklungsadresse, z. B. `http://127.0.0.1:5173/`, erlauben.

## 4. Render aktualisieren

Nach dem GitHub-Update bei Bedarf **Manual Deploy → Deploy latest commit** wählen. Die bisherigen Einstellungen bleiben:

| Feld | Wert |
|---|---|
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| `NODE_VERSION` | `24` |
| `SKIP_INSTALL_DEPS` | `true` |
| `VITE_BASE_PATH` | `/` |
| `VITE_SUPABASE_URL` | Supabase-Projekt-URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Öffentlicher Publishable Key oder Legacy-`anon`-Key |

Projekt-URL und öffentlichen Key findest du in Supabase unter **Connect** beziehungsweise **Settings → API Keys**. Für Discord sind keine zusätzlichen Render-Schlüssel nötig. Ein `service_role`- oder `sb_secret_`-Key gehört nicht ins Frontend.

## 5. Direkt freigegebene Administratoren

Diese fünf Discord-IDs sind auf ausdrücklichen Wunsch direkt freigegeben:

```text
470653391094415362
622043290321289216
433674403394486275
480337195878711307
305666557219176449
```

Nach der Migration erhalten schon vorhandene bestätigte Discord-Konten diese Rechte direkt. Zukünftige Nutzer mit diesen IDs erhalten sie bei ihrer ersten Anmeldung beziehungsweise beim Verknüpfen mit Discord. Eine Zugangsanfrage ist für sie nicht nötig. Es wird die tatsächliche Discord-Identität aus Supabase Auth geprüft. Ein selbst eingetragener Name oder eine behauptete ID genügt nicht.

Das Zielteam muss eindeutig „Nexville Roleplay“ heißen. Bei keinem oder mehreren gleichnamigen Teams vergibt der Trigger keine Rechte. Auf andere Teams erstreckt sich die Freigabe nicht.

Falls noch gar kein Team angelegt wurde: Zuerst einmal mit einer dieser IDs anmelden. Danach im privilegierten Supabase SQL Editor **einmal** mit der eigenen Discord-ID ausführen:

```sql
select public.provision_team(i.user_id, 'Nexville Roleplay')
from auth.identities i
where i.provider = 'discord'
  and i.provider_id = 'DEINE_DISCORD_ID';
```

Anschließend auf der Website „Zugriff aktualisieren“ wählen oder neu anmelden. Wenn das Team schon eingerichtet ist, diesen Schritt auslassen. Bestehende Administratoren bleiben erhalten.

Die Freigabeliste lässt sich nur im privilegierten SQL Editor ändern. Um eine der fünf dauerhaften Freigaben zurückzunehmen, zuerst den Eintrag entfernen und anschließend in der Website die aktuellen Rechte ändern oder entziehen:

```sql
delete from public.discord_admin_allowlist
where discord_id = 'ZU_ENTFERNENDE_DISCORD_ID';
```

Solange eine ID in der Liste steht, setzt eine erneute Anmeldung ihren Administratorzugriff wieder ein. Rechteänderungen werden im Audit protokolliert.

## 6. Weitere Konten freigeben

1. Nutzer meldet sich über **Mit Discord anmelden** an und klickt **Zugang anfragen**.
2. Ein Administrator öffnet **Einstellungen → Discord-Zugangsanfragen**.
3. Discord-Name und ID prüfen, **Leser**, **Bearbeiter** oder **Administrator** auswählen und **Freigeben** klicken. Administratorzugriff benötigt eine zusätzliche Bestätigung.
4. Die wartende Seite prüft alle zehn Sekunden auf Freigabe; „Zugriff aktualisieren“ prüft sofort. Vorher sind keine Teamdaten sichtbar.
5. Bestehende Rechte und einzelne Bearbeitermodule können anschließend in den Einstellungen geändert werden.

## 7. Bestehendes E-Mail-Konto mit Discord verbinden

Wenn du schon mit E-Mail und Passwort arbeitest, zuerst in dieses bestehende Konto einloggen. In **Einstellungen → Mein Konto → Discord verbinden** Discord hinzufügen. So bleiben die bisherigen Rechte und der Anzeigename am selben Konto erhalten.

Dafür in Supabase unter den Auth-Einstellungen **Enable Manual Linking** aktivieren. Wenn diese Funktion deaktiviert ist, meldet die Anwendung den Fehler beim Verknüpfen. Siehe [Supabase: Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Mehrere Teams

Für die übliche Installation mit einem Team ist keine zusätzliche Variable nötig. Bei mehreren Teams die gewünschte Team-UUID als `VITE_ACCESS_TEAM_ID` in Render setzen und neu deployen. Sie bestimmt das Ziel normaler Zugangsanfragen. Die direkte Administratorfreigabe bleibt auf das eindeutig benannte Nexville-Team begrenzt.

## Prüfung nach der Einrichtung

Mit einer freigegebenen Discord-ID anmelden und die Verwaltungsrechte prüfen. Danach ein anderes Discord-Konto anmelden, Zugang als Leser anfragen und freigeben. Zuletzt ein vorhandenes E-Mail-Konto über „Discord verbinden“ testen. Die automatisierten Tests verwenden eine simulierte Auth-Weiterleitung und tatsächliche PostgreSQL-Regeln; der externe Discord-Login muss am eigenen Projekt geprüft werden.
