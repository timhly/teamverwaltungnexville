const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (
  !url ||
  !key ||
  !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) ||
  key.includes("YOUR_")
) {
  console.error(
    "Produktionskonfiguration fehlt. VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY in den Repository-Variablen hinterlegen.",
  );
  process.exit(1);
}
if (key.startsWith("sb_secret_")) {
  console.error("Ein geheimer Supabase-Schlüssel darf niemals ins Frontend.");
  process.exit(1);
}
if (key.split(".").length === 3) {
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    );
    if (payload.role !== "anon") throw new Error();
  } catch {
    console.error(
      "Der öffentliche Publishable Key oder Legacy-Anon-Key ist erforderlich; kein Service-Role-Key.",
    );
    process.exit(1);
  }
}
console.log("Öffentliche Frontend-Konfiguration geprüft.");
