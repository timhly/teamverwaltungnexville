import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { get, set } from "idb-keyval";
import { supabase } from "./supabase";
import {
  EMPTY_DATA,
  type Data,
  type Module,
  type Mutation,
  type Permission,
  type Table,
} from "./types";
import { persistentStorage, SyncQueue } from "./sync";
import { errorMessage, warningActive } from "./utils";
import { sortMembers, sortRoles } from "./ranks";

interface Store {
  data: Data;
  session: Session;
  teamId: string;
  permission?: Permission;
  loading: boolean;
  error: string;
  queue: SyncQueue | null;
  revision: number;
  can: (module: Module | "admin") => boolean;
  save: (
    table: Table,
    row: { id: string; version: number },
    patch: Record<string, unknown>,
    remove?: boolean,
  ) => Promise<void>;
  create: (table: Table, patch: Record<string, unknown>) => Promise<string>;
  refresh: () => Promise<void>;
  selectTeam: (id: string) => void;
}
const Context = createContext<Store | null>(null);
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("Store fehlt.");
  return context;
}

async function fetchRows(table: keyof Data, teamId: string) {
  const rows: unknown[] = [];
  // Supabase caps page size. Explicit paging prevents silent truncation.
  for (let start = 0; ; start += 1000) {
    let query = supabase!
      .from(table)
      .select("*")
      .order("id")
      .range(start, start + 999);
    if (table !== "profiles" && table !== "teams")
      query = query.eq("team_id", teamId);
    if (table === "teams") query = query.eq("id", teamId);
    if (table === "audit_logs")
      query = supabase!
        .from(table)
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(300);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if ((data?.length || 0) < 1000 || table === "audit_logs") break;
  }
  return rows;
}
function overlay(base: Data, queue: SyncQueue | null): Data {
  if (!queue?.items.length) return base;
  const result = structuredClone(base);
  for (const item of queue.items) {
    const key = item.table === "warnings" ? "warning_status" : item.table;
    const rows = result[key] as unknown as Record<string, unknown>[];
    const index = rows.findIndex((x) => x.id === item.id);
    if (item.remove) {
      if (index >= 0) rows.splice(index, 1);
      continue;
    }
    const defaults: Record<string, unknown> = {
      created_at: item.queuedAt,
      updated_at: item.queuedAt,
      team_id: base.teams[0]?.id,
      info: "",
      notes: "",
      description: "",
      internal_note: "",
      results: "",
      decisions: "",
      done: false,
      revoked: false,
      leader_id: null,
      joined_on: null,
      responsible_id: null,
      submitted_by: null,
      expires_on: null,
      color: "#34d6bf",
      reference_count: null,
      kind: "extra",
      sort_order: 500,
    };
    if (item.table === "team_members") defaults.status = "active";
    if (item.table === "meetings") defaults.status = "planned";
    if (item.table === "team_wishes") {
      defaults.status = "open";
      defaults.priority = "normal";
    }
    const draft: Record<string, unknown> = {
      ...defaults,
      ...rows[index],
      ...item.patch,
      id: item.id,
      version: Math.max(Number(rows[index]?.version || 0), item.expected + 1),
    };
    if (item.table === "warnings")
      draft.active = warningActive(
        draft as unknown as Data["warning_status"][number],
        new Date(),
      );
    if (index >= 0) rows[index] = draft;
    else rows.push(draft);
    if (item.table === "team_members" && Array.isArray(item.patch.role_ids)) {
      result.member_roles = result.member_roles.filter(
        (x) => x.member_id !== item.id,
      );
      for (const id of item.patch.role_ids)
        result.member_roles.push({
          id: `draft:${item.id}:${id}`,
          team_id: String(draft.team_id || ""),
          member_id: item.id,
          role_id: String(id),
        });
    }
  }
  return result;
}
export function StoreProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const [base, setBase] = useState<Data>(EMPTY_DATA);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [queue, setQueue] = useState<SyncQueue | null>(null);
  const fetchSequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!teamId) return;
    const sequence = ++fetchSequence.current;
    const keys = Object.keys(EMPTY_DATA) as (keyof Data)[];
    const values = await Promise.all(keys.map((k) => fetchRows(k, teamId)));
    if (sequence !== fetchSequence.current) return;
    const snapshot = Object.fromEntries(
      keys.map((key, index) => [key, values[index]]),
    ) as unknown as Data;
    setBase(snapshot);
    setLoading(false);
    setError("");
    await set(`nexville:snapshot:v1:${session.user.id}:${teamId}`, snapshot);
  }, [session.user.id, teamId]);
  useEffect(() => {
    let disposed = false;
    void supabase!
      .from("user_permissions")
      .select("*")
      .eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (disposed) return;
        const selected = localStorage.getItem(
          `nexville:team:${session.user.id}`,
        );
        if (error) {
          setError(errorMessage(error));
          if (selected) setTeamId(selected);
          else setLoading(false);
          return;
        }
        const id =
          data?.find((x) => x.team_id === selected)?.team_id ||
          data?.[0]?.team_id;
        if (id) {
          localStorage.setItem(`nexville:team:${session.user.id}`, id);
          setTeamId(id);
        } else {
          setLoading(false);
          setError(
            "Für dein Konto wurde noch kein Teamzugriff eingerichtet. Bitte den Administrator kontaktieren.",
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [session.user.id]);
  useEffect(() => {
    if (!teamId) return;
    let disposed = false;
    setLoading(true);
    const q = new SyncQueue(
      persistentStorage(`${session.user.id}:${teamId}`),
      async (item) => {
        const { error } = await supabase!.rpc("mutate", {
          p_team: teamId,
          p_table: item.table,
          p_id: item.id,
          p_expected: item.expected,
          p_patch: item.patch,
          p_operation: item.operation,
          p_delete: !!item.remove,
        });
        if (error) throw error;
        // Keep the durable operation until the acknowledged server snapshot is loaded.
        // If this read fails, replaying the same operation ID remains idempotent.
        await refresh();
      },
      () => {
        if (!disposed) setRevision((v) => v + 1);
      },
    );
    void (async () => {
      try {
        const cached = await get<Data>(
          `nexville:snapshot:v1:${session.user.id}:${teamId}`,
        );
        if (cached && !disposed) setBase(cached);
        await q.init();
        if (disposed) {
          q.stop();
          return;
        }
        setQueue(q);
        await refresh();
        void q.flush();
      } catch (e) {
        if (!disposed) {
          q.state = "offline";
          setRevision((v) => v + 1);
          setError(errorMessage(e));
          setLoading(false);
        }
      }
    })();
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase!
      .channel(`audit:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            void refresh().catch((e) => setError(errorMessage(e)));
          }, 300);
        },
      )
      .subscribe();
    const online = () => {
      void q.flush();
      void refresh().catch((e) => setError(errorMessage(e)));
    };
    const offline = () => {
      q.state = "offline";
      setRevision((v) => v + 1);
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    // Refresh also updates permission revocations and date-derived warning state if realtime is unavailable.
    const interval = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible")
        void refresh().catch((e) => setError(errorMessage(e)));
    }, 60000);
    const visibility = () => {
      if (document.visibilityState === "visible") online();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      fetchSequence.current++;
      q.stop();
      setQueue(null);
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visibility);
      void supabase!.removeChannel(channel);
    };
  }, [teamId, session.user.id, refresh]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (queue?.items.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [queue]);
  const data = useMemo(() => {
    const merged = overlay(base, queue);
    const roles = sortRoles(merged.roles);
    return {
      ...merged,
      roles,
      team_members: sortMembers(
        merged.team_members,
        roles,
        merged.member_roles,
      ),
    };
  }, [base, queue, revision]);
  const permission = base.user_permissions.find(
    (p) => p.user_id === session.user.id && p.team_id === teamId,
  );
  const can = (m: Module | "admin") =>
    permission?.access_role === "admin" ||
    (m !== "admin" &&
      permission?.access_role === "editor" &&
      permission.modules.includes(m));
  const save: Store["save"] = async (table, row, patch, remove = false) => {
    if (!queue) throw new Error("Daten werden noch geladen.");
    const mutation: Mutation = {
      table,
      id: row.id,
      expected: row.version,
      operation: crypto.randomUUID(),
      patch,
      remove,
    };
    await queue.enqueue(mutation);
  };
  const create: Store["create"] = async (table, patch) => {
    const id = crypto.randomUUID();
    await save(table, { id, version: 0 }, patch);
    return id;
  };
  return (
    <Context.Provider
      value={{
        data,
        session,
        teamId,
        permission,
        loading,
        error,
        queue,
        revision,
        can,
        save,
        create,
        refresh,
        selectTeam: (id) => {
          if (queue?.items.length)
            throw new Error(
              "Bitte zunächst die ausstehenden Änderungen synchronisieren.",
            );
          localStorage.setItem(`nexville:team:${session.user.id}`, id);
          setTeamId(id);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
