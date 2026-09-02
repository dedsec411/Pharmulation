import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normaliseJoinCode } from "./codes";

/**
 * The student half of classes: redeeming a code, and reading what was assigned.
 *
 * Enrolment goes through the `join_class_by_code` RPC rather than an insert,
 * because turning a code into a class id is the only thing a student may do
 * with the classes table - being able to select from it would let anyone
 * enumerate every class in the product.
 */

const db = () => supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Where a code typed at sign-up waits.
 *
 * Sign-up does not always end with a session: if the project requires email
 * confirmation, the account exists but nobody is signed in, and the RPC needs
 * `auth.uid()`. Rather than lose the code or block the account on it, it is
 * kept here and redeemed the first time the student reaches the dashboard
 * signed in.
 */
const PENDING_KEY = "pharmulation.pendingJoinCode";

export function stashJoinCode(code: string) {
  try {
    localStorage.setItem(PENDING_KEY, normaliseJoinCode(code));
  } catch {
    // A browser refusing storage is not a reason to fail the sign-up.
  }
}

function takeStashedCode(): string | null {
  try {
    const code = localStorage.getItem(PENDING_KEY);
    if (code) localStorage.removeItem(PENDING_KEY);
    return code;
  } catch {
    return null;
  }
}

export type JoinResult =
  | { ok: true; className: string }
  | { ok: false; reason: "unknown-code" | "failed" };

/** Redeem a code now. Returns which class was joined, for the confirmation. */
export async function redeemJoinCode(rawCode: string): Promise<JoinResult> {
  const code = normaliseJoinCode(rawCode);
  const { data, error } = await db().rpc("join_class_by_code", { code });

  if (error) {
    console.error("Join class failed", error);
    return { ok: false, reason: "failed" };
  }
  // The function returns NULL for a code that matches no live class, rather
  // than raising - a wrong code is a typo, not an error condition.
  if (!data) return { ok: false, reason: "unknown-code" };

  const { data: cls } = await db().from("classes")
    .select("name").eq("id", data).maybeSingle();

  return { ok: true, className: (cls?.name as string) ?? "your class" };
}

/**
 * Redeem whatever sign-up left behind, once, after the session exists.
 *
 * Mounted on the student dashboard. Does nothing at all for the overwhelming
 * majority of users, who never typed a code.
 */
export function useRedeemPendingJoinCode(userId?: string) {
  const queryClient = useQueryClient();
  const done = useRef(false);

  useEffect(() => {
    if (!userId || done.current) return;
    const code = takeStashedCode();
    if (!code) return;
    done.current = true;

    redeemJoinCode(code).then((result) => {
      if (result.ok) {
        toast.success(`You joined ${result.className}`);
        queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
        queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      } else if (result.reason === "unknown-code") {
        toast.error("That join code did not match a class", {
          description: "Ask your lecturer for the current code - it may have been changed.",
        });
      }
    });
  }, [userId, queryClient]);
}

export type MyClass = { id: string; name: string };

/** The classes this student is in. Empty for everyone not using the platform. */
export function useMyEnrollments(userId?: string) {
  return useQuery<MyClass[]>({
    queryKey: ["my-enrollments", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyClass[]> => {
      const { data, error } = await db().from("class_enrollments")
        .select("class_id, classes(id, name, archived)")
        .eq("student_id", userId!);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.classes)
        .filter((c: any) => c && !c.archived)
        .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
    },
  });
}

export type MyAssignment = {
  id: string;
  class_id: string;
  mode: string | null;
  title: string | null;
  due_at: string | null;
  created_at: string;
};

/**
 * Work set to this student's classes.
 *
 * Everything already completed since it was posted is filtered out by the
 * caller, not here - the dashboard needs the full list to say how much of it
 * is left.
 */
export function useMyAssignments(classIds: string[]) {
  const key = classIds.slice().sort().join(",");
  return useQuery<MyAssignment[]>({
    queryKey: ["my-assignments", key],
    enabled: classIds.length > 0,
    queryFn: async (): Promise<MyAssignment[]> => {
      const { data, error } = await db().from("class_assignments")
        .select("id, class_id, mode, title, due_at, created_at")
        .in("class_id", classIds)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as MyAssignment[];
    },
  });
}
