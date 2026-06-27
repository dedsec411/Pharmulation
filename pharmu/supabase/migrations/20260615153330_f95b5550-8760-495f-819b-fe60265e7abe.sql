-- 1) Remove sensitive tables from Realtime publication to prevent broadcast leaks
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.scores;

-- 2) Lock down leaderboard: clients cannot self-write. Service role / definer functions only.
DROP POLICY IF EXISTS lb_insert_own ON public.leaderboard;
DROP POLICY IF EXISTS lb_update_own ON public.leaderboard;
REVOKE INSERT, UPDATE, DELETE ON public.leaderboard FROM authenticated, anon;

-- 3) Lock down user_badges direct INSERT, expose via SECURITY DEFINER RPC that validates criteria
DROP POLICY IF EXISTS ub_insert_own ON public.user_badges;
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.award_badge_if_earned(_badge_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  _badge_id uuid;
  _total int;
  _has_high_score boolean;
  _earned boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;

  SELECT id INTO _badge_id FROM public.badges WHERE name = _badge_name LIMIT 1;
  IF _badge_id IS NULL THEN RETURN false; END IF;

  -- Skip if already owned
  IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = uid AND badge_id = _badge_id) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(total_cases_completed, 0) INTO _total FROM public.profiles WHERE user_id = uid;

  -- Validate against server state
  IF _badge_name = 'First Case' AND _total >= 1 THEN _earned := true;
  ELSIF _badge_name = 'Apprentice' AND _total >= 10 THEN _earned := true;
  ELSIF _badge_name = 'Pharmacist' AND _total >= 25 THEN _earned := true;
  ELSIF _badge_name = 'High Roller' THEN
    SELECT EXISTS (SELECT 1 FROM public.scores WHERE user_id = uid AND score >= 200) INTO _has_high_score;
    _earned := _has_high_score;
  ELSE
    -- Unknown / counter-style badges: do not auto-award server-side
    _earned := false;
  END IF;

  IF _earned THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (uid, _badge_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.award_badge_if_earned(text) FROM public;
GRANT EXECUTE ON FUNCTION public.award_badge_if_earned(text) TO authenticated;