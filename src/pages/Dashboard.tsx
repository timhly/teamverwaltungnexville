import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock3,
  Lightbulb,
  Plus,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { Avatar, Badge, Button, Empty } from "../components/ui";
import {
  date,
  memberRoles,
  relativeTime,
  roleMembers,
  warningActive,
} from "../lib/utils";
import { ActivityList } from "./History";

export default function Dashboard() {
  const { data, session, can, queue } = useStore();
  const navigate = useNavigate();
  const active = data.team_members.filter((m) => m.status === "active");
  const warnings = data.warning_status.filter((w) => warningActive(w));
  const wishes = data.team_wishes.filter((w) => w.status === "open");
  const next = data.meetings
    .filter(
      (m) =>
        m.status === "planned" && new Date(m.starts_at).getTime() >= Date.now(),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const profile = data.profiles.find((p) => p.id === session.user.id);
  const roleStats = ["Supporter", "Senior Supporter", "Teamverwaltung"].map(
    (name) => ({ name, role: data.roles.find((r) => r.name === name) }),
  );
  const assigned = data.roles
    .map((r) => ({ ...r, count: roleMembers(data, r.id).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const assignments = assigned.reduce((s, r) => s + r.count, 0);
  let position = 0;
  const segments = assigned
    .map((r) => {
      const start = position;
      position += (r.count / (assignments || 1)) * 100;
      return `${r.color} ${start}% ${position}%`;
    })
    .join(",");
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="welcome-line">
            <span className="live-dot" /> DEIN NEXVILLE-TEAMRAUM
          </div>
          <h1>
            Alles für dein Team<span className="accent">.</span>
          </h1>
          <p>
            Willkommen zurück, {profile?.display_name || "Teammitglied"}. Schön,
            dass du da bist.
          </p>
        </div>
        <div className="heading-date">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("de-DE", {
            timeZone: "Europe/Berlin",
            weekday: "short",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </div>
      </div>
      <section className="welcome-banner" aria-label="Nexville Roleplay">
        <div className="banner-copy">
          <Badge tone="lime">
            <span className="live-dot" /> NEXVILLE ROLEPLAY
          </Badge>
          <h2>
            Gute Zusammenarbeit.
            <br />
            Eine lebendige Community.
          </h2>
          <p>
            Behalte den Überblick und gestalte
            <br className="desktop-break" /> gemeinsam mit deinem Team Nexville.
          </p>
          <Button variant="secondary" onClick={() => navigate("/mitglieder")}>
            Zum Team <ArrowUpRight size={16} />
          </Button>
        </div>
        <div className="banner-art">
          <img
            src={`${import.meta.env.BASE_URL}brand/nexville-banner.gif`}
            alt="Animiertes Nexville Roleplay Logo"
          />
        </div>
        <div className="banner-shape" />
      </section>
      <section className="stats-grid" aria-label="Teamstatistik">
        {[
          {
            label: "Aktive Teammitglieder",
            value: active.length,
            hint: `${data.team_members.filter((m) => m.status === "inactive").length} inaktiv · ${data.team_members.filter((m) => m.status === "archived").length} archiviert`,
            icon: Users,
            tone: "teal",
            to: "/mitglieder",
          },
          {
            label: "Rollen im Team",
            value: data.roles.length,
            hint: `${assignments} aktive Rollenzuweisungen`,
            icon: Shield,
            tone: "cyan",
            to: "/rollen",
          },
          {
            label: "Aktive Verwarnungen",
            value: warnings.length,
            hint: warnings.length
              ? "Aktuelle Einträge prüfen"
              : "Aktuell keine offenen Verwarnungen",
            icon: ShieldAlert,
            tone: "yellow",
            to: "/verwarnungen",
          },
          {
            label: "Offene Teamwünsche",
            value: wishes.length,
            hint: `${data.team_wishes.filter((w) => w.status === "progress").length} in Bearbeitung`,
            icon: Lightbulb,
            tone: "lime",
            to: "/wuensche",
          },
        ].map((s) => (
          <Link className={`stat-card stat-${s.tone}`} key={s.label} to={s.to}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className="stat-icon">
                <s.icon size={19} />
              </span>
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <div className="stat-bottom">
              <span>{s.hint}</span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </section>
      <div className="dashboard-columns">
        <section className="panel team-panel">
          <div className="panel-heading">
            <div>
              <h2>Dein Team im Überblick</h2>
              <p>Die Menschen hinter Nexville.</p>
            </div>
            <Link to="/mitglieder" className="text-link">
              Alle ansehen <ArrowRight size={15} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>MITGLIED</th>
                  <th>ROLLEN</th>
                  <th>STATUS</th>
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.slice(0, 5).map((m) => (
                  <tr key={m.id}>
                    <td>
                      <button
                        className="member-name"
                        onClick={() => navigate(`/mitglieder?mitglied=${m.id}`)}
                      >
                        <Avatar name={m.name} />
                        <strong>{m.name}</strong>
                      </button>
                    </td>
                    <td>
                      <div className="role-badges">
                        {memberRoles(data, m.id).map((r) => (
                          <Badge
                            key={r.id}
                            style={
                              {
                                "--badge-color": r.color,
                              } as React.CSSProperties
                            }
                            tone="role"
                          >
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge tone="green">
                        <span className="live-dot" /> Aktiv
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`${m.name} öffnen`}
                        onClick={() => navigate(`/mitglieder?mitglied=${m.id}`)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!active.length && (
            <Empty title="Dein Team beginnt hier">
              Lege dein erstes Teammitglied an.
            </Empty>
          )}
          <div className="panel-footer">
            <span>{active.length} aktive Mitglieder</span>
            {can("members") && (
              <button
                className="text-link"
                onClick={() => navigate("/mitglieder?neu=1")}
              >
                <Plus size={15} /> Mitglied hinzufügen
              </button>
            )}
          </div>
        </section>
        <section className="panel role-panel">
          <div className="panel-heading">
            <div>
              <h2>Rollenverteilung</h2>
              <p>Aktuelle Zuständigkeiten im Team.</p>
            </div>
            <Shield size={19} className="muted" />
          </div>
          <div
            className="donut"
            style={{
              background: segments
                ? `conic-gradient(${segments})`
                : "var(--border)",
            }}
            role="img"
            aria-label={`${assignments} Rollenzuweisungen bei ${active.length} aktiven Mitgliedern`}
          >
            <div>
              <strong>{active.length}</strong>
              <span>Teammitglieder</span>
            </div>
          </div>
          <div className="role-legend">
            {roleStats.map((s) => (
              <div key={s.name}>
                <span>
                  <i style={{ background: s.role?.color || "var(--muted)" }} />
                  {s.name}
                </span>
                <strong>
                  {s.role ? roleMembers(data, s.role.id).length : 0}
                </strong>
              </div>
            ))}
          </div>
          <Link to="/rollen" className="panel-bottom-link">
            Alle Rollen verwalten <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Nächste Teambesprechung</h2>
              <p>Zeit für Austausch und neue Ideen.</p>
            </div>
            <CalendarDays size={20} className="muted" />
          </div>
          {next ? (
            <div className="next-meeting">
              <div className="meeting-date">
                <strong>
                  {new Intl.DateTimeFormat("de-DE", {
                    timeZone: "Europe/Berlin",
                    day: "2-digit",
                  }).format(new Date(next.starts_at))}
                </strong>
                <span>
                  {new Intl.DateTimeFormat("de-DE", {
                    timeZone: "Europe/Berlin",
                    month: "short",
                  }).format(new Date(next.starts_at))}
                </span>
              </div>
              <div>
                <Badge tone="teal">Geplant</Badge>
                <h3>{next.title}</h3>
                <p>
                  <Clock3 size={14} />
                  {date(next.starts_at, true)} Uhr
                </p>
                <p>
                  {
                    data.meeting_topics.filter(
                      (t) => t.meeting_id === next.id && t.title,
                    ).length
                  }{" "}
                  Themen ·{" "}
                  {
                    data.meeting_attendance.filter(
                      (a) => a.meeting_id === next.id,
                    ).length
                  }{" "}
                  Teilnehmende
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate(`/besprechungen?sitzung=${next.id}`)}
                aria-label="Besprechung öffnen"
              >
                <ArrowUpRight size={17} />
              </Button>
            </div>
          ) : (
            <div className="inline-empty">
              <span className="empty-icon">
                <CalendarDays size={24} />
              </span>
              <div>
                <h3>Noch kein Termin geplant</h3>
                <p>Bringe dein Team an einen Tisch.</p>
              </div>
              {can("meetings") && (
                <Button
                  variant="secondary"
                  onClick={() => navigate("/besprechungen?neu=1")}
                >
                  <Plus size={16} /> Planen
                </Button>
              )}
            </div>
          )}
          <div className="panel-footer">
            <span>
              <span className="live-dot" /> Anwesenheit für jede Sitzung separat
            </span>
            <Link className="text-link" to="/besprechungen">
              Zum Archiv <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Letzte Aktivitäten</h2>
              <p>Was sich in deinem Team getan hat.</p>
            </div>
            <Link to="/verlauf" className="text-link">
              <ArrowUpRight size={18} />
              <span className="sr-only">Gesamter Änderungsverlauf</span>
            </Link>
          </div>
          <ActivityList logs={data.audit_logs.slice(0, 4)} compact />
          {!data.audit_logs.length && (
            <p className="section-empty">
              Noch keine Änderungen protokolliert.
            </p>
          )}
        </section>
      </div>
      <div className="system-note">
        <CheckCheck size={16} />
        <span>
          {queue?.items.length
            ? `${queue.items.length} Änderungen werden synchronisiert.`
            : "Teamdaten werden zentral in Supabase gespeichert."}
        </span>
        <span className="system-note-detail">
          <ArrowDownToLine size={14} /> Backups vorerst zurückgestellt
        </span>
      </div>
    </>
  );
}
