-- Results of an AI Clinical Reasoning Examiner viva.
--
-- One row per completed session: the case it followed, which examiner ran it,
-- the questions asked, what the trainee answered, the four-axis marks, and the
-- Clinical Reasoning Index those marks produce.
--
-- The index is stored rather than recomputed on read. It is derived from the
-- answers in the same row, so recomputing would normally be the cleaner choice,
-- but the marks come from a model: if the scoring formula is ever changed, a
-- learner's history should not silently re-rate itself underneath them. The
-- number they were shown is the number that is kept.
--
-- Nothing here is required to play. A learner who never opens the examiner has
-- no rows and every existing feature behaves exactly as before.

CREATE TABLE IF NOT EXISTS public.examiner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Text, not a uuid: generated cases have ids like
  -- "generated:<template>:<seed>" and are not rows in `cases`, so a foreign key
  -- would exclude most of what the examiner actually follows.
  case_ref text NOT NULL,
  case_title text,
  mode text,

  examiner text NOT NULL CHECK (examiner IN ('hassan', 'hakim', 'zara')),

  -- [{id, question, focus}] as asked, and [{questionId, answer, scores,
  -- feedback, modelAnswer}] as marked. Kept whole so a session can be reread
  -- exactly as the learner saw it.
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Per-axis session averages, 0-10, for the breakdown bars.
  accuracy numeric(3,1) NOT NULL DEFAULT 0,
  reasoning numeric(3,1) NOT NULL DEFAULT 0,
  safety numeric(3,1) NOT NULL DEFAULT 0,
  communication numeric(3,1) NOT NULL DEFAULT 0,

  cri integer NOT NULL DEFAULT 0 CHECK (cri BETWEEN 0 AND 100),
  overall_feedback text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- The profile reads a learner's own sessions newest-first to draw the trend.
CREATE INDEX IF NOT EXISTS examiner_sessions_user_time_idx
  ON public.examiner_sessions (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.examiner_sessions TO authenticated;
GRANT ALL ON public.examiner_sessions TO service_role;

ALTER TABLE public.examiner_sessions ENABLE ROW LEVEL SECURITY;

-- A viva is private to the learner who sat it. Admins can read them, which is
-- what makes the feature usable as evidence of progress by an educator.
DROP POLICY IF EXISTS examiner_sessions_select_own ON public.examiner_sessions;
CREATE POLICY examiner_sessions_select_own ON public.examiner_sessions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS examiner_sessions_insert_own ON public.examiner_sessions;
CREATE POLICY examiner_sessions_insert_own ON public.examiner_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS examiner_sessions_delete_own ON public.examiner_sessions;
CREATE POLICY examiner_sessions_delete_own ON public.examiner_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Deliberately no UPDATE policy and no UPDATE grant. A mark that can be edited
-- after the fact is not a mark.
