
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_scores;

-- Public top profiles (no email, no sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_profiles(limit_count int DEFAULT 50)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text, role public.user_role,
  xp int, level int, streak_days int, accuracy_rate numeric, total_cases_completed int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id, full_name, avatar_url, role, xp, level,
         streak_days, accuracy_rate, total_cases_completed
  FROM public.profiles
  ORDER BY xp DESC
  LIMIT GREATEST(1, LEAST(limit_count, 200));
$$;

-- Public scores for leaderboard (no errors_made, no time_taken)
CREATE OR REPLACE FUNCTION public.get_public_scores(
  mode_in public.case_mode,
  since timestamptz DEFAULT '1970-01-01'::timestamptz
)
RETURNS TABLE (user_id uuid, score int, accuracy numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id, score, accuracy
  FROM public.scores
  WHERE mode = mode_in AND completed_at >= since;
$$;

-- Profiles for a given set of users (safe columns only, used after aggregation)
CREATE OR REPLACE FUNCTION public.get_profiles_safe(ids uuid[])
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text, role public.user_role,
  xp int, level int, streak_days int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id, full_name, avatar_url, role, xp, level, streak_days
  FROM public.profiles
  WHERE user_id = ANY(ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_scores(public.case_mode, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles_safe(uuid[]) TO anon, authenticated;
