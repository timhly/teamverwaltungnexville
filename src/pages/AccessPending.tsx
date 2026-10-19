import { useCallback, useEffect, useState } from "react";
import {
  CheckCheck,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./Auth";
import { Avatar, Button } from "../components/ui";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { connectDiscord } from "../lib/discord";
import { errorMessage } from "../lib/utils";
import type { AccessRequest } from "../lib/types";

export function AccessPending() {
  const { data, session, error: storeError, reloadAccess } = useStore();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = data.profiles.find((p) => p.id === session.user.id);
  const load = useCallback(async () => {
    let query = supabase!
      .from("access_requests")
      .select("*")
      .eq("user_id", session.user.id);
    if (import.meta.env.VITE_ACCESS_TEAM_ID)
      query = query.eq("team_id", import.meta.env.VITE_ACCESS_TEAM_ID);
    const { data, error } = await query;
    if (error) throw error;
    setRequests(data || []);
  }, [session.user.id]);
  useEffect(() => {
    let active = true;
    const check = () => {
      if (active) void load().catch((e) => setError(errorMessage(e)));
    };
    check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        check();
        reloadAccess();
      }
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load, reloadAccess]);
  const status = requests[0]?.status;
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="access-page">
      <Brand />
      <section className="panel access-panel">
        <span className="section-icon">
          <ShieldCheck size={26} />
        </span>
        <span className="eyebrow">NEXVILLE INTERN</span>
        <h1>Dein Zugang zu Nexville.</h1>
        <p>
          Du bist angemeldet. Ein Administrator muss deinen Zugriff auf den
          Teamraum noch freigeben.
        </p>
        <div className="detail-identity">
          <Avatar name={profile?.display_name || "Teammitglied"} size="large" />
          <div>
            <h3>
              {profile?.discord_name || profile?.display_name || "Teammitglied"}
            </h3>
            <span>
              {profile?.discord_id
                ? `Discord-ID: ${profile.discord_id}`
                : session.user.email}
            </span>
          </div>
        </div>
        {(error || storeError) && (
          <div className="notice notice-error" role="alert">
            {error || storeError}
          </div>
        )}
        {status === "pending" && (
          <div className="notice notice-success" role="status">
            <CheckCheck size={19} />
            Deine Zugangsanfrage liegt der Teamverwaltung vor. Diese Seite prüft
            die Freigabe automatisch.
          </div>
        )}
        {status === "rejected" && (
          <div className="notice notice-warning" role="status">
            Deine Anfrage wurde abgelehnt. Bitte wende dich an die
            Teamverwaltung.
          </div>
        )}
        {status === "approved" && (
          <div className="notice" role="status">
            Deine Anfrage wurde bereits geprüft. Aktualisiere deinen Zugriff
            oder kontaktiere die Teamverwaltung.
          </div>
        )}
        <div className="form-stack">
          {profile?.discord_id ? (
            (!status ||
              (status !== "approved" &&
                requests[0]?.discord_id !== profile.discord_id)) && (
              <Button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const { error } = await supabase!.rpc(
                      "request_team_access",
                      { p_team: import.meta.env.VITE_ACCESS_TEAM_ID || null },
                    );
                    if (error) throw error;
                    await load();
                  })
                }
              >
                <MessageCircle size={18} /> Zugang anfragen
              </Button>
            )
          ) : (
            <Button
              className="discord-button"
              disabled={busy}
              onClick={() => void act(() => connectDiscord(true))}
            >
              <MessageCircle size={18} /> Discord verbinden
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              reloadAccess();
              void act(load);
            }}
          >
            <RefreshCw size={17} /> Zugriff aktualisieren
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              void act(async () => {
                const { error } = await supabase!.auth.signOut();
                if (error) throw error;
              })
            }
          >
            <LogOut size={17} />
            Abmelden
          </Button>
        </div>
        <small>
          Mit der Anmeldung werden keine Team- oder Administratorrechte
          vergeben.
        </small>
      </section>
    </main>
  );
}
