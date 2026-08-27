-- XP and streak were updated with a read-modify-write from the client:
-- SELECT the current value, compute the next one in JS, then UPDATE. Two
-- concurrent updates (a double submit, or the app open in two tabs) both read
-- the same starting value and the second write clobbers the first, silently
-- losing progress.
--
-- Move both into SECURITY DEFINER functions that compute the new value inside
-- a single UPDATE. Postgres re-evaluates a SET expression against the freshly
-- committed row when two updates contend for it, so increments serialize
-- instead of overwriting each other.

-- Apply the result of one completed case: add XP, bump the case count, and
-- recompute level. Returns the updated profile row.
CREATE OR REPLACE FUNCTION public.apply_case_result(_xp_gain int)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  gain int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp: the caller supplies this, and a single case cannot legitimately be
  -- worth more than a few hundred XP.
  gain := LEAST(GREATEST(COALESCE(_xp_gain, 0), 0), 1000);

  RETURN QUERY
  UPDATE public.profiles p
  SET xp = p.xp + gain,
      total_cases_completed = p.total_cases_completed + 1,
      level = GREATEST(1, ((p.xp + gain) / 500) + 1)
  WHERE p.user_id = uid
  RETURNING p.*;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_result(int) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_case_result(int) TO authenticated;

-- Record daily activity and advance the streak. Idempotent within a day:
-- calling it twice keeps the same streak because last_active already matches
-- today. Returns the updated profile row.
CREATE OR REPLACE FUNCTION public.touch_daily_streak()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  UPDATE public.profiles p
  SET streak_days = CASE
        WHEN p.last_active = CURRENT_DATE THEN p.streak_days
        WHEN p.last_active = CURRENT_DATE - 1 THEN p.streak_days + 1
        ELSE 1
      END,
      last_active = CURRENT_DATE
  WHERE p.user_id = uid
  RETURNING p.*;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_daily_streak() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_daily_streak() TO authenticated;
