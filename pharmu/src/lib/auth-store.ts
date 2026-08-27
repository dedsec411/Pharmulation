import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Derived from the generated schema rather than hand-written, so it cannot
 * drift from the database. The previous hand-maintained version had already
 * fallen behind: it listed only student/graduate/pharmd, missing the `admin`
 * role added later, which is why callers had to cast `role` to compare it.
 */
export type Profile = Tables<"profiles">;

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (l: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, session: null, profile: null, loading: false }),
}));
