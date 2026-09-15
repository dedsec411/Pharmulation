-- Predictive weakness analytics.
--
-- Three additions and one function, all of them justified by something the
-- existing data genuinely cannot answer.
--
-- The brief assumed the weakness map could be built from errors_detail alone.
-- It cannot: errors_detail records mistakes and only mistakes, and an accuracy
-- needs a denominator. Attempts at a *skill* are recoverable, because a mode
-- exercises a known set of them, so the skill axis works on all the history
-- already stored. Attempts at a *drug class* are not recoverable at all -
-- nothing records which medicines a case put in front of the learner. Without
-- that, every class cell is errors divided by errors, which is a guaranteed
-- zero that means nothing. Hence class_attempts.

-- The drug categories a case actually involved, whether or not anything went
-- wrong. This is the denominator the heatmap's rows need.
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS class_attempts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- The computed map, cached so the profile does not re-derive it from every
-- score row on every visit. Recomputed after a case completes, which is the
-- only moment it can change.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weakness_map jsonb,
  ADD COLUMN IF NOT EXISTS weakness_map_at timestamptz;

-- One report per learner per week, so opening the dashboard five times on a
-- Monday costs one generation rather than five.
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The Monday the week starts on, so "already generated?" is an equality test
  -- rather than a date range.
  week_start date NOT NULL,
  improved text,
  biggest_gap text,
  recommendation text,
  motivation text,
  weeks_to_next_level integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_reports_user_idx
  ON public.weekly_reports (user_id, week_start DESC);

GRANT SELECT, INSERT, DELETE ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_reports_select_own ON public.weekly_reports;
CREATE POLICY weekly_reports_select_own ON public.weekly_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_reports_insert_own ON public.weekly_reports;
CREATE POLICY weekly_reports_insert_own ON public.weekly_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_reports_delete_own ON public.weekly_reports;
CREATE POLICY weekly_reports_delete_own ON public.weekly_reports
  FOR DELETE USING (auth.uid() = user_id);

-- Peer benchmarking.
--
-- Deliberately not built on get_public_profiles. That returns whole rows for
-- the top 200 users by XP, which is both a wider disclosure than benchmarking
-- needs and the wrong sample - percentiles against the leaderboard's top slice
-- would flatter everyone below it.
--
-- This computes the ranks server-side and returns four numbers about the
-- caller and nobody else. No other learner's name, id or figures cross the
-- boundary, so it is a narrower disclosure than what already exists.
CREATE OR REPLACE FUNCTION public.get_my_percentiles()
RETURNS TABLE (
  peer_role public.user_role,
  peers integer,
  accuracy_pct integer,
  cases_pct integer,
  cri_pct integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT user_id, role, accuracy_rate, total_cases_completed
    FROM public.profiles WHERE user_id = auth.uid()
  ),
  cohort AS (
    SELECT p.user_id, p.accuracy_rate, p.total_cases_completed,
           -- A learner with no examiner sessions has no index, and is excluded
           -- from that percentile rather than counted as a zero.
           (SELECT avg(e.cri) FROM public.examiner_sessions e WHERE e.user_id = p.user_id) AS cri
    FROM public.profiles p, me
    WHERE p.role = me.role
  )
  SELECT
    me.role,
    (SELECT count(*)::int FROM cohort),
    (SELECT round(100.0 * count(*) FILTER (WHERE c.accuracy_rate <= me.accuracy_rate) / greatest(count(*), 1))::int FROM cohort c),
    (SELECT round(100.0 * count(*) FILTER (WHERE c.total_cases_completed <= me.total_cases_completed) / greatest(count(*), 1))::int FROM cohort c),
    (SELECT CASE WHEN count(*) FILTER (WHERE c.cri IS NOT NULL) = 0 THEN NULL
       ELSE round(100.0 * count(*) FILTER (
              WHERE c.cri IS NOT NULL
                AND c.cri <= (SELECT avg(e.cri) FROM public.examiner_sessions e WHERE e.user_id = me.user_id))
            / greatest(count(*) FILTER (WHERE c.cri IS NOT NULL), 1))::int END
     FROM cohort c)
  FROM me;
$$;

REVOKE ALL ON FUNCTION public.get_my_percentiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_percentiles() TO authenticated;
