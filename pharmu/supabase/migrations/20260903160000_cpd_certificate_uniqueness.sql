-- One certificate per learner per milestone.
--
-- claimCertificate() checked `certs.find(c => c.hours_earned === hours)`
-- client-side before inserting, but nothing stopped two inserts in flight at
-- once - a double-click, or a slow connection and an impatient second press -
-- from both passing that check before either had come back to update `certs`.
-- The result was two certificate rows for the same milestone, each with its
-- own id and issue date, and the certificates tab would list the milestone
-- twice.

-- Any duplicate already created by that race goes first, keeping the earliest
-- of each pair: the constraint below cannot be added over one, and the bug is
-- live until this migration runs, so this cannot assume there are none.
DELETE FROM public.cpd_certificates c
WHERE EXISTS (
  SELECT 1 FROM public.cpd_certificates keep
  WHERE keep.user_id = c.user_id
    AND keep.hours_earned = c.hours_earned
    AND (keep.issued_at, keep.id) < (c.issued_at, c.id)
);

-- Dropped first so the migration can be re-run: every other migration in this
-- batch is idempotent and this one should not be the exception that errors
-- halfway through a re-run with "constraint already exists".
ALTER TABLE public.cpd_certificates
  DROP CONSTRAINT IF EXISTS cpd_certificates_user_hours_unique,
  ADD CONSTRAINT cpd_certificates_user_hours_unique UNIQUE (user_id, hours_earned);
