import { useState } from "react";
import {
  Check,
  KeyRound,
  MailPlus,
  MessageCircle,
  Shield,
  UserRound,
  UserRoundMinus,
} from "lucide-react";
import {
  AutoInput,
  Avatar,
  Badge,
  Button,
  Dialog,
  Field,
} from "../components/ui";
import { CreateForm, text } from "../components/forms";
import { useStore } from "../lib/store";
import {
  ACCESS_LABELS,
  MODULE_LABELS,
  type AccessRole,
  type Module,
} from "../lib/types";
import { supabase } from "../lib/supabase";
import { errorMessage } from "../lib/utils";
import { connectDiscord } from "../lib/discord";
import { AccessRequests } from "../components/AccessRequests";

export default function Settings() {
  const { data, session, can, save, teamId, refresh } = useStore();
  const [invite, setInvite] = useState(false);
  const [password, setPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [discordBusy, setDiscordBusy] = useState(false);
  const admin = can("admin");
  const team = data.teams[0];
  const profile = data.profiles.find((p) => p.id === session.user.id);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEIN TEAMRAUM. DEINE EINSTELLUNGEN.</span>
          <h1>Einstellungen</h1>
          <p>
            Zugänge, Berechtigungen und die Grundlagen deiner Zusammenarbeit.
          </p>
        </div>
      </div>
      {notice && (
        <div role="status" className="notice notice-success">
          <Check size={18} />
          {notice}
        </div>
      )}
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <AccessRequests />
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Workspace</h2>
              <p>Deine Nexville-Teamverwaltung.</p>
            </div>
            <Shield size={20} className="muted" />
          </div>
          {team && (
            <>
              <Field label="Servername">
                <AutoInput
                  value={team.name}
                  label={`Servername ${team.id}`}
                  disabled={!admin}
                  maxLength={100}
                  onSave={(name) => save("teams", team, { name })}
                />
              </Field>
              <Field label="Zeitzone">
                <input value="Europe/Berlin" readOnly />
              </Field>
              <div className="notice">
                <Shield size={17} />
                <span>
                  Teamdaten werden durch serverseitige Berechtigungen geschützt.
                  Backups sind vorerst zurückgestellt.
                </span>
              </div>
            </>
          )}
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Dein Konto</h2>
              <p>Persönlicher Zugang zum Teamraum.</p>
            </div>
            <UserRound size={20} className="muted" />
          </div>
          <div className="detail-identity">
            <Avatar
              name={profile?.display_name || "Teammitglied"}
              size="large"
            />
            <div>
              <h3>{profile?.display_name || "Teammitglied"}</h3>
              <span>{session.user.email}</span>
            </div>
          </div>
          {profile?.discord_id ? (
            <div className="discord-account">
              <Badge tone="teal">
                <MessageCircle size={14} />
                Discord verbunden
              </Badge>
              <strong>{profile.discord_name}</strong>
              <small>Discord-ID: {profile.discord_id}</small>
            </div>
          ) : (
            <Button
              className="discord-button"
              disabled={discordBusy}
              onClick={async () => {
                setError("");
                setDiscordBusy(true);
                try {
                  await connectDiscord(true);
                } catch (e) {
                  setError(
                    `Discord konnte nicht verbunden werden. Bitte den Discord-Anbieter und die manuelle Kontoverknüpfung in Supabase prüfen. ${errorMessage(e)}`,
                  );
                  setDiscordBusy(false);
                }
              }}
            >
              <MessageCircle size={17} />
              Discord verbinden
            </Button>
          )}
          <Button variant="secondary" onClick={() => setPassword(true)}>
            <KeyRound size={16} /> Passwort ändern
          </Button>
          <p className="small muted">
            Die Darstellung kannst du jederzeit über das Sonnensymbol in der
            Kopfzeile wechseln.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Zugänge & Berechtigungen</h2>
            <p>
              Kontorollen regeln den Zugriff auf die Verwaltung. Teamrollen
              beschreiben Aufgaben im Roleplay-Team.
            </p>
          </div>
          {admin && (
            <Button onClick={() => setInvite(true)}>
              <MailPlus size={17} /> Benutzer einladen
            </Button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>BENUTZER</th>
                <th>ZUGRIFFSROLLE</th>
                <th>BEARBEITBARE BEREICHE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.user_permissions.map((p) => {
                const u = data.profiles.find((u) => u.id === p.user_id);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="member-name">
                        <Avatar name={u?.display_name || "Benutzer"} />
                        <div>
                          <strong>{u?.display_name || "Benutzer"}</strong>
                          {u?.discord_id && (
                            <small className="account-id">
                              Discord: {u.discord_name} · {u.discord_id}
                            </small>
                          )}
                        </div>
                        {p.user_id === session.user.id && <Badge>Du</Badge>}
                      </div>
                    </td>
                    <td>
                      <select
                        value={p.access_role}
                        disabled={!admin}
                        aria-label={`Zugriffsrolle ${u?.display_name}`}
                        onChange={(e) =>
                          void save("user_permissions", p, {
                            access_role: e.target.value,
                          })
                        }
                      >
                        {Object.entries(ACCESS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {p.access_role === "admin" ? (
                        <span className="muted">Alle Bereiche</span>
                      ) : p.access_role === "viewer" ? (
                        <span className="muted">Nur lesen</span>
                      ) : (
                        <div className="permission-checks">
                          {Object.entries(MODULE_LABELS).map(([key, label]) => (
                            <label key={key}>
                              <input
                                type="checkbox"
                                checked={p.modules.includes(key as Module)}
                                disabled={!admin}
                                onChange={(e) =>
                                  void save("user_permissions", p, {
                                    modules: e.target.checked
                                      ? [...p.modules, key]
                                      : p.modules.filter((m) => m !== key),
                                  })
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {admin && p.user_id !== session.user.id && (
                        <Button
                          variant="ghost"
                          aria-label={`Zugriff von ${u?.display_name} entziehen`}
                          onClick={async () => {
                            if (
                              window.confirm(
                                `Zugriff von ${u?.display_name} auf diesen Teamraum entziehen?`,
                              )
                            )
                              await save("user_permissions", p, {}, true);
                          }}
                        >
                          <UserRoundMinus size={16} />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Dialog
        open={invite}
        onOpenChange={setInvite}
        title="Zum Teamraum einladen"
        description="Der neue Benutzer erhält eine persönliche Einladungs-E-Mail."
      >
        <CreateForm
          onCancel={() => setInvite(false)}
          submitLabel="Einladung versenden"
          onSubmit={async (f) => {
            setError("");
            const { error } = await supabase!.functions.invoke("invite-user", {
              body: {
                team_id: teamId,
                email: text(f, "email"),
                display_name: text(f, "display_name"),
                access_role: text(f, "access_role"),
                redirect_to: location.origin + import.meta.env.BASE_URL,
              },
            });
            if (error)
              throw new Error(
                "Einladung fehlgeschlagen. Bitte Edge Function, E-Mail-Versand und Administratorrechte prüfen.",
              );
            setInvite(false);
            setNotice("Einladung versendet. Der Zugriff wurde eingerichtet.");
            await refresh();
          }}
        >
          <Field label="Anzeigename">
            <input name="display_name" required maxLength={100} />
          </Field>
          <Field label="E-Mail-Adresse">
            <input name="email" type="email" required maxLength={254} />
          </Field>
          <Field label="Zugriffsrolle">
            <select name="access_role" defaultValue="viewer">
              {Object.entries(ACCESS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <div className="notice">
            Neue Bearbeiter erhalten Zugriff auf Mitglieder, Besprechungen,
            Verwarnungen und Wünsche. Weitere Rechte lassen sich anschließend
            gezielt ergänzen.
          </div>
        </CreateForm>
      </Dialog>
      <Dialog
        open={password}
        onOpenChange={setPassword}
        title="Passwort ändern"
        description="Verwende mindestens 12 Zeichen und ein einzigartiges Passwort."
      >
        <CreateForm
          onCancel={() => setPassword(false)}
          submitLabel="Passwort aktualisieren"
          onSubmit={async (f) => {
            const p = String(f.get("password") || "");
            if (p !== String(f.get("confirm") || ""))
              throw new Error("Die Passwörter stimmen nicht überein.");
            const { error } = await supabase!.auth.updateUser({ password: p });
            if (error) throw new Error(errorMessage(error));
            setPassword(false);
            setNotice("Dein Passwort wurde aktualisiert.");
          }}
        >
          <Field label="Neues Passwort">
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Passwort wiederholen">
            <input
              name="confirm"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </Field>
        </CreateForm>
      </Dialog>
    </>
  );
}
