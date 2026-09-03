-- One certificate per learner per milestone.
--
-- claimCertificate() checked `certs.find(c => c.hours_earned === hours)`
-- client-side before inserting, but nothing stopped two inserts in flight at
-- once - a double-click, or a slow connection and an impatient second press -
-- from both passing that check before either had come back to update `certs`.
-- The result was two certificate rows for the same milestone, each with its
-- own id and issue date, and the certificates tab would list the milestone
-- twice.

ALTER TABLE public.cpd_certificates
  ADD CONSTRAINT cpd_certificates_user_hours_unique UNIQUE (user_id, hours_earned);
