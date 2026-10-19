import { useEffect, useState } from "react";
import { History, Plus, Search, ShieldCheck } from "lucide-react";
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
import { berlinDay, date, warningActive } from "../lib/utils";

export default function Warnings() {
  const { data, can, save, create } = useStore();
  const editable = can("warnings");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [newMember, setNewMember] = useState("");
  const [level, setLevel] = useState("1");
  const [isNew, setIsNew] = useState(false);
  const [historyMember, setHistoryMember] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const selected = data.warning_status.find((w) => w.id === selectedId);
  const activeFor = (id: string) =>
    data.warning_status
      .filter((w) => w.member_id === id && warningActive(w))
      .sort((a, b) => b.level - a.level);
  const members = data.team_members.filter(
    (m) =>
      m.status !== "archived" &&
      m.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "none"
          ? activeFor(m.id).length === 0
          : activeFor(m.id).some((w) => String(w.level) === filter))),
  );
  useEffect(() => {
    setPage(0);
  }, [search, filter]);
  const openNew = (member = "", nextLevel = "1") => {
    setNewMember(member);
    setLevel(nextLevel);
    setIsNew(true);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FAIR. TRANSPARENT. NACHVOLLZIEHBAR.</span>
          <h1>Verwarnungen</h1>
          <p>Ein klarer Überblick mit vollständiger Historie.</p>
        </div>
        {editable && (
          <Button onClick={() => openNew()}>
            <Plus size={18} /> Verwarnung eintragen
          </Button>
        )}
      </div>
      <div className="warning-summary">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <Badge tone={["", "yellow", "orange", "red"][n]}>Warn {n}</Badge>
            <strong>
              {
                data.warning_status.filter(
                  (w) => w.level === n && warningActive(w),
                ).length
              }
            </strong>
            <span>aktive Verwarnungen</span>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mitglied suchen …"
              aria-label="Verwarntes Mitglied suchen"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Nach Verwarnungsstufe filtern"
          >
            <option value="all">Alle Mitglieder</option>
            <option value="none">Keine Verwarnung</option>
            <option value="1">Warn 1</option>
            <option value="2">Warn 2</option>
            <option value="3">Warn 3</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>INFORMATIONEN</th>
                <th>WARNS</th>
                <th>DATUM</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.slice(page * 10, page * 10 + 10).map((m) => {
                const w = activeFor(m.id)[0];
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="member-name">
                        <Avatar name={m.name} />
                        <strong>{m.name}</strong>
                      </div>
                    </td>
                    <td className="cell-info">
                      {w?.reason || "Keine aktive Verwarnung"}
                      {w?.info && <small>{w.info}</small>}
                    </td>
                    <td>
                      <select
                        className={`warning-select warn-${w?.level || 0}`}
                        value={w?.level || 0}
                        disabled={!editable}
                        aria-label={`Verwarnungsstufe ${m.name}`}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (val === "0") {
                            if (
                              window.confirm(
                                `Alle aktiven Verwarnungen für ${m.name} aufheben? Die Historie bleibt erhalten.`,
                              )
                            )
                              for (const warn of activeFor(m.id))
                                await save("warnings", warn, { revoked: true });
                          } else openNew(m.id, val);
                        }}
                      >
                        <option value="0">Keine Verwarnung</option>
                        <option value="1">Warn 1</option>
                        <option value="2">Warn 2</option>
                        <option value="3">Warn 3</option>
                      </select>
                    </td>
                    <td className="nowrap muted">
                      {w ? (
                        <>
                          {date(w.starts_on)}
                          <br />
                          <small>
                            bis{" "}
                            {w.expires_on ? date(w.expires_on) : "unbefristet"}
                          </small>
                        </>
                      ) : (
                        "Kein Zeitraum"
                      )}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => setHistoryMember(m.id)}
                      >
                        <History size={16} /> Historie
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!members.length && (
          <Empty title="Keine passenden Mitglieder">
            Passe Suche oder Verwarnungsfilter an.
          </Empty>
        )}
        <Pagination page={page} setPage={setPage} total={members.length} />
      </section>
      <div className="system-note">
        <ShieldCheck size={16} />
        <span>
          Ablaufdaten gelten einschließlich des gewählten Tages in
          Europe/Berlin. Abgelaufene Einträge bleiben in der Historie.
        </span>
      </div>
      <Dialog
        open={isNew}
        onOpenChange={setIsNew}
        title="Verwarnung dokumentieren"
        description="Einträge bleiben auch nach Ablauf oder Aufhebung nachvollziehbar."
      >
        <CreateForm
          onCancel={() => setIsNew(false)}
          submitLabel="Verwarnung eintragen"
          onSubmit={async (f) => {
            const start = text(f, "starts_on"),
              end = nullable(f, "expires_on");
            if (end && end < start)
              throw new Error(
                "Das Ablaufdatum darf nicht vor dem Startdatum liegen.",
              );
            await create("warnings", {
              member_id: text(f, "member_id"),
              level: Number(text(f, "level")),
              reason: text(f, "reason"),
              info: text(f, "info"),
              starts_on: start,
              expires_on: end,
            });
            setIsNew(false);
          }}
        >
          <Field label="Mitglied">
            <select name="member_id" required defaultValue={newMember}>
              <option value="">Mitglied auswählen</option>
              {data.team_members
                .filter((m) => m.status !== "archived")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Verwarnungsstufe">
            <select name="level" defaultValue={level}>
              <option value="1">Warn 1</option>
              <option value="2">Warn 2</option>
              <option value="3">Warn 3</option>
            </select>
          </Field>
          <Field label="Grund">
            <textarea name="reason" required rows={3} maxLength={5000} />
          </Field>
          <div className="form-grid">
            <Field label="Startdatum">
              <input
                type="date"
                name="starts_on"
                required
                defaultValue={berlinDay()}
              />
            </Field>
            <Field label="Ablaufdatum (optional)">
              <input type="date" name="expires_on" />
            </Field>
          </div>
          <Field label="Zusätzliche Informationen">
            <textarea name="info" maxLength={10000} />
          </Field>
        </CreateForm>
      </Dialog>
      <Dialog
        open={!!historyMember}
        onOpenChange={(v) => {
          if (!v) setHistoryMember("");
        }}
        title={`Verwarnungshistorie · ${data.team_members.find((m) => m.id === historyMember)?.name || ""}`}
        description="Alle Einträge, einschließlich abgelaufener und aufgehobener Verwarnungen."
      >
        <div className="form-stack">
          {data.warning_status
            .filter((w) => w.member_id === historyMember)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((w) => (
              <button
                className="warning-history-item"
                key={w.id}
                onClick={() => {
                  setSelectedId(w.id);
                  setHistoryMember("");
                }}
              >
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
                  <strong>{w.reason}</strong>
                  <small>
                    {date(w.starts_on)} bis{" "}
                    {w.expires_on ? date(w.expires_on) : "unbefristet"} ·{" "}
                    {w.revoked
                      ? "Aufgehoben"
                      : warningActive(w)
                        ? "Aktiv"
                        : w.starts_on > berlinDay()
                          ? "Geplant"
                          : "Abgelaufen"}
                  </small>
                </span>
              </button>
            ))}
          {!data.warning_status.some((w) => w.member_id === historyMember) && (
            <Empty title="Eine weiße Weste">
              Für dieses Mitglied sind keine Verwarnungen eingetragen.
            </Empty>
          )}
        </div>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelectedId("");
        }}
        title="Verwarnung bearbeiten"
      >
        {selected && (
          <div className="form-stack">
            <Field label="Stufe">
              <select
                value={selected.level}
                disabled={!editable}
                onChange={(e) =>
                  void save("warnings", selected, {
                    level: Number(e.target.value),
                  })
                }
              >
                {[1, 2, 3].map((n) => (
                  <option value={n} key={n}>
                    Warn {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grund">
              <AutoInput
                label={`Verwarnungsgrund ${selected.id}`}
                value={selected.reason}
                multiline
                disabled={!editable}
                onSave={(reason) => save("warnings", selected, { reason })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Startdatum">
                <AutoInput
                  type="date"
                  value={selected.starts_on}
                  label={`Verwarnungsstart ${selected.id}`}
                  disabled={!editable}
                  onSave={(starts_on) =>
                    save("warnings", selected, { starts_on })
                  }
                />
              </Field>
              <Field label="Ablaufdatum">
                <AutoInput
                  type="date"
                  value={selected.expires_on || ""}
                  label={`Verwarnungsende ${selected.id}`}
                  disabled={!editable}
                  onSave={(expires_on) =>
                    save("warnings", selected, {
                      expires_on: expires_on || null,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Informationen">
              <AutoInput
                multiline
                value={selected.info}
                label={`Verwarnungsinfo ${selected.id}`}
                disabled={!editable}
                onSave={(info) => save("warnings", selected, { info })}
              />
            </Field>
            <Badge tone={selected.revoked ? "neutral" : "yellow"}>
              {selected.revoked
                ? "Aufgehoben"
                : warningActive(selected)
                  ? "Aktiv"
                  : "Inaktiv"}
            </Badge>
            {editable && !selected.revoked && (
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Verwarnung aufheben? Der Eintrag bleibt erhalten.",
                    )
                  )
                    void save("warnings", selected, { revoked: true });
                }}
              >
                Verwarnung aufheben
              </Button>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
