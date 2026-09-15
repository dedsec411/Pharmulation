-- Notes a learner writes against a case file.
--
-- Two jobs, deliberately in one place. A learner marking "this dose looks wrong
-- for an eGFR of 55" is reasoning aloud, which is worth keeping; a learner
-- marking "this case says day 2 post-op but lists no analgesia" is reporting a
-- content bug, which is worth someone reading. Both are a note against a slide,
-- so both are stored the same way and separated by `kind`.
--
-- Held in the database rather than the browser because a note that disappears
-- on refresh cannot do either job - a flagged mistake has to outlive the
-- session to reach anyone.

CREATE TABLE IF NOT EXISTS public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Text, not a uuid: generated cases have ids like "generated:<template>:<seed>"
  -- and are not rows in `cases`, so a foreign key would exclude most of them.
  case_ref text NOT NULL,
  case_title text,
  slide text,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'issue', 'opinion')),
  body text NOT NULL CHECK (length(btrim(body)) > 0 AND length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_notes_user_case_idx ON public.case_notes (user_id, case_ref);
CREATE INDEX IF NOT EXISTS case_notes_kind_idx ON public.case_notes (kind, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_notes TO authenticated;
GRANT ALL ON public.case_notes TO service_role;

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

-- A note is private to whoever wrote it. Admins can read them all, which is the
-- point of the 'issue' kind: reported mistakes need to reach someone.
DROP POLICY IF EXISTS case_notes_select_own ON public.case_notes;
CREATE POLICY case_notes_select_own ON public.case_notes
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS case_notes_insert_own ON public.case_notes;
CREATE POLICY case_notes_insert_own ON public.case_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS case_notes_update_own ON public.case_notes;
CREATE POLICY case_notes_update_own ON public.case_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS case_notes_delete_own ON public.case_notes;
CREATE POLICY case_notes_delete_own ON public.case_notes
  FOR DELETE USING (auth.uid() = user_id);
