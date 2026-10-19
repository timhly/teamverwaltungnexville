import { useState } from "react";
import {
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { configured } from "../lib/supabase";
import { Button } from "../components/ui";
import { errorMessage } from "../lib/utils";
import { connectDiscord } from "../lib/discord";

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
export function Auth({ initialError = "" }: { initialError?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
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
                      Mit Discord anmelden und das Team mit{" "}
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
              <h2>Schön, dass du da bist.</h2>
              <p className="auth-intro">
                Melde dich mit Discord an, um deinen Teamraum zu öffnen.
              </p>
              {error && (
                <div className="notice notice-error" role="alert">
                  {error}
                </div>
              )}
              <Button
                className="discord-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await connectDiscord();
                  } catch (e) {
                    setError(errorMessage(e));
                    setBusy(false);
                  }
                }}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <MessageCircle size={19} />
                )}
                {busy ? "Weiter zu Discord …" : "Mit Discord anmelden"}
              </Button>
              <div className="auth-bottom">
                <ShieldCheck size={15} /> Teamzugriff für freigegebene Konten.
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
