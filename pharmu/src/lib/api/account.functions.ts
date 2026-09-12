import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountActionResult = { ok: true } | { ok: false; message: string };

/**
 * Delete the caller's own account.
 *
 * Deleting the `auth.users` row is the part that matters: every user-owned
 * table (profiles, scores, user_badges, cpd_certificates, drug_bookmarks,
 * leaderboard, user_seen_cases) references it `ON DELETE CASCADE`, so the row
 * going away takes all of it with it.
 *
 * Previously this deleted only the `profiles` row from the browser, which left
 * the auth user intact. Since `handle_new_user` only fires on INSERT to
 * auth.users, signing back in produced an account with no profile row at all
 * rather than a fresh one.
 *
 * Takes no user id on purpose: it always acts on the verified caller, so it
 * cannot be pointed at anyone else's account.
 */
/**
 * Is this the shared demo account?
 *
 * Resolved from the auth record rather than a hardcoded id: the id changes
 * whenever the account is recreated, and the one thing that must not depend on
 * remembering to update a constant is the guard that stops it being deleted.
 */
async function isSharedDemoAccount(userId: string): Promise<boolean> {
  const guestEmail = process.env.GUEST_EMAIL?.trim().toLowerCase();
  if (!guestEmail) return false;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return false;
  return data.user.email.trim().toLowerCase() === guestEmail;
}

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountActionResult> => {
    try {
      // The demo account is shared. It is an ordinary account in every other
      // respect, which means a visitor at a stand who opened Settings could -
      // and did - permanently delete the account every other visitor uses,
      // taking the "Try it as a guest" button down with it. Checked by email
      // rather than id because recreating the account assigns a new id.
      if (await isSharedDemoAccount(context.userId)) {
        return {
          ok: false,
          message: "This is the shared demo account, so it cannot be deleted. Sign up for your own to keep your progress.",
        };
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      if (error) {
        console.error("Account deletion failed", error);
        return { ok: false, message: "Could not delete your account. Please try again." };
      }
      return { ok: true };
    } catch (error) {
      console.error("Account deletion threw", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        return {
          ok: false,
          message: "Account deletion needs SUPABASE_SERVICE_ROLE_KEY set on the server.",
        };
      }
      return { ok: false, message: "Could not delete your account. Please try again." };
    }
  });
