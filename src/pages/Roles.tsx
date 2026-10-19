import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Shield, Trash2 } from "lucide-react";
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
import { CreateForm, text } from "../components/forms";
import { useStore } from "../lib/store";
import { roleMembers } from "../lib/utils";

export default function Roles() {
  const { data, can, save, create } = useStore();
  const navigate = useNavigate();
  const [kind, setKind] = useState("rank");
  const [selectedId, setSelectedId] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const selected = data.roles.find((r) => r.id === selectedId);
  const editable = can("roles");
  const filtered = data.roles.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    setPage(0);
  }, [search, kind]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">KLARE ROLLEN. STARKES TEAM.</span>
          <h1>
            Rollenverwaltung
            <span className="heading-count">{data.roles.length}</span>
          </h1>
          <p>
            Zuständigkeiten organisieren und Verantwortungen sichtbar machen.
          </p>
        </div>
        {editable && (
          <Button onClick={() => setIsNew(true)}>
            <Plus size={18} /> Rolle erstellen
          </Button>
        )}
      </div>
      <div className="notice">
        <Shield size={18} />
        <span>
          Die Anzahl wird aus aktiven Mitgliedern berechnet. Der Referenzstand
          aus deiner Tabelle bleibt separat erhalten.
        </span>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              placeholder="Rolle suchen …"
              aria-label="Rolle suchen"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Rollenart filtern"
          >
            <option value="rank">Ränge</option>
            <option value="extra">Zusatzrollen</option>
            <option value="legacy">Weitere bestehende Rollen</option>
            <option value="all">Alle Rollen</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ABKÜRZUNG</th>
                <th>BEZEICHNUNG</th>
                <th>AKTIVE MITGLIEDER</th>
                <th>REFERENZSTAND</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 10, page * 10 + 10).map((r) => (
                <tr key={r.id}>
                  <td>
                    <Badge
                      tone="role"
                      style={
                        { "--badge-color": r.color } as React.CSSProperties
                      }
                    >
                      {r.code}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="plain-link"
                      onClick={() => setSelectedId(r.id)}
                    >
                      <strong>{r.name}</strong>
                    </button>
                    <p className="cell-subtitle">
                      {r.description || "Keine Beschreibung hinterlegt"}
                    </p>
                  </td>
                  <td>
                    <button
                      className="member-count-link"
                      onClick={() => navigate(`/mitglieder?rolle=${r.id}`)}
                    >
                      <UsersStack count={roleMembers(data, r.id).length} />
                      <strong>{roleMembers(data, r.id).length}</strong>{" "}
                      Mitglieder
                    </button>
                  </td>
                  <td className="muted">{r.reference_count ?? "—"}</td>
                  <td>
                    <Button variant="ghost" onClick={() => setSelectedId(r.id)}>
                      {editable ? "Bearbeiten" : "Details"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty title="Keine Rollen gefunden">
            Versuche einen anderen Suchbegriff.
          </Empty>
        )}
        <Pagination page={page} setPage={setPage} total={filtered.length} />
      </section>
      <Dialog
        open={isNew}
        onOpenChange={setIsNew}
        title="Neue Rolle erstellen"
        description="Ergänze eine Zuständigkeit für dein Team."
      >
        <CreateForm
          onCancel={() => setIsNew(false)}
          onSubmit={async (f) => {
            const id = await create("roles", {
              name: text(f, "name"),
              code: text(f, "code"),
              color: text(f, "color"),
              description: text(f, "description"),
              kind: text(f, "kind"),
            });
            setIsNew(false);
            setSelectedId(id);
          }}
        >
          <Field label="Bezeichnung">
            <input name="name" required maxLength={100} />
          </Field>
          <div className="form-grid">
            <Field label="Abkürzung">
              <input name="code" required maxLength={12} />
            </Field>
            <Field label="Rollenfarbe">
              <input name="color" type="color" defaultValue="#34d6bf" />
            </Field>
          </div>
          <Field label="Rollenart">
            <select name="kind" defaultValue="extra">
              <option value="rank">Rang</option>
              <option value="extra">Zusatzrolle</option>
            </select>
          </Field>
          <Field label="Beschreibung">
            <textarea name="description" rows={3} maxLength={5000} />
          </Field>
        </CreateForm>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelectedId("");
        }}
        title={selected?.name || "Rolle"}
        wide
      >
        {selected && (
          <div className="form-stack">
            <div className="form-grid">
              <Field label="Bezeichnung">
                <AutoInput
                  label={`Rollenname ${selected.id}`}
                  value={selected.name}
                  disabled={!editable}
                  maxLength={100}
                  onSave={(name) => save("roles", selected, { name })}
                />
              </Field>
              <Field label="Abkürzung">
                <AutoInput
                  label={`Abkürzung ${selected.id}`}
                  value={selected.code}
                  disabled={!editable}
                  maxLength={12}
                  onSave={(code) => save("roles", selected, { code })}
                />
              </Field>
              <Field label="Rollenfarbe">
                <AutoInput
                  label={`Rollenfarbe ${selected.id}`}
                  type="color"
                  value={selected.color}
                  disabled={!editable}
                  onSave={(color) => save("roles", selected, { color })}
                />
              </Field>
            </div>
            <Field label="Beschreibung">
              <AutoInput
                label={`Rollenbeschreibung ${selected.id}`}
                multiline
                value={selected.description}
                disabled={!editable}
                onSave={(description) =>
                  save("roles", selected, { description })
                }
              />
            </Field>
            <div className="detail-section">
              <h3>
                Aktive Mitglieder mit dieser Rolle{" "}
                <Badge>{roleMembers(data, selected.id).length}</Badge>
              </h3>
              <div className="role-member-list">
                {roleMembers(data, selected.id).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/mitglieder?mitglied=${m.id}`)}
                  >
                    <Avatar name={m.name} />
                    <strong>{m.name}</strong>
                  </button>
                ))}
              </div>
              {!roleMembers(data, selected.id).length && (
                <p className="muted">
                  Noch keinem aktiven Mitglied zugewiesen.
                </p>
              )}
            </div>
            {can("admin") && (
              <div className="form-actions">
                <Button
                  variant="danger"
                  disabled={data.member_roles.some(
                    (mr) => mr.role_id === selected.id,
                  )}
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Rolle „${selected.name}“ dauerhaft entfernen?`,
                      )
                    ) {
                      await save("roles", selected, {}, true);
                      setSelectedId("");
                    }
                  }}
                >
                  <Trash2 size={16} /> Rolle entfernen
                </Button>
              </div>
            )}
            {data.member_roles.some((mr) => mr.role_id === selected.id) && (
              <small className="muted">
                Zugewiesene Rollen können erst entfernt werden, wenn sämtliche
                Zuweisungen gelöst sind, auch bei archivierten Mitgliedern.
              </small>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
function UsersStack({ count }: { count: number }) {
  return (
    <span className="mini-members">
      {Array.from({ length: Math.min(count, 3) }, (_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}
