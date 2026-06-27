import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: "student" | "graduate" | "pharmd";
  avatar_url: string | null;
  level: number;
  xp: number;
  total_cases_completed: number;
  accuracy_rate: number;
  avg_time_per_case: number;
  streak_days: number;
  last_active: string | null;
  cpd_hours_earned: number;
  onboarding_completed: boolean;
};

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
