import { useState } from "react";
import { Check, RefreshCw, UserRoundPlus, X } from "lucide-react";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import {
  ACCESS_LABELS,
  type AccessRequest,
  type AccessRole,
} from "../lib/types";
import { date, errorMessage } from "../lib/utils";
import { Avatar, Badge, Button } from "./ui";

export function AccessRequests() {
  const { data, can, teamId, refresh } = useStore();
  const [roles, setRoles] = useState<Record<string, AccessRole>>({});
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!can("admin")) return null;
  const requests = data.access_requests
    .filter((r) => all || r.status === "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const review = async (
    request: AccessRequest,
    decision: "approved" | "rejected",
  ) => {
    const role = roles[request.id] || "viewer";
    if (
      decision === "approved" &&
      role === "admin" &&
      !window.confirm(
        `${request.discord_name} (Discord-ID ${request.discord_id}) als Administrator freigeben? Damit erhält die Person vollständige Verwaltungsrechte.`,
      )
    )
      return;
    if (
      decision === "rejected" &&
      !window.confirm(`Zugangsanfrage von ${request.discord_name} ablehnen?`)
    )
      return;
    setBusy(request.id);
    setError("");
    setNotice("");
    try {
      const { data: reviewed, error } = await supabase!.rpc(
        "review_access_request",
        {
          p_team: teamId,
          p_request: request.id,
          p_expected: request.version,
          p_decision: decision,
          p_role: role,
        },
      );
      if (error) throw error;
      await refresh();
      setNotice(
        decision === "approved"
          ? `${request.discord_name} wurde als ${ACCESS_LABELS[(reviewed?.access_role || role) as AccessRole]} freigeschaltet.`
          : "Die Anfrage wurde abgelehnt.",
      );
    } catch (e) {
      setError(errorMessage(e));
      void refresh().catch(() => {});
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="panel access-requests-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Discord-Zugangsanfragen{" "}
            <Badge tone="teal">
              {
                data.access_requests.filter((r) => r.status === "pending")
                  .length
              }
            </Badge>
          </h2>
          <p>Discord-ID prüfen und den Zugang für den Teamraum freigeben.</p>
        </div>
        <div className="heading-actions">
          <Button
            variant="ghost"
            aria-label="Zugangsanfragen aktualisieren"
            onClick={() =>
              void refresh().catch((e) => setError(errorMessage(e)))
            }
          >
            <RefreshCw size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setAll((v) => !v)}>
            {all ? "Nur offene Anfragen" : "Alle Anfragen"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      {requests.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DISCORD-KONTO</th>
                <th>ANGEFRAGT</th>
                <th>ZUGRIFFSROLLE</th>
                <th>FREIGABE</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="member-name">
                      <Avatar name={r.discord_name} />
                      <div>
                        <strong>{r.discord_name}</strong>
                        <small className="account-id">
                          Discord-ID: {r.discord_id}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="muted nowrap">{date(r.created_at, true)}</td>
                  <td>
                    {r.status === "approved" ? (
                      <Badge tone="green">
                        {r.access_role
                          ? ACCESS_LABELS[r.access_role]
                          : "Freigegeben"}
                      </Badge>
                    ) : (
                      <select
                        aria-label={`Freigaberolle ${r.discord_name}`}
                        disabled={!!busy}
                        value={roles[r.id] || "viewer"}
                        onChange={(e) =>
                          setRoles((previous) => ({
                            ...previous,
                            [r.id]: e.target.value as AccessRole,
                          }))
                        }
                      >
                        {Object.entries(ACCESS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {r.status === "approved" ? (
                      <Badge tone="green">
                        <Check size={13} />
                        Freigegeben
                      </Badge>
                    ) : (
                      <div className="heading-actions">
                        <Button
                          disabled={!!busy}
                          onClick={() => void review(r, "approved")}
                        >
                          <UserRoundPlus size={15} />
                          Freigeben
                        </Button>
                        {r.status === "pending" ? (
                          <Button
                            disabled={!!busy}
                            variant="ghost"
                            onClick={() => void review(r, "rejected")}
                          >
                            <X size={15} />
                            Ablehnen
                          </Button>
                        ) : (
                          <Badge tone="red">Abgelehnt</Badge>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="requests-empty">
          <UserRoundPlus size={20} />
          <p>
            Keine offenen Zugangsanfragen. Neue Discord-Nutzer können nach der
            Anmeldung Zugang anfragen.
          </p>
        </div>
      )}
    </section>
  );
}
