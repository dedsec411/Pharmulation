-- Opening a sitting is a decision, not an insert.
--
-- assessment_sessions_start checked only that the row was the caller's own, so
-- everything that actually governs a sitting - being in the class, the exam
-- being open, not having sat it already - lived in the briefing page. A
-- request made outside that page answered to none of it: a student could open
-- a sitting for a closed assessment, or for one belonging to a class they had
-- never joined, given its id.
--
-- The window checks now sit with the marking, which was already a function for
-- the same reason.

CREATE OR REPLACE FUNCTION public.start_assessment_sitting(assessment uuid)
RETURNS TABLE (id uuid, started_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  exam public.assessments;
  existing public.assessment_sessions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT * INTO exam FROM public.assessments a WHERE a.id = assessment;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such assessment';
  END IF;

  -- Enrolment, checked here rather than trusted from the page that asked.
  IF NOT EXISTS (
    SELECT 1 FROM public.class_enrollments e
    WHERE e.class_id = exam.class_id AND e.student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not in the class this assessment was set for';
  END IF;

  IF exam.opens_at IS NOT NULL AND now() < exam.opens_at THEN
    RAISE EXCEPTION 'This assessment has not opened yet';
  END IF;
  IF exam.closes_at IS NOT NULL AND now() > exam.closes_at THEN
    RAISE EXCEPTION 'This assessment has closed';
  END IF;

  SELECT * INTO existing
  FROM public.assessment_sessions s
  WHERE s.assessment_id = assessment AND s.student_id = auth.uid();

  IF FOUND THEN
    -- One sitting only. Rejoining an open one is fine and is what a refresh
    -- mid-exam does; reopening a submitted one is a second attempt.
    IF existing.submitted_at IS NOT NULL THEN
      RAISE EXCEPTION 'You have already sat this assessment';
    END IF;
    RETURN QUERY SELECT existing.id, existing.started_at;
    RETURN;
  END IF;

  RETURN QUERY
    INSERT INTO public.assessment_sessions (assessment_id, student_id)
    VALUES (assessment, auth.uid())
    RETURNING assessment_sessions.id, assessment_sessions.started_at;
END;
$$;

REVOKE ALL ON FUNCTION public.start_assessment_sitting(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_assessment_sitting(uuid) TO authenticated;

-- With the function in place the direct insert is the hole, so it goes. The
-- table now has no INSERT and no UPDATE for a signed-in user: both ends of a
-- sitting are functions that check what they should.
DROP POLICY IF EXISTS assessment_sessions_start ON public.assessment_sessions;
REVOKE INSERT ON public.assessment_sessions FROM authenticated;
