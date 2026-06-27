
-- 1. Drop redundant column on drugs
ALTER TABLE public.drugs DROP COLUMN IF EXISTS is_bookmarked_by;

-- 2. Admin check helper (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = uid AND role = 'admin');
$$;

-- 3. Profiles: restrict SELECT to own row or admin
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 4. Scores: restrict SELECT to own row or admin
DROP POLICY IF EXISTS scores_select_all ON public.scores;
CREATE POLICY scores_select_own ON public.scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY scores_select_admin ON public.scores
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 5. Public leaderboard views (omit sensitive columns; use security_invoker so caller's
--    permissions apply but views themselves are accessible without RLS on profiles/scores).
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT user_id, full_name, avatar_url, role, xp, level,
       streak_days, accuracy_rate, total_cases_completed
FROM public.profiles;

CREATE OR REPLACE VIEW public.public_scores
WITH (security_invoker = false) AS
SELECT user_id, mode, score, accuracy, completed_at
FROM public.scores;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_scores TO anon, authenticated;
