import { createClient } from "@supabase/supabase-js";

const authHash = new URLSearchParams(
  location.hash.startsWith("#/") ? "" : location.hash.slice(1),
);
export const oauthCallbackError = authHash.has("error")
  ? "Die Discord-Anmeldung wurde abgebrochen oder konnte nicht abgeschlossen werden. Bitte erneut versuchen."
  : "";
if (oauthCallbackError)
  history.replaceState(null, "", location.pathname + location.search + "#/");

if (/(?:type=invite|type=recovery)/.test(location.hash))
  sessionStorage.setItem("nexville:set-password", "true");

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const configured =
  !!url &&
  !!key &&
  !url.includes("YOUR_PROJECT") &&
  !key.includes("YOUR_PUBLIC");
export const supabase = configured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
