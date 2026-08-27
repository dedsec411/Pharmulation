import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Call an RPC the generated Supabase types don't know about yet.
 *
 * `src/integrations/supabase/types.ts` is generated and currently predates
 * `apply_case_result` / `touch_daily_streak`. Regenerating it with
 * `supabase gen types typescript` lets these go through `supabase.rpc`
 * directly and this cast can be deleted. Keeping the cast in one place means
 * the call sites below stay fully typed.
 */
function callRpc<T>(fn: string, args?: Record<string, unknown>) {
  type RpcFn = (
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: PostgrestError | null }>;

  // `.call(supabase, ...)` matters: `supabase` is a lazily-constructed Proxy,
  // and pulling `rpc` off it into a bare variable drops the `this` binding
  // supabase-js needs, so the call throws instead of returning a result.
  return (supabase.rpc as unknown as RpcFn).call(supabase, fn, args);
}

/**
 * Atomically add XP, increment the completed-case count, and recompute level
 * for the current user. Returns the updated profile.
 */
export function applyCaseResult(xpGain: number) {
  return callRpc<ProfileRow[]>("apply_case_result", { _xp_gain: xpGain });
}

/**
 * Atomically record today's activity and advance the streak for the current
 * user. Idempotent within a day. Returns the updated profile.
 */
export function touchDailyStreak() {
  return callRpc<ProfileRow[]>("touch_daily_streak");
}
