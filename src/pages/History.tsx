import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Check,
  Clock3,
  Plus,
  Search,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  Empty,
  Pagination,
} from "../components/ui";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import type { Audit } from "../lib/types";
import { date, downloadCSV, errorMessage, relativeTime } from "../lib/utils";
const ENTITY_LABELS: Record<string, string> = {
  access_requests: "Zugangsanfrage",
  teams: "Teameinstellungen",
  team_members: "Mitglied",
  roles: "Rolle",
  member_roles: "Rollenzuweisung",
  meetings: "Besprechung",
  meeting_topics: "Besprechungsthema",
  meeting_attendance: "Anwesenheit",
  warnings: "Verwarnung",
  team_wishes: "Teamwunsch",
  user_permissions: "Berechtigung",
  invitations: "Einladung",
};
const ACTION_LABELS: Record<string, string> = {
  insert: "hinzugefügt",
  update: "bearbeitet",
  delete: "entfernt",
};
export function auditTitle(log: Audit) {
  const title =
    log.new_data?.name ||
    log.new_data?.title ||
    log.old_data?.name ||
    log.old_data?.title;
  return `${title || ENTITY_LABELS[log.entity] || log.entity} ${ACTION_LABELS[log.action] || log.action}`;
}
export function ActivityList({
  logs,
  compact = false,
}: {
  logs: Audit[];
  compact?: boolean;
}) {
  return (
    <div className={`activity-list ${compact ? "activity-compact" : ""}`}>
      {logs.map((log) => (
        <div className="activity-item" key={log.id}>
          <span className={`activity-icon activity-${log.action}`}>
            {log.action === "insert" ? (
              <Plus size={14} />
            ) : log.action === "update" ? (
              <Check size={14} />
            ) : (
              <Activity size={14} />
            )}
          </span>
          <div>
            <strong>{auditTitle(log)}</strong>
            <p>
              {log.actor_name} <span>·</span> {relativeTime(log.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
export default function History() {
  const { teamId, revision } = useStore();
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState("all");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [logs, setLogs] = useState<Audit[]>([]);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<Audit | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPage(0);
  }, [entity, search, action]);
  useEffect(() => {
    let disposed = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      let query = supabase!
        .from("audit_logs")
        .select("*", { count: "exact" })
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 20, page * 20 + 19);
      if (entity !== "all") query = query.eq("entity", entity);
      if (action !== "all") query = query.eq("action", action);
      if (search)
        query = query.ilike(
          "actor_name",
          `%${search.replaceAll("%", "").replaceAll("_", "")}%`,
        );
      const { data, count, error } = await query;
      if (!disposed) {
        if (error) setError(errorMessage(error));
        else {
          setLogs(data || []);
          setCount(count || 0);
          setError("");
        }
        setBusy(false);
      }
    }, 200);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [teamId, page, entity, search, action, revision]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">JEDE ÄNDERUNG NACHVOLLZIEHEN</span>
          <h1>Änderungsverlauf</h1>
          <p>
            Was geändert wurde, von wem und wann. Unveränderbar protokolliert.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadCSV("nexville-verlauf-seite.csv", [
              [
                "Datum",
                "Benutzer",
                "Bereich",
                "Aktion",
                "Datensatz",
                "Vorher",
                "Nachher",
              ],
              ...logs.map((l) => [
                date(l.created_at, true),
                l.actor_name,
                ENTITY_LABELS[l.entity],
                ACTION_LABELS[l.action],
                l.entity_id,
                JSON.stringify(l.old_data),
                JSON.stringify(l.new_data),
              ]),
            ])
          }
        >
          <ArrowDownToLine size={17} /> Aktuelle Seite als CSV
        </Button>
      </div>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nach Bearbeiter suchen …"
              aria-label="Bearbeiter suchen"
            />
          </div>
          <div className="filter-group">
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              aria-label="Verlaufsbereich"
            >
              <option value="all">Alle Bereiche</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              aria-label="Verlaufsaktion"
            >
              <option value="all">Alle Aktionen</option>
              <option value="insert">Hinzugefügt</option>
              <option value="update">Bearbeitet</option>
              <option value="delete">Entfernt</option>
            </select>
          </div>
        </div>
        <div className="table-scroll" aria-busy={busy}>
          <table>
            <thead>
              <tr>
                <th>ÄNDERUNG</th>
                <th>BENUTZER</th>
                <th>BEREICH</th>
                <th>ZEITPUNKT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{auditTitle(l)}</strong>
                  </td>
                  <td>
                    <div className="member-name">
                      <Avatar name={l.actor_name} />
                      <span>{l.actor_name}</span>
                    </div>
                  </td>
                  <td>
                    <Badge>{ENTITY_LABELS[l.entity] || l.entity}</Badge>
                  </td>
                  <td className="nowrap muted">{date(l.created_at, true)}</td>
                  <td>
                    <Button variant="ghost" onClick={() => setSelected(l)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!busy && !logs.length && (
          <Empty title="Noch keine passenden Änderungen">
            Alle gespeicherten Änderungen werden hier automatisch dokumentiert.
          </Empty>
        )}
        <Pagination page={page} setPage={setPage} total={count} size={20} />
      </section>
      <div className="system-note">
        <Clock3 size={15} />
        <span>
          Alle Zeitangaben in Europe/Berlin. Ältere Einträge werden seitenweise
          direkt aus der Datenbank geladen.
        </span>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
        title="Änderung im Detail"
        description={
          selected
            ? `${selected.actor_name} · ${date(selected.created_at, true)} · ${ENTITY_LABELS[selected.entity]}`
            : ""
        }
        wide
      >
        {selected && (
          <>
            <div className="audit-record-id">
              Datensatz: <code>{selected.entity_id}</code>
            </div>
            <div className="table-scroll">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>FELD</th>
                    <th>VORHER</th>
                    <th>NACHHER</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...new Set([
                      ...Object.keys(selected.old_data || {}),
                      ...Object.keys(selected.new_data || {}),
                    ]),
                  ]
                    .filter(
                      (k) =>
                        !["updated_at", "version"].includes(k) &&
                        JSON.stringify(selected.old_data?.[k]) !==
                          JSON.stringify(selected.new_data?.[k]),
                    )
                    .map((k) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>
                          <pre>
                            {JSON.stringify(
                              selected.old_data?.[k] ?? null,
                              null,
                              2,
                            )}
                          </pre>
                        </td>
                        <td>
                          <pre>
                            {JSON.stringify(
                              selected.new_data?.[k] ?? null,
                              null,
                              2,
                            )}
                          </pre>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
