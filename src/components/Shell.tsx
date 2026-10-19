import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  CloudOff,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { ACCESS_LABELS } from "../lib/types";
import { Avatar, Badge, Button, Dialog } from "./ui";
import { Brand } from "../pages/Auth";
import { cn, downloadBlob, errorMessage } from "../lib/utils";
import { draftPrefix, listDrafts } from "../lib/drafts";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mitglieder", label: "Teammitglieder", icon: Users },
  { to: "/rollen", label: "Rollenverwaltung", icon: Shield },
  { to: "/besprechungen", label: "Teambesprechungen", icon: CalendarDays },
  { to: "/verwarnungen", label: "Verwarnungen", icon: ShieldAlert },
  { to: "/wuensche", label: "Teamwünsche", icon: Lightbulb },
  { to: "/verlauf", label: "Änderungsverlauf", icon: Activity },
  { to: "/backups", label: "Backups", icon: Archive },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];
export function Shell({ children }: { children: ReactNode }) {
  const { data, session, permission, queue, revision, refresh, error, teamId } =
    useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [help, setHelp] = useState(false);
  const [logout, setLogout] = useState(false);
  const [actionError, setActionError] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("nexville:theme") || "dark",
  );
  const prefix = draftPrefix(session.user.id, teamId);
  const [drafts, setDrafts] = useState(() => listDrafts(prefix));
  useEffect(() => {
    const update = () => setDrafts(listDrafts(prefix));
    update();
    window.addEventListener("nexville:drafts", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("nexville:drafts", update);
      window.removeEventListener("storage", update);
    };
  }, [prefix]);
  const active =
    NAV.find((n) =>
      n.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(n.to),
    ) || NAV[0];
  const profile = data.profiles.find((p) => p.id === session.user.id);
  const name =
    profile?.display_name ||
    session.user.email?.split("@")[0] ||
    "Teammitglied";
  const state =
    drafts.length && !["conflict", "error"].includes(queue?.state || "")
      ? "offline"
      : queue?.state || "idle";
  const labels = {
    idle: "Verbunden",
    saving: "Wird gespeichert …",
    saved: "Gespeichert",
    offline: "Nicht synchronisiert",
    error: "Speicherfehler",
    conflict: "Konflikt prüfen",
  };
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("nexville:theme", theme);
  }, [theme]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (queue?.state === "conflict") setConflict(true);
  }, [queue, revision]);
  const doLogout = async () => {
    if (queue?.items.length || drafts.length) {
      setLogout(true);
      return;
    }
    const { error } = await supabase!.auth.signOut();
    if (error) setActionError(errorMessage(error));
  };
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (drafts.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [drafts.length]);
  const nav = (
    <>
      <Brand />
      <div className="workspace-switch">
        <span className="workspace-icon">N</span>
        <div>
          <strong>{data.teams[0]?.name || "Nexville Roleplay"}</strong>
          <span>Dein Teamraum</span>
        </div>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Hauptnavigation">
        {NAV.slice(0, 6).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              cn("nav-item", isActive && "nav-active")
            }
          >
            <n.icon size={19} />
            <span>{n.label}</span>
            {n.to === "/mitglieder" && (
              <span className="nav-count">
                {data.team_members.filter((m) => m.status === "active").length}
              </span>
            )}
            {n.to === "/wuensche" &&
              data.team_wishes.some((w) => w.status === "open") && (
                <span className="nav-dot" />
              )}
          </NavLink>
        ))}
      </nav>
      <div className="nav-label nav-label-second">VERWALTUNG</div>
      <nav aria-label="Systemnavigation">
        {NAV.slice(6).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              cn("nav-item", isActive && "nav-active")
            }
          >
            <n.icon size={18} />
            <span>{n.label}</span>
            {n.to === "/backups" && <span className="nav-small">Pausiert</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <div className="flex-line">
            <Shield size={18} />
            <strong>Gemeinsam für Nexville</strong>
          </div>
          <p>Ein Ort für dein Team und alles, was es bewegt.</p>
          <button onClick={() => setHelp(true)}>
            Kurzhilfe öffnen <ArrowUpRight size={15} />
          </button>
        </div>
        <button
          className="profile-button"
          onClick={() => navigate("/einstellungen")}
        >
          <Avatar name={name} />
          <span>
            <strong>{name}</strong>
            <small>
              {permission
                ? ACCESS_LABELS[permission.access_role]
                : "Zugang prüfen"}
            </small>
          </span>
          <Settings size={17} />
        </button>
        <button className="sidebar-logout" onClick={() => void doLogout()}>
          <LogOut size={16} />
          Abmelden
        </button>
      </div>
    </>
  );
  const term = search.toLocaleLowerCase("de");
  const matches = [
    ...data.team_members
      .filter((m) => m.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map((m) => ({
        label: m.name,
        detail: "Teammitglied",
        to: `/mitglieder?mitglied=${m.id}`,
      })),
    ...data.meetings
      .filter((m) => m.title.toLowerCase().includes(term))
      .slice(0, 4)
      .map((m) => ({
        label: m.title,
        detail: "Besprechung",
        to: `/besprechungen?sitzung=${m.id}`,
      })),
    ...data.team_wishes
      .filter((w) => w.title.toLowerCase().includes(term))
      .slice(0, 4)
      .map((w) => ({
        label: w.title,
        detail: "Teamwunsch",
        to: `/wuensche?wunsch=${w.id}`,
      })),
    ...NAV.filter((n) => n.label.toLowerCase().includes(term)).map((n) => ({
      label: n.label,
      detail: "Seite",
      to: n.to,
    })),
  ];
  return (
    <div className="app-layout">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Zum Inhalt springen
      </a>
      <aside className="sidebar">{nav}</aside>
      {mobile && (
        <div className="mobile-overlay" onClick={() => setMobile(false)}>
          <aside
            className="sidebar sidebar-mobile"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              className="mobile-close"
              aria-label="Navigation schließen"
              onClick={() => setMobile(false)}
            >
              <X size={20} />
            </Button>
            {nav}
          </aside>
        </div>
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="flex-line">
            <button
              className="icon-button mobile-menu"
              aria-label="Navigation öffnen"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span className="topbar-server">
              Teamraum <span>/</span>
            </span>
            <strong>{active.label}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} />
              <span>Suchen …</span>
              <kbd>Strg K</kbd>
            </button>
            <span
              className={cn(
                "sync-status",
                ["error", "conflict", "offline"].includes(state) &&
                  "sync-warning",
              )}
              role="status"
            >
              {["offline", "error", "conflict"].includes(state) ? (
                <CloudOff size={15} />
              ) : (
                <CheckCheck size={15} />
              )}
              <button onClick={() => setConflict(true)}>{labels[state]}</button>
            </span>
            <div className="topbar-divider" />
            <button
              className="icon-button"
              title={
                theme === "dark"
                  ? "Light Mode aktivieren"
                  : "Dark Mode aktivieren"
              }
              aria-label={
                theme === "dark"
                  ? "Light Mode aktivieren"
                  : "Dark Mode aktivieren"
              }
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button"
              aria-label="Änderungsverlauf öffnen"
              onClick={() => navigate("/verlauf")}
            >
              <Bell size={19} />
            </button>
            <button
              className="icon-button logout-button"
              aria-label="Abmelden"
              onClick={() => void doLogout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          {(error || actionError) && (
            <div className="notice notice-error" role="alert">
              <CloudOff size={18} />
              <span>{actionError || error}</span>
              <Button
                variant="ghost"
                onClick={() =>
                  void refresh().catch((e) => setActionError(errorMessage(e)))
                }
              >
                Erneut laden
              </Button>
            </div>
          )}
          {queue?.items.length && state !== "saving" ? (
            <div className="notice notice-warning">
              <CloudOff size={18} />
              <span>
                {queue.items.length} Änderung(en) warten auf Synchronisierung.
              </span>
              <Button variant="ghost" onClick={() => setConflict(true)}>
                Prüfen
              </Button>
            </div>
          ) : null}
          {children}
          <footer className="page-footer">
            <span>
              NEXVILLE ROLEPLAY <i /> Gemeinsam gestalten wir die Stadt.
            </span>
            <span>
              <Shield size={12} /> Geschützter Teamraum
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Teamraum durchsuchen"
        description="Mitglieder, Besprechungen, Wünsche und Seiten finden."
      >
        <div className="search-field">
          <Search size={18} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Wonach suchst du?"
            aria-label="Globale Suche"
          />
        </div>
        <div className="search-results">
          {matches.length ? (
            matches.map((m, i) => (
              <button
                key={`${m.to}:${i}`}
                onClick={() => {
                  navigate(m.to);
                  setSearchOpen(false);
                }}
              >
                <span>
                  {m.label}
                  <small>{m.detail}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))
          ) : (
            <p>Keine passenden Ergebnisse.</p>
          )}
        </div>
      </Dialog>
      <Dialog
        open={conflict}
        onOpenChange={setConflict}
        title="Speicherung & Synchronisierung"
        description="Lokale Änderungen werden erst nach Serverbestätigung als gespeichert angezeigt."
      >
        <div className="form-stack">
          <Badge tone={state === "saved" ? "green" : "yellow"}>
            {labels[state]}
          </Badge>
          {queue?.error && (
            <div className="notice notice-error">
              {errorMessage({ message: queue.error })}
            </div>
          )}
          {queue?.items.length || drafts.length ? (
            <Button
              variant="secondary"
              onClick={() =>
                downloadBlob(
                  "nexville-ausstehende-aenderungen.json",
                  new Blob(
                    [
                      JSON.stringify(
                        { outbox: queue?.items || [], drafts },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  ),
                )
              }
            >
              Lokale Entwürfe exportieren
            </Button>
          ) : (
            <p>Keine ausstehenden Änderungen auf diesem Gerät.</p>
          )}
          {!!drafts.length && (
            <>
              <p>
                {drafts.length} Textentwurf/-entwürfe warten auf Übernahme in
                die Warteschlange.
              </p>
              {drafts.map(({ key, draft }) => (
                <Button
                  key={key}
                  variant="secondary"
                  onClick={() => {
                    navigate(draft.route);
                    setConflict(false);
                  }}
                >
                  {draft.label.split(" ").slice(0, -1).join(" ")} öffnen
                </Button>
              ))}
            </>
          )}
          {!!queue?.items.length && (
            <>
              <p>
                {queue.items.length} ausstehende Änderung(en). Bei einem
                Konflikt kannst du den lokalen Entwurf exportieren und
                anschließend die Serverfassung laden.
              </p>
              <pre className="json-preview">
                {JSON.stringify(queue.items[0].patch, null, 2)}
              </pre>
              <Button variant="secondary" onClick={() => void queue.flush()}>
                Synchronisierung erneut versuchen
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (
                    window.confirm(
                      "Lokale Änderungen an diesem Datensatz verwerfen und die Serverfassung übernehmen? Ein vorheriger Export wird empfohlen.",
                    )
                  ) {
                    await queue.discardFirst();
                    await refresh();
                  }
                }}
              >
                Serverfassung übernehmen
              </Button>
            </>
          )}
        </div>
      </Dialog>
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Dein Nexville-Teamraum"
        description="Die wichtigsten Funktionen im Überblick."
      >
        <div className="help-list">
          <p>
            <strong>Automatisch speichern</strong>
            <br />
            Textfelder speichern nach einer kurzen Eingabepause oder beim
            Verlassen des Felds. Der Status oben bestätigt die Speicherung.
          </p>
          <p>
            <strong>Historie erhalten</strong>
            <br />
            Mitglieder werden archiviert. Frühere Besprechungen und Verwarnungen
            bleiben nachvollziehbar.
          </p>
          <p>
            <strong>Schnell finden</strong>
            <br />
            Mit Strg + K öffnest du die globale Suche.
          </p>
          <p>
            <strong>Backups</strong>
            <br />
            Die Backup-Funktionen sind auf Wunsch vorerst zurückgestellt.
          </p>
        </div>
      </Dialog>
      <Dialog
        open={logout}
        onOpenChange={setLogout}
        title="Es gibt ausstehende Änderungen"
        description="Bitte vor dem Abmelden die Synchronisierung prüfen."
      >
        <p>
          Die Änderungen sind an dieses Konto und Gerät gebunden. Synchronisiere
          oder exportiere sie, bevor du dich abmeldest.
        </p>
        <div className="form-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setLogout(false);
              setConflict(true);
            }}
          >
            Änderungen prüfen
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await supabase!.auth.signOut();
            }}
          >
            Trotzdem abmelden
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
