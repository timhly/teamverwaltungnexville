import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Check,
  CheckCheck,
  Copy,
  FileDown,
  Plus,
  Search,
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
} from "../components/ui";
import { CreateForm, nullable, text } from "../components/forms";
import { useStore } from "../lib/store";
import { ATTENDANCE_LABELS } from "../lib/types";
import {
  berlinDay,
  berlinToISO,
  date,
  errorMessage,
  isoToBerlin,
} from "../lib/utils";
import { snapshotPosition } from "../lib/ranks";

export default function Meetings() {
  const { data, can, save, create, teamId, refresh } = useStore();
  const [params, setParams] = useSearchParams();
  const editable = can("meetings");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const meetings = data.meetings
    .filter(
      (m) =>
        m.title.toLowerCase().includes(search.toLowerCase()) &&
        (!dateFilter || isoToBerlin(m.starts_at).slice(0, 10) === dateFilter) &&
        (statusFilter === "all" || m.status === statusFilter),
    )
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const selected =
    data.meetings.find((m) => m.id === params.get("sitzung")) ||
    (!params.has("sitzung") ? meetings[0] : undefined);
  const topics = data.meeting_topics
    .filter((t) => t.meeting_id === selected?.id)
    .sort((a, b) => a.position - b.position);
  const attendees = data.meeting_attendance
    .filter((a) => a.meeting_id === selected?.id)
    .sort(
      (a, b) =>
        snapshotPosition(a.roles_snapshot) -
          snapshotPosition(b.roles_snapshot) ||
        a.name_snapshot.localeCompare(b.name_snapshot, "de"),
    );
  const closeNew = () => {
    const p = new URLSearchParams(params);
    p.delete("neu");
    setParams(p);
  };
  useEffect(() => {
    setError("");
  }, [selected?.id]);
  const print = () => {
    document.title = `Nexville Roleplay – ${selected?.title || "Besprechungsprotokoll"}`;
    window.print();
    document.title = "Nexville Roleplay · Teamverwaltung";
  };
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <span className="eyebrow">GEMEINSAM WEITERDENKEN</span>
          <h1>Teambesprechungen</h1>
          <p>Termine, Themen und Anwesenheit an einem Ort.</p>
        </div>
        {editable && (
          <Button
            onClick={() =>
              setParams({ ...Object.fromEntries(params), neu: "1" })
            }
          >
            <Plus size={18} /> Besprechung planen
          </Button>
        )}
      </div>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <div className="meetings-layout">
        <aside className="panel meeting-sidebar no-print">
          <div className="meeting-sidebar-header">
            <h2>
              Besprechungsarchiv <Badge>{data.meetings.length}</Badge>
            </h2>
            <div className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Besprechung suchen …"
                aria-label="Besprechung suchen"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Besprechungsdatum filtern"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Besprechungsstatus filtern"
            >
              <option value="all">Alle Status</option>
              <option value="planned">Geplant</option>
              <option value="completed">Abgeschlossen</option>
              <option value="archived">Archiviert</option>
            </select>
          </div>
          <div className="meeting-list">
            {meetings.map((m) => (
              <button
                key={m.id}
                className={m.id === selected?.id ? "selected" : ""}
                onClick={() => setParams({ sitzung: m.id })}
              >
                <span className="meeting-list-date">
                  <CalendarDays size={14} />
                  {date(m.starts_at, true)}
                </span>
                <strong>{m.title}</strong>
                <span className="meeting-list-meta">
                  <Badge tone={m.status === "planned" ? "teal" : "neutral"}>
                    {m.status === "planned"
                      ? "Geplant"
                      : m.status === "completed"
                        ? "Abgeschlossen"
                        : "Archiviert"}
                  </Badge>
                  <span>
                    {
                      data.meeting_topics.filter(
                        (t) => t.meeting_id === m.id && t.title,
                      ).length
                    }{" "}
                    Themen
                  </span>
                </span>
              </button>
            ))}
          </div>
          {!meetings.length && (
            <p className="section-empty">Keine passenden Sitzungen.</p>
          )}
        </aside>
        <div className="meeting-main">
          {selected ? (
            <>
              <section className="panel meeting-overview">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">BESPRECHUNGSPROTOKOLL</span>
                    <h2>{selected.title}</h2>
                    <p>
                      <CalendarDays size={15} />{" "}
                      {date(selected.starts_at, true)} Uhr · Europe/Berlin
                    </p>
                  </div>
                  <div className="heading-actions no-print">
                    <Button variant="ghost" onClick={print}>
                      <FileDown size={17} /> PDF
                    </Button>
                    {editable && (
                      <Button
                        variant="secondary"
                        onClick={() => setCopying(true)}
                      >
                        <Copy size={16} /> Kopieren
                      </Button>
                    )}
                  </div>
                </div>
                <div className="meeting-settings no-print">
                  <Field label="Titel">
                    <AutoInput
                      label={`Besprechungstitel ${selected.id}`}
                      value={selected.title}
                      maxLength={200}
                      disabled={!editable}
                      onSave={(title) => save("meetings", selected, { title })}
                    />
                  </Field>
                  <Field label="Datum & Uhrzeit (Berlin)">
                    <AutoInput
                      type="datetime-local"
                      label={`Besprechungstermin ${selected.id}`}
                      value={isoToBerlin(selected.starts_at)}
                      disabled={!editable}
                      onSave={async (value) => {
                        const starts_at = berlinToISO(value);
                        await save("meetings", selected, { starts_at });
                      }}
                    />
                  </Field>
                  <Field label="Besprechungsleitung">
                    <select
                      value={selected.leader_id || ""}
                      disabled={!editable}
                      onChange={(e) =>
                        void save("meetings", selected, {
                          leader_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Nicht festgelegt</option>
                      {data.team_members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bearbeitungsstatus">
                    <select
                      value={selected.status}
                      disabled={!editable}
                      onChange={(e) =>
                        void save("meetings", selected, {
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="planned">Geplant</option>
                      <option value="completed">Abgeschlossen</option>
                      <option value="archived">Archiviert</option>
                    </select>
                  </Field>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Teambesprechung Themen</h2>
                    <p>
                      {topics.filter((t) => t.done && t.title).length} von{" "}
                      {topics.filter((t) => t.title).length} Themen besprochen
                    </p>
                  </div>
                  <CheckCheck size={19} className="muted" />
                </div>
                <div className="topic-list">
                  {topics.map((t) => (
                    <div
                      className={`topic-row ${t.done ? "topic-done" : ""}`}
                      key={t.id}
                    >
                      <span className="topic-number">
                        {String(t.position).padStart(2, "0")}
                      </span>
                      <input
                        type="checkbox"
                        aria-label={`Thema ${t.position} als besprochen markieren`}
                        checked={t.done}
                        disabled={!editable}
                        onChange={(e) =>
                          void save("meeting_topics", t, {
                            done: e.target.checked,
                          })
                        }
                      />
                      <AutoInput
                        label={`Thema ${t.position} ${selected.id}`}
                        value={t.title}
                        disabled={!editable}
                        placeholder="Thema ergänzen …"
                        maxLength={5000}
                        onSave={(title) => save("meeting_topics", t, { title })}
                      />
                      <select
                        value={t.responsible_id || ""}
                        disabled={!editable}
                        aria-label={`Verantwortlich für Thema ${t.position}`}
                        onChange={(e) =>
                          void save("meeting_topics", t, {
                            responsible_id: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Verantwortlich …</option>
                        {data.team_members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {editable && (
                  <div className="panel-footer no-print">
                    <button
                      className="text-link"
                      onClick={() =>
                        void create("meeting_topics", {
                          meeting_id: selected.id,
                          position:
                            Math.max(0, ...topics.map((t) => t.position)) + 1,
                          title: "",
                        })
                      }
                    >
                      <Plus size={16} /> Weiteres Thema hinzufügen
                    </button>
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Teilnehmerübersicht</h2>
                    <p>
                      Die Namen und Rollen werden zum Zeitpunkt der Einladung
                      festgehalten.
                    </p>
                  </div>
                  <Users size={19} className="muted" />
                </div>
                <div className="attendance-stats">
                  {(["present", "registered", "absent"] as const).map(
                    (status) => (
                      <div key={status}>
                        <Badge
                          tone={
                            status === "present"
                              ? "green"
                              : status === "registered"
                                ? "cyan"
                                : "red"
                          }
                        >
                          {ATTENDANCE_LABELS[status]}
                        </Badge>
                        <strong>
                          {attendees.filter((a) => a.status === status).length}
                        </strong>
                      </div>
                    ),
                  )}
                </div>
                <div className="attendance-grid">
                  {attendees.map((a) => (
                    <div className="attendance-member" key={a.id}>
                      <Avatar name={a.name_snapshot} />
                      <div>
                        <strong>{a.name_snapshot}</strong>
                        <small>
                          {a.roles_snapshot.join(" / ") || "Keine Rolle"}
                        </small>
                      </div>
                      <select
                        aria-label={`Anwesenheit ${a.name_snapshot}`}
                        disabled={!editable}
                        value={a.status}
                        className={`attendance-${a.status}`}
                        onChange={(e) =>
                          void save("meeting_attendance", a, {
                            status: e.target.value,
                          })
                        }
                      >
                        {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => (
                          <option value={k} key={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {!attendees.length && (
                  <p className="section-empty">
                    Bei Erstellung waren keine aktiven Mitglieder vorhanden.
                  </p>
                )}
              </section>
              <section className="panel meeting-notes">
                <div className="panel-heading">
                  <div>
                    <h2>Notizen & Beschlüsse</h2>
                    <p>
                      Damit gute Ideen auch nach der Besprechung weiterleben.
                    </p>
                  </div>
                </div>
                {(
                  [
                    { key: "notes", label: "Notizen" },
                    { key: "results", label: "Ergebnisse" },
                    { key: "decisions", label: "Beschlüsse" },
                  ] as const
                ).map((f) => (
                  <Field label={f.label} key={f.key}>
                    <AutoInput
                      multiline
                      label={`${f.label} ${selected.id}`}
                      value={selected[f.key] || ""}
                      disabled={!editable}
                      maxLength={30000}
                      placeholder={`${f.label} festhalten …`}
                      onSave={(value) =>
                        save("meetings", selected, { [f.key]: value })
                      }
                    />
                  </Field>
                ))}
              </section>
            </>
          ) : (
            <section className="panel">
              <Empty
                title="Raum für den nächsten Austausch"
                action={
                  editable ? (
                    <Button onClick={() => setParams({ neu: "1" })}>
                      <Plus size={16} /> Erste Besprechung planen
                    </Button>
                  ) : undefined
                }
              >
                Jede Besprechung bekommt ein eigenes Protokoll und eine eigene
                Anwesenheitsliste.
              </Empty>
            </section>
          )}
        </div>
      </div>
      <Dialog
        open={params.get("neu") === "1"}
        onOpenChange={(v) => {
          if (!v) closeNew();
        }}
        title="Nächster Austausch für Nexville"
        description="13 Themenzeilen und die aktive Teilnehmerliste werden automatisch angelegt."
      >
        <CreateForm
          onCancel={closeNew}
          submitLabel="Besprechung erstellen"
          onSubmit={async (f) => {
            const id = await create("meetings", {
              title: text(f, "title"),
              starts_at: berlinToISO(text(f, "starts_at")),
              leader_id: nullable(f, "leader_id"),
            });
            setParams({ sitzung: id });
          }}
        >
          <Field label="Titel">
            <input
              name="title"
              required
              maxLength={200}
              placeholder="z. B. Wöchentliche Teambesprechung"
            />
          </Field>
          <Field label="Datum & Uhrzeit (Europe/Berlin)">
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={`${berlinDay()}T20:00`}
              required
            />
          </Field>
          <Field label="Besprechungsleitung (optional)">
            <select name="leader_id">
              <option value="">Nicht festgelegt</option>
              {data.team_members
                .filter((m) => m.status === "active")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
        </CreateForm>
      </Dialog>
      <Dialog
        open={copying}
        onOpenChange={setCopying}
        title="Besprechung kopieren"
        description="Themen werden übernommen. Anwesenheit, Erledigungsstatus und Protokoll werden neu angelegt."
      >
        <CreateForm
          onCancel={() => setCopying(false)}
          submitLabel={copyBusy ? "Wird kopiert …" : "Kopie erstellen"}
          onSubmit={async (f) => {
            if (!selected || copyBusy) return;
            setCopyBusy(true);
            try {
              const id = await create("meetings", {
                title: `${selected.title} (Kopie)`.slice(0, 200),
                starts_at: berlinToISO(text(f, "starts_at")),
                leader_id: selected.leader_id,
                copy_source: selected.id,
              });
              setCopying(false);
              setParams({ sitzung: id });
            } catch (e) {
              setError(errorMessage(e));
              throw e;
            } finally {
              setCopyBusy(false);
            }
          }}
        >
          <Field label="Neuer Termin (Europe/Berlin)">
            <input
              type="datetime-local"
              name="starts_at"
              required
              defaultValue={`${berlinDay()}T20:00`}
            />
          </Field>
        </CreateForm>
      </Dialog>
    </>
  );
}
