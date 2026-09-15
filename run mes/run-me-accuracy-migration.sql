-- profiles.accuracy_rate and profiles.avg_time_per_case are shown on the
-- profile page and the leaderboard, but nothing ever wrote them: every user
-- read 0% accuracy and 0s average time regardless of how they played.
--
-- Fold both into apply_case_result, which already updates xp, level and the
-- case count in a single atomic UPDATE when a case is completed.
--
-- The new arguments default to NULL so an older client that still calls
-- apply_case_result(_xp_gain) keeps working and simply leaves the two averages
-- untouched, rather than erroring during a rollout.
CREATE OR REPLACE FUNCTION public.apply_case_result(
  _xp_gain int,
  _accuracy numeric DEFAULT NULL,   -- this case, 0..1
  _time_taken int DEFAULT NULL      -- this case, seconds
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  gain int;
  acc numeric;
  secs numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp: the caller supplies these, and a single case cannot legitimately be
  -- worth more than a few hundred XP, be more than 100% accurate, or take
  -- longer than any mode's timer allows.
  gain := LEAST(GREATEST(COALESCE(_xp_gain, 0), 0), 1000);
  acc  := LEAST(GREATEST(COALESCE(_accuracy, 0), 0), 1) * 100;
  secs := LEAST(GREATEST(COALESCE(_time_taken, 0), 0), 3600);

  RETURN QUERY
  UPDATE public.profiles p
  SET xp = p.xp + gain,
      total_cases_completed = p.total_cases_completed + 1,
      level = GREATEST(1, ((p.xp + gain) / 500) + 1),
      -- Running averages. Inside the SET, p.total_cases_completed is still the
      -- pre-update count, which is exactly the divisor a running mean needs.
      accuracy_rate = CASE
        WHEN _accuracy IS NULL THEN p.accuracy_rate
        ELSE ROUND(
          ((p.accuracy_rate * p.total_cases_completed) + acc)
          / (p.total_cases_completed + 1), 2)
      END,
      avg_time_per_case = CASE
        WHEN _time_taken IS NULL THEN p.avg_time_per_case
        ELSE ROUND(
          ((p.avg_time_per_case * p.total_cases_completed) + secs)
          / (p.total_cases_completed + 1), 2)
      END
  WHERE p.user_id = uid
  RETURNING p.*;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_result(int, numeric, int) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_case_result(int, numeric, int) TO authenticated;

-- Backfill from the scores already recorded, so existing players do not have to
-- replay their history to get a meaningful figure.
UPDATE public.profiles p
SET accuracy_rate = COALESCE(s.avg_accuracy, 0),
    avg_time_per_case = COALESCE(s.avg_time, 0)
FROM (
  SELECT user_id,
         ROUND(AVG(accuracy) * 100, 2) AS avg_accuracy,
         ROUND(AVG(time_taken), 2)     AS avg_time
  FROM public.scores
  GROUP BY user_id
) s
WHERE s.user_id = p.user_id;
