-- Let an admin actually use the faculty area they are allowed into.
--
-- classes_educator_all read as "an admin may manage any class" in its USING
-- clause but "only an educator may write one" in its WITH CHECK. The route
-- guard admits admins to /educator so the platform can be supported without a
-- second account, so an admin reached the Classes page, pressed Create, and
-- got an RLS violation reported as "Could not create the class". The same
-- mismatch blocked rotating a join code and archiving.
--
-- Ownership is still what the check enforces: the row must belong to whoever
-- is writing it. Only the qualification to hold a class at all widens.

DROP POLICY IF EXISTS classes_educator_all ON public.classes;
CREATE POLICY classes_educator_all ON public.classes
  FOR ALL
  USING (auth.uid() = educator_id OR public.is_admin(auth.uid()))
  WITH CHECK (
    auth.uid() = educator_id
    AND (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()))
  );
