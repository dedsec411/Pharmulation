-- Only about 80 of the ~280 medicines in the catalogue could be bookmarked.
-- drug_bookmarks.drug_id is a uuid foreign key into `drugs`, but most of the
-- catalogue is generated client-side with string ids like "catalog-ibuprofen",
-- which the constraint rejects. The UI hid the control for those, so the
-- feature looked broken for the majority of the shelf.
--
-- Widen the reference to text so any catalogue entry can be saved. The
-- alternative - writing the generated catalogue into `drugs` - would have
-- persisted its placeholder clinical data (every synthetic entry shares the
-- same side effects) and made it look authoritative.
--
-- Referential integrity is the trade: a bookmark can now outlive a deleted
-- drug. Nothing in the app deletes drugs, and an unresolvable bookmark is
-- simply not shown, so the failure mode is a missing card rather than an error.

ALTER TABLE public.drug_bookmarks ADD COLUMN IF NOT EXISTS drug_ref text;

-- Preserve existing bookmarks.
UPDATE public.drug_bookmarks SET drug_ref = drug_id::text WHERE drug_ref IS NULL;

ALTER TABLE public.drug_bookmarks DROP CONSTRAINT IF EXISTS drug_bookmarks_user_id_drug_id_key;
ALTER TABLE public.drug_bookmarks DROP COLUMN IF EXISTS drug_id;

ALTER TABLE public.drug_bookmarks ALTER COLUMN drug_ref SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.drug_bookmarks ADD CONSTRAINT drug_bookmarks_user_drug_ref_key UNIQUE (user_id, drug_ref);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS drug_bookmarks_user_idx ON public.drug_bookmarks (user_id);
