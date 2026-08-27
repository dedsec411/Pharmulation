import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin writes run here rather than from the browser: RLS intentionally denies
// the client any UPDATE on other users' profiles and any DELETE on cases, so
// these actions use the service-role client and re-check admin status server-side.

export type AdminActionResult = { ok: true } | { ok: false; message: string };

/**
 * Confirm the caller is an admin. Uses the service-role client so the check
 * itself is never filtered by the caller's own RLS policies.
 * Returns an error message when the caller must be rejected, otherwise null.
 */
async function adminCheckFailure(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Admin permission check failed", error);
    return "Could not verify your admin permissions.";
  }
  if (data?.role !== "admin") {
    return "You do not have admin permissions.";
  }
  return null;
}

function serviceRoleFailure(error: unknown): AdminActionResult {
  console.error("Admin action failed", error);
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return {
      ok: false,
      message: "Admin actions need SUPABASE_SERVICE_ROLE_KEY set on the server.",
    };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

export const promoteUserToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<AdminActionResult> => {
    try {
      const denied = await adminCheckFailure(context.userId);
      if (denied) return { ok: false, message: denied };

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: "admin" })
        .eq("user_id", data.userId);

      if (error) {
        console.error("Promote user failed", error);
        return { ok: false, message: "Could not promote this user." };
      }
      return { ok: true };
    } catch (error) {
      return serviceRoleFailure(error);
    }
  });

export const deleteCaseById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ caseId: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<AdminActionResult> => {
    try {
      const denied = await adminCheckFailure(context.userId);
      if (denied) return { ok: false, message: denied };

      const { error } = await supabaseAdmin
        .from("cases")
        .delete()
        .eq("id", data.caseId);

      if (error) {
        console.error("Delete case failed", error);
        return { ok: false, message: "Could not delete this case." };
      }
      return { ok: true };
    } catch (error) {
      return serviceRoleFailure(error);
    }
  });
