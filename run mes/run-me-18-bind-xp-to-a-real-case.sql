-- XP has to be earned by a case that was actually recorded.
--
-- apply_case_result took the XP, accuracy and duration as arguments and
-- trusted all three. Nothing tied a call to a case having been played, and
-- nothing stopped the same call being made again, so the whole progression
-- system - XP, level, cases completed, accuracy_rate, and through
-- total_cases_completed the CPD certificates - could be driven from a console
-- loop with the user's own session:
--
--   for (;;) await supabase.rpc('apply_case_result',
--                               { _xp_gain: 1000, _accuracy: 1, _time_taken: 60 })
--
-- The per-call clamps added earlier bounded what one call was worth. They did
-- nothing about how many times it could be called.
--
-- The fix keeps the signature identical - no client change, so there is no
-- window where a deployed build and this schema disagree - and changes what
-- the function trusts. It now claims the caller's most recent unclaimed row
-- in `scores` and derives everything from that row. The arguments are ignored.
--
-- That makes a claim require a real recorded case, makes each case worth
-- exactly one claim, and makes the profile's running averages agree with the
-- score history by construction rather than by the client sending matching
-- numbers to two different places.
--
-- Fabricating a `scores` row directly is still possible - scoring is computed
-- in the browser and this does not change that - but it is now bounded: the
-- row has to pass the CHECK constraints below, it is rate limited, and it is
-- worth one claim rather than unlimited ones.

-- ---------------------------------------------------------------------------
-- 1. Which rows have already been counted
-- ---------------------------------------------------------------------------

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Every existing row predates the claim mechanism and has already had its XP
-- applied. Left NULL they would all be claimable, handing each player one
-- free claim per case they have ever played.
UPDATE public.scores SET claimed_at = completed_at WHERE claimed_at IS NULL;

CREATE INDEX IF NOT EXISTS scores_unclaimed_idx
  ON public.scores (user_id, completed_at DESC)
  WHERE claimed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Bounds on what a single case can claim to be
--
-- Sized well clear of real play rather than tight: at the time of writing the
-- highest score on the live data is 325, the longest case 449 seconds, the
-- most errors 8. These reject the absurd without ever being reachable by
-- someone actually playing.
-- ---------------------------------------------------------------------------

ALTER TABLE public.scores
  DROP CONSTRAINT IF EXISTS scores_score_sane,
  ADD CONSTRAINT scores_score_sane CHECK (score >= 0 AND score <= 2000);

ALTER TABLE public.scores
  DROP CONSTRAINT IF EXISTS scores_accuracy_sane,
  ADD CONSTRAINT scores_accuracy_sane CHECK (accuracy >= 0 AND accuracy <= 1);

ALTER TABLE public.scores
  DROP CONSTRAINT IF EXISTS scores_time_sane,
  ADD CONSTRAINT scores_time_sane CHECK (time_taken >= 0 AND time_taken <= 7200);

ALTER TABLE public.scores
  DROP CONSTRAINT IF EXISTS scores_errors_sane,
  ADD CONSTRAINT scores_errors_sane CHECK (errors_made >= 0 AND errors_made <= 500);

-- ---------------------------------------------------------------------------
-- 3. A ceiling on how fast cases can arrive
--
-- The shortest case on the live data took 19 seconds, and a real one runs to
-- minutes. A hundred and twenty in an hour is unreachable by a person - it is
-- two a minute sustained for an hour - while a loop does that in a second.
-- Deliberately loose: the cost of being wrong here is a real case refusing to
-- save, so the bar sits well clear of even a demo being clicked through fast.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.limit_score_insert_rate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.scores s
    WHERE s.user_id = NEW.user_id
      AND s.completed_at > now() - interval '1 hour'
  ) >= 120 THEN
    RAISE EXCEPTION 'Too many cases recorded in the last hour';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scores_rate_limit ON public.scores;
CREATE TRIGGER scores_rate_limit
BEFORE INSERT ON public.scores
FOR EACH ROW EXECUTE FUNCTION public.limit_score_insert_rate();

-- ---------------------------------------------------------------------------
-- 4. The claim itself
--
-- Same signature as before, so no client changes and no deployment ordering
-- to get wrong. The three arguments are accepted and ignored: they are kept
-- only so an existing build keeps working, and the values now come from the
-- score row instead.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_case_result(
  _xp_gain int,
  _accuracy numeric DEFAULT NULL,
  _time_taken int DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  claimed public.scores;
  gain int;
  acc numeric;
  secs numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Claim one row and mark it in the same statement, so two tabs finishing at
  -- once cannot both claim the same case. SKIP LOCKED means the second one
  -- takes the next unclaimed row rather than waiting on the first.
  UPDATE public.scores s
  SET claimed_at = now()
  WHERE s.id = (
    SELECT s2.id
    FROM public.scores s2
    WHERE s2.user_id = uid AND s2.claimed_at IS NULL
    ORDER BY s2.completed_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING s.* INTO claimed;

  -- No unclaimed case means either the score insert failed or this is a
  -- repeat call. Neither should move the profile.
  IF claimed.id IS NULL THEN
    RAISE EXCEPTION 'No unclaimed case result to apply';
  END IF;

  -- Half the score, which is exactly what the client used to compute and
  -- send. Kept clamped as well as derived: the score is still written by the
  -- browser, so this is the second bound rather than the only one.
  gain := LEAST(GREATEST(round(claimed.score / 2.0)::int, 0), 1000);
  acc  := LEAST(GREATEST(COALESCE(claimed.accuracy, 0), 0), 1) * 100;
  secs := LEAST(GREATEST(COALESCE(claimed.time_taken, 0), 0), 3600);

  RETURN QUERY
  UPDATE public.profiles p
  SET xp = p.xp + gain,
      total_cases_completed = p.total_cases_completed + 1,
      level = GREATEST(1, ((p.xp + gain) / 500) + 1),
      -- Inside the SET, p.total_cases_completed is still the pre-update
      -- count, which is the divisor a running mean needs.
      accuracy_rate = ROUND(
        ((p.accuracy_rate * p.total_cases_completed) + acc)
        / (p.total_cases_completed + 1), 2),
      avg_time_per_case = ROUND(
        ((p.avg_time_per_case * p.total_cases_completed) + secs)
        / (p.total_cases_completed + 1), 2)
  WHERE p.user_id = uid
  RETURNING p.*;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_result(int, numeric, int) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_case_result(int, numeric, int) TO authenticated;
