import { supabase } from "@/integrations/supabase/client";

export function getAuthCallbackUrl(next = "/dashboard") {
  if (typeof window === "undefined") return undefined;
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", next);
  return callback.toString();
}

export async function signInWithGoogle(next = "/dashboard") {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(next),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
}
