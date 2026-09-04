-- Where a case came from.
--
-- Every case in this table was seeded by us until now. Prescription Lens lets
-- a learner build one from a document they photographed and, if they choose,
-- contribute it back - so a case now needs to say which it is. Anything read
-- from the pool can then be told apart: seeded content has been reviewed,
-- contributed content has not.
--
-- No RLS change accompanies this. `cases` grants authenticated SELECT only,
-- with no INSERT, and that stays true: contributions are written by a server
-- function holding the service role, which is what lets the anonymising step
-- be something the browser cannot skip.

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'seed';

ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_source_known,
  ADD CONSTRAINT cases_source_known CHECK (source IN ('seed', 'community'));

-- Who contributed it, for attribution and for removing one on request. Null
-- for everything seeded. Deliberately the contributor - never the patient,
-- who by this point is a fictional person invented at build time.
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS contributed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cases_source_idx ON public.cases (source, created_at DESC);
