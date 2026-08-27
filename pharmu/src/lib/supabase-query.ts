import type { PostgrestError } from "@supabase/supabase-js";

type SupabaseResult<T> = { data: T | null; error: PostgrestError | null };

/**
 * Unwrap a Supabase result, throwing when the query failed.
 *
 * Without this, the common `const { data } = await supabase...; return data ?? []`
 * pattern turns a real failure (network drop, RLS denial, schema drift) into an
 * empty list, so the UI renders "no data" instead of reporting the problem.
 * Throwing lets React Query surface an error state, which the global query cache
 * handler in `router.tsx` turns into a toast.
 *
 * `context` names the thing being loaded and is shown to the user, e.g.
 * `unwrap(result, "your profile")` -> "Could not load your profile."
 */
export function unwrap<T>(result: SupabaseResult<T>, context: string): T | null {
  if (result.error) {
    console.error(`[supabase] failed to load ${context}:`, result.error);
    throw new Error(`Could not load ${context}.`);
  }
  return result.data;
}

/** Same as `unwrap`, for list queries that should default to an empty array. */
export function unwrapList<T>(result: SupabaseResult<T[]>, context: string): T[] {
  return unwrap(result, context) ?? [];
}
