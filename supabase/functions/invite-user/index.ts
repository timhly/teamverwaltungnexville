import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers, status });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")
    return respond({ error: "Methode nicht erlaubt." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const redirect = Deno.env.get("SITE_URL");
    if (!redirect || !redirect.startsWith("https://"))
      return respond(
        { error: "SITE_URL muss als HTTPS-Adresse konfiguriert sein." },
        503,
      );
    const authorization = req.headers.get("Authorization");
    if (!authorization)
      return respond({ error: "Anmeldung erforderlich." }, 401);
    const client = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user) return respond({ error: "Sitzung ungültig." }, 401);
    const body = await req.json();
    const { team_id, email, display_name, access_role } = body;
    if (
      typeof team_id !== "string" ||
      !/^[a-f\d-]{36}$/i.test(team_id) ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof display_name !== "string" ||
      display_name.trim().length < 1 ||
      display_name.length > 100 ||
      !["admin", "editor", "viewer"].includes(access_role)
    )
      return respond({ error: "Ungültige Eingaben." }, 400);
    const { data: access, error: accessError } = await client.rpc("my_access", {
      t: team_id,
    });
    if (accessError || access !== "admin")
      return respond({ error: "Administratorrechte erforderlich." }, 403);
    const server = createClient(url, secret, {
      auth: { persistSession: false },
    });
    const { data: invited, error: inviteError } =
      await server.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
        redirectTo: redirect,
        data: { display_name: display_name.trim() },
      });
    if (inviteError || !invited.user)
      return respond(
        {
          error:
            "Einladung konnte nicht versendet werden. Möglicherweise existiert das Konto bereits oder das Versandlimit wurde erreicht.",
        },
        400,
      );
    const { error: grantError } = await server.rpc("grant_invited_access", {
      p_team: team_id,
      p_user: invited.user.id,
      p_email: email.trim(),
      p_name: display_name.trim(),
      p_role: access_role,
      p_actor: user.id,
    });
    if (grantError)
      return respond(
        {
          error:
            "Die E-Mail wurde gesendet, aber der Zugriff konnte nicht eingerichtet werden. Bitte den Administrator die Berechtigung im SQL-Editor nachtragen lassen.",
        },
        500,
      );
    return respond({ ok: true });
  } catch {
    return respond(
      { error: "Die Einladung konnte nicht verarbeitet werden." },
      500,
    );
  }
});
