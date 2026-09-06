import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, type Profile } from "./auth-store";
import { touchDailyStreak } from "./supabase-rpc";

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  // A null result is legitimate for a brand-new user whose profile row has not
  // been created yet, so only an actual error is worth reporting. Logged rather
  // than toasted: this runs on every page load during auth bootstrap.
  if (error) console.error("[supabase] failed to load profile:", error);
  return (data as Profile | null) ?? null;
}

async function bumpStreak(profile: Profile) {
  const today = new Date().toISOString().slice(0, 10);
  // Already counted today; skip the round trip. The RPC is idempotent anyway.
  if (profile.last_active === today) return profile;

  // The streak is computed inside a single atomic UPDATE server-side. Doing
  // the read-then-write here meant two tabs loading at once could both see
  // yesterday's date and double-count the day.
  const { data, error } = await touchDailyStreak();
  // Falls back to the un-bumped profile, so this degrades rather than breaking.
  if (error) console.error("[supabase] failed to update streak:", error);
  return (data?.[0] as Profile | undefined) ?? profile;
}

/**
 * Bring the client up to date with who is signed in. Once.
 *
 * This used to run the whole bootstrap twice on every single page load. Two
 * paths did the same work: onAuthStateChange fires INITIAL_SESSION the moment
 * you subscribe, and getSession() was called straight afterwards - so the
 * profile was fetched twice and the streak RPC was sent twice, every time,
 * before anything could render. TOKEN_REFRESHED then did it again on a timer,
 * and SIGNED_IN fires on tab focus in some browsers, so a long session kept
 * re-running it.
 *
 * Now both paths funnel into one adopt(), which no-ops when the session
 * belongs to the person already loaded. Whichever arrives first does the work;
 * the other returns immediately.
 */
export function useInitAuth() {
  // Selectors rather than destructuring the store: taking the whole store
  // subscribes this to every change, so setting the profile re-rendered the
  // component that had just set it.
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let mounted = true;
    /** Who the loaded profile belongs to, so the same person is not re-fetched. */
    let loadedFor: string | null = null;

    async function adopt(session: Session | null) {
      if (!mounted) return;
      setSession(session);

      const userId = session?.user?.id ?? null;
      if (!userId) {
        loadedFor = null;
        setProfile(null);
        return;
      }
      // A refreshed token is the same person: nothing to re-read.
      if (userId === loadedFor) return;
      loadedFor = userId;

      const profile = await loadProfile(userId);
      if (!mounted) return;
      if (!profile) {
        setProfile(null);
        return;
      }
      const bumped = await bumpStreak(profile);
      if (mounted) setProfile(bumped);
    }

    // Deliberately not an async callback. supabase-js serialises these, and
    // awaiting a supabase call inside one deadlocks the next auth request -
    // which is what the old setTimeout(0) was working around.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void adopt(session);
    });

    // getSession resolves whether or not INITIAL_SESSION arrives, so loading
    // always ends. If the listener got there first, adopt() no-ops.
    void supabase.auth.getSession().then(async ({ data }) => {
      await adopt(data.session);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);
}
