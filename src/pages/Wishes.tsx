import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  Lightbulb,
  Plus,
  Search,
  Trash2,
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
import { date } from "../lib/utils";
import { WISH_LABELS } from "../lib/types";
import { ActivityList } from "./History";
const PRIORITY_LABELS = { low: "Niedrig", normal: "Normal", high: "Hoch" };
export default function Wishes() {
  const { data, can, save, create } = useStore();
  const [params, setParams] = useSearchParams();
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("current");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const editable = can("wishes");
  const selected = data.team_wishes.find((w) => w.id === params.get("wunsch"));
  const filtered = data.team_wishes
    .filter(
      (w) =>
        `${w.title} ${w.description}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "all" ||
          (status === "current"
            ? w.status !== "archived"
            : w.status === status)),
    )
    .sort((a, b) =>
      sort === "priority"
        ? ["high", "normal", "low"].indexOf(a.priority) -
            ["high", "normal", "low"].indexOf(b.priority) ||
          b.created_at.localeCompare(a.created_at)
        : sort === "name"
          ? a.title.localeCompare(b.title, "de")
          : b.created_at.localeCompare(a.created_at),
    );
  useEffect(() => {
    setPage(0);
  }, [search, status, sort]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEINE IDEEN MACHEN DEN UNTERSCHIED</span>
          <h1>
            Team Wünsche
            <span className="heading-count">
              {data.team_wishes.filter((w) => w.status !== "archived").length}
            </span>
          </h1>
          <p>Ideen sammeln, priorisieren und den Fortschritt verfolgen.</p>
        </div>
        {editable && (
          <Button onClick={() => setIsNew(true)}>
            <Plus size={18} /> Wunsch hinzufügen
          </Button>
        )}
      </div>
      <div className="wish-tabs" role="group" aria-label="Wunschstatus filtern">
        {[
          ["current", "Alle Wünsche"],
          ["open", "Offen"],
          ["progress", "In Bearbeitung"],
          ["done", "Umgesetzt"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={status === key ? "active" : ""}
            onClick={() => setStatus(key)}
          >
            {label}
            <span>
              {
                data.team_wishes.filter((w) =>
                  key === "current"
                    ? w.status !== "archived"
                    : w.status === key,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="table-toolbar wish-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Idee oder Wunsch suchen …"
            aria-label="Teamwunsch suchen"
          />
        </div>
        <div className="filter-group">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Wunschstatus"
          >
            <option value="current">Nicht archiviert</option>
            {Object.entries(WISH_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
            <option value="all">Alle Status</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Wünsche sortieren"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="priority">Priorität</option>
            <option value="name">Titel A–Z</option>
          </select>
        </div>
      </div>
      {filtered.length ? (
        <>
          <div className="wish-grid">
            {filtered.slice(page * 9, page * 9 + 9).map((w) => {
              const author = data.team_members.find(
                (m) => m.id === w.submitted_by,
              );
              return (
                <button
                  className="wish-card"
                  key={w.id}
                  onClick={() => setParams({ wunsch: w.id })}
                >
                  <div className="wish-card-top">
                    <span className="wish-bulb">
                      <Lightbulb size={19} />
                    </span>
                    <Badge tone={w.priority === "high" ? "orange" : "neutral"}>
                      Priorität {PRIORITY_LABELS[w.priority]}
                    </Badge>
                    <ArrowUpRight size={17} />
                  </div>
                  <h2>{w.title}</h2>
                  <p>
                    {w.description || "Noch keine Beschreibung hinterlegt."}
                  </p>
                  <Badge
                    tone={
                      w.status === "done"
                        ? "green"
                        : w.status === "progress"
                          ? "cyan"
                          : w.status === "rejected"
                            ? "red"
                            : "teal"
                    }
                  >
                    {WISH_LABELS[w.status]}
                  </Badge>
                  <div className="wish-card-footer">
                    <span>
                      {author ? (
                        <>
                          <Avatar name={author.name} />
                          {author.name}
                        </>
                      ) : (
                        "Ohne Zuordnung"
                      )}
                    </span>
                    <time>{date(w.created_at)}</time>
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination
            page={page}
            setPage={setPage}
            total={filtered.length}
            size={9}
          />
        </>
      ) : (
        <section className="panel">
          <Empty
            title="Nexville wächst mit deinen Ideen"
            action={
              editable ? (
                <Button onClick={() => setIsNew(true)}>
                  <Plus size={16} /> Ersten Wunsch einreichen
                </Button>
              ) : undefined
            }
          >
            Hier finden Verbesserungsvorschläge und Teamwünsche ihren Platz.
            Noch gibt es keine passenden Einträge.
          </Empty>
        </section>
      )}
      <Dialog
        open={isNew}
        onOpenChange={setIsNew}
        title="Eine neue Idee für Nexville"
        description="Beschreibe deinen Vorschlag. Den Fortschritt könnt ihr gemeinsam verfolgen."
      >
        <CreateForm
          onCancel={() => setIsNew(false)}
          submitLabel="Wunsch hinzufügen"
          onSubmit={async (f) => {
            const id = await create("team_wishes", {
              title: text(f, "title"),
              description: text(f, "description"),
              submitted_by: nullable(f, "submitted_by"),
              priority: text(f, "priority"),
              internal_note: text(f, "internal_note"),
            });
            setIsNew(false);
            setParams({ wunsch: id });
          }}
        >
          <Field label="Titel">
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Was wünschst du dir?"
            />
          </Field>
          <Field label="Beschreibung">
            <textarea name="description" rows={4} maxLength={10000} />
          </Field>
          <div className="form-grid">
            <Field label="Eingereicht von">
              <select name="submitted_by">
                <option value="">Ohne Zuordnung</option>
                {data.team_members
                  .filter((m) => m.status !== "archived")
                  .map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Priorität">
              <select name="priority" defaultValue="normal">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Interne Notiz">
            <textarea name="internal_note" maxLength={10000} />
          </Field>
        </CreateForm>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setParams({});
        }}
        title={selected?.title || "Teamwunsch"}
        wide
      >
        {selected && (
          <div className="form-stack">
            <div className="wish-detail-meta">
              <Badge tone="teal">{WISH_LABELS[selected.status]}</Badge>
              <span className="muted">
                Erstellt am {date(selected.created_at)}
              </span>
            </div>
            <Field label="Titel">
              <AutoInput
                label={`Wunschtitel ${selected.id}`}
                value={selected.title}
                maxLength={200}
                disabled={!editable}
                onSave={(title) => save("team_wishes", selected, { title })}
              />
            </Field>
            <Field label="Beschreibung">
              <AutoInput
                label={`Wunschbeschreibung ${selected.id}`}
                multiline
                value={selected.description || ""}
                disabled={!editable}
                onSave={(description) =>
                  save("team_wishes", selected, { description })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="Status">
                <select
                  value={selected.status}
                  disabled={!editable}
                  onChange={(e) =>
                    void save("team_wishes", selected, {
                      status: e.target.value,
                    })
                  }
                >
                  {Object.entries(WISH_LABELS).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priorität">
                <select
                  value={selected.priority}
                  disabled={!editable}
                  onChange={(e) =>
                    void save("team_wishes", selected, {
                      priority: e.target.value,
                    })
                  }
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Eingereicht von">
                <select
                  value={selected.submitted_by || ""}
                  disabled={!editable}
                  onChange={(e) =>
                    void save("team_wishes", selected, {
                      submitted_by: e.target.value || null,
                    })
                  }
                >
                  <option value="">Ohne Zuordnung</option>
                  {data.team_members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Interne Notiz">
              <AutoInput
                label={`Wunschnotiz ${selected.id}`}
                value={selected.internal_note || ""}
                multiline
                disabled={!editable}
                onSave={(internal_note) =>
                  save("team_wishes", selected, { internal_note })
                }
              />
            </Field>
            <div className="detail-section">
              <h3>Bearbeitungshistorie</h3>
              <ActivityList
                compact
                logs={data.audit_logs
                  .filter((a) => a.entity_id === selected.id)
                  .slice(0, 12)}
              />
            </div>
            <div className="form-actions">
              {editable && selected.status !== "archived" && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (window.confirm("Wunsch archivieren?")) {
                      await save("team_wishes", selected, {
                        status: "archived",
                      });
                      setParams({});
                    }
                  }}
                >
                  <Archive size={16} /> Archivieren
                </Button>
              )}
              {can("admin") && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Diesen Wunsch dauerhaft löschen? Das Änderungsprotokoll bleibt erhalten.",
                      )
                    ) {
                      await save("team_wishes", selected, {}, true);
                      setParams({});
                    }
                  }}
                >
                  <Trash2 size={16} /> Löschen
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
