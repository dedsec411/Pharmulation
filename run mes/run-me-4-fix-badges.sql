-- Badges were effectively unobtainable, for three separate reasons.
--
-- 1. award_badge_if_earned only knew four names. Industry and warehousing call
--    it for "Master Manufacturer", "Batch Perfectionist", "Cold Chain Guardian"
--    and "FEFO Expert", all of which fell through to `_earned := false`.
-- 2. The client only asked for a badge on an exact milestone (newTotal = 10),
--    so anyone already past 10 cases could never be granted it. Fixed on the
--    client, which now asks for every badge on every completion; the function
--    is the thing that decides.
-- 3. The function did not exist in production at all until 2026-08-27, so every
--    milestone reached before then passed silently.
--
-- This widens the function to every badge derivable from stored data, and
-- backfills players who already qualify.

-- "Emergency Responder" requires a mode that no longer exists.
DELETE FROM public.user_badges
  WHERE badge_id IN (SELECT id FROM public.badges WHERE name = 'Emergency Responder');
DELETE FROM public.badges WHERE name = 'Emergency Responder';

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
  _streak int;
  _earned boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;

  SELECT id INTO _badge_id FROM public.badges WHERE name = _badge_name LIMIT 1;
  IF _badge_id IS NULL THEN RETURN false; END IF;

  -- Already owned: nothing to do. This is what makes it safe for the client to
  -- ask for every badge after every case.
  IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = uid AND badge_id = _badge_id) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(total_cases_completed, 0), COALESCE(streak_days, 0)
    INTO _total, _streak
    FROM public.profiles WHERE user_id = uid;

  -- Every condition is checked against server-side data, so a client cannot
  -- claim a badge it has not earned.
  IF    _badge_name = 'First Case'  AND _total >= 1  THEN _earned := true;
  ELSIF _badge_name = 'Apprentice'  AND _total >= 10 THEN _earned := true;
  ELSIF _badge_name = 'Pharmacist'  AND _total >= 25 THEN _earned := true;
  ELSIF _badge_name = 'Streak Master' AND _streak >= 7 THEN _earned := true;

  ELSIF _badge_name = 'High Roller' THEN
    _earned := EXISTS (SELECT 1 FROM public.scores WHERE user_id = uid AND score >= 200);
  ELSIF _badge_name = 'Perfect Score' THEN
    _earned := EXISTS (SELECT 1 FROM public.scores WHERE user_id = uid AND score >= 100);
  ELSIF _badge_name = 'Speed Demon' THEN
    _earned := EXISTS (SELECT 1 FROM public.scores WHERE user_id = uid AND time_taken > 0 AND time_taken < 60);
  ELSIF _badge_name = 'First Prescription' THEN
    _earned := EXISTS (SELECT 1 FROM public.scores WHERE user_id = uid AND mode = 'rx');
  ELSIF _badge_name = 'OTC Expert' THEN
    _earned := (SELECT COUNT(*) FROM public.scores WHERE user_id = uid AND mode = 'otc') >= 10;
  ELSIF _badge_name = 'Batch Perfectionist' THEN
    _earned := EXISTS (SELECT 1 FROM public.scores WHERE user_id = uid AND mode = 'industry' AND errors_made = 0);
  ELSIF _badge_name = 'Master Manufacturer' THEN
    _earned := (SELECT COUNT(*) FROM public.scores
                WHERE user_id = uid AND mode = 'industry' AND errors_made = 0) >= 5;
  ELSE
    -- "Cold Chain Guardian", "FEFO Expert" and "Drug Encyclopedia" depend on
    -- in-case events that are not recorded server-side, so they cannot be
    -- validated here. They stay unearnable until those events are stored.
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

-- Backfill: grant every badge already earned. Without this, existing players
-- stay locked out of milestones they passed while the function was missing.
INSERT INTO public.user_badges (user_id, badge_id)
SELECT p.user_id, b.id
FROM public.profiles p
JOIN public.badges b ON TRUE
WHERE (
      (b.name = 'First Case'          AND p.total_cases_completed >= 1)
   OR (b.name = 'Apprentice'          AND p.total_cases_completed >= 10)
   OR (b.name = 'Pharmacist'          AND p.total_cases_completed >= 25)
   OR (b.name = 'Streak Master'       AND p.streak_days >= 7)
   OR (b.name = 'High Roller'         AND EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.user_id AND s.score >= 200))
   OR (b.name = 'Perfect Score'       AND EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.user_id AND s.score >= 100))
   OR (b.name = 'Speed Demon'         AND EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.user_id AND s.time_taken > 0 AND s.time_taken < 60))
   OR (b.name = 'First Prescription'  AND EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.user_id AND s.mode = 'rx'))
   OR (b.name = 'OTC Expert'          AND (SELECT COUNT(*) FROM public.scores s WHERE s.user_id = p.user_id AND s.mode = 'otc') >= 10)
   OR (b.name = 'Batch Perfectionist' AND EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.user_id AND s.mode = 'industry' AND s.errors_made = 0))
   OR (b.name = 'Master Manufacturer' AND (SELECT COUNT(*) FROM public.scores s WHERE s.user_id = p.user_id AND s.mode = 'industry' AND s.errors_made = 0) >= 5)
)
ON CONFLICT DO NOTHING;
