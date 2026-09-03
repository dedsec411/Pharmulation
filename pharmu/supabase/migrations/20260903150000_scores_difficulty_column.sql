-- The difficulty a score was earned at, stored directly rather than joined.
--
-- The difficulty picker's "last played" card looked up a player's last score
-- at a given difficulty via `scores.select("score, cases!inner(difficulty)")`
-- - an inner join to cases filtered by cases.difficulty. That only ever
-- matches a score whose case_id points at a real row in `cases`. Most cases
-- are generated on the fly from case_templates and persist with
-- case_id = null (see fetchTemplateCase / generated:${...} ids), so the join
-- silently excluded them. On the live data at the time this was found, 73 of
-- 109 score rows - two thirds - had a null case_id, meaning the "last score"
-- badge was blank for most players most of the time, not because they had no
-- history but because the query could not see it.
--
-- There was no column to filter on instead: scores never recorded its own
-- difficulty, only case_id, and a generated case's difficulty lives on the
-- template, not on anything the score row references. This adds it directly.

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS difficulty public.case_difficulty;

CREATE INDEX IF NOT EXISTS scores_user_mode_difficulty_idx
  ON public.scores (user_id, mode, difficulty, completed_at DESC);
