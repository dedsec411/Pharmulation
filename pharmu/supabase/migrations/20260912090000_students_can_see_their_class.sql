-- Let a student read the class they are actually enrolled in.
--
-- The policy that was supposed to allow this has never worked:
--
--   CREATE POLICY classes_select_enrolled ON public.classes
--     FOR SELECT USING (EXISTS (
--       SELECT 1 FROM public.class_enrollments e
--       WHERE e.class_id = id AND e.student_id = auth.uid()
--     ));
--
-- `class_enrollments` has its own `id` column, and inside the subquery an
-- unqualified `id` binds to the innermost scope - so the predicate reads
-- `e.class_id = e.id`, comparing an enrolment's class to the enrolment's own
-- primary key. That is never true, so the EXISTS never matched and no student
-- could read any class.
--
-- The effect reached much further than one page. useMyEnrollments reads the
-- class through an embed on the enrolment row, got null back and filtered it
-- out, so every student looked un-enrolled - which meant the assignment and
-- assessment queries, which are keyed on the ids that list returns, never ran
-- either. A lecturer could set work all day and no student would see it.
--
-- Qualifying the column is the whole fix.

DROP POLICY IF EXISTS classes_select_enrolled ON public.classes;
CREATE POLICY classes_select_enrolled ON public.classes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.class_enrollments e
    WHERE e.class_id = public.classes.id
      AND e.student_id = auth.uid()
  ));
