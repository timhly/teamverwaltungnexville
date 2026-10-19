import { lazy, Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Route, Routes } from "react-router-dom";
import { oauthCallbackError, supabase } from "./lib/supabase";
import { StoreProvider, useStore } from "./lib/store";
import { Auth } from "./pages/Auth";
import { Shell } from "./components/Shell";
import { Empty, Loading } from "./components/ui";
import { AccessPending } from "./pages/AccessPending";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Roles = lazy(() => import("./pages/Roles"));
const Meetings = lazy(() => import("./pages/Meetings"));
const Warnings = lazy(() => import("./pages/Warnings"));
const Wishes = lazy(() => import("./pages/Wishes"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));

function Workspace() {
  const { loading, teamId } = useStore();
  if (!loading && !teamId) return <AccessPending />;
  return (
    <Shell>
      {loading ? (
        <Loading />
      ) : !teamId ? (
        <Empty title="Dein Konto benötigt eine Teamfreigabe">
          Bitte den Administrator bitten, deinem Konto Zugriff zuzuweisen.
        </Empty>
      ) : (
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mitglieder" element={<Members />} />
            <Route path="/rollen" element={<Roles />} />
            <Route path="/besprechungen" element={<Meetings />} />
            <Route path="/verwarnungen" element={<Warnings />} />
            <Route path="/wuensche" element={<Wishes />} />
            <Route path="/verlauf" element={<History />} />
            <Route path="/einstellungen" element={<Settings />} />
            <Route
              path="/backups"
              element={
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">VERWALTUNG</span>
                      <h1>Backups</h1>
                      <p>Ist noch in Planung - Backups kommen bald wenn ich Lust und Zeit dafür habe lg Smok</p>
                    </div>
                  </div>
                  <Empty title="Backup-System noch nicht eingerichtet">
                    Es werden derzeit keine automatischen oder externen
                    Anwendungssicherungen erstellt. Die Einrichtung ist für eine
                    spätere Erweiterung vorgesehen.
                  </Empty>
                </>
              }
            />
            <Route
              path="*"
              element={
                <Empty title="Diese Seite gibt es nicht">
                  Nutze die Navigation, um zu deinem Teamraum zurückzukehren.
                </Empty>
              }
            />
          </Routes>
        </Suspense>
      )}
    </Shell>
  );
}
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [authError, setAuthError] = useState(oauthCallbackError);
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
        if (error) setAuthError(error.message);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      if (!mounted) return;
      setSession(current);
      setLoading(false);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (loading) return <Loading>Dein Teamraum wird geöffnet …</Loading>;
  if (authError && !session) return <Auth initialError={authError} />;
  if (!session) return <Auth />;
  return (
    <StoreProvider key={session.user.id} session={session}>
      <Workspace />
    </StoreProvider>
  );
}
