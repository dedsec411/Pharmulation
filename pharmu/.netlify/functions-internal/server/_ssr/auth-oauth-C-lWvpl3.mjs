import { s as supabase } from "./client-Bd0g9e26.mjs";
function getAuthCallbackUrl(next = "/dashboard") {
  if (typeof window === "undefined") return void 0;
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", next);
  return callback.toString();
}
async function signInWithGoogle(next = "/dashboard") {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(next),
      queryParams: {
        access_type: "offline",
        prompt: "select_account"
      }
    }
  });
}
export {
  signInWithGoogle as s
};
