-- examiner_sessions_select_own's own comment says admins can read a viva
-- "which is what makes the feature usable as evidence of progress by an
-- educator" - but the policy only ever checked is_admin, never
-- teaches_student. Every other piece of a student's progress an educator can
-- see - scores, the profile itself - carries a matching
-- scores_select_educator / profiles_select_educator policy built on
-- teaches_student, added when the class platform shipped. This table was
-- created earlier and was never brought into that pattern, so today a
-- non-admin educator's class analytics silently return nothing for a
-- student's viva history despite the roster and scores for the same student
-- being visible right next to it.
--
-- Nothing currently reads this table from the educator side, so this closes
-- the gap ahead of that rather than fixing a live bug - but it is the same
-- isolation the rest of the platform already promises, and it should not
-- have been one query away from silently failing.

DROP POLICY IF EXISTS examiner_sessions_select_educator ON public.examiner_sessions;
CREATE POLICY examiner_sessions_select_educator ON public.examiner_sessions
  FOR SELECT USING (public.teaches_student(auth.uid(), user_id));
