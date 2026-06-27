import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, type Profile } from "./auth-store";

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

async function bumpStreak(profile: Profile) {
  const today = new Date().toISOString().slice(0, 10);
  if (profile.last_active === today) return profile;
  const last = profile.last_active ? new Date(profile.last_active) : null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const newStreak =
    last && profile.last_active === yStr ? profile.streak_days + 1 : 1;
  const { data } = await supabase
    .from("profiles")
    .update({ streak_days: newStreak, last_active: today })
    .eq("user_id", profile.user_id)
    .select("*")
    .maybeSingle();
  return (data as Profile | null) ?? profile;
}

export function useInitAuth() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(async () => {
          const p = await loadProfile(session.user.id);
          if (!mounted) return;
          if (p) {
            const bumped = await bumpStreak(p);
            if (mounted) setProfile(bumped);
          } else {
            setProfile(null);
          }
        }, 0);
      } else {
        setProfile(null);
      }
      if (event === "INITIAL_SESSION") setLoading(false);
    });

    // Then current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const p = await loadProfile(session.user.id);
        if (!mounted) return;
        if (p) {
          const bumped = await bumpStreak(p);
          if (mounted) setProfile(bumped);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);
}
