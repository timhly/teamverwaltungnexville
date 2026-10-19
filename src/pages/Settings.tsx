import { useState } from "react";
import { MessageCircle, Shield, UserRound, UserRoundMinus } from "lucide-react";
import { AutoInput, Avatar, Badge, Button, Field } from "../components/ui";
import { useStore } from "../lib/store";
import { ACCESS_LABELS, MODULE_LABELS, type Module } from "../lib/types";
import { errorMessage } from "../lib/utils";
import { connectDiscord } from "../lib/discord";
import { AccessRequests } from "../components/AccessRequests";

export default function Settings() {
  const { data, session, can, save } = useStore();
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
              Neue Nutzer melden sich mit Discord an und fragen Zugang an. Hier
              verwaltest du freigegebene Konten und ihre Rechte.
            </p>
          </div>
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
    </>
  );
}
