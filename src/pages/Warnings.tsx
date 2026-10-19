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
import { Select } from "../components/Select";
import { WARNING_LEVELS, warningProtectedRole } from "../lib/warnings";

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
  const protection = (id: string) =>
    warningProtectedRole(id, data.roles, data.member_roles);
  const selectedEditable =
    editable && !!selected && !protection(selected.member_id);
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
    if (member && protection(member)) return;
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
      <div className="notice warning-protection-note">
        <ShieldCheck size={20} />
        <div>
          <strong>Projektleitung & Management sind geschützt</strong>
          <p>Diese Ränge können keine Verwarnungen erhalten.</p>
        </div>
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
          <Select
            value={filter}
            onValueChange={setFilter}
            label="Nach Verwarnungsstufe filtern"
            options={[
              { value: "all", label: "Alle Mitglieder" },
              { value: "none", label: "Keine Verwarnung" },
              ...WARNING_LEVELS.slice(1),
            ]}
          />
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
                const protectedRole = protection(m.id);
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
                      {protectedRole ? (
                        <div className="warning-protected">
                          <Badge tone="teal">
                            <ShieldCheck size={14} /> Geschützt
                          </Badge>
                          <small>{protectedRole.name}</small>
                        </div>
                      ) : (
                        <Select
                          className={`warning-select warn-${w?.level || 0}`}
                          value={String(w?.level || 0)}
                          disabled={!editable}
                          label={`Verwarnungsstufe ${m.name}`}
                          options={WARNING_LEVELS}
                          onValueChange={async (val) => {
                            if (val === "0") {
                              if (
                                window.confirm(
                                  `Alle aktiven Verwarnungen für ${m.name} aufheben? Die Historie bleibt erhalten.`,
                                )
                              )
                                for (const warn of activeFor(m.id))
                                  await save("warnings", warn, {
                                    revoked: true,
                                  });
                            } else openNew(m.id, val);
                          }}
                        />
                      )}
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
            const member = text(f, "member_id");
            if (!member) throw new Error("Bitte ein Mitglied auswählen.");
            if (protection(member))
              throw new Error(
                "Projektleitung und Management können keine Verwarnungen erhalten.",
              );
            const start = text(f, "starts_on"),
              end = nullable(f, "expires_on");
            if (end && end < start)
              throw new Error(
                "Das Ablaufdatum darf nicht vor dem Startdatum liegen.",
              );
            await create("warnings", {
              member_id: member,
              level: Number(text(f, "level")),
              reason: text(f, "reason"),
              info: text(f, "info"),
              starts_on: start,
              expires_on: end,
            });
            setIsNew(false);
          }}
        >
          <Field
            label="Mitglied"
            hint="Projektleitung und Management sind von Verwarnungen ausgeschlossen."
          >
            <Select
              name="member_id"
              label="Mitglied"
              placeholder="Mitglied auswählen"
              required
              value={newMember}
              onValueChange={setNewMember}
              options={data.team_members
                .filter((m) => m.status !== "archived" && !protection(m.id))
                .map((m) => ({ value: m.id, label: m.name }))}
            />
          </Field>
          <Field label="Verwarnungsstufe">
            <Select
              name="level"
              label="Verwarnungsstufe"
              value={level}
              onValueChange={setLevel}
              options={WARNING_LEVELS.slice(1)}
              className={`warn-${level}`}
            />
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
              <Select
                label="Stufe"
                options={WARNING_LEVELS.slice(1)}
                value={String(selected.level)}
                disabled={!selectedEditable}
                onValueChange={(value) =>
                  void save("warnings", selected, {
                    level: Number(value),
                  })
                }
              />
            </Field>
            <Field label="Grund">
              <AutoInput
                label={`Verwarnungsgrund ${selected.id}`}
                value={selected.reason}
                multiline
                disabled={!selectedEditable}
                onSave={(reason) => save("warnings", selected, { reason })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Startdatum">
                <AutoInput
                  type="date"
                  value={selected.starts_on}
                  label={`Verwarnungsstart ${selected.id}`}
                  disabled={!selectedEditable}
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
                  disabled={!selectedEditable}
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
                disabled={!selectedEditable}
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
