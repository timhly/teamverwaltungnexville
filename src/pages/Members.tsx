import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowDownToLine,
  CalendarDays,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  AutoInput,
  Avatar,
  Badge,
  Button,
  Dialog,
  Empty,
  Field,
  Pagination,
} from "../components/ui";
import { CreateForm, nullable, text } from "../components/forms";
import { useStore } from "../lib/store";
import { date, downloadCSV, errorMessage, memberRoles, warningActive } from "../lib/utils";
import { ActivityList } from "./History";
import { RolePicker } from "../components/RolePicker";

export default function Members() {
  const { data, can, save, create } = useStore();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(params.get("rolle") || "all");
  const [status, setStatus] = useState("current");
  const [sort, setSort] = useState("rank");
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const selected = data.team_members.find(
    (m) => m.id === params.get("mitglied"),
  );
  const isNew = params.get("neu") === "1";
  const editable = can("members");
  const close = () => setParams({});
  useEffect(() => {
    setDeleteError("");
  }, [selected?.id]);
  useEffect(() => {
    setPage(0);
  }, [search, role, status, sort]);
  const filtered = data.team_members
    .filter(
      (m) =>
        (status === "all" ||
          (status === "current"
            ? m.status !== "archived"
            : m.status === status)) &&
        m.name.toLowerCase().includes(search.toLowerCase()) &&
        (role === "all" ||
          data.member_roles.some(
            (r) => r.member_id === m.id && r.role_id === role,
          )),
    )
    .sort((a, b) =>
      sort === "rank"
        ? 0
        : sort === "newest"
          ? b.created_at.localeCompare(a.created_at)
          : sort === "desc"
            ? b.name.localeCompare(a.name, "de")
            : a.name.localeCompare(b.name, "de"),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DIE MENSCHEN HINTER NEXVILLE</span>
          <h1>
            Teammitglieder
            <span className="heading-count">
              {data.team_members.filter((m) => m.status !== "archived").length}
            </span>
          </h1>
          <p>Mitglieder, Ränge und Zusatzrollen verwalten.</p>
        </div>
        <div className="heading-actions">
          <Button
            variant="secondary"
            onClick={() =>
              downloadCSV("nexville-team.csv", [
                ["Name", "Rollen", "Informationen", "Status", "Eintritt"],
                ...filtered.map((m) => [
                  m.name,
                  memberRoles(data, m.id)
                    .map((r) => r.name)
                    .join(" / "),
                  m.info,
                  m.status,
                  m.joined_on,
                ]),
              ])
            }
          >
            <ArrowDownToLine size={17} /> CSV exportieren
          </Button>
          {editable && (
            <Button onClick={() => setParams({ neu: "1" })}>
              <Plus size={18} /> Mitglied hinzufügen
            </Button>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mitglied suchen …"
              aria-label="Mitglied suchen"
            />
          </div>
          <div className="filter-group">
            <select
              aria-label="Nach Rolle filtern"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="all">Alle Rollen</option>
              {data.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Nach Mitgliedsstatus filtern"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="current">Aktuell im Team</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="archived">Archiviert</option>
              <option value="all">Alle Status</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Mitglieder sortieren"
            >
              <option value="rank">Rangfolge</option>
              <option value="name">Name A–Z</option>
              <option value="desc">Name Z–A</option>
              <option value="newest">Neueste zuerst</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>ROLLEN</th>
                <th>INFORMATIONEN</th>
                <th>EINTRITT</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 10, page * 10 + 10).map((m) => (
                <tr key={m.id}>
                  <td>
                    <button
                      className="member-name"
                      onClick={() => setParams({ mitglied: m.id })}
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
                          tone="role"
                          style={
                            { "--badge-color": r.color } as React.CSSProperties
                          }
                        >
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="cell-info">
                    {m.info || "Keine Informationen"}
                  </td>
                  <td className="nowrap muted">
                    {m.joined_on ? date(m.joined_on) : "—"}
                  </td>
                  <td>
                    <Badge tone={m.status === "active" ? "green" : "neutral"}>
                      {m.status === "active"
                        ? "Aktiv"
                        : m.status === "inactive"
                          ? "Inaktiv"
                          : "Archiviert"}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => setParams({ mitglied: m.id })}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty title="Keine Mitglieder gefunden">
            Passe deine Filter an oder füge ein Mitglied hinzu.
          </Empty>
        )}
        <Pagination page={page} setPage={setPage} total={filtered.length} />
      </section>
      <Dialog
        open={isNew}
        onOpenChange={(v) => {
          if (!v) close();
        }}
        title="Ein neues Gesicht für Nexville"
        description="Lege das Mitglied an. Weitere Änderungen werden danach automatisch gespeichert."
      >
        <CreateForm
          onCancel={close}
          submitLabel="Mitglied hinzufügen"
          onSubmit={async (f) => {
            const id = await create("team_members", {
              name: text(f, "name"),
              info: text(f, "info"),
              joined_on: nullable(f, "joined_on"),
              status: "active",
              role_ids: f.getAll("roles"),
            });
            setParams({ mitglied: id });
          }}
        >
          <Field label="Benutzername">
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Wie heißt das Mitglied?"
            />
          </Field>
          <Field label="Ränge & Zusatzrollen">
            <RolePicker roles={data.roles} />
          </Field>
          <Field label="Eintrittsdatum (optional)">
            <input type="date" name="joined_on" />
          </Field>
          <Field label="Informationen (optional)">
            <textarea name="info" maxLength={10000} rows={3} />
          </Field>
        </CreateForm>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) close();
        }}
        title={selected?.name || "Mitglied"}
        description={
          editable
            ? "Änderungen werden automatisch gespeichert. Historien bleiben erhalten."
            : "Du hast Leserechte für dieses Mitglied."
        }
        wide
      >
        {selected && (
          <div className="member-detail">
            <div className="detail-identity">
              <Avatar name={selected.name} size="large" />
              <div>
                <h3>{selected.name}</h3>
                <span>
                  <CalendarDays size={14} />
                  {selected.joined_on
                    ? `Im Team seit ${date(selected.joined_on)}`
                    : "Eintrittsdatum noch offen"}
                </span>
              </div>
              <Badge tone={selected.status === "active" ? "green" : "neutral"}>
                {selected.status === "active"
                  ? "Aktiv"
                  : selected.status === "inactive"
                    ? "Inaktiv"
                    : "Archiviert"}
              </Badge>
            </div>
            <div className="form-grid">
              <Field label="Benutzername">
                <AutoInput
                  value={selected.name}
                  label={`Benutzername ${selected.id}`}
                  maxLength={80}
                  disabled={!editable}
                  onSave={(name) => save("team_members", selected, { name })}
                />
              </Field>
              <Field label="Status">
                <select
                  disabled={!editable}
                  value={selected.status}
                  onChange={(e) =>
                    void save("team_members", selected, {
                      status: e.target.value,
                    })
                  }
                >
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="archived">Archiviert</option>
                </select>
              </Field>
              <Field label="Eintrittsdatum">
                <AutoInput
                  type="date"
                  value={selected.joined_on || ""}
                  label={`Eintrittsdatum ${selected.id}`}
                  disabled={!editable}
                  onSave={(joined_on) =>
                    save("team_members", selected, {
                      joined_on: joined_on || null,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Ränge & Zusatzrollen">
              <RolePicker
                roles={data.roles}
                selected={memberRoles(data, selected.id).map((r) => r.id)}
                disabled={!editable}
                onChange={(role_ids) =>
                  void save("team_members", selected, { role_ids })
                }
              />
            </Field>
            <Field label="Interne Informationen">
              <AutoInput
                multiline
                value={selected.info}
                label={`Informationen ${selected.id}`}
                disabled={!editable}
                onSave={(info) => save("team_members", selected, { info })}
              />
            </Field>
            <Field label="Notizen">
              <AutoInput
                multiline
                value={selected.notes || ""}
                label={`Notizen ${selected.id}`}
                disabled={!editable}
                onSave={(notes) => save("team_members", selected, { notes })}
              />
            </Field>
            <div className="detail-section">
              <h3>Verwarnungshistorie</h3>
              {data.warning_status
                .filter((w) => w.member_id === selected.id)
                .map((w) => (
                  <div key={w.id} className="history-row">
                    <Badge
                      tone={
                        warningActive(w)
                          ? ["", "yellow", "orange", "red"][w.level]
                          : "neutral"
                      }
                    >
                      Warn {w.level}
                    </Badge>
                    <span>
                      {w.reason}
                      <small>
                        {date(w.starts_on)} bis{" "}
                        {w.expires_on ? date(w.expires_on) : "unbefristet"} ·{" "}
                        {w.revoked
                          ? "Aufgehoben"
                          : warningActive(w)
                            ? "Aktiv"
                            : "Inaktiv"}
                      </small>
                    </span>
                  </div>
                ))}
              {!data.warning_status.some(
                (w) => w.member_id === selected.id,
              ) && <p className="muted">Keine Verwarnungen vorhanden.</p>}
            </div>
            <div className="detail-section">
              <h3>Besprechungsteilnahmen</h3>
              {data.meeting_attendance
                .filter((a) => a.member_id === selected.id)
                .map((a) => (
                  <div className="history-row" key={a.id}>
                    <Users size={16} />
                    <span>
                      {data.meetings.find((m) => m.id === a.meeting_id)?.title}
                      <small>
                        {
                          {
                            open: "Offen",
                            present: "Anwesend",
                            registered: "Angemeldet",
                            absent: "Abgemeldet",
                          }[a.status]
                        }{" "}
                        · damaliger Name: {a.name_snapshot}
                      </small>
                    </span>
                  </div>
                ))}
              {!data.meeting_attendance.some(
                (a) => a.member_id === selected.id,
              ) && <p className="muted">Noch keine Besprechungsteilnahmen.</p>}
            </div>
            <div className="detail-section">
              <h3>Letzte Änderungen</h3>
              <ActivityList
                logs={data.audit_logs
                  .filter((a) => a.entity_id === selected.id)
                  .slice(0, 8)}
                compact
              />
            </div>
            {deleteError && (
              <div className="notice notice-error" role="alert">
                {deleteError}
              </div>
            )}
            {(editable || can("admin")) && (
              <div className="form-actions">
                {editable && selected.status !== "archived" && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (
                        window.confirm(
                          `${selected.name} archivieren? Besprechungen und Verwarnungen bleiben erhalten.`,
                        )
                      ) {
                        await save("team_members", selected, {
                          status: "archived",
                        });
                        close();
                      }
                    }}
                  >
                    <Archive size={16} /> Mitglied archivieren
                  </Button>
                )}
                {can("admin") && (
                  <Button
                    variant="danger"
                    disabled={deleting}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `„${selected.name}“ endgültig löschen? Rollenzuweisungen, Verwarnungen und Besprechungsteilnahmen werden ebenfalls gelöscht. Besprechungen, Wünsche und Änderungsprotokolle bleiben erhalten. Dies kann nicht rückgängig gemacht werden.`,
                        )
                      ) return;
                      setDeleting(true);
                      setDeleteError("");
                      try {
                        await save("team_members", selected, {}, true);
                        close();
                      } catch (e) {
                        setDeleteError(errorMessage(e));
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    <Trash2 size={16} /> Mitglied endgültig löschen
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
