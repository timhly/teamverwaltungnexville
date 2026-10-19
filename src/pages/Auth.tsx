import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { configured, supabase } from "../lib/supabase";
import { Button, Field } from "../components/ui";
import { errorMessage } from "../lib/utils";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">N</span>
      <div>
        <strong>NEXVILLE</strong>
        <span>ROLEPLAY · TEAMVERWALTUNG</span>
      </div>
    </div>
  );
}
export function Auth({
  setPassword = false,
  onPasswordSet,
}: {
  setPassword?: boolean;
  onPasswordSet?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");
      if (setPassword) {
        if (password !== form.get("confirm"))
          throw new Error("Die Passwörter stimmen nicht überein.");
        const { error } = await supabase!.auth.updateUser({ password });
        if (error) throw error;
        sessionStorage.removeItem("nexville:set-password");
        onPasswordSet?.();
      } else if (reset) {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + import.meta.env.BASE_URL,
        });
        if (error) throw error;
        setMessage(
          "Falls ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen.",
        );
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          throw new Error(
            "Anmeldung fehlgeschlagen. Bitte E-Mail, Passwort und die Kontofreigabe prüfen.",
          );
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <Brand />
        <div className="auth-art">
          <img
            src={`${import.meta.env.BASE_URL}brand/nexville-banner.gif`}
            alt="Nexville Roleplay Logo mit türkisem und limettengrünem Neonlicht"
          />
          <div className="auth-art-caption">
            <span className="eyebrow">ZUSAMMEN FÜR NEXVILLE</span>
            <h1>
              Ein starkes Team.
              <br />
              <span>Eine gemeinsame Stadt.</span>
            </h1>
            <p>
              Mitglieder, Aufgaben und Entscheidungen.
              <br />
              Alles an einem Ort.
            </p>
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={16} /> Dein Teamraum. Nur für berechtigte
          Mitglieder.
        </div>
      </div>
      <main className="auth-main">
        <div className="auth-panel">
          {!configured ? (
            <>
              <span className="section-icon">
                <KeyRound size={25} />
              </span>
              <span className="eyebrow">DEIN TEAMRAUM WARTET</span>
              <h2>Willkommen in Nexville.</h2>
              <p className="auth-intro">
                Die Anwendung ist vorbereitet. Verbinde jetzt dein
                Supabase-Projekt, um mit echten Teamdaten zu arbeiten.
              </p>
              <ol className="setup-list">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Supabase einrichten</strong>
                    <p>
                      Projekt erstellen und die SQL-Migrationen aus dem
                      Projektordner ausführen.
                    </p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Administrator anlegen</strong>
                    <p>
                      Konto per Einladung erstellen und das Team mit{" "}
                      <code>provision_team</code> initialisieren.
                    </p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Verbindung hinterlegen</strong>
                    <p>
                      Die öffentliche Projekt-URL und den Publishable Key in{" "}
                      <code>.env</code> eintragen.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="notice">
                <ShieldCheck size={19} />
                <span>
                  Die vollständige Schritt-für-Schritt-Anleitung liegt in der{" "}
                  <strong>README.md</strong> im Projektordner.
                </span>
              </div>
              <div className="auth-bottom">
                <Users size={15} /> Nexville Roleplay · Geschützter
                Verwaltungsbereich
              </div>
            </>
          ) : (
            <>
              <span className="section-icon">
                <LockKeyhole size={25} />
              </span>
              <span className="eyebrow">NEXVILLE INTERN</span>
              <h2>
                {setPassword
                  ? "Dein Zugang zu Nexville."
                  : reset
                    ? "Passwort vergessen?"
                    : "Schön, dass du da bist."}
              </h2>
              <p className="auth-intro">
                {setPassword
                  ? "Lege dein persönliches Passwort fest."
                  : reset
                    ? "Wir senden dir einen sicheren Link per E-Mail."
                    : "Melde dich an, um deinen Teamraum zu öffnen."}
              </p>
              <form className="form-stack" onSubmit={submit}>
                {!setPassword && (
                  <Field label="E-Mail-Adresse">
                    <input
                      name="email"
                      type="email"
                      placeholder="du@beispiel.de"
                      autoComplete="username"
                      required
                    />
                  </Field>
                )}
                {(!reset || setPassword) && (
                  <Field label={setPassword ? "Neues Passwort" : "Passwort"}>
                    <input
                      name="password"
                      type="password"
                      minLength={setPassword ? 12 : 1}
                      placeholder={
                        setPassword ? "Mindestens 12 Zeichen" : "Dein Passwort"
                      }
                      autoComplete={
                        setPassword ? "new-password" : "current-password"
                      }
                      required
                    />
                  </Field>
                )}
                {setPassword && (
                  <Field label="Passwort wiederholen">
                    <input
                      name="confirm"
                      type="password"
                      minLength={12}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                )}
                {error && (
                  <div className="notice notice-error" role="alert">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="notice notice-success" role="status">
                    <Check size={18} />
                    {message}
                  </div>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  {setPassword
                    ? "Passwort festlegen"
                    : reset
                      ? "Link anfordern"
                      : "Anmelden"}
                </Button>
                {!setPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setReset((v) => !v);
                      setMessage("");
                      setError("");
                    }}
                  >
                    {reset ? "Zurück zur Anmeldung" : "Passwort vergessen?"}
                    <ChevronRight size={15} />
                  </Button>
                )}
              </form>
              <div className="auth-bottom">
                <ShieldCheck size={15} /> Zugang nur mit persönlicher Einladung.
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
