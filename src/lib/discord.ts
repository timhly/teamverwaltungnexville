import { supabase } from "./supabase";

export async function connectDiscord(link = false) {
  const options = { redirectTo: location.origin + import.meta.env.BASE_URL };
  const result = link
    ? await supabase!.auth.linkIdentity({ provider: "discord", options })
    : await supabase!.auth.signInWithOAuth({ provider: "discord", options });
  if (result.error) throw result.error;
}
